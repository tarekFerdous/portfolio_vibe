import { fetchBlogs } from '@/lib/actions/blogs';
import { BlogListClient } from './BlogListClient';

export default async function BlogPage() {
  const blogs = await fetchBlogs();

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Blog
      </h1>
      <BlogListClient initialBlogs={blogs} />
    </div>
  );
}
