import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactSection } from './ContactSection';
import type { Contacts } from '@/lib/supabase/types';

const baseContacts: Contacts = {
  id: 'contact-1',
  email: 'tarekferdous3@gmail.com',
  phone: '+1 438-342-5929',
  linkedin_url: null,
  github_url: null,
  location: 'Toronto, Canada',
  hire_me_destination: null,
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('ContactSection', () => {
  it('renders the fetched email, phone, and location text', () => {
    render(<ContactSection contacts={baseContacts} />);
    expect(screen.getByText('tarekferdous3@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('+1 438-342-5929')).toBeInTheDocument();
    expect(screen.getByText('Toronto, Canada')).toBeInTheDocument();
  });

  it('renders the email as a mailto: link', () => {
    render(<ContactSection contacts={baseContacts} />);
    const emailLink = screen.getByRole('link', { name: 'tarekferdous3@gmail.com' });
    expect(emailLink).toHaveAttribute('href', 'mailto:tarekferdous3@gmail.com');
  });

  it('renders the phone as a tel: link with a normalized digits-only href', () => {
    render(<ContactSection contacts={baseContacts} />);
    const phoneLink = screen.getByRole('link', { name: '+1 438-342-5929' });
    expect(phoneLink).toHaveAttribute('href', 'tel:+14383425929');
  });

  it('renders location as static text, not a link', () => {
    render(<ContactSection contacts={baseContacts} />);
    const location = screen.getByText('Toronto, Canada');
    expect(location.closest('a')).toBeNull();
  });

  it('omits a null field without throwing', () => {
    const partialContacts: Contacts = { ...baseContacts, phone: null };
    expect(() => render(<ContactSection contacts={partialContacts} />)).not.toThrow();
    expect(screen.getByText('tarekferdous3@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Toronto, Canada')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tel:/i })).not.toBeInTheDocument();
  });

  it('renders the section with id="contact" even when contacts is entirely null', () => {
    const { container } = render(<ContactSection contacts={null} />);
    expect(() => render(<ContactSection contacts={null} />)).not.toThrow();
    expect(container.querySelector('#contact')).not.toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('applies a distinct colored drop-shadow glow to each icon', () => {
    const { container } = render(<ContactSection contacts={baseContacts} />);
    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(3);

    const [emailIcon, phoneIcon, locationIcon] = Array.from(icons);

    expect(emailIcon).toHaveStyle({
      filter: 'drop-shadow(0 0 3px #3b82f699) drop-shadow(0 0 8px #3b82f666)',
    });
    expect(phoneIcon).toHaveStyle({
      filter: 'drop-shadow(0 0 3px #10b98199) drop-shadow(0 0 8px #10b98166)',
    });
    expect(locationIcon).toHaveStyle({
      filter: 'drop-shadow(0 0 3px #f9731699) drop-shadow(0 0 8px #f9731666)',
    });

    // Each icon's glow color must be distinct from the others.
    const filters = [emailIcon, phoneIcon, locationIcon].map((icon) => icon.getAttribute('style'));
    expect(new Set(filters).size).toBe(3);
  });
});
