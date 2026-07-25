import { fetchBlogs } from '@/lib/actions/blogs';
import { BlogListClient } from './BlogListClient';
import type { Blog } from '@/lib/supabase/types';

export default async function BlogPage() {
  let blogs: Blog[] = [];
  let fetchError: string | null = null;
  try {
    blogs = await fetchBlogs();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load posts.';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Blog
      </h1>
      <BlogListClient initialBlogs={blogs} fetchError={fetchError} />
    </div>
  );
}
