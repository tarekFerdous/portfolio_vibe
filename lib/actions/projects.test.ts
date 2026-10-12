import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchProjects,
  fetchVisibleProjects,
  fetchVisibleProjectBySlug,
  setProjectVisibility,
  upsertProject,
  deleteProject,
  reorderProjects,
} from './projects';
import { refreshProjectReadme } from './projectReadmes';
import type { Project } from '@/lib/supabase/types';

vi.mock('./projectReadmes', () => ({ refreshProjectReadme: vi.fn() }));

const allProjects: Project[] = [
  {
    id: 'a',
    name: 'Visible Project',
    slug: 'visible-project',
    summary: '',
    project_description: '',
    image_url: null,
    skills: [],
    display_order: 0,
    visibility: 'visible',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b',
    name: 'Hidden Project',
    slug: 'hidden-project',
    summary: '',
    project_description: '',
    image_url: null,
    skills: [],
    display_order: 1,
    visibility: 'hidden',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

function makeQueryBuilder(rows: Project[]) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: string) => {
    return makeQueryBuilder(rows.filter((r) => (r as unknown as Record<string, unknown>)[column] === value));
  });
  builder.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error: null }));
  builder.update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) }));
  builder.upsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  builder.delete = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) }));
  return builder;
}

const mockSupabase = {
  from: vi.fn(() => makeQueryBuilder(allProjects)),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

beforeEach(() => {
  mockSupabase.from.mockClear();
  vi.mocked(refreshProjectReadme).mockReset();
  vi.mocked(refreshProjectReadme).mockResolvedValue({
    outcome: 'ok',
    status: { fetched_at: '2026-10-01T00:00:00.000Z', last_error: null, has_markdown: true },
  });
});

describe('fetchProjects', () => {
  it('returns all projects regardless of visibility', async () => {
    const result = await fetchProjects();
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('throws when the Supabase query returns an error', async () => {
    const builder = makeQueryBuilder(allProjects);
    (builder.order as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'fetch failed' } })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(fetchProjects()).rejects.toThrow('fetch failed');
  });
});

describe('fetchVisibleProjects', () => {
  it('excludes hidden projects', async () => {
    const result = await fetchVisibleProjects();
    expect(result.every((p) => p.visibility === 'visible')).toBe(true);
  });

  it('includes visible projects', async () => {
    const result = await fetchVisibleProjects();
    expect(result.map((p) => p.id)).toEqual(['a']);
  });

  it('throws when the Supabase query returns an error', async () => {
    const errorBuilder = {
      select: vi.fn(function (this: unknown) {
        return this;
      }),
      eq: vi.fn(function (this: unknown) {
        return this;
      }),
      order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'visible fetch failed' } })),
    };
    mockSupabase.from.mockReturnValueOnce(errorBuilder);

    await expect(fetchVisibleProjects()).rejects.toThrow('visible fetch failed');
  });
});

describe('setProjectVisibility', () => {
  it('updates the visibility column for the given project id', async () => {
    const builder = makeQueryBuilder(allProjects);
    mockSupabase.from.mockReturnValueOnce(builder);
    const eqSpy = vi.fn(() => Promise.resolve({ data: null, error: null }));
    (builder.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({ eq: eqSpy });

    await setProjectVisibility('a', 'hidden');

    expect(builder.update).toHaveBeenCalledWith({ visibility: 'hidden' });
    expect(eqSpy).toHaveBeenCalledWith('id', 'a');
  });

  it('throws when the Supabase update returns an error', async () => {
    const builder = makeQueryBuilder(allProjects);
    const eqSpy = vi.fn(() => Promise.resolve({ data: null, error: { message: 'update failed' } }));
    (builder.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({ eq: eqSpy });
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(setProjectVisibility('a', 'hidden')).rejects.toThrow('update failed');
  });
});

describe('upsertProject', () => {
  const baseProject: Omit<Project, 'created_at' | 'updated_at'> = {
    id: 'a',
    name: 'Visible Project',
    slug: 'visible-project',
    summary: '',
    project_description: '',
    image_url: null,
    skills: [],
    display_order: 0,
    visibility: 'visible',
  };

  it('throws when the Supabase upsert returns an error', async () => {
    const builder = makeQueryBuilder(allProjects);
    (builder.upsert as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'upsert failed' } })
    );
    mockSupabase.from.mockReturnValueOnce(builder).mockReturnValueOnce(builder);

    await expect(upsertProject(baseProject)).rejects.toThrow('upsert failed');
  });

  function withStoredRepoUrl(repoUrl: string | null) {
    mockSupabase.from.mockReturnValueOnce(makeQueryBuilder([{ ...allProjects[0], repo_url: repoUrl }]));
  }

  it('fetches the README when a repo_url is added', async () => {
    withStoredRepoUrl(null);
    const result = await upsertProject({ ...baseProject, repo_url: 'https://github.com/o/r' });

    expect(refreshProjectReadme).toHaveBeenCalledWith('a');
    expect(result.readme).toMatchObject({ outcome: 'ok' });
  });

  it('fetches the README when the repo_url changes', async () => {
    withStoredRepoUrl('https://github.com/o/old');
    await upsertProject({ ...baseProject, repo_url: 'https://github.com/o/new' });

    expect(refreshProjectReadme).toHaveBeenCalledWith('a');
  });

  it('re-syncs (deletes) the stored README when the repo_url is removed', async () => {
    vi.mocked(refreshProjectReadme).mockResolvedValue({ outcome: 'removed', status: null });
    withStoredRepoUrl('https://github.com/o/r');
    const result = await upsertProject({ ...baseProject, repo_url: null });

    expect(refreshProjectReadme).toHaveBeenCalledWith('a');
    expect(result.readme).toEqual({ outcome: 'removed', status: null });
  });

  it('leaves the stored README alone when the repo_url is unchanged', async () => {
    withStoredRepoUrl('https://github.com/o/r');
    const result = await upsertProject({ ...baseProject, name: 'Renamed', repo_url: 'https://github.com/o/r' });

    expect(refreshProjectReadme).not.toHaveBeenCalled();
    expect(result.readme).toBeNull();
  });

  it('still saves when the README sync throws', async () => {
    vi.mocked(refreshProjectReadme).mockRejectedValue(new Error('db down'));
    withStoredRepoUrl(null);
    const result = await upsertProject({ ...baseProject, repo_url: 'https://github.com/o/r' });

    expect(result.readme).toEqual({ outcome: 'error', reason: 'network' });
  });

  it('turns a slug unique-violation into a readable error', async () => {
    const builder = makeQueryBuilder(allProjects);
    (builder.upsert as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Promise.resolve({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint "projects_slug_key"' },
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder).mockReturnValueOnce(builder);

    await expect(upsertProject(baseProject)).rejects.toThrow('That slug is already used by another project.');
  });
});

describe('fetchVisibleProjectBySlug', () => {
  it('returns the visible project with the given slug', async () => {
    const result = await fetchVisibleProjectBySlug('visible-project');
    expect(result?.id).toBe('a');
  });

  it('returns null for a hidden project', async () => {
    expect(await fetchVisibleProjectBySlug('hidden-project')).toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    expect(await fetchVisibleProjectBySlug('nope')).toBeNull();
  });

  it('throws when the Supabase query returns an error', async () => {
    const builder = makeQueryBuilder(allProjects);
    builder.eq = vi.fn(() => builder);
    (builder.maybeSingle as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'slug fetch failed' } })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(fetchVisibleProjectBySlug('visible-project')).rejects.toThrow('slug fetch failed');
  });
});

describe('deleteProject', () => {
  it('throws when the Supabase delete returns an error', async () => {
    const builder = makeQueryBuilder(allProjects);
    const eqSpy = vi.fn(() => Promise.resolve({ data: null, error: { message: 'delete failed' } }));
    (builder.delete as ReturnType<typeof vi.fn>).mockReturnValueOnce({ eq: eqSpy });
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(deleteProject('a', null)).rejects.toThrow('delete failed');
  });
});

describe('reorderProjects', () => {
  it('throws when any Supabase update returns an error', async () => {
    const goodBuilder = makeQueryBuilder(allProjects);
    const badBuilder = makeQueryBuilder(allProjects);
    (badBuilder.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'reorder failed' } })),
    });
    mockSupabase.from.mockReturnValueOnce(goodBuilder).mockReturnValueOnce(badBuilder);

    await expect(reorderProjects(['a', 'b'])).rejects.toThrow('reorder failed');
  });
});
