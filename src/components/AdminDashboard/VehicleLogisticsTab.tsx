// @ts-nocheck -- Legacy JavaScript UI primitives do not expose TypeScript prop declarations.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, CalendarRange, CarFront, ChevronLeft, ChevronRight, Edit3, ExternalLink,
  FileText, Gauge, Loader2, MapPin, MoreHorizontal, Paperclip, Plus, RefreshCw,
  Search, Timer, Trash2, Truck, UploadCloud, User, Wrench, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useToast } from '@/components/ui/use-toast';
import { useVehicleLogistics } from '@/hooks/useVehicleLogistics';
import { VehicleLocationMap } from '@/components/AdminDashboard/VehicleLocationMap';
import {
  deleteVehicleFile, deleteVehicleServiceLog, fetchTraccarDevices, saveVehicle, saveVehicleAdminNotes, saveVehicleServiceLog,
  uploadServiceAttachments, uploadVehicleFiles, uploadVehicleImage,
} from '@/lib/api/vehicleLogisticsApi';
import type {
  TraccarDeviceOption, Vehicle, VehicleDriver, VehicleFile, VehicleFormInput, VehicleOperationalStatus,
  VehicleServiceLog, VehicleServiceLogInput, VehicleTelemetrySummary,
} from '@/types/vehicleLogistics';

const statusClass: Record<VehicleOperationalStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
  'Out of Service': 'bg-rose-50 text-rose-700 border-rose-200',
  Archived: 'bg-slate-100 text-slate-600 border-slate-200',
};
const formatNumber = (value: number, digits = 1) => new Intl.NumberFormat('en-BH', {
  maximumFractionDigits: digits,
}).format(Number(value || 0));
const formatDuration = (minutes: number) => `${formatNumber(minutes / 60, 1)} hr`;
const formatFileSize = (bytes?: number | null) => bytes ? `${formatNumber(bytes / 1024 / 1024, 2)} MB` : 'Unknown size';
const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-BH', { dateStyle: 'medium' }).format(new Date(value))
  : 'Not available';

const FleetPanel = ({ vehicles, activeId, collapsed, mobileOpen, onCollapse, onMobileClose, onSelect, onAdd, canManage }: {
  vehicles: Vehicle[]; activeId: string | null; collapsed: boolean; mobileOpen: boolean;
  onCollapse: () => void; onMobileClose: () => void; onSelect: (id: string) => void; onAdd: () => void; canManage: boolean;
}) => (
  <aside className={`${collapsed ? 'lg:w-[76px]' : 'lg:w-[300px]'} hidden h-[180px] max-h-[180px] shrink-0 flex-col overflow-hidden border border-slate-100 bg-white shadow-sm transition-[width] duration-200 lg:sticky lg:top-4 lg:flex`}>
    <div className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-100 ${collapsed ? 'px-2' : 'px-4'}`}>
      {!collapsed && <div><p className="text-sm font-bold text-slate-900">Fleet Control</p><p className="text-xs text-slate-400">{vehicles.length} vehicles</p></div>}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onCollapse} title={collapsed ? 'Expand fleet' : 'Collapse fleet'}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
    <div className="flex-1 space-y-1 overflow-y-auto p-2">
      {canManage && (collapsed
        ? <Button variant="ghost" size="icon" className="mb-1 w-full" onClick={onAdd} title="Add New Vehicle"><Plus className="h-4 w-4" /></Button>
        : <Button variant="outline" className="mb-2 w-full justify-center" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add New Vehicle</Button>)}
      {vehicles.map((vehicle) => {
        const selected = activeId === vehicle.id;
        return <button key={vehicle.id} type="button" onClick={() => { onSelect(vehicle.id); onMobileClose(); }}
          className={`flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors ${selected ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md ${selected ? 'bg-white/15' : 'bg-slate-100'}`}>
            {vehicle.image_signed_url ? <img src={vehicle.image_signed_url} alt="" className="h-10 w-10 object-cover" /> : <Truck className="h-5 w-5" />}
          </div>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{vehicle.name}</p><p className={`truncate text-xs ${selected ? 'text-blue-100' : 'text-slate-400'}`}>{vehicle.plate_number}</p><p className={`mt-0.5 truncate text-[10px] ${selected ? 'text-white' : 'text-slate-500'}`}>{vehicle.operational_status} · {vehicle.assigned_driver?.full_name || 'No driver assigned'}</p></div>}
        </button>;
      })}
    </div>
  </aside>
);

const VehicleFormDialog = ({ open, vehicle, drivers, onOpenChange, onSaved }: {
  open: boolean; vehicle: Vehicle | null; drivers: VehicleDriver[]; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void>;
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [devices, setDevices] = useState<TraccarDeviceOption[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const [form, setForm] = useState<VehicleFormInput>({ name: '', plate_number: '', assigned_driver_id: null, operational_status: 'Active', traccar_device_id: null, traccar_unique_id: null });
  useEffect(() => {
    if (!open) return;
    setForm(vehicle ? {
      name: vehicle.name, plate_number: vehicle.plate_number, assigned_driver_id: vehicle.assigned_driver_id,
      operational_status: vehicle.operational_status, traccar_device_id: vehicle.traccar_device_id, traccar_unique_id: vehicle.traccar_unique_id,
    } : { name: '', plate_number: '', assigned_driver_id: null, operational_status: 'Active', traccar_device_id: null, traccar_unique_id: null });
    setImage(null); setDeviceError('');
    fetchTraccarDevices().then(setDevices).catch((error) => setDeviceError(error instanceof Error ? error.message : 'Traccar unavailable'));
  }, [open, vehicle]);
  const filteredDevices = devices.filter((device) => `${device.name} ${device.uniqueId} ${device.id}`.toLowerCase().includes(deviceSearch.toLowerCase()));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.plate_number.trim()) return;
    setSaving(true);
    try {
      const saved = await saveVehicle(form, vehicle?.id);
      if (image) await uploadVehicleImage(saved.id, image);
      await onSaved(); onOpenChange(false);
      toast({ title: vehicle ? 'Vehicle Updated' : 'Vehicle Added', description: `${saved.name} is ready in Fleet Control.` });
    } catch (error) { toast({ title: 'Unable to Save Vehicle', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="left-auto right-0 top-0 h-screen max-w-xl translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:rounded-none">
    <DialogHeader><DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle><DialogDescription>Fleet identity, driver assignment, and Traccar mapping.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Van 01" required /></div><div><Label>Plate Number</Label><Input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Active Driver</Label><Select value={form.assigned_driver_id || '__none__'} onValueChange={(value) => setForm({ ...form, assigned_driver_id: value === '__none__' ? null : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Unassigned</SelectItem>{drivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.full_name || driver.email}</SelectItem>)}</SelectContent></Select></div><div><Label>Operational Status</Label><Select value={form.operational_status} onValueChange={(value) => setForm({ ...form, operational_status: value as VehicleOperationalStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(statusClass).map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div></div>
      <div><Label>Vehicle Image</Label><label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500 hover:bg-slate-50"><UploadCloud className="h-5 w-5" />{image?.name || 'Choose a high-resolution vehicle image'}<input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label></div>
      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4"><div><Label>Find Traccar Device</Label><div className="relative mt-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} className="pl-9" placeholder="Search name, unique ID, or device ID" /></div></div>{filteredDevices.length > 0 && <Select value={form.traccar_device_id ? String(form.traccar_device_id) : '__none__'} onValueChange={(value) => { const device = devices.find((item) => String(item.id) === value); setForm({ ...form, traccar_device_id: device?.id || null, traccar_unique_id: device?.uniqueId || null }); }}><SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger><SelectContent><SelectItem value="__none__">No device</SelectItem>{filteredDevices.map((device) => <SelectItem key={device.id} value={String(device.id)}>{device.name} - {device.uniqueId} ({device.id})</SelectItem>)}</SelectContent></Select>}{deviceError && <p className="text-xs text-amber-700">{deviceError}</p>}<div><Label>Phone Device Identifier</Label><Input value={form.traccar_unique_id || ''} onChange={(e) => setForm({ ...form, traccar_unique_id: e.target.value.trim() || null })} placeholder="Match the identifier shown in Traccar Client" /></div><div><Label>Manual Traccar Server Device ID <span className="font-normal text-slate-400">(optional)</span></Label><Input type="number" value={form.traccar_device_id || ''} onChange={(e) => setForm({ ...form, traccar_device_id: e.target.value ? Number(e.target.value) : null })} placeholder="Only needed with a Traccar server" /></div></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{vehicle ? 'Save Changes' : 'Add Vehicle'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
};

const ServiceLogDialog = ({ open, vehicleId, log, drivers, onOpenChange, onSaved }: {
  open: boolean; vehicleId: string; log: VehicleServiceLog | null; drivers: VehicleDriver[];
  onOpenChange: (open: boolean) => void; onSaved: () => Promise<void>;
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState<VehicleServiceLogInput>({
    service_date: new Date().toISOString().slice(0, 10), description: '', cost: 0,
    odometer_reading: null, logged_by_employee_id: null,
  });

  useEffect(() => {
    if (!open) return;
    setForm(log ? {
      service_date: log.service_date,
      description: log.description,
      cost: Number(log.cost),
      odometer_reading: log.odometer_reading === null ? null : Number(log.odometer_reading),
      logged_by_employee_id: log.logged_by_employee_id,
    } : {
      service_date: new Date().toISOString().slice(0, 10), description: '', cost: 0,
      odometer_reading: null, logged_by_employee_id: null,
    });
    setFiles([]);
  }, [log, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.logged_by_employee_id) {
      toast({ title: 'Logged By Required', description: 'Choose the Driver or Operation Manager who logged this service.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveVehicleServiceLog(vehicleId, form, log?.id);
      if (files.length) await uploadServiceAttachments(saved.id, files);
      await onSaved();
      onOpenChange(false);
      toast({ title: log ? 'Service Log Updated' : 'Service Logged' });
    } catch (error) {
      toast({ title: 'Unable to Save Service', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>{log ? 'Edit Service Log' : 'Add Service Log'}</DialogTitle><DialogDescription>Maintenance history remains attached to this vehicle.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Service Date</Label><Input type="date" value={form.service_date} onChange={(event) => setForm({ ...form, service_date: event.target.value })} required /></div>
        <div><Label>Description</Label><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></div>
        <div><Label>Logged By</Label><Select value={form.logged_by_employee_id || '__none__'} onValueChange={(value) => setForm({ ...form, logged_by_employee_id: value === '__none__' ? null : value })}><SelectTrigger><SelectValue placeholder="Choose Driver or Operation Manager" /></SelectTrigger><SelectContent><SelectItem value="__none__">Choose a team member</SelectItem>{drivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.full_name || driver.email} - {driver.position}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4"><div><Label>Odometer (KM)</Label><Input type="number" min="0" step="0.01" value={form.odometer_reading ?? ''} onChange={(event) => setForm({ ...form, odometer_reading: event.target.value ? Number(event.target.value) : null })} /></div><div><Label>Cost (BD)</Label><Input type="number" min="0" step="0.001" value={form.cost} onChange={(event) => setForm({ ...form, cost: Number(event.target.value) })} required /></div></div>
        <div><Label>Attachments</Label><Input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} /><p className="mt-1 text-xs text-slate-400">{files.length ? `${files.length} file(s) selected` : 'Optional invoices, receipts, or certificates'}</p></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Log</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
};
const PerformanceGrid = ({ metrics, routeViewKey }: { metrics: VehicleTelemetrySummary; routeViewKey: string }) => {
  const totalJobs = Math.max(metrics.locations.reduce((sum, item) => sum + Number(item.job_count), 0), 1);
  const totalTime = metrics.working_minutes + metrics.waiting_minutes;
  const utilization = totalTime ? (metrics.working_minutes / totalTime) * 100 : 0;
  const diagnosticMetrics = [
    { label: 'Working time', value: formatDuration(metrics.working_minutes), icon: Timer, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Waiting time', value: formatDuration(metrics.waiting_minutes), icon: MoreHorizontal, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Distance', value: `${formatNumber(metrics.distance_km)} km`, icon: Gauge, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Utilization', value: `${formatNumber(utilization, 0)}%`, icon: Activity, tone: 'bg-slate-100 text-slate-600' },
  ];

  return <div className="space-y-5">
    <VehicleLocationMap position={metrics.latest_position} route={metrics.route} viewKey={routeViewKey} />
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">Top Locations</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.locations.length ? metrics.locations.slice(0, 6).map((item, index) => {
          const percent = (item.job_count / totalJobs) * 100;
          return <div key={item.location} title={`${item.job_count} completed jobs`}>
            <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-700">{item.location}</span><span className="text-slate-400">{formatNumber(percent, 0)}%</span></div>
            <div className="h-3 overflow-hidden rounded-sm bg-slate-100"><div className={`${index === 0 ? 'bg-blue-600' : index === 1 ? 'bg-emerald-500' : index === 2 ? 'bg-amber-400' : 'bg-slate-400'} h-full transition-all`} style={{ width: `${Math.max(percent, 3)}%` }} /></div>
          </div>;
        }) : <div className="col-span-full py-10 text-center text-sm text-slate-400">No completed driver-assigned jobs in this range.</div>}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">Operational Diagnostics</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {diagnosticMetrics.map((metric) => <div key={metric.label} className="flex min-w-0 items-center gap-3 rounded-md border border-slate-100 bg-white p-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${metric.tone}`}><metric.icon className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="truncate text-lg font-bold text-slate-900">{metric.value}</p><p className="text-xs text-slate-500">{metric.label}</p></div>
        </div>)}
      </CardContent>
    </Card>
  </div>;
};
const VehicleLogisticsTab = () => {
  const { isSuperadmin, hasUiRoles, hasPerm } = usePermissionContext(); const { toast } = useToast();
  const canViewPerformance = isSuperadmin || (hasUiRoles && hasPerm('vehicle_logistics.performance.view'));
  const canManageVehicles = isSuperadmin || (hasUiRoles && hasPerm('vehicle_logistics.vehicles.manage'));
  const canManageServiceLogs = isSuperadmin || (hasUiRoles && hasPerm('vehicle_logistics.service_logs.manage'));
  const dashboard = useVehicleLogistics(canViewPerformance);
  const [collapsed, setCollapsed] = useState(false); const [mobileFleet, setMobileFleet] = useState(false);
  const [vehicleDialog, setVehicleDialog] = useState(false); const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [serviceDialog, setServiceDialog] = useState(false); const [editingLog, setEditingLog] = useState<VehicleServiceLog | null>(null); const [servicePage, setServicePage] = useState(1);
  const [noteDraft, setNoteDraft] = useState(''); const [savingNote, setSavingNote] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  useEffect(() => setServicePage(1), [dashboard.activeVehicleId]);
  useEffect(() => setNoteDraft(dashboard.activeVehicle?.admin_notes || ''), [dashboard.activeVehicle?.id, dashboard.activeVehicle?.admin_notes]);
  const logsPerPage = 6; const servicePageCount = Math.max(1, Math.ceil(dashboard.serviceLogs.length / logsPerPage));
  const pageLogs = dashboard.serviceLogs.slice((servicePage - 1) * logsPerPage, servicePage * logsPerPage);
  const setPreset = (preset: string) => { const now = new Date(); let from: Date; let to = new Date(); if (preset === '7') from = new Date(now.getTime() - 6 * 86400000); else if (preset === '30') from = new Date(now.getTime() - 29 * 86400000); else { from = new Date(now.getFullYear(), now.getMonth(), 1); to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); } dashboard.setRange({ from: from.toISOString(), to: to.toISOString() }); };
  const removeLog = async (log: VehicleServiceLog) => { if (!window.confirm('Delete this service log and its attachments?')) return; try { await deleteVehicleServiceLog(log); await dashboard.loadDetails(); toast({ title: 'Service Log Deleted' }); } catch (error) { toast({ title: 'Unable to Delete Log', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' }); } };
  const addVehicleFiles = async (files: FileList | null) => { if (!dashboard.activeVehicle || !files?.length) return; setUploadingFiles(true); try { await uploadVehicleFiles(dashboard.activeVehicle.id, Array.from(files)); await dashboard.loadDetails(); toast({ title: 'Vehicle Files Uploaded' }); } catch (error) { toast({ title: 'Unable to Upload Files', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' }); } finally { setUploadingFiles(false); } };
  const removeVehicleFile = async (file: VehicleFile) => { if (!window.confirm(`Remove ${file.original_name}?`)) return; try { await deleteVehicleFile(file); await dashboard.loadDetails(); toast({ title: 'Vehicle File Removed' }); } catch (error) { toast({ title: 'Unable to Remove File', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' }); } };
  const saveAdminNotes = async () => { if (!dashboard.activeVehicle) return; setSavingNote(true); try { await saveVehicleAdminNotes(dashboard.activeVehicle.id, noteDraft); await dashboard.loadFleet(); toast({ title: 'Vehicle Notes Saved' }); } catch (error) { toast({ title: 'Unable to Save Notes', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' }); } finally { setSavingNote(false); } };
  if (dashboard.loadingFleet) return <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  return <div className="isolate min-h-[calc(100vh-7rem)] overflow-hidden bg-slate-50"><div className="flex min-w-0">
    <FleetPanel vehicles={dashboard.vehicles} activeId={dashboard.activeVehicleId} collapsed={collapsed} mobileOpen={mobileFleet} onCollapse={() => setCollapsed(!collapsed)} onMobileClose={() => setMobileFleet(false)} onSelect={dashboard.selectVehicle} canManage={canManageVehicles} onAdd={() => { setEditingVehicle(null); setVehicleDialog(true); }} />
    <main className="min-w-0 flex-1 p-3 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileFleet((open) => !open)} title={mobileFleet ? 'Collapse Fleet Control' : 'Open Fleet Control'}><Truck className="h-4 w-4" /></Button><div><h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Vehicle Logistics</h1><p className="text-xs text-slate-500">Fleet operations and maintenance</p></div></div>{canViewPerformance && <div className="flex items-center gap-2"><Select defaultValue="month" onValueChange={setPreset}><SelectTrigger className="w-[130px] bg-white"><CalendarRange className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="month">This month</SelectItem></SelectContent></Select>{canManageVehicles && <Button variant="outline" onClick={dashboard.refreshTelemetry} disabled={dashboard.syncing}>{dashboard.syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{dashboard.activeVehicle?.traccar_unique_id ? 'Refresh' : 'Sync'}</Button>}</div>}</div>
      {mobileFleet && <section className="mb-4 rounded-md border border-slate-100 bg-white p-3 shadow-sm lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-sm font-bold text-slate-900">Fleet Control</p><p className="text-xs text-slate-400">Select a vehicle</p></div>
        </div>
        {canManageVehicles && <Button variant="outline" className="mb-3 w-full" onClick={() => { setEditingVehicle(null); setVehicleDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add New Vehicle</Button>}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dashboard.vehicles.map((vehicle) => <button key={vehicle.id} type="button" onClick={() => dashboard.selectVehicle(vehicle.id)} className={`flex min-w-[150px] items-center gap-2 rounded-md border p-2 text-left ${dashboard.activeVehicleId === vehicle.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-700'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">{vehicle.image_signed_url ? <img src={vehicle.image_signed_url} alt="" className="h-full w-full object-contain" /> : <Truck className="h-4 w-4" />}</span>
            <span className="min-w-0"><span className="block truncate text-xs font-bold">{vehicle.name}</span><span className="block truncate text-[10px] text-slate-400">{vehicle.plate_number}</span><span className="block truncate text-[10px] text-slate-500">{vehicle.assigned_driver?.full_name || 'No driver assigned'}</span></span>
          </button>)}
        </div>
      </section>}      {canViewPerformance && <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-slate-100 bg-white p-3 shadow-sm">
        <div><Label htmlFor="vehicle-range-from" className="text-xs text-slate-500">From</Label><Input id="vehicle-range-from" type="date" className="mt-1 h-9 w-[150px]" value={dashboard.range.from.slice(0, 10)} onChange={(event) => dashboard.setRange((current) => ({ ...current, from: new Date(`${event.target.value}T00:00:00`).toISOString() }))} /></div>
        <div><Label htmlFor="vehicle-range-to" className="text-xs text-slate-500">To</Label><Input id="vehicle-range-to" type="date" className="mt-1 h-9 w-[150px]" value={dashboard.range.to.slice(0, 10)} onChange={(event) => dashboard.setRange((current) => ({ ...current, to: new Date(`${event.target.value}T23:59:59.999`).toISOString() }))} /></div>
        <p className="pb-2 text-xs text-slate-400">Driver-derived jobs and Traccar telemetry use this range.</p>
      </div>}
      {!dashboard.activeVehicle ? <Card className="border-dashed"><CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center"><CarFront className="h-12 w-12 text-slate-300" /><h2 className="mt-4 font-bold">No vehicles yet</h2><p className="mt-1 text-sm text-slate-500">Add the first vehicle to begin managing fleet logistics.</p>{canManageVehicles && <Button className="mt-5" onClick={() => setVehicleDialog(true)}><Plus className="mr-2 h-4 w-4" />Add Vehicle</Button>}</CardContent></Card> : <div className="space-y-5">
        <Card className="relative min-h-[270px] overflow-hidden border-0 bg-white shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-[62%] right-0 z-20 hidden items-center justify-end overflow-hidden p-5 lg:flex">
            <div className="flex h-[135px] w-full items-center justify-end">
              {dashboard.activeVehicle.image_signed_url ? <img src={dashboard.activeVehicle.image_signed_url} alt={dashboard.activeVehicle.name} className="block max-h-full max-w-full object-contain object-right" /> : <Truck className="h-16 w-16 text-slate-100" />}
            </div>
          </div>
          <CardContent className="relative z-10 flex min-h-[270px] max-w-full flex-col justify-between p-5 sm:p-7 lg:max-w-[62%]">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-slate-950">{dashboard.activeVehicle.name}</h2><Badge variant="outline" className={statusClass[dashboard.activeVehicle.operational_status]}>{dashboard.activeVehicle.operational_status}</Badge>{canManageVehicles && <Button variant="ghost" size="icon" onClick={() => { setEditingVehicle(dashboard.activeVehicle); setVehicleDialog(true); }}><Edit3 className="h-4 w-4" /></Button>}</div><p className="mt-1 text-sm font-medium text-slate-400">{dashboard.activeVehicle.plate_number}</p></div>
            <div className={`mt-7 grid gap-4 bg-transparent ${canViewPerformance ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
              <div><p className="text-xs font-semibold uppercase text-slate-400">Active Driver</p>{dashboard.activeVehicle.assigned_driver ? <Link to={`/admin-dashboard/employee/${dashboard.activeVehicle.assigned_driver.id}`} className="mt-1 inline-flex items-center font-bold text-blue-600 hover:underline"><User className="mr-1.5 h-4 w-4" />{dashboard.activeVehicle.assigned_driver.full_name || 'Driver'}</Link> : <p className="mt-1 font-bold">Unassigned</p>}</div>
              {canViewPerformance && <><div><p className="text-xs font-semibold uppercase text-slate-400">Kilometers Driven</p><p className="mt-1 text-xl font-bold">{formatNumber(dashboard.metrics.all_time_distance_km)} km</p></div><div><p className="text-xs font-semibold uppercase text-slate-400">Jobs Fulfilled</p><p className="mt-1 text-xl font-bold">{dashboard.metrics.total_jobs_completed}</p></div></>}
            </div>
          </CardContent>
        </Card>        {canViewPerformance && <><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Traccar: <strong className="capitalize text-slate-700">{dashboard.metrics.device_status || (dashboard.activeVehicle.traccar_device_id ? 'Not synchronized' : 'Not connected')}</strong></span><span>Last sync: {dashboard.metrics.last_synced_at ? formatDate(dashboard.metrics.last_synced_at) : 'Never'}</span></div><PerformanceGrid metrics={dashboard.metrics} routeViewKey={`${dashboard.activeVehicle.id}:${dashboard.range.from}:${dashboard.range.to}`} /></>}
        <Card className="border-0 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center text-base"><Wrench className="mr-2 h-5 w-5 text-blue-600" />Service & Maintenance</CardTitle><p className="mt-1 text-xs text-slate-400">Vehicle-specific maintenance ledger</p></div>{canManageServiceLogs && <Button size="sm" onClick={() => { setEditingLog(null); setServiceDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add Service</Button>}</CardHeader><CardContent>{dashboard.loadingDetails ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : dashboard.serviceLogs.length ? <><Table><TableHeader><TableRow><TableHead>Service Date</TableHead><TableHead>Description</TableHead><TableHead>Logged By</TableHead><TableHead>Odometer (KM)</TableHead><TableHead>Cost (BD)</TableHead><TableHead>Attachments</TableHead>{canManageServiceLogs && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{pageLogs.map((log) => <TableRow key={log.id}><TableCell className="font-semibold">{formatDate(log.service_date)}</TableCell><TableCell className="min-w-[240px]">{log.description}</TableCell><TableCell>{log.logged_by ? <Link to={`/admin-dashboard/employee/${log.logged_by.id}`} className="font-semibold text-blue-600 hover:underline">{log.logged_by.full_name || log.logged_by.email}</Link> : <span className="text-slate-400">Not recorded</span>}</TableCell><TableCell>{log.odometer_reading === null ? '-' : formatNumber(Number(log.odometer_reading), 0)}</TableCell><TableCell>{Number(log.cost).toFixed(3)}</TableCell><TableCell>{log.attachments.length ? <div className="flex flex-wrap gap-1">{log.attachments.map((attachment) => <a key={attachment.id} href={attachment.signed_url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline"><Paperclip className="mr-1 h-3 w-3" />{attachment.original_name}</a>)}</div> : <span className="text-slate-400">None</span>}</TableCell>{canManageServiceLogs && <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingLog(log); setServiceDialog(true); }}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-rose-600" onClick={() => removeLog(log)}><Trash2 className="h-4 w-4" /></Button></TableCell>}</TableRow>)}</TableBody></Table>{servicePageCount > 1 && <div className="mt-4 flex items-center justify-end gap-2"><Button size="sm" variant="outline" disabled={servicePage === 1} onClick={() => setServicePage((page) => page - 1)}>Previous</Button><span className="text-xs font-semibold text-slate-500">{servicePage} / {servicePageCount}</span><Button size="sm" variant="outline" disabled={servicePage === servicePageCount} onClick={() => setServicePage((page) => page + 1)}>Next</Button></div>}</> : <div className="flex h-48 flex-col items-center justify-center text-slate-400"><FileText className="h-8 w-8" /><p className="mt-2 text-sm">No service records yet.</p></div>}</CardContent></Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div><CardTitle className="flex items-center text-base"><FileText className="mr-2 h-5 w-5 text-blue-600" />Vehicle Files</CardTitle><p className="mt-1 text-xs text-slate-400">Registration, insurance, permits, and other vehicle documents.</p></div>
            {canManageVehicles && <Button size="sm" asChild className="shrink-0"><label className="cursor-pointer"><UploadCloud className="mr-2 h-4 w-4" />{uploadingFiles ? 'Uploading...' : 'Add Files'}<input type="file" multiple className="hidden" disabled={uploadingFiles} onChange={(event) => { addVehicleFiles(event.target.files); event.currentTarget.value = ''; }} /></label></Button>}
          </CardHeader>
          <CardContent>
            {dashboard.loadingDetails ? <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div> : dashboard.vehicleFiles.length ? <div className="divide-y divide-slate-100">{dashboard.vehicleFiles.map((file) => <div key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{file.original_name}</p><p className="text-xs text-slate-400">{formatFileSize(file.file_size)} · {formatDate(file.created_at)}</p></div>{file.signed_url && <Button variant="ghost" size="sm" asChild><a href={file.signed_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />Open</a></Button>}{canManageVehicles && <Button variant="ghost" size="icon" className="shrink-0 text-rose-600" onClick={() => removeVehicleFile(file)} title="Remove file"><Trash2 className="h-4 w-4" /></Button>}</div>)}</div> : <div className="flex h-24 flex-col items-center justify-center text-slate-400"><FileText className="h-7 w-7" /><p className="mt-2 text-sm">No vehicle files uploaded.</p></div>}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Vehicle / Admin Notes</CardTitle><p className="mt-1 text-xs text-slate-400">Internal operational notes for this vehicle.</p></CardHeader>
          <CardContent>
            <Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={5} placeholder="Add vehicle condition, scheduling, parking, or operational notes..." className="resize-y bg-transparent" />
            <div className="mt-3 flex justify-end"><Button onClick={saveAdminNotes} disabled={savingNote}>{savingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Notes</Button></div>
          </CardContent>
        </Card>      </div>}
    </main>
    <VehicleFormDialog open={vehicleDialog} vehicle={editingVehicle} drivers={dashboard.drivers} onOpenChange={setVehicleDialog} onSaved={dashboard.loadFleet} />
    {dashboard.activeVehicle && <ServiceLogDialog open={serviceDialog} vehicleId={dashboard.activeVehicle.id} log={editingLog} drivers={dashboard.drivers} onOpenChange={setServiceDialog} onSaved={dashboard.loadDetails} />}
  </div></div>;
};

export default VehicleLogisticsTab;
