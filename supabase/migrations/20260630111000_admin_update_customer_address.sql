create or replace function public.admin_update_customer_address(
  p_user_id uuid,
  p_address_id uuid,
  p_address jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_address jsonb;
  v_is_default boolean := coalesce((p_address ->> 'is_default')::boolean, false);
begin
  if not exists (
    select 1
    from public.employees employees
    where employees.id = auth.uid()
      and (
        employees.role in ('admin', 'superadmin')
        or employees.is_superadmin = true
      )
  ) then
    raise exception 'Customer address management permission required.';
  end if;

  if not exists (
    select 1
    from public.addresses
    where id = p_address_id
      and user_id = p_user_id
  ) then
    raise exception 'Saved address not found for this customer.';
  end if;

  if nullif(trim(coalesce(p_address ->> 'street', '')), '') is null
     or nullif(trim(coalesce(p_address ->> 'city', '')), '') is null
     or nullif(trim(coalesce(p_address ->> 'zip', '')), '') is null
     or nullif(trim(coalesce(p_address ->> 'phone', '')), '') is null then
    raise exception 'Street, city, block, and location phone are required.';
  end if;

  if v_is_default then
    update public.addresses
    set is_default = false
    where user_id = p_user_id
      and id <> p_address_id
      and is_default = true;
  end if;

  update public.addresses
  set label = nullif(trim(p_address ->> 'label'), ''),
      street = trim(p_address ->> 'street'),
      city = trim(p_address ->> 'city'),
      zip = trim(p_address ->> 'zip'),
      phone = trim(p_address ->> 'phone'),
      alt_phone = nullif(trim(p_address ->> 'alt_phone'), ''),
      is_default = v_is_default
  where id = p_address_id
    and user_id = p_user_id
  returning to_jsonb(addresses.*) into v_address;

  return v_address;
end;
$$;

revoke execute on function public.admin_update_customer_address(uuid, uuid, jsonb) from public, anon;
grant execute on function public.admin_update_customer_address(uuid, uuid, jsonb) to authenticated;
