export type Role = 'rider' | 'driver' | 'admin';

export type VehicleType = 'Bike' | 'Rickshaw' | 'Mini' | 'Go' | 'Business';

export interface User {
  id: string;
  role: Role;
  username: string;
  full_name: string;
  email: string;
  mobile_number: string;
  email_verified: boolean;
  avatar_url?: string;
  created_at?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  cnic: string;
  driving_licence: string;
  vehicle_type: VehicleType;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_colour: string;
  vehicle_reg_number: string;
  is_approved: boolean;
  cnic_front_url?: string;
  cnic_back_url?: string;
  licence_doc_url?: string;
  registration_doc_url?: string;
  is_online: boolean;
  current_lat: number;
  current_lng: number;
  rating: number;
  total_rides: number;
  active_subscription?: Subscription | null;
  user?: User;
}

export type SubscriptionPlan = 'daily' | 'weekly' | 'monthly';

export interface Subscription {
  id: string;
  driver_id: string;
  plan_type: SubscriptionPlan;
  amount: number;
  status: 'active' | 'expired';
  starts_at: string;
  expires_at: string;
  payment_tx_ref: string;
  created_at: string;
}

export type TripStatus =
  | 'requested'
  | 'searching'
  | 'accepted'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'started'
  | 'completed'
  | 'cancelled';

export interface TripOffer {
  id: string;
  trip_id: string;
  driver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  trip?: Trip;
  pickup_address?: string;
  dropoff_address?: string;
  fare_amount?: number;
  distance_km?: number;
  estimated_mins?: number;
  vehicle_type?: VehicleType;
  distance_to_pickup_km?: number;
}

export interface Trip {
  id: string;
  rider_id: string;
  driver_id?: string | null;
  vehicle_type: VehicleType;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  fare_amount: number;
  distance_km: number;
  estimated_mins: number;
  status: TripStatus;
  rider_rating?: number;
  driver_rating?: number;
  cancellation_reason?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  driver_info?: {
    full_name: string;
    mobile_number: string;
    vehicle_type: VehicleType;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_colour: string;
    vehicle_reg_number: string;
    rating: number;
    current_lat: number;
    current_lng: number;
  };
  rider_info?: {
    full_name: string;
    mobile_number: string;
  };
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  province: string;
  is_active: boolean;
  base_fare: number;
  per_km_rate: number;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface VehicleTariff {
  type: VehicleType;
  name: string;
  description: string;
  capacity: number;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  iconName: string;
}
