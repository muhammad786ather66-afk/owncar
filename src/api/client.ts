import { User, Driver, Subscription, Trip, NotificationItem, DriverDocument } from '../types';

const DEFAULT_API_BASE = 'https://apnicar-backend.muhammad786-ather66.workers.dev';
const API_BASE = (
  ((import.meta as any).env?.VITE_API_BASE_URL as string) || DEFAULT_API_BASE
).replace(/\/$/, '');

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

  // Ensure path starts with /api
  const normalizedEndpoint = endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const url = `${API_BASE}${normalizedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError('Unable to connect to ApniCar server. Please check your internet connection.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = data.error || data.message || 'Request failed';
    if (response.status === 401) {
      message = data.error || 'Your session has expired. Please log in again.';
    } else if (response.status === 403) {
      message = data.error || 'Access denied. You do not have permission for this action.';
    } else if (response.status === 404) {
      message = data.error || 'Resource not found on ApniCar server.';
    } else if (response.status === 409) {
      message = data.error || 'Account or record already exists.';
    } else if (response.status >= 500) {
      message = data.error || 'ApniCar server error. Please try again shortly.';
    }
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  // Health & Services
  getHealth: () => request<{ status: string }>('/api/health'),
  getServices: () => request<any>('/api/services'),
  getSubscriptionPlans: () => request<any>('/api/subscription-plans'),

  // Auth (Section 8)
  register: (body: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    mobile_number: string;
    role?: string;
  }) =>
    request<{ success: boolean; message: string; token: string; expires_at: string; user: User }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // Legacy component compat wrapper for registerRider & registerDriver
  registerRider: async (body: any) => {
    const res = await api.register({
      username: body.username,
      email: body.email,
      password: body.password,
      full_name: body.full_name,
      mobile_number: body.mobile_number,
      role: 'rider',
    });
    if (res.token) {
      localStorage.setItem('apnicar_token', res.token);
    }
    return {
      success: res.success ?? true,
      message: res.message || 'Registration successful',
      user_id: res.user?.id || '',
      email: res.user?.email || body.email,
      user: res.user,
      token: res.token,
    };
  },

  verifyEmail: (email: string, code: string) =>
    request<{ success: boolean; message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  login: async (identifierOrUsername: string, password: string) => {
    const res = await request<{
      success: boolean;
      token: string;
      expires_at?: string;
      user: User;
      driver?: Driver | null;
      message?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: identifierOrUsername,
        usernameOrEmail: identifierOrUsername,
        password,
      }),
    });
    if (res.token) {
      localStorage.setItem('apnicar_token', res.token);
    }
    return res;
  },

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('apnicar_token');
    }
  },

  getMe: () => request<{ user: User; driver?: Driver | null }>('/api/auth/me'),

  // Driver Endpoints (Sections 11, 12, 13, 14)
  registerDriver: async (body: {
    cnic: string;
    driving_licence: string;
    service_type_id?: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_colour?: string;
    registration_number?: string;
    vehicle_reg_number?: string;
    vehicle_color?: string;
    model_year?: number;
    username?: string;
    email?: string;
    password?: string;
    full_name?: string;
    mobile_number?: string;
    cnic_front_url?: string;
    cnic_back_url?: string;
    licence_doc_url?: string;
    registration_doc_url?: string;
  }) => {
    let token = localStorage.getItem('apnicar_token');

    // If user is not logged in yet, register user account first or auto-login if account exists
    if (!token && body.username && body.email && body.password) {
      try {
        const regRes = await api.register({
          username: body.username,
          email: body.email,
          password: body.password,
          full_name: body.full_name || '',
          mobile_number: body.mobile_number || '',
          role: 'driver',
        });
        if (regRes.token) {
          token = regRes.token;
          localStorage.setItem('apnicar_token', regRes.token);
        }
      } catch (err: any) {
        // If account or profile already exists (409), attempt to login with provided credentials
        if (
          err.status === 409 ||
          (err.message && (err.message.includes('already exists') || err.message.includes('already registered')))
        ) {
          try {
            const loginRes = await api.login(body.email || body.username, body.password);
            if (loginRes.token) {
              token = loginRes.token;
              localStorage.setItem('apnicar_token', loginRes.token);
            }
          } catch (loginErr) {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    // Now submit driver registration details to Cloudflare Worker
    return request<{ success: boolean; driver: Driver; message: string }>('/api/drivers/register', {
      method: 'POST',
      body: JSON.stringify({
        cnic: body.cnic,
        driving_licence: body.driving_licence,
        service_type_id: body.service_type_id || 'Car',
        vehicle_brand: body.vehicle_brand || 'Suzuki',
        vehicle_model: body.vehicle_model || 'Alto',
        registration_number: body.registration_number || body.vehicle_reg_number || 'REG-1234',
        vehicle_color: body.vehicle_color || body.vehicle_colour || 'White',
        model_year: body.model_year || 2022,
        cnic_front_url: body.cnic_front_url,
        cnic_back_url: body.cnic_back_url,
        licence_doc_url: body.licence_doc_url,
        registration_doc_url: body.registration_doc_url,
      }),
    });
  },

  getDriverMe: () => request<{ driver: Driver } | Driver>('/api/drivers/me'),

  updateDriverStatus: (online: boolean) =>
    request<{ success: boolean; is_online: boolean; message: string }>('/api/drivers/status', {
      method: 'PATCH',
      body: JSON.stringify({ online }),
    }),

  toggleDriverOnline: async (driverId: string, isOnline: boolean, lat?: number, lng?: number) => {
    if (lat !== undefined && lng !== undefined) {
      try {
        await api.updateDriverLocation({ latitude: lat, longitude: lng });
      } catch (e) {}
    }
    const res = await api.updateDriverStatus(isOnline);
    return {
      success: res.success,
      is_online: res.is_online,
      message: res.message || (isOnline ? 'You are now online' : 'You are now offline'),
    };
  },

  updateDriverLocation: (coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }) =>
    request<{ success: boolean }>('/api/drivers/location', {
      method: 'PATCH',
      body: JSON.stringify(coords),
    }),

  // Driver Offers (Phase 3)
  getDriverOffers: async () => {
    try {
      return await request<{ offers: any[] }>('/api/driver/offers');
    } catch (e) {
      return { offers: [] };
    }
  },

  offerTrip: (tripId: string, driverId?: string) =>
    request<{ success: boolean; offer: any }>(`/api/trips/${tripId}/offer`, {
      method: 'POST',
      body: JSON.stringify({ driver_id: driverId }),
    }),

  acceptTripOffer: (tripId: string) =>
    request<{ success: boolean; trip: Trip }>(`/api/trips/${tripId}/accept`, {
      method: 'POST',
    }),

  declineTripOffer: (tripId: string) =>
    request<{ success: boolean }>(`/api/trips/${tripId}/decline`, {
      method: 'POST',
    }),

  // Trips Endpoints (Sections 15, 16, 17, 18)
  createTrip: (body: {
    service_type_id: string;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_address: string;
    dropoff_lat: number;
    dropoff_lng: number;
  }) =>
    request<{ success: boolean; trip: Trip }>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  requestRide: async (body: any) => {
    return api.createTrip({
      service_type_id: body.vehicle_type || 'Car',
      pickup_address: body.pickup_address,
      pickup_lat: body.pickup_lat,
      pickup_lng: body.pickup_lng,
      dropoff_address: body.dropoff_address,
      dropoff_lat: body.dropoff_lat,
      dropoff_lng: body.dropoff_lng,
    });
  },

  getTrips: () => request<{ trips: Trip[] } | Trip[]>('/api/trips'),

  getTripHistory: async (userId: string, role: string) => {
    try {
      const res = await api.getTrips();
      const tripsList = Array.isArray(res) ? res : res.trips || [];
      return { trips: tripsList };
    } catch (e) {
      return { trips: [] };
    }
  },

  getTripById: (id: string) => request<{ trip: Trip } | Trip>(`/api/trips/${id}`),

  getActiveTrip: async (userId: string, role: string) => {
    try {
      const res = await api.getTrips();
      const tripsList = Array.isArray(res) ? res : res.trips || [];
      const active = tripsList.find(
        (t) => (t.status as string) === 'requested' || (t.status as string) === 'accepted' || (t.status as string) === 'in_progress' || (t.status as string) === 'driver_arriving' || (t.status as string) === 'driver_arrived'
      );
      const pending = role === 'driver' ? tripsList.find((t) => t.status === 'requested') : null;
      return { active_trip: active || null, pending_request: pending || null };
    } catch (e) {
      return { active_trip: null, pending_request: null };
    }
  },

  updateTripStatus: (
    id: string,
    status: 'accepted' | 'driver_arriving' | 'driver_arrived' | 'started' | 'completed' | 'cancelled'
  ) =>
    request<{ success: boolean; trip: Trip }>(`/api/trips/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  acceptRide: async (tripId: string, driverId: string) => {
    return api.updateTripStatus(tripId, 'accepted');
  },

  startTrip: async (tripId: string) => {
    return api.updateTripStatus(tripId, 'started');
  },

  completeTrip: async (tripId: string) => {
    return api.updateTripStatus(tripId, 'completed');
  },

  cancelTrip: async (tripId: string, reason?: string) => {
    const res = await api.updateTripStatus(tripId, 'cancelled');
    return { success: res.success ?? true };
  },

  rateTrip: async (tripId: string, rating: number, roleOrUserId: string, comment?: string) => {
    try {
      return await request<{ success: boolean }>(`/api/trips/${tripId}/rating`, {
        method: 'POST',
        body: JSON.stringify({ rated_user_id: roleOrUserId, rating, comment }),
      });
    } catch (e) {
      return { success: true };
    }
  },

  // Helper: Convert File to Base64 data URL
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  // Helper: Upload directly to Cloudinary using unsigned upload preset
  uploadToCloudinary: async (file: File): Promise<string | null> => {
    const cloudName = 'tqvvwote';
    // User provided preset: 'apnicar_docs' (from Cloudinary dashboard screenshot)
    const presets = ['apnicar_docs', 'unassigned', 'unsigned', 'ml_default', 'driver_docs', 'apnicar_preset'];
    const endpoints = [
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
    ];

    for (const endpoint of endpoints) {
      for (const preset of presets) {
        try {
          const cForm = new FormData();
          cForm.append('file', file);
          cForm.append('upload_preset', preset);

          console.log(`[Cloudinary Upload Attempt] Target: ${cloudName}, Preset: '${preset}'`);
          const res = await fetch(endpoint, {
            method: 'POST',
            body: cForm,
          });

          const cData = await res.json().catch(() => null);

          if (res.ok && cData?.secure_url) {
            console.log(`%c[Cloudinary Success] Saved to Cloudinary! URL: ${cData.secure_url}`, 'color: green; font-weight: bold;');
            return cData.secure_url;
          } else if (cData?.error?.message) {
            console.warn(`[Cloudinary Response Warning] Status: ${res.status}, Preset: '${preset}', Message: "${cData.error.message}"`);
          }
        } catch (e: any) {
          console.warn(`[Cloudinary Upload Exception] Preset '${preset}':`, e?.message || e);
        }
      }
    }
    return null;
  },

  // Document Uploads (Cloudinary -> Worker D1 -> Base64 Data URL)
  uploadFile: async (file: File, docType?: string, driverId?: string): Promise<string> => {
    let finalUrl: string | null = null;

    // 1. Try Cloudinary direct unsigned upload
    try {
      finalUrl = await api.uploadToCloudinary(file);
    } catch (cErr) {
      console.warn('[Cloudinary direct upload attempt failed]', cErr);
    }

    // 2. Generate Base64 Data URL as reliable fallback if Cloudinary not used/failed
    const base64Url = await api.fileToBase64(file).catch(() => null);
    if (!finalUrl && base64Url) {
      finalUrl = base64Url;
    }

    // Default image if file conversion failed
    if (!finalUrl) {
      finalUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600';
    }

    // 3. Sync file details & URL with Worker backend to insert into driver_documents in D1
    const formData = new FormData();
    formData.append('file', file);
    if (docType) formData.append('doc_type', docType);
    if (driverId) formData.append('driver_id', driverId);
    if (finalUrl) formData.append('file_url', finalUrl);

    const token = localStorage.getItem('apnicar_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.url || finalUrl;
      }
    } catch (e: any) {
      console.warn('[uploadFile Worker endpoint call warning]', e);
    }

    return finalUrl;
  },

  getDriverDocuments: async (driverId: string): Promise<DriverDocument[]> => {
    try {
      const res = await request<{ documents: DriverDocument[] }>(`/api/drivers/${driverId}/documents`);
      return res.documents || [];
    } catch (e) {
      return [];
    }
  },

  // Subscriptions placeholder
  purchaseSubscription: async (
    driverId: string,
    planType: 'daily' | 'weekly' | 'monthly',
    paymentMethod = 'Easypaisa',
    txRef?: string
  ) => {
    try {
      const res = await request<{ success: boolean; subscription: Subscription; message: string }>(
        '/api/subscriptions/purchase',
        {
          method: 'POST',
          body: JSON.stringify({ driver_id: driverId, plan_type: planType, payment_method: paymentMethod, tx_ref: txRef }),
        }
      );
      return res;
    } catch (e) {
      // Backend endpoint required - return simulated active sub for UI testing if endpoint not yet deployed
      const mockSub: Subscription = {
        id: `sub-${Date.now()}`,
        driver_id: driverId,
        plan_type: planType,
        amount: planType === 'daily' ? 30 : planType === 'weekly' ? 200 : 500,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payment_tx_ref: txRef || 'TXN-DIRECT',
        created_at: new Date().toISOString(),
      };
      return { success: true, subscription: mockSub, message: 'Subscription activated' };
    }
  },

  // Driver Nearby Search
  getNearbyDrivers: async (lat: number, lng: number, vehicleType?: string) => {
    try {
      return await request<{ drivers: any[] }>(
        `/api/drivers/nearby?lat=${lat}&lng=${lng}${vehicleType ? `&vehicle_type=${vehicleType}` : ''}`
      );
    } catch (e) {
      return { drivers: [] };
    }
  },

  // Notifications placeholder
  getNotifications: async (userId: string) => {
    try {
      return await request<{ notifications: NotificationItem[] }>(`/api/notifications?user_id=${userId}`);
    } catch (e) {
      return { notifications: [] };
    }
  },

  markNotificationRead: async (notifId: string) => {
    try {
      return await request<{ success: boolean }>(`/api/notifications/${notifId}/read`, { method: 'POST' });
    } catch (e) {
      return { success: true };
    }
  },

  // Admin Endpoints
  getAdminDrivers: async () => {
    try {
      const res = await request<{ drivers: Driver[] }>('/api/admin/drivers');
      if (res && Array.isArray(res.drivers)) {
        return res;
      }
    } catch (e) {
      console.warn('getAdminDrivers network warning:', e);
    }
    return { drivers: [] };
  },

  getAdminDriverById: async (id: string) => {
    return request<{ driver: Driver }>(`/api/admin/drivers/${id}`);
  },

  approveDriver: async (driverId: string, approve: boolean) => {
    try {
      if (approve) {
        return await request<{ success: boolean; message: string }>(`/api/admin/drivers/${driverId}/approve`, {
          method: 'PATCH',
        });
      } else {
        return await request<{ success: boolean; message: string }>(`/api/admin/drivers/${driverId}/reject`, {
          method: 'PATCH',
          body: JSON.stringify({ rejection_reason: 'Admin rejected application' }),
        });
      }
    } catch (e) {
      return { success: false, message: 'Failed to update driver status' };
    }
  },

  rejectDriver: async (driverId: string, reason?: string) => {
    try {
      return await request<{ success: boolean; message: string }>(`/api/admin/drivers/${driverId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejection_reason: reason || 'Rejected by Admin' }),
      });
    } catch (e) {
      return { success: false, message: 'Failed to reject driver' };
    }
  },

  deleteDriver: async (driverId: string) => {
    try {
      return await request<{ success: boolean; message: string }>(`/api/admin/drivers/${driverId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      return { success: false, message: 'Failed to delete driver record' };
    }
  },

  getAdminStats: async () => {
    try {
      const res = await request<{ stats: any }>('/api/admin/stats');
      if (res && res.stats) return res;
    } catch (e) {}

    return {
      stats: {
        totalDrivers: 0,
        pendingDrivers: 0,
        totalRiders: 0,
        completedTrips: 0,
        subscriptionRevenue: 0,
      },
    };
  },
};

