interface CarouselNavArrowsProps {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onLeft: () => void;
  onRight: () => void;
}

export function CarouselNavArrows({ canScrollLeft, canScrollRight, onLeft, onRight }: CarouselNavArrowsProps) {
  return (
    <>
      {canScrollLeft && (
        <button
          onClick={onLeft}
          aria-label="Previous"
          className="lg:hidden absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-gray-900/70 dark:bg-white/20 text-white backdrop-blur-sm shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={onRight}
          aria-label="Next"
          className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-gray-900/70 dark:bg-white/20 text-white backdrop-blur-sm shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </>
  );
}
