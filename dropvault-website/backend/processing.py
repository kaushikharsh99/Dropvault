import threading
import queue
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from .database import update_item, get_item
from .media_utils import extract_text, extract_text_from_image, transcribe_audio, UPLOAD_DIR
from .ai import generate_embedding
from .vision import detect_objects
import os
import json

# --- WebSocket Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Filter dead connections
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        
        for dc in dead_connections:
            if dc in self.active_connections:
                self.active_connections.remove(dc)

manager = ConnectionManager()

# --- Worker Processor ---
class ItemProcessor:
    def __init__(self):
        self.cpu_executor = ThreadPoolExecutor(max_workers=4) # Parallel OCR/Whisper
        self.gpu_lock = threading.Lock() # Sequential Vision
        self.running = True
        
        # Queues
        self.task_queue = queue.Queue()
        
        # Start main worker thread
        self.worker_thread = threading.Thread(target=self.process_queue, daemon=True)
        self.worker_thread.start()

    def add_task(self, item_id, file_path, item_type, user_id, thumbnail_path=None):
        self.task_queue.put({
            "id": item_id,
            "file_path": file_path,
            "type": item_type,
            "user_id": user_id,
            "thumbnail_path": thumbnail_path
        })
        print(f"Task added for item {item_id}")

    def update_progress_sync(self, item_id, stage, percent, user_id):
        # Update DB
        update_item(
            item_id=item_id, 
            title=None, content=None, tags=None, 
            status="processing", 
            progress_stage=stage, 
            progress_percent=percent, 
            user_id=user_id
        )
        
        # Broadcast WS (needs event loop)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                 asyncio.run_coroutine_threadsafe(manager.broadcast({
                    "item_id": item_id,
                    "stage": stage,
                    "percent": percent,
                    "status": "processing"
                }), loop)
            else:
                 loop.run_until_complete(manager.broadcast({
                    "item_id": item_id,
                    "stage": stage,
                    "percent": percent,
                    "status": "processing"
                }))
        except Exception:
             # Fallback if no loop available in thread
             pass

    def process_queue(self):
        while self.running:
            try:
                task = self.task_queue.get(timeout=1)
            except queue.Empty:
                continue

            # Offload to appropriate executor
            if task['type'] in ['image', 'pdf']:
                self.cpu_executor.submit(self.run_ocr_pipeline, task)
            elif task['type'] in ['audio', 'video'] and not task['file_path'].startswith('http'):
                # Whisper is CPU-heavy but user said parallel CPU is OK.
                self.cpu_executor.submit(self.run_media_pipeline, task)
            else:
                self.cpu_executor.submit(self.run_general_pipeline, task)
                
            self.task_queue.task_done()

    def run_ocr_pipeline(self, task):
        item_id = task['id']
        file_path = task['file_path']
        user_id = task['user_id']
        
        try:
            # 1. OCR Stage
            self.update_progress_sync(item_id, "ocr", 10, user_id)
            extracted_text = ""
            
            # Resolve full path
            full_path = file_path
            if file_path and not os.path.isabs(file_path) and not file_path.startswith("http"):
                 # Assuming file_path stored in DB is relative URL like /uploads/...
                 clean_path = file_path.replace("/uploads/", "", 1).lstrip("/")
                 full_path = os.path.join(UPLOAD_DIR, clean_path)

            if task['type'] == 'image':
                extracted_text = extract_text_from_image(full_path)
            else:
                # For PDF
                extracted_text, _, _ = extract_text(full_path, task['type'])
                
            self.update_progress_sync(item_id, "visual", 40, user_id)
            
            # 2. Vision Stage (GPU - Sequential)
            vision_caption = ""
            vision_tags = []
            
            if task['type'] == 'image':
                with self.gpu_lock: # Ensure sequential GPU access
                    try:
                        vision_results = detect_objects(full_path)
                        vision_caption = vision_results["caption"]
                        vision_tags = vision_results["tags"]
                    except Exception as e:
                        print(f"Vision error: {e}")
            
            # Combine content
            final_content = extracted_text
            if vision_caption:
                final_content += f"\n\nAI Description: {vision_caption}"
            if vision_tags:
                final_content += f"\nDetected Objects: {', '.join(vision_tags)}"
                
            self.update_progress_sync(item_id, "embed", 80, user_id)
            
            # 3. Embedding Stage
            text_to_embed = f"{final_content[:8000]}"
            vector = generate_embedding(text_to_embed)
            
            # Final Update
            update_item(
                item_id=item_id,
                title=None, 
                content=final_content, 
                tags=None, 
                embedding=vector,
                user_id=user_id,
                status="completed",
                progress_stage="done",
                progress_percent=100
            )
            
            # Final Broadcast handled by update loop usually, but explicit here
            self.update_progress_sync(item_id, "done", 100, user_id)
            
        except Exception as e:
            print(f"Error processing item {item_id}: {e}")
            update_item(item_id, title=None, content=None, tags=None, user_id=user_id, status="failed")

    def run_media_pipeline(self, task):
        item_id = task['id']
        file_path = task['file_path']
        user_id = task['user_id']
        thumb_url = task.get('thumbnail_path')
        
        try:
            # Resolve full path
            full_path = file_path
            if file_path and not os.path.isabs(file_path) and not file_path.startswith("http"):
                 clean_path = file_path.replace("/uploads/", "", 1).lstrip("/")
                 full_path = os.path.join(UPLOAD_DIR, clean_path)

            # 1. Vision Stage (Thumbnail analysis) - GPU Sequential
            self.update_progress_sync(item_id, "visual", 10, user_id)
            
            vision_caption = ""
            vision_tags = []
            
            if thumb_url:
                clean_thumb = thumb_url.replace("/uploads/", "", 1).lstrip("/")
                thumb_full_path = os.path.join(UPLOAD_DIR, clean_thumb)
                
                if os.path.exists(thumb_full_path):
                     with self.gpu_lock:
                        try:
                            vision_results = detect_objects(thumb_full_path)
                            vision_caption = vision_results["caption"]
                            vision_tags = vision_results["tags"]
                        except Exception as e:
                            print(f"Vision error on thumb: {e}")

            # 2. Whisper Stage (CPU Parallel as requested)
            self.update_progress_sync(item_id, "whisper", 40, user_id)
            
            transcript = ""
            try:
                if task['type'] in ['audio', 'video']:
                    transcript = transcribe_audio(full_path)
            except Exception as e:
                 print(f"Whisper error: {e}")
            
            final_content = transcript
            if vision_caption:
                final_content += f"\n\nAI Description: {vision_caption}"
            if vision_tags:
                final_content += f"\nDetected Objects: {', '.join(vision_tags)}"
            
            self.update_progress_sync(item_id, "embed", 80, user_id)
            
            # 3. Embedding
            text_to_embed = f"{final_content[:8000]}"
            vector = generate_embedding(text_to_embed)
            
            # Final Update
            update_item(
                item_id=item_id,
                title=None, 
                content=final_content, 
                tags=None, 
                embedding=vector,
                user_id=user_id,
                status="completed",
                progress_stage="done",
                progress_percent=100
            )
            
            self.update_progress_sync(item_id, "done", 100, user_id)
            
        except Exception as e:
            print(f"Error processing media {item_id}: {e}")
            update_item(item_id, title=None, content=None, tags=None, user_id=user_id, status="failed")

    def run_general_pipeline(self, task):
        # Links, Notes, Text
        item_id = task['id']
        user_id = task['user_id']
        item_type = task['type']
        file_path = task['file_path'] # For links, this is URL
        
        try:
            self.update_progress_sync(item_id, "metadata", 20, user_id)
            
            extracted_text = ""
            meta_title = None
            meta_image = None
            
            # Fetch item from DB to see if content was passed (e.g. note body)
            item = get_item(item_id, user_id)
            if not item: return
            
            if item_type == 'link' or (item_type == 'video' and file_path.startswith('http')):
                extracted_text, meta_title, meta_image = extract_text(None, item_type, file_path)
            elif item_type in ['note', 'text']:
                extracted_text = item['content']
            else:
                extracted_text = item['content']

            self.update_progress_sync(item_id, "embed", 70, user_id)
            
            # Embedding
            text_to_embed = f"{item['title']} {extracted_text[:8000]} {item['tags']}"
            vector = generate_embedding(text_to_embed)
            
            # If meta_title was found and current title is generic or url
            final_title = None
            if meta_title:
                curr_title = item['title']
                if not curr_title or curr_title.strip() == file_path.strip() or curr_title.startswith("http") or len(curr_title) < 5:
                    final_title = meta_title
            
            update_item(
                item_id=item_id, 
                title=final_title, 
                content=extracted_text, 
                tags=None, 
                embedding=vector, 
                user_id=user_id, 
                thumbnail_path=meta_image, # Update thumbnail if found
                status="completed", 
                progress_stage="done", 
                progress_percent=100
            )
            
            self.update_progress_sync(item_id, "done", 100, user_id)
            
        except Exception as e:
            print(f"Error processing general item {item_id}: {e}")
            update_item(item_id, title=None, content=None, tags=None, user_id=user_id, status="failed")

processor = ItemProcessor()
