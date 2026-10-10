import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginClient } from './LoginClient';

const mockSendAdminMagicLink = vi.fn();

vi.mock('@/lib/actions/auth', () => ({
  sendAdminMagicLink: (origin: string) => mockSendAdminMagicLink(origin),
}));

beforeEach(() => {
  mockSendAdminMagicLink.mockReset();
});

function clickSend() {
  fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
}

describe('LoginClient', () => {
  it('renders no input field, only the send button', () => {
    const { container } = render(<LoginClient />);
    expect(container.querySelector('input')).toBeNull();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('calls the server action when the button is clicked', async () => {
    mockSendAdminMagicLink.mockResolvedValue({ ok: true });
    render(<LoginClient />);

    clickSend();

    await screen.findByText('Check your email for a magic link.');
    expect(mockSendAdminMagicLink).toHaveBeenCalledTimes(1);
    expect(mockSendAdminMagicLink).toHaveBeenCalledWith(window.location.origin);
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolveRequest: (value: { ok: true }) => void = () => {};
    mockSendAdminMagicLink.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    render(<LoginClient />);

    clickSend();

    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled();
    resolveRequest({ ok: true });
  });

  it('shows the confirmation and keeps the button disabled after success', async () => {
    mockSendAdminMagicLink.mockResolvedValue({ ok: true });
    render(<LoginClient />);

    clickSend();

    expect(await screen.findByText('Check your email for a magic link.')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /send magic link/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockSendAdminMagicLink).toHaveBeenCalledTimes(1);
  });

  it('shows the error returned by the action and allows a retry', async () => {
    mockSendAdminMagicLink.mockResolvedValue({ ok: false, error: 'Sign-in is not configured.' });
    render(<LoginClient />);

    clickSend();

    expect(await screen.findByText('Sign-in is not configured.')).toHaveClass('text-red-500');
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeEnabled();
  });

  it('shows a generic error if the action call itself fails', async () => {
    mockSendAdminMagicLink.mockRejectedValue(new Error('network down'));
    render(<LoginClient />);

    clickSend();

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
  });
});
