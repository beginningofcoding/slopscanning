import httpx
import asyncio
import logging
from typing import Any
from core.app_config import get_settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None
_client_loop: asyncio.AbstractEventLoop | None = None


async def get_client() -> httpx.AsyncClient:
    global _client, _client_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        # Fallback if called outside a running loop (unlikely but safe)
        current_loop = None

    if _client is None or _client.is_closed or _client_loop != current_loop:
        if _client and not _client.is_closed:
            try:
                # Fire-and-forget close of the old client since it might be bound to a closed loop
                await _client.aclose()
            except Exception:
                pass
        settings = get_settings()
        headers = {"Accept": "application/vnd.github.v3+json"}
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
        _client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers=headers,
            timeout=30.0,
        )
        _client_loop = current_loop
    return _client


async def _check_rate_limit(response: httpx.Response) -> None:
    remaining = int(response.headers.get("X-RateLimit-Remaining", "100"))
    if remaining < 10:
        reset_at = int(response.headers.get("X-RateLimit-Reset", "0"))
        import time
        wait = max(0, reset_at - int(time.time())) + 1
        logger.warning(f"GitHub rate limit low ({remaining}), sleeping {wait}s")
        await asyncio.sleep(min(wait, 60))


async def get_repo(owner: str, repo: str) -> dict:
    client = await get_client()
    resp = await client.get(f"/repos/{owner}/{repo}")
    await _check_rate_limit(resp)
    resp.raise_for_status()
    data = resp.json()
    return {
        "owner": data["owner"]["login"],
        "name": data["name"],
        "description": data.get("description"),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "language": data.get("language"),
        "default_branch": data.get("default_branch", "main"),
        "github_id": data.get("id"),
        "size_kb": data.get("size", 0),
    }


async def get_prs(owner: str, repo: str, state: str = "all", limit: int = 10) -> list[dict]:
    """Fetch the most recent `limit` PRs (sorted by creation date, newest first).

    We never paginate — a single request with per_page=limit is enough.
    GitHub's default sort for /pulls is 'created' descending, so the first
    page already contains the newest PRs.
    """
    client = await get_client()
    resp = await client.get(
        f"/repos/{owner}/{repo}/pulls",
        params={
            "state": state,
            "sort": "created",
            "direction": "desc",
            "per_page": max(1, min(limit, 100)),  # GitHub caps per_page at 100
            "page": 1,
        },
    )
    await _check_rate_limit(resp)
    resp.raise_for_status()
    return [
        {
            "number": pr["number"],
            "title": pr["title"],
            "state": pr["state"],
            "merged": pr.get("merged_at") is not None,
            "user": {"login": pr["user"]["login"]} if pr.get("user") else None,
            "created_at": pr.get("created_at"),
            "labels": [
                {"name": lbl["name"], "color": lbl.get("color", "888")}
                for lbl in pr.get("labels", [])
            ],
        }
        for pr in resp.json()
    ]


async def get_pr(owner: str, repo: str, number: int) -> dict:
    client = await get_client()
    resp = await client.get(f"/repos/{owner}/{repo}/pulls/{number}")
    await _check_rate_limit(resp)
    resp.raise_for_status()
    pr = resp.json()
    # Fetch files
    files_resp = await client.get(f"/repos/{owner}/{repo}/pulls/{number}/files", params={"per_page": 100})
    await _check_rate_limit(files_resp)
    files_resp.raise_for_status()
    files = [{
        "filename": f["filename"],
        "status": f.get("status", "modified"),
        "patch": f.get("patch"),
    } for f in files_resp.json()]
    # Fetch commits
    commits_resp = await client.get(f"/repos/{owner}/{repo}/pulls/{number}/commits", params={"per_page": 100})
    await _check_rate_limit(commits_resp)
    commits_resp.raise_for_status()
    commits = [{
        "sha": c["sha"],
        "message": c.get("commit", {}).get("message"),
        "commit": c.get("commit"),
        "author": {"login": c["author"]["login"]} if c.get("author") else None,
    } for c in commits_resp.json()]
    # Fetch review comments
    comments_resp = await client.get(f"/repos/{owner}/{repo}/pulls/{number}/comments", params={"per_page": 100})
    await _check_rate_limit(comments_resp)
    comments_resp.raise_for_status()
    comments = [{
        "id": cm["id"],
        "user": {"login": cm["user"]["login"]} if cm.get("user") else None,
        "created_at": cm.get("created_at"),
        "body": cm.get("body"),
        "path": cm.get("path"),
        "line": cm.get("line"),
    } for cm in comments_resp.json()]
    return {
        "number": pr["number"],
        "title": pr["title"],
        "state": pr["state"],
        "merged": pr.get("merged_at") is not None,
        "user": {"login": pr["user"]["login"]} if pr.get("user") else None,
        "author": pr["user"]["login"] if pr.get("user") else None,
        "created_at": pr.get("created_at"),
        "body": pr.get("body"),
        "changed_files": pr.get("changed_files", 0),
        "additions": pr.get("additions", 0),
        "deletions": pr.get("deletions", 0),
        "files": files,
        "commits": commits,
        "comments": comments,
    }


async def get_pr_diff(owner: str, repo: str, number: int) -> str:
    client = await get_client()
    resp = await client.get(
        f"/repos/{owner}/{repo}/pulls/{number}",
        headers={"Accept": "application/vnd.github.v3.diff"},
    )
    await _check_rate_limit(resp)
    resp.raise_for_status()
    return resp.text


async def get_repo_tree(owner: str, repo: str, branch: str = "main") -> list[dict]:
    client = await get_client()
    ref_resp = await client.get(f"/repos/{owner}/{repo}/git/ref/heads/{branch}")
    await _check_rate_limit(ref_resp)
    ref_resp.raise_for_status()
    tree_sha = ref_resp.json()["object"]["sha"]
    resp = await client.get(
        f"/repos/{owner}/{repo}/git/trees/{tree_sha}",
        params={"recursive": "1"},
    )
    await _check_rate_limit(resp)
    resp.raise_for_status()
    tree_data = resp.json()
    return [{
        "path": item["path"],
        "type": item["type"],
        "size": item.get("size", 0),
    } for item in tree_data.get("tree", [])]


async def get_file_content(owner: str, repo: str, path: str) -> str:
    client = await get_client()
    resp = await client.get(
        f"/repos/{owner}/{repo}/contents/{path}",
        headers={"Accept": "application/vnd.github.v3.raw"},
    )
    await _check_rate_limit(resp)
    resp.raise_for_status()
    return resp.text


async def get_repo_size_mb(owner: str, repo: str) -> float:
    client = await get_client()
    resp = await client.get(f"/repos/{owner}/{repo}")
    await _check_rate_limit(resp)
    resp.raise_for_status()
    size_kb = resp.json().get("size", 0)
    return size_kb / 1024.0


async def get_commits(owner: str, repo: str, limit: int = 10) -> list[dict]:
    """Fetch the most recent commits from the repository."""
    client = await get_client()
    resp = await client.get(
        f"/repos/{owner}/{repo}/commits",
        params={"per_page": min(limit, 100)}
    )
    await _check_rate_limit(resp)
    resp.raise_for_status()
    return [{
        "sha": c["sha"],
        "message": c.get("commit", {}).get("message"),
        "author": {"login": c["author"]["login"]} if c.get("author") else None,
        "date": c.get("commit", {}).get("author", {}).get("date")
    } for c in resp.json()]


async def get_commit_diff(owner: str, repo: str, sha: str) -> str:
    client = await get_client()
    resp = await client.get(
        f"/repos/{owner}/{repo}/commits/{sha}",
        headers={"Accept": "application/vnd.github.v3.diff"},
    )
    await _check_rate_limit(resp)
    resp.raise_for_status()
    return resp.text


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None