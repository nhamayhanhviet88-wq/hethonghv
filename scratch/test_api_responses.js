require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
    try {
        console.log('--- TEST PRINTING RECORD SQL ---');
        // Let's run a query resembling the UNION query of routes/bophanin.js
        const printQuery = `
            SELECT 
                pr.id,
                pr.order_item_id,
                pr.product_name,
                (SELECT product_name FROM cutting_records WHERE order_item_id = pr.order_item_id ORDER BY CASE WHEN product_name LIKE '%P1%' THEN 0 ELSE 1 END, id ASC LIMIT 1) AS cut_product_name
            FROM printing_records pr
            WHERE pr.dht_order_id = 8
        `;
        const printRes = await pool.query(printQuery);
        console.log('Printing Records (Backend Raw):', printRes.rows);
        console.log('Printing Records (Formatted):', printRes.rows.map(r => r.cut_product_name || r.product_name));

        console.log('\n--- TEST PRESSING RECORD SQL ---');
        // Let's run a query resembling the query of routes/bophanep.js
        const pressQuery = `
            SELECT 
                pr.id,
                pr.order_item_id,
                pr.product_name,
                (SELECT product_name FROM cutting_records WHERE order_item_id = pr.order_item_id ORDER BY CASE WHEN product_name LIKE '%P1%' THEN 0 ELSE 1 END, id ASC LIMIT 1) AS cut_product_name
            FROM pressing_records pr
            WHERE pr.dht_order_id = 8
        `;
        const pressRes = await pool.query(pressQuery);
        console.log('Pressing Records (Backend Raw):', pressRes.rows);
        console.log('Pressing Records (Formatted):', pressRes.rows.map(r => r.cut_product_name || r.product_name));

        console.log('\n--- TEST UNASSIGNED PRESSING ITEMS (bophanep.js) ---');
        const unassignedQuery = `
            SELECT 
                doi.id, 
                doi.description, 
                (SELECT product_name FROM cutting_records WHERE order_item_id = doi.id ORDER BY CASE WHEN product_name LIKE '%P1%' THEN 0 ELSE 1 END, id ASC LIMIT 1) AS cut_product_name
            FROM dht_order_items doi
            WHERE doi.dht_order_id = 8
        `;
        const unassignedRes = await pool.query(unassignedQuery);
        console.log('Unassigned Pressing items:', unassignedRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

test();
