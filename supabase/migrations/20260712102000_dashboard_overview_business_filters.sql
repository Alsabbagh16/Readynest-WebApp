create or replace function public.get_dashboard_overview(
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
  v_period_seconds numeric;
  v_prev_from timestamp with time zone;
  v_prev_to timestamp with time zone;
  v_bucket interval;
  v_payload jsonb;
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

  v_period_seconds := extract(epoch from (v_to - v_from));
  v_prev_to := v_from;
  v_prev_from := v_from - make_interval(secs => v_period_seconds);
  v_days := greatest(v_period_seconds / 86400, 1);
  v_bucket := case when v_days > 45 then interval '1 week' else interval '1 day' end;

  with
  scoped_purchases as (
    select
      purchases.purchase_ref_id::text as purchase_ref_id,
      purchases.user_id,
      purchases.created_at,
      coalesce(purchases.final_amount_due_on_arrival, purchases.paid_amount, 0)::numeric as revenue,
      coalesce(purchases.is_subscription, false) as is_subscription,
      purchases.status,
      coalesce(profiles.user_type, '') ilike '%business%' as is_business
    from public.purchases purchases
    left join public.profiles profiles on profiles.id = purchases.user_id
    where purchases.created_at >= v_from
      and purchases.created_at < v_to
  ),
  previous_purchases as (
    select
      purchases.purchase_ref_id::text as purchase_ref_id,
      purchases.user_id,
      purchases.created_at,
      coalesce(purchases.final_amount_due_on_arrival, purchases.paid_amount, 0)::numeric as revenue,
      coalesce(purchases.is_subscription, false) as is_subscription,
      coalesce(profiles.user_type, '') ilike '%business%' as is_business
    from public.purchases purchases
    left join public.profiles profiles on profiles.id = purchases.user_id
    where purchases.created_at >= v_prev_from
      and purchases.created_at < v_prev_to
  ),
  jobs_with_purchase as (
    select
      jobs.job_ref_id::text as job_ref_id,
      coalesce(jobs.user_id, purchases.user_id) as client_id,
      jobs.purchase_ref_id::text as purchase_ref_id,
      jobs.preferred_date,
      jobs.status,
      coalesce(jobs.hours_needed, 0)::numeric as hours_needed,
      coalesce(purchases.is_subscription, false) as is_subscription,
      coalesce(profiles.user_type, '') ilike '%business%' as is_business
    from public.jobs jobs
    left join public.purchases purchases
      on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    left join public.profiles profiles
      on profiles.id = coalesce(jobs.user_id, purchases.user_id)
    where jobs.preferred_date >= v_from
      and jobs.preferred_date < v_to
  ),
  scoped_jobs as (
    select *
    from jobs_with_purchase
    where (not v_hide_business_jobs or not is_business)
      and (
        v_scope = 'all'
        or (v_scope = 'subscription' and is_subscription)
        or (v_scope = 'one_time' and not is_subscription)
      )
  ),
  previous_jobs as (
    select *
    from (
      select
        jobs.job_ref_id::text as job_ref_id,
        coalesce(jobs.user_id, purchases.user_id) as client_id,
        jobs.purchase_ref_id::text as purchase_ref_id,
        jobs.preferred_date,
        jobs.status,
        coalesce(jobs.hours_needed, 0)::numeric as hours_needed,
        coalesce(purchases.is_subscription, false) as is_subscription,
        coalesce(profiles.user_type, '') ilike '%business%' as is_business
      from public.jobs jobs
      left join public.purchases purchases
        on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
      left join public.profiles profiles
        on profiles.id = coalesce(jobs.user_id, purchases.user_id)
      where jobs.preferred_date >= v_prev_from
        and jobs.preferred_date < v_prev_to
    ) previous_job_rows
    where (not v_hide_business_jobs or not is_business)
      and (
        v_scope = 'all'
        or (v_scope = 'subscription' and is_subscription)
        or (v_scope = 'one_time' and not is_subscription)
      )
  ),
  active_customer_ids as (
    select user_id as client_id from scoped_purchases where user_id is not null
    union
    select client_id from scoped_jobs where client_id is not null
  ),
  previous_active_customer_ids as (
    select user_id as client_id from previous_purchases where user_id is not null
    union
    select client_id from previous_jobs where client_id is not null
  ),
  customer_job_counts as (
    select client_id, count(*)::integer as completed_jobs
    from scoped_jobs
    where lower(coalesce(status, '')) = 'completed'
      and client_id is not null
    group by client_id
  ),
  previous_customer_job_counts as (
    select client_id, count(*)::integer as completed_jobs
    from previous_jobs
    where lower(coalesce(status, '')) = 'completed'
      and client_id is not null
    group by client_id
  ),
  current_summary as (
    select
      (select count(*)::numeric from active_customer_ids) as active_customers,
      (select count(*)::numeric from public.profiles profiles where profiles.created_at >= v_from and profiles.created_at < v_to) as new_customers,
      (select count(*)::numeric from customer_job_counts where completed_jobs > 1) as returning_customers,
      (select coalesce(sum(revenue), 0)::numeric from scoped_purchases) as total_revenue,
      (select coalesce(sum(revenue), 0)::numeric from scoped_purchases where is_subscription) as subscriber_revenue,
      (select coalesce(sum(revenue), 0)::numeric from scoped_purchases where not is_subscription) as onetime_revenue,
      (select coalesce(sum(revenue), 0)::numeric from scoped_purchases where not is_business) as non_business_total_revenue,
      (select coalesce(sum(revenue), 0)::numeric from scoped_purchases where not is_business and is_subscription) as non_business_subscriber_revenue,
      (select coalesce(sum(revenue), 0)::numeric from scoped_purchases where not is_business and not is_subscription) as non_business_onetime_revenue,
      (select count(*)::numeric from scoped_jobs) as total_jobs,
      (select count(*)::numeric from scoped_jobs where lower(coalesce(status, '')) = 'completed') as completed_jobs,
      (select coalesce(sum(hours_needed), 0)::numeric from scoped_jobs where lower(coalesce(status, '')) = 'completed') as hours_worked
  ),
  previous_summary as (
    select
      (select count(*)::numeric from previous_active_customer_ids) as active_customers,
      (select count(*)::numeric from public.profiles profiles where profiles.created_at >= v_prev_from and profiles.created_at < v_prev_to) as new_customers,
      (select count(*)::numeric from previous_customer_job_counts where completed_jobs > 1) as returning_customers,
      (select coalesce(sum(revenue), 0)::numeric from previous_purchases) as total_revenue,
      (select coalesce(sum(revenue), 0)::numeric from previous_purchases where is_subscription) as subscriber_revenue,
      (select coalesce(sum(revenue), 0)::numeric from previous_purchases where not is_subscription) as onetime_revenue,
      (select coalesce(sum(revenue), 0)::numeric from previous_purchases where not is_business) as non_business_total_revenue,
      (select coalesce(sum(revenue), 0)::numeric from previous_purchases where not is_business and is_subscription) as non_business_subscriber_revenue,
      (select coalesce(sum(revenue), 0)::numeric from previous_purchases where not is_business and not is_subscription) as non_business_onetime_revenue,
      (select count(*)::numeric from previous_jobs) as total_jobs,
      (select count(*)::numeric from previous_jobs where lower(coalesce(status, '')) = 'completed') as completed_jobs,
      (select coalesce(sum(hours_needed), 0)::numeric from previous_jobs where lower(coalesce(status, '')) = 'completed') as hours_worked
  ),
  top_customers as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'client_id', ranked.client_id,
          'name', ranked.client_name,
          'email', ranked.email,
          'avatar_url', ranked.avatar_url,
          'total_orders', ranked.total_orders,
          'total_revenue', ranked.total_revenue
        )
        order by ranked.total_revenue desc
      ),
      '[]'::jsonb
    ) as rows
    from (
      select
        profiles.id as client_id,
        coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as client_name,
        profiles.email,
        null::text as avatar_url,
        count(scoped_purchases.purchase_ref_id)::integer as total_orders,
        coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
      from scoped_purchases
      join public.profiles profiles on profiles.id = scoped_purchases.user_id
      group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
      order by coalesce(sum(scoped_purchases.revenue), 0) desc
      limit 5
    ) ranked
  ),
  revenue_top_customers as (
    select jsonb_build_object(
      'all', coalesce((select jsonb_agg(row_to_json(ranked)::jsonb order by ranked.total_revenue desc) from (
        select profiles.id as client_id,
               coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
               count(scoped_purchases.purchase_ref_id)::integer as total_orders,
               coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
        from scoped_purchases
        join public.profiles profiles on profiles.id = scoped_purchases.user_id
        group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
        order by coalesce(sum(scoped_purchases.revenue), 0) desc
        limit 3
      ) ranked), '[]'::jsonb),
      'subscriber', coalesce((select jsonb_agg(row_to_json(ranked)::jsonb order by ranked.total_revenue desc) from (
        select profiles.id as client_id,
               coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
               count(scoped_purchases.purchase_ref_id)::integer as total_orders,
               coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
        from scoped_purchases
        join public.profiles profiles on profiles.id = scoped_purchases.user_id
        where scoped_purchases.is_subscription
        group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
        order by coalesce(sum(scoped_purchases.revenue), 0) desc
        limit 3
      ) ranked), '[]'::jsonb),
      'one_time', coalesce((select jsonb_agg(row_to_json(ranked)::jsonb order by ranked.total_revenue desc) from (
        select profiles.id as client_id,
               coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
               count(scoped_purchases.purchase_ref_id)::integer as total_orders,
               coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
        from scoped_purchases
        join public.profiles profiles on profiles.id = scoped_purchases.user_id
        where not scoped_purchases.is_subscription
        group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
        order by coalesce(sum(scoped_purchases.revenue), 0) desc
        limit 3
      ) ranked), '[]'::jsonb)
    ) as rows
  ),
  non_business_revenue_top_customers as (
    select jsonb_build_object(
      'all', coalesce((select jsonb_agg(row_to_json(ranked)::jsonb order by ranked.total_revenue desc) from (
        select profiles.id as client_id,
               coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
               count(scoped_purchases.purchase_ref_id)::integer as total_orders,
               coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
        from scoped_purchases
        join public.profiles profiles on profiles.id = scoped_purchases.user_id
        where not scoped_purchases.is_business
        group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
        order by coalesce(sum(scoped_purchases.revenue), 0) desc
        limit 3
      ) ranked), '[]'::jsonb),
      'subscriber', coalesce((select jsonb_agg(row_to_json(ranked)::jsonb order by ranked.total_revenue desc) from (
        select profiles.id as client_id,
               coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
               count(scoped_purchases.purchase_ref_id)::integer as total_orders,
               coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
        from scoped_purchases
        join public.profiles profiles on profiles.id = scoped_purchases.user_id
        where not scoped_purchases.is_business and scoped_purchases.is_subscription
        group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
        order by coalesce(sum(scoped_purchases.revenue), 0) desc
        limit 3
      ) ranked), '[]'::jsonb),
      'one_time', coalesce((select jsonb_agg(row_to_json(ranked)::jsonb order by ranked.total_revenue desc) from (
        select profiles.id as client_id,
               coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client') as name,
               count(scoped_purchases.purchase_ref_id)::integer as total_orders,
               coalesce(sum(scoped_purchases.revenue), 0)::numeric as total_revenue
        from scoped_purchases
        join public.profiles profiles on profiles.id = scoped_purchases.user_id
        where not scoped_purchases.is_business and not scoped_purchases.is_subscription
        group by profiles.id, profiles.first_name, profiles.last_name, profiles.email
        order by coalesce(sum(scoped_purchases.revenue), 0) desc
        limit 3
      ) ranked), '[]'::jsonb)
    ) as rows
  ),
  revenue_series as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'period_start', bucketed.period_start,
        'total', bucketed.total,
        'subscriber', bucketed.subscriber,
        'one_time', bucketed.one_time
      )
      order by bucketed.period_start
    ), '[]'::jsonb) as rows
    from (
      select
        buckets.period_start,
        coalesce(sum(scoped_purchases.revenue), 0)::numeric as total,
        coalesce(sum(scoped_purchases.revenue) filter (where scoped_purchases.is_subscription), 0)::numeric as subscriber,
        coalesce(sum(scoped_purchases.revenue) filter (where not scoped_purchases.is_subscription), 0)::numeric as one_time
      from generate_series(date_trunc(case when v_bucket = interval '1 week' then 'week' else 'day' end, v_from), v_to, v_bucket) buckets(period_start)
      left join scoped_purchases
        on scoped_purchases.created_at >= buckets.period_start
       and scoped_purchases.created_at < least(buckets.period_start + v_bucket, v_to)
      where buckets.period_start < v_to
      group by buckets.period_start
      order by buckets.period_start
    ) bucketed
  ),
  duration_mode as (
    select jsonb_build_object(
      'hours', mode_rows.hours_needed,
      'label', case
        when mode_rows.hours_needed is null then 'No completed jobs'
        when mode_rows.hours_needed = floor(mode_rows.hours_needed) then mode_rows.hours_needed::integer::text || '-Hour Clean'
        else trim(to_char(mode_rows.hours_needed, 'FM999999990.0')) || '-Hour Clean'
      end,
      'count', coalesce(mode_rows.job_count, 0)
    ) as row
    from (
      select hours_needed, count(*)::integer as job_count
      from scoped_jobs
      where lower(coalesce(status, '')) = 'completed'
        and hours_needed > 0
      group by hours_needed
      order by count(*) desc, hours_needed asc
      limit 1
    ) mode_rows
    right join (select 1) fallback on true
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to', v_to, 'previous_from', v_prev_from, 'previous_to', v_prev_to),
    'customers', jsonb_build_object(
      'active_customers', jsonb_build_object('value', current_summary.active_customers, 'previous', previous_summary.active_customers),
      'new_customers', jsonb_build_object('value', current_summary.new_customers, 'previous', previous_summary.new_customers),
      'returning_customers', jsonb_build_object('value', current_summary.returning_customers, 'previous', previous_summary.returning_customers),
      'top_customers', top_customers.rows
    ),
    'revenue', jsonb_build_object(
      'total_revenue', jsonb_build_object('value', current_summary.total_revenue, 'previous', previous_summary.total_revenue),
      'subscriber_revenue', jsonb_build_object('value', current_summary.subscriber_revenue, 'previous', previous_summary.subscriber_revenue),
      'one_time_revenue', jsonb_build_object('value', current_summary.onetime_revenue, 'previous', previous_summary.onetime_revenue),
      'non_business_total_revenue', jsonb_build_object('value', current_summary.non_business_total_revenue, 'previous', previous_summary.non_business_total_revenue),
      'non_business_subscriber_revenue', jsonb_build_object('value', current_summary.non_business_subscriber_revenue, 'previous', previous_summary.non_business_subscriber_revenue),
      'non_business_one_time_revenue', jsonb_build_object('value', current_summary.non_business_onetime_revenue, 'previous', previous_summary.non_business_onetime_revenue),
      'average_customer_spend', jsonb_build_object('value', case when current_summary.active_customers > 0 then current_summary.total_revenue / current_summary.active_customers else 0 end, 'previous', case when previous_summary.active_customers > 0 then previous_summary.total_revenue / previous_summary.active_customers else 0 end),
      'average_revenue_per_job', jsonb_build_object('value', case when current_summary.completed_jobs > 0 then current_summary.total_revenue / current_summary.completed_jobs else 0 end, 'previous', case when previous_summary.completed_jobs > 0 then previous_summary.total_revenue / previous_summary.completed_jobs else 0 end),
      'chart_series', revenue_series.rows,
      'top_customers_by_filter', revenue_top_customers.rows,
      'non_business_top_customers_by_filter', non_business_revenue_top_customers.rows
    ),
    'jobs', jsonb_build_object(
      'total_jobs', jsonb_build_object('value', current_summary.total_jobs, 'previous', previous_summary.total_jobs),
      'average_jobs_per_day', jsonb_build_object('value', current_summary.completed_jobs / v_days, 'previous', previous_summary.completed_jobs / v_days),
      'hours_worked', jsonb_build_object('value', current_summary.hours_worked, 'previous', previous_summary.hours_worked),
      'completed_jobs', jsonb_build_object('value', current_summary.completed_jobs, 'previous', previous_summary.completed_jobs),
      'most_frequent_duration', coalesce(duration_mode.row, jsonb_build_object('hours', null, 'label', 'No completed jobs', 'count', 0))
    )
  )
  into v_payload
  from current_summary, previous_summary, top_customers, revenue_top_customers, non_business_revenue_top_customers, revenue_series, duration_mode;

  return v_payload;
end;
$$;

grant execute on function public.get_dashboard_overview(timestamp with time zone, timestamp with time zone, text, boolean) to authenticated;
