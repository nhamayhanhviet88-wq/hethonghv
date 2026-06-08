const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    
    await client.query('BEGIN');
    try {
        // 1. Update record 5
        await client.query(`
            UPDATE pressing_records 
            SET product_name = 'AFF-VTTI0015 — Phiếu 1 — ÁO CỔ BẺ',
                fabric_color = 'Bích Đậm, Be Đậm, Biển',
                material_name = 'COTTON LITE 100%',
                order_quantity = 305
            WHERE id = 5
        `);
        
        // 2. Delete records 6 and 7
        await client.query(`
            DELETE FROM pressing_records WHERE id IN (6, 7)
        `);
        
        await client.query('COMMIT');
        console.log('Successfully merged duplicate pressing records for AFF-VTTI0015.');
    } catch(e) {
        await client.query('ROLLBACK');
        console.error('Error merging records:', e);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
