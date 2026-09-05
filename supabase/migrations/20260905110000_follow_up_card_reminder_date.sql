alter table public.subscription_follow_up_queue
  add column if not exists reminder_date date;

drop index if exists public.subscription_follow_up_queue_state_idx;
create index subscription_follow_up_queue_state_idx
  on public.subscription_follow_up_queue (state, reminder_date, importance, created_at);

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

drop function if exists public.create_follow_up_card(uuid, text, text);
create or replace function public.create_follow_up_card(
  p_client_id uuid,
  p_note text,
  p_importance text default 'medium',
  p_reminder_date date default null
)
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
  values (p_client_id, 'open', v_note, 'manual', v_importance, p_reminder_date, auth.uid(), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

drop function if exists public.update_follow_up_card(uuid, text, text);
create or replace function public.update_follow_up_card(
  p_card_id uuid,
  p_note text,
  p_importance text,
  p_reminder_date date default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_note text; v_importance text;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  v_importance := lower(trim(coalesce(p_importance, '')));
  if length(v_note) > 2000 then raise exception 'Follow-up memos must be 2000 characters or fewer.'; end if;
  if v_importance not in ('high', 'medium', 'low') then raise exception 'Invalid follow-up importance.'; end if;
  update public.subscription_follow_up_queue
  set note = v_note, importance = v_importance, reminder_date = p_reminder_date,
      updated_by = auth.uid(), updated_at = now()
  where id = p_card_id and state = 'open';
  if not found then raise exception 'Open follow-up card not found.'; end if;
end;
$$;

revoke execute on function public.get_subscription_follow_up_queue() from public, anon;
revoke execute on function public.create_follow_up_card(uuid, text, text, date) from public, anon;
revoke execute on function public.update_follow_up_card(uuid, text, text, date) from public, anon;

grant execute on function public.get_subscription_follow_up_queue() to authenticated;
grant execute on function public.create_follow_up_card(uuid, text, text, date) to authenticated;
grant execute on function public.update_follow_up_card(uuid, text, text, date) to authenticated;
