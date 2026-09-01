import { describe, it, expect } from 'vitest';
import { buildCommentTree, sortCommentTree } from '@/lib/utils/commentTree';
import type { Comment, CommentVote } from '@/lib/supabase/types';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    blog_id: 'blog-1',
    parent_comment_id: null,
    author_id: 'user-1',
    author_email: 'visitor@example.com',
    content: 'Hello world',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeVote(overrides: Partial<CommentVote> = {}): CommentVote {
  return {
    id: 'vote-1',
    comment_id: 'comment-1',
    voter_id: 'user-2',
    value: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildCommentTree', () => {
  it('returns comments with no children as childless roots', () => {
    const comments = [makeComment({ id: 'c1' })];
    const tree = buildCommentTree(comments);

    expect(tree).toEqual([{ ...comments[0], children: [] }]);
  });

  it('nests a reply under its parent', () => {
    const parent = makeComment({ id: 'c1', parent_comment_id: null });
    const reply = makeComment({ id: 'c2', parent_comment_id: 'c1' });

    const tree = buildCommentTree([parent, reply]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('c1');
    expect(tree[0].children).toEqual([{ ...reply, children: [] }]);
  });

  it('nests multiple children at the same depth under one parent, preserving input order', () => {
    const parent = makeComment({ id: 'c1' });
    const replyA = makeComment({ id: 'c2', parent_comment_id: 'c1', content: 'first reply' });
    const replyB = makeComment({ id: 'c3', parent_comment_id: 'c1', content: 'second reply' });
    const replyC = makeComment({ id: 'c4', parent_comment_id: 'c1', content: 'third reply' });

    const tree = buildCommentTree([parent, replyA, replyB, replyC]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((child) => child.id)).toEqual(['c2', 'c3', 'c4']);
  });

  it('builds a multi-level nested tree (reply to a reply)', () => {
    const root = makeComment({ id: 'c1' });
    const child = makeComment({ id: 'c2', parent_comment_id: 'c1' });
    const grandchild = makeComment({ id: 'c3', parent_comment_id: 'c2' });

    const tree = buildCommentTree([root, child, grandchild]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('c2');
    expect(tree[0].children[0].children[0].id).toBe('c3');
  });

  it('treats a comment whose parent_comment_id does not exist in the list as a root', () => {
    const orphan = makeComment({ id: 'c1', parent_comment_id: 'missing-parent' });

    const tree = buildCommentTree([orphan]);

    expect(tree).toEqual([{ ...orphan, children: [] }]);
  });

  it('preserves the input array order for root comments instead of re-sorting', () => {
    const first = makeComment({ id: 'c1', created_at: '2026-01-01T00:00:00.000Z' });
    const second = makeComment({ id: 'c2', created_at: '2026-01-02T00:00:00.000Z' });
    const third = makeComment({ id: 'c3', created_at: '2026-01-03T00:00:00.000Z' });

    // Deliberately out of chronological order to prove buildCommentTree does not re-sort.
    const tree = buildCommentTree([third, first, second]);

    expect(tree.map((node) => node.id)).toEqual(['c3', 'c1', 'c2']);
  });
});

describe('sortCommentTree', () => {
  it('orders siblings by net score descending in "top" mode, including zero and negative scores', () => {
    const zeroScore = makeComment({ id: 'c1', content: 'zero score' });
    const positiveScore = makeComment({ id: 'c2', content: 'positive score' });
    const negativeScore = makeComment({ id: 'c3', content: 'negative score' });
    const tree = buildCommentTree([zeroScore, positiveScore, negativeScore]);
    const votes = [
      makeVote({ id: 'v1', comment_id: 'c2', voter_id: 'u1', value: 1 }),
      makeVote({ id: 'v2', comment_id: 'c2', voter_id: 'u2', value: 1 }),
      makeVote({ id: 'v3', comment_id: 'c3', voter_id: 'u1', value: -1 }),
    ];

    const sorted = sortCommentTree(tree, 'top', votes);

    expect(sorted.map((node) => node.id)).toEqual(['c2', 'c1', 'c3']);
  });

  it('orders siblings by created_at descending in "newest" mode, independent of score', () => {
    const oldest = makeComment({ id: 'c1', created_at: '2026-01-01T00:00:00.000Z' });
    const newest = makeComment({ id: 'c2', created_at: '2026-01-03T00:00:00.000Z' });
    const middle = makeComment({ id: 'c3', created_at: '2026-01-02T00:00:00.000Z' });
    const tree = buildCommentTree([oldest, newest, middle]);
    // Give the oldest comment the highest score to prove "newest" ignores votes.
    const votes = [makeVote({ id: 'v1', comment_id: 'c1', voter_id: 'u1', value: 10 })];

    const sorted = sortCommentTree(tree, 'newest', votes);

    expect(sorted.map((node) => node.id)).toEqual(['c2', 'c3', 'c1']);
  });

  it('reorders siblings at every level of a multi-level tree without moving nodes to a different parent', () => {
    const parent = makeComment({ id: 'p1' });
    const childLow = makeComment({ id: 'c1', parent_comment_id: 'p1', content: 'low score child' });
    const childHigh = makeComment({ id: 'c2', parent_comment_id: 'p1', content: 'high score child' });
    const grandchildOld = makeComment({ id: 'g1', parent_comment_id: 'c2', created_at: '2026-01-01T00:00:00.000Z' });
    const grandchildNew = makeComment({ id: 'g2', parent_comment_id: 'c2', created_at: '2026-01-02T00:00:00.000Z' });
    const tree = buildCommentTree([parent, childLow, childHigh, grandchildOld, grandchildNew]);
    const votes = [makeVote({ id: 'v1', comment_id: 'c2', voter_id: 'u1', value: 5 })];

    const sorted = sortCommentTree(tree, 'top', votes);

    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('p1');
    expect(sorted[0].children.map((child) => child.id)).toEqual(['c2', 'c1']);

    const sortedNewest = sortCommentTree(tree, 'newest', votes);
    const highScoreChild = sortedNewest[0].children.find((child) => child.id === 'c2');
    expect(highScoreChild?.children.map((grandchild) => grandchild.id)).toEqual(['g2', 'g1']);

    // Original tree structure is untouched (sortCommentTree returns a new tree).
    expect(tree[0].children.map((child) => child.id)).toEqual(['c1', 'c2']);
    expect(tree[0].children[1].children.map((g) => g.id)).toEqual(['g1', 'g2']);
  });
});
