import { PostsSection } from '@/components/home/PostsSection';
import { fetchPublishedBlogs } from '@/lib/actions/blogs';

export default async function PostsPage() {
  const posts = await fetchPublishedBlogs();

  return (
    <main className="pt-16 pb-24">
      <PostsSection posts={posts} totalPublished={posts.length} />
    </main>
  );
}
