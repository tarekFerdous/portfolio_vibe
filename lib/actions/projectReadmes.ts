'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchGitHubReadme } from '@/lib/github/readme';
import type { Project, ProjectReadmeRow, ReadmeErrorReason, ReadmeStatus } from '@/lib/supabase/types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ReadmeProject = Pick<Project, 'id' | 'name' | 'repo_url'>;

export type ReadmeRefreshOutcome = 'ok' | 'no_readme' | 'removed' | 'error';

export type ReadmeRefreshResult = {
  outcome: ReadmeRefreshOutcome;
  reason?: ReadmeErrorReason;
  /** The row's status after the refresh: null when the stored README was deleted, absent when unknown. */
  status?: ReadmeStatus | null;
};

export type ReadmeRefreshSummaryEntry = ReadmeRefreshResult & { projectId: string; name: string };

const TABLE = 'project_readmes';
// Each project costs 2 GitHub calls plus a DB write; keep well inside Workers' subrequest limits.
const REFRESH_CONCURRENCY = 3;

function toStatus(row: Pick<ProjectReadmeRow, 'fetched_at' | 'last_error' | 'markdown'>): ReadmeStatus {
  return { fetched_at: row.fetched_at, last_error: row.last_error, has_markdown: row.markdown !== null };
}

async function refreshReadmeFor(supabase: SupabaseClient, project: ReadmeProject): Promise<ReadmeRefreshResult> {
  if (!project.repo_url) {
    const { error } = await supabase.from(TABLE).delete().eq('project_id', project.id);
    if (error) throw new Error(error.message);
    return { outcome: 'removed', status: null };
  }

  const result = await fetchGitHubReadme(project.repo_url);
  const now = new Date().toISOString();

  if (result.outcome === 'error') {
    // Only touch the attempt columns so the last good README survives transient failures.
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ project_id: project.id, last_attempt_at: now, last_error: result.reason })
      .select('fetched_at, last_error, markdown')
      .single();
    if (error) throw new Error(error.message);
    return { outcome: 'error', reason: result.reason, status: toStatus(data) };
  }

  const { metadata } = result;
  const row: ProjectReadmeRow = {
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
  };
  const { error } = await supabase.from(TABLE).upsert(row);
  if (error) throw new Error(error.message);
  return { outcome: result.outcome, status: toStatus(row) };
}

/**
 * Re-fetches one project's README and applies the storage rules: no repo_url
 * deletes the row, `ok`/`no_readme` replace the content and clear the error,
 * and an error records the attempt while keeping the existing markdown.
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
  return refreshReadmeFor(supabase, project);
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

  const summary: ReadmeRefreshSummaryEntry[] = new Array(projects.length);
  let next = 0;
  async function worker() {
    while (next < projects.length) {
      const index = next++;
      const project = projects[index];
      let result: ReadmeRefreshResult;
      try {
        result = await refreshReadmeFor(supabase, project);
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

/** The stored README for the public project page (RLS hides rows of hidden projects). */
export async function fetchStoredReadme(projectId: string): Promise<ProjectReadmeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select('*').eq('project_id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** README status per project id, for the admin Projects manager. */
export async function fetchReadmeStatuses(): Promise<Record<string, ReadmeStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select('project_id, fetched_at, last_error, markdown');
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((row) => [row.project_id, toStatus(row)]));
}
