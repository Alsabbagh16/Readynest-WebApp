create table if not exists public.part_time_applications (
  id bigint generated always as identity primary key,
  job_ref_id text not null,
  phone text not null,
  employee_id uuid,
  applied_at timestamp with time zone not null default now(),
  status text not null default 'interested',
  created_at timestamp with time zone not null default now(),
  unique (job_ref_id, phone)
);

alter table public.part_time_applications
  add column if not exists employee_id uuid;

alter table public.employees
  add column if not exists accepted_part_time_jobs_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'part_time_applications_employee_id_fkey'
  ) then
    alter table public.part_time_applications
      add constraint part_time_applications_employee_id_fkey
      foreign key (employee_id)
      references public.employees(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists part_time_applications_job_employee_unique_idx
  on public.part_time_applications (job_ref_id, employee_id)
  where employee_id is not null;

create index if not exists part_time_applications_job_ref_idx
  on public.part_time_applications (job_ref_id, applied_at desc);

alter table public.part_time_applications enable row level security;

drop policy if exists "Public can apply to active part time postings" on public.part_time_applications;
create policy "Public can apply to active part time postings"
  on public.part_time_applications
  for insert
  to anon, authenticated
  with check (
    employee_id is not null
    and exists (
      select 1
      from public.employees
      where employees.id = part_time_applications.employee_id
        and employees.is_part_timer = true
    )
    and exists (
      select 1
      from public.jobs
      where jobs.job_ref_id = part_time_applications.job_ref_id
        and jobs.is_shared_to_part_time = true
        and jobs.slots_available > 0
    )
  );

drop policy if exists "Authenticated users can read part time applications" on public.part_time_applications;
create policy "Authenticated users can read part time applications"
  on public.part_time_applications
  for select
  to authenticated
  using (true);

create or replace function public.verify_part_timer_by_mobile(p_mobile text)
returns table (
  id uuid,
  full_name text,
  mobile text,
  employee_position text,
  accepted_part_time_jobs_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    employees.id,
    employees.full_name,
    employees.mobile::text as mobile,
    employees.position as employee_position,
    employees.accepted_part_time_jobs_count
  from public.employees
  where employees.is_part_timer = true
    and (
      employees.mobile::text = p_mobile
      or regexp_replace(coalesce(employees.mobile::text, ''), '[^0-9+]', '', 'g') = regexp_replace(coalesce(p_mobile, ''), '[^0-9+]', '', 'g')
    )
  limit 1;
$$;

create or replace function public.apply_part_time_job(p_job_ref_id text, p_employee_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee record;
  v_slots integer;
  v_count integer;
begin
  select id, full_name, mobile, accepted_part_time_jobs_count
  into v_employee
  from public.employees
  where id = p_employee_id
    and is_part_timer = true
  for update;

  if not found then
    raise exception 'Mobile number not registered as a part-timer. Please contact support.';
  end if;

  if exists (
    select 1
    from public.part_time_applications
    where job_ref_id = p_job_ref_id
      and (
        employee_id = p_employee_id
        or phone = coalesce(v_employee.mobile::text, '')
      )
  ) then
    select slots_available into v_slots
    from public.jobs
    where job_ref_id = p_job_ref_id;

    return jsonb_build_object(
      'alreadyApplied', true,
      'slotsAvailable', coalesce(v_slots, 0),
      'acceptedJobsCount', coalesce(v_employee.accepted_part_time_jobs_count, 0)
    );
  end if;

  update public.jobs
  set slots_available = slots_available - 1,
      updated_at = now()
  where job_ref_id = p_job_ref_id
    and is_shared_to_part_time = true
    and slots_available > 0
  returning slots_available into v_slots;

  if not found then
    raise exception 'This job is fully booked or no longer available.';
  end if;

  insert into public.part_time_applications (job_ref_id, employee_id, phone)
  values (p_job_ref_id, p_employee_id, coalesce(v_employee.mobile::text, ''));

  update public.employees
  set accepted_part_time_jobs_count = coalesce(accepted_part_time_jobs_count, 0) + 1,
      updated_at = now()
  where id = p_employee_id
  returning accepted_part_time_jobs_count into v_count;

  return jsonb_build_object(
    'alreadyApplied', false,
    'slotsAvailable', v_slots,
    'acceptedJobsCount', v_count
  );
end;
$$;

grant execute on function public.verify_part_timer_by_mobile(text) to anon, authenticated;
grant execute on function public.apply_part_time_job(text, uuid) to anon, authenticated;
