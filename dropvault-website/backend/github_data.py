import requests
from .database import get_connected_account

def fetch_github_repos(user_id):
    account = get_connected_account(user_id, "github")
    if not account:
        print(f"No GitHub account found for user {user_id}")
        return []

    access_token = account["access_token"]
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    print(f"Fetching repos for user {user_id}...")
    
    # Fetch user repos (paged)
    repos = []
    page = 1
    while True:
        url = f"https://api.github.com/user/repos?sort=updated&per_page=30&page={page}"
        try:
            res = requests.get(url, headers=headers)
            if res.status_code != 200:
                print(f"GitHub API Error: {res.text}")
                break
            
            data = res.json()
            if not data: break
            
            repos.extend(data)
            page += 1
            if len(repos) >= 100: break # Cap at 100 recent repos for now
        except Exception as e:
            print(f"Error fetching repos: {e}")
            break

    results = []
    for repo in repos:
        # 1. Fetch README
        readme_content = ""
        try:
            readme_url = f"https://api.github.com/repos/{repo['full_name']}/readme"
            rm_res = requests.get(readme_url, headers=headers)
            if rm_res.status_code == 200:
                import base64
                content_b64 = rm_res.json().get("content", "")
                if content_b64:
                    readme_content = base64.b64decode(content_b64).decode("utf-8", errors="ignore")
        except: pass

        # 2. Fetch Recent Commits (Limit 50)
        commits_content = ""
        try:
            commits_url = f"https://api.github.com/repos/{repo['full_name']}/commits?per_page=50"
            c_res = requests.get(commits_url, headers=headers)
            if c_res.status_code == 200:
                commits_data = c_res.json()
                lines = []
                for c in commits_data:
                    msg = c['commit']['message'].split('\n')[0] # First line only
                    date = c['commit']['author']['date'].split('T')[0] # YYYY-MM-DD
                    lines.append(f"[{date}] {msg}")
                commits_content = "\n".join(lines)
        except Exception as e:
            print(f"Error fetching commits for {repo['full_name']}: {e}")

        results.append({
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "description": repo["description"],
            "html_url": repo["html_url"],
            "language": repo["language"],
            "stars": repo["stargazers_count"],
            "updated_at": repo["updated_at"],
            "readme": readme_content,
            "commits": commits_content
        })
        
    print(f"Fetched {len(results)} repos.")
    return results
