create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate_number text not null unique,
  image_url text,
  assigned_driver_id uuid references public.employees(id) on delete set null,
  operational_status text not null default 'Active'
    check (operational_status in ('Active', 'Maintenance', 'Out of Service', 'Archived')),
  traccar_device_id bigint unique,
  traccar_unique_id text,
  total_jobs_completed integer not null default 0 check (total_jobs_completed >= 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.vehicle_driver_assignments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid not null references public.employees(id) on delete cascade,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists vehicle_driver_assignments_active_vehicle_idx
  on public.vehicle_driver_assignments(vehicle_id) where ended_at is null;
create index if not exists vehicle_driver_assignments_driver_range_idx
  on public.vehicle_driver_assignments(driver_id, started_at, ended_at);

create table if not exists public.vehicle_service_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_date date not null,
  description text not null,
  cost numeric(12, 3) not null default 0 check (cost >= 0),
  odometer_reading numeric(14, 2) check (odometer_reading is null or odometer_reading >= 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists vehicle_service_logs_vehicle_date_idx
  on public.vehicle_service_logs(vehicle_id, service_date desc);

create table if not exists public.vehicle_service_attachments (
  id uuid primary key default gen_random_uuid(),
  service_log_id uuid not null references public.vehicle_service_logs(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.vehicle_telemetry_daily (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  telemetry_date date not null,
  distance_km numeric(14, 3) not null default 0 check (distance_km >= 0),
  working_minutes numeric(14, 2) not null default 0 check (working_minutes >= 0),
  waiting_minutes numeric(14, 2) not null default 0 check (waiting_minutes >= 0),
  device_status text,
  latitude numeric,
  longitude numeric,
  last_position_at timestamp with time zone,
  synced_at timestamp with time zone not null default now(),
  sync_error text,
  unique(vehicle_id, telemetry_date)
);

insert into public.ui_permissions (key, description, module)
values
  ('tab.vehicle_logistics.view', 'View the Vehicle Logistics dashboard', 'Vehicle Logistics'),
  ('vehicle_logistics.performance.view', 'View vehicle telemetry and driver performance analytics', 'Vehicle Logistics'),
  ('vehicle_logistics.vehicles.manage', 'Create and edit vehicles and Traccar mappings', 'Vehicle Logistics'),
  ('vehicle_logistics.service_logs.manage', 'Create, edit, delete, and attach vehicle service logs', 'Vehicle Logistics')
on conflict (key) do update set
  description = excluded.description,
  module = excluded.module;

create or replace function public.has_vehicle_logistics_permission(p_permission text, p_allow_legacy_admin boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.id = auth.uid()
      and employee.role in ('admin', 'superadmin', 'staff')
      and (
        employee.role = 'superadmin'
        or employee.is_superadmin = true
        or (
          p_allow_legacy_admin
          and employee.role = 'admin'
          and not exists (
            select 1 from public.ui_employee_roles employee_roles
            where employee_roles.employee_id = employee.id
          )
        )
        or exists (
          select 1
          from public.ui_employee_roles employee_roles
          join public.ui_role_permissions role_permissions on role_permissions.role_id = employee_roles.role_id
          join public.ui_permissions permissions on permissions.id = role_permissions.permission_id
          where employee_roles.employee_id = employee.id
            and permissions.key = p_permission
        )
      )
  );
$$;

grant execute on function public.has_vehicle_logistics_permission(text, boolean) to authenticated;

create or replace function public.track_vehicle_driver_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.assigned_driver_id is not null then
      insert into public.vehicle_driver_assignments(vehicle_id, driver_id, started_at)
      values (new.id, new.assigned_driver_id, coalesce(new.created_at, now()));
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assigned_driver_id is distinct from old.assigned_driver_id then
    update public.vehicle_driver_assignments
    set ended_at = now()
    where vehicle_id = old.id and ended_at is null;

    if new.assigned_driver_id is not null then
      insert into public.vehicle_driver_assignments(vehicle_id, driver_id, started_at)
      values (new.id, new.assigned_driver_id, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists track_vehicle_driver_assignment_trigger on public.vehicles;
create trigger track_vehicle_driver_assignment_trigger
after insert or update of assigned_driver_id on public.vehicles
for each row execute function public.track_vehicle_driver_assignment();

create or replace function public.get_vehicle_logistics_dashboard(
  p_vehicle_id uuid,
  p_from timestamp with time zone,
  p_to timestamp with time zone
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metrics jsonb;
  v_completed integer := 0;
begin
  if not public.has_vehicle_logistics_permission('vehicle_logistics.performance.view', false) then
    raise exception 'Vehicle performance permission required.';
  end if;

  with matching_jobs as (
    select distinct jobs.job_ref_id, jobs.user_address
    from public.vehicle_driver_assignments assignments
    join public.jobs jobs
      on jobs.preferred_date >= greatest(assignments.started_at, p_from)
      and jobs.preferred_date <= least(coalesce(assignments.ended_at, p_to), p_to)
      and lower(trim(coalesce(jobs.status, ''))) = 'completed'
      and exists (
        select 1
        from jsonb_array_elements_text(coalesce(to_jsonb(jobs.assigned_employees_ids), '[]'::jsonb)) assigned_id
        where assigned_id.value = assignments.driver_id::text
      )
    where assignments.vehicle_id = p_vehicle_id
      and assignments.started_at <= p_to
      and coalesce(assignments.ended_at, p_to) >= p_from
  ), locations as (
    select
      coalesce(nullif(trim(user_address ->> 'city'), ''), nullif(trim(user_address ->> 'street'), ''), 'Unknown') as location,
      count(*)::integer as job_count
    from matching_jobs
    group by 1
  ), telemetry as (
    select
      coalesce(sum(distance_km), 0) as distance_km,
      coalesce(sum(working_minutes), 0) as working_minutes,
      coalesce(sum(waiting_minutes), 0) as waiting_minutes,
      max(synced_at) as last_synced_at,
      (array_agg(device_status order by telemetry_date desc))[1] as device_status
    from public.vehicle_telemetry_daily
    where vehicle_id = p_vehicle_id
      and telemetry_date between p_from::date and p_to::date
  )
  select jsonb_build_object(
    'completed_jobs', (select count(*) from matching_jobs),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('location', location, 'job_count', job_count) order by job_count desc)
      from locations
    ), '[]'::jsonb),
    'distance_km', telemetry.distance_km,
    'working_minutes', telemetry.working_minutes,
    'waiting_minutes', telemetry.waiting_minutes,
    'last_synced_at', telemetry.last_synced_at,
    'device_status', telemetry.device_status
  ) into v_metrics
  from telemetry;

  with all_jobs as (
    select distinct jobs.job_ref_id
    from public.vehicle_driver_assignments assignments
    join public.jobs jobs
      on jobs.preferred_date >= assignments.started_at
      and jobs.preferred_date <= coalesce(assignments.ended_at, now())
      and lower(trim(coalesce(jobs.status, ''))) = 'completed'
      and exists (
        select 1
        from jsonb_array_elements_text(coalesce(to_jsonb(jobs.assigned_employees_ids), '[]'::jsonb)) assigned_id
        where assigned_id.value = assignments.driver_id::text
      )
    where assignments.vehicle_id = p_vehicle_id
  ) select count(*) into v_completed from all_jobs;

  update public.vehicles set total_jobs_completed = v_completed, updated_at = now() where id = p_vehicle_id;
  return coalesce(v_metrics, '{}'::jsonb) || jsonb_build_object('total_jobs_completed', v_completed);
end;
$$;

grant execute on function public.get_vehicle_logistics_dashboard(uuid, timestamp with time zone, timestamp with time zone) to authenticated;

alter table public.vehicles enable row level security;
alter table public.vehicle_driver_assignments enable row level security;
alter table public.vehicle_service_logs enable row level security;
alter table public.vehicle_service_attachments enable row level security;
alter table public.vehicle_telemetry_daily enable row level security;

create policy "Vehicle logistics viewers read vehicles" on public.vehicles for select to authenticated
  using (public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Vehicle managers insert vehicles" on public.vehicles for insert to authenticated
  with check (public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
create policy "Vehicle managers update vehicles" on public.vehicles for update to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false))
  with check (public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
create policy "Vehicle managers delete vehicles" on public.vehicles for delete to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));

create policy "Vehicle viewers read assignments" on public.vehicle_driver_assignments for select to authenticated
  using (public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));

create policy "Vehicle viewers read service logs" on public.vehicle_service_logs for select to authenticated
  using (public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Service managers insert logs" on public.vehicle_service_logs for insert to authenticated
  with check (public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));
create policy "Service managers update logs" on public.vehicle_service_logs for update to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));
create policy "Service managers delete logs" on public.vehicle_service_logs for delete to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));

create policy "Vehicle viewers read service attachments" on public.vehicle_service_attachments for select to authenticated
  using (public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Service managers insert attachments" on public.vehicle_service_attachments for insert to authenticated
  with check (public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));
create policy "Service managers delete attachments" on public.vehicle_service_attachments for delete to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));

create policy "Performance viewers read telemetry" on public.vehicle_telemetry_daily for select to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.performance.view', false));

insert into storage.buckets (id, name, public)
values ('vehicle-media', 'vehicle-media', false), ('vehicle-service-files', 'vehicle-service-files', false)
on conflict (id) do update set public = false;

create policy "Vehicle viewers read vehicle media" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-media' and public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Vehicle managers upload vehicle media" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-media' and public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
create policy "Vehicle managers update vehicle media" on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-media' and public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
create policy "Vehicle managers delete vehicle media" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-media' and public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));

create policy "Vehicle viewers read service files" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-service-files' and public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Service managers upload service files" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-service-files' and public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));
create policy "Service managers delete service files" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-service-files' and public.has_vehicle_logistics_permission('vehicle_logistics.service_logs.manage', false));
