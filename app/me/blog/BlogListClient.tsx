'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteBlog, upsertBlog } from '@/lib/actions/blogs';
import type { Blog } from '@/lib/supabase/types';

interface Props {
  initialBlogs: Blog[];
}

export function BlogListClient({ initialBlogs }: Props) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    const id = await upsertBlog({
      title: 'Untitled Post',
      publish_date: null,
      location: null,
      status: 'draft',
      blocks: [],
    });
    const newBlog: Blog = {
      id,
      title: 'Untitled Post',
      slug: '',
      publish_date: null,
      location: null,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBlogs((prev) => [newBlog, ...prev]);
    setCreating(false);
    window.location.href = `/me/blog/${id}`;
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await deleteBlog(id);
    setBlogs((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={handleNew}
          disabled={creating}
          className="rounded-full px-5 py-2 text-sm bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          {creating ? 'Creating…' : '+ New post'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {blogs.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">No posts yet.</p>
        )}
        {blogs.map((blog) => (
          <div
            key={blog.id}
            className="flex items-center gap-4 rounded-[20px] p-5"
            style={{
              backdropFilter: 'var(--intro-glass-filter)',
              WebkitBackdropFilter: 'var(--intro-glass-filter)',
              background: 'var(--intro-glass-bg)',
              border: '1px solid var(--intro-glass-border)',
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-50 truncate" style={{ fontFamily: 'var(--font-recursive)' }}>
                {blog.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {blog.publish_date ?? 'No date'} · {blog.location ?? 'No location'}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                blog.status === 'published'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {blog.status}
            </span>
            <Link
              href={`/me/blog/${blog.id}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => handleDelete(blog.id, blog.title)}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
