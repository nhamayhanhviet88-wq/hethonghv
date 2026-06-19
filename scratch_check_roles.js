require('dotenv').config();
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    });
    try {
        const res = await pool.query("SELECT username, role, full_name FROM users WHERE username IN ('quanlyxuong', 'qlx_test') OR full_name LIKE '%Thực%'");
        console.log('Users role info:', res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
main();
