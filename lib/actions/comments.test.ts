import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchCommentsForBlog,
  fetchAllCommentsForModeration,
  postComment,
  updateComment,
  softDeleteComment,
  moderateRemoveComment,
} from './comments';

type QueryResult = { data?: unknown; error?: { message: string; code?: string } | null };

/**
 * Builds a fake Supabase query-builder that is both chainable (every method
 * returns itself) and awaitable (resolves to the given result), mirroring how
 * the real supabase-js PostgrestFilterBuilder behaves.
 */
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'is', 'order', 'insert', 'update', 'single'];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => resolve(result);
  return builder;
}

const mockGetUser = vi.fn();

const mockSupabase = {
  from: vi.fn(),
  auth: { getUser: mockGetUser },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

beforeEach(() => {
  mockSupabase.from.mockReset();
  mockGetUser.mockReset();
});

describe('fetchCommentsForBlog', () => {
  it('returns all comments (all depths) for the given blog on success', async () => {
    const builder = makeBuilder({ data: [{ id: 'c1', blog_id: 'blog-1' }], error: null });
    mockSupabase.from.mockReturnValueOnce(builder);
    const result = await fetchCommentsForBlog('blog-1');
    expect(result).toEqual([{ id: 'c1', blog_id: 'blog-1' }]);
    expect(builder.eq).toHaveBeenCalledWith('blog_id', 'blog-1');
    expect(builder.is).not.toHaveBeenCalled();
  });

  it('throws when the query returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(fetchCommentsForBlog('blog-1')).rejects.toThrow('boom');
  });
});

describe('fetchAllCommentsForModeration', () => {
  it('returns all comments across all posts, newest-first, joined to their post', async () => {
    const builder = makeBuilder({
      data: [{ id: 'c1', blog_id: 'blog-1', blogs: { title: 'Post One', slug: 'post-one' } }],
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await fetchAllCommentsForModeration();

    expect(mockSupabase.from).toHaveBeenCalledWith('comments');
    expect(builder.select).toHaveBeenCalledWith('*, blogs(title, slug)');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([{ id: 'c1', blog_id: 'blog-1', blogs: { title: 'Post One', slug: 'post-one' } }]);
  });

  it('throws when the query returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(fetchAllCommentsForModeration()).rejects.toThrow('boom');
  });
});

describe('postComment', () => {
  it('inserts a comment using the current authenticated user and returns it', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1', email: 'visitor@example.com' } }, error: null });
    const builder = makeBuilder({ data: { id: 'c1', content: 'hello' }, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await postComment({ blogId: 'blog-1', content: 'hello' });

    expect(builder.insert).toHaveBeenCalledWith({
      blog_id: 'blog-1',
      parent_comment_id: null,
      author_id: 'user-1',
      author_email: 'visitor@example.com',
      content: 'hello',
    });
    expect(result).toEqual({ id: 'c1', content: 'hello' });
  });

  it('inserts a reply with the given parent_comment_id', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1', email: 'visitor@example.com' } }, error: null });
    const builder = makeBuilder({ data: { id: 'c2', content: 'a reply' }, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await postComment({ blogId: 'blog-1', content: 'a reply', parentCommentId: 'c1' });

    expect(builder.insert).toHaveBeenCalledWith({
      blog_id: 'blog-1',
      parent_comment_id: 'c1',
      author_id: 'user-1',
      author_email: 'visitor@example.com',
      content: 'a reply',
    });
    expect(result).toEqual({ id: 'c2', content: 'a reply' });
  });

  it('rejects when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(postComment({ blogId: 'blog-1', content: 'hello' })).rejects.toThrow(
      'You must be signed in to comment.'
    );
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('rejects when the insert is denied by RLS', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1', email: 'visitor@example.com' } }, error: null });
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'new row violates row-level security policy' } })
    );
    await expect(postComment({ blogId: 'blog-1', content: 'hello' })).rejects.toThrow(
      'new row violates row-level security policy'
    );
  });
});

describe('updateComment', () => {
  it('updates the content and updated_at of the given comment on success', async () => {
    const builder = makeBuilder({ data: { id: 'c1', content: 'edited' }, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await updateComment({ commentId: 'c1', content: 'edited' });

    expect(builder.update).toHaveBeenCalledWith({ content: 'edited', updated_at: expect.any(String) });
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual({ id: 'c1', content: 'edited' });
  });

  it('rejects when the update is denied by RLS (non-owning identity)', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'new row violates row-level security policy' } })
    );

    await expect(updateComment({ commentId: 'c1', content: 'edited' })).rejects.toThrow(
      'new row violates row-level security policy'
    );
  });
});

describe('softDeleteComment', () => {
  it('sets deleted_at on the given comment on success', async () => {
    const builder = makeBuilder({ data: { id: 'c1', deleted_at: new Date().toISOString() }, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await softDeleteComment('c1');

    expect(builder.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual({ id: 'c1', deleted_at: expect.any(String) });
  });

  it('rejects when the update is denied by RLS (non-owning identity)', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'new row violates row-level security policy' } })
    );

    await expect(softDeleteComment('c1')).rejects.toThrow('new row violates row-level security policy');
  });
});

describe('moderateRemoveComment', () => {
  it('sets deleted_at and removed_by_moderator together on the given comment on success', async () => {
    const builder = makeBuilder({
      data: { id: 'c1', deleted_at: new Date().toISOString(), removed_by_moderator: true },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await moderateRemoveComment('c1');

    expect(builder.update).toHaveBeenCalledWith({ deleted_at: expect.any(String), removed_by_moderator: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual({ id: 'c1', deleted_at: expect.any(String), removed_by_moderator: true });
  });

  it('rejects when the update is denied by RLS (non-admin identity)', async () => {
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'new row violates row-level security policy' } })
    );

    await expect(moderateRemoveComment('c1')).rejects.toThrow('new row violates row-level security policy');
  });
});
