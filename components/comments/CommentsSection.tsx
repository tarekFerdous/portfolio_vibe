'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { postComment } from '@/lib/actions/comments';
import { InlineSignIn } from '@/components/comments/InlineSignIn';
import { CommentItem } from '@/components/comments/CommentItem';
import { MAX_COMMENT_LENGTH } from '@/components/comments/constants';
import { buildCommentTree } from '@/lib/utils/commentTree';
import type { Comment } from '@/lib/supabase/types';

interface CommentsSectionProps {
  blogId: string;
  initialComments: Comment[];
}

export type SessionState = 'loading' | 'signed-out' | 'signed-in';

export function CommentsSection({ blogId, initialComments }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionState(session ? 'signed-in' : 'signed-out');
      setCurrentUserId(session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionState(session ? 'signed-in' : 'signed-out');
      setCurrentUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setError('Comment cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setError(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const comment = await postComment({ blogId, content: trimmed });
      handleCommentPosted(comment);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCommentPosted(comment: Comment) {
    setComments((prev) => [...prev, comment]);
  }

  function handleCommentUpdated(comment: Comment) {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }

  function handleCommentDeleted(comment: Comment) {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }

  const commentTree = buildCommentTree(comments);

  return (
    <div className="mt-16 flex flex-col gap-6">
      <h2
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '32px', lineHeight: 1.1 }}
      >
        Comments
      </h2>

      {sessionState === 'signed-out' && <InlineSignIn />}

      {sessionState === 'signed-in' && (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl rounded-2xl p-5 flex flex-col gap-3"
          style={{
            backdropFilter: 'var(--intro-glass-filter)',
            WebkitBackdropFilter: 'var(--intro-glass-filter)',
            background: 'var(--intro-glass-bg)',
            border: '1px solid var(--intro-glass-border)',
            boxShadow: 'var(--intro-glass-shadow)',
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full rounded-xl px-4 py-2.5 bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-full px-5 py-2.5 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '13pt',
            }}
          >
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {commentTree.map((node) => (
          <CommentItem
            key={node.id}
            node={node}
            depth={0}
            blogId={blogId}
            sessionState={sessionState}
            currentUserId={currentUserId}
            onCommentPosted={handleCommentPosted}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
          />
        ))}
      </div>
    </div>
  );
}
