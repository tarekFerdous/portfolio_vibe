'use server';

import { createClient } from '@/lib/supabase/server';

export type SendAdminMagicLinkResult = { ok: true } | { ok: false; error: string };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Accepts the browser's `window.location.origin`: https anywhere, plain http only for local dev. */
function parseSiteOrigin(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol === 'https:') return url.origin;
    if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) return url.origin;
    return null;
  } catch {
    return null;
  }
}

/**
 * Requests a magic link for the site owner only. The target address is read
 * server-side from ADMIN_EMAIL and never reaches the client.
 *
 * The redirect origin comes from the browser rather than request headers:
 * behind Cloudflare the Worker's host/proto headers don't reliably match the
 * public URL, and Supabase falls back to the bare Site URL (the homepage, with
 * no session) when emailRedirectTo isn't on its allow-list.
 *
 * Returns a result instead of throwing so the real error message survives
 * Next's production redaction of thrown Server Action errors.
 */
export async function sendAdminMagicLink(siteOrigin: string): Promise<SendAdminMagicLinkResult> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return { ok: false, error: 'Sign-in is not configured.' };

  const origin = parseSiteOrigin(siteOrigin);
  if (!origin) return { ok: false, error: 'Invalid sign-in origin.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: adminEmail,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/me` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
