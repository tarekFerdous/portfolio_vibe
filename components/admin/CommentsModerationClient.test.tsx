import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentsModerationClient } from './CommentsModerationClient';
import { moderateRemoveComment } from '@/lib/actions/comments';
import type { CommentWithBlog } from '@/lib/supabase/types';

vi.mock('@/lib/actions/comments', () => ({
  moderateRemoveComment: vi.fn(),
}));

const mockModerateRemoveComment = vi.mocked(moderateRemoveComment);

function makeComment(overrides: Partial<CommentWithBlog> = {}): CommentWithBlog {
  return {
    id: 'c1',
    blog_id: 'blog-1',
    parent_comment_id: null,
    author_id: 'user-1',
    author_email: 'visitor@example.com',
    content: 'Great post!',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    removed_by_moderator: false,
    blogs: { title: 'Test Post', slug: 'test-post' },
    ...overrides,
  };
}

beforeEach(() => {
  mockModerateRemoveComment.mockReset();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('CommentsModerationClient - fetch error', () => {
  it('shows a visible error instead of the empty state when the initial fetch failed', () => {
    render(<CommentsModerationClient initialComments={[]} fetchError="Network error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument();
  });
});

describe('CommentsModerationClient - listing', () => {
  it('renders the empty state when there are no comments', () => {
    render(<CommentsModerationClient initialComments={[]} />);
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders each comment with a link to its post', () => {
    render(<CommentsModerationClient initialComments={[makeComment()]} />);
    expect(screen.getByText('Great post!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Test Post' })).toHaveAttribute('href', '/posts/test-post');
  });

  it('renders a deleted comment as [deleted] and hides the Remove action', () => {
    render(<CommentsModerationClient initialComments={[makeComment({ deleted_at: '2026-01-02T00:00:00.000Z' })]} />);
    expect(screen.getAllByText('[deleted]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Great post!')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('renders a moderator-removed comment as [removed by moderator]', () => {
    render(
      <CommentsModerationClient
        initialComments={[makeComment({ deleted_at: '2026-01-02T00:00:00.000Z', removed_by_moderator: true })]}
      />
    );
    expect(screen.getAllByText('[removed by moderator]').length).toBeGreaterThan(0);
  });
});

describe('CommentsModerationClient - filter', () => {
  it('filters by post title substring', () => {
    render(
      <CommentsModerationClient
        initialComments={[
          makeComment({ id: 'c1', content: 'from post one', blogs: { title: 'Post One', slug: 'post-one' } }),
          makeComment({ id: 'c2', content: 'from post two', blogs: { title: 'Post Two', slug: 'post-two' } }),
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText('Filter comments'), { target: { value: 'One' } });

    expect(screen.getByText('from post one')).toBeInTheDocument();
    expect(screen.queryByText('from post two')).not.toBeInTheDocument();
  });

  it('filters by author email substring', () => {
    render(
      <CommentsModerationClient
        initialComments={[
          makeComment({ id: 'c1', content: 'comment a', author_email: 'alice@example.com' }),
          makeComment({ id: 'c2', content: 'comment b', author_email: 'bob@example.com' }),
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText('Filter comments'), { target: { value: 'alice' } });

    expect(screen.getByText('comment a')).toBeInTheDocument();
    expect(screen.queryByText('comment b')).not.toBeInTheDocument();
  });

  it('shows a no-matches message when the filter excludes everything', () => {
    render(<CommentsModerationClient initialComments={[makeComment()]} />);
    fireEvent.change(screen.getByLabelText('Filter comments'), { target: { value: 'nonexistent' } });
    expect(screen.getByText('No comments match your filter.')).toBeInTheDocument();
  });
});

describe('CommentsModerationClient - remove', () => {
  it('calls moderateRemoveComment with the right id and reflects the removed state after', async () => {
    const removed = makeComment({
      deleted_at: '2026-01-03T00:00:00.000Z',
      removed_by_moderator: true,
    });
    mockModerateRemoveComment.mockResolvedValueOnce(removed);
    render(<CommentsModerationClient initialComments={[makeComment()]} />);

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => expect(mockModerateRemoveComment).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(screen.getAllByText('[removed by moderator]').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('shows a visible inline error and keeps the comment live when remove fails', async () => {
    mockModerateRemoveComment.mockRejectedValueOnce(new Error('Remove failed'));
    render(<CommentsModerationClient initialComments={[makeComment()]} />);

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Remove failed'));
    expect(screen.getByText('Great post!')).toBeInTheDocument();
  });

  it('does not call moderateRemoveComment when the confirmation is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(<CommentsModerationClient initialComments={[makeComment()]} />);

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(mockModerateRemoveComment).not.toHaveBeenCalled();
  });
});
