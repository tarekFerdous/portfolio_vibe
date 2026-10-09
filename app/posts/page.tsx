import { PostsSection } from '@/components/home/PostsSection';
import { fetchPublishedPosts } from '@/lib/actions/posts';

export default async function PostsPage() {
  const posts = await fetchPublishedPosts();

  return (
    <main className="pt-16 pb-24">
      <PostsSection posts={posts} totalPublished={posts.length} />
    </main>
  );
}
