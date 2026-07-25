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

type RoutePoint = {
  latitude: number;
  longitude: number;
  recorded_at: string;
  is_moving: boolean | null;
};

type SnappedPoint = {
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

const SPARSE_PATH_MESSAGE = 'Input path is too sparse';

const haversineKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const sampled = <T>(items: T[], maxItems: number) => {
  if (items.length <= maxItems) return items;
  const step = (items.length - 1) / (maxItems - 1);
  return Array.from({ length: maxItems }, (_, index) => items[Math.round(index * step)]);
};

const chunksWithOverlap = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size - 1) {
    const chunk = items.slice(index, index + size);
    if (chunk.length >= 2) chunks.push(chunk);
    if (index + size >= items.length) break;
  }
  return chunks;
};

const calculateDistance = (points: RoutePoint[]) => points.reduce((sum, point, index) => (
  index === 0 ? 0 : sum + haversineKm(points[index - 1], point)
), 0);

const isSparsePathError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes(SPARSE_PATH_MESSAGE.toLowerCase())
    || normalized.includes('path is too sparse')
    || normalized.includes('too sparse')
    || normalized.includes('consecutive points are closer');
};

const movementPins = (points: RoutePoint[]) => {
  const moving = points.filter((point) => point.is_moving === true);
  if (moving.length) return sampled(moving, 80);

  const spaced: RoutePoint[] = [];
  for (const point of points) {
    const previous = spaced[spaced.length - 1];
    if (!previous || haversineKm(previous, point) >= 0.02) spaced.push(point);
  }
  return sampled(spaced.length ? spaced : points, 80);
};

const sparsePinsResponse = (points: RoutePoint[], reason: string, status = 200) => json({
  points: movementPins(points),
  distance_km: calculateDistance(points),
  warning: 'Road route unavailable because GPS points are too far apart. Showing last moved locations.',
  fallback_reason: reason,
  mode: 'sparse_pins',
  source: 'google_roads',
}, status);

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const googleKey = Deno.env.get('GOOGLE_MAPS_ROADS_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'Supabase environment is not configured.' }, 500);
    if (!googleKey) return json({ error: 'Google Roads API key is not configured.' }, 503);

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

    const body = await request.json().catch(() => ({}));
    const vehicleId = String(body.vehicle_id || '').trim();
    const from = new Date(body.from);
    const to = new Date(body.to);
    if (!vehicleId) return json({ error: 'vehicle_id is required.' }, 400);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return json({ error: 'Invalid route date range.' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: rawPoints, error: pointsError } = await admin
      .from('vehicle_telemetry_positions')
      .select('latitude, longitude, recorded_at, is_moving')
      .eq('vehicle_id', vehicleId)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString())
      .order('recorded_at', { ascending: true });
    if (pointsError) throw pointsError;

    const points = (rawPoints || [])
      .map((point: Record<string, unknown>) => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        recorded_at: String(point.recorded_at),
        is_moving: typeof point.is_moving === 'boolean' ? point.is_moving : null,
      }))
      .filter((point: RoutePoint) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

    if (points.length < 2) {
      return json({
        points,
        distance_km: 0,
        warning: points.length ? 'At least two points are needed for road snapping.' : null,
        fallback_reason: points.length ? 'Only one GPS point is available.' : null,
        mode: 'haversine_fallback',
        source: 'google_roads',
      });
    }

    const sourcePoints = sampled(points, 1000);
    const snapped: RoutePoint[] = [];
    let warning: string | null = null;

    for (const chunk of chunksWithOverlap(sourcePoints, 100)) {
      const path = chunk.map((point) => `${point.latitude},${point.longitude}`).join('|');
      const url = new URL('https://roads.googleapis.com/v1/snapToRoads');
      url.searchParams.set('interpolate', 'true');
      url.searchParams.set('path', path);
      url.searchParams.set('key', googleKey);
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error?.message || `Google Roads API failed (${response.status}).`;
        if (isSparsePathError(message)) return sparsePinsResponse(points, message);
        return json({ error: message }, response.status);
      }
      if (data?.error?.message && isSparsePathError(data.error.message)) return sparsePinsResponse(points, data.error.message);
      if (data.warningMessage && isSparsePathError(String(data.warningMessage))) return sparsePinsResponse(points, String(data.warningMessage));
      if (data.warningMessage && !warning) warning = data.warningMessage;
      const snappedPoints = Array.isArray(data.snappedPoints) ? data.snappedPoints as SnappedPoint[] : [];
      snappedPoints.forEach((point) => {
        const latitude = Number(point.location?.latitude);
        const longitude = Number(point.location?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const previous = snapped[snapped.length - 1];
        if (previous && previous.latitude === latitude && previous.longitude === longitude) return;
        snapped.push({
          latitude,
          longitude,
          recorded_at: chunk[Math.min(snapped.length, chunk.length - 1)]?.recorded_at || chunk[0].recorded_at,
          is_moving: true,
        });
      });
    }

    const snappedPoints = snapped.length >= 2 ? snapped : sourcePoints;
    return json({
      points: snappedPoints,
      distance_km: calculateDistance(snappedPoints),
      warning: snapped.length >= 2 ? warning : 'Google Roads did not return enough snapped points. Showing Haversine route.',
      fallback_reason: snapped.length >= 2 ? null : 'Insufficient snapped points returned by Google Roads.',
      mode: snapped.length >= 2 ? 'road_snapped' : 'haversine_fallback',
      source: 'google_roads',
    });
  } catch (error) {
    console.error('Vehicle road snapping failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500);
  }
});
