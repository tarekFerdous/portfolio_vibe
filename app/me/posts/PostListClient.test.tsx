import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostListClient } from './PostListClient';
import { deletePost, upsertPost } from '@/lib/actions/posts';
import type { Post } from '@/lib/supabase/types';

vi.mock('@/lib/actions/posts', () => ({
  deletePost: vi.fn(),
  upsertPost: vi.fn(),
}));

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    title: 'Test Post',
    slug: 'test-post',
    publish_date: null,
    location: null,
    status: 'draft',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('PostListClient - initial fetch error', () => {
  it('shows a visible error instead of the empty state when the initial fetch failed', () => {
    render(<PostListClient initialPosts={[]} fetchError="Network error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    expect(screen.queryByText('No posts yet.')).not.toBeInTheDocument();
  });

  it('renders the list normally when there is no fetch error', () => {
    render(<PostListClient initialPosts={[makePost()]} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});

describe('PostListClient - delete', () => {
  it('removes the post from the list on successful delete', async () => {
    (deletePost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    render(<PostListClient initialPosts={[makePost()]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.queryByText('Test Post')).not.toBeInTheDocument());
  });

  it('restores the post and shows a visible inline error when delete fails', async () => {
    (deletePost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: 'Delete failed' });
    render(<PostListClient initialPosts={[makePost()]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Delete failed'));
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('does not call deletePost when the confirm dialog is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<PostListClient initialPosts={[makePost()]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(deletePost).not.toHaveBeenCalled();
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});

describe('PostListClient - create', () => {
  it('shows a visible error when creating a new post fails', async () => {
    (upsertPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: 'Create failed' });
    render(<PostListClient initialPosts={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /new post/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Create failed'));
    expect(screen.getByRole('button', { name: /new post/i })).toBeEnabled();
  });
});
