from transformers import OwlViTProcessor, OwlViTForObjectDetection, BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch
import io
import os
import re
from .crypto import decrypt_file_content

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

def load_vision_models():
    global owl_processor, owl_model, blip_processor, blip_model
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Vision: Loading models on {device}...")

        # 1. Load BLIP-Large (Salesforce/blip-image-captioning-large)
        # VRAM Usage: ~3GB
        if blip_model is None:
            print("Vision: Loading BLIP-Large...")
            blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
            blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large").to(device)
            blip_model.eval()
            print("Vision: BLIP-Large loaded.")

        # 2. Load OWL-ViT for Detection
        if owl_model is None:
            print("Vision: Loading OWL-ViT...")
            owl_processor = OwlViTProcessor.from_pretrained("google/owlvit-base-patch32")
            owl_model = OwlViTForObjectDetection.from_pretrained("google/owlvit-base-patch32").to(device)
            owl_model.eval()
            
        print("Vision: All models loaded successfully.")
        return True
    except Exception as e:
        print(f"CRITICAL: Failed to load vision models: {e}")
        import traceback
        traceback.print_exc()
        return False

def extract_keywords(caption):
    """
    Extracts potential object prompts from a natural language caption.
    """
    # Remove punctuation and lowercase
    clean_cap = re.sub(r'[^\w\s]', '', caption.lower())
    words = clean_cap.split()
    
    # Filter stop words and short words
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    return list(set(keywords))

def detect_objects(file_path):
    """
    Hybrid Pipeline:
    1. BLIP-Large generates a high-quality caption.
    2. Extract keywords from caption.
    3. OWL-ViT detects/verifies these keywords + static list.
    """
    if owl_model is None or blip_model is None:
        if not load_vision_models():
            return {"caption": "", "tags": []}

    try:
        # Decrypt/Load Image
        file_bytes = decrypt_file_content(file_path)
        if file_bytes is None:
            if os.path.exists(file_path):
                image = Image.open(file_path).convert("RGB")
            else:
                return {"caption": "", "tags": []}
        else:
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")

        device = next(blip_model.parameters()).device

        # --- Stage A: High-Quality Description (BLIP-Large) ---
        blip_inputs = blip_processor(images=image, return_tensors="pt").to(device)
        
        with torch.no_grad():
            # Generate caption
            out = blip_model.generate(**blip_inputs, max_new_tokens=50)
            
        caption = blip_processor.decode(out[0], skip_special_tokens=True).strip()
        print(f"Vision Caption (BLIP-Large): '{caption}'")

        # Extract dynamic prompts from caption
        dynamic_prompts = extract_keywords(caption)
        
        # Combine with static list
        raw_labels = list(set(STATIC_OBJECTS + dynamic_prompts))
        text_prompts = [f"a photo of a {label}" for label in raw_labels]
        
        # --- Stage B: Targeted Detection (OWL-ViT) ---
        owl_device = next(owl_model.parameters()).device
        owl_inputs = owl_processor(
            text=[text_prompts],
            images=image,
            return_tensors="pt"
        ).to(owl_device)

        with torch.no_grad():
            outputs = owl_model(**owl_inputs)

        target_sizes = torch.Tensor([image.size[::-1]]).to(owl_device)
        results = owl_processor.post_process_object_detection(
            outputs=outputs,
            target_sizes=target_sizes,
            threshold=0.08 
        )[0]

        detected_labels = set()
        for score, label_idx, box in zip(results["scores"], results["labels"], results["boxes"]):
            if score.item() > 0.08:
                detected_labels.add(raw_labels[label_idx])

        print(f"Vision Final Tags: {list(detected_labels)}")
        return {
            "caption": caption,
            "tags": list(detected_labels)
        }

    except Exception as e:
        print(f"Vision Detection Error: {e}")
        import traceback
        traceback.print_exc()
        return {"caption": "", "tags": []}