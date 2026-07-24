create or replace function public.get_subscription_purchase_service(p_purchase_ref_id text)
returns table(
  purchase_ref_id text,
  plan_type text,
  subscription_days_per_week integer,
  expected_jobs integer,
  service_score numeric,
  service_history jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_type text;
  v_days integer;
  v_expected_jobs integer;
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;

  if nullif(trim(coalesce(p_purchase_ref_id, '')), '') is null then
    return;
  end if;

  select
    coalesce(p.subscription_plan_type, pr.subscription_plan_type, 'Weekly'),
    case
      when coalesce(p.subscription_plan_type, pr.subscription_plan_type) = 'Custom'
        then coalesce(p.subscription_days_per_week, pr.subscription_days_per_week)
      else null
    end
  into v_plan_type, v_days
  from public.purchases p
  left join public.profiles pr on pr.id = p.user_id
  where p.purchase_ref_id::text = p_purchase_ref_id
    and p.is_subscription = true;

  if not found then
    return;
  end if;

  v_expected_jobs := 4 * case
    when v_plan_type = 'Custom' then greatest(coalesce(v_days, 3), 3)
    when v_plan_type = 'Twice Weekly' then 2
    else 1
  end;

  return query
  select
    p_purchase_ref_id,
    v_plan_type,
    v_days,
    v_expected_jobs,
    round(100 * count(*) filter (where slots.state = 'completed')::numeric / greatest(1, count(*)), 1),
    jsonb_agg(
      jsonb_build_object(
        'slot_number', slots.slot_number,
        'status', slots.state,
        'job_status', slots.job_status,
        'job_ref_id', slots.job_ref_id,
        'preferred_date', slots.preferred_date
      )
      order by slots.slot_number
    )
  from (
    select
      es.slot_number,
      sj.job_ref_id,
      sj.preferred_date,
      sj.status as job_status,
      case
        when sj.job_ref_id is null then 'empty'
        when lower(coalesce(sj.status, '')) = 'completed' then 'completed'
        when lower(coalesce(sj.status, '')) in ('failed', 'cancelled') then 'missed'
        else 'partial'
      end as state
    from generate_series(1, v_expected_jobs) es(slot_number)
    left join lateral (
      select j.job_ref_id, j.preferred_date, j.status
      from public.jobs j
      where j.purchase_ref_id::text = p_purchase_ref_id
      order by j.preferred_date asc nulls last, j.created_at, j.job_ref_id
      offset (es.slot_number - 1)
      limit 1
    ) sj on true
  ) slots;
end;
$$;

create or replace function public.get_subscription_dashboard()
returns table(
  client_id uuid,
  client_name text,
  phone text,
  plan_type text,
  subscription_days_per_week integer,
  hourly_rate numeric,
  status public.subscription_status,
  last_clean_date timestamp with time zone,
  subscription_started_at timestamp with time zone,
  latest_subscription_purchase_ref_id text,
  payment_retention_score numeric,
  service_fulfillment_score numeric,
  payment_history jsonb,
  service_history jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;

  return query
  select
    pr.id,
    coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.email, 'Unnamed Client'),
    coalesce(pr.phone::text, ''),
    pr.subscription_plan_type,
    pr.subscription_days_per_week,
    case when coalesce(li.hours, 0) > 0 then round(coalesce(li.paid_amount, 0) / li.hours, 3) else 0 end,
    coalesce(pr.subscription_status, 'unbooked'),
    pr.subscription_last_clean_date,
    pr.subscription_started_at,
    li.purchase_ref_id,
    coalesce(pm.score, 0),
    coalesce(ls.service_score, 0),
    coalesce(pm.history, '[]'::jsonb),
    coalesce(ls.service_history, '[]'::jsonb)
  from public.profiles pr
  left join lateral (
    select p.purchase_ref_id::text, p.paid_amount, p.hours
    from public.purchases p
    where p.user_id = pr.id
      and p.is_subscription = true
    order by p.created_at desc, p.purchase_ref_id desc
    limit 1
  ) li on true
  left join lateral (
    select
      round(100 * count(*) filter (where periods.state = 'paid')::numeric / greatest(1, count(*)), 1) as score,
      jsonb_agg(jsonb_build_object(
        'period_start', periods.period_start,
        'status', periods.state,
        'purchase_ref_id', periods.purchase_ref_id
      ) order by periods.period_start) as history
    from (
      select
        months.period_start,
        case
          when bool_or(lower(coalesce(p.status, '')) in ('paid', 'completed', 'confirmed')) then 'paid'
          when count(p.purchase_ref_id) > 0 and bool_and(lower(coalesce(p.status, '')) in ('failed', 'cancelled', 'refunded')) then 'failed'
          when count(p.purchase_ref_id) > 0 then 'pending'
          when months.period_start = date_trunc('month', current_date)::date then 'pending'
          else 'missed'
        end as state,
        coalesce(
          (array_agg(p.purchase_ref_id::text order by p.created_at desc) filter (where lower(coalesce(p.status, '')) in ('paid', 'completed', 'confirmed')))[1],
          (array_agg(p.purchase_ref_id::text order by p.created_at desc) filter (where p.purchase_ref_id is not null))[1]
        ) as purchase_ref_id
      from (
        select generate_series(
          date_trunc('month', current_date) - interval '3 months',
          date_trunc('month', current_date),
          interval '1 month'
        )::date as period_start
      ) months
      left join public.purchases p
        on p.user_id = pr.id
       and p.is_subscription = true
       and p.created_at >= months.period_start::timestamp
       and p.created_at < (months.period_start + interval '1 month')
      where months.period_start >= date_trunc('month', coalesce(pr.subscription_started_at, pr.created_at, now()))::date
      group by months.period_start
    ) periods
  ) pm on true
  left join lateral public.get_subscription_purchase_service(li.purchase_ref_id) ls on true
  where pr.is_subscriber = true
  order by pr.subscription_started_at desc nulls last, pr.id;
end;
$$;

revoke execute on function public.get_subscription_purchase_service(text) from public, anon;
revoke execute on function public.get_subscription_dashboard() from public, anon;
grant execute on function public.get_subscription_purchase_service(text) to authenticated;
grant execute on function public.get_subscription_dashboard() to authenticated;
