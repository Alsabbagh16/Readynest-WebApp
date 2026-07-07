create or replace function public.get_vehicle_route(
  p_vehicle_id uuid,
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_max_points integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_vehicle_logistics_permission('vehicle_logistics.performance.view', false) then
    raise exception 'Vehicle performance permission required.';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid route date range.';
  end if;

  with ordered as (
    select
      latitude,
      longitude,
      recorded_at,
      is_moving,
      distance_delta_km,
      row_number() over (order by recorded_at, id) as point_number,
      count(*) over () as total_points
    from public.vehicle_telemetry_positions
    where vehicle_id = p_vehicle_id
      and recorded_at >= p_from
      and recorded_at <= p_to
  ), summary as (
    select
      coalesce(max(total_points), 0)::integer as total_points,
      min(recorded_at) as started_at,
      max(recorded_at) as ended_at,
      coalesce(sum(case when point_number = 1 then 0 else distance_delta_km end), 0) as distance_km
    from ordered
  ), sampled as (
    select *
    from ordered
    where total_points <= greatest(coalesce(p_max_points, 1000), 2)
       or point_number = 1
       or point_number = total_points
       or mod(point_number - 1, greatest(ceil(total_points::numeric / greatest(coalesce(p_max_points, 1000), 2))::integer, 1)) = 0
  )
  select jsonb_build_object(
    'points', coalesce((select jsonb_agg(jsonb_build_object(
      'latitude', latitude,
      'longitude', longitude,
      'recorded_at', recorded_at,
      'is_moving', is_moving
    ) order by recorded_at, point_number) from sampled), '[]'::jsonb),
    'distance_km', summary.distance_km,
    'started_at', summary.started_at,
    'ended_at', summary.ended_at,
    'total_points', summary.total_points
  ) into v_result
  from summary;

  return coalesce(v_result, jsonb_build_object(
    'points', '[]'::jsonb,
    'distance_km', 0,
    'started_at', null,
    'ended_at', null,
    'total_points', 0
  ));
end;
$$;

grant execute on function public.get_vehicle_route(uuid, timestamp with time zone, timestamp with time zone, integer) to authenticated;
