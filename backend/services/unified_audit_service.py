"""Unified repository audit — fast heuristic pass across PR, commits, docs, code pillars."""
from __future__ import annotations

import json
import logging
import tempfile
import asyncio
from pathlib import Path
from typing import AsyncGenerator

from core.config import get_settings
from heuristics.commit_burst import analyze_commit_burst
from heuristics.commit_generic import analyze_commit_messages
from heuristics.doc_concreteness import analyze_readme_content
from heuristics.pr_bundle import analyze_pr_heuristics
from heuristics.signal_types import Signal
from heuristics.slop_index import compute_slop_index, compute_unchecked_publish_index, doc_fiction_risk_from_signals
from services.code_scan_regex import regex_scan_stats, run_regex_scan
from services.docs_verifier_service import clone_repo
from services.fireworks_service import chat_complete
from services.github_service import get_commits, get_file_content, get_pr, get_prs, get_repo

logger = logging.getLogger(__name__)

LIMITATIONS = [
    "Heuristic-only fast audit may miss minimalist AI-generated repos.",
    "Polished human repos with template READMEs can score as higher slop.",
    "Per-PR deep claim verification requires the PR Reviewer tab (LLM).",
    "Code scan in fast mode uses regex only (no deep file LLM).",
]


def _parse_repo(repo_url: str) -> tuple[str, str]:
    repo_url = repo_url.rstrip("/")
    if repo_url.endswith(".git"):
        repo_url = repo_url[:-4]
    if not repo_url.startswith("http"):
        repo_url = f"https://github.com/{repo_url}"
    parts = repo_url.split("/")
    return parts[-2], parts[-1]


async def analyze_repo_audit_stream(repo_url: str, mode: str = "fast") -> AsyncGenerator[str, None]:
    settings = get_settings()
    all_signals: list[Signal] = []
    pillars: dict = {}

    try:
        owner, repo_name = _parse_repo(repo_url)
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Loading repository metadata', 'percent': 5})}\n\n"

        try:
            await get_repo(owner, repo_name)
        except Exception as e:
            logger.warning("Repo metadata fetch: %s", e)

        # --- PR pillar ---
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Analyzing pull requests', 'percent': 15})}\n\n"
        pr_pillar = {"sampled": 0, "signals": []}
        try:
            prs = await get_prs(owner, repo_name, state="all", limit=settings.AUDIT_PR_SAMPLE)
            for pr_meta in prs[: settings.AUDIT_PR_SAMPLE]:
                num = pr_meta["number"]
                pr_data = await get_pr(owner, repo_name, num)
                if not (pr_data.get("body") or "").strip() and not pr_data.get("files"):
                    continue
                diff_text = ""
                for f in pr_data.get("files", []):
                    if f.get("patch"):
                        diff_text += f"\n--- {f['filename']} ---\n{f['patch']}\n"
                sigs, metrics, _, upi = analyze_pr_heuristics(pr_data, diff_text[:80000], None)
                all_signals.extend(sigs)
                pr_pillar["sampled"] += 1
                pr_pillar["latest_pr"] = num
                pr_pillar["pr_metrics"] = metrics
                pr_pillar["unchecked_publish_index"] = upi
                break
        except Exception as e:
            logger.warning("PR pillar: %s", e)
            pr_pillar["error"] = str(e)
        pillars["prs"] = pr_pillar

        # --- Commits pillar ---
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Analyzing commits', 'percent': 35})}\n\n"
        commits_pillar = {}
        try:
            commits = await get_commits(owner, repo_name, settings.AUDIT_COMMIT_SAMPLE)
            gen_sigs, gen_metrics = analyze_commit_messages(commits)
            burst_sigs, pattern_summary = analyze_commit_burst(commits)
            all_signals.extend(gen_sigs + burst_sigs)
            commits_pillar = {
                "count": len(commits),
                "generic_metrics": gen_metrics,
                "pattern_summary": pattern_summary,
            }
        except Exception as e:
            logger.warning("Commits pillar: %s", e)
            commits_pillar["error"] = str(e)
        pillars["commits"] = commits_pillar

        # --- Docs pillar ---
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Analyzing documentation', 'percent': 55})}\n\n"
        docs_pillar = {}
        try:
            readme = await get_file_content(owner, repo_name, "README.md")
            doc_sigs, doc_findings = analyze_readme_content(readme)
            all_signals.extend(doc_sigs)
            docs_pillar = {
                "readme_findings": len(doc_findings),
                "hollow_sections": sum(1 for f in doc_findings if f.get("type") == "hollow-section"),
            }
        except Exception as e:
            logger.warning("Docs pillar (README): %s", e)
            docs_pillar["error"] = str(e)
        pillars["docs"] = docs_pillar

        # --- Code pillar (regex, shallow clone) ---
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Running code heuristics', 'percent': 75})}\n\n"
        code_pillar = {}
        temp_dir = tempfile.mkdtemp(prefix="slop_audit_")
        try:
            repo_full_url = f"https://github.com/{owner}/{repo_name}"
            await asyncio.to_thread(clone_repo, repo_full_url, temp_dir)
            findings = await asyncio.to_thread(
                run_regex_scan,
                Path(temp_dir),
                settings.AUDIT_MAX_CODE_FILES,
            )
            stats = regex_scan_stats(findings)
            high = stats["bySeverity"].get("high", 0) + stats["bySeverity"].get("critical", 0)
            code_score = min(1.0, high / 10.0) if high else min(1.0, stats["totalIssues"] / 30.0)
            if high >= 3:
                from heuristics.signal_types import Severity

                all_signals.append(
                    Signal(
                        id="code_regex_critical",
                        type="code-regex-issues",
                        severity=Severity.HIGH,
                        score=code_score,
                        title="Regex-detected code issues",
                        evidence=f"{stats['totalIssues']} issues ({high} high/critical).",
                        pillar="code",
                    )
                )
            code_pillar = {"stats": stats, "score": round(code_score, 4)}
            pillars["code"] = code_pillar
        except Exception as e:
            logger.warning("Code pillar: %s", e)
            pillars["code"] = {"error": str(e)}
        finally:
            import shutil

            shutil.rmtree(temp_dir, ignore_errors=True)

        yield f"data: {json.dumps({'type': 'progress', 'step': 'Computing Slop Index', 'percent': 90})}\n\n"

        slop_index, pillar_scores = compute_slop_index(all_signals)
        pr_upi = pr_pillar.get("unchecked_publish_index", 0.0)
        doc_risk = doc_fiction_risk_from_signals(all_signals)
        upi = compute_unchecked_publish_index(
            pr_claim_risk=pr_upi,
            hollow_review_risk=pr_upi,
            doc_fiction_risk=doc_risk,
        )

        maintainer_brief = ""
        if settings.AUDIT_LLM_BRIEF and all_signals:
            try:
                signal_json = json.dumps([s.to_dict() for s in all_signals[:40]], indent=2)
                maintainer_brief = await chat_complete(
                    "You are a maintainer audit assistant. Given ONLY these heuristic signals "
                    "(cite signal id when mentioning each issue). Do not invent new issues.\n\n"
                    f"Signals:\n{signal_json}\n\n"
                    f"Slop Index: {slop_index}. UPI: {upi}."
                )
            except Exception as e:
                logger.warning("Maintainer brief LLM failed: %s", e)
                maintainer_brief = "Automated brief unavailable; review signals list."

        result = {
            "slop_index": slop_index,
            "unchecked_publish_index": upi,
            "pillar_scores": pillar_scores,
            "pillars": pillars,
            "signals": [s.to_dict() for s in all_signals],
            "maintainer_brief": maintainer_brief,
            "limitations": LIMITATIONS,
            "mode": mode,
        }

        yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Done', 'percent': 100})}\n\n"
    except Exception as e:
        logger.exception("Unified audit failed")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
