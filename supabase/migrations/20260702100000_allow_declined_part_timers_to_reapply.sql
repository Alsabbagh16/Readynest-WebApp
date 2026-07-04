-- Hidden declined applications still block the unique job/employee pair and
-- remain visible in the worker portal. Restore their consumed capacity first.
with hidden_applications as (
  select job_ref_id, count(*)::integer as application_count
  from public.part_time_applications
  where status = 'declined'
    and admin_hidden_at is not null
  group by job_ref_id
)
update public.jobs jobs
set slots_available = coalesce(jobs.slots_available, 0) + hidden_applications.application_count,
    updated_at = now()
from hidden_applications
where jobs.job_ref_id = hidden_applications.job_ref_id;

with hidden_applications as (
  select employee_id, count(*)::integer as application_count
  from public.part_time_applications
  where status = 'declined'
    and admin_hidden_at is not null
    and employee_id is not null
  group by employee_id
)
update public.employees employees
set accepted_part_time_jobs_count = greatest(
      coalesce(employees.accepted_part_time_jobs_count, 0) - hidden_applications.application_count,
      0
    ),
    updated_at = now()
from hidden_applications
where employees.id = hidden_applications.employee_id;

delete from public.part_time_applications
where status = 'declined'
  and admin_hidden_at is not null;

create or replace function public.hide_declined_part_time_application(p_application_id bigint)
returns table (
  id bigint,
  job_ref_id text,
  status text,
  admin_hidden_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.part_time_applications%rowtype;
  v_removed_at timestamp with time zone := now();
begin
  select applications.*
  into v_application
  from public.part_time_applications applications
  where applications.id = p_application_id
    and applications.status = 'declined'
  for update;

  if not found then
    return;
  end if;

  update public.jobs jobs
  set slots_available = coalesce(jobs.slots_available, 0) + 1,
      updated_at = now()
  where jobs.job_ref_id = v_application.job_ref_id;

  if v_application.employee_id is not null then
    update public.employees employees
    set accepted_part_time_jobs_count = greatest(
          coalesce(employees.accepted_part_time_jobs_count, 0) - 1,
          0
        ),
        updated_at = now()
    where employees.id = v_application.employee_id;
  end if;

  delete from public.part_time_applications applications
  where applications.id = v_application.id;

  return query
  select
    v_application.id,
    v_application.job_ref_id,
    v_application.status,
    v_removed_at;
end;
$$;

revoke execute on function public.hide_declined_part_time_application(bigint) from public, anon;
grant execute on function public.hide_declined_part_time_application(bigint) to authenticated;
