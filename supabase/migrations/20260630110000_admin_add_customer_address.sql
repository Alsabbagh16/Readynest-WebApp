create or replace function public.admin_add_customer_address(
  p_user_id uuid,
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

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Customer profile not found.';
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
      and is_default = true;
  end if;

  insert into public.addresses (
    id,
    user_id,
    label,
    street,
    city,
    zip,
    phone,
    alt_phone,
    is_default
  ) values (
    gen_random_uuid(),
    p_user_id,
    nullif(trim(p_address ->> 'label'), ''),
    trim(p_address ->> 'street'),
    trim(p_address ->> 'city'),
    trim(p_address ->> 'zip'),
    trim(p_address ->> 'phone'),
    nullif(trim(p_address ->> 'alt_phone'), ''),
    v_is_default
  )
  returning to_jsonb(addresses.*) into v_address;

  return v_address;
end;
$$;

revoke execute on function public.admin_add_customer_address(uuid, jsonb) from public, anon;
grant execute on function public.admin_add_customer_address(uuid, jsonb) to authenticated;
