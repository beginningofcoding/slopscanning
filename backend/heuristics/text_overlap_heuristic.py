from __future__ import annotations

import re

_STOP = frozenset(
    "a an the and or but in on at to for of is are was were be been being it this that "
    "with from as by not no yes do does did will would can could should may might".split()
)

_TOKEN = re.compile(r"[a-zA-Z_][a-zA-Z0-9_]{2,}")


def tokenize(text: str) -> set[str]:
    if not text:
        return set()
    tokens = {t.lower() for t in _TOKEN.findall(text)}
    return {t for t in tokens if t not in _STOP and len(t) > 2}


def jaccard_similarity(a: str, b: str) -> float:
    ta, tb = tokenize(a), tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def overlap_ratio(description: str, diff_text: str) -> float:
    """Fraction of description tokens also present in diff (restating filler indicator)."""
    td, tf = tokenize(description), tokenize(diff_text)
    if not td:
        return 0.0
    return len(td & tf) / len(td)


def novel_token_ratio(description: str, diff_text: str) -> float:
    td, tf = tokenize(description), tokenize(diff_text)
    if not td:
        return 0.0
    novel = td - tf
    return len(novel) / len(td)
