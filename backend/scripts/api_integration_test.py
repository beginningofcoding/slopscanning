#!/usr/bin/env python3
"""Hit read-only GitHub API routes against a running server."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

BASE = "http://127.0.0.1:8000"
OWNER, REPO = "octocat", "Hello-World"


async def main() -> int:
    failed = []
    async with httpx.AsyncClient(timeout=60.0) as client:
        tests = [
            ("GET /health", "get", "/health", None),
            ("GET /github/repo", "get", f"/github/repo?owner={OWNER}&name={REPO}", None),
            ("GET /github/prs", "get", f"/github/prs?owner={OWNER}&name={REPO}&limit=5", None),
            ("GET /github/commits", "get", f"/github/commits?owner={OWNER}&name={REPO}&limit=5", None),
            ("GET /github/docs", "get", f"/github/docs?owner={OWNER}&name={REPO}", None),
        ]
        for name, method, path, body in tests:
            try:
                r = await client.request(method, f"{BASE}{path}", json=body)
                if r.status_code >= 400:
                    failed.append(f"{name}: HTTP {r.status_code} {r.text[:200]}")
                else:
                    print(f"[OK] {name} -> {r.status_code}")
            except Exception as exc:
                failed.append(f"{name}: {exc}")

        # SSE: heuristics-only PR (no LLM)
        try:
            async with client.stream(
                "POST",
                f"{BASE}/api/pr-review/heuristics-only",
                json={
                    "repo": f"https://github.com/{OWNER}/{REPO}",
                    "prNumber": 1,
                },
                timeout=60.0,
            ) as resp:
                if resp.status_code >= 400:
                    failed.append(f"POST heuristics-only: HTTP {resp.status_code}")
                else:
                    import json
                    got_result = False
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = json.loads(line[6:])
                            if data.get("type") == "result":
                                payload = data.get("data") or {}
                                if "verdict" in payload or "signals" in payload:
                                    got_result = True
                                break
                            if data.get("type") == "error":
                                failed.append(f"POST heuristics-only: {data.get('message')}")
                                break
                    if got_result:
                        print("[OK] POST /api/pr-review/heuristics-only -> SSE result")
                    elif not any("heuristics-only" in f for f in failed):
                        failed.append("POST heuristics-only: no result event")
        except Exception as exc:
            failed.append(f"POST heuristics-only: {exc}")

        # SSE: repo audit fast (read until result or error)
        try:
            async with client.stream(
                "POST",
                f"{BASE}/api/repo/audit",
                json={"repo": f"https://github.com/{OWNER}/{REPO}", "mode": "fast"},
                timeout=120.0,
            ) as resp:
                if resp.status_code >= 400:
                    failed.append(f"POST /api/repo/audit: HTTP {resp.status_code}")
                else:
                    got_result = False
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            import json
                            data = json.loads(line[6:])
                            if data.get("type") == "result":
                                got_result = True
                                break
                            if data.get("type") == "error":
                                failed.append(f"POST /api/repo/audit: {data.get('message')}")
                                break
                    if got_result:
                        print("[OK] POST /api/repo/audit -> SSE result")
                    else:
                        failed.append("POST /api/repo/audit: no result event")
        except Exception as exc:
            failed.append(f"POST /api/repo/audit: {exc}")

    print("=" * 40)
    if failed:
        for f in failed:
            print(f"[FAIL] {f}")
        return 1
    print("All integration checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
