import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentItem } from './CommentItem';
import { postComment, updateComment, softDeleteComment } from '@/lib/actions/comments';
import { castVote, retractVote } from '@/lib/actions/comment-votes';
import type { Comment, CommentVote } from '@/lib/supabase/types';
import type { CommentNode } from '@/lib/utils/commentTree';

vi.mock('@/lib/actions/comments', () => ({
  postComment: vi.fn(),
  updateComment: vi.fn(),
  softDeleteComment: vi.fn(),
}));

vi.mock('@/lib/actions/comment-votes', () => ({
  castVote: vi.fn(),
  retractVote: vi.fn(),
}));

const mockPostComment = vi.mocked(postComment);
const mockUpdateComment = vi.mocked(updateComment);
const mockSoftDeleteComment = vi.mocked(softDeleteComment);
const mockCastVote = vi.mocked(castVote);
const mockRetractVote = vi.mocked(retractVote);

function makeNode(overrides: Partial<CommentNode> = {}): CommentNode {
  return {
    id: 'comment-1',
    blog_id: 'blog-1',
    parent_comment_id: null,
    author_id: 'user-1',
    author_email: 'visitor@example.com',
    content: 'Hello world',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    children: [],
    ...overrides,
  };
}

function renderCommentItem(overrides: Partial<React.ComponentProps<typeof CommentItem>> = {}) {
  const onCommentPosted = vi.fn();
  const onCommentUpdated = vi.fn();
  const onCommentDeleted = vi.fn();
  const onVoteCast = vi.fn();
  const onVoteRetracted = vi.fn();
  const props = {
    node: makeNode(),
    depth: 0,
    blogId: 'blog-1',
    sessionState: 'signed-in' as const,
    currentUserId: 'user-1',
    votes: [] as CommentVote[],
    onCommentPosted,
    onCommentUpdated,
    onCommentDeleted,
    onVoteCast,
    onVoteRetracted,
    ...overrides,
  };
  const utils = render(<CommentItem {...props} />);
  return { ...utils, onCommentPosted, onCommentUpdated, onCommentDeleted, onVoteCast, onVoteRetracted, props };
}

beforeEach(() => {
  mockPostComment.mockReset();
  mockUpdateComment.mockReset();
  mockSoftDeleteComment.mockReset();
  mockCastVote.mockReset();
  mockRetractVote.mockReset();
});

describe('CommentItem edit', () => {
  it('does not show an Edit button when the comment is not authored by the current user', () => {
    renderCommentItem({ currentUserId: 'someone-else' });
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows an Edit button and reveals a prefilled textarea when the comment belongs to the current user', () => {
    renderCommentItem({ node: makeNode({ content: 'My original comment' }), currentUserId: 'user-1' });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const textarea = screen.getByDisplayValue('My original comment');
    expect(textarea).toBeInTheDocument();
  });

  it('submits an edit and updates the displayed content without a remount', async () => {
    const updated: Comment = {
      id: 'comment-1',
      blog_id: 'blog-1',
      parent_comment_id: null,
      author_id: 'user-1',
      author_email: 'visitor@example.com',
      content: 'Edited content',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    mockUpdateComment.mockResolvedValue(updated);
    const { onCommentUpdated } = renderCommentItem({ node: makeNode({ content: 'Original' }) });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const textarea = screen.getByDisplayValue('Original');
    fireEvent.change(textarea, { target: { value: 'Edited content' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockUpdateComment).toHaveBeenCalledWith({ commentId: 'comment-1', content: 'Edited content' })
    );
    expect(onCommentUpdated).toHaveBeenCalledWith(updated);
  });

  it('shows a validation error and does not call updateComment when the edit is empty', async () => {
    renderCommentItem({ node: makeNode({ content: 'Original' }) });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const textarea = screen.getByDisplayValue('Original');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/cannot be empty/i)).toBeInTheDocument();
    expect(mockUpdateComment).not.toHaveBeenCalled();
  });

  it('shows a validation error and does not call updateComment when the edit exceeds the max length', async () => {
    renderCommentItem({ node: makeNode({ content: 'Original' }) });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const textarea = screen.getByDisplayValue('Original');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(10001) } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/characters or fewer/i)).toBeInTheDocument();
    expect(mockUpdateComment).not.toHaveBeenCalled();
  });

  it('reverts to display mode without calling updateComment on Cancel', () => {
    renderCommentItem({ node: makeNode({ content: 'Original' }) });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const textarea = screen.getByDisplayValue('Original');
    fireEvent.change(textarea, { target: { value: 'Changed but not saved' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Changed but not saved')).not.toBeInTheDocument();
    expect(mockUpdateComment).not.toHaveBeenCalled();
  });

  it('does not affect the Reply button/flow', async () => {
    const newComment: Comment = {
      id: 'comment-2',
      blog_id: 'blog-1',
      parent_comment_id: 'comment-1',
      author_id: 'user-1',
      author_email: 'visitor@example.com',
      content: 'A reply',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    mockPostComment.mockResolvedValue(newComment);
    const { onCommentPosted } = renderCommentItem();

    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    const textarea = screen.getByPlaceholderText(/add a comment/i);
    fireEvent.change(textarea, { target: { value: 'A reply' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    await waitFor(() =>
      expect(mockPostComment).toHaveBeenCalledWith({ blogId: 'blog-1', content: 'A reply', parentCommentId: 'comment-1' })
    );
    expect(onCommentPosted).toHaveBeenCalledWith(newComment);
  });
});

describe('CommentItem delete', () => {
  it('does not show a Delete button when the comment is not authored by the current user', () => {
    renderCommentItem({ currentUserId: 'someone-else' });
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows a Delete button and calls softDeleteComment when clicked for the owning identity', async () => {
    const deleted: Comment = {
      id: 'comment-1',
      blog_id: 'blog-1',
      parent_comment_id: null,
      author_id: 'user-1',
      author_email: 'visitor@example.com',
      content: 'Hello world',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: new Date().toISOString(),
    };
    mockSoftDeleteComment.mockResolvedValue(deleted);
    const { onCommentDeleted } = renderCommentItem({ node: makeNode({ id: 'comment-1' }), currentUserId: 'user-1' });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(mockSoftDeleteComment).toHaveBeenCalledWith('comment-1'));
    expect(onCommentDeleted).toHaveBeenCalledWith(deleted);
  });

  it('renders "[deleted]" in place of the author and content, and hides Edit/Delete, when deleted_at is set', () => {
    renderCommentItem({
      node: makeNode({ deleted_at: new Date().toISOString(), content: 'Hello world', author_email: 'visitor@example.com' }),
      currentUserId: 'user-1',
    });

    expect(screen.getAllByText('[deleted]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
    expect(screen.queryByText('visitor')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument();
  });

  it('renders a live (non-deleted) reply normally when its parent is deleted', () => {
    const deletedParent = makeNode({
      id: 'comment-1',
      deleted_at: new Date().toISOString(),
      content: 'Parent content',
      author_email: 'parent@example.com',
      children: [
        makeNode({
          id: 'comment-2',
          parent_comment_id: 'comment-1',
          deleted_at: null,
          content: 'A live reply',
          author_email: 'child@example.com',
        }),
      ],
    });

    renderCommentItem({ node: deletedParent, currentUserId: 'someone-else' });

    expect(screen.getAllByText('[deleted]').length).toBeGreaterThan(0);
    expect(screen.getByText('A live reply')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(screen.queryByText('Parent content')).not.toBeInTheDocument();
  });
});

describe('CommentItem votes', () => {
  it('shows a net score of 0 when there are no votes', () => {
    renderCommentItem({ votes: [] });
    expect(screen.getByLabelText('Net score')).toHaveTextContent('0');
  });

  it('shows the summed net score for the comment\'s votes', () => {
    renderCommentItem({
      votes: [
        { id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: 1, created_at: new Date().toISOString() },
        { id: 'v2', comment_id: 'comment-1', voter_id: 'user-2', value: 1, created_at: new Date().toISOString() },
        { id: 'v3', comment_id: 'comment-1', voter_id: 'user-3', value: -1, created_at: new Date().toISOString() },
      ],
    });
    expect(screen.getByLabelText('Net score')).toHaveTextContent('1');
  });

  it('marks the current user\'s active upvote as pressed, and the downvote as not pressed', () => {
    renderCommentItem({
      currentUserId: 'user-1',
      votes: [{ id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: 1, created_at: new Date().toISOString() }],
    });
    expect(screen.getByRole('button', { name: /upvote/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /downvote/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the current user\'s active downvote as pressed, and the upvote as not pressed', () => {
    renderCommentItem({
      currentUserId: 'user-1',
      votes: [{ id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: -1, created_at: new Date().toISOString() }],
    });
    expect(screen.getByRole('button', { name: /downvote/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /upvote/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('casts an upvote when signed in and not previously voted', async () => {
    const vote: CommentVote = { id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: 1, created_at: new Date().toISOString() };
    mockCastVote.mockResolvedValue(vote);
    const { onVoteCast } = renderCommentItem({ currentUserId: 'user-1', votes: [] });

    fireEvent.click(screen.getByRole('button', { name: /upvote/i }));

    await waitFor(() => expect(mockCastVote).toHaveBeenCalledWith({ commentId: 'comment-1', value: 1 }));
    expect(onVoteCast).toHaveBeenCalledWith(vote);
  });

  it('retracts the vote when clicking the already-active upvote button', async () => {
    mockRetractVote.mockResolvedValue(undefined);
    const { onVoteRetracted } = renderCommentItem({
      currentUserId: 'user-1',
      votes: [{ id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: 1, created_at: new Date().toISOString() }],
    });

    fireEvent.click(screen.getByRole('button', { name: /upvote/i }));

    await waitFor(() => expect(mockRetractVote).toHaveBeenCalledWith('comment-1'));
    expect(onVoteRetracted).toHaveBeenCalledWith('comment-1', 'user-1');
    expect(mockCastVote).not.toHaveBeenCalled();
  });

  it('changes an existing upvote to a downvote (upsert) when the other button is clicked', async () => {
    const vote: CommentVote = { id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: -1, created_at: new Date().toISOString() };
    mockCastVote.mockResolvedValue(vote);
    const { onVoteCast } = renderCommentItem({
      currentUserId: 'user-1',
      votes: [{ id: 'v1', comment_id: 'comment-1', voter_id: 'user-1', value: 1, created_at: new Date().toISOString() }],
    });

    fireEvent.click(screen.getByRole('button', { name: /downvote/i }));

    await waitFor(() => expect(mockCastVote).toHaveBeenCalledWith({ commentId: 'comment-1', value: -1 }));
    expect(onVoteCast).toHaveBeenCalledWith(vote);
    expect(mockRetractVote).not.toHaveBeenCalled();
  });

  it('shows the sign-in prompt instead of calling castVote when signed out', () => {
    renderCommentItem({ sessionState: 'signed-out', currentUserId: null, votes: [] });

    fireEvent.click(screen.getByRole('button', { name: /upvote/i }));

    expect(screen.getByText(/sign in to comment/i)).toBeInTheDocument();
    expect(mockCastVote).not.toHaveBeenCalled();
    expect(mockRetractVote).not.toHaveBeenCalled();
  });
});
