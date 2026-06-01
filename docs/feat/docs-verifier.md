# Feature Guide: Docs Verifier

The **Docs Verifier** (accessed via the **Docs Verifier** tab) scans a repository's documentation files (Readmes, markdown guides, and mdx pages) to detect boilerplate fluff, duplicate copy-paste sections, placeholder text, and claims that contradict the codebase.

---

## 📖 Feature Overview

* **Purpose**: Guarantee that a repository's documentation is specific, canonical, up-to-date, and matches the actual codebase implementation.
* **Key Scans Conducted**:
  * **Placeholder content**: Searches for leftover template brackets (e.g. `[insert company here]`), dummy paragraphs (`lorem ipsum`), and incomplete reminders (`TODO: write docs`).
  * **Marketing fluff**: Measures the ratio of generic corporate/AI filler terms (e.g. `"cutting-edge"`, `"seamlessly integrates"`, `"world-class"`).
  * **Repeated paragraphs**: Compares all paragraph blocks inside a document using **Levenshtein distance ratios** to locate copy-paste duplication (> 85% similarity).
  * **Contradictory claims**: Evaluates paragraph logic to spot internal conflicts (e.g. stating a feature is supported in one paragraph, and unsupported in another).
  * **Codebase Consistency Verification**: Extracts technical claims from the repository `README.md` and uses Fireworks to audit them against the codebase context.

---

## 🔄 User & Data Workflow

### 1. Document Extraction
1. The user navigates to `/repo/[owner]/[name]/docs`.
2. The user clicks **Verify Docs** to launch the analysis.
3. The client hits the streaming POST endpoint: `/api/docs/analyze`.
4. The server creates a sandboxed directory and clones the repository (`git clone --depth 1`).
5. The server walks the codebase and harvests all `.md` and `.mdx` files under the root or the `docs/` directory (skipping `CHANGELOG`, `LICENSE`, and `node_modules`).

### 2. Heuristics & Local Analysis
1. The server reads each markdown file and splits it into paragraphs.
2. It runs line-by-line regexes and paragraph-by-paragraph similarity calculations.
3. Simultaneously, it collects a massive source code context block by fetching snippets from all code files (up to `100,000` characters total).

### 3. LLM Audit
1. The server extracts all factual claims from the repository `README.md` via Gemini.
2. It sends these claims alongside the source code context to **Qwen 2.5 72B** (via OpenRouter) to verify which claims are supported, missing, or false.
3. Gemini processes the collected findings into a final report featuring highlighted issue regions.

---

## 💻 Frontend Implementation

### Core Components
* **[DocsVerifierClient.jsx](https://github.com/beginningofcoding/slopscanning/blob/main/frontend/src/components/docs/DocsVerifierClient.jsx)**: The central dashboard component.
  * **Dashboard Stats Widgets**: Renders the **Quality Score** (0% to 100%) and **Slop Score** (0% to 100%).
  * **Actionable Fixes Panel**: An interactive list of specific, recommended fixes.
  * **Executive Report View**: Renders the Markdown quality report with HTML Highlights inline.
  * **File Findings Accordion**: Lists each markdown file with a list of issue pills showing the file type, line numbers, excerpt snippet, and technical explanations.

---

## ⚙️ Backend Pipeline & Verification Heuristics

The backend processing is hosted inside `services/docs_verifier_service.py` via `analyze_docs_stream(repo_url)`:

### Local Heuristic Heuristics
1. **Placeholder Finder**:
   ```python
   placeholder_match = re.search(
       r'\[your (company|product|name|description|feature)\]|lorem ipsum|TODO:\s*(write|add|update|fill|complete)|coming soon|\(placeholder\)|insert .{3,50} here', 
       line, re.IGNORECASE
   )
   ```
2. **Marketing Fluff buzzwords**:
   Checks paragraphs against a defined dictionary:
   ```python
   MARKETING_FLUFF = [
       "cutting-edge", "state-of-the-art", "revolutionary", "game-changing",
       "seamlessly", "effortlessly", "powerful", "robust", "scalable", "enterprise-grade",
       "world-class", "best-in-class", "next-generation", "industry-leading"
   ]
   ```
   If a paragraph contains $\ge 3$ fluff terms, a finding of type `marketing-fluff` is added.
3. **Paragraph Repetitions**:
   Runs a Levenshtein comparison on every unique paragraph pair:
   ```python
   similarity = Levenshtein.ratio(norm_p1, norm_p2)
   if similarity > 0.85:
       # Add repeated-paragraph finding
   ```

---

## 🧠 AI Prompting & Output Structures

### 1. Claims Verification Prompt (Fireworks)
* **Prompt**:
  ```
  You are an expert technical auditor. Verify the following claims against the provided source code. 
  Return ONLY a JSON object matching this schema:
  { "matches": [{"claim": "...", "evidence": "...", "confidence": 0.9}], "missingClaims": ["..."], "falseClaims": ["..."], "partialClaims": ["..."] }
  A claim is 'missing' if there is no evidence for it in the code.
  A claim is 'false' if the code explicitly contradicts it.
  A claim is 'partial' if the evidence is weak.

  Claims:
  [README Factual Claims]

  Source Code Context:
  [Repository Source Code Snippets]
  ```

### 2. Output Scoring Metrics
* **Total Claims** = $Matches + Missing + False + Partial$.
* **Base Quality** = $Matches / TotalClaims$.
* **Base Slop** = $False / TotalClaims$.
* **Penalties**: Every heuristic finding (placeholder, repeated paragraph) subtracts from quality and adds to the slop score:
  * High Severity (`placeholder-content`, `false-claim`): `0.1`
  * Medium Severity (`repeated-paragraph`, `missing-feature`): `0.05`
  * Low Severity (`marketing-fluff`, `outdated-version`): `0.02`

---

## ❌ Error & Edge Case Handling

1. **No README File**: If the repository does not contain a `README.md` (or similar file containing readme content), the LLM claim verification phase is bypassed. Heuristic scans are still conducted on other markdown documents.
2. **Levenshtein Complexity**: Calculating ratios across paragraphs is optimized by skipping empty segments and focusing exclusively on distinct markdown textual blocks.
3. **Empty Source Context**: If a repository contains documentation but zero code files matching common programming extensions, the source context will be empty. Qwen will mark all technical readme claims as `missingClaims` (representing a hallucinated or empty codebase).
