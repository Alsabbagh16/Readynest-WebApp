create or replace function public.get_dashboard_overview_newest_customers(
  p_from timestamp with time zone,
  p_to timestamp with time zone
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamp with time zone := p_from;
  v_to timestamp with time zone := p_to;
  v_customers jsonb;
begin
  if not public.has_dashboard_overview_permission() then
    raise exception 'Access denied for Dashboard Overview.';
  end if;

  if v_from is null or v_to is null or v_to <= v_from then
    raise exception 'A valid dashboard date range is required.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'client_id', newest.id,
      'name', newest.name,
      'email', newest.email,
      'phone', newest.phone,
      'user_type', newest.user_type,
      'created_at', newest.created_at
    )
    order by newest.created_at desc
  ), '[]'::jsonb)
  into v_customers
  from (
    select
      profiles.id,
      coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
      profiles.email,
      profiles.phone::text as phone,
      coalesce(profiles.user_type, 'Personal') as user_type,
      profiles.created_at
    from public.profiles profiles
    where profiles.created_at >= v_from
      and profiles.created_at < v_to
    order by profiles.created_at desc
    limit 1
  ) newest;

  return v_customers;
end;
$$;

grant execute on function public.get_dashboard_overview_newest_customers(timestamp with time zone, timestamp with time zone) to authenticated;
