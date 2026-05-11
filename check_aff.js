const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });

(async () => {
    // Find all customers with referrer that has been deleted
    const affected = await pool.query(`
        SELECT c.id, c.customer_name, c.referrer_id, u.full_name as referrer_name, u.status as referrer_status
        FROM customers c
        JOIN users u ON u.id = c.referrer_id
        WHERE u.status = 'deleted'
    `);
    
    console.log('=== Customers with deleted referrer ===');
    console.log(JSON.stringify(affected.rows, null, 2));
    console.log('Total:', affected.rows.length);

    if (affected.rows.length > 0) {
        const ids = affected.rows.map(r => r.id);
        const result = await pool.query(`UPDATE customers SET referrer_id = NULL WHERE id = ANY($1)`, [ids]);
        console.log('\n✅ Cleared referrer_id for', result.rowCount, 'customers');
    } else {
        console.log('\n✅ No cleanup needed');
    }

    await pool.end();
})();
