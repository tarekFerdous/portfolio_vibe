'use client';

import { useState } from 'react';
import Image from 'next/image';
import { upsertIntro, uploadIntroCover, deleteIntroCover } from '@/lib/actions/intro';
import { ImageUploadZone } from '@/components/admin/ImageUploadZone';
import type { Intro, IntroCover } from '@/lib/supabase/types';

interface Props {
  initialIntro: Intro | null;
  initialCovers: IntroCover[];
}

export function IntroEditorForm({ initialIntro, initialCovers }: Props) {
  const [title, setTitle] = useState(initialIntro?.title ?? '');
  const [summary, setSummary] = useState(initialIntro?.summary ?? '');
  const [covers, setCovers] = useState<IntroCover[]>(initialCovers);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await upsertIntro({ title, summary });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleUploadCover(file: File) {
    const cover = await uploadIntroCover(file);
    setCovers((prev) => [...prev, cover]);
    return cover.url;
  }

  async function handleDeleteCover(cover: IntroCover) {
    await deleteIntroCover(cover.id, cover.url);
    setCovers((prev) => prev.filter((c) => c.id !== cover.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <section
        className="rounded-[20px] p-6 flex flex-col gap-5"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Title / Role
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Software Engineer"
            className="rounded-xl px-4 py-3 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '14pt' }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            placeholder="Write your bio here…"
            className="rounded-xl px-4 py-3 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none"
            style={{ fontFamily: 'var(--font-recursive)', fontSize: '13pt' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full px-6 py-3 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ fontFamily: 'var(--font-recursive)', fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5", fontSize: '13pt' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-green-600 dark:text-green-400 text-sm">Saved!</span>}
        </div>
      </section>

      <section
        className="rounded-[20px] p-6 flex flex-col gap-5"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Cover Photos
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {covers.map((cover) => (
            <div key={cover.id} className="relative aspect-video rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
              <Image src={cover.url} alt="Cover" fill className="object-cover" />
              <button
                onClick={() => handleDeleteCover(cover)}
                aria-label="Delete cover"
                className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow text-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <ImageUploadZone
          onUpload={handleUploadCover}
          onDelete={async () => {}}
          label="Add cover photo"
        />
      </section>
    </div>
  );
}
