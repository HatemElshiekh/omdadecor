// GET /functions/v1/staff-list (public). PLAN.md 12.1: active staff, id + name only.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { env, error, json, preflight } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'GET') return error(405, 'METHOD', 'طلب غير مسموح');

  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const { data, error: dbError } = await admin
    .from('staff')
    .select('id, display_name')
    .eq('is_active', true)
    .order('role', { ascending: false }) // sales before manager
    .order('display_name');
  if (dbError) return error(500, 'DB', 'حصلت مشكلة، جرّب تاني');

  return json(data.map((s) => ({ id: s.id, display_name: s.display_name, avatar_url: null })));
});
