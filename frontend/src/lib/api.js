const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const body = await res.json();
      msg = body.detail || body.message || msg;
    } catch (_) {}
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

// ── Repo ──────────────────────────────────────────────────────
export async function fetchRepoInfo(owner, name) {
  try {
    return await apiFetch(`/github/repo?owner=${owner}&name=${name}`, { next: { revalidate: 300 } });
  } catch (e) {
    console.log("Using MOCK repo info");
    return {
      name,
      owner: { login: owner },
      description: "Mock repository for testing UI without backend.",
      stars: 1024,
      forks: 256,
      language: "JavaScript"
    };
  }
}

// ── PRs ───────────────────────────────────────────────────────
export async function fetchPRList(owner, name, state = 'all') {
  try {
    return await apiFetch(`/github/prs?owner=${owner}&name=${name}&state=${state}`, { next: { revalidate: 60 } });
  } catch (e) {
    console.log("Using MOCK PR list");
    return [
      { number: 42, title: 'Add amazing new feature', state: 'open', user: { login: 'johndoe' }, created_at: new Date().toISOString() },
      { number: 41, title: 'Fix broken things', state: 'closed', merged: true, user: { login: 'janedoe' }, created_at: new Date(Date.now() - 86400000).toISOString() }
    ];
  }
}

export async function fetchPRDetail(owner, name, prNumber) {
  try {
    return await apiFetch(`/github/pr/${prNumber}?owner=${owner}&name=${name}`, { next: { revalidate: 60 } });
  } catch (e) {
    console.log("Using MOCK PR detail");
    return {
      number: prNumber,
      title: 'Add amazing new feature',
      state: 'open',
      user: { login: 'johndoe' },
      created_at: new Date().toISOString(),
      body: 'This PR adds a lot of cool stuff.\n\n- Feature A\n- Feature B',
      additions: 150,
      deletions: 20,
      changed_files: 3,
      commits: [
        { sha: 'a1b2c3d4', commit: { message: 'Initial commit for feature', author: { name: 'johndoe', date: new Date().toISOString() } } }
      ],
      comments: [
        { id: 1, user: { login: 'reviewer' }, body: 'Looks good to me.', created_at: new Date().toISOString() }
      ],
      files: [
        { filename: 'src/index.js', status: 'modified', patch: '@@ -1,3 +1,4 @@\n+console.log("feature");\n-console.log("bug");' }
      ]
    };
  }
}

// ── Stream Endpoint Constants ─────────────────────────────────
// These endpoints return SSE streams, so they are not called via apiFetch directly.
// They are passed to the useActionStream hook instead.
export const PR_REVIEW_ANALYZE_URL = `${API_BASE}/api/pr-review/analyze`;
export const DOCS_VERIFY_ANALYZE_URL = `${API_BASE}/api/docs/analyze`;
export const CODE_SCAN_ANALYZE_URL = `${API_BASE}/api/code-review/analyze`;
export const COMMITS_VERIFY_ANALYZE_URL = `${API_BASE}/api/commits/analyze`;
export const REPO_AUDIT_ANALYZE_URL = `${API_BASE}/api/repo/audit`;

// ── Code Scan Summary & Files ──────────────────────────────────
export async function fetchCodeReviewSummary(repoUrl, findings) {
  try {
    return await apiFetch(`/api/code-review/summary`, {
      method: 'POST',
      body: JSON.stringify({ repo: repoUrl, findings }),
    });
  } catch (e) {
    return { summary: "Mock code review summary.", top_recommendations: ["Fix mock issue 1"] };
  }
}

export async function getScanFileContent(owner, name, filePath) {
  try {
    return await apiFetch(`/github/file?owner=${owner}&name=${name}&path=${encodeURIComponent(filePath)}`);
  } catch (e) {
    return { content: `// Mock content for ${filePath}\nfunction test() {\n  return true;\n}` };
  }
}

export async function fetchCommitsList(owner, name, limit = 10) {
  try {
    return await apiFetch(`/github/commits?owner=${owner}&name=${name}&limit=${limit}`, { next: { revalidate: 60 } });
  } catch (e) {
    console.log("Using MOCK commits list");
    return [
      { sha: 'a1b2c3d4e5f6', commit: { message: 'Update code', author: { name: 'johndoe' } }, author: { login: 'johndoe' } },
      { sha: 'f6e5d4c3b2a1', commit: { message: 'Fix typos', author: { name: 'janedoe' } }, author: { login: 'janedoe' } }
    ];
  }
}

export async function fetchDocsList(owner, name) {
  try {
    return await apiFetch(`/github/docs?owner=${owner}&name=${name}`, { next: { revalidate: 60 } });
  } catch (e) {
    console.log("Using MOCK docs list");
    return [
      { path: 'README.md' },
      { path: 'docs/api.md' }
    ];
  }
}
