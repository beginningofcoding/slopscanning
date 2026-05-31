/**
 * Parse a GitHub URL into owner and repo name.
 * Handles: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 */
export function parseGitHubUrl(input) {
  if (!input) return null;
  // Strip protocol and trailing slashes
  let cleaned = input.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  // Strip github.com prefix
  cleaned = cleaned.replace(/^github\.com\//, '');
  // Strip .git suffix
  cleaned = cleaned.replace(/\.git$/, '');
  // Should now be owner/repo
  const parts = cleaned.split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], name: parts[1] };
}

export function buildRepoUrl(owner, name) {
  return `https://github.com/${owner}/${name}`;
}

export function buildPRUrl(owner, name, prNumber) {
  return `https://github.com/${owner}/${name}/pull/${prNumber}`;
}