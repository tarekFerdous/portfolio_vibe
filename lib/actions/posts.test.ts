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
  const chainMethods = ['select', 'eq', 'or', 'order', 'update', 'delete', 'insert', 'single'];
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
  const { id: _omit, ...newValues } = baseValues;

  /** Existing posts whose slug matches the base slug lookup. */
  const slugRows = (...rows: Array<[string, string]>) =>
    makeBuilder({ data: rows.map(([id, slug]) => ({ id, slug })), error: null });
  const statusRow = (status: 'draft' | 'published') => makeBuilder({ data: { status }, error: null });
  const ok = () => makeBuilder({ data: { id: 'new-post-id' }, error: null });
  const uniqueViolation = () =>
    makeBuilder({ data: null, error: { message: 'duplicate key value violates unique constraint "posts_slug_key"', code: '23505' } });

  describe('errors', () => {
    it('returns a readable error instead of throwing when the update fails', async () => {
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(makeBuilder({ error: { message: 'update failed' } }));
      await expect(upsertPost(baseValues)).resolves.toEqual({
        ok: false,
        error: "Couldn't save the post: update failed",
      });
    });

    it('returns a readable error when the status lookup fails', async () => {
      mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'lookup failed' } }));
      await expect(upsertPost(baseValues)).resolves.toEqual({
        ok: false,
        error: "Couldn't save the post: lookup failed",
      });
    });

    it('returns a readable error when the insert fails', async () => {
      mockSupabase.from
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'permission denied' } }));
      await expect(upsertPost(newValues)).resolves.toEqual({
        ok: false,
        error: "Couldn't create the post: permission denied",
      });
    });

    it('returns a readable error when the block delete-and-replace delete step fails', async () => {
      mockSupabase.from
        .mockReturnValueOnce(statusRow('published'))
        .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
        .mockReturnValueOnce(makeBuilder({ error: { message: 'delete blocks failed' } }));
      await expect(upsertPost(baseValues)).resolves.toEqual({
        ok: false,
        error: "Couldn't save the post: delete blocks failed",
      });
    });

    it('returns a readable error when the block delete-and-replace insert step fails', async () => {
      mockSupabase.from
        .mockReturnValueOnce(statusRow('published'))
        .mockReturnValueOnce(makeBuilder({ error: null })) // update succeeds
        .mockReturnValueOnce(makeBuilder({ error: null })) // delete blocks succeeds
        .mockReturnValueOnce(makeBuilder({ error: { message: 'insert blocks failed' } }));
      await expect(
        upsertPost({
          ...baseValues,
          blocks: [{ block_type: 'text', content: 'hi', image_url: null, display_order: 0 }],
        })
      ).resolves.toEqual({ ok: false, error: "Couldn't save the post: insert blocks failed" });
    });
  });

  describe('create', () => {
    it('returns the new post id on success', async () => {
      mockSupabase.from
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(ok())
        .mockReturnValueOnce(makeBuilder({ error: null })); // delete blocks
      await expect(upsertPost(newValues)).resolves.toEqual({ ok: true, id: 'new-post-id' });
    });

    it('uses the base slug when it is free', async () => {
      const insert = ok();
      mockSupabase.from.mockReturnValueOnce(slugRows()).mockReturnValueOnce(insert).mockReturnValueOnce(ok());
      await upsertPost({ ...newValues, title: 'Untitled Post' });
      expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'untitled-post' }));
    });

    it('numbers the slug past every taken one', async () => {
      const insert = ok();
      mockSupabase.from
        .mockReturnValueOnce(slugRows(['a', 'untitled-post'], ['b', 'untitled-post-2']))
        .mockReturnValueOnce(insert)
        .mockReturnValueOnce(ok());
      await upsertPost({ ...newValues, title: 'Untitled Post' });
      expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'untitled-post-3' }));
    });

    it('falls back to untitled-post when the title has no usable characters', async () => {
      const insert = ok();
      mockSupabase.from.mockReturnValueOnce(slugRows(['a', 'untitled-post'])).mockReturnValueOnce(insert).mockReturnValueOnce(ok());
      await upsertPost({ ...newValues, title: '!!! 🎉' });
      expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'untitled-post-2' }));
    });

    it('retries once with a fresh slug after a unique violation', async () => {
      const retryInsert = ok();
      mockSupabase.from
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(uniqueViolation())
        .mockReturnValueOnce(slugRows(['a', 'title']))
        .mockReturnValueOnce(retryInsert)
        .mockReturnValueOnce(ok());
      await expect(upsertPost(newValues)).resolves.toEqual({ ok: true, id: 'new-post-id' });
      expect(retryInsert.insert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'title-2' }));
    });

    it('returns a readable error when the retry also hits a unique violation', async () => {
      mockSupabase.from
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(uniqueViolation())
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(uniqueViolation());
      await expect(upsertPost(newValues)).resolves.toEqual({
        ok: false,
        error: "Couldn't create the post: its URL slug is already used by another post. Try a different title.",
      });
    });

    it('persists excerpt, cover_image_url, and author', async () => {
      const insert = ok();
      mockSupabase.from.mockReturnValueOnce(slugRows()).mockReturnValueOnce(insert).mockReturnValueOnce(ok());
      await upsertPost({
        ...newValues,
        excerpt: 'An excerpt',
        cover_image_url: 'https://example.com/cover.jpg',
        author: 'Jane Doe',
      });
      expect(insert.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          excerpt: 'An excerpt',
          cover_image_url: 'https://example.com/cover.jpg',
          author: 'Jane Doe',
        })
      );
    });
  });

  describe('update', () => {
    it('returns the post id on success', async () => {
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(ok())
        .mockReturnValueOnce(ok()); // delete blocks
      await expect(upsertPost(baseValues)).resolves.toEqual({ ok: true, id: 'post-1' });
    });

    it("rebuilds a draft's slug from its new title", async () => {
      const update = ok();
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows(['post-1', 'untitled-post']))
        .mockReturnValueOnce(update)
        .mockReturnValueOnce(ok());
      await upsertPost({ ...baseValues, title: 'From OOM to 15 ms' });
      expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'from-oom-to-15-ms' }));
    });

    it('numbers a draft slug that clashes with another post', async () => {
      const update = ok();
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows(['other', 'hello']))
        .mockReturnValueOnce(update)
        .mockReturnValueOnce(ok());
      await upsertPost({ ...baseValues, title: 'Hello' });
      expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'hello-2' }));
    });

    it("keeps a draft's own slug when the title is unchanged", async () => {
      const update = ok();
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows(['post-1', 'title']))
        .mockReturnValueOnce(update)
        .mockReturnValueOnce(ok());
      await upsertPost(baseValues);
      expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'title' }));
    });

    it('gives a draft published in this save a slug from its new title', async () => {
      const update = ok();
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(update)
        .mockReturnValueOnce(ok());
      await upsertPost({ ...baseValues, title: 'Launch Day', status: 'published' });
      expect(update.update).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'launch-day', status: 'published' })
      );
    });

    it("never touches a published post's slug", async () => {
      const update = ok();
      mockSupabase.from
        .mockReturnValueOnce(statusRow('published'))
        .mockReturnValueOnce(update)
        .mockReturnValueOnce(ok());
      await upsertPost({ ...baseValues, title: 'A New Title', status: 'published' });
      expect(update.update).toHaveBeenCalledWith(expect.not.objectContaining({ slug: expect.anything() }));
    });

    it('retries a draft update once after a unique violation', async () => {
      const retryUpdate = ok();
      mockSupabase.from
        .mockReturnValueOnce(statusRow('draft'))
        .mockReturnValueOnce(slugRows())
        .mockReturnValueOnce(uniqueViolation())
        .mockReturnValueOnce(slugRows(['other', 'title']))
        .mockReturnValueOnce(retryUpdate)
        .mockReturnValueOnce(ok());
      await expect(upsertPost(baseValues)).resolves.toEqual({ ok: true, id: 'post-1' });
      expect(retryUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'title-2' }));
    });

    it('persists excerpt, cover_image_url, and author', async () => {
      const update = ok();
      mockSupabase.from.mockReturnValueOnce(statusRow('published')).mockReturnValueOnce(update).mockReturnValueOnce(ok());
      await upsertPost({
        ...baseValues,
        excerpt: 'An excerpt',
        cover_image_url: 'https://example.com/cover.jpg',
        author: 'Jane Doe',
      });
      expect(update.update).toHaveBeenCalledWith(
        expect.objectContaining({
          excerpt: 'An excerpt',
          cover_image_url: 'https://example.com/cover.jpg',
          author: 'Jane Doe',
        })
      );
    });
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
  it('returns a readable error instead of throwing when the block-fetch call fails', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'fetch blocks failed' } }));
    await expect(deletePost('post-1')).resolves.toEqual({
      ok: false,
      error: "Couldn't delete the post: fetch blocks failed",
    });
  });

  it('returns a readable error when the post-row-delete call fails', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: [], error: null })) // block fetch succeeds
      .mockReturnValueOnce(makeBuilder({ error: { message: 'delete post failed' } })); // post delete fails
    await expect(deletePost('post-1')).resolves.toEqual({
      ok: false,
      error: "Couldn't delete the post: delete post failed",
    });
  });

  it('returns ok when both steps succeed', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ error: null }));
    await expect(deletePost('post-1')).resolves.toEqual({ ok: true });
  });
});
