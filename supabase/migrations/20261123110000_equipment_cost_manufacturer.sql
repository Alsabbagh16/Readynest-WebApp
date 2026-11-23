alter table public.inventory_equipment
  add column if not exists manufacturer text,
  add column if not exists cost numeric(12, 3);

alter table public.inventory_equipment
  drop constraint if exists inventory_equipment_cost_check;

alter table public.inventory_equipment
  add constraint inventory_equipment_cost_check check (cost is null or cost >= 0);
