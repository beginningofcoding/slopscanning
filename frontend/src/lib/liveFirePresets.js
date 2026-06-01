import { PROJECT_GITHUB_URL } from '@/lib/project';

/** Curated Live Fire demo targets (hackathon bonus). */
export const LIVE_FIRE_PRESETS = [
  {
    id: 'full-audit',
    label: 'Live Fire: Full audit (this repo)',
    url: PROJECT_GITHUB_URL,
    description: 'Unified Slop Index across PRs, commits, docs, and code.',
  },
  {
    id: 'hello-world',
    label: 'Baseline: octocat/Hello-World',
    url: 'https://github.com/octocat/Hello-World',
    description: 'Small public repo for a quick scan smoke demo.',
  },
  {
    id: 'react',
    label: 'Large OSS: facebook/react',
    url: 'https://github.com/facebook/react',
    description: 'Stress-test rate limits and fast-mode heuristics (may take longer).',
  },
];

export function parseOwnerName(url) {
  try {
    const parts = url.replace(/\.git$/, '').split('/').filter(Boolean);
    return { owner: parts[parts.length - 2], name: parts[parts.length - 1] };
  } catch {
    return null;
  }
}

export function auditPathForUrl(url, demo = true) {
  const p = parseOwnerName(url);
  if (!p) return '/';
  return `/repo/${p.owner}/${p.name}/audit${demo ? '?demo=1' : ''}`;
}
