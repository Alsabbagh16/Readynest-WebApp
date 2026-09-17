import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  const configuredKey = Deno.env.get('PURCHASE_QUEUE_API_KEY');
  if (!configuredKey || request.headers.get('x-api-key') !== configuredKey) return reply({ error: 'Unauthorized.' }, 401);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 262144) return reply({ error: 'Payload exceeds 256 KB.' }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON.' }, 400); }
  const sourceMessageId = String(body.source_message_id || '').trim();
  if (!sourceMessageId) return reply({ error: 'source_message_id is required.' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply({ error: 'Server configuration missing.' }, 500);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: existing } = await supabase.from('purchase_queue').select('queue_id,lifecycle_status,reserved_purchase_ref').eq('source', 'ai_agent').eq('source_message_id', sourceMessageId).maybeSingle();
  if (existing) return reply({ data: existing, duplicate: true });

  for (const [field, table] of [['customer_id','profiles'],['service_id','products'],['property_id','addresses']] as const) {
    const value = body[field];
    if (value && (!uuidPattern.test(String(value)) || !(await supabase.from(table).select('id').eq('id', value).maybeSingle()).data)) return reply({ error: `Invalid ${field}.` }, 400);
  }
  const duration = body.duration_hours == null ? null : Number(body.duration_hours);
  const quantity = body.quantity == null ? null : Number(body.quantity);
  const price = body.quoted_price == null ? null : Number(body.quoted_price);
  if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) return reply({ error: 'duration_hours must be positive.' }, 400);
  if (quantity !== null && (!Number.isInteger(quantity) || quantity <= 0)) return reply({ error: 'quantity must be a positive integer.' }, 400);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return reply({ error: 'quoted_price must be non-negative.' }, 400);

  const queueId = crypto.randomUUID();
  const row = {
    queue_id: queueId, customer_id: body.customer_id || null, service_id: body.service_id || null, property_id: body.property_id || null,
    requested_date: body.requested_date || null, requested_time: body.requested_time || null, duration_hours: duration, quantity,
    quoted_price: price, customer_notes: body.customer_notes || null, ai_notes: body.ai_notes || null,
    source_message_id: sourceMessageId, request_payload: body.request_payload || body, source: 'ai_agent',
    reserved_purchase_ref: `PUR-${queueId.replaceAll('-', '').slice(0, 9).toUpperCase()}`,
    customer_name: body.customer_name || null, customer_email: body.customer_email || null, customer_phone: body.customer_phone || null,
    service_name: body.service_name || null, property_snapshot: body.property_snapshot || null,
    notification_type: body.customer_email ? 'pending_acknowledgement' : null, notification_status: body.customer_email ? 'pending' : 'not_applicable',
  };
  const { data, error } = await supabase.from('purchase_queue').insert(row).select('queue_id,lifecycle_status,reserved_purchase_ref').single();
  if (error?.code === '23505') {
    const { data: duplicate } = await supabase.from('purchase_queue').select('queue_id,lifecycle_status,reserved_purchase_ref').eq('source','ai_agent').eq('source_message_id',sourceMessageId).single();
    return reply({ data: duplicate, duplicate: true });
  }
  if (error) return reply({ error: error.message }, 400);
  if (body.customer_email) {
    const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
      body: { record: {
        purchase_ref_id: data.reserved_purchase_ref,
        name: body.customer_name,
        email: body.customer_email,
        user_phone: body.customer_phone,
        product_name: body.service_name,
        paid_amount: price,
        booking_date: body.requested_date,
        booking_start_time: body.requested_time,
        address: body.property_snapshot,
        hours: duration,
        cleaners: quantity,
        notification_type: 'pending',
      } },
    });
    await supabase.from('purchase_queue').update({
      notification_status: emailError ? 'failed' : 'sent',
      notification_error: emailError?.message || null,
      notification_sent_at: emailError ? null : new Date().toISOString(),
    }).eq('queue_id', data.queue_id);
  }
  return reply({ data, duplicate: false }, 201);
});
