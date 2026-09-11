drop policy if exists "Admins can view employee reports" on public.employee_reports;
create policy "Admins and employees can view employee reports" on public.employee_reports
  for select to authenticated using (
    employee_id = auth.uid()
    or exists (
      select 1
      from public.employees admin_employee
      where admin_employee.id = auth.uid()
        and admin_employee.role in ('admin', 'superadmin')
    )
  );
