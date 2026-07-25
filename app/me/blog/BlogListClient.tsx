'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteBlog, upsertBlog } from '@/lib/actions/blogs';
import type { Blog } from '@/lib/supabase/types';

interface Props {
  initialBlogs: Blog[];
  fetchError?: string | null;
}

export function BlogListClient({ initialBlogs, fetchError }: Props) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [creating, setCreating] = useState(false);
  const [newPostError, setNewPostError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  async function handleNew() {
    setCreating(true);
    setNewPostError(null);
    try {
      const id = await upsertBlog({
        title: 'Untitled Post',
        publish_date: null,
        location: null,
        status: 'draft',
        blocks: [],
      });
      window.location.href = `/me/blog/${id}`;
    } catch (err) {
      setNewPostError(err instanceof Error ? err.message : 'Failed to create post.');
      setCreating(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const previousBlogs = blogs;
    setBlogs((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteBlog(id);
    } catch (err) {
      setBlogs(previousBlogs);
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Failed to delete post.',
      }));
    }
  }

  if (fetchError) {
    return (
      <div
        role="alert"
        className="rounded-[20px] p-5 text-sm text-red-600 dark:text-red-400"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        Failed to load posts: {fetchError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleNew}
          disabled={creating}
          className="rounded-full px-5 py-2 text-sm bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          {creating ? 'Creating…' : '+ New post'}
        </button>
        {newPostError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {newPostError}
          </p>
        )}
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
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => handleDelete(blog.id, blog.title)}
                className="text-sm text-red-400 hover:text-red-600 transition-colors"
              >
                Delete
              </button>
              {deleteErrors[blog.id] && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {deleteErrors[blog.id]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
