create table if not exists public.employee_reports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  report_type text,
  reason text,
  description text,
  date_issued date,
  incident_date date,
  severity_level text,
  action_taken text,
  follow_up_required boolean,
  follow_up_date date,
  issued_by uuid references public.employees(id) on delete set null,
  issued_by_name text,
  employee_response text,
  attachment_paths jsonb not null default '[]'::jsonb,
  pdf_path text,
  status text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint employee_reports_type_check check (report_type is null or report_type in ('Warning', 'Incident', 'Performance Issue', 'Attendance', 'Customer Complaint', 'Safety Issue', 'Conduct', 'Other')),
  constraint employee_reports_severity_check check (severity_level is null or severity_level in ('Low', 'Medium', 'High', 'Final Warning')),
  constraint employee_reports_action_check check (action_taken is null or action_taken in ('Verbal Warning', 'Written Warning', 'Suspension', 'Training Required', 'No Action', 'Other')),
  constraint employee_reports_status_check check (status is null or status in ('Open', 'Under Review', 'Resolved', 'Closed'))
);

create index if not exists employee_reports_employee_date_idx
  on public.employee_reports (employee_id, created_at desc);

alter table public.employee_reports enable row level security;

drop policy if exists "Admins can view employee reports" on public.employee_reports;
create policy "Admins can view employee reports" on public.employee_reports
  for select to authenticated using (
    employee_id = auth.uid()
    or exists (select 1 from public.employees admin_employee where admin_employee.id = auth.uid() and admin_employee.role in ('admin', 'superadmin'))
  );

drop policy if exists "Admins can create employee reports" on public.employee_reports;
create policy "Admins can create employee reports" on public.employee_reports
  for insert to authenticated with check (
    exists (select 1 from public.employees admin_employee where admin_employee.id = auth.uid() and admin_employee.role in ('admin', 'superadmin'))
  );

drop policy if exists "Admins can update employee reports" on public.employee_reports;
create policy "Admins can update employee reports" on public.employee_reports
  for update to authenticated using (
    exists (select 1 from public.employees admin_employee where admin_employee.id = auth.uid() and admin_employee.role in ('admin', 'superadmin'))
  ) with check (
    exists (select 1 from public.employees admin_employee where admin_employee.id = auth.uid() and admin_employee.role in ('admin', 'superadmin'))
  );

revoke all on public.employee_reports from anon;
grant select, insert, update on public.employee_reports to authenticated;
