require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='affiliate_transfer_logs'");
    console.log('Columns:', cols.rows.map(c => c.column_name));
    const r = await pool.query('SELECT * FROM affiliate_transfer_logs LIMIT 20');
    console.log(JSON.stringify(r.rows, null, 2));
    await pool.end();
})();
