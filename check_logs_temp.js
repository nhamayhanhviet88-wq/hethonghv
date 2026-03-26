const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://hvuser:hvpass123@localhost:5432/dongphuchv' });

(async () => {
    try {
        const em = await p.query(`SELECT e.id, e.customer_id, e.status, c.customer_name 
            FROM emergencies e JOIN customers c ON c.id = e.customer_id 
            ORDER BY e.id DESC LIMIT 5`);
        console.log('=== EMERGENCIES ===');
        console.log(JSON.stringify(em.rows, null, 2));

        for (const row of em.rows) {
            const logs = await p.query(`SELECT id, log_type, content, created_at FROM consultation_logs WHERE customer_id = $1 ORDER BY id DESC LIMIT 3`, [row.customer_id]);
            console.log(`\n=== LOGS for ${row.customer_name} (${row.customer_id}) ===`);
            console.log(JSON.stringify(logs.rows, null, 2));
        }
    } catch (e) {
        console.error(e.message);
    }
    await p.end();
})();
