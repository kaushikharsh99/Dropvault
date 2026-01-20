import warnings
warnings.filterwarnings("ignore")

from transformers import OwlViTProcessor, OwlViTForObjectDetection, BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch
import io
import os
import re
import gc

# Global models
owl_processor = None
owl_model = None
blip_processor = None
blip_model = None

# Base static list for common high-value items
STATIC_OBJECTS = [
    "document", "diagram", "chart",
    "laptop", "phone", "keyboard", "person", "face"
]

# Stop words to clean up caption keywords
STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "of", "with", "by", "for", "from", "to", "and", "or",
    "is", "are", "was", "were", "be", "been", "playing", "standing", "sitting", "walking",
    "group", "lot", "bunch", "photo", "image", "picture", "view", "looking", "holding",
    "there", "here", "it", "they", "some", "many", "several"
}

def extract_keywords(caption):
    """
    Extracts potential object prompts from a natural language caption.
    """
    clean_cap = re.sub(r'[^\w\s]', '', caption.lower())
    words = clean_cap.split()
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    return list(set(keywords))

def load_blip():
    global blip_processor, blip_model
    if blip_model is not None: return True
    
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        print(f"Vision: Loading BLIP-Base on {device} ({dtype})...")
        
        blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base", use_fast=True)
        blip_model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base", 
            dtype=dtype # Changed from torch_dtype to fix warning
        ).to(device)
        blip_model.eval()
        
        if hasattr(torch, "compile") and device == "cuda":
            try: blip_model = torch.compile(blip_model)
            except: pass
        return True
    except Exception as e:
        print(f"Failed to load BLIP: {e}")
        return False

def load_owl():
    global owl_processor, owl_model
    if owl_model is not None: return True
    
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        print(f"Vision: Loading OWL-ViT on {device} ({dtype})...")
        
        owl_processor = OwlViTProcessor.from_pretrained("google/owlvit-base-patch32", use_fast=True)
        owl_model = OwlViTForObjectDetection.from_pretrained(
            "google/owlvit-base-patch32", 
            dtype=dtype # Changed to dtype
        ).to(device)
        owl_model.eval()
        return True
    except Exception as e:
        print(f"Failed to load OWL-ViT: {e}")
        return False

def unload_model(model_name):
    global blip_model, blip_processor, owl_model, owl_processor
    print(f"Vision: Unloading {model_name}...")
    
    if model_name == "blip":
        del blip_model
        del blip_processor
        blip_model = None
        blip_processor = None
    elif model_name == "owl":
        del owl_model
        del owl_processor
        owl_model = None
        owl_processor = None
        
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()

def load_vision_models():
    return True 

def unload_vision_models():
    unload_model("blip")
    unload_model("owl")

def batch_analyze_images(file_paths):
    results = [{"caption": "", "tags": []} for _ in file_paths]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    # --- PHASE 1: CAPTIONS (BLIP) ---
    valid_imgs = []
    valid_indices = []
    
    if load_blip():
        print(f"[Vision Debug] Running BLIP on {len(file_paths)} files...")
        try:
            for i, path in enumerate(file_paths):
                if os.path.exists(path):
                    try:
                        img = Image.open(path).convert("RGB")
                        valid_imgs.append(img)
                        valid_indices.append(i)
                    except Exception as e:
                        print(f"[Vision Debug] Failed to open {path}: {e}")
            
            if valid_imgs:
                inputs = blip_processor(images=valid_imgs, return_tensors="pt").to(device, dtype)
                with torch.no_grad():
                    out = blip_model.generate(**inputs, max_new_tokens=50)
                captions = blip_processor.batch_decode(out, skip_special_tokens=True)
                
                print(f"[Vision Debug] BLIP Generated {len(captions)} captions.")
                for idx, cap in zip(valid_indices, captions):
                    results[idx]["caption"] = cap.strip()
                    print(f" - Image {idx}: {cap.strip()}")
                    
        except Exception as e:
            print(f"[Vision Debug] BLIP Phase Failed: {e}")
        
        unload_model("blip")
    
    # --- PHASE 2: DETECTION (OWL-ViT) ---
    if load_owl():
        print(f"[Vision Debug] Running OWL-ViT on {len(valid_indices)} images...")
        try:
            for i in valid_indices:
                path = file_paths[i]
                caption = results[i]["caption"]
                if not caption: continue
                
                dynamic = extract_keywords(caption)
                labels = list(set(STATIC_OBJECTS + dynamic))
                prompts = [f"a photo of a {l}" for l in labels]
                
                img = Image.open(path).convert("RGB")
                inputs = owl_processor(text=[prompts], images=img, return_tensors="pt").to(device)
                
                with torch.no_grad():
                    outputs = owl_model(**inputs)
                
                target_sizes = torch.Tensor([img.size[::-1]]).to(device)
                
                # Revert to stable method (ignores FutureWarning)
                res = owl_processor.post_process_object_detection(
                    outputs, 
                    target_sizes=target_sizes, 
                    threshold=0.08
                )[0]
                
                detected = set()
                for score, label_idx in zip(res["scores"], res["labels"]):
                    if score.item() > 0.08:
                        detected.add(labels[label_idx])
                results[i]["tags"] = list(detected)
                print(f" - Image {i} Tags: {results[i]['tags']}")
                
        except Exception as e:
            print(f"[Vision Debug] OWL Phase Failed: {e}")
            import traceback
            traceback.print_exc()
            
        unload_model("owl")

    return results

def detect_objects(file_path):
    return batch_analyze_images([file_path])[0]
