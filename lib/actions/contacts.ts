'use server';

import { createClient } from '@/lib/supabase/server';
import type { Contacts } from '@/lib/supabase/types';

export async function fetchContacts(): Promise<Contacts | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('contacts').select('*').single();
  return data;
}

export async function upsertContacts(values: Omit<Contacts, 'id' | 'updated_at'>): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('contacts').select('id').single();
  if (existing) {
    await supabase.from('contacts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    await supabase.from('contacts').insert({ ...values });
  }
}
