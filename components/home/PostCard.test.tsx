import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCard } from './PostCard';
import type { Blog } from '@/lib/supabase/types';

const basePost: Blog = {
  id: 'post-1',
  title: 'Test Post',
  slug: 'test-post',
  publish_date: '2026-01-15',
  location: 'San Francisco',
  status: 'published',
  excerpt: 'A short excerpt about the post',
  cover_image_url: null,
  author: 'Jane Doe',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('PostCard', () => {
  it('renders the title, excerpt, author, and formatted publish date', () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('A short excerpt about the post')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/January 15, 2026/)).toBeInTheDocument();
  });

  it('links to /posts/<slug>', () => {
    render(<PostCard post={basePost} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/posts/test-post');
  });

  it('renders the cover image when cover_image_url is set', () => {
    const post: Blog = { ...basePost, cover_image_url: 'https://example.com/cover.jpg' };
    render(<PostCard post={post} />);
    const image = screen.getByAltText(post.title);
    expect(image).toBeInTheDocument();
    expect(image.tagName).toBe('IMG');
  });

  it('renders without a cover image when cover_image_url is null', () => {
    render(<PostCard post={basePost} />);
    expect(screen.queryByAltText(basePost.title)).not.toBeInTheDocument();
  });

  it('handles a null publish_date gracefully', () => {
    const post: Blog = { ...basePost, publish_date: null };
    render(<PostCard post={post} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});
