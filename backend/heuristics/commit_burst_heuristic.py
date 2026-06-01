from __future__ import annotations

from datetime import datetime
from difflib import SequenceMatcher

from heuristics.signal_types_heuristic import Severity, Signal


def _parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def _message_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, (a or "").split("\n")[0], (b or "").split("\n")[0]).ratio()


def analyze_commit_burst(commits: list[dict]) -> tuple[list[Signal], str]:
    """Detect rapid bursts and uniform messages (bulk AI contribution pattern)."""
    signals: list[Signal] = []
    summary_parts: list[str] = []

    dated = []
    for c in commits:
        dt = _parse_date(c.get("date"))
        if dt:
            dated.append((dt, c))

    if len(dated) < 3:
        return signals, ""

    dated.sort(key=lambda x: x[0])
    bursts = 0
    for i in range(1, len(dated)):
        delta = (dated[i][0] - dated[i - 1][0]).total_seconds()
        if delta < 120:
            bursts += 1

    messages = [(c.get("message") or "").split("\n")[0] for _, c in dated]
    similar_pairs = 0
    for i in range(len(messages)):
        for j in range(i + 1, min(i + 4, len(messages))):
            if _message_similarity(messages[i], messages[j]) > 0.85:
                similar_pairs += 1

    if bursts >= 2:
        signals.append(
            Signal(
                id="commit_burst_timing",
                type="commit-burst",
                severity=Severity.MEDIUM,
                score=min(1.0, bursts / 5),
                title="Rapid commit burst detected",
                evidence=f"{bursts} commit pairs landed within 2 minutes — possible bulk AI drop.",
                pillar="commits",
                metadata={"burst_pairs": bursts},
            )
        )
        summary_parts.append(f"rapid burst ({bursts} pairs <2min)")

    if similar_pairs >= 2:
        signals.append(
            Signal(
                id="commit_burst_similar_msgs",
                type="commit-burst",
                severity=Severity.MEDIUM,
                score=min(1.0, similar_pairs / 4),
                title="Suspiciously similar commit messages",
                evidence=f"{similar_pairs} near-duplicate message pairs in recent history.",
                pillar="commits",
                metadata={"similar_pairs": similar_pairs},
            )
        )
        summary_parts.append(f"similar messages ({similar_pairs} pairs)")

    pattern_summary = (
        "Commit history shows: " + ", ".join(summary_parts) + "."
        if summary_parts
        else ""
    )
    return signals, pattern_summary
