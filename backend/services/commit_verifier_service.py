import json
import logging
from typing import AsyncGenerator
from services.github_service import get_commits, get_commit_diff
from services.fireworks_service import chat_complete
from services.openrouter_service import verify_commit_qwen

logger = logging.getLogger(__name__)

async def analyze_commits_stream(repo_url: str, limit: int = 10) -> AsyncGenerator[str, None]:
    try:
        # Parse owner and repo from URL (e.g. https://github.com/owner/repo)
        repo_url = repo_url.rstrip("/")
        if repo_url.endswith(".git"):
            repo_url = repo_url[:-4]
        parts = repo_url.split("/")
        owner, repo_name = parts[-2], parts[-1]
        
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Fetching recent commits', 'percent': 10})}\n\n"
        
        commits = await get_commits(owner, repo_name, limit)
        if not commits:
            raise ValueError("No commits found in the repository.")
            
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Fetching commit diffs', 'percent': 30})}\n\n"
        
        analyzed_commits = []
        
        for i, commit in enumerate(commits):
            sha = commit["sha"]
            message = commit["message"] or ""
            author = commit["author"]["login"] if commit.get("author") else "Unknown"
            
            # Fetch diff
            try:
                diff_text = await get_commit_diff(owner, repo_name, sha)
            except Exception as e:
                logger.warning(f"Could not fetch diff for {sha}: {e}")
                continue
                
            if len(diff_text) > 40000:
                diff_text = diff_text[:40000] + "\n...[truncated]"
                
            progress_percent = int(30 + ((i + 1) / len(commits)) * 50)
            yield f"data: {json.dumps({'type': 'progress', 'step': f'Analyzing commit {sha[:7]}', 'percent': progress_percent})}\n\n"
            
            analysis = await verify_commit_qwen(message, diff_text)
                
            analyzed_commits.append({
                "sha": sha,
                "message": message,
                "author": author,
                "verdict": analysis.get("verdict", "GENERIC"),
                "reason": analysis.get("reason", "")
            })
            
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Generating summary', 'percent': 90})}\n\n"
        
        total = len(analyzed_commits)
        hallucinated = sum(1 for c in analyzed_commits if c["verdict"] == "HALLUCINATED")
        generic = sum(1 for c in analyzed_commits if c["verdict"] == "GENERIC")
        trustworthy = sum(1 for c in analyzed_commits if c["verdict"] == "TRUSTWORTHY")
        
        slop_score = (hallucinated + (generic * 0.5)) / total if total > 0 else 0.0
        quality_score = trustworthy / total if total > 0 else 1.0

        from heuristics.commit_burst import analyze_commit_burst
        from heuristics.commit_generic import analyze_commit_messages

        burst_signals, pattern_summary = analyze_commit_burst(commits)
        generic_signals, generic_metrics = analyze_commit_messages(
            [{"message": c["message"], "date": c.get("date")} for c in commits]
        )
        burst_signals_dict = [s.to_dict() for s in burst_signals + generic_signals]
        
        summary_prompt = (
            "Summarize the quality of these commit messages. Call out if there is a pattern of generic AI slop or hallucinations. "
            "Be concise and actionable.\n\n" + json.dumps(analyzed_commits, indent=2)
        )
        executive_summary = await chat_complete(summary_prompt)
        
        result = {
            "commits": analyzed_commits,
            "summary": {
                "executive_summary": executive_summary,
                "quality_score": quality_score,
                "slop_score": slop_score,
                "burst_signals": burst_signals_dict,
                "pattern_summary": pattern_summary
                or (
                    f"Heuristic: {generic_metrics.get('generic_commit_count', 0)} generic-style messages in sample."
                    if generic_metrics.get("generic_commit_count")
                    else ""
                ),
            }
        }
        
        yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Done', 'percent': 100})}\n\n"
        
    except Exception as e:
        logger.exception("Error in commit verifier stream")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"