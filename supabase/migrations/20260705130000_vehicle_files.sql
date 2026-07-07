create table if not exists public.vehicle_files (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create index if not exists vehicle_files_vehicle_created_idx
  on public.vehicle_files(vehicle_id, created_at desc);

alter table public.vehicle_files enable row level security;

drop policy if exists "Vehicle viewers read vehicle files" on public.vehicle_files;
drop policy if exists "Vehicle managers insert vehicle files" on public.vehicle_files;
drop policy if exists "Vehicle managers delete vehicle files" on public.vehicle_files;
create policy "Vehicle viewers read vehicle files" on public.vehicle_files for select to authenticated
  using (public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Vehicle managers insert vehicle files" on public.vehicle_files for insert to authenticated
  with check (public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
create policy "Vehicle managers delete vehicle files" on public.vehicle_files for delete to authenticated
  using (public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));

insert into storage.buckets (id, name, public)
values ('vehicle-files', 'vehicle-files', false)
on conflict (id) do nothing;

drop policy if exists "Vehicle viewers read vehicle documents" on storage.objects;
drop policy if exists "Vehicle managers upload vehicle documents" on storage.objects;
drop policy if exists "Vehicle managers delete vehicle documents" on storage.objects;
create policy "Vehicle viewers read vehicle documents" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-files' and public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true));
create policy "Vehicle managers upload vehicle documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-files' and public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
create policy "Vehicle managers delete vehicle documents" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-files' and public.has_vehicle_logistics_permission('vehicle_logistics.vehicles.manage', false));
