import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nonNegativeOrNull = (value: unknown): number | null => {
  const parsed = numberOrNull(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};

const booleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return null;
};

const toTimestamp = (value: unknown): string => {
  if (typeof value === 'number' || /^\d+$/.test(String(value || ''))) {
    const numeric = Number(value);
    const date = new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const date = new Date(String(value || Date.now()));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const haversineKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const bahrainDayBounds = (timestamp: string) => {
  const bahrainOffsetMs = 3 * 60 * 60 * 1000;
  const localDate = new Date(new Date(timestamp).getTime() + bahrainOffsetMs).toISOString().slice(0, 10);
  const startMs = Date.parse(`${localDate}T00:00:00.000Z`) - bahrainOffsetMs;
  return { day: localDate, start: new Date(startMs).toISOString(), end: new Date(startMs + 86400000).toISOString() };
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Supabase environment is not configured.' }, 500);

    const url = new URL(request.url);
    const expectedSecret = Deno.env.get('VEHICLE_INGEST_SECRET');
    if (expectedSecret && url.searchParams.get('key') !== expectedSecret) return json({ error: 'Invalid ingestion key.' }, 401);

    const contentType = request.headers.get('content-type') || '';
    let payload: Record<string, any> = {};
    if (request.method === 'POST' && contentType.includes('application/json')) {
      payload = await request.json().catch(() => ({}));
    } else if (request.method === 'POST') {
      const form = await request.formData().catch(() => null);
      if (form) payload = Object.fromEntries(form.entries());
    }
    for (const [key, value] of url.searchParams.entries()) if (key !== 'key') payload[key] = value;

    const location = payload.location || {};
    const coords = location.coords || {};
    const deviceIdentifier = String(payload.device_id || payload.deviceId || payload.deviceid || payload.id || '').trim();
    const latitude = numberOrNull(coords.latitude ?? payload.lat ?? payload.latitude);
    const longitude = numberOrNull(coords.longitude ?? payload.lon ?? payload.lng ?? payload.longitude);
    if (!deviceIdentifier) return json({ error: 'Device identifier is required.' }, 400);
    if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return json({ error: 'Valid latitude and longitude are required.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: matchingVehicles, error: vehicleError } = await admin
      .from('vehicles')
      .select('id, name')
      .eq('traccar_unique_id', deviceIdentifier)
      .limit(2);
    if (vehicleError) throw vehicleError;
    if (!matchingVehicles?.length) return json({ error: 'Device is not mapped to a ReadyNest vehicle.' }, 404);
    if (matchingVehicles.length > 1) return json({ error: 'Device identifier is mapped to multiple vehicles.' }, 409);

    const recordedAt = toTimestamp(location.timestamp ?? payload.timestamp ?? payload.time);
    const rawBatteryLevel = nonNegativeOrNull(location.battery?.level ?? payload.battery ?? payload.batt);
    const batteryLevel = rawBatteryLevel === null ? null : rawBatteryLevel > 1 ? rawBatteryLevel / 100 : rawBatteryLevel;
    const rawSpeed = nonNegativeOrNull(coords.speed ?? payload.speed);
    const speedMps = rawSpeed === null
      ? null
      : coords.speed !== undefined
        ? rawSpeed
        : String(payload.speedUnit || payload.speed_unit || '').toLowerCase() === 'kmh'
          ? rawSpeed / 3.6
          : rawSpeed * 0.514444;
    const position = {
      vehicle_id: matchingVehicles[0].id,
      device_identifier: deviceIdentifier,
      recorded_at: recordedAt,
      latitude,
      longitude,
      accuracy_m: nonNegativeOrNull(coords.accuracy ?? payload.accuracy),
      speed_mps: speedMps,
      heading: numberOrNull(coords.heading ?? payload.heading ?? payload.bearing),
      altitude_m: numberOrNull(coords.altitude ?? payload.altitude),
      is_moving: booleanOrNull(location.is_moving ?? payload.is_moving ?? payload.moving),
      odometer_m: nonNegativeOrNull(location.odometer ?? payload.odometer),
      battery_level: batteryLevel === null ? null : Math.min(Math.max(batteryLevel, 0), 1),
      battery_charging: booleanOrNull(location.battery?.is_charging ?? payload.charge),
      activity_type: location.activity?.type || payload.activity || null,
      event_type: location.event || payload.event || null,
      raw_payload: payload,
    };

    const { error: insertError } = await admin.from('vehicle_telemetry_positions').upsert(position, {
      onConflict: 'vehicle_id,recorded_at,latitude,longitude',
      ignoreDuplicates: true,
    });
    if (insertError) throw insertError;

    const { day, start: dayStart, end: dayEnd } = bahrainDayBounds(recordedAt);
    const { data: points, error: pointsError } = await admin
      .from('vehicle_telemetry_positions')
      .select('id, latitude, longitude, recorded_at, is_moving, distance_delta_km')
      .eq('vehicle_id', matchingVehicles[0].id)
      .gte('recorded_at', dayStart)
      .lt('recorded_at', dayEnd)
      .order('recorded_at');
    if (pointsError) throw pointsError;

    let distanceKm = 0;
    let workingMinutes = 0;
    let waitingMinutes = 0;
    const distanceUpdates: Array<{ id: string; distance_delta_km: number }> = [];
    for (let index = 0; index < (points || []).length; index += 1) {
      const current = points![index];
      let distanceDeltaKm = 0;
      if (index === 0) {
        distanceUpdates.push({ id: current.id, distance_delta_km: 0 });
        continue;
      }
      const previous = points![index - 1];
      const elapsedMinutes = (new Date(current.recorded_at).getTime() - new Date(previous.recorded_at).getTime()) / 60000;
      if (elapsedMinutes <= 0) {
        distanceUpdates.push({ id: current.id, distance_delta_km: 0 });
        continue;
      }
      const segmentKm = haversineKm(previous, current);
      const speedKph = segmentKm / (elapsedMinutes / 60);
      if (segmentKm >= 0.02 && speedKph <= 200) distanceDeltaKm = segmentKm;
      distanceKm += distanceDeltaKm;
      distanceUpdates.push({ id: current.id, distance_delta_km: distanceDeltaKm });
      const accountableMinutes = Math.min(elapsedMinutes, 30);
      if (previous.is_moving === true) workingMinutes += accountableMinutes;
      else if (previous.is_moving === false) waitingMinutes += accountableMinutes;
    }
    const updateResults = await Promise.all(distanceUpdates.map((update) => admin
      .from('vehicle_telemetry_positions')
      .update({ distance_delta_km: update.distance_delta_km })
      .eq('id', update.id)));
    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) throw failedUpdate.error;
    const latest = points?.at(-1) || position;
    const { error: dailyError } = await admin.from('vehicle_telemetry_daily').upsert({
      vehicle_id: matchingVehicles[0].id,
      telemetry_date: day,
      distance_km: distanceKm,
      working_minutes: workingMinutes,
      waiting_minutes: waitingMinutes,
      device_status: 'online',
      latitude: latest.latitude,
      longitude: latest.longitude,
      last_position_at: latest.recorded_at,
      synced_at: new Date().toISOString(),
      sync_error: null,
    }, { onConflict: 'vehicle_id,telemetry_date' });
    if (dailyError) throw dailyError;

    return json({ success: true, vehicle_id: matchingVehicles[0].id, recorded_at: recordedAt });
  } catch (error) {
    console.error('Vehicle location ingestion failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500);
  }
});
