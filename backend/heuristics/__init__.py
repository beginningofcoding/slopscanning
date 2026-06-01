"""Deterministic slop detection signals (no LLM classification)."""
from heuristics.signal_types_heuristic import Signal, Severity
from heuristics.slop_index_heuristic import compute_slop_index, compute_unchecked_publish_index

__all__ = [
    "Signal",
    "Severity",
    "compute_slop_index",
    "compute_unchecked_publish_index",
]
