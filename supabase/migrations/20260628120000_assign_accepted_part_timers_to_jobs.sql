create or replace function public.set_part_time_application_status(
  p_application_id bigint,
  p_status text
)
returns table (
  id bigint,
  job_ref_id text,
  phone text,
  employee_id uuid,
  applied_at timestamp with time zone,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.part_time_applications%rowtype;
  v_assignment_type text;
begin
  if p_status not in ('interested', 'accepted', 'declined') then
    raise exception 'Invalid part-time application status.';
  end if;

  select applications.*
  into v_application
  from public.part_time_applications applications
  where applications.id = p_application_id
  for update;

  if not found then
    raise exception 'Part-time application not found.';
  end if;

  if v_application.employee_id is null then
    raise exception 'This application is not linked to an employee.';
  end if;

  select format_type(attributes.atttypid, attributes.atttypmod)
  into v_assignment_type
  from pg_catalog.pg_attribute attributes
  join pg_catalog.pg_class relations on relations.oid = attributes.attrelid
  join pg_catalog.pg_namespace schemas on schemas.oid = relations.relnamespace
  where schemas.nspname = 'public'
    and relations.relname = 'jobs'
    and attributes.attname = 'assigned_employees_ids'
    and attributes.attnum > 0
    and not attributes.attisdropped;

  if v_assignment_type = 'uuid[]' then
    if p_status = 'accepted' then
      execute $statement$
        update public.jobs
        set assigned_employees_ids = case
              when $1 = any(coalesce(assigned_employees_ids, '{}'::uuid[]))
                then coalesce(assigned_employees_ids, '{}'::uuid[])
              else array_append(coalesce(assigned_employees_ids, '{}'::uuid[]), $1)
            end,
            updated_at = now()
        where job_ref_id = $2
      $statement$ using v_application.employee_id, v_application.job_ref_id;
    else
      execute $statement$
        update public.jobs
        set assigned_employees_ids = array_remove(coalesce(assigned_employees_ids, '{}'::uuid[]), $1),
            updated_at = now()
        where job_ref_id = $2
      $statement$ using v_application.employee_id, v_application.job_ref_id;
    end if;
  elsif v_assignment_type = 'text[]' then
    if p_status = 'accepted' then
      execute $statement$
        update public.jobs
        set assigned_employees_ids = case
              when $1 = any(coalesce(assigned_employees_ids, '{}'::text[]))
                then coalesce(assigned_employees_ids, '{}'::text[])
              else array_append(coalesce(assigned_employees_ids, '{}'::text[]), $1)
            end,
            updated_at = now()
        where job_ref_id = $2
      $statement$ using v_application.employee_id::text, v_application.job_ref_id;
    else
      execute $statement$
        update public.jobs
        set assigned_employees_ids = array_remove(coalesce(assigned_employees_ids, '{}'::text[]), $1),
            updated_at = now()
        where job_ref_id = $2
      $statement$ using v_application.employee_id::text, v_application.job_ref_id;
    end if;
  elsif v_assignment_type = 'jsonb' then
    if p_status = 'accepted' then
      execute $statement$
        update public.jobs
        set assigned_employees_ids = case
              when coalesce(assigned_employees_ids, '[]'::jsonb) @> jsonb_build_array($1)
                then coalesce(assigned_employees_ids, '[]'::jsonb)
              else coalesce(assigned_employees_ids, '[]'::jsonb) || jsonb_build_array($1)
            end,
            updated_at = now()
        where job_ref_id = $2
      $statement$ using v_application.employee_id::text, v_application.job_ref_id;
    else
      execute $statement$
        update public.jobs
        set assigned_employees_ids = coalesce(assigned_employees_ids, '[]'::jsonb) - $1,
            updated_at = now()
        where job_ref_id = $2
      $statement$ using v_application.employee_id::text, v_application.job_ref_id;
    end if;
  else
    raise exception 'Unsupported jobs.assigned_employees_ids type: %', coalesce(v_assignment_type, 'missing');
  end if;

  update public.part_time_applications applications
  set status = p_status
  where applications.id = p_application_id;

  return query
  select
    applications.id,
    applications.job_ref_id,
    applications.phone,
    applications.employee_id,
    applications.applied_at,
    applications.status
  from public.part_time_applications applications
  where applications.id = p_application_id;
end;
$$;

revoke execute on function public.set_part_time_application_status(bigint, text) from public, anon;
grant execute on function public.set_part_time_application_status(bigint, text) to authenticated;
