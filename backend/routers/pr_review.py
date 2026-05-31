import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.github_service import get_prs, get_pr
from services.pr_review_service import analyze_pr_stream
from services.pr_heuristics_service import analyze_pr_heuristics_stream

router = APIRouter(tags=["pr_review"])

class AnalyzeRequest(BaseModel):
    repo: str
    prNumber: int

def parse_repo_url(repo_url: str):
    # Expects https://github.com/owner/repo or similar
    parts = repo_url.rstrip("/").split("/")
    if len(parts) < 2:
        raise ValueError("Invalid repo URL")
    return parts[-2], parts[-1]

@router.get("/api/pr-review/list")
async def list_prs(repo: str):
    try:
        owner, repo_name = parse_repo_url(repo)
        
        # Fetch both open and closed PRs using github_service
        # get_prs can take state="all" or we can do two calls
        open_prs = await get_prs(owner, repo_name, state="open", limit=20)
        closed_prs = await get_prs(owner, repo_name, state="closed", limit=20)
        
        # The frontend expects { open: PR[], closed: PR[] }
        # PR shape: { number, title, author, createdAt, state, url }
        def format_pr(p):
            return {
                "number": p["number"],
                "title": p["title"],
                "author": p["user"]["login"] if p.get("user") else None,
                "createdAt": p.get("created_at"),
                "state": p["state"],
                "url": f"https://github.com/{owner}/{repo_name}/pull/{p['number']}"
            }
            
        return {
            "open": [format_pr(p) for p in open_prs],
            "closed": [format_pr(p) for p in closed_prs]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/pr-review/detail")
async def pr_detail(repo: str, pr: int):
    try:
        owner, repo_name = parse_repo_url(repo)
        pr_data = await get_pr(owner, repo_name, pr)
        
        # Expected Response: { number, title, description, author, createdAt, state, files: FileChange[], commits: Commit[] }
        # FileChange: { filename, status, additions, deletions, patch }
        return {
            "number": pr_data["number"],
            "title": pr_data["title"],
            "description": pr_data.get("body", ""),
            "author": pr_data.get("author"),
            "createdAt": pr_data.get("created_at"),
            "state": pr_data["state"],
            "files": pr_data.get("files", []),
            "commits": pr_data.get("commits", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/pr-review/analyze")
async def analyze_pr(req: AnalyzeRequest):
    return StreamingResponse(
        analyze_pr_stream(req.repo, req.prNumber),
        media_type="text/event-stream"
    )


@router.post("/api/pr-review/heuristics-only")
async def analyze_pr_heuristics_only(req: AnalyzeRequest):
    return StreamingResponse(
        analyze_pr_heuristics_stream(req.repo, req.prNumber),
        media_type="text/event-stream",
    )
