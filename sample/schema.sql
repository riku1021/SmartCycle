-- SQLite用のデータベーススキーマ
-- 駐輪場マスタ
CREATE TABLE IF NOT EXISTS ParkingLot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    total_spots INTEGER NOT NULL,
    reservation_spots INTEGER NOT NULL,
    price_per_hour INTEGER NOT NULL,
    sensor_type TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- リアルタイム状況
CREATE TABLE IF NOT EXISTS ParkingStatus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parking_lot_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    available_spots INTEGER NOT NULL,
    is_full BOOLEAN NOT NULL DEFAULT 0,
    device_status TEXT NOT NULL,
    FOREIGN KEY(parking_lot_id) REFERENCES ParkingLot(id)
);

-- ユーザー
CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    attribute_age TEXT,
    attribute_gender TEXT
);

-- 予約
CREATE TABLE IF NOT EXISTS Reservation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    parking_lot_id INTEGER NOT NULL,
    spot_number INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    actual_entry_time DATETIME,
    actual_exit_time DATETIME,
    status TEXT NOT NULL, -- 'reserved', 'active', 'completed', 'cancelled'
    amount_jpy INTEGER,
    FOREIGN KEY(user_id) REFERENCES User(id),
    FOREIGN KEY(parking_lot_id) REFERENCES ParkingLot(id)
);

-- 統計集計
CREATE TABLE IF NOT EXISTS Statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parking_lot_id INTEGER NOT NULL,
    target_date DATE NOT NULL,
    time_slot INTEGER NOT NULL, -- e.g., 0-23
    avg_occupancy_rate REAL NOT NULL,
    max_full_duration_mins INTEGER,
    FOREIGN KEY(parking_lot_id) REFERENCES ParkingLot(id)
);
