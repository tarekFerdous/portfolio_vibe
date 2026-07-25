import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProjects, fetchVisibleProjects, setProjectVisibility } from './projects';
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
  builder.order = vi.fn(() => Promise.resolve({ data: rows }));
  builder.update = vi.fn(() => builder);
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
});

describe('setProjectVisibility', () => {
  it('updates the visibility column for the given project id', async () => {
    const builder = makeQueryBuilder(allProjects);
    mockSupabase.from.mockReturnValueOnce(builder);
    const eqSpy = vi.fn(() => Promise.resolve({ data: null }));
    (builder.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({ eq: eqSpy });

    await setProjectVisibility('a', 'hidden');

    expect(builder.update).toHaveBeenCalledWith({ visibility: 'hidden' });
    expect(eqSpy).toHaveBeenCalledWith('id', 'a');
  });
});
