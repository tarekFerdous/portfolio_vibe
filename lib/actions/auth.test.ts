import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendAdminMagicLink } from './auth';

const mockSignInWithOtp = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { signInWithOtp: mockSignInWithOtp } })),
}));

const mockHeaders = vi.fn();

vi.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

beforeEach(() => {
  mockSignInWithOtp.mockReset();
  mockHeaders.mockReset();
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeHeaders(values: Record<string, string>) {
  return { get: (key: string) => values[key] ?? null };
}

describe('sendAdminMagicLink', () => {
  it('requests an OTP for the configured admin email using the derived origin', async () => {
    mockHeaders.mockReturnValue(makeHeaders({ host: 'example.com', 'x-forwarded-proto': 'https' }));
    mockSignInWithOtp.mockResolvedValue({ error: null });

    await expect(sendAdminMagicLink()).resolves.toEqual({ ok: true });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { emailRedirectTo: 'https://example.com/auth/callback' },
    });
  });

  it('defaults to https when x-forwarded-proto is missing', async () => {
    mockHeaders.mockReturnValue(makeHeaders({ host: 'localhost:3000' }));
    mockSignInWithOtp.mockResolvedValue({ error: null });

    await sendAdminMagicLink();

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { emailRedirectTo: 'https://localhost:3000/auth/callback' },
    });
  });

  it.each(['', '   '])('returns a generic error without calling Supabase when ADMIN_EMAIL is %j', async (value) => {
    vi.stubEnv('ADMIN_EMAIL', value);

    await expect(sendAdminMagicLink()).resolves.toEqual({ ok: false, error: 'Sign-in is not configured.' });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('returns the Supabase error message on failure', async () => {
    mockHeaders.mockReturnValue(makeHeaders({ host: 'example.com', 'x-forwarded-proto': 'https' }));
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });

    await expect(sendAdminMagicLink()).resolves.toEqual({ ok: false, error: 'Rate limit exceeded' });
  });
});
