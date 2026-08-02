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
 * Major Cities of Punjab, Pakistan (ApniCar Operational Zone)
 */
export const PUNJAB_CITIES = [
  { name: 'Lahore', lat: 31.5204, lng: 74.3587, address: 'Liberty Market, Gulberg III, Lahore, Punjab' },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350, address: 'Clock Tower, Faisalabad, Punjab' },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169, address: 'Saddar, Rawalpindi, Punjab' },
  { name: 'Multan', lat: 30.1575, lng: 71.5249, address: 'Ghanta Ghar, Multan, Punjab' },
  { name: 'Gujranwala', lat: 32.1877, lng: 74.1945, address: 'GT Road, Gujranwala, Punjab' },
  { name: 'Sargodha', lat: 32.0836, lng: 72.6711, address: 'University Road, Sargodha, Punjab' },
  { name: 'Sialkot', lat: 32.4945, lng: 74.5229, address: 'Paris Road, Sialkot, Punjab' },
  { name: 'Bahawalpur', lat: 29.3544, lng: 71.6911, address: 'Farid Gate, Bahawalpur, Punjab' },
  { name: 'Gujarat', lat: 32.5742, lng: 74.0754, address: 'GTS Chowk, Gujarat, Punjab' },
  { name: 'Sheikhupura', lat: 31.7167, lng: 73.9850, address: 'Company Bagh, Sheikhupura, Punjab' },
  { name: 'Sahiwal', lat: 30.6682, lng: 73.1114, address: 'High Street, Sahiwal, Punjab' },
  { name: 'Rahim Yar Khan', lat: 28.4212, lng: 70.2989, address: 'Town Hall, Rahim Yar Khan, Punjab' },
  { name: 'Jhelum', lat: 32.9405, lng: 73.7276, address: 'Civil Lines, Jhelum, Punjab' },
  { name: 'Attock', lat: 33.7660, lng: 72.3609, address: 'Kutchery Chowk, Attock, Punjab' },
  { name: 'Kasur', lat: 31.1179, lng: 74.4461, address: 'Roshani Gate, Kasur, Punjab' },
  { name: 'Okara', lat: 30.8081, lng: 73.4458, address: 'GT Road, Okara, Punjab' },
  { name: 'Mianwali', lat: 32.5853, lng: 71.5436, address: 'Ballo Khel Road, Mianwali, Punjab' },
  { name: 'Dera Ghazi Khan', lat: 30.0561, lng: 70.6348, address: 'College Road, Dera Ghazi Khan, Punjab' },
  { name: 'Chakwal', lat: 32.9328, lng: 72.8630, address: 'Talagang Road, Chakwal, Punjab' },
  { name: 'Chiniot', lat: 31.7200, lng: 72.9789, address: 'Kutchery Road, Chiniot, Punjab' },
  { name: 'Hafizabad', lat: 32.0709, lng: 73.6880, address: 'Guijranwala Road, Hafizabad, Punjab' },
  { name: 'Khanewal', lat: 30.3017, lng: 71.9321, address: 'Tariq Road, Khanewal, Punjab' },
  { name: 'Layyah', lat: 30.9613, lng: 70.9390, address: 'Chowk Azam Road, Layyah, Punjab' },
  { name: 'Lodhran', lat: 29.5405, lng: 71.6337, address: 'Super Highway, Lodhran, Punjab' },
  { name: 'Mandi Bahauddin', lat: 32.5870, lng: 73.4912, address: 'Sadaat Market, Mandi Bahauddin, Punjab' },
  { name: 'Muzaffargarh', lat: 30.0703, lng: 71.1933, address: 'Multan Road, Muzaffargarh, Punjab' },
  { name: 'Nankana Sahib', lat: 31.4492, lng: 73.7124, address: 'Gurdwara Road, Nankana Sahib, Punjab' },
  { name: 'Narowal', lat: 32.1020, lng: 74.8730, address: 'Circular Road, Narowal, Punjab' },
  { name: 'Pakpattan', lat: 30.3410, lng: 73.3866, address: 'Sahiwal Road, Pakpattan, Punjab' },
  { name: 'Rajanpur', lat: 29.1035, lng: 70.3250, address: 'Indus Highway, Rajanpur, Punjab' },
  { name: 'Toba Tek Singh', lat: 30.9709, lng: 72.4826, address: 'Main Bazar, Toba Tek Singh, Punjab' },
  { name: 'Vehari', lat: 30.0419, lng: 72.3528, address: 'Club Road, Vehari, Punjab' },
  { name: 'Bhakkar', lat: 31.6253, lng: 71.0657, address: 'Jhang Road, Bhakkar, Punjab' },
];

export const PAKISTAN_CITIES = PUNJAB_CITIES;

