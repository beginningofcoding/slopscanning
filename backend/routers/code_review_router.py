from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from services.code_scan_service import analyze_code_review_stream
from services.fireworks_service import chat_complete
import json

router = APIRouter(tags=["code_review"])

class AnalyzeCodeRequest(BaseModel):
    repo: str

class SummaryRequest(BaseModel):
    repo: str
    findings: List[Dict[str, Any]]

@router.post("/api/code-review/analyze")
async def analyze_code(req: AnalyzeCodeRequest):
    return StreamingResponse(
        analyze_code_review_stream(req.repo),
        media_type="text/event-stream"
    )

@router.post("/api/code-review/summary")
async def code_review_summary(req: SummaryRequest):
    prompt = (
        "Summarize these code review findings for a developer. Group by type. "
        "Highlight the most critical issues first. Be concise.\n\nFindings:\n" +
        json.dumps(req.findings)
    )
    
    summary = await chat_complete(prompt)
    return {"summary": summary}
