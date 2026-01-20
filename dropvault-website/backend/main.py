from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
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
from .database import init_db, add_item, get_all_items, delete_item, delete_items, update_item, get_item, get_all_items_with_embeddings, get_all_tags
from .vision import detect_objects

app = FastAPI()

# Initialize Whisper Model (load once)
# Using "base" model for a balance of speed and accuracy. 
# Options: tiny, base, small, medium, large
print("Loading Whisper model...")
try:
    whisper_model = whisper.load_model("base")
    print("Whisper model loaded.")
except Exception as e:
    print(f"Failed to load Whisper model: {e}")
    whisper_model = None

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

def extract_text_from_image(path):
    print(f"Running OCR on: {path}")
    try:
        # Load image
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

def generate_video_thumbnail(video_path, thumbnail_path):
    print(f"Generating thumbnail for: {video_path}")
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("Could not open video for thumbnail generation")
            return False

        # Get total frame count
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Seek to 10% or 1st second to avoid black start frames
        seek_frame = min(30, total_frames // 10)
        cap.set(cv2.CAP_PROP_POS_FRAMES, seek_frame)
        
        ret, frame = cap.read()
        if ret:
            # Save thumbnail
            cv2.imwrite(thumbnail_path, frame)
            print(f"Thumbnail saved to: {thumbnail_path}")
            cap.release()
            return True
        else:
            print("Could not read frame for thumbnail")
            cap.release()
            return False

    except Exception as e:
        print(f"Thumbnail Generation Error: {e}")
        return False

def transcribe_audio(file_path):
    """
    Transcribe audio file using OpenAI Whisper.
    """
    if not whisper_model:
        return "Transcription unavailable (Model not loaded)."
        
    print(f"Transcribing audio: {file_path}")
    try:
        # Run transcription
        result = whisper_model.transcribe(file_path)
        text = result["text"].strip()
        print(f"Transcription complete. Length: {len(text)}")
        return text

    except Exception as e:
        print(f"Transcription Error: {e}")
        return f"[Transcription Failed: {str(e)}]"

def extract_text(file_path, type, content=None):
    extracted_links = set()
    
    if type == "pdf":
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
                    
                    # Extract hyperlinks
                    try:
                        hyperlinks = page.hyperlinks
                        for link in hyperlinks:
                            if 'uri' in link:
                                extracted_links.add(link['uri'])
                    except:
                        pass
                        
            # Append extracted links
            if extracted_links:
                text += "\n\n--- Extracted Links ---\n" + "\n".join(extracted_links)
                
            return text, None, None
        except Exception as e:
            print(f"PDF Extraction Error: {e}")
            return "", None, None
    elif type == "image":
        text = extract_text_from_image(file_path)
        return text, None, None
    elif type == "audio" or type == "video":
        text = transcribe_audio(file_path)
        return text, None, None
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
                "keywords": None,
                "image": None
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
            meta["image"] = get_content(["og:image", "twitter:image"])

            if not meta["date"] or not meta["author"] or not meta["title"] or not meta["description"]:
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
                                    if not meta["image"]:
                                         meta["image"] = data.get("image") or data.get("thumbnailUrl")
                                    if not meta["title"]:
                                        meta["title"] = data.get("name") or data.get("headline")
                                    if not meta["description"]:
                                        meta["description"] = data.get("description") or data.get("articleBody")
                            except: pass
                except: pass

            # Fallback for title/desc if still empty
            if not meta["title"] and soup.title:
                meta["title"] = soup.title.string.strip()
            
            # Clean up title (remove site names)
            if meta["title"]:
                separators = [" | ", " - ", " : ", " • ", " on Instagram", " on TikTok"]
                for sep in separators:
                    if sep in meta["title"]:
                         # Check if the part after separator is the site name or similar generic text
                         parts = meta["title"].split(sep)
                         if len(parts) > 1:
                             # Heuristic: if the last part is short or matches site name, remove it
                             last = parts[-1].strip().lower()
                             if last in ["instagram", "tiktok", "youtube", "twitter", "x", "facebook", "linkedin"] or len(last) < 15:
                                 meta["title"] = sep.join(parts[:-1]).strip()

            page_title = meta["title"]

            for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                script.extract()
            
            body_text = soup.get_text()
            lines = (line.strip() for line in body_text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_body = "\n".join(chunk for chunk in chunks if chunk)
            
            # Find links in body text
            urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', clean_body)
            for url in urls:
                extracted_links.add(url)

            final_parts = [f"URL: {content}"]
            if meta["title"]: final_parts.append(f"Title: {meta['title']}")
            if meta["description"]: final_parts.append(f"Description: {meta['description']}")
            if meta["author"]: final_parts.append(f"Author: {meta['author']}")
            if meta["date"]: final_parts.append(f"Date: {meta['date']}")
            if meta["site_name"]: final_parts.append(f"Site: {meta['site_name']}")
            if meta["keywords"]: final_parts.append(f"Keywords: {meta['keywords']}")
            
            final_parts.append("\n--- Content ---\n")
            final_parts.append(clean_body[:7000])
            
            if extracted_links:
                final_parts.append("\n\n--- Extracted Links ---\n" + "\n".join(list(extracted_links)[:20])) # Limit to 20 links

            return "\n".join(final_parts), page_title, meta["image"]

        except Exception as e:
            print(f"Link Extraction Error: {e}")
            return content, None, None
    elif type in ["note", "text"]:
        return content or "", None, None
    return content or "", None, None


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

    text_to_embed = f"{title} "
    if tags:
        text_to_embed += f"Tags: {tags} "
    if notes:
        text_to_embed += f"Notes: {notes} "
        
    extracted_text = ""
    meta_title = None
    
    # Preserve the original URL in file_path for link types
    final_file_path = file_path
    if (type == "link" or type == "video") and content and content.startswith("http"):
        final_file_path = content

    if (type == "pdf" or type == "image" or type == "audio" or (type == "video" and file_path and not file_path.startswith('http'))) and file_path:
        clean_path = file_path.replace("/uploads/", "")
        local_path = os.path.join(UPLOAD_DIR, clean_path)
        if os.path.exists(local_path):
            # For video files, we use the same transcription logic as audio
            extracted_text, meta_title, meta_image = extract_text(local_path, type)
        else:
            print(f"File not found: {local_path}")
            extracted_text, meta_title, meta_image = "", None, None
    elif type == "link" or type == "video":
        extracted_text, meta_title, meta_image = extract_text(None, type, content)
    else:
        extracted_text = content or ""
        meta_title, meta_image = None, None
    
    if meta_title:
        if not title or title.strip() == content.strip() or title.startswith("http") or len(title) < 5:
            title = meta_title

    # Use extracted image as thumbnail if we don't have one
    if not thumbnail_path and meta_image:
        thumbnail_path = meta_image
        # Ideally we should download it, but for now we store the URL.
        # If it's Instagram, it might expire, but some public ones last.
        # Future improvement: Download and save locally.

    # --- Computer Vision Object Detection (OWL-ViT + BLIP) ---
    vision_results = {"caption": "", "tags": []}
    try:
        if type == "image" and file_path and not file_path.startswith("http"):
             # For local images
             clean_path = file_path.replace("/uploads/", "")
             local_path = os.path.join(UPLOAD_DIR, clean_path)
             if os.path.exists(local_path):
                 print(f"Running Vision on Image: {local_path}")
                 vision_results = detect_objects(local_path)
        
        elif type == "video" and thumbnail_path and not thumbnail_path.startswith("http"):
             # For videos, use the generated thumbnail
             clean_thumb_path = thumbnail_path.replace("/uploads/", "")
             local_thumb_path = os.path.join(UPLOAD_DIR, clean_thumb_path)
             if os.path.exists(local_thumb_path):
                 print(f"Running Vision on Video Thumbnail: {local_thumb_path}")
                 vision_results = detect_objects(local_thumb_path)
        
        if not vision_results["caption"] and not vision_results["tags"]:
            print("Vision returned no results. Check vision.py logs.")
            
    except Exception as e:
        print(f"Vision Processing Failed: {e}")

    if vision_results["caption"]:
        extracted_text += f"\n\nAI Description: {vision_results['caption']}"
        text_to_embed += f" Description: {vision_results['caption']} "
        
    if vision_results["tags"]:
        extracted_text += f"\nDetected Objects: {', '.join(vision_results['tags'])}"
        text_to_embed += f" Objects: {', '.join(vision_results['tags'])} "

    text_to_embed += extracted_text[:8000]
    
    vector = generate_embedding(text_to_embed)
    
    item_id = add_item(title, type, extracted_text, notes, final_file_path, vector, tags, userId, thumbnail_path)
    
    return {
        "id": item_id, 
        "status": "saved", 
        "extracted_text": extracted_text[:200] + "..." if extracted_text else ""
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
            # 1. Exact Tag Match (Highest Priority)
            if cleaned_q in item_tags:
                score = max(score, 2.5) 
                explanation = f"Exact tag match." 
            # 2. Query matches start of a tag (High Priority)
            elif any(t.startswith(cleaned_q) for t in item_tags):
                score = max(score, 1.8)
                explanation = f"Tag starts with query."
            # 3. Query contained in a tag (Medium-High Priority)
            elif any(cleaned_q in t for t in item_tags):
                score = max(score, 1.2)
                explanation = f"Tag contains query."
            elif any(word in item_tags for word in cleaned_q.split()):
                score += 0.2
                explanation += " Word in tag match."

        if cleaned_q and item['title'] and cleaned_q in item['title'].lower():
            score = max(score, 0.9)
            explanation = "Exact title match."

        # IMPROVED CONTENT MATCHING
        if cleaned_q and item['content']:
            content_lower = item['content'].lower()
            
            # 1. Exact phrase match (High confidence)
            if cleaned_q in content_lower:
                if score < 0.8:
                    score = max(score, 0.8)
                    explanation = "Exact match in content."
                else:
                    score += 0.1
                    explanation += " + Content match."
            
            # 2. Partial keyword match (Medium confidence)
            elif len(cleaned_q.split()) > 1:
                query_tokens = cleaned_q.split()
                matches = sum(1 for token in query_tokens if token in content_lower)
                match_ratio = matches / len(query_tokens)
                
                if match_ratio >= 0.75: # 75% of words found
                     score = max(score, 0.6)
                     explanation += " Most keywords found in content."
                elif match_ratio >= 0.5: # 50% of words found
                     score = max(score, 0.4)
                     explanation += " Some keywords found in content."

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

@app.get("/api/tags")
async def get_tags(userId: str = None):
    if not userId:
        return []
    return get_all_tags(userId)