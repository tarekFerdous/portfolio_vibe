'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface ImageUploadZoneProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  onDelete: (url: string) => Promise<void>;
  label?: string;
}

export function ImageUploadZone({ currentUrl, onUpload, onDelete, label = 'Upload image' }: ImageUploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await onUpload(file);
      setPreviewUrl(url);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleDelete() {
    if (!previewUrl) return;
    await onDelete(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col gap-2">
      {previewUrl ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
          <Image src={previewUrl} alt="Uploaded image" fill className="object-cover" />
          <button
            onClick={handleDelete}
            aria-label="Delete image"
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={uploading}
          className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
            dragging
              ? 'border-gray-500 bg-black/[0.08] dark:bg-white/[0.08]'
              : 'border-black/[0.15] dark:border-white/[0.15] hover:border-black/30 dark:hover:border-white/30'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {uploading ? (
            <span className="text-gray-500 dark:text-gray-400 text-sm">Uploading…</span>
          ) : (
            <>
              <span className="text-gray-400 dark:text-gray-500 text-3xl">↑</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">{label}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Drag & drop or click to browse</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        className="hidden"
        data-testid="file-input"
      />
    </div>
  );
}
