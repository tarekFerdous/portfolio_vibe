import Image from 'next/image';
import { notFound } from 'next/navigation';
import { fetchPublishedBlogBySlug } from '@/lib/actions/blogs';
import { colorForId } from '@/lib/colors';
import type { BlogBlock } from '@/lib/supabase/types';

function formatPublishDate(publishDate: string | null): string | null {
  if (!publishDate) return null;
  return new Date(publishDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function PostBlock({ block }: { block: BlogBlock }) {
  if (block.block_type === 'text') {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: block.content ?? '' }}
      />
    );
  }

  if (!block.image_url) return null;

  return (
    <div className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden">
      <Image src={block.image_url} alt="" fill className="object-cover" />
    </div>
  );
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await fetchPublishedBlogBySlug(slug);
  if (!result) notFound();
  const { blog, blocks } = result;

  const formattedDate = formatPublishDate(blog.publish_date);
  const dateline = [blog.author, formattedDate, blog.location].filter(Boolean).join(' · ');

  return (
    <main className="pt-16 pb-24">
      <section className="relative w-full lg:w-[70vw] mx-auto px-4 lg:px-0">
        <div
          className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden"
          style={{ backgroundColor: colorForId(blog.id) }}
        >
          {blog.cover_image_url && (
            <Image src={blog.cover_image_url} alt={blog.title} fill className="object-cover" />
          )}
        </div>

        <h1
          className="mt-8 text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: 'clamp(56px, 5vw, 70px)', lineHeight: 1.1 }}
        >
          {blog.title}
        </h1>

        <p
          className="mt-3 text-gray-500 dark:text-gray-400"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          {dateline}
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {blocks.map((block) => (
            <PostBlock key={block.id} block={block} />
          ))}
        </div>
      </section>
    </main>
  );
}
