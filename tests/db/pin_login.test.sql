-- PIN login tests (PLAN.md 9.1 FR-1-3, 11.4). Runs in a transaction and rolls back.
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

create temp table t_ids as select private.create_staff('T rep', 'sales', '1234') as rep;
create temp table r (n int, res jsonb);

select pg_temp.ok((select pin_hash not like '%1234%' from public.staff where id = (select rep from t_ids)), 'PIN stored hashed');
select pg_temp.ok((select internal_password_enc is not null from public.staff_secrets where staff_id = (select rep from t_ids)), 'internal password stored encrypted');

-- Correct PIN
insert into r select 0, public.pin_login_check((select rep from t_ids), '1234', 'ip-a');
select pg_temp.ok((select res->>'status' from r where n = 0) = 'ok', 'correct PIN logs in');
select pg_temp.ok((select res->>'role' from r where n = 0) = 'sales', 'role returned');
select pg_temp.ok((
  select u.encrypted_password = extensions.crypt((select res->>'password' from r where n = 0), u.encrypted_password)
  from auth.users u where u.id = (select rep from t_ids)
), 'decrypted internal password matches the auth user');
select pg_temp.ok((select u.email from auth.users u where u.id = (select rep from t_ids)) = (select res->>'email' from r where n = 0), 'email matches auth user');

-- Wrong PINs: 4 x bad_pin then locked on the 5th
insert into r select i, public.pin_login_check((select rep from t_ids), '0000', 'ip-b') from generate_series(1, 5) i;
select pg_temp.ok((select res->>'status' from r where n = 1) = 'bad_pin' and (select (res->>'attempts_left')::int from r where n = 1) = 4, '1st wrong PIN: bad_pin, 4 left');
select pg_temp.ok((select res->>'status' from r where n = 4) = 'bad_pin' and (select (res->>'attempts_left')::int from r where n = 4) = 1, '4th wrong PIN: 1 left');
select pg_temp.ok((select res->>'status' from r where n = 5) = 'locked' and (select res ? 'retry_at' from r where n = 5), '5th wrong PIN locks the account');

-- 6th attempt, even with the CORRECT PIN, is rejected while locked
insert into r select 6, public.pin_login_check((select rep from t_ids), '1234', 'ip-b');
select pg_temp.ok((select res->>'status' from r where n = 6) = 'locked', '6th attempt within lock window rejected server-side');
select pg_temp.ok((select locked_until between now() + interval '9 minutes' and now() + interval '11 minutes' from public.staff where id = (select rep from t_ids)), 'lock lasts 10 minutes');

-- After the lock expires, the correct PIN works and counters reset
update public.staff set locked_until = now() - interval '1 second' where id = (select rep from t_ids);
insert into r select 7, public.pin_login_check((select rep from t_ids), '1234', 'ip-c');
select pg_temp.ok((select res->>'status' from r where n = 7) = 'ok', 'login works after lock expires');
select pg_temp.ok((select failed_attempts = 0 and locked_until is null from public.staff where id = (select rep from t_ids)), 'counters reset after success');

-- A success resets the consecutive-failure counter
insert into r select 8, public.pin_login_check((select rep from t_ids), '9999', 'ip-d');
insert into r select 9, public.pin_login_check((select rep from t_ids), '1234', 'ip-d');
select pg_temp.ok((select failed_attempts from public.staff where id = (select rep from t_ids)) = 0, 'failures are consecutive only');

-- Unknown / inactive staff look like a bad PIN (no user enumeration)
insert into r select 10, public.pin_login_check(gen_random_uuid(), '1234', 'ip-e');
select pg_temp.ok((select res->>'status' from r where n = 10) = 'bad_pin', 'unknown staff -> bad_pin');
update public.staff set is_active = false where id = (select rep from t_ids);
insert into r select 11, public.pin_login_check((select rep from t_ids), '1234', 'ip-e');
select pg_temp.ok((select res->>'status' from r where n = 11) = 'bad_pin', 'inactive staff cannot log in');
update public.staff set is_active = true where id = (select rep from t_ids);

-- Malformed PIN counts as a failure and never errors
insert into r select 12, public.pin_login_check((select rep from t_ids), 'abcd', 'ip-f');
select pg_temp.ok((select res->>'status' from r where n = 12) = 'bad_pin', 'malformed PIN -> bad_pin');

-- Per-IP rate limit: 20 per minute, 21st refused
insert into r select 100 + i, public.pin_login_check((select rep from t_ids), '1234', 'ip-flood') from generate_series(1, 21) i;
select pg_temp.ok((select res->>'status' from r where n = 120) = 'ok', '20th request from one IP allowed');
select pg_temp.ok((select res->>'status' from r where n = 121) = 'rate_limited', '21st request from one IP rate limited');

-- Nobody but service_role can call it
set local role authenticated;
do $$ begin
  perform public.pin_login_check(gen_random_uuid(), '1234', 'x'); raise exception 'FAIL: authenticated called pin_login_check';
exception when insufficient_privilege then raise notice 'ok - authenticated cannot call pin_login_check'; end $$;
do $$ begin
  perform private.create_staff('x', 'manager', '1111'); raise exception 'FAIL: authenticated called create_staff';
exception when insufficient_privilege then raise notice 'ok - authenticated cannot call create_staff'; end $$;
reset role;
set local role anon;
do $$ begin
  perform public.pin_login_check(gen_random_uuid(), '1234', 'x'); raise exception 'FAIL: anon called pin_login_check';
exception when insufficient_privilege then raise notice 'ok - anon cannot call pin_login_check'; end $$;
reset role;

select 'ALL PIN LOGIN TESTS PASSED' as result;
rollback;
