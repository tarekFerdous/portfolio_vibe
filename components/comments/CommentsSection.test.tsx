import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { CommentsSection } from './CommentsSection';
import { postComment } from '@/lib/actions/comments';
import { castVote } from '@/lib/actions/comment-votes';
import type { Comment, CommentVote } from '@/lib/supabase/types';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  })),
}));

vi.mock('@/lib/actions/comments', () => ({
  postComment: vi.fn(),
}));

vi.mock('@/lib/actions/comment-votes', () => ({
  castVote: vi.fn(),
  retractVote: vi.fn(),
}));

const mockUsePathname = vi.mocked(usePathname);
const mockPostComment = vi.mocked(postComment);
const mockCastVote = vi.mocked(castVote);

function makeVote(overrides: Partial<CommentVote> = {}): CommentVote {
  return {
    id: 'vote-1',
    comment_id: 'comment-1',
    voter_id: 'user-2',
    value: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
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
    ...overrides,
  };
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockReset();
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mockPostComment.mockReset();
  mockCastVote.mockReset();
  mockUsePathname.mockReturnValue('/posts/my-post');
});

describe('CommentsSection', () => {
  it('shows the inline sign-in prompt when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<CommentsSection blogId="blog-1" initialComments={[]} initialVotes={[]} />);

    expect(await screen.findByText(/sign in to comment/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add a comment/i)).not.toBeInTheDocument();
  });

  it('shows the composer when the viewer has a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    render(<CommentsSection blogId="blog-1" initialComments={[]} initialVotes={[]} />);

    expect(await screen.findByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    expect(screen.queryByText(/sign in to comment/i)).not.toBeInTheDocument();
  });

  it('renders initial comments scoped to the post, with derived author name and content', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const comment = makeComment({ author_email: 'jane.doe@example.com', content: 'Great post!' });
    render(<CommentsSection blogId="blog-1" initialComments={[comment]} initialVotes={[]} />);

    expect(await screen.findByText('jane.doe')).toBeInTheDocument();
    expect(screen.getByText('Great post!')).toBeInTheDocument();
  });

  it('rejects an empty submission with an inline error and does not call postComment', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    render(<CommentsSection blogId="blog-1" initialComments={[]} initialVotes={[]} />);

    const button = await screen.findByRole('button', { name: /post comment/i });
    fireEvent.click(button);

    expect(await screen.findByText(/cannot be empty/i)).toBeInTheDocument();
    expect(mockPostComment).not.toHaveBeenCalled();
  });

  it('appends a successfully posted comment to the list without a refetch', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    const newComment = makeComment({ id: 'comment-2', content: 'Nice read' });
    mockPostComment.mockResolvedValue(newComment);

    render(<CommentsSection blogId="blog-1" initialComments={[]} initialVotes={[]} />);

    const textarea = await screen.findByPlaceholderText(/add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Nice read' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    await waitFor(() => expect(mockPostComment).toHaveBeenCalledWith({ blogId: 'blog-1', content: 'Nice read' }));
    expect(await screen.findByText('Nice read')).toBeInTheDocument();
    expect(mockPostComment).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error message when postComment rejects', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    mockPostComment.mockRejectedValue(new Error('insert denied'));

    render(<CommentsSection blogId="blog-1" initialComments={[]} initialVotes={[]} />);

    const textarea = await screen.findByPlaceholderText(/add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Nice read' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    expect(await screen.findByText('insert denied')).toBeInTheDocument();
  });

  it('renders a reply nested under its parent comment', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const parent = makeComment({ id: 'comment-1', content: 'Parent comment' });
    const reply = makeComment({ id: 'comment-2', parent_comment_id: 'comment-1', content: 'A reply' });
    render(<CommentsSection blogId="blog-1" initialComments={[parent, reply]} initialVotes={[]} />);

    expect(await screen.findByText('Parent comment')).toBeInTheDocument();
    expect(screen.getByText('A reply')).toBeInTheDocument();
  });

  it('shows the inline sign-in prompt when replying while signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const parent = makeComment({ id: 'comment-1', content: 'Parent comment' });
    render(<CommentsSection blogId="blog-1" initialComments={[parent]} initialVotes={[]} />);

    await screen.findByText('Parent comment');
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));

    expect(await screen.findAllByText(/sign in to comment/i)).not.toHaveLength(0);
  });

  it('posts a reply with the parent comment id and appends it nested under the parent', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    const parent = makeComment({ id: 'comment-1', content: 'Parent comment' });
    const reply = makeComment({ id: 'comment-2', parent_comment_id: 'comment-1', content: 'Nested reply' });
    mockPostComment.mockResolvedValue(reply);

    render(<CommentsSection blogId="blog-1" initialComments={[parent]} initialVotes={[]} />);

    await screen.findByText('Parent comment');
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));

    const textareas = await screen.findAllByPlaceholderText(/add a comment/i);
    const replyTextarea = textareas[textareas.length - 1];
    fireEvent.change(replyTextarea, { target: { value: 'Nested reply' } });
    const postButtons = screen.getAllByRole('button', { name: /post comment/i });
    fireEvent.click(postButtons[postButtons.length - 1]);

    await waitFor(() =>
      expect(mockPostComment).toHaveBeenCalledWith({ blogId: 'blog-1', content: 'Nested reply', parentCommentId: 'comment-1' })
    );
    expect(await screen.findByText('Nested reply')).toBeInTheDocument();
  });

  it('shows the net score computed from initialVotes for a comment', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const comment = makeComment({ id: 'comment-1' });
    const votes = [makeVote({ voter_id: 'user-2', value: 1 }), makeVote({ id: 'vote-2', voter_id: 'user-3', value: 1 })];
    render(<CommentsSection blogId="blog-1" initialComments={[comment]} initialVotes={votes} />);

    await screen.findByText('Hello world');
    expect(screen.getByLabelText('Net score')).toHaveTextContent('2');
  });

  it('shows a net score of 0 for a comment with no votes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const comment = makeComment({ id: 'comment-1' });
    render(<CommentsSection blogId="blog-1" initialComments={[comment]} initialVotes={[]} />);

    await screen.findByText('Hello world');
    expect(screen.getByLabelText('Net score')).toHaveTextContent('0');
  });

  it('shows the sign-in prompt instead of calling castVote when a signed-out reader clicks a vote button', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const comment = makeComment({ id: 'comment-1' });
    render(<CommentsSection blogId="blog-1" initialComments={[comment]} initialVotes={[]} />);

    await screen.findByText('Hello world');
    fireEvent.click(screen.getByRole('button', { name: /upvote/i }));

    expect(await screen.findAllByText(/sign in to comment/i)).not.toHaveLength(0);
    expect(mockCastVote).not.toHaveBeenCalled();
  });

  it('defaults to Top sort, ordering top-level comments by score descending', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const low = makeComment({ id: 'c1', content: 'low score comment', created_at: '2026-01-01T00:00:00.000Z' });
    const high = makeComment({ id: 'c2', content: 'high score comment', created_at: '2026-01-02T00:00:00.000Z' });
    const negative = makeComment({ id: 'c3', content: 'negative score comment', created_at: '2026-01-03T00:00:00.000Z' });
    const votes = [
      makeVote({ id: 'v1', comment_id: 'c2', voter_id: 'u1', value: 1 }),
      makeVote({ id: 'v2', comment_id: 'c2', voter_id: 'u2', value: 1 }),
      makeVote({ id: 'v3', comment_id: 'c3', voter_id: 'u1', value: -1 }),
    ];
    const { container } = render(
      <CommentsSection blogId="blog-1" initialComments={[low, high, negative]} initialVotes={votes} />
    );

    await screen.findByText('high score comment');
    const text = container.textContent ?? '';
    const highIndex = text.indexOf('high score comment');
    const lowIndex = text.indexOf('low score comment');
    const negativeIndex = text.indexOf('negative score comment');

    expect(highIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeLessThan(lowIndex);
    expect(lowIndex).toBeLessThan(negativeIndex);
    expect(screen.getByRole('button', { name: 'Top' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to Newest order on click without refetching, and re-sorts by created_at descending', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const low = makeComment({ id: 'c1', content: 'oldest comment', created_at: '2026-01-01T00:00:00.000Z' });
    const high = makeComment({ id: 'c2', content: 'newest comment', created_at: '2026-01-03T00:00:00.000Z' });
    const middle = makeComment({ id: 'c3', content: 'middle comment', created_at: '2026-01-02T00:00:00.000Z' });
    const votes = [makeVote({ id: 'v1', comment_id: 'c1', voter_id: 'u1', value: 10 })];
    const { container } = render(
      <CommentsSection blogId="blog-1" initialComments={[low, high, middle]} initialVotes={votes} />
    );

    await screen.findByText('newest comment');
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Newest' }));

    const text = container.textContent ?? '';
    const newestIndex = text.indexOf('newest comment');
    const middleIndex = text.indexOf('middle comment');
    const oldestIndex = text.indexOf('oldest comment');

    expect(newestIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(oldestIndex);
    expect(screen.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true');
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockPostComment).not.toHaveBeenCalled();
    expect(mockCastVote).not.toHaveBeenCalled();
  });
});
