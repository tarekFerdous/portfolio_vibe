'use client';

import { useState } from 'react';
import { sendAdminMagicLink } from '@/lib/actions/auth';

interface LoginClientProps {
  /** Error to show before any send attempt, e.g. a failed magic-link callback. */
  initialError?: string;
}

export function LoginClient({ initialError = '' }: LoginClientProps) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await sendAdminMagicLink(window.location.origin);
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {sent && (
        <p
          className="text-gray-700 dark:text-gray-300"
          style={{ fontFamily: 'var(--font-recursive)', fontSize: '14pt' }}
        >
          Check your email for a magic link.
        </p>
      )}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || sent}
        className="rounded-full px-6 py-3 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
        style={{ fontFamily: 'var(--font-recursive)', fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5", fontSize: '13pt' }}
      >
        {loading ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  );
}
