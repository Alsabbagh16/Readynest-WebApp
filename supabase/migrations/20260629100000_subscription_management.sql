do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('active', 'unbooked', 'paused', 'expiring');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_fulfillment_status') then
    create type public.subscription_fulfillment_status as enum ('completed', 'skipped', 'unbooked');
  end if;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  source_purchase_ref_id text unique,
  plan_type text not null,
  hourly_rate numeric(10, 3) not null default 0 check (hourly_rate >= 0),
  status public.subscription_status not null default 'unbooked',
  last_clean_date timestamp with time zone,
  status_updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check (length(trim(plan_type)) > 0)
);

create table if not exists public.subscription_history_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  week_start_date date not null,
  fulfillment_status public.subscription_fulfillment_status not null default 'unbooked',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (subscription_id, week_start_date)
);

create table if not exists public.subscription_follow_up_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  initiated_by uuid references public.employees(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'phone', 'email')),
  message text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions (status, last_clean_date);
create index if not exists subscriptions_client_idx on public.subscriptions (client_id);
create index if not exists subscription_history_recent_idx
  on public.subscription_history_logs (subscription_id, week_start_date desc);
create index if not exists subscription_follow_up_recent_idx
  on public.subscription_follow_up_logs (subscription_id, created_at desc);

insert into public.ui_permissions (key, description, module)
select
  'tab.subscription_management.view',
  'View and manage subscription retention and follow-up actions',
  'subscriptions'
where not exists (
  select 1 from public.ui_permissions where key = 'tab.subscription_management.view'
);

create or replace function public.can_manage_subscriptions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employees
    where employees.id = auth.uid()
      and employees.role in ('admin', 'superadmin', 'staff')
      and (
        employees.role = 'superadmin'
        or employees.is_superadmin = true
        or not exists (
          select 1 from public.ui_employee_roles employee_roles
          where employee_roles.employee_id = employees.id
        )
        or exists (
          select 1
          from public.ui_employee_roles employee_roles
          join public.ui_role_permissions role_permissions
            on role_permissions.role_id = employee_roles.role_id
          join public.ui_permissions permissions
            on permissions.id = role_permissions.permission_id
          where employee_roles.employee_id = employees.id
            and permissions.key = 'tab.subscription_management.view'
        )
      )
  );
$$;

alter table public.subscriptions enable row level security;
alter table public.subscription_history_logs enable row level security;
alter table public.subscription_follow_up_logs enable row level security;

drop policy if exists "Subscription managers can read subscriptions" on public.subscriptions;
create policy "Subscription managers can read subscriptions"
  on public.subscriptions for select to authenticated
  using (public.can_manage_subscriptions());

drop policy if exists "Subscription managers can update subscriptions" on public.subscriptions;
create policy "Subscription managers can update subscriptions"
  on public.subscriptions for update to authenticated
  using (public.can_manage_subscriptions())
  with check (public.can_manage_subscriptions());

drop policy if exists "Subscription managers can read history" on public.subscription_history_logs;
create policy "Subscription managers can read history"
  on public.subscription_history_logs for select to authenticated
  using (public.can_manage_subscriptions());

drop policy if exists "Subscription managers can manage history" on public.subscription_history_logs;
create policy "Subscription managers can manage history"
  on public.subscription_history_logs for all to authenticated
  using (public.can_manage_subscriptions())
  with check (public.can_manage_subscriptions());

drop policy if exists "Subscription managers can read follow ups" on public.subscription_follow_up_logs;
create policy "Subscription managers can read follow ups"
  on public.subscription_follow_up_logs for select to authenticated
  using (public.can_manage_subscriptions());

create or replace function public.sync_subscription_from_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_type text;
  v_hourly_rate numeric;
begin
  if new.user_id is null or new.product_name is null then
    return new;
  end if;

  if lower(new.product_name) not like '%subscription%'
     and lower(new.product_name) not like '%weekly%'
     and lower(new.product_name) not like '%bi-weekly%'
     and lower(new.product_name) not like '%biweekly%' then
    return new;
  end if;

  v_plan_type := case
    when lower(new.product_name) like '%bi-weekly%'
      or lower(new.product_name) like '%biweekly%' then 'Bi-Weekly'
    else 'Weekly'
  end;
  v_hourly_rate := case
    when coalesce(new.hours, 0) > 0 then coalesce(new.paid_amount, 0) / new.hours
    else 0
  end;

  insert into public.subscriptions (
    client_id,
    source_purchase_ref_id,
    plan_type,
    hourly_rate
  ) values (
    new.user_id,
    new.purchase_ref_id::text,
    v_plan_type,
    v_hourly_rate
  )
  on conflict (source_purchase_ref_id) do update
  set client_id = excluded.client_id,
      plan_type = excluded.plan_type,
      hourly_rate = excluded.hourly_rate,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_subscription_after_purchase_write on public.purchases;
create trigger sync_subscription_after_purchase_write
after insert or update of user_id, product_name, paid_amount, hours on public.purchases
for each row execute function public.sync_subscription_from_purchase();

insert into public.subscriptions (
  client_id,
  source_purchase_ref_id,
  plan_type,
  hourly_rate
)
select
  purchases.user_id,
  purchases.purchase_ref_id::text,
  case
    when lower(purchases.product_name) like '%bi-weekly%'
      or lower(purchases.product_name) like '%biweekly%' then 'Bi-Weekly'
    else 'Weekly'
  end,
  case
    when coalesce(purchases.hours, 0) > 0 then coalesce(purchases.paid_amount, 0) / purchases.hours
    else 0
  end
from public.purchases purchases
where purchases.user_id is not null
  and purchases.product_name is not null
  and (
    lower(purchases.product_name) like '%subscription%'
    or lower(purchases.product_name) like '%weekly%'
    or lower(purchases.product_name) like '%bi-weekly%'
    or lower(purchases.product_name) like '%biweekly%'
  )
on conflict (source_purchase_ref_id) do nothing;

create or replace function public.refresh_single_subscription_health(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_last_clean timestamp with time zone;
  v_two_skips boolean;
  v_has_upcoming_job boolean;
  v_next_status public.subscription_status;
begin
  select * into v_subscription
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then return; end if;

  select max(jobs.preferred_date)
  into v_last_clean
  from public.jobs jobs
  where jobs.user_id = v_subscription.client_id
    and lower(coalesce(jobs.status, '')) = 'completed';

  select count(*) = 2 and bool_and(recent_logs.fulfillment_status = 'skipped')
  into v_two_skips
  from (
    select history.fulfillment_status
    from public.subscription_history_logs history
    where history.subscription_id = p_subscription_id
    order by history.week_start_date desc
    limit 2
  ) recent_logs;

  select exists (
    select 1
    from public.jobs jobs
    where jobs.user_id = v_subscription.client_id
      and jobs.preferred_date >= now()
      and jobs.preferred_date < now() + interval '7 days'
      and lower(coalesce(jobs.status, '')) not in ('completed', 'cancelled', 'failed')
  ) into v_has_upcoming_job;

  v_next_status := v_subscription.status;
  if v_subscription.status <> 'expiring' then
    if coalesce(v_two_skips, false) then
      v_next_status := 'paused';
    elsif v_subscription.status = 'paused' then
      v_next_status := 'paused';
    elsif lower(v_subscription.plan_type) = 'weekly' and not v_has_upcoming_job then
      v_next_status := 'unbooked';
    elsif lower(v_subscription.plan_type) = 'weekly' and v_has_upcoming_job then
      v_next_status := 'active';
    end if;
  end if;

  update public.subscriptions
  set last_clean_date = v_last_clean,
      status = v_next_status,
      status_updated_at = case when status is distinct from v_next_status then now() else status_updated_at end,
      updated_at = now()
  where id = p_subscription_id;
end;
$$;

create or replace function public.refresh_subscription_health()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
  v_count integer := 0;
begin
  for v_subscription in select id from public.subscriptions loop
    perform public.refresh_single_subscription_health(v_subscription.id);
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
    perform public.refresh_single_subscription_health(old.subscription_id);
    return old;
  end if;

  perform public.refresh_single_subscription_health(new.subscription_id);
  return new;
end;
$$;

drop trigger if exists refresh_health_after_subscription_history_write on public.subscription_history_logs;
create trigger refresh_health_after_subscription_history_write
after insert or update or delete on public.subscription_history_logs
for each row execute function public.refresh_health_after_history_write();

create or replace function public.get_subscription_dashboard()
returns table (
  id uuid,
  client_id uuid,
  client_name text,
  phone text,
  plan_type text,
  hourly_rate numeric,
  status public.subscription_status,
  last_clean_date timestamp with time zone,
  created_at timestamp with time zone,
  source_purchase_ref_id text,
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
    subscriptions.id,
    subscriptions.client_id,
    trim(concat_ws(' ', profiles.first_name, profiles.last_name)) as client_name,
    coalesce(profiles.phone::text, '') as phone,
    subscriptions.plan_type,
    subscriptions.hourly_rate,
    subscriptions.status,
    subscriptions.last_clean_date,
    subscriptions.created_at,
    subscriptions.source_purchase_ref_id,
    least(
      100,
      round(
        100 * (
          select count(*)::numeric
          from public.subscription_history_logs completed_history
          where completed_history.subscription_id = subscriptions.id
            and completed_history.week_start_date >= current_date - 30
            and completed_history.fulfillment_status = 'completed'
        ) / greatest(
          1,
          case
            when lower(subscriptions.plan_type) in ('bi-weekly', 'biweekly') then 2
            else 4
          end
        ),
        1
      )
    ) as retention_score,
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
        where history.subscription_id = subscriptions.id
        order by history.week_start_date desc
        limit 4
      ) recent_history
    ), '[]'::jsonb) as history
  from public.subscriptions subscriptions
  join public.profiles profiles on profiles.id = subscriptions.client_id
  order by subscriptions.created_at desc;
end;
$$;

create or replace function public.get_subscription_churn_risk()
returns table (
  id uuid,
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
    subscriptions.id,
    subscriptions.client_id,
    trim(concat_ws(' ', profiles.first_name, profiles.last_name)),
    coalesce(profiles.phone::text, ''),
    subscriptions.plan_type,
    subscriptions.status,
    subscriptions.last_clean_date,
    case
      when subscriptions.last_clean_date is null then null
      else floor(extract(epoch from (now() - subscriptions.last_clean_date)) / 86400)::integer
    end
  from public.subscriptions subscriptions
  join public.profiles profiles on profiles.id = subscriptions.client_id
  where subscriptions.status in ('unbooked', 'paused')
  order by subscriptions.last_clean_date asc nulls first;
end;
$$;

create or replace function public.log_subscription_follow_up(
  p_subscription_id uuid,
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
    trim(concat_ws(' ', profiles.first_name, profiles.last_name)),
    regexp_replace(coalesce(profiles.phone::text, ''), '[^0-9]', '', 'g')
  into v_name, v_phone
  from public.subscriptions subscriptions
  join public.profiles profiles on profiles.id = subscriptions.client_id
  where subscriptions.id = p_subscription_id;

  if not found then raise exception 'Subscription not found.'; end if;

  v_message := format(
    'Hi %s, this is ReadyNest. We noticed your next cleaning is not booked yet. Would you like us to help schedule it?',
    coalesce(nullif(v_name, ''), 'there')
  );

  insert into public.subscription_follow_up_logs (
    subscription_id,
    initiated_by,
    channel,
    message
  ) values (
    p_subscription_id,
    auth.uid(),
    p_channel,
    v_message
  ) returning id into v_log_id;

  return query select v_log_id, v_phone, v_message, v_name;
end;
$$;

create or replace function public.activate_subscription(p_subscription_id uuid)
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

  update public.subscriptions
  set status = 'active',
      status_updated_at = now(),
      updated_at = now()
  where id = p_subscription_id
  returning status into v_status;

  if v_status is null then raise exception 'Subscription not found.'; end if;
  return v_status;
end;
$$;

revoke execute on function public.get_subscription_dashboard() from public, anon;
revoke execute on function public.get_subscription_churn_risk() from public, anon;
revoke execute on function public.log_subscription_follow_up(uuid, text) from public, anon;
revoke execute on function public.activate_subscription(uuid) from public, anon;
revoke execute on function public.refresh_subscription_health() from public, anon, authenticated;

grant execute on function public.get_subscription_dashboard() to authenticated;
grant execute on function public.get_subscription_churn_risk() to authenticated;
grant execute on function public.log_subscription_follow_up(uuid, text) to authenticated;
grant execute on function public.activate_subscription(uuid) to authenticated;
grant execute on function public.refresh_subscription_health() to service_role;
