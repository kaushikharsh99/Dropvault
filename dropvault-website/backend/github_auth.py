import os
import requests
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from .database import save_connected_account, get_connected_account, delete_connected_account
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()

# Placeholder env vars - User must set these!
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

@router.get("/api/auth/github/url")
async def get_github_auth_url(userId: str):
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Server config error: Missing GITHUB_CLIENT_ID")
    
    # State should ideally be a signed JWT to prevent CSRF, but userId is okay for this POC
    # Scope: 'repo' for private repos, 'read:user' for profile
    scope = "repo read:user"
    redirect_uri = "http://localhost:5173"
    url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}&scope={scope}&state={userId}"
    return {"url": url}

class GithubCallback(BaseModel):
    code: str
    state: str # This is the userId

@router.post("/api/auth/github/callback")
async def github_callback(payload: GithubCallback):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Server config error: Missing GitHub credentials")

    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": payload.code
    }
    
    try:
        res = requests.post(token_url, headers=headers, data=data)
        res_data = res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to GitHub: {e}")

    if "error" in res_data:
        raise HTTPException(status_code=400, detail=res_data.get("error_description", "Unknown GitHub error"))

    access_token = res_data.get("access_token")
    scope = res_data.get("scope", "")
    
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned")

    # Save to DB
    user_id = payload.state # trusting state=userId for now
    save_connected_account(user_id, "github", access_token, scope)
    
    return {"status": "connected", "scope": scope}

@router.get("/api/auth/github/status")
async def get_github_status(userId: str):
    account = get_connected_account(userId, "github")
    return {"connected": bool(account)}

@router.delete("/api/auth/github")
async def disconnect_github(userId: str):
    delete_connected_account(userId, "github")
    return {"status": "disconnected"}
