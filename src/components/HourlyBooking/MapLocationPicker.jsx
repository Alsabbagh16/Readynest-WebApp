import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Locate, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BAHRAIN_CENTER = { lat: 26.0667, lng: 50.5577 };
const BAHRAIN_BOUNDS = {
  north: 26.35,
  south: 25.75,
  east: 50.85,
  west: 50.35
};

const MapLocationPicker = ({ onLocationSelect, initialLocation = null }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        setLeafletLoaded(true);
        return;
      }

      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    
    // Initialize map centered on Bahrain
    const map = L.map(mapRef.current, {
      center: [BAHRAIN_CENTER.lat, BAHRAIN_CENTER.lng],
      zoom: 12,
      maxBounds: [
        [BAHRAIN_BOUNDS.south, BAHRAIN_BOUNDS.west],
        [BAHRAIN_BOUNDS.north, BAHRAIN_BOUNDS.east]
      ],
      minZoom: 10
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom marker icon
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background: #3b82f6; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Add marker
    const marker = L.marker([BAHRAIN_CENTER.lat, BAHRAIN_CENTER.lng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Handle marker drag
    marker.on('dragend', async (e) => {
      const { lat, lng } = e.target.getLatLng();
      await reverseGeocode(lat, lng);
    });

    // Handle map click
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      await reverseGeocode(lat, lng);
    });

    setIsLoading(false);

    // Set initial location if provided
    if (initialLocation?.lat && initialLocation?.lng) {
      marker.setLatLng([initialLocation.lat, initialLocation.lng]);
      map.setView([initialLocation.lat, initialLocation.lng], 15);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  const reverseGeocode = async (lat, lng) => {
    setIsLocating(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
        { headers: { 'User-Agent': 'ReadyNest Booking App' } }
      );
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        const locationData = {
          lat,
          lng,
          street: [
            address.house_number,
            address.road || address.street || address.pedestrian
          ].filter(Boolean).join(' ') || address.neighbourhood || '',
          city: address.city || address.town || address.village || address.suburb || address.state_district || 'Bahrain',
          area: address.suburb || address.neighbourhood || address.district || '',
          country: address.country || 'Bahrain',
          displayName: data.display_name
        };
        
        setSelectedLocation(locationData);
        onLocationSelect?.(locationData);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Check if within Bahrain bounds
        if (
          latitude < BAHRAIN_BOUNDS.south || latitude > BAHRAIN_BOUNDS.north ||
          longitude < BAHRAIN_BOUNDS.west || longitude > BAHRAIN_BOUNDS.east
        ) {
          alert('Your location appears to be outside Bahrain. Please select a location on the map.');
          setIsLocating(false);
          return;
        }

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.setView([latitude, longitude], 16);
          await reverseGeocode(latitude, longitude);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please select manually on the map.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Select Location on Map</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocateMe}
          disabled={isLocating || isLoading}
          className="gap-1.5"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Use My Location</span>
          <span className="sm:hidden">Locate</span>
        </Button>
      </div>

      <div 
        ref={mapRef} 
        className="w-full h-[250px] sm:h-[300px] rounded-lg border border-border overflow-hidden bg-muted"
        style={{ zIndex: 0 }}
      >
        {(isLoading || !leafletLoaded) && (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Selected: </span>
            {selectedLocation.street && `${selectedLocation.street}, `}
            {selectedLocation.area && `${selectedLocation.area}, `}
            {selectedLocation.city}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tap/click on the map or drag the marker to select your exact location
      </p>
    </div>
  );
};

export default MapLocationPicker;
