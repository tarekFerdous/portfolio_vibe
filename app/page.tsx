import { IntroCard } from '@/components/home/IntroCard';
import { GlassCard } from '@/components/home/GlassCard';
import { projects_text, skills_text } from '@/lib/text';

export default function Home() {
  return (
    <main className="pt-16 pb-24">
      <IntroCard />
      <GlassCard title="Projects" body={projects_text} />
      <GlassCard title="Skills" body={skills_text} />
    </main>
  );
}
