export type VehicleOperationalStatus = 'Active' | 'Maintenance' | 'Out of Service' | 'Archived';

export interface VehicleDriver {
  id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
}

export interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  image_url: string | null;
  image_signed_url?: string | null;
  assigned_driver_id: string | null;
  assigned_driver?: VehicleDriver | null;
  operational_status: VehicleOperationalStatus;
  traccar_device_id: number | null;
  traccar_unique_id: string | null;
  total_jobs_completed: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleFormInput {
  name: string;
  plate_number: string;
  assigned_driver_id: string | null;
  operational_status: VehicleOperationalStatus;
  traccar_device_id: number | null;
  traccar_unique_id: string | null;
}

export interface VehicleDriverAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface VehicleServiceAttachment {
  id: string;
  service_log_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  file_size: number | null;
  signed_url?: string | null;
}

export interface VehicleFile {
  id: string;
  vehicle_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  signed_url?: string | null;
}

export interface VehicleServiceLog {
  id: string;
  vehicle_id: string;
  service_date: string;
  description: string;
  cost: number;
  odometer_reading: number | null;
  logged_by_employee_id: string | null;
  logged_by?: VehicleDriver | null;
  created_at: string;
  updated_at: string;
  attachments: VehicleServiceAttachment[];
}

export interface VehicleServiceLogInput {
  service_date: string;
  description: string;
  cost: number;
  odometer_reading: number | null;
  logged_by_employee_id: string | null;
}

export interface VehicleLocationMetric {
  location: string;
  job_count: number;
}

export interface VehicleLatestPosition {
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed_mps: number | null;
  battery_level: number | null;
  is_moving: boolean | null;
  accuracy_m: number | null;
}

export interface VehicleRoutePoint {
  latitude: number;
  longitude: number;
  recorded_at: string;
  is_moving: boolean | null;
}

export interface VehicleRoute {
  points: VehicleRoutePoint[];
  distance_km: number;
  started_at: string | null;
  ended_at: string | null;
  total_points: number;
}

export interface VehicleTelemetrySummary {
  completed_jobs: number;
  total_jobs_completed: number;
  locations: VehicleLocationMetric[];
  distance_km: number;
  all_time_distance_km: number;
  working_minutes: number;
  waiting_minutes: number;
  last_synced_at: string | null;
  device_status: string | null;
  latest_position: VehicleLatestPosition | null;
  route: VehicleRoute;
}

export interface TraccarDeviceOption {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
}

export interface VehicleDashboardCapabilities {
  canViewPerformance: boolean;
  canManageVehicles: boolean;
  canManageServiceLogs: boolean;
}
