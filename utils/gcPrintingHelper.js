const db = require('../db/pool');
const { vnNow } = require('./timezone');

async function autoCreateGcPrintingRecords() {
    try {
        // Get the configured default printer for GC orders
        const configRow = await db.get("SELECT value FROM app_config WHERE key = 'default_gc_printer_id'");
        let defaultPrinterId = 68; // fallback to nhanvienin
        if (configRow && configRow.value) {
            const parsed = parseInt(configRow.value, 10);
            if (!isNaN(parsed)) {
                // Verify if the user exists and is active
                const userExists = await db.get("SELECT id FROM users WHERE id = $1 AND status = 'active'", [parsed]);
                if (userExists) {
                    defaultPrinterId = parsed;
                }
            }
        }

        // Get the printer's details to write history
        const printer = await db.get("SELECT full_name FROM users WHERE id = $1", [defaultPrinterId]);
        const printerName = printer ? printer.full_name : 'nhanvienin';

        // Find GC orders that:
        // 1. Are GC (category_id in (8, 9) and parent_order_id IS NULL)
        //    OR (parent_order_id IS NOT NULL and (order_code like %GCPET% or %GCTEM%))
        // 2. Do NOT have an active (non-discarded) printing_records row
        // 3. Have at least one non-cancelled item in dht_order_items
        const gcOrders = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.total_quantity, o.cskh_user_id,
                   o.category_id, o.expected_ship_date, u.full_name AS cskh_name
            FROM dht_orders o
            LEFT JOIN users u ON o.cskh_user_id = u.id
            WHERE (
                (o.category_id IN (8, 9) AND o.parent_order_id IS NULL)
                OR (o.parent_order_id IS NOT NULL AND (o.order_code LIKE '%GCPET%' OR o.order_code LIKE '%GCTEM%'))
              )
              AND NOT EXISTS (
                  SELECT 1 FROM printing_records pr 
                  WHERE pr.dht_order_id = o.id AND COALESCE(pr.is_discarded, false) = false
              )
              AND EXISTS (
                  SELECT 1 FROM dht_order_items WHERE dht_order_id = o.id AND COALESCE(production_cancelled, false) = false
              )
        `);

        if (gcOrders.length === 0) return;

        const now = vnNow(); // Date object
        const nowStr = now.toISOString();

        for (const order of gcOrders) {
            // Get the non-cancelled items to build the display product name
            const items = await db.all(`
                SELECT description, quantity 
                FROM dht_order_items 
                WHERE dht_order_id = $1 AND COALESCE(production_cancelled, false) = false
            `, [order.id]);

            const isPet = order.category_id === 8 || (order.order_code && order.order_code.includes('GCPET'));
            const fieldName = isPet ? 'IN PET' : 'IN TEM';

            let prodName = '';
            if (order.category_id === 8 || order.category_id === 9 || (order.order_code && (order.order_code.includes('GCPET') || order.order_code.includes('GCTEM')))) {
                const filteredItems = items.filter(item => {
                    const desc = (item.description || '').toLowerCase().trim();
                    return !desc.includes('thiết kế') && !desc.includes('thiet ke') && desc !== 'tk';
                });
                prodName = filteredItems.map(item => {
                    let desc = (item.description || '').trim();
                    if (/tờ|to/i.test(desc)) desc = 'Tờ';
                    else if (/mét|met/i.test(desc)) desc = 'Mét';
                    return `${item.quantity || 0} ${desc}`;
                }).join('; ') || '—';
            } else {
                prodName = items.map(i => `${i.description} (SL: ${i.quantity})`).join('; ') || '—';
            }

            const orderQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

            // Insert into printing_records
            const r = await db.get(`
                INSERT INTO printing_records (
                    dht_order_id, print_date, printer_id, product_name, cskh_name, 
                    order_quantity, print_field, created_by, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id`,
                [order.id, order.order_date, defaultPrinterId, prodName, order.cskh_name || '—', orderQty, fieldName, defaultPrinterId, nowStr]
            );

            // Insert history
            await db.run(`
                INSERT INTO printing_history (printing_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, $3, $4, $5)`,
                [r.id, 'create', `Tự động phân công mặc định cho ${printerName}`, defaultPrinterId, nowStr]
            );
        }
    } catch (e) {
        console.error('❌ Error in autoCreateGcPrintingRecords:', e.stack || e.message);
    }
}

module.exports = { autoCreateGcPrintingRecords };
