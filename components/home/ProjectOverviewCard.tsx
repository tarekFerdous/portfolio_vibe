import { projectOverviewSummary } from '@/lib/text';

interface ProjectOverviewCardProps {
  onGoToProjects: () => void;
}

export function ProjectOverviewCard({ onGoToProjects }: ProjectOverviewCardProps) {
  return (
    <div className="rounded-[24px] overflow-hidden mx-4 lg:mx-0">
      {/* Mobile: stacked layout (heading → photo → summary → button) */}
      <div className="flex flex-col lg:hidden">
        {/* Glass heading */}
        <div className="relative px-6 pt-8 pb-4">
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
          <div
            className="absolute inset-x-0 top-0 h-[30%] pointer-events-none z-[1]"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 100%)' }}
          />
          <h2
            className="relative z-10 text-gray-900 dark:text-gray-50"
            style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
          >
            Projects
          </h2>
        </div>
        {/* Photo placeholder */}
        <div className="h-[200px]" style={{ backgroundColor: '#8b5cf6' }} />
        {/* Glass summary + button */}
        <div className="relative px-6 pt-6 pb-8">
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
            className="relative z-10 text-gray-700 dark:text-gray-300 leading-relaxed"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '13pt',
            }}
          >
            {projectOverviewSummary}
          </p>
          <button
            onClick={onGoToProjects}
            className="relative z-10 mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
              fontSize: '13pt',
            }}
          >
            Go to projects →
          </button>
        </div>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden lg:flex flex-row min-h-[480px]">
        <div className="flex-1 relative">
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
          <div
            className="absolute inset-x-0 top-0 h-[30%] pointer-events-none z-[1]"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 100%)' }}
          />
          <div className="relative z-10 flex flex-col justify-center h-full px-8 py-10">
            <h2
              className="text-gray-900 dark:text-gray-50"
              style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '70px', lineHeight: 1.1 }}
            >
              Projects
            </h2>
            <p
              className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed max-w-md"
              style={{
                fontFamily: 'var(--font-recursive)',
                fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                fontSize: '15pt',
              }}
            >
              {projectOverviewSummary}
            </p>
            <button
              onClick={onGoToProjects}
              className="mt-8 self-start inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
              style={{
                fontFamily: 'var(--font-recursive)',
                fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                fontSize: '13pt',
              }}
            >
              Go to projects →
            </button>
          </div>
        </div>
        <div className="w-1/2" style={{ backgroundColor: '#8b5cf6' }} />
      </div>
    </div>
  );
}
