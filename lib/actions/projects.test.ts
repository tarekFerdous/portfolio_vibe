import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchProjects,
  fetchVisibleProjects,
  setProjectVisibility,
  upsertProject,
  deleteProject,
  reorderProjects,
} from './projects';
import type { Project } from '@/lib/supabase/types';

const allProjects: Project[] = [
  {
    id: 'a',
    name: 'Visible Project',
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
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(upsertProject(baseProject)).rejects.toThrow('upsert failed');
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
