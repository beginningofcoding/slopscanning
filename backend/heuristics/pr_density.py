from __future__ import annotations

from heuristics.signal_types import Severity, Signal
from heuristics.text_overlap import jaccard_similarity, novel_token_ratio, overlap_ratio

HIGH_OVERLAP = 0.75
MEDIUM_OVERLAP = 0.55


def analyze_pr_density(
    description: str,
    diff_text: str,
    pr_number: int | None = None,
) -> tuple[list[Signal], dict]:
    desc = (description or "").strip()
    diff = diff_text or ""
    overlap = overlap_ratio(desc, diff)
    jaccard = jaccard_similarity(desc, diff)
    novel = novel_token_ratio(desc, diff)

    metrics = {
        "description_overlap": round(overlap, 4),
        "description_jaccard": round(jaccard, 4),
        "novel_token_ratio": round(novel, 4),
    }

    signals: list[Signal] = []
    if not desc:
        return signals, metrics

    prefix = f"pr_{pr_number}_" if pr_number is not None else "pr_"

    if overlap >= HIGH_OVERLAP:
        signals.append(
            Signal(
                id=f"{prefix}density_high_overlap",
                type="pr-description-restating",
                severity=Severity.HIGH,
                score=min(1.0, overlap),
                title="PR description mostly restates the diff",
                evidence=f"Token overlap {overlap:.0%} — description adds little beyond what the patch already shows.",
                pillar="prs",
                metadata=metrics,
            )
        )
    elif overlap >= MEDIUM_OVERLAP:
        signals.append(
            Signal(
                id=f"{prefix}density_medium_overlap",
                type="pr-description-restating",
                severity=Severity.MEDIUM,
                score=overlap,
                title="PR description partially restates the diff",
                evidence=f"Token overlap {overlap:.0%}.",
                pillar="prs",
                metadata=metrics,
            )
        )

    if novel < 0.1 and len(desc) > 80:
        signals.append(
            Signal(
                id=f"{prefix}density_low_novelty",
                type="pr-low-information",
                severity=Severity.MEDIUM,
                score=1.0 - novel,
                title="PR description lacks novel information",
                evidence=f"Only {novel:.0%} of description tokens are not in the diff.",
                pillar="prs",
                metadata=metrics,
            )
        )

    return signals, metrics
