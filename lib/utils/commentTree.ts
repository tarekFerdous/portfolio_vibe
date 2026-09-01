import type { Comment, CommentVote } from '@/lib/supabase/types';

export type CommentNode = Comment & { children: CommentNode[] };

export type SortMode = 'top' | 'newest';

/**
 * Assembles a flat, already-fetched comment list into a nested tree keyed by
 * `parent_comment_id`, in a single pass (Map lookup + link) — no recursive
 * refetching. Input order (server-side `created_at ascending`) is preserved
 * rather than re-sorted, so sibling order matches fetch order at every depth.
 * A comment whose `parent_comment_id` doesn't resolve to another comment in
 * the list is treated as a root (simplest safe fallback for an orphaned row).
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodesById = new Map<string, CommentNode>();
  for (const comment of comments) {
    nodesById.set(comment.id, { ...comment, children: [] });
  }

  const roots: CommentNode[] = [];
  for (const comment of comments) {
    const node = nodesById.get(comment.id);
    if (!node) {
      continue;
    }
    const parent = comment.parent_comment_id ? nodesById.get(comment.parent_comment_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Reorders siblings at every level of an already-built tree without moving
 * any node to a different parent. Returns a fresh tree (new arrays/objects)
 * so it's safe to call on every render.
 */
export function sortCommentTree(nodes: CommentNode[], mode: SortMode, votes: CommentVote[]): CommentNode[] {
  const scoreOf = (node: CommentNode) => votes.filter((v) => v.comment_id === node.id).reduce((sum, v) => sum + v.value, 0);

  const sorted = [...nodes].sort((a, b) =>
    mode === 'top'
      ? scoreOf(b) - scoreOf(a)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return sorted.map((node) => ({ ...node, children: sortCommentTree(node.children, mode, votes) }));
}
