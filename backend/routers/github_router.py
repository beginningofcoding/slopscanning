from fastapi import APIRouter, Query, HTTPException
import json
import logging
from core.redis_client import get_redis
from services import github_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/github", tags=["github"])


async def _cache_get(key: str) -> dict | None:
    redis = await get_redis()
    cached = await redis.get(f"github:{key}")
    if cached:
        return json.loads(cached)
    return None


async def _cache_set(key: str, data, ttl: int = 3600) -> None:
    redis = await get_redis()
    await redis.set(f"github:{key}", json.dumps(data, default=str), ex=ttl)


@router.get("/repo")
async def get_repo_info(owner: str = Query(...), name: str = Query(...)):
    cache_key = f"repo:{owner}:{name}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached
    try:
        data = await github_service.get_repo(owner, name)
        await _cache_set(cache_key, data)
        return data
    except Exception as e:
        logger.error(f"Failed to fetch repo {owner}/{name}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch repository: {str(e)}")


@router.get("/prs")
async def get_pr_list(
    owner: str = Query(...),
    name: str = Query(...),
    state: str = Query("all"),
    limit: int = Query(10, ge=1, le=100, description="Number of most-recent PRs to return"),
):
    cache_key = f"prs:{owner}:{name}:{state}:{limit}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached
    try:
        data = await github_service.get_prs(owner, name, state=state, limit=limit)
        await _cache_set(cache_key, data, ttl=60)
        return data
    except Exception as e:
        logger.error(f"Failed to fetch PRs for {owner}/{name}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch pull requests: {str(e)}")


@router.get("/pr/{number}")
async def get_pr_detail(
    number: int,
    owner: str = Query(...),
    name: str = Query(...),
):
    cache_key = f"pr:{owner}:{name}:{number}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached
    try:
        data = await github_service.get_pr(owner, name, number)
        await _cache_set(cache_key, data, ttl=60)
        return data
    except Exception as e:
        logger.error(f"Failed to fetch PR #{number} for {owner}/{name}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch PR details: {str(e)}")

@router.get("/file")
async def get_file_content_route(
    owner: str = Query(...),
    name: str = Query(...),
    path: str = Query(...)
):
    try:
        content = await github_service.get_file_content(owner, name, path)
        return {"content": content}
    except Exception as e:
        logger.error(f"Failed to fetch file {path} for {owner}/{name}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch file content: {str(e)}")


@router.get("/commits")
async def get_commits_route(
    owner: str = Query(...),
    name: str = Query(...),
    limit: int = Query(10, ge=1, le=100)
):
    cache_key = f"commits:{owner}:{name}:{limit}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached
    try:
        data = await github_service.get_commits(owner, name, limit=limit)
        await _cache_set(cache_key, data, ttl=60)
        return data
    except Exception as e:
        logger.error(f"Failed to fetch commits for {owner}/{name}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch commits: {str(e)}")


@router.get("/docs")
async def get_docs_list(
    owner: str = Query(...),
    name: str = Query(...)
):
    cache_key = f"docs_list:{owner}:{name}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached
    try:
        repo_info = await github_service.get_repo(owner, name)
        branch = repo_info.get("default_branch", "main")
        
        tree = await github_service.get_repo_tree(owner, name, branch=branch)
        
        valid_extensions = (".md", ".mdx")
        skips = ("node_modules", ".git", "changelog", "license", "licence", "contributing")
        
        docs_files = []
        for item in tree:
            if item["type"] == "blob" and item["path"].lower().endswith(valid_extensions):
                path_lower = item["path"].lower()
                if any(skip in path_lower for skip in skips):
                    continue
                docs_files.append({
                    "path": item["path"],
                    "size": item.get("size", 0)
                })
        
        await _cache_set(cache_key, docs_files, ttl=60)
        return docs_files
    except Exception as e:
        logger.error(f"Failed to fetch docs list for {owner}/{name}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch docs list: {str(e)}")

