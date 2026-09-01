import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { InlineSignIn } from './InlineSignIn';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockSignInWithOtp = vi.fn();

vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  })),
}));

const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockSignInWithOtp.mockReset();
  mockUsePathname.mockReturnValue('/posts/my-post');
});

describe('InlineSignIn', () => {
  it('renders an email input and submit button', () => {
    render(<InlineSignIn />);
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('calls signInWithOtp with emailRedirectTo pointing back at the current post', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<InlineSignIn />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'visitor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalled());
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'visitor@example.com',
      options: {
        emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fposts%2Fmy-post'),
      },
    });
  });

  it('uses an explicit postPath prop over the current pathname when provided', async () => {
    mockUsePathname.mockReturnValue('/some-other-route');
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<InlineSignIn postPath="/posts/explicit-post" />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'visitor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalled());
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'visitor@example.com',
      options: {
        emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fposts%2Fexplicit-post'),
      },
    });
  });

  it('shows the check-your-email state after a successful request', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<InlineSignIn />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'visitor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('shows an error message when signInWithOtp fails', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });
    render(<InlineSignIn />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'visitor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(await screen.findByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });
});
