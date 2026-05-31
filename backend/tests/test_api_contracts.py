"""Golden-key contract tests: existing API result shapes must keep required fields."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def _load_keys(name: str) -> list[str]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _assert_has_keys(data: dict, required: list[str]) -> None:
    missing = [k for k in required if k not in data]
    assert not missing, f"Missing keys: {missing}"


def test_pr_result_contract_shape():
    required = _load_keys("pr_result_keys.json")
    sample = {
        "prNumber": 1,
        "originalDescription": "",
        "generatedDescription": "x",
        "actual_summary": "y",
        "claims": [],
        "verdict": "TRUSTWORTHY",
        "confidence_score": 0.85,
        "flags": [],
    }
    _assert_has_keys(sample, required)


def test_commit_result_contract_shape():
    required = _load_keys("commit_result_keys.json")
    sample = {
        "commits": [{"sha": "a", "message": "m", "author": "u", "verdict": "GENERIC", "reason": ""}],
        "summary": {
            "executive_summary": "",
            "quality_score": 0.5,
            "slop_score": 0.5,
        },
    }
    _assert_has_keys(sample, required)
    _assert_has_keys(sample["summary"], ["executive_summary", "quality_score", "slop_score"])


def test_docs_result_contract_shape():
    required = _load_keys("docs_result_keys.json")
    sample = {
        "files": [],
        "summary": {
            "executive_summary": "",
            "quality_score": 1.0,
            "slop_score": 0.0,
            "actionable_fixes": [],
        },
    }
    _assert_has_keys(sample, required)
    _assert_has_keys(sample["summary"], ["executive_summary", "quality_score", "slop_score"])


def test_code_result_contract_shape():
    required = _load_keys("code_result_keys.json")
    sample = {"files": [], "stats": {"totalIssues": 0, "byType": {}, "bySeverity": {}}}
    _assert_has_keys(sample, required)


def test_pr_additive_fields_optional():
    """New optional fields must not break contract."""
    extended = {
        "prNumber": 1,
        "originalDescription": "",
        "generatedDescription": "x",
        "actual_summary": "y",
        "claims": [],
        "verdict": "TRUSTWORTHY",
        "confidence_score": 0.85,
        "flags": [],
        "signals": [],
        "pr_metrics": {},
        "unchecked_publish_index": 0.0,
    }
    _assert_has_keys(extended, _load_keys("pr_result_keys.json"))
