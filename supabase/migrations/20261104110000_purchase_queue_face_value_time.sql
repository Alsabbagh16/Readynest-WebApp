-- Queue cards show the customer's Bahrain wall-clock selection. Incoming
-- website payloads contain UTC ISO timestamps, so convert before splitting.
create or replace function public.purchase_queue_face_value_datetime(p_value text)
returns timestamp without time zone
language plpgsql
stable
set search_path = public
as $$
begin
  if nullif(trim(coalesce(p_value, '')), '') is null then
    return null;
  end if;

  if p_value ~ '(Z|[+-][0-9]{2}:?[0-9]{2})$' then
    return p_value::timestamp with time zone at time zone 'Asia/Bahrain';
  end if;

  return p_value::timestamp without time zone;
end;
$$;

create or replace function public.submit_website_purchase_queue(p_payload jsonb)
returns public.purchase_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.purchase_queue;
  v_customer uuid;
  v_service uuid;
  v_property uuid;
  v_ref text;
  v_requested timestamp without time zone;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 262144 then
    raise exception 'Invalid or oversized purchase request.';
  end if;

  begin v_customer := nullif(p_payload->>'user_id', '')::uuid;
  exception when invalid_text_representation then raise exception 'Invalid customer_id.'; end;
  begin v_service := nullif(p_payload->>'product_id', '')::uuid;
  exception when invalid_text_representation then raise exception 'Invalid service_id.'; end;
  begin v_property := nullif(coalesce(p_payload->>'property_id', p_payload->>'address_id'), '')::uuid;
  exception when invalid_text_representation then raise exception 'Invalid property_id.'; end;

  if v_customer is not null and not exists (select 1 from public.profiles where id = v_customer) then
    raise exception 'Customer not found.';
  end if;
  if v_service is not null and not exists (select 1 from public.products where id = v_service) then
    raise exception 'Service not found.';
  end if;
  if v_property is not null and not exists (select 1 from public.addresses where id = v_property) then
    raise exception 'Property not found.';
  end if;

  v_ref := coalesce(
    nullif(p_payload->>'purchase_ref_id', ''),
    'PUR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9))
  );
  v_requested := public.purchase_queue_face_value_datetime(p_payload->>'preferred_booking_date');

  insert into public.purchase_queue(
    queue_id, customer_id, service_id, property_id, requested_date, requested_time,
    duration_hours, quantity, quoted_price, customer_notes, request_payload,
    source, reserved_purchase_ref, customer_name, customer_email, customer_phone,
    service_name, property_snapshot, notification_type, notification_status
  )
  values(
    gen_random_uuid(), v_customer, v_service, v_property, v_requested::date, v_requested::time,
    nullif(coalesce(p_payload->>'hours', p_payload->>'duration_hours'), '')::numeric,
    nullif(coalesce(p_payload->>'quantity', p_payload#>>'{raw_selections,cleaners}'), '')::integer,
    greatest(coalesce(nullif(coalesce(p_payload->>'final_amount_due_on_arrival', p_payload->>'paid_amount'), '')::numeric, 0), 0),
    nullif(coalesce(p_payload->>'notes', p_payload->>'customer_notes'), ''), p_payload,
    'website', v_ref, nullif(p_payload->>'name', ''), nullif(p_payload->>'email', ''),
    nullif(p_payload->>'user_phone', ''), nullif(p_payload->>'product_name', ''),
    p_payload->'address', 'pending_acknowledgement', 'pending'
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Repair pending website requests created before the conversion fix.
with corrected as (
  select
    queue_id,
    public.purchase_queue_face_value_datetime(request_payload->>'preferred_booking_date') as requested_at
  from public.purchase_queue
  where source = 'website'
    and lifecycle_status = 'pending'
)
update public.purchase_queue queue
set requested_date = corrected.requested_at::date,
    requested_time = corrected.requested_at::time,
    updated_at = now()
from corrected
where queue.queue_id = corrected.queue_id
  and corrected.requested_at is not null
  and (queue.requested_date, queue.requested_time) is distinct from
      (corrected.requested_at::date, corrected.requested_at::time);

create or replace function public.approve_purchase_queue(p_queue_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.purchase_queue%rowtype;
  p jsonb;
  v_ref text;
  v_requested_at timestamp with time zone;
begin
  if not public.can_use_purchase_queue('purchases.create') then
    raise exception 'Purchase creation permission required.';
  end if;

  select * into q from public.purchase_queue where queue_id = p_queue_id for update;
  if not found then raise exception 'Queue record not found.'; end if;
  if q.lifecycle_status = 'approved' then return q.approved_purchase_ref; end if;
  if q.lifecycle_status <> 'pending' then raise exception 'Revive this request before approving it.'; end if;

  p := q.request_payload;
  v_ref := q.reserved_purchase_ref;
  if q.requested_date is not null then
    v_requested_at := (q.requested_date + coalesce(q.requested_time, '09:00'::time)) at time zone 'Asia/Bahrain';
  end if;

  insert into public.purchases(
    purchase_ref_id, user_id, email, name, user_phone, product_id, product_name,
    paid_amount, final_amount_due_on_arrival, hours, is_subscription,
    subscription_plan_type, subscription_days_per_week, discount_amount,
    original_amount, coupon_code, payment_type, status, address,
    preferred_booking_date, scheduled_at, selected_addons, raw_selections,
    pricing_model, purchase_queue_id, purchase_source, created_at, updated_at
  )
  values(
    v_ref, q.customer_id, q.customer_email, q.customer_name, q.customer_phone,
    q.service_id, coalesce(q.service_name, 'Custom Purchase'), coalesce(q.quoted_price, 0),
    coalesce(q.quoted_price, 0), q.duration_hours,
    coalesce((p->>'is_subscription')::boolean, false), nullif(p->>'subscription_plan_type', ''),
    nullif(p->>'subscription_days_per_week', '')::integer,
    coalesce(nullif(p->>'discount_amount', '')::numeric, 0), nullif(p->>'original_amount', '')::numeric,
    nullif(p->>'coupon_code', ''), coalesce(nullif(p->>'payment_type', ''), 'Cash on Arrival'),
    coalesce(nullif(p->>'status', ''), 'Pending'), coalesce(q.property_snapshot, p->'address'),
    v_requested_at, v_requested_at, coalesce(p->'selected_addons', p->'addons'),
    p->'raw_selections', nullif(p->>'pricing_model', ''), q.queue_id, q.source, now(), now()
  );

  update public.purchase_queue
  set lifecycle_status = 'approved', approved_purchase_ref = v_ref, approved_at = now(),
      approved_by = auth.uid(), updated_at = now(), notification_type = 'approval',
      notification_status = 'pending', notification_error = null
  where queue_id = q.queue_id;

  return v_ref;
end;
$$;

revoke execute on function public.purchase_queue_face_value_datetime(text) from public, anon, authenticated;
revoke execute on function public.submit_website_purchase_queue(jsonb) from public;
revoke execute on function public.approve_purchase_queue(uuid) from public, anon;

grant execute on function public.submit_website_purchase_queue(jsonb) to anon, authenticated;
grant execute on function public.approve_purchase_queue(uuid) to authenticated;
