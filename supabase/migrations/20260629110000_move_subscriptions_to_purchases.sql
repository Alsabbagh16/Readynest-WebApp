set lock_timeout = '10s';

alter table public.purchases
  add column if not exists is_subscription boolean not null default false,
  add column if not exists subscription_plan_type text,
  add column if not exists subscription_status public.subscription_status,
  add column if not exists subscription_last_clean_date timestamp with time zone,
  add column if not exists subscription_status_updated_at timestamp with time zone;

alter table public.purchases
  drop constraint if exists purchases_subscription_plan_type_check;
alter table public.purchases
  add constraint purchases_subscription_plan_type_check
  check (
    subscription_plan_type is null
    or subscription_plan_type in ('Weekly', 'Bi-Weekly')
  );

do $$
begin
  if exists (
    select 1
    from public.subscriptions subscriptions
    left join public.purchases purchases
      on purchases.purchase_ref_id::text = subscriptions.source_purchase_ref_id
    where purchases.purchase_ref_id is null
  ) then
    raise exception 'A legacy subscription has no matching purchase. Migration stopped before modifying subscription data.';
  end if;
end $$;

update public.purchases purchases
set is_subscription = true,
    subscription_plan_type = subscriptions.plan_type,
    subscription_status = subscriptions.status,
    subscription_last_clean_date = subscriptions.last_clean_date,
    subscription_status_updated_at = subscriptions.status_updated_at,
    updated_at = now()
from public.subscriptions subscriptions
where purchases.purchase_ref_id::text = subscriptions.source_purchase_ref_id;

alter table public.subscription_history_logs
  add column if not exists purchase_ref_id text;

update public.subscription_history_logs history
set purchase_ref_id = subscriptions.source_purchase_ref_id
from public.subscriptions subscriptions
where subscriptions.id = history.subscription_id
  and history.purchase_ref_id is null;

alter table public.subscription_follow_up_logs
  add column if not exists purchase_ref_id text;

update public.subscription_follow_up_logs follow_ups
set purchase_ref_id = subscriptions.source_purchase_ref_id
from public.subscriptions subscriptions
where subscriptions.id = follow_ups.subscription_id
  and follow_ups.purchase_ref_id is null;

do $$
begin
  if exists (
    select 1 from public.subscription_history_logs where purchase_ref_id is null
  ) or exists (
    select 1 from public.subscription_follow_up_logs where purchase_ref_id is null
  ) then
    raise exception 'Subscription logs exist without a matching source purchase. Migration stopped to preserve data.';
  end if;
end $$;

alter table public.subscription_history_logs
  drop constraint if exists subscription_history_logs_subscription_id_fkey,
  drop constraint if exists subscription_history_logs_subscription_id_week_start_date_key,
  drop column if exists subscription_id,
  alter column purchase_ref_id set not null;

alter table public.subscription_follow_up_logs
  drop constraint if exists subscription_follow_up_logs_subscription_id_fkey,
  drop column if exists subscription_id,
  alter column purchase_ref_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscription_history_logs_purchase_ref_id_fkey'
  ) then
    alter table public.subscription_history_logs
      add constraint subscription_history_logs_purchase_ref_id_fkey
      foreign key (purchase_ref_id)
      references public.purchases(purchase_ref_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'subscription_follow_up_logs_purchase_ref_id_fkey'
  ) then
    alter table public.subscription_follow_up_logs
      add constraint subscription_follow_up_logs_purchase_ref_id_fkey
      foreign key (purchase_ref_id)
      references public.purchases(purchase_ref_id)
      on delete cascade;
  end if;
end $$;

alter table public.subscription_history_logs
  add constraint subscription_history_logs_purchase_week_key
  unique (purchase_ref_id, week_start_date);

drop index if exists public.subscription_history_recent_idx;
drop index if exists public.subscription_follow_up_recent_idx;
create index subscription_history_recent_idx
  on public.subscription_history_logs (purchase_ref_id, week_start_date desc);
create index subscription_follow_up_recent_idx
  on public.subscription_follow_up_logs (purchase_ref_id, created_at desc);
create index if not exists purchases_subscription_status_idx
  on public.purchases (subscription_status, subscription_last_clean_date)
  where is_subscription = true;

drop trigger if exists sync_subscription_after_purchase_write on public.purchases;
drop trigger if exists refresh_health_after_subscription_history_write on public.subscription_history_logs;
drop trigger if exists refresh_subscription_health_after_job_write on public.jobs;

drop function if exists public.refresh_subscription_health_for_dashboard();
drop function if exists public.get_subscription_dashboard();
drop function if exists public.get_subscription_churn_risk();
drop function if exists public.log_subscription_follow_up(uuid, text);
drop function if exists public.activate_subscription(uuid);
drop function if exists public.refresh_health_after_subscription_write();
drop function if exists public.refresh_health_after_history_write();
drop function if exists public.refresh_subscription_health_after_job_write();
drop function if exists public.refresh_subscription_health();
drop function if exists public.refresh_single_subscription_health(uuid);
drop function if exists public.sync_subscription_from_purchase();

drop table public.subscriptions;

create or replace function public.normalize_purchase_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_subscription then
    new.subscription_plan_type := coalesce(new.subscription_plan_type, 'Weekly');
    new.subscription_status := coalesce(new.subscription_status, 'unbooked');
    new.subscription_status_updated_at := coalesce(new.subscription_status_updated_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_purchase_subscription_fields on public.purchases;
create trigger normalize_purchase_subscription_fields
before insert or update of is_subscription, subscription_plan_type, subscription_status
on public.purchases
for each row execute function public.normalize_purchase_subscription_fields();

create or replace function public.refresh_single_subscription_health(p_purchase_ref_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_last_clean timestamp with time zone;
  v_two_skips boolean;
  v_has_upcoming_job boolean;
  v_next_status public.subscription_status;
begin
  select * into v_purchase
  from public.purchases
  where purchase_ref_id::text = p_purchase_ref_id
    and is_subscription = true
  for update;

  if not found then return; end if;

  select max(jobs.preferred_date)
  into v_last_clean
  from public.jobs jobs
  where jobs.purchase_ref_id::text = p_purchase_ref_id
    and lower(coalesce(jobs.status, '')) = 'completed';

  select count(*) = 2 and bool_and(recent_logs.fulfillment_status = 'skipped')
  into v_two_skips
  from (
    select history.fulfillment_status
    from public.subscription_history_logs history
    where history.purchase_ref_id = p_purchase_ref_id
    order by history.week_start_date desc
    limit 2
  ) recent_logs;

  select exists (
    select 1
    from public.jobs jobs
    where jobs.purchase_ref_id::text = p_purchase_ref_id
      and jobs.preferred_date >= now()
      and jobs.preferred_date < now() + case
        when v_purchase.subscription_plan_type = 'Bi-Weekly' then interval '14 days'
        else interval '7 days'
      end
      and lower(coalesce(jobs.status, '')) not in ('completed', 'cancelled', 'failed')
  ) into v_has_upcoming_job;

  v_next_status := coalesce(v_purchase.subscription_status, 'unbooked');
  if v_next_status <> 'expiring' then
    if coalesce(v_two_skips, false) then
      v_next_status := 'paused';
    elsif v_next_status = 'paused' then
      v_next_status := 'paused';
    elsif not v_has_upcoming_job then
      v_next_status := 'unbooked';
    else
      v_next_status := 'active';
    end if;
  end if;

  update public.purchases
  set subscription_last_clean_date = v_last_clean,
      subscription_status = v_next_status,
      subscription_status_updated_at = case
        when subscription_status is distinct from v_next_status then now()
        else subscription_status_updated_at
      end,
      updated_at = now()
  where purchase_ref_id::text = p_purchase_ref_id;
end;
$$;

create or replace function public.refresh_subscription_health()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase record;
  v_count integer := 0;
begin
  for v_purchase in
    select purchase_ref_id::text as purchase_ref_id
    from public.purchases
    where is_subscription = true
  loop
    perform public.refresh_single_subscription_health(v_purchase.purchase_ref_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.refresh_health_after_history_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_single_subscription_health(old.purchase_ref_id);
    return old;
  end if;

  perform public.refresh_single_subscription_health(new.purchase_ref_id);
  return new;
end;
$$;

create trigger refresh_health_after_subscription_history_write
after insert or update or delete on public.subscription_history_logs
for each row execute function public.refresh_health_after_history_write();

create or replace function public.refresh_subscription_health_after_job_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_ref_id text;
begin
  v_purchase_ref_id := case
    when tg_op = 'DELETE' then old.purchase_ref_id::text
    else new.purchase_ref_id::text
  end;

  if v_purchase_ref_id is not null then
    perform public.refresh_single_subscription_health(v_purchase_ref_id);
  end if;

  if tg_op = 'UPDATE'
     and old.purchase_ref_id::text is distinct from new.purchase_ref_id::text
     and old.purchase_ref_id is not null then
    perform public.refresh_single_subscription_health(old.purchase_ref_id::text);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger refresh_subscription_health_after_job_write
after insert or delete or update of purchase_ref_id, preferred_date, status on public.jobs
for each row execute function public.refresh_subscription_health_after_job_write();

create or replace function public.refresh_health_after_purchase_subscription_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_subscription then
    perform public.refresh_single_subscription_health(new.purchase_ref_id::text);
  end if;
  return new;
end;
$$;

create trigger refresh_health_after_purchase_subscription_write
after insert or update of is_subscription, subscription_plan_type on public.purchases
for each row execute function public.refresh_health_after_purchase_subscription_write();

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
  purchase_ref_id text,
  client_id uuid,
  client_name text,
  phone text,
  plan_type text,
  hourly_rate numeric,
  status public.subscription_status,
  last_clean_date timestamp with time zone,
  created_at timestamp with time zone,
  retention_score numeric,
  history jsonb
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
    purchases.purchase_ref_id::text,
    purchases.user_id,
    coalesce(
      nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''),
      purchases.name,
      'Unnamed Client'
    ),
    coalesce(profiles.phone::text, purchases.user_phone::text, ''),
    coalesce(purchases.subscription_plan_type, 'Weekly'),
    case
      when coalesce(purchases.hours, 0) > 0
        then round(coalesce(purchases.paid_amount, 0) / purchases.hours, 3)
      else 0
    end,
    coalesce(purchases.subscription_status, 'unbooked'),
    purchases.subscription_last_clean_date,
    purchases.created_at,
    least(
      100,
      round(
        100 * (
          select count(*)::numeric
          from public.subscription_history_logs completed_history
          where completed_history.purchase_ref_id = purchases.purchase_ref_id::text
            and completed_history.week_start_date >= current_date - 30
            and completed_history.fulfillment_status = 'completed'
        ) / greatest(
          1,
          case when purchases.subscription_plan_type = 'Bi-Weekly' then 2 else 4 end
        ),
        1
      )
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recent_history.id,
          'week_start_date', recent_history.week_start_date,
          'fulfillment_status', recent_history.fulfillment_status
        ) order by recent_history.week_start_date
      )
      from (
        select history.id, history.week_start_date, history.fulfillment_status
        from public.subscription_history_logs history
        where history.purchase_ref_id = purchases.purchase_ref_id::text
        order by history.week_start_date desc
        limit 4
      ) recent_history
    ), '[]'::jsonb)
  from public.purchases purchases
  left join public.profiles profiles on profiles.id = purchases.user_id
  where purchases.is_subscription = true
  order by purchases.created_at desc;
end;
$$;

create or replace function public.get_subscription_churn_risk()
returns table (
  purchase_ref_id text,
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
    purchases.purchase_ref_id::text,
    purchases.user_id,
    coalesce(
      nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''),
      purchases.name,
      'Unnamed Client'
    ),
    coalesce(profiles.phone::text, purchases.user_phone::text, ''),
    coalesce(purchases.subscription_plan_type, 'Weekly'),
    coalesce(purchases.subscription_status, 'unbooked'),
    purchases.subscription_last_clean_date,
    case
      when purchases.subscription_last_clean_date is null then null
      else floor(extract(epoch from (now() - purchases.subscription_last_clean_date)) / 86400)::integer
    end
  from public.purchases purchases
  left join public.profiles profiles on profiles.id = purchases.user_id
  where purchases.is_subscription = true
    and coalesce(purchases.subscription_status, 'unbooked') in ('unbooked', 'paused')
  order by purchases.subscription_last_clean_date asc nulls first;
end;
$$;

create or replace function public.log_subscription_follow_up(
  p_purchase_ref_id text,
  p_channel text default 'whatsapp'
)
returns table (
  follow_up_id uuid,
  clean_phone text,
  whatsapp_message text,
  client_name text
)
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
  if not public.can_manage_subscriptions() then
    raise exception 'Subscription Management permission required.';
  end if;

  select
    coalesce(
      nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''),
      purchases.name,
      'there'
    ),
    regexp_replace(coalesce(profiles.phone::text, purchases.user_phone::text, ''), '[^0-9]', '', 'g')
  into v_name, v_phone
  from public.purchases purchases
  left join public.profiles profiles on profiles.id = purchases.user_id
  where purchases.purchase_ref_id::text = p_purchase_ref_id
    and purchases.is_subscription = true;

  if not found then raise exception 'Subscription purchase not found.'; end if;

  v_message := format(
    'Hi %s, this is ReadyNest. We noticed your next cleaning is not booked yet. Would you like us to help schedule it?',
    v_name
  );

  insert into public.subscription_follow_up_logs (
    purchase_ref_id,
    initiated_by,
    channel,
    message
  ) values (
    p_purchase_ref_id,
    auth.uid(),
    p_channel,
    v_message
  ) returning id into v_log_id;

  return query select v_log_id, v_phone, v_message, v_name;
end;
$$;

create or replace function public.activate_subscription(p_purchase_ref_id text)
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

  update public.purchases
  set subscription_status = 'active',
      subscription_status_updated_at = now(),
      updated_at = now()
  where purchase_ref_id::text = p_purchase_ref_id
    and is_subscription = true
  returning subscription_status into v_status;

  if v_status is null then raise exception 'Subscription purchase not found.'; end if;
  return v_status;
end;
$$;

revoke execute on function public.get_subscription_dashboard() from public, anon;
revoke execute on function public.get_subscription_churn_risk() from public, anon;
revoke execute on function public.log_subscription_follow_up(text, text) from public, anon;
revoke execute on function public.activate_subscription(text) from public, anon;
revoke execute on function public.refresh_subscription_health_for_dashboard() from public, anon;
revoke execute on function public.refresh_subscription_health() from public, anon, authenticated;

grant execute on function public.get_subscription_dashboard() to authenticated;
grant execute on function public.get_subscription_churn_risk() to authenticated;
grant execute on function public.log_subscription_follow_up(text, text) to authenticated;
grant execute on function public.activate_subscription(text) to authenticated;
grant execute on function public.refresh_subscription_health_for_dashboard() to authenticated;
grant execute on function public.refresh_subscription_health() to service_role;

select public.refresh_subscription_health();
