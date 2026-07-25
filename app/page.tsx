import { IntroCard } from '@/components/home/IntroCard';
import { ProjectsCarousel } from '@/components/home/ProjectsCarousel';
import { SkillsCard } from '@/components/home/SkillsCard';
import { fetchVisibleProjects } from '@/lib/actions/projects';

export default async function Home() {
  const projects = await fetchVisibleProjects();

  return (
    <main className="pt-16 pb-24">
      <IntroCard />
      <ProjectsCarousel projects={projects} />
      <SkillsCard />
    </main>
  );
}
