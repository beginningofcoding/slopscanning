from __future__ import annotations

from heuristics.pr_review_comments import analyze_review_comments
from heuristics.signal_types import Severity, Signal

LARGE_DIFF_LINES = 200
LARGE_DIFF_CHARS = 8000


def analyze_unchecked_publish(
    pr_data: dict,
    diff_text: str,
    review_metrics: dict | None = None,
) -> list[Signal]:
    pr_number = pr_data.get("number")
    prefix = f"pr_{pr_number}_" if pr_number is not None else "pr_"

    additions = pr_data.get("additions") or 0
    deletions = pr_data.get("deletions") or 0
    changed_files = pr_data.get("changed_files") or 0
    diff_lines = len((diff_text or "").splitlines())

    large = (
        additions + deletions > LARGE_DIFF_LINES
        or len(diff_text or "") > LARGE_DIFF_CHARS
        or changed_files > 15
        or diff_lines > LARGE_DIFF_LINES
    )

    if not large:
        return []

    if review_metrics is None:
        _, review_metrics = analyze_review_comments(pr_data.get("comments") or [], pr_number)

    ratio = review_metrics.get("substantive_review_ratio", 0.0)
    count = review_metrics.get("review_comment_count", 0)

    if ratio >= 0.5 and count > 0:
        return []

    return [
        Signal(
            id=f"{prefix}unchecked_large_diff",
            type="unchecked-merge-risk",
            severity=Severity.HIGH,
            score=0.85 if count == 0 else 0.7,
            title="Large change with little substantive review",
            evidence=(
                f"Diff touches ~{changed_files} files (+{additions}/-{deletions}) "
                f"but substantive review ratio is {ratio:.0%} ({count} comments)."
            ),
            pillar="prs",
            metadata={
                "additions": additions,
                "deletions": deletions,
                "changed_files": changed_files,
                **review_metrics,
            },
        )
    ]
