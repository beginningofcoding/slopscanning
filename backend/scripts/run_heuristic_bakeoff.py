#!/usr/bin/env python3
"""Run Bake-Off 2.0: heuristic classifiers only (no LLM)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

from heuristics.commit_generic_heuristic import is_generic_message
from heuristics.doc_concreteness_heuristic import analyze_markdown_concreteness
from heuristics.pr_density_heuristic import analyze_pr_density
from heuristics.pr_review_comments_heuristic import analyze_review_comments
from heuristics.text_overlap_heuristic import overlap_ratio

MANIFEST = _ROOT / "benchmarks" / "manifest.json"
OUT_MD = _ROOT / "benchmarks" / "results.md"


def classify_item(item: dict) -> str:
    t = item["type"]
    inp = item["input"]
    label_slop = item["label"] == "slop"

    if t == "pr_density":
        desc = inp.get("description", "")
        diff = inp.get("diff", "")
        overlap = overlap_ratio(desc, diff)
        predicted_slop = overlap >= 0.55
    elif t == "hollow_review":
        signals, metrics = analyze_review_comments(inp.get("comments", []))
        predicted_slop = metrics.get("substantive_review_ratio", 1) < 0.5 or any(
            s.type == "hollow-review" for s in signals
        )
    elif t == "commit_generic":
        predicted_slop = is_generic_message(inp.get("message", ""))
    elif t == "doc_concreteness":
        signals, findings = analyze_markdown_concreteness(inp.get("markdown", ""))
        predicted_slop = any(f.get("type") == "hollow-section" for f in findings) or len(signals) > 0
    else:
        predicted_slop = False

    correct = predicted_slop == label_slop
    return "TP" if predicted_slop and label_slop else "TN" if not predicted_slop and not label_slop else "FP" if predicted_slop else "FN"


def main() -> int:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    items = data["items"]
    counts = {"TP": 0, "TN": 0, "FP": 0, "FN": 0}
    by_type: dict[str, dict] = {}

    for item in items:
        bucket = classify_item(item)
        counts[bucket] += 1
        t = item["type"]
        by_type.setdefault(t, {"TP": 0, "TN": 0, "FP": 0, "FN": 0})
        by_type[t][bucket] += 1

    total = len(items)
    acc = (counts["TP"] + counts["TN"]) / total if total else 0
    prec = counts["TP"] / (counts["TP"] + counts["FP"]) if (counts["TP"] + counts["FP"]) else 0
    rec = counts["TP"] / (counts["TP"] + counts["FN"]) if (counts["TP"] + counts["FN"]) else 0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0

    lines = [
        "# Bake-Off 2.0 Results (heuristic-only)",
        "",
        f"Items: {total}",
        "",
        "## Confusion matrix (slop = positive)",
        "",
        "| | Predicted slop | Predicted human |",
        "|---|---|---|",
        f"| Actual slop | {counts['TP']} | {counts['FN']} |",
        f"| Actual human | {counts['FP']} | {counts['TN']} |",
        "",
        f"- Accuracy: {acc:.1%}",
        f"- Precision: {prec:.1%}",
        f"- Recall: {rec:.1%}",
        f"- F1: {f1:.1%}",
        "",
        "## Per signal type",
        "",
    ]
    for t, c in sorted(by_type.items()):
        lines.append(f"### {t}")
        lines.append(f"- TP={c['TP']} TN={c['TN']} FP={c['FP']} FN={c['FN']}")
        lines.append("")

    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(OUT_MD.read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
