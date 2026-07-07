// @ts-nocheck -- Legacy JavaScript card primitives do not expose children props.
import React, { useEffect, useRef, useState } from 'react';
import { Battery, Clock3, Gauge, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VehicleLatestPosition, VehicleRoute } from '@/types/vehicleLogistics';

declare global {
  interface Window { L?: any }
}

const LEAFLET_SCRIPT_ID = 'readynest-leaflet-script';
const LEAFLET_STYLE_ID = 'readynest-leaflet-style';

const loadLeaflet = () => new Promise<any>((resolve, reject) => {
  if (window.L) { resolve(window.L); return; }
  if (!document.getElementById(LEAFLET_STYLE_ID)) {
    const style = document.createElement('link');
    style.id = LEAFLET_STYLE_ID;
    style.rel = 'stylesheet';
    style.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    style.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    style.crossOrigin = '';
    document.head.appendChild(style);
  }
  const existing = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    existing.addEventListener('load', () => resolve(window.L), { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.id = LEAFLET_SCRIPT_ID;
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  script.crossOrigin = '';
  script.onload = () => resolve(window.L);
  script.onerror = reject;
  document.head.appendChild(script);
});

const formatPositionTime = (value: string) => new Intl.DateTimeFormat('en-BH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bahrain',
}).format(new Date(value));

const formatDuration = (startedAt: string | null, endedAt: string | null) => {
  if (!startedAt || !endedAt) return '0 min';
  const minutes = Math.max((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000, 0);
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)} hr` : `${Math.round(minutes)} min`;
};

export const VehicleLocationMap = ({ position, route, viewKey }: { position: VehicleLatestPosition | null; route: VehicleRoute; viewKey: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const fittedViewKeyRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const stale = position ? Date.now() - new Date(position.recorded_at).getTime() > 5 * 60 * 1000 : false;

  useEffect(() => {
    const fallbackPoint = route.points.at(-1);
    const center = position || fallbackPoint;
    if (!center || !containerRef.current) return undefined;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { center: [center.latitude, center.longitude], zoom: 15, zoomControl: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
        }).addTo(mapRef.current);
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:28px;height:28px;border-radius:50%;background:#2563eb;border:4px solid white;box-shadow:0 2px 10px rgba(15,23,42,.35)"></div>',
          iconSize: [28, 28], iconAnchor: [14, 14],
        });
        markerRef.current = L.marker([center.latitude, center.longitude], { icon }).addTo(mapRef.current);
      }
      if (position) markerRef.current?.setLatLng([position.latitude, position.longitude]);

      const routeCoordinates = route.points.map((point) => [point.latitude, point.longitude]);
      if (routeCoordinates.length >= 2) {
        if (!routeLineRef.current) routeLineRef.current = L.polyline(routeCoordinates, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(mapRef.current);
        else routeLineRef.current.setLatLngs(routeCoordinates);
        const endpointIcon = (color: string) => L.divIcon({ className: '', html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 6px rgba(15,23,42,.3)"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
        const start = route.points[0];
        const end = route.points[route.points.length - 1];
        if (!startMarkerRef.current) startMarkerRef.current = L.marker([start.latitude, start.longitude], { icon: endpointIcon('#10b981') }).addTo(mapRef.current);
        else startMarkerRef.current.setLatLng([start.latitude, start.longitude]);
        if (!endMarkerRef.current) endMarkerRef.current = L.marker([end.latitude, end.longitude], { icon: endpointIcon('#0f172a') }).addTo(mapRef.current);
        else endMarkerRef.current.setLatLng([end.latitude, end.longitude]);
        if (fittedViewKeyRef.current !== viewKey) {
          mapRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [28, 28], maxZoom: 16 });
          fittedViewKeyRef.current = viewKey;
        }
      } else {
        routeLineRef.current?.remove(); routeLineRef.current = null;
        startMarkerRef.current?.remove(); startMarkerRef.current = null;
        endMarkerRef.current?.remove(); endMarkerRef.current = null;
        if (fittedViewKeyRef.current !== viewKey) {
          mapRef.current.setView([center.latitude, center.longitude], 15);
          fittedViewKeyRef.current = viewKey;
        }
      }
      window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
    }).catch(() => setMapError(true));
    return () => { cancelled = true; };
  }, [position?.latitude, position?.longitude, route.started_at, route.ended_at, route.points.length, viewKey]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    markerRef.current = null;
    routeLineRef.current = null;
    startMarkerRef.current = null;
    endMarkerRef.current = null;
  }, []);

  return <Card className="overflow-hidden border-0 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <CardTitle className="flex items-center text-base"><MapPin className="mr-2 h-5 w-5 text-blue-600" />Location</CardTitle>
      {position && <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${stale ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{stale ? 'Last known' : 'Live'}</span>}
    </CardHeader>
    <CardContent className="p-0">
      {!position && !route.points.length ? <div className="flex h-[280px] flex-col items-center justify-center bg-slate-50 text-center text-slate-400"><MapPin className="h-9 w-9" /><p className="mt-3 text-sm font-semibold">No vehicle location received for this range.</p></div> : <>
        {mapError ? <div className="flex h-[280px] items-center justify-center bg-slate-50 text-sm text-rose-600">Map tiles could not be loaded.</div> : <div ref={containerRef} className="h-[280px] w-full bg-slate-100 sm:h-[340px]" />}
        {route.total_points === 1 && <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">One location point is available; another point is needed to draw a travelled path.</div>}
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
          <div className="bg-white p-3"><p className="text-xs text-slate-400">Route distance</p><p className="mt-1 text-sm font-bold text-slate-700">{route.distance_km.toFixed(2)} km</p></div>
          <div className="bg-white p-3"><p className="text-xs text-slate-400">Route duration</p><p className="mt-1 text-sm font-bold text-slate-700">{formatDuration(route.started_at, route.ended_at)}</p></div>
          <div className="bg-white p-3"><p className="text-xs text-slate-400">Recorded points</p><p className="mt-1 text-sm font-bold text-slate-700">{route.total_points}</p></div>
          <div className="bg-white p-3"><p className="flex items-center text-xs text-slate-400"><Clock3 className="mr-1.5 h-3.5 w-3.5" />Last update</p><p className="mt-1 text-xs font-bold text-slate-700">{position ? formatPositionTime(position.recorded_at) : 'Unknown'}</p></div>
          <div className="bg-white p-3"><p className="flex items-center text-xs text-slate-400"><Gauge className="mr-1.5 h-3.5 w-3.5" />Speed</p><p className="mt-1 text-sm font-bold text-slate-700">{!position || position.speed_mps === null ? 'Unknown' : `${(position.speed_mps * 3.6).toFixed(1)} km/h`}</p></div>
          <div className="bg-white p-3"><p className="flex items-center text-xs text-slate-400"><Battery className="mr-1.5 h-3.5 w-3.5" />Battery</p><p className="mt-1 text-sm font-bold text-slate-700">{!position || position.battery_level === null ? 'Unknown' : `${Math.round(position.battery_level * 100)}%`}</p></div>
        </div>
      </>}
    </CardContent>
  </Card>;
};
