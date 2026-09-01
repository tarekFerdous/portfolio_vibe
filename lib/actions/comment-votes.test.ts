import { describe, it, expect, vi, beforeEach } from 'vitest';
import { castVote, retractVote, fetchVotesForBlog } from './comment-votes';

type QueryResult = { data?: unknown; error?: { message: string; code?: string } | null };

/**
 * Builds a fake Supabase query-builder that is both chainable (every method
 * returns itself) and awaitable (resolves to the given result), mirroring how
 * the real supabase-js PostgrestFilterBuilder behaves.
 */
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'in', 'upsert', 'delete', 'single'];
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

describe('castVote', () => {
  it('upserts the current user\'s vote keyed on (comment_id, voter_id) and returns it', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const builder = makeBuilder({ data: { id: 'v1', comment_id: 'c1', voter_id: 'user-1', value: 1 }, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await castVote({ commentId: 'c1', value: 1 });

    expect(mockSupabase.from).toHaveBeenCalledWith('comment_votes');
    expect(builder.upsert).toHaveBeenCalledWith(
      { comment_id: 'c1', voter_id: 'user-1', value: 1 },
      { onConflict: 'comment_id,voter_id' }
    );
    expect(result).toEqual({ id: 'v1', comment_id: 'c1', voter_id: 'user-1', value: 1 });
  });

  it('casting a second, different vote resolves to a single upserted row', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const builder = makeBuilder({ data: { id: 'v1', comment_id: 'c1', voter_id: 'user-1', value: -1 }, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await castVote({ commentId: 'c1', value: -1 });

    expect(builder.upsert).toHaveBeenCalledWith(
      { comment_id: 'c1', voter_id: 'user-1', value: -1 },
      { onConflict: 'comment_id,voter_id' }
    );
    expect(result).toEqual({ id: 'v1', comment_id: 'c1', voter_id: 'user-1', value: -1 });
  });

  it('rejects when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(castVote({ commentId: 'c1', value: 1 })).rejects.toThrow('You must be signed in to vote.');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('rejects when the upsert is denied by RLS', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'new row violates row-level security policy' } })
    );
    await expect(castVote({ commentId: 'c1', value: 1 })).rejects.toThrow(
      'new row violates row-level security policy'
    );
  });
});

describe('retractVote', () => {
  it('deletes the current user\'s vote for the given comment', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const builder = makeBuilder({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    await retractVote('c1');

    expect(mockSupabase.from).toHaveBeenCalledWith('comment_votes');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('comment_id', 'c1');
    expect(builder.eq).toHaveBeenCalledWith('voter_id', 'user-1');
  });

  it('rejects when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(retractVote('c1')).rejects.toThrow('You must be signed in to vote.');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('rejects when the delete is denied by RLS', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    mockSupabase.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: 'new row violates row-level security policy' } })
    );
    await expect(retractVote('c1')).rejects.toThrow('new row violates row-level security policy');
  });
});

describe('fetchVotesForBlog', () => {
  it('returns an empty array without querying when given no comment ids', async () => {
    const result = await fetchVotesForBlog([]);
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns all votes for the given comment ids on success', async () => {
    const builder = makeBuilder({ data: [{ id: 'v1', comment_id: 'c1', voter_id: 'user-1', value: 1 }], error: null });
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await fetchVotesForBlog(['c1', 'c2']);

    expect(builder.in).toHaveBeenCalledWith('comment_id', ['c1', 'c2']);
    expect(result).toEqual([{ id: 'v1', comment_id: 'c1', voter_id: 'user-1', value: 1 }]);
  });

  it('throws when the query returns an error', async () => {
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(fetchVotesForBlog(['c1'])).rejects.toThrow('boom');
  });
});
