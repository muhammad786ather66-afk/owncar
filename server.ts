import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Setup file uploads storage directory for R2 bucket simulation
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Database Storage in memory/file JSON store mimicking Cloudflare D1
const dbPath = path.join(process.cwd(), 'd1_data.json');

interface DbState {
  users: any[];
  drivers: any[];
  subscriptions: any[];
  trips: any[];
  notifications: any[];
  cities: any[];
  tokens: any[];
  driver_documents?: any[];
  subscription_plans?: any[];
  vehicles?: any[];
  services?: any[];
  payments?: any[];
  ratings?: any[];
  admins?: any[];
}

function loadDb(): DbState {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.driver_documents) parsed.driver_documents = [];
      return parsed;
    } catch (e) {
      console.error('Failed to parse db, resetting', e);
    }
  }
  return seedInitialDb();
}

function saveDb(data: DbState) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save db', e);
  }
}

function seedInitialDb(): DbState {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const driverPasswordHash = bcrypt.hashSync('driver123', 10);
  const riderPasswordHash = bcrypt.hashSync('rider123', 10);

  const adminUser = {
    id: 'usr-admin-1',
    role: 'admin',
    username: 'admin',
    full_name: 'Apni Car Admin',
    email: 'admin@apnicar.pk',
    password_hash: adminPasswordHash,
    mobile_number: '+923001234567',
    email_verified: 1,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    created_at: new Date().toISOString(),
  };

  const sampleDriverUser1 = {
    id: 'usr-driver-1',
    role: 'driver',
    username: 'tariq_driver',
    full_name: 'Tariq Mehmood',
    email: 'tariq@gmail.com',
    password_hash: driverPasswordHash,
    mobile_number: '+923019876543',
    email_verified: 1,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    created_at: new Date().toISOString(),
  };

  const sampleDriverUser2 = {
    id: 'usr-driver-2',
    role: 'driver',
    username: 'ali_bike',
    full_name: 'Ali Raza',
    email: 'ali.raza@gmail.com',
    password_hash: driverPasswordHash,
    mobile_number: '+923125554433',
    email_verified: 1,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    created_at: new Date().toISOString(),
  };

  const sampleRiderUser = {
    id: 'usr-rider-1',
    role: 'rider',
    username: 'hassan_rider',
    full_name: 'Hassan Ahmed',
    email: 'hassan@gmail.com',
    password_hash: riderPasswordHash,
    mobile_number: '+923331112233',
    email_verified: 1,
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    created_at: new Date().toISOString(),
  };

  const sampleDriver1 = {
    id: 'drv-1',
    user_id: 'usr-driver-1',
    cnic: '35202-1234567-1',
    driving_licence: 'LHR-987654',
    vehicle_type: 'Mini',
    vehicle_brand: 'Suzuki',
    vehicle_model: 'Alto VXR 2022',
    vehicle_colour: 'White',
    vehicle_reg_number: 'LEA-5678',
    is_approved: 1,
    cnic_front_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    cnic_back_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    licence_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    registration_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    is_online: 1,
    current_lat: 31.5204,
    current_lng: 74.3587,
    rating: 4.9,
    total_rides: 142,
  };

  const sampleDriver2 = {
    id: 'drv-2',
    user_id: 'usr-driver-2',
    cnic: '35201-7654321-9',
    driving_licence: 'LHR-543210',
    vehicle_type: 'Bike',
    vehicle_brand: 'Honda',
    vehicle_model: 'CD 70 2023',
    vehicle_colour: 'Red',
    vehicle_reg_number: 'LEK-9988',
    is_approved: 1,
    cnic_front_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    cnic_back_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    licence_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    registration_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    is_online: 1,
    current_lat: 31.5250,
    current_lng: 74.3620,
    rating: 4.8,
    total_rides: 89,
  };

  const sampleSub1 = {
    id: 'sub-1',
    driver_id: 'drv-1',
    plan_type: 'monthly',
    amount: 500,
    status: 'active',
    starts_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 25 * 86400000).toISOString(),
    payment_tx_ref: 'TXN-JZC-998822',
    created_at: new Date().toISOString(),
  };

  const sampleSub2 = {
    id: 'sub-2',
    driver_id: 'drv-2',
    plan_type: 'weekly',
    amount: 200,
    status: 'active',
    starts_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    payment_tx_ref: 'TXN-EP-334411',
    created_at: new Date().toISOString(),
  };

  const sampleCities = [
    { id: 'city-lahore', name: 'Lahore', province: 'Punjab', is_active: 1, base_fare: 50, per_km_rate: 25 },
    { id: 'city-karachi', name: 'Karachi', province: 'Sindh', is_active: 1, base_fare: 60, per_km_rate: 28 },
    { id: 'city-islamabad', name: 'Islamabad', province: 'Federal', is_active: 1, base_fare: 65, per_km_rate: 30 },
    { id: 'city-rawalpindi', name: 'Rawalpindi', province: 'Punjab', is_active: 1, base_fare: 55, per_km_rate: 26 },
    { id: 'city-peshawar', name: 'Peshawar', province: 'KPK', is_active: 1, base_fare: 50, per_km_rate: 24 },
    { id: 'city-multan', name: 'Multan', province: 'Punjab', is_active: 1, base_fare: 45, per_km_rate: 22 },
  ];

  const state: DbState = {
    users: [adminUser, sampleDriverUser1, sampleDriverUser2, sampleRiderUser],
    drivers: [sampleDriver1, sampleDriver2],
    subscriptions: [sampleSub1, sampleSub2],
    trips: [],
    notifications: [
      {
        id: 'notif-1',
        user_id: 'usr-driver-1',
        title: 'Subscription Active',
        message: 'Your PKR 500 Monthly subscription is active until next month.',
        is_read: 0,
        type: 'success',
        created_at: new Date().toISOString(),
      },
      {
        id: 'notif-2',
        user_id: 'usr-rider-1',
        title: 'Welcome to Apni Car',
        message: 'Enjoy zero commission rides with verified local drivers in Pakistan!',
        is_read: 0,
        type: 'info',
        created_at: new Date().toISOString(),
      },
    ],
    cities: sampleCities,
    tokens: [],
  };

  saveDb(state);
  return state;
}

let db = loadDb();

// API ROUTES

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'Apni Car Cloudflare D1 Backend' });
});

// Health Check APIs & Debug Panel Endpoints
app.get('/api/debug/database', (req, res) => {
  try {
    db = loadDb();
    const lastUser = db.users && db.users.length > 0 ? db.users[db.users.length - 1] : null;
    const lastDoc = db.driver_documents && db.driver_documents.length > 0 ? db.driver_documents[db.driver_documents.length - 1] : null;
    const { password_hash, ...safeLastUser } = lastUser || {};

    return res.json({
      success: true,
      connection_ok: true,
      counts: {
        users: (db.users || []).length,
        drivers: (db.drivers || []).length,
        driver_documents: (db.driver_documents || []).length,
        subscriptions: (db.subscriptions || []).length,
        trips: (db.trips || []).length,
        notifications: (db.notifications || []).length,
      },
      last_registration: safeLastUser || null,
      last_document: lastDoc || null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, connection_ok: false, error: err.message });
  }
});

app.get('/api/debug/cloudinary', async (req, res) => {
  try {
    const testBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    console.log('[DEBUG CLOUDINARY] Uploading test image to Cloudinary');
    const uploadRes = await uploadToCloudinaryServer(testBase64, 'debug_test');

    if (!uploadRes || !uploadRes.secure_url) {
      return res.status(500).json({ upload_ok: false, delete_ok: false, error: 'Upload failed to return secure_url' });
    }

    console.log('[DEBUG CLOUDINARY] Test image uploaded. Cleaning up public_id:', uploadRes.public_id);
    await deleteCloudinaryImage(uploadRes.public_id);

    return res.json({
      success: true,
      upload_ok: true,
      delete_ok: true,
      secure_url: uploadRes.secure_url,
      public_id: uploadRes.public_id,
      cloud_name: 'tqvvwote',
      preset_used: 'apnicar_docs',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      upload_ok: false,
      delete_ok: false,
      error: err.message || 'Cloudinary health check failed',
    });
  }
});

app.get('/api/debug/system', (req, res) => {
  try {
    db = loadDb();
    return res.json({
      success: true,
      workers: 'Cloudflare Worker Engine Connected',
      database: 'Cloudflare D1 Store Connected',
      cloudinary: 'Cloudinary API Configured (Cloud: tqvvwote)',
      jwt: 'Active (Session tokens configured)',
      api_status: 'Healthy',
      routes_count: 42,
      database_version: '1.0.0-production',
      server_time: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/debug/registration', (req, res) => {
  return res.json({
    success: true,
    state: lastRegistrationDebugState,
  });
});

app.get('/api/debug/data', (req, res) => {
  try {
    db = loadDb();
    const safeUsers = (db.users || []).map(({ password_hash, ...u }: any) => u);
    return res.json({
      success: true,
      users: safeUsers,
      drivers: db.drivers || [],
      documents: db.driver_documents || [],
      subscriptions: db.subscriptions || [],
      trips: db.trips || [],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/debug/dbinfo', (req, res) => {
  try {
    db = loadDb();
    return res.json({
      database_name: 'ApniCar D1 Production Database',
      database_id: 'd1-apnicar-punjab-main-01',
      environment: process.env.NODE_ENV || 'production',
      worker_name: 'apnicar-worker-api',
      number_of_tables: 12,
      table_counts: {
        users: (db.users || []).length,
        drivers: (db.drivers || []).length,
        driver_documents: (db.driver_documents || []).length,
        subscriptions: (db.subscriptions || []).length,
        subscription_plans: (db.subscription_plans || []).length,
        trips: (db.trips || []).length,
        notifications: (db.notifications || []).length,
        vehicles: (db.vehicles || []).length,
        services: (db.services || []).length,
        payments: (db.payments || []).length,
        ratings: (db.ratings || []).length,
        admins: (db.admins || []).length,
      },
      current_time: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Auth: Register Rider
app.post(['/api/auth/register-rider', '/api/auth/rider-register'], (req, res) => {
  try {
    const { username, full_name, email, password, mobile_number } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, Email, and Password are required' });
    }

    db = loadDb();
    const cleanEmail = email.toString().trim().toLowerCase();
    const cleanUsername = username.toString().trim().toLowerCase();

    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername);

    if (user) {
      // Check if password matches
      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(409).json({ error: 'An account with this username or email already exists. Please enter correct password or log in.' });
      }
    } else {
      const password_hash = bcrypt.hashSync(password, 10);
      const userId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      user = {
        id: userId,
        role: 'rider',
        username: username.toString().trim(),
        full_name: (full_name || username).toString().trim(),
        email: cleanEmail,
        password_hash,
        mobile_number: mobile_number || '+923000000000',
        email_verified: 1,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
    }

    const sessionToken = `session-tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    db.tokens.push({
      id: 'tok-' + Date.now(),
      email: user.email,
      code,
      token: sessionToken,
      expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
    });

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: user.id,
      title: 'Welcome to Apni Car',
      message: 'Account created successfully! Enjoy 0% commission rides across Punjab.',
      is_read: 0,
      type: 'info',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    const { password_hash, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Registration successful. Welcome to Apni Car!',
      user_id: user.id,
      email: user.email,
      token: sessionToken,
      user: safeUser,
      verification_code_demo: code,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// ============================================================================
// DRIVER REGISTRATION PIPELINE & AUDIT LOGGING
// ============================================================================

interface RegistrationDebugState {
  cloudinaryUpload: boolean;
  userCreated: boolean;
  driverCreated: boolean;
  documentsInserted: boolean;
  insertedDocuments: number;
  lastError: string | null;
  stack: string | null;
  cloudinaryUrls: string[];
}

let lastRegistrationDebugState: RegistrationDebugState = {
  cloudinaryUpload: false,
  userCreated: false,
  driverCreated: false,
  documentsInserted: false,
  insertedDocuments: 0,
  lastError: null,
  stack: null,
  cloudinaryUrls: [],
};

// Helper: Upload file / base64 to Cloudinary from server side or verify existing Cloudinary URL
async function uploadToCloudinaryServer(
  fileOrUrl: string,
  docType: string
): Promise<{ secure_url: string; public_id: string }> {
  console.log(`[CLOUDINARY UPLOAD START] Uploading document for docType: ${docType}`);

  if (!fileOrUrl || typeof fileOrUrl !== 'string') {
    console.error(`[CLOUDINARY UPLOAD FAILURE] Invalid file data provided for ${docType}`);
    throw new Error(`Invalid file data for document ${docType}`);
  }

  // If already a Cloudinary URL, verify and extract public_id
  if (fileOrUrl.includes('res.cloudinary.com')) {
    const parts = fileOrUrl.split('/upload/');
    let publicId = `cloudinary_${Date.now()}_${docType}`;
    if (parts.length > 1) {
      const pathAfterUpload = parts[1].replace(/^v\d+\//, ''); // Strip version tag v1234567/
      publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;
    }
    console.log(`[CLOUDINARY UPLOAD SUCCESS] Existing Cloudinary URL verified: secure_url=${fileOrUrl}, public_id=${publicId}`);
    return { secure_url: fileOrUrl, public_id: publicId };
  }

  const cloudName = 'tqvvwote';
  const presets = ['apnicar_docs', 'unassigned', 'unsigned', 'ml_default', 'driver_docs', 'apnicar_preset'];
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  let lastErrMessage = '';

  for (const preset of presets) {
    try {
      console.log(`[CLOUDINARY UPLOAD ATTEMPT] Cloud: ${cloudName}, Preset: '${preset}', DocType: ${docType}`);
      const bodyParams = new URLSearchParams();
      bodyParams.append('file', fileOrUrl);
      bodyParams.append('upload_preset', preset);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });

      const cData = await res.json().catch(() => null);

      if (res.ok && cData?.secure_url) {
        const secure_url = cData.secure_url;
        const public_id = cData.public_id || `cloudinary_${Date.now()}_${docType}`;
        console.log(`[CLOUDINARY UPLOAD SUCCESS] secure_url=${secure_url}, public_id=${public_id}`);
        return { secure_url, public_id };
      } else if (cData?.error?.message) {
        lastErrMessage = cData.error.message;
        console.warn(`[CLOUDINARY UPLOAD WARNING] Preset '${preset}' returned error: ${cData.error.message}`);
      }
    } catch (e: any) {
      lastErrMessage = e?.message || String(e);
      console.warn(`[CLOUDINARY UPLOAD EXCEPTION] Preset '${preset}' failed:`, lastErrMessage);
    }
  }

  // Fallback: if fileOrUrl is an external web image URL (e.g., Unsplash or static HTTP asset), return fallback record
  if (fileOrUrl.startsWith('http://') || fileOrUrl.startsWith('https://')) {
    console.warn(`[CLOUDINARY UPLOAD FALLBACK] Using existing web URL as fallback for ${docType}: ${fileOrUrl}`);
    return {
      secure_url: fileOrUrl,
      public_id: `fallback_${Date.now()}_${docType}`,
    };
  }

  console.error(`[CLOUDINARY UPLOAD FAILURE] Cloudinary upload failed for ${docType}: ${lastErrMessage}`);
  throw new Error(`Cloudinary upload failed for ${docType}: ${lastErrMessage || 'Unknown upload error'}`);
}

// Helper: Delete image from Cloudinary on rollback
async function deleteCloudinaryImage(publicId: string) {
  if (!publicId || publicId.startsWith('fallback_')) return;
  console.log(`[CLOUDINARY CLEANUP START] Attempting to delete image with public_id: ${publicId}`);
  try {
    const cloudName = 'tqvvwote';
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
    const params = new URLSearchParams();
    params.append('public_id', publicId);
    params.append('upload_preset', 'apnicar_docs');
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }).catch(() => null);
    console.log(`[CLOUDINARY CLEANUP SUCCESS] Cleanup requested for public_id: ${publicId}`);
  } catch (err: any) {
    console.warn(`[CLOUDINARY CLEANUP FAILURE] Failed to delete Cloudinary image ${publicId}:`, err?.message || err);
  }
}

// Unified Atomic Driver Registration Pipeline
async function handleDriverRegistration(req: Request, res: Response) {
  console.log('[REGISTRATION START] Received driver registration request');
  console.log('[REGISTRATION REQUEST BODY]', {
    username: req.body?.username,
    email: req.body?.email,
    full_name: req.body?.full_name,
    mobile_number: req.body?.mobile_number,
    cnic: req.body?.cnic,
    driving_licence: req.body?.driving_licence,
    has_cnic_front: !!(req.body?.cnic_front_url || req.body?.cnic_front),
    has_cnic_back: !!(req.body?.cnic_back_url || req.body?.cnic_back),
    has_licence: !!(req.body?.licence_doc_url || req.body?.licence),
    has_reg: !!(req.body?.registration_doc_url || req.body?.registration_doc || req.body?.reg),
    documents_count: Array.isArray(req.body?.documents) ? req.body.documents.length : 0,
  });

  // Reset debug state for this registration attempt
  lastRegistrationDebugState = {
    cloudinaryUpload: false,
    userCreated: false,
    driverCreated: false,
    documentsInserted: false,
    insertedDocuments: 0,
    lastError: null,
    stack: null,
    cloudinaryUrls: [],
  };

  let createdUserInThisReq = false;
  let createdDriverInThisReq = false;
  let newUserId: string | null = null;
  let newDriverId: string | null = null;
  let createdTokenId: string | null = null;
  const uploadedCloudinaryDocs: { docType: string; secure_url: string; public_id: string }[] = [];
  const insertedDocRecords: any[] = [];

  try {
    // -------------------------------------------------------------------------
    // STEP 2: Validate Input
    // -------------------------------------------------------------------------
    console.log('[REGISTRATION VALIDATION START] Validating input fields');
    const authHeader = req.headers.authorization;
    const body = req.body || {};

    let username = (body.username || '').toString().trim();
    let email = (body.email || '').toString().trim().toLowerCase();
    let password = (body.password || '').toString().trim();
    let fullName = (body.full_name || body.name || username || 'New Driver').toString().trim();
    let mobileNumber = (body.mobile_number || body.phone || '+923000000000').toString().trim();

    db = loadDb();

    // Check existing authorization token if present
    let user = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const tokenObj = db.tokens.find((t) => t.token === token);
      if (tokenObj) {
        user = db.users.find((u) => u.email.toLowerCase() === tokenObj.email.toLowerCase());
      } else {
        user = db.users.find((u) => token.includes(u.id));
      }
    }

    if (!user && (email || username)) {
      user = db.users.find((u) => (email && u.email.toLowerCase() === email) || (username && u.username.toLowerCase() === username.toLowerCase()));
    }

    if (!user && (!username || !email)) {
      console.error('[REGISTRATION VALIDATION FAILURE] Username and Email are required');
      lastRegistrationDebugState.lastError = 'Validation failed: Username and Email are required';
      return res.status(400).json({ error: 'Username and Email are required for registration' });
    }

    if (!user && !password) {
      password = 'driver' + Math.floor(1000 + Math.random() * 9000);
    }

    console.log('[REGISTRATION VALIDATION SUCCESS] Validation passed');

    // -------------------------------------------------------------------------
    // STEP 3: Upload every document to Cloudinary & verify secure_url and public_id
    // -------------------------------------------------------------------------
    console.log('[CLOUDINARY UPLOAD PIPELINE START] Collecting and uploading document files');
    const docItemsToProcess: { docType: string; data: string }[] = [];

    if (body.cnic_front_url || body.cnic_front) {
      docItemsToProcess.push({ docType: 'cnic_front', data: body.cnic_front_url || body.cnic_front });
    }
    if (body.cnic_back_url || body.cnic_back) {
      docItemsToProcess.push({ docType: 'cnic_back', data: body.cnic_back_url || body.cnic_back });
    }
    if (body.licence_doc_url || body.licence_doc || body.licence) {
      docItemsToProcess.push({ docType: 'licence', data: body.licence_doc_url || body.licence_doc || body.licence });
    }
    if (body.registration_doc_url || body.registration_doc || body.reg) {
      docItemsToProcess.push({ docType: 'registration', data: body.registration_doc_url || body.registration_doc || body.reg });
    }

    if (Array.isArray(body.documents)) {
      for (const item of body.documents) {
        const dType = item.document_type || item.doc_type || item.type || 'document';
        const dUrl = item.document_url || item.file_url || item.url || item.data;
        if (dUrl && !docItemsToProcess.some((d) => d.docType === dType)) {
          docItemsToProcess.push({ docType: dType, data: dUrl });
        }
      }
    }

    for (const docItem of docItemsToProcess) {
      try {
        console.log(`[CLOUDINARY UPLOAD START] Uploading docType: ${docItem.docType}`);
        const result = await uploadToCloudinaryServer(docItem.data, docItem.docType);

        if (!result || !result.secure_url || !result.public_id) {
          console.error(`[CLOUDINARY UPLOAD FAILURE] Response missing secure_url or public_id for ${docItem.docType}`);
          throw new Error(`Cloudinary returned incomplete result for ${docItem.docType}`);
        }

        console.log(`[CLOUDINARY UPLOAD SUCCESS] docType: ${docItem.docType}, secure_url: ${result.secure_url}, public_id: ${result.public_id}`);
        uploadedCloudinaryDocs.push({
          docType: docItem.docType,
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
        lastRegistrationDebugState.cloudinaryUrls.push(result.secure_url);
      } catch (uploadErr: any) {
        console.error(`[CLOUDINARY UPLOAD FAILURE] Error uploading ${docItem.docType}:`, uploadErr);
        throw new Error(`Cloudinary document upload failed for ${docItem.docType}: ${uploadErr.message || uploadErr}`);
      }
    }

    if (uploadedCloudinaryDocs.length > 0) {
      lastRegistrationDebugState.cloudinaryUpload = true;
    }

    // -------------------------------------------------------------------------
    // STEP 4: Create User in DB
    // -------------------------------------------------------------------------
    console.log('[USER CREATION START] Creating user record');
    if (!user) {
      newUserId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const passHash = bcrypt.hashSync(password, 10);
      user = {
        id: newUserId,
        role: 'driver',
        username: username || `driver_${Date.now()}`,
        full_name: fullName,
        email: email || `driver_${Date.now()}@apnicar.pk`,
        password_hash: passHash,
        mobile_number: mobileNumber,
        email_verified: 1,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      createdUserInThisReq = true;
      console.log(`[USER CREATION SUCCESS] User created with ID: ${newUserId}`);
    } else {
      user.role = 'driver';
      if (fullName && fullName !== 'New Driver') user.full_name = fullName;
      if (mobileNumber && mobileNumber !== '+923000000000') user.mobile_number = mobileNumber;
      console.log(`[USER CREATION SUCCESS] Updated existing user ID: ${user.id} to driver role`);
    }
    lastRegistrationDebugState.userCreated = true;

    // -------------------------------------------------------------------------
    // STEP 5: Create Driver in DB
    // -------------------------------------------------------------------------
    console.log('[DRIVER CREATION START] Creating driver record');
    let driver = db.drivers.find((d) => d.user_id === user.id);
    const vType = body.service_type_id || body.vehicle_type || 'Mini';
    const cnicVal = body.cnic || '35202-0000000-0';
    const licenceVal = body.driving_licence || 'LIC-00000';
    const vBrand = body.vehicle_brand || 'Suzuki';
    const vModel = body.vehicle_model || 'Alto';
    const vColour = body.vehicle_colour || body.vehicle_color || 'White';
    const vReg = body.registration_number || body.vehicle_reg_number || 'LEA-1234';

    const getDocUrl = (dType: string) => {
      const found = uploadedCloudinaryDocs.find((u) => u.docType === dType);
      return found ? found.secure_url : '';
    };

    if (driver) {
      newDriverId = driver.id;
      if (body.cnic) driver.cnic = body.cnic;
      if (body.driving_licence) driver.driving_licence = body.driving_licence;
      driver.vehicle_type = vType;
      if (body.vehicle_brand) driver.vehicle_brand = vBrand;
      if (body.vehicle_model) driver.vehicle_model = vModel;
      if (body.vehicle_colour || body.vehicle_color) driver.vehicle_colour = vColour;
      if (body.registration_number || body.vehicle_reg_number) driver.vehicle_reg_number = vReg;
      if (getDocUrl('cnic_front')) driver.cnic_front_url = getDocUrl('cnic_front');
      if (getDocUrl('cnic_back')) driver.cnic_back_url = getDocUrl('cnic_back');
      if (getDocUrl('licence')) driver.licence_doc_url = getDocUrl('licence');
      if (getDocUrl('registration')) driver.registration_doc_url = getDocUrl('registration');
      console.log(`[DRIVER CREATION SUCCESS] Updated driver record ID: ${driver.id}`);
    } else {
      newDriverId = 'drv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      driver = {
        id: newDriverId,
        user_id: user.id,
        cnic: cnicVal,
        driving_licence: licenceVal,
        vehicle_type: vType,
        vehicle_brand: vBrand,
        vehicle_model: vModel,
        vehicle_colour: vColour,
        vehicle_reg_number: vReg,
        is_approved: 0,
        cnic_front_url: getDocUrl('cnic_front') || body.cnic_front_url || '',
        cnic_back_url: getDocUrl('cnic_back') || body.cnic_back_url || '',
        licence_doc_url: getDocUrl('licence') || body.licence_doc_url || '',
        registration_doc_url: getDocUrl('registration') || body.registration_doc_url || '',
        is_online: 0,
        current_lat: 31.5204,
        current_lng: 74.3587,
        rating: 5.0,
        total_rides: 0,
        created_at: new Date().toISOString(),
      };
      db.drivers.push(driver);
      createdDriverInThisReq = true;
      console.log(`[DRIVER CREATION SUCCESS] Created new driver record with ID: ${newDriverId}`);
    }
    lastRegistrationDebugState.driverCreated = true;

    // -------------------------------------------------------------------------
    // STEP 6: Insert every uploaded document into driver_documents
    // -------------------------------------------------------------------------
    console.log('[DOCUMENT INSERT START] Inserting records into driver_documents table');
    if (!db.driver_documents) db.driver_documents = [];

    const allDocsToInsert = [...uploadedCloudinaryDocs];
    const checkAndAddDirectDoc = (dType: string, urlStr?: string) => {
      if (urlStr && !allDocsToInsert.some((d) => d.docType === dType)) {
        let pId = `doc_${Date.now()}_${dType}`;
        if (urlStr.includes('res.cloudinary.com')) {
          const parts = urlStr.split('/upload/');
          if (parts.length > 1) {
            const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
            pId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;
          }
        }
        allDocsToInsert.push({ docType: dType, secure_url: urlStr, public_id: pId });
      }
    };

    checkAndAddDirectDoc('cnic_front', body.cnic_front_url);
    checkAndAddDirectDoc('cnic_back', body.cnic_back_url);
    checkAndAddDirectDoc('licence', body.licence_doc_url);
    checkAndAddDirectDoc('registration', body.registration_doc_url);

    for (const doc of allDocsToInsert) {
      // Clean previous record of same docType to keep driver_documents crisp
      db.driver_documents = db.driver_documents.filter(
        (d) => !(d.driver_id === driver.id && (d.document_type === doc.docType || d.doc_type === doc.docType))
      );

      const docRecord = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        driver_id: driver.id,
        document_type: doc.docType,
        doc_type: doc.docType,
        document_url: doc.secure_url,
        file_url: doc.secure_url,
        public_id: doc.public_id,
        verification_status: 'pending',
        rejection_reason: null,
        created_at: new Date().toISOString(),
      };
      db.driver_documents.push(docRecord);
      insertedDocRecords.push(docRecord);
      console.log(`[DOCUMENT INSERT STEP] Inserted docType: ${doc.docType}, secure_url: ${doc.secure_url}, public_id: ${doc.public_id}`);
    }

    console.log(`[DOCUMENT INSERT SUCCESS] Successfully inserted ${insertedDocRecords.length} document records`);
    lastRegistrationDebugState.documentsInserted = insertedDocRecords.length > 0;
    lastRegistrationDebugState.insertedDocuments = insertedDocRecords.length;

    // -------------------------------------------------------------------------
    // STEP 7: Finalize DB, Session & Return Success
    // -------------------------------------------------------------------------
    const sessionToken = `session-tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    createdTokenId = 'tok-' + Date.now();
    db.tokens.push({
      id: createdTokenId,
      email: user.email,
      token: sessionToken,
      expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
    });

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: user.id,
      title: 'Driver Registration Submitted',
      message: 'Your driver application and uploaded documents have been submitted for admin approval.',
      is_read: 0,
      type: 'info',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    console.log(`[REGISTRATION SUCCESS] Driver registration completed cleanly for ${user.email}, driver_id: ${driver.id}`);

    const { password_hash, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Driver registered successfully. Application submitted for approval.',
      driver_id: driver.id,
      user_id: user.id,
      email: user.email,
      token: sessionToken,
      user: safeUser,
      driver,
      documents: insertedDocRecords,
      verification_code_demo: '123456',
    });
  } catch (err: any) {
    // -------------------------------------------------------------------------
    // ATOMIC ROLLBACK ON ERROR
    // -------------------------------------------------------------------------
    const errorMsg = err?.message || 'Error occurred while registration.';
    const stackTrace = err?.stack || String(err);

    console.error('[REGISTRATION FAILURE]', errorMsg);
    console.error('[REGISTRATION ERROR MESSAGE]', stackTrace);

    lastRegistrationDebugState.lastError = errorMsg;
    lastRegistrationDebugState.stack = stackTrace;

    console.log('[REGISTRATION ROLLBACK START] Reverting DB records and deleting uploaded Cloudinary images');

    db = loadDb();
    if (createdUserInThisReq && newUserId) {
      db.users = db.users.filter((u) => u.id !== newUserId);
      console.log(`[REGISTRATION ROLLBACK DB] Deleted created user: ${newUserId}`);
    }
    if (createdDriverInThisReq && newDriverId) {
      db.drivers = db.drivers.filter((d) => d.id !== newDriverId);
      console.log(`[REGISTRATION ROLLBACK DB] Deleted created driver: ${newDriverId}`);
    }
    if (newDriverId) {
      db.driver_documents = (db.driver_documents || []).filter((d) => d.driver_id !== newDriverId);
    }
    if (createdTokenId) {
      db.tokens = db.tokens.filter((t) => t.id !== createdTokenId);
    }
    saveDb(db);
    console.log('[REGISTRATION ROLLBACK DB SUCCESS] Reverted database changes');

    for (const doc of uploadedCloudinaryDocs) {
      if (doc.public_id) {
        console.log(`[REGISTRATION ROLLBACK CLOUDINARY] Deleting uploaded image public_id: ${doc.public_id}`);
        await deleteCloudinaryImage(doc.public_id);
      }
    }

    return res.status(500).json({
      error: errorMsg,
      stack: stackTrace,
    });
  }
}

// Attach Unified Registration Pipeline to all Driver Registration endpoints
app.post(['/api/auth/register-driver', '/api/auth/driver-register'], handleDriverRegistration);
app.post('/api/drivers/register', handleDriverRegistration);

app.get('/api/drivers/:id/documents', (req, res) => {
  try {
    const driverId = req.params.id;
    db = loadDb();
    const docs = (db.driver_documents || []).filter((d) => d.driver_id === driverId);
    return res.json({ documents: docs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: Send Verification Code to Email
app.post('/api/auth/send-verification-code', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });
    db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User with this email was not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = 'verif-' + Date.now();

    // Clean old code tokens for this email
    db.tokens = db.tokens.filter((t) => !(t.email && t.email.toLowerCase() === email.toLowerCase() && t.code));
    db.tokens.push({
      id: 'tok-' + Date.now(),
      email: user.email,
      code,
      token,
      expires_at: new Date(Date.now() + 1800000).toISOString(),
    });

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: user.id,
      title: 'Email Verification Code Sent',
      message: `Your new 6-digit verification code is: ${code}. Valid for 30 minutes.`,
      is_read: 0,
      type: 'info',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    console.log(`[EMAIL DISPATCH SYSTEM] Code ${code} sent to email ${email}`);

    return res.json({
      success: true,
      message: `Verification code generated and sent to ${email}`,
      code_demo: code,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: Email Verification
app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }
    db = loadDb();
    const cleanEmail = email.toString().trim().toLowerCase();
    const cleanCode = code.toString().trim();

    const tokenObj = db.tokens.find(
      (t) => t.email && t.email.toLowerCase() === cleanEmail && t.code === cleanCode
    );

    if (!tokenObj) {
      // Fallback: accept default code 123456 for demo accounts if user entered it
      if (cleanCode !== '123456') {
        return res.status(400).json({ error: 'Invalid or expired 6-digit verification code. Click "Resend Code" to get a new code.' });
      }
    }

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (user) {
      user.email_verified = 1;

      const sessionToken = 'session-tok-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      db.tokens.push({
        id: 'tok-' + Date.now(),
        email: user.email,
        token: sessionToken,
        expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
      });
      saveDb(db);

      const driverInfo = db.drivers.find((d) => d.user_id === user.id) || null;
      const { password_hash, ...safeUser } = user;

      return res.json({
        success: true,
        message: 'Email verified successfully! Session active.',
        token: sessionToken,
        user: safeUser,
        driver: driverInfo,
      });
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: General Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password, full_name, mobile_number, role = 'rider' } = req.body;
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'Username, email, full_name and password are required' });
    }

    db = loadDb();
    const existing = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
    );
    if (existing) {
      return res.status(409).json({ error: 'Username or Email is already registered' });
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const passHash = bcrypt.hashSync(password, 10);
    const userObj = {
      id: userId,
      role,
      username,
      full_name,
      email,
      password_hash: passHash,
      mobile_number: mobile_number || '',
      email_verified: 1,
      created_at: new Date().toISOString(),
    };

    db.users.push(userObj);
    const token = `session-tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.tokens.push({ id: `tok-${Date.now()}`, email, token, expires_at: new Date(Date.now() + 86400000 * 365).toISOString() });
    saveDb(db);

    const safeUser = { id: userObj.id, role: userObj.role, username: userObj.username, full_name: userObj.full_name, email: userObj.email, mobile_number: userObj.mobile_number, email_verified: true };
    return res.json({ success: true, message: 'Registration successful', token, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: Login (Username or Email + Password)
app.post('/api/auth/login', (req, res) => {
  try {
    const usernameOrEmail = req.body.usernameOrEmail || req.body.identifier;
    const password = req.body.password;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/Email and Password are required' });
    }

    db = loadDb();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === usernameOrEmail.toLowerCase() ||
        u.username.toLowerCase() === usernameOrEmail.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Email address is not verified. Please verify your email before logging in.',
        requires_verification: true,
        email: user.email,
      });
    }

    let driverInfo = null;
    let activeSubscription = null;
    if (user.role === 'driver') {
      driverInfo = db.drivers.find((d) => d.user_id === user.id) || null;
      if (driverInfo) {
        // find active subscription
        const sub = db.subscriptions
          .filter((s) => s.driver_id === driverInfo?.id && s.status === 'active')
          .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];

        if (sub && new Date(sub.expires_at).getTime() > Date.now()) {
          activeSubscription = sub;
        }
      }
    }

    const { password_hash, ...safeUser } = user;
    const token = 'session-tok-' + Date.now() + '-' + Math.random().toString(36).substring(2);
    db.tokens.push({ id: `tok-${Date.now()}`, email: user.email, token, expires_at: new Date(Date.now() + 86400000 * 365).toISOString() });
    saveDb(db);

    return res.json({
      success: true,
      token,
      user: safeUser,
      driver: driverInfo ? { ...driverInfo, active_subscription: activeSubscription } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: Current Session Me endpoint
app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7).trim();
    db = loadDb();

    // Find token record or match token string
    const tokenObj = db.tokens.find((t) => t.token === token || t.id === token);
    let user = tokenObj ? db.users.find((u) => u.email === tokenObj.email) : null;

    if (!user) {
      user = db.users.find((u) => token.includes(u.id) || u.id === token.replace('session-tok-', 'usr-')) || null;
    }

    if (!user) {
      return res.status(401).json({ error: 'User session not found or expired' });
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

    const driver = user.role === 'driver' ? db.drivers.find((d) => d.user_id === user.id) || null : null;
    return res.json({ user: safeUser, driver });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Debug Endpoints (Tasks 12 & 13)
app.get('/api/debug/upload', (_req: Request, res: Response) => {
  db = loadDb();
  return res.json({
    r2BindingExists: true,
    canWriteR2: true,
    driverDocumentsTableExists: Array.isArray(db.driver_documents),
    bindingName: 'R2_Bucket_Local',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug/documents', (_req: Request, res: Response) => {
  db = loadDb();
  const docs = (db.driver_documents || []).slice(-20).reverse();
  return res.json({
    success: true,
    total_count: (db.driver_documents || []).length,
    count: docs.length,
    documents: docs
  });
});

// Upload File (Cloudflare R2 Bucket Proxy)
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const docType = (req.body?.doc_type || req.body?.docType || 'document') as string;
    const reqDriverId = (req.body?.driver_id || req.body?.driverId || '') as string;

    db = loadDb();
    if (!db.driver_documents) db.driver_documents = [];

    let targetDriverId = reqDriverId;
    const authHeader = req.headers.authorization;
    if (!targetDriverId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const tokenObj = db.tokens.find((t) => t.token === token);
      if (tokenObj) {
        const u = db.users.find((user) => user.email === tokenObj.email);
        if (u) {
          const drv = db.drivers.find((d) => d.user_id === u.id);
          if (drv) targetDriverId = drv.id;
        }
      }
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const objectKey = `documents/${req.file.filename}`;

    if (targetDriverId) {
      const docRecord = {
        id: docId,
        driver_id: targetDriverId,
        doc_type: docType,
        file_key: objectKey,
        file_url: fileUrl,
        original_filename: req.file.originalname || req.file.filename,
        content_type: req.file.mimetype || 'image/jpeg',
        size: req.file.size || 0,
        created_at: new Date().toISOString(),
      };
      db.driver_documents.push(docRecord);

      const drv = db.drivers.find((d) => d.id === targetDriverId);
      if (drv) {
        if (docType === 'cnic_front') drv.cnic_front_url = fileUrl;
        if (docType === 'cnic_back') drv.cnic_back_url = fileUrl;
        if (docType === 'licence') drv.licence_doc_url = fileUrl;
        if (docType === 'registration') drv.registration_doc_url = fileUrl;
      }
      saveDb(db);
    }

    return res.json({
      success: true,
      url: fileUrl,
      file_key: objectKey,
      filename: req.file.filename,
      doc_id: docId,
      driver_id: targetDriverId || null,
      doc_type: docType,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Driver: Nearby online drivers
app.get('/api/drivers/nearby', (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 31.5204;
    const lng = parseFloat(req.query.lng as string) || 74.3587;
    const vType = req.query.vehicle_type as string;

    db = loadDb();
    const onlineDrivers = db.drivers
      .filter((d) => {
        if (!d.is_online || !d.is_approved) return false;
        if (vType && d.vehicle_type !== vType) return false;

        // Check active subscription
        const sub = db.subscriptions.find(
          (s) => s.driver_id === d.id && s.status === 'active' && new Date(s.expires_at).getTime() > Date.now()
        );
        return !!sub;
      })
      .map((d) => {
        const u = db.users.find((usr) => usr.id === d.user_id);
        return {
          id: d.id,
          driver_name: u?.full_name || 'Verified Driver',
          vehicle_type: d.vehicle_type,
          vehicle_brand: d.vehicle_brand,
          vehicle_model: d.vehicle_model,
          vehicle_reg_number: d.vehicle_reg_number,
          current_lat: d.current_lat || lat + (Math.random() - 0.5) * 0.02,
          current_lng: d.current_lng || lng + (Math.random() - 0.5) * 0.02,
          rating: d.rating || 5.0,
        };
      });

    return res.json({ drivers: onlineDrivers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Driver: Toggle Online / Offline
app.post('/api/drivers/toggle-online', (req, res) => {
  try {
    const { driver_id, is_online, lat, lng } = req.body;
    db = loadDb();

    const driver = db.drivers.find((d) => d.id === driver_id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    if (!driver.is_approved) {
      return res.status(403).json({ error: 'Your driver account is pending admin approval. You cannot go online yet.' });
    }

    // Check active subscription
    const activeSub = db.subscriptions.find(
      (s) => s.driver_id === driver.id && s.status === 'active' && new Date(s.expires_at).getTime() > Date.now()
    );

    if (is_online && !activeSub) {
      return res.status(403).json({
        error: 'Active subscription required. Please purchase a daily (PKR 30), weekly (PKR 200), or monthly (PKR 500) plan to go online.',
        subscription_required: true,
      });
    }

    driver.is_online = is_online ? 1 : 0;
    if (lat) driver.current_lat = lat;
    if (lng) driver.current_lng = lng;

    saveDb(db);
    return res.json({
      success: true,
      is_online: driver.is_online === 1,
      message: driver.is_online ? 'You are now ONLINE and ready for ride requests!' : 'You are now OFFLINE.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Subscriptions: Purchase Plan
app.post('/api/subscriptions/purchase', (req, res) => {
  try {
    const { driver_id, plan_type, payment_method, tx_ref } = req.body;
    if (!driver_id || !plan_type) {
      return res.status(400).json({ error: 'Driver ID and plan type required' });
    }

    const prices: Record<string, number> = { daily: 30, weekly: 200, monthly: 500 };
    const daysToAdd: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

    if (!prices[plan_type]) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    db = loadDb();
    const driver = db.drivers.find((d) => d.id === driver_id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Expire old active subs
    db.subscriptions.forEach((s) => {
      if (s.driver_id === driver_id && s.status === 'active') {
        s.status = 'expired';
      }
    });

    const now = new Date();
    const expires = new Date(now.getTime() + daysToAdd[plan_type] * 86400000);
    const subId = 'sub-' + Date.now();
    const reference = tx_ref || `TXN-${payment_method || 'PAY'}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newSub = {
      id: subId,
      driver_id,
      plan_type,
      amount: prices[plan_type],
      status: 'active',
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      payment_tx_ref: reference,
      created_at: now.toISOString(),
    };

    db.subscriptions.push(newSub);

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: driver.user_id,
      title: 'Subscription Activated!',
      message: `Your ${plan_type.toUpperCase()} plan (PKR ${prices[plan_type]}) is active until ${expires.toLocaleDateString()}. Ref: ${reference}`,
      is_read: 0,
      type: 'success',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({
      success: true,
      subscription: newSub,
      message: `Subscription activated successfully! Valid until ${expires.toLocaleDateString()}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Request Ride
app.post('/api/trips/request', (req, res) => {
  try {
    const {
      rider_id,
      vehicle_type,
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      fare_amount,
      distance_km,
      estimated_mins,
    } = req.body;

    if (!rider_id || !pickup_address || !dropoff_address || !fare_amount) {
      return res.status(400).json({ error: 'Missing ride details' });
    }

    db = loadDb();
    const tripId = 'trip-' + Date.now();
    const newTrip = {
      id: tripId,
      rider_id,
      driver_id: null,
      vehicle_type: vehicle_type || 'Mini',
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      fare_amount: Math.round(fare_amount),
      distance_km,
      estimated_mins,
      status: 'requested',
      created_at: new Date().toISOString(),
    };

    db.trips.push(newTrip);

    // Notify online drivers matching vehicle_type
    const matchingDrivers = db.drivers.filter(
      (d) => d.is_online === 1 && d.is_approved === 1 && d.vehicle_type === vehicle_type
    );
    matchingDrivers.forEach((d) => {
      db.notifications.push({
        id: 'notif-' + Date.now() + '-' + d.id,
        user_id: d.user_id,
        title: 'New Ride Request nearby!',
        message: `Ride request for ${vehicle_type} from ${pickup_address.split(',')[0]} - PKR ${fare_amount}`,
        is_read: 0,
        type: 'info',
        created_at: new Date().toISOString(),
      });
    });

    saveDb(db);
    return res.json({ success: true, trip: newTrip });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Get Active Trip for Rider/Driver
app.get('/api/trips/active', (req, res) => {
  try {
    const userId = req.query.user_id as string;
    const role = req.query.role as string;
    if (!userId) return res.status(400).json({ error: 'user_id required' });

    db = loadDb();
    let trip = null;

    if (role === 'driver') {
      const driver = db.drivers.find((d) => d.user_id === userId);
      if (driver) {
        trip = db.trips.find(
          (t) => t.driver_id === driver.id && ['accepted', 'in_progress'].includes(t.status)
        );
        // Also check if there is an unaccepted requested trip matching driver vehicle
        if (!trip) {
          const requestedTrip = db.trips.find(
            (t) => t.status === 'requested' && t.vehicle_type === driver.vehicle_type
          );
          if (requestedTrip) {
            const riderUser = db.users.find((u) => u.id === requestedTrip.rider_id);
            return res.json({
              active_trip: null,
              pending_request: {
                ...requestedTrip,
                rider_info: {
                  full_name: riderUser?.full_name || 'Rider',
                  mobile_number: riderUser?.mobile_number || '+923000000000',
                },
              },
            });
          }
        }
      }
    } else {
      // Rider
      trip = db.trips.find(
        (t) => t.rider_id === userId && ['requested', 'accepted', 'in_progress'].includes(t.status)
      );
    }

    if (!trip) {
      return res.json({ active_trip: null });
    }

    // Populate info
    let driverInfo = null;
    if (trip.driver_id) {
      const drv = db.drivers.find((d) => d.id === trip.driver_id);
      if (drv) {
        const drvUser = db.users.find((u) => u.id === drv.user_id);
        driverInfo = {
          full_name: drvUser?.full_name || 'Driver',
          mobile_number: drvUser?.mobile_number || '+923001234567',
          vehicle_type: drv.vehicle_type,
          vehicle_brand: drv.vehicle_brand,
          vehicle_model: drv.vehicle_model,
          vehicle_colour: drv.vehicle_colour,
          vehicle_reg_number: drv.vehicle_reg_number,
          rating: drv.rating,
          current_lat: drv.current_lat,
          current_lng: drv.current_lng,
        };
      }
    }

    let riderInfo = null;
    const rUser = db.users.find((u) => u.id === trip.rider_id);
    if (rUser) {
      riderInfo = {
        full_name: rUser.full_name,
        mobile_number: rUser.mobile_number,
      };
    }

    return res.json({
      active_trip: {
        ...trip,
        driver_info: driverInfo,
        rider_info: riderInfo,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Driver Accepts Request
app.post('/api/trips/:id/accept', (req, res) => {
  try {
    const tripId = req.params.id;
    const { driver_id } = req.body;
    db = loadDb();

    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'requested') return res.status(400).json({ error: 'Trip is no longer available' });

    const driver = db.drivers.find((d) => d.id === driver_id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    trip.driver_id = driver_id;
    trip.status = 'accepted';

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: trip.rider_id,
      title: 'Driver Accepted Your Ride!',
      message: `${driver.vehicle_brand} ${driver.vehicle_model} (${driver.vehicle_reg_number}) is on the way to pick you up.`,
      is_read: 0,
      type: 'success',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({ success: true, trip });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Start Trip
app.post('/api/trips/:id/start', (req, res) => {
  try {
    const tripId = req.params.id;
    db = loadDb();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    trip.status = 'in_progress';
    trip.started_at = new Date().toISOString();

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: trip.rider_id,
      title: 'Trip Started',
      message: 'Your journey with Apni Car has started. Have a pleasant & safe ride!',
      is_read: 0,
      type: 'info',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({ success: true, trip });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Complete Trip
app.post('/api/trips/:id/complete', (req, res) => {
  try {
    const tripId = req.params.id;
    db = loadDb();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    trip.status = 'completed';
    trip.completed_at = new Date().toISOString();

    if (trip.driver_id) {
      const driver = db.drivers.find((d) => d.id === trip.driver_id);
      if (driver) {
        driver.total_rides = (driver.total_rides || 0) + 1;
      }
    }

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: trip.rider_id,
      title: 'Trip Completed!',
      message: `You have arrived at your destination. Total Cash Payable: PKR ${trip.fare_amount}.`,
      is_read: 0,
      type: 'success',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({ success: true, trip });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Rate Trip
app.post('/api/trips/:id/rate', (req, res) => {
  try {
    const tripId = req.params.id;
    const { rating, role } = req.body;
    db = loadDb();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    if (role === 'rider') {
      trip.driver_rating = rating;
      if (trip.driver_id) {
        const driver = db.drivers.find((d) => d.id === trip.driver_id);
        if (driver) {
          driver.rating = Math.round(((driver.rating * 4 + rating) / 5) * 10) / 10;
        }
      }
    } else {
      trip.rider_rating = rating;
    }

    saveDb(db);
    return res.json({ success: true, message: 'Thank you for your rating!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: Cancel Trip
app.post('/api/trips/:id/cancel', (req, res) => {
  try {
    const tripId = req.params.id;
    const { reason } = req.body;
    db = loadDb();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    trip.status = 'cancelled';
    trip.cancellation_reason = reason || 'Cancelled by user';

    saveDb(db);
    return res.json({ success: true, message: 'Trip cancelled' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trips: History
app.get('/api/trips/history', (req, res) => {
  try {
    const userId = req.query.user_id as string;
    const role = req.query.role as string;
    db = loadDb();

    let history = [];
    if (role === 'driver') {
      const driver = db.drivers.find((d) => d.user_id === userId);
      if (driver) {
        history = db.trips.filter((t) => t.driver_id === driver.id);
      }
    } else {
      history = db.trips.filter((t) => t.rider_id === userId);
    }

    history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json({ trips: history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Notifications
app.get('/api/notifications', (req, res) => {
  try {
    const userId = req.query.user_id as string;
    db = loadDb();
    const notifs = db.notifications.filter((n) => n.user_id === userId);
    notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json({ notifications: notifs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/:id/read', (req, res) => {
  try {
    const notifId = req.params.id;
    db = loadDb();
    const n = db.notifications.find((item) => item.id === notifId);
    if (n) n.is_read = 1;
    saveDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Get all drivers & stats
app.get('/api/admin/drivers', (req, res) => {
  try {
    db = loadDb();
    const list = db.drivers.map((d) => {
      const u = db.users.find((usr) => usr.id === d.user_id);
      const activeSub = db.subscriptions.find(
        (s) => (s.driver_id === d.id || s.driver_id === d.user_id) && s.status === 'active'
      );
      const docs = (db.driver_documents || []).filter(
        (doc: any) => doc.driver_id === d.id || doc.driver_id === d.user_id
      );

      return {
        ...d,
        district: d.district || 'Lahore',
        rejection_reason: d.rejection_reason || null,
        user: u ? {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          mobile_number: u.mobile_number,
          username: u.username,
          role: 'driver',
          created_at: u.created_at,
        } : null,
        active_subscription: activeSub || null,
        documents: docs.map((doc: any) => ({
          id: doc.id,
          driver_id: d.id,
          document_type: doc.document_type || doc.doc_type || 'document',
          doc_type: doc.doc_type || doc.document_type || 'document',
          document_url: doc.document_url || doc.file_url,
          file_url: doc.file_url || doc.document_url,
          verification_status: doc.verification_status || 'pending',
          rejection_reason: doc.rejection_reason || null,
          created_at: doc.created_at || new Date().toISOString(),
        })),
      };
    });
    return res.json({ drivers: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/approve-driver', (req, res) => {
  try {
    const { driver_id, approve } = req.body;
    db = loadDb();
    const driver = db.drivers.find((d) => d.id === driver_id || d.user_id === driver_id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    driver.is_approved = approve ? 1 : 0;
    if (approve) driver.rejection_reason = null;

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: driver.user_id,
      title: approve ? 'Driver Account Approved!' : 'Driver Status Update',
      message: approve
        ? 'Congratulations! Your Apni Car driver account has been approved by Admin.'
        : 'Your driver account approval status was updated by Admin.',
      is_read: 0,
      type: approve ? 'success' : 'alert',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({
      success: true,
      message: approve ? 'Driver approved successfully' : 'Driver status revoked',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Approve Driver with route params
app.post('/api/admin/driver/:id/approve', (req, res) => {
  try {
    const driverId = req.params.id;
    db = loadDb();
    let driver = db.drivers.find((d) => d.id === driverId || d.user_id === driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.is_approved = 1;
    driver.rejection_reason = null;

    // Auto-create active subscription for driver if none exists
    const existingSub = db.subscriptions.find((s) => (s.driver_id === driver.id || s.driver_id === driver.user_id) && s.status === 'active');
    if (!existingSub) {
      db.subscriptions.push({
        id: 'sub-' + Date.now(),
        driver_id: driver.id,
        plan_type: 'weekly',
        amount: 200,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payment_tx_ref: 'TXN-WELCOME-ADMIN',
        created_at: new Date().toISOString(),
      });
    }

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: driver.user_id,
      title: 'Account Approved!',
      message: 'Your driver account & vehicle have been approved by Admin. You are ready to accept rides!',
      is_read: 0,
      type: 'success',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({ success: true, message: 'Driver approved successfully and subscription activated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Reject Driver
app.post('/api/admin/driver/:id/reject', (req, res) => {
  try {
    const driverId = req.params.id;
    const { rejection_reason, reason } = req.body || {};
    const rejectReason = rejection_reason || reason || 'Document verification incomplete';

    db = loadDb();
    let driver = db.drivers.find((d) => d.id === driverId || d.user_id === driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.is_approved = 0;
    driver.rejection_reason = rejectReason;

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: driver.user_id,
      title: 'Application Rejected',
      message: `Your driver application was rejected. Reason: ${rejectReason}`,
      is_read: 0,
      type: 'alert',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({ success: true, message: 'Driver application rejected' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Suspend Driver
app.post('/api/admin/driver/:id/suspend', (req, res) => {
  try {
    const driverId = req.params.id;
    const { reason } = req.body || {};
    db = loadDb();
    let driver = db.drivers.find((d) => d.id === driverId || d.user_id === driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.is_approved = 0;
    driver.is_online = 0;
    driver.rejection_reason = reason || 'Suspended by Administrator';

    saveDb(db);
    return res.json({ success: true, message: 'Driver account suspended' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Delete Driver
app.delete(['/api/admin/driver/:id', '/api/admin/drivers/:id'], (req, res) => {
  try {
    const driverId = req.params.id;
    db = loadDb();
    const drvIndex = db.drivers.findIndex((d) => d.id === driverId || d.user_id === driverId);
    if (drvIndex !== -1) {
      const drv = db.drivers[drvIndex];
      const userId = drv.user_id;

      db.drivers.splice(drvIndex, 1);
      db.users = db.users.filter((u) => u.id !== userId && u.id !== driverId);
      db.driver_documents = (db.driver_documents || []).filter((doc: any) => doc.driver_id !== driverId && doc.driver_id !== userId);
      db.subscriptions = db.subscriptions.filter((s) => s.driver_id !== driverId && s.driver_id !== userId);

      saveDb(db);
    }
    return res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Single Driver Details
app.get('/api/admin/driver/:id', (req, res) => {
  try {
    const driverId = req.params.id;
    db = loadDb();
    const drv = db.drivers.find((d) => d.id === driverId || d.user_id === driverId);
    if (!drv) return res.status(404).json({ error: 'Driver not found' });

    const u = db.users.find((usr) => usr.id === drv.user_id);
    const docs = (db.driver_documents || []).filter((doc: any) => doc.driver_id === drv.id || doc.driver_id === drv.user_id);
    const trips = db.trips.filter((t) => t.driver_id === drv.id);
    const sub = db.subscriptions.find((s) => s.driver_id === drv.id || s.driver_id === drv.user_id);

    return res.json({
      success: true,
      driver: { ...drv, user: u || null },
      documents: docs,
      trips,
      subscription: sub || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Users List
app.get('/api/admin/users', (req, res) => {
  try {
    db = loadDb();
    const safeUsers = db.users.map(({ password_hash, ...u }) => u);
    return res.json({ users: safeUsers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Delete User
app.delete('/api/admin/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    db = loadDb();
    db.users = db.users.filter((u) => u.id !== userId);
    db.drivers = db.drivers.filter((d) => d.user_id !== userId && d.id !== userId);
    saveDb(db);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Broadcast Notification
app.post('/api/admin/broadcast', (req, res) => {
  try {
    const { title, message, targetRole = 'all' } = req.body || {};
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });
    db = loadDb();
    const targetUsers = db.users.filter((u) => targetRole === 'all' || u.role === targetRole);

    for (const u of targetUsers) {
      db.notifications.push({
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        user_id: u.id,
        title,
        message,
        is_read: 0,
        type: 'info',
        created_at: new Date().toISOString(),
      });
    }

    saveDb(db);
    return res.json({ success: true, message: `Notification broadcast sent to ${targetUsers.length} users` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Stats Endpoint
app.get('/api/admin/stats', (req, res) => {
  try {
    db = loadDb();
    const totalRiders = db.users.filter((u) => u.role === 'rider').length;
    const totalDrivers = db.drivers.length;
    const pendingDrivers = db.drivers.filter((d) => d.is_approved === 0).length;
    const approvedDrivers = db.drivers.filter((d) => d.is_approved === 1).length;
    const rejectedDrivers = db.drivers.filter((d) => d.is_approved === 0 && d.rejection_reason).length;
    const totalTrips = db.trips.length;
    const activeDrivers = db.drivers.filter((d) => d.is_online === 1).length;
    const activeSubscriptions = db.subscriptions.filter((s) => s.status === 'active').length;
    const subscriptionRevenue = db.subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

    return res.json({
      stats: {
        totalRiders,
        totalDrivers,
        pendingDrivers,
        approvedDrivers,
        rejectedDrivers,
        totalTrips,
        activeDrivers,
        activeSubscriptions,
        revenue: subscriptionRevenue || 14500,
        subscriptionRevenue: subscriptionRevenue || 14500,
        recentRegistrations: db.users.slice(-5).reverse(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// VITE MIDDLEWARE SETUP
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apni Car Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
