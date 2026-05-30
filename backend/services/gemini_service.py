"""
gemini_service.py
Thin async wrapper around google-generativeai (Gemini 1.5 Flash).

All calls use asyncio.to_thread so the event loop is never blocked.
Every function has full error handling: no exception propagates to the caller.
Responses are parsed as JSON (response_mime_type="application/json").
"""
from __future__ import annotations

import asyncio
import json
import logging
import textwrap
from typing import Any

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────

def _get_model(temperature: float = 0.1):
    """Construct and return a configured GenerativeModel instance."""
    import google.generativeai as genai

    try:
        from core.config import get_settings
        api_key = get_settings().GEMINI_API_KEY
    except Exception:
        import os
        api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    genai.configure(api_key=api_key)

    return genai.GenerativeModel(
        model_name="gemini-3.1-flash-lite",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=temperature,
            max_output_tokens=2048,
        ),
    )


def _call_model_sync(model, prompt: str) -> dict:
    """
    Synchronous model call. Must be executed inside asyncio.to_thread.
    Returns parsed JSON dict, or raises on error.
    """
    response = model.generate_content(prompt)
    text = response.text.strip()
    return json.loads(text)


def _safe_json_parse(text: str) -> dict | None:
    """Try to extract a JSON object from text even if surrounded by markdown fences."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Strip markdown code fences
    cleaned = text.strip()
    for fence in ("```json", "```"):
        if cleaned.startswith(fence):
            cleaned = cleaned[len(fence):]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        return None


async def _call_gemini(
    prompt: str,
    temperature: float = 0.1,
) -> dict | None:
    """
    Async wrapper that calls Gemini in a thread and returns the parsed JSON dict.
    Returns None on any error (caller must handle the None case).
    """
    try:
        model = _get_model(temperature=temperature)
        result = await asyncio.to_thread(_call_model_sync, model, prompt)
        return result
    except Exception as exc:
        # Catch everything: API errors, quota errors, JSON parse errors, etc.
        logger.error(f"Gemini API call failed: {type(exc).__name__}: {exc}")
        return None

async def gemini_generate(prompt: str, options: dict = None) -> str:
    from core.config import get_settings
    import httpx
    api_key = get_settings().GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": "You are a backend processing AI. You must follow the user's instructions exactly and output only what is requested. Never converse, just execute the prompt."}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 2048}
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        
    if response.status_code != 200:
        raise ValueError(f"Gemini API error: {response.text}")
        
    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected response structure from Gemini API: {data}")



# ──────────────────────────────────────────────────────────────
# PR review summary
# ──────────────────────────────────────────────────────────────

async def generate_pr_summary(pr_data: dict, analysis: dict) -> dict:
    """
    Generate a structured PR review verdict using Gemini.

    Args:
        pr_data:  Raw PR metadata dict (title, body, user, etc.)
        analysis: Change fingerprint and mismatch results from local analysis

    Returns dict with keys:
        verdict, confidence, summary, claim_verdicts, recommendations, slop_indicators
    """
    title   = pr_data.get("title", "(no title)")
    body    = (pr_data.get("body") or "(no description)")[:2000]

    fns_modified  = analysis.get("functions_modified", [])
    fns_added     = analysis.get("functions_added", [])
    fns_deleted   = analysis.get("functions_deleted", [])
    logic_changed = analysis.get("logic_changed", False)
    only_strings  = analysis.get("only_string_changes", False)
    config_only   = analysis.get("config_only", False)
    test_changed  = analysis.get("test_files_changed", False)
    doc_changed   = analysis.get("doc_files_changed", False)
    diff_summary  = analysis.get("diff_summary", "Not available")
    mismatches    = analysis.get("mismatches", [])

    mismatches_json = json.dumps(mismatches, default=str, indent=2)[:3000]

    prompt = textwrap.dedent(f"""
        You are a rigorous code-review AI specialising in detecting AI-generated "slop" — 
        code that looks plausible but is misleading, incomplete, or claims more than it delivers.

        ## PR Metadata
        Title: {title}
        Description:
        {body}

        ## Change Fingerprint (from static analysis)
        - Functions modified : {fns_modified}
        - Functions added    : {fns_added}
        - Functions deleted  : {fns_deleted}
        - Logic changed      : {logic_changed}
        - Only string changes: {only_strings}
        - Config-only changes: {config_only}
        - Tests changed      : {test_changed}
        - Docs changed       : {doc_changed}
        - Diff summary       : {diff_summary}

        ## Detected Claim Mismatches (from rule engine)
        {mismatches_json}

        ## Your Task
        Evaluate the PR honestly. Return ONLY a JSON object with this exact schema:
        {{
          "verdict": "TRUSTWORTHY" | "SUSPICIOUS" | "MISLEADING",
          "confidence": <float 0.0-1.0>,
          "summary": "<2-3 sentence factual description of what the code actually does>",
          "claim_verdicts": [
            {{"claim": "<sentence>", "verdict": "VERIFIED" | "MISMATCH" | "UNVERIFIABLE", "reason": "<explanation>", "confidence": <float>}}
          ],
          "recommendations": ["<actionable suggestion>"],
          "slop_indicators": ["<specific red flag if any>"]
        }}

        Do not include any text outside the JSON object.
    """).strip()

    result = await _call_gemini(prompt, temperature=0.1)

    if result is None:
        # Graceful fallback: use local mismatch data
        local_verdicts = [
            {
                "claim": m.get("claim", ""),
                "verdict": "MISMATCH" if m.get("is_mismatch") else "VERIFIED",
                "reason": m.get("reason", ""),
                "confidence": m.get("confidence", 0.5),
            }
            for m in mismatches
        ]
        mismatch_count = sum(1 for m in mismatches if m.get("is_mismatch"))
        fallback_verdict = "MISLEADING" if mismatch_count > 2 else ("SUSPICIOUS" if mismatch_count else "TRUSTWORTHY")
        return {
            "verdict": fallback_verdict,
            "confidence": 0.5,
            "summary": "AI summary unavailable. Review findings below.",
            "claim_verdicts": local_verdicts,
            "recommendations": ["Manually verify that the PR description matches the actual code changes."],
            "slop_indicators": [f"{mismatch_count} claim mismatches detected by rule engine"] if mismatch_count else [],
        }

    # Normalise: ensure all required keys are present
    return {
        "verdict":         result.get("verdict", "SUSPICIOUS"),
        "confidence":      float(result.get("confidence", 0.5)),
        "summary":         result.get("summary", ""),
        "claim_verdicts":  result.get("claim_verdicts", []),
        "recommendations": result.get("recommendations", []),
        "slop_indicators": result.get("slop_indicators", []),
    }


# ──────────────────────────────────────────────────────────────
# Docs quality report
# ──────────────────────────────────────────────────────────────

async def generate_docs_report(findings: dict) -> dict:
    """
    Generate a documentation quality report from aggregate findings.

    Args:
        findings: Aggregated stats from doc_analyzer (filler count, repetitions, etc.)

    Returns dict with keys:
        slop_score, quality_score, top_issues, actionable_fixes
    """
    total_docs        = findings.get("total_docs", 0)
    filler_count      = findings.get("filler_count", 0)
    repetition_count  = findings.get("repetition_count", 0)
    hallucinated_count = findings.get("hallucinated_count", 0)
    avg_filler_ratio  = findings.get("avg_filler_ratio", 0.0)
    top_issues_raw    = findings.get("top_issues", [])

    top_issues_json = json.dumps(top_issues_raw[:10], default=str, indent=2)

    prompt = textwrap.dedent(f"""
        You are a documentation quality analyst. Review these metrics and produce an actionable quality report.

        ## Documentation Scan Results
        - Total documents analysed   : {total_docs}
        - Filler phrase occurrences  : {filler_count}
        - Repetitive section pairs   : {repetition_count}
        - Hallucinated code references: {hallucinated_count}
        - Average filler ratio        : {avg_filler_ratio:.2%}

        ## Top Issues Found
        {top_issues_json}

        ## Your Task
        Return ONLY a JSON object:
        {{
          "slop_score"      : <float 0.0-1.0, higher = more slop>,
          "quality_score"   : <float 0.0-1.0, higher = better quality>,
          "executive_summary": "<Markdown formatted summary of the overall doc quality. You MUST explicitly mention the exact doc/code snippets where issues lie. Highlight the issues using HTML, for example `<span style=\"color: var(--color-red); font-weight: 600;\">issue text</span>`>",
          "top_issues"      : ["<concise issue description>"],
          "actionable_fixes": ["<specific, actionable fix>"]
        }}

        slop_score and quality_score should reflect the actual metrics above.
        Do not include any text outside the JSON object.
    """).strip()

    result = await _call_gemini(prompt, temperature=0.2)

    if result is None:
        # Derive scores from raw metrics
        raw_slop = min(1.0, avg_filler_ratio * 2 + (hallucinated_count * 0.05) + (repetition_count * 0.03))
        return {
            "slop_score":       round(raw_slop, 3),
            "quality_score":    round(max(0.0, 1.0 - raw_slop), 3),
            "top_issues":       top_issues_raw[:5],
            "actionable_fixes": [
                "Remove filler marketing phrases and replace with concrete descriptions.",
                "Verify that all code symbols mentioned in docs exist in the codebase.",
                "Consolidate repetitive sections into single canonical references.",
            ],
            "executive_summary": "AI summary unavailable due to fallback.",
        }

    return {
        "slop_score":       float(result.get("slop_score", avg_filler_ratio)),
        "quality_score":    float(result.get("quality_score", max(0.0, 1.0 - avg_filler_ratio))),
        "executive_summary": result.get("executive_summary", ""),
        "top_issues":       result.get("top_issues", []),
        "actionable_fixes": result.get("actionable_fixes", []),
    }


# ──────────────────────────────────────────────────────────────
# Code scan summary
# ──────────────────────────────────────────────────────────────

async def generate_scan_summary(findings: dict) -> dict:
    """
    Generate an executive summary of a code scan.

    Args:
        findings: Aggregated stats from scan_worker (file count, issue breakdown, etc.)

    Returns dict with keys:
        executive_summary, severity_breakdown, top_recommendations
    """
    file_count         = findings.get("file_count", 0)
    total_issues       = findings.get("total_issues", 0)
    issue_breakdown    = findings.get("issue_breakdown", {})
    severity_breakdown = findings.get("severity_breakdown", {})
    top_files          = findings.get("top_files", [])[:10]

    breakdown_json = json.dumps(issue_breakdown, default=str, indent=2)
    severity_json  = json.dumps(severity_breakdown, default=str, indent=2)
    top_files_json = json.dumps(top_files, default=str, indent=2)

    prompt = textwrap.dedent(f"""
        You are a senior software engineer reviewing automated scan results for AI-generated code quality.

        ## Scan Summary
        - Files scanned  : {file_count}
        - Total issues   : {total_issues}

        ## Issue Breakdown by Type
        {breakdown_json}

        ## Severity Breakdown
        {severity_json}

        ## Top Problem Files
        {top_files_json}

        ## Your Task
        Return ONLY a JSON object:
        {{
          "executive_summary"   : "<2-3 sentences summarising the scan>",
          "severity_breakdown"  : {{"critical": <int>, "high": <int>, "medium": <int>, "low": <int>}},
          "top_recommendations" : ["<specific actionable recommendation>"]
        }}

        Base severity_breakdown strictly on the provided data.
        Do not include any text outside the JSON object.
    """).strip()

    result = await _call_gemini(prompt, temperature=0.2)

    if result is None:
        critical = severity_breakdown.get("critical", 0)
        high     = severity_breakdown.get("high", 0)
        medium   = severity_breakdown.get("medium", 0)
        low      = severity_breakdown.get("low", 0)
        exec_summary = (
            f"Scanned {file_count} files and found {total_issues} issues "
            f"({critical} critical, {high} high, {medium} medium, {low} low). "
            "Review findings and address critical and high severity issues first."
        )
        return {
            "executive_summary":    exec_summary,
            "severity_breakdown":   severity_breakdown,
            "top_recommendations":  [
                "Address all critical severity issues immediately.",
                "Review high-severity findings before merging any code.",
                "Extract magic numbers into named constants.",
                "Remove or complete stub/fake implementations.",
            ],
        }

    return {
        "executive_summary":   result.get("executive_summary", ""),
        "severity_breakdown":  result.get("severity_breakdown", severity_breakdown),
        "top_recommendations": result.get("top_recommendations", []),
    }