alter table public.purchases
  add column if not exists purchase_queue_id uuid,
  add column if not exists purchase_source text not null default 'admin';

create table public.purchase_queue (
  queue_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  service_id uuid references public.products(id) on delete set null,
  property_id uuid references public.addresses(id) on delete set null,
  requested_date date,
  requested_time time without time zone,
  duration_hours numeric(10,2) check (duration_hours is null or duration_hours > 0),
  quantity integer check (quantity is null or quantity > 0),
  quoted_price numeric(12,3) check (quoted_price is null or quoted_price >= 0),
  customer_notes text,
  ai_notes text,
  source_message_id text,
  request_payload jsonb not null default '{}'::jsonb,
  source text not null check (source in ('website', 'ai_agent')),
  lifecycle_status text not null default 'pending' check (lifecycle_status in ('pending', 'rejected', 'approved')),
  reserved_purchase_ref text not null unique,
  customer_name text,
  customer_email text,
  customer_phone text,
  service_name text,
  property_snapshot jsonb,
  rejection_reason text,
  approved_purchase_ref text references public.purchases(purchase_ref_id) on delete set null,
  approved_at timestamp with time zone,
  approved_by uuid,
  rejected_at timestamp with time zone,
  rejected_by uuid,
  revived_at timestamp with time zone,
  revived_by uuid,
  notification_type text,
  notification_status text,
  notification_error text,
  notification_sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (source, source_message_id)
);

alter table public.purchases drop constraint if exists purchases_purchase_queue_id_fkey;
alter table public.purchases add constraint purchases_purchase_queue_id_fkey
  foreign key (purchase_queue_id) references public.purchase_queue(queue_id) on delete set null;
alter table public.purchases drop constraint if exists purchases_purchase_source_check;
alter table public.purchases add constraint purchases_purchase_source_check
  check (purchase_source in ('admin', 'website', 'ai_agent'));

create index purchase_queue_status_created_idx on public.purchase_queue (lifecycle_status, created_at desc);
create index purchase_queue_customer_idx on public.purchase_queue (customer_id, created_at desc);

create or replace function public.can_use_purchase_queue(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees employees
    where employees.id = auth.uid() and employees.role in ('admin','superadmin','staff')
      and (employees.role = 'superadmin' or employees.is_superadmin = true
        or not exists (select 1 from public.ui_employee_roles er where er.employee_id = employees.id)
        or exists (select 1 from public.ui_employee_roles er
          join public.ui_role_permissions rp on rp.role_id = er.role_id
          join public.ui_permissions permissions on permissions.id = rp.permission_id
          where er.employee_id = employees.id and permissions.key = p_permission))
  );
$$;

alter table public.purchase_queue enable row level security;
revoke all on public.purchase_queue from anon, authenticated;
create policy "Purchase staff can view queue" on public.purchase_queue for select to authenticated
  using (public.can_use_purchase_queue('tab.recent_purchases.view'));
grant select on public.purchase_queue to authenticated;

create or replace function public.submit_website_purchase_queue(p_payload jsonb)
returns public.purchase_queue language plpgsql security definer set search_path = public as $$
declare v_row public.purchase_queue; v_customer uuid; v_service uuid; v_property uuid; v_ref text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 262144 then raise exception 'Invalid or oversized purchase request.'; end if;
  begin v_customer := nullif(p_payload->>'user_id','')::uuid; exception when invalid_text_representation then raise exception 'Invalid customer_id.'; end;
  begin v_service := nullif(p_payload->>'product_id','')::uuid; exception when invalid_text_representation then raise exception 'Invalid service_id.'; end;
  begin v_property := nullif(coalesce(p_payload->>'property_id',p_payload->>'address_id'),'')::uuid; exception when invalid_text_representation then raise exception 'Invalid property_id.'; end;
  if v_customer is not null and not exists(select 1 from public.profiles where id=v_customer) then raise exception 'Customer not found.'; end if;
  if v_service is not null and not exists(select 1 from public.products where id=v_service) then raise exception 'Service not found.'; end if;
  if v_property is not null and not exists(select 1 from public.addresses where id=v_property) then raise exception 'Property not found.'; end if;
  v_ref := coalesce(nullif(p_payload->>'purchase_ref_id',''), 'PUR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,9)));
  insert into public.purchase_queue(queue_id,customer_id,service_id,property_id,requested_date,requested_time,duration_hours,quantity,quoted_price,customer_notes,request_payload,source,reserved_purchase_ref,customer_name,customer_email,customer_phone,service_name,property_snapshot,notification_type,notification_status)
  values(gen_random_uuid(),v_customer,v_service,v_property,nullif(substr(coalesce(p_payload->>'preferred_booking_date',''),1,10),'')::date,
    nullif(substr(coalesce(p_payload->>'preferred_booking_date',''),12,8),'')::time,
    nullif(coalesce(p_payload->>'hours',p_payload->>'duration_hours'),'')::numeric,
    nullif(coalesce(p_payload->>'quantity',p_payload#>>'{raw_selections,cleaners}'),'')::integer,
    greatest(coalesce(nullif(coalesce(p_payload->>'final_amount_due_on_arrival',p_payload->>'paid_amount'),'')::numeric,0),0),
    nullif(coalesce(p_payload->>'notes',p_payload->>'customer_notes'),''),p_payload,'website',v_ref,
    nullif(p_payload->>'name',''),nullif(p_payload->>'email',''),nullif(p_payload->>'user_phone',''),nullif(p_payload->>'product_name',''),p_payload->'address','pending_acknowledgement','pending')
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.approve_purchase_queue(p_queue_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare q public.purchase_queue%rowtype; p jsonb; v_ref text;
begin
  if not public.can_use_purchase_queue('purchases.create') then raise exception 'Purchase creation permission required.'; end if;
  select * into q from public.purchase_queue where queue_id=p_queue_id for update;
  if not found then raise exception 'Queue record not found.'; end if;
  if q.lifecycle_status='approved' then return q.approved_purchase_ref; end if;
  if q.lifecycle_status<>'pending' then raise exception 'Revive this request before approving it.'; end if;
  p:=q.request_payload; v_ref:=q.reserved_purchase_ref;
  insert into public.purchases(purchase_ref_id,user_id,email,name,user_phone,product_id,product_name,paid_amount,final_amount_due_on_arrival,hours,is_subscription,subscription_plan_type,subscription_days_per_week,discount_amount,original_amount,coupon_code,payment_type,status,address,preferred_booking_date,scheduled_at,selected_addons,raw_selections,pricing_model,purchase_queue_id,purchase_source,created_at,updated_at)
  values(v_ref,q.customer_id,q.customer_email,q.customer_name,q.customer_phone,q.service_id,coalesce(q.service_name,'Custom Purchase'),coalesce(q.quoted_price,0),coalesce(q.quoted_price,0),q.duration_hours,
    coalesce((p->>'is_subscription')::boolean,false),nullif(p->>'subscription_plan_type',''),nullif(p->>'subscription_days_per_week','')::integer,
    coalesce(nullif(p->>'discount_amount','')::numeric,0),nullif(p->>'original_amount','')::numeric,nullif(p->>'coupon_code',''),coalesce(nullif(p->>'payment_type',''),'Cash on Arrival'),coalesce(nullif(p->>'status',''),'Pending'),
    coalesce(q.property_snapshot,p->'address'),case when q.requested_date is null then null else (q.requested_date::text||'T'||coalesce(q.requested_time,'09:00'::time)::text||'Z')::timestamptz end,
    case when q.requested_date is null then null else (q.requested_date::text||'T'||coalesce(q.requested_time,'09:00'::time)::text||'Z')::timestamptz end,
    coalesce(p->'selected_addons',p->'addons'),p->'raw_selections',nullif(p->>'pricing_model',''),q.queue_id,q.source,now(),now());
  update public.purchase_queue set lifecycle_status='approved',approved_purchase_ref=v_ref,approved_at=now(),approved_by=auth.uid(),updated_at=now(),notification_type='approval',notification_status='pending',notification_error=null where queue_id=q.queue_id;
  return v_ref;
end;
$$;

create or replace function public.reject_purchase_queue(p_queue_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.can_use_purchase_queue('purchases.edit') then raise exception 'Purchase edit permission required.'; end if;
  update public.purchase_queue set lifecycle_status='rejected',rejection_reason=nullif(trim(coalesce(p_reason,'')),''),rejected_at=now(),rejected_by=auth.uid(),updated_at=now(),notification_type='rejection',notification_status=case when customer_email is null then 'not_applicable' else 'pending' end,notification_error=null where queue_id=p_queue_id and lifecycle_status='pending';
  if not found then raise exception 'Pending queue record not found.'; end if;
end $$;

create or replace function public.revive_purchase_queue(p_queue_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.can_use_purchase_queue('purchases.edit') then raise exception 'Purchase edit permission required.'; end if;
  update public.purchase_queue set lifecycle_status='pending',rejection_reason=null,rejected_at=null,rejected_by=null,revived_at=now(),revived_by=auth.uid(),updated_at=now(),notification_type=null,notification_status=null,notification_error=null where queue_id=p_queue_id and lifecycle_status='rejected';
  if not found then raise exception 'Rejected queue record not found.'; end if;
end $$;

create or replace function public.complete_modified_purchase_queue(p_queue_id uuid,p_purchase_ref text)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.can_use_purchase_queue('purchases.create') then raise exception 'Purchase creation permission required.'; end if;
  if not exists(select 1 from public.purchases where purchase_ref_id::text=p_purchase_ref) then raise exception 'Purchase not found.'; end if;
  update public.purchases set purchase_queue_id=p_queue_id,purchase_source=(select source from public.purchase_queue where queue_id=p_queue_id) where purchase_ref_id::text=p_purchase_ref;
  update public.purchase_queue set lifecycle_status='approved',approved_purchase_ref=p_purchase_ref,approved_at=now(),approved_by=auth.uid(),updated_at=now(),notification_type='approval',notification_status='pending',notification_error=null where queue_id=p_queue_id and lifecycle_status='pending';
  if not found then raise exception 'Pending queue record not found.'; end if;
end $$;

create or replace function public.mark_purchase_queue_notification(p_queue_id uuid,p_status text,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.can_use_purchase_queue('tab.recent_purchases.view') then raise exception 'Purchase queue permission required.'; end if;
  if p_status not in ('pending','sent','failed','not_applicable') then raise exception 'Invalid notification status.'; end if;
  update public.purchase_queue set notification_status=p_status,notification_error=p_error,
    notification_sent_at=case when p_status='sent' then now() else notification_sent_at end,updated_at=now()
  where queue_id=p_queue_id;
  if not found then raise exception 'Queue record not found.'; end if;
end $$;

revoke execute on function public.submit_website_purchase_queue(jsonb) from public;
grant execute on function public.submit_website_purchase_queue(jsonb) to anon, authenticated;
revoke execute on function public.approve_purchase_queue(uuid) from public,anon;
revoke execute on function public.reject_purchase_queue(uuid,text) from public,anon;
revoke execute on function public.revive_purchase_queue(uuid) from public,anon;
revoke execute on function public.complete_modified_purchase_queue(uuid,text) from public,anon;
revoke execute on function public.mark_purchase_queue_notification(uuid,text,text) from public,anon;
grant execute on function public.approve_purchase_queue(uuid) to authenticated;
grant execute on function public.reject_purchase_queue(uuid,text) to authenticated;
grant execute on function public.revive_purchase_queue(uuid) to authenticated;
grant execute on function public.complete_modified_purchase_queue(uuid,text) to authenticated;
grant execute on function public.mark_purchase_queue_notification(uuid,text,text) to authenticated;
