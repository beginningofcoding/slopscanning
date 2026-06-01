#!/usr/bin/env python3
"""CLI for PR heuristics (GitHub Action fallback)."""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))


async def run_pr_heuristics(repo: str, pr_number: int) -> dict:
    from services.github_service import get_pr
    from heuristics.pr_bundle_heuristic import analyze_pr_heuristics

    parts = repo.rstrip("/").split("/")
    owner, name = parts[-2], parts[-1]
    pr_data = await get_pr(owner, name, pr_number)
    diff_text = ""
    for f in pr_data.get("files", []):
        if f.get("patch"):
            diff_text += f"\n--- {f['filename']} ---\n{f['patch']}\n"
    signals, pr_metrics, _, upi = analyze_pr_heuristics(pr_data, diff_text[:80000], None)
    return {
        "prNumber": pr_number,
        "signals": [s.to_dict() for s in signals],
        "pr_metrics": pr_metrics,
        "unchecked_publish_index": upi,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="SlopScan heuristics CLI")
    parser.add_argument("--repo", required=True, help="owner/name or GitHub URL")
    parser.add_argument("--pr", type=int, required=True, help="PR number")
    parser.add_argument("--fail-threshold", type=float, default=0.7)
    args = parser.parse_args()

    repo = args.repo
    if "/" in repo and not repo.startswith("http"):
        repo = f"https://github.com/{repo}"

    result = asyncio.run(run_pr_heuristics(repo, args.pr))
    print(json.dumps(result, indent=2))

    if result.get("unchecked_publish_index", 0) >= args.fail_threshold:
        print(f"::error::Unchecked Publish Index {result['unchecked_publish_index']:.2f} >= {args.fail_threshold}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
