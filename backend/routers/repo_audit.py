from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.unified_audit_service import analyze_repo_audit_stream

router = APIRouter(tags=["repo_audit"])


class RepoAuditRequest(BaseModel):
    repo: str
    mode: str = "fast"


@router.post("/api/repo/audit")
async def audit_repo(req: RepoAuditRequest):
    return StreamingResponse(
        analyze_repo_audit_stream(req.repo, req.mode),
        media_type="text/event-stream",
    )
