import { IntroCard } from '@/components/home/IntroCard';
import { ProjectsCarousel } from '@/components/home/ProjectsCarousel';
import { SkillsCard } from '@/components/home/SkillsCard';

export default function Home() {
  return (
    <main className="pt-16 pb-24">
      <IntroCard />
      <ProjectsCarousel />
      <SkillsCard />
    </main>
  );
}
