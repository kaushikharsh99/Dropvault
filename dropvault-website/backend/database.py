import sqlite3
import json
import os
from .crypto import encrypt_text, decrypt_text

DB_NAME = "dropvault.db"

def init_db():
    # Use absolute path for DB to avoid confusion
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, DB_NAME)
    
    conn = sqlite3.connect(db_path)
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
    
    # Add index for faster queries
    c.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON items(user_id)")
        
    conn.commit()
    conn.close()
    return db_path

def get_db_path():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, DB_NAME)

def add_item(title, type, content, notes, file_path, embedding, tags="", user_id=None):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    
    # Encrypt sensitive content
    encrypted_content = encrypt_text(content) if content else ""
    encrypted_notes = encrypt_text(notes) if notes else ""
    
    embedding_json = json.dumps(embedding) if embedding else None
    
    c.execute("INSERT INTO items (title, type, content, notes, file_path, embedding, tags, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              (title, type, encrypted_content, encrypted_notes, file_path, embedding_json, tags, user_id))
    item_id = c.lastrowid
    conn.commit()
    conn.close()
    return item_id

def get_all_items(user_id=None, limit=None, offset=None, item_type=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # We exclude 'embedding' and 'clip_embedding' here because they're heavy and only needed for search calculations on the backend
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id"
    
    query = f"SELECT {fields} FROM items WHERE user_id = ?"
    params = [user_id]
    
    if item_type and item_type != "ALL":
        # Handle combined types like 'DOCS' (pdf + file)
        if item_type == "DOCS":
            query += " AND (type = 'pdf' OR type = 'file')"
        elif item_type == "LINKS":
            query += " AND (type = 'link' OR type = 'article')"
        elif item_type == "YOUTUBE":
            # For YouTube, we check type='video' but usually they are stored as 'video' with youtube content
            # The frontend filter logic uses a regex, but here we can filter by type='video' 
            # and if we want specifically youtube we'd need content check. 
            # For simplicity let's stick to the main types for now.
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
    else:
        # If no user_id, return empty list for security
        return []
        
    rows = c.fetchall()
    conn.close()
    
    # Decrypt content before returning
    results = []
    for row in rows:
        item = dict(row)
        item['content'] = decrypt_text(item['content'])
        item['notes'] = decrypt_text(item['notes'])
        results.append(item)
        
    return results

def get_item(item_id, user_id=None):
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    fields = "id, title, type, content, notes, file_path, created_at, tags, user_id"
    if user_id:
        c.execute(f"SELECT {fields} FROM items WHERE id = ? AND user_id = ?", (item_id, user_id))
    else:
        c.execute(f"SELECT {fields} FROM items WHERE id = ?", (item_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        item = dict(row)
        item['content'] = decrypt_text(item['content'])
        item['notes'] = decrypt_text(item['notes'])
        return item
    return None

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
    
    # NOTE: For search, we might NOT want to decrypt content if we are just comparing embeddings.
    # But if the search results return snippets of content, we MUST decrypt.
    # The 'search' endpoint uses this.
    
    results = []
    for row in rows:
        item = dict(row)
        item['content'] = decrypt_text(item['content'])
        item['notes'] = decrypt_text(item['notes'])
        results.append(item)
        
    return results

def update_item(item_id, title, content, tags, embedding=None, user_id=None):
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    
    # Encrypt content
    encrypted_content = encrypt_text(content) if content else ""
    
    # Base query
    query = "UPDATE items SET title = ?, content = ?, tags = ?"
    params = [title, encrypted_content, tags]
    
    if embedding:
        query += ", embedding = ?"
        params.append(json.dumps(embedding))
        
    query += " WHERE id = ?"
    params.append(item_id)
    
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)

    c.execute(query, tuple(params))
    conn.commit()
    conn.close()