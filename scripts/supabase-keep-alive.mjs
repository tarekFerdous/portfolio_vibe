import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { error } = await supabase.from('projects').select('id').limit(1);

if (error) throw error;

console.log('Supabase keep-alive ping succeeded');
