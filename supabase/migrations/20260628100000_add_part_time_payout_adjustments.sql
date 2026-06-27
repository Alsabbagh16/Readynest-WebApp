alter table public.part_time_applications
  add column if not exists payout_amount numeric;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'part_time_applications_payout_amount_check'
  ) then
    alter table public.part_time_applications
      add constraint part_time_applications_payout_amount_check
      check (payout_amount is null or payout_amount >= 0);
  end if;
end $$;

create or replace function public.get_part_time_payouts_for_employee(p_employee_id uuid)
returns table (
  application_id bigint,
  job_ref_id text,
  description text,
  preferred_date text,
  hours_needed numeric,
  hourly_pay numeric,
  amount numeric,
  payout_status text,
  settled_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    applications.id as application_id,
    applications.job_ref_id,
    coalesce(purchases.product_name, 'ReadyNest Service Job') as description,
    jobs.preferred_date::text,
    coalesce(jobs.hours_needed, 0)::numeric,
    coalesce(jobs.hourly_pay, 0)::numeric,
    coalesce(
      applications.payout_amount,
      coalesce(jobs.hours_needed, 0) * coalesce(jobs.hourly_pay, 0)
    )::numeric as amount,
    applications.payout_status,
    applications.settled_at
  from public.part_time_applications applications
  join public.jobs jobs
    on jobs.job_ref_id = applications.job_ref_id
  left join public.purchases purchases
    on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
  where applications.employee_id = p_employee_id
    and applications.status = 'accepted'
    and lower(coalesce(jobs.status, '')) = 'completed'
    and exists (
      select 1
      from public.employees
      where employees.id = p_employee_id
        and employees.is_part_timer = true
    )
  order by coalesce(applications.settled_at, applications.applied_at) desc;
$$;

create or replace function public.update_part_time_payout_amount(
  p_application_id bigint,
  p_amount numeric
)
returns table (
  application_id bigint,
  amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'Payout amount must be zero or greater.';
  end if;

  return query
  update public.part_time_applications applications
  set payout_amount = p_amount
  where applications.id = p_application_id
    and applications.status = 'accepted'
  returning applications.id, applications.payout_amount;
end;
$$;

create or replace function public.undo_part_time_payout_settlement(p_application_id bigint)
returns table (
  application_id bigint,
  payout_status text,
  settled_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.part_time_applications applications
  set payout_status = 'pending',
      settled_at = null
  where applications.id = p_application_id
    and applications.status = 'accepted'
    and applications.payout_status = 'settled'
  returning applications.id, applications.payout_status, applications.settled_at;
end;
$$;

grant execute on function public.update_part_time_payout_amount(bigint, numeric) to authenticated;
grant execute on function public.undo_part_time_payout_settlement(bigint) to authenticated;
