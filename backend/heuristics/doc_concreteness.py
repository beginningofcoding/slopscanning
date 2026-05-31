from __future__ import annotations

import re

from heuristics.signal_types import Severity, Signal

IMPERATIVE = re.compile(
    r"(?i)\b(run|install|execute|set|export|create|add|configure|npm|yarn|pnpm|pip|docker|git clone)\b"
)
PATH_LIKE = re.compile(r"[`'\"]?[\w./-]+\.(md|json|ya?ml|toml|env|sh|py|js|ts)[`'\"]?")
FENCE = re.compile(r"^```", re.MULTILINE)
HEADING = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)
CIRCULAR = re.compile(
    r"(?i)\b(as (mentioned|discussed|noted) (above|earlier|before)|see above|refer to the previous)\b"
)


def _sections(content: str) -> list[tuple[str, str, int]]:
    lines = content.splitlines()
    sections: list[tuple[str, str, int]] = []
    current_heading = "(intro)"
    start = 1
    buf: list[str] = []

    for i, line in enumerate(lines, start=1):
        hm = HEADING.match(line.strip())
        if hm:
            if buf:
                sections.append((current_heading, "\n".join(buf), start))
            current_heading = hm.group(1).strip()
            start = i
            buf = []
        else:
            buf.append(line)
    if buf:
        sections.append((current_heading, "\n".join(buf), start))
    return sections


def analyze_markdown_concreteness(
    content: str,
    file_label: str = "README.md",
) -> tuple[list[Signal], list[dict]]:
    """Return signals and doc-style findings compatible with docs_verifier."""
    signals: list[Signal] = []
    findings: list[dict] = []

    for heading, body, start_line in _sections(content):
        if not body.strip() or len(body.strip()) < 40:
            continue

        words = len(body.split())
        fences = len(FENCE.findall(body))
        imperatives = len(IMPERATIVE.findall(body))
        paths = len(PATH_LIKE.findall(body))

        density = (fences * 50 + imperatives * 5 + paths * 3) / max(words, 1)

        if words > 80 and fences == 0 and imperatives == 0 and paths < 2:
            findings.append({
                "severity": "high",
                "type": "hollow-section",
                "lines": [start_line],
                "excerpt": body[:200],
                "explanation": f"Section '{heading}' has {words} words but no code examples or runnable instructions.",
            })
            signals.append(
                Signal(
                    id=f"doc_hollow_{file_label}_{start_line}",
                    type="hollow-section",
                    severity=Severity.HIGH,
                    score=0.85,
                    title=f"Hollow doc section: {heading}",
                    evidence=f"No code fences or commands in {words}-word section.",
                    pillar="docs",
                    lines=[start_line],
                )
            )
        elif density < 0.15 and words > 120:
            findings.append({
                "severity": "medium",
                "type": "low-concreteness",
                "lines": [start_line],
                "excerpt": body[:200],
                "explanation": f"Section '{heading}' has low information density (few examples/commands per word).",
            })
            signals.append(
                Signal(
                    id=f"doc_low_concrete_{file_label}_{start_line}",
                    type="low-concreteness",
                    severity=Severity.MEDIUM,
                    score=0.6,
                    title=f"Low concreteness: {heading}",
                    evidence=f"Density score {density:.2f} for {words} words.",
                    pillar="docs",
                    lines=[start_line],
                )
            )

        if CIRCULAR.search(body):
            findings.append({
                "severity": "low",
                "type": "circular-explanation",
                "lines": [start_line],
                "excerpt": body[:200],
                "explanation": "Section references other sections without adding new facts.",
            })
            signals.append(
                Signal(
                    id=f"doc_circular_{file_label}_{start_line}",
                    type="circular-explanation",
                    severity=Severity.LOW,
                    score=0.4,
                    title="Circular explanation",
                    evidence="Cross-references without substantive content.",
                    pillar="docs",
                    lines=[start_line],
                )
            )

    return signals, findings


def analyze_readme_content(content: str) -> tuple[list[Signal], list[dict]]:
    return analyze_markdown_concreteness(content, "README.md")
