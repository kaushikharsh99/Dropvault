import sqlite3
import json
import os

DB_NAME = "dropvault.db"

def init_db():
    # Use absolute path for DB to avoid confusion
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, DB_NAME)
    
    conn = sqlite3.connect(db_path)
    # Enable Write-Ahead Logging (WAL) for concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
    
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS items
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT,
                  type TEXT,
                  content TEXT,
                  notes TEXT,
                  file_path TEXT,
                  embedding TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  tags TEXT,
                  user_id TEXT)''')
    
    # Check if tags column exists, if not add it
    try:
        c.execute("SELECT tags FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN tags TEXT")
    
    # Check if user_id column exists, if not add it
    try:
        c.execute("SELECT user_id FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN user_id TEXT")
        
    # Check if thumbnail_path column exists, if not add it
    try:
        c.execute("SELECT thumbnail_path FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN thumbnail_path TEXT")

    # Check if status column exists, if not add it
    try:
        c.execute("SELECT status FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'completed'")
        
    # Check if progress_stage column exists, if not add it
    try:
        c.execute("SELECT progress_stage FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN progress_stage TEXT")
        
    # Check if progress_percent column exists, if not add it
    try:
        c.execute("SELECT progress_percent FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN progress_percent INTEGER DEFAULT 100")

    # Check if progress_message column exists, if not add it
    try:
        c.execute("SELECT progress_message FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN progress_message TEXT")
        
    # Check if access_count column exists, if not add it
    try:
        c.execute("SELECT access_count FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN access_count INTEGER DEFAULT 0")
        
    # Check if last_accessed column exists, if not add it
    try:
        c.execute("SELECT last_accessed FROM items LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE items ADD COLUMN last_accessed TIMESTAMP")
    
    # Add index for faster queries
    c.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON items(user_id)")
    
    # Chunking Table
    c.execute('''CREATE TABLE IF NOT EXISTS chunks
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  item_id INTEGER,
                  type TEXT,
                  text TEXT,
                  embedding TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
                  
    # User Profile Table (Personal Relevance)
    c.execute('''CREATE TABLE IF NOT EXISTS user_profile
                 (user_id TEXT PRIMARY KEY,
                  embedding TEXT,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')

    # Connected Accounts Table (OAuth Tokens)
    c.execute('''CREATE TABLE IF NOT EXISTS connected_accounts
                 (user_id TEXT,
                  provider TEXT,
                  access_token TEXT,
                  refresh_token TEXT,
                  scope TEXT,
                  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  last_synced_at TIMESTAMP,
                  PRIMARY KEY (user_id, provider))''')
                  
    # Check if last_synced_at exists (migration)
    try:
        c.execute("SELECT last_synced_at FROM connected_accounts LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE connected_accounts ADD COLUMN last_synced_at TIMESTAMP")
        
    conn.commit()
    conn.close()
    return db_path

def get_db_path():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, DB_NAME)

def get_user_profile(user_id):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT embedding FROM user_profile WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    if row and row['embedding']:
        return json.loads(row['embedding'])
    return None

def update_user_profile(user_id):
    """
    Computes a user profile vector by averaging embeddings of the last 20 accessed chunks.
    """
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Get last 20 accessed chunks for this user
    c.execute("""
        SELECT c.embedding 
        FROM chunks c
        JOIN items i ON c.item_id = i.id
        WHERE i.user_id = ? AND i.last_accessed IS NOT NULL
        ORDER BY i.last_accessed DESC
        LIMIT 20
    """, (user_id,))
    
    rows = c.fetchall()
    if not rows:
        conn.close()
        return

    import numpy as np
    embeddings = [json.loads(r['embedding']) for r in rows if r['embedding']]
    if not embeddings:
        conn.close()
        return
        
    avg_vec = np.mean(np.array(embeddings), axis=0).tolist()
    
    from datetime import datetime
    c.execute("""
        INSERT INTO user_profile (user_id, embedding, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET
            embedding = excluded.embedding,
            updated_at = excluded.updated_at
    """, (user_id, json.dumps(avg_vec), datetime.utcnow()))
    
    conn.commit()
    conn.close()

def record_access(item_id, weight=1):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    from datetime import datetime
    c.execute("""
        UPDATE items
        SET access_count = access_count + ?,
            last_accessed = ?
        WHERE id = ?
    """, (weight, datetime.utcnow(), item_id))
    conn.commit()
    conn.close()

def insert_chunk(item_id, type, text, embedding):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    embedding_json = json.dumps(embedding) if embedding else None
    c.execute("INSERT INTO chunks (item_id, type, text, embedding) VALUES (?, ?, ?, ?)", (item_id, type, text, embedding_json))
    conn.commit()
    conn.close()

def delete_chunks(item_id):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    c.execute("DELETE FROM chunks WHERE item_id = ?", (item_id,))
    conn.commit()
    conn.close()

def get_all_chunks(user_id=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Join with items to get user_id and item metadata for filtering
    query = """
        SELECT c.id, c.item_id, c.type as chunk_type, c.text, c.embedding, 
               i.user_id, i.type as item_type, i.created_at, i.title, i.tags
        FROM chunks c
        JOIN items i ON c.item_id = i.id
    """
    params = []
    
    if user_id:
        query += " WHERE i.user_id = ?"
        params.append(user_id)
        
    c.execute(query, tuple(params))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_item(title, type, content, notes, file_path, embedding, tags="", user_id=None, thumbnail_path=None, status="completed", progress_stage="done", progress_percent=100, progress_message=""):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    embedding_json = json.dumps(embedding) if embedding else None
    c.execute("INSERT INTO items (title, type, content, notes, file_path, embedding, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              (title, type, content, notes, file_path, embedding_json, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message))
    item_id = c.lastrowid
    conn.commit()
    conn.close()
    return item_id

def get_all_items(user_id=None, limit=None, offset=None, item_type=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message, access_count, last_accessed"
    query = f"SELECT {fields} FROM items WHERE user_id = ?"
    params = [user_id]
    
    if item_type and item_type != "ALL":
        if item_type == "DOCS":
            query += " AND (type = 'pdf' OR type = 'file')"
        elif item_type == "LINKS":
            query += " AND (type = 'link' OR type = 'article') AND (tags NOT LIKE '%github%' OR tags IS NULL)"
        elif item_type == "YOUTUBE":
            query += " AND type = 'video'"
        elif item_type == "GITHUB":
            query += " AND tags LIKE '%github%'"
        else:
            query += " AND type = ?"
            params.append(item_type.lower())
    elif item_type == "ALL" or item_type is None:
        # Exclude GitHub items from "ALL" view
        query += " AND (tags NOT LIKE '%github%' OR tags IS NULL)"
    
    if user_id:
        query += " ORDER BY created_at DESC"
        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)
        if offset is not None:
            query += " OFFSET ?"
            params.append(offset)
        
        c.execute(query, tuple(params))
        rows = c.fetchall()
    else:
        conn.close()
        return []
        
    conn.close()
    
    # Truncate content for list view to prevent huge payloads
    results = []
    for row in rows:
        item = dict(row)
        item['content'] = item['content'][:1000] if item['content'] else ""
        item['notes'] = item['notes'][:1000] if item['notes'] else ""
        results.append(item)
        
    return results

def get_item(item_id, user_id=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message, access_count, last_accessed"
    if user_id:
        c.execute(f"SELECT {fields} FROM items WHERE id = ? AND user_id = ?", (item_id, user_id))
    else:
        c.execute(f"SELECT {fields} FROM items WHERE id = ?", (item_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_item_by_path(user_id, file_path):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id, status"
    c.execute(f"SELECT {fields} FROM items WHERE user_id = ? AND file_path = ?", (user_id, file_path))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_item(item_id, user_id=None):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    if user_id:
        c.execute("DELETE FROM items WHERE id = ? AND user_id = ?", (item_id, user_id))
    else:
        c.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()

def get_all_items_with_embeddings(user_id=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if user_id:
        c.execute("SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    else:
        return []
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_item(item_id, title, content, tags, embedding=None, user_id=None, status=None, progress_stage=None, progress_percent=None, thumbnail_path=None, progress_message=None):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    
    query = "UPDATE items SET "
    params = []
    updates = []
    
    if title is not None:
        updates.append("title = ?")
        params.append(title)
        
    if content is not None:
        updates.append("content = ?")
        params.append(content)
        
    if tags is not None:
        updates.append("tags = ?")
        params.append(tags)
        
    if embedding is not None:
        updates.append("embedding = ?")
        params.append(json.dumps(embedding))
        
    if status is not None:
        updates.append("status = ?")
        params.append(status)
        
    if progress_stage is not None:
        updates.append("progress_stage = ?")
        params.append(progress_stage)
        
    if progress_percent is not None:
        updates.append("progress_percent = ?")
        params.append(progress_percent)

    if thumbnail_path is not None:
        updates.append("thumbnail_path = ?")
        params.append(thumbnail_path)

    if progress_message is not None:
        updates.append("progress_message = ?")
        params.append(progress_message)
        
    if not updates:
        conn.close()
        return

    query += ", ".join(updates)
    query += " WHERE id = ?"
    params.append(item_id)
    
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)

    c.execute(query, tuple(params))
    conn.commit()
    conn.close()

def delete_items(item_ids, user_id=None):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    
    if not item_ids:
        conn.close()
        return

    placeholders = ', '.join(['?'] * len(item_ids))
    
    if user_id:
        query = f"DELETE FROM items WHERE id IN ({placeholders}) AND user_id = ?"
        params = item_ids + [user_id]
        c.execute(query, tuple(params))
    else:
        query = f"DELETE FROM items WHERE id IN ({placeholders})"
        c.execute(query, tuple(item_ids))
        
    conn.commit()
    conn.close()

def get_all_tags(user_id):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT tags FROM items WHERE user_id = ? AND tags IS NOT NULL AND tags != ''", (user_id,))
    rows = c.fetchall()
    conn.close()

    tag_counts = {}
    for row in rows:
        tags_str = row['tags']
        if tags_str:
            for tag in tags_str.split(','):
                cleaned_tag = tag.strip()
                if cleaned_tag:
                    tag_counts[cleaned_tag] = tag_counts.get(cleaned_tag, 0) + 1
    
    sorted_tags = sorted(
        [{"text": tag, "value": count} for tag, count in tag_counts.items()], 
        key=lambda x: x['value'], 
        reverse=True
    )
    return sorted_tags

def get_processing_items(user_id=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    query = "SELECT id, title, type, content, notes, file_path, embedding, created_at, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message FROM items WHERE status IN ('pending', 'processing')"
    params = []
    
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
        
    c.execute(query, tuple(params))
    rows = c.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        results.append({
            "item_id": row["id"],
            "id": row["id"], # Duplicate for consistency
            "title": row["title"],
            "type": row["type"],
            "content": row["content"],
            "file_path": row["file_path"],
            "user_id": row["user_id"],
            "thumbnail_path": row["thumbnail_path"],
            "status": row["status"],
            "stage": row["progress_stage"],
            "percent": row["progress_percent"],
            "message": row["progress_message"]
        })
    return results

def save_connected_account(user_id, provider, access_token, scope=""):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    from datetime import datetime
    c.execute("""
        INSERT INTO connected_accounts (user_id, provider, access_token, scope, connected_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, provider)
        DO UPDATE SET
            access_token = excluded.access_token,
            scope = excluded.scope,
            connected_at = excluded.connected_at
    """, (user_id, provider, access_token, scope, datetime.utcnow()))
    conn.commit()
    conn.close()

def get_connected_account(user_id, provider):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM connected_accounts WHERE user_id = ? AND provider = ?", (user_id, provider))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_connected_account(user_id, provider):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    c.execute("DELETE FROM connected_accounts WHERE user_id = ? AND provider = ?", (user_id, provider))
    conn.commit()
    conn.close()

def update_last_synced(user_id, provider):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    from datetime import datetime
    c.execute("UPDATE connected_accounts SET last_synced_at = ? WHERE user_id = ? AND provider = ?", (datetime.utcnow(), user_id, provider))
    conn.commit()
    conn.close()

def get_users_needing_sync(provider, hours=24):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    # Find users where last_synced_at is NULL OR older than X hours
    query = f"""
        SELECT user_id FROM connected_accounts 
        WHERE provider = ? 
        AND (last_synced_at IS NULL OR last_synced_at < datetime('now', '-{hours} hours'))
    """
    c.execute(query, (provider,))
    rows = c.fetchall()
    conn.close()
    return [row['user_id'] for row in rows]