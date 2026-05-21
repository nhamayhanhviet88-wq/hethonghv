const { Pool } = require('pg');
require('dotenv').config();

async function fix() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        // Clear total_order_codes for deposits that already have order_tt_coc
        const result = await pool.query(`
            UPDATE payment_records SET total_order_codes = NULL
            WHERE payment_type = 'dat_coc'
              AND total_order_codes IS NOT NULL
              AND total_order_codes != ''
              AND order_tt_coc IS NOT NULL
              AND order_tt_coc != ''
        `);
        console.log('Cleared total_order_codes from deposit records:', result.rowCount);

        // Verify
        const rows = await pool.query(`
            SELECT id, payment_code, order_tt_coc, total_order_codes, payment_type
            FROM payment_records
            WHERE payment_type = 'dat_coc'
            ORDER BY id DESC
        `);
        console.table(rows.rows);
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
fix();
