'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type SendAdminMagicLinkResult = { ok: true } | { ok: false; error: string };

/**
 * Requests a magic link for the site owner only. The target address is read
 * server-side from ADMIN_EMAIL and never reaches the client.
 *
 * Returns a result instead of throwing so the real error message survives
 * Next's production redaction of thrown Server Action errors.
 */
export async function sendAdminMagicLink(): Promise<SendAdminMagicLinkResult> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return { ok: false, error: 'Sign-in is not configured.' };

  const requestHeaders = await headers();
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  const host = requestHeaders.get('host');
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: adminEmail,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
