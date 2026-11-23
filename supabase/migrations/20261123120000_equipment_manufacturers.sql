create table if not exists public.inventory_equipment_manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_by uuid references public.employees(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create unique index if not exists inventory_equipment_manufacturers_name_idx
  on public.inventory_equipment_manufacturers(lower(trim(name)));

insert into public.inventory_equipment_manufacturers(name)
select distinct trim(manufacturer)
from public.inventory_equipment
where nullif(trim(manufacturer), '') is not null
on conflict do nothing;

alter table public.inventory_equipment_manufacturers enable row level security;

create policy "Inventory viewers read equipment manufacturers"
  on public.inventory_equipment_manufacturers for select to authenticated
  using (public.has_inventory_permission('tab.inventory.view', true));

create policy "Inventory managers add equipment manufacturers"
  on public.inventory_equipment_manufacturers for insert to authenticated
  with check (
    public.has_inventory_permission('inventory.create_item', true)
    or public.has_inventory_permission('inventory.edit_item', true)
  );
