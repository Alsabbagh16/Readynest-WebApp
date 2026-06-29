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

  for v_week_offset in 0..3 loop
    v_week_start := (date_trunc('week', current_date)::date - (v_week_offset * 7));
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

select public.refresh_subscription_health();
