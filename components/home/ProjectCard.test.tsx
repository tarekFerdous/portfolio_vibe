import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectCard } from './ProjectCard';
import { colorForId } from '@/lib/colors';
import type { Project } from '@/lib/supabase/types';

const baseProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  summary: 'A short summary',
  project_description: 'A longer description',
  image_url: null,
  bg_color: null,
  skills: [],
  display_order: 0,
  visibility: 'visible',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('ProjectCard', () => {
  it('renders the given bg_color as the panel background when no image is set', () => {
    const project: Project = {
      ...baseProject,
      image_url: null,
      bg_color: '#123456',
    };
    const { container } = render(<ProjectCard project={project} />);
    const panel = container.querySelector('div[style*="background-color"]');
    expect(panel).not.toBeNull();
    expect(panel).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('falls back to colorForId(project.id) when bg_color is null and there is no image', () => {
    const project: Project = {
      ...baseProject,
      image_url: null,
      bg_color: null,
    };
    const expectedColor = colorForId(project.id);
    const { container } = render(<ProjectCard project={project} />);
    const panel = container.querySelector('div[style*="background-color"]');
    expect(panel).not.toBeNull();
    expect(panel).toHaveStyle({ backgroundColor: expectedColor });
  });

  it('still renders the cover image when image_url is set', () => {
    const project: Project = {
      ...baseProject,
      image_url: 'https://example.com/cover.jpg',
      bg_color: '#123456',
    };
    render(<ProjectCard project={project} />);
    const image = screen.getByAltText(project.name);
    expect(image).toBeInTheDocument();
    expect(image.tagName).toBe('IMG');
  });

  it('renders the placeholder icon inside the color panel when image_url is null', () => {
    const project: Project = {
      ...baseProject,
      image_url: null,
      bg_color: '#123456',
    };
    const { container } = render(<ProjectCard project={project} />);
    const panel = container.querySelector('div[style*="background-color"]');
    expect(panel).not.toBeNull();
    const icon = panel?.querySelector('svg[aria-hidden="true"]');
    expect(icon).not.toBeNull();
  });

  it('still renders the placeholder icon underneath the cover image when image_url is set', () => {
    const project: Project = {
      ...baseProject,
      image_url: 'https://example.com/cover.jpg',
      bg_color: '#123456',
    };
    const { container } = render(<ProjectCard project={project} />);
    const panel = container.querySelector('div[style*="background-color"]');
    expect(panel).not.toBeNull();
    const icon = panel?.querySelector('svg[aria-hidden="true"]');
    expect(icon).not.toBeNull();
    // Real cover image is still present, rendered on top of the icon.
    const image = screen.getByAltText(project.name);
    expect(image).toBeInTheDocument();
  });

  it('renders the longest real summary (Enki App, 230 chars) truncated by default with a working See more / See less toggle', () => {
    const longestSummary =
      'An automated "dead man\'s switch" safety platform — if a user goes silent, a server-side escalation system automatically alerts trusted contacts and releases pre-configured emergency information, with no manual SOS action required.';
    expect(longestSummary.length).toBe(230);
    const project: Project = {
      ...baseProject,
      name: 'Enki App',
      summary: longestSummary,
    };
    render(<ProjectCard project={project} />);

    // Collapsed by default: text is present (line-clamp is CSS-only truncation)
    // but clamped, and a "See more" control is shown.
    const collapsedMatches = screen.getAllByText(longestSummary);
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
    const expandedMatches = screen.getAllByText(longestSummary);
    expect(expandedMatches.length).toBeGreaterThan(0);
    expandedMatches.forEach((el) => {
      expect(el.className).not.toContain('line-clamp');
    });
    const seeLessButtons = screen.getAllByRole('button', { name: /see less/i });
    expect(seeLessButtons.length).toBeGreaterThan(0);

    // Collapse again: back to truncated with "See more".
    fireEvent.click(seeLessButtons[0]);
    const recollapsedMatches = screen.getAllByText(longestSummary);
    recollapsedMatches.forEach((el) => {
      expect(el.className).toContain('line-clamp');
    });
    expect(
      screen.getAllByRole('button', { name: /see more/i }).length,
    ).toBeGreaterThan(0);
  });

  it('renders a short summary with no "See more" affordance', () => {
    const shortSummary = 'A short summary';
    const project: Project = { ...baseProject, summary: shortSummary };
    render(<ProjectCard project={project} />);
    const matches = screen.getAllByText(shortSummary);
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach((el) => {
      expect(el.className).not.toContain('line-clamp');
    });
    expect(
      screen.queryByRole('button', { name: /see more/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /see less/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps expand/collapse state independent per rendered card', () => {
    const longestSummary =
      'An automated "dead man\'s switch" safety platform — if a user goes silent, a server-side escalation system automatically alerts trusted contacts and releases pre-configured emergency information, with no manual SOS action required.';
    const projectA: Project = {
      ...baseProject,
      id: 'project-a',
      name: 'Project A',
      summary: longestSummary,
    };
    const projectB: Project = {
      ...baseProject,
      id: 'project-b',
      name: 'Project B',
      summary: longestSummary,
    };
    render(
      <>
        <ProjectCard project={projectA} />
        <ProjectCard project={projectB} />
      </>,
    );

    const [seeMoreA] = screen.getAllByRole('button', { name: /see more/i });
    fireEvent.click(seeMoreA);

    // Card A is expanded ("See less"); Card B remains collapsed ("See more").
    expect(
      screen.getAllByRole('button', { name: /see less/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /see more/i }).length,
    ).toBeGreaterThan(0);
  });

  it('renders the longest real project name (45 chars) in full with no truncation', () => {
    const longestName = 'Data Analytics and Visualization - OpenSearch';
    expect(longestName.length).toBe(45);
    const project: Project = { ...baseProject, name: longestName };
    render(<ProjectCard project={project} />);
    const headings = screen.getAllByRole('heading', {
      level: 2,
      name: longestName,
    });
    expect(headings.length).toBeGreaterThan(0);
    headings.forEach((el) => {
      expect(el.className).not.toContain('line-clamp');
      expect(el.className).not.toContain('truncate');
    });
  });

  it('uses a clamp()-based fluid fontSize for the title instead of a fixed pixel value', () => {
    // Rendered via react-dom/server rather than jsdom's live DOM: jsdom's
    // CSSStyleDeclaration silently drops `font-size: clamp(...)` as an
    // unrecognized value, so element.style.fontSize would read back empty
    // even though the browser renders it correctly.
    const project: Project = { ...baseProject, name: 'Test Project' };
    const html = renderToStaticMarkup(<ProjectCard project={project} />);
    const titleMatches = [
      ...html.matchAll(/<h2[^>]*style="([^"]*)"[^>]*>Test Project<\/h2>/g),
    ];
    expect(titleMatches.length).toBeGreaterThan(0);
    titleMatches.forEach(([, style]) => {
      expect(style).toMatch(/font-size:clamp\(/);
      expect(style).not.toMatch(/font-size:\d/);
    });
  });
});
