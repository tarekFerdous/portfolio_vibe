import Image from 'next/image';
import { ProjectPlaceholderIcon } from '@/components/home/ProjectPlaceholderIcon';
import { colorForId } from '@/lib/colors';
import type { Project } from '@/lib/supabase/types';

interface ProjectHeroProps {
  project: Project;
  /** Only passed for public repos — private repos would 404 for visitors. */
  githubUrl: string | null;
}

export function ProjectHero({ project, githubUrl }: ProjectHeroProps) {
  return (
    <header>
      <div
        data-testid="project-hero-cover"
        className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden"
        style={{ backgroundColor: project.bg_color ?? colorForId(project.id) }}
      >
        <ProjectPlaceholderIcon />
        {project.image_url && (
          <Image src={project.image_url} alt={project.name} fill priority className="object-cover" />
        )}
      </div>

      <h1
        className="mt-8 text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: 'clamp(48px, 5vw, 70px)', lineHeight: 1.1 }}
      >
        {project.name}
      </h1>

      {project.skills.length > 0 && (
        <ul aria-label="Skills" className="mt-4 flex flex-wrap gap-2">
          {project.skills.map((skill) => (
            <li
              key={skill}
              className="px-3 py-1 rounded-full text-sm bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300"
              style={{ fontFamily: 'var(--font-recursive)' }}
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          View on GitHub →
        </a>
      )}
    </header>
  );
}
