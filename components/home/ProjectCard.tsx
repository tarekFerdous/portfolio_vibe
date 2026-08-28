import Image from 'next/image';
import { colorForId } from '@/lib/colors';
import type { Project } from '@/lib/supabase/types';
import { ProjectCardBody } from './ProjectCardBody';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <ProjectCardBody
      title={project.name}
      summary={project.summary}
      buttonLabel="Learn More →"
      photo={
        // Photo — fixed height on mobile/medium (consistent across every card), right half on desktop
        <div
          className="relative flex-shrink-0 h-[20vh] min-h-[150px] lg:h-auto lg:min-h-0 lg:flex-none lg:w-1/2"
          style={{ backgroundColor: project.bg_color ?? colorForId(project.id) }}
        >
          {project.image_url && (
            <Image src={project.image_url} alt={project.name} fill className="object-cover" />
          )}
        </div>
      }
    />
  );
}
