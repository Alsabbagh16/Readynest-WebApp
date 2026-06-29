create or replace function public.admin_update_customer_profile(
  p_user_id uuid,
  p_updates jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patch public.profiles%rowtype;
  v_updated_count integer;
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
    raise exception 'Customer profile update permission required.';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'Profile updates must be a JSON object.';
  end if;

  v_patch := jsonb_populate_record(null::public.profiles, p_updates);

  if coalesce((p_updates ->> 'is_subscriber')::boolean, false)
     and nullif(trim(coalesce(p_updates ->> 'subscription_plan_type', '')), '') is null then
    raise exception 'A subscription frequency is required.';
  end if;

  update public.profiles profiles
  set first_name = case when p_updates ? 'first_name' then v_patch.first_name else profiles.first_name end,
      last_name = case when p_updates ? 'last_name' then v_patch.last_name else profiles.last_name end,
      email = case when p_updates ? 'email' then v_patch.email else profiles.email end,
      phone = case when p_updates ? 'phone' then v_patch.phone else profiles.phone end,
      dob = case when p_updates ? 'dob' then v_patch.dob else profiles.dob end,
      user_type = case when p_updates ? 'user_type' then v_patch.user_type else profiles.user_type end,
      credits = case when p_updates ? 'credits' then v_patch.credits else profiles.credits end,
      document_urls = case when p_updates ? 'document_urls' then v_patch.document_urls else profiles.document_urls end,
      is_subscriber = case when p_updates ? 'is_subscriber' then v_patch.is_subscriber else profiles.is_subscriber end,
      subscription_plan_type = case
        when p_updates ? 'subscription_plan_type' then v_patch.subscription_plan_type
        else profiles.subscription_plan_type
      end,
      updated_at = now()
  where profiles.id = p_user_id;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Customer profile not found.';
  end if;

  return true;
end;
$$;

revoke execute on function public.admin_update_customer_profile(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_customer_profile(uuid, jsonb) to authenticated;
