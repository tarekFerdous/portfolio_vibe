import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { CommentsSection } from './CommentsSection';
import { postComment } from '@/lib/actions/comments';
import type { Comment } from '@/lib/supabase/types';

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

const mockUsePathname = vi.mocked(usePathname);
const mockPostComment = vi.mocked(postComment);

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
  mockUsePathname.mockReturnValue('/posts/my-post');
});

describe('CommentsSection', () => {
  it('shows the inline sign-in prompt when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<CommentsSection blogId="blog-1" initialComments={[]} />);

    expect(await screen.findByText(/sign in to comment/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add a comment/i)).not.toBeInTheDocument();
  });

  it('shows the composer when the viewer has a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    render(<CommentsSection blogId="blog-1" initialComments={[]} />);

    expect(await screen.findByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    expect(screen.queryByText(/sign in to comment/i)).not.toBeInTheDocument();
  });

  it('renders initial comments scoped to the post, with derived author name and content', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const comment = makeComment({ author_email: 'jane.doe@example.com', content: 'Great post!' });
    render(<CommentsSection blogId="blog-1" initialComments={[comment]} />);

    expect(await screen.findByText('jane.doe')).toBeInTheDocument();
    expect(screen.getByText('Great post!')).toBeInTheDocument();
  });

  it('rejects an empty submission with an inline error and does not call postComment', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    render(<CommentsSection blogId="blog-1" initialComments={[]} />);

    const button = await screen.findByRole('button', { name: /post comment/i });
    fireEvent.click(button);

    expect(await screen.findByText(/cannot be empty/i)).toBeInTheDocument();
    expect(mockPostComment).not.toHaveBeenCalled();
  });

  it('appends a successfully posted comment to the list without a refetch', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    const newComment = makeComment({ id: 'comment-2', content: 'Nice read' });
    mockPostComment.mockResolvedValue(newComment);

    render(<CommentsSection blogId="blog-1" initialComments={[]} />);

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

    render(<CommentsSection blogId="blog-1" initialComments={[]} />);

    const textarea = await screen.findByPlaceholderText(/add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Nice read' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    expect(await screen.findByText('insert denied')).toBeInTheDocument();
  });

  it('renders a reply nested under its parent comment', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const parent = makeComment({ id: 'comment-1', content: 'Parent comment' });
    const reply = makeComment({ id: 'comment-2', parent_comment_id: 'comment-1', content: 'A reply' });
    render(<CommentsSection blogId="blog-1" initialComments={[parent, reply]} />);

    expect(await screen.findByText('Parent comment')).toBeInTheDocument();
    expect(screen.getByText('A reply')).toBeInTheDocument();
  });

  it('shows the inline sign-in prompt when replying while signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const parent = makeComment({ id: 'comment-1', content: 'Parent comment' });
    render(<CommentsSection blogId="blog-1" initialComments={[parent]} />);

    await screen.findByText('Parent comment');
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));

    expect(await screen.findAllByText(/sign in to comment/i)).not.toHaveLength(0);
  });

  it('posts a reply with the parent comment id and appends it nested under the parent', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'visitor@example.com' } } } });
    const parent = makeComment({ id: 'comment-1', content: 'Parent comment' });
    const reply = makeComment({ id: 'comment-2', parent_comment_id: 'comment-1', content: 'Nested reply' });
    mockPostComment.mockResolvedValue(reply);

    render(<CommentsSection blogId="blog-1" initialComments={[parent]} />);

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
});
