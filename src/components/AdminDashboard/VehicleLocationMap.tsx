// @ts-nocheck -- Google Maps browser globals and legacy card primitives are not fully typed in this app.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Battery, Clock3, Loader2, MapPin, Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchGoogleMapsApiKey, fetchVehicleRoadSnappedRoute } from '@/lib/api/vehicleLogisticsApi';
import type {
  VehicleLatestPosition,
  VehicleRoadSnappedRoute,
  VehicleRoute,
  VehicleRoutePoint,
} from '@/types/vehicleLogistics';

declare global {
  interface Window {
    google?: any;
    __readynestGoogleMapsPromise?: Promise<any>;
    __readynestGoogleMapsKeyPromise?: Promise<string>;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'readynest-google-maps-script';

const loadGoogleMapsKey = () => {
  if (!window.__readynestGoogleMapsKeyPromise) {
    window.__readynestGoogleMapsKeyPromise = fetchGoogleMapsApiKey();
  }
  return window.__readynestGoogleMapsKeyPromise;
};

const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__readynestGoogleMapsPromise) return window.__readynestGoogleMapsPromise;

  window.__readynestGoogleMapsPromise = loadGoogleMapsKey().then((googleMapsKey) => new Promise((resolve, reject) => {
    if (!googleMapsKey) {
      reject(new Error('Google Maps API key is not configured.'));
      return;
    }
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps script failed to load.'));
    document.head.appendChild(script);
  }));

  return window.__readynestGoogleMapsPromise;
};

const formatPositionTime = (value: string) => new Intl.DateTimeFormat('en-BH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Bahrain',
}).format(new Date(value));

const formatDuration = (startedAt: string | null, endedAt: string | null) => {
  if (!startedAt || !endedAt) return '0 min';
  const minutes = Math.max((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000, 0);
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)} hr` : `${Math.round(minutes)} min`;
};

const formatCoordinates = (point: { latitude: number; longitude: number }) => (
  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
);

const locationLabelFromAddress = (result: any) => {
  const components = result?.address_components || [];
  const preferredTypes = ['sublocality', 'neighborhood', 'locality', 'administrative_area_level_2', 'administrative_area_level_1'];
  for (const type of preferredTypes) {
    const component = components.find((item: any) => item.types?.includes(type));
    if (component?.long_name) return component.long_name;
  }
  return result?.formatted_address?.split(',')?.[0] || '';
};

const getRouteEndPoint = (route: VehicleRoute): VehicleRoutePoint | null => (
  route.points.length ? route.points[route.points.length - 1] : null
);

const toLatLng = (point: { latitude: number; longitude: number }) => ({ lat: point.latitude, lng: point.longitude });

const markerIcon = (color: string, size = 16) => ({
  path: 'M 0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
  fillColor: color,
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 3,
  scale: size / 16,
});

const fallbackPinIcon = (moving: boolean | null) => markerIcon(moving === true ? '#f97316' : '#94a3b8', moving === true ? 15 : 9);

const isSparsePathMessage = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('input path is too sparse')
    || normalized.includes('path is too sparse')
    || normalized.includes('too sparse')
    || normalized.includes('consecutive points are closer');
};

const haversineKm = (a: VehicleRoutePoint, b: VehicleRoutePoint) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const samplePoints = (points: VehicleRoutePoint[], maxPoints: number) => {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => points[Math.round(index * step)]);
};

const movementPinsFromRoute = (points: VehicleRoutePoint[]) => {
  const moving = points.filter((point) => point.is_moving === true);
  if (moving.length) return samplePoints(moving, 80);

  const spaced: VehicleRoutePoint[] = [];
  points.forEach((point) => {
    const previous = spaced[spaced.length - 1];
    if (!previous || haversineKm(previous, point) >= 0.02) spaced.push(point);
  });
  return samplePoints(spaced.length ? spaced : points, 80);
};

export const VehicleLocationMap = ({
  vehicleId,
  from,
  to,
  position,
  route,
  viewKey,
}: {
  vehicleId: string | null;
  from: string;
  to: string;
  position: VehicleLatestPosition | null;
  route: VehicleRoute;
  viewKey: string;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const latestMarkerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const pointMarkersRef = useRef<any[]>([]);
  const rawLineRef = useRef<any>(null);
  const snappedLineRef = useRef<any>(null);
  const fittedViewKeyRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState('');
  const [snappedRoute, setSnappedRoute] = useState<VehicleRoadSnappedRoute | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [snapError, setSnapError] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const [lastLocationLabel, setLastLocationLabel] = useState('');

  const routeEndPoint = useMemo(() => getRouteEndPoint(route), [route.points]);
  const center = position || routeEndPoint;
  const stale = position ? Date.now() - new Date(position.recorded_at).getTime() > 5 * 60 * 1000 : false;
  const routeSignature = `${route.started_at || 'none'}-${route.ended_at || 'none'}-${route.total_points}-${route.points.length}`;
  const isSparsePinMode = snappedRoute?.mode === 'sparse_pins';
  const isRoadSnappedMode = snappedRoute?.mode === 'road_snapped' && snappedRoute.points.length >= 2;
  const visualPoints = snappedRoute?.points?.length ? snappedRoute.points : route.points;
  const linePoints = isSparsePinMode ? [] : isRoadSnappedMode ? snappedRoute.points : route.points;
  const visualDistanceKm = snappedRoute ? snappedRoute.distance_km : route.distance_km;

  useEffect(() => {
    let active = true;
    setSnappedRoute(null);
    setSnapError('');
    if (!vehicleId || route.points.length < 2) {
      setSnapping(false);
      return undefined;
    }

    setSnapping(true);
    fetchVehicleRoadSnappedRoute(vehicleId, from, to)
      .then((data) => {
        if (!active) return;
        setSnappedRoute(data);
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Google road snapping failed.';
        if (isSparsePathMessage(message)) {
          setSnappedRoute({
            points: movementPinsFromRoute(route.points),
            distance_km: route.distance_km,
            warning: 'Road route unavailable because GPS points are too far apart. Showing last moved locations.',
            fallback_reason: message,
            mode: 'sparse_pins',
            source: 'google_roads',
          });
          setSnapError('');
          return;
        }
        setSnapError(message);
      })
      .finally(() => {
        if (active) setSnapping(false);
      });

    return () => { active = false; };
  }, [vehicleId, from, to, routeSignature]);

  useEffect(() => {
    if (!center || !containerRef.current) return undefined;

    try {
      setMapError('');
      setMapLoading(!mapRef.current);
      loadGoogleMaps().then((maps) => {
        if (!containerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: toLatLng(center),
            zoom: 15,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            ],
          });
        }

        const map = mapRef.current;
        const latestLabel = position ? 'Latest vehicle position' : 'Last recorded route point';
        if (!latestMarkerRef.current) {
          latestMarkerRef.current = new maps.Marker({
            map,
            position: toLatLng(center),
            title: latestLabel,
            icon: markerIcon('#2563eb', 28),
            zIndex: 30,
          });
        } else {
          latestMarkerRef.current.setPosition(toLatLng(center));
          latestMarkerRef.current.setTitle(latestLabel);
        }

        pointMarkersRef.current.forEach((marker) => marker.setMap(null));
        const renderedPins = isSparsePinMode ? visualPoints : route.points;
        pointMarkersRef.current = renderedPins.map((point) => new maps.Marker({
          map,
          position: toLatLng(point),
          title: formatPositionTime(point.recorded_at),
          icon: isSparsePinMode ? fallbackPinIcon(point.is_moving) : markerIcon(point.is_moving ? '#60a5fa' : '#94a3b8', 8),
          zIndex: 10,
        }));

        const rawPath = route.points.map(toLatLng);
        const snappedPath = linePoints.map(toLatLng);
        if (!isSparsePinMode && rawPath.length >= 2 && !isRoadSnappedMode) {
          if (!rawLineRef.current) {
            rawLineRef.current = new maps.Polyline({
              map,
              path: rawPath,
              strokeColor: '#94a3b8',
              strokeOpacity: 0.55,
              strokeWeight: 3,
              zIndex: 1,
            });
          } else {
            rawLineRef.current.setPath(rawPath);
            rawLineRef.current.setMap(map);
          }
        } else {
          rawLineRef.current?.setMap(null);
        }

        if (snappedPath.length >= 2) {
          if (!snappedLineRef.current) {
            snappedLineRef.current = new maps.Polyline({
              map,
              path: snappedPath,
              strokeColor: '#2563eb',
              strokeOpacity: 0.95,
              strokeWeight: 5,
              zIndex: 2,
            });
          } else {
            snappedLineRef.current.setPath(snappedPath);
            snappedLineRef.current.setMap(map);
          }
        } else {
          snappedLineRef.current?.setMap(null);
        }

        if (!isSparsePinMode && linePoints.length >= 2) {
          const start = linePoints[0];
          const end = linePoints[linePoints.length - 1];
          if (!startMarkerRef.current) {
            startMarkerRef.current = new maps.Marker({
              map,
              position: toLatLng(start),
              title: 'Route start',
              icon: markerIcon('#10b981', 18),
              zIndex: 20,
            });
          } else {
            startMarkerRef.current.setPosition(toLatLng(start));
            startMarkerRef.current.setMap(map);
          }
          if (!endMarkerRef.current) {
            endMarkerRef.current = new maps.Marker({
              map,
              position: toLatLng(end),
              title: 'Route end',
              icon: markerIcon('#0f172a', 18),
              zIndex: 21,
            });
          } else {
            endMarkerRef.current.setPosition(toLatLng(end));
            endMarkerRef.current.setMap(map);
          }
        } else {
          startMarkerRef.current?.setMap(null);
          endMarkerRef.current?.setMap(null);
        }

        if (fittedViewKeyRef.current !== viewKey) {
          const boundsPoints = visualPoints.length ? [...visualPoints] : [];
          if (center) boundsPoints.push(center);
          if (boundsPoints.length >= 2) {
            const bounds = new maps.LatLngBounds();
            boundsPoints.forEach((point) => bounds.extend(toLatLng(point)));
            map.fitBounds(bounds, 48);
          } else {
            map.setCenter(toLatLng(center));
            map.setZoom(15);
          }
          fittedViewKeyRef.current = viewKey;
        }
        window.setTimeout(() => {
          if (mapRef.current) maps.event.trigger(mapRef.current, 'resize');
        }, 80);
        const geocoderPoint = position || routeEndPoint;
        if (geocoderPoint) {
          setLastLocationLabel(formatCoordinates(geocoderPoint));
          const geocoder = new maps.Geocoder();
          geocoder.geocode({ location: toLatLng(geocoderPoint) }, (results: any[], status: string) => {
            if (status !== 'OK' || !results?.length) return;
            const label = locationLabelFromAddress(results[0]);
            if (label) setLastLocationLabel(label);
          });
        }
        setMapLoading(false);
      }).catch((error) => {
        setMapError(error instanceof Error ? error.message : 'Google Maps could not be loaded.');
        setMapLoading(false);
      });
    } catch (error) {
      setMapError(error instanceof Error ? error.message : 'Google Maps could not be rendered.');
      setMapLoading(false);
    }

    return undefined;
  }, [center?.latitude, center?.longitude, position?.recorded_at, routeSignature, snappedRoute?.points?.length, snappedRoute?.distance_km, snappedRoute?.mode, viewKey]);

  useEffect(() => () => {
    pointMarkersRef.current.forEach((marker) => marker.setMap(null));
    pointMarkersRef.current = [];
    latestMarkerRef.current?.setMap(null);
    startMarkerRef.current?.setMap(null);
    endMarkerRef.current?.setMap(null);
    rawLineRef.current?.setMap(null);
    snappedLineRef.current?.setMap(null);
  }, []);

  return <Card className="overflow-hidden border-0 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <CardTitle className="flex items-center text-base">
        <MapPin className="mr-2 h-5 w-5 text-blue-600" />
        Location
      </CardTitle>
      <div className="flex flex-wrap justify-end gap-2">
        <span className="inline-flex items-center rounded-sm bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
          <Route className="mr-1 h-3.5 w-3.5" />
          {isSparsePinMode ? 'Movement pins' : 'Google road-snapped'}
        </span>
        <span className="rounded-sm bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
          Haversine fallback
        </span>
        {position && <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${stale ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {stale ? 'Last known' : 'Live'}
        </span>}
      </div>
    </CardHeader>
    <CardContent className="p-0">
      {!position && !route.points.length ? <div className="flex h-[280px] flex-col items-center justify-center bg-slate-50 text-center text-slate-400 sm:h-[340px]">
        <MapPin className="h-9 w-9" />
        <p className="mt-3 text-sm font-semibold">No vehicle location received for this range.</p>
        <p className="mt-1 max-w-sm text-xs">Once the Traccar phone app sends GPS points, this card will show the latest pin and travelled path.</p>
      </div> : <>
        {mapError ? <div className="flex h-[320px] flex-col items-center justify-center bg-slate-50 px-5 text-center text-sm text-rose-600 sm:h-[420px]">
          <MapPin className="mb-3 h-8 w-8" />
          <p className="font-semibold">{mapError}</p>
          <p className="mt-1 text-xs text-slate-500">The map key is loaded from the production Supabase secret.</p>
        </div> : <div className="relative h-[320px] min-h-[320px] w-full overflow-hidden bg-slate-100 sm:h-[420px] sm:min-h-[420px]">
          <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
          {mapLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 text-sm font-semibold text-slate-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
            Loading Google Map...
          </div>}
        </div>}
        {route.total_points === 1 && <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
          One location point is available; another point is needed to draw a travelled path.
        </div>}
        {(snapping || snapError || snappedRoute?.warning || isSparsePinMode) && <div className={`border-t px-4 py-2 text-xs font-medium ${snapError || isSparsePinMode ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
          {snapping && <span className="inline-flex items-center"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Snapping route to Google roads...</span>}
          {!snapping && snapError && <span>Road snapping unavailable: {snapError}. Showing Haversine GPS route.</span>}
          {!snapping && !snapError && isSparsePinMode && <span>Road route unavailable because GPS points are too far apart. Showing last moved locations.</span>}
          {!snapping && !snapError && !isSparsePinMode && snappedRoute?.warning && <span>{snappedRoute.warning}</span>}
        </div>}
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
          <div className="bg-white p-3"><p className="text-xs text-slate-400">{isRoadSnappedMode ? 'Road distance' : 'Route distance'}</p><p className="mt-1 text-sm font-bold text-slate-700">{visualDistanceKm.toFixed(2)} km</p></div>
          <div className="bg-white p-3"><p className="text-xs text-slate-400">Route duration</p><p className="mt-1 text-sm font-bold text-slate-700">{formatDuration(route.started_at, route.ended_at)}</p></div>
          <div className="bg-white p-3"><p className="text-xs text-slate-400">Recorded points</p><p className="mt-1 text-sm font-bold text-slate-700">{route.total_points}</p></div>
          <div className="bg-white p-3"><p className="flex items-center text-xs text-slate-400"><Clock3 className="mr-1.5 h-3.5 w-3.5" />Last update</p><p className="mt-1 text-xs font-bold text-slate-700">{position ? formatPositionTime(position.recorded_at) : route.ended_at ? formatPositionTime(route.ended_at) : 'Unknown'}</p></div>
          <div className="bg-white p-3"><p className="flex items-center text-xs text-slate-400"><MapPin className="mr-1.5 h-3.5 w-3.5" />Last Location</p><p className="mt-1 truncate text-sm font-bold text-slate-700" title={lastLocationLabel || (center ? formatCoordinates(center) : 'Unknown')}>{lastLocationLabel || (center ? formatCoordinates(center) : 'Unknown')}</p></div>
          <div className="bg-white p-3"><p className="flex items-center text-xs text-slate-400"><Battery className="mr-1.5 h-3.5 w-3.5" />Battery</p><p className="mt-1 text-sm font-bold text-slate-700">{!position || position.battery_level === null ? 'Unknown' : `${Math.round(position.battery_level * 100)}%`}</p></div>
        </div>
      </>}
    </CardContent>
  </Card>;
};
