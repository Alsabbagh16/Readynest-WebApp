create or replace function public.can_edit_purchases()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees employees
    where employees.id = auth.uid()
      and employees.role in ('admin', 'superadmin', 'staff')
      and (
        employees.role = 'superadmin'
        or employees.is_superadmin = true
        or not exists (select 1 from public.ui_employee_roles employee_roles where employee_roles.employee_id = employees.id)
        or exists (
          select 1 from public.ui_employee_roles employee_roles
          join public.ui_role_permissions role_permissions on role_permissions.role_id = employee_roles.role_id
          join public.ui_permissions permissions on permissions.id = role_permissions.permission_id
          where employee_roles.employee_id = employees.id and permissions.key = 'purchases.edit'
        )
      )
  );
$$;

create table if not exists public.purchase_partial_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_ref_id text not null references public.purchases(purchase_ref_id) on delete cascade,
  amount numeric(12, 3) not null check (amount > 0),
  payment_date date not null,
  is_opening_entry boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists purchase_partial_payments_purchase_idx
  on public.purchase_partial_payments (purchase_ref_id, payment_date, created_at, id);

alter table public.purchase_partial_payments enable row level security;
revoke all on public.purchase_partial_payments from anon, authenticated;

drop policy if exists "Purchase viewers can read partial payments" on public.purchase_partial_payments;
create policy "Purchase viewers can read partial payments" on public.purchase_partial_payments
  for select to authenticated using (
    exists (
      select 1 from public.purchases purchases
      where purchases.purchase_ref_id = purchase_partial_payments.purchase_ref_id
    )
  );
grant select on public.purchase_partial_payments to authenticated;

create or replace function public.prevent_purchase_total_below_payments()
returns trigger language plpgsql set search_path = public as $$
declare v_received numeric;
begin
  if new.final_amount_due_on_arrival is distinct from old.final_amount_due_on_arrival
    or new.paid_amount is distinct from old.paid_amount then
    select coalesce(sum(amount), 0) into v_received
    from public.purchase_partial_payments where purchase_ref_id = new.purchase_ref_id::text;
    if v_received > greatest(coalesce(new.final_amount_due_on_arrival, new.paid_amount, 0), 0) then
      raise exception 'Total Due cannot be less than recorded payments of BHD %.', to_char(v_received, 'FM999999990.000');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_purchase_total_below_payments_trigger on public.purchases;
create trigger prevent_purchase_total_below_payments_trigger
before update of final_amount_due_on_arrival, paid_amount on public.purchases
for each row execute function public.prevent_purchase_total_below_payments();

insert into public.purchase_partial_payments (purchase_ref_id, amount, payment_date, is_opening_entry)
select purchases.purchase_ref_id::text,
       round(purchases.amount_received::numeric, 3),
       coalesce((purchases.created_at at time zone 'Asia/Bahrain')::date, current_date),
       true
from public.purchases purchases
where coalesce(purchases.amount_received, 0) > 0
  and not exists (
    select 1 from public.purchase_partial_payments payments
    where payments.purchase_ref_id = purchases.purchase_ref_id::text
  );

create or replace function public.sync_purchase_from_partial_payments(p_purchase_ref_id text)
returns public.purchases language plpgsql security definer set search_path = public as $$
declare v_purchase public.purchases%rowtype; v_received numeric;
begin
  select * into v_purchase from public.purchases where purchase_ref_id::text = p_purchase_ref_id for update;
  if not found then raise exception 'Purchase not found.'; end if;
  select coalesce(sum(amount), 0) into v_received from public.purchase_partial_payments where purchase_ref_id = p_purchase_ref_id;
  if v_received > greatest(coalesce(v_purchase.final_amount_due_on_arrival, v_purchase.paid_amount, 0), 0) then
    raise exception 'Recorded payments exceed the purchase total.';
  end if;
  update public.purchases
  set amount_received = v_received,
      status = case
        when v_received <= 0 then 'Pending'
        when v_received >= greatest(coalesce(final_amount_due_on_arrival, paid_amount, 0), 0) then 'Paid'
        else 'Partially Paid'
      end,
      updated_at = now()
  where purchase_ref_id::text = p_purchase_ref_id
  returning * into v_purchase;
  return v_purchase;
end;
$$;

create or replace function public.create_purchase_partial_payment(p_purchase_ref_id text, p_amount numeric, p_payment_date date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_total numeric; v_received numeric;
begin
  if not public.can_edit_purchases() then raise exception 'Purchase edit permission required.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero.'; end if;
  if p_payment_date is null then raise exception 'Payment date is required.'; end if;
  select greatest(coalesce(final_amount_due_on_arrival, paid_amount, 0), 0)
    into v_total from public.purchases where purchase_ref_id::text = p_purchase_ref_id for update;
  if not found then raise exception 'Purchase not found.'; end if;
  select coalesce(sum(amount), 0) into v_received from public.purchase_partial_payments where purchase_ref_id = p_purchase_ref_id;
  if round(p_amount, 3) > round(v_total - v_received, 3) then
    raise exception 'Payment exceeds the remaining balance of BHD %.', to_char(greatest(v_total - v_received, 0), 'FM999999990.000');
  end if;
  insert into public.purchase_partial_payments (purchase_ref_id, amount, payment_date, created_by, updated_by)
  values (p_purchase_ref_id, round(p_amount, 3), p_payment_date, auth.uid(), auth.uid()) returning id into v_id;
  perform public.sync_purchase_from_partial_payments(p_purchase_ref_id);
  return v_id;
end;
$$;

create or replace function public.update_purchase_partial_payment(p_payment_id uuid, p_amount numeric, p_payment_date date)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref text; v_total numeric; v_other_received numeric;
begin
  if not public.can_edit_purchases() then raise exception 'Purchase edit permission required.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero.'; end if;
  if p_payment_date is null then raise exception 'Payment date is required.'; end if;
  select payments.purchase_ref_id into v_ref from public.purchase_partial_payments payments where payments.id = p_payment_id for update;
  if not found then raise exception 'Partial payment not found.'; end if;
  select greatest(coalesce(final_amount_due_on_arrival, paid_amount, 0), 0) into v_total
    from public.purchases where purchase_ref_id::text = v_ref for update;
  select coalesce(sum(amount), 0) into v_other_received from public.purchase_partial_payments where purchase_ref_id = v_ref and id <> p_payment_id;
  if round(p_amount, 3) > round(v_total - v_other_received, 3) then
    raise exception 'Payment exceeds the available balance of BHD %.', to_char(greatest(v_total - v_other_received, 0), 'FM999999990.000');
  end if;
  update public.purchase_partial_payments set amount = round(p_amount, 3), payment_date = p_payment_date,
    updated_by = auth.uid(), updated_at = now() where id = p_payment_id;
  perform public.sync_purchase_from_partial_payments(v_ref);
end;
$$;

create or replace function public.delete_purchase_partial_payment(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref text;
begin
  if not public.can_edit_purchases() then raise exception 'Purchase edit permission required.'; end if;
  delete from public.purchase_partial_payments where id = p_payment_id returning purchase_ref_id into v_ref;
  if v_ref is null then raise exception 'Partial payment not found.'; end if;
  perform public.sync_purchase_from_partial_payments(v_ref);
end;
$$;

create or replace function public.reconcile_purchase_partial_payments(p_purchase_ref_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_purchases() then raise exception 'Purchase edit permission required.'; end if;
  perform public.sync_purchase_from_partial_payments(p_purchase_ref_id);
end;
$$;

revoke execute on function public.can_edit_purchases() from public, anon;
revoke execute on function public.sync_purchase_from_partial_payments(text) from public, anon, authenticated;
revoke execute on function public.create_purchase_partial_payment(text, numeric, date) from public, anon;
revoke execute on function public.update_purchase_partial_payment(uuid, numeric, date) from public, anon;
revoke execute on function public.delete_purchase_partial_payment(uuid) from public, anon;
revoke execute on function public.reconcile_purchase_partial_payments(text) from public, anon;
grant execute on function public.can_edit_purchases() to authenticated;
grant execute on function public.create_purchase_partial_payment(text, numeric, date) to authenticated;
grant execute on function public.update_purchase_partial_payment(uuid, numeric, date) to authenticated;
grant execute on function public.delete_purchase_partial_payment(uuid) to authenticated;
grant execute on function public.reconcile_purchase_partial_payments(text) to authenticated;
