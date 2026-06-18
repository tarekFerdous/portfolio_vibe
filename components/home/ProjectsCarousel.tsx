'use client';

import { useRef, useEffect } from 'react';
import { projects } from '@/lib/text';
import { ProjectOverviewCard } from './ProjectOverviewCard';
import { ProjectCard } from './ProjectCard';
import { CarouselNavArrows } from './CarouselNavArrows';
import { useCarouselScroll } from '@/hooks/useCarouselScroll';

const SNAP_COUNT = 1 + projects.length;

function getBreakpointConstants() {
  if (typeof window === 'undefined') {
    return { INACTIVE_SCALE: 0.88, LEAN_VW: 4.2 };
  }
  const w = window.innerWidth;
  if (w >= 1024) return { INACTIVE_SCALE: 0.88, LEAN_VW: 4.2 };
  if (w >= 768) return { INACTIVE_SCALE: 0.9, LEAN_VW: 3.7 };
  return { INACTIVE_SCALE: 0.9, LEAN_VW: 3.9 };
}

export function ProjectsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wheelThrottleRef = useRef<boolean>(false);

  const { currentIndex, scrollToIndex, canScrollLeft, canScrollRight } =
    useCarouselScroll({
      snapCount: SNAP_COUNT,
      scrollRef,
    });

  function slotTransform(cardIndex: number): string {
    if (cardIndex === currentIndex) return 'scale(1)';
    const { INACTIVE_SCALE, LEAN_VW } = getBreakpointConstants();
    const dir = cardIndex < currentIndex ? 1 : -1;
    return `translateX(${dir * LEAN_VW}vw) scale(${INACTIVE_SCALE})`;
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (window.innerWidth < 1024) return;
      const scrollingForward = e.deltaY > 0 || e.deltaX > 0;
      const atStart = currentIndex === 0;
      const atEnd = currentIndex === SNAP_COUNT - 1;
      if ((atEnd && scrollingForward) || (atStart && !scrollingForward)) return;
      e.preventDefault();
      if (wheelThrottleRef.current) return;
      wheelThrottleRef.current = true;
      setTimeout(() => {
        wheelThrottleRef.current = false;
      }, 600);
      if (scrollingForward) {
        scrollToIndex(currentIndex + 1);
      } else {
        scrollToIndex(currentIndex - 1);
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentIndex, scrollToIndex]);

  return (
    <section id="projects" className="relative mt-6">
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-scroll snap-x snap-mandatory scroll-hidden [scroll-padding-left:11vw] md:[scroll-padding-left:13vw] lg:[scroll-padding-left:15vw]"
        >
          {/* Overview card */}
          <div
            className="flex-shrink-0 w-[78vw] md:w-[74vw] lg:w-[70vw] snap-start ml-[11vw] md:ml-[13vw] lg:ml-[14.5vw] lg:pr-[2.5vw]"
            style={{
              transition: 'transform 350ms ease-out',
              transform: slotTransform(0),
            }}
          >
            <ProjectOverviewCard onGoToProjects={() => scrollToIndex(1)} />
          </div>

          {/* Project cards */}
          {projects.map((project, idx) => (
            <div
              key={project.name}
              className="flex-shrink-0 w-[78vw] md:w-[74vw] lg:w-[70vw] snap-start"
              style={{
                transition: 'transform 350ms ease-out',
                transform: slotTransform(idx + 1),
              }}
            >
              <div className="lg:w-[65vw] lg:mx-auto">
                <ProjectCard project={project} />
              </div>
            </div>
          ))}

          {/* Trailing spacer: allows last card to scroll to center */}
          <div className="flex-shrink-0 w-[11vw] md:w-[13vw] lg:w-[12vw]" />
        </div>

        {/* Left gradient mask + click-to-retreat (lg only) */}
        {canScrollLeft && (
          <div
            onClick={() => scrollToIndex(currentIndex - 1)}
            className="hidden lg:block absolute left-0 inset-y-0 w-[15%] z-10 cursor-pointer"
            style={{
              background: 'linear-gradient(to right, var(--bg), transparent)',
            }}
          />
        )}

        {/* Right gradient mask + click-to-advance (lg only) */}
        {canScrollRight && (
          <div
            onClick={() => scrollToIndex(currentIndex + 1)}
            className="hidden lg:block absolute right-0 inset-y-0 w-[15%] z-10 cursor-pointer"
            style={{
              background: 'linear-gradient(to left, var(--bg), transparent)',
            }}
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
