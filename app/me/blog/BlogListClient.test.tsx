import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlogListClient } from './BlogListClient';
import { deleteBlog, upsertBlog } from '@/lib/actions/blogs';
import type { Blog } from '@/lib/supabase/types';

vi.mock('@/lib/actions/blogs', () => ({
  deleteBlog: vi.fn(),
  upsertBlog: vi.fn(),
}));

function makeBlog(overrides: Partial<Blog> = {}): Blog {
  return {
    id: 'blog-1',
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

describe('BlogListClient - initial fetch error', () => {
  it('shows a visible error instead of the empty state when the initial fetch failed', () => {
    render(<BlogListClient initialBlogs={[]} fetchError="Network error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    expect(screen.queryByText('No posts yet.')).not.toBeInTheDocument();
  });

  it('renders the list normally when there is no fetch error', () => {
    render(<BlogListClient initialBlogs={[makeBlog()]} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});

describe('BlogListClient - delete', () => {
  it('removes the post from the list on successful delete', async () => {
    (deleteBlog as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    render(<BlogListClient initialBlogs={[makeBlog()]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.queryByText('Test Post')).not.toBeInTheDocument());
  });

  it('restores the post and shows a visible inline error when delete fails', async () => {
    (deleteBlog as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Delete failed'));
    render(<BlogListClient initialBlogs={[makeBlog()]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Delete failed'));
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('does not call deleteBlog when the confirm dialog is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BlogListClient initialBlogs={[makeBlog()]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(deleteBlog).not.toHaveBeenCalled();
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});

describe('BlogListClient - create', () => {
  it('shows a visible error when creating a new post fails', async () => {
    (upsertBlog as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Create failed'));
    render(<BlogListClient initialBlogs={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /new post/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Create failed'));
  });
});
