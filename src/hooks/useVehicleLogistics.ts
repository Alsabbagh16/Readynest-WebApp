import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchEligibleDrivers,
  fetchVehicleMetrics,
  fetchVehicleFiles,
  fetchVehicleServiceLogs,
  fetchVehicles,
  syncVehicleTelemetry,
} from '@/lib/api/vehicleLogisticsApi';
import type { Vehicle, VehicleDriver, VehicleFile, VehicleServiceLog, VehicleTelemetrySummary } from '@/types/vehicleLogistics';

const emptyMetrics: VehicleTelemetrySummary = {
  completed_jobs: 0,
  total_jobs_completed: 0,
  locations: [],
  distance_km: 0,
  all_time_distance_km: 0,
  working_minutes: 0,
  waiting_minutes: 0,
  last_synced_at: null,
  device_status: null,
};

const monthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
};

export const useVehicleLogistics = (canViewPerformance: boolean) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<VehicleDriver[]>([]);
  const [serviceLogs, setServiceLogs] = useState<VehicleServiceLog[]>([]);
  const [vehicleFiles, setVehicleFiles] = useState<VehicleFile[]>([]);
  const [metrics, setMetrics] = useState<VehicleTelemetrySummary>(emptyMetrics);
  const [range, setRange] = useState(monthRange);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const requestId = useRef(0);
  const activeVehicleId = searchParams.get('vehicle');
  const activeVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === activeVehicleId) || vehicles[0] || null,
    [activeVehicleId, vehicles],
  );

  const selectVehicle = useCallback((vehicleId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('vehicle', vehicleId);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadFleet = useCallback(async () => {
    setLoadingFleet(true);
    try {
      const [fleet, eligibleDrivers] = await Promise.all([fetchVehicles(), fetchEligibleDrivers()]);
      setVehicles(fleet);
      setDrivers(eligibleDrivers);
      if (fleet.length && !fleet.some((vehicle) => vehicle.id === activeVehicleId)) selectVehicle(fleet[0].id);
    } catch (error) {
      toast({ title: 'Unable to Load Fleet', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoadingFleet(false);
    }
  }, [activeVehicleId, selectVehicle, toast]);

  const loadDetails = useCallback(async () => {
    if (!activeVehicle) return;
    const currentRequest = ++requestId.current;
    setLoadingDetails(true);
    try {
      const [logs, files, dashboardMetrics] = await Promise.all([
        fetchVehicleServiceLogs(activeVehicle.id),
        fetchVehicleFiles(activeVehicle.id),
        canViewPerformance ? fetchVehicleMetrics(activeVehicle.id, range.from, range.to) : Promise.resolve(emptyMetrics),
      ]);
      if (currentRequest !== requestId.current) return;
      setServiceLogs(logs);
      setVehicleFiles(files);
      setMetrics(dashboardMetrics);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      toast({ title: 'Unable to Load Vehicle', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      if (currentRequest === requestId.current) setLoadingDetails(false);
    }
  }, [activeVehicle, canViewPerformance, range.from, range.to, toast]);

  useEffect(() => { loadFleet(); }, [loadFleet]);
  useEffect(() => { loadDetails(); }, [loadDetails]);

  const refreshTelemetry = useCallback(async () => {
    if (!activeVehicle) return;
    setSyncing(true);
    try {
      await syncVehicleTelemetry(activeVehicle.id, range.from, range.to);
      await loadDetails();
      toast({ title: 'Telemetry Updated', description: `${activeVehicle.name} has been synchronized with Traccar.` });
    } catch (error) {
      toast({ title: 'Telemetry Sync Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [activeVehicle, loadDetails, range.from, range.to, toast]);

  return {
    vehicles, drivers, activeVehicle, activeVehicleId: activeVehicle?.id || null, selectVehicle,
    serviceLogs, vehicleFiles, metrics, range, setRange, loadingFleet, loadingDetails, syncing,
    loadFleet, loadDetails, refreshTelemetry,
  };
};
