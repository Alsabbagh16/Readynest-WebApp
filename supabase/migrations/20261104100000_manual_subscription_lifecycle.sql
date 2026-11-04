-- Subscription lifecycle is controlled by explicit purchases and admin actions.
-- Health refreshes may maintain reporting fields, but must not change status.
create or replace function public.refresh_single_subscription_health(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_clean timestamp with time zone;
begin
  select max(jobs.preferred_date)
  into v_last_clean
  from public.jobs jobs
  join public.purchases purchases
    on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
  where purchases.user_id = p_client_id
    and purchases.is_subscription = true
    and lower(coalesce(jobs.status, '')) = 'completed';

  update public.profiles
  set subscription_last_clean_date = v_last_clean,
      updated_at = now()
  where id = p_client_id
    and is_subscriber = true;
end;
$$;

create or replace function public.unbook_subscription(p_client_id uuid)
returns public.subscription_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.subscription_status;
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;

  update public.profiles
  set subscription_status = 'unbooked',
      subscription_manually_paused = false,
      subscription_manually_paused_at = null,
      subscription_manually_paused_by = null,
      subscription_status_updated_at = now(),
      updated_at = now()
  where id = p_client_id
    and is_subscriber = true
  returning subscription_status into v_status;

  if v_status is null then
    raise exception 'Subscriber profile not found.';
  end if;

  return v_status;
end;
$$;

-- Automatic follow-up generation is disabled. Existing automatic cards are
-- hidden so the queue contains manually-created cards only.
update public.subscription_follow_up_queue
set state = 'dismissed',
    dismissed_at = coalesce(dismissed_at, now()),
    updated_at = now()
where source in ('automatic', 'manual_pause')
  and state = 'open';

create or replace function public.sync_subscription_follow_up_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;
end;
$$;

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
  v_linked_jobs integer;
  v_total_slots integer;
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;

  if nullif(trim(coalesce(p_purchase_ref_id, '')), '') is null then
    return;
  end if;

  select
    coalesce(p.subscription_plan_type, profiles.subscription_plan_type, 'Weekly'),
    case
      when coalesce(p.subscription_plan_type, profiles.subscription_plan_type) = 'Custom'
        then coalesce(p.subscription_days_per_week, profiles.subscription_days_per_week)
      else null
    end
  into v_plan_type, v_days
  from public.purchases p
  left join public.profiles profiles on profiles.id = p.user_id
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

  select count(*)::integer
  into v_linked_jobs
  from public.jobs jobs
  where jobs.purchase_ref_id::text = p_purchase_ref_id;

  v_total_slots := greatest(v_expected_jobs, v_linked_jobs);

  return query
  select
    p_purchase_ref_id,
    v_plan_type,
    v_days,
    v_expected_jobs,
    round(
      100 * count(*) filter (
        where slots.slot_number <= v_expected_jobs
          and slots.state = 'completed'
      )::numeric / greatest(1, v_expected_jobs),
      1
    ),
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
      expected.slot_number,
      linked.job_ref_id,
      linked.preferred_date,
      linked.status as job_status,
      case
        when linked.job_ref_id is null then 'empty'
        when lower(coalesce(linked.status, '')) = 'completed' then 'completed'
        when lower(coalesce(linked.status, '')) in ('failed', 'cancelled') then 'missed'
        else 'partial'
      end as state
    from generate_series(1, v_total_slots) expected(slot_number)
    left join lateral (
      select jobs.job_ref_id, jobs.preferred_date, jobs.status
      from public.jobs jobs
      where jobs.purchase_ref_id::text = p_purchase_ref_id
      order by jobs.preferred_date asc nulls last, jobs.created_at, jobs.job_ref_id
      offset (expected.slot_number - 1)
      limit 1
    ) linked on true
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
  manually_paused boolean,
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
    profiles.subscription_days_per_week,
    case when coalesce(latest_invoice.hours, 0) > 0
      then round(coalesce(latest_invoice.paid_amount, 0) / latest_invoice.hours, 3)
      else 0
    end,
    coalesce(profiles.subscription_status, 'unbooked'),
    coalesce(profiles.subscription_manually_paused, false),
    profiles.subscription_last_clean_date,
    profiles.subscription_started_at,
    latest_invoice.purchase_ref_id,
    coalesce(payments.score, 0),
    coalesce(latest_service.service_score, 0),
    coalesce(payments.history, '[]'::jsonb),
    coalesce(latest_service.service_history, '[]'::jsonb)
  from public.profiles profiles
  left join lateral (
    select purchase.purchase_ref_id::text, purchase.paid_amount, purchase.hours
    from public.purchases purchase
    where purchase.user_id = profiles.id
      and purchase.is_subscription = true
    order by purchase.created_at desc, purchase.purchase_ref_id desc
    limit 1
  ) latest_invoice on true
  left join lateral (
    select
      round(
        100 * count(*) filter (where actual.status = 'paid')::numeric / greatest(1, count(*)),
        1
      ) as score,
      jsonb_agg(
        jsonb_build_object(
          'period_start', actual.created_at,
          'status', actual.status,
          'purchase_ref_id', actual.purchase_ref_id
        )
        order by actual.created_at
      ) as history
    from (
      select
        purchase.purchase_ref_id::text as purchase_ref_id,
        purchase.created_at,
        case
          when lower(coalesce(purchase.status, '')) in ('paid', 'completed', 'confirmed') then 'paid'
          when lower(coalesce(purchase.status, '')) = 'partially paid' then 'partial'
          when lower(coalesce(purchase.status, '')) in ('failed', 'cancelled', 'refunded') then 'failed'
          else 'pending'
        end as status
      from public.purchases purchase
      where purchase.user_id = profiles.id
        and purchase.is_subscription = true
      order by purchase.created_at desc, purchase.purchase_ref_id desc
      limit 4
    ) actual
  ) payments on true
  left join lateral public.get_subscription_purchase_service(latest_invoice.purchase_ref_id) latest_service on true
  where profiles.is_subscriber = true
  order by profiles.subscription_started_at desc nulls last, profiles.id;
end;
$$;

revoke execute on function public.unbook_subscription(uuid) from public, anon;
revoke execute on function public.get_subscription_purchase_service(text) from public, anon;
revoke execute on function public.get_subscription_dashboard() from public, anon;

grant execute on function public.unbook_subscription(uuid) to authenticated;
grant execute on function public.get_subscription_purchase_service(text) to authenticated;
grant execute on function public.get_subscription_dashboard() to authenticated;
