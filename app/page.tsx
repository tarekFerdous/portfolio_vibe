import { IntroCard } from '@/components/home/IntroCard';
import { GlassCard } from '@/components/home/GlassCard';
import { ProjectsCarousel } from '@/components/home/ProjectsCarousel';
import { skills_text } from '@/lib/text';

export default function Home() {
  return (
    <main className="pt-16 pb-24">
      <IntroCard />
      <ProjectsCarousel />
      <GlassCard title="Skills" body={skills_text} />
    </main>
  );
}
