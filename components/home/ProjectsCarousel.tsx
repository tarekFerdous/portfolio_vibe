'use client';

import { useRef, useEffect } from 'react';
import { projects, type ProjectEntry } from '@/lib/text';
import { ProjectOverviewCard } from './ProjectOverviewCard';
import { ProjectCard } from './ProjectCard';
import { CarouselNavArrows } from './CarouselNavArrows';
import { useCarouselScroll } from '@/hooks/useCarouselScroll';

const pairs: ProjectEntry[][] = [];
for (let i = 0; i < projects.length; i += 2) {
  pairs.push(projects.slice(i, i + 2));
}

// Large: 1 overview + pairs. Small: 1 overview + each project individually.
const SNAP_COUNT_LG = 1 + pairs.length;
const SNAP_COUNT_SM = 1 + projects.length;

export function ProjectsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wheelThrottleRef = useRef<boolean>(false);

  const snapCount = typeof window !== 'undefined' && window.innerWidth >= 1024
    ? SNAP_COUNT_LG
    : SNAP_COUNT_SM;

  const { currentIndex, scrollToIndex, canScrollLeft, canScrollRight } = useCarouselScroll({
    snapCount,
    scrollRef,
  });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (window.innerWidth < 1024) return;
      e.preventDefault();
      if (wheelThrottleRef.current) return;
      wheelThrottleRef.current = true;
      setTimeout(() => { wheelThrottleRef.current = false; }, 600);
      if (e.deltaY > 0 || e.deltaX > 0) {
        scrollToIndex(Math.min(currentIndex + 1, SNAP_COUNT_LG - 1));
      } else {
        scrollToIndex(Math.max(currentIndex - 1, 0));
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentIndex, scrollToIndex]);

  return (
    <section id="projects" className="relative mt-6 lg:w-[90vw] lg:mx-auto">
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-scroll snap-x snap-mandatory scroll-hidden lg:[scroll-padding-left:10%]"
        >
          {/* Overview card — 90% on lg, 85% on mobile */}
          <div className="flex-shrink-0 w-[85%] lg:w-[90%] snap-start">
            <ProjectOverviewCard onGoToProjects={() => scrollToIndex(1)} />
          </div>

          {/* On large: pair wrappers. On mobile: individual card wrappers side by side.
              We render both structures and use CSS to show/hide the relevant one. */}

          {/* Mobile-only: individual cards (each 85% wide) */}
          {projects.map((project) => (
            <div key={`sm-${project.name}`} className="flex-shrink-0 w-[85%] snap-start lg:hidden">
              <ProjectCard project={project} />
            </div>
          ))}

          {/* Desktop-only: pair wrappers */}
          {pairs.map((pair, pairIdx) => {
            const isLone = pair.length === 1;
            return (
              <div
                key={`lg-${pairIdx}`}
                className={`flex-shrink-0 snap-start hidden lg:flex ${
                  isLone ? 'lg:w-[90%]' : 'lg:w-[80%]'
                }`}
              >
                {pair.map((project) => (
                  <div key={project.name} className={isLone ? 'w-full' : 'w-1/2'}>
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Left gradient mask + click-to-retreat (lg only) */}
        {canScrollLeft && (
          <div
            onClick={() => scrollToIndex(currentIndex - 1)}
            className="hidden lg:block absolute left-0 inset-y-0 w-[10%] z-10 cursor-pointer"
            style={{ background: 'linear-gradient(to right, var(--bg), transparent)' }}
          />
        )}

        {/* Right gradient mask + click-to-advance (lg only) */}
        {canScrollRight && (
          <div
            onClick={() => scrollToIndex(currentIndex + 1)}
            className="hidden lg:block absolute right-0 inset-y-0 w-[10%] z-10 cursor-pointer"
            style={{ background: 'linear-gradient(to left, var(--bg), transparent)' }}
          />
        )}

        {/* Nav arrows (mobile/medium only) */}
        <CarouselNavArrows
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onLeft={() => scrollToIndex(currentIndex - 1)}
          onRight={() => scrollToIndex(currentIndex + 1)}
        />
      </div>
    </section>
  );
}
