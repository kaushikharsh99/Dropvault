import json
import os
import sys

# Add parent directory to path to allow importing backend modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from backend.ai import generate_embedding
from backend.database import add_item, init_db
from backend.main import extract_text

def migrate():
    print("🚀 Starting Migration...")
    
    # 1. Load JSON
    json_path = os.path.join(current_dir, "legacy_data.json")
    if not os.path.exists(json_path):
        print("❌ legacy_data.json not found.")
        return

    with open(json_path, 'r') as f:
        items = json.load(f)
        
    print(f"📦 Found {len(items)} items to migrate.")
    
    # 2. Init DB just in case
    init_db()
    
    # 3. Process
    for item in items:
        title = item.get("title", "Untitled")
        type_ = item.get("type", "note")
        raw_text = item.get("raw_text", "")
        file_path_url = item.get("file_path", "")
        source_url = item.get("source_url", "")
        
        # Content is raw_text or source_url
        content = raw_text
        if type_ == "link" or type_ == "article" or type_ == "video":
            if not content: content = source_url
            
        # Fix file path
        # Old: /api/uploads/USER/FILENAME
        # New: /uploads/FILENAME (if we moved them) OR /uploads/USER/FILENAME (if we keep structure)
        # The Python backend serves /uploads from knowledge-tree/uploads.
        # So if the file is physically at knowledge-tree/uploads/USER/FILENAME, 
        # the URL /uploads/USER/FILENAME is valid.
        
        final_file_path = ""
        if file_path_url:
            # Strip /api prefix to get static file path relative to mount
            if file_path_url.startswith("/api/"):
                final_file_path = file_path_url.replace("/api", "")
            else:
                final_file_path = file_path_url
        
        # Determine text for embedding
        text_to_embed = f"{title} {content} "
        
        # If it's a PDF, we might need to re-extract if raw_text is empty
        # But we'll trust the JSON's raw_text or just embed title for now to be fast.
        # Ideally, we verify the file exists locally.
        
        # Calculate Embedding
        print(f"   -> Processing: {title[:30]}...")
        vector = generate_embedding(text_to_embed)
        
        # Insert
        add_item(title, type_, content, "", final_file_path, vector)
        
    print("✅ Migration Complete!")

if __name__ == "__main__":
    migrate()
