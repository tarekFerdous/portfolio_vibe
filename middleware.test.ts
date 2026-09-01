import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

beforeEach(() => {
  mockGetUser.mockReset();
  vi.stubEnv('ADMIN_EMAIL', 'admin@example.com');
});

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://example.com'));
}

describe('middleware /me guard', () => {
  it('redirects to /me/login when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(requestFor('/me'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/me/login');
  });

  it('redirects to /me/login when the authenticated user is not the admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: 'someone-else@example.com' } } });

    const response = await middleware(requestFor('/me/projects'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/me/login');
  });

  it('allows the request through when the authenticated user matches ADMIN_EMAIL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: 'admin@example.com' } } });

    const response = await middleware(requestFor('/me/projects'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not guard /me/login itself', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(requestFor('/me/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
