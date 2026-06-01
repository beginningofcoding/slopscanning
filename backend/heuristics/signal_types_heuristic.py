from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Signal:
    id: str
    type: str
    severity: Severity
    score: float
    title: str
    evidence: str
    pillar: str = "general"
    lines: list[int] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity.value,
            "score": round(float(self.score), 4),
            "title": self.title,
            "evidence": self.evidence,
            "pillar": self.pillar,
            "lines": self.lines,
            "metadata": self.metadata,
        }
