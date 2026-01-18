import sqlite3
import json
import os
import re
from pathlib import Path
from backend.ai import generate_embedding

# Robust path handling
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "backend" / "dropvault.db"

def clean_text(text):
    if not text: return ""
    # Remove excessive whitespace/newlines
    return " ".join(text.split())[:8000]

def reembed_all():
    if not DB_PATH.exists():
        print(f"DB not found at {DB_PATH}")
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
        
        # Construct text to embed with hygiene
        text_parts = [title]
        if tags:
            text_parts.append(f"Tags: {tags}")
        if content:
            text_parts.append(clean_text(content))
            
        text_to_embed = " ".join(text_parts)
            
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
