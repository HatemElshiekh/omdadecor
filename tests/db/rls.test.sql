-- RLS / privilege tests (PLAN.md 11.3, 17). Runs inside one transaction and rolls back.
-- Requires the migration + seed. Fails loudly (ERROR) on the first broken expectation.
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f tests/db/rls.test.sql
begin;

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', uid::text, true);
$$;

-- Fixtures (as table owner) ------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'rls-manager@test.local'),
  ('00000000-0000-4000-8000-0000000000a2', 'rls-rep-a@test.local'),
  ('00000000-0000-4000-8000-0000000000a3', 'rls-rep-b@test.local'),
  ('00000000-0000-4000-8000-0000000000a4', 'rls-rep-off@test.local');
insert into public.staff (id, display_name, role, pin_hash, can_see_engineer_price, is_active) values
  ('00000000-0000-4000-8000-0000000000a1', 'T manager', 'manager', 'x', false, true),
  ('00000000-0000-4000-8000-0000000000a2', 'T rep A',   'sales',   'x', false, true),
  ('00000000-0000-4000-8000-0000000000a3', 'T rep B',   'sales',   'x', true,  true),
  ('00000000-0000-4000-8000-0000000000a4', 'T rep off', 'sales',   'x', true,  false);
insert into public.staff_secrets values ('00000000-0000-4000-8000-0000000000a2', 'secret');
update public.products set engineer_price = 400, price = 450 where edara_row_no = 6;
insert into public.customers (id, name, phone, type, owner_staff_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'cust A', '01000000001', 'direct', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000c2', 'cust B', '01000000002', 'engineer', '00000000-0000-4000-8000-0000000000a3');

-- anon -----------------------------------------------------------------------
set local role anon;
do $$ begin
  perform 1 from public.products_for_staff; raise exception 'FAIL: anon read products_for_staff';
exception when insufficient_privilege then raise notice 'ok - anon denied products_for_staff'; end $$;
do $$ begin
  perform 1 from public.products; raise exception 'FAIL: anon read products';
exception when insufficient_privilege then raise notice 'ok - anon denied products'; end $$;
do $$ begin
  perform 1 from public.customers; raise exception 'FAIL: anon read customers';
exception when insufficient_privilege then raise notice 'ok - anon denied customers'; end $$;
do $$ begin
  perform 1 from public.staff; raise exception 'FAIL: anon read staff';
exception when insufficient_privilege then raise notice 'ok - anon denied staff'; end $$;
do $$ begin
  perform public.create_lead('x', '01000000003', 'direct', null, null); raise exception 'FAIL: anon create_lead';
exception when insufficient_privilege then raise notice 'ok - anon cannot execute RPCs'; end $$;
reset role;

-- rep A (no engineer price) ---------------------------------------------------
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000a2');
select pg_temp.ok((select count(*) from public.products_for_staff) = 100, 'rep reads 100 products');
select pg_temp.ok((select engineer_price from public.products_for_staff where edara_row_no = 6) is null, 'rep sees engineer_price as null');
select pg_temp.ok((select price from public.products_for_staff where edara_row_no = 6) = 450, 'rep sees price');
select pg_temp.ok((select stock_total from public.products_for_staff where edara_row_no = 6) = 528, 'stock_total via view');
do $$ begin
  perform engineer_price from public.products; raise exception 'FAIL: rep read products.engineer_price';
exception when insufficient_privilege then raise notice 'ok - rep denied products.engineer_price'; end $$;
do $$ begin
  perform pin_hash from public.staff; raise exception 'FAIL: rep read pin_hash';
exception when insufficient_privilege then raise notice 'ok - rep denied staff.pin_hash'; end $$;
do $$ begin
  perform 1 from public.staff_secrets; raise exception 'FAIL: rep read staff_secrets';
exception when insufficient_privilege then raise notice 'ok - rep denied staff_secrets'; end $$;
select pg_temp.ok((select count(*) from public.staff) = 1, 'rep sees only own staff row');
select pg_temp.ok((select count(*) from public.customers) = 1, 'rep sees only own customers');
select pg_temp.ok((select count(*) from public.imports) = 0, 'rep sees no imports');
insert into public.customers (name, phone, type, owner_staff_id)
  values ('own', '01000000004', 'direct', '00000000-0000-4000-8000-0000000000a2');
select pg_temp.ok(true, 'rep inserts own customer');
do $$ begin
  insert into public.customers (name, phone, type, owner_staff_id)
    values ('x', '01000000005', 'direct', '00000000-0000-4000-8000-0000000000a3');
  raise exception 'FAIL: rep inserted customer for another rep';
exception when insufficient_privilege then raise notice 'ok - rep cannot insert for another rep'; end $$;
update public.products set price = 1 where edara_row_no = 6;
update public.stock set qty = 0 where warehouse_id = 'nemis_shop';
insert into public.search_logs (staff_id, query, results_count) values ('00000000-0000-4000-8000-0000000000a2', 'رخام', 3);
update public.search_logs set opened_product_id = gen_random_uuid() where query = 'رخام';
select pg_temp.ok((select count(*) from public.search_logs where opened_product_id is not null) = 1, 'rep logs search and updates opened product');
do $$ begin
  insert into public.search_logs (staff_id, query) values ('00000000-0000-4000-8000-0000000000a3', 'x');
  raise exception 'FAIL: rep logged as another rep';
exception when insufficient_privilege then raise notice 'ok - rep cannot log as another rep'; end $$;
insert into public.assistant_logs (staff_id, question) values ('00000000-0000-4000-8000-0000000000a2', 'q?');
update public.assistant_logs set helpful = true where question = 'q?';
select pg_temp.ok((select helpful from public.assistant_logs where question = 'q?'), 'rep sets helpful on own log');
do $$ begin
  update public.assistant_logs set answer = 'forged'; raise exception 'FAIL: rep edited answer';
exception when insufficient_privilege then raise notice 'ok - rep cannot edit assistant answer'; end $$;
do $$ begin
  perform public.staff_admin_upsert(gen_random_uuid(), 'x', 'manager', true, true);
  raise exception 'FAIL: rep executed staff_admin_upsert';
exception when insufficient_privilege then raise notice 'ok - staff_admin_upsert is server-only'; end $$;
select pg_temp.ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('current_staff', 'is_manager', 'visible_engineer_price')
), 'RLS helpers are not exposed in the public API schema');
reset role;
select pg_temp.ok((select price from public.products where edara_row_no = 6) = 450, 'rep update on products had no effect');
select pg_temp.ok((select sum(qty) from public.stock where warehouse_id = 'nemis_shop') > 0, 'rep update on stock had no effect');

-- rep B (engineer price allowed) ----------------------------------------------
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000a3');
select pg_temp.ok((select engineer_price from public.products_for_staff where edara_row_no = 6) = 400, 'permitted rep sees engineer_price');
select pg_temp.ok((select count(*) from public.customers) = 1, 'rep B sees only own customer');
reset role;

-- inactive rep ---------------------------------------------------------------
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000a4');
select pg_temp.ok((select count(*) from public.products_for_staff) = 0, 'inactive staff read nothing');
reset role;

-- authenticated user with no staff row ----------------------------------------
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000ff');
select pg_temp.ok((select count(*) from public.products_for_staff) = 0, 'non-staff user reads nothing');
reset role;

-- manager ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
select pg_temp.ok((select engineer_price from public.products_for_staff where edara_row_no = 6) = 400, 'manager sees engineer_price');
select pg_temp.ok((select count(*) from public.customers) = 3, 'manager sees all customers');
select pg_temp.ok((select count(*) from public.staff) >= 4, 'manager sees all staff');
select pg_temp.ok((select count(*) from public.search_logs) = 1, 'manager reads search_logs');
update public.products set price = 500 where edara_row_no = 6;
insert into public.imports (staff_id, file_name, rows_read) values ('00000000-0000-4000-8000-0000000000a1', 't.xlsx', 1);
select pg_temp.ok((select count(*) from public.imports) = 1, 'manager writes and reads imports');
do $$ begin
  perform pin_hash from public.staff; raise exception 'FAIL: manager read pin_hash';
exception when insufficient_privilege then raise notice 'ok - manager still denied pin_hash'; end $$;
reset role;
select pg_temp.ok((select price from public.products where edara_row_no = 6) = 500, 'manager updated price');

-- service_role (Edge Functions) can read and write -----------------------------
set local role service_role;
select pg_temp.ok((select count(*) from public.staff) >= 4, 'service_role reads staff');
select pg_temp.ok((select count(*) from public.products) = 100, 'service_role reads products');
update public.stock set qty = qty where warehouse_id = 'nemis_main';
insert into public.imports (file_name) values ('svc');
select pg_temp.ok(true, 'service_role writes stock and imports');
reset role;

-- RLS enabled on every public table ------------------------------------------
select pg_temp.ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'RLS enabled on every table');

select 'ALL RLS TESTS PASSED' as result;
rollback;
