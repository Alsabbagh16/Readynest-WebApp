alter table public.vehicle_telemetry_positions
  add column if not exists distance_delta_km numeric(14, 6) not null default 0
  check (distance_delta_km >= 0);

create index if not exists vehicle_telemetry_positions_vehicle_day_idx
  on public.vehicle_telemetry_positions(vehicle_id, recorded_at);
