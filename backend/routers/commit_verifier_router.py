from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from services.commit_verifier_service import analyze_commits_stream

router = APIRouter(prefix="/api/commits", tags=["commits"])

class CommitAnalyzeRequest(BaseModel):
    repo: str
    limit: int = 10

@router.post("/analyze")
async def analyze_commits_endpoint(req: CommitAnalyzeRequest):
    return StreamingResponse(
        analyze_commits_stream(req.repo, req.limit),
        media_type="text/event-stream"
    )