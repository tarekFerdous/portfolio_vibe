import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    const project: Project = { ...baseProject, image_url: null, bg_color: '#123456' };
    const { container } = render(<ProjectCard project={project} />);
    const panel = container.querySelector('div[style*="background-color"]');
    expect(panel).not.toBeNull();
    expect(panel).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('falls back to colorForId(project.id) when bg_color is null and there is no image', () => {
    const project: Project = { ...baseProject, image_url: null, bg_color: null };
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
});
