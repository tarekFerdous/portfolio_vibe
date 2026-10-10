import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectCard } from './ProjectCard';
import { colorForId } from '@/lib/colors';
import type { Project } from '@/lib/supabase/types';

const baseProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  slug: 'test-project',
  repo_url: null,
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

  it('clamps a long summary without a "See more" toggle, since the card opens the project page', () => {
    const longestSummary =
      'An automated "dead man\'s switch" safety platform — if a user goes silent, a server-side escalation system automatically alerts trusted contacts and releases pre-configured emergency information, with no manual SOS action required.';
    render(<ProjectCard project={{ ...baseProject, summary: longestSummary }} />);

    screen.getAllByText(longestSummary).forEach((el) => {
      expect(el.className).toContain('line-clamp');
    });
    expect(screen.queryByRole('button', { name: /see more/i })).not.toBeInTheDocument();
  });

  it('renders the whole card as a link to the project page, with "Learn More" as a non-interactive cue', () => {
    render(<ProjectCard project={baseProject} />);

    const link = screen.getByRole('link', { name: /test project/i });
    expect(link).toHaveAttribute('href', '/projects/test-project');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByText('Learn More →').length).toBeGreaterThan(0);
  });

  it('calls onActivate and cancels navigation when the card is not active', () => {
    const onActivate = vi.fn();
    render(<ProjectCard project={baseProject} isActive={false} onActivate={onActivate} />);

    const notCancelled = fireEvent.click(screen.getByRole('link', { name: /test project/i }));

    expect(notCancelled).toBe(false);
    expect(onActivate).toHaveBeenCalledTimes(1);
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
