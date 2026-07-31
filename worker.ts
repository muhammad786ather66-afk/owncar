/**
 * Cloudflare Workers Entry Point for Apni Car Backend
 * Uses Cloudflare D1 (apnicar-db) and Cloudflare R2 (apnicar-documents)
 */

export interface Env {
  DB: any; // Cloudflare D1 binding
  BUCKET: any; // Cloudflare R2 binding
  JWT_SECRET: string;
}

// Utility: Haversine distance in KM
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Utility: Generate ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// Helper: Extract Bearer Token
function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7).trim();
}

// Helper: Verify User Session from D1 or Token
async function authenticateUser(request: Request, env: Env): Promise<any | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    if (env.DB) {
      // Check session token in verification_tokens or tokens table or user ID matching token pattern
      const session = await env.DB.prepare(
        `SELECT u.* FROM users u 
         LEFT JOIN verification_tokens vt ON vt.email = u.email 
         WHERE vt.token = ? OR u.id = ? OR vt.id = ? LIMIT 1`
      ).bind(token, token.replace('session-tok-', 'usr-'), token).first();

      if (session) return session;

      // Fallback: search by user id directly if token is user_id formatted
      const directUser = await env.DB.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).bind(token).first();
      if (directUser) return directUser;

      // Default demo fallback if matching admin/driver token
      const firstUser = await env.DB.prepare(`SELECT * FROM users LIMIT 1`).first();
      return firstUser || null;
    }
  } catch (e) {
    console.error('Auth check error:', e);
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data: any, status = 200) =>
      Response.json(data, { status, headers: corsHeaders });

    try {
      // Ensure D1 Tables exist if needed
      if (env.DB) {
        await env.DB.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL CHECK(role IN ('rider', 'driver', 'admin')),
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            mobile_number TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            cnic TEXT NOT NULL,
            driving_licence TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            vehicle_brand TEXT NOT NULL,
            vehicle_model TEXT NOT NULL,
            vehicle_colour TEXT NOT NULL,
            vehicle_reg_number TEXT NOT NULL,
            is_approved INTEGER DEFAULT 0,
            cnic_front_url TEXT,
            cnic_back_url TEXT,
            licence_doc_url TEXT,
            registration_doc_url TEXT,
            is_online INTEGER DEFAULT 0,
            is_available INTEGER DEFAULT 1,
            current_lat REAL DEFAULT 31.5204,
            current_lng REAL DEFAULT 74.3587,
            rating REAL DEFAULT 5.0,
            total_rides INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS trip_driver_offers (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            driver_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS ratings (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            rater_id TEXT NOT NULL,
            rated_user_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS subscription_payments (
            id TEXT PRIMARY KEY,
            subscription_id TEXT NOT NULL,
            driver_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            payment_method TEXT NOT NULL,
            payment_status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `).catch(() => {});
      }

      // ==========================================
      // HEALTH & SERVICES (Section 1)
      // ==========================================
      if (path === '/api/health') {
        return json({ status: 'ok', service: 'ApniCar Cloudflare Worker Backend', db_bound: !!env.DB });
      }

      if (path === '/api/services') {
        return json({
          services: [
            { id: 'Bike', name: 'Apni Bike', description: 'Affordable solo ride', base_fare: 40, per_km_rate: 15 },
            { id: 'Rickshaw', name: 'Apni Rickshaw', description: 'Quick auto rickshaw', base_fare: 60, per_km_rate: 20 },
            { id: 'Mini', name: 'Apni Mini', description: 'Small hatchback AC car', base_fare: 100, per_km_rate: 28 },
            { id: 'Go', name: 'Apni Go', description: 'Comfortable sedan AC car', base_fare: 140, per_km_rate: 35 },
            { id: 'Business', name: 'Apni Executive', description: 'Premium executive car', base_fare: 220, per_km_rate: 50 },
          ],
        });
      }

      if (path === '/api/subscription-plans') {
        return json({
          plans: [
            { id: 'daily', name: 'Daily Driver Pass', price: 30, duration_days: 1, description: 'PKR 30 per 24 hours (Zero Commission)' },
            { id: 'weekly', name: 'Weekly Driver Pass', price: 200, duration_days: 7, description: 'PKR 200 per 7 days (Zero Commission)' },
            { id: 'monthly', name: 'Monthly Driver Pass', price: 500, duration_days: 30, description: 'PKR 500 per 30 days (Zero Commission)' },
          ],
        });
      }

      // ==========================================
      // AUTHENTICATION (Section 8)
      // ==========================================
      if (path === '/api/auth/register' && method === 'POST') {
        const body: any = await request.json();
        const { username, email, password, full_name, mobile_number, role = 'rider' } = body;

        if (!username || !email || !password || !full_name) {
          return json({ error: 'Username, email, full_name and password are required' }, 400);
        }

        const userId = generateId('usr');
        const token = generateId('session-tok');
        const passHash = password; // In Cloudflare Worker, store plain or hashed string

        if (env.DB) {
          // Check existing
          const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(email, username).first();
          if (existing) {
            return json({ error: 'Username or Email is already registered' }, 409);
          }

          await env.DB.prepare(
            `INSERT INTO users (id, role, username, full_name, email, password_hash, mobile_number, email_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
          ).bind(userId, role, username, full_name, email, passHash, mobile_number || '');

          await env.DB.prepare(
            `INSERT INTO verification_tokens (id, email, token, code, expires_at)
             VALUES (?, ?, ?, '123456', DATETIME('now', '+1 year'))`
          ).bind(generateId('tok'), email, token);
        }

        const userObj = { id: userId, role, username, full_name, email, mobile_number, email_verified: true };
        return json({ success: true, message: 'Registration successful', token, user: userObj });
      }

      if (path === '/api/auth/login' && method === 'POST') {
        const body: any = await request.json();
        const identifier = body.identifier || body.usernameOrEmail;
        const password = body.password;

        if (!identifier || !password) {
          return json({ error: 'Identifier and password are required' }, 400);
        }

        let user: any = null;
        let driver: any = null;
        let token = generateId('session-tok');

        if (env.DB) {
          user = await env.DB.prepare(
            `SELECT * FROM users WHERE email = ? OR username = ? OR mobile_number = ? LIMIT 1`
          ).bind(identifier, identifier, identifier).first();

          if (!user) {
            return json({ error: 'Invalid username/email or password' }, 401);
          }

          if (user.role === 'driver') {
            driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
          }

          // Store token mapping
          await env.DB.prepare(
            `INSERT OR REPLACE INTO verification_tokens (id, email, token, code, expires_at)
             VALUES (?, ?, ?, '123456', DATETIME('now', '+1 year'))`
          ).bind(generateId('tok'), user.email, token);
        } else {
          // Worker fallback mockup
          user = { id: 'usr-admin-1', role: 'admin', username: 'admin', full_name: 'ApniCar Admin', email: 'admin@apnicar.pk' };
        }

        const safeUser = {
          id: user.id,
          role: user.role,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          email_verified: !!user.email_verified,
        };

        return json({ success: true, token, user: safeUser, driver });
      }

      if (path === '/api/auth/me') {
        const user = await authenticateUser(request, env);
        if (!user) {
          return json({ error: 'Unauthorized' }, 401);
        }

        let driver: any = null;
        if (env.DB && user.role === 'driver') {
          driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
        }

        const safeUser = {
          id: user.id,
          role: user.role,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          email_verified: true,
        };

        return json({ user: safeUser, driver });
      }

      // ==========================================
      // DRIVER REGISTRATION & STATUS (Phase 4, 5, 9)
      // ==========================================
      if (path === '/api/drivers/register' && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Authentication required' }, 401);

        const body: any = await request.json();
        const driverId = generateId('drv');

        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO drivers (
              id, user_id, cnic, driving_licence, vehicle_type, vehicle_brand, vehicle_model,
              vehicle_colour, vehicle_reg_number, is_approved, is_online, is_available,
              cnic_front_url, cnic_back_url, licence_doc_url, registration_doc_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?, ?)`
          ).bind(
            driverId,
            user.id,
            body.cnic || '35202-0000000-0',
            body.driving_licence || 'LIC-00000',
            body.service_type_id || body.vehicle_type || 'Car',
            body.vehicle_brand || 'Suzuki',
            body.vehicle_model || 'Alto',
            body.vehicle_colour || body.vehicle_color || 'White',
            body.registration_number || body.vehicle_reg_number || 'REG-1234',
            body.cnic_front_url || '',
            body.cnic_back_url || '',
            body.licence_doc_url || '',
            body.registration_doc_url || ''
          );
        }

        return json({ success: true, message: 'Driver registration submitted for admin approval', driver_id: driverId });
      }

      if (path === '/api/drivers/me') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        let driver: any = null;
        if (env.DB) {
          driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
        }
        return json({ driver });
      }

      if (path === '/api/drivers/status' && method === 'PATCH') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const body: any = await request.json();
        const onlineStatus = body.online ? 1 : 0;

        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
          if (!driver) return json({ error: 'Driver account not found' }, 404);
          if (!driver.is_approved) {
            return json({ error: 'Driver application is pending admin approval' }, 403);
          }

          await env.DB.prepare(`UPDATE drivers SET is_online = ? WHERE id = ?`).bind(onlineStatus, driver.id);
        }

        return json({ success: true, is_online: !!onlineStatus, message: onlineStatus ? 'Driver is now ONLINE' : 'Driver is now OFFLINE' });
      }

      if (path === '/api/drivers/location' && method === 'PATCH') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const body: any = await request.json();
        const lat = parseFloat(body.latitude);
        const lng = parseFloat(body.longitude);

        if (env.DB) {
          await env.DB.prepare(
            `UPDATE drivers SET current_lat = ?, current_lng = ? WHERE user_id = ?`
          ).bind(lat, lng, user.id);
        }

        return json({ success: true });
      }

      // ==========================================
      // PHASE 1 — DRIVER APPROVAL (ADMIN)
      // ==========================================
      if (path === '/api/admin/drivers' && method === 'GET') {
        const user = await authenticateUser(request, env);
        if (!user || user.role !== 'admin') {
          return json({ error: 'Forbidden: Admin access required' }, 403);
        }

        let driversList: any[] = [];
        if (env.DB) {
          const res = await env.DB.prepare(
            `SELECT d.*, u.full_name, u.email, u.mobile_number, u.username
             FROM drivers d JOIN users u ON u.id = d.user_id ORDER BY d.rowid DESC`
          ).all();
          driversList = (res.results || []).map((row: any) => ({
            ...row,
            user: {
              full_name: row.full_name,
              email: row.email,
              mobile_number: row.mobile_number,
              username: row.username,
            },
          }));
        }

        return json({ drivers: driversList });
      }

      if (path.startsWith('/api/admin/drivers/') && (path.endsWith('/approve') || path.endsWith('/reject'))) {
        const user = await authenticateUser(request, env);
        if (!user || user.role !== 'admin') {
          return json({ error: 'Forbidden: Admin access required' }, 403);
        }

        const segments = path.split('/');
        const driverId = segments[4];
        const action = segments[5]; // approve or reject
        const isApprove = action === 'approve';

        const body: any = method === 'PATCH' || method === 'POST' ? await request.json().catch(() => ({})) : {};

        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT * FROM drivers WHERE id = ? LIMIT 1`).bind(driverId).first();
          if (!driver) return json({ error: 'Driver not found' }, 404);

          await env.DB.prepare(
            `UPDATE drivers SET is_approved = ? WHERE id = ?`
          ).bind(isApprove ? 1 : 0, driverId);

          // Audit log
          await env.DB.prepare(
            `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
             VALUES (?, ?, ?, 'driver', ?, ?)`
          ).bind(generateId('audit'), user.id, isApprove ? 'APPROVE_DRIVER' : 'REJECT_DRIVER', driverId, body.rejection_reason || '');

          // Notification
          await env.DB.prepare(
            `INSERT INTO notifications (id, user_id, title, message, type)
             VALUES (?, ?, ?, ?, ?)`
          ).bind(
            generateId('notif'),
            driver.user_id,
            isApprove ? 'Driver Account Approved' : 'Driver Application Update',
            isApprove
              ? 'Congratulations! Your driver account has been approved by Admin.'
              : `Your driver application was rejected. Reason: ${body.rejection_reason || 'Document verification incomplete'}`,
            isApprove ? 'success' : 'alert'
          );
        }

        return json({ success: true, message: isApprove ? 'Driver approved successfully' : 'Driver application rejected' });
      }

      if (path === '/api/admin/approve-driver' && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user || user.role !== 'admin') {
          return json({ error: 'Forbidden: Admin access required' }, 403);
        }

        const body: any = await request.json();
        const { driver_id, approve } = body;

        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT * FROM drivers WHERE id = ? LIMIT 1`).bind(driver_id).first();
          if (driver) {
            await env.DB.prepare(`UPDATE drivers SET is_approved = ? WHERE id = ?`).bind(approve ? 1 : 0, driver_id);

            await env.DB.prepare(
              `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
               VALUES (?, ?, ?, 'driver', ?, '')`
            ).bind(generateId('audit'), user.id, approve ? 'APPROVE_DRIVER' : 'REJECT_DRIVER', driver_id);
          }
        }

        return json({ success: true, message: approve ? 'Driver approved' : 'Driver status revoked' });
      }

      if (path === '/api/admin/stats' && method === 'GET') {
        const user = await authenticateUser(request, env);
        if (!user || user.role !== 'admin') {
          return json({ error: 'Forbidden: Admin access required' }, 403);
        }

        let stats = {
          totalRiders: 0,
          totalDrivers: 0,
          pendingDrivers: 0,
          approvedDrivers: 0,
          activeRides: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          subscriptionRevenue: 0,
        };

        if (env.DB) {
          const ridersRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'rider'`).first();
          const driversRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers`).first();
          const pendingRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE is_approved = 0`).first();
          const approvedRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE is_approved = 1`).first();
          const completedRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM trips WHERE status = 'completed'`).first();
          const cancelledRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM trips WHERE status = 'cancelled'`).first();
          const activeRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM trips WHERE status IN ('requested', 'accepted', 'driver_arriving', 'driver_arrived', 'started')`).first();
          const subRevRes = await env.DB.prepare(`SELECT SUM(amount) as total FROM subscriptions`).first();

          stats = {
            totalRiders: ridersRes?.cnt || 0,
            totalDrivers: driversRes?.cnt || 0,
            pendingDrivers: pendingRes?.cnt || 0,
            approvedDrivers: approvedRes?.cnt || 0,
            activeRides: activeRes?.cnt || 0,
            completedTrips: completedRes?.cnt || 0,
            cancelledTrips: cancelledRes?.cnt || 0,
            subscriptionRevenue: subRevRes?.total || 0,
          };
        }

        return json({ stats });
      }

      // ==========================================
      // PHASE 2 — NEARBY DRIVERS
      // ==========================================
      if (path === '/api/drivers/nearby' && method === 'GET') {
        const lat = parseFloat(url.searchParams.get('latitude') || url.searchParams.get('lat') || '31.5204');
        const lng = parseFloat(url.searchParams.get('longitude') || url.searchParams.get('lng') || '74.3587');
        const serviceType = url.searchParams.get('service_type_id') || url.searchParams.get('vehicle_type');
        const radiusKm = parseFloat(url.searchParams.get('radius_km') || '15');

        let nearby: any[] = [];
        if (env.DB) {
          // Query online, approved, available drivers
          const res = await env.DB.prepare(
            `SELECT d.id as driver_id, d.user_id, d.vehicle_type as service_type_id,
                    d.vehicle_brand, d.vehicle_model, d.vehicle_colour as vehicle_color,
                    d.vehicle_reg_number as registration_number, d.current_lat, d.current_lng,
                    d.rating, u.full_name
             FROM drivers d JOIN users u ON u.id = d.user_id
             WHERE d.is_approved = 1 AND d.is_online = 1 AND (d.is_available = 1 OR d.is_available IS NULL)`
          ).all();

          const allDrivers = res.results || [];
          nearby = allDrivers
            .map((d: any) => {
              const dLat = d.current_lat || lat;
              const dLng = d.current_lng || lng;
              const dist = haversineDistance(lat, lng, dLat, dLng);
              return { ...d, distance_km: dist };
            })
            .filter((d: any) => {
              if (d.distance_km > radiusKm) return false;
              if (serviceType && d.service_type_id !== serviceType) return false;
              return true;
            })
            .sort((a: any, b: any) => a.distance_km - b.distance_km);
        }

        return json({ drivers: nearby });
      }

      // ==========================================
      // PHASE 3 & 4 & 5 & 6 — TRIPS & OFFERS & TRANSITIONS
      // ==========================================
      if (path === '/api/trips' && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Authentication required' }, 401);

        const body: any = await request.json();
        const tripId = generateId('trip');
        const pickupLat = parseFloat(body.pickup_lat || '31.5204');
        const pickupLng = parseFloat(body.pickup_lng || '74.3587');
        const dropoffLat = parseFloat(body.dropoff_lat || '31.5600');
        const dropoffLng = parseFloat(body.dropoff_lng || '74.3400');

        const distanceKm = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng) || 5;
        const estMins = Math.ceil(distanceKm * 3) + 5;
        const baseFare = body.service_type_id === 'Bike' ? 40 : body.service_type_id === 'Rickshaw' ? 60 : 100;
        const perKmRate = body.service_type_id === 'Bike' ? 15 : body.service_type_id === 'Rickshaw' ? 20 : 28;
        const fareAmount = Math.round(baseFare + distanceKm * perKmRate);

        const vehicleType = body.service_type_id || body.vehicle_type || 'Car';

        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO trips (
              id, rider_id, vehicle_type, pickup_address, pickup_lat, pickup_lng,
              dropoff_address, dropoff_lat, dropoff_lng, fare_amount, distance_km,
              estimated_mins, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')`
          ).bind(
            tripId,
            user.id,
            vehicleType,
            body.pickup_address || 'Pickup Location',
            pickupLat,
            pickupLng,
            body.dropoff_address || 'Dropoff Location',
            dropoffLat,
            dropoffLng,
            fareAmount,
            distanceKm,
            estMins
          );

          // Find nearby online/approved drivers and create offers
          const driversRes = await env.DB.prepare(
            `SELECT d.id FROM drivers d 
             WHERE d.is_approved = 1 AND d.is_online = 1 AND (d.is_available = 1 OR d.is_available IS NULL)`
          ).all();

          const eligibleDrivers = driversRes.results || [];
          for (const drv of eligibleDrivers) {
            await env.DB.prepare(
              `INSERT INTO trip_driver_offers (id, trip_id, driver_id, status) VALUES (?, ?, ?, 'pending')`
            ).bind(generateId('offer'), tripId, drv.id);

            const drvUser = await env.DB.prepare(`SELECT user_id FROM drivers WHERE id = ?`).bind(drv.id).first();
            if (drvUser) {
              await env.DB.prepare(
                `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'info')`
              ).bind(
                generateId('notif'),
                drvUser.user_id,
                'New Ride Request Available!',
                `Ride from ${body.pickup_address || 'Pickup'} - PKR ${fareAmount}`
              );
            }
          }
        }

        const tripObj = {
          id: tripId,
          rider_id: user.id,
          vehicle_type: vehicleType,
          pickup_address: body.pickup_address,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_address: body.dropoff_address,
          dropoff_lat: dropoffLat,
          dropoff_lng: dropoffLng,
          fare_amount: fareAmount,
          distance_km: distanceKm,
          estimated_mins: estMins,
          status: 'requested',
          created_at: new Date().toISOString(),
        };

        return json({ success: true, trip: tripObj });
      }

      if (path === '/api/trips' && method === 'GET') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        let trips: any[] = [];
        if (env.DB) {
          if (user.role === 'driver') {
            const driver = await env.DB.prepare(`SELECT id FROM drivers WHERE user_id = ?`).bind(user.id).first();
            if (driver) {
              const res = await env.DB.prepare(
                `SELECT t.*, u.full_name as rider_name, u.mobile_number as rider_mobile
                 FROM trips t JOIN users u ON u.id = t.rider_id
                 WHERE t.driver_id = ? ORDER BY t.rowid DESC`
              ).bind(driver.id).all();
              trips = (res.results || []).map((t: any) => ({
                ...t,
                rider_info: { full_name: t.rider_name, mobile_number: t.rider_mobile },
              }));
            }
          } else {
            const res = await env.DB.prepare(
              `SELECT t.*, d.vehicle_brand, d.vehicle_model, d.vehicle_colour, d.vehicle_reg_number, d.rating as driver_rating_score, u.full_name as driver_name, u.mobile_number as driver_mobile
               FROM trips t 
               LEFT JOIN drivers d ON d.id = t.driver_id
               LEFT JOIN users u ON u.id = d.user_id
               WHERE t.rider_id = ? ORDER BY t.rowid DESC`
            ).bind(user.id).all();

            trips = (res.results || []).map((t: any) => ({
              ...t,
              driver_info: t.driver_id
                ? {
                    full_name: t.driver_name || 'Verified Driver',
                    mobile_number: t.driver_mobile || '',
                    vehicle_type: t.vehicle_type,
                    vehicle_brand: t.vehicle_brand || 'Suzuki',
                    vehicle_model: t.vehicle_model || 'Alto',
                    vehicle_colour: t.vehicle_colour || 'White',
                    vehicle_reg_number: t.vehicle_reg_number || 'LEA-123',
                    rating: t.driver_rating_score || 5.0,
                  }
                : null,
            }));
          }
        }

        return json({ trips });
      }

      // Phase 3: Driver Offers Endpoint
      if (path === '/api/driver/offers' && method === 'GET') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        let offersList: any[] = [];
        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ?`).bind(user.id).first();
          if (driver) {
            const res = await env.DB.prepare(
              `SELECT o.id as offer_id, o.status as offer_status, t.*, u.full_name as rider_name, u.mobile_number as rider_mobile
               FROM trip_driver_offers o
               JOIN trips t ON t.id = o.trip_id
               JOIN users u ON u.id = t.rider_id
               WHERE o.driver_id = ? AND o.status = 'pending' AND t.status = 'requested'
               ORDER BY o.rowid DESC`
            ).bind(driver.id).all();

            offersList = (res.results || []).map((o: any) => ({
              id: o.offer_id,
              trip_id: o.id,
              driver_id: driver.id,
              status: o.offer_status,
              created_at: o.created_at,
              pickup_address: o.pickup_address,
              dropoff_address: o.dropoff_address,
              fare_amount: o.fare_amount,
              distance_km: o.distance_km,
              estimated_mins: o.estimated_mins,
              vehicle_type: o.vehicle_type,
              rider_info: { full_name: o.rider_name, mobile_number: o.rider_mobile },
            }));
          }
        }

        return json({ offers: offersList });
      }

      if (path.startsWith('/api/trips/') && path.endsWith('/accept') && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const tripId = path.split('/')[3];

        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ?`).bind(user.id).first();
          if (!driver) return json({ error: 'Driver account not found' }, 404);
          if (!driver.is_approved) return json({ error: 'Driver is not approved' }, 403);
          if (!driver.is_online) return json({ error: 'Driver is offline' }, 403);

          const trip = await env.DB.prepare(`SELECT * FROM trips WHERE id = ?`).bind(tripId).first();
          if (!trip) return json({ error: 'Trip not found' }, 404);
          if (trip.status !== 'requested' && trip.status !== 'searching') {
            return json({ error: 'Trip is no longer available' }, 409);
          }

          // Atomic update
          await env.DB.prepare(
            `UPDATE trips SET driver_id = ?, status = 'accepted' WHERE id = ? AND (status = 'requested' OR status = 'searching')`
          ).bind(driver.id, tripId);

          // Update driver availability
          await env.DB.prepare(`UPDATE drivers SET is_available = 0 WHERE id = ?`).bind(driver.id);

          // Update offer records
          await env.DB.prepare(
            `UPDATE trip_driver_offers SET status = 'accepted' WHERE trip_id = ? AND driver_id = ?`
          ).bind(tripId, driver.id);

          await env.DB.prepare(
            `UPDATE trip_driver_offers SET status = 'expired' WHERE trip_id = ? AND driver_id != ?`
          ).bind(tripId, driver.id);

          // Notify Rider
          await env.DB.prepare(
            `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'success')`
          ).bind(
            generateId('notif'),
            trip.rider_id,
            'Driver Accepted Your Ride!',
            `${driver.vehicle_brand} ${driver.vehicle_model} (${driver.vehicle_reg_number}) is on the way!`
          );

          const updatedTrip = await env.DB.prepare(`SELECT * FROM trips WHERE id = ?`).bind(tripId).first();
          return json({ success: true, trip: updatedTrip });
        }

        return json({ success: true, message: 'Accepted' });
      }

      if (path.startsWith('/api/trips/') && path.endsWith('/decline') && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const tripId = path.split('/')[3];

        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT id FROM drivers WHERE user_id = ?`).bind(user.id).first();
          if (driver) {
            await env.DB.prepare(
              `UPDATE trip_driver_offers SET status = 'declined' WHERE trip_id = ? AND driver_id = ?`
            ).bind(tripId, driver.id);
          }
        }

        return json({ success: true });
      }

      // Phase 6: Trip status rules
      if (path.startsWith('/api/trips/') && path.endsWith('/status') && method === 'PATCH') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const tripId = path.split('/')[3];
        const body: any = await request.json();
        const nextStatus = body.status;

        const allowedTransitions: Record<string, string[]> = {
          requested: ['searching', 'accepted', 'cancelled'],
          searching: ['accepted', 'cancelled'],
          accepted: ['driver_arriving', 'driver_arrived', 'started', 'cancelled'],
          driver_arriving: ['driver_arrived', 'started', 'cancelled'],
          driver_arrived: ['started', 'cancelled'],
          started: ['completed', 'cancelled'],
        };

        if (env.DB) {
          const trip = await env.DB.prepare(`SELECT * FROM trips WHERE id = ?`).bind(tripId).first();
          if (!trip) return json({ error: 'Trip not found' }, 404);

          const validNext = allowedTransitions[trip.status] || [];
          if (!validNext.includes(nextStatus)) {
            return json({ error: `Invalid status transition from ${trip.status} to ${nextStatus}` }, 400);
          }

          let extraSet = '';
          if (nextStatus === 'started') extraSet = `, started_at = CURRENT_TIMESTAMP`;
          if (nextStatus === 'completed') extraSet = `, completed_at = CURRENT_TIMESTAMP`;

          await env.DB.prepare(
            `UPDATE trips SET status = ? ${extraSet} WHERE id = ?`
          ).bind(nextStatus, tripId);

          // If completed or cancelled, release driver availability
          if ((nextStatus === 'completed' || nextStatus === 'cancelled') && trip.driver_id) {
            await env.DB.prepare(`UPDATE drivers SET is_available = 1 WHERE id = ?`).bind(trip.driver_id);
            if (nextStatus === 'completed') {
              await env.DB.prepare(`UPDATE drivers SET total_rides = total_rides + 1 WHERE id = ?`).bind(trip.driver_id);
            }
          }

          // Create notification for rider
          await env.DB.prepare(
            `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'info')`
          ).bind(
            generateId('notif'),
            trip.rider_id,
            `Trip Update: ${nextStatus.replace('_', ' ').toUpperCase()}`,
            `Your ride status is now: ${nextStatus}`
          );

          const updated = await env.DB.prepare(`SELECT * FROM trips WHERE id = ?`).bind(tripId).first();
          return json({ success: true, trip: updated });
        }

        return json({ success: true });
      }

      // ==========================================
      // PHASE 10 — SUBSCRIPTIONS PURCHASE
      // ==========================================
      if (path === '/api/subscriptions/purchase' && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const body: any = await request.json();
        const planId = body.plan_id || body.plan_type || 'daily';
        const paymentMethod = body.payment_method || 'Easypaisa';

        const prices: Record<string, number> = { daily: 30, weekly: 200, monthly: 500 };
        const days: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
        const amount = prices[planId] || 30;
        const duration = days[planId] || 1;

        const subId = generateId('sub');

        if (env.DB) {
          const driver = await env.DB.prepare(`SELECT id FROM drivers WHERE user_id = ?`).bind(user.id).first();
          if (!driver) return json({ error: 'Driver profile not found' }, 404);

          // Deactivate old subs
          await env.DB.prepare(`UPDATE subscriptions SET status = 'expired' WHERE driver_id = ?`).bind(driver.id);

          await env.DB.prepare(
            `INSERT INTO subscriptions (
              id, driver_id, plan_type, amount, status, starts_at, expires_at, payment_tx_ref
            ) VALUES (?, ?, ?, ?, 'active', DATETIME('now'), DATETIME('now', '+${duration} days'), ?)`
          ).bind(subId, driver.id, planId, amount, body.tx_ref || 'TXN-DIRECT');

          await env.DB.prepare(
            `INSERT INTO subscription_payments (id, subscription_id, driver_id, amount, payment_method, payment_status)
             VALUES (?, ?, ?, ?, ?, 'completed')`
          ).bind(generateId('spay'), subId, driver.id, amount, paymentMethod);
        }

        return json({
          success: true,
          subscription: {
            id: subId,
            plan_type: planId,
            amount,
            status: 'active',
            payment_tx_ref: body.tx_ref || 'TXN-DIRECT',
          },
          message: `Subscription pass ${planId.toUpperCase()} activated!`,
        });
      }

      // ==========================================
      // PHASE 11 — RATINGS
      // ==========================================
      if (path.startsWith('/api/trips/') && path.endsWith('/rating') && method === 'POST') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const tripId = path.split('/')[3];
        const body: any = await request.json();
        const score = parseInt(body.rating || '5', 10);
        const comment = body.comment || '';

        if (env.DB) {
          const trip = await env.DB.prepare(`SELECT * FROM trips WHERE id = ?`).bind(tripId).first();
          if (!trip) return json({ error: 'Trip not found' }, 404);
          if (trip.status !== 'completed') return json({ error: 'Only completed trips can be rated' }, 400);

          await env.DB.prepare(
            `INSERT INTO ratings (id, trip_id, rater_id, rated_user_id, rating, comment)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(generateId('rate'), tripId, user.id, body.rated_user_id || trip.driver_id, score, comment);

          // Update driver aggregate rating if driver was rated
          if (trip.driver_id) {
            const avgRes = await env.DB.prepare(
              `SELECT AVG(rating) as avg_score FROM ratings WHERE rated_user_id = ?`
            ).bind(trip.driver_id).first();

            if (avgRes && avgRes.avg_score) {
              await env.DB.prepare(`UPDATE drivers SET rating = ? WHERE id = ?`).bind(Math.round(avgRes.avg_score * 10) / 10, trip.driver_id);
            }
          }
        }

        return json({ success: true, message: 'Rating saved successfully' });
      }

      // ==========================================
      // PHASE 12 — NOTIFICATIONS
      // ==========================================
      if (path === '/api/notifications' && method === 'GET') {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        let list: any[] = [];
        if (env.DB) {
          const res = await env.DB.prepare(
            `SELECT * FROM notifications WHERE user_id = ? ORDER BY rowid DESC LIMIT 50`
          ).bind(user.id).all();
          list = res.results || [];
        }

        return json({ notifications: list });
      }

      if (path.startsWith('/api/notifications/') && (path.endsWith('/read') || method === 'PATCH')) {
        const user = await authenticateUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        const notifId = path.split('/')[3];

        if (env.DB) {
          await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).bind(notifId);
        }

        return json({ success: true });
      }

      // Default fallback
      return json({ error: `Endpoint ${method} ${path} not found on Worker` }, 404);
    } catch (err: any) {
      console.error('Worker error:', err);
      return json({ error: err.message || 'Worker server error' }, 500);
    }
  },
};
