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
  set note = v_note,
      importance = v_importance,
      reminder_date = p_reminder_date,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_card_id and state = 'open';

  if not found then raise exception 'Open follow-up card not found.'; end if;
end;
$$;

revoke execute on function public.update_follow_up_card(uuid, text, text, date) from public, anon;
grant execute on function public.update_follow_up_card(uuid, text, text, date) to authenticated;
