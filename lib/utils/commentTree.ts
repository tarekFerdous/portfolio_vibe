import type { Comment } from '@/lib/supabase/types';

export type CommentNode = Comment & { children: CommentNode[] };

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
