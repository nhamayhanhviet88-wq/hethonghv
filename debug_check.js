const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });

async function run() {
    try {
        // Check conversion records for customer vietkh2 (id=121)
        const conv = await pool.query("SELECT * FROM crm_conversion_requests WHERE customer_id = 121 ORDER BY created_at DESC");
        console.log('Conversion records for vietkh2 (customer 121):');
        conv.rows.forEach(r => console.log(JSON.stringify(r)));

        // Check for customer vietkh1 (id=120)
        const conv2 = await pool.query("SELECT * FROM crm_conversion_requests WHERE customer_id = 120 ORDER BY created_at DESC");
        console.log('\nConversion records for vietkh1 (customer 120):');
        conv2.rows.forEach(r => console.log(JSON.stringify(r)));
    } catch(e) { console.error(e.message); }
    pool.end();
}
run();
