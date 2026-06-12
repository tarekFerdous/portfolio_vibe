import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCarouselScroll } from './useCarouselScroll';
import type { RefObject } from 'react';

function makeScrollRef(childCount: number, containerWidth = 1000): RefObject<HTMLDivElement> {
  const children = Array.from({ length: childCount }, (_, i) => ({
    offsetLeft: i * containerWidth,
  })) as unknown as HTMLCollectionOf<Element>;

  const div = {
    scrollLeft: 0,
    scrollWidth: childCount * containerWidth,
    clientWidth: containerWidth,
    children,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLDivElement;

  return { current: div };
}

beforeEach(() => {
  // Instant rAF so animations complete synchronously in tests
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(performance.now() + 500); // jump past animation duration
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('performance', { now: () => 0 });
});

describe('useCarouselScroll', () => {
  it('starts at index 0 with canScrollLeft false and canScrollRight true', () => {
    const scrollRef = makeScrollRef(4);
    const { result } = renderHook(() =>
      useCarouselScroll({ snapCount: 4, scrollRef })
    );
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canScrollLeft).toBe(false);
    expect(result.current.canScrollRight).toBe(true);
  });

  it('scrollToIndex updates currentIndex', () => {
    const scrollRef = makeScrollRef(4);
    const { result } = renderHook(() =>
      useCarouselScroll({ snapCount: 4, scrollRef })
    );
    act(() => { result.current.scrollToIndex(2); });
    expect(result.current.currentIndex).toBe(2);
  });

  it('canScrollRight is false at the last index', () => {
    const scrollRef = makeScrollRef(4);
    const { result } = renderHook(() =>
      useCarouselScroll({ snapCount: 4, scrollRef })
    );
    act(() => { result.current.scrollToIndex(3); });
    expect(result.current.canScrollRight).toBe(false);
  });

  it('canScrollLeft is true after advancing from first index', () => {
    const scrollRef = makeScrollRef(4);
    const { result } = renderHook(() =>
      useCarouselScroll({ snapCount: 4, scrollRef })
    );
    act(() => { result.current.scrollToIndex(1); });
    expect(result.current.canScrollLeft).toBe(true);
  });

  it('scrollToIndex with out-of-bounds index is a no-op', () => {
    const scrollRef = makeScrollRef(4);
    const { result } = renderHook(() =>
      useCarouselScroll({ snapCount: 4, scrollRef })
    );
    act(() => { result.current.scrollToIndex(-1); });
    expect(result.current.currentIndex).toBe(0);
    act(() => { result.current.scrollToIndex(4); });
    expect(result.current.currentIndex).toBe(0);
  });
});
