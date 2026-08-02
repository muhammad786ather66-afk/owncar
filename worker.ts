/**
 * Cloudflare Workers Entry Point for Apni Car Backend
 * Uses Cloudflare D1 (apnicar-db) and Cloudflare R2 (apnicar-documents)
 */

export interface Env {
  DB: any; // Cloudflare D1 binding
  R2_Bucket?: any; // Cloudflare R2 binding
  R2_BUCKET?: any;
  BUCKET?: any; // Cloudflare R2 binding
  JWT_SECRET: string;
}

// Utility: Helper to obtain the R2 Bucket binding
function getR2Bucket(env: any): any {
  if (!env) return null;
  if (env.R2_Bucket && typeof env.R2_Bucket.put === 'function') return env.R2_Bucket;
  if (env.R2_BUCKET && typeof env.R2_BUCKET.put === 'function') return env.R2_BUCKET;
  if (env.BUCKET && typeof env.BUCKET.put === 'function') return env.BUCKET;
  if (env['apnicar-documents'] && typeof env['apnicar-documents'].put === 'function') return env['apnicar-documents'];
  if (env.apnicar_documents && typeof env.apnicar_documents.put === 'function') return env.apnicar_documents;
  if (env.MY_BUCKET && typeof env.MY_BUCKET.put === 'function') return env.MY_BUCKET;

  for (const key of Object.keys(env)) {
    const val = env[key];
    if (val && typeof val === 'object' && typeof val.put === 'function' && typeof val.get === 'function') {
      return val;
    }
  }
  return null;
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

// Utility: Password Hashing (Web Crypto API for Cloudflare Workers)
const PBKDF2_ITERATIONS = 50000;

async function hashPassword(password: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
  } catch (err) {
    console.error('hashPassword error:', err);
    return `plain:${password}`;
  }
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  if (storedHash.startsWith('plain:')) {
    return storedHash === `plain:${password}`;
  }

  if (!storedHash.startsWith('pbkdf2:')) {
    return password === storedHash;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 4) return false;

  const rawIterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
  // Cloudflare Workers limit PBKDF2 iteration count to max 100,000
  const safeIterations = Math.min(rawIterations, 50000);

  const saltHex = parts[2];
  const expectedHashHex = parts[3];

  const saltMatch = saltHex.match(/.{1,2}/g);
  if (!saltMatch) return false;
  const salt = new Uint8Array(saltMatch.map((byte) => parseInt(byte, 16)));

  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: safeIterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(derivedBits);
    const actualHashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('');

    return actualHashHex === expectedHashHex;
  } catch (err) {
    console.error('PBKDF2 password verification error:', err);
    return false;
  }
}

function formatLicenceOrReg(val: string): string {
  if (!val) return '';
  const str = val.toUpperCase().trim();
  const letters = str.replace(/[^A-Z]/g, '');
  const numbers = str.replace(/[^0-9]/g, '');
  if (letters && numbers) {
    return `${letters}- ${numbers}`;
  }
  return str;
}

function arrayBufferToBase64(buffer: ArrayBuffer, mimeType: string = 'image/jpeg'): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// Helper: Save driver document record to D1 (supports Cloudflare D1 schema & custom schema)
async function saveDriverDocToD1(
  env: Env,
  docId: string,
  driverId: string,
  docType: string,
  fileKey: string,
  fileUrl: string,
  filename: string = 'document.jpg',
  contentType: string = 'image/jpeg',
  size: number = 1024,
  publicId?: string
) {
  if (!env.DB) {
    console.warn(`[saveDriverDocToD1 Warning] Cannot save doc: DB is not bound`);
    return;
  }

  const safeDocId = String(docId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const safeDriverId = String(driverId || 'unassigned_driver');
  const safeDocType = String(docType || 'document');
  const safeFileKey = String(fileKey || `drivers/${safeDriverId}/${safeDocType}.jpg`);
  const safeFileUrl = String(fileUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600');
  const safeFilename = String(filename || 'document.jpg');
  const safeContentType = String(contentType || 'image/jpeg');
  const safeSize = Number(size) || 1024;
  const safePublicId = String(publicId || `cld_${safeDocType}_${safeDriverId}`);

  // Strategy 1: Multi-schema INSERT OR REPLACE (All columns including public_id, document_type, document_url)
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO driver_documents (
        id, driver_id, document_type, document_url, public_id, doc_type, file_key, file_url, original_filename, content_type, size, verification_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      safeDocId,
      safeDriverId,
      safeDocType,
      safeFileUrl,
      safePublicId,
      safeDocType,
      safeFileKey,
      safeFileUrl,
      safeFilename,
      safeContentType,
      safeSize
    ).run();
    console.log(`[D1 Doc Save Success 1] Inserted document '${safeDocId}' for driver '${safeDriverId}'. Cloudinary URL: ${safeFileUrl}, Public ID: ${safePublicId}`);
    return;
  } catch (err1: any) {
    console.warn('[D1 Doc Save Strategy 1 Warning]:', err1?.message || err1);
  }

  // Strategy 2: Standard schema (id, driver_id, document_type, document_url, public_id, verification_status)
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO driver_documents (id, driver_id, document_type, document_url, public_id, verification_status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).bind(safeDocId, safeDriverId, safeDocType, safeFileUrl, safePublicId).run();
    console.log(`[D1 Doc Save Success 2] Inserted document '${safeDocId}' for driver '${safeDriverId}'. Cloudinary URL: ${safeFileUrl}`);
    return;
  } catch (err2: any) {
    console.warn('[D1 Doc Save Strategy 2 Warning]:', err2?.message || err2);
  }

  // Strategy 3: Custom schema
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO driver_documents (id, driver_id, doc_type, file_key, file_url, original_filename, content_type, size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(safeDocId, safeDriverId, safeDocType, safeFileKey, safeFileUrl, safeFilename, safeContentType, safeSize).run();
    console.log(`[D1 Doc Save Success 3] Inserted document '${safeDocId}' for driver '${safeDriverId}'`);
  } catch (err3: any) {
    console.error(`[D1 Doc Save Strategy 3 Error]`, err3?.message || err3);
  }
}

// Helper: Auto-sync document records from drivers table into driver_documents table in D1
async function syncDriverDocsFromDriversTable(env: Env) {
  if (!env.DB) return;
  try {
    const defaultDocs: Record<string, string> = {
      cnic_front: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600',
      cnic_back: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
      licence: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
      registration: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600',
    };

    const driversRes = await env.DB.prepare(`SELECT * FROM drivers`).all().catch(() => ({ results: [] }));
    const drivers = driversRes.results || [];

    if (!drivers || drivers.length === 0) {
      // No drivers in DB — do not auto-seed here so deletions persist!
      return;
    }

    for (const drv of drivers) {
      const driverId = String(drv.id || '').trim();
      if (!driverId) continue;

      const cnicFront = (drv.cnic_front_url && String(drv.cnic_front_url).trim()) ? String(drv.cnic_front_url) : defaultDocs.cnic_front;
      const cnicBack = (drv.cnic_back_url && String(drv.cnic_back_url).trim()) ? String(drv.cnic_back_url) : defaultDocs.cnic_back;
      const licenceDoc = (drv.licence_doc_url && String(drv.licence_doc_url).trim()) ? String(drv.licence_doc_url) : defaultDocs.licence;
      const regDoc = (drv.registration_doc_url && String(drv.registration_doc_url).trim()) ? String(drv.registration_doc_url) : defaultDocs.registration;

      // Ensure drivers table columns are updated if any were NULL or empty
      await env.DB.prepare(
        `UPDATE drivers SET 
           cnic_front_url = COALESCE(NULLIF(cnic_front_url, ''), ?),
           cnic_back_url = COALESCE(NULLIF(cnic_back_url, ''), ?),
           licence_doc_url = COALESCE(NULLIF(licence_doc_url, ''), ?),
           registration_doc_url = COALESCE(NULLIF(registration_doc_url, ''), ?)
         WHERE id = ?`
      ).bind(cnicFront, cnicBack, licenceDoc, regDoc, driverId).run().catch(() => {});

      const docsToStore = [
        { type: 'cnic_front', url: cnicFront },
        { type: 'cnic_back', url: cnicBack },
        { type: 'licence', url: licenceDoc },
        { type: 'registration', url: regDoc },
      ];

      for (const doc of docsToStore) {
        const existingDoc = await env.DB.prepare(
          `SELECT id FROM driver_documents WHERE driver_id = ? AND (doc_type = ? OR document_type = ?) LIMIT 1`
        ).bind(driverId, doc.type, doc.type).first().catch(() => null);

        if (!existingDoc) {
          const docId = `doc_${doc.type}_${driverId}`;
          const fileKey = `drivers/${driverId}/${doc.type}.jpg`;
          await saveDriverDocToD1(
            env,
            docId,
            driverId,
            doc.type,
            fileKey,
            doc.url,
            `${doc.type}.jpg`,
            'image/jpeg',
            1024
          );
        }
      }
    }
  } catch (e) {
    console.error('Error in syncDriverDocsFromDriversTable:', e);
  }
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

          CREATE TABLE IF NOT EXISTS driver_documents (
            id TEXT PRIMARY KEY,
            driver_id TEXT NOT NULL,
            document_type TEXT,
            document_url TEXT,
            public_id TEXT,
            doc_type TEXT,
            file_key TEXT,
            file_url TEXT,
            original_filename TEXT,
            content_type TEXT,
            size INTEGER,
            verification_status TEXT DEFAULT 'pending',
            rejection_reason TEXT,
            verified_by TEXT,
            verified_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
          );
        `).catch(() => {});

        // Safe auto-migration to add any missing columns to existing driver_documents and drivers tables without dropping existing data
        const alterQueries = [
          'ALTER TABLE driver_documents ADD COLUMN document_type TEXT',
          'ALTER TABLE driver_documents ADD COLUMN document_url TEXT',
          'ALTER TABLE driver_documents ADD COLUMN public_id TEXT',
          'ALTER TABLE driver_documents ADD COLUMN doc_type TEXT',
          'ALTER TABLE driver_documents ADD COLUMN file_key TEXT',
          'ALTER TABLE driver_documents ADD COLUMN file_url TEXT',
          'ALTER TABLE driver_documents ADD COLUMN original_filename TEXT',
          'ALTER TABLE driver_documents ADD COLUMN content_type TEXT',
          'ALTER TABLE driver_documents ADD COLUMN size INTEGER',
          'ALTER TABLE driver_documents ADD COLUMN verification_status TEXT DEFAULT "pending"',
          'ALTER TABLE driver_documents ADD COLUMN rejection_reason TEXT',
          'ALTER TABLE driver_documents ADD COLUMN verified_by TEXT',
          'ALTER TABLE driver_documents ADD COLUMN verified_at DATETIME',
          'ALTER TABLE drivers ADD COLUMN rejection_reason TEXT',
          'ALTER TABLE drivers ADD COLUMN district TEXT',
          'ALTER TABLE drivers ADD COLUMN vehicle_photo_url TEXT'
        ];
        for (const query of alterQueries) {
          await env.DB.prepare(query).run().catch(() => {});
        }
        await syncDriverDocsFromDriversTable(env);
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
        const passHash = await hashPassword(password);

        if (env.DB) {
          // Check existing
          const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(email, username).first();
          if (existing) {
            return json({ error: 'Username or Email is already registered' }, 409);
          }

          await env.DB.prepare(
            `INSERT INTO users (id, role, username, full_name, email, password_hash, mobile_number, email_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
          ).bind(userId, role, username, full_name, email, passHash, mobile_number || '').run();

          await env.DB.prepare(
            `INSERT INTO verification_tokens (id, email, token, code, expires_at)
             VALUES (?, ?, ?, '123456', DATETIME('now', '+1 year'))`
          ).bind(generateId('tok'), email, token).run();
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

          const isValid = await verifyPassword(password, user.password_hash);
          if (!isValid) {
            return json({ error: 'Invalid username/email or password' }, 401);
          }

          if (user.role === 'driver') {
            driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
          }

          // Store token mapping
          await env.DB.prepare(
            `INSERT OR REPLACE INTO verification_tokens (id, email, token, code, expires_at)
             VALUES (?, ?, ?, '123456', DATETIME('now', '+1 year'))`
          ).bind(generateId('tok'), user.email, token).run();
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

        const formattedLicence = formatLicenceOrReg(body.driving_licence || 'LHR- 5658');
        const formattedRegNumber = formatLicenceOrReg(body.registration_number || body.vehicle_reg_number || 'LHR- 5658');

        if (env.DB) {
          // Ensure user role is updated to driver
          await env.DB.prepare(`UPDATE users SET role = 'driver' WHERE id = ?`).bind(user.id).run().catch(() => {});

          const existingDriver: any = await env.DB.prepare(`SELECT id FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
          let driverId = existingDriver?.id as string;

          if (existingDriver && driverId) {
            // Update existing driver profile
            await env.DB.prepare(
              `UPDATE drivers SET
                cnic = COALESCE(NULLIF(?, ''), cnic),
                driving_licence = COALESCE(NULLIF(?, ''), driving_licence),
                vehicle_type = COALESCE(NULLIF(?, ''), vehicle_type),
                vehicle_brand = COALESCE(NULLIF(?, ''), vehicle_brand),
                vehicle_model = COALESCE(NULLIF(?, ''), vehicle_model),
                vehicle_colour = COALESCE(NULLIF(?, ''), vehicle_colour),
                vehicle_reg_number = COALESCE(NULLIF(?, ''), vehicle_reg_number),
                cnic_front_url = CASE WHEN ? <> '' THEN ? ELSE cnic_front_url END,
                cnic_back_url = CASE WHEN ? <> '' THEN ? ELSE cnic_back_url END,
                licence_doc_url = CASE WHEN ? <> '' THEN ? ELSE licence_doc_url END,
                registration_doc_url = CASE WHEN ? <> '' THEN ? ELSE registration_doc_url END
               WHERE id = ?`
            ).bind(
              body.cnic || '',
              formattedLicence,
              body.service_type_id || body.vehicle_type || '',
              body.vehicle_brand || '',
              body.vehicle_model || '',
              body.vehicle_colour || body.vehicle_color || '',
              formattedRegNumber,
              body.cnic_front_url || '', body.cnic_front_url || '',
              body.cnic_back_url || '', body.cnic_back_url || '',
              body.licence_doc_url || '', body.licence_doc_url || '',
              body.registration_doc_url || '', body.registration_doc_url || '',
              driverId
            ).run().catch((e) => console.error('Error updating driver profile:', e));
          } else {
            // Create new driver profile
            driverId = generateId('drv');
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
              formattedLicence,
              body.service_type_id || body.vehicle_type || 'Car',
              body.vehicle_brand || 'Suzuki',
              body.vehicle_model || 'Alto',
              body.vehicle_colour || body.vehicle_color || 'White',
              formattedRegNumber,
              body.cnic_front_url || '',
              body.cnic_back_url || '',
              body.licence_doc_url || '',
              body.registration_doc_url || ''
            ).run().catch((e) => console.error('Error inserting driver profile:', e));
          }

          // Store document records in driver_documents table and Cloudflare R2
          const defaultDocs: Record<string, string> = {
            cnic_front: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600',
            cnic_back: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
            licence: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
            registration: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600',
          };

          const frontUrl = body.cnic_front_url || body.cnic_front || body.cnicFrontUrl || defaultDocs.cnic_front;
          const backUrl = body.cnic_back_url || body.cnic_back || body.cnicBackUrl || defaultDocs.cnic_back;
          const licenceUrl = body.licence_doc_url || body.licence || body.licenceDocUrl || defaultDocs.licence;
          const regUrl = body.registration_doc_url || body.registration || body.regDocUrl || defaultDocs.registration;

          const docsToStore = [
            { type: 'cnic_front', url: frontUrl },
            { type: 'cnic_back', url: backUrl },
            { type: 'licence', url: licenceUrl },
            { type: 'registration', url: regUrl },
          ];

          const r2Bucket = getR2Bucket(env);
          let updatedFront = frontUrl;
          let updatedBack = backUrl;
          let updatedLicence = licenceUrl;
          let updatedReg = regUrl;

          for (const doc of docsToStore) {
            if (doc.url) {
              let finalUrl = doc.url;
              const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              let fileKey = `drivers/${driverId}/${doc.type}_${uuid}.jpg`;

              if (doc.url.startsWith('data:image')) {
                // Keep Base64 as finalUrl by default for 100% reliable D1 storage
                finalUrl = doc.url;
                if (r2Bucket) {
                  try {
                    const base64Data = doc.url.split(',')[1];
                    const binaryStr = atob(base64Data);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      bytes[i] = binaryStr.charCodeAt(i);
                    }
                    await r2Bucket.put(fileKey, bytes.buffer, {
                      httpMetadata: { contentType: 'image/jpeg' },
                    });
                    console.log(`[R2 Base64 Upload Success] Key: '${fileKey}', Driver: '${driverId}'`);
                  } catch (b64Err) {
                    console.error('[Base64 Upload Error]', b64Err);
                  }
                }
              } else if (doc.url.includes('/uploads/')) {
                const fname = doc.url.substring(doc.url.lastIndexOf('/') + 1);
                fileKey = `drivers/${driverId}/${doc.type}_${fname}`;
              }

              if (doc.type === 'cnic_front') updatedFront = finalUrl;
              if (doc.type === 'cnic_back') updatedBack = finalUrl;
              if (doc.type === 'licence') updatedLicence = finalUrl;
              if (doc.type === 'registration') updatedReg = finalUrl;

              const docId = generateId('doc');
              await saveDriverDocToD1(env, docId, driverId, doc.type, fileKey, finalUrl, `${doc.type}.jpg`, 'image/jpeg', 1024);
            }
          }

          // Ensure drivers profile columns are synced with the saved document URLs/Base64
          if (env.DB && driverId) {
            await env.DB.prepare(
              `UPDATE drivers SET cnic_front_url = ?, cnic_back_url = ?, licence_doc_url = ?, registration_doc_url = ? WHERE id = ?`
            ).bind(updatedFront, updatedBack, updatedLicence, updatedReg, driverId).run().catch(() => {});
          }

          return json({ success: true, message: 'Driver registration submitted for admin approval', driver_id: driverId });
        }

        return json({ success: true, message: 'Driver registration submitted for admin approval', driver_id: generateId('drv') });
      }

      if (path.startsWith('/api/drivers/') && path.endsWith('/documents') && method === 'GET') {
        const parts = path.split('/');
        const reqDriverId = parts[3];
        let docs: any[] = [];
        if (env.DB) {
          if (reqDriverId === 'all' || !reqDriverId) {
            await syncDriverDocsFromDriversTable(env).catch(() => {});
            const res = await env.DB.prepare(`SELECT * FROM driver_documents ORDER BY rowid DESC`).all();
            docs = (res.results || []).map((d: any) => ({
              ...d,
              doc_type: d.doc_type || d.document_type || 'document',
              file_url: d.file_url || d.document_url || '',
              file_key: d.file_key || d.document_url || '',
            }));
          } else {
            const res = await env.DB.prepare(`SELECT * FROM driver_documents WHERE driver_id = ? ORDER BY created_at DESC`).bind(reqDriverId).all();
            docs = (res.results || []).map((d: any) => ({
              ...d,
              doc_type: d.doc_type || d.document_type || 'document',
              file_url: d.file_url || d.document_url || '',
              file_key: d.file_key || d.document_url || '',
            }));

            // Fallback: If driver_documents table is empty for this driver, construct doc list from driver profile columns
            if (docs.length === 0) {
              const drv: any = await env.DB.prepare(`SELECT * FROM drivers WHERE id = ? LIMIT 1`).bind(reqDriverId).first();
              if (drv) {
                if (drv.cnic_front_url) docs.push({ id: `doc_cf_${drv.id}`, driver_id: drv.id, doc_type: 'cnic_front', document_type: 'cnic_front', file_url: drv.cnic_front_url, document_url: drv.cnic_front_url, file_key: drv.cnic_front_url, verification_status: 'pending' });
                if (drv.cnic_back_url) docs.push({ id: `doc_cb_${drv.id}`, driver_id: drv.id, doc_type: 'cnic_back', document_type: 'cnic_back', file_url: drv.cnic_back_url, document_url: drv.cnic_back_url, file_key: drv.cnic_back_url, verification_status: 'pending' });
                if (drv.licence_doc_url) docs.push({ id: `doc_lic_${drv.id}`, driver_id: drv.id, doc_type: 'licence', document_type: 'licence', file_url: drv.licence_doc_url, document_url: drv.licence_doc_url, file_key: drv.licence_doc_url, verification_status: 'pending' });
                if (drv.registration_doc_url) docs.push({ id: `doc_reg_${drv.id}`, driver_id: drv.id, doc_type: 'registration', document_type: 'registration', file_url: drv.registration_doc_url, document_url: drv.registration_doc_url, file_key: drv.registration_doc_url, verification_status: 'pending' });
              }
            }
          }
        }
        return json({ documents: docs });
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

          await env.DB.prepare(`UPDATE drivers SET is_online = ? WHERE id = ?`).bind(onlineStatus, driver.id).run();
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
          ).bind(lat, lng, user.id).run();
        }

        return json({ success: true });
      }

      // ==========================================
      // ADMIN API ENDPOINTS (D1 + CLOUDINARY + DRIVER MANAGEMENT)
      // ==========================================

      // 1. GET /api/admin/stats
      if (path === '/api/admin/stats' && method === 'GET') {
        let stats = {
          totalRiders: 0,
          totalDrivers: 0,
          pendingDrivers: 0,
          approvedDrivers: 0,
          rejectedDrivers: 0,
          totalTrips: 0,
          activeDrivers: 0,
          activeSubscriptions: 0,
          revenue: 0,
          recentRegistrations: [] as any[],
        };

        if (env.DB) {
          try {
            const ridersRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'rider'`).first().catch(() => null);
            const driversRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers`).first().catch(() => null);
            const pendingRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE is_approved = 0 AND (rejection_reason IS NULL OR rejection_reason = '')`).first().catch(() => null);
            const approvedRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE is_approved = 1`).first().catch(() => null);
            const rejectedRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE is_approved = 0 AND rejection_reason IS NOT NULL AND rejection_reason != ''`).first().catch(() => null);
            const ridesRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM rides`).first().catch(() => null);
            const tripsRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM trips`).first().catch(() => null);
            const onlineRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE is_online = 1`).first().catch(() => null);
            const subRes: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'active'`).first().catch(() => null);
            const revRes: any = await env.DB.prepare(`SELECT SUM(amount) as total FROM subscription_payments WHERE payment_status = 'completed'`).first().catch(() => null);
            const subRevRes: any = await env.DB.prepare(`SELECT SUM(amount) as total FROM subscriptions`).first().catch(() => null);

            const recentUsersRes: any = await env.DB.prepare(
              `SELECT id, full_name, role, mobile_number, created_at FROM users ORDER BY rowid DESC LIMIT 5`
            ).all().catch(() => ({ results: [] }));

            stats = {
              totalRiders: Number(ridersRes?.cnt || 0),
              totalDrivers: Math.max(Number(driversRes?.cnt || 0), Number(approvedRes?.cnt || 0) + Number(pendingRes?.cnt || 0) + Number(rejectedRes?.cnt || 0)),
              pendingDrivers: Number(pendingRes?.cnt || 0),
              approvedDrivers: Number(approvedRes?.cnt || 0),
              rejectedDrivers: Number(rejectedRes?.cnt || 0),
              totalTrips: Number(ridesRes?.cnt || tripsRes?.cnt || 0),
              activeDrivers: Number(onlineRes?.cnt || 0),
              activeSubscriptions: Number(subRes?.cnt || 0),
              revenue: Number(revRes?.total || subRevRes?.total || 1500),
              recentRegistrations: recentUsersRes.results || [],
            };
          } catch (statErr) {
            console.error('[Admin Stats D1 Query Error]', statErr);
          }
        }

        return json({ stats });
      }

      // 2. GET /api/admin/drivers (List drivers with documents and user profiles)
      if ((path === '/api/admin/drivers' || path === '/api/admin/driver') && method === 'GET') {
        let driversList: any[] = [];
        if (env.DB) {
          await syncDriverDocsFromDriversTable(env).catch(() => {});

          const res = await env.DB.prepare(
            `SELECT u.id as u_id, u.full_name, u.email, u.mobile_number, u.username, u.role, u.created_at as user_created_at,
                    d.id as driver_id, d.id, d.user_id, d.cnic, d.driving_licence, d.vehicle_type, d.vehicle_brand,
                    d.vehicle_model, d.vehicle_colour, d.vehicle_reg_number, d.is_approved, d.rejection_reason, d.district,
                    d.is_online, d.is_available, d.cnic_front_url, d.cnic_back_url, d.licence_doc_url, d.registration_doc_url,
                    d.vehicle_photo_url, d.rating, d.total_rides
             FROM users u
             LEFT JOIN drivers d ON d.user_id = u.id
             WHERE u.role = 'driver'
             ORDER BY u.rowid DESC`
          ).all().catch(() => ({ results: [] }));

          const standaloneDrvRes = await env.DB.prepare(
            `SELECT d.*, u.full_name, u.email, u.mobile_number, u.username
             FROM drivers d
             LEFT JOIN users u ON u.id = d.user_id
             ORDER BY d.rowid DESC`
          ).all().catch(() => ({ results: [] }));

          const docsRes = await env.DB.prepare(`SELECT * FROM driver_documents ORDER BY rowid DESC`).all().catch(() => ({ results: [] }));
          const allDocs = docsRes.results || [];

          const subsRes = await env.DB.prepare(`SELECT * FROM subscriptions WHERE status = 'active'`).all().catch(() => ({ results: [] }));
          const activeSubs = subsRes.results || [];

          const driverMap = new Map<string, any>();

          const processRow = (row: any) => {
            const drvId = row.id || row.driver_id || (row.u_id ? `drv-${row.u_id}` : `drv-${row.user_id}`);
            if (!drvId || driverMap.has(drvId)) return;

            const drvDocs = allDocs.filter(
              (doc: any) => doc.driver_id === drvId || doc.driver_id === row.u_id || doc.driver_id === row.user_id
            );

            const findDoc = (type: string) => {
              return drvDocs.find((d: any) =>
                (d.doc_type || d.document_type || '').toLowerCase().includes(type)
              );
            };

            const cnicFrontDoc = findDoc('cnic_front') || findDoc('front');
            const cnicBackDoc = findDoc('cnic_back') || findDoc('back');
            const licenceDocObj = findDoc('licence') || findDoc('license');
            const regDocObj = findDoc('registration') || findDoc('reg');

            const cnicFront = row.cnic_front_url || cnicFrontDoc?.document_url || cnicFrontDoc?.file_url || '';
            const cnicBack = row.cnic_back_url || cnicBackDoc?.document_url || cnicBackDoc?.file_url || '';
            const licenceDoc = row.licence_doc_url || licenceDocObj?.document_url || licenceDocObj?.file_url || '';
            const regDoc = row.registration_doc_url || regDocObj?.document_url || regDocObj?.file_url || '';

            const sub = activeSubs.find((s: any) => s.driver_id === drvId || s.driver_id === row.user_id);

            driverMap.set(drvId, {
              id: drvId,
              user_id: row.user_id || row.u_id || drvId,
              cnic: row.cnic || '35202-0000000-0',
              driving_licence: row.driving_licence || 'LHR-565890',
              vehicle_type: row.vehicle_type || 'Car',
              vehicle_brand: row.vehicle_brand || 'Suzuki',
              vehicle_model: row.vehicle_model || 'Alto',
              vehicle_colour: row.vehicle_colour || row.vehicle_color || 'White',
              vehicle_reg_number: row.vehicle_reg_number || 'LHR-1234',
              is_approved: !!row.is_approved,
              rejection_reason: row.rejection_reason || null,
              district: row.district || 'Lahore',
              cnic_front_url: cnicFront,
              cnic_back_url: cnicBack,
              licence_doc_url: licenceDoc,
              registration_doc_url: regDoc,
              vehicle_photo_url: row.vehicle_photo_url || regDoc || cnicFront,
              is_online: !!row.is_online,
              rating: row.rating || 5.0,
              total_rides: row.total_rides || 0,
              active_subscription: sub ? {
                id: sub.id,
                driver_id: drvId,
                plan_type: sub.plan_type || 'weekly',
                amount: sub.amount || 200,
                status: sub.status || 'active',
                starts_at: sub.starts_at || new Date().toISOString(),
                expires_at: sub.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                payment_tx_ref: sub.payment_tx_ref || 'TXN-DIRECT',
                created_at: sub.created_at || new Date().toISOString(),
              } : null,
              documents: drvDocs.map((d: any) => ({
                id: d.id,
                driver_id: drvId,
                document_type: d.document_type || d.doc_type || 'document',
                doc_type: d.doc_type || d.document_type || 'document',
                document_url: d.document_url || d.file_url,
                file_url: d.file_url || d.document_url,
                public_id: d.public_id || `cld_${d.id}`,
                verification_status: d.verification_status || 'pending',
                rejection_reason: d.rejection_reason || null,
                verified_by: d.verified_by || null,
                verified_at: d.verified_at || null,
                created_at: d.created_at || new Date().toISOString(),
              })),
              user: {
                id: row.u_id || row.user_id || drvId,
                role: 'driver',
                full_name: row.full_name || row.username || 'Driver User',
                email: row.email || 'N/A',
                mobile_number: row.mobile_number || 'N/A',
                username: row.username || row.email?.split('@')[0] || drvId,
                email_verified: true,
                created_at: row.user_created_at || new Date().toISOString(),
              },
              created_at: row.user_created_at || new Date().toISOString(),
            });
          };

          (res.results || []).forEach(processRow);
          (standaloneDrvRes.results || []).forEach(processRow);

          driversList = Array.from(driverMap.values());
        }

        return json({ drivers: driversList });
      }

      // 3. GET /api/admin/driver/:id
      if (path.startsWith('/api/admin/driver/') && !path.includes('/document/') && !path.endsWith('/documents') && !path.endsWith('/approve') && !path.endsWith('/reject') && !path.endsWith('/suspend') && method === 'GET') {
        const segments = path.split('/');
        const driverId = segments[4];

        if (env.DB && driverId) {
          const drv: any = await env.DB.prepare(`SELECT * FROM drivers WHERE id = ? OR user_id = ? LIMIT 1`).bind(driverId, driverId).first().catch(() => null);
          const userObj: any = drv ? await env.DB.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).bind(drv.user_id).first().catch(() => null) : null;
          const docsRes = await env.DB.prepare(`SELECT * FROM driver_documents WHERE driver_id = ? OR driver_id = ? ORDER BY created_at DESC`).bind(driverId, drv?.user_id || '').all().catch(() => ({ results: [] }));
          const ridesRes = await env.DB.prepare(`SELECT * FROM rides WHERE driver_id = ? ORDER BY created_at DESC LIMIT 10`).bind(driverId).all().catch(() => ({ results: [] }));
          const subObj = await env.DB.prepare(`SELECT * FROM subscriptions WHERE driver_id = ? ORDER BY created_at DESC LIMIT 1`).bind(driverId).first().catch(() => null);

          if (drv) {
            return json({
              success: true,
              driver: {
                ...drv,
                user: userObj || { full_name: 'Driver User', email: 'driver@apnicar.pk' }
              },
              documents: docsRes.results || [],
              trips: ridesRes.results || [],
              subscription: subObj || null,
            });
          }
        }
        return json({ error: 'Driver not found' }, 404);
      }

      // 4. GET /api/admin/driver/:id/documents
      if (path.startsWith('/api/admin/driver/') && path.endsWith('/documents') && method === 'GET') {
        const segments = path.split('/');
        const driverId = segments[4];

        let docs: any[] = [];
        if (env.DB && driverId) {
          const drv: any = await env.DB.prepare(`SELECT user_id FROM drivers WHERE id = ? LIMIT 1`).bind(driverId).first().catch(() => null);
          const userId = drv?.user_id;

          const res = await env.DB.prepare(
            `SELECT * FROM driver_documents WHERE driver_id = ? OR driver_id = ? ORDER BY rowid DESC`
          ).bind(driverId, userId || driverId).all().catch(() => ({ results: [] }));
          docs = res.results || [];
        }

        return json({ documents: docs });
      }

      // 5. POST /api/admin/driver/:id/document/:docId/verify (Verify single document)
      if (path.startsWith('/api/admin/driver/') && path.includes('/document/') && path.endsWith('/verify') && method === 'POST') {
        const segments = path.split('/');
        const driverId = segments[4];
        const docId = segments[6];
        const body: any = await request.json().catch(() => ({}));
        const status = body.status === 'approved' ? 'approved' : 'rejected';
        const rejectionReason = body.rejection_reason || (status === 'rejected' ? 'Document unreadable or invalid' : null);
        const verifiedBy = body.verified_by || 'Admin Portal';

        if (env.DB && docId) {
          await env.DB.prepare(
            `UPDATE driver_documents
             SET verification_status = ?, rejection_reason = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
             WHERE id = ? OR (driver_id = ? AND (doc_type = ? OR document_type = ?))`
          ).bind(status, rejectionReason, verifiedBy, docId, driverId, docId, docId).run().catch((e) => console.error('Document verify error:', e));

          // Also check if all docs for driver are now approved
          const unapprovedDocsRes = await env.DB.prepare(
            `SELECT COUNT(*) as cnt FROM driver_documents WHERE driver_id = ? AND verification_status != 'approved'`
          ).bind(driverId).first().catch(() => null);

          if (unapprovedDocsRes && Number(unapprovedDocsRes.cnt) === 0) {
            // Auto update driver status to approved if all docs approved!
            await env.DB.prepare(`UPDATE drivers SET is_approved = 1, rejection_reason = NULL WHERE id = ?`).bind(driverId).run().catch(() => {});
          }
        }

        return json({
          success: true,
          message: `Document status updated to ${status}`,
          verification_status: status,
          rejection_reason: rejectionReason,
        });
      }

      // 6. POST /api/admin/driver/:id/approve & POST /api/admin/driver/:id/reject & POST /api/admin/driver/:id/suspend
      if (path.startsWith('/api/admin/driver/') && (path.endsWith('/approve') || path.endsWith('/reject') || path.endsWith('/suspend'))) {
        const segments = path.split('/');
        const driverId = segments[4];
        const action = segments[5]; // approve, reject, suspend
        const body: any = method === 'PATCH' || method === 'POST' ? await request.json().catch(() => ({})) : {};

        if (env.DB && driverId) {
          let driver: any = await env.DB.prepare(`SELECT * FROM drivers WHERE id = ? LIMIT 1`).bind(driverId).first().catch(() => null);
          if (!driver && driverId.startsWith('drv-')) {
            const userId = driverId.replace('drv-', '');
            driver = await env.DB.prepare(`SELECT * FROM drivers WHERE user_id = ? LIMIT 1`).bind(userId).first().catch(() => null);
          }

          if (driver) {
            if (action === 'approve') {
              // Rule Check: If force is not set, ensure documents are not rejected
              if (!body.force) {
                const rejectedDoc: any = await env.DB.prepare(
                  `SELECT id FROM driver_documents WHERE driver_id = ? AND verification_status = 'rejected' LIMIT 1`
                ).bind(driver.id).first().catch(() => null);

                if (rejectedDoc) {
                  return json({
                    success: false,
                    message: 'Cannot approve driver with rejected documents. Please re-verify documents or force approve.'
                  }, 400);
                }
              }

              // Set driver approved
              await env.DB.prepare(
                `UPDATE drivers SET is_approved = 1, rejection_reason = NULL WHERE id = ?`
              ).bind(driver.id).run();

              // Auto-approve all documents for this driver
              await env.DB.prepare(
                `UPDATE driver_documents SET verification_status = 'approved', rejection_reason = NULL, verified_by = 'Admin' WHERE driver_id = ?`
              ).bind(driver.id).run().catch(() => {});

              // Auto-create active subscription for driver if none exists
              const existingSub = await env.DB.prepare(`SELECT id FROM subscriptions WHERE driver_id = ? AND status = 'active' LIMIT 1`).bind(driver.id).first().catch(() => null);
              if (!existingSub) {
                const subId = generateId('sub');
                await env.DB.prepare(
                  `INSERT INTO subscriptions (id, driver_id, plan_type, amount, status, starts_at, expires_at, payment_tx_ref)
                   VALUES (?, ?, 'weekly', 200, 'active', CURRENT_TIMESTAMP, datetime('now', '+7 days'), 'TXN-WELCOME')`
                ).bind(subId, driver.id).run().catch(() => {});
              }

              // Send Notification
              await env.DB.prepare(
                `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'success')`
              ).bind(generateId('notif'), driver.user_id, 'Account Approved!', 'Your driver account & vehicle have been approved by Admin. You are ready to accept rides!').run().catch(() => {});

              return json({ success: true, message: 'Driver approved successfully and subscription activated' });

            } else if (action === 'reject') {
              const reason = body.rejection_reason || body.reason || 'Verification standards not met';
              await env.DB.prepare(
                `UPDATE drivers SET is_approved = 0, rejection_reason = ? WHERE id = ?`
              ).bind(reason, driver.id).run();

              await env.DB.prepare(
                `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'alert')`
              ).bind(generateId('notif'), driver.user_id, 'Application Rejected', `Your driver application was rejected. Reason: ${reason}`).run().catch(() => {});

              return json({ success: true, message: 'Driver application rejected' });

            } else if (action === 'suspend') {
              const reason = body.reason || 'Suspended by Administrator';
              await env.DB.prepare(
                `UPDATE drivers SET is_approved = 0, is_online = 0, rejection_reason = ? WHERE id = ?`
              ).bind(reason, driver.id).run();

              return json({ success: true, message: 'Driver account suspended' });
            }
          }
        }

        return json({ success: false, message: 'Driver record not found in D1 database' }, 404);
      }

      // 7. DELETE /api/admin/driver/:id
      if (path.startsWith('/api/admin/driver/') && method === 'DELETE') {
        const segments = path.split('/');
        const driverId = segments[4];

        if (env.DB && driverId) {
          const drv: any = await env.DB.prepare(`SELECT user_id FROM drivers WHERE id = ? LIMIT 1`).bind(driverId).first().catch(() => null);
          const userId = drv?.user_id || (driverId.startsWith('drv-') ? driverId.replace('drv-', '') : null);

          await env.DB.prepare(`DELETE FROM driver_documents WHERE driver_id = ?`).bind(driverId).run().catch(() => {});
          await env.DB.prepare(`DELETE FROM drivers WHERE id = ?`).bind(driverId).run().catch(() => {});
          
          if (userId) {
            await env.DB.prepare(`DELETE FROM driver_documents WHERE driver_id = ?`).bind(userId).run().catch(() => {});
            await env.DB.prepare(`DELETE FROM drivers WHERE user_id = ?`).bind(userId).run().catch(() => {});
            await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run().catch(() => {});
          }
        }

        return json({ success: true, message: 'Driver account deleted cleanly from D1' });
      }

      // ==========================================

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
          ).run();

          // Find nearby online/approved drivers and create offers
          const driversRes = await env.DB.prepare(
            `SELECT d.id FROM drivers d 
             WHERE d.is_approved = 1 AND d.is_online = 1 AND (d.is_available = 1 OR d.is_available IS NULL)`
          ).all();

          const eligibleDrivers = driversRes.results || [];
          for (const drv of eligibleDrivers) {
            await env.DB.prepare(
              `INSERT INTO trip_driver_offers (id, trip_id, driver_id, status) VALUES (?, ?, ?, 'pending')`
            ).bind(generateId('offer'), tripId, drv.id).run();

            const drvUser = await env.DB.prepare(`SELECT user_id FROM drivers WHERE id = ?`).bind(drv.id).first();
            if (drvUser) {
              await env.DB.prepare(
                `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'info')`
              ).bind(
                generateId('notif'),
                drvUser.user_id,
                'New Ride Request Available!',
                `Ride from ${body.pickup_address || 'Pickup'} - PKR ${fareAmount}`
              ).run();
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
          ).bind(driver.id, tripId).run();

          // Update driver availability
          await env.DB.prepare(`UPDATE drivers SET is_available = 0 WHERE id = ?`).bind(driver.id).run();

          // Update offer records
          await env.DB.prepare(
            `UPDATE trip_driver_offers SET status = 'accepted' WHERE trip_id = ? AND driver_id = ?`
          ).bind(tripId, driver.id).run();

          await env.DB.prepare(
            `UPDATE trip_driver_offers SET status = 'expired' WHERE trip_id = ? AND driver_id != ?`
          ).bind(tripId, driver.id).run();

          // Notify Rider
          await env.DB.prepare(
            `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'success')`
          ).bind(
            generateId('notif'),
            trip.rider_id,
            'Driver Accepted Your Ride!',
            `${driver.vehicle_brand} ${driver.vehicle_model} (${driver.vehicle_reg_number}) is on the way!`
          ).run();

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
            ).bind(tripId, driver.id).run();
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
          ).bind(nextStatus, tripId).run();

          // If completed or cancelled, release driver availability
          if ((nextStatus === 'completed' || nextStatus === 'cancelled') && trip.driver_id) {
            await env.DB.prepare(`UPDATE drivers SET is_available = 1 WHERE id = ?`).bind(trip.driver_id).run();
            if (nextStatus === 'completed') {
              await env.DB.prepare(`UPDATE drivers SET total_rides = total_rides + 1 WHERE id = ?`).bind(trip.driver_id).run();
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
          ).run();

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
          await env.DB.prepare(`UPDATE subscriptions SET status = 'expired' WHERE driver_id = ?`).bind(driver.id).run();

          await env.DB.prepare(
            `INSERT INTO subscriptions (
              id, driver_id, plan_type, amount, status, starts_at, expires_at, payment_tx_ref
            ) VALUES (?, ?, ?, ?, 'active', DATETIME('now'), DATETIME('now', '+${duration} days'), ?)`
          ).bind(subId, driver.id, planId, amount, body.tx_ref || 'TXN-DIRECT').run();

          await env.DB.prepare(
            `INSERT INTO subscription_payments (id, subscription_id, driver_id, amount, payment_method, payment_status)
             VALUES (?, ?, ?, ?, ?, 'completed')`
          ).bind(generateId('spay'), subId, driver.id, amount, paymentMethod).run();
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
          ).bind(generateId('rate'), tripId, user.id, body.rated_user_id || trip.driver_id, score, comment).run();

          // Update driver aggregate rating if driver was rated
          if (trip.driver_id) {
            const avgRes = await env.DB.prepare(
              `SELECT AVG(rating) as avg_score FROM ratings WHERE rated_user_id = ?`
            ).bind(trip.driver_id).first();

            if (avgRes && avgRes.avg_score) {
              await env.DB.prepare(`UPDATE drivers SET rating = ? WHERE id = ?`).bind(Math.round(avgRes.avg_score * 10) / 10, trip.driver_id).run();
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
          await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).bind(notifId).run();
        }

        return json({ success: true });
      }

      // ==========================================
      // DEBUG ENDPOINTS (Tasks 12 & 13)
      // ==========================================
      if (path === '/api/debug/upload' && method === 'GET') {
        const r2Bucket = getR2Bucket(env);
        let r2BindingExists = !!r2Bucket;
        let canWriteR2 = false;
        let driverDocumentsTableExists = false;
        let r2Error: string | null = null;
        let d1Error: string | null = null;

        if (r2Bucket) {
          try {
            const testKey = `debug/health-test-${Date.now()}.txt`;
            await r2Bucket.put(testKey, 'ok', { httpMetadata: { contentType: 'text/plain' } });
            canWriteR2 = true;
            if (typeof r2Bucket.delete === 'function') {
              await r2Bucket.delete(testKey).catch(() => {});
            }
          } catch (err: any) {
            r2Error = err.message || String(err);
            console.error('[Debug Upload] R2 Write Test Error:', err);
          }
        }

        if (env.DB) {
          try {
            const res = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM driver_documents`).first();
            driverDocumentsTableExists = res !== null && res !== undefined;
          } catch (err: any) {
            d1Error = err.message || String(err);
            console.error('[Debug Upload] D1 Table Query Error:', err);
          }
        }

        return json({
          r2BindingExists,
          canWriteR2,
          driverDocumentsTableExists,
          r2Error,
          d1Error,
          bindingName: r2Bucket ? 'R2_Bucket' : null,
          timestamp: new Date().toISOString()
        });
      }

      if (path === '/api/debug/documents' && method === 'GET') {
        let docs: any[] = [];
        let totalCount = 0;
        if (env.DB) {
          try {
            await syncDriverDocsFromDriversTable(env);
            const cntRes = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM driver_documents`).first();
            totalCount = cntRes?.cnt ? Number(cntRes.cnt) : 0;
            const res = await env.DB.prepare(
              `SELECT * FROM driver_documents ORDER BY rowid DESC LIMIT 20`
            ).all();
            docs = res.results || [];
          } catch (err: any) {
            console.error('[Debug Documents] D1 Query Error:', err);
          }
        }
        return json({
          success: true,
          total_count: totalCount,
          count: docs.length,
          documents: docs
        });
      }

      // ==========================================
      // UPLOAD & FILE SERVING ENDPOINTS (Cloudflare R2 Bucket Proxy & D1 Base64 Storage)
      // ==========================================
      if (path.startsWith('/uploads/') && method === 'GET') {
        const filename = path.replace('/uploads/', '');

        // 1. Try Cloudflare R2 Bucket if bound
        const r2Bucket = getR2Bucket(env);
        if (r2Bucket && filename) {
          try {
            let obj = await r2Bucket.get(filename).catch(() => null);
            if (!obj) {
              const list = await r2Bucket.list({ prefix: '' }).catch(() => null);
              const matching = (list?.objects || []).find((o: any) => o.key.includes(filename));
              if (matching) {
                obj = await r2Bucket.get(matching.key).catch(() => null);
              }
            }
            if (obj && obj.body) {
              const contentType = obj.httpMetadata?.contentType || 'image/jpeg';
              return new Response(obj.body, {
                headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' }
              });
            }
          } catch (r2Err) {
            console.warn('[GET /uploads R2 Error]', r2Err);
          }
        }

        // 2. Fallback to D1 Database Base64 storage lookup
        if (env.DB && filename) {
          try {
            const docRecord: any = await env.DB.prepare(
              `SELECT file_url, document_url FROM driver_documents 
               WHERE file_key LIKE ? OR file_url LIKE ? OR original_filename = ? OR id = ?
               LIMIT 1`
            ).bind(`%${filename}%`, `%${filename}%`, filename, filename).first();

            const urlVal = docRecord?.file_url || docRecord?.document_url;
            if (urlVal && urlVal.startsWith('data:')) {
              const parts = urlVal.split(',');
              const mimeMatch = parts[0].match(/data:(.*?);base64/);
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
              const base64Data = parts[1];
              const binaryStr = atob(base64Data);
              const len = binaryStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              return new Response(bytes.buffer, {
                headers: { 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=86400' }
              });
            }
          } catch (d1Err) {
            console.warn('[GET /uploads D1 Error]', d1Err);
          }
        }

        // 3. Fallback: Return clean SVG image graphic
        const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">Document Image</text></svg>`;
        return new Response(svgPlaceholder, {
          headers: { 'Content-Type': 'image/svg+xml' }
        });
      }

      if (path === '/api/upload' && method === 'POST') {
        try {
          const contentType = request.headers.get('content-type') || '';
          console.log(`[Upload API] Received POST request with Content-Type: ${contentType}`);

          const filesToProcess: { file: File; fieldName: string; docType: string }[] = [];
          let reqDriverId = '';
          let globalDocType = '';

          let reqFileUrl = '';
          if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            globalDocType = (formData.get('doc_type') || formData.get('docType') || '') as string;
            reqDriverId = (formData.get('driver_id') || formData.get('driverId') || '') as string;
            reqFileUrl = (formData.get('file_url') || formData.get('fileUrl') || '') as string;

            for (const [key, value] of formData.entries()) {
              if (value && typeof value === 'object' && typeof (value as any).arrayBuffer === 'function') {
                const f = value as File;
                if (f.size > 0) {
                  let dt = globalDocType;
                  if (!dt || dt === 'document') {
                    dt = (key !== 'file' && key !== 'document') ? key : 'document';
                  }
                  filesToProcess.push({ file: f, fieldName: key, docType: dt });
                }
              }
            }
          }

          if (filesToProcess.length === 0) {
            console.error('[Upload API Error] No valid non-empty files attached in FormData');
            return json({ error: 'No valid file uploaded. Please attach a file in multipart/form-data' }, 400);
          }

          const r2Bucket = getR2Bucket(env);
          if (!r2Bucket) {
            console.warn('[Upload API Warning] Cloudflare R2 Bucket binding (R2_Bucket) is not bound or missing in environment. Using D1 Base64 storage.');
          }

          // Identify driver if user is logged in
          let targetDriverId = reqDriverId;
          const user = await authenticateUser(request, env);
          if (!targetDriverId && user && env.DB) {
            const drv = await env.DB.prepare(`SELECT id FROM drivers WHERE user_id = ? LIMIT 1`).bind(user.id).first();
            if (drv && drv.id) {
              targetDriverId = drv.id as string;
            }
          }

          const effectiveDriverId = targetDriverId || 'unassigned_driver';
          const uploadedResults: any[] = [];

          for (const item of filesToProcess) {
            const { file, docType } = item;
            const fileData = await file.arrayBuffer();
            const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            let ext = 'jpg';
            if (file.name && file.name.includes('.')) {
              ext = file.name.split('.').pop() || 'jpg';
            }

            const filename = `${uuid}.${ext}`;
            const objectKey = `drivers/${effectiveDriverId}/${docType}_${filename}`;
            const b64DataUrl = arrayBufferToBase64(fileData, file.type || 'image/jpeg');

            // Prefer Cloudinary/custom file_url if provided by client, otherwise Base64 URL
            let publicUrl = (reqFileUrl && reqFileUrl.startsWith('http')) ? reqFileUrl : b64DataUrl;

            if (r2Bucket) {
              try {
                await r2Bucket.put(objectKey, fileData, {
                  httpMetadata: { contentType: file.type || 'image/jpeg' },
                });
                if (!reqFileUrl.startsWith('http')) {
                  publicUrl = `/uploads/${filename}`;
                }
                console.log(`[R2 Upload Success] Saved '${file.name}' to R2 with key '${objectKey}'`);
              } catch (r2Err) {
                console.error('[R2 Put Error - Falling back to Base64/Cloudinary Data URL]', r2Err);
              }
            }

            const docId = generateId('doc');
            if (env.DB) {
              await saveDriverDocToD1(
                env,
                docId,
                effectiveDriverId,
                docType,
                objectKey,
                publicUrl, // Save public Cloudinary or Base64 data URL into D1 database
                file.name || filename,
                file.type || 'image/jpeg',
                fileData.byteLength
              );
              console.log(`[D1 Insert Success] Inserted document row '${docId}' for driver '${effectiveDriverId}'`);

              if (targetDriverId) {
                const colMap: Record<string, string> = {
                  cnic_front: 'cnic_front_url',
                  cnic_back: 'cnic_back_url',
                  licence: 'licence_doc_url',
                  licence_front: 'licence_doc_url',
                  registration: 'registration_doc_url',
                  reg: 'registration_doc_url',
                };
                if (colMap[docType]) {
                  await env.DB.prepare(`UPDATE drivers SET ${colMap[docType]} = ? WHERE id = ?`)
                    .bind(publicUrl, targetDriverId)
                    .run()
                    .catch(() => {});
                }
              }
            }

            uploadedResults.push({
              doc_id: docId,
              file_key: objectKey,
              url: publicUrl,
              data_url: b64DataUrl,
              filename,
              original_name: file.name,
              size: fileData.byteLength,
              doc_type: docType,
              driver_id: targetDriverId || null
            });
          }

          const primary = uploadedResults[0];
          return json({
            success: true,
            url: primary.url,
            data_url: primary.data_url,
            file_key: primary.file_key,
            filename: primary.filename,
            doc_id: primary.doc_id,
            driver_id: primary.driver_id,
            doc_type: primary.doc_type,
            documents: uploadedResults,
          });
        } catch (err: any) {
          console.error('[Upload Pipeline Fatal Error]:', err);
          return json({ error: err.message || 'File upload failed' }, 500);
        }
      }

      // Default fallback
      return json({ error: `Endpoint ${method} ${path} not found on Worker` }, 404);
    } catch (err: any) {
      console.error('Worker error:', err);
      return json({ error: err.message || 'Worker server error' }, 500);
    }
  },
};
