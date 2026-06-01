# Contributing to SlopScanning

**Maintainer:** [thanos](https://github.com/beginningofcoding) · **Repository:** [beginningofcoding/slopscanning](https://github.com/beginningofcoding/slopscanning)

First off, thank you for taking the time to contribute to SlopScanning! 🎉

We appreciate your interest in supporting and improving the project. SlopScanning is built with the mission of detecting automated quality regressions, robotic code generation patterns ("slop"), and architectural inconsistencies in software repositories. By identifying AI-generated placeholders, mismatched commit descriptions, and undocumented changes, SlopScanning helps maintain codebases that are clean, readable, and genuinely maintained by human intelligence.

As an open-source project, your contributions—whether they are bug fixes, styling polishes, feature proposals, or documentation updates—help shape the future of this tool.

---

## Project Overview

SlopScanning consists of four core analysis engines designed to assess different dimensions of a software repository's health:

1. **PR Reviewer:**
   * **Location:** `backend/routers/pr_review_router.py` & `backend/services/pr_review_service.py`
   * **Functionality:** Extracts GitHub Pull Request metadata and file diffs. Uses Fireworks (DeepSeek-V4-Pro) to describe structural modifications, extract claims from PR descriptions, analyze discrepancies, and stream real-time verdicts (`TRUSTWORTHY`, `SUSPICIOUS`, or `MISLEADING`), with Gemini as fallback.
2. **Commit Verifier:**
   * **Location:** `backend/routers/commit_verifier_router.py` & `backend/services/commit_verifier_service.py`
   * **Functionality:** Audits recent git commit history via Fireworks, cross-referencing commit messages with diff patches (Gemini fallback).
3. **Documentation Verifier:**
   * **Location:** `backend/routers/docs_verifier_router.py` & `backend/services/docs_verifier_service.py`
   * **Functionality:** Clones repositories to local sandboxed folders, parses Markdown files (`*.md`, `*.mdx`), runs local heuristics, and uses Fireworks to verify README claims against the codebase (Gemini fallback).
4. **Code Scanner:**
   * **Location:** `backend/routers/code_review_router.py` & `backend/services/code_scan_service.py`
   * **Functionality:** Regex audits plus deep Fireworks file analysis (semaphore pool limit of 15), returning an interactive tree view of highlighted issues.

---

## Repository Structure

The SlopScanning repository is organized as a monorepo consisting of the following key directories:

```
slopscanning/
├── frontend/                 # Next.js 16 (React 18) SPA frontend client
│   ├── public/             # Static assets and icons
│   └── src/
│       ├── app/            # Route structures and global CSS style declarations
│       ├── components/     # UI elements (Cards, Badges, File Trees)
│       ├── hooks/          # React hooks (useSsePostStream for SSE handling)
│       └── lib/            # Shared utilities and API fetch wrappers
├── backend/                 # Asynchronous Python FastAPI backend server
│   ├── core/               # Redis configuration and settings loading
│   ├── models/             # Pydantic schemas and database models
│   ├── routers/            # FastAPI HTTP endpoint routers
│   ├── schemas/            # Request and response schemas
│   ├── services/           # Asynchronous AI wrappers, cloning pipelines, and scorers
│   ├── utils/              # Local heuristics (Regex pattern scoring engine)
│   └── main.py             # Server entry point and lifespan triggers
├── docs/                   # Internal specifications and architecture references
│   ├── frontend.md         # Frontend specification document
│   └── backend.md          # Backend specification document
└── BAKE_OFF.md             # Benchmark evaluation and classification metrics
```

---

## Development Setup

Follow these instructions to set up your local development environment.

### Prerequisites

Ensure you have the following software installed on your machine:
* **Node.js:** `v18.18.0` or newer (Node 20+ recommended)
* **Python:** `v3.9` or newer (Python 3.10+ recommended)
* **Git:** Installed and configured in your command line
* **Redis Server:** Running locally (default port `6379`)

---

### Environment Variables

Before launching either the frontend or backend, copy `.env.example` in the root of the repository to `.env`:

```bash
cp .env.example .env
```

Ensure you configure the required API keys to execute scans:
* `REDIS_URL`: Defaults to `redis://localhost:6379/0`.
* `GITHUB_TOKEN`: A Personal Access Token (PAT) from GitHub (highly recommended to bypass default API rate limits).
* `FIREWORKS_API_KEY`: API key for Fireworks serverless (primary LLM).
* `GEMINI_API_KEY`: API key for Google Gemini (fallback when Fireworks fails).
* `SANDBOX_ROOT`: The directory where target repositories will be cloned during scanning (defaults to `./tmp/sandboxed`).

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux:**
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will start and listen at `http://localhost:8000`. You can verify it is running by visiting `http://localhost:8000/health`.

---

### Frontend Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will start and be accessible at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

---

## Contribution Workflow

We follow a typical Git feature-branch workflow for all code contributions:

1. **Fork the Repository:** Fork [beginningofcoding/slopscanning](https://github.com/beginningofcoding/slopscanning) on GitHub.
2. **Create a Local Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Implement Your Changes:** Write clean, documented, and structured code. Follow our [Coding Guidelines](#coding-guidelines).
4. **Test Locally:**
   * Verify that the Next.js app builds successfully without linting warnings (`npm run build` and `npm run lint`).
   * Start both backend and frontend servers, and trigger analysis streams on a test repository to verify there are no broken connections or parser issues.
5. **Push and Open a Pull Request:** Push your branch to your fork and submit a PR to the `main` branch of the upstream repository. Write a clear, concise PR description detailing what was changed and how you verified the changes.

---

## Coding Guidelines

To keep the repository maintainable, clean, and stable, please adhere to these guidelines:

### Frontend
* **Maintain Consistency:** Respect the dark-theme design tokens defined in `src/app/globals.css` (`--color-bg`, `--color-surface`, `--color-border`). Avoid introducing ad-hoc hardcoded CSS values.
* **Component Reuse:** Place reusable UI layout pieces (spinners, cards, layouts) under `src/components/ui/` rather than re-implementing them.
* **Avoid Bloat:** Do not add third-party dependencies unless strictly necessary and approved in PR discussions.
* **Streaming Stability:** Ensure that the `useSsePostStream` hook's state callbacks are correctly managed, and that components call `abort()` upon unmounting.

### Backend
* **Asynchronous Execution:** Write asynchronous code (`async`/`await`) for all router endpoints, network calls, and file operations. Do not block the event loop with synchronous operations.
* **Maintain Service Separation:** Business and AI processing logic belongs in `backend/services/`. Router modules (`backend/routers/`) must focus strictly on receiving requests, checking schemas, and returning streamed event responses.
* **Robust Error Handling:** Wrap server streams in high-level try/except blocks. Errors must be formatted and returned as an SSE event packet (`data: {"type": "error", "message": "..."}`) rather than crashing the request or yielding a standard 500 error, which terminates client-side streams prematurely.

---

## Documentation Contributions

Documentation is just as important as code! We encourage:
* Correcting errors or typos in specifications under `docs/`.
* Updating `README.md` to reflect new feature components.
* Improving comments or docstrings in complex service logic (such as stream parsing or AST tokenization).

---

## Reporting Issues

If you find a bug, encounter unexpected scanning failures, or want to suggest new features, please open an Issue on GitHub with:
1. **Title:** A clear, descriptive title.
2. **Steps to Reproduce:** Exact steps to trigger the bug, including the target repository URL if applicable.
3. **Expected vs. Actual Behavior:** What you expected to see and what actually happened.
4. **Relevant Logs:** Any logs captured from the FastAPI server console or browser console.

---

## Pull Request Checklist

Before submitting a Pull Request, please ensure you satisfy the following checklist:

* [ ] The codebase builds successfully locally without critical compiler errors.
* [ ] No broken relative or external imports have been introduced.
* [ ] Existing scanning pipelines (PRs, Commits, Docs, Code) remain fully functional.
* [ ] Configuration changes are reflected in `.env.example`.
* [ ] Documentation specs are updated if feature behavior has been modified.
* [ ] No claims of unimplemented automated features are introduced into code comments or documentation.

---

## Open Source Readiness Notes

> [!NOTE]
> SlopScanning is fully open-source ready:
> * The codebase is publicly accessible and distributed under the MIT License.
> * Detailed documentation is included in `/docs` to explain architecture and flow specifications.
> * Detailed local setup instructions are provided for immediate developer onboarding.
> * Sandboxing rules and environment defaults are established for run-time isolation.
>
> **Important Note:** We do not currently use automated CI/CD checks, automated pipelines, or cloud deployment hooks. All builds, verification runs, and linting must be executed locally on your workstation.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone, regardless of background, gender identity, sexual orientation, disability, physical appearance, body size, race, age, or religion.

We expect all contributors to maintain professional, respectful, and constructive collaboration:
* Be kind and polite to others.
* Focus on constructive criticism of code and architectures, not individuals.
* Respect community decisions and maintain transparency in pull request reviews.

Unprofessional or exclusionary behavior will not be tolerated in any project channels. Let's build reliable tools together!
