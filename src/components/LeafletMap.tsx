import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocationPoint, VehicleType } from '../types';

interface DriverMarker {
  id: string;
  driver_name: string;
  vehicle_type: VehicleType;
  vehicle_reg_number?: string;
  lat: number;
  lng: number;
}

interface Props {
  center: [number, number];
  zoom?: number;
  pickup?: LocationPoint | null;
  dropoff?: LocationPoint | null;
  drivers?: DriverMarker[];
  activeDriverLocation?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  heightClass?: string;
}

export const LeafletMap: React.FC<Props> = ({
  center,
  zoom = 13,
  pickup,
  dropoff,
  drivers = [],
  activeDriverLocation,
  onMapClick,
  heightClass = 'h-64 sm:h-80 md:h-[450px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, zoom);

      // OpenStreetMap Tiles (Free)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add compact Zoom Control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m: L.Marker) => m.remove());
    markersRef.current = {};

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Pickup Marker (Green)
    if (pickup) {
      const greenIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg text-white font-bold text-xs ring-4 ring-emerald-500/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      const pickupMarker = L.marker([pickup.lat, pickup.lng], { icon: greenIcon })
        .bindPopup(`<b>Pickup:</b> ${pickup.address}`)
        .addTo(map);
      markersRef.current['pickup'] = pickupMarker;
    }

    // Dropoff Marker (Red)
    if (dropoff) {
      const redIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg text-white font-bold text-xs ring-4 ring-rose-500/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], { icon: redIcon })
        .bindPopup(`<b>Dropoff:</b> ${dropoff.address}`)
        .addTo(map);
      markersRef.current['dropoff'] = dropoffMarker;
    }

    // Draw route line if both pickup & dropoff exist
    if (pickup && dropoff) {
      const polyline = L.polyline(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { color: '#10b981', weight: 4, dashArray: '6, 8', opacity: 0.9 }
      ).addTo(map);
      polylineRef.current = polyline;

      // Fit bounds to fit route nicely
      map.fitBounds(
        L.latLngBounds([
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ]),
        { padding: [50, 50] }
      );
    }

    // Nearby Online Drivers Markers
    drivers.forEach((drv) => {
      const isBike = drv.vehicle_type === 'Bike';
      const drvIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full ${
            isBike ? 'bg-amber-500' : 'bg-slate-900'
          } border-2 border-white shadow-md text-white font-bold text-xs">
            ${isBike ? '🏍️' : '🚗'}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const m = L.marker([drv.lat, drv.lng], { icon: drvIcon })
        .bindPopup(`<b>${drv.driver_name}</b><br/>${drv.vehicle_type} (${drv.vehicle_reg_number || 'Apni Car'})`)
        .addTo(map);
      markersRef.current[`driver_${drv.id}`] = m;
    });

    // Active Driver Marker
    if (activeDriverLocation) {
      const activeIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 border-2 border-white shadow-xl text-white font-bold text-sm ring-4 ring-emerald-500/40 animate-pulse">
            🚖
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const activeM = L.marker(activeDriverLocation, { icon: activeIcon })
        .bindPopup(`<b>Assigned Driver Location</b>`)
        .addTo(map);
      markersRef.current['active_driver'] = activeM;
    }
  }, [pickup, dropoff, drivers, activeDriverLocation]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner z-0`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
