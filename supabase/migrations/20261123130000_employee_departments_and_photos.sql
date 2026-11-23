create extension if not exists pgcrypto;

create or replace function public.has_employee_directory_permission(
  p_permission text,
  p_allow_legacy_admin boolean default false
)
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
            select 1
            from public.ui_employee_roles employee_roles
            where employee_roles.employee_id = employee.id
          )
        )
        or exists (
          select 1
          from public.ui_employee_roles employee_roles
          join public.ui_role_permissions role_permissions
            on role_permissions.role_id = employee_roles.role_id
          join public.ui_permissions permissions
            on permissions.id = role_permissions.permission_id
          where employee_roles.employee_id = employee.id
            and permissions.key = p_permission
        )
      )
  );
$$;

grant execute on function public.has_employee_directory_permission(text, boolean) to authenticated;

create table if not exists public.employee_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_by uuid references public.employees(id) on delete set null default auth.uid(),
  updated_by uuid references public.employees(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint employee_departments_name_unique unique (name)
);

create table if not exists public.employee_positions (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.employee_departments(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_by uuid references public.employees(id) on delete set null default auth.uid(),
  updated_by uuid references public.employees(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint employee_positions_department_name_unique unique (department_id, name)
);

alter table public.employees
  add column if not exists department_id uuid references public.employee_departments(id) on delete set null,
  add column if not exists position_id uuid references public.employee_positions(id) on delete set null;

create index if not exists employee_departments_sort_idx
  on public.employee_departments(sort_order, name);
create index if not exists employee_positions_department_sort_idx
  on public.employee_positions(department_id, sort_order, name);
create index if not exists employees_department_idx on public.employees(department_id);
create index if not exists employees_position_idx on public.employees(position_id);

create or replace function public.set_employee_directory_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists update_employee_departments_updated_at on public.employee_departments;
create trigger update_employee_departments_updated_at
before update on public.employee_departments
for each row execute function public.set_employee_directory_updated_at();

drop trigger if exists update_employee_positions_updated_at on public.employee_positions;
create trigger update_employee_positions_updated_at
before update on public.employee_positions
for each row execute function public.set_employee_directory_updated_at();

create or replace function public.sync_employee_position_label()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.name is distinct from old.name then
    update public.employees
    set position = new.name
    where position_id = new.id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.employees
    set position = null, position_id = null
    where position_id = old.id;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_employee_position_label_on_update on public.employee_positions;
create trigger sync_employee_position_label_on_update
after update of name on public.employee_positions
for each row execute function public.sync_employee_position_label();

drop trigger if exists clear_employee_position_label_on_delete on public.employee_positions;
create trigger clear_employee_position_label_on_delete
before delete on public.employee_positions
for each row execute function public.sync_employee_position_label();

alter table public.employee_departments enable row level security;
alter table public.employee_positions enable row level security;

create policy "Employee viewers read departments"
on public.employee_departments for select to authenticated
using (public.has_employee_directory_permission('tab.employees.view', true));

create policy "Employee managers create departments"
on public.employee_departments for insert to authenticated
with check (public.has_employee_directory_permission('employees.create', true));

create policy "Employee managers update departments"
on public.employee_departments for update to authenticated
using (public.has_employee_directory_permission('employees.create', true))
with check (public.has_employee_directory_permission('employees.create', true));

create policy "Employee managers delete departments"
on public.employee_departments for delete to authenticated
using (public.has_employee_directory_permission('employees.create', true));

create policy "Employee viewers read positions"
on public.employee_positions for select to authenticated
using (public.has_employee_directory_permission('tab.employees.view', true));

create policy "Employee managers create positions"
on public.employee_positions for insert to authenticated
with check (public.has_employee_directory_permission('employees.create', true));

create policy "Employee managers update positions"
on public.employee_positions for update to authenticated
using (public.has_employee_directory_permission('employees.create', true))
with check (public.has_employee_directory_permission('employees.create', true));

create policy "Employee managers delete positions"
on public.employee_positions for delete to authenticated
using (public.has_employee_directory_permission('employees.create', true));

insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', true)
on conflict (id) do update set public = true;

create policy "Authenticated users view employee photos"
on storage.objects for select to authenticated
using (bucket_id = 'employee-photos');

create policy "Employee managers upload employee photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'employee-photos'
  and public.has_employee_directory_permission('employees.create', true)
);

create policy "Employee managers update employee photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'employee-photos'
  and public.has_employee_directory_permission('employees.create', true)
)
with check (
  bucket_id = 'employee-photos'
  and public.has_employee_directory_permission('employees.create', true)
);

create policy "Employee managers delete employee photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'employee-photos'
  and public.has_employee_directory_permission('employees.create', true)
);

do $$
declare
  v_department_id uuid;
  v_position record;
begin
  if exists (
    select 1 from public.employees
    where nullif(trim(position), '') is not null
  ) then
    insert into public.employee_departments (name, sort_order)
    values ('Team', 0)
    on conflict (name) do update set name = excluded.name
    returning id into v_department_id;

    if v_department_id is null then
      select id into v_department_id
      from public.employee_departments
      where name = 'Team';
    end if;

    for v_position in
      select trim(position) as name, (row_number() over (order by trim(position)) - 1)::integer as position_order
      from public.employees
      where nullif(trim(position), '') is not null
      group by trim(position)
    loop
      insert into public.employee_positions (department_id, name, sort_order)
      values (v_department_id, v_position.name, v_position.position_order)
      on conflict (department_id, name) do nothing;
    end loop;

    update public.employees employee
    set
      department_id = coalesce(employee.department_id, v_department_id),
      position_id = coalesce(employee.position_id, position_record.id)
    from public.employee_positions position_record
    where position_record.department_id = v_department_id
      and position_record.name = trim(employee.position)
      and nullif(trim(employee.position), '') is not null;
  end if;
end;
$$;
