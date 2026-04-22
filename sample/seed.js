const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'smartcycle.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// 既存のDBファイルを削除（リセットのため）
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Existing database removed.');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
});

const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Error executing schema', err.message);
        process.exit(1);
    }
    console.log('Schema executed successfully.');

    // モックデータの初期化
    const insertParkingLot = db.prepare(`
        INSERT INTO ParkingLot (name, latitude, longitude, total_spots, reservation_spots, price_per_hour, sensor_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // 大阪・梅田近辺のダミー・データ
    const lots = [
        { name: 'グランフロント大阪 南館 駐輪場', lat: 34.704021, lng: 135.494715, total: 100, res: 10, price: 150, sensor: 'camera' },
        { name: 'ヨドバシ梅田タワー 駐輪場', lat: 34.706173, lng: 135.496225, total: 150, res: 20, price: 200, sensor: 'lock' },
        { name: '大阪ステーションシティ 駐輪場', lat: 34.702200, lng: 135.495500, total: 200, res: 30, price: 150, sensor: 'camera' },
        { name: '梅田スカイビル 駐輪場', lat: 34.705300, lng: 135.489600, total: 80, res: 5, price: 100, sensor: 'lock' }
    ];

    db.serialize(() => {
        let completed = 0;
        lots.forEach((lot) => {
            insertParkingLot.run(lot.name, lot.lat, lot.lng, lot.total, lot.res, lot.price, lot.sensor, function(err) {
                if (err) {
                    console.error('Failed to insert parking lot', err);
                } else {
                    const lotId = this.lastID;
                    const available = Math.floor(Math.random() * (lot.total / 2));
                    const isFull = available === 0 ? 1 : 0;
                    db.run(`
                        INSERT INTO ParkingStatus (parking_lot_id, available_spots, is_full, device_status)
                        VALUES (?, ?, ?, 'online')
                    `, [lotId, available, isFull], (err2) => {
                        completed++;
                        if (completed === lots.length) {
                            insertParkingLot.finalize();
                            console.log('Mock data inserted successfully.');
                        }
                    });
                }
            });
        });
    });
});
