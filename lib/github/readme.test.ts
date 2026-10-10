import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProjectReadme } from './readme';

vi.mock('server-only', () => ({}));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function base64(text: string) {
  return Buffer.from(text, 'utf8').toString('base64');
}

function mockRepo({ isPrivate = false, branch = 'main', readme = '# Hello ✓' as string | null } = {}) {
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/readme')) {
      return readme === null
        ? jsonResponse({ message: 'Not Found' }, 404)
        : jsonResponse({ content: base64(readme), encoding: 'base64', path: 'README.md' });
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

describe('getProjectReadme', () => {
  it.each([
    'https://github.com/o/r',
    'https://github.com/o/r/',
    'https://github.com/o/r.git',
    'https://www.github.com/o/r',
  ])('resolves the repo from %s', async (url) => {
    mockRepo();
    const result = await getProjectReadme(url);

    expect(result).toMatchObject({ owner: 'o', repo: 'r' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/o/r', expect.anything());
  });

  it('returns the decoded README, default branch, and README path', async () => {
    mockRepo({ branch: 'develop' });
    const result = await getProjectReadme('https://github.com/o/r');

    expect(result).toEqual({
      owner: 'o',
      repo: 'r',
      branch: 'develop',
      isPrivate: false,
      htmlUrl: 'https://github.com/o/r',
      markdown: '# Hello ✓',
      readmePath: 'README.md',
    });
  });

  it('caches GitHub responses for an hour', async () => {
    mockRepo();
    await getProjectReadme('https://github.com/o/r');

    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toMatchObject({ next: { revalidate: 3600 } });
    }
  });

  it('reports a private repo', async () => {
    mockRepo({ isPrivate: true });
    expect((await getProjectReadme('https://github.com/o/r'))?.isPrivate).toBe(true);
  });

  it('returns markdown null when the repo has no README', async () => {
    mockRepo({ readme: null });
    expect((await getProjectReadme('https://github.com/o/r'))?.markdown).toBeNull();
  });

  it('returns null when the repo is not found', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ message: 'Not Found' }, 404));
    expect(await getProjectReadme('https://github.com/o/missing')).toBeNull();
  });

  it('returns null on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await getProjectReadme('https://github.com/o/r')).toBeNull();
  });

  it('returns null for an invalid repo URL without calling GitHub', async () => {
    expect(await getProjectReadme('https://gitlab.com/o/r')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends no Authorization header when GITHUB_TOKEN is not set', async () => {
    mockRepo();
    await getProjectReadme('https://github.com/o/r');

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).not.toHaveProperty('Authorization');
    }
  });

  it('sends a Bearer token when GITHUB_TOKEN is set', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'ghp_secret');
    mockRepo();
    await getProjectReadme('https://github.com/o/r');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).toMatchObject({ Authorization: 'Bearer ghp_secret' });
    }
  });
});
