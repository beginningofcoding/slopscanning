# SlopScan Detection Methodology

SlopScan answers: **did anyone actually check this before publish?** We use deterministic heuristics first; LLMs only narrate evidence in optional briefs.

## Pipeline

```
GitHub data / cloned repo
        │
        ▼
┌───────────────────┐
│ Heuristic signals │  overlap, hollow reviews, doc density, regex, commit bursts
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ Rule aggregation  │  Slop Index, Unchecked Publish Index (UPI)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ LLM brief (opt.)  │  cites signal IDs only — not an AI-authorship classifier
└───────────────────┘
```

## Signal catalog

| Signal | Pillar | Method |
|--------|--------|--------|
| `pr-description-restating` | PRs | Token overlap between PR body and diff |
| `hollow-review` | PRs | Generic comments, no line anchors |
| `unchecked-merge-risk` | PRs | Large diff + low substantive review ratio |
| `generic-commit-messages` | Commits | Regex / length heuristics on messages |
| `commit-burst` | Commits | Timestamp clustering + message similarity |
| `hollow-section` | Docs | Section word count vs code fences / commands |
| `low-concreteness` | Docs | Information density score per section |
| `doc-drift` | Docs | README install hints vs manifests on disk |
| `code-regex-issues` | Code | [`pattern_scorer.py`](backend/utils/pattern_scorer.py) |

## Indexes

**Slop Index** — weighted mean of pillar scores (PR 30%, commits 25%, docs 25%, code 20%).

**Unchecked Publish Index (UPI)** — `0.4 × claim/density risk + 0.3 × hollow review risk + 0.3 × doc fiction risk`.

## What LLMs do

| Feature | LLM role |
|---------|----------|
| PR Reviewer tab | Claim extraction and comparison (verdict unchanged by heuristics) |
| Commit Verifier tab | Per-commit message vs diff classification |
| Docs Verifier tab | README claim verification |
| Code Scanner tab | Deep file audit when regex triggers |
| Full Audit | Optional maintainer brief from signal JSON only |

## Honest limitations

- Heuristics are not AI detectors; polished human repos may false-positive.
- Minimalist AI repos may false-negative (see [BAKE_OFF.md](BAKE_OFF.md)).
- Fast audit skips per-commit and per-file LLM passes.

## Evaluation

Run heuristic bake-off: `make bakeoff` or `python backend/scripts/run_bakeoff.py` (see [benchmarks/manifest.json](benchmarks/manifest.json)).
