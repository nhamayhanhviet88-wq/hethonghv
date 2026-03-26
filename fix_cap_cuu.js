const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    max: 2,
});

(async () => {
    try {
        const emRes = await pool.query('SELECT e.id, e.customer_id, e.status, e.reason, c.customer_name FROM emergencies e JOIN customers c ON c.id = e.customer_id ORDER BY e.id DESC LIMIT 5');
        console.log('=== RECENT EMERGENCIES ===');
        for (const row of emRes.rows) {
            console.log(`#${row.id}: "${row.customer_name}" (ID ${row.customer_id}), status: ${row.status}`);
            
            const logRes = await pool.query("SELECT id, log_type FROM consultation_logs WHERE customer_id = $1 AND log_type = 'cap_cuu_sep'", [row.customer_id]);
            if (logRes.rows.length === 0) {
                console.log(`   -> Missing cap_cuu_sep log! Inserting...`);
                await pool.query("INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES ($1, 'cap_cuu_sep', $2, $3)",
                    [row.customer_id, `🚨 Cấp cứu sếp: ${row.reason || ''}`, 1]);
                console.log(`   -> Done!`);
            } else {
                console.log(`   -> Already has cap_cuu_sep log`);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
    await pool.end();
})();
