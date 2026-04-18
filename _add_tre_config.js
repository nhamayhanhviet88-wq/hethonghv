const { Pool, types } = require('pg');
types.setTypeParser(1082, val => val);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
});
(async () => {
    await pool.query("DELETE FROM global_penalty_config WHERE key = 'kh_chua_xu_ly_hom_nay_ctv'");
    const r = await pool.query("SELECT key, amount FROM global_penalty_config WHERE key LIKE 'kh_%' ORDER BY key");
    console.log('Remaining KH configs:', r.rows);
    await pool.end();
})();
