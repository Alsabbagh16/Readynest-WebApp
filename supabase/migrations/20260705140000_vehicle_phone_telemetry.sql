create table if not exists public.vehicle_telemetry_positions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  device_identifier text not null,
  recorded_at timestamp with time zone not null,
  received_at timestamp with time zone not null default now(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m >= 0),
  speed_mps double precision check (speed_mps is null or speed_mps >= 0),
  heading double precision,
  altitude_m double precision,
  is_moving boolean,
  odometer_m double precision check (odometer_m is null or odometer_m >= 0),
  battery_level double precision check (battery_level is null or battery_level between 0 and 1),
  battery_charging boolean,
  activity_type text,
  event_type text,
  raw_payload jsonb not null default '{}'::jsonb,
  unique(vehicle_id, recorded_at, latitude, longitude)
);

create index if not exists vehicle_telemetry_positions_vehicle_time_idx
  on public.vehicle_telemetry_positions(vehicle_id, recorded_at desc);

alter table public.vehicle_telemetry_positions enable row level security;

create policy "Performance viewers read vehicle positions"
  on public.vehicle_telemetry_positions for select to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.performance.view', false));

