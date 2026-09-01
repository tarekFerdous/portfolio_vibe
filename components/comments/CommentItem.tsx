'use client';

import { useState } from 'react';
import { postComment, updateComment, softDeleteComment } from '@/lib/actions/comments';
import { deriveUsernameFromEmail } from '@/lib/utils/username';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import { InlineSignIn } from '@/components/comments/InlineSignIn';
import { MAX_COMMENT_LENGTH, MAX_VISIBLE_DEPTH } from '@/components/comments/constants';
import type { CommentNode } from '@/lib/utils/commentTree';
import type { Comment } from '@/lib/supabase/types';
import type { SessionState } from '@/components/comments/CommentsSection';

const INDENT_STEP_PX = 24;

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  blogId: string;
  sessionState: SessionState;
  currentUserId: string | null;
  onCommentPosted: (comment: Comment) => void;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (comment: Comment) => void;
}

export function CommentItem({
  node,
  depth,
  blogId,
  sessionState,
  currentUserId,
  onCommentPosted,
  onCommentUpdated,
  onCommentDeleted,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.content);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isOwnComment = node.author_id === currentUserId;
  const isDeleted = Boolean(node.deleted_at);

  async function handleReplySubmit(e: React.FormEvent) {
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
      const comment = await postComment({ blogId, content: trimmed, parentCommentId: node.id });
      onCommentPosted(comment);
      setContent('');
      setIsReplying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditStart() {
    setEditContent(node.content);
    setEditError('');
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setEditContent(node.content);
    setEditError('');
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editContent.trim();
    if (trimmed.length === 0) {
      setEditError('Comment cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setEditError(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
      return;
    }

    setEditSubmitting(true);
    setEditError('');
    try {
      const comment = await updateComment({ commentId: node.id, content: trimmed });
      onCommentUpdated(comment);
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      const comment = await softDeleteComment(node.id);
      onCommentDeleted(comment);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // Indent stops accumulating past MAX_VISIBLE_DEPTH so deep threads don't
  // push content off-screen on mobile; the data itself keeps nesting freely.
  const childIndent = depth < MAX_VISIBLE_DEPTH ? INDENT_STEP_PX : 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="w-full max-w-2xl rounded-2xl p-5"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
          boxShadow: 'var(--intro-glass-shadow)',
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="text-gray-900 dark:text-gray-50"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '12pt',
            }}
          >
            {isDeleted ? '[deleted]' : deriveUsernameFromEmail(node.author_email)}
          </span>
          <span
            className="text-gray-500 dark:text-gray-400"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '10pt' }}
          >
            {formatRelativeTime(node.created_at)}
          </span>
        </div>
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="mt-2 flex flex-col gap-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
            />
            {editError && <p className="text-red-500 text-sm">{editError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={editSubmitting}
                className="self-start rounded-full px-5 py-2.5 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-recursive)',
                  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
                  fontSize: '13pt',
                }}
              >
                {editSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                className="text-gray-500 dark:text-gray-400 hover:opacity-80 transition-opacity"
                style={{
                  fontFamily: 'var(--font-recursive)',
                  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
                  fontSize: '10pt',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : isDeleted ? (
          <p
            className="mt-2 text-gray-500 dark:text-gray-400 italic"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '12pt' }}
          >
            [deleted]
          </p>
        ) : (
          <p
            className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '12pt' }}
          >
            {node.content}
          </p>
        )}

        {!isEditing && (
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsReplying((prev) => !prev)}
              className="text-gray-500 dark:text-gray-400 hover:opacity-80 transition-opacity"
              style={{
                fontFamily: 'var(--font-recursive)',
                fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
                fontSize: '10pt',
              }}
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
            {isOwnComment && !isDeleted && (
              <button
                type="button"
                onClick={handleEditStart}
                className="text-gray-500 dark:text-gray-400 hover:opacity-80 transition-opacity"
                style={{
                  fontFamily: 'var(--font-recursive)',
                  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
                  fontSize: '10pt',
                }}
              >
                Edit
              </button>
            )}
            {isOwnComment && !isDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="text-gray-500 dark:text-gray-400 hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-recursive)',
                  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
                  fontSize: '10pt',
                }}
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        )}
        {deleteError && <p className="mt-2 text-red-500 text-sm">{deleteError}</p>}

        {isReplying && sessionState === 'signed-out' && (
          <div className="mt-3">
            <InlineSignIn />
          </div>
        )}

        {isReplying && sessionState === 'signed-in' && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex flex-col gap-3">
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
      </div>

      {node.children.length > 0 && (
        <div className="flex flex-col gap-3" style={{ marginLeft: childIndent }}>
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              blogId={blogId}
              sessionState={sessionState}
              currentUserId={currentUserId}
              onCommentPosted={onCommentPosted}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
