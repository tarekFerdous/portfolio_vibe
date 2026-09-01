import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockUsePathname = vi.mocked(usePathname);

describe('Sidebar', () => {
  it('keeps the Contact link as an in-page anchor on the home route', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Sidebar open />);
    const contactLinks = screen.getAllByText('Contact');
    contactLinks.forEach((label) => {
      const link = label.closest('a');
      expect(link).toHaveAttribute('href', '#contact');
    });
  });

  it('points the Contact link back to the home page hash on a non-home route', () => {
    mockUsePathname.mockReturnValue('/posts');
    render(<Sidebar open />);
    const contactLinks = screen.getAllByText('Contact');
    contactLinks.forEach((label) => {
      const link = label.closest('a');
      expect(link).toHaveAttribute('href', '/#contact');
    });
  });

  it('leaves the other nav items unchanged regardless of route', () => {
    mockUsePathname.mockReturnValue('/posts');
    render(<Sidebar open />);

    screen.getAllByText('About').forEach((label) => {
      expect(label.closest('a')).toHaveAttribute('href', '#about');
    });
    screen.getAllByText('Projects').forEach((label) => {
      expect(label.closest('a')).toHaveAttribute('href', '#projects');
    });
    screen.getAllByText('Posts').forEach((label) => {
      expect(label.closest('a')).toHaveAttribute('href', '/posts');
    });
    screen.getAllByText('Resume').forEach((label) => {
      const link = label.closest('a');
      expect(link).toHaveAttribute('href', '/tarek_ferdous_resume.pdf');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('renders nothing when closed', () => {
    mockUsePathname.mockReturnValue('/');
    const { container } = render(<Sidebar open={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
