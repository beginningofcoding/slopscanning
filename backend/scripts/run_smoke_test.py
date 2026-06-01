#!/usr/bin/env python3
"""
Quick smoke test for local SlopScanning setup.

Usage (from backend/ with venv active):
  python scripts/run_smoke_test.py
  python scripts/run_smoke_test.py --api-url http://127.0.0.1:8000
"""
from __future__ import annotations

import argparse
import asyncio
import inspect
import sys
from pathlib import Path

_SERVER_DIR = Path(__file__).resolve().parents[1]
if str(_SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(_SERVER_DIR))

import httpx

from core.app_config import get_settings


async def check_redis() -> tuple[bool, str]:
    try:
        import redis.asyncio as aioredis

        settings = get_settings()
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        await client.aclose()
        return True, "Redis OK"
    except Exception as exc:
        return False, f"Redis failed: {exc}"


async def check_fireworks() -> tuple[bool, str]:
    settings = get_settings()
    if not settings.FIREWORKS_API_KEY:
        return False, "FIREWORKS_API_KEY is not set"
    if "your_" in settings.FIREWORKS_API_KEY:
        return False, "FIREWORKS_API_KEY is still a placeholder"

    from services.fireworks_service import chat_complete

    try:
        reply = await chat_complete(
            'Reply with exactly: {"status":"ok"}',
            temperature=0.0,
        )
        if "ok" in reply.lower():
            return True, f"Fireworks OK ({settings.FIREWORKS_MODEL})"
        return False, f"Unexpected Fireworks reply: {reply[:120]}"
    except Exception as exc:
        return False, f"Fireworks failed: {exc}"


async def check_backend(api_url: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{api_url.rstrip('/')}/health")
            r.raise_for_status()
            data = r.json()
        if data.get("status") == "ok":
            return True, f"Backend OK ({api_url})"
        return False, f"Unexpected health payload: {data}"
    except Exception as exc:
        return False, f"Backend not reachable at {api_url}: {exc}"


async def check_github() -> tuple[bool, str]:
    settings = get_settings()
    if not settings.GITHUB_TOKEN or "your_" in settings.GITHUB_TOKEN:
        return False, "GITHUB_TOKEN missing or placeholder (public API rate limits apply)"

    from services.github_service import get_repo, close_client

    try:
        repo = await get_repo("octocat", "Hello-World")
        await close_client()
        label = f"{repo.get('owner', 'octocat')}/{repo.get('name', 'Hello-World')}"
        return True, f"GitHub OK ({label})"
    except Exception as exc:
        await close_client()
        return False, f"GitHub failed: {exc}"


def check_contracts() -> tuple[bool, str]:
    import subprocess

    tests_dir = _SERVER_DIR / "tests"
    if not (tests_dir / "test_api_contracts.py").exists():
        return False, "test_api_contracts.py not found"
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_api_contracts.py", "-q"],
        cwd=_SERVER_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return False, (result.stdout + result.stderr).strip()[:500]
    return True, "API contract tests passed"


async def main() -> int:
    parser = argparse.ArgumentParser(description="SlopScanning smoke test")
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000",
        help="FastAPI base URL",
    )
    parser.add_argument(
        "--check-contracts",
        action="store_true",
        help="Run pytest API contract tests",
    )
    args = parser.parse_args()

    get_settings.cache_clear()

    async def check_config() -> tuple[bool, str]:
        return True, f"Model={get_settings().FIREWORKS_MODEL}"

    checks: list[tuple[str, object]] = [
        ("Config", check_config),
        ("Redis", check_redis),
        ("Fireworks", check_fireworks),
        ("GitHub", check_github),
        ("Backend", lambda: check_backend(args.api_url)),
    ]
    if args.check_contracts:
        checks.insert(0, ("Contracts", check_contracts))

    from core.project_metadata import PROJECT_AUTHOR, PROJECT_GITHUB_URL, PROJECT_NAME

    print(f"{PROJECT_NAME} smoke test — {PROJECT_AUTHOR}\n{PROJECT_GITHUB_URL}\n" + "=" * 40)
    failed = 0
    for name, fn in checks:
        result = fn()
        if inspect.iscoroutine(result):
            ok, msg = await result
        else:
            ok, msg = result
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {name}: {msg}")
        if not ok:
            failed += 1

    print("=" * 40)
    if failed:
        print(f"{failed} check(s) failed.")
        return 1
    print("All checks passed. Open http://localhost:3000 to test the UI.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
