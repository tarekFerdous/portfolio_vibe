'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function LoginPage() {
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-[24px] p-8"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
          boxShadow: 'var(--intro-glass-shadow)',
        }}
      >
        <h1
          className="text-gray-900 dark:text-gray-50 mb-6"
          style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '48px', lineHeight: 1.1 }}
        >
          Admin
        </h1>

        {sent ? (
          <p
            className="text-gray-700 dark:text-gray-300"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '14pt' }}
          >
            Check your email for a magic link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-xl px-4 py-3 bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
            />
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-full px-6 py-3 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ fontFamily: 'var(--font-recursive)', fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5", fontSize: '13pt' }}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
