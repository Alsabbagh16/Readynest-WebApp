alter table public.vehicles
  add column if not exists admin_notes text;

create or replace function public.update_vehicle_admin_notes(
  p_vehicle_id uuid,
  p_notes text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notes text;
begin
  if not public.has_vehicle_logistics_permission('tab.vehicle_logistics.view', true) then
    raise exception 'Vehicle Logistics access required.';
  end if;

  update public.vehicles
  set admin_notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = p_vehicle_id
  returning admin_notes into v_notes;

  if not found then
    raise exception 'Vehicle not found.';
  end if;

  return v_notes;
end;
$$;

revoke execute on function public.update_vehicle_admin_notes(uuid, text) from public, anon;
grant execute on function public.update_vehicle_admin_notes(uuid, text) to authenticated;
