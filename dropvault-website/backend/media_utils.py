import os
import shutil
import uuid
import json
import re
import mimetypes
from datetime import datetime
import numpy as np
import pdfplumber
import requests
from bs4 import BeautifulSoup
import pytesseract
import cv2
from PIL import Image
import whisper
import torch
import gc

# Static for uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Global Whisper Model (Lazy Loaded)
whisper_model = None

def load_whisper_model():
    global whisper_model
    if whisper_model is not None:
        return True
        
    print("Audio: Loading Whisper model (base)...")
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        whisper_model = whisper.load_model("base", device=device)
        print(f"Audio: Whisper model loaded on {device}.")
        return True
    except Exception as e:
        print(f"Audio: Failed to load Whisper model: {e}")
        whisper_model = None
        return False

def unload_whisper_model():
    global whisper_model
    print("Audio: Unloading Whisper model...")
    if whisper_model is not None:
        del whisper_model
        whisper_model = None
    
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()
    print("Audio: Whisper model unloaded.")

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
        # Optimization: Tesseract 4+ works best with raw grayscale images.
        # Removing expensive Blur/Thresholding significantly speeds up CPU processing.
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
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
    global whisper_model
    if not whisper_model:
        # Auto-load if not loaded (fallback, though orchestrator should handle)
        if not load_whisper_model():
             return "Transcription unavailable (Model failed to load)."
        
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