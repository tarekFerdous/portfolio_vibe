import { fetchProjects } from '@/lib/actions/projects';
import { ProjectsManagerClient } from './ProjectsManagerClient';

export default async function ProjectsPage() {
  const projects = await fetchProjects();

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Projects
      </h1>
      <ProjectsManagerClient initialProjects={projects} />
    </div>
  );
}
