import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Supabase environment is not configured.' }, 500);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const url = new URL(request.url);
    const route = url.pathname
      .replace(/^\/functions\/v1\/subscriptions-api/, '')
      .replace(/^\/subscriptions-api/, '')
      .replace(/^\/api/, '');

    if (request.method === 'GET' && route === '/subscriptions') {
      const { error: refreshError } = await supabase.rpc('refresh_subscription_health_for_dashboard');
      if (refreshError) throw refreshError;
      const { data, error } = await supabase.rpc('get_subscription_dashboard');
      if (error) throw error;
      return json({ data });
    }

    if (request.method === 'GET' && route === '/subscriptions/churn-risk') {
      const { data, error } = await supabase.rpc('get_subscription_churn_risk');
      if (error) throw error;
      return json({ data });
    }

    if (request.method === 'POST' && route === '/subscriptions/follow-up') {
      const body = await request.json();
      if (!body.client_id) return json({ error: 'client_id is required.' }, 400);

      const { data, error } = await supabase.rpc('log_subscription_follow_up', {
        p_client_id: body.client_id,
        p_channel: body.channel || 'whatsapp',
      });
      if (error) throw error;
      return json({ data: data?.[0] || null }, 201);
    }

    return json({ error: 'Route not found.' }, 404);
  } catch (error) {
    console.error('Subscription API error:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500);
  }
});
