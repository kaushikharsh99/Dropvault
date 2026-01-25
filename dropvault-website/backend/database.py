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
        
    conn.commit()
    conn.close()
    return db_path

def get_db_path():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, DB_NAME)

def insert_chunk(item_id, type, text, embedding):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    embedding_json = json.dumps(embedding) if embedding else None
    c.execute("INSERT INTO chunks (item_id, type, text, embedding) VALUES (?, ?, ?, ?)", (item_id, type, text, embedding_json))
    conn.commit()
    conn.close()

def get_all_chunks(user_id=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Join with items to get user_id and item metadata for filtering
    query = """
        SELECT c.id, c.item_id, c.type as chunk_type, c.text, c.embedding, 
               i.user_id, i.type as item_type, i.created_at, i.title
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
    
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message"
    query = f"SELECT {fields} FROM items WHERE user_id = ?"
    params = [user_id]
    
    if item_type and item_type != "ALL":
        if item_type == "DOCS":
            query += " AND (type = 'pdf' OR type = 'file')"
        elif item_type == "LINKS":
            query += " AND (type = 'link' OR type = 'article')"
        elif item_type == "YOUTUBE":
            query += " AND type = 'video'"
        else:
            query += " AND type = ?"
            params.append(item_type.lower())
    
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
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id, thumbnail_path, status, progress_stage, progress_percent, progress_message"
    if user_id:
        c.execute(f"SELECT {fields} FROM items WHERE id = ? AND user_id = ?", (item_id, user_id))
    else:
        c.execute(f"SELECT {fields} FROM items WHERE id = ?", (item_id,))
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