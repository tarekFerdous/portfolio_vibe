export type GitHubRepoRef = { owner: string; repo: string };

const SEGMENT = /^[A-Za-z0-9_.-]+$/;

/**
 * Parses `https://github.com/{owner}/{repo}` (optional `www.`, trailing slash
 * and `.git` suffix). Returns null for anything else, including URLs that
 * point deeper into a repo (e.g. `/tree/main`).
 */
export function parseGitHubRepoUrl(input: string): GitHubRepoRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;
  if (url.search || url.hash) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');
  if (!SEGMENT.test(owner) || !SEGMENT.test(repo) || repo === '.' || repo === '..') return null;
  return { owner, repo };
}
