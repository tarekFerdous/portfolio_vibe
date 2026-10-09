import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSlug } from '@/lib/utils/slug';
import {
  fetchPosts,
  fetchPostWithBlocks,
  fetchPublishedPosts,
  fetchPublishedPostBySlug,
  upsertPost,
  deletePost,
  uploadPostCover,
  deletePostCover,
} from './posts';

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
  uploadImage: vi.fn().mockResolvedValue('https://example.com/cover.jpg'),
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

describe('fetchPosts', () => {
  it('returns the post list on success', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: [{ id: '1' }], error: null }));
    const result = await fetchPosts();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('throws when the query returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(fetchPosts()).rejects.toThrow('boom');
  });
});

describe('fetchPostWithBlocks', () => {
  it('returns null when the post is not found (PGRST116)', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'no rows', code: 'PGRST116' } })
    );
    const result = await fetchPostWithBlocks('missing-id');
    expect(result).toBeNull();
  });

  it('throws when the post query returns a real error', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'connection failed', code: 'PGRST500' } })
    );
    await expect(fetchPostWithBlocks('id-1')).rejects.toThrow('connection failed');
  });

  it('throws when the blocks query returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: { id: 'id-1' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'blocks failed' } }));
    await expect(fetchPostWithBlocks('id-1')).rejects.toThrow('blocks failed');
  });
});

describe('fetchPublishedPosts', () => {
  it('returns only published rows and queries by status and publish_date', async () => {
    const builder = makeBuilder({ data: [{ id: '1', status: 'published' }], error: null });
    mockSupabase.from.mockReturnValueOnce(builder);
    const result = await fetchPublishedPosts();
    expect(result).toEqual([{ id: '1', status: 'published' }]);
    expect(builder.eq).toHaveBeenCalledWith('status', 'published');
    expect(builder.order).toHaveBeenCalledWith('publish_date', { ascending: false });
  });

  it('throws when the query returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(fetchPublishedPosts()).rejects.toThrow('boom');
  });
});

describe('fetchPublishedPostBySlug', () => {
  it('returns the post and blocks for a published slug', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: { id: 'id-1', slug: 'my-post', status: 'published' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [{ id: 'block-1' }], error: null }));
    const result = await fetchPublishedPostBySlug('my-post');
    expect(result).toEqual({
      post: { id: 'id-1', slug: 'my-post', status: 'published' },
      blocks: [{ id: 'block-1' }],
    });
  });

  it('returns null when no published post matches the slug (PGRST116)', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'no rows', code: 'PGRST116' } })
    );
    const result = await fetchPublishedPostBySlug('missing-slug');
    expect(result).toBeNull();
  });

  it('throws when the post query returns a real error', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'connection failed', code: 'PGRST500' } })
    );
    await expect(fetchPublishedPostBySlug('my-post')).rejects.toThrow('connection failed');
  });

  it('throws when the blocks query returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: { id: 'id-1' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'blocks failed' } }));
    await expect(fetchPublishedPostBySlug('my-post')).rejects.toThrow('blocks failed');
  });
});

describe('upsertPost', () => {
  const baseValues = {
    id: 'post-1',
    title: 'Title',
    publish_date: null,
    location: null,
    status: 'draft' as const,
    blocks: [],
  };

  it('throws when the update branch returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ error: { message: 'update failed' } }));
    await expect(upsertPost(baseValues)).rejects.toThrow('update failed');
  });

  it('throws when the block delete-and-replace delete step returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'delete blocks failed' } })); // delete blocks fails
    await expect(upsertPost(baseValues)).rejects.toThrow('delete blocks failed');
  });

  it('throws when the block delete-and-replace insert step returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
      .mockReturnValueOnce(makeBuilder({ error: null })) // delete blocks succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'insert blocks failed' } })); // insert blocks fails
    await expect(
      upsertPost({
        ...baseValues,
        blocks: [{ block_type: 'text', content: 'hi', image_url: null, display_order: 0 }],
      })
    ).rejects.toThrow('insert blocks failed');
  });

  it('succeeds and returns the post id when all steps succeed', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
      .mockReturnValueOnce(makeBuilder({ error: null })); // delete blocks succeeds
    const result = await upsertPost(baseValues);
    expect(result).toBe('post-1');
  });

  it('persists excerpt, cover_image_url, and author on the update branch', async () => {
    const updateBuilder = makeBuilder({ error: null });
    mockSupabase.from
      .mockReturnValueOnce(updateBuilder) // update
      .mockReturnValueOnce(makeBuilder({ error: null })); // delete blocks
    await upsertPost({
      ...baseValues,
      excerpt: 'An excerpt',
      cover_image_url: 'https://example.com/cover.jpg',
      author: 'Jane Doe',
    });
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        excerpt: 'An excerpt',
        cover_image_url: 'https://example.com/cover.jpg',
        author: 'Jane Doe',
      })
    );
  });

  it('persists excerpt, cover_image_url, and author on the insert branch', async () => {
    const insertBuilder = makeBuilder({ data: { id: 'new-post-id' }, error: null });
    mockSupabase.from
      .mockReturnValueOnce(insertBuilder) // insert
      .mockReturnValueOnce(makeBuilder({ error: null })); // delete blocks
    await upsertPost({
      title: 'Title',
      publish_date: null,
      location: null,
      status: 'draft',
      excerpt: 'An excerpt',
      cover_image_url: 'https://example.com/cover.jpg',
      author: 'Jane Doe',
      blocks: [],
    });
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        excerpt: 'An excerpt',
        cover_image_url: 'https://example.com/cover.jpg',
        author: 'Jane Doe',
      })
    );
  });
});

describe('uploadPostCover', () => {
  it('uploads to the post-photos bucket', async () => {
    const { uploadImage } = await import('./images');
    const file = new File(['data'], 'cover.jpg');
    const url = await uploadPostCover(file);
    expect(uploadImage).toHaveBeenCalledWith('post-photos', file);
    expect(url).toBe('https://example.com/cover.jpg');
  });
});

describe('deletePostCover', () => {
  it('deletes from the post-photos bucket', async () => {
    const { deleteImage } = await import('./images');
    await deletePostCover('https://example.com/cover.jpg');
    expect(deleteImage).toHaveBeenCalledWith('post-photos', 'https://example.com/cover.jpg');
  });
});

describe('deletePost', () => {
  it('throws when the block-fetch call returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'fetch blocks failed' } }));
    await expect(deletePost('post-1')).rejects.toThrow('fetch blocks failed');
  });

  it('throws when the post-row-delete call returns an error', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: [], error: null })) // block fetch succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'delete post failed' } })); // post delete fails
    await expect(deletePost('post-1')).rejects.toThrow('delete post failed');
  });

  it('resolves when both steps succeed', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ error: null }));
    await expect(deletePost('post-1')).resolves.toBeUndefined();
  });
});
