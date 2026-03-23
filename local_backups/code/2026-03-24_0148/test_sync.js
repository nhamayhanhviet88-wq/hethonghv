require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
});

(async () => {
    try {
        // Check customer id=1
        const c = await pool.query('SELECT id, customer_name, phone, address, province FROM customers WHERE id = 1');
        console.log('Customer id=1:', JSON.stringify(c.rows[0], null, 2));
    } catch (e) {
        console.error('ERR:', e.message);
    } finally {
        await pool.end();
    }
})();
