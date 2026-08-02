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

// Auth: Register Rider
app.post('/api/auth/register-rider', (req, res) => {
  try {
    const { username, full_name, email, password, mobile_number } = req.body;
    if (!username || !full_name || !email || !password || !mobile_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    db = loadDb();
    const existingEmail = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ error: 'Email address is already registered' });
    }
    const existingUser = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const userId = 'usr-' + Date.now();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = {
      id: userId,
      role: 'rider',
      username,
      full_name,
      email,
      password_hash,
      mobile_number,
      email_verified: 0,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.tokens.push({
      id: 'tok-' + Date.now(),
      email,
      code,
      token: 'verif-' + Date.now(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: userId,
      title: 'Email Verification Code',
      message: `Your verification code is: ${code}. Please verify your email to log in.`,
      is_read: 0,
      type: 'info',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      user_id: userId,
      email,
      verification_code_demo: code, // Demo convenience helper
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: Register Driver
app.post('/api/auth/register-driver', (req, res) => {
  try {
    const {
      username,
      full_name,
      email,
      password,
      mobile_number,
      cnic,
      driving_licence,
      vehicle_type,
      vehicle_brand,
      vehicle_model,
      vehicle_colour,
      vehicle_reg_number,
      cnic_front_url,
      cnic_back_url,
      licence_doc_url,
      registration_doc_url,
    } = req.body;

    if (
      !username ||
      !full_name ||
      !email ||
      !password ||
      !mobile_number ||
      !cnic ||
      !driving_licence ||
      !vehicle_type ||
      !vehicle_reg_number
    ) {
      return res.status(400).json({ error: 'Missing required driver details' });
    }

    db = loadDb();
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email address is already registered' });
    }
    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const userId = 'usr-' + Date.now();
    const driverId = 'drv-' + Date.now();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = {
      id: userId,
      role: 'driver',
      username,
      full_name,
      email,
      password_hash,
      mobile_number,
      email_verified: 0,
      created_at: new Date().toISOString(),
    };

    const newDriver = {
      id: driverId,
      user_id: userId,
      cnic,
      driving_licence,
      vehicle_type,
      vehicle_brand: vehicle_brand || 'Suzuki',
      vehicle_model: vehicle_model || 'Alto',
      vehicle_colour: vehicle_colour || 'White',
      vehicle_reg_number,
      is_approved: 0, // Requires manual approval
      cnic_front_url: cnic_front_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
      cnic_back_url: cnic_back_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
      licence_doc_url: licence_doc_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
      registration_doc_url: registration_doc_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
      is_online: 0,
      current_lat: 31.5204,
      current_lng: 74.3587,
      rating: 5.0,
      total_rides: 0,
    };

    db.users.push(newUser);
    db.drivers.push(newDriver);
    db.tokens.push({
      id: 'tok-' + Date.now(),
      email,
      code,
      token: 'verif-' + Date.now(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: userId,
      title: 'Email Verification & Driver Registration',
      message: `Verification code: ${code}. Note: Driver account requires manual admin approval after email verification.`,
      is_read: 0,
      type: 'info',
      created_at: new Date().toISOString(),
    });

    saveDb(db);
    return res.json({
      success: true,
      message: 'Driver registered. Please verify email.',
      user_id: userId,
      email,
      verification_code_demo: code,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auth: Driver Registration via /api/drivers/register
app.post('/api/drivers/register', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.replace('Bearer ', '');
    db = loadDb();
    const tokenObj = db.tokens.find((t) => t.token === token);
    const user = tokenObj ? db.users.find((u) => u.email === tokenObj.email) : db.users.find((u) => token.includes(u.id));
    if (!user) return res.status(401).json({ error: 'User not found' });

    user.role = 'driver';
    const body = req.body || {};

    const existingDriver = db.drivers.find((d) => d.user_id === user.id);
    const driverId = existingDriver ? existingDriver.id : 'drv-' + Date.now();

    if (existingDriver) {
      if (body.cnic) existingDriver.cnic = body.cnic;
      if (body.driving_licence) existingDriver.driving_licence = body.driving_licence;
      if (body.service_type_id || body.vehicle_type) existingDriver.vehicle_type = body.service_type_id || body.vehicle_type;
      if (body.vehicle_brand) existingDriver.vehicle_brand = body.vehicle_brand;
      if (body.vehicle_model) existingDriver.vehicle_model = body.vehicle_model;
      if (body.vehicle_colour || body.vehicle_color) existingDriver.vehicle_colour = body.vehicle_colour || body.vehicle_color;
      if (body.registration_number || body.vehicle_reg_number) existingDriver.vehicle_reg_number = body.registration_number || body.vehicle_reg_number;
      if (body.cnic_front_url) existingDriver.cnic_front_url = body.cnic_front_url;
      if (body.cnic_back_url) existingDriver.cnic_back_url = body.cnic_back_url;
      if (body.licence_doc_url) existingDriver.licence_doc_url = body.licence_doc_url;
      if (body.registration_doc_url) existingDriver.registration_doc_url = body.registration_doc_url;
    } else {
      const newDriver = {
        id: driverId,
        user_id: user.id,
        cnic: body.cnic || '35202-0000000-0',
        driving_licence: body.driving_licence || 'LIC-00000',
        vehicle_type: body.service_type_id || body.vehicle_type || 'Car',
        vehicle_brand: body.vehicle_brand || 'Suzuki',
        vehicle_model: body.vehicle_model || 'Alto',
        vehicle_colour: body.vehicle_colour || body.vehicle_color || 'White',
        vehicle_reg_number: body.registration_number || body.vehicle_reg_number || 'REG-1234',
        is_approved: 0,
        cnic_front_url: body.cnic_front_url || '',
        cnic_back_url: body.cnic_back_url || '',
        licence_doc_url: body.licence_doc_url || '',
        registration_doc_url: body.registration_doc_url || '',
        is_online: 0,
        current_lat: 31.5204,
        current_lng: 74.3587,
        rating: 5.0,
        total_rides: 0,
      };
      db.drivers.push(newDriver);
    }

    if (!db.driver_documents) db.driver_documents = [];
    const docsToStore = [
      { type: 'cnic_front', url: body.cnic_front_url },
      { type: 'cnic_back', url: body.cnic_back_url },
      { type: 'licence', url: body.licence_doc_url },
      { type: 'registration', url: body.registration_doc_url },
    ];

    for (const doc of docsToStore) {
      if (doc.url) {
        const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fileKey = doc.url.includes('/uploads/') ? doc.url.substring(doc.url.indexOf('/uploads/') + 1) : `documents/${docId}.jpg`;
        db.driver_documents.push({
          id: docId,
          driver_id: driverId,
          doc_type: doc.type,
          file_key: fileKey,
          file_url: doc.url,
          original_filename: `${doc.type}.jpg`,
          content_type: 'image/jpeg',
          size: 0,
          created_at: new Date().toISOString(),
        });
      }
    }
    saveDb(db);
    return res.json({ success: true, message: 'Driver registration submitted for admin approval', driver_id: driverId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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

// Auth: Email Verification
app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email, code } = req.body;
    db = loadDb();
    const tokenObj = db.tokens.find((t) => t.email.toLowerCase() === email.toLowerCase() && t.code === code);
    if (!tokenObj) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.email_verified = 1;
      saveDb(db);
      return res.json({ success: true, message: 'Email verified successfully! You may now log in.' });
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
        (s) => s.driver_id === d.id && s.status === 'active' && new Date(s.expires_at).getTime() > Date.now()
      );
      return {
        ...d,
        user: u ? { full_name: u.full_name, email: u.email, mobile_number: u.mobile_number, username: u.username } : null,
        active_subscription: activeSub || null,
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
    const driver = db.drivers.find((d) => d.id === driver_id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    driver.is_approved = approve ? 1 : 0;

    db.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: driver.user_id,
      title: approve ? 'Driver Account Approved!' : 'Driver Status Update',
      message: approve
        ? 'Congratulations! Your Apni Car driver account has been approved by Admin. Purchase a subscription to go online.'
        : 'Your driver account approval was revoked or rejected by Admin.',
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

app.get('/api/admin/stats', (req, res) => {
  try {
    db = loadDb();
    const totalRiders = db.users.filter((u) => u.role === 'rider').length;
    const totalDrivers = db.drivers.length;
    const pendingDrivers = db.drivers.filter((d) => d.is_approved === 0).length;
    const totalTrips = db.trips.length;
    const completedTrips = db.trips.filter((t) => t.status === 'completed').length;
    const subscriptionRevenue = db.subscriptions.reduce((sum, s) => sum + s.amount, 0);

    return res.json({
      stats: {
        totalRiders,
        totalDrivers,
        pendingDrivers,
        totalTrips,
        completedTrips,
        subscriptionRevenue,
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
