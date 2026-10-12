import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchReadmeStatuses,
  fetchStoredReadme,
  refreshAllProjectReadmes,
  refreshProjectReadme,
} from './projectReadmes';
import { fetchGitHubReadme, type ReadmeFetchResult } from '@/lib/github/readme';
import type { ProjectReadmeRow } from '@/lib/supabase/types';

vi.mock('@/lib/github/readme', () => ({ fetchGitHubReadme: vi.fn() }));

type Row = Record<string, unknown>;
type ProjectRow = { id: string; name: string; repo_url: string | null; visibility: string; display_order: number };

const db = {
  projects: [] as ProjectRow[],
  readmes: new Map<string, ProjectReadmeRow>(),
  failingWrites: new Set<string>(),
};

function emptyReadme(projectId: string): ProjectReadmeRow {
  return {
    project_id: projectId,
    markdown: null,
    owner: null,
    repo: null,
    branch: null,
    is_private: null,
    html_url: null,
    readme_path: null,
    fetched_at: null,
    last_attempt_at: null,
    last_error: null,
  };
}

/** In-memory stand-in for the PostgREST query builder, covering only what the store module uses. */
function makeBuilder(table: string) {
  const filters: Array<(row: Row) => boolean> = [];
  let op: 'select' | 'delete' | 'upsert' = 'select';
  let payload: Partial<ProjectReadmeRow> & { project_id: string } = { project_id: '' };

  const rows = (): Row[] => (table === 'projects' ? db.projects : [...db.readmes.values()]);
  const matching = () => rows().filter((row) => filters.every((filter) => filter(row)));

  function run(): { data: unknown; error: { message: string } | null } {
    if (op === 'delete') {
      for (const row of matching()) db.readmes.delete(row.project_id as string);
      return { data: null, error: null };
    }
    if (op === 'upsert') {
      if (db.failingWrites.has(payload.project_id)) return { data: null, error: { message: 'write failed' } };
      // Like PostgREST merge-duplicates: only the columns in the payload change.
      const merged = { ...(db.readmes.get(payload.project_id) ?? emptyReadme(payload.project_id)), ...payload };
      db.readmes.set(payload.project_id, merged);
      return { data: merged, error: null };
    }
    return { data: matching(), error: null };
  }

  function single() {
    const result = run();
    return Promise.resolve({ ...result, data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data });
  }

  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return builder;
    },
    not: (column: string, _operator: string, value: unknown) => {
      filters.push((row) => row[column] !== value);
      return builder;
    },
    delete: () => {
      op = 'delete';
      return builder;
    },
    upsert: (row: typeof payload) => {
      op = 'upsert';
      payload = row;
      return builder;
    },
    single,
    maybeSingle: single,
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

const mockSupabase = { from: vi.fn((table: string) => makeBuilder(table)) };

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const metadata = {
  owner: 'o',
  repo: 'r',
  branch: 'main',
  isPrivate: false,
  htmlUrl: 'https://github.com/o/r',
  readmePath: 'README.md',
};

function project(id: string, overrides: Partial<ProjectRow> = {}): ProjectRow {
  return { id, name: `Project ${id}`, repo_url: `https://github.com/o/${id}`, visibility: 'visible', display_order: 0, ...overrides };
}

function storedReadme(projectId: string, overrides: Partial<ProjectReadmeRow> = {}): ProjectReadmeRow {
  return {
    ...emptyReadme(projectId),
    markdown: '# Old README',
    owner: 'o',
    repo: 'r',
    branch: 'main',
    is_private: false,
    html_url: 'https://github.com/o/r',
    readme_path: 'README.md',
    fetched_at: '2026-01-01T00:00:00.000Z',
    last_attempt_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  db.projects = [];
  db.readmes.clear();
  db.failingWrites.clear();
  vi.mocked(fetchGitHubReadme).mockReset();
  vi.mocked(fetchGitHubReadme).mockResolvedValue({ outcome: 'ok', markdown: '# New README', metadata });
});

describe('refreshProjectReadme', () => {
  it('stores the fetched README and metadata and clears a previous error', async () => {
    db.projects = [project('a')];
    db.readmes.set('a', storedReadme('a', { last_error: 'rate_limited' }));

    const result = await refreshProjectReadme('a');

    expect(fetchGitHubReadme).toHaveBeenCalledWith('https://github.com/o/a');
    expect(db.readmes.get('a')).toMatchObject({
      markdown: '# New README',
      owner: 'o',
      repo: 'r',
      branch: 'main',
      is_private: false,
      html_url: 'https://github.com/o/r',
      readme_path: 'README.md',
      last_error: null,
    });
    expect(db.readmes.get('a')?.fetched_at).not.toBe('2026-01-01T00:00:00.000Z');
    expect(result).toMatchObject({ outcome: 'ok', status: { last_error: null, has_markdown: true } });
  });

  it('stores markdown null and clears the error when the repo has no README', async () => {
    db.projects = [project('a')];
    db.readmes.set('a', storedReadme('a', { last_error: 'network' }));
    vi.mocked(fetchGitHubReadme).mockResolvedValue({ outcome: 'no_readme', metadata });

    const result = await refreshProjectReadme('a');

    expect(db.readmes.get('a')).toMatchObject({ markdown: null, last_error: null, owner: 'o' });
    expect(result).toMatchObject({ outcome: 'no_readme', status: { has_markdown: false, last_error: null } });
  });

  it.each(['no_access', 'rate_limited', 'network'] as const)(
    'keeps the existing README on a %s error and records the attempt',
    async (reason) => {
      db.projects = [project('a')];
      db.readmes.set('a', storedReadme('a'));
      vi.mocked(fetchGitHubReadme).mockResolvedValue({ outcome: 'error', reason } as ReadmeFetchResult);

      const result = await refreshProjectReadme('a');

      const row = db.readmes.get('a');
      expect(row).toMatchObject({ markdown: '# Old README', fetched_at: '2026-01-01T00:00:00.000Z', last_error: reason });
      expect(row?.last_attempt_at).not.toBe('2026-01-01T00:00:00.000Z');
      expect(result).toEqual({
        outcome: 'error',
        reason,
        status: { fetched_at: '2026-01-01T00:00:00.000Z', last_error: reason, has_markdown: true },
      });
    }
  );

  it('inserts an error-only row when a first fetch fails', async () => {
    db.projects = [project('a')];
    vi.mocked(fetchGitHubReadme).mockResolvedValue({ outcome: 'error', reason: 'no_access' });

    await refreshProjectReadme('a');

    expect(db.readmes.get('a')).toMatchObject({ markdown: null, fetched_at: null, last_error: 'no_access' });
  });

  it('deletes the stored README when the project has no repo_url, without calling GitHub', async () => {
    db.projects = [project('a', { repo_url: null })];
    db.readmes.set('a', storedReadme('a'));

    const result = await refreshProjectReadme('a');

    expect(db.readmes.has('a')).toBe(false);
    expect(fetchGitHubReadme).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'removed', status: null });
  });

  it('throws for an unknown project', async () => {
    await expect(refreshProjectReadme('missing')).rejects.toThrow('Project not found.');
  });
});

describe('refreshAllProjectReadmes', () => {
  it('refreshes every project with a repo_url, hidden ones included, and returns a summary', async () => {
    db.projects = [
      project('a', { name: 'Qraving' }),
      project('b', { name: 'Hidden', visibility: 'hidden' }),
      project('c', { name: 'No Repo', repo_url: null }),
      project('d', { name: 'Voting App' }),
    ];
    vi.mocked(fetchGitHubReadme).mockImplementation(async (url) =>
      url.endsWith('/d') ? { outcome: 'error', reason: 'no_access' } : { outcome: 'ok', markdown: '# Hi', metadata }
    );

    const summary = await refreshAllProjectReadmes();

    expect(summary.map(({ projectId, name, outcome, reason }) => ({ projectId, name, outcome, reason }))).toEqual([
      { projectId: 'a', name: 'Qraving', outcome: 'ok', reason: undefined },
      { projectId: 'b', name: 'Hidden', outcome: 'ok', reason: undefined },
      { projectId: 'd', name: 'Voting App', outcome: 'error', reason: 'no_access' },
    ]);
    expect(db.readmes.get('b')?.markdown).toBe('# Hi');
    expect(db.readmes.has('c')).toBe(false);
  });

  it('isolates a failing project so the others still refresh', async () => {
    db.projects = [project('a'), project('b'), project('c')];
    db.failingWrites.add('b');

    const summary = await refreshAllProjectReadmes();

    expect(summary.map((entry) => entry.outcome)).toEqual(['ok', 'error', 'ok']);
    expect(summary[1]).toMatchObject({ projectId: 'b', reason: 'network' });
    expect(summary[1].status).toBeUndefined();
    expect(db.readmes.has('a')).toBe(true);
    expect(db.readmes.has('c')).toBe(true);
  });

  it('limits how many projects are fetched at once', async () => {
    db.projects = Array.from({ length: 8 }, (_, i) => project(`p${i}`));
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(fetchGitHubReadme).mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { outcome: 'ok', markdown: '# Hi', metadata };
    });

    const summary = await refreshAllProjectReadmes();

    expect(summary).toHaveLength(8);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('returns an empty summary when no project has a repo_url', async () => {
    db.projects = [project('a', { repo_url: null })];
    expect(await refreshAllProjectReadmes()).toEqual([]);
  });
});

describe('fetchStoredReadme', () => {
  it('returns the stored row for a project', async () => {
    db.readmes.set('a', storedReadme('a'));
    expect(await fetchStoredReadme('a')).toEqual(storedReadme('a'));
  });

  it('returns null when nothing is stored', async () => {
    expect(await fetchStoredReadme('a')).toBeNull();
  });
});

describe('fetchReadmeStatuses', () => {
  it('maps each stored row to its status', async () => {
    db.readmes.set('a', storedReadme('a'));
    db.readmes.set('b', storedReadme('b', { markdown: null, last_error: 'rate_limited' }));

    expect(await fetchReadmeStatuses()).toEqual({
      a: { fetched_at: '2026-01-01T00:00:00.000Z', last_error: null, has_markdown: true },
      b: { fetched_at: '2026-01-01T00:00:00.000Z', last_error: 'rate_limited', has_markdown: false },
    });
  });
});
