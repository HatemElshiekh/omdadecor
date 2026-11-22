-- 0004: newer Supabase projects no longer grant DML on public tables to service_role by
-- default. Edge Functions (staff-list, import-edara, ...) run as service_role, so grant it
-- explicitly, now and for tables created by later migrations.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
