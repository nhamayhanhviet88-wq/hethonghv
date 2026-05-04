require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    const c = await pool.connect();
    const r = await c.query('SELECT DISTINCT role FROM users ORDER BY role');
    console.log('ROLES:', r.rows.map(x => x.role));
    const gd = await c.query("SELECT id, username, full_name, role FROM users WHERE role IN ('giam_doc','admin','director') LIMIT 5");
    console.log('DIRECTORS:', gd.rows);
    c.release();
    pool.end();
})();
