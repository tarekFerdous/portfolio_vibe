'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

interface InlineSignInProps {
  /**
   * Path to redirect back to once the magic link is verified (e.g. the
   * current post's URL). Defaults to the current route via `usePathname()`
   * so this component can be dropped onto a post page with no extra wiring.
   */
  postPath?: string;
}

export function InlineSignIn({ postPath }: InlineSignInProps) {
  const pathname = usePathname();
  const next = postPath ?? pathname;

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-5"
      style={{
        backdropFilter: 'var(--intro-glass-filter)',
        WebkitBackdropFilter: 'var(--intro-glass-filter)',
        background: 'var(--intro-glass-bg)',
        border: '1px solid var(--intro-glass-border)',
        boxShadow: 'var(--intro-glass-shadow)',
      }}
    >
      <h2
        className="text-gray-900 dark:text-gray-50 mb-2"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '28px', lineHeight: 1.1 }}
      >
        Sign in to comment
      </h2>

      {sent ? (
        <p
          className="text-gray-700 dark:text-gray-300"
          style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
        >
          Check your email for a magic link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p
            className="text-gray-500 dark:text-gray-400"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '11pt' }}
          >
            Verify your email to comment. We never show your full address.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full rounded-xl px-4 py-2.5 bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full px-5 py-2.5 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ fontFamily: 'var(--font-recursive)', fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5", fontSize: '13pt' }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  );
}
