import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const googleMapsKey = Deno.env.get('GOOGLE_MAPS_BROWSER_API_KEY')
      || Deno.env.get('GOOGLE_MAPS_ROADS_API_KEY')
      || Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!supabaseUrl || !anonKey) return json({ error: 'Supabase environment is not configured.' }, 500);
    if (!googleMapsKey) return json({ error: 'Google Maps API key is not configured.' }, 503);

    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required.' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: allowed, error: permissionError } = await userClient.rpc('has_vehicle_logistics_permission', {
      p_permission: 'vehicle_logistics.performance.view',
      p_allow_legacy_admin: false,
    });
    if (permissionError) throw permissionError;
    if (allowed !== true) return json({ error: 'Vehicle performance permission required.' }, 403);

    return json({ api_key: googleMapsKey });
  } catch (error) {
    console.error('Vehicle maps config failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500);
  }
});
