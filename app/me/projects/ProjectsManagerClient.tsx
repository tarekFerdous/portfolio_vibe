'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { ImageUploadZone } from '@/components/admin/ImageUploadZone';
import { ProjectReadme } from '@/components/projects/ProjectReadme';
import {
  refreshAllProjectReadmes,
  type ReadmeRefreshSummaryEntry,
  type ReadmeSourceInput,
} from '@/lib/actions/projectReadmes';
import { upsertProject, deleteProject, reorderProjects, uploadProjectCover, deleteProjectCover, setProjectVisibility } from '@/lib/actions/projects';
import { colorForId, pickRandomColor } from '@/lib/colors';
import { parseGitHubRepoUrl } from '@/lib/github/repoUrl';
import type { Project, ReadmeErrorReason, ReadmeSource, ReadmeStatus } from '@/lib/supabase/types';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import { isValidSlug, slugify } from '@/lib/utils/slug';

interface Props {
  initialProjects: Project[];
  initialReadmeStatuses?: Record<string, ReadmeStatus>;
  fetchError?: string | null;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const README_ERROR_LABELS: Record<ReadmeErrorReason, string> = {
  no_access: 'no access',
  rate_limited: 'rate limited',
  network: 'network error',
};

function readmeStatusText(status: ReadmeStatus | undefined): string {
  if (status?.source === 'manual') {
    return status.manual_markdown && status.manual_updated_at
      ? `Manual README · updated ${formatRelativeTime(status.manual_updated_at)}`
      : 'Manual README empty';
  }
  if (!status) return 'README not fetched yet';
  const fetched = status.fetched_at
    ? status.has_markdown
      ? `README fetched ${formatRelativeTime(status.fetched_at)}`
      : 'No README'
    : null;
  if (status.last_error) {
    const failed = `Fetch failed: ${README_ERROR_LABELS[status.last_error]}`;
    return fetched ? `${failed} · ${fetched}` : failed;
  }
  return fetched ?? 'README not fetched yet';
}

function formatRefreshSummary(summary: ReadmeRefreshSummaryEntry[]): string {
  if (summary.length === 0) return 'No projects have a repo URL.';
  const failed = summary.filter((entry) => entry.outcome === 'error');
  const skipped = summary.filter((entry) => entry.outcome === 'skipped_manual');
  const parts = [`Refreshed ${summary.length - failed.length - skipped.length}`];
  if (skipped.length > 0) {
    parts.push(`Skipped ${skipped.length} (manual): ${skipped.map((entry) => entry.name).join(', ')}`);
  }
  if (failed.length > 0) {
    const failures = failed
      .map((entry) => `${entry.name} (${README_ERROR_LABELS[entry.reason ?? 'network']})`)
      .join(', ');
    parts.push(`Failed ${failed.length}: ${failures}`);
  }
  return parts.join(' · ');
}

// Keep in sync with the `projects_summary_max_length` check constraint in
// supabase/migrations/006_add_project_summary_length_constraint.sql.
const SUMMARY_MAX_LENGTH = 300;

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

function validateProject(values: EditingProject, takenSlugs: string[]): string | null {
  if (values.summary.length > SUMMARY_MAX_LENGTH) {
    return `Summary must be ${SUMMARY_MAX_LENGTH} characters or fewer (currently ${values.summary.length}).`;
  }
  if (!values.slug) return 'Slug is required.';
  if (!isValidSlug(values.slug)) {
    return 'Slug may only contain lowercase letters, numbers, and single hyphens.';
  }
  if (takenSlugs.includes(values.slug)) return 'That slug is already used by another project.';
  if (values.repo_url && !parseGitHubRepoUrl(values.repo_url)) {
    return 'Repo URL must look like https://github.com/owner/repo.';
  }
  return null;
}

const INPUT_CLASS =
  'rounded-xl px-3 py-2 text-sm bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20';

const SEGMENT_CLASS = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-sm transition-colors ${
    active
      ? 'bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900'
      : 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/[0.12]'
  }`;

export function ProjectForm({
  project,
  readme,
  onSave,
  onCancel,
  takenSlugs = [],
}: {
  project: EditingProject;
  /** The project's stored README status; supplies the current source and manual text. */
  readme?: ReadmeStatus;
  /** Resolves with a warning to show instead of "Saved!" when the save succeeded only partially. */
  onSave: (p: EditingProject, readme: ReadmeSourceInput) => Promise<string | void>;
  onCancel: () => void;
  takenSlugs?: string[];
}) {
  const [readmeSource, setReadmeSource] = useState<ReadmeSource>(readme?.source ?? 'github');
  // Only ever the stored manual text — never prefilled from the GitHub copy, so unsanitized
  // org content can't be published by saving without editing.
  const [manualMarkdown, setManualMarkdown] = useState(readme?.manual_markdown ?? '');
  const [previewing, setPreviewing] = useState(false);
  const [values, setValues] = useState<EditingProject>(() => ({
    ...project,
    slug: project.slug || slugify(project.name),
    repo_url: project.repo_url ?? null,
  }));
  // A brand-new project (no saved slug yet) keeps its slug in sync with the
  // name until the slug is edited by hand. Existing slugs are left alone so
  // renaming a project doesn't silently change its public URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(project.slug));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  async function handleSave() {
    const validationError = validateProject(values, takenSlugs);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveWarning(null);
    try {
      const warning = await onSave(
        { ...values, repo_url: values.repo_url?.trim() || null },
        { source: readmeSource, manualMarkdown }
      );
      setSaving(false);
      if (warning) {
        setSaveWarning(warning);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaving(false);
      setSaveError(getErrorMessage(err, 'Failed to save project.'));
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</label>
        <input
          value={values.name}
          onChange={(e) => {
            const name = e.target.value;
            setValues((v) => ({ ...v, name, slug: slugEdited ? v.slug : slugify(name) }));
          }}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`slug-${project.id}`} className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Slug</label>
        <input
          id={`slug-${project.id}`}
          value={values.slug}
          onChange={(e) => {
            setSlugEdited(true);
            setValues((v) => ({ ...v, slug: e.target.value }));
          }}
          placeholder="my-project"
          className={INPUT_CLASS}
        />
        <span className="text-xs text-gray-400 dark:text-gray-500">/projects/{values.slug || '…'}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`repo-url-${project.id}`} className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">GitHub repo URL</label>
        <input
          id={`repo-url-${project.id}`}
          type="url"
          value={values.repo_url ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, repo_url: e.target.value }))}
          placeholder="https://github.com/owner/repo"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span id={`readme-source-${project.id}`} className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          README source
        </span>
        <div role="group" aria-labelledby={`readme-source-${project.id}`} className="flex gap-2">
          {(['github', 'manual'] as const).map((source) => (
            <button
              key={source}
              type="button"
              aria-pressed={readmeSource === source}
              onClick={() => setReadmeSource(source)}
              className={SEGMENT_CLASS(readmeSource === source)}
            >
              {source === 'github' ? 'GitHub' : 'Manual'}
            </button>
          ))}
        </div>
        {readmeSource === 'manual' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`manual-readme-${project.id}`} className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Manual README (Markdown)
              </label>
              <div role="group" aria-label="Manual README view" className="flex gap-1">
                <button type="button" aria-pressed={!previewing} onClick={() => setPreviewing(false)} className={SEGMENT_CLASS(!previewing)}>
                  Write
                </button>
                <button type="button" aria-pressed={previewing} onClick={() => setPreviewing(true)} className={SEGMENT_CLASS(previewing)}>
                  Preview
                </button>
              </div>
            </div>
            {previewing ? (
              <div
                data-testid="manual-readme-preview"
                className="max-h-[480px] overflow-y-auto rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08]"
              >
                {manualMarkdown.trim() ? (
                  <ProjectReadme markdown={manualMarkdown} />
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <textarea
                id={`manual-readme-${project.id}`}
                value={manualMarkdown}
                onChange={(e) => setManualMarkdown(e.target.value)}
                rows={14}
                placeholder="# Project name&#10;&#10;A general overview of what the project does…"
                className={`${INPUT_CLASS} resize-y font-mono`}
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Don&apos;t include internal URLs, client names, credentials, or org-specific details. Images must use absolute
              URLs; relative links and images are removed. GitHub refreshes never overwrite this text.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Summary</label>
        <textarea
          value={values.summary}
          onChange={(e) => setValues((v) => ({ ...v, summary: e.target.value }))}
          rows={3}
          className="rounded-xl px-3 py-2 text-sm bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none"
        />
        <span
          className={`text-xs self-end ${
            values.summary.length > SUMMARY_MAX_LENGTH
              ? 'text-red-500 dark:text-red-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {values.summary.length}/{SUMMARY_MAX_LENGTH}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</label>
        <textarea
          value={values.project_description}
          onChange={(e) => setValues((v) => ({ ...v, project_description: e.target.value }))}
          rows={8}
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
        <div className="flex items-center gap-2 pt-1">
          <span
            className="h-5 w-5 rounded-full border border-black/[0.08] dark:border-white/[0.08]"
            style={{ backgroundColor: values.bg_color ?? undefined }}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => setValues((v) => ({ ...v, bg_color: pickRandomColor() }))}
            className="px-3 py-2 rounded-xl text-sm bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/[0.12] transition-colors"
          >
            Randomize
          </button>
        </div>
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
        {saved && !saveError && <span className="text-green-600 dark:text-green-400 text-xs">Saved!</span>}
        {saveWarning && !saveError && (
          <span role="status" className="text-amber-600 dark:text-amber-400 text-xs">
            {saveWarning}
          </span>
        )}
        {saveError && (
          <span role="alert" className="text-red-500 dark:text-red-400 text-xs">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProjectsManagerClient({ initialProjects, initialReadmeStatuses = {}, fetchError = null }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [readmeStatuses, setReadmeStatuses] = useState<Record<string, ReadmeStatus>>(initialReadmeStatuses);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Backfill a deterministic accent color for pre-existing projects that
  // predate the `bg_color` column, so the color a visitor already saw as the
  // fallback (colorForId) becomes the persisted value. Runs once on mount;
  // projects that already have a bg_color are left untouched.
  useEffect(() => {
    const needsBackfill = initialProjects.filter((p) => p.bg_color === null);
    if (needsBackfill.length === 0) return;

    async function backfillColors() {
      for (const project of needsBackfill) {
        const bg_color = colorForId(project.id);
        const { created_at, updated_at, ...rest } = project;
        try {
          await upsertProject({ ...rest, bg_color });
          setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, bg_color } : p)));
        } catch {
          // Best-effort backfill; leave the row's bg_color as-is if persistence fails.
        }
      }
    }

    backfillColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[id] = message;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  function setReadmeStatus(id: string, status: ReadmeStatus | null | undefined) {
    if (status === undefined) return;
    setReadmeStatuses((prev) => {
      const next = { ...prev };
      if (status) {
        next[id] = status;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  async function handleSave(updated: EditingProject, readmeInput: ReadmeSourceInput): Promise<string | void> {
    const { readme } = await upsertProject(updated, readmeInput);
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    setRowError(updated.id, null);
    setReadmeStatus(updated.id, readme?.status);
    if (readme?.outcome === 'error') {
      // Keep the form open so the amber note is visible next to the Save button.
      return `Saved, but the README couldn't be fetched: ${README_ERROR_LABELS[readme.reason ?? 'network']}`;
    }
    setExpandedId(null);
  }

  async function handleRefreshReadmes() {
    setRefreshing(true);
    setRefreshSummary(null);
    setRefreshError(null);
    try {
      const summary = await refreshAllProjectReadmes();
      for (const entry of summary) setReadmeStatus(entry.projectId, entry.status);
      setRefreshSummary(formatRefreshSummary(summary));
    } catch (err) {
      setRefreshError(getErrorMessage(err, 'Failed to refresh READMEs.'));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.name}"?`)) return;
    const index = projects.findIndex((p) => p.id === project.id);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setRowError(project.id, null);
    try {
      await deleteProject(project.id, project.image_url);
    } catch (err) {
      setProjects((prev) => {
        const next = [...prev];
        const restoreAt = index >= 0 && index <= next.length ? index : next.length;
        next.splice(restoreAt, 0, project);
        return next;
      });
      setRowError(project.id, getErrorMessage(err, 'Failed to delete project.'));
    }
  }

  function handleNewProject() {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: 'New Project',
      slug: '',
      repo_url: null,
      summary: '',
      project_description: '',
      image_url: null,
      bg_color: pickRandomColor(),
      skills: [],
      display_order: projects.length,
      visibility: 'visible',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    setExpandedId(newProject.id);
  }

  async function handleToggleVisibility(project: Project) {
    const previousVisibility = project.visibility;
    const visibility = previousVisibility === 'visible' ? 'hidden' : 'visible';
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, visibility } : p)));
    setRowError(project.id, null);
    try {
      await setProjectVisibility(project.id, visibility);
    } catch (err) {
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, visibility: previousVisibility } : p)));
      setRowError(project.id, getErrorMessage(err, 'Failed to update visibility.'));
    }
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const previousProjects = projects;
    const reordered = Array.from(projects);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const withOrder = reordered.map((p, i) => ({ ...p, display_order: i }));
    setProjects(withOrder);
    setReorderError(null);
    try {
      await reorderProjects(withOrder.map((p) => p.id));
    } catch (err) {
      setProjects(previousProjects);
      setReorderError(getErrorMessage(err, 'Failed to reorder projects.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {fetchError && (
        <p role="alert" className="text-sm text-red-500 dark:text-red-400">
          {fetchError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {refreshSummary && (
          <p role="status" className="mr-auto text-sm text-gray-600 dark:text-gray-400">
            {refreshSummary}
          </p>
        )}
        {refreshError && (
          <p role="alert" className="mr-auto text-sm text-red-500 dark:text-red-400">
            {refreshError}
          </p>
        )}
        <button
          onClick={handleRefreshReadmes}
          disabled={refreshing}
          className="rounded-full px-5 py-2 text-sm border border-black/[0.1] dark:border-white/[0.1] text-gray-700 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          {refreshing ? 'Refreshing READMEs…' : 'Refresh READMEs'}
        </button>
        <button
          onClick={handleNewProject}
          className="rounded-full px-5 py-2 text-sm bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:opacity-80 transition-opacity"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          + New project
        </button>
      </div>

      {reorderError && (
        <p role="alert" className="text-sm text-red-500 dark:text-red-400">
          {reorderError}
        </p>
      )}

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
                      } ${project.visibility === 'hidden' ? 'opacity-50' : ''}`}
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
                          type="button"
                          onClick={() => handleToggleVisibility(project)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            project.visibility === 'visible' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          aria-label={`Toggle visibility: currently ${project.visibility}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              project.visibility === 'visible' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
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

                      {(project.repo_url || readmeStatuses[project.id]?.source === 'manual') && (
                        <p
                          data-testid="readme-status"
                          className={`mt-1 pl-7 text-xs ${
                            readmeStatuses[project.id]?.last_error && readmeStatuses[project.id]?.source !== 'manual'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {readmeStatusText(readmeStatuses[project.id])}
                        </p>
                      )}

                      {rowErrors[project.id] && (
                        <p role="alert" className="mt-2 text-xs text-red-500 dark:text-red-400">
                          {rowErrors[project.id]}
                        </p>
                      )}

                      {expandedId === project.id && (
                        <ProjectForm
                          project={project}
                          readme={readmeStatuses[project.id]}
                          takenSlugs={projects.filter((p) => p.id !== project.id).map((p) => p.slug)}
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
