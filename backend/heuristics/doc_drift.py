from __future__ import annotations

from pathlib import Path

from heuristics.signal_types import Severity, Signal

INSTALL_HINTS = ("npm install", "yarn", "pnpm", "pip install", "poetry install", "make install")
TEST_HINTS = ("npm test", "pytest", "make test", "cargo test", "go test")


def check_readme_vs_manifest(repo_path: Path) -> tuple[list[Signal], list[dict]]:
    signals: list[Signal] = []
    findings: list[dict] = []

    readme = repo_path / "README.md"
    if not readme.exists():
        return signals, findings

    try:
        content = readme.read_text(encoding="utf-8", errors="replace").lower()
    except OSError:
        return signals, findings

    has_package_json = (repo_path / "package.json").exists()
    has_pyproject = (repo_path / "pyproject.toml").exists() or (repo_path / "setup.py").exists()
    has_makefile = (repo_path / "Makefile").exists()
    has_cargo = (repo_path / "Cargo.toml").exists()

    if any(h in content for h in INSTALL_HINTS):
        if "npm" in content and not has_package_json:
            findings.append({
                "severity": "medium",
                "type": "doc-drift",
                "lines": [],
                "excerpt": "README mentions npm but no package.json found",
                "explanation": "Documentation may describe install steps that do not match the repository.",
            })
            signals.append(
                Signal(
                    id="doc_drift_npm",
                    type="doc-drift",
                    severity=Severity.MEDIUM,
                    score=0.7,
                    title="README/npm drift",
                    evidence="README references npm install but package.json is missing.",
                    pillar="docs",
                )
            )
        if "pip" in content and not has_pyproject:
            findings.append({
                "severity": "medium",
                "type": "doc-drift",
                "lines": [],
                "excerpt": "README mentions pip but no Python project manifest",
                "explanation": "Install instructions may not match repository layout.",
            })
            signals.append(
                Signal(
                    id="doc_drift_pip",
                    type="doc-drift",
                    severity=Severity.MEDIUM,
                    score=0.65,
                    title="README/Python drift",
                    evidence="README references pip but pyproject.toml/setup.py not found.",
                    pillar="docs",
                )
            )

    if any(h in content for h in TEST_HINTS) and not (
        has_package_json or has_pyproject or has_makefile or has_cargo
    ):
        if "make test" in content and not has_makefile:
            findings.append({
                "severity": "low",
                "type": "doc-drift",
                "lines": [],
                "excerpt": "make test mentioned without Makefile",
                "explanation": "Test instructions may be outdated.",
            })

    return signals, findings
