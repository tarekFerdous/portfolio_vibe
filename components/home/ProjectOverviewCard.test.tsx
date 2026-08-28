import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectOverviewCard } from './ProjectOverviewCard';
import { projectOverviewSummary } from '@/lib/text';

describe('ProjectOverviewCard', () => {
  it('renders the fixed color-accent panel background (#8b5cf6)', () => {
    const { container } = render(<ProjectOverviewCard onGoToProjects={() => {}} />);
    const panel = container.querySelector('div[style*="background-color"]');
    expect(panel).not.toBeNull();
    expect(panel).toHaveStyle({ backgroundColor: '#8b5cf6' });
  });

  it('renders the static "Projects" heading in full with no truncation', () => {
    render(<ProjectOverviewCard onGoToProjects={() => {}} />);
    const headings = screen.getAllByRole('heading', { level: 2, name: 'Projects' });
    expect(headings.length).toBeGreaterThan(0);
    headings.forEach((el) => {
      expect(el.className).not.toContain('line-clamp');
      expect(el.className).not.toContain('truncate');
    });
  });

  it('renders the static overview summary truncated by default with a working See more / See less toggle', () => {
    render(<ProjectOverviewCard onGoToProjects={() => {}} />);

    // Collapsed by default: text is present (line-clamp is CSS-only truncation)
    // but clamped, and a "See more" control is shown.
    const collapsedMatches = screen.getAllByText(projectOverviewSummary);
    expect(collapsedMatches.length).toBeGreaterThan(0);
    collapsedMatches.forEach((el) => {
      expect(el.className).toContain('line-clamp');
    });
    const seeMoreButtons = screen.getAllByRole('button', { name: /see more/i });
    expect(seeMoreButtons.length).toBeGreaterThan(0);

    // Expand: full text revealed, control swaps to "See less". Expand/collapse
    // state is shared across the mobile and desktop summary blocks within a
    // single card instance, so only one of the (duplicate, responsive) See
    // more buttons needs clicking.
    fireEvent.click(seeMoreButtons[0]);
    const expandedMatches = screen.getAllByText(projectOverviewSummary);
    expect(expandedMatches.length).toBeGreaterThan(0);
    expandedMatches.forEach((el) => {
      expect(el.className).not.toContain('line-clamp');
    });
    const seeLessButtons = screen.getAllByRole('button', { name: /see less/i });
    expect(seeLessButtons.length).toBeGreaterThan(0);

    // Collapse again: back to truncated with "See more".
    fireEvent.click(seeLessButtons[0]);
    const recollapsedMatches = screen.getAllByText(projectOverviewSummary);
    recollapsedMatches.forEach((el) => {
      expect(el.className).toContain('line-clamp');
    });
    expect(screen.getAllByRole('button', { name: /see more/i }).length).toBeGreaterThan(0);
  });

  it('calls onGoToProjects when a "Go to projects" button is clicked', () => {
    const onGoToProjects = vi.fn();
    render(<ProjectOverviewCard onGoToProjects={onGoToProjects} />);
    const buttons = screen.getAllByRole('button', { name: /go to projects/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(onGoToProjects).toHaveBeenCalledTimes(1);
  });

  it('uses a clamp()-based fluid fontSize for the "Projects" heading instead of a fixed pixel value', () => {
    // Rendered via react-dom/server rather than jsdom's live DOM: jsdom's
    // CSSStyleDeclaration silently drops `font-size: clamp(...)` as an
    // unrecognized value, so element.style.fontSize would read back empty
    // even though the browser renders it correctly.
    const html = renderToStaticMarkup(<ProjectOverviewCard onGoToProjects={() => {}} />);
    const titleMatches = [...html.matchAll(/<h2[^>]*style="([^"]*)"[^>]*>Projects<\/h2>/g)];
    expect(titleMatches.length).toBeGreaterThan(0);
    titleMatches.forEach(([, style]) => {
      expect(style).toMatch(/font-size:clamp\(/);
      expect(style).not.toMatch(/font-size:\d/);
    });
  });
});
