import { fetchPostWithBlocks } from '@/lib/actions/posts';
import { notFound } from 'next/navigation';
import { PostEditorClient } from './PostEditorClient';
import type { Post, PostBlock } from '@/lib/supabase/types';

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let result: { post: Post; blocks: PostBlock[] } | null = null;
  let fetchError: string | null = null;
  try {
    result = await fetchPostWithBlocks(id);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load post.';
  }

  if (!result && !fetchError) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Edit Post
      </h1>
      <PostEditorClient
        post={result?.post ?? null}
        initialBlocks={result?.blocks ?? []}
        fetchError={fetchError}
      />
    </div>
  );
}
