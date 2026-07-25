import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders the static overview summary in full with no truncation', () => {
    render(<ProjectOverviewCard onGoToProjects={() => {}} />);
    const matches = screen.getAllByText(projectOverviewSummary);
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach((el) => {
      expect(el.className).not.toContain('line-clamp');
    });
  });

  it('calls onGoToProjects when a "Go to projects" button is clicked', () => {
    const onGoToProjects = vi.fn();
    render(<ProjectOverviewCard onGoToProjects={onGoToProjects} />);
    const buttons = screen.getAllByRole('button', { name: /go to projects/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(onGoToProjects).toHaveBeenCalledTimes(1);
  });
});
