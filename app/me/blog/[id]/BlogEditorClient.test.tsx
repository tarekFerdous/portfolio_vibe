import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlogEditorClient } from './BlogEditorClient';
import { upsertBlog } from '@/lib/actions/blogs';
import type { Blog, BlogBlock } from '@/lib/supabase/types';

vi.mock('@/lib/actions/blogs', () => ({
  upsertBlog: vi.fn(),
}));

vi.mock('@/lib/actions/images', () => ({
  uploadImage: vi.fn().mockResolvedValue('https://example.com/img.jpg'),
  deleteImage: vi.fn().mockResolvedValue(undefined),
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

const initialBlocks: BlogBlock[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BlogEditorClient - initial fetch error', () => {
  it('shows a visible error instead of the editor form when the initial fetch failed', () => {
    render(<BlogEditorClient blog={null} initialBlocks={[]} fetchError="Not found" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Not found');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});

describe('BlogEditorClient - save', () => {
  it('shows the success confirmation and no error when save succeeds', async () => {
    (upsertBlog as ReturnType<typeof vi.fn>).mockResolvedValueOnce('blog-1');
    render(<BlogEditorClient blog={makeBlog()} initialBlocks={initialBlocks} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a visible error and no success confirmation when save fails', async () => {
    (upsertBlog as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Save failed'));
    render(<BlogEditorClient blog={makeBlog()} initialBlocks={initialBlocks} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Save failed'));
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });
});
