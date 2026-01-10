import sqlite3
import json
import os
from backend.ai import generate_embedding

DB_PATH = "backend/dropvault.db"

def reembed_all():
    if not os.path.exists(DB_PATH):
        print("DB not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    print("Fetching all items...")
    c.execute("SELECT id, title, content, tags, user_id FROM items")
    rows = c.fetchall()
    
    print(f"Found {len(rows)} items. Regenerating embeddings with new model...")
    
    for row in rows:
        item_id = row['id']
        title = row['title'] or ""
        content = row['content'] or ""
        tags = row['tags'] or ""
        
        # Construct text to embed (same logic as main.py)
        text_to_embed = f"{title} "
        if tags:
            text_to_embed += f"Tags: {tags} "
        if content:
            text_to_embed += content[:8000]
            
        print(f"Processing Item {item_id}: {title[:30]}...")
        vector = generate_embedding(text_to_embed)
        
        if vector:
            vector_json = json.dumps(vector)
            c.execute("UPDATE items SET embedding = ? WHERE id = ?", (vector_json, item_id))
        
    conn.commit()
    conn.close()
    print("✅ All items re-embedded successfully!")

if __name__ == "__main__":
    reembed_all()
