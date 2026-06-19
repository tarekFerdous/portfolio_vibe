'use server';

import { createClient } from '@/lib/supabase/server';

export async function uploadImage(bucket: string, file: File): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImage(bucket: string, url: string): Promise<void> {
  const supabase = await createClient();
  const path = url.split(`/${bucket}/`)[1];
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}
