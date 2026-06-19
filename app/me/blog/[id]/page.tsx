import { fetchBlogWithBlocks } from '@/lib/actions/blogs';
import { notFound } from 'next/navigation';
import { BlogEditorClient } from './BlogEditorClient';

export default async function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchBlogWithBlocks(id);
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Edit Post
      </h1>
      <BlogEditorClient blog={result.blog} initialBlocks={result.blocks} />
    </div>
  );
}
