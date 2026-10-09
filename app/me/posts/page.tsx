import { fetchPosts } from '@/lib/actions/posts';
import { PostListClient } from './PostListClient';
import type { Post } from '@/lib/supabase/types';

export default async function PostsPage() {
  let posts: Post[] = [];
  let fetchError: string | null = null;
  try {
    posts = await fetchPosts();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load posts.';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Posts
      </h1>
      <PostListClient initialPosts={posts} fetchError={fetchError} />
    </div>
  );
}
