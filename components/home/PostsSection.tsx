import Link from 'next/link';
import { PostCard } from './PostCard';
import type { Blog } from '@/lib/supabase/types';

interface PostsSectionProps {
  posts: Blog[];
  totalPublished: number;
}

export function PostsSection({ posts, totalPublished }: PostsSectionProps) {
  const showLoadMore = totalPublished > posts.length;

  return (
    <section className="relative w-full lg:w-[70vw] mx-auto mt-16 px-4 lg:px-0">
      <h2
        className="text-gray-900 dark:text-gray-50"
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontWeight: 100,
          fontSize: 'clamp(56px, 5vw, 70px)',
          lineHeight: 1.1,
        }}
      >
        Posts
      </h2>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {showLoadMore && (
        <div className="mt-10 flex justify-center">
          <Link
            href="/posts"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '13pt',
            }}
          >
            Load more posts
          </Link>
        </div>
      )}
    </section>
  );
}
