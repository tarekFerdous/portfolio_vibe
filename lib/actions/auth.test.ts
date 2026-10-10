import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendAdminMagicLink } from './auth';

const mockSignInWithOtp = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { signInWithOtp: mockSignInWithOtp } })),
}));

beforeEach(() => {
  mockSignInWithOtp.mockReset();
  mockSignInWithOtp.mockResolvedValue({ error: null });
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendAdminMagicLink', () => {
  it('requests an OTP for the admin email that lands on /me via the callback', async () => {
    await expect(sendAdminMagicLink('https://tarekferdous.me')).resolves.toEqual({ ok: true });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { emailRedirectTo: 'https://tarekferdous.me/auth/callback?next=/me' },
    });
  });

  it('allows plain http for local development', async () => {
    await sendAdminMagicLink('http://localhost:3000');

    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'http://localhost:3000/auth/callback?next=/me' } })
    );
  });

  it('normalizes the origin, dropping any path or query', async () => {
    await sendAdminMagicLink('https://tarekferdous.me/some/path?x=1');

    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'https://tarekferdous.me/auth/callback?next=/me' } })
    );
  });

  it.each(['not a url', 'http://tarekferdous.me', 'javascript:alert(1)', ''])(
    'rejects origin %j without calling Supabase',
    async (origin) => {
      await expect(sendAdminMagicLink(origin)).resolves.toEqual({ ok: false, error: 'Invalid sign-in origin.' });
      expect(mockSignInWithOtp).not.toHaveBeenCalled();
    }
  );

  it.each(['', '   '])('returns a generic error without calling Supabase when ADMIN_EMAIL is %j', async (value) => {
    vi.stubEnv('ADMIN_EMAIL', value);

    await expect(sendAdminMagicLink('https://tarekferdous.me')).resolves.toEqual({
      ok: false,
      error: 'Sign-in is not configured.',
    });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('returns the Supabase error message on failure', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });

    await expect(sendAdminMagicLink('https://tarekferdous.me')).resolves.toEqual({
      ok: false,
      error: 'Rate limit exceeded',
    });
  });
});
