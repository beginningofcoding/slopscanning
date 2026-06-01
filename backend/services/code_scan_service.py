import os
import json
import logging
import asyncio
import tempfile
import subprocess
import uuid
from pathlib import Path
from typing import AsyncGenerator

from services.llm_analysis_service import analyze_file_deep
from utils.regex_pattern_scorer import (
    score_match, HARDCODED_SECRETS, PLACEHOLDERS, HARDCODED_URLS, FAKE_SUCCESS
)

logger = logging.getLogger(__name__)

def clone_repo(repo_url: str, temp_dir: str):
    logger.info(f"Cloning {repo_url} into {temp_dir}")
    subprocess.run(["git", "clone", "--depth", "1", repo_url, temp_dir], check=True, capture_output=True)

def find_regex_candidates(file_path: Path, rel_path: str) -> list:
    candidates = []
    try:
        content = file_path.read_text(errors="replace")
    except Exception:
        return candidates
        
    lines = content.splitlines()
    
    def add_match(match_obj, pattern_type):
        start = match_obj.start()
        line_idx = content[:start].count("\n")
        line_content = lines[line_idx] if line_idx < len(lines) else ""
        
        start_surr = max(0, line_idx - 5)
        end_surr = min(len(lines), line_idx + 6)
        surrounding = lines[start_surr:end_surr]
        
        match_val = match_obj.group(0)
        
        match_dict = {
            "value": match_val,
            "file": rel_path,
            "lineContent": line_content,
            "surrounding": surrounding,
            "patternType": pattern_type,
        }
        
        score_res = score_match(match_dict)
        if not score_res["skip"]:
            candidates.append({
                "id": str(uuid.uuid4()),
                "type": pattern_type,
                "file": rel_path,
                "line": line_idx + 1,
                "snippet": line_content[:300],
                "explanation": f"Regex hit: {pattern_type}. Score: {score_res['score']}. Reasons: {', '.join(score_res['reasons'])}",
                "score": score_res["score"]
            })

    for p in HARDCODED_SECRETS:
        for m in p.finditer(content): add_match(m, "hardcoded-secret")
    for p in PLACEHOLDERS:
        for m in p.finditer(content): add_match(m, "placeholder")
    for p in HARDCODED_URLS:
        for m in p.finditer(content): add_match(m, "hardcoded-url")
    for p in FAKE_SUCCESS:
        for m in p.finditer(content): add_match(m, "fake-success")
        
    return candidates

async def analyze_code_review_stream(repo_url: str) -> AsyncGenerator[str, None]:
    if not repo_url.startswith("http"):
        repo_url = f"https://github.com/{repo_url}"
        
    temp_dir = tempfile.mkdtemp(prefix="slop_code_")
    try:
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Cloning repository', 'percent': 10})}\n\n"
        await asyncio.to_thread(clone_repo, repo_url, temp_dir)
        repo_path = Path(temp_dir)
        
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Walking source files', 'percent': 30})}\n\n"

        from services.code_scan_regex_service import collect_code_files

        code_files = collect_code_files(repo_path)
                
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Running regex and deep analysis', 'percent': 50})}\n\n"
        
        all_candidates = []
        deep_findings = []
        
        total_files = len(code_files)
        
        # Concurrency limit to prevent hitting OpenRouter rate limits
        semaphore = asyncio.Semaphore(15)
        
        async def process_file(fp, rp):
            try:
                content = fp.read_text(errors="replace")
            except:
                return [], [], rp
                
            num_lines = len(content.splitlines())
            file_candidates = await asyncio.to_thread(find_regex_candidates, fp, rp)
            
            f_deep_findings = []
            if num_lines > 200 or len(file_candidates) > 0:
                async with semaphore:
                    f_deep_findings = await analyze_file_deep(content, rp)
                    
            return file_candidates, f_deep_findings, rp

        tasks = [process_file(fp, rp) for fp, rp in code_files]
        
        for i, task in enumerate(asyncio.as_completed(tasks)):
            file_candidates, f_deep_findings, rp = await task
            all_candidates.extend(file_candidates)
            
            for df in f_deep_findings:
                deep_findings.append({
                    "id": str(uuid.uuid4()),
                    "severity": df.get("severity", "medium"),
                    "type": df.get("type", "deep-analysis"),
                    "file": rp,
                    "line": df.get("line", 1),
                    "endLine": df.get("endLine", df.get("line", 1)),
                    "snippet": df.get("snippet", "")[:400],
                    "explanation": df.get("explanation", ""),
                    "suggestedFix": df.get("suggestedFix")
                })
                
            if i % max(1, total_files // 10) == 0:
                pct = 50 + int(30 * i / max(1, total_files))
                yield f"data: {json.dumps({'type': 'progress', 'step': f'Analyzing files ({i}/{total_files})', 'percent': pct})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Compiling findings', 'percent': 85})}\n\n"
        
        regex_flat = []
        for vc in all_candidates:
            score = vc.get("score", 0.5)
            if score >= 0.8:
                severity = "high"
            elif score >= 0.6:
                severity = "medium"
            else:
                severity = "low"
            regex_flat.append({
                "id": vc["id"],
                "severity": severity,
                "type": vc["type"],
                "file": vc["file"],
                "line": vc["line"],
                "endLine": vc["line"],
                "snippet": vc["snippet"][:400],
                "explanation": vc["explanation"],
                "suggestedFix": None,
                "score": score,
            })

        final_findings = deep_findings + regex_flat

        # Index every scanned file so the UI can render a full file tree (not only files with hits)
        files_dict: dict[str, list] = {rp: [] for _, rp in code_files}
        for f in final_findings:
            fp = f["file"]
            if fp not in files_dict:
                files_dict[fp] = []
            files_dict[fp].append(f)

        grouped_files = [{"path": k, "findings": v} for k, v in sorted(files_dict.items())]
        
        # Stats
        stats = {
            "totalIssues": len(final_findings),
            "byType": {},
            "bySeverity": {}
        }
        for f in final_findings:
            t = f.get("type", "unknown")
            s = f.get("severity", "unknown")
            stats["byType"][t] = stats["byType"].get(t, 0) + 1
            stats["bySeverity"][s] = stats["bySeverity"].get(s, 0) + 1
            
        result = {
            "files": grouped_files,
            "stats": stats,
            "scanned_files": len(code_files),
            "files_with_issues": sum(1 for g in grouped_files if g["findings"]),
        }
        
        yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Done', 'percent': 100})}\n\n"
        
    except Exception as e:
        logger.exception("Error in code review stream")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
