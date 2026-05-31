from heuristics.pr_review_comments import analyze_review_comments


def test_hollow_lgtm():
    comments = [{"body": "LGTM"}]
    signals, metrics = analyze_review_comments(comments, pr_number=3)
    assert metrics["substantive_review_ratio"] == 0.0
    assert any(s.type == "hollow-review" for s in signals)


def test_substantive_with_line_ref():
    comments = [{"body": "In `src/app.py` line 42, this should use async def instead."}]
    signals, metrics = analyze_review_comments(comments, pr_number=4)
    assert metrics["substantive_review_ratio"] == 1.0
    assert not any(s.type == "hollow-review" for s in signals)
