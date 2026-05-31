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
  return apiFetch(`/github/repo?owner=${owner}&name=${name}`, { next: { revalidate: 300 } });
}

// ── PRs ───────────────────────────────────────────────────────
export async function fetchPRList(owner, name, state = 'all') {
  return apiFetch(`/github/prs?owner=${owner}&name=${name}&state=${state}`, { next: { revalidate: 60 } });
}

export async function fetchPRDetail(owner, name, prNumber) {
  return apiFetch(`/github/pr/${prNumber}?owner=${owner}&name=${name}`, { next: { revalidate: 60 } });
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
  return apiFetch(`/api/code-review/summary`, {
    method: 'POST',
    body: JSON.stringify({ repo: repoUrl, findings }),
  });
}

export async function getScanFileContent(owner, name, filePath) {
  return apiFetch(`/github/file?owner=${owner}&name=${name}&path=${encodeURIComponent(filePath)}`);
}

export async function fetchCommitsList(owner, name, limit = 10) {
  return apiFetch(`/github/commits?owner=${owner}&name=${name}&limit=${limit}`, { next: { revalidate: 60 } });
}

export async function fetchDocsList(owner, name) {
  return apiFetch(`/github/docs?owner=${owner}&name=${name}`, { next: { revalidate: 60 } });
}
