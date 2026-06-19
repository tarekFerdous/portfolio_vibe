'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ImageUploadZone } from './ImageUploadZone';

export type Block =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'photo'; image_url: string | null };

interface BlogBlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onImageUpload: (file: File) => Promise<string>;
  onImageDelete: (url: string) => Promise<void>;
}

function generateId() {
  return crypto.randomUUID();
}

function TextBlock({ block, onChange }: { block: Extract<Block, { type: 'text' }>; onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: block.content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
      <div className="flex gap-1 px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.03] dark:bg-white/[0.03]">
        {[
          { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
          { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
          { label: 'H1', action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive('heading', { level: 1 }) },
          { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
          { label: '• List', action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
          { label: '1. List', action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList') },
        ].map(({ label, action, active }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className={`px-2 py-1 rounded text-xs transition-colors ${active ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-4 py-3 min-h-[100px] focus-within:outline-none"
      />
    </div>
  );
}

interface InsertButtonsProps {
  onInsertText: () => void;
  onInsertPhoto: () => void;
}

function InsertButtons({ onInsertText, onInsertPhoto }: InsertButtonsProps) {
  return (
    <div className="flex items-center gap-2 py-1" data-testid="insert-buttons">
      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
      <button
        type="button"
        onClick={onInsertText}
        className="text-xs px-3 py-1 rounded-full border border-black/[0.1] dark:border-white/[0.1] text-gray-500 dark:text-gray-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
      >
        + Text
      </button>
      <button
        type="button"
        onClick={onInsertPhoto}
        className="text-xs px-3 py-1 rounded-full border border-black/[0.1] dark:border-white/[0.1] text-gray-500 dark:text-gray-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
      >
        + Photo
      </button>
      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}

export function BlogBlockEditor({ blocks, onChange, onImageUpload, onImageDelete }: BlogBlockEditorProps) {
  function insertAt(index: number, block: Block) {
    const next = [...blocks];
    next.splice(index, 0, block);
    onChange(next);
  }

  function updateAt(index: number, block: Block) {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col">
      <InsertButtons
        onInsertText={() => insertAt(0, { id: generateId(), type: 'text', content: '' })}
        onInsertPhoto={() => insertAt(0, { id: generateId(), type: 'photo', image_url: null })}
      />
      {blocks.map((block, i) => (
        <div key={block.id} className="flex flex-col">
          <div className="relative">
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Delete block"
              className="absolute -right-2 -top-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition-colors shadow"
            >
              ×
            </button>
            {block.type === 'text' ? (
              <TextBlock
                block={block}
                onChange={(content) => updateAt(i, { ...block, content })}
              />
            ) : (
              <ImageUploadZone
                currentUrl={block.image_url}
                onUpload={async (file) => {
                  const url = await onImageUpload(file);
                  updateAt(i, { ...block, image_url: url });
                  return url;
                }}
                onDelete={async (url) => {
                  await onImageDelete(url);
                  updateAt(i, { ...block, image_url: null });
                }}
                label="Upload photo"
              />
            )}
          </div>
          <InsertButtons
            onInsertText={() => insertAt(i + 1, { id: generateId(), type: 'text', content: '' })}
            onInsertPhoto={() => insertAt(i + 1, { id: generateId(), type: 'photo', image_url: null })}
          />
        </div>
      ))}
    </div>
  );
}
