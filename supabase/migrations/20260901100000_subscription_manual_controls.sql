alter table public.profiles
  add column if not exists subscription_manually_paused boolean not null default false,
  add column if not exists subscription_manually_paused_at timestamp with time zone,
  add column if not exists subscription_manually_paused_by uuid;

create table if not exists public.subscription_follow_up_queue (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  state text not null default 'queued' check (state in ('queued', 'dismissed')),
  note text check (note is null or length(note) <= 2000),
  source text not null default 'automatic' check (source in ('automatic', 'manual', 'manual_pause')),
  queued_at timestamp with time zone not null default now(),
  dismissed_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists subscription_follow_up_queue_state_idx
  on public.subscription_follow_up_queue (state, queued_at desc);

alter table public.subscription_follow_up_queue enable row level security;
revoke all on table public.subscription_follow_up_queue from anon, authenticated;

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

  insert into public.subscription_follow_up_queue (client_id, state, source)
  select profiles.id, 'queued', 'automatic'
  from public.profiles profiles
  where profiles.is_subscriber = true
    and coalesce(profiles.subscription_status, 'unbooked') in ('unbooked', 'paused')
    and not exists (
      select 1 from public.subscription_follow_up_queue queue
      where queue.client_id = profiles.id
    );
end;
$$;

create or replace function public.get_subscription_follow_up_queue()
returns table (
  client_id uuid,
  client_name text,
  phone text,
  plan_type text,
  subscription_days_per_week integer,
  status public.subscription_status,
  last_clean_date timestamp with time zone,
  days_since_last_clean integer,
  note text,
  source text,
  queued_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;

  perform public.sync_subscription_follow_up_queue();

  return query
  select
    profiles.id,
    coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client'),
    coalesce(profiles.phone::text, ''),
    profiles.subscription_plan_type,
    profiles.subscription_days_per_week,
    coalesce(profiles.subscription_status, 'unbooked'),
    profiles.subscription_last_clean_date,
    case when profiles.subscription_last_clean_date is null then null
      else floor(extract(epoch from (now() - profiles.subscription_last_clean_date)) / 86400)::integer end,
    queue.note,
    queue.source,
    queue.queued_at
  from public.subscription_follow_up_queue queue
  join public.profiles profiles on profiles.id = queue.client_id
  where queue.state = 'queued'
    and profiles.is_subscriber = true
  order by queue.queued_at desc, profiles.id;
end;
$$;

create or replace function public.add_subscription_to_follow_up_queue(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  if not exists (select 1 from public.profiles where id = p_client_id and is_subscriber = true) then
    raise exception 'Subscriber profile not found.';
  end if;

  insert into public.subscription_follow_up_queue (client_id, state, source, queued_at, dismissed_at, created_by, updated_by)
  values (p_client_id, 'queued', 'manual', now(), null, auth.uid(), auth.uid())
  on conflict (client_id) do update set
    state = 'queued', source = 'manual', queued_at = now(), dismissed_at = null,
    updated_by = auth.uid(), updated_at = now();
end;
$$;

create or replace function public.remove_subscription_from_follow_up_queue(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.subscription_follow_up_queue
  set state = 'dismissed', dismissed_at = now(), updated_by = auth.uid(), updated_at = now()
  where client_id = p_client_id;
end;
$$;

create or replace function public.update_subscription_follow_up_note(p_client_id uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_note text;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if length(coalesce(v_note, '')) > 2000 then raise exception 'Follow-up notes must be 2000 characters or fewer.'; end if;

  update public.subscription_follow_up_queue
  set note = v_note, updated_by = auth.uid(), updated_at = now()
  where client_id = p_client_id and state = 'queued';
  if not found then raise exception 'Subscriber is not in the follow-up queue.'; end if;
  return v_note;
end;
$$;

create or replace function public.pause_subscription(p_client_id uuid)
returns public.subscription_status
language plpgsql
security definer
set search_path = public
as $$
declare v_status public.subscription_status;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.profiles
  set subscription_status = 'paused', subscription_manually_paused = true,
      subscription_manually_paused_at = now(), subscription_manually_paused_by = auth.uid(),
      subscription_status_updated_at = now(), updated_at = now()
  where id = p_client_id and is_subscriber = true
  returning subscription_status into v_status;
  if v_status is null then raise exception 'Subscriber profile not found.'; end if;

  insert into public.subscription_follow_up_queue (client_id, state, source, created_by, updated_by)
  values (p_client_id, 'queued', 'manual_pause', auth.uid(), auth.uid())
  on conflict (client_id) do nothing;
  return v_status;
end;
$$;

create or replace function public.resume_subscription(p_client_id uuid)
returns public.subscription_status
language plpgsql
security definer
set search_path = public
as $$
declare v_status public.subscription_status;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.profiles
  set subscription_status = 'active', subscription_manually_paused = false,
      subscription_manually_paused_at = null, subscription_manually_paused_by = null,
      subscription_status_updated_at = now(), updated_at = now()
  where id = p_client_id and is_subscriber = true
  returning subscription_status into v_status;
  if v_status is null then raise exception 'Subscriber profile not found.'; end if;

  update public.subscription_follow_up_queue
  set state = 'dismissed', dismissed_at = now(), updated_by = auth.uid(), updated_at = now()
  where client_id = p_client_id and state = 'queued';
  return v_status;
end;
$$;

create or replace function public.activate_subscription(p_client_id uuid)
returns public.subscription_status
language plpgsql
security definer
set search_path = public
as $$
declare v_status public.subscription_status;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.profiles
  set subscription_status = 'active', subscription_manually_paused = false,
      subscription_manually_paused_at = null, subscription_manually_paused_by = null,
      subscription_status_updated_at = now(), updated_at = now()
  where id = p_client_id and is_subscriber = true
  returning subscription_status into v_status;
  if v_status is null then raise exception 'Subscriber profile not found.'; end if;

  update public.subscription_follow_up_queue
  set state = 'dismissed', dismissed_at = now(), updated_by = auth.uid(), updated_at = now()
  where client_id = p_client_id and state = 'queued';
  return v_status;
end;
$$;

create or replace function public.refresh_single_subscription_health(p_client_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles%rowtype; v_week_start date; v_expected integer; v_completed integer;
  v_last_clean timestamptz; v_has_upcoming_job boolean; v_two_skips boolean;
  v_next_status public.subscription_status; v_week_offset integer;
begin
  select * into v_profile from public.profiles where id = p_client_id and is_subscriber = true for update;
  if not found then return; end if;
  v_expected := case when v_profile.subscription_plan_type = 'Custom' then v_profile.subscription_days_per_week when v_profile.subscription_plan_type = 'Twice Weekly' then 2 else 1 end;
  for v_week_offset in 0..3 loop
    v_week_start := date_trunc('week', current_date)::date - (v_week_offset * 7);
    if v_week_start < date_trunc('week', v_profile.subscription_started_at)::date then continue; end if;
    select count(*)::integer into v_completed from public.jobs jobs join public.purchases purchases on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    where purchases.user_id = p_client_id and purchases.is_subscription = true and lower(coalesce(jobs.status, '')) = 'completed'
      and jobs.preferred_date >= v_week_start::timestamp and jobs.preferred_date < (v_week_start + 7)::timestamp;
    insert into public.subscription_history_logs(client_id, week_start_date, fulfillment_status)
    values (p_client_id, v_week_start, case when v_completed >= v_expected then 'completed'::public.subscription_fulfillment_status when v_week_start = date_trunc('week', current_date)::date or v_completed > 0 then 'unbooked'::public.subscription_fulfillment_status else 'skipped'::public.subscription_fulfillment_status end)
    on conflict(client_id, week_start_date) do update set fulfillment_status = excluded.fulfillment_status, updated_at = now();
  end loop;
  select max(jobs.preferred_date) into v_last_clean from public.jobs jobs join public.purchases purchases on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
  where purchases.user_id = p_client_id and purchases.is_subscription = true and lower(coalesce(jobs.status, '')) = 'completed';
  select exists(select 1 from public.jobs jobs join public.purchases purchases on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    where purchases.user_id = p_client_id and purchases.is_subscription = true and jobs.preferred_date >= now() and jobs.preferred_date < now() + interval '7 days'
      and lower(coalesce(jobs.status, '')) not in ('completed','cancelled','failed')) into v_has_upcoming_job;
  select count(*) = 2 and bool_and(recent.fulfillment_status = 'skipped') into v_two_skips from (
    select fulfillment_status from public.subscription_history_logs where client_id = p_client_id and week_start_date < date_trunc('week', current_date)::date order by week_start_date desc limit 2
  ) recent;
  v_next_status := coalesce(v_profile.subscription_status, 'unbooked');
  if coalesce(v_profile.subscription_manually_paused, false) then
    v_next_status := 'paused';
  elsif v_next_status <> 'expiring' then
    if coalesce(v_two_skips, false) then v_next_status := 'paused'; elsif v_has_upcoming_job then v_next_status := 'active'; else v_next_status := 'unbooked'; end if;
  end if;
  update public.profiles set subscription_last_clean_date = v_last_clean, subscription_status = v_next_status,
    subscription_status_updated_at = case when subscription_status is distinct from v_next_status then now() else subscription_status_updated_at end, updated_at = now()
  where id = p_client_id;
end;
$$;

drop function if exists public.get_subscription_dashboard();
create function public.get_subscription_dashboard()
returns table(
  client_id uuid, client_name text, phone text, plan_type text, subscription_days_per_week integer,
  hourly_rate numeric, status public.subscription_status, manually_paused boolean,
  last_clean_date timestamp with time zone, subscription_started_at timestamp with time zone,
  latest_subscription_purchase_ref_id text, payment_retention_score numeric,
  service_fulfillment_score numeric, payment_history jsonb, service_history jsonb
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  return query
  select pr.id,
    coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.email, 'Unnamed Client'),
    coalesce(pr.phone::text, ''), pr.subscription_plan_type, pr.subscription_days_per_week,
    case when coalesce(li.hours, 0) > 0 then round(coalesce(li.paid_amount, 0) / li.hours, 3) else 0 end,
    coalesce(pr.subscription_status, 'unbooked'), coalesce(pr.subscription_manually_paused, false),
    pr.subscription_last_clean_date, pr.subscription_started_at, li.purchase_ref_id,
    coalesce(pm.score, 0), coalesce(ls.service_score, 0), coalesce(pm.history, '[]'::jsonb), coalesce(ls.service_history, '[]'::jsonb)
  from public.profiles pr
  left join lateral (
    select p.purchase_ref_id::text, p.paid_amount, p.hours from public.purchases p
    where p.user_id = pr.id and p.is_subscription = true
    order by p.created_at desc, p.purchase_ref_id desc limit 1
  ) li on true
  left join lateral (
    select round(100 * count(*) filter (where periods.state = 'paid')::numeric / greatest(1, count(*)), 1) as score,
      jsonb_agg(jsonb_build_object('period_start', periods.period_start, 'status', periods.state, 'purchase_ref_id', periods.purchase_ref_id) order by periods.period_start) as history
    from (
      select months.period_start,
        case
          when bool_or(lower(coalesce(p.status, '')) in ('paid', 'completed', 'confirmed')) then 'paid'
          when bool_or(lower(coalesce(p.status, '')) = 'partially paid') then 'partial'
          when count(p.purchase_ref_id) > 0 and bool_and(lower(coalesce(p.status, '')) in ('failed', 'cancelled', 'refunded')) then 'failed'
          when count(p.purchase_ref_id) > 0 then 'pending'
          when months.period_start = date_trunc('month', current_date)::date then 'pending'
          else 'missed' end as state,
        coalesce(
          (array_agg(p.purchase_ref_id::text order by p.created_at desc) filter (where lower(coalesce(p.status, '')) in ('paid', 'completed', 'confirmed')))[1],
          (array_agg(p.purchase_ref_id::text order by p.created_at desc) filter (where p.purchase_ref_id is not null))[1]
        ) as purchase_ref_id
      from (select generate_series(date_trunc('month', current_date) - interval '3 months', date_trunc('month', current_date), interval '1 month')::date as period_start) months
      left join public.purchases p on p.user_id = pr.id and p.is_subscription = true
        and p.created_at >= months.period_start::timestamp and p.created_at < (months.period_start + interval '1 month')
      where months.period_start >= date_trunc('month', coalesce(pr.subscription_started_at, pr.created_at, now()))::date
      group by months.period_start
    ) periods
  ) pm on true
  left join lateral public.get_subscription_purchase_service(li.purchase_ref_id) ls on true
  where pr.is_subscriber = true
  order by pr.subscription_started_at desc nulls last, pr.id;
end;
$$;

revoke execute on function public.sync_subscription_follow_up_queue() from public, anon;
revoke execute on function public.get_subscription_follow_up_queue() from public, anon;
revoke execute on function public.add_subscription_to_follow_up_queue(uuid) from public, anon;
revoke execute on function public.remove_subscription_from_follow_up_queue(uuid) from public, anon;
revoke execute on function public.update_subscription_follow_up_note(uuid, text) from public, anon;
revoke execute on function public.pause_subscription(uuid) from public, anon;
revoke execute on function public.resume_subscription(uuid) from public, anon;
revoke execute on function public.activate_subscription(uuid) from public, anon;
revoke execute on function public.get_subscription_dashboard() from public, anon;

grant execute on function public.get_subscription_follow_up_queue() to authenticated;
grant execute on function public.add_subscription_to_follow_up_queue(uuid) to authenticated;
grant execute on function public.remove_subscription_from_follow_up_queue(uuid) to authenticated;
grant execute on function public.update_subscription_follow_up_note(uuid, text) to authenticated;
grant execute on function public.pause_subscription(uuid) to authenticated;
grant execute on function public.resume_subscription(uuid) to authenticated;
grant execute on function public.activate_subscription(uuid) to authenticated;
grant execute on function public.get_subscription_dashboard() to authenticated;
