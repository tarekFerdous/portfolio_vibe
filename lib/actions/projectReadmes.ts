'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchGitHubReadme } from '@/lib/github/readme';
import type {
  Project,
  ProjectReadmeRow,
  ReadmeErrorReason,
  ReadmeSource,
  ReadmeStatus,
} from '@/lib/supabase/types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ReadmeProject = Pick<Project, 'id' | 'name' | 'repo_url'>;
/** The parts of an existing row a refresh needs to decide what it may touch. */
type ExistingReadme = Pick<ProjectReadmeRow, 'source' | 'manual_markdown'> | null;

export type ReadmeRefreshOutcome = 'ok' | 'no_readme' | 'removed' | 'error' | 'skipped_manual';

export type ReadmeRefreshResult = {
  outcome: ReadmeRefreshOutcome;
  reason?: ReadmeErrorReason;
  /** The row's status after the refresh: null when the stored README was deleted, absent when unknown. */
  status?: ReadmeStatus | null;
};

export type ReadmeRefreshSummaryEntry = ReadmeRefreshResult & { projectId: string; name: string };

export type ReadmeSourceInput = { source: ReadmeSource; manualMarkdown: string };

export type SaveReadmeSourceResult = {
  /** The source stored before this save (`github` when there was no row). */
  previousSource: ReadmeSource;
  /** The row's status after the save, or null when no row exists. */
  status: ReadmeStatus | null;
};

const TABLE = 'project_readmes';
const STATUS_COLUMNS = 'source, fetched_at, last_error, markdown, manual_markdown, manual_updated_at';
// Each project costs 2 GitHub calls plus a DB write; keep well inside Workers' subrequest limits.
const REFRESH_CONCURRENCY = 3;

type StatusRow = Pick<
  ProjectReadmeRow,
  'source' | 'fetched_at' | 'last_error' | 'markdown' | 'manual_markdown' | 'manual_updated_at'
>;

function toStatus(row: StatusRow): ReadmeStatus {
  return {
    source: row.source,
    fetched_at: row.fetched_at,
    last_error: row.last_error,
    has_markdown: row.markdown !== null,
    manual_markdown: row.manual_markdown,
    manual_updated_at: row.manual_updated_at,
  };
}

async function fetchExistingReadme(supabase: SupabaseClient, projectId: string): Promise<ExistingReadme> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('source, manual_markdown')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Drops the GitHub copy; the row survives only while it still holds a manual README. */
async function removeGitHubReadme(supabase: SupabaseClient, projectId: string, existing: ExistingReadme): Promise<ReadmeRefreshResult> {
  if (!existing?.manual_markdown) {
    const { error } = await supabase.from(TABLE).delete().eq('project_id', projectId);
    if (error) throw new Error(error.message);
    return { outcome: 'removed', status: null };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      markdown: null,
      owner: null,
      repo: null,
      branch: null,
      is_private: null,
      html_url: null,
      readme_path: null,
      fetched_at: null,
      last_attempt_at: null,
      last_error: null,
    })
    .eq('project_id', projectId)
    .select(STATUS_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return { outcome: 'removed', status: toStatus(data) };
}

async function refreshReadmeFor(
  supabase: SupabaseClient,
  project: ReadmeProject,
  existing: ExistingReadme,
): Promise<ReadmeRefreshResult> {
  // A manual README is the admin's sanitized text; GitHub must never overwrite or delete it.
  if (existing?.source === 'manual') return { outcome: 'skipped_manual' };
  if (!project.repo_url) return removeGitHubReadme(supabase, project.id, existing);

  const result = await fetchGitHubReadme(project.repo_url);
  const now = new Date().toISOString();

  if (result.outcome === 'error') {
    // Only touch the attempt columns so the last good README survives transient failures.
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ project_id: project.id, last_attempt_at: now, last_error: result.reason })
      .select(STATUS_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return { outcome: 'error', reason: result.reason, status: toStatus(data) };
  }

  const { metadata } = result;
  // Only the GitHub columns: the source and any manual README are left as they are.
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      project_id: project.id,
      markdown: result.outcome === 'ok' ? result.markdown : null,
      owner: metadata.owner,
      repo: metadata.repo,
      branch: metadata.branch,
      is_private: metadata.isPrivate,
      html_url: metadata.htmlUrl,
      readme_path: metadata.readmePath,
      fetched_at: now,
      last_attempt_at: now,
      last_error: null,
    })
    .select(STATUS_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return { outcome: result.outcome, status: toStatus(data) };
}

/**
 * Re-fetches one project's README and applies the storage rules: a manual
 * source is skipped, no repo_url drops the GitHub copy, `ok`/`no_readme`
 * replace the content and clear the error, and an error records the attempt
 * while keeping the existing markdown.
 */
export async function refreshProjectReadme(projectId: string): Promise<ReadmeRefreshResult> {
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, repo_url')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) throw new Error('Project not found.');
  return refreshReadmeFor(supabase, project, await fetchExistingReadme(supabase, projectId));
}

/** Refreshes every project with a repo_url (hidden ones included), isolating per-project failures. */
export async function refreshAllProjectReadmes(): Promise<ReadmeRefreshSummaryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, repo_url')
    .not('repo_url', 'is', null)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  const projects: ReadmeProject[] = data ?? [];

  // One query for every row's source, rather than a lookup per project.
  const { data: rows, error: rowsError } = await supabase.from(TABLE).select('project_id, source, manual_markdown');
  if (rowsError) throw new Error(rowsError.message);
  const existingById = new Map((rows ?? []).map(({ project_id, ...row }) => [project_id, row]));

  const summary: ReadmeRefreshSummaryEntry[] = new Array(projects.length);
  let next = 0;
  async function worker() {
    while (next < projects.length) {
      const index = next++;
      const project = projects[index];
      let result: ReadmeRefreshResult;
      try {
        result = await refreshReadmeFor(supabase, project, existingById.get(project.id) ?? null);
      } catch {
        // A DB write failed; report it as "network/other" without stopping the others.
        result = { outcome: 'error', reason: 'network' };
      }
      summary[index] = { projectId: project.id, name: project.name, ...result };
    }
  }
  await Promise.all(Array.from({ length: Math.min(REFRESH_CONCURRENCY, projects.length) }, worker));
  return summary;
}

/**
 * Stores a project's README source and, for `manual`, its pasted markdown
 * (blank text is stored as null). Switching to `github` keeps the manual text
 * so switching back doesn't lose it. A GitHub-source save with no existing
 * row writes nothing.
 */
export async function saveReadmeSource(projectId: string, input: ReadmeSourceInput): Promise<SaveReadmeSourceResult> {
  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from(TABLE)
    .select(STATUS_COLUMNS)
    .eq('project_id', projectId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  const previousSource = existing?.source ?? 'github';

  if (input.source === 'github') {
    if (previousSource === 'github') return { previousSource, status: existing ? toStatus(existing) : null };
    const { data, error } = await supabase
      .from(TABLE)
      .update({ source: 'github' })
      .eq('project_id', projectId)
      .select(STATUS_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return { previousSource, status: toStatus(data) };
  }

  const manualMarkdown = input.manualMarkdown.trim() ? input.manualMarkdown : null;
  const textChanged = !existing || existing.manual_markdown !== manualMarkdown;
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      project_id: projectId,
      source: 'manual',
      manual_markdown: manualMarkdown,
      ...(textChanged ? { manual_updated_at: new Date().toISOString() } : {}),
    })
    .select(STATUS_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return { previousSource, status: toStatus(data) };
}

/** The stored README for the public project page (RLS hides rows of hidden projects). */
export async function fetchStoredReadme(projectId: string): Promise<ProjectReadmeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select('*').eq('project_id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** README status (and manual README text) per project id, for the admin Projects manager. */
export async function fetchReadmeStatuses(): Promise<Record<string, ReadmeStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select(`project_id, ${STATUS_COLUMNS}`);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((row) => [row.project_id, toStatus(row)]));
}
