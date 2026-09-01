'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { postComment, updateComment, softDeleteComment } from '@/lib/actions/comments';
import { castVote, retractVote } from '@/lib/actions/comment-votes';
import { deriveUsernameFromEmail } from '@/lib/utils/username';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import { InlineSignIn } from '@/components/comments/InlineSignIn';
import {
  MAX_COMMENT_LENGTH,
  MAX_VISIBLE_DEPTH,
  COLLAPSE_SCORE_THRESHOLD,
} from '@/components/comments/constants';
import type { CommentNode } from '@/lib/utils/commentTree';
import type { Comment, CommentVote } from '@/lib/supabase/types';
import type { SessionState } from '@/components/comments/CommentsSection';

const INDENT_STEP_PX = 24;

/**
 * Total number of descendants (children, grandchildren, …) below this node.
 * Used for the collapsed-summary reply count — deliberately excludes the
 * node itself so a leaf comment reports 0.
 */
function countDescendants(node: CommentNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  blogId: string;
  sessionState: SessionState;
  currentUserId: string | null;
  votes: CommentVote[];
  onCommentPosted: (comment: Comment) => void;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (comment: Comment) => void;
  onVoteCast: (vote: CommentVote) => void;
  onVoteRetracted: (commentId: string, voterId: string) => void;
}

export function CommentItem({
  node,
  depth,
  blogId,
  sessionState,
  currentUserId,
  votes,
  onCommentPosted,
  onCommentUpdated,
  onCommentDeleted,
  onVoteCast,
  onVoteRetracted,
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

  const [isVotePromptOpen, setIsVotePromptOpen] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteError, setVoteError] = useState('');

  const commentVotes = votes.filter((v) => v.comment_id === node.id);
  const score = commentVotes.reduce((sum, v) => sum + v.value, 0);

  // Purely client-side ephemeral UI state: default collapsed once a thread
  // passes MAX_VISIBLE_DEPTH (deep sub-threads don't overwhelm the page) OR
  // once its net score sinks to/below COLLAPSE_SCORE_THRESHOLD (low-value
  // comments start out of the way regardless of depth). Either trigger alone
  // is sufficient. No fetch is involved in computing or toggling this.
  const [isCollapsed, setIsCollapsed] = useState(
    depth > MAX_VISIBLE_DEPTH || score <= COLLAPSE_SCORE_THRESHOLD
  );

  const isOwnComment = node.author_id === currentUserId;
  const isDeleted = Boolean(node.deleted_at);

  const ownVoteValue = commentVotes.find((v) => v.voter_id === currentUserId)?.value ?? null;

  async function handleVote(value: 1 | -1) {
    if (sessionState !== 'signed-in' || !currentUserId) {
      setIsVotePromptOpen(true);
      return;
    }

    setIsVotePromptOpen(false);
    setVoteSubmitting(true);
    setVoteError('');
    try {
      if (ownVoteValue === value) {
        await retractVote(node.id);
        onVoteRetracted(node.id, currentUserId);
      } else {
        const vote = await castVote({ commentId: node.id, value });
        onVoteCast(vote);
      }
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setVoteSubmitting(false);
    }
  }

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

  if (isCollapsed) {
    const replyCount = countDescendants(node);
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          aria-label="Expand comment thread"
          className="w-full max-w-2xl rounded-2xl p-5 flex items-baseline gap-2 text-left hover:opacity-80 transition-opacity"
          style={{
            backdropFilter: 'var(--intro-glass-filter)',
            WebkitBackdropFilter: 'var(--intro-glass-filter)',
            background: 'var(--intro-glass-bg)',
            border: '1px solid var(--intro-glass-border)',
            boxShadow: 'var(--intro-glass-shadow)',
          }}
        >
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
          <span
            className="text-gray-500 dark:text-gray-400"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '10pt' }}
          >
            · {replyCount} {replyCount === 1 ? 'reply' : 'replies'} ·{' '}
            <span aria-label="Net score">score {score}</span> · Expand
          </span>
        </button>
      </div>
    );
  }

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
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="ml-auto text-gray-500 dark:text-gray-400 hover:opacity-80 transition-opacity"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '10pt',
            }}
          >
            Collapse
          </button>
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

        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleVote(1)}
            disabled={voteSubmitting}
            aria-label="Upvote"
            aria-pressed={ownVoteValue === 1}
            className={`p-1 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 ${
              ownVoteValue === 1 ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <ChevronUp size={16} strokeWidth={ownVoteValue === 1 ? 3 : 2} />
          </button>
          <span
            aria-label="Net score"
            className="text-gray-700 dark:text-gray-300 min-w-[1.5ch] text-center"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '10pt' }}
          >
            {score}
          </span>
          <button
            type="button"
            onClick={() => handleVote(-1)}
            disabled={voteSubmitting}
            aria-label="Downvote"
            aria-pressed={ownVoteValue === -1}
            className={`p-1 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 ${
              ownVoteValue === -1 ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <ChevronDown size={16} strokeWidth={ownVoteValue === -1 ? 3 : 2} />
          </button>
        </div>
        {voteError && <p className="mt-1 text-red-500 text-sm">{voteError}</p>}

        {isVotePromptOpen && sessionState === 'signed-out' && (
          <div className="mt-3">
            <InlineSignIn />
          </div>
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
              votes={votes}
              onCommentPosted={onCommentPosted}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onVoteCast={onVoteCast}
              onVoteRetracted={onVoteRetracted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
