from __future__ import annotations

import re

from heuristics.signal_types import Severity, Signal

GENERIC_PATTERNS = [
    re.compile(r"(?i)^(update|fix|refactor|changes?|wip|misc|stuff|code)\.?$"),
    re.compile(r"(?i)^(update|fix|refactor)\s+[\w./-]+\.?$"),
    re.compile(r"(?i)^fix(ed)?\s+(bug|issue)s?\.?$"),
    re.compile(r"(?i)^(initial )?commit\.?$"),
    re.compile(r"(?i)^merge( branch)?"),
]


def is_generic_message(message: str) -> bool:
    first_line = (message or "").strip().split("\n")[0].strip()
    if len(first_line) < 4:
        return True
    if len(first_line) < 12:
        return True
    for pat in GENERIC_PATTERNS:
        if pat.match(first_line):
            return True
    if first_line.lower() in ("update", "fix", "refactor", "changes", "wip"):
        return True
    return False


def analyze_commit_messages(
    commits: list[dict],
) -> tuple[list[Signal], dict]:
    signals: list[Signal] = []
    generic_count = 0
    for c in commits:
        msg = c.get("message") or ""
        if is_generic_message(msg):
            generic_count += 1

    total = len(commits) or 1
    ratio = generic_count / total

    metrics = {
        "generic_commit_count": generic_count,
        "generic_commit_ratio": round(ratio, 4),
        "commit_count": len(commits),
    }

    if generic_count >= 3 or ratio >= 0.5:
        signals.append(
            Signal(
                id="commit_generic_pattern",
                type="generic-commit-messages",
                severity=Severity.HIGH if ratio >= 0.6 else Severity.MEDIUM,
                score=ratio,
                title="Generic commit message pattern",
                evidence=f"{generic_count}/{len(commits)} recent commits use vague AI-style messages.",
                pillar="commits",
                metadata=metrics,
            )
        )

    return signals, metrics
