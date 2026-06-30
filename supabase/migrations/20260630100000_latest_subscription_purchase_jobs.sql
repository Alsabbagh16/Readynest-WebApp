create or replace function public.get_subscription_dashboard()
returns table (
  client_id uuid,
  client_name text,
  phone text,
  plan_type text,
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
    profiles.id,
    coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client'),
    coalesce(profiles.phone::text, ''),
    profiles.subscription_plan_type,
    case when coalesce(latest_invoice.hours, 0) > 0
      then round(coalesce(latest_invoice.paid_amount, 0) / latest_invoice.hours, 3)
      else 0 end,
    coalesce(profiles.subscription_status, 'unbooked'),
    profiles.subscription_last_clean_date,
    profiles.subscription_started_at,
    latest_invoice.purchase_ref_id,
    coalesce(payment_metrics.score, 0),
    coalesce(service_metrics.score, 0),
    coalesce(payment_metrics.history, '[]'::jsonb),
    coalesce(service_metrics.history, '[]'::jsonb)
  from public.profiles profiles
  left join lateral (
    select
      purchases.purchase_ref_id::text,
      purchases.paid_amount,
      purchases.hours,
      purchases.subscription_plan_type
    from public.purchases purchases
    where purchases.user_id = profiles.id and purchases.is_subscription = true
    order by purchases.created_at desc, purchases.purchase_ref_id desc
    limit 1
  ) latest_invoice on true
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
          when bool_or(lower(coalesce(purchases.status, '')) in ('paid', 'completed', 'confirmed')) then 'paid'
          when count(purchases.purchase_ref_id) > 0
            and bool_and(lower(coalesce(purchases.status, '')) in ('failed', 'cancelled', 'refunded')) then 'failed'
          when count(purchases.purchase_ref_id) > 0 then 'pending'
          when months.period_start = date_trunc('month', current_date)::date then 'pending'
          else 'missed'
        end as state,
        max(purchases.purchase_ref_id::text) filter (
          where lower(coalesce(purchases.status, '')) in ('paid', 'completed', 'confirmed')
        ) as purchase_ref_id
      from (
        select generate_series(
          date_trunc('month', current_date) - interval '3 months',
          date_trunc('month', current_date),
          interval '1 month'
        )::date as period_start
      ) months
      left join public.purchases purchases
        on purchases.user_id = profiles.id
       and purchases.is_subscription = true
       and purchases.created_at >= months.period_start::timestamp
       and purchases.created_at < (months.period_start + interval '1 month')
      where months.period_start >= date_trunc('month', profiles.subscription_started_at)::date
      group by months.period_start
    ) periods
  ) payment_metrics on true
  left join lateral (
    select
      round(
        100 * count(*) filter (where service_slots.state = 'completed')::numeric
        / greatest(1, count(*)),
        1
      ) as score,
      jsonb_agg(jsonb_build_object(
        'slot_number', service_slots.slot_number,
        'status', service_slots.state,
        'job_ref_id', service_slots.job_ref_id,
        'preferred_date', service_slots.preferred_date
      ) order by service_slots.slot_number) as history
    from (
      select
        slots.slot_number,
        slot_job.job_ref_id,
        slot_job.preferred_date,
        case
          when slot_job.job_ref_id is null then 'empty'
          when lower(coalesce(slot_job.status, '')) = 'completed' then 'completed'
          when lower(coalesce(slot_job.status, '')) in ('failed', 'cancelled') then 'missed'
          else 'partial'
        end as state
      from generate_series(
        1,
        case
          when coalesce(latest_invoice.subscription_plan_type, profiles.subscription_plan_type) = 'Twice Weekly' then 8
          else 4
        end
      ) slots(slot_number)
      left join lateral (
        select jobs.job_ref_id, jobs.preferred_date, jobs.status
        from public.jobs jobs
        where jobs.purchase_ref_id::text = latest_invoice.purchase_ref_id
        order by jobs.preferred_date asc nulls last, jobs.created_at asc, jobs.job_ref_id asc
        offset (slots.slot_number - 1)
        limit 1
      ) slot_job on true
    ) service_slots
  ) service_metrics on true
  where profiles.is_subscriber = true
  order by profiles.subscription_started_at desc, profiles.id;
end;
$$;
