from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from typing import List
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
import whisper
from io import BytesIO
from .ai import generate_embedding, query_embedding, cosine_sim
from .database import init_db, add_item, get_all_items, delete_item, delete_items, update_item, get_item, get_all_items_with_embeddings, get_all_tags, get_processing_items, get_all_chunks, record_access, update_user_profile, get_user_profile
from .vision import detect_objects
from .media_utils import UPLOAD_DIR, extract_text, extract_text_from_image, generate_video_thumbnail, transcribe_audio
from .worker import worker, manager
from .synonyms import expand_query
from .github_auth import router as github_router
from .github_data import fetch_github_data

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(github_router)

@app.post("/api/sync/github")
async def sync_github(userId: str = Form(...)):
    # Run in background to avoid timeout
    # We reuse the existing worker queue structure
    worker.add_github_task(userId)
    return {"status": "started", "message": "Syncing GitHub repositories..."}

# Init DB
init_db()

@app.websocket("/ws/progress/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket)
    
    # Send current state immediately
    try:
        active_items = get_processing_items(user_id)
        for item in active_items:
            await websocket.send_json(item)
    except Exception as e:
        print(f"Error sending initial state: {e}")

    try:
        while True:
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)

@app.get("/uploads/{file_path:path}")
async def get_file(file_path: str, request: Request):
    full_path = os.path.join(UPLOAD_DIR, file_path)

    if not os.path.abspath(full_path).startswith(os.path.abspath(UPLOAD_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Get bytes
    try:
        with open(full_path, "rb") as f:
            file_bytes = f.read()
    except Exception:
         raise HTTPException(status_code=500, detail="Could not read file")

    mime_type, _ = mimetypes.guess_type(full_path)
    mime_type = mime_type or "application/octet-stream"

    size = len(file_bytes)
    range_header = request.headers.get("range")

    if range_header:
        start, end = 0, size - 1
        m = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if m:
            if m.group(1):
                start = int(m.group(1))
            if m.group(2):
                end = int(m.group(2))

        end = min(end, size - 1)
        chunk = file_bytes[start:end+1]

        headers = {
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(chunk)),
            "Access-Control-Expose-Headers": "Content-Range",
        }

        return Response(chunk, status_code=206, media_type=mime_type, headers=headers)

    # FULL FILE
    return Response(
        file_bytes,
        media_type=mime_type,
        headers={
            "Content-Length": str(size),
            "Accept-Ranges": "bytes"
        }
    )

def detect_social_platform(url):
    if not url: return None
    url = url.lower()
    
    platforms = {
        "facebook.com": "Facebook", "fb.watch": "Facebook", "messenger.com": "Messenger",
        "instagram.com": "Instagram", "instagr.am": "Instagram",
        "twitter.com": "Twitter", "x.com": "Twitter",
        "tiktok.com": "TikTok",
        "snapchat.com": "Snapchat",
        "linkedin.com": "LinkedIn",
        "pinterest.com": "Pinterest", "pin.it": "Pinterest",
        "reddit.com": "Reddit", "redd.it": "Reddit",
        "tumblr.com": "Tumblr",
        "threads.net": "Threads",
        "whatsapp.com": "WhatsApp", "wa.me": "WhatsApp",
        "t.me": "Telegram", "telegram.org": "Telegram",
        "wechat.com": "WeChat",
        "signal.org": "Signal",
        "line.me": "LINE",
        "viber.com": "Viber",
        "discord.com": "Discord", "discord.gg": "Discord",
        "kakao.com": "KakaoTalk",
        "skype.com": "Skype",
        "youtube.com": "YouTube", "youtu.be": "YouTube",
        "twitch.tv": "Twitch",
        "vimeo.com": "Vimeo",
        "dailymotion.com": "Dailymotion",
        "rumble.com": "Rumble",
        "bilibili.com": "Bilibili",
        "nicovideo.jp": "NicoNico",
        "likee.video": "Likee",
        "kwai.com": "Kwai",
        "triller.co": "Triller",
        "bsky.app": "Bluesky",
        "mastodon.social": "Mastodon", "mstdn.social": "Mastodon",
        "plurk.com": "Plurk",
        "gab.com": "Gab",
        "truthsocial.com": "Truth Social",
        "gettr.com": "GETTR",
        "parler.com": "Parler",
        "xing.com": "Xing",
        "indeed.com": "Indeed",
        "meetup.com": "Meetup",
        "glassdoor.com": "Glassdoor",
        "quora.com": "Quora",
        "stackoverflow.com": "Stack Overflow",
        "4chan.org": "4chan",
        "lemmy.ml": "Lemmy",
        "hive.blog": "Hive",
        "nextdoor.com": "Nextdoor",
        "fark.com": "Fark",
        "deviantart.com": "DeviantArt",
        "behance.net": "Behance",
        "dribbble.com": "Dribbble",
        "flickr.com": "Flickr",
        "500px.com": "500px",
        "vsco.co": "VSCO",
        "artstation.com": "ArtStation",
        "tinder.com": "Tinder",
        "bumble.com": "Bumble",
        "hinge.co": "Hinge",
        "okcupid.com": "OkCupid",
        "pof.com": "Plenty of Fish",
        "grindr.com": "Grindr",
        "badoo.com": "Badoo",
        "happn.com": "Happn"
    }

    for domain, name in platforms.items():
        if domain in url:
            return name
    return None

@app.post("/api/items")
async def create_item(
    title: str = Form(...),
    type: str = Form(...),
    content: str = Form(None),
    notes: str = Form(None),
    file_path: str = Form(None),
    thumbnail_path: str = Form(None),
    tags: str = Form(None),
    userId: str = Form(None)
):
    # Detect audio/video type if not explicitly set but file is media
    if file_path:
        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm']:
            type = "audio"
        elif ext in ['.mp4', '.mov', '.avi', '.mkv', '.wmv']:
            type = "video"

    if type == "link" and content:
        if "youtube.com" in content or "youtu.be" in content:
            type = "video"
            
    # Infer thumbnail path if not provided and it is a video file
    if not thumbnail_path and type == "video" and file_path and not file_path.startswith("http"):
        try:
            parts = file_path.split('/')
            filename = parts[-1]
            parent_dir = "/".join(parts[:-1])
            possible_thumb = f"{parent_dir}/thumbnails/{filename}.jpg"
            
            # Verify existence
            rel_path = possible_thumb.replace("/uploads/", "", 1).lstrip("/")
            full_thumb_path = os.path.join(UPLOAD_DIR, rel_path)
            
            if os.path.exists(full_thumb_path):
                thumbnail_path = possible_thumb
        except Exception as e:
            print(f"Error inferring thumbnail: {e}")

    # Auto-tagging for social media
    detected_platform = None
    if (type == "link" or type == "video") and content:
         detected_platform = detect_social_platform(content)
    
    current_tags = [t.strip() for t in tags.split(',')] if tags else []
    
    if detected_platform and detected_platform not in current_tags:
        current_tags.append(detected_platform)
        
    tags = ", ".join(current_tags) if current_tags else ""

    # Initial DB Insert - Pending Status
    final_file_path = file_path
    if (type == "link" or type == "video") and content and content.startswith("http"):
        final_file_path = content

    item_id = add_item(
        title=title, 
        type=type, 
        content=content or "", 
        notes=notes, 
        file_path=final_file_path, 
        embedding=None, 
        tags=tags, 
        user_id=userId, 
        thumbnail_path=thumbnail_path,
        status="pending",
        progress_stage="queued",
        progress_percent=0,
        progress_message="Waiting in queue..."
    )
    
    # Queue for processing
    worker.add_task(item_id, final_file_path, type, userId, thumbnail_path)
    
    return {
        "id": item_id, 
        "status": "queued", 
        "thumbnail_path": thumbnail_path,
        "progress_stage": "queued",
        "progress_percent": 0,
        "progress_message": "Waiting in queue..."
    }

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
        
    # Generate Thumbnail for Video
    thumbnail_url = None
    mime_type = file.content_type
    if not mime_type:
        mime_type, _ = mimetypes.guess_type(file.filename)
        
    if mime_type and mime_type.startswith('video/'):
        thumb_dir = os.path.join(os.path.dirname(file_path), "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_filename = f"{filename}.jpg"
        thumb_path = os.path.join(thumb_dir, thumb_filename)
        
        if generate_video_thumbnail(file_path, thumb_path):
            if userId:
                thumbnail_url = f"/uploads/{userId}/thumbnails/{thumb_filename}"
            else:
                thumbnail_url = f"/uploads/thumbnails/{thumb_filename}"

    return {
        "success": True,
        "fileUrl": file_url, 
        "filename": filename, 
        "originalName": file.filename,
        "mimetype": file.content_type,
        "thumbnailUrl": thumbnail_url
    }
    
@app.get("/api/items")
async def list_items(userId: str = None, limit: int = None, offset: int = None, type: str = None):
    items = get_all_items(userId, limit, offset, type)
    
    # Inject file_size for frontend performance optimization
    for item in items:
        item['file_size'] = 0
        if item.get('file_path'):
            try:
                # file_path is like "/uploads/user/file.png"
                # UPLOAD_DIR is absolute path to uploads folder
                # We need to strip "/uploads" prefix to join correctly
                rel_path = item['file_path'].replace('/uploads/', '', 1).lstrip('/')
                full_path = os.path.join(UPLOAD_DIR, rel_path)
                
                if os.path.exists(full_path):
                    item['file_size'] = os.path.getsize(full_path)
            except Exception:
                pass
                
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
        "note": "note", "notes": "note",
        "audio": "audio", "audios": "audio", "voice": "audio", "recording": "audio"
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

CHUNK_WEIGHTS = {
    "visual": 1.5,      # OWL-ViT objects - highest precision
    "caption": 1.3,     # BLIP description - high signal
    "ocr": 1.0,         # document text - standard
    "transcript": 0.7   # spoken text - high noise
}

VISUAL_HINTS = ["diagram", "image", "photo", "chart", "whiteboard", "picture", "screenshot"]
AUDIO_HINTS = ["said", "meeting", "audio", "voice", "discussion", "podcast", "recording"]

def get_keywords(text):
    return set(w.lower() for w in text.split() if len(w) > 3)

def keyword_overlap_score(query_words, text):
    if not text: return 0
    words = set(text.lower().split())
    return len(query_words & words)

def usage_boost(access_count):
    if not access_count: return 0.0
    if access_count >= 20: return 0.07
    if access_count >= 10: return 0.05
    if access_count >= 3: return 0.03
    return 0.0

def get_modality_boost(query, chunk_type):
    q = query.lower()
    if any(w in q for w in VISUAL_HINTS) and chunk_type in ["visual", "caption"]:
        return 0.05
    if any(w in q for w in AUDIO_HINTS) and chunk_type == "transcript":
        return 0.05
    return 0

def get_recency_boost(created_at_str):
    try:
        item_date = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S")
        days_old = (datetime.now() - item_date).days
        if days_old < 7: return 0.05
        if days_old < 30: return 0.02
    except: pass
    return 0

@app.get("/api/search")
async def search(q: str, userId: str = None, tags: str = None):
    cleaned_q, start_date, end_date, type_filter, filter_desc = parse_search_intent(q)
    
    # Parse tags filter
    required_tags = [t.strip().lower() for t in tags.split(',')] if tags else []
    
    # --- Step 5: Query Expansion ---
    expanded_q = expand_query(cleaned_q)
    
    q_vec = None
    query_keywords = set()
    if cleaned_q:
        # Use expanded query for embedding to improve semantic recall
        q_vec = query_embedding(expanded_q if expanded_q else cleaned_q)
        
        # --- Step 8: Personal Relevance Tuning ---
        if userId:
            user_vec = get_user_profile(userId)
            if user_vec and q_vec is not None:
                # Blend: 85% Query, 15% User Context
                try:
                    import numpy as np
                    q_arr = np.array(q_vec)
                    u_arr = np.array(user_vec)
                    # Simple weighted average
                    q_vec = (0.85 * q_arr + 0.15 * u_arr).tolist()
                except Exception as e:
                    print(f"Error blending user profile: {e}")

        # Use expanded words for keyword matching to handle synonyms
        query_keywords = get_keywords(expanded_q if expanded_q else cleaned_q)
    
    all_chunks = get_all_chunks(userId)
    
    # --- STAGE 1: Recall (Vector Search) ---
    candidates = []
    
    for chunk in all_chunks:
        # 0. Tag Filtering (Hard Filter)
        if required_tags:
            item_tags = (chunk.get('tags') or "").lower()
            # Check if ALL required tags are present in item_tags
            if not all(rt in item_tags for rt in required_tags):
                continue

        # 1. Metadata Filtering
        if type_filter:
            c_type = chunk['item_type']
            match = False
            if type_filter == c_type: match = True
            elif type_filter == 'link' and c_type == 'article': match = True
            elif type_filter == 'pdf' and c_type == 'file': match = True
            if not match: continue

        if start_date and end_date:
            try:
                item_date = datetime.strptime(chunk['created_at'], "%Y-%m-%d %H:%M:%S")
                if not (start_date <= item_date <= end_date):
                    continue
            except:
                continue

        # 2. Vector Scoring
        score = 0
        if q_vec is not None and chunk['embedding']:
            try:
                chunk_vec = json.loads(chunk['embedding'])
                raw_score = cosine_sim(q_vec, chunk_vec)
                # Apply Weighting based on chunk type
                weight = CHUNK_WEIGHTS.get(chunk['chunk_type'], 1.0)
                score = raw_score * weight
            except: score = 0
        
        if score > 0.15 or (not cleaned_q): # Lowered threshold for recall stage
             candidates.append({
                 "item_id": chunk['item_id'],
                 "vector_score": score,
                 "chunk_type": chunk['chunk_type'],
                 "text": chunk['text'],
                 "created_at": chunk['created_at'],
                 "item_title": chunk['title']
             })

    # Sort by vector score and keep top 60
    candidates.sort(key=lambda x: x["vector_score"], reverse=True)
    top_candidates = candidates[:60]
    
    # --- STAGE 2: Reranking (Precision) ---
    reranked_chunks = []
    
    for c in top_candidates:
        final_score = c['vector_score']
        boosts = []
        
        # Keyword Boost
        overlap = keyword_overlap_score(query_keywords, c['text'])
        if overlap > 0:
            boost = 0.05 * overlap
            final_score += boost
            boosts.append(f"+Key({overlap})")
            
        # Modality Boost
        mod_boost = get_modality_boost(cleaned_q, c['chunk_type'])
        if mod_boost > 0:
            final_score += mod_boost
            boosts.append("+Mode")
            
        # Recency Boost
        rec_boost = get_recency_boost(c['created_at'])
        if rec_boost > 0:
            final_score += rec_boost
            boosts.append("+New")
            
        c['final_score'] = final_score
        c['boosts'] = " ".join(boosts)
        reranked_chunks.append(c)

    # Aggregation by Item (Multi-chunk evidence)
    item_map = {}
    for c in reranked_chunks: 
        iid = c['item_id']
        if iid not in item_map:
            item_map[iid] = {
                "chunks": [c]
            }
        else:
            item_map[iid]['chunks'].append(c)

    results_list = []
    for iid, data in item_map.items():
        chunks = data['chunks']
        # Find best chunk
        best_chunk = max(chunks, key=lambda x: x['final_score'])
        
        # Item Score = Best Chunk + Evidence Bonus
        item_score = best_chunk['final_score']
        
        # Add 0.03 for every additional supporting chunk (capped at 5)
        evidence_count = len(chunks) - 1
        if evidence_count > 0:
            bonus = min(0.15, 0.03 * evidence_count)
            item_score += bonus
        
        item = get_item(iid, userId)
        if not item: continue
        
        # --- Step 6: Usage Boost ---
        u_boost = usage_boost(item.get('access_count', 0))
        item_score += u_boost
        
        item['score'] = float(item_score)
        
        explanation = f"Matched {best_chunk['chunk_type']}: \"{best_chunk['text'][:100]}...\""
        if best_chunk['boosts']:
            explanation += f" [{best_chunk['boosts']}]"
        if evidence_count > 0:
            explanation += f" (+{evidence_count} more)"
        if u_boost > 0:
            explanation += f" (+UsageBoost)"
            
        if filter_desc:
            explanation += f" ({filter_desc})"
            
        item['explanation'] = explanation
        results_list.append(item)

    results_list.sort(key=lambda x: x['score'], reverse=True)
    return results_list[:20]
    
    # Aggregation
    item_map = {}
    for c in chunk_scores: 
        iid = c['item_id']
        if iid not in item_map:
            item_map[iid] = {
                "score": c['score'],
                "best_chunk": c,
                "matches": [c]
            }
        else:
            if c['score'] > item_map[iid]['score']:
                item_map[iid]['score'] = c['score']
                item_map[iid]['best_chunk'] = c
            if len(item_map[iid]['matches']) < 3:
                item_map[iid]['matches'].append(c)

    results_list = []
    for iid, data in item_map.items():
        item = get_item(iid, userId)
        if not item: continue
        
        item['score'] = float(data['score'])
        
        best = data['best_chunk']
        explanation = f"Matched {best['chunk_type']}: \"{best['text'][:100]}...\""
        if filter_desc:
            explanation += f" ({filter_desc})"
            
        item['explanation'] = explanation
        results_list.append(item)

    results_list.sort(key=lambda x: x['score'], reverse=True)
    return results_list[:20]

@app.get("/api/items/{item_id}")
async def get_single_item(item_id: int, userId: str = None):
    item = get_item(item_id, userId)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # --- Step 6 & 8: Feedback Loop ---
    # Record access for usage boost
    try:
        record_access(item_id, 1)
    except Exception as e:
        print(f"Error recording access: {e}")

    # Update user profile for personalization
    if userId:
        try:
            # We run this in background or just fire and forget since it might be slow?
            # For now, synchronous is fine as sqlite is fast enough for single user.
            update_user_profile(userId)
        except Exception as e:
            print(f"Error updating user profile: {e}")

    return item

@app.post("/api/tags")
async def get_tags(userId: str = None):
    if not userId:
        return []
    return get_all_tags(userId)

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

class BulkDeleteRequest(BaseModel):
    item_ids: List[int]

@app.post("/api/items/bulk-delete")
async def bulk_delete_endpoint(
    request: BulkDeleteRequest,
    userId: str = None 
):
    if not userId:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    delete_items(request.item_ids, userId)
    return {"status": "deleted", "count": len(request.item_ids)}

@app.get("/api/processing")
async def list_processing_items(userId: str):
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")
    return get_processing_items(userId)

@app.get("/api/tags")
async def get_tags(userId: str = None):
    if not userId:
        return []
    return get_all_tags(userId)