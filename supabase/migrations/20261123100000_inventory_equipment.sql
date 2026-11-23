create extension if not exists pgcrypto;

insert into public.ui_permissions (key, description, module)
values
  ('tab.inventory.view', 'View Inventory tab', 'inventory'),
  ('inventory.create_item', 'Create inventory items and equipment', 'inventory'),
  ('inventory.edit_item', 'Edit inventory items and equipment', 'inventory'),
  ('inventory.delete_item', 'Delete inventory items and equipment', 'inventory')
on conflict (key) do update set
  description = excluded.description,
  module = excluded.module;

create or replace function public.has_inventory_permission(p_permission text, p_allow_legacy_admin boolean default false)
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

grant execute on function public.has_inventory_permission(text, boolean) to authenticated;

create sequence if not exists public.inventory_equipment_code_seq start 1;

create or replace function public.next_inventory_equipment_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.has_inventory_permission('inventory.create_item', true) then
    raise exception 'Inventory equipment creation permission required.';
  end if;
  return 'EQ-' || lpad(nextval('public.inventory_equipment_code_seq')::text, 3, '0');
end;
$$;

revoke execute on function public.next_inventory_equipment_code() from public, anon;
grant execute on function public.next_inventory_equipment_code() to authenticated;

create table if not exists public.inventory_equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_code text not null unique default public.next_inventory_equipment_code(),
  item_name text,
  item_type text check (item_type is null or item_type in ('Machine', 'Equipment', 'Accessory')),
  manufacturer text,
  cost numeric(12, 3) check (cost is null or cost >= 0),
  description text,
  date_purchased date,
  warranty_months integer check (warranty_months is null or warranty_months >= 0),
  image_path text,
  created_by uuid references public.employees(id) on delete set null default auth.uid(),
  updated_by uuid references public.employees(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.inventory_equipment_documents (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.inventory_equipment(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  uploaded_by uuid references public.employees(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create index if not exists inventory_equipment_code_idx on public.inventory_equipment(equipment_code);
create index if not exists inventory_equipment_documents_equipment_idx on public.inventory_equipment_documents(equipment_id, created_at desc);

create or replace function public.set_inventory_equipment_updated_at()
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

drop trigger if exists update_inventory_equipment_updated_at on public.inventory_equipment;
create trigger update_inventory_equipment_updated_at
before update on public.inventory_equipment
for each row execute function public.set_inventory_equipment_updated_at();

alter table public.inventory_equipment enable row level security;
alter table public.inventory_equipment_documents enable row level security;

create policy "Inventory viewers read equipment" on public.inventory_equipment for select to authenticated
  using (public.has_inventory_permission('tab.inventory.view', true));
create policy "Inventory creators add equipment" on public.inventory_equipment for insert to authenticated
  with check (public.has_inventory_permission('inventory.create_item', true));
create policy "Inventory editors update equipment" on public.inventory_equipment for update to authenticated
  using (public.has_inventory_permission('inventory.edit_item', true))
  with check (public.has_inventory_permission('inventory.edit_item', true));
create policy "Inventory managers delete equipment" on public.inventory_equipment for delete to authenticated
  using (
    public.has_inventory_permission('inventory.delete_item', true)
    or (
      created_by = auth.uid()
      and created_at > now() - interval '15 minutes'
      and public.has_inventory_permission('inventory.create_item', true)
    )
  );

create policy "Inventory viewers read equipment documents" on public.inventory_equipment_documents for select to authenticated
  using (public.has_inventory_permission('tab.inventory.view', true));
create policy "Inventory managers add equipment documents" on public.inventory_equipment_documents for insert to authenticated
  with check (
    public.has_inventory_permission('inventory.create_item', true)
    or public.has_inventory_permission('inventory.edit_item', true)
  );
create policy "Inventory editors delete equipment documents" on public.inventory_equipment_documents for delete to authenticated
  using (public.has_inventory_permission('inventory.edit_item', true) or public.has_inventory_permission('inventory.delete_item', true));

insert into storage.buckets (id, name, public)
values ('equipment-files', 'equipment-files', false)
on conflict (id) do update set public = false;

create policy "Inventory viewers read equipment files" on storage.objects for select to authenticated
  using (bucket_id = 'equipment-files' and public.has_inventory_permission('tab.inventory.view', true));
create policy "Inventory managers upload equipment files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'equipment-files'
    and (
      public.has_inventory_permission('inventory.create_item', true)
      or public.has_inventory_permission('inventory.edit_item', true)
    )
  );
create policy "Inventory managers remove equipment files" on storage.objects for delete to authenticated
  using (
    bucket_id = 'equipment-files'
    and (
      public.has_inventory_permission('inventory.edit_item', true)
      or public.has_inventory_permission('inventory.delete_item', true)
      or public.has_inventory_permission('inventory.create_item', true)
    )
  );
