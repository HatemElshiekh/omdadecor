// PIN auth client (PLAN.md 9.1, 11.4, 12.1-12.2).
import { functionsUrl, supabase, SUPABASE_ANON_KEY } from './supabase';
import { queryClient } from './queryClient';

export type Role = 'sales' | 'manager';

export interface StaffCard {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Me {
  id: string;
  display_name: string;
  role: Role;
  can_see_engineer_price: boolean;
}

export type PinLoginResult =
  | { status: 'ok'; role: Role }
  | { status: 'bad_pin'; attemptsLeft: number | null }
  | { status: 'locked'; retryAt: string }
  | { status: 'rate_limited' }
  | { status: 'error' };

const headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };

export async function fetchStaffList(): Promise<StaffCard[]> {
  const res = await fetch(functionsUrl('staff-list'), { headers });
  if (!res.ok) throw new Error(`staff-list ${res.status}`);
  return (await res.json()) as StaffCard[];
}

export async function pinLogin(staffId: string, pin: string): Promise<PinLoginResult> {
  let res: Response;
  try {
    res = await fetch(functionsUrl('pin-login'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ staff_id: staffId, pin }),
    });
  } catch {
    return { status: 'error' };
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const err = (body?.error ?? {}) as Record<string, unknown>;
  if (res.status === 401) {
    return { status: 'bad_pin', attemptsLeft: (err.attempts_left as number | null) ?? null };
  }
  if (res.status === 423) return { status: 'locked', retryAt: String(err.retry_at ?? '') };
  if (res.status === 429) return { status: 'rate_limited' };
  if (!res.ok || !body?.access_token) return { status: 'error' };

  const { error } = await supabase.auth.setSession({
    access_token: String(body.access_token),
    refresh_token: String(body.refresh_token),
  });
  if (error) return { status: 'error' };
  queryClient.removeQueries({ queryKey: ['me'] });
  return { status: 'ok', role: body.role as Role };
}

/** The logged-in, active staff member, or null. */
export async function getMe(): Promise<Me | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;
  const { data: me, error } = await supabase
    .from('staff')
    .select('id, display_name, role, can_see_engineer_price')
    .eq('id', userId)
    .maybeSingle();
  if (error || !me) return null;
  return me as Me;
}

export const meQuery = { queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 } as const;

export async function signOut(): Promise<void> {
  await supabase.auth.signOut().catch(() => undefined);
  queryClient.clear();
}

export const homeFor = (role: Role) => (role === 'manager' ? '/manager' : '/');
