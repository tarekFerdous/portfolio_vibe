import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostsSection } from './PostsSection';
import type { Blog } from '@/lib/supabase/types';

function makePost(index: number): Blog {
  return {
    id: `post-${index}`,
    title: `Post ${index}`,
    slug: `post-${index}`,
    publish_date: '2026-01-15',
    location: 'San Francisco',
    status: 'published',
    excerpt: `Excerpt ${index}`,
    cover_image_url: null,
    author: 'Jane Doe',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

const fivePosts = Array.from({ length: 5 }, (_, i) => makePost(i + 1));

describe('PostsSection', () => {
  it('renders at most 5 cards given a posts prop of 5', () => {
    render(<PostsSection posts={fivePosts} totalPublished={8} />);
    expect(screen.getAllByRole('link', { name: /Post \d/ })).toHaveLength(5);
  });

  it('shows the "Load more posts" button when totalPublished is greater than posts.length', () => {
    render(<PostsSection posts={fivePosts} totalPublished={8} />);
    const link = screen.getByRole('link', { name: 'Load more posts' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/posts');
  });

  it('hides the "Load more posts" button when totalPublished equals posts.length', () => {
    render(<PostsSection posts={fivePosts} totalPublished={5} />);
    expect(screen.queryByRole('link', { name: 'Load more posts' })).not.toBeInTheDocument();
  });

  it('hides the "Load more posts" button when totalPublished is less than posts.length', () => {
    const twoPosts = fivePosts.slice(0, 2);
    render(<PostsSection posts={twoPosts} totalPublished={2} />);
    expect(screen.queryByRole('link', { name: 'Load more posts' })).not.toBeInTheDocument();
  });
});
