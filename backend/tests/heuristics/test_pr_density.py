from heuristics.pr_density_heuristic import analyze_pr_density
from heuristics.text_overlap_heuristic import overlap_ratio


def test_high_overlap_detected():
    desc = "Added function foo and updated bar in utils.py"
    diff = "+++ utils.py\n+def foo():\n+    pass\n+def bar():\n+    pass"
    signals, metrics = analyze_pr_density(desc, diff, pr_number=1)
    assert metrics["description_overlap"] > 0.3
    assert overlap_ratio(desc, diff) > 0


def test_empty_description_no_signals():
    signals, _ = analyze_pr_density("", "some diff", pr_number=2)
    assert signals == []
