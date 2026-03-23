require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = 5000;

// PostgreSQL connection from .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database: create table if not exists
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS nhanvien (
        nvid SERIAL PRIMARY KEY,
        ten VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `);
    console.log('✅ Table "nhanvien" ready.');
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
  } finally {
    client.release();
  }
}

// API: Get all nhanvien
app.get('/api/nhanvien', async (req, res) => {
  try {
    const result = await pool.query('SELECT nvid, ten, role FROM nhanvien ORDER BY nvid');
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Seed data
app.post('/api/seed', async (req, res) => {
  const client = await pool.connect();
  try {
    // Check if data exists
    const check = await client.query('SELECT COUNT(*) FROM nhanvien');
    if (parseInt(check.rows[0].count) > 0) {
      return res.json({ success: false, message: 'Dữ liệu đã tồn tại. Xóa trước khi seed lại.' });
    }

    const seedData = [
      { ten: 'Nguyễn Văn An',    role: 'Giám Đốc' },
      { ten: 'Trần Thị Bích',    role: 'Trưởng Phòng' },
      { ten: 'Lê Hoàng Cường',   role: 'Quản Lý' },
      { ten: 'Phạm Minh Đức',    role: 'Nhân Viên' },
      { ten: 'Hoàng Thị Ema',    role: 'Nhân Viên' },
      { ten: 'Võ Quốc Phong',    role: 'Nhân Viên' },
      { ten: 'Đặng Ngọc Giang',  role: 'Kế Toán' },
      { ten: 'Bùi Thanh Hải',    role: 'Nhân Viên' },
      { ten: 'Ngô Thị Yến Nhi',  role: 'Trưởng Phòng' },
      { ten: 'Lý Minh Khôi',     role: 'Nhân Viên' },
    ];

    for (const nv of seedData) {
      await client.query('INSERT INTO nhanvien (ten, role) VALUES ($1, $2)', [nv.ten, nv.role]);
    }

    res.json({ success: true, message: 'Đã seed 10 nhân viên thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// API: Reset (delete all)
app.delete('/api/nhanvien', async (req, res) => {
  try {
    await pool.query('DELETE FROM nhanvien');
    await pool.query('ALTER SEQUENCE nhanvien_nvid_seq RESTART WITH 1');
    res.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});
