alter table public.profiles add column if not exists subscription_days_per_week integer;
alter table public.purchases add column if not exists subscription_days_per_week integer;

alter table public.profiles drop constraint if exists profiles_subscription_plan_type_check;
alter table public.profiles add constraint profiles_subscription_plan_type_check
  check (subscription_plan_type is null or subscription_plan_type in ('Weekly', 'Twice Weekly', 'Custom'));
alter table public.profiles drop constraint if exists profiles_subscription_days_per_week_check;
alter table public.profiles add constraint profiles_subscription_days_per_week_check check (
  (subscription_plan_type = 'Custom' and subscription_days_per_week between 3 and 7)
  or (subscription_plan_type is distinct from 'Custom' and subscription_days_per_week is null)
);

alter table public.purchases drop constraint if exists purchases_subscription_plan_type_check;
alter table public.purchases add constraint purchases_subscription_plan_type_check
  check (subscription_plan_type is null or subscription_plan_type in ('Weekly', 'Twice Weekly', 'Custom'));
alter table public.purchases drop constraint if exists purchases_subscription_days_per_week_check;
alter table public.purchases add constraint purchases_subscription_days_per_week_check check (
  (subscription_plan_type = 'Custom' and subscription_days_per_week between 3 and 7)
  or (subscription_plan_type is distinct from 'Custom' and subscription_days_per_week is null)
);

create or replace function public.normalize_profile_subscription_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.subscription_plan_type = 'Custom' then
    if new.subscription_days_per_week is null or new.subscription_days_per_week not between 3 and 7 then
      raise exception 'Custom subscriptions require 3 to 7 days per week.';
    end if;
  else
    new.subscription_days_per_week := null;
  end if;
  if new.is_subscriber then
    if new.subscription_plan_type is null then raise exception 'A subscription frequency is required.'; end if;
    new.subscription_status := coalesce(new.subscription_status, 'unbooked');
    new.subscription_started_at := coalesce(new.subscription_started_at, now());
    new.subscription_status_updated_at := coalesce(new.subscription_status_updated_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_profile_subscription_fields on public.profiles;
create trigger normalize_profile_subscription_fields
before insert or update of is_subscriber, subscription_plan_type, subscription_days_per_week, subscription_status
on public.profiles for each row execute function public.normalize_profile_subscription_fields();

create or replace function public.validate_subscription_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.subscription_plan_type = 'Custom' then
    if new.subscription_days_per_week is null or new.subscription_days_per_week not between 3 and 7 then
      raise exception 'Custom subscription invoices require 3 to 7 days per week.';
    end if;
  else
    new.subscription_days_per_week := null;
  end if;
  if new.is_subscription then
    if new.user_id is null then raise exception 'Subscription invoices require a registered customer account.'; end if;
    if new.subscription_plan_type is null then raise exception 'Subscription invoices require a frequency.'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_subscription_invoice on public.purchases;
create trigger validate_subscription_invoice
before insert or update of is_subscription, subscription_plan_type, subscription_days_per_week, user_id
on public.purchases for each row execute function public.validate_subscription_invoice();

create or replace function public.sync_profile_from_subscription_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_enroll boolean;
begin
  if not new.is_subscription then return new; end if;
  if tg_op = 'INSERT' then
    v_enroll := true;
  else
    v_enroll := not coalesce(old.is_subscription, false) or old.user_id is distinct from new.user_id;
  end if;
  update public.profiles
  set is_subscriber = case when v_enroll then true else is_subscriber end,
      subscription_plan_type = case when v_enroll or is_subscriber then new.subscription_plan_type else subscription_plan_type end,
      subscription_days_per_week = case when v_enroll or is_subscriber then new.subscription_days_per_week else subscription_days_per_week end,
      subscription_status = case when v_enroll then coalesce(subscription_status, 'unbooked') else subscription_status end,
      subscription_started_at = case when v_enroll then least(coalesce(subscription_started_at, new.created_at, now()), coalesce(new.created_at, now())) else subscription_started_at end,
      subscription_status_updated_at = case when v_enroll then coalesce(subscription_status_updated_at, now()) else subscription_status_updated_at end,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists sync_profile_from_subscription_invoice on public.purchases;
create trigger sync_profile_from_subscription_invoice
after insert or update of is_subscription, subscription_plan_type, subscription_days_per_week, user_id
on public.purchases for each row execute function public.sync_profile_from_subscription_invoice();

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
  if v_next_status <> 'expiring' then
    if coalesce(v_two_skips, false) then v_next_status := 'paused'; elsif v_has_upcoming_job then v_next_status := 'active'; else v_next_status := 'unbooked'; end if;
  end if;
  update public.profiles set subscription_last_clean_date = v_last_clean, subscription_status = v_next_status,
    subscription_status_updated_at = case when subscription_status is distinct from v_next_status then now() else subscription_status_updated_at end, updated_at = now()
  where id = p_client_id;
end;
$$;

create or replace function public.admin_update_customer_profile(p_user_id uuid, p_updates jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_patch public.profiles%rowtype; v_updated_count integer; v_plan text; v_days integer;
begin
  if not exists(select 1 from public.employees where id = auth.uid() and (role in ('admin','superadmin') or is_superadmin = true)) then raise exception 'Customer profile update permission required.'; end if;
  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then raise exception 'Profile updates must be a JSON object.'; end if;
  v_patch := jsonb_populate_record(null::public.profiles, p_updates);
  select case when p_updates ? 'subscription_plan_type' then v_patch.subscription_plan_type else subscription_plan_type end,
         case when p_updates ? 'subscription_days_per_week' then v_patch.subscription_days_per_week else subscription_days_per_week end
  into v_plan, v_days from public.profiles where id = p_user_id;
  if coalesce((p_updates ->> 'is_subscriber')::boolean, false) and v_plan is null then raise exception 'A subscription frequency is required.'; end if;
  if v_plan = 'Custom' and (v_days is null or v_days not between 3 and 7) then raise exception 'Custom subscriptions require 3 to 7 days per week.'; end if;
  update public.profiles p set
    first_name = case when p_updates ? 'first_name' then v_patch.first_name else p.first_name end,
    last_name = case when p_updates ? 'last_name' then v_patch.last_name else p.last_name end,
    email = case when p_updates ? 'email' then v_patch.email else p.email end,
    phone = case when p_updates ? 'phone' then v_patch.phone else p.phone end,
    dob = case when p_updates ? 'dob' then v_patch.dob else p.dob end,
    user_type = case when p_updates ? 'user_type' then v_patch.user_type else p.user_type end,
    credits = case when p_updates ? 'credits' then v_patch.credits else p.credits end,
    document_urls = case when p_updates ? 'document_urls' then v_patch.document_urls else p.document_urls end,
    is_subscriber = case when p_updates ? 'is_subscriber' then v_patch.is_subscriber else p.is_subscriber end,
    subscription_plan_type = case when p_updates ? 'subscription_plan_type' then v_patch.subscription_plan_type else p.subscription_plan_type end,
    subscription_days_per_week = case when v_plan = 'Custom' then v_days else null end,
    preferred_cleaner_id = case when p_updates ? 'preferred_cleaner_id' then v_patch.preferred_cleaner_id else p.preferred_cleaner_id end,
    updated_at = now()
  where p.id = p_user_id;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then raise exception 'Customer profile not found.'; end if;
  return true;
end;
$$;

drop function if exists public.get_subscription_dashboard();
drop function if exists public.get_subscription_purchase_service(text);

create function public.get_subscription_purchase_service(p_purchase_ref_id text)
returns table(purchase_ref_id text, plan_type text, subscription_days_per_week integer, expected_jobs integer, service_score numeric, service_history jsonb)
language plpgsql security definer set search_path = public as $$
declare v_plan_type text; v_days integer; v_expected_jobs integer;
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  select coalesce(p.subscription_plan_type, pr.subscription_plan_type, 'Weekly'),
         case when coalesce(p.subscription_plan_type, pr.subscription_plan_type) = 'Custom' then coalesce(p.subscription_days_per_week, pr.subscription_days_per_week) else null end
  into v_plan_type, v_days from public.purchases p left join public.profiles pr on pr.id = p.user_id
  where p.purchase_ref_id::text = p_purchase_ref_id and p.is_subscription = true;
  if not found then raise exception 'Subscription purchase not found.'; end if;
  v_expected_jobs := 4 * case when v_plan_type = 'Custom' then v_days when v_plan_type = 'Twice Weekly' then 2 else 1 end;
  return query select p_purchase_ref_id, v_plan_type, v_days, v_expected_jobs,
    round(100 * count(*) filter(where slots.state = 'completed')::numeric / greatest(1,count(*)),1),
    jsonb_agg(jsonb_build_object('slot_number',slots.slot_number,'status',slots.state,'job_status',slots.job_status,'job_ref_id',slots.job_ref_id,'preferred_date',slots.preferred_date) order by slots.slot_number)
  from (select es.slot_number, sj.job_ref_id, sj.preferred_date, sj.status job_status,
    case when sj.job_ref_id is null then 'empty' when lower(coalesce(sj.status,''))='completed' then 'completed' when lower(coalesce(sj.status,'')) in ('failed','cancelled') then 'missed' else 'partial' end state
    from generate_series(1,v_expected_jobs) es(slot_number) left join lateral (
      select j.job_ref_id,j.preferred_date,j.status from public.jobs j where j.purchase_ref_id::text=p_purchase_ref_id order by j.preferred_date asc nulls last,j.created_at,j.job_ref_id offset(es.slot_number-1) limit 1
    ) sj on true) slots;
end;
$$;

create function public.get_subscription_dashboard()
returns table(client_id uuid, client_name text, phone text, plan_type text, subscription_days_per_week integer, hourly_rate numeric, status public.subscription_status, last_clean_date timestamptz, subscription_started_at timestamptz, latest_subscription_purchase_ref_id text, payment_retention_score numeric, service_fulfillment_score numeric, payment_history jsonb, service_history jsonb)
language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  return query select pr.id,coalesce(nullif(trim(concat_ws(' ',pr.first_name,pr.last_name)),''),pr.email,'Unnamed Client'),coalesce(pr.phone::text,''),pr.subscription_plan_type,pr.subscription_days_per_week,
    case when coalesce(li.hours,0)>0 then round(coalesce(li.paid_amount,0)/li.hours,3) else 0 end,coalesce(pr.subscription_status,'unbooked'),pr.subscription_last_clean_date,pr.subscription_started_at,li.purchase_ref_id,
    coalesce(pm.score,0),coalesce(ls.service_score,0),coalesce(pm.history,'[]'::jsonb),coalesce(ls.service_history,'[]'::jsonb)
  from public.profiles pr
  left join lateral(select p.purchase_ref_id::text,p.paid_amount,p.hours from public.purchases p where p.user_id=pr.id and p.is_subscription=true order by p.created_at desc,p.purchase_ref_id desc limit 1) li on true
  left join lateral(select round(100*count(*) filter(where periods.state='paid')::numeric/greatest(1,count(*)),1) score,
    jsonb_agg(jsonb_build_object('period_start',periods.period_start,'status',periods.state,'purchase_ref_id',periods.purchase_ref_id) order by periods.period_start) history
    from(select months.period_start,case when bool_or(lower(coalesce(p.status,'')) in ('paid','completed','confirmed')) then 'paid' when count(p.purchase_ref_id)>0 and bool_and(lower(coalesce(p.status,'')) in ('failed','cancelled','refunded')) then 'failed' when count(p.purchase_ref_id)>0 then 'pending' when months.period_start=date_trunc('month',current_date)::date then 'pending' else 'missed' end state,
      coalesce((array_agg(p.purchase_ref_id::text order by p.created_at desc) filter(where lower(coalesce(p.status,'')) in ('paid','completed','confirmed')))[1],(array_agg(p.purchase_ref_id::text order by p.created_at desc) filter(where p.purchase_ref_id is not null))[1]) purchase_ref_id
      from(select generate_series(date_trunc('month',current_date)-interval '3 months',date_trunc('month',current_date),interval '1 month')::date period_start) months
      left join public.purchases p on p.user_id=pr.id and p.is_subscription=true and p.created_at>=months.period_start::timestamp and p.created_at<(months.period_start+interval '1 month')
      where months.period_start>=date_trunc('month',pr.subscription_started_at)::date group by months.period_start) periods) pm on true
  left join lateral public.get_subscription_purchase_service(li.purchase_ref_id) ls on true
  where pr.is_subscriber=true order by pr.subscription_started_at desc,pr.id;
end;
$$;

drop function if exists public.get_subscription_churn_risk();
create function public.get_subscription_churn_risk()
returns table(client_id uuid,client_name text,phone text,plan_type text,subscription_days_per_week integer,status public.subscription_status,last_clean_date timestamptz,days_since_last_clean integer)
language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_subscriptions() then raise exception 'Subscription Management permission required.'; end if;
  return query select p.id,coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Unnamed Client'),coalesce(p.phone::text,''),p.subscription_plan_type,p.subscription_days_per_week,coalesce(p.subscription_status,'unbooked'),p.subscription_last_clean_date,
    case when p.subscription_last_clean_date is null then null else floor(extract(epoch from(now()-p.subscription_last_clean_date))/86400)::integer end
  from public.profiles p where p.is_subscriber=true and coalesce(p.subscription_status,'unbooked') in ('unbooked','paused') order by p.subscription_last_clean_date asc nulls first;
end;
$$;

revoke execute on function public.get_subscription_purchase_service(text) from public,anon;
grant execute on function public.get_subscription_purchase_service(text) to authenticated;
revoke execute on function public.get_subscription_dashboard() from public,anon;
grant execute on function public.get_subscription_dashboard() to authenticated;
revoke execute on function public.get_subscription_churn_risk() from public,anon;
grant execute on function public.get_subscription_churn_risk() to authenticated;
