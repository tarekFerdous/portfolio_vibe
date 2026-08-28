import { projectOverviewSummary } from '@/lib/text';
import { ProjectCardBody } from './ProjectCardBody';

interface ProjectOverviewCardProps {
  onGoToProjects: () => void;
}

export function ProjectOverviewCard({ onGoToProjects }: ProjectOverviewCardProps) {
  return (
    <ProjectCardBody
      title="Projects"
      summary={projectOverviewSummary}
      buttonLabel="Go to projects →"
      onButtonClick={onGoToProjects}
      photo={
        // Color accent — fixed height on mobile/medium (consistent across every card), right half on desktop
        <div
          className="relative flex-shrink-0 h-[20vh] min-h-[150px] lg:h-auto lg:min-h-0 lg:flex-none lg:w-1/2"
          style={{ backgroundColor: '#8b5cf6' }}
        />
      }
    />
  );
}
