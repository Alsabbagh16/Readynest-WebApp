import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

type Trip = { startTime?: string; distance?: number; duration?: number };
type Stop = { startTime?: string; duration?: number };
type Device = { id: number; name: string; uniqueId: string; status?: string };
const dateKey = (value: string | undefined, fallback: string) => {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback.slice(0, 10) : date.toISOString().slice(0, 10);
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const baseUrl = Deno.env.get('TRACCAR_BASE_URL')?.replace(/\/$/, '');
    const token = Deno.env.get('TRACCAR_API_TOKEN');
    const cronSecret = Deno.env.get('VEHICLE_TELEMETRY_CRON_SECRET');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error('Supabase environment is not configured.');
    if (!baseUrl || !token) return json({ error: 'Traccar is not connected. Configure TRACCAR_BASE_URL and TRACCAR_API_TOKEN.' }, 503);

    const body = await request.json().catch(() => ({}));
    const isCron = Boolean(cronSecret && request.headers.get('x-cron-secret') === cronSecret);
    if (!isCron) {
      const authorization = request.headers.get('Authorization');
      if (!authorization) return json({ error: 'Authentication required.' }, 401);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
      });
      const { data: allowed } = await userClient.rpc('has_vehicle_logistics_permission', {
        p_permission: 'vehicle_logistics.vehicles.manage', p_allow_legacy_admin: false,
      });
      if (allowed !== true) return json({ error: 'Vehicle management permission required.' }, 403);
    }

    const traccarFetch = async <T>(path: string): Promise<T> => {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Traccar request failed (${response.status}).`);
      return response.json() as Promise<T>;
    };

    if (body.action === 'list_devices') {
      const devices = await traccarFetch<Device[]>('/api/devices');
      return json({ devices: devices.map(({ id, name, uniqueId, status }) => ({ id, name, uniqueId, status: status || 'unknown' })) });
    }

    const now = new Date();
    const from = new Date(body.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    const to = new Date(body.to || now.toISOString());
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return json({ error: 'Invalid telemetry date range.' }, 400);
    if (to.getTime() - from.getTime() > 366 * 86400000) return json({ error: 'Telemetry synchronization is limited to 366 days.' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    let query = admin.from('vehicles').select('id, traccar_device_id').not('traccar_device_id', 'is', null);
    query = body.vehicle_id ? query.eq('id', body.vehicle_id) : query.neq('operational_status', 'Archived');
    const { data: vehicles, error: vehicleError } = await query;
    if (vehicleError) throw vehicleError;
    if (!vehicles?.length) return json({ synchronized: 0, message: 'No mapped Traccar devices found.' });

    const results: Array<{ vehicle_id: string; success: boolean; error?: string }> = [];
    for (const vehicle of vehicles) {
      try {
        const reportQuery = `deviceId=${vehicle.traccar_device_id}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
        const [device, trips, stops] = await Promise.all([
          traccarFetch<Device>(`/api/devices/${vehicle.traccar_device_id}`),
          traccarFetch<Trip[]>(`/api/reports/trips?${reportQuery}`),
          traccarFetch<Stop[]>(`/api/reports/stops?${reportQuery}`),
        ]);
        const daily = new Map<string, { distance_km: number; working_minutes: number; waiting_minutes: number }>();
        const ensure = (day: string) => {
          if (!daily.has(day)) daily.set(day, { distance_km: 0, working_minutes: 0, waiting_minutes: 0 });
          return daily.get(day)!;
        };
        for (const trip of trips || []) {
          const row = ensure(dateKey(trip.startTime, from.toISOString()));
          row.distance_km += Math.max(Number(trip.distance || 0) / 1000, 0);
          row.working_minutes += Math.max(Number(trip.duration || 0) / 60000, 0);
        }
        for (const stop of stops || []) {
          ensure(dateKey(stop.startTime, from.toISOString())).waiting_minutes += Math.max(Number(stop.duration || 0) / 60000, 0);
        }
        if (!daily.size) ensure(to.toISOString().slice(0, 10));
        const rows = [...daily.entries()].map(([telemetry_date, values]) => ({
          vehicle_id: vehicle.id, telemetry_date, ...values,
          device_status: device.status || 'unknown', synced_at: new Date().toISOString(), sync_error: null,
        }));
        const { error } = await admin.from('vehicle_telemetry_daily').upsert(rows, { onConflict: 'vehicle_id,telemetry_date' });
        if (error) throw error;
        results.push({ vehicle_id: vehicle.id, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Traccar error.';
        await admin.from('vehicle_telemetry_daily').upsert({
          vehicle_id: vehicle.id, telemetry_date: to.toISOString().slice(0, 10),
          synced_at: new Date().toISOString(), sync_error: message,
        }, { onConflict: 'vehicle_id,telemetry_date' });
        results.push({ vehicle_id: vehicle.id, success: false, error: message });
      }
    }
    return json({ synchronized: results.filter((result) => result.success).length, results });
  } catch (error) {
    console.error('Vehicle telemetry synchronization failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500);
  }
});
