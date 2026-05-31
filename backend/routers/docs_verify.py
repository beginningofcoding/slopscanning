from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.docs_verifier_service import analyze_docs_stream

router = APIRouter(tags=["docs_verify"])

class AnalyzeDocsRequest(BaseModel):
    repo: str

@router.post("/api/docs/analyze")
async def analyze_docs(req: AnalyzeDocsRequest):
    return StreamingResponse(
        analyze_docs_stream(req.repo),
        media_type="text/event-stream"
    )
