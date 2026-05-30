"""
Legacy module name — analysis routes through Fireworks (primary) with Gemini fallback.
"""
import json
import logging

from services.fireworks_service import chat_complete_json

logger = logging.getLogger(__name__)


async def analyze_file_deep(file_content: str, file_path: str) -> list:
    if len(file_content) > 30000:
        file_content = file_content[:30000] + "\n...[truncated]"

    prompt = (
        f"You are an expert code reviewer. Analyze the following file: {file_path}\n"
        "Return ONLY a JSON array of CodeFinding objects matching this schema:\n"
        "[{ 'id': 'unique-string', 'severity': 'critical'|'high'|'medium'|'low', "
        "'type': 'issue-type', 'line': <start-line>, 'endLine': <end-line>, "
        "'snippet': '<code-snippet>', 'explanation': '<why>', 'suggestedFix': '<fix or null>' }]\n\n"
        "WARNING: You MUST properly escape all backslashes (\\\\) and quotes (\") "
        "within the snippet and explanation strings, otherwise the JSON parser will fail.\n\n"
        f"Code:\n{file_content}"
    )

    try:
        findings = await chat_complete_json(
            prompt,
            json_reminder="\n\nRemember to return ONLY a valid JSON array.",
        )
        return findings if isinstance(findings, list) else []
    except Exception as exc:
        logger.warning("Deep file analysis failed for %s: %s", file_path, exc)
        return []


async def verify_claims_qwen(claims: list, source_code_context: str) -> dict:
    if len(source_code_context) > 100000:
        source_code_context = source_code_context[:100000]

    prompt = (
        "You are an expert technical auditor. Verify the following claims against the "
        "provided source code. Return ONLY a JSON object matching this schema:\n"
        '{ "matches": [{"claim": "...", "evidence": "...", "confidence": 0.9}], '
        '"missingClaims": ["..."], "falseClaims": ["..."], "partialClaims": ["..."] }\n'
        "A claim is 'missing' if there is no evidence for it in the code.\n"
        "A claim is 'false' if the code explicitly contradicts it.\n"
        "A claim is 'partial' if the evidence is weak.\n\n"
        f"Claims:\n{json.dumps(claims)}\n\n"
        f"Source Code Context:\n{source_code_context}"
    )

    try:
        comparison = await chat_complete_json(
            prompt,
            json_reminder="\n\nRemember to return ONLY a valid JSON object.",
        )
        return comparison if isinstance(comparison, dict) else {}
    except Exception as exc:
        logger.warning("Claim verification failed: %s", exc)
        return {
            "matches": [],
            "missingClaims": [],
            "falseClaims": [],
            "partialClaims": [],
        }


async def verify_commit_qwen(message: str, diff_text: str) -> dict:
    prompt = (
        "You are an expert technical auditor. Analyze the following Git Commit Message "
        "and its associated Code Diff. Your job is to detect AI hallucinations, "
        "lazy/generic messages, or over-claiming.\n"
        "Return ONLY a JSON object matching this schema:\n"
        '{ "verdict": "TRUSTWORTHY"|"GENERIC"|"HALLUCINATED", '
        '"reason": "<short explanation why>" }\n\n'
        "Criteria:\n"
        "- TRUSTWORTHY: The message accurately and specifically describes the diff.\n"
        "- GENERIC: The message is too vague, lazy, or looks like default AI output "
        "(e.g., 'Update index.js', 'Refactor code', 'Fix bug') without specifics.\n"
        "- HALLUCINATED: The message claims to do things that are NOT in the diff.\n\n"
        f"Commit Message:\n{message}\n\n"
        f"Code Diff:\n{diff_text}"
    )

    try:
        result = await chat_complete_json(
            prompt,
            json_reminder="\n\nRemember to return ONLY a valid JSON object.",
        )
        return result if isinstance(result, dict) else {}
    except Exception as exc:
        logger.warning("Commit verification failed: %s", exc)
        return {
            "verdict": "GENERIC",
            "reason": "Failed to parse LLM evaluation.",
        }
