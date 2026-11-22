import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fails loudly in dev; in prod the build env must provide both (netlify.toml).
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set');
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const functionsUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;
