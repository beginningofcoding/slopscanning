from heuristics.doc_concreteness import analyze_markdown_concreteness


def test_hollow_section():
    md = "## Setup\n\n" + ("This section explains the setup in detail. " * 30)
    signals, findings = analyze_markdown_concreteness(md)
    assert any(f["type"] == "hollow-section" for f in findings)


def test_concrete_section_ok():
    md = "## Install\n\n```bash\nnpm install\nnpm run dev\n```\n"
    signals, findings = analyze_markdown_concreteness(md)
    assert not any(f["type"] == "hollow-section" for f in findings)
