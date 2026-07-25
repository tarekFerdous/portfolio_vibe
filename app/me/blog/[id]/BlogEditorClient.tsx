'use client';

import { useState } from 'react';
import { upsertBlog } from '@/lib/actions/blogs';
import { uploadImage, deleteImage } from '@/lib/actions/images';
import { BlogBlockEditor, type Block } from '@/components/admin/BlogBlockEditor';
import type { Blog, BlogBlock, BlogStatus } from '@/lib/supabase/types';

interface Props {
  blog: Blog | null;
  initialBlocks: BlogBlock[];
  fetchError?: string | null;
}

function dbBlocksToEditorBlocks(dbBlocks: BlogBlock[]): Block[] {
  return dbBlocks.map((b) =>
    b.block_type === 'text'
      ? { id: b.id, type: 'text', content: b.content ?? '' }
      : { id: b.id, type: 'photo', image_url: b.image_url }
  );
}

export function BlogEditorClient({ blog, initialBlocks, fetchError }: Props) {
  const [title, setTitle] = useState(blog?.title ?? '');
  const [publishDate, setPublishDate] = useState(blog?.publish_date ?? '');
  const [location, setLocation] = useState(blog?.location ?? '');
  const [status, setStatus] = useState<BlogStatus>(blog?.status ?? 'draft');
  const [blocks, setBlocks] = useState<Block[]>(dbBlocksToEditorBlocks(initialBlocks));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (fetchError || !blog) {
    return (
      <div
        role="alert"
        className="rounded-[20px] p-5 text-sm text-red-600 dark:text-red-400"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        Failed to load post: {fetchError ?? 'Unknown error.'}
      </div>
    );
  }

  const blogId = blog.id;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await upsertBlog({
        id: blogId,
        title,
        publish_date: publishDate || null,
        location: location || null,
        status,
        blocks: blocks.map((b, i) => ({
          id: b.id,
          block_type: b.type,
          content: b.type === 'text' ? b.content : null,
          image_url: b.type === 'photo' ? b.image_url : null,
          display_order: i,
        })),
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : 'Failed to save post.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-[20px] p-6 flex flex-col gap-5"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl px-4 py-3 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              style={{ fontFamily: 'var(--font-recursive)', fontSize: '15pt' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Publish Date</label>
            <input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="rounded-xl px-4 py-3 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              style={{ fontFamily: 'var(--font-recursive)' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Montreal, QC"
              className="rounded-xl px-4 py-3 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              style={{ fontFamily: 'var(--font-recursive)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</label>
          <button
            type="button"
            onClick={() => setStatus((s) => s === 'draft' ? 'published' : 'draft')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              status === 'published' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-label={`Toggle status: currently ${status}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                status === 'published' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-recursive)' }}>
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
      </section>

      <section
        className="rounded-[20px] p-6 flex flex-col gap-4"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Content</h2>
        <BlogBlockEditor
          blocks={blocks}
          onChange={setBlocks}
          onImageUpload={(file) => uploadImage('blog-photos', file)}
          onImageDelete={(url) => deleteImage('blog-photos', url)}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full px-6 py-3 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ fontFamily: 'var(--font-recursive)', fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 700, 'slnt' 0, 'CRSV' 0.5", fontSize: '13pt' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && !saveError && <span className="text-green-600 dark:text-green-400 text-sm">Saved!</span>}
        {saveError && (
          <span role="alert" className="text-red-600 dark:text-red-400 text-sm">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
