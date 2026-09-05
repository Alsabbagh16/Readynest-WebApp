alter table public.subscription_follow_up_queue
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists importance text not null default 'medium',
  add column if not exists reminder_date date,
  add column if not exists automation_key text,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists completed_by uuid,
  add column if not exists reopened_at timestamp with time zone,
  add column if not exists reopened_by uuid;

update public.subscription_follow_up_queue set id = gen_random_uuid() where id is null;
alter table public.subscription_follow_up_queue alter column id set not null;
alter table public.subscription_follow_up_queue drop constraint if exists subscription_follow_up_queue_pkey;
alter table public.subscription_follow_up_queue add constraint subscription_follow_up_queue_pkey primary key (id);
alter table public.subscription_follow_up_queue drop constraint if exists subscription_follow_up_queue_state_check;
update public.subscription_follow_up_queue set state = case when state = 'queued' then 'open' else state end;
update public.subscription_follow_up_queue cards
set source = 'automatic',
    importance = case when profiles.subscription_status = 'paused' then 'high' else 'medium' end,
    automation_key = concat(coalesce(profiles.subscription_status, 'unbooked')::text, ':', coalesce(profiles.subscription_status_updated_at, profiles.updated_at, profiles.created_at)::text)
from public.profiles profiles
where profiles.id = cards.client_id
  and cards.source in ('automatic', 'manual_pause');
alter table public.subscription_follow_up_queue
  add constraint subscription_follow_up_queue_state_check check (state in ('open', 'completed', 'dismissed'));
alter table public.subscription_follow_up_queue drop constraint if exists subscription_follow_up_queue_importance_check;
alter table public.subscription_follow_up_queue
  add constraint subscription_follow_up_queue_importance_check check (importance in ('high', 'medium', 'low'));

drop index if exists public.subscription_follow_up_queue_state_idx;
create index subscription_follow_up_queue_state_idx
  on public.subscription_follow_up_queue (state, reminder_date, importance, created_at);
create index subscription_follow_up_queue_client_idx
  on public.subscription_follow_up_queue (client_id, created_at desc);
create unique index subscription_follow_up_automation_episode_idx
  on public.subscription_follow_up_queue (client_id, automation_key)
  where source = 'automatic' and automation_key is not null;

create or replace function public.sync_subscription_follow_up_queue()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;

  insert into public.subscription_follow_up_queue (
    client_id, state, note, source, importance, automation_key, created_by, updated_by
  )
  select
    profiles.id,
    'open',
    case when profiles.subscription_status = 'paused'
      then 'Follow up with this paused subscriber.'
      else 'Follow up with this subscriber about their next cleaning.' end,
    'automatic',
    case when profiles.subscription_status = 'paused' then 'high' else 'medium' end,
    concat(profiles.subscription_status::text, ':', coalesce(profiles.subscription_status_updated_at, profiles.updated_at, profiles.created_at)::text),
    null,
    null
  from public.profiles profiles
  where profiles.is_subscriber = true
    and coalesce(profiles.subscription_status, 'unbooked') in ('unbooked', 'paused')
  on conflict (client_id, automation_key) where source = 'automatic' and automation_key is not null do nothing;
end;
$$;

drop function if exists public.get_subscription_follow_up_queue();
create function public.get_subscription_follow_up_queue()
returns table (
  id uuid,
  client_id uuid,
  client_name text,
  email text,
  phone text,
  is_subscriber boolean,
  subscription_status public.subscription_status,
  note text,
  importance text,
  reminder_date date,
  state text,
  source text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  completed_at timestamp with time zone,
  reopened_at timestamp with time zone
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  perform public.sync_subscription_follow_up_queue();

  return query
  select cards.id, profiles.id,
    coalesce(nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''), profiles.email, 'Unnamed Client'),
    profiles.email, coalesce(profiles.phone::text, ''), coalesce(profiles.is_subscriber, false),
    case when profiles.is_subscriber then profiles.subscription_status else null end,
    cards.note, cards.importance, cards.reminder_date, cards.state, cards.source, cards.created_at, cards.updated_at,
    cards.completed_at, cards.reopened_at
  from public.subscription_follow_up_queue cards
  join public.profiles profiles on profiles.id = cards.client_id
  where cards.state in ('open', 'completed')
  order by
    case when cards.state = 'open' then 0 else 1 end,
    case when cards.state = 'open' and cards.reminder_date is not null then 0 else 1 end,
    case when cards.state = 'open' then cards.reminder_date end asc nulls last,
    case when cards.state = 'open' then case cards.importance when 'high' then 1 when 'medium' then 2 else 3 end else 4 end,
    case when cards.state = 'open' then cards.created_at end asc,
    cards.completed_at desc nulls last;
end;
$$;

create or replace function public.create_follow_up_card(p_client_id uuid, p_note text, p_importance text default 'medium', p_reminder_date date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_note text; v_importance text;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  if not exists (select 1 from public.profiles where id = p_client_id) then raise exception 'Customer profile not found.'; end if;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  v_importance := lower(trim(coalesce(p_importance, 'medium')));
  if v_note is null then raise exception 'A follow-up memo is required.'; end if;
  if length(v_note) > 2000 then raise exception 'Follow-up memos must be 2000 characters or fewer.'; end if;
  if v_importance not in ('high', 'medium', 'low') then raise exception 'Invalid follow-up importance.'; end if;
  insert into public.subscription_follow_up_queue (client_id, state, note, source, importance, reminder_date, created_by, updated_by)
  values (p_client_id, 'open', v_note, 'manual', v_importance, p_reminder_date, auth.uid(), auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_follow_up_card(p_card_id uuid, p_note text, p_importance text, p_reminder_date date default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_note text; v_importance text;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  v_importance := lower(trim(coalesce(p_importance, '')));
  if length(v_note) > 2000 then raise exception 'Follow-up memos must be 2000 characters or fewer.'; end if;
  if v_importance not in ('high', 'medium', 'low') then raise exception 'Invalid follow-up importance.'; end if;
  update public.subscription_follow_up_queue set note = v_note, importance = v_importance, reminder_date = p_reminder_date,
    updated_by = auth.uid(), updated_at = now() where id = p_card_id and state = 'open';
  if not found then raise exception 'Open follow-up card not found.'; end if;
end;
$$;

create or replace function public.complete_follow_up_card(p_card_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.subscription_follow_up_queue set state = 'completed', completed_at = now(), completed_by = auth.uid(),
    updated_by = auth.uid(), updated_at = now() where id = p_card_id and state = 'open';
  if not found then raise exception 'Open follow-up card not found.'; end if;
end;
$$;

create or replace function public.reopen_follow_up_card(p_card_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.subscription_follow_up_queue set state = 'open', reopened_at = now(), reopened_by = auth.uid(),
    completed_at = null, completed_by = null, updated_by = auth.uid(), updated_at = now()
  where id = p_card_id and state = 'completed';
  if not found then raise exception 'Completed follow-up card not found.'; end if;
end;
$$;

create or replace function public.dismiss_follow_up_card(p_card_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.subscription_follow_up_queue set state = 'dismissed', dismissed_at = now(),
    updated_by = auth.uid(), updated_at = now() where id = p_card_id and state = 'open';
  if not found then raise exception 'Open follow-up card not found.'; end if;
end;
$$;

create or replace function public.pause_subscription(p_client_id uuid)
returns public.subscription_status language plpgsql security definer set search_path = public as $$
declare v_status public.subscription_status;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  update public.profiles set subscription_status = 'paused', subscription_manually_paused = true,
    subscription_manually_paused_at = now(), subscription_manually_paused_by = auth.uid(),
    subscription_status_updated_at = now(), updated_at = now()
  where id = p_client_id and is_subscriber = true returning subscription_status into v_status;
  if v_status is null then raise exception 'Subscriber profile not found.'; end if;
  perform public.sync_subscription_follow_up_queue();
  return v_status;
end;
$$;

drop function if exists public.add_subscription_to_follow_up_queue(uuid);
drop function if exists public.remove_subscription_from_follow_up_queue(uuid);
drop function if exists public.update_subscription_follow_up_note(uuid, text);

revoke execute on function public.get_subscription_follow_up_queue() from public, anon;
revoke execute on function public.create_follow_up_card(uuid, text, text, date) from public, anon;
revoke execute on function public.update_follow_up_card(uuid, text, text, date) from public, anon;
revoke execute on function public.complete_follow_up_card(uuid) from public, anon;
revoke execute on function public.reopen_follow_up_card(uuid) from public, anon;
revoke execute on function public.dismiss_follow_up_card(uuid) from public, anon;

grant execute on function public.get_subscription_follow_up_queue() to authenticated;
grant execute on function public.create_follow_up_card(uuid, text, text, date) to authenticated;
grant execute on function public.update_follow_up_card(uuid, text, text, date) to authenticated;
grant execute on function public.complete_follow_up_card(uuid) to authenticated;
grant execute on function public.reopen_follow_up_card(uuid) to authenticated;
grant execute on function public.dismiss_follow_up_card(uuid) to authenticated;
