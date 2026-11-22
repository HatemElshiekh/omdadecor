-- 0001_init.sql: Omda Sales Assistant schema, RLS and helpers (PLAN.md Section 11).
-- Forward-only. Later phases replace RPC stubs with `create or replace`.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables (PLAN.md 11.2)
-- ---------------------------------------------------------------------------

create table public.warehouses (
  id text primary key,
  name_ar text not null
);

create table public.spec_templates (
  type text primary key,
  label_ar text not null,
  calc_mode text check (calc_mode in ('panel','sheet','box','tile','linear')),
  size_material_colors text[] not null default '{}',
  use_yes text[] not null default '{}',
  use_no text[] not null default '{}',
  say_to_customer text[] not null default '{}',
  install_and_complements text[] not null default '{}'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  edara_row_no int,
  edara_item_code text unique,
  name text not null,
  category_ar text not null,
  spec_type text references public.spec_templates(type),
  search_text text not null,
  price numeric(12,2),
  engineer_price numeric(12,2),
  unit_label text,
  calc_mode text check (calc_mode in ('panel','sheet','box','tile','linear')),
  unit_width_cm numeric, unit_length_cm numeric,
  box_area_m2 numeric, pieces_per_box int, piece_length_m numeric,
  waste_pct numeric not null default 10,
  facts jsonb not null default '{}',
  size_material_colors text[], use_yes text[], use_no text[],
  say_to_customer text[], install_and_complements text[],
  complement_product_ids uuid[] not null default '{}',
  image_url text,
  specs_status text not null default 'draft_general_by_type'
    check (specs_status in ('draft_general_by_type','approved')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index products_search_trgm on public.products using gin (search_text extensions.gin_trgm_ops);
create index products_spec_type on public.products (spec_type);

create table public.stock (
  product_id uuid references public.products(id) on delete cascade,
  warehouse_id text references public.warehouses(id),
  qty numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);
create index stock_warehouse on public.stock (warehouse_id);

create table public.staff (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'sales' check (role in ('sales','manager')),
  pin_hash text not null,
  can_see_engineer_price boolean not null default false,
  is_active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

create table public.staff_secrets (           -- service_role only, no RLS policies
  staff_id uuid primary key references public.staff(id) on delete cascade,
  internal_password_enc text not null
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^01[0125][0-9]{8}$'),
  type text not null check (type in ('direct','engineer')),
  owner_staff_id uuid references public.staff(id),
  created_at timestamptz not null default now()
);
create index customers_owner on public.customers (owner_staff_id);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  product_id uuid references public.products(id),
  staff_id uuid references public.staff(id),
  note text,
  created_at timestamptz not null default now()
);
create index interests_customer on public.interests (customer_id);
create index interests_product on public.interests (product_id);
create index interests_staff on public.interests (staff_id);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  interest_id uuid references public.interests(id) on delete cascade,
  staff_id uuid references public.staff(id),
  due_date date not null,
  step int not null check (step in (0,3,7,30)),
  message text not null,
  done_at timestamptz
);
create index follow_ups_due on public.follow_ups (staff_id, due_date) where done_at is null;
create index follow_ups_interest on public.follow_ups (interest_id);

create table public.assistant_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff(id),
  question text not null,
  answer text,
  product_ids uuid[] default '{}',
  tool_calls jsonb,
  latency_ms int, input_tokens int, output_tokens int,
  helpful boolean,
  created_at timestamptz not null default now()
);
create index assistant_logs_staff on public.assistant_logs (staff_id);

create table public.search_logs (
  id bigserial primary key,
  staff_id uuid references public.staff(id),
  query text not null,
  results_count int,
  opened_product_id uuid,
  created_at timestamptz not null default now()
);
create index search_logs_staff on public.search_logs (staff_id);
create index search_logs_created on public.search_logs (created_at);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff(id),
  file_name text,
  rows_read int, rows_matched int, rows_unmatched int,
  unmatched_sample jsonb,
  created_at timestamptz not null default now()
);
create index imports_staff on public.imports (staff_id);

-- updated_at maintenance
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger stock_touch before update on public.stock
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers (security definer, PLAN.md 11.3)
-- ---------------------------------------------------------------------------

-- The caller's staff id, or null when the caller is not an active staff member.
create function public.current_staff() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s where s.id = auth.uid() and s.is_active
$$;

create function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.id = auth.uid() and s.is_active and s.role = 'manager'
  )
$$;

-- Engineer price for one product, null unless the caller may see it.
-- Lets products_for_staff expose the column without granting reps SELECT on it.
create function public.visible_engineer_price(p_product_id uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select p.engineer_price
  from public.products p
  where p.id = p_product_id
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid() and s.is_active
        and (s.can_see_engineer_price or s.role = 'manager')
    )
$$;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

create view public.product_stock_total with (security_invoker = true) as
  select product_id, sum(qty) as total from public.stock group by product_id;

-- The only way the client reads products. security_invoker: products RLS applies.
create view public.products_for_staff with (security_invoker = true) as
  select
    p.id, p.edara_row_no, p.edara_item_code, p.name, p.category_ar, p.spec_type,
    p.search_text, p.price,
    public.visible_engineer_price(p.id) as engineer_price,
    p.unit_label, p.calc_mode, p.unit_width_cm, p.unit_length_cm, p.box_area_m2,
    p.pieces_per_box, p.piece_length_m, p.waste_pct, p.facts,
    p.size_material_colors, p.use_yes, p.use_no, p.say_to_customer,
    p.install_and_complements, p.complement_product_ids, p.image_url,
    p.specs_status, p.is_active, p.updated_at,
    coalesce(t.total, 0) as stock_total
  from public.products p
  left join public.product_stock_total t on t.product_id = p.id;

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants ALL to anon/authenticated by default; reset that.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- Catalog
grant select on public.warehouses, public.spec_templates, public.stock to authenticated;
grant insert, update on public.warehouses, public.spec_templates, public.stock to authenticated;
-- products: every column except engineer_price is readable; engineer_price only via the view.
grant select (
  id, edara_row_no, edara_item_code, name, category_ar, spec_type, search_text, price,
  unit_label, calc_mode, unit_width_cm, unit_length_cm, box_area_m2, pieces_per_box,
  piece_length_m, waste_pct, facts, size_material_colors, use_yes, use_no,
  say_to_customer, install_and_complements, complement_product_ids, image_url,
  specs_status, is_active, updated_at
) on public.products to authenticated;
grant insert, update on public.products to authenticated;   -- RLS: managers only
grant select on public.product_stock_total, public.products_for_staff to authenticated;

-- CRM-lite
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.interests, public.follow_ups to authenticated;

-- Staff: never expose pin_hash / lockout counters to the client.
grant select (id, display_name, role, can_see_engineer_price, is_active) on public.staff to authenticated;

-- Telemetry
grant select, insert on public.assistant_logs, public.search_logs to authenticated;
grant update (helpful) on public.assistant_logs to authenticated;
grant update (opened_product_id) on public.search_logs to authenticated;
grant usage on sequence public.search_logs_id_seq to authenticated;

-- Imports
grant select, insert on public.imports to authenticated;

-- staff_secrets: no grants at all (service_role bypasses).

grant execute on function public.current_staff(), public.is_manager(),
  public.visible_engineer_price(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security (PLAN.md 11.3). Enabled on every table.
-- ---------------------------------------------------------------------------

alter table public.warehouses     enable row level security;
alter table public.spec_templates enable row level security;
alter table public.products       enable row level security;
alter table public.stock          enable row level security;
alter table public.staff          enable row level security;
alter table public.staff_secrets  enable row level security;
alter table public.customers      enable row level security;
alter table public.interests      enable row level security;
alter table public.follow_ups     enable row level security;
alter table public.assistant_logs enable row level security;
alter table public.search_logs    enable row level security;
alter table public.imports        enable row level security;

-- Catalog: any active staff reads; managers write.
create policy staff_read on public.warehouses for select to authenticated
  using ((select public.current_staff()) is not null);
create policy manager_insert on public.warehouses for insert to authenticated
  with check ((select public.is_manager()));
create policy manager_update on public.warehouses for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));

create policy staff_read on public.spec_templates for select to authenticated
  using ((select public.current_staff()) is not null);
create policy manager_insert on public.spec_templates for insert to authenticated
  with check ((select public.is_manager()));
create policy manager_update on public.spec_templates for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));

create policy staff_read on public.products for select to authenticated
  using ((select public.current_staff()) is not null);
create policy manager_insert on public.products for insert to authenticated
  with check ((select public.is_manager()));
create policy manager_update on public.products for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));

create policy staff_read on public.stock for select to authenticated
  using ((select public.current_staff()) is not null);
create policy manager_insert on public.stock for insert to authenticated
  with check ((select public.is_manager()));
create policy manager_update on public.stock for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));

-- Staff: own row; managers see all. Writes go through service role / RPC.
create policy own_or_manager_read on public.staff for select to authenticated
  using (id = (select auth.uid()) or (select public.is_manager()));

-- Customers: reps see/insert their own; managers everything.
create policy rep_read on public.customers for select to authenticated
  using (owner_staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy rep_insert on public.customers for insert to authenticated
  with check (owner_staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy manager_update on public.customers for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));
create policy manager_delete on public.customers for delete to authenticated
  using ((select public.is_manager()));

-- Interests / follow-ups: reps own rows (select/insert/update); managers everything.
create policy rep_read on public.interests for select to authenticated
  using (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy rep_insert on public.interests for insert to authenticated
  with check (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy rep_update on public.interests for update to authenticated
  using (staff_id = (select public.current_staff()) or (select public.is_manager()))
  with check (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy manager_delete on public.interests for delete to authenticated
  using ((select public.is_manager()));

create policy rep_read on public.follow_ups for select to authenticated
  using (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy rep_insert on public.follow_ups for insert to authenticated
  with check (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy rep_update on public.follow_ups for update to authenticated
  using (staff_id = (select public.current_staff()) or (select public.is_manager()))
  with check (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy manager_delete on public.follow_ups for delete to authenticated
  using ((select public.is_manager()));

-- Telemetry: insert own; update own (column grants limit it to helpful /
-- opened_product_id); read own (needed for UPDATE ... WHERE id = ...); managers read all.
create policy own_insert on public.assistant_logs for insert to authenticated
  with check (staff_id = (select public.current_staff()));
create policy own_or_manager_read on public.assistant_logs for select to authenticated
  using (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy own_update on public.assistant_logs for update to authenticated
  using (staff_id = (select public.current_staff()))
  with check (staff_id = (select public.current_staff()));

create policy own_insert on public.search_logs for insert to authenticated
  with check (staff_id = (select public.current_staff()));
create policy own_or_manager_read on public.search_logs for select to authenticated
  using (staff_id = (select public.current_staff()) or (select public.is_manager()));
create policy own_update on public.search_logs for update to authenticated
  using (staff_id = (select public.current_staff()))
  with check (staff_id = (select public.current_staff()));

-- Imports: managers only.
create policy manager_read on public.imports for select to authenticated
  using ((select public.is_manager()));
create policy manager_insert on public.imports for insert to authenticated
  with check ((select public.is_manager()) and staff_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPC stubs (PLAN.md 12.5). Implemented in P5 (create_lead) and P7 (the rest).
-- ---------------------------------------------------------------------------

create function public.create_lead(
  p_name text, p_phone text, p_type text, p_product_id uuid, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'create_lead is not implemented yet (Phase 5)' using errcode = '0A000';
end $$;

create function public.manager_kpis() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  raise exception 'manager_kpis is not implemented yet (Phase 7)' using errcode = '0A000';
end $$;

create function public.staff_admin_upsert(
  p_staff_id uuid, p_display_name text, p_role text, p_can_see_engineer_price boolean,
  p_is_active boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'staff_admin_upsert is not implemented yet (Phase 7)' using errcode = '0A000';
end $$;

revoke all on function public.create_lead(text, text, text, uuid, text),
  public.manager_kpis(), public.staff_admin_upsert(uuid, text, text, boolean, boolean)
  from anon, authenticated, public;
grant execute on function public.create_lead(text, text, text, uuid, text),
  public.manager_kpis(), public.staff_admin_upsert(uuid, text, text, boolean, boolean)
  to authenticated;
