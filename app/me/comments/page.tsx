import { fetchAllCommentsForModeration } from '@/lib/actions/comments';
import { CommentsModerationClient } from '@/components/admin/CommentsModerationClient';
import type { CommentWithBlog } from '@/lib/supabase/types';

export default async function CommentsPage() {
  let comments: CommentWithBlog[] = [];
  let fetchError: string | null = null;
  try {
    comments = await fetchAllCommentsForModeration();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load comments.';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Comments
      </h1>
      <CommentsModerationClient initialComments={comments} fetchError={fetchError} />
    </div>
  );
}
