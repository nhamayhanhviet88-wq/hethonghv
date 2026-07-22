require('dotenv').config();
const db = require('./db/pool');

async function testOrdersApi() {
    await db.init();
    
    // Exact SQL from /api/qlx/orders
    const orders = await db.all(`
        SELECT o.id, o.order_code, o.order_date, o.customer_name, o.customer_phone,
            o.total_quantity, o.expected_ship_date, o.shipping_priority,
            o.category_id, c.name AS category_name,
            COALESCE(o.is_no_cut, false) AS is_no_cut,
            COALESCE(o.sx_print_confirmed, false) AS sx_print_confirmed,
            COALESCE(o.is_draft, false) AS is_draft,
            o.is_locked, o.locked_by, o.locked_at
        FROM dht_orders o
        LEFT JOIN dht_categories c ON o.category_id = c.id
        WHERE o.order_code LIKE '%SVTS0010%'
    `);

    const orderIds = orders.map(o => o.id);
    const items = await db.all(`
        SELECT doi.dht_order_id, doi.id, doi.product_name, doi.description, doi.material_pairs, doi.quantity,
               doi.material_name, doi.color_name, COALESCE(doi.production_cancelled, false) AS production_cancelled,
               (doi.is_no_sew = true OR (doi.production_steps IS NOT NULL AND NOT doi.production_steps @> '5'::jsonb) OR (doi.production_steps IS NULL AND (cc.name = 'HÀNG SẴN' OR UPPER(COALESCE(cc.name, '')) LIKE '%SẴN%'))) AS is_no_sew,
               (doi.is_no_cut = true OR (doi.production_steps IS NOT NULL AND NOT doi.production_steps @> '2'::jsonb) OR (doi.production_steps IS NULL AND (cc.name = 'HÀNG SẴN' OR UPPER(COALESCE(cc.name, '')) LIKE '%SẴN%'))) AS is_no_cut,
               (doi.production_steps IS NOT NULL AND NOT doi.production_steps @> '3'::jsonb AND NOT doi.production_steps @> '4'::jsonb) AS is_no_print,
               cc.name AS cutting_category_name
        FROM dht_order_items doi
        LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(doi.product_name, doi.description)) AND p.is_active = true
        LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
        WHERE doi.dht_order_id = ANY($1)
        ORDER BY doi.dht_order_id, doi.id
    `, [orderIds]);

    const itemMap = {};
    for (const it of items) {
        if (!itemMap[it.dht_order_id]) itemMap[it.dht_order_id] = [];
        itemMap[it.dht_order_id].push(it);
    }
    for (const o of orders) {
        o.items = itemMap[o.id] || [];
    }

    console.log("Returned Orders JSON:", JSON.stringify(orders, null, 2));
    process.exit(0);
}

testOrdersApi().catch(e => { console.error(e); process.exit(1); });
