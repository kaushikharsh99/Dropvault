from cryptography.fernet import Fernet
import os
import base64
from dotenv import load_dotenv

# Load .env file
# It's usually in the project root (dropvault-website/)
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

# Load key from environment or use a default specific to this installation if missing
SECRET_KEY = os.getenv("VAULT_SECRET_KEY")

fernet = None

def get_fernet():
    global fernet
    if fernet:
        return fernet
        
    key = os.getenv("VAULT_SECRET_KEY")
    if not key:
        print("⚠️  WARNING: VAULT_SECRET_KEY not found in env. Using temporary key (Data will be lost on restart if you rely on this).")
        # Generate a temporary key so app doesn't crash, but warn heavily
        key = Fernet.generate_key().decode()
    
    try:
        fernet = Fernet(key)
        return fernet
    except Exception as e:
        print(f"❌ Crypto Init Error: {e}")
        return None

def encrypt_text(text: str) -> str:
    if not text:
        return ""
    f = get_fernet()
    if not f:
        return text
    try:
        return f.encrypt(text.encode()).decode()
    except Exception as e:
        print(f"Encryption failed: {e}")
        return text

def decrypt_text(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    f = get_fernet()
    if not f:
        return encrypted_text
    try:
        # Check if it looks like a fernet token (base64)
        # If it's old unencrypted text, decrypt might fail or return garbage.
        # We assume if it fails, it might be plain text (migration strategy)
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception:
        # Fallback: assume it was not encrypted yet
        return encrypted_text
