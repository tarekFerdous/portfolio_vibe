'use server';

import { createClient } from '@/lib/supabase/server';
import type { Contacts } from '@/lib/supabase/types';

export async function fetchContacts(): Promise<Contacts | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('contacts').select('*').single();
  // PGRST116 = "no rows returned", which means no contacts row has been created yet (not a query failure).
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

export async function upsertContacts(values: Omit<Contacts, 'id' | 'updated_at'>): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase.from('contacts').select('id').single();
  // PGRST116 = "no rows returned", which means no contacts row exists yet (not a query failure).
  if (fetchError && fetchError.code !== 'PGRST116') throw new Error(fetchError.message);
  if (existing) {
    const { error } = await supabase
      .from('contacts')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('contacts').insert({ ...values });
    if (error) throw new Error(error.message);
  }
}
