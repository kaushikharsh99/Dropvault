from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import shutil
import os
import uuid
import json
import re
import mimetypes
from datetime import datetime, timedelta
import numpy as np
import pdfplumber
import requests
from bs4 import BeautifulSoup
import pytesseract
import cv2
from PIL import Image
from io import BytesIO
from .ai import generate_embedding, query_embedding, cosine_sim
from .database import init_db, add_item, get_all_items, delete_item, update_item, get_item, get_all_items_with_embeddings
from .crypto import encrypt_file, decrypt_file_content

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB
init_db()

# Static for uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
# REMOVED: app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/uploads/{file_path:path}")
async def get_file(file_path: str):
    full_path = os.path.join(UPLOAD_DIR, file_path)
    
    # Security check: prevent path traversal
    if not os.path.abspath(full_path).startswith(os.path.abspath(UPLOAD_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Decrypt content
    file_bytes = decrypt_file_content(full_path)
    
    if file_bytes is None:
        # Fallback for unencrypted files (if migration missed something or legacy)
        try:
            with open(full_path, "rb") as f:
                file_bytes = f.read()
        except:
             raise HTTPException(status_code=500, detail="Could not read file")

    # Determine mime type
    mime_type, _ = mimetypes.guess_type(full_path)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    return Response(content=file_bytes, media_type=mime_type)

def extract_text_from_image(path):
    print(f"Running OCR on: {path}")
    try:
        # Load image (Encrypted aware)
        file_bytes = decrypt_file_content(path)
        if file_bytes is None:
            # Fallback for plain files
            with open(path, "rb") as f:
                file_bytes = f.read()
                
        # Convert bytes to numpy array
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            print("OCR: Could not decode image file.")
            return ""
        
        # Preprocessing for better OCR
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Apply slight blur to reduce noise
        gray = cv2.medianBlur(gray, 3)
        # Thresholding
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        # Run Tesseract
        text = pytesseract.image_to_string(gray)
        
        extracted = text.strip()
        print(f"OCR Complete. Extracted {len(extracted)} characters.")
        return extracted
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

def extract_text(file_path, type, content=None):
    if type == "pdf":
        text = ""
        try:
            # Decrypt PDF to memory
            file_bytes = decrypt_file_content(file_path)
            if file_bytes is None:
                # Fallback
                with open(file_path, "rb") as f:
                    file_bytes = f.read()
            
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            return text, None
        except Exception as e:
            print(f"PDF Extraction Error: {e}")
            return "", None
    elif type == "image":
        text = extract_text_from_image(file_path)
        return text, None
    elif type == "link" or (type == "video" and content and content.startswith("http")):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            resp = requests.get(content, headers=headers, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            meta = {
                "title": None,
                "description": None,
                "author": None,
                "date": None,
                "site_name": None,
                "keywords": None
            }

            def get_content(props, attrs=None):
                if not attrs: attrs = {}
                for prop in props:
                    tag = soup.find("meta", property=prop) or soup.find("meta", attrs={**attrs, "name": prop})
                    if tag and tag.get("content"):
                        return tag.get("content").strip()
                return None

            meta["title"] = get_content(["og:title", "twitter:title"]) or (soup.title.string.strip() if soup.title else None)
            meta["description"] = get_content(["og:description", "twitter:description", "description"])
            meta["site_name"] = get_content(["og:site_name"])
            meta["author"] = get_content(["article:author", "author", "twitter:creator"])
            meta["date"] = get_content(["article:published_time", "date", "pubdate", "og:pubdate"])
            meta["keywords"] = get_content(["keywords", "article:tag"])

            if not meta["date"] or not meta["author"]:
                try:
                    ld_scripts = soup.find_all("script", type="application/ld+json")
                    for script in ld_scripts:
                        if script.string:
                            try:
                                data = json.loads(script.string)
                                if isinstance(data, list): data = data[0]
                                if isinstance(data, dict):
                                    if not meta["date"]:
                                        meta["date"] = data.get("datePublished") or data.get("dateCreated") or data.get("uploadDate")
                                    if not meta["author"]:
                                        auth = data.get("author")
                                        if isinstance(auth, dict): meta["author"] = auth.get("name")
                                        elif isinstance(auth, list) and auth: meta["author"] = auth[0].get("name")
                                        elif isinstance(auth, str): meta["author"] = auth
                            except: pass
                except: pass

            page_title = meta["title"]

            for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                script.extract()
            
            body_text = soup.get_text()
            lines = (line.strip() for line in body_text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_body = "\n".join(chunk for chunk in chunks if chunk)

            final_parts = [f"URL: {content}"]
            if meta["title"]: final_parts.append(f"Title: {meta['title']}")
            if meta["description"]: final_parts.append(f"Description: {meta['description']}")
            if meta["author"]: final_parts.append(f"Author: {meta['author']}")
            if meta["date"]: final_parts.append(f"Date: {meta['date']}")
            if meta["site_name"]: final_parts.append(f"Site: {meta['site_name']}")
            if meta["keywords"]: final_parts.append(f"Keywords: {meta['keywords']}")
            
            final_parts.append("\n--- Content ---\n")
            final_parts.append(clean_body[:7000])

            return "\n".join(final_parts), page_title

        except Exception as e:
            print(f"Link Extraction Error: {e}")
            return content, None
    elif type in ["note", "text"]:
        return content or "", None
    return content or "", None


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), userId: str = Form(None)):
    if userId:
        user_upload_dir = os.path.join(UPLOAD_DIR, userId)
        os.makedirs(user_upload_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}-{file.filename}"
        file_path = os.path.join(user_upload_dir, filename)
        file_url = f"/uploads/{userId}/{filename}"
    else:
        filename = f"{uuid.uuid4()}-{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        file_url = f"/uploads/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Encrypt immediately after saving
    encrypt_file(file_path)
    
    return {
        "success": True,
        "fileUrl": file_url, 
        "filename": filename, 
        "originalName": file.filename,
        "mimetype": file.content_type
    }

@app.post("/api/items")
async def create_item(
    title: str = Form(...),
    type: str = Form(...),
    content: str = Form(None),
    notes: str = Form(None),
    file_path: str = Form(None),
    tags: str = Form(None),
    userId: str = Form(None)
):
    if type == "link" and content:
        if "youtube.com" in content or "youtu.be" in content:
            type = "video"

    text_to_embed = f"{title} "
    if tags:
        text_to_embed += f"Tags: {tags} "
    if notes:
        text_to_embed += f"Notes: {notes} "
        
    extracted_text = ""
    meta_title = None
    
    if (type == "pdf" or type == "image") and file_path:
        clean_path = file_path.replace("/uploads/", "")
        local_path = os.path.join(UPLOAD_DIR, clean_path)
        if os.path.exists(local_path):
            extracted_text, meta_title = extract_text(local_path, type)
        else:
            print(f"File not found: {local_path}")
    elif type == "link" or type == "video":
        extracted_text, meta_title = extract_text(None, type, content)
    else:
        extracted_text = content or ""
    
    if meta_title:
        if not title or title.strip() == content.strip() or title.startswith("http") or len(title) < 5:
            title = meta_title

    text_to_embed += extracted_text[:8000]
    
    vector = generate_embedding(text_to_embed)
    
    item_id = add_item(title, type, extracted_text, notes, file_path, vector, tags, userId)
    
    return {
        "id": item_id, 
        "status": "saved", 
        "extracted_text": extracted_text[:200] + "..." if extracted_text else ""
    }
    
@app.get("/api/items")
async def list_items(userId: str = None, limit: int = None, offset: int = None, type: str = None):
    items = get_all_items(userId, limit, offset, type)
    return items
    
def parse_search_intent(query):
    query = query.lower().strip()
    today = datetime.now()
    start_date = None
    end_date = None
    filter_desc = []
    type_filter = None

    # --- 1. Type Filtering ---
    type_map = {
        "video": "video", "videos": "video",
        "image": "image", "images": "image", "img": "image", "pic": "image", "pics": "image", "picture": "image", "pictures": "image",
        "link": "link", "links": "link", "url": "link", "urls": "link", "website": "link",
        "pdf": "pdf", "pdfs": "pdf", "doc": "pdf", "docs": "pdf", "document": "pdf", "file": "pdf", "files": "pdf",
        "note": "note", "notes": "note"
    }
    
    words = query.split()
    new_words = []
    for word in words:
        clean_word = re.sub(r'[^a-z]', '', word)
        if clean_word in type_map and not type_filter:
            type_filter = type_map[clean_word]
            filter_desc.append(f"Type: {type_filter}")
        else:
            new_words.append(word)
    
    query = " ".join(new_words)

    # Helper to set day range
    def set_day_range(date_obj):
        s = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        e = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        return s, e

    # --- 2. Advanced Relative Date Filtering ---
    
    # "X days/weeks/months ago" or "X days/weeks/months before"
    relative_match = re.search(r'(\d+)\s+(day|week|month|year)s?\s+(ago|before)', query)
    if relative_match:
        num = int(relative_match.group(1))
        unit = relative_match.group(2)
        if unit == 'day':
            target = today - timedelta(days=num)
        elif unit == 'week':
            target = today - timedelta(weeks=num)
        elif unit == 'month':
            target = today - timedelta(days=num*30)
        elif unit == 'year':
            target = today - timedelta(days=num*365)
        
        start_date, end_date = set_day_range(target)
        filter_desc.append(f"{num} {unit}s ago")
        query = query.replace(relative_match.group(0), "")

    # "last week"
    elif "last week" in query:
        start_date = today - timedelta(days=today.weekday() + 7)
        end_date = start_date + timedelta(days=6)
        start_date, _ = set_day_range(start_date)
        _, end_date = set_day_range(end_date)
        filter_desc.append("last week")
        query = query.replace("last week", "")

    # "last month"
    elif "last month" in query:
        first_of_this_month = today.replace(day=1)
        last_of_last_month = first_of_this_month - timedelta(days=1)
        start_date = last_of_last_month.replace(day=1)
        end_date = last_of_last_month
        start_date, _ = set_day_range(start_date)
        _, end_date = set_day_range(end_date)
        filter_desc.append("last month")
        query = query.replace("last month", "")

    # "today" / "yesterday" / "day before yesterday"
    elif "day before yesterday" in query:
        start_date, end_date = set_day_range(today - timedelta(days=2))
        filter_desc.append("day before yesterday")
        query = query.replace("day before yesterday", "")
    elif "today" in query:
        start_date, end_date = set_day_range(today)
        filter_desc.append("today")
        query = query.replace("today", "")
    elif "yesterday" in query:
        start_date, end_date = set_day_range(today - timedelta(days=1))
        filter_desc.append("yesterday")
        query = query.replace("yesterday", "")
    
    # Months / Weekdays (existing logic)
    else:
        months = {
            "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
            "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
            "august": 8, "aug": 8, "september": 9, "sept": 9, "sep": 9,
            "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12
        }
        month_found = False
        for m_name, m_idx in months.items():
            if m_name in query:
                year = today.year
                import calendar
                last_day = calendar.monthrange(year, m_idx)[1]
                start_date = datetime(year, m_idx, 1, 0, 0, 0)
                end_date = datetime(year, m_idx, last_day, 23, 59, 59)
                filter_desc.append(f"in {m_name.capitalize()}")
                query = query.replace(m_name, "")
                month_found = True
                break

        if not month_found:
            weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for i, day in enumerate(weekdays):
                if day in query:
                    current_weekday = today.weekday()
                    days_ago = (current_weekday - i) % 7
                    if days_ago == 0: days_ago = 7
                    target_day = today - timedelta(days=days_ago)
                    start_date, end_date = set_day_range(target_day)
                    filter_desc.append(day.capitalize())
                    query = query.replace(day, "")
                    break

    return query.strip(), start_date, end_date, type_filter, ", ".join(filter_desc)

    return query.strip(), start_date, end_date, type_filter, ", ".join(filter_desc)

@app.get("/api/search")
async def search(q: str, userId: str = None):
    cleaned_q, start_date, end_date, type_filter, filter_desc = parse_search_intent(q)
    
    q_vec = None
    if cleaned_q:
        q_vec = query_embedding(cleaned_q)
            
    items = get_all_items_with_embeddings(userId)
    results = []
    
    if q_vec is not None:
        q_vec = np.array(q_vec)

    for item in items:
        if type_filter:
            if item['type'] != type_filter:
                if type_filter == 'link' and item['type'] == 'article': pass
                elif type_filter == 'pdf' and item['type'] == 'file': pass
                else: continue

        if start_date and end_date:
            try:
                item_date = datetime.strptime(item['created_at'], "%Y-%m-%d %H:%M:%S")
                if not (start_date <= item_date <= end_date):
                    continue
            except:
                continue

        score = 0
        explanation = ""
        
        if q_vec is not None and item['embedding']:
            try:
                item_vec = np.array(json.loads(item['embedding']))
                text_score = cosine_sim(q_vec, item_vec)
                if text_score > score:
                    score = text_score
                    if text_score > 0.3:
                        explanation = f"Matched '{cleaned_q}' semantically."
            except: pass

        if cleaned_q and item['tags']:
            item_tags = [t.strip().lower() for t in item['tags'].split(',')]
            if cleaned_q in item_tags:
                score = max(score, 0.85)
                explanation += f" Exact tag match."
            elif any(word in item_tags for word in cleaned_q.split()):
                score += 0.15
                explanation += " Partial tag match."

        if cleaned_q and item['title'] and cleaned_q in item['title'].lower():
            score = max(score, 0.9)
            explanation = "Exact title match."

        if score > 0.25 or (not cleaned_q and (start_date or type_filter)):
             results.append({**item, "score": float(score), "explanation": explanation + (f" ({filter_desc})" if filter_desc else "")})
    
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:15]

@app.get("/api/items/{item_id}")
async def get_single_item(item_id: int, userId: str = None):
    item = get_item(item_id, userId)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/items/{item_id}")
async def update_item_endpoint(
    item_id: int,
    title: str = Form(...),
    content: str = Form(None),
    tags: str = Form(None),
    userId: str = Form(None)
):
    existing_item = get_item(item_id, userId)
    if userId and not existing_item:
        raise HTTPException(status_code=403, detail="Not authorized to update this item")
    
    text_to_embed = f"{title} "
    if tags:
        text_to_embed += f"Tags: {tags} "
    if content:
        text_to_embed += content[:8000]
        
    vector = generate_embedding(text_to_embed)
    update_item(item_id, title, content, tags, vector, userId)
    
    return {"status": "updated", "id": item_id}
        
@app.delete("/api/items/{item_id}")
async def delete_item_endpoint(item_id: int, userId: str = None):
    existing_item = get_item(item_id, userId)
    if userId and not existing_item:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    
    delete_item(item_id, userId)
    return {"status": "deleted", "id": item_id}
