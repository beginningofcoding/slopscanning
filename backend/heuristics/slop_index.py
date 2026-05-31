from __future__ import annotations

from heuristics.signal_types import Signal

PILLAR_WEIGHTS = {
    "prs": 0.30,
    "commits": 0.25,
    "docs": 0.25,
    "code": 0.20,
}


def _pillar_score(signals: list[Signal], pillar: str) -> float:
    pillar_signals = [s for s in signals if s.pillar == pillar]
    if not pillar_signals:
        return 0.0
    return min(1.0, sum(s.score for s in pillar_signals) / max(len(pillar_signals), 1))


def compute_slop_index(
    signals: list[Signal],
    pillar_scores: dict[str, float] | None = None,
) -> tuple[float, dict[str, float]]:
    if pillar_scores is None:
        pillar_scores = {p: _pillar_score(signals, p) for p in PILLAR_WEIGHTS}

    total = 0.0
    weight_sum = 0.0
    for pillar, weight in PILLAR_WEIGHTS.items():
        score = pillar_scores.get(pillar, 0.0)
        if score > 0:
            total += score * weight
            weight_sum += weight

    if weight_sum == 0:
        return 0.0, pillar_scores

    index = total / weight_sum
    return round(min(1.0, max(0.0, index)), 4), pillar_scores


def compute_unchecked_publish_index(
    pr_claim_risk: float = 0.0,
    hollow_review_risk: float = 0.0,
    doc_fiction_risk: float = 0.0,
) -> float:
    upi = 0.4 * pr_claim_risk + 0.3 * hollow_review_risk + 0.3 * doc_fiction_risk
    return round(min(1.0, max(0.0, upi)), 4)


def risks_from_pr_signals(signals: list[Signal], comparison: dict | None = None) -> tuple[float, float]:
    density_scores = [
        s.score for s in signals if s.type in ("pr-description-restating", "pr-low-information")
    ]
    hollow_scores = [s.score for s in signals if s.type == "hollow-review"]
    unchecked_scores = [s.score for s in signals if s.type == "unchecked-merge-risk"]

    pr_claim_risk = max(density_scores) if density_scores else 0.0
    if comparison:
        false_n = len(comparison.get("falseClaims") or [])
        missing_n = len(comparison.get("missingClaims") or [])
        total = (
            false_n
            + missing_n
            + len(comparison.get("matches") or [])
            + len(comparison.get("partialClaims") or [])
        )
        if total > 0:
            pr_claim_risk = max(pr_claim_risk, (false_n + missing_n * 0.5) / total)

    hollow_review_risk = max(hollow_scores + unchecked_scores) if (hollow_scores or unchecked_scores) else 0.0
    return pr_claim_risk, hollow_review_risk


def doc_fiction_risk_from_signals(signals: list[Signal]) -> float:
    doc_scores = [
        s.score
        for s in signals
        if s.pillar == "docs" and s.type in ("hollow-section", "low-concreteness", "doc-drift")
    ]
    return max(doc_scores) if doc_scores else 0.0
