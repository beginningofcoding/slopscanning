/**
 * API base URL resolution:
 * - Local: http://localhost:8000 (or .env.local)
 * - Vercel server: API_URL or NEXT_PUBLIC_API_URL (Render)
 * - Vercel browser: NEXT_PUBLIC_API_URL, else same-origin /api/backend proxy
 */
export function getApiBase() {
  const strip = (value) => (value || '').replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const publicUrl = strip(process.env.NEXT_PUBLIC_API_URL);
    if (publicUrl) {
      return publicUrl;
    }
    return `${window.location.origin}/api/backend`;
  }

  // Server components / SSR (runtime env on Vercel — not only build-time)
  const serverUrl = strip(
    process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.RENDER_EXTERNAL_URL,
  );
  if (serverUrl) {
    return serverUrl;
  }

  return 'http://localhost:8000';
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function formatApiError(detail, status, owner, name) {
  const text =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : String(detail ?? `API error ${status}`);

  const repoPath = owner && name ? `${owner}/${name}` : null;

  // Vercel proxy / wrong API URL often returns bare "Not Found"
  if (
    text === 'Not Found' ||
    (status === 404 && !text.includes('Failed to fetch repository'))
  ) {
    return (
      'Backend API is not reachable from the frontend. ' +
      'On Vercel, set NEXT_PUBLIC_API_URL and API_URL to https://slopscanning.onrender.com, ' +
      'then redeploy (clear build cache if needed).'
    );
  }

  const github404 =
    text.includes('404') ||
    text.toLowerCase().includes('not found') ||
    status === 404;

  if (repoPath && github404) {
    return (
      `GitHub repository "${repoPath}" was not found. ` +
      'Check owner/repo spelling, or set GITHUB_TOKEN on Render for private repos.'
    );
  }

  if (text.includes('Failed to fetch') || text.includes('ECONNREFUSED')) {
    return (
      `Cannot reach the API at ${getApiBase()}. ` +
      'Set NEXT_PUBLIC_API_URL on Vercel to https://slopscanning.onrender.com and redeploy.'
    );
  }

  return text;
}

async function apiFetch(path, options = {}, context = {}) {
  const url = `${getApiBase()}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const body = await res.json();
      msg = formatApiError(
        body.detail ?? body.message,
        res.status,
        context.owner,
        context.name,
      );
    } catch (_) {
      if (res.status === 404) {
        msg = formatApiError('Not Found', 404, context.owner, context.name);
      }
    }
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

// ── Repo ──────────────────────────────────────────────────────
export async function fetchRepoInfo(owner, name) {
  return apiFetch(
    `/github/repo?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`,
    { next: { revalidate: 300 } },
    { owner, name },
  );
}

// ── PRs ───────────────────────────────────────────────────────
export async function fetchPRList(owner, name, state = 'all') {
  return apiFetch(`/github/prs?owner=${owner}&name=${name}&state=${state}`, { next: { revalidate: 60 } });
}

export async function fetchPRDetail(owner, name, prNumber) {
  return apiFetch(`/github/pr/${prNumber}?owner=${owner}&name=${name}`, { next: { revalidate: 60 } });
}

// ── Stream endpoints (SSE) — use getApiBase() at call time in client components
export function getPrReviewAnalyzeUrl() {
  return `${getApiBase()}/api/pr-review/analyze`;
}
export function getDocsAnalyzeUrl() {
  return `${getApiBase()}/api/docs/analyze`;
}
export function getCodeReviewAnalyzeUrl() {
  return `${getApiBase()}/api/code-review/analyze`;
}
export function getCommitsAnalyzeUrl() {
  return `${getApiBase()}/api/commits/analyze`;
}
export function getRepoAuditAnalyzeUrl() {
  return `${getApiBase()}/api/repo/audit`;
}

// ── Code Scan Summary & Files ──────────────────────────────────
export async function fetchCodeReviewSummary(repoUrl, findings) {
  return apiFetch(`/api/code-review/summary`, {
    method: 'POST',
    body: JSON.stringify({ repo: repoUrl, findings }),
  });
}

export async function fetchRepoFileContent(owner, name, filePath) {
  return apiFetch(`/github/file?owner=${owner}&name=${name}&path=${encodeURIComponent(filePath)}`);
}

export async function fetchCommitsList(owner, name, limit = 10) {
  return apiFetch(`/github/commits?owner=${owner}&name=${name}&limit=${limit}`, { next: { revalidate: 60 } });
}

export async function fetchDocsList(owner, name) {
  return apiFetch(`/github/docs?owner=${owner}&name=${name}`, { next: { revalidate: 60 } });
}
