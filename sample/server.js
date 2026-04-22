const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // フロントエンド送信用

const dbPath = path.join(__dirname, 'smartcycle.db');
const db = new sqlite3.Database(dbPath);

// --- 認証系API ---
// 新規登録
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  const name = email.split('@')[0];
  db.run('INSERT INTO User (name, email, password_hash) VALUES (?, ?, ?)', [name, email, password], function(err) {
    if (err) return res.status(400).json({ error: 'Already registered or invalid data' });
    res.json({ success: true, user: { id: this.lastID, email, name } });
  });
});

// ログイン
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM User WHERE email = ? AND password_hash = ?', [email, password], (err, row) => {
    if (err || !row) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ success: true, user: { id: row.id, email: row.email, name: row.name } });
  });
});

// 全駐輪場データの取得API
app.get('/api/parking_lots', (req, res) => {
  const query = `
    SELECT 
      p.id, p.name, p.latitude, p.longitude, p.total_spots, p.reservation_spots, p.price_per_hour,
      s.available_spots, s.is_full
    FROM ParkingLot p
    LEFT JOIN ParkingStatus s ON p.id = s.parking_lot_id
    WHERE s.id = (
      SELECT MAX(id) FROM ParkingStatus WHERE parking_lot_id = p.id
    )
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 予約用API (モック)
app.post('/api/reservations', (req, res) => {
  const { parking_lot_id, user_id, start_time, duration } = req.body;
  
  db.get('SELECT available_spots, price_per_hour FROM ParkingLot p LEFT JOIN ParkingStatus s ON p.id = s.parking_lot_id WHERE p.id = ? ORDER BY s.id DESC LIMIT 1', [parking_lot_id], (err, row) => {
    if (err || !row || row.available_spots <= 0) {
      return res.status(400).json({ error: 'Cannot reserve' });
    }
    
    const newAvailable = row.available_spots - 1;
    const isFull = newAvailable === 0 ? 1 : 0;
    
    // 料金計算 (durationは分)
    const amount_jpy = Math.ceil(duration / 60) * row.price_per_hour;
    // 終了予定日時
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    
    db.run(
      'INSERT INTO Reservation (user_id, parking_lot_id, start_time, end_time, status, amount_jpy) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, parking_lot_id, startDate.toISOString(), endDate.toISOString(), 'reserved', amount_jpy],
      function(errRes) {
        if (errRes) return res.status(500).json({ error: errRes.message });
        
        db.run(
          'INSERT INTO ParkingStatus (parking_lot_id, available_spots, is_full, device_status) VALUES (?, ?, ?, ?)',
          [parking_lot_id, newAvailable, isFull, 'online'],
          function(errStatus) {
            if (!errStatus) {
              io.emit('parking_update', { id: parking_lot_id, available_spots: newAvailable, is_full: isFull });
              res.json({ success: true, message: 'Reservation created' });
            } else {
              res.status(500).json({ error: errStatus.message });
            }
          }
        );
      }
    );
  });
});

// プロフィール更新API
app.post('/api/user/update', (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Missing data' });
  
  db.run('UPDATE User SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Profile updated' });
  });
});

// ユーザーの予約一覧取得API
app.get('/api/reservations', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  const query = `
    SELECT r.id, r.parking_lot_id, r.start_time, r.end_time, r.status, r.amount_jpy, p.name, p.price_per_hour
    FROM Reservation r
    JOIN ParkingLot p ON r.parking_lot_id = p.id
    WHERE r.user_id = ?
    ORDER BY r.start_time DESC
  `;
  db.all(query, [user_id], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

// 予約取り消しAPI
app.delete('/api/reservations/:id', (req, res) => {
  const reservationId = req.params.id;
  // 予約対象を取得
  db.get('SELECT parking_lot_id FROM Reservation WHERE id = ?', [reservationId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    
    const lotId = row.parking_lot_id;
    // UPDATEで予約ステータスを'cancelled'に変更（履歴表示のため）
    db.run('UPDATE Reservation SET status = "cancelled" WHERE id = ?', [reservationId], function(errDel) {
      if (errDel) return res.status(500).json({ error: errDel.message });
      
      // 空き枠を+1戻す
      db.get('SELECT available_spots FROM ParkingStatus WHERE parking_lot_id = ? ORDER BY id DESC LIMIT 1', [lotId], (errS, sRow) => {
        if (!errS && sRow) {
          const newAvail = sRow.available_spots + 1;
          db.run('INSERT INTO ParkingStatus (parking_lot_id, available_spots, is_full, device_status) VALUES (?, ?, 0, ?)', [lotId, newAvail, 'online'], function(errI) {
            if (!errI) {
              io.emit('parking_update', { id: lotId, available_spots: newAvail, is_full: 0 });
            }
          });
        }
        res.json({ success: true, message: 'Cancelled' });
      });
    });
  });
});

// デバッグ用データリセットAPI
app.post('/api/debug/reset', (req, res) => {
  db.serialize(() => {
    // 外部キー制約を一時的に気にする（もし設定されていれば）
    db.run('PRAGMA foreign_keys = ON');

    // 1. 全データを削除 (依存関係順)
    db.run('DELETE FROM Reservation', (err) => { if(err) console.error('Delete Res Err:', err); });
    db.run('DELETE FROM User', (err) => { if(err) console.error('Delete User Err:', err); });
    db.run('DELETE FROM ParkingStatus', (err) => { if(err) console.error('Delete Status Err:', err); });
    
    // 2. 在庫状況を各駐輪場の最大台数にリセット
    // db.serialize内なので、上記DELETEが終わってから実行される
    db.all('SELECT id, total_spots FROM ParkingLot', [], (err, lots) => {
      if (err) return res.status(500).json({ error: err.message });
      
      let processed = 0;
      if (lots.length === 0) return res.json({ success: true, message: 'No lots to reset' });

      lots.forEach(lot => {
        db.run(
          'INSERT INTO ParkingStatus (parking_lot_id, available_spots, is_full, device_status) VALUES (?, ?, 0, ?)',
          [lot.id, lot.total_spots, 'online'],
          (errI) => {
            processed++;
            if (!errI) {
              // リアルタイム通知
              io.emit('parking_update', { id: lot.id, available_spots: lot.total_spots, is_full: 0 });
            }
            if (processed === lots.length) {
              console.log('System reset completed successfully');
              res.json({ success: true, message: 'All data reset successfully including users' });
            }
          }
        );
      });
    });
  });
});

// WebSocketによる接続処理
io.on('connection', (socket) => {
  console.log('A client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// シミュレーター（IoTセンサーからのデータ着信を模倣）
// ※ 今回は機能テスト（在庫管理の正確な動作）に集中するため、ランダム変動は機能を停止しています。
/*
setInterval(() => {
  db.all('SELECT id, total_spots FROM ParkingLot', [], (err, lots) => {
    if (err || lots.length === 0) return;
    
    const lot = lots[Math.floor(Math.random() * lots.length)]; // ロットを一つランダム選択
    
    db.get('SELECT available_spots FROM ParkingStatus WHERE parking_lot_id = ? ORDER BY id DESC LIMIT 1', [lot.id], (err, status) => {
      if (err || !status) return;

      // -1, 0, +1 の変動を生成
      let change = Math.floor(Math.random() * 3) - 1; 
      let newAvailable = status.available_spots + change;
      
      // 0〜total の範囲に収める
      if (newAvailable < 0) newAvailable = 0;
      if (newAvailable > lot.total_spots) newAvailable = lot.total_spots;
      
      if (newAvailable !== status.available_spots) {
        const isFull = newAvailable === 0 ? 1 : 0;
        db.run(
          'INSERT INTO ParkingStatus (parking_lot_id, available_spots, is_full, device_status) VALUES (?, ?, ?, ?)',
          [lot.id, newAvailable, isFull, 'online'],
          (err) => {
            if (!err) {
              console.log(`Update lot ${lot.id}: available=${newAvailable}, full=${isFull}`);
              // 全クライアントに変更を送信
              io.emit('parking_update', {
                id: lot.id,
                available_spots: newAvailable,
                is_full: isFull
              });
            }
          }
        );
      }
    });
  });
}, 5000);
*/

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
