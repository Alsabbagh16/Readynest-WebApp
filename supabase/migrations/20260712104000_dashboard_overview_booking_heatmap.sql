create or replace function public.get_dashboard_overview_booking_heatmap(
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
  v_heatmap jsonb;
begin
  if not public.has_dashboard_overview_permission() then
    raise exception 'Access denied for Dashboard Overview.';
  end if;

  if v_from is null or v_to is null or v_to <= v_from then
    raise exception 'A valid dashboard date range is required.';
  end if;

  with day_slots as (
    select * from (values
      (0, 'Sun'),
      (1, 'Mon'),
      (2, 'Tue'),
      (3, 'Wed'),
      (4, 'Thu'),
      (5, 'Fri'),
      (6, 'Sat')
    ) as days(day_index, day_label)
  ),
  time_slots as (
    select * from (values
      (0, '6-9 AM', 6, 9),
      (1, '9 AM-12 PM', 9, 12),
      (2, '12-3 PM', 12, 15),
      (3, '3-6 PM', 15, 18),
      (4, '6-10 PM', 18, 22)
    ) as slots(slot_index, slot_label, start_hour, end_hour)
  ),
  counts as (
    select
      extract(dow from jobs.preferred_date)::integer as day_index,
      case
        when extract(hour from jobs.preferred_date)::integer >= 6 and extract(hour from jobs.preferred_date)::integer < 9 then 0
        when extract(hour from jobs.preferred_date)::integer >= 9 and extract(hour from jobs.preferred_date)::integer < 12 then 1
        when extract(hour from jobs.preferred_date)::integer >= 12 and extract(hour from jobs.preferred_date)::integer < 15 then 2
        when extract(hour from jobs.preferred_date)::integer >= 15 and extract(hour from jobs.preferred_date)::integer < 18 then 3
        when extract(hour from jobs.preferred_date)::integer >= 18 and extract(hour from jobs.preferred_date)::integer < 22 then 4
        else null
      end as slot_index,
      count(*)::integer as request_count
    from public.jobs jobs
    where jobs.preferred_date >= v_from
      and jobs.preferred_date < v_to
      and extract(hour from jobs.preferred_date)::integer >= 6
      and extract(hour from jobs.preferred_date)::integer < 22
    group by 1, 2
  ),
  grid as (
    select
      day_slots.day_index,
      day_slots.day_label,
      time_slots.slot_index,
      time_slots.slot_label,
      coalesce(counts.request_count, 0)::integer as request_count
    from day_slots
    cross join time_slots
    left join counts
      on counts.day_index = day_slots.day_index
     and counts.slot_index = time_slots.slot_index
  ),
  max_count as (
    select greatest(max(request_count), 1)::numeric as value from grid
  )
  select jsonb_build_object(
    'max_count', max_count.value,
    'days', (
      select jsonb_agg(
        jsonb_build_object(
          'day_index', days.day_index,
          'day_label', days.day_label,
          'slots', days.slots
        )
        order by days.day_index
      )
      from (
        select
          grid.day_index,
          grid.day_label,
          jsonb_agg(
            jsonb_build_object(
              'slot_index', grid.slot_index,
              'slot_label', grid.slot_label,
              'request_count', grid.request_count,
              'intensity', round(grid.request_count::numeric / max_count.value, 3)
            )
            order by grid.slot_index
          ) as slots
        from grid, max_count
        group by grid.day_index, grid.day_label
      ) days
    )
  )
  into v_heatmap
  from max_count;

  return coalesce(v_heatmap, jsonb_build_object('max_count', 0, 'days', '[]'::jsonb));
end;
$$;

grant execute on function public.get_dashboard_overview_booking_heatmap(timestamp with time zone, timestamp with time zone) to authenticated;
