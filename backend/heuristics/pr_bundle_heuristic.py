from __future__ import annotations

from heuristics.pr_density_heuristic import analyze_pr_density
from heuristics.pr_review_comments_heuristic import analyze_review_comments
from heuristics.pr_unchecked_heuristic import analyze_unchecked_publish
from heuristics.slop_index_heuristic import compute_unchecked_publish_index, risks_from_pr_signals


def analyze_pr_heuristics(
    pr_data: dict,
    diff_text: str,
    comparison: dict | None = None,
) -> tuple[list, dict, dict, float]:
    """Run all PR heuristics; returns signals, pr_metrics, review_metrics, upi."""
    pr_number = pr_data.get("number")
    description = pr_data.get("body") or ""

    density_signals, density_metrics = analyze_pr_density(description, diff_text, pr_number)
    review_signals, review_metrics = analyze_review_comments(
        pr_data.get("comments") or [], pr_number
    )
    unchecked_signals = analyze_unchecked_publish(pr_data, diff_text, review_metrics)

    all_signals = density_signals + review_signals + unchecked_signals
    pr_metrics = {**density_metrics, **review_metrics}

    pr_claim_risk, hollow_risk = risks_from_pr_signals(all_signals, comparison)
    upi = compute_unchecked_publish_index(
        pr_claim_risk=pr_claim_risk,
        hollow_review_risk=hollow_risk,
        doc_fiction_risk=0.0,
    )

    return all_signals, pr_metrics, review_metrics, upi
