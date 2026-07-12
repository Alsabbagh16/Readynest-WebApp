create or replace function public.get_dashboard_overview_job_series(
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_job_scope text default 'all',
  p_hide_business_jobs boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamp with time zone := p_from;
  v_to timestamp with time zone := p_to;
  v_scope text := lower(coalesce(nullif(trim(p_job_scope), ''), 'all'));
  v_hide_business_jobs boolean := coalesce(p_hide_business_jobs, false);
  v_days numeric;
  v_bucket interval;
  v_series jsonb;
begin
  if not public.has_dashboard_overview_permission() then
    raise exception 'Access denied for Dashboard Overview.';
  end if;

  if v_from is null or v_to is null or v_to <= v_from then
    raise exception 'A valid dashboard date range is required.';
  end if;

  if v_scope not in ('all', 'subscription', 'one_time') then
    v_scope := 'all';
  end if;

  v_days := greatest(extract(epoch from (v_to - v_from)) / 86400, 1);
  v_bucket := case when v_days > 45 then interval '1 week' else interval '1 day' end;

  with scoped_jobs as (
    select
      jobs.job_ref_id::text,
      jobs.preferred_date,
      jobs.status,
      coalesce(purchases.is_subscription, false) as is_subscription,
      coalesce(profiles.user_type, '') ilike '%business%' as is_business
    from public.jobs jobs
    left join public.purchases purchases
      on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    left join public.profiles profiles
      on profiles.id = coalesce(jobs.user_id, purchases.user_id)
    where jobs.preferred_date >= v_from
      and jobs.preferred_date < v_to
      and (
        v_scope = 'all'
        or (v_scope = 'subscription' and coalesce(purchases.is_subscription, false))
        or (v_scope = 'one_time' and not coalesce(purchases.is_subscription, false))
      )
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'period_start', bucketed.period_start,
      'total', bucketed.total_jobs,
      'completed', bucketed.completed_jobs,
      'scheduled', bucketed.scheduled_jobs
    )
    order by bucketed.period_start
  ), '[]'::jsonb)
  into v_series
  from (
    select
      buckets.period_start,
      count(scoped_jobs.job_ref_id)::integer as total_jobs,
      count(scoped_jobs.job_ref_id) filter (where lower(coalesce(scoped_jobs.status, '')) = 'completed')::integer as completed_jobs,
      count(scoped_jobs.job_ref_id) filter (
        where lower(coalesce(scoped_jobs.status, '')) not in ('completed', 'cancelled', 'failed')
      )::integer as scheduled_jobs
    from generate_series(date_trunc(case when v_bucket = interval '1 week' then 'week' else 'day' end, v_from), v_to, v_bucket) buckets(period_start)
    left join scoped_jobs
      on scoped_jobs.preferred_date >= buckets.period_start
     and scoped_jobs.preferred_date < least(buckets.period_start + v_bucket, v_to)
     and (not v_hide_business_jobs or not scoped_jobs.is_business)
    where buckets.period_start < v_to
    group by buckets.period_start
    order by buckets.period_start
  ) bucketed;

  return v_series;
end;
$$;

grant execute on function public.get_dashboard_overview_job_series(timestamp with time zone, timestamp with time zone, text, boolean) to authenticated;
