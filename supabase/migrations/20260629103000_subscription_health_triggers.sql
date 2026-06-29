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

create or replace function public.refresh_subscription_health_after_job_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_subscription record;
begin
  v_client_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;

  if v_client_id is not null then
    for v_subscription in
      select id from public.subscriptions where client_id = v_client_id
    loop
      perform public.refresh_single_subscription_health(v_subscription.id);
    end loop;
  end if;

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id and old.user_id is not null then
    for v_subscription in
      select id from public.subscriptions where client_id = old.user_id
    loop
      perform public.refresh_single_subscription_health(v_subscription.id);
    end loop;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists refresh_subscription_health_after_job_write on public.jobs;
create trigger refresh_subscription_health_after_job_write
after insert or delete or update of user_id, preferred_date, status on public.jobs
for each row execute function public.refresh_subscription_health_after_job_write();

revoke execute on function public.refresh_subscription_health_for_dashboard() from public, anon;
grant execute on function public.refresh_subscription_health_for_dashboard() to authenticated;
