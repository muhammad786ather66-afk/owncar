-- Cloudflare D1 Database Schema: apnicar-db

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
    vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('Bike', 'Rickshaw', 'Mini', 'Go', 'Business')),
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
    current_lat REAL DEFAULT 31.5204,
    current_lng REAL DEFAULT 74.3587,
    rating REAL DEFAULT 5.0,
    total_rides INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK(plan_type IN ('daily', 'weekly', 'monthly')),
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'expired')),
    starts_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    payment_tx_ref TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    rider_id TEXT NOT NULL,
    driver_id TEXT,
    vehicle_type TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat REAL NOT NULL,
    pickup_lng REAL NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat REAL NOT NULL,
    dropoff_lng REAL NOT NULL,
    fare_amount INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    estimated_mins INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
    rider_rating REAL,
    driver_rating REAL,
    cancellation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY(rider_id) REFERENCES users(id),
    FOREIGN KEY(driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    type TEXT DEFAULT 'info',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    province TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    base_fare INTEGER DEFAULT 50,
    per_km_rate INTEGER DEFAULT 25
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_rider_id ON trips(rider_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_driver ON subscriptions(driver_id);

CREATE TABLE IF NOT EXISTS driver_documents (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_url TEXT,
    document_hash TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    verified_by TEXT,
    verified_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_driver_docs_driver_id ON driver_documents(driver_id);

-- Initial Cities Default Data
INSERT OR IGNORE INTO cities (id, name, province, is_active, base_fare, per_km_rate) VALUES
('city-lahore', 'Lahore', 'Punjab', 1, 50, 25),
('city-karachi', 'Karachi', 'Sindh', 1, 60, 28),
('city-islamabad', 'Islamabad', 'Federal', 1, 65, 30),
('city-rawalpindi', 'Rawalpindi', 'Punjab', 1, 55, 26),
('city-peshawar', 'Peshawar', 'KPK', 1, 50, 24),
('city-multan', 'Multan', 'Punjab', 1, 45, 22);
