import { useState, type ReactNode } from 'react';

interface ProjectCardBodyProps {
  title: string;
  summary: string;
  buttonLabel: string;
  onButtonClick?: () => void;
  photo: ReactNode;
}

// Fluid font sizes: reproduce the previous fixed size (26px mobile, 70px desktop)
// at a 390px / 1440px reference width, shrink continuously toward the min bound
// as the viewport narrows, and grow modestly toward the max bound on very wide
// monitors — same clamp() technique as `SkillsCard`'s title.
const MOBILE_TITLE_FONT_SIZE = 'clamp(22px, 6.67vw, 32px)';
const DESKTOP_TITLE_FONT_SIZE = 'clamp(44px, 4.86vw, 84px)';
const DESKTOP_TITLE_LINE_HEIGHT = 1.1;

// Character-count heuristic for whether a summary needs a "See more" control.
// Real `scrollHeight` overflow measurement isn't reliable in jsdom tests, so
// length is used as a proxy for "long enough to overflow the 3-line clamp".
// The `projects` table caps summaries at 300 chars (migration
// 006_add_project_summary_length_constraint.sql); the longest real summary
// today (Enki App) is 230 chars and the static projects-overview copy
// (`lib/text.ts`) is 191 chars — both must truncate. 140 sits comfortably
// below both while staying clear of short summaries.
const SUMMARY_TRUNCATE_THRESHOLD_CHARS = 140;

// Collapsed summary is clamped to 3 lines. `leading-relaxed` is a 1.625
// line-height multiplier, so this em value (relative to the paragraph's own
// font-size) matches the line-clamp box height and gives the max-height
// transition a sensible collapsed target; the expanded target is just a
// generous upper bound so the reveal animates rather than snapping open.
const SUMMARY_COLLAPSED_MAX_HEIGHT = '4.875em';
const SUMMARY_EXPANDED_MAX_HEIGHT = '40em';

const CARD_HEIGHT_COLLAPSED = 'h-[85vh] min-h-[650px] lg:h-[480px] lg:min-h-0';
const CARD_HEIGHT_EXPANDED = 'h-auto min-h-[650px] lg:min-h-[480px]';

/**
 * Shared title/summary/button layout for project-style cards (mobile + desktop
 * variants), used by both `ProjectCard` and `ProjectOverviewCard`. The `photo`
 * slot is rendered between the desktop panel and the mobile summary block so
 * callers can supply their own image/color-accent markup while keeping the
 * same DOM order as before.
 *
 * Also owns the outer card-height wrapper (rather than each caller) because
 * the collapsed/expanded summary state lives here: expanding a card needs to
 * relax the outer fixed height to fit the fully revealed summary, and that
 * state is local to this component instance, so sibling cards are unaffected.
 */
export function ProjectCardBody({
  title,
  summary,
  buttonLabel,
  onButtonClick,
  photo,
}: ProjectCardBodyProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const needsTruncation = summary.length > SUMMARY_TRUNCATE_THRESHOLD_CHARS;
  const isTruncated = needsTruncation && !isExpanded;

  function handleToggleExpanded() {
    setIsExpanded((expanded) => !expanded);
  }

  function renderSummaryToggle() {
    if (!needsTruncation) {
      return null;
    }
    return (
      <button
        type="button"
        onClick={handleToggleExpanded}
        aria-expanded={isExpanded}
        className="relative z-10 mt-2 self-start text-gray-900 dark:text-gray-50 underline underline-offset-2 hover:opacity-70 transition-opacity"
        style={{
          fontFamily: 'var(--font-recursive)',
          fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
          fontSize: '12pt',
        }}
      >
        {isExpanded ? 'See less' : 'See more'}
      </button>
    );
  }

  return (
    <div
      className={`${isExpanded ? CARD_HEIGHT_EXPANDED : CARD_HEIGHT_COLLAPSED} rounded-[24px] overflow-hidden flex flex-col lg:flex-row`}
    >
      {/* Mobile/medium: glass heading (title only) — sized for the longest real project name,
          min-height (not height) so a rare 3-line title grows the box instead of overlapping
          the summary below */}
      <div className="lg:hidden relative flex-shrink-0 flex items-center min-h-[90px] px-6">
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
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: MOBILE_TITLE_FONT_SIZE, lineHeight: 1.15 }}
        >
          {title}
        </h2>
      </div>

      {/* Desktop: glass panel (title + summary + button, left side) — top-anchored,
          button pinned to the bottom via mt-auto so it lands in the same spot
          regardless of title/summary length */}
      <div className="hidden lg:flex flex-1 relative flex-col px-8 py-10">
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
        {/* Title zone — reserves height for two lines at the current fluid font
            size, so the summary/button below don't shift between 1-line and
            2-line titles. min-height (not a fixed height) so a rare 3-line
            title grows the box instead of overlapping the summary below. */}
        <div
          className="relative z-10 flex-shrink-0"
          style={{ minHeight: `calc(${DESKTOP_TITLE_FONT_SIZE} * ${DESKTOP_TITLE_LINE_HEIGHT * 2})` }}
        >
          <h2
            className="text-gray-900 dark:text-gray-50"
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              fontWeight: 100,
              fontSize: DESKTOP_TITLE_FONT_SIZE,
              lineHeight: DESKTOP_TITLE_LINE_HEIGHT,
            }}
          >
            {title}
          </h2>
        </div>
        <p
          className={`relative z-10 mt-4 text-gray-700 dark:text-gray-300 leading-relaxed max-w-md overflow-hidden transition-[max-height] duration-300 ease-in-out${isTruncated ? ' line-clamp-3' : ''}`}
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '15pt',
            maxHeight: isTruncated ? SUMMARY_COLLAPSED_MAX_HEIGHT : SUMMARY_EXPANDED_MAX_HEIGHT,
          }}
        >
          {summary}
        </p>
        {renderSummaryToggle()}
        <button
          onClick={onButtonClick}
          className="relative z-10 mt-auto self-start inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {photo}

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
          className={`relative z-10 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line overflow-hidden transition-[max-height] duration-300 ease-in-out${isTruncated ? ' line-clamp-3' : ''}`}
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
            maxHeight: isTruncated ? SUMMARY_COLLAPSED_MAX_HEIGHT : SUMMARY_EXPANDED_MAX_HEIGHT,
          }}
        >
          {summary}
        </p>
        {renderSummaryToggle()}
        <button
          onClick={onButtonClick}
          className="relative z-10 mt-auto inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity self-start"
          style={{
            fontFamily: 'var(--font-recursive)',
            fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
            fontSize: '13pt',
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
