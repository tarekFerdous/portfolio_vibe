import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostEditorClient } from './PostEditorClient';
import { upsertPost } from '@/lib/actions/posts';
import type { Post, PostBlock } from '@/lib/supabase/types';

vi.mock('@/lib/actions/posts', () => ({
  upsertPost: vi.fn(),
  uploadPostCover: vi.fn().mockResolvedValue('https://example.com/cover.jpg'),
  deletePostCover: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/actions/images', () => ({
  uploadImage: vi.fn().mockResolvedValue('https://example.com/img.jpg'),
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    title: 'Test Post',
    slug: 'test-post',
    publish_date: null,
    location: null,
    status: 'draft',
    excerpt: null,
    cover_image_url: null,
    author: 'Tarek Ferdous',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const initialBlocks: PostBlock[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PostEditorClient - initial fetch error', () => {
  it('shows a visible error instead of the editor form when the initial fetch failed', () => {
    render(<PostEditorClient post={null} initialBlocks={[]} fetchError="Not found" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Not found');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});

describe('PostEditorClient - save', () => {
  it('shows the success confirmation and no error when save succeeds', async () => {
    (upsertPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, id: 'post-1' });
    render(<PostEditorClient post={makePost()} initialBlocks={initialBlocks} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a visible error and no success confirmation when save fails', async () => {
    (upsertPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: 'Save failed' });
    render(<PostEditorClient post={makePost()} initialBlocks={initialBlocks} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Save failed'));
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });
});

describe('PostEditorClient - excerpt, author, and cover image', () => {
  it('defaults the author field to Tarek Ferdous for a new post', () => {
    render(<PostEditorClient post={makePost({ author: 'Tarek Ferdous' })} initialBlocks={initialBlocks} />);
    const authorInput = screen.getByText('Author').nextElementSibling as HTMLInputElement;
    expect(authorInput.value).toBe('Tarek Ferdous');
  });

  it('persists entered excerpt and author text on save', async () => {
    (upsertPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, id: 'post-1' });
    render(<PostEditorClient post={makePost()} initialBlocks={initialBlocks} />);

    const excerptInput = screen.getByText('Excerpt').nextElementSibling as HTMLTextAreaElement;
    fireEvent.change(excerptInput, { target: { value: 'A short excerpt' } });

    const authorInput = screen.getByText('Author').nextElementSibling as HTMLInputElement;
    fireEvent.change(authorInput, { target: { value: 'Jane Doe' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument());
    expect(upsertPost).toHaveBeenCalledWith(
      expect.objectContaining({ excerpt: 'A short excerpt', author: 'Jane Doe' })
    );
  });

  it('uploads a cover image and persists its URL on save', async () => {
    (upsertPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, id: 'post-1' });
    render(<PostEditorClient post={makePost()} initialBlocks={initialBlocks} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('img', { name: /uploaded image/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument());
    expect(upsertPost).toHaveBeenCalledWith(
      expect.objectContaining({ cover_image_url: 'https://example.com/cover.jpg' })
    );
  });
});
