import { ContactSection } from '@/components/home/ContactSection';
import { IntroCard } from '@/components/home/IntroCard';
import { PostsSection } from '@/components/home/PostsSection';
import { ProjectsCarousel } from '@/components/home/ProjectsCarousel';
import { SkillsCard } from '@/components/home/SkillsCard';
import { fetchPublishedBlogs } from '@/lib/actions/blogs';
import { fetchContacts } from '@/lib/actions/contacts';
import { fetchVisibleProjects } from '@/lib/actions/projects';

export default async function Home() {
  const [projects, posts, contacts] = await Promise.all([
    fetchVisibleProjects(),
    fetchPublishedBlogs(),
    fetchContacts(),
  ]);
  const homepagePosts = posts.slice(0, 5);

  return (
    <main className="pt-16 pb-24">
      <IntroCard />
      <ProjectsCarousel projects={projects} />
      <SkillsCard />
      <PostsSection posts={homepagePosts} totalPublished={posts.length} />
      <ContactSection contacts={contacts} />
    </main>
  );
}
