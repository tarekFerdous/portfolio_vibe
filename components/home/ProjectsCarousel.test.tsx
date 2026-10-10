import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectsCarousel } from './ProjectsCarousel';
import { useCarouselScroll } from '@/hooks/useCarouselScroll';
import type { Project } from '@/lib/supabase/types';

vi.mock('@/hooks/useCarouselScroll');

// Plain anchor stand-in so a click's default action (navigation) is observable
// without an app router mounted.
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeProject(index: number): Project {
  return {
    id: `project-${index}`,
    name: `Project ${index}`,
    slug: `project-${index}`,
    repo_url: null,
    summary: `Summary ${index}`,
    project_description: `Description ${index}`,
    image_url: null,
    bg_color: '#123456',
    skills: [],
    display_order: index,
    visibility: 'visible',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

// SNAP_COUNT = 1 (overview card) + projects.length
const twoProjects = [makeProject(1), makeProject(2)];

function mockCarouselScroll(overrides: {
  currentIndex: number;
  canScrollLeft?: boolean;
  canScrollRight?: boolean;
}) {
  const scrollToIndex = vi.fn();
  vi.mocked(useCarouselScroll).mockReturnValue({
    currentIndex: overrides.currentIndex,
    scrollToIndex,
    canScrollLeft: overrides.canScrollLeft ?? true,
    canScrollRight: overrides.canScrollRight ?? true,
  });
  return scrollToIndex;
}

function dispatchWheel(target: Element, deltaY: number) {
  target.dispatchEvent(
    new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }),
  );
}

describe('ProjectsCarousel wheel scrolling', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('advances exactly one card immediately for a single wheel event (mouse-wheel notch)', () => {
    const scrollToIndex = mockCarouselScroll({ currentIndex: 0 });
    render(<ProjectsCarousel projects={twoProjects} />);
    const scrollContainer = screen.getByTestId('projects-carousel-scroll');

    dispatchWheel(scrollContainer, 100);

    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).toHaveBeenCalledWith(1);
  });

  it('advances exactly one card for a burst of many closely-spaced small-delta wheel events (trackpad flick)', () => {
    const scrollToIndex = mockCarouselScroll({ currentIndex: 0 });
    render(<ProjectsCarousel projects={twoProjects} />);
    const scrollContainer = screen.getByTestId('projects-carousel-scroll');

    // Simulate one trackpad flick: ~30 momentum events at roughly 60fps,
    // with the gaps between events widening as momentum decays — but never
    // exceeding the 350ms idle-unlock threshold within the same gesture.
    for (let i = 0; i < 30; i++) {
      dispatchWheel(scrollContainer, 3);
      vi.advanceTimersByTime(16);
    }
    // Let the gesture go fully idle afterward.
    vi.advanceTimersByTime(400);

    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).toHaveBeenCalledWith(1);
  });

  it('does not advance past the last card when scrolling forward at the end', () => {
    const scrollToIndex = mockCarouselScroll({
      currentIndex: 2, // SNAP_COUNT - 1 for twoProjects (1 overview + 2 projects)
      canScrollRight: false,
    });
    render(<ProjectsCarousel projects={twoProjects} />);
    const scrollContainer = screen.getByTestId('projects-carousel-scroll');

    dispatchWheel(scrollContainer, 100);

    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('does not retreat past the first card when scrolling backward at the start', () => {
    const scrollToIndex = mockCarouselScroll({
      currentIndex: 0,
      canScrollLeft: false,
    });
    render(<ProjectsCarousel projects={twoProjects} />);
    const scrollContainer = screen.getByTestId('projects-carousel-scroll');

    dispatchWheel(scrollContainer, -100);

    expect(scrollToIndex).not.toHaveBeenCalled();
  });
});

describe('ProjectsCarousel card clicks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function cardLink(name: string) {
    return screen.getByRole('link', { name: new RegExp(`^${name} — view project`) });
  }

  it('lets a click on the active card navigate to its project page', () => {
    const scrollToIndex = mockCarouselScroll({ currentIndex: 1 });
    render(<ProjectsCarousel projects={twoProjects} />);
    const link = cardLink('Project 1');

    expect(link).toHaveAttribute('href', '/projects/project-1');
    const notCancelled = fireEvent.click(link);

    expect(notCancelled).toBe(true);
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('scrolls a non-active card to the center instead of navigating', () => {
    const scrollToIndex = mockCarouselScroll({ currentIndex: 1 });
    render(<ProjectsCarousel projects={twoProjects} />);
    const link = cardLink('Project 2');

    const notCancelled = fireEvent.click(link);

    expect(notCancelled).toBe(false);
    expect(scrollToIndex).toHaveBeenCalledWith(2);
  });

  it('makes cards keyboard-focusable links with a pointer cursor', () => {
    mockCarouselScroll({ currentIndex: 1 });
    render(<ProjectsCarousel projects={twoProjects} />);
    const link = cardLink('Project 1');

    link.focus();
    expect(link).toHaveFocus();
    expect(link.className).toContain('cursor-pointer');
  });
});
