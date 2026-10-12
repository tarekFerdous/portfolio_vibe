import 'server-only';
import type { ReadmeErrorReason } from '@/lib/supabase/types';
import { parseGitHubRepoUrl } from './repoUrl';

export type ReadmeRepoMetadata = {
  owner: string;
  repo: string;
  branch: string;
  isPrivate: boolean;
  htmlUrl: string;
  readmePath: string;
};

export type ReadmeFetchResult =
  | { outcome: 'ok'; markdown: string; metadata: ReadmeRepoMetadata }
  /** The repo exists but has no README. */
  | { outcome: 'no_readme'; metadata: ReadmeRepoMetadata }
  | { outcome: 'error'; reason: ReadmeErrorReason };

const GITHUB_API = 'https://api.github.com';
const DEFAULT_README_PATH = 'README.md';

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    // GitHub rejects requests without a User-Agent (403). Node's fetch sends one by
    // default, but Cloudflare Workers' fetch does not.
    'User-Agent': 'tarekferdous.me',
  };
  // Server-only: GITHUB_TOKEN is never prefixed NEXT_PUBLIC_, so it can't reach the client bundle.
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true;
  return (
    response.status === 403 &&
    (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after'))
  );
}

/** Classifies a non-OK GitHub response. 404 on the repo means missing or no token access. */
function errorReason(response: Response): ReadmeErrorReason {
  if (isRateLimited(response)) return 'rate_limited';
  if ([401, 403, 404].includes(response.status)) return 'no_access';
  return 'network';
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Fetches repo metadata and README for a project's GitHub repo and classifies
 * the outcome, so callers can keep the last good README on transient errors
 * and tell the admin whether to fix the token, wait, or retry.
 */
export async function fetchGitHubReadme(repoUrl: string): Promise<ReadmeFetchResult> {
  const ref = parseGitHubRepoUrl(repoUrl);
  if (!ref) return { outcome: 'error', reason: 'no_access' };

  try {
    const repoPath = `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
    const repoResponse = await fetch(`${GITHUB_API}${repoPath}`, { headers: githubHeaders() });
    if (!repoResponse.ok) return { outcome: 'error', reason: errorReason(repoResponse) };
    const repo = (await repoResponse.json()) as { default_branch: string; private: boolean; html_url: string };

    const metadata: ReadmeRepoMetadata = {
      owner: ref.owner,
      repo: ref.repo,
      branch: repo.default_branch,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      readmePath: DEFAULT_README_PATH,
    };

    const readmeResponse = await fetch(`${GITHUB_API}${repoPath}/readme`, { headers: githubHeaders() });
    if (readmeResponse.status === 404) return { outcome: 'no_readme', metadata };
    if (!readmeResponse.ok) return { outcome: 'error', reason: errorReason(readmeResponse) };
    const readme = (await readmeResponse.json()) as { content: string; encoding: string; path: string };
    if (readme.encoding !== 'base64') return { outcome: 'no_readme', metadata };

    return {
      outcome: 'ok',
      markdown: decodeBase64Utf8(readme.content),
      metadata: { ...metadata, readmePath: readme.path },
    };
  } catch {
    return { outcome: 'error', reason: 'network' };
  }
}
