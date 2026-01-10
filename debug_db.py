import sqlite3
import os

DB_PATH = "knowledge-tree/backend/dropvault.db"

if not os.path.exists(DB_PATH):
    print("DB file not found!")
else:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute("SELECT id, title, user_id, file_path FROM items")
        rows = c.fetchall()
        print(f"Found {len(rows)} items:")
        for row in rows:
            print(dict(row))
    except Exception as e:
        print(f"Error reading DB: {e}")
    conn.close()
