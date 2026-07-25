import { fetchProjects } from '@/lib/actions/projects';
import { ProjectsManagerClient } from './ProjectsManagerClient';
import type { Project } from '@/lib/supabase/types';

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let fetchError: string | null = null;
  try {
    projects = await fetchProjects();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load projects.';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Projects
      </h1>
      <ProjectsManagerClient initialProjects={projects} fetchError={fetchError} />
    </div>
  );
}
