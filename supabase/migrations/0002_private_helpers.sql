-- 0002: hide RLS helpers from the PostgREST API (Supabase advisor 0029) and make
-- staff_admin_upsert server-only (PLAN.md 12.5: called by Edge Function / service role).
-- Policies and views bind functions by OID, so moving the schema keeps them working.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.current_staff() set schema private;
alter function public.is_manager() set schema private;
alter function public.visible_engineer_price(uuid) set schema private;

revoke execute on function public.staff_admin_upsert(uuid, text, text, boolean, boolean) from authenticated;
