import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

Deno.serve(async (request: Request) => {
  try {
    const configuredSecret = Deno.env.get('SUBSCRIPTION_CRON_SECRET');
    if (configuredSecret && request.headers.get('x-cron-secret') !== configuredSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service environment is not configured.');

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.rpc('refresh_subscription_health');
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, subscriptions_checked: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Subscription health refresh failed:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
