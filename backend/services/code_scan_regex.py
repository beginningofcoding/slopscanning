"""Regex-only code scan (extracted for unified audit and code_review_service)."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from services.code_review_service import find_regex_candidates

SKIP_DIRS = {"node_modules", ".git", "dist", "build", "coverage", ".next", "out", ".venv", "venv", "env"}
ALLOWED_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".java", ".cpp", ".c", ".h", ".cs",
    ".rb", ".php", ".rs", ".swift", ".kt",
}


def collect_code_files(repo_path: Path) -> list[tuple[Path, str]]:
    code_files: list[tuple[Path, str]] = []
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for file in files:
            if not any(file.endswith(ext) for ext in ALLOWED_EXTS):
                continue
            if file.endswith(".min.js") or file.endswith(".d.ts"):
                continue
            file_path = Path(root) / file
            rel_path = str(file_path.relative_to(repo_path))
            code_files.append((file_path, rel_path))
    return code_files


def run_regex_scan(repo_path: Path, max_files: int | None = None) -> list[dict]:
    """Run regex heuristics on repository; returns flat finding dicts."""
    findings: list[dict] = []
    files = collect_code_files(repo_path)
    if max_files is not None:
        files = files[:max_files]

    for fp, rp in files:
        candidates = find_regex_candidates(fp, rp)
        for vc in candidates:
            score = vc.get("score", 0.5)
            if score >= 0.8:
                severity = "high"
            elif score >= 0.6:
                severity = "medium"
            else:
                severity = "low"
            findings.append({
                "id": vc.get("id") or str(uuid.uuid4()),
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
    return findings


def regex_scan_stats(findings: list[dict]) -> dict:
    stats = {"totalIssues": len(findings), "byType": {}, "bySeverity": {}}
    for f in findings:
        t = f.get("type", "unknown")
        s = f.get("severity", "unknown")
        stats["byType"][t] = stats["byType"].get(t, 0) + 1
        stats["bySeverity"][s] = stats["bySeverity"].get(s, 0) + 1
    return stats
