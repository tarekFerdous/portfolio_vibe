import Image from 'next/image';
import Link from 'next/link';
import { colorForId } from '@/lib/colors';
import type { Blog } from '@/lib/supabase/types';

interface PostCardProps {
  post: Blog;
}

function formatPublishDate(publishDate: string | null): string | null {
  if (!publishDate) return null;
  return new Date(publishDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function PostCard({ post }: PostCardProps) {
  const formattedDate = formatPublishDate(post.publish_date);

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group relative flex flex-col rounded-[24px] overflow-hidden h-full"
      style={{
        backdropFilter: 'var(--intro-glass-filter)',
        WebkitBackdropFilter: 'var(--intro-glass-filter)',
        background: 'var(--intro-glass-bg)',
        border: '1px solid var(--intro-glass-border)',
        boxShadow: 'var(--intro-glass-shadow)',
      }}
    >
      <div
        className="relative w-full aspect-[16/9] flex-shrink-0"
        style={{ backgroundColor: colorForId(post.id) }}
      >
        {post.cover_image_url && (
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-6 py-6">
        <h3
          className="text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '28px', lineHeight: 1.15 }}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p
            className="mt-3 text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '13pt',
            }}
          >
            {post.excerpt}
          </p>
        )}
        <div
          className="mt-auto pt-4 text-gray-500 dark:text-gray-400"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '11px',
          }}
        >
          <p>{post.author}</p>
          <p className="mt-1">
            {[formattedDate, post.location].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </Link>
  );
}
