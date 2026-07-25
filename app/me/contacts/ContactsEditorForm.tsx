'use client';

import { useState } from 'react';
import { upsertContacts } from '@/lib/actions/contacts';
import type { Contacts } from '@/lib/supabase/types';

interface Props {
  initialContacts: Contacts | null;
  fetchError?: string | null;
}

const fields: { key: keyof Omit<Contacts, 'id' | 'updated_at'>; label: string; placeholder: string; type?: string }[] = [
  { key: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
  { key: 'linkedin_url', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'github_url', label: 'GitHub URL', placeholder: 'https://github.com/yourname' },
  { key: 'location', label: 'Location', placeholder: 'Montreal, QC' },
  { key: 'hire_me_destination', label: 'Hire Me Destination', placeholder: 'mailto:you@example.com or https://…' },
];

export function ContactsEditorForm({ initialContacts, fetchError }: Props) {
  const [values, setValues] = useState<Omit<Contacts, 'id' | 'updated_at'>>({
    email: initialContacts?.email ?? '',
    phone: initialContacts?.phone ?? '',
    linkedin_url: initialContacts?.linkedin_url ?? '',
    github_url: initialContacts?.github_url ?? '',
    location: initialContacts?.location ?? '',
    hire_me_destination: initialContacts?.hire_me_destination ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await upsertContacts({
        email: values.email || null,
        phone: values.phone || null,
        linkedin_url: values.linkedin_url || null,
        github_url: values.github_url || null,
        location: values.location || null,
        hire_me_destination: values.hire_me_destination || null,
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaving(false);
      setSaved(false);
      setError(err instanceof Error ? err.message : 'Failed to save contacts.');
    }
  }

  if (fetchError) {
    return (
      <section
        className="rounded-[20px] p-6 flex flex-col gap-3"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        <span className="text-red-600 dark:text-red-400 text-sm" role="alert">
          Failed to load contacts: {fetchError}
        </span>
      </section>
    );
  }

  return (
    <section
      className="rounded-[20px] p-6 flex flex-col gap-5"
      style={{
        backdropFilter: 'var(--intro-glass-filter)',
        WebkitBackdropFilter: 'var(--intro-glass-filter)',
        background: 'var(--intro-glass-bg)',
        border: '1px solid var(--intro-glass-border)',
      }}
    >
      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </label>
          <input
            type={type ?? 'text'}
            value={values[key] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            placeholder={placeholder}
            className="rounded-xl px-4 py-3 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
          />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full px-6 py-3 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ fontFamily: 'var(--font-recursive)', fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5", fontSize: '13pt' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-green-600 dark:text-green-400 text-sm">Saved!</span>}
        {error && (
          <span className="text-red-600 dark:text-red-400 text-sm" role="alert">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}
