-- Minimal stand-in for the Supabase platform so migrations and RLS tests run on
-- plain Postgres (CI / local without Docker). NOT applied to real projects.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;
create table if not exists auth.users (
  instance_id uuid, id uuid primary key, aud varchar, role varchar, email varchar,
  encrypted_password varchar, email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token varchar, recovery_token varchar, email_change_token_new varchar,
  email_change varchar, email_change_token_current varchar, phone_change text,
  phone_change_token varchar, reauthentication_token varchar
);
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(), provider_id text not null, user_id uuid not null,
  identity_data jsonb not null, provider text not null, last_sign_in_at timestamptz,
  created_at timestamptz, updated_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

-- Vault stand-in (plaintext; test only).
create schema if not exists vault;
create table if not exists vault.secrets (name text primary key, secret text, description text);
create or replace view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(new_secret text, new_name text, new_description text default '')
returns uuid language sql as $$
  insert into vault.secrets values (new_name, new_secret, new_description) returning gen_random_uuid()
$$;

grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase default privileges (the migration must revoke these itself).
-- Matches current Supabase: anon/authenticated get ALL (migrations revoke), service_role
-- gets no DML by default (migration 0004 grants it).
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant references, trigger, truncate on tables to service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
