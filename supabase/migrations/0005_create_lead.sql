-- 0005: create_lead RPC (PLAN.md 9.5 FR-5-3/FR-5-4, 12.5). One transaction:
-- upsert customer by phone (dedupe across reps), add the interest for the calling rep,
-- and schedule 4 follow-ups (D+0, D+3, D+7, D+30, Cairo dates) with the Appendix 22 copy.
create or replace function public.create_lead(
  p_name text, p_phone text, p_type text, p_product_id uuid, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := private.current_staff();
  v_name text := btrim(coalesce(p_name, ''));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_product public.products%rowtype;
  v_customer uuid;
  v_existing boolean := false;
  v_interest uuid;
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if v_staff is null then
    raise exception 'NOT_STAFF' using errcode = '42501';
  end if;
  if v_name = '' or length(v_name) > 100
     or coalesce(p_phone, '') !~ '^01[0125][0-9]{8}$'
     or coalesce(p_type, '') not in ('direct', 'engineer')
     or length(coalesce(v_note, '')) > 1000 then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;
  select * into v_product from public.products where id = p_product_id and is_active;
  if not found then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  insert into public.customers (name, phone, type, owner_staff_id)
  values (v_name, p_phone, p_type, v_staff)
  on conflict (phone) do nothing
  returning id into v_customer;
  if v_customer is null then
    v_existing := true;
    select id into v_customer from public.customers where phone = p_phone;
  end if;

  insert into public.interests (customer_id, product_id, staff_id, note)
  values (v_customer, v_product.id, v_staff, v_note)
  returning id into v_interest;

  insert into public.follow_ups (interest_id, staff_id, due_date, step, message)
  values
    (v_interest, v_staff, v_today, 0,
     'شكراً لزيارتك معرض العمدة، ده ملخص اللي اتفرجت عليه: ' || v_product.name),
    (v_interest, v_staff, v_today + 3, 3,
     'حبيت أبعتلك صورة مشروع مشابه لـ ' || v_product.name || ' عشان تتخيل الشكل'),
    (v_interest, v_staff, v_today + 7, 7,
     'أخبارك إيه؟ وصلت لقرار في ' || v_product.name || '؟ لو فيه أي سؤال أنا موجود'),
    (v_interest, v_staff, v_today + 30, 30,
     'عندنا جديد في ' || v_product.category_ar || ' ممكن يعجبك، تحب أبعتلك؟');

  return jsonb_build_object('customer_id', v_customer, 'is_existing', v_existing,
                            'interest_id', v_interest);
end $$;

revoke all on function public.create_lead(text, text, text, uuid, text) from public, anon;
grant execute on function public.create_lead(text, text, text, uuid, text) to authenticated;
