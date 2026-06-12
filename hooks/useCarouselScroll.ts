'use client';

import { useRef, useState, useCallback, useEffect, RefObject } from 'react';

interface CarouselScrollOptions {
  snapCount: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}

interface CarouselScrollResult {
  currentIndex: number;
  scrollToIndex: (index: number) => void;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getSnapPositions(container: HTMLDivElement): number[] {
  const positions: number[] = [];
  for (const child of Array.from(container.children)) {
    const el = child as HTMLElement;
    if (el.offsetParent === null) continue; // skip display:none elements
    positions.push(el.offsetLeft);
  }
  return positions;
}

function getNearestSnapIndex(container: HTMLDivElement, snapPositions: number[]): number {
  const scrollLeft = container.scrollLeft;
  let nearest = 0;
  let minDist = Infinity;
  for (let i = 0; i < snapPositions.length; i++) {
    const dist = Math.abs(snapPositions[i] - scrollLeft);
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
    }
  }
  return nearest;
}

export function useCarouselScroll({ snapCount, scrollRef }: CarouselScrollOptions): CarouselScrollResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const animationRef = useRef<number | null>(null);

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < snapCount - 1;

  const scrollToIndex = useCallback((index: number) => {
    if (index < 0 || index >= snapCount) return;
    const container = scrollRef.current;
    if (!container) return;

    const snapPositions = getSnapPositions(container);
    if (!snapPositions[index]) return;

    // Account for scroll-padding-left (10% on lg)
    const isLg = window.innerWidth >= 1024;
    const scrollPadding = isLg ? container.clientWidth * 0.1 : 0;
    const targetScrollLeft = Math.max(0, snapPositions[index] - scrollPadding);

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const el: HTMLDivElement = container;
    const startScrollLeft = el.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const duration = 450;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.scrollLeft = startScrollLeft + distance * easeOutCubic(progress);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setCurrentIndex(index);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
    setCurrentIndex(index);
  }, [snapCount, scrollRef]);

  const syncIndexFromScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const snapPositions = getSnapPositions(container);
    const nearest = getNearestSnapIndex(container, snapPositions);
    setCurrentIndex(nearest);
  }, [scrollRef]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let scrollEndTimer: ReturnType<typeof setTimeout>;
    function onScroll() {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(syncIndexFromScroll, 100);
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(scrollEndTimer);
    };
  }, [scrollRef, syncIndexFromScroll]);

  return { currentIndex, scrollToIndex, canScrollLeft, canScrollRight };
}
