require('dotenv').config();
const db = require('./db/pool');

async function run() {
    await db.init();
    const orders = await db.all("SELECT id, order_code FROM dht_orders WHERE order_code LIKE '%SVTS0010%'");
    console.log("Orders:", orders);

    if (orders.length > 0) {
        const oIds = orders.map(o => o.id);
        const items = await db.all(`
            SELECT doi.id, doi.dht_order_id, doi.product_name, doi.description, doi.is_no_cut, doi.is_no_sew, doi.production_steps,
                   p.name AS prod_db_name, p.cutting_category_id, cc.name AS cutting_category_name
            FROM dht_order_items doi
            LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(doi.product_name, doi.description)) AND p.is_active = true
            LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
            WHERE doi.dht_order_id = ANY($1)
        `, [oIds]);
        console.log("Items:", JSON.stringify(items, null, 2));
    }
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
