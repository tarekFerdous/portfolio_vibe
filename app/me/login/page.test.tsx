import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

vi.mock('@/lib/actions/auth', () => ({
  sendAdminMagicLink: vi.fn(),
}));

describe('LoginPage', () => {
  it('renders only the send button, with no email input or address', () => {
    vi.stubEnv('ADMIN_EMAIL', 'owner@example.com');
    const { container } = render(<LoginPage />);

    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
    expect(container.innerHTML).not.toContain('owner@example.com');
    vi.unstubAllEnvs();
  });
});
