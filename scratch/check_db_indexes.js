const dotenv = require('dotenv');
dotenv.config();
const db = require('../db/pool');

async function runIndexCheck() {
    try {
        await db.init();
        
        console.log('--- INDEXES ON KEY TABLES ---');
        
        const tables = ['sewing_records', 'cutting_records', 'dht_orders', 'dht_order_items', 'sewing_history', 'dht_products', 'tsam_samples'];
        
        for (let table of tables) {
            console.log(`\nTable: ${table}`);
            const query = `
                SELECT
                    i.relname AS index_name,
                    a.attname AS column_name,
                    ix.indisunique AS is_unique
                FROM
                    pg_class t,
                    pg_class i,
                    pg_index ix,
                    pg_attribute a
                WHERE
                    t.oid = ix.indrelid
                    AND i.oid = ix.indexrelid
                    AND a.attrelid = t.oid
                    AND a.attnum = ANY(ix.indkey)
                    AND t.relname = $1
                ORDER BY
                    i.relname;
            `;
            const indexes = await db.all(query, [table]);
            if (indexes.length === 0) {
                console.log('  No indexes found.');
            } else {
                indexes.forEach(idx => {
                    console.log(`  - ${idx.index_name} (column: ${idx.column_name}, unique: ${idx.is_unique})`);
                });
            }
        }
        
    } catch (err) {
        console.error('Error during index check:', err);
    } finally {
        await db.close();
    }
}

runIndexCheck();
