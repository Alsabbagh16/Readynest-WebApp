import { supabase } from '@/lib/supabase';
import type {
  TraccarDeviceOption,
  Vehicle,
  VehicleDriver,
  VehicleFile,
  VehicleFormInput,
  VehicleServiceLog,
  VehicleServiceLogInput,
  VehicleTelemetrySummary,
} from '@/types/vehicleLogistics';

const VEHICLE_MEDIA_BUCKET = 'vehicle-media';
const SERVICE_FILES_BUCKET = 'vehicle-service-files';
const VEHICLE_FILES_BUCKET = 'vehicle-files';

const assertNoError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, assigned_driver:employees!vehicles_assigned_driver_id_fkey(id, full_name, email, position)')
    .order('operational_status')
    .order('name');
  assertNoError(error);

  return Promise.all(((data || []) as Vehicle[]).map(async (vehicle) => {
    if (!vehicle.image_url) return vehicle;
    const { data: signed } = await supabase.storage.from(VEHICLE_MEDIA_BUCKET).createSignedUrl(vehicle.image_url, 3600);
    return { ...vehicle, image_signed_url: signed?.signedUrl || null };
  }));
};

export const fetchEligibleDrivers = async (): Promise<VehicleDriver[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, email, position')
    .order('full_name');
  assertNoError(error);
  return ((data || []) as VehicleDriver[]).filter((employee) => {
    const position = String(employee.position || '').trim().toLowerCase();
    return position === 'driver' || position === 'operation manager';
  });
};

export const saveVehicle = async (input: VehicleFormInput, vehicleId?: string): Promise<Vehicle> => {
  const payload = {
    ...input,
    name: input.name.trim(),
    plate_number: input.plate_number.trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  };
  const query = vehicleId
    ? supabase.from('vehicles').update(payload).eq('id', vehicleId)
    : supabase.from('vehicles').insert(payload);
  const { data, error } = await query.select().single();
  assertNoError(error);
  return data as Vehicle;
};

export const uploadVehicleImage = async (vehicleId: string, file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${vehicleId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(VEHICLE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
    upsert: false,
  });
  assertNoError(error);
  const { error: updateError } = await supabase.from('vehicles').update({ image_url: path }).eq('id', vehicleId);
  assertNoError(updateError);
  return path;
};

export const fetchVehicleMetrics = async (vehicleId: string, from: string, to: string): Promise<VehicleTelemetrySummary> => {
  const [{ data, error }, { data: allTelemetry, error: telemetryError }, { data: latestPosition, error: positionError }, { data: routeData, error: routeError }] = await Promise.all([
    supabase.rpc('get_vehicle_logistics_dashboard', {
      p_vehicle_id: vehicleId,
      p_from: from,
      p_to: to,
    }),
    supabase.from('vehicle_telemetry_daily').select('distance_km').eq('vehicle_id', vehicleId),
    supabase.from('vehicle_telemetry_positions')
      .select('latitude, longitude, recorded_at, speed_mps, battery_level, is_moving, accuracy_m')
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc('get_vehicle_route', {
      p_vehicle_id: vehicleId,
      p_from: from,
      p_to: to,
      p_max_points: 1000,
    }),
  ]);
  assertNoError(error);
  assertNoError(telemetryError);
  assertNoError(positionError);
  assertNoError(routeError);
  const metrics = (data || {}) as Partial<VehicleTelemetrySummary>;
  const route = routeData || {};
  return {
    completed_jobs: Number(metrics.completed_jobs || 0),
    total_jobs_completed: Number(metrics.total_jobs_completed || 0),
    locations: metrics.locations || [],
    distance_km: Number(metrics.distance_km || 0),
    all_time_distance_km: (allTelemetry || []).reduce((sum, row) => sum + Number(row.distance_km || 0), 0),
    working_minutes: Number(metrics.working_minutes || 0),
    waiting_minutes: Number(metrics.waiting_minutes || 0),
    last_synced_at: metrics.last_synced_at || null,
    device_status: metrics.device_status || null,
    latest_position: latestPosition ? {
      ...latestPosition,
      latitude: Number(latestPosition.latitude),
      longitude: Number(latestPosition.longitude),
      speed_mps: latestPosition.speed_mps === null ? null : Number(latestPosition.speed_mps),
      battery_level: latestPosition.battery_level === null ? null : Number(latestPosition.battery_level),
      accuracy_m: latestPosition.accuracy_m === null ? null : Number(latestPosition.accuracy_m),
    } : null,
    route: {
      points: (route.points || []).map((point: any) => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      })),
      distance_km: Number(route.distance_km || 0),
      started_at: route.started_at || null,
      ended_at: route.ended_at || null,
      total_points: Number(route.total_points || 0),
    },
  };
};

export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<VehicleServiceLog[]> => {
  const { data, error } = await supabase
    .from('vehicle_service_logs')
    .select('*, attachments:vehicle_service_attachments(*), logged_by:employees!vehicle_service_logs_logged_by_employee_id_fkey(id, full_name, email, position)')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });
  assertNoError(error);

  return Promise.all(((data || []) as VehicleServiceLog[]).map(async (log) => ({
    ...log,
    attachments: await Promise.all((log.attachments || []).map(async (attachment) => {
      const { data: signed } = await supabase.storage.from(SERVICE_FILES_BUCKET).createSignedUrl(attachment.storage_path, 3600);
      return { ...attachment, signed_url: signed?.signedUrl || null };
    })),
  })));
};

export const saveVehicleServiceLog = async (
  vehicleId: string,
  input: VehicleServiceLogInput,
  logId?: string,
): Promise<VehicleServiceLog> => {
  const payload = { ...input, vehicle_id: vehicleId, updated_at: new Date().toISOString() };
  const query = logId
    ? supabase.from('vehicle_service_logs').update(payload).eq('id', logId)
    : supabase.from('vehicle_service_logs').insert(payload);
  const { data, error } = await query.select().single();
  assertNoError(error);
  return { ...(data as VehicleServiceLog), attachments: [] };
};

export const deleteVehicleServiceLog = async (log: VehicleServiceLog): Promise<void> => {
  const paths = (log.attachments || []).map((attachment) => attachment.storage_path);
  if (paths.length) await supabase.storage.from(SERVICE_FILES_BUCKET).remove(paths);
  const { error } = await supabase.from('vehicle_service_logs').delete().eq('id', log.id);
  assertNoError(error);
};

export const uploadServiceAttachments = async (logId: string, files: File[]): Promise<void> => {
  for (const file of files) {
    const path = `${logId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(SERVICE_FILES_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    assertNoError(uploadError);
    const { error: rowError } = await supabase.from('vehicle_service_attachments').insert({
      service_log_id: logId,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
    });
    if (rowError) {
      await supabase.storage.from(SERVICE_FILES_BUCKET).remove([path]);
      throw new Error(rowError.message);
    }
  }
};

export const fetchVehicleFiles = async (vehicleId: string): Promise<VehicleFile[]> => {
  const { data, error } = await supabase.from('vehicle_files').select('*').eq('vehicle_id', vehicleId).order('created_at', { ascending: false });
  assertNoError(error);
  return Promise.all(((data || []) as VehicleFile[]).map(async (file) => {
    const { data: signed } = await supabase.storage.from(VEHICLE_FILES_BUCKET).createSignedUrl(file.storage_path, 3600);
    return { ...file, signed_url: signed?.signedUrl || null };
  }));
};

export const uploadVehicleFiles = async (vehicleId: string, files: File[]): Promise<void> => {
  for (const file of files) {
    const path = `${vehicleId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(VEHICLE_FILES_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    assertNoError(uploadError);
    const { error: rowError } = await supabase.from('vehicle_files').insert({ vehicle_id: vehicleId, storage_path: path, original_name: file.name, mime_type: file.type || null, file_size: file.size });
    if (rowError) {
      await supabase.storage.from(VEHICLE_FILES_BUCKET).remove([path]);
      throw new Error(rowError.message);
    }
  }
};

export const deleteVehicleFile = async (file: VehicleFile): Promise<void> => {
  const { error: storageError } = await supabase.storage.from(VEHICLE_FILES_BUCKET).remove([file.storage_path]);
  assertNoError(storageError);
  const { error } = await supabase.from('vehicle_files').delete().eq('id', file.id);
  assertNoError(error);
};

export const fetchTraccarDevices = async (): Promise<TraccarDeviceOption[]> => {
  const { data, error } = await supabase.functions.invoke('vehicle-telemetry-sync', {
    body: { action: 'list_devices' },
  });
  assertNoError(error);
  if (data?.error) throw new Error(data.error);
  return data?.devices || [];
};

export const syncVehicleTelemetry = async (vehicleId: string, from: string, to: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('vehicle-telemetry-sync', {
    body: { action: 'sync', vehicle_id: vehicleId, from, to },
  });
  assertNoError(error);
  if (data?.error) throw new Error(data.error);
};

export const saveVehicleAdminNotes = async (vehicleId: string, notes: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc('update_vehicle_admin_notes', {
    p_vehicle_id: vehicleId,
    p_notes: notes,
  });
  assertNoError(error);
  return data ?? null;
};
