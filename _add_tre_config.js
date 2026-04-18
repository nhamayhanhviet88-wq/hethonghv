const { Pool, types } = require('pg');
types.setTypeParser(1082, val => val);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
});

(async () => {
    try {
        const existing = await pool.query("SELECT key FROM global_penalty_config WHERE key = 'kh_chua_xu_ly_tre'");
        if (existing.rows.length > 0) {
            console.log('Already exists, skipping');
        } else {
            await pool.query(
                "INSERT INTO global_penalty_config (key, label, amount) VALUES ($1, $2, $3)",
                ['kh_chua_xu_ly_tre', 'KH Xử Lý Trễ — Không xử lý KH trễ', 100000]
            );
            console.log('Done: kh_chua_xu_ly_tre config added');
        }
        // Verify
        const all = await pool.query("SELECT key, amount FROM global_penalty_config WHERE key LIKE 'kh_%' ORDER BY key");
        console.log('Current KH configs:', all.rows);
    } catch(e) {
        console.log('Error:', e.message);
    }
    await pool.end();
})();
