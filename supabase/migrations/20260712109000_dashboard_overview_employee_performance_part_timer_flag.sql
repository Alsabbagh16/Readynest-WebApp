create or replace function public.get_dashboard_overview_employee_performance(
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_job_scope text default 'all',
  p_hide_business_jobs boolean default false,
  p_include_part_timers boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamp with time zone := p_from;
  v_to timestamp with time zone := p_to;
  v_scope text := lower(coalesce(nullif(trim(p_job_scope), ''), 'all'));
  v_hide_business_jobs boolean := coalesce(p_hide_business_jobs, false);
  v_include_part_timers boolean := coalesce(p_include_part_timers, false);
  v_rows jsonb;
begin
  if not public.has_dashboard_overview_permission() then
    raise exception 'Access denied for Dashboard Overview.';
  end if;

  if v_from is null or v_to is null or v_to <= v_from then
    raise exception 'A valid dashboard date range is required.';
  end if;

  if v_scope not in ('all', 'subscription', 'one_time') then
    v_scope := 'all';
  end if;

  with scoped_jobs as (
    select
      jobs.job_ref_id::text,
      coalesce(jobs.hours_needed, 0)::numeric as hours_needed,
      coalesce(to_jsonb(jobs.assigned_employees_ids), '[]'::jsonb) as assigned_ids
    from public.jobs jobs
    left join public.purchases purchases
      on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    left join public.profiles profiles
      on profiles.id = coalesce(jobs.user_id, purchases.user_id)
    where jobs.preferred_date >= v_from
      and jobs.preferred_date < v_to
      and lower(coalesce(jobs.status, '')) = 'completed'
      and (
        v_scope = 'all'
        or (v_scope = 'subscription' and coalesce(purchases.is_subscription, false))
        or (v_scope = 'one_time' and not coalesce(purchases.is_subscription, false))
      )
      and (not v_hide_business_jobs or not (coalesce(profiles.user_type, '') ilike '%business%'))
  ),
  expanded_assignments as (
    select
      scoped_jobs.job_ref_id,
      scoped_jobs.hours_needed,
      assigned_id.value::uuid as employee_id
    from scoped_jobs
    cross join lateral jsonb_array_elements_text(scoped_jobs.assigned_ids) assigned_id(value)
    where assigned_id.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  ranked as (
    select
      employees.id as employee_id,
      coalesce(employees.full_name, employees.email, 'Unnamed Cleaner') as employee_name,
      employees.email,
      coalesce(employees.is_part_timer, false) or lower(coalesce(employees.position, '')) in ('part timer', 'part-time', 'part time') as is_part_timer,
      count(distinct expanded_assignments.job_ref_id)::integer as jobs_completed,
      coalesce(sum(expanded_assignments.hours_needed), 0)::numeric as hours_worked
    from expanded_assignments
    join public.employees employees on employees.id = expanded_assignments.employee_id
    where lower(trim(coalesce(employees.position, ''))) = 'cleaner'
       or coalesce(employees.is_part_timer, false)
       or lower(trim(coalesce(employees.position, ''))) in ('part timer', 'part-time', 'part time')
    group by employees.id, employees.full_name, employees.email, employees.is_part_timer, employees.position
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'employee_id', filtered.employee_id,
      'employee_name', filtered.employee_name,
      'email', filtered.email,
      'is_part_timer', filtered.is_part_timer,
      'jobs_completed', filtered.jobs_completed,
      'hours_worked', filtered.hours_worked
    )
    order by filtered.jobs_completed desc, filtered.hours_worked desc, filtered.employee_name
  ), '[]'::jsonb)
  into v_rows
  from (
    select *
    from ranked
    where v_include_part_timers or not ranked.is_part_timer
    order by ranked.jobs_completed desc, ranked.hours_worked desc, ranked.employee_name
    limit 8
  ) filtered;

  return v_rows;
end;
$$;

grant execute on function public.get_dashboard_overview_employee_performance(timestamp with time zone, timestamp with time zone, text, boolean, boolean) to authenticated;
