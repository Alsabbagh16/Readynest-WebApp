create or replace function public.has_dashboard_overview_permission()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
begin
  select * into v_employee
  from public.employees
  where id = auth.uid();

  if not found then
    return false;
  end if;

  if coalesce(v_employee.is_superadmin, false)
     or v_employee.role = 'superadmin'
     or v_employee.role = 'admin' then
    return true;
  end if;

  return exists (
    select 1
    from public.ui_employee_roles employee_roles
    join public.ui_role_permissions role_permissions
      on role_permissions.role_id = employee_roles.role_id
    join public.ui_permissions permissions
      on permissions.id = role_permissions.permission_id
    where employee_roles.employee_id = auth.uid()
      and permissions.key = 'tab.dashboard_overview.view'
  );
end;
$$;

grant execute on function public.has_dashboard_overview_permission() to authenticated;
