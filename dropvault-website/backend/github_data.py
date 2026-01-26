import requests
from .database import get_connected_account

def fetch_github_data(user_id):
    account = get_connected_account(user_id, "github")
    if not account:
        print(f"No GitHub account found for user {user_id}")
        return []

    access_token = account["access_token"]
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    print(f"Fetching GitHub data for user {user_id}...")
    
    results = []
    seen_ids = set()

    def process_repos(url_template, category_tag, limit=100):
        fetched_count = 0
        page = 1
        while True:
            url = f"{url_template}&per_page=30&page={page}"
            try:
                res = requests.get(url, headers=headers)
                if res.status_code != 200:
                    print(f"GitHub API Error ({url}): {res.text}")
                    break
                
                data = res.json()
                if not data: break
                
                for repo in data:
                    if repo['id'] in seen_ids: continue
                    seen_ids.add(repo['id'])
                    
                    # Fetch README
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

                    # Fetch Commits (Limit 20 to save API quota for massive syncs)
                    commits_content = ""
                    try:
                        commits_url = f"https://api.github.com/repos/{repo['full_name']}/commits?per_page=20"
                        c_res = requests.get(commits_url, headers=headers)
                        if c_res.status_code == 200:
                            commits_data = c_res.json()
                            lines = []
                            for c in commits_data:
                                if isinstance(c, dict) and 'commit' in c:
                                    msg = c['commit']['message'].split('\n')[0]
                                    date = c['commit']['author']['date'].split('T')[0]
                                    lines.append(f"[{date}] {msg}")
                            commits_content = "\n".join(lines)
                    except: pass

                    results.append({
                        "id": repo["id"],
                        "full_name": repo["full_name"],
                        "description": repo["description"],
                        "html_url": repo["html_url"],
                        "language": repo["language"],
                        "stars": repo["stargazers_count"],
                        "updated_at": repo["updated_at"],
                        "readme": readme_content,
                        "commits": commits_content,
                        "category": category_tag,
                        "is_fork": repo.get("fork", False)
                    })
                    
                    fetched_count += 1
                    if fetched_count >= limit: return

                page += 1
            except Exception as e:
                print(f"Error in fetch loop: {e}")
                break

    # 1. Fetch User Repos (Owned, Member, Forks)
    # type=all covers owner, collaborator, organization_member
    process_repos("https://api.github.com/user/repos?sort=updated&type=all", "repo", limit=150)

    # 2. Fetch Starred Repos
    process_repos("https://api.github.com/user/starred?sort=created", "starred", limit=150)

    print(f"Total fetched: {len(results)} items.")
    return results
