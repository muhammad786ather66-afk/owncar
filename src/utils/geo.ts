import { VehicleTariff, VehicleType } from '../types';

export const VEHICLE_TARIFFS: Record<VehicleType, VehicleTariff> = {
  Bike: {
    type: 'Bike',
    name: 'Apni Bike',
    description: 'Fastest 1-person commute through city traffic',
    capacity: 1,
    base_fare: 40,
    per_km_rate: 20,
    min_fare: 60,
    iconName: 'Bike',
  },
  Rickshaw: {
    type: 'Rickshaw',
    name: 'Auto Rickshaw',
    description: 'Affordable 3-seater door-to-door ride',
    capacity: 3,
    base_fare: 70,
    per_km_rate: 30,
    min_fare: 100,
    iconName: 'Car',
  },
  Mini: {
    type: 'Mini',
    name: 'Apni Mini',
    description: 'Compact AC hatchbacks (Alto, Cultus, WagonR)',
    capacity: 4,
    base_fare: 120,
    per_km_rate: 45,
    min_fare: 180,
    iconName: 'Car',
  },
  Go: {
    type: 'Go',
    name: 'Apni Go (Comfort)',
    description: 'Comfortable sedans & premium hatchbacks with AC',
    capacity: 4,
    base_fare: 150,
    per_km_rate: 55,
    min_fare: 230,
    iconName: 'Car',
  },
  Business: {
    type: 'Business',
    name: 'Apni Business',
    description: 'Executive sedans (City, Civic, Corolla) for VIP trips',
    capacity: 4,
    base_fare: 220,
    per_km_rate: 75,
    min_fare: 350,
    iconName: 'Sparkles',
  },
};

/**
 * Calculate Haversine distance in kilometers between two geo coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place
}

/**
 * Estimate travel duration in minutes based on distance & average city speed
 */
export function calculateEstimatedMins(distanceKm: number, vType: VehicleType): number {
  let speedKmH = 25; // default city speed
  if (vType === 'Bike') speedKmH = 32;
  if (vType === 'Rickshaw') speedKmH = 22;
  
  const hours = distanceKm / speedKmH;
  const mins = Math.ceil(hours * 60) + 3; // +3 mins pickup buffer
  return Math.max(mins, 5);
}

/**
 * Calculate estimated trip fare in PKR
 */
export function calculateFare(distanceKm: number, vType: VehicleType): number {
  const tariff = VEHICLE_TARIFFS[vType];
  const calculated = tariff.base_fare + distanceKm * tariff.per_km_rate;
  return Math.max(Math.round(calculated), tariff.min_fare);
}

/**
 * OpenStreetMap Nominatim Free Geocoding API
 */
export async function searchLocationOSM(query: string): Promise<Array<{ display_name: string; lat: number; lon: number }>> {
  if (!query || query.trim().length < 3) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Pakistan')}&limit=5`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('OSM Geocode search error:', error);
    return [];
  }
}

/**
 * Reverse geocode lat/lng to human address string using OpenStreetMap Nominatim
 */
export async function reverseGeocodeOSM(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (!response.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(',');
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (err) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Popular Pakistan Cities preset coordinates
 */
export const PAKISTAN_CITIES = [
  { name: 'Lahore', lat: 31.5204, lng: 74.3587, address: 'Liberty Market, Gulberg III, Lahore' },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, address: 'Clifton Beach, Karachi' },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479, address: 'F-7 Markaz, Islamabad' },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169, address: 'Saddar, Rawalpindi' },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249, address: 'University Road, Peshawar' },
  { name: 'Multan', lat: 30.1575, lng: 71.5249, address: 'Ghanta Ghar, Multan' },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350, address: 'Clock Tower, Faisalabad' },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750, address: 'Serena Road, Quetta' },
];
