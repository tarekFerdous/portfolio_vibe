import { fetchBlogWithBlocks } from '@/lib/actions/blogs';
import { notFound } from 'next/navigation';
import { BlogEditorClient } from './BlogEditorClient';
import type { Blog, BlogBlock } from '@/lib/supabase/types';

export default async function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let result: { blog: Blog; blocks: BlogBlock[] } | null = null;
  let fetchError: string | null = null;
  try {
    result = await fetchBlogWithBlocks(id);
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
      <BlogEditorClient
        blog={result?.blog ?? null}
        initialBlocks={result?.blocks ?? []}
        fetchError={fetchError}
      />
    </div>
  );
}
