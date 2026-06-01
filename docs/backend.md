# SlopScanning Backend Server Specification

**Author:** thanos · **Repository:** [beginningofcoding/slopscanning](https://github.com/beginningofcoding/slopscanning)

This document provides a comprehensive technical overview and reference for the backend server of **SlopScanning**, built using FastAPI, Pydantic, Redis, and asyncio.

---

## 📖 Backend Overview

The SlopScanning backend is an asynchronous high-throughput web server tasked with cloning repositories, parsing files, running token heuristics, and querying artificial intelligence systems over persistent connections.

---

## 📂 Folder Structure

```
backend/
├── core/
│   ├── config.py           # Configuration classes & env parsing
│   └── redis.py            # Redis connections & client setups
├── routers/
│   ├── github.py           # GitHub client fetching endpoints
│   ├── pr_review.py        # PR review and description analysis
│   ├── commit_verify.py    # Commit logging validator
│   ├── docs_verify.py      # Markdown quality verifier
│   └── code_scan.py        # Codebase scanner
├── services/
│   ├── github_service.py   # GitHub REST API async wrappers
│   ├── pr_review_service.py# SSE pipeline for PR review
│   ├── commit_verifier_service.py # SSE pipeline for commits
│   ├── docs_verifier_service.py   # SSE pipeline for docs
│   ├── code_review_service.py     # Codebase scanner pipeline
│   ├── openrouter_service.py      # Qwen OpenRouter async client
│   ├── gemini_service.py   # Gemini completions & summaries
│   └── diff_service.py     # Unified diff parser & tokenizer
├── utils/
│   └── pattern_scorer.py   # Regex-based pattern scoring engine
└── main.py                 # Application Entrypoint & Startup Lifespan
```

---

## 🔌 Core Lifespan & Startup Sequences

The backend initializes services asynchronously within the FastAPI lifespan context manager (`main.py`):
1. **Redis Connection**: Resolves the client pool from `REDIS_URL` and ensures connectivity.
2. **Cleanup hooks**: Closes active Redis clients and asynchronous HTTP client pools upon server termination.

---

## 🛣️ Route & Prefix Organization

FastAPI routes are mounted onto the application inside `main.py`:

| Router Module | Route Prefix | Purpose | Tag |
|---|---|---|---|
| **`github.py`** | `/github` | Caches and serves GitHub metadata, PR indices, and file contents. | `github` |
| **`pr_review.py`** | *No Prefix* | Exposes PR review and listing. | `pr_review` |
| **`commit_verify.py`** | `/api/commits` | Audits commit histories. | `commits` |
| **`docs_verify.py`** | *No Prefix* | Scans document repositories. | `docs_verify` |
| **`code_scan.py`** | *No Prefix* | Audits file trees. | `code_review` |

*Note*: Because route paths are defined explicitly within each router file (e.g. `@router.post("/api/pr-review/analyze")`), routers without custom prefix properties mount routes directly as defined.

---

## 🤖 Artificial Intelligence Services

The server aggregates analysis logic by leveraging two external LLM services:

### 1. Fireworks Service (`fireworks_service.py`) — Primary
* **Primary Model**: `accounts/fireworks/models/deepseek-v4-pro` (configurable via `FIREWORKS_MODEL`).
* **Endpoint**: `https://api.fireworks.ai/inference/v1/chat/completions`

### 2. Gemini Service (`gemini_service.py`) — Fallback
* **Fallback Model**: `gemini-3.1-flash-lite`.
* **Native SDK API calls**: Used in helper functions using direct python credentials.
* **HTTP Beta API calls**: Concurrently utilizes FastAPI HTTP connections to fetch completions:
  * Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={GEMINI_API_KEY}`
  * Prompts use a custom `systemInstruction` payload to enforce raw, clean outputs, preventing conversational filler in structured summaries.

### 3. Analysis helpers (`openrouter_service.py`)
* Legacy module name; delegates to `fireworks_service` for deep file analysis, claim verification, and commit checks.

---

## 🔍 Heuristics & RegEx Matcher (`pattern_scorer.py`)

Local file token checks are analyzed before any AI invocations:

### Evaluated Patterns
* **`HARDCODED_SECRETS`**: API keys (e.g. `sk-[a-zA-Z0-9]{20,}`), Bearer tokens (`Bearer [A-Za-z0-9\-._~+/]+=*`), hex signatures (`[a-f0-9]{32,64}`).
* **`PLACEHOLDERS`**: Dummy stubs (e.g. `pass` at line boundaries), return statements with TODO flags (`return null // TODO`), throw-not-implemented lines (`throw new Error('not implemented')`), temporary print lines (`console.log // temp`).
* **`HARDCODED_URLS`**: Development urls (`http://localhost`), numerical IP addresses (`http://127.0.0.1`).
* **`FAKE_SUCCESS`**: Hardcoded positive outcomes (`return {success: true} //`, `res.json({status: "ok"})`).

---

## 🔄 Feature Specification & Mappings

### 1. PR Reviewer
* **HTTP Route**: `POST /api/pr-review/analyze` -> `analyze_pr`
* **Workflow Service**: `pr_review_service.py:analyze_pr_stream`
* **Pipeline Phases**:
  1. Fetches PR data using `github_service.py`.
  2. Compiles diff patches.
  3. Prompts Gemini to describe the changes.
  4. Parses claims inside the description via Gemini.
  5. Computes a mismatch profile comparing claims against code diff summaries.
  6. Determines a verdict (`TRUSTWORTHY`, `SUSPICIOUS`, `MISLEADING`) and streams back findings.

### 2. Commit Reviewer
* **HTTP Route**: `POST /api/commits/analyze` -> `analyze_commits_endpoint`
* **Workflow Service**: `commit_verifier_service.py:analyze_commits_stream`
* **Pipeline Phases**:
  1. Fetches recent commits via `github_service.py`.
  2. For each commit, pulls the unified diff patch.
  3. Invokes Qwen via OpenRouter to evaluate if the message matches the changes.
  4. Calculates global slop and quality coefficients and streams the result.

### 3. Docs Verifier
* **HTTP Route**: `POST /api/docs/analyze` -> `analyze_docs`
* **Workflow Service**: `docs_verifier_service.py:analyze_docs_stream`
* **Pipeline Phases**:
  1. Clones the repository to sandboxed local storage.
  2. Parses Markdown (`*.md`, `*.mdx`) files.
  3. Evaluates paragraphs locally (Jaccard duplicates, fluff counts, stubs).
  4. Extracts README claims.
  5. Audits README claims against codebase context using Qwen 72B.
  6. Compiles a Markdown summary using Gemini with styled HTML tags.

### 4. Code Scanner
* **HTTP Route**: `POST /api/code-review/analyze` -> `analyze_code`
* **Workflow Service**: `code_review_service.py:analyze_code_review_stream`
* **Pipeline Phases**:
  1. Clones the repository.
  2. Filters and collects code files.
  3. Performs concurrent regex matching (`pattern_scorer.py`).
  4. Enqueues deep AI audits using Qwen via OpenRouter under a semaphore pool limit of `15`.
  5. Groups issues by file, calculates statistics, and streams results.

---

## ❌ Request Lifecycle & Robust Error Handling

1. **Global Exception Catching**: All major pipeline workflows wrap their loops inside `try...except Exception as e` blocks. Instead of throwing raw HTTP `500` stack traces (which breaks active streaming responses), the server catches the failure, formats it as a `{ "type": "error", "message": "..." }` chunk, streams it to the user, and releases resource sandboxes.
2. **CORS Headers Enforcement**: Mounts `CORSMiddleware` which intercepts preflight OPTIONS calls and enforces allowed origins list.
3. **Log Tracing**: Custom logger definitions format request paths, execution timestamps, and service logs:
   ```python
   logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
   ```
