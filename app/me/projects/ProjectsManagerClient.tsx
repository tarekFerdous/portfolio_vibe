'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { ImageUploadZone } from '@/components/admin/ImageUploadZone';
import { upsertProject, deleteProject, reorderProjects, uploadProjectCover, deleteProjectCover } from '@/lib/actions/projects';
import type { Project } from '@/lib/supabase/types';

interface Props {
  initialProjects: Project[];
}

function SkillTagInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [input, setInput] = useState('');

  function addSkill() {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInput('');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {skills.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300"
          >
            {s}
            <button
              type="button"
              onClick={() => onChange(skills.filter((x) => x !== s))}
              className="text-gray-400 hover:text-red-500"
              aria-label={`Remove ${s}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
          placeholder="Add a skill…"
          className="flex-1 rounded-xl px-3 py-2 text-sm bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        />
        <button
          type="button"
          onClick={addSkill}
          className="px-3 py-2 rounded-xl text-sm bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/[0.12] transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

type EditingProject = Omit<Project, 'created_at' | 'updated_at'>;

function ProjectForm({ project, onSave, onCancel }: { project: EditingProject; onSave: (p: EditingProject) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<EditingProject>(project);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(values);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</label>
        <input
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className="rounded-xl px-3 py-2 text-sm bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Summary</label>
        <textarea
          value={values.summary}
          onChange={(e) => setValues((v) => ({ ...v, summary: e.target.value }))}
          rows={3}
          className="rounded-xl px-3 py-2 text-sm bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cover Image</label>
        <ImageUploadZone
          currentUrl={values.image_url}
          onUpload={async (file) => {
            const url = await uploadProjectCover(file);
            setValues((v) => ({ ...v, image_url: url }));
            return url;
          }}
          onDelete={async (url) => {
            await deleteProjectCover(url);
            setValues((v) => ({ ...v, image_url: null }));
          }}
          label="Upload project cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Skills</label>
        <SkillTagInput
          skills={values.skills}
          onChange={(skills) => setValues((v) => ({ ...v, skills }))}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full px-5 py-2 text-sm bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full px-5 py-2 text-sm border border-black/[0.1] dark:border-white/[0.1] text-gray-600 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        >
          Cancel
        </button>
        {saved && <span className="text-green-600 dark:text-green-400 text-xs">Saved!</span>}
      </div>
    </div>
  );
}

export function ProjectsManagerClient({ initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleSave(updated: EditingProject) {
    await upsertProject(updated);
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    setExpandedId(null);
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.name}"?`)) return;
    await deleteProject(project.id, project.image_url);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  }

  function handleNewProject() {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: 'New Project',
      summary: '',
      image_url: null,
      skills: [],
      display_order: projects.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    setExpandedId(newProject.id);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(projects);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const withOrder = reordered.map((p, i) => ({ ...p, display_order: i }));
    setProjects(withOrder);
    await reorderProjects(withOrder.map((p) => p.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={handleNewProject}
          className="rounded-full px-5 py-2 text-sm bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          + New project
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="projects">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-3">
              {projects.map((project, index) => (
                <Draggable key={project.id} draggableId={project.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`rounded-[20px] p-5 transition-shadow ${
                        snapshot.isDragging ? 'shadow-2xl' : ''
                      }`}
                      style={{
                        ...provided.draggableProps.style,
                        backdropFilter: 'var(--intro-glass-filter)',
                        WebkitBackdropFilter: 'var(--intro-glass-filter)',
                        background: 'var(--intro-glass-bg)',
                        border: '1px solid var(--intro-glass-border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 dark:text-gray-500 select-none">
                          ⠿
                        </div>
                        <span
                          className="flex-1 text-gray-900 dark:text-gray-50 font-medium"
                          style={{ fontFamily: 'var(--font-recursive)' }}
                        >
                          {project.name || 'Untitled'}
                        </span>
                        <button
                          onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          {expandedId === project.id ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(project)}
                          className="text-sm text-red-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      {expandedId === project.id && (
                        <ProjectForm
                          project={project}
                          onSave={handleSave}
                          onCancel={() => setExpandedId(null)}
                        />
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
