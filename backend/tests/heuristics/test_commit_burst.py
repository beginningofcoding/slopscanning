from heuristics.commit_burst import analyze_commit_burst
from heuristics.commit_generic import is_generic_message


def test_generic_message():
    assert is_generic_message("fix bug")
    assert is_generic_message("Update index.js")
    assert not is_generic_message("Fix null pointer in UserService.authenticate()")


def test_burst_detection():
    commits = [
        {"message": "update", "date": "2026-01-01T10:00:00Z"},
        {"message": "update", "date": "2026-01-01T10:01:00Z"},
        {"message": "update", "date": "2026-01-01T10:02:00Z"},
    ]
    signals, summary = analyze_commit_burst(commits)
    assert len(signals) >= 1 or summary
