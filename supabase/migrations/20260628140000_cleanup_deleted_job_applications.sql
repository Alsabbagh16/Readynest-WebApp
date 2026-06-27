delete from public.part_time_applications applications
where not exists (
  select 1
  from public.jobs jobs
  where jobs.job_ref_id = applications.job_ref_id
);

create or replace function public.cleanup_deleted_job_part_time_applications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.part_time_applications applications
  where applications.job_ref_id = old.job_ref_id;

  return old;
end;
$$;

drop trigger if exists cleanup_part_time_applications_after_job_delete on public.jobs;
create trigger cleanup_part_time_applications_after_job_delete
after delete on public.jobs
for each row
execute function public.cleanup_deleted_job_part_time_applications();

create or replace function public.get_part_time_applications_for_employee(p_employee_id uuid)
returns table (
  id bigint,
  job_ref_id text,
  status text,
  applied_at timestamp with time zone,
  job_status text,
  preferred_date text,
  user_address jsonb,
  product_name text,
  slots_available integer,
  hours_needed numeric,
  hourly_pay numeric,
  transport_included boolean,
  shared_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    applications.id,
    applications.job_ref_id,
    applications.status,
    applications.applied_at,
    jobs.status as job_status,
    jobs.preferred_date::text as preferred_date,
    to_jsonb(jobs.user_address) as user_address,
    purchases.product_name,
    jobs.slots_available,
    jobs.hours_needed,
    jobs.hourly_pay,
    jobs.transport_included,
    jobs.shared_at
  from public.part_time_applications applications
  join public.jobs jobs
    on jobs.job_ref_id = applications.job_ref_id
  left join public.purchases purchases
    on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
  where applications.employee_id = p_employee_id
    and exists (
      select 1
      from public.employees
      where employees.id = p_employee_id
        and employees.is_part_timer = true
    )
  order by applications.applied_at desc;
$$;

grant execute on function public.get_part_time_applications_for_employee(uuid) to anon, authenticated;
