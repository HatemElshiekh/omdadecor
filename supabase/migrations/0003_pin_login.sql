-- 0003: PIN login support (PLAN.md 11.4, 12.2).
--
-- Deviation from 11.4, same guarantees: the PIN pepper is generated INSIDE the database
-- (Supabase Vault) instead of being an Edge Function secret, so it never leaves Postgres
-- or passes through a human or a chat. bcrypt(pin + pepper) and the encrypted internal
-- password are computed here; Edge Functions only call pin_login_check() as service_role.

-- Pepper: 32 random bytes, created once.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pin_pepper') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'pin_pepper',
      'Pepper for staff PIN hashes and internal password encryption');
  end if;
end $$;

create function private.pin_pepper() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pin_pepper'
$$;
revoke all on function private.pin_pepper() from public, anon, authenticated;

-- Per-IP rate limit bookkeeping (20 attempts / minute).
create table private.pin_login_hits (
  ip text not null,
  at timestamptz not null default now()
);
create index pin_login_hits_ip_at on private.pin_login_hits (ip, at);
revoke all on private.pin_login_hits from public, anon, authenticated;

create function private.staff_email(p_staff_id uuid) returns text
language sql immutable set search_path = '' as $$
  select 'staff-' || p_staff_id::text || '@omdadecor.local'
$$;

-- Creates auth user + staff row + PIN hash + encrypted internal password. Server-only.
-- Used by the seed now and by staff admin (Phase 7).
create function private.create_staff(
  p_display_name text, p_role text, p_pin text, p_can_see_engineer_price boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := private.staff_email(v_id);
  v_password text := encode(extensions.gen_random_bytes(32), 'hex');
  v_pepper text := private.pin_pepper();
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must be 4 digits'; end if;
  if v_pepper is null then raise exception 'pin_pepper missing from vault'; end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now());

  insert into public.staff (id, display_name, role, pin_hash, can_see_engineer_price)
  values (v_id, p_display_name, p_role,
          extensions.crypt(p_pin || v_pepper, extensions.gen_salt('bf', 10)), p_can_see_engineer_price);
  insert into public.staff_secrets (staff_id, internal_password_enc)
  values (v_id, encode(extensions.pgp_sym_encrypt(v_password, v_pepper), 'base64'));
  return v_id;
end $$;
revoke all on function private.create_staff(text, text, text, boolean) from public, anon, authenticated;

-- The whole PIN check in one transaction: rate limit, lockout, bcrypt compare, counters.
-- Returns {status: ok|bad_pin|locked|rate_limited, ...}. Only service_role may call it.
create function public.pin_login_check(p_staff_id uuid, p_pin text, p_ip text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_staff public.staff%rowtype;
  v_pepper text := private.pin_pepper();
  v_hits int;
  v_password text;
  max_attempts constant int := 5;
begin
  -- Per-IP rate limit (PLAN 11.4: 20 requests / minute).
  delete from private.pin_login_hits where at < now() - interval '1 minute';
  insert into private.pin_login_hits (ip) values (coalesce(p_ip, 'unknown'));
  select count(*) into v_hits from private.pin_login_hits
    where ip = coalesce(p_ip, 'unknown') and at >= now() - interval '1 minute';
  if v_hits > 20 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  select * into v_staff from public.staff where id = p_staff_id and is_active for update;
  if not found then
    return jsonb_build_object('status', 'bad_pin', 'attempts_left', null);
  end if;

  if v_staff.locked_until is not null and v_staff.locked_until > now() then
    return jsonb_build_object('status', 'locked', 'retry_at', v_staff.locked_until);
  end if;
  if v_staff.locked_until is not null then  -- lock expired: start fresh
    update public.staff set failed_attempts = 0, locked_until = null where id = v_staff.id;
    v_staff.failed_attempts := 0;
  end if;

  if p_pin ~ '^[0-9]{4}$'
     and extensions.crypt(p_pin || v_pepper, v_staff.pin_hash) = v_staff.pin_hash then
    update public.staff set failed_attempts = 0, locked_until = null where id = v_staff.id;
    select extensions.pgp_sym_decrypt(decode(s.internal_password_enc, 'base64'), v_pepper)
      into v_password from public.staff_secrets s where s.staff_id = v_staff.id;
    return jsonb_build_object('status', 'ok', 'role', v_staff.role,
      'email', private.staff_email(v_staff.id), 'password', v_password);
  end if;

  v_staff.failed_attempts := v_staff.failed_attempts + 1;
  if v_staff.failed_attempts >= max_attempts then
    update public.staff set failed_attempts = v_staff.failed_attempts,
      locked_until = now() + interval '10 minutes' where id = v_staff.id
      returning locked_until into v_staff.locked_until;
    return jsonb_build_object('status', 'locked', 'retry_at', v_staff.locked_until);
  end if;
  update public.staff set failed_attempts = v_staff.failed_attempts where id = v_staff.id;
  return jsonb_build_object('status', 'bad_pin', 'attempts_left', max_attempts - v_staff.failed_attempts);
end $$;
revoke all on function public.pin_login_check(uuid, text, text) from public, anon, authenticated;
grant execute on function public.pin_login_check(uuid, text, text) to service_role;
