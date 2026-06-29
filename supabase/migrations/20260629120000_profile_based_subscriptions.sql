set lock_timeout = '10s';

alter table public.profiles
  add column if not exists is_subscriber boolean not null default false,
  add column if not exists subscription_plan_type text,
  add column if not exists subscription_status public.subscription_status,
  add column if not exists subscription_started_at timestamp with time zone,
  add column if not exists subscription_last_clean_date timestamp with time zone,
  add column if not exists subscription_status_updated_at timestamp with time zone;

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_type_check;
alter table public.profiles
  add constraint profiles_subscription_plan_type_check
  check (
    subscription_plan_type is null
    or subscription_plan_type in ('Weekly', 'Twice Weekly')
  );

do $$
begin
  if exists (
    select 1
    from public.purchases
    where is_subscription = true
      and user_id is null
  ) then
    raise exception 'A subscription invoice is not linked to a registered customer. Migration stopped before modifying subscription ownership.';
  end if;
end $$;

alter table public.purchases
  drop constraint if exists purchases_subscription_plan_type_check;

update public.purchases
set subscription_plan_type = case
  when subscription_plan_type in ('Bi-Weekly', 'Biweekly') then 'Twice Weekly'
  else subscription_plan_type
end
where is_subscription = true;

alter table public.purchases
  add constraint purchases_subscription_plan_type_check
  check (
    subscription_plan_type is null
    or subscription_plan_type in ('Weekly', 'Twice Weekly')
  );

with subscriber_rollup as (
  select
    purchases.user_id,
    min(purchases.created_at) as started_at
  from public.purchases purchases
  where purchases.is_subscription = true
  group by purchases.user_id
), latest_invoice as (
  select distinct on (purchases.user_id)
    purchases.user_id,
    coalesce(purchases.subscription_plan_type, 'Weekly') as plan_type,
    coalesce(purchases.subscription_status, 'unbooked') as status,
    purchases.subscription_last_clean_date as last_clean_date,
    purchases.subscription_status_updated_at as status_updated_at
  from public.purchases purchases
  where purchases.is_subscription = true
  order by purchases.user_id, purchases.created_at desc, purchases.purchase_ref_id desc
)
update public.profiles profiles
set is_subscriber = true,
    subscription_plan_type = latest_invoice.plan_type,
    subscription_status = latest_invoice.status,
    subscription_started_at = subscriber_rollup.started_at,
    subscription_last_clean_date = latest_invoice.last_clean_date,
    subscription_status_updated_at = coalesce(latest_invoice.status_updated_at, now()),
    updated_at = now()
from subscriber_rollup
join latest_invoice on latest_invoice.user_id = subscriber_rollup.user_id
where profiles.id = subscriber_rollup.user_id;

alter table public.subscription_history_logs
  add column if not exists client_id uuid;

update public.subscription_history_logs history
set client_id = purchases.user_id
from public.purchases purchases
where purchases.purchase_ref_id::text = history.purchase_ref_id
  and history.client_id is null;

alter table public.subscription_follow_up_logs
  add column if not exists client_id uuid;

update public.subscription_follow_up_logs follow_ups
set client_id = purchases.user_id
from public.purchases purchases
where purchases.purchase_ref_id::text = follow_ups.purchase_ref_id
  and follow_ups.client_id is null;

do $$
begin
  if exists (select 1 from public.subscription_history_logs where client_id is null)
     or exists (select 1 from public.subscription_follow_up_logs where client_id is null) then
    raise exception 'Subscription history or follow-up records cannot be mapped to a customer profile. Migration stopped to preserve data.';
  end if;
end $$;

with ranked_history as (
  select
    id,
    row_number() over (
      partition by client_id, week_start_date
      order by case fulfillment_status
        when 'completed' then 1
        when 'skipped' then 2
        else 3
      end, created_at desc
    ) as row_number
  from public.subscription_history_logs
)
delete from public.subscription_history_logs history
using ranked_history
where history.id = ranked_history.id
  and ranked_history.row_number > 1;

alter table public.subscription_history_logs
  drop constraint if exists subscription_history_logs_purchase_ref_id_fkey,
  drop constraint if exists subscription_history_logs_purchase_week_key,
  drop column if exists purchase_ref_id,
  alter column client_id set not null;

alter table public.subscription_follow_up_logs
  drop constraint if exists subscription_follow_up_logs_purchase_ref_id_fkey,
  drop column if exists purchase_ref_id,
  alter column client_id set not null;

alter table public.subscription_history_logs
  add constraint subscription_history_logs_client_id_fkey
  foreign key (client_id) references public.profiles(id) on delete cascade,
  add constraint subscription_history_logs_client_week_key
  unique (client_id, week_start_date);

alter table public.subscription_follow_up_logs
  add constraint subscription_follow_up_logs_client_id_fkey
  foreign key (client_id) references public.profiles(id) on delete cascade;

drop index if exists public.subscription_history_recent_idx;
drop index if exists public.subscription_follow_up_recent_idx;
drop index if exists public.purchases_subscription_status_idx;
create index subscription_history_recent_idx
  on public.subscription_history_logs (client_id, week_start_date desc);
create index subscription_follow_up_recent_idx
  on public.subscription_follow_up_logs (client_id, created_at desc);
create index if not exists profiles_subscription_status_idx
  on public.profiles (subscription_status, subscription_last_clean_date)
  where is_subscriber = true;
create index if not exists purchases_subscription_client_idx
  on public.purchases (user_id, created_at desc)
  where is_subscription = true;

drop trigger if exists normalize_purchase_subscription_fields on public.purchases;
drop trigger if exists refresh_health_after_purchase_subscription_write on public.purchases;
drop trigger if exists refresh_health_after_subscription_history_write on public.subscription_history_logs;
drop trigger if exists refresh_subscription_health_after_job_write on public.jobs;

drop function if exists public.get_subscription_dashboard();
drop function if exists public.get_subscription_churn_risk();
drop function if exists public.log_subscription_follow_up(text, text);
drop function if exists public.activate_subscription(text);
drop function if exists public.refresh_subscription_health_for_dashboard();
drop function if exists public.refresh_health_after_purchase_subscription_write();
drop function if exists public.refresh_health_after_history_write();
drop function if exists public.refresh_subscription_health_after_job_write();
drop function if exists public.refresh_subscription_health();
drop function if exists public.refresh_single_subscription_health(text);
drop function if exists public.normalize_purchase_subscription_fields();

alter table public.purchases
  drop column if exists subscription_status,
  drop column if exists subscription_last_clean_date,
  drop column if exists subscription_status_updated_at;

create or replace function public.normalize_profile_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_subscriber then
    if new.subscription_plan_type is null then
      raise exception 'A subscription frequency is required.';
    end if;
    new.subscription_status := coalesce(new.subscription_status, 'unbooked');
    new.subscription_started_at := coalesce(new.subscription_started_at, now());
    new.subscription_status_updated_at := coalesce(new.subscription_status_updated_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_profile_subscription_fields on public.profiles;
create trigger normalize_profile_subscription_fields
before insert or update of is_subscriber, subscription_plan_type, subscription_status
on public.profiles
for each row execute function public.normalize_profile_subscription_fields();

create or replace function public.validate_subscription_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_subscription then
    if new.user_id is null then
      raise exception 'Subscription invoices require a registered customer account.';
    end if;
    if new.subscription_plan_type is null then
      raise exception 'Subscription invoices require a frequency.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_subscription_invoice on public.purchases;
create trigger validate_subscription_invoice
before insert or update of is_subscription, subscription_plan_type, user_id
on public.purchases
for each row execute function public.validate_subscription_invoice();

create or replace function public.sync_profile_from_subscription_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enroll boolean;
begin
  if not new.is_subscription then return new; end if;

  if tg_op = 'INSERT' then
    v_enroll := true;
  else
    v_enroll := not coalesce(old.is_subscription, false)
      or old.user_id is distinct from new.user_id;
  end if;

  update public.profiles
  set is_subscriber = case when v_enroll then true else is_subscriber end,
      subscription_plan_type = case
        when v_enroll or is_subscriber then new.subscription_plan_type
        else subscription_plan_type
      end,
      subscription_status = case
        when v_enroll then coalesce(subscription_status, 'unbooked')
        else subscription_status
      end,
      subscription_started_at = case
        when v_enroll then least(coalesce(subscription_started_at, new.created_at, now()), coalesce(new.created_at, now()))
        else subscription_started_at
      end,
      subscription_status_updated_at = case
        when v_enroll then coalesce(subscription_status_updated_at, now())
        else subscription_status_updated_at
      end,
      updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists sync_profile_from_subscription_invoice on public.purchases;
create trigger sync_profile_from_subscription_invoice
after insert or update of is_subscription, subscription_plan_type, user_id
on public.purchases
for each row execute function public.sync_profile_from_subscription_invoice();

create or replace function public.refresh_single_subscription_health(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_week_start date;
  v_expected integer;
  v_completed integer;
  v_offset integer;
  v_last_clean timestamp with time zone;
  v_has_upcoming_job boolean;
  v_two_skips boolean;
  v_next_status public.subscription_status;
begin
  select * into v_profile
  from public.profiles
  where id = p_client_id and is_subscriber = true
  for update;

  if not found then return; end if;
  v_expected := case when v_profile.subscription_plan_type = 'Twice Weekly' then 2 else 1 end;

  for v_offset in 0..3 loop
    v_week_start := (date_trunc('week', current_date)::date - (v_offset * 7));
    if v_week_start < date_trunc('week', v_profile.subscription_started_at)::date then
      continue;
    end if;

    select count(*)::integer into v_completed
    from public.jobs jobs
    join public.purchases purchases
      on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    where purchases.user_id = p_client_id
      and purchases.is_subscription = true
      and lower(coalesce(jobs.status, '')) = 'completed'
      and jobs.preferred_date >= v_week_start::timestamp
      and jobs.preferred_date < (v_week_start + 7)::timestamp;

    insert into public.subscription_history_logs (client_id, week_start_date, fulfillment_status)
    values (
      p_client_id,
      v_week_start,
      case
        when v_completed >= v_expected then 'completed'::public.subscription_fulfillment_status
        when v_week_start = date_trunc('week', current_date)::date or v_completed > 0
          then 'unbooked'::public.subscription_fulfillment_status
        else 'skipped'::public.subscription_fulfillment_status
      end
    )
    on conflict (client_id, week_start_date) do update
    set fulfillment_status = excluded.fulfillment_status,
        updated_at = now();
  end loop;

  select max(jobs.preferred_date) into v_last_clean
  from public.jobs jobs
  join public.purchases purchases
    on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
  where purchases.user_id = p_client_id
    and purchases.is_subscription = true
    and lower(coalesce(jobs.status, '')) = 'completed';

  select exists (
    select 1
    from public.jobs jobs
    join public.purchases purchases
      on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
    where purchases.user_id = p_client_id
      and purchases.is_subscription = true
      and jobs.preferred_date >= now()
      and jobs.preferred_date < now() + interval '7 days'
      and lower(coalesce(jobs.status, '')) not in ('completed', 'cancelled', 'failed')
  ) into v_has_upcoming_job;

  select count(*) = 2 and bool_and(recent.fulfillment_status = 'skipped') into v_two_skips
  from (
    select fulfillment_status
    from public.subscription_history_logs
    where client_id = p_client_id
      and week_start_date < date_trunc('week', current_date)::date
    order by week_start_date desc
    limit 2
  ) recent;

  v_next_status := coalesce(v_profile.subscription_status, 'unbooked');
  if v_next_status <> 'expiring' then
    if coalesce(v_two_skips, false) then v_next_status := 'paused';
    elsif v_has_upcoming_job then v_next_status := 'active';
    else v_next_status := 'unbooked';
    end if;
  end if;

  update public.profiles
  set subscription_last_clean_date = v_last_clean,
      subscription_status = v_next_status,
      subscription_status_updated_at = case
        when subscription_status is distinct from v_next_status then now()
        else subscription_status_updated_at
      end,
      updated_at = now()
  where id = p_client_id;
end;
$$;

create or replace function public.refresh_subscription_health()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_count integer := 0;
begin
  for v_profile in select id from public.profiles where is_subscriber = true loop
    perform public.refresh_single_subscription_health(v_profile.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.refresh_subscription_health_after_job_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_old_client_id uuid;
begin
  select user_id into v_client_id
  from public.purchases
  where purchase_ref_id::text = case when tg_op = 'DELETE' then old.purchase_ref_id::text else new.purchase_ref_id::text end
    and is_subscription = true;
  if v_client_id is not null then perform public.refresh_single_subscription_health(v_client_id); end if;

  if tg_op = 'UPDATE' and old.purchase_ref_id::text is distinct from new.purchase_ref_id::text then
    select user_id into v_old_client_id
    from public.purchases
    where purchase_ref_id::text = old.purchase_ref_id::text and is_subscription = true;
    if v_old_client_id is not null and v_old_client_id is distinct from v_client_id then
      perform public.refresh_single_subscription_health(v_old_client_id);
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger refresh_subscription_health_after_job_write
after insert or delete or update of purchase_ref_id, preferred_date, status on public.jobs
for each row execute function public.refresh_subscription_health_after_job_write();

create or replace function public.refresh_health_after_profile_subscription_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_subscriber then perform public.refresh_single_subscription_health(new.id); end if;
  return new;
end;
$$;

drop trigger if exists refresh_health_after_profile_subscription_write on public.profiles;
create trigger refresh_health_after_profile_subscription_write
after insert or update of is_subscriber, subscription_plan_type on public.profiles
for each row execute function public.refresh_health_after_profile_subscription_write();

create or replace function public.refresh_subscription_health_for_dashboard()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;
  return public.refresh_subscription_health();
end;
$$;

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
    select purchases.purchase_ref_id::text, purchases.paid_amount, purchases.hours
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
      round(100 * sum(least(periods.completed_count, periods.expected_count))::numeric
        / greatest(1, sum(periods.expected_count)), 1) as score,
      jsonb_agg(jsonb_build_object(
        'period_start', periods.period_start,
        'status', periods.state,
        'completed_count', periods.completed_count,
        'expected_count', periods.expected_count
      ) order by periods.period_start) as history
    from (
      select
        weeks.period_start,
        count(jobs.job_ref_id)::integer as completed_count,
        case when profiles.subscription_plan_type = 'Twice Weekly' then 2 else 1 end as expected_count,
        case
          when count(jobs.job_ref_id) >= case when profiles.subscription_plan_type = 'Twice Weekly' then 2 else 1 end then 'completed'
          when weeks.period_start = date_trunc('week', current_date)::date or count(jobs.job_ref_id) > 0 then 'partial'
          else 'missed'
        end as state
      from (
        select generate_series(
          date_trunc('week', current_date) - interval '3 weeks',
          date_trunc('week', current_date),
          interval '1 week'
        )::date as period_start
      ) weeks
      left join public.purchases purchases
        on purchases.user_id = profiles.id and purchases.is_subscription = true
      left join public.jobs jobs
        on jobs.purchase_ref_id::text = purchases.purchase_ref_id::text
       and lower(coalesce(jobs.status, '')) = 'completed'
       and jobs.preferred_date >= weeks.period_start::timestamp
       and jobs.preferred_date < (weeks.period_start + interval '1 week')
      where weeks.period_start >= date_trunc('week', profiles.subscription_started_at)::date
      group by weeks.period_start
    ) periods
  ) service_metrics on true
  where profiles.is_subscriber = true
  order by profiles.subscription_started_at desc, profiles.id;
end;
$$;

create or replace function public.get_subscription_churn_risk()
returns table (
  client_id uuid,
  client_name text,
  phone text,
  plan_type text,
  status public.subscription_status,
  last_clean_date timestamp with time zone,
  days_since_last_clean integer
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
    coalesce(profiles.subscription_status, 'unbooked'),
    profiles.subscription_last_clean_date,
    case when profiles.subscription_last_clean_date is null then null
      else floor(extract(epoch from (now() - profiles.subscription_last_clean_date)) / 86400)::integer end
  from public.profiles profiles
  where profiles.is_subscriber = true
    and coalesce(profiles.subscription_status, 'unbooked') in ('unbooked', 'paused')
  order by profiles.subscription_last_clean_date asc nulls first;
end;
$$;

create or replace function public.log_subscription_follow_up(
  p_client_id uuid,
  p_channel text default 'whatsapp'
)
returns table (follow_up_id uuid, clean_phone text, whatsapp_message text, client_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
  v_message text;
  v_log_id uuid;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  select
    coalesce(nullif(trim(concat_ws(' ', first_name, last_name)), ''), email, 'there'),
    regexp_replace(coalesce(phone::text, ''), '[^0-9]', '', 'g')
  into v_name, v_phone
  from public.profiles where id = p_client_id and is_subscriber = true;
  if not found then raise exception 'Subscriber profile not found.'; end if;

  v_message := format('Hi %s, this is ReadyNest. We noticed your next cleaning is not booked yet. Would you like us to help schedule it?', v_name);
  insert into public.subscription_follow_up_logs (client_id, initiated_by, channel, message)
  values (p_client_id, auth.uid(), p_channel, v_message)
  returning id into v_log_id;
  return query select v_log_id, v_phone, v_message, v_name;
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
  set subscription_status = 'active', subscription_status_updated_at = now(), updated_at = now()
  where id = p_client_id and is_subscriber = true
  returning subscription_status into v_status;
  if v_status is null then raise exception 'Subscriber profile not found.'; end if;
  return v_status;
end;
$$;

revoke execute on function public.get_subscription_dashboard() from public, anon;
revoke execute on function public.get_subscription_churn_risk() from public, anon;
revoke execute on function public.log_subscription_follow_up(uuid, text) from public, anon;
revoke execute on function public.activate_subscription(uuid) from public, anon;
revoke execute on function public.refresh_subscription_health_for_dashboard() from public, anon;
revoke execute on function public.refresh_subscription_health() from public, anon, authenticated;
grant execute on function public.get_subscription_dashboard() to authenticated;
grant execute on function public.get_subscription_churn_risk() to authenticated;
grant execute on function public.log_subscription_follow_up(uuid, text) to authenticated;
grant execute on function public.activate_subscription(uuid) to authenticated;
grant execute on function public.refresh_subscription_health_for_dashboard() to authenticated;
grant execute on function public.refresh_subscription_health() to service_role;

select public.refresh_subscription_health();
