import Image from 'next/image';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { colorForId } from '@/lib/colors';
import type { Project } from '@/lib/supabase/types';
import { ProjectCardBody } from './ProjectCardBody';
import { ProjectPlaceholderIcon } from './ProjectPlaceholderIcon';

interface ProjectCardProps {
  project: Project;
  /** Whether this card is the centered carousel slot. Only the active card navigates. */
  isActive?: boolean;
  /** Called instead of navigating when a non-active card is clicked. */
  onActivate?: () => void;
}

export function ProjectCard({ project, isActive = true, onActivate }: ProjectCardProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (isActive) return;
    e.preventDefault();
    onActivate?.();
  }

  return (
    <Link
      href={`/projects/${project.slug}`}
      onClick={handleClick}
      aria-label={`${project.name} — view project`}
      className="block cursor-pointer rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-50 focus-visible:ring-offset-2"
    >
      <ProjectCardBody
        title={project.name}
        summary={project.summary}
        buttonLabel="Learn More →"
        showSummaryToggle={false}
        photo={
          // Photo — fixed height on mobile/medium (consistent across every card), right half on desktop
          <div
            className="relative flex-shrink-0 h-[20vh] min-h-[150px] lg:h-auto lg:min-h-0 lg:flex-none lg:w-1/2"
            style={{
              backgroundColor: project.bg_color ?? colorForId(project.id),
            }}
          >
            <ProjectPlaceholderIcon />
            {project.image_url && (
              <Image
                src={project.image_url}
                alt={project.name}
                fill
                className="object-cover"
              />
            )}
          </div>
        }
      />
    </Link>
  );
}
