import { User, Driver, Subscription, Trip, NotificationItem } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('apnicar_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed', response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  registerRider: (body: any) => request<{ success: boolean; message: string; user_id: string; email: string; verification_code_demo?: string }>('/auth/register-rider', { method: 'POST', body: JSON.stringify(body) }),
  registerDriver: (body: any) => request<{ success: boolean; message: string; user_id: string; email: string; verification_code_demo?: string }>('/auth/register-driver', { method: 'POST', body: JSON.stringify(body) }),
  verifyEmail: (email: string, code: string) => request<{ success: boolean; message: string }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }),
  login: (usernameOrEmail: string, password: string) => request<{ success: boolean; token: string; user: User; driver?: Driver | null }>('/auth/login', { method: 'POST', body: JSON.stringify({ usernameOrEmail, password }) }),

  // Upload
  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('apnicar_token');
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  },

  // Driver nearby & status
  getNearbyDrivers: (lat: number, lng: number, vehicleType?: string) =>
    request<{ drivers: any[] }>(`/drivers/nearby?lat=${lat}&lng=${lng}${vehicleType ? `&vehicle_type=${vehicleType}` : ''}`),
  
  toggleDriverOnline: (driverId: string, isOnline: boolean, lat?: number, lng?: number) =>
    request<{ success: boolean; is_online: boolean; message: string }>('/drivers/toggle-online', {
      method: 'POST',
      body: JSON.stringify({ driver_id: driverId, is_online: isOnline, lat, lng }),
    }),

  // Subscriptions
  purchaseSubscription: (driverId: string, planType: 'daily' | 'weekly' | 'monthly', paymentMethod = 'Easypaisa', txRef?: string) =>
    request<{ success: boolean; subscription: Subscription; message: string }>('/subscriptions/purchase', {
      method: 'POST',
      body: JSON.stringify({ driver_id: driverId, plan_type: planType, payment_method: paymentMethod, tx_ref: txRef }),
    }),

  // Trips
  requestRide: (body: any) => request<{ success: boolean; trip: Trip }>('/trips/request', { method: 'POST', body: JSON.stringify(body) }),
  getActiveTrip: (userId: string, role: string) => request<{ active_trip: Trip | null; pending_request?: Trip | null }>(`/trips/active?user_id=${userId}&role=${role}`),
  acceptRide: (tripId: string, driverId: string) => request<{ success: boolean; trip: Trip }>(`/trips/${tripId}/accept`, { method: 'POST', body: JSON.stringify({ driver_id: driverId }) }),
  startTrip: (tripId: string) => request<{ success: boolean; trip: Trip }>(`/trips/${tripId}/start`, { method: 'POST' }),
  completeTrip: (tripId: string) => request<{ success: boolean; trip: Trip }>(`/trips/${tripId}/complete`, { method: 'POST' }),
  rateTrip: (tripId: string, rating: number, role: string) => request<{ success: boolean }>(`/trips/${tripId}/rate`, { method: 'POST', body: JSON.stringify({ rating, role }) }),
  cancelTrip: (tripId: string, reason?: string) => request<{ success: boolean }>(`/trips/${tripId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getTripHistory: (userId: string, role: string) => request<{ trips: Trip[] }>(`/trips/history?user_id=${userId}&role=${role}`),

  // Notifications
  getNotifications: (userId: string) => request<{ notifications: NotificationItem[] }>(`/notifications?user_id=${userId}`),
  markNotificationRead: (notifId: string) => request<{ success: boolean }>(`/notifications/${notifId}/read`, { method: 'POST' }),

  // Admin
  getAdminDrivers: () => request<{ drivers: Driver[] }>('/admin/drivers'),
  approveDriver: (driverId: string, approve: boolean) => request<{ success: boolean; message: string }>('/admin/approve-driver', { method: 'POST', body: JSON.stringify({ driver_id: driverId, approve }) }),
  getAdminStats: () => request<{ stats: any }>('/admin/stats'),
};
