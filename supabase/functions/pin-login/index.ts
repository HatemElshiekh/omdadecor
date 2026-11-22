// POST /functions/v1/pin-login (public, rate-limited). PLAN.md 11.4 / 12.2.
// The PIN check, lockout and per-IP limit run atomically in public.pin_login_check().
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { env, error, json, preflight } from '../_shared/http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error(405, 'METHOD', 'طلب غير مسموح');

  let body: { staff_id?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return error(400, 'BAD_REQUEST', 'طلب غير صحيح');
  }
  const staffId = typeof body.staff_id === 'string' ? body.staff_id : '';
  const pin = typeof body.pin === 'string' ? body.pin : '';
  if (!UUID.test(staffId) || pin.length > 8) return error(400, 'BAD_REQUEST', 'طلب غير صحيح');

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  const url = env('SUPABASE_URL');
  const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data, error: rpcError } = await admin.rpc('pin_login_check', {
    p_staff_id: staffId,
    p_pin: pin,
    p_ip: ip,
  });
  if (rpcError || !data) return error(500, 'DB', 'حصلت مشكلة، جرّب تاني');

  switch (data.status) {
    case 'rate_limited':
      return error(429, 'RATE_LIMIT', 'استنى دقيقة وجرّب تاني');
    case 'locked':
      return error(423, 'LOCKED', 'استنى 10 دقايق أو كلّم المدير', { retry_at: data.retry_at });
    case 'bad_pin':
      return error(401, 'BAD_PIN', 'الرقم غلط، جرّب تاني', { attempts_left: data.attempts_left });
    case 'ok':
      break;
    default:
      return error(500, 'DB', 'حصلت مشكلة، جرّب تاني');
  }

  // Exchange the internal credentials for a session. They never leave this function.
  const anon = createClient(url, env('SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
  const { data: auth, error: authError } = await anon.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (authError || !auth.session) return error(500, 'AUTH', 'حصلت مشكلة، جرّب تاني');

  return json({
    access_token: auth.session.access_token,
    refresh_token: auth.session.refresh_token,
    role: data.role,
  });
});
