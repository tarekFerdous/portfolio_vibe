'use client';

import { useState } from 'react';
import Link from 'next/link';
import { moderateRemoveComment } from '@/lib/actions/comments';
import { deriveUsernameFromEmail } from '@/lib/utils/username';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import type { CommentWithBlog } from '@/lib/supabase/types';

interface Props {
  initialComments: CommentWithBlog[];
  fetchError?: string | null;
}

export function CommentsModerationClient({ initialComments, fetchError }: Props) {
  const [comments, setComments] = useState<CommentWithBlog[]>(initialComments);
  const [filter, setFilter] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});

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
        Failed to load comments: {fetchError}
      </div>
    );
  }

  async function handleRemove(commentId: string) {
    if (!confirm('Remove this comment?')) return;
    setRemovingId(commentId);
    setRemoveErrors((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    try {
      const updated = await moderateRemoveComment(commentId);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c)));
    } catch (err) {
      setRemoveErrors((prev) => ({
        ...prev,
        [commentId]: err instanceof Error ? err.message : 'Failed to remove comment.',
      }));
    } finally {
      setRemovingId(null);
    }
  }

  const normalizedFilter = filter.trim().toLowerCase();
  const filteredComments = normalizedFilter
    ? comments.filter(
        (c) =>
          (c.blogs?.title ?? '').toLowerCase().includes(normalizedFilter) ||
          c.author_email.toLowerCase().includes(normalizedFilter)
      )
    : comments;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by post title or author email…"
        aria-label="Filter comments"
        className="w-full rounded-xl px-4 py-2.5 bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
      />

      <div className="flex flex-col gap-3">
        {filteredComments.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
            {comments.length === 0 ? 'No comments yet.' : 'No comments match your filter.'}
          </p>
        )}
        {filteredComments.map((comment) => {
          const isDeleted = Boolean(comment.deleted_at);
          const deletedLabel = comment.removed_by_moderator ? '[removed by moderator]' : '[deleted]';
          return (
            <div
              key={comment.id}
              className="flex flex-col gap-2 rounded-[20px] p-5"
              style={{
                backdropFilter: 'var(--intro-glass-filter)',
                WebkitBackdropFilter: 'var(--intro-glass-filter)',
                background: 'var(--intro-glass-bg)',
                border: '1px solid var(--intro-glass-border)',
              }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <p
                  className="font-medium text-gray-900 dark:text-gray-50 truncate"
                  style={{ fontFamily: 'var(--font-recursive)' }}
                >
                  {isDeleted ? deletedLabel : deriveUsernameFromEmail(comment.author_email)}{' '}
                  <span className="text-gray-500 dark:text-gray-400 font-normal">{comment.author_email}</span>
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                  {!isDeleted && (
                    <button
                      onClick={() => handleRemove(comment.id)}
                      disabled={removingId === comment.id}
                      className="text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {removingId === comment.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
              {comment.blogs && (
                <Link
                  href={`/posts/${comment.blogs.slug}`}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors underline w-fit"
                >
                  {comment.blogs.title}
                </Link>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {isDeleted ? deletedLabel : comment.content}
              </p>
              {removeErrors[comment.id] && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {removeErrors[comment.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
