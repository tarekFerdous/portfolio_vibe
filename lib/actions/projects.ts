'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteImage, uploadImage } from './images';
import {
  refreshProjectReadme,
  saveReadmeSource,
  type ReadmeRefreshResult,
  type ReadmeSourceInput,
  type SaveReadmeSourceResult,
} from './projectReadmes';
import type { Project } from '@/lib/supabase/types';

export type SaveProjectResult = {
  /** Set when the save added, changed, or removed repo_url and so re-synced the stored README. */
  readme: ReadmeRefreshResult | null;
};

const UNIQUE_VIOLATION = '23505';
const SLUG_TAKEN_MESSAGE = 'That slug is already used by another project.';

export async function fetchProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('projects').select('*').order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchVisibleProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('visibility', 'visible')
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchVisibleProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('visibility', 'visible')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function setProjectVisibility(id: string, visibility: Project['visibility']): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').update({ visibility }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Saves a project and keeps its stored README in step. With `readme`, the
 * README source (and any manual text) is saved too. A manual source never
 * touches GitHub. A GitHub source re-syncs when repo_url was added, changed or
 * removed, or when the source was just switched back from manual.
 */
export async function upsertProject(
  project: Omit<Project, 'created_at' | 'updated_at'>,
  readme?: ReadmeSourceInput,
): Promise<SaveProjectResult> {
  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from('projects')
    .select('repo_url')
    .eq('id', project.id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const { error } = await supabase.from('projects').upsert({ ...project, updated_at: new Date().toISOString() });
  if (error?.code === UNIQUE_VIOLATION && error.message.includes('slug')) {
    throw new Error(SLUG_TAKEN_MESSAGE);
  }
  if (error) throw new Error(error.message);

  let switchedToGitHub = false;
  if (readme) {
    let saved: SaveReadmeSourceResult;
    try {
      saved = await saveReadmeSource(project.id, readme);
    } catch (err) {
      // Unlike a GitHub fetch, this is the admin's own text: surface it so it can be re-saved.
      throw new Error(`Saved the project, but not its README: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
    if (readme.source === 'manual') return { readme: { outcome: 'skipped_manual', status: saved.status } };
    switchedToGitHub = saved.previousSource === 'manual';
  }

  // Saving other fields leaves the stored README alone; only a repo_url change re-syncs it.
  if (!switchedToGitHub && (project.repo_url ?? null) === (existing?.repo_url ?? null)) return { readme: null };
  try {
    return { readme: await refreshProjectReadme(project.id) };
  } catch {
    // The project itself saved; a README sync failure must never fail the save.
    return { readme: { outcome: 'error', reason: 'network' } };
  }
}

export async function deleteProject(id: string, imageUrl: string | null): Promise<void> {
  const supabase = await createClient();
  if (imageUrl) await deleteImage('project-covers', imageUrl);
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderProjects(orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('projects').update({ display_order: index }).eq('id', id)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function uploadProjectCover(file: File): Promise<string> {
  return uploadImage('project-covers', file);
}

export async function deleteProjectCover(url: string): Promise<void> {
  return deleteImage('project-covers', url);
}
