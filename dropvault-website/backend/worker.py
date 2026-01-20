import threading
import queue
import time
import asyncio
import os
import torch
import gc
from concurrent.futures import ThreadPoolExecutor

from .database import update_item, get_item, get_processing_items
from .media_utils import (
    extract_text_from_image, 
    extract_text,
    transcribe_audio, 
    load_whisper_model, 
    unload_whisper_model,
    UPLOAD_DIR
)
from .ai import generate_embedding
from .vision import (
    detect_objects, 
    load_vision_models, 
    unload_vision_models
)

# --- WebSocket Manager (Shared) ---
# In a larger app, this would be in its own file.
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
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

# --- The Safe Worker ---
class ProcessingWorker:
    def __init__(self):
        self.task_queue = queue.Queue()
        self.running = True
        
        # System Limits
        self.cpu_cores = max(2, (os.cpu_count() or 2) - 1)
        self.gpu_available = torch.cuda.is_available()
        
        print(f"[Worker] Initialized with {self.cpu_cores} CPU threads. GPU Available: {self.gpu_available}")

        # Executors
        # CPU pool for OCR and pre-processing
        self.cpu_pool = ThreadPoolExecutor(max_workers=self.cpu_cores)
        
        # We use a single main loop to orchestrate the "Stages" 
        # This ensures we don't accidentally load multiple heavy models at once
        self.main_thread = threading.Thread(target=self.run_pipeline, daemon=True)
        self.main_thread.start()
        
        # Recover pending tasks
        self.recover_state()

    def add_task(self, item_id, file_path, item_type, user_id, thumbnail_path=None):
        task = {
            "id": item_id,
            "file_path": file_path,
            "type": item_type,
            "user_id": user_id,
            "thumbnail_path": thumbnail_path,
            # Accumulators
            "ocr_text": "",
            "vision_caption": "",
            "vision_tags": [],
            "transcript": "",
            "meta_title": None,
            "meta_image": None
        }
        self.task_queue.put(task)
        print(f"[Worker] Task {item_id} queued.")

    def recover_state(self):
        try:
            items = get_processing_items(user_id=None)
            for item in items:
                print(f"[Worker] Recovering item {item['item_id']}")
                self.add_task(
                    item['item_id'], 
                    item['file_path'], 
                    item['type'], 
                    item['user_id'],
                    item['thumbnail_path']
                )
        except Exception as e:
            print(f"[Worker] Recovery failed: {e}")

    def update_progress(self, task, stage, percent, message):
        update_item(
            item_id=task['id'],
            title=None, content=None, tags=None,
            status="processing",
            progress_stage=stage,
            progress_percent=percent,
            progress_message=message,
            user_id=task['user_id']
        )
        # Broadcast via WS
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                 asyncio.run_coroutine_threadsafe(manager.broadcast({
                    "item_id": task['id'], "stage": stage, "percent": percent, "message": message, "status": "processing"
                }), loop)
            else:
                 loop.run_until_complete(manager.broadcast({
                    "item_id": task['id'], "stage": stage, "percent": percent, "message": message, "status": "processing"
                }))
        except: pass

    def resolve_path(self, path):
        if not path or path.startswith("http"): return path
        if path.startswith("/uploads/"):
            clean = path.replace("/uploads/", "", 1).lstrip("/")
            return os.path.join(UPLOAD_DIR, clean)
        return path

    def run_pipeline(self):
        while self.running:
            try:
                task = self.task_queue.get(timeout=1)
                self.process_task(task)
                self.task_queue.task_done()
            except queue.Empty:
                time.sleep(0.5)
                continue
            except Exception as e:
                print(f"[Worker] Pipeline Error: {e}")

    def process_task(self, task):
        item_id = task['id']
        user_id = task['user_id']
        full_path = self.resolve_path(task['file_path'])
        
        try:
            # --- STAGE 1: OCR / Metadata (CPU) ---
            self.update_progress(task, "ocr", 10, "Extracting text & metadata...")
            
            # Use CPU pool to avoid blocking the orchestrator loop if we were handling multiple,
            # but since we are sequential here, we can just run it. 
            # However, for OCR, it might be heavy. 
            # Ideally, we submit to CPU pool and wait.
            future = self.cpu_pool.submit(self._stage_ocr, task, full_path)
            future.result() # Wait for completion before moving to GPU stages

            # --- STAGE 2: Vision (GPU) ---
            if task['type'] in ['image', 'video']:
                self.update_progress(task, "visual", 35, "Analyzing visual content...")
                
                # Unload Whisper if loaded
                unload_whisper_model()
                # Load Vision
                load_vision_models()
                
                thumb_path = self.resolve_path(task['thumbnail_path']) if task.get('thumbnail_path') else full_path
                if task['type'] == 'video' and not task.get('thumbnail_path'):
                    print(f"Skipping vision for video {item_id}: No thumbnail")
                else:
                    if os.path.exists(thumb_path):
                        v_res = detect_objects(thumb_path)
                        task['vision_caption'] = v_res['caption']
                        task['vision_tags'] = v_res['tags']

            # --- STAGE 3: Whisper (Audio/Video) ---
            if task['type'] in ['audio', 'video']:
                self.update_progress(task, "whisper", 65, "Transcribing audio...")
                
                # Unload Vision
                unload_vision_models()
                # Load Whisper
                load_whisper_model()
                
                task['transcript'] = transcribe_audio(full_path)

            # --- STAGE 4: Assembly & Embedding (CPU) ---
            self.update_progress(task, "embed", 85, "Generating embeddings...")
            
            # Construct final content
            final_parts = []
            
            # Base text
            if task['extracted_text']:
                final_parts.append(task['extracted_text'])
            
            # Visuals
            if task['vision_caption']:
                final_parts.append(f"AI Description: {task['vision_caption']}")
            if task['vision_tags']:
                final_parts.append(f"Detected Objects: {', '.join(task['vision_tags'])}")
                
            # Audio
            if task['transcript']:
                final_parts.append(f"Transcript:\n{task['transcript']}")
                
            final_content = "\n\n".join(final_parts)
            
            # Embed
            vector = generate_embedding(final_content[:8000])
            
            # Final Title Logic
            final_title = None
            if task['meta_title']:
                # Update title only if current is generic
                # We need to fetch current DB state to be safe, or just trust the logic
                # For now, let's just pass it to update_item, which overrides.
                # Assuming 'create_item' passed a decent title or filename.
                # If meta_title is better, we use it.
                final_title = task['meta_title']

            # Save
            update_item(
                item_id=item_id,
                title=final_title,
                content=final_content,
                tags=None,
                embedding=vector,
                user_id=user_id,
                thumbnail_path=task['meta_image'], # Only from link metadata
                status="completed",
                progress_stage="done",
                progress_percent=100,
                progress_message="Processing Complete"
            )
            
            # Cleanup GPU memory at end of task? 
            # Or keep loaded for next task?
            # Keeping is faster. But if we switch types, the next loop handles unloading.
            
            # Final Broadcast
            self.update_progress(task, "done", 100, "Processing Complete")

        except Exception as e:
            print(f"[Worker] Task {item_id} Failed: {e}")
            update_item(item_id=item_id, title=None, content=None, tags=None, user_id=user_id, status="failed", progress_message="Failed")
            # Try to unload everything on failure to reset state
            unload_vision_models()
            unload_whisper_model()

    def _stage_ocr(self, task, full_path):
        # This runs in a thread
        if task['type'] == 'image':
            task['extracted_text'] = extract_text_from_image(full_path)
        elif task['type'] == 'pdf':
            task['extracted_text'], _, _ = extract_text(full_path, 'pdf')
        elif task['type'] == 'link':
            task['extracted_text'], task['meta_title'], task['meta_image'] = extract_text(None, 'link', task['file_path'])
        elif task['type'] == 'video' and task['file_path'].startswith('http'):
            task['extracted_text'], task['meta_title'], task['meta_image'] = extract_text(None, 'video', task['file_path'])
        elif task['type'] in ['note', 'text']:
            # For notes, content is already in DB or we need to fetch it.
            # 'create_item' saved it to DB.
            # We can fetch from DB to be sure.
            item = get_item(task['id'], task['user_id'])
            if item:
                task['extracted_text'] = item['content']

# Initialize Singleton
worker = ProcessingWorker()
