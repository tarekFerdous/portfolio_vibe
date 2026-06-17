'use client';

import { useRef, useEffect } from 'react';
import { projects } from '@/lib/text';
import { ProjectOverviewCard } from './ProjectOverviewCard';
import { ProjectCard } from './ProjectCard';
import { CarouselNavArrows } from './CarouselNavArrows';
import { useCarouselScroll } from '@/hooks/useCarouselScroll';

const SNAP_COUNT = 1 + projects.length;
const INACTIVE_SCALE = 0.88;
const SLOT_VW = 70;
// translateX that closes the gap left by center-origin scale, so peeking cards sit flush against the active card
const LEAN_VW = (SLOT_VW * (1 - INACTIVE_SCALE)) / 2; // 4.2vw

export function ProjectsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wheelThrottleRef = useRef<boolean>(false);

  const { currentIndex, scrollToIndex, canScrollLeft, canScrollRight } = useCarouselScroll({
    snapCount: SNAP_COUNT,
    scrollRef,
  });

  function slotTransform(cardIndex: number): string {
    if (cardIndex === currentIndex) return 'scale(1)';
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
      setTimeout(() => { wheelThrottleRef.current = false; }, 600);
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
          className="flex overflow-x-scroll snap-x snap-mandatory scroll-hidden lg:[scroll-padding-left:15vw]"
        >
          {/* Overview card */}
          <div
            className="flex-shrink-0 w-[85%] lg:w-[70vw] snap-start lg:ml-[15vw]"
            style={{ transition: 'transform 350ms ease-out', transform: slotTransform(0) }}
          >
            <ProjectOverviewCard onGoToProjects={() => scrollToIndex(1)} />
          </div>

          {/* Mobile-only: individual cards (each 85% wide) */}
          {projects.map((project) => (
            <div key={`sm-${project.name}`} className="flex-shrink-0 w-[85%] snap-start lg:hidden">
              <ProjectCard project={project} />
            </div>
          ))}

          {/* Desktop-only: one card per snap stop in a 70vw slot */}
          {projects.map((project, idx) => {
            const snapIndex = idx + 1;
            const isLast = idx === projects.length - 1;
            return (
              <div
                key={`lg-${project.name}`}
                className="flex-shrink-0 snap-start hidden lg:flex lg:w-[70vw]"
                style={{ transition: 'transform 350ms ease-out', transform: slotTransform(snapIndex) }}
              >
                <div className={isLast ? 'w-full' : 'w-[65vw] mx-auto'}>
                  <ProjectCard project={project} />
                </div>
              </div>
            );
          })}

          {/* Trailing spacer: 15vw so the last card can scroll to center (matches the 15vw left offset) */}
          <div className="hidden lg:block flex-shrink-0 w-[15vw]" />
        </div>

        {/* Left gradient mask + click-to-retreat (lg only) */}
        {canScrollLeft && (
          <div
            onClick={() => scrollToIndex(currentIndex - 1)}
            className="hidden lg:block absolute left-0 inset-y-0 w-[15%] z-10 cursor-pointer"
            style={{ background: 'linear-gradient(to right, var(--bg), transparent)' }}
          />
        )}

        {/* Right gradient mask + click-to-advance (lg only) */}
        {canScrollRight && (
          <div
            onClick={() => scrollToIndex(currentIndex + 1)}
            className="hidden lg:block absolute right-0 inset-y-0 w-[15%] z-10 cursor-pointer"
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
