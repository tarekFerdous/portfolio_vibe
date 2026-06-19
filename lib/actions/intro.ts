'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteImage, uploadImage } from './images';
import type { Intro, IntroCover } from '@/lib/supabase/types';

export async function fetchIntro(): Promise<Intro | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('intro').select('*').single();
  return data;
}

export async function upsertIntro(values: { title: string; summary: string }): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('intro').select('id').single();
  if (existing) {
    await supabase.from('intro').update({ ...values, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    await supabase.from('intro').insert({ ...values });
  }
}

export async function fetchIntroCoverPool(): Promise<IntroCover[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('intro_covers').select('*').order('created_at', { ascending: true });
  return data ?? [];
}

export async function uploadIntroCover(file: File): Promise<IntroCover> {
  const supabase = await createClient();
  const url = await uploadImage('intro-covers', file);
  const storagePath = url.split('/intro-covers/')[1];
  const { data, error } = await supabase
    .from('intro_covers')
    .insert({ storage_path: storagePath, url })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteIntroCover(id: string, url: string): Promise<void> {
  const supabase = await createClient();
  await deleteImage('intro-covers', url);
  await supabase.from('intro_covers').delete().eq('id', id);
}
