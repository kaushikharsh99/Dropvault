import os
# OPTIMIZATION: Limit OpenMP threads for Tesseract/NumPy to 1 per process
os.environ["OMP_THREAD_LIMIT"] = "1"

import threading
import queue
import time
import asyncio
import torch
import gc
from concurrent.futures import ThreadPoolExecutor

from .database import update_item, get_item, get_processing_items, insert_chunk, add_item, get_item_by_path, delete_chunks
from .chunker import split_text
from .github_data import fetch_github_repos
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
    batch_analyze_images,
    load_vision_models, 
    unload_vision_models
)

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

class ProcessingWorker:
    def __init__(self):
        self.running = True
        
        # Priority Queues
        self.ocr_queue = queue.Queue()      # Stage 1: CPU (OCR/Meta)
        self.vision_queue = queue.Queue()   # Stage 2A: GPU (BLIP/OWL) - HIGH PRIORITY
        self.whisper_queue = queue.Queue()  # Stage 2B: GPU (Whisper) - LOW PRIORITY
        self.embed_queue = queue.Queue()    # Stage 3: CPU (Embedding)
        self.github_queue = queue.Queue()   # Stage 0: Network (GitHub Fetch)
        
        # System Limits
        self.cpu_cores = max(2, (os.cpu_count() or 2) - 1)
        self.gpu_available = torch.cuda.is_available()
        
        print(f"\n[Worker] System Optimized.")
        print(f" - CPU Cores: {self.cpu_cores} (Tesseract/Embed)")
        print(f" - GPU: {'Available' if self.gpu_available else 'None'} (Vision/Whisper)")
        print(f" - Priority Mode: Vision > Whisper")

        # Executors
        self.cpu_pool = ThreadPoolExecutor(max_workers=self.cpu_cores)
        
        # Start Pipeline Threads
        threading.Thread(target=self.ocr_worker, daemon=True).start()
        threading.Thread(target=self.gpu_worker, daemon=True).start()
        threading.Thread(target=self.embed_worker, daemon=True).start()
        threading.Thread(target=self.github_worker, daemon=True).start()
        
        # Recover pending tasks
        self.recover_state()

    def add_task(self, item_id, file_path, item_type, user_id, thumbnail_path=None):
        task = {
            "id": item_id,
            "file_path": file_path,
            "type": item_type,
            "user_id": user_id,
            "thumbnail_path": thumbnail_path,
            "ocr_text": "",
            "vision_caption": "",
            "vision_tags": [],
            "transcript": "",
            "meta_title": None,
            "meta_image": None,
            "vision_done": False
        }
        self.ocr_queue.put(task)
        print(f"[Worker] Task {item_id} added to OCR queue.")

    def add_github_task(self, user_id):
        self.github_queue.put({"user_id": user_id})
        print(f"[Worker] GitHub sync task added for user {user_id}")

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

    def resolve_path(self, path):
        if not path or path.startswith("http"): return path
        if path.startswith("/uploads/"):
            clean = path.replace("/uploads/", "", 1).lstrip("/")
            return os.path.join(UPLOAD_DIR, clean)
        return path

    def update_progress(self, task, stage, percent, message, status="processing"):
        update_item(
            item_id=task['id'],
            title=None, content=None, tags=None,
            status=status,
            progress_stage=stage,
            progress_percent=percent,
            progress_message=message,
            user_id=task['user_id']
        )
        try:
            loop = asyncio.get_event_loop()
            msg = {
                "item_id": task['id'], "stage": stage, "percent": percent, 
                "message": message, "status": status
            }
            if loop.is_running():
                 asyncio.run_coroutine_threadsafe(manager.broadcast(msg), loop)
            else:
                 loop.run_until_complete(manager.broadcast(msg))
        except: pass

    # --- STAGE 4: GitHub Worker ---
    def github_worker(self):
        while self.running:
            try:
                task = self.github_queue.get(timeout=1)
                user_id = task['user_id']
                
                print(f"[GitHub Worker] Starting sync for {user_id}")
                repos = fetch_github_repos(user_id)
                
                for repo in repos:
                    content = f"{repo['description'] or ''}\n\nLanguage: {repo['language']}\nStars: {repo['stars']}\n\n--- Recent Commits ---\n{repo['commits']}\n\n--- README ---\n{repo['readme'][:5000]}"
                    
                    # Check for existing item
                    existing = get_item_by_path(user_id, repo['html_url'])
                    
                    if existing:
                        print(f"[GitHub Worker] Updating existing repo: {repo['full_name']}")
                        item_id = existing['id']
                        
                        # 1. Update Metadata
                        update_item(
                            item_id=item_id,
                            title=repo['full_name'], # Updates name if renamed
                            content=content,         # Updates content (readme/commits)
                            tags="github,code,repo",
                            status="processing",
                            progress_stage="updating",
                            progress_percent=0,
                            progress_message="Updating content...",
                            user_id=user_id
                        )
                        
                        # 2. Clear old chunks (Critical for re-indexing)
                        delete_chunks(item_id)
                        
                    else:
                        # Create New Item
                        item_id = add_item(
                            title=repo['full_name'],
                            type="link",
                            content=content,
                            notes=f"Synced from GitHub. Updated: {repo['updated_at']}",
                            file_path=repo['html_url'],
                            embedding=None,
                            tags="github,code,repo",
                            user_id=user_id,
                            status="pending",
                            progress_stage="queued",
                            progress_percent=0,
                            progress_message="Indexing repo..."
                        )
                    
                    # Add to processing queue (Embed Stage directly)
                    process_task = {
                        "id": item_id,
                        "file_path": repo['html_url'],
                        "type": "link",
                        "user_id": user_id,
                        "ocr_text": content, 
                        "vision_caption": "",
                        "vision_tags": [],
                        "transcript": "",
                        "meta_title": repo['full_name'],
                        "meta_image": None
                    }
                    self.embed_queue.put(process_task)
                    
                print(f"[GitHub Worker] Sync complete for {user_id}. {len(repos)} repos queued.")
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[GitHub Worker] Error: {e}")

    # --- STAGE 1: CPU Worker (OCR) ---
    def ocr_worker(self):
        while self.running:
            try:
                task = self.ocr_queue.get(timeout=1)
                self.cpu_pool.submit(self._process_ocr, task)
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[OCR Worker] Error: {e}")

    def _process_ocr(self, task):
        try:
            self.update_progress(task, "ocr", 10, "Extracting text...")
            full_path = self.resolve_path(task['file_path'])
            
            if task['type'] == 'image':
                task['ocr_text'] = extract_text_from_image(full_path)
            elif task['type'] == 'pdf':
                task['ocr_text'], _, _ = extract_text(full_path, 'pdf')
            elif task['type'] == 'link':
                task['ocr_text'], task['meta_title'], task['meta_image'] = extract_text(None, 'link', task['file_path'])
            elif task['type'] == 'video' and task['file_path'].startswith('http'):
                # Treat remote videos (YouTube) as links to get metadata only
                task['ocr_text'], task['meta_title'], task['meta_image'] = extract_text(None, 'link', task['file_path'])
            elif task['type'] in ['note', 'text']:
                item = get_item(task['id'], task['user_id'])
                if item: task['ocr_text'] = item['content']

            # ROUTING
            if task['type'] == 'image':
                self.vision_queue.put(task)
            elif task['type'] == 'video':
                if task['file_path'].startswith('http'):
                     # Remote videos (processed as links) skip vision/whisper
                     self.embed_queue.put(task)
                else:
                     self.vision_queue.put(task)
            elif task['type'] == 'audio':
                self.whisper_queue.put(task)
            else:
                self.embed_queue.put(task)
                
        except Exception as e:
            print(f"[OCR] Task {task['id']} failed: {e}")
            self.update_progress(task, "failed", 0, "Failed", "failed")

    # --- STAGE 2: GPU Worker (Priority Mode) ---
    def gpu_worker(self):
        current_model = None 
        BATCH_SIZE = 12 
        
        while self.running:
            try:
                # --- PRIORITY 1: VISION QUEUE ---
                # Drain Vision queue first. This ensures all images/videos get captions 
                # before we load the heavy Whisper model.
                
                # Check if we have vision tasks
                if not self.vision_queue.empty():
                    
                    # SWITCH CONTEXT
                    if current_model != 'vision':
                        print("[GPU] Switching to Vision Mode (Priority)")
                        if current_model == 'whisper': unload_whisper_model()
                        load_vision_models()
                        current_model = 'vision'

                    # Build Batch
                    batch = []
                    for _ in range(BATCH_SIZE):
                        try:
                            # Use get_nowait to fill batch quickly
                            t = self.vision_queue.get_nowait()
                            batch.append(t)
                        except queue.Empty:
                            break
                    
                    if batch:
                        # Prepare Paths
                        paths = []
                        for t in batch:
                            self.update_progress(t, "visual", 40, "Analyzing visuals...", "processing")
                            full_path = self.resolve_path(t['file_path'])
                            thumb_path = self.resolve_path(t['thumbnail_path']) if t.get('thumbnail_path') else full_path
                            target = thumb_path if (t['type'] == 'video' and t.get('thumbnail_path')) else full_path
                            paths.append(target)

                        # Run Inference
                        results = batch_analyze_images(paths)

                        # Distribute Results
                        for t, res in zip(batch, results):
                            t['vision_caption'] = res['caption']
                            t['vision_tags'] = res['tags']
                            
                            if t['type'] == 'video':
                                t['vision_done'] = True
                                self.whisper_queue.put(t) # Move to Whisper Queue
                            else:
                                self.embed_queue.put(t) # Image Done
                        
                        # Loop back to check vision_queue again immediately
                        continue

                # --- PRIORITY 2: WHISPER QUEUE ---
                # Only process if Vision queue is empty
                if not self.whisper_queue.empty():
                    
                    # OPTIMIZATION: OCR Lookahead
                    # If there are still items in the OCR queue, they might be images.
                    # We should wait for OCR to finish classifying them before we commit 
                    # to switching to Whisper (which is expensive).
                    if not self.ocr_queue.empty():
                        time.sleep(0.2)
                        continue

                    # SWITCH CONTEXT
                    if current_model != 'whisper':
                        print("[GPU] Switching to Whisper Mode")
                        if current_model == 'vision': unload_vision_models()
                        load_whisper_model()
                        current_model = 'whisper'

                    # Process ONE Whisper task (or small batch)
                    # We process fewer here to check for new Vision tasks sooner
                    try:
                        t = self.whisper_queue.get_nowait()
                        self.update_progress(t, "whisper", 70, "Transcribing...", "processing")
                        full_path = self.resolve_path(t['file_path'])
                        t['transcript'] = transcribe_audio(full_path)
                        self.embed_queue.put(t)
                    except queue.Empty:
                        pass
                        
                    continue

                # 2. Accumulation Strategy: Wait briefly to fill batch
                #    Reduced to 50ms for snappier feedback while still allowing some batching.
                time.sleep(0.1) 

                # 3. Non-blocking get for subsequent items

            except Exception as e:
                print(f"[GPU Worker] Error: {e}")
                time.sleep(1)

    # --- STAGE 3: Embed Worker ---
    def embed_worker(self):
        while self.running:
            try:
                task = self.embed_queue.get(timeout=1)
                self.update_progress(task, "embed", 90, "Finalizing...")
                
                # --- CHUNKING STEP (Step 1 Fix) ---
                # 1. OCR Chunks
                if task['ocr_text']:
                    for part in split_text(task['ocr_text']):
                        insert_chunk(task['id'], "ocr", part, generate_embedding(part))
                        
                # 2. Vision Caption Chunk
                if task['vision_caption']:
                    insert_chunk(task['id'], "caption", task['vision_caption'], generate_embedding(task['vision_caption']))
                    
                # 3. Visual Tags Chunk
                if task['vision_tags']:
                    tags_text = "Objects detected: " + ", ".join(task['vision_tags'])
                    insert_chunk(task['id'], "visual", tags_text, generate_embedding(tags_text))
                    
                # 4. Transcript Chunks
                if task['transcript']:
                    for part in split_text(task['transcript']):
                        insert_chunk(task['id'], "transcript", part, generate_embedding(part))

                # --- ORIGINAL AGGREGATION (Legacy Support) ---
                parts = []
                if task['ocr_text']: parts.append(task['ocr_text'])
                if task['vision_caption']: parts.append(f"AI Description: {task['vision_caption']}")
                if task['vision_tags']: parts.append(f"Objects: {', '.join(task['vision_tags'])}")
                if task['transcript']: parts.append(f"Transcript:\n{task['transcript']}")
                
                final_content = "\n\n".join(parts)
                # Now runs on CPU (forced in ai.py)
                vector = generate_embedding(final_content[:8000])
                
                final_title = task['meta_title'] if task['meta_title'] else None
                
                update_item(
                    item_id=task['id'],
                    title=final_title,
                    content=final_content,
                    tags=None,
                    embedding=vector,
                    user_id=task['user_id'],
                    thumbnail_path=task['meta_image'],
                    status="completed",
                    progress_stage="done",
                    progress_percent=100,
                    progress_message="Completed"
                )
                
                try:
                    loop = asyncio.get_event_loop()
                    msg = {
                        "item_id": task['id'], "stage": "done", "percent": 100, 
                        "message": "Completed", "status": "completed"
                    }
                    if loop.is_running(): asyncio.run_coroutine_threadsafe(manager.broadcast(msg), loop)
                    else: loop.run_until_complete(manager.broadcast(msg))
                except: pass
                
                self.embed_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[Embed Worker] Error: {e}")
                self.update_progress(task, "failed", 0, "Failed", "failed")

worker = ProcessingWorker()
