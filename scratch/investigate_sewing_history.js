require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        console.log('--- Sewing history for records 20, 21, 22, 23 ---');
        const res = await pool.query(`
            SELECT * FROM sewing_history 
            WHERE sewing_id IN (20, 21, 22, 23)
            ORDER BY sewing_id ASC, performed_at ASC
        `);
        res.rows.forEach(h => {
            console.log(`Sewing ID: ${h.sewing_id} | Action: ${h.action} | Details: ${h.details} | At: ${h.performed_at}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
