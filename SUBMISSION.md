# Slop Scan Hackathon Submission

## Track

- **Primary:** A — Code Review
- **Secondary:** B — Docs & KBs (Docs Verifier + doc signals in Full Audit)

## Project

**SlopScanning** — zero-trust GitHub auditor for PR claims, commits, documentation, and code quality.

## Links

- **Repository:** (your public GitHub URL)
- **Live demo:** (Vercel / deployment URL)
- **Demo video:** (2–3 min YouTube/Loom link)

## Bonus challenges

| Challenge | Status |
|-----------|--------|
| Bake-Off | [benchmarks/results.md](benchmarks/results.md) — heuristic-only, N≥24 |
| Live Fire | Homepage **Live Fire demo** → `/audit?demo=1` |
| Cross-Track Scanner | **Full Repository Audit** — unified Slop Index |
| Open Source Ready | CI, CONTRIBUTING, `docker compose up`, GitHub Action |

## Tools used to build

- Cursor IDE
- Fireworks AI (primary LLM)
- Gemini (fallback)

## 5-minute demo script

1. Homepage → **Live Fire demo** on your repo.
2. Show Slop Index + pillar breakdown + **Signals** list.
3. Open **PR Reviewer** → run analyze → **Brief** vs **Signals** tabs.
4. Mention `DETECTION.md` and honest limitations panel.
5. Show GitHub Action comment on a PR (optional).
