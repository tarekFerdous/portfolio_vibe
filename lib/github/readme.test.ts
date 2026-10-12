import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGitHubReadme } from './readme';

vi.mock('server-only', () => ({}));

const fetchMock = vi.fn();
const TOKEN = 'ghp_test_token';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
}

function base64(text: string) {
  return Buffer.from(text, 'utf8').toString('base64');
}

function mockRepo({ isPrivate = false, branch = 'main', readme = '# Hello ✓' as string | null } = {}) {
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/readme')) {
      return readme === null
        ? jsonResponse({ message: 'Not Found' }, 404)
        : jsonResponse({ content: base64(readme), encoding: 'base64', path: 'docs/README.md' });
    }
    return jsonResponse({ default_branch: branch, private: isPrivate, html_url: 'https://github.com/o/r' });
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('GITHUB_TOKEN', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchGitHubReadme', () => {
  it.each([
    'https://github.com/o/r',
    'https://github.com/o/r/',
    'https://github.com/o/r.git',
    'https://www.github.com/o/r',
  ])('resolves the repo from %s', async (url) => {
    mockRepo();
    const result = await fetchGitHubReadme(url);

    expect(result).toMatchObject({ outcome: 'ok', metadata: { owner: 'o', repo: 'r' } });
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/o/r', expect.anything());
  });

  it('returns ok with the decoded README and repo metadata', async () => {
    mockRepo({ branch: 'develop' });

    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({
      outcome: 'ok',
      markdown: '# Hello ✓',
      metadata: {
        owner: 'o',
        repo: 'r',
        branch: 'develop',
        isPrivate: false,
        htmlUrl: 'https://github.com/o/r',
        readmePath: 'docs/README.md',
      },
    });
  });

  it('reports a private repo', async () => {
    mockRepo({ isPrivate: true });
    expect(await fetchGitHubReadme('https://github.com/o/r')).toMatchObject({ metadata: { isPrivate: true } });
  });

  it('returns no_readme with metadata when the repo has no README', async () => {
    mockRepo({ readme: null });
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({
      outcome: 'no_readme',
      metadata: expect.objectContaining({ owner: 'o', repo: 'r', readmePath: 'README.md' }),
    });
  });

  it.each([401, 403, 404])('classifies a %i on the repo as no_access', async (status) => {
    fetchMock.mockImplementation(() => jsonResponse({ message: 'nope' }, status));
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({ outcome: 'error', reason: 'no_access' });
  });

  it('classifies a 429 as rate_limited', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ message: 'slow down' }, 429));
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({ outcome: 'error', reason: 'rate_limited' });
  });

  it('classifies a 403 with an exhausted rate limit as rate_limited', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' })
    );
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({ outcome: 'error', reason: 'rate_limited' });
  });

  it('classifies a rate-limited README request as rate_limited', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/readme')
        ? jsonResponse({ message: 'slow down' }, 429)
        : jsonResponse({ default_branch: 'main', private: false, html_url: 'https://github.com/o/r' })
    );
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({ outcome: 'error', reason: 'rate_limited' });
  });

  it('classifies a server error as network', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ message: 'boom' }, 502));
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({ outcome: 'error', reason: 'network' });
  });

  it('classifies a thrown fetch as network', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await fetchGitHubReadme('https://github.com/o/r')).toEqual({ outcome: 'error', reason: 'network' });
  });

  it('returns no_access for an invalid repo URL without calling GitHub', async () => {
    expect(await fetchGitHubReadme('https://gitlab.com/o/r')).toEqual({ outcome: 'error', reason: 'no_access' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes no Next revalidate options', async () => {
    mockRepo();
    await fetchGitHubReadme('https://github.com/o/r');

    for (const [, init] of fetchMock.mock.calls) {
      expect(init).not.toHaveProperty('next');
    }
  });

  it('sends no Authorization header when GITHUB_TOKEN is not set', async () => {
    mockRepo();
    await fetchGitHubReadme('https://github.com/o/r');

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).not.toHaveProperty('Authorization');
    }
  });

  it('sends a User-Agent header, which GitHub requires (Workers fetch omits it)', async () => {
    mockRepo();
    await fetchGitHubReadme('https://github.com/o/r');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).toHaveProperty('User-Agent');
    }
  });

  it('sends a Bearer token when GITHUB_TOKEN is set', async () => {
    vi.stubEnv('GITHUB_TOKEN', TOKEN);
    mockRepo();
    await fetchGitHubReadme('https://github.com/o/r');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    }
  });
});
