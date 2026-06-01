from __future__ import annotations

import re

from heuristics.signal_types_heuristic import Severity, Signal

GENERIC_PHRASES = re.compile(
    r"(?i)\b(lgtm|looks good to me|looks good|nice work|great job|approved|"
    r"ship it|seems fine|no issues|all good|perfect|awesome work)\b"
)

LINE_ANCHOR = re.compile(
    r"(?i)(^|\s)([\w./-]+)(#L\d+|:\d+|line\s+\d+)|```[\w]*\n|^\s*[-+]\s",
    re.MULTILINE,
)


def _is_substantive(body: str) -> bool:
    if not body or len(body.strip()) < 12:
        return False
    if GENERIC_PHRASES.fullmatch(body.strip()):
        return False
    if len(body.strip()) < 40 and GENERIC_PHRASES.search(body) and not LINE_ANCHOR.search(body):
        return False
    if LINE_ANCHOR.search(body):
        return True
    if re.search(r"\.(py|js|ts|tsx|go|rs|java)\b", body, re.I):
        return True
    if len(body.strip()) >= 80:
        return True
    if "`" in body or "()" in body or "->" in body:
        return True
    return len(body.split()) >= 15


def analyze_review_comments(
    comments: list[dict],
    pr_number: int | None = None,
) -> tuple[list[Signal], dict]:
    prefix = f"pr_{pr_number}_" if pr_number is not None else "pr_"
    bodies = [(c.get("body") or "").strip() for c in comments if c.get("body")]
    total = len(bodies)
    substantive = sum(1 for b in bodies if _is_substantive(b))
    ratio = substantive / total if total else 0.0

    metrics = {
        "review_comment_count": total,
        "substantive_review_count": substantive,
        "substantive_review_ratio": round(ratio, 4),
    }

    signals: list[Signal] = []
    if total == 0:
        signals.append(
            Signal(
                id=f"{prefix}review_no_comments",
                type="hollow-review",
                severity=Severity.MEDIUM,
                score=0.6,
                title="No PR review comments on diff",
                evidence="No inline or review comments were found on this pull request.",
                pillar="prs",
                metadata=metrics,
            )
        )
        return signals, metrics

    hollow = [b for b in bodies if not _is_substantive(b)]
    if len(hollow) >= 2 or (total >= 1 and ratio < 0.34):
        signals.append(
            Signal(
                id=f"{prefix}review_hollow",
                type="hollow-review",
                severity=Severity.HIGH if ratio < 0.2 else Severity.MEDIUM,
                score=1.0 - ratio,
                title="Hollow or generic PR reviews",
                evidence=f"{len(hollow)}/{total} comments lack line-specific or substantive feedback.",
                pillar="prs",
                metadata=metrics,
            )
        )

    return signals, metrics
