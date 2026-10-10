import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

vi.mock('@/lib/actions/auth', () => ({
  sendAdminMagicLink: vi.fn(),
}));

const FAILURE_MESSAGE = 'That sign-in link has expired or was already used — send a new one.';

async function renderPage(searchParams: { error?: string } = {}) {
  return render(await LoginPage({ searchParams: Promise.resolve(searchParams) }));
}

describe('LoginPage', () => {
  it('renders only the send button, with no email input or address', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'owner@example.com');
    const { container } = await renderPage();

    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
    expect(container.innerHTML).not.toContain('owner@example.com');
    vi.unstubAllEnvs();
  });

  it('shows the generic failure message in the error style when error=auth_failed', async () => {
    await renderPage({ error: 'auth_failed' });

    expect(screen.getByText(FAILURE_MESSAGE)).toHaveClass('text-red-500');
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeEnabled();
  });

  it('shows no failure message without the error param', async () => {
    await renderPage();

    expect(screen.queryByText(FAILURE_MESSAGE)).not.toBeInTheDocument();
  });

  it('ignores unknown error values', async () => {
    await renderPage({ error: 'something_else' });

    expect(screen.queryByText(FAILURE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText('something_else')).not.toBeInTheDocument();
  });
});
