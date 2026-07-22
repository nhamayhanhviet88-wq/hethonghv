require('dotenv').config();
const db = require('./db/pool');

async function testQuery() {
    await db.init();
    const items = await db.all(`
        SELECT doi.id, doi.product_name, cc.name AS cutting_category_name, doi.production_steps,
               (doi.is_no_cut = true OR (doi.production_steps IS NOT NULL AND NOT doi.production_steps @> '2'::jsonb) OR (doi.production_steps IS NULL AND (cc.name = 'HÀNG SẴN' OR UPPER(COALESCE(cc.name, '')) LIKE '%SẴN%'))) AS is_no_cut,
               (doi.is_no_sew = true OR (doi.production_steps IS NOT NULL AND NOT doi.production_steps @> '5'::jsonb) OR (doi.production_steps IS NULL AND (cc.name = 'HÀNG SẴN' OR UPPER(COALESCE(cc.name, '')) LIKE '%SẴN%'))) AS is_no_sew
        FROM dht_order_items doi
        LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(doi.product_name, doi.description)) AND p.is_active = true
        LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
        WHERE doi.dht_order_id = 147
        ORDER BY doi.id ASC
    `);
    console.log("Query Results:", items);
    process.exit(0);
}

testQuery().catch(e => { console.error(e); process.exit(1); });
