import 'server-only';
import { parseGitHubRepoUrl } from './repoUrl';

export type ProjectReadme = {
  owner: string;
  repo: string;
  branch: string;
  isPrivate: boolean;
  htmlUrl: string;
  /** Null when the repo exists but has no README. */
  markdown: string | null;
  readmePath: string;
};

const GITHUB_API = 'https://api.github.com';
const REVALIDATE_SECONDS = 3600;

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

async function githubJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Loads repo metadata and README for a project's GitHub repo. Returns null on
 * any failure (unparseable URL, missing/inaccessible repo, network error) so
 * the page can fall back to the project description instead of erroring.
 */
export async function getProjectReadme(repoUrl: string): Promise<ProjectReadme | null> {
  const ref = parseGitHubRepoUrl(repoUrl);
  if (!ref) return null;

  try {
    const repoPath = `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
    const repo = await githubJson<{ default_branch: string; private: boolean; html_url: string }>(repoPath);
    if (!repo) return null;

    const readme = await githubJson<{ content: string; encoding: string; path: string }>(`${repoPath}/readme`);
    const markdown = readme?.encoding === 'base64' ? decodeBase64Utf8(readme.content) : null;

    return {
      owner: ref.owner,
      repo: ref.repo,
      branch: repo.default_branch,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      markdown,
      readmePath: readme?.path ?? 'README.md',
    };
  } catch {
    return null;
  }
}
