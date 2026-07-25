import Image from 'next/image';
import { colorForId } from '@/lib/colors';
import type { Project } from '@/lib/supabase/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="h-[85vh] min-h-[650px] lg:h-[480px] lg:min-h-0 rounded-[24px] overflow-hidden flex flex-col lg:flex-row">
      {/* Mobile/medium: glass heading (title only) — fixed height, sized for the longest real project name */}
      <div className="lg:hidden relative flex-shrink-0 flex items-center h-[90px] px-6">
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'var(--intro-glass-filter)',
            WebkitBackdropFilter: 'var(--intro-glass-filter)',
            background: 'var(--intro-glass-bg)',
            border: '1px solid var(--intro-glass-border)',
            boxShadow: 'var(--intro-glass-shadow)',
          }}
        />
        <h2
          className="relative z-10 text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '26px', lineHeight: 1.15 }}
        >
          {project.name}
        </h2>
      </div>

      {/* Desktop: glass panel (title + summary + button, left side) */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-center px-8 py-10">
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'var(--intro-glass-filter)',
            WebkitBackdropFilter: 'var(--intro-glass-filter)',
            background: 'var(--intro-glass-bg)',
            border: '1px solid var(--intro-glass-border)',
            boxShadow: 'var(--intro-glass-shadow)',
          }}
        />
        <h2
          className="relative z-10 text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '70px', lineHeight: 1.1 }}
        >
          {project.name}
        </h2>
        <p
          className="relative z-10 mt-4 text-gray-700 dark:text-gray-300 leading-relaxed max-w-md"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '15pt',
          }}
        >
          {project.summary}
        </p>
        <button
          className="relative z-10 mt-8 self-start inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          Learn More →
        </button>
      </div>

      {/* Photo — fixed height on mobile/medium (consistent across every card), right half on desktop */}
      <div
        className="relative flex-shrink-0 h-[20vh] min-h-[150px] lg:h-auto lg:min-h-0 lg:flex-none lg:w-1/2"
        style={{ backgroundColor: project.bg_color ?? colorForId(project.id) }}
      >
        {project.image_url && (
          <Image src={project.image_url} alt={project.name} fill className="object-cover" />
        )}
      </div>

      {/* Mobile/medium: glass summary + button — takes the remaining height, button anchored to the bottom */}
      <div className="lg:hidden relative flex-1 flex flex-col px-6 pt-4 pb-6">
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'var(--intro-glass-filter)',
            WebkitBackdropFilter: 'var(--intro-glass-filter)',
            background: 'var(--intro-glass-bg)',
            border: '1px solid var(--intro-glass-border)',
            boxShadow: 'var(--intro-glass-shadow)',
          }}
        />
        <p
          className="relative z-10 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          {project.summary}
        </p>
        <button
          className="relative z-10 mt-auto inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity self-start"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          Learn More →
        </button>
      </div>
    </div>
  );
}
