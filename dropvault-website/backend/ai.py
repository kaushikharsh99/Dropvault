from sentence_transformers import SentenceTransformer
import numpy as np

# Load Text-only model once (Force CPU to save VRAM for Vision/Whisper)
print("Loading Text AI Model (all-MiniLM-L6-v2) on CPU...")
text_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
print("AI Model Loaded.")

def generate_embedding(text):
    if not text:
        return None
    text = str(text)
    vector = text_model.encode(text)
    return vector.tolist()

def query_embedding(query):
    if not query:
        return None
    vector = text_model.encode(query)
    return vector

def cosine_sim(a, b):
    if a is None or b is None:
        return 0.0
    # Ensure they are numpy arrays
    a = np.array(a)
    b = np.array(b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)
