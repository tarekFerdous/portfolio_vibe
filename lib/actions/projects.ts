'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteImage, uploadImage } from './images';
import type { Project } from '@/lib/supabase/types';

export async function fetchProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*').order('display_order', { ascending: true });
  return data ?? [];
}

export async function fetchVisibleProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('visibility', 'visible')
    .order('display_order', { ascending: true });
  return data ?? [];
}

export async function setProjectVisibility(id: string, visibility: Project['visibility']): Promise<void> {
  const supabase = await createClient();
  await supabase.from('projects').update({ visibility }).eq('id', id);
}

export async function upsertProject(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<void> {
  const supabase = await createClient();
  await supabase.from('projects').upsert({ ...project, updated_at: new Date().toISOString() });
}

export async function deleteProject(id: string, imageUrl: string | null): Promise<void> {
  const supabase = await createClient();
  if (imageUrl) await deleteImage('project-covers', imageUrl);
  await supabase.from('projects').delete().eq('id', id);
}

export async function reorderProjects(orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('projects').update({ display_order: index }).eq('id', id)
    )
  );
}

export async function uploadProjectCover(file: File): Promise<string> {
  return uploadImage('project-covers', file);
}

export async function deleteProjectCover(url: string): Promise<void> {
  return deleteImage('project-covers', url);
}
