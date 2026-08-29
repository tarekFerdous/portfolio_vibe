import { ContactSection } from '@/components/home/ContactSection';
import { IntroCard } from '@/components/home/IntroCard';
import { ProjectsCarousel } from '@/components/home/ProjectsCarousel';
import { SkillsCard } from '@/components/home/SkillsCard';
import { fetchContacts } from '@/lib/actions/contacts';
import { fetchVisibleProjects } from '@/lib/actions/projects';

export default async function Home() {
  const [projects, contacts] = await Promise.all([fetchVisibleProjects(), fetchContacts()]);

  return (
    <main className="pt-16 pb-24">
      <IntroCard />
      <ProjectsCarousel projects={projects} />
      <SkillsCard />
      <ContactSection contacts={contacts} />
    </main>
  );
}
