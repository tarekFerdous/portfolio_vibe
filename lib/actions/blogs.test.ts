import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSlug } from '@/lib/utils/slug';
import { fetchBlogs, fetchBlogWithBlocks, upsertBlog, deleteBlog } from './blogs';

describe('generateSlug', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('My Blog Post: A Story!')).toBe('my-blog-post-a-story');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(generateSlug('Too   Many   Spaces')).toBe('too-many-spaces');
  });

  it('trims leading and trailing whitespace', () => {
    expect(generateSlug('  trimmed  ')).toBe('trimmed');
  });

  it('handles already-kebab input', () => {
    expect(generateSlug('already-fine')).toBe('already-fine');
  });
});

vi.mock('./images', () => ({
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));

type QueryResult = { data?: unknown; error?: { message: string; code?: string } | null };

/**
 * Builds a fake Supabase query-builder that is both chainable (every method
 * returns itself) and awaitable (resolves to the given result), mirroring how
 * the real supabase-js PostgrestFilterBuilder behaves.
 */
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'order', 'update', 'delete', 'insert', 'single'];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => resolve(result);
  return builder;
}

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

beforeEach(() => {
  mockSupabase.from.mockReset();
});

describe('fetchBlogs', () => {
  it('returns the blog list on success', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: [{ id: '1' }], error: null }));
    const result = await fetchBlogs();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('throws when the query returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(fetchBlogs()).rejects.toThrow('boom');
  });
});

describe('fetchBlogWithBlocks', () => {
  it('returns null when the blog is not found (PGRST116)', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'no rows', code: 'PGRST116' } })
    );
    const result = await fetchBlogWithBlocks('missing-id');
    expect(result).toBeNull();
  });

  it('throws when the blog query returns a real error', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'connection failed', code: 'PGRST500' } })
    );
    await expect(fetchBlogWithBlocks('id-1')).rejects.toThrow('connection failed');
  });

  it('throws when the blocks query returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: { id: 'id-1' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'blocks failed' } }));
    await expect(fetchBlogWithBlocks('id-1')).rejects.toThrow('blocks failed');
  });
});

describe('upsertBlog', () => {
  const baseValues = {
    id: 'blog-1',
    title: 'Title',
    publish_date: null,
    location: null,
    status: 'draft' as const,
    blocks: [],
  };

  it('throws when the update branch returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ error: { message: 'update failed' } }));
    await expect(upsertBlog(baseValues)).rejects.toThrow('update failed');
  });

  it('throws when the block delete-and-replace delete step returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'delete blocks failed' } })); // delete blocks fails
    await expect(upsertBlog(baseValues)).rejects.toThrow('delete blocks failed');
  });

  it('throws when the block delete-and-replace insert step returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
      .mockReturnValueOnce(makeBuilder({ error: null })) // delete blocks succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'insert blocks failed' } })); // insert blocks fails
    await expect(
      upsertBlog({
        ...baseValues,
        blocks: [{ block_type: 'text', content: 'hi', image_url: null, display_order: 0 }],
      })
    ).rejects.toThrow('insert blocks failed');
  });

  it('succeeds and returns the blog id when all steps succeed', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
      .mockReturnValueOnce(makeBuilder({ error: null })); // delete blocks succeeds
    const result = await upsertBlog(baseValues);
    expect(result).toBe('blog-1');
  });
});

describe('deleteBlog', () => {
  it('throws when the block-fetch call returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'fetch blocks failed' } }));
    await expect(deleteBlog('blog-1')).rejects.toThrow('fetch blocks failed');
  });

  it('throws when the blog-row-delete call returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: [], error: null })) // block fetch succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'delete blog failed' } })); // blog delete fails
    await expect(deleteBlog('blog-1')).rejects.toThrow('delete blog failed');
  });

  it('resolves when both steps succeed', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ error: null }));
    await expect(deleteBlog('blog-1')).resolves.toBeUndefined();
  });
});
