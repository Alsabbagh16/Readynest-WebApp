alter table public.vehicle_service_logs
  add column if not exists logged_by_employee_id uuid
  references public.employees(id) on delete set null;

create index if not exists vehicle_service_logs_logged_by_idx
  on public.vehicle_service_logs(logged_by_employee_id);
