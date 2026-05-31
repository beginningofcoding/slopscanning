from heuristics.signal_types import Severity, Signal
from heuristics.slop_index import compute_slop_index, compute_unchecked_publish_index


def test_slop_index_weighted():
    signals = [
        Signal("1", "x", Severity.HIGH, 0.8, "t", "e", pillar="prs"),
        Signal("2", "y", Severity.LOW, 0.2, "t", "e", pillar="commits"),
    ]
    index, pillars = compute_slop_index(signals)
    assert 0 <= index <= 1
    assert pillars["prs"] > pillars["commits"]


def test_upi():
    upi = compute_unchecked_publish_index(0.8, 0.5, 0.3)
    assert 0.4 * 0.8 + 0.3 * 0.5 + 0.3 * 0.3 == round(upi, 4) or abs(upi - 0.59) < 0.01
