const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });

async function run() {
    try {
        // Check column type
        const colType = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'order_codes' AND column_name = 'created_at'
        `);
        console.log('order_codes.created_at type:', JSON.stringify(colType.rows[0]));

        const userColType = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'created_at'
        `);
        console.log('users.created_at type:', JSON.stringify(userColType.rows[0]));

        // Raw values
        const raw = await pool.query("SELECT created_at, created_at AT TIME ZONE 'UTC' as utc FROM order_codes WHERE customer_id = 120 ORDER BY created_at");
        console.log('\nRaw order_codes.created_at for customer 120:');
        raw.rows.forEach(r => console.log(`  local: ${r.created_at} | utc: ${r.utc}`));

        const userRaw = await pool.query("SELECT created_at, created_at AT TIME ZONE 'UTC' as utc FROM users WHERE id = 41");
        console.log('\nRaw users.created_at for vietkh1:', userRaw.rows[0]);
    } catch(e) {
        console.error(e);
    }
    pool.end();
}
run();
