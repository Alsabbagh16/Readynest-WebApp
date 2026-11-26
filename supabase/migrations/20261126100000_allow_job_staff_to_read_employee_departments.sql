-- Job screens use department names to classify existing employee assignments.
create or replace function public.can_read_job_assignee_departments()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_employee_directory_permission('tab.jobs_list.view', true)
    or public.has_employee_directory_permission('jobs.view_all', false)
    or public.has_employee_directory_permission('jobs.create', false)
    or public.has_employee_directory_permission('jobs.edit', false)
    or exists (
      select 1
      from public.employees employee
      where employee.id = auth.uid()
        and employee.role = 'staff'
        and not exists (
          select 1
          from public.ui_employee_roles employee_roles
          where employee_roles.employee_id = employee.id
        )
    );
$$;

revoke execute on function public.can_read_job_assignee_departments() from public, anon;
grant execute on function public.can_read_job_assignee_departments() to authenticated;

create policy "Job staff read employee departments"
on public.employee_departments for select to authenticated
using ((select public.can_read_job_assignee_departments()));
