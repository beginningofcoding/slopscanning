"""
fireworks_service.py — Primary LLM provider (Fireworks serverless), Gemini fallback.

Uses the OpenAI-compatible Fireworks endpoint:
  POST https://api.fireworks.ai/inference/v1/chat/completions
"""
from __future__ import annotations

import json
import logging

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

FIREWORKS_CHAT_URL = "https://api.fireworks.ai/inference/v1/chat/completions"


def strip_markdown_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


async def chat_complete(prompt: str, temperature: float = 0.1) -> str:
    """Call Fireworks chat completions; fall back to Gemini on failure or missing key."""
    settings = get_settings()

    if settings.FIREWORKS_API_KEY:
        try:
            return await _fireworks_chat(prompt, temperature, settings, json_mode=False)
        except Exception as exc:
            logger.warning(
                "Fireworks API call failed: %s. Falling back to Gemini.", exc
            )
    else:
        logger.warning("FIREWORKS_API_KEY is not set; falling back to Gemini.")

    from services.gemini_service import gemini_generate

    return await gemini_generate(prompt)


async def chat_complete_json(
    prompt: str,
    temperature: float = 0.1,
    *,
    json_reminder: str | None = None,
) -> dict | list:
    """Fireworks JSON-mode completion with Gemini fallback."""
    settings = get_settings()
    suffix = json_reminder or "\n\nRemember to return ONLY valid JSON."
    full_prompt = prompt + suffix

    if settings.FIREWORKS_API_KEY:
        try:
            text = await _fireworks_chat(
                full_prompt, temperature, settings, json_mode=True
            )
            return json.loads(strip_markdown_fences(text))
        except Exception as exc:
            logger.warning(
                "Fireworks JSON call failed: %s. Falling back to Gemini.", exc
            )

    text = await chat_complete(prompt, temperature=temperature)
    return json.loads(strip_markdown_fences(text))


async def _fireworks_chat(
    prompt: str,
    temperature: float,
    settings,
    *,
    json_mode: bool,
) -> str:
    headers = {
        "Authorization": f"Bearer {settings.FIREWORKS_API_KEY}",
        "Content-Type": "application/json",
    }
    payload: dict = {
        "model": settings.FIREWORKS_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(FIREWORKS_CHAT_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    if "error" in data:
        raise ValueError(f"Fireworks returned error: {data['error']}")

    choices = data.get("choices") or []
    if not choices:
        raise ValueError(f"Fireworks returned no choices: {data}")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if not content:
        raise ValueError("Fireworks returned empty content")

    return content.strip()


async def chat_complete_with_signals(
    signals: list[dict],
    task: str,
    temperature: float = 0.1,
) -> str:
    """LLM narration constrained to provided heuristic signals."""
    import json

    payload = json.dumps(signals[:50], indent=2)
    prompt = (
        f"{task}\n\n"
        "Rules: Only discuss issues supported by the signals below. "
        "Cite signal id in parentheses for each point. "
        "Do not classify as AI-generated — describe quality gaps only.\n\n"
        f"Signals:\n{payload}"
    )
    return await chat_complete(prompt, temperature=temperature)
