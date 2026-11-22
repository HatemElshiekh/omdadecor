-- create_lead tests (PLAN.md 9.5). Runs in a transaction and rolls back.
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create temp table t as select private.create_staff('T rep A', 'sales', '1111') a, private.create_staff('T rep B', 'sales', '2222') b;
grant select on t to authenticated;
create temp table r (n int, res jsonb);
grant all on r to authenticated;
create temp table p as select id, name, category_ar from public.products where edara_row_no = 6;
grant select on p to authenticated;

set local role authenticated;
select pg_temp.as_user((select a from t));
insert into r select 1, public.create_lead('عميل تجربة', '01012345678', 'direct', (select id from p), 'حائط 4 × 2.8: 18 لوح');
select pg_temp.ok((select (res->>'is_existing')::boolean = false from r where n = 1), 'new customer created');
select pg_temp.ok((select count(*) from public.customers where phone = '01012345678') = 1, 'rep sees own new customer');
select pg_temp.ok((select count(*) from public.follow_ups f join public.interests i on i.id = f.interest_id where i.id = (select (res->>'interest_id')::uuid from r where n = 1)) = 4, '4 follow-ups created');
select pg_temp.ok((
  select array_agg(f.step order by f.step) = array[0,3,7,30]
     and bool_and(f.due_date = (now() at time zone 'Africa/Cairo')::date + f.step)
     and bool_and(f.staff_id = (select a from t))
  from public.follow_ups f where f.interest_id = (select (res->>'interest_id')::uuid from r where n = 1)
), 'steps D+0/3/7/30 on Cairo dates, owned by the rep');
select pg_temp.ok((select message from public.follow_ups where interest_id = (select (res->>'interest_id')::uuid from r where n = 1) and step = 0) = 'شكراً لزيارتك معرض العمدة، ده ملخص اللي اتفرجت عليه: ' || (select name from p), 'D+0 message uses Appendix 22 copy + product');
select pg_temp.ok((select message from public.follow_ups where interest_id = (select (res->>'interest_id')::uuid from r where n = 1) and step = 30) like 'عندنا جديد في ' || (select category_ar from p) || '%', 'D+30 message uses the category');
select pg_temp.ok((select note from public.interests where id = (select (res->>'interest_id')::uuid from r where n = 1)) = 'حائط 4 × 2.8: 18 لوح', 'note (calc summary) saved on the interest');

-- Same phone from another rep: dedupe, interest attached to the existing customer.
select pg_temp.as_user((select b from t));
insert into r select 2, public.create_lead('اسم تاني', '01012345678', 'engineer', (select id from p), null);
select pg_temp.ok((select (res->>'is_existing')::boolean from r where n = 2), 'same phone -> is_existing');
select pg_temp.ok((select res->>'customer_id' from r where n = 2) = (select res->>'customer_id' from r where n = 1), 'interest attached to the existing customer');
select pg_temp.ok((select count(*) from public.customers) = 0, 'rep B still cannot read rep A''s customer');
select pg_temp.ok((select count(*) from public.follow_ups) = 4, 'rep B gets their own 4 follow-ups');
reset role;
select pg_temp.ok((select name || type from public.customers where phone = '01012345678') = 'عميل تجربةdirect', 'existing customer name/type not overwritten');
select pg_temp.ok((select owner_staff_id from public.customers where phone = '01012345678') = (select a from t), 'owner stays the first rep');

-- Validation: nothing is written on bad input.
set local role authenticated;
select pg_temp.as_user((select a from t));
do $$ begin
  perform public.create_lead('x', '0101234567', 'direct', (select id from p), null); raise exception 'FAIL: short phone accepted';
exception when invalid_parameter_value then raise notice 'ok - invalid phone rejected'; end $$;
do $$ begin
  perform public.create_lead('x', '01312345678', 'direct', (select id from p), null); raise exception 'FAIL: 013 accepted';
exception when invalid_parameter_value then raise notice 'ok - non-Egyptian prefix rejected'; end $$;
do $$ begin
  perform public.create_lead('   ', '01112345678', 'direct', (select id from p), null); raise exception 'FAIL: blank name accepted';
exception when invalid_parameter_value then raise notice 'ok - blank name rejected'; end $$;
do $$ begin
  perform public.create_lead('x', '01112345678', 'vip', (select id from p), null); raise exception 'FAIL: bad type accepted';
exception when invalid_parameter_value then raise notice 'ok - bad type rejected'; end $$;
do $$ begin
  perform public.create_lead('x', '01112345678', 'direct', gen_random_uuid(), null); raise exception 'FAIL: unknown product accepted';
exception when invalid_parameter_value then raise notice 'ok - unknown product rejected'; end $$;
select pg_temp.ok((select count(*) from public.customers where phone = '01112345678') = 0, 'failed calls wrote nothing');

-- Non-staff signed-in user and anon cannot create leads.
select pg_temp.as_user(gen_random_uuid());
do $$ begin
  perform public.create_lead('x', '01112345678', 'direct', (select id from p), null); raise exception 'FAIL: non-staff created lead';
exception when insufficient_privilege then raise notice 'ok - non-staff rejected'; end $$;
reset role;
set local role anon;
do $$ begin
  perform public.create_lead('x', '01112345678', 'direct', gen_random_uuid(), null); raise exception 'FAIL: anon created lead';
exception when insufficient_privilege then raise notice 'ok - anon cannot call create_lead'; end $$;
reset role;

select 'ALL LEAD TESTS PASSED' as result;
rollback;
