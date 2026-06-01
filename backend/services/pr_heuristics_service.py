"""PR heuristics-only analysis (no LLM claim pipeline) for GitHub Action and fast checks."""
from __future__ import annotations

import json
import logging
from typing import AsyncGenerator

from heuristics.pr_bundle_heuristic import analyze_pr_heuristics
from services.github_service import get_pr

logger = logging.getLogger(__name__)


def _parse_repo(repo_url: str) -> tuple[str, str]:
    repo_url = repo_url.rstrip("/")
    if repo_url.endswith(".git"):
        repo_url = repo_url[:-4]
    parts = repo_url.split("/")
    return parts[-2], parts[-1]


async def analyze_pr_heuristics_stream(repo_url: str, pr_number: int) -> AsyncGenerator[str, None]:
    try:
        owner, repo_name = _parse_repo(repo_url)
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Fetching PR', 'percent': 20})}\n\n"

        pr_data = await get_pr(owner, repo_name, pr_number)
        diff_text = ""
        for f in pr_data.get("files", []):
            patch = f.get("patch")
            if patch:
                diff_text += f"\n--- {f['filename']} ---\n{patch}\n"
        if len(diff_text) > 80000:
            diff_text = diff_text[:80000]

        yield f"data: {json.dumps({'type': 'progress', 'step': 'Running heuristics', 'percent': 60})}\n\n"

        signals, pr_metrics, _, upi = analyze_pr_heuristics(pr_data, diff_text, comparison=None)

        result = {
            "prNumber": pr_number,
            "signals": [s.to_dict() for s in signals],
            "pr_metrics": pr_metrics,
            "unchecked_publish_index": upi,
        }

        yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Done', 'percent': 100})}\n\n"
    except Exception as e:
        logger.exception("PR heuristics stream failed")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
