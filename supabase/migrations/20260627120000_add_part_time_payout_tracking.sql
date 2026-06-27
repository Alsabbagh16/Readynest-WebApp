alter table public.part_time_applications
  add column if not exists payout_status text not null default 'pending',
  add column if not exists settled_at timestamp with time zone;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'part_time_applications_payout_status_check'
  ) then
    alter table public.part_time_applications
      add constraint part_time_applications_payout_status_check
      check (payout_status in ('pending', 'settled'));
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
    (coalesce(jobs.hours_needed, 0) * coalesce(jobs.hourly_pay, 0))::numeric as amount,
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

create or replace function public.settle_part_time_payout(p_application_id bigint)
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
  set payout_status = 'settled',
      settled_at = now()
  where applications.id = p_application_id
    and applications.status = 'accepted'
    and applications.payout_status = 'pending'
    and exists (
      select 1
      from public.jobs jobs
      where jobs.job_ref_id = applications.job_ref_id
        and lower(coalesce(jobs.status, '')) = 'completed'
    )
  returning applications.id, applications.payout_status, applications.settled_at;
end;
$$;

grant execute on function public.get_part_time_payouts_for_employee(uuid) to anon, authenticated;
grant execute on function public.settle_part_time_payout(bigint) to authenticated;
