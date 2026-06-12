const db = require('./db/pool');
const { vnNow, vnDateStr } = require('./utils/timezone');

function _processOrder(o, todayStr) {
    const code = (o.order_code || '').toUpperCase();
    const catName = (o.category_name || '').toUpperCase();
    const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');
    const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;

    let requiredStepIds = null;
    if (o.required_steps) {
        requiredStepIds = new Set(o.required_steps.split(',').map(Number));
    }

    if (!requiredStepIds) {
        if (isPetTem) {
            requiredStepIds = new Set([3]); // Only IN (3) is required
        } else {
            requiredStepIds = new Set([1, 2, 3, 4, 5, 6, 7]); // Default all steps
        }
    }

    const needsCut = requiredStepIds.has(2);
    const needsPrint = requiredStepIds.has(3);
    const needsPress = requiredStepIds.has(4);
    const needsSew = requiredStepIds.has(5);
    const needsFinishing = requiredStepIds.has(6) || requiredStepIds.has(7);

    const cutDone = !needsCut || o.cut_done;
    const printDone = !needsPrint || o.print_done;
    const pressDone = !needsPress || o.press_done;
    const sewDone = !needsSew || o.sew_done;
    const finishDone = !needsFinishing || o.finish_done;

    let currentStepName = 'Hoàn thành';
    if (!cutDone) currentStepName = 'Chờ Cắt';
    else if (!printDone) currentStepName = 'Chờ In';
    else if (!pressDone) currentStepName = 'Chờ Ép';
    else if (!finishDone) currentStepName = 'Đang May / QC / HT';
    else if (!isShipped) currentStepName = 'Chờ Gửi';

    return {
        order_code: o.order_code,
        currentStepName,
        shipping_status: o.shipping_status,
        shipped_at: o.shipped_at,
        isShipped,
        cutDone
    };
}

async function test() {
    try {
        await db.init();
        const todayStr = vnDateStr(vnNow());
        
        // List query of all orders for user 52
        const rows = await db.all(`
            SELECT o.id, o.order_code, o.expected_ship_date, o.rescheduled_ship_date,
                o.shipping_status, o.customer_name, o.customer_phone, o.province,
                o.shipped_at, o.tracking_code, o.total_amount,
                o.parent_order_id, o.shipping_priority,
                c.name AS category_name,
                req.required_steps,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = o.id AND is_cut_done = false)
                        ELSE false
                    END,
                    false
                ) AS cut_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = o.id AND is_print_done = false AND contractor_id IS NULL)
                        ELSE (SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 3 LIMIT 1)
                    END,
                    false
                ) AS print_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = o.id AND is_reported = false)
                        ELSE (SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 4 LIMIT 1)
                    END,
                    false
                ) AS press_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id AND done_date IS NULL)
                        ELSE false
                    END,
                    false
                ) AS sew_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM finishing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM finishing_records WHERE dht_order_id = o.id AND is_completed = false)
                        ELSE (
                            CASE 
                                WHEN EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id)
                                THEN NOT EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id AND done_date IS NULL)
                                ELSE false
                            END
                        )
                    END,
                    false
                ) AS finish_done
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN (
                SELECT oi.dht_order_id, string_agg(pp.step_id::text, ',') AS required_steps
                FROM dht_order_items oi
                JOIN dht_products p ON (p.name = oi.product_name OR p.name = TRIM(oi.description) OR oi.product_name LIKE '%' || p.name)
                JOIN dht_product_process pp ON pp.product_id = p.id
                WHERE pp.is_active = true
                GROUP BY oi.dht_order_id
            ) req ON o.id = req.dht_order_id
            WHERE o.expected_ship_date IS NOT NULL
              AND (o.created_by = $1 OR o.cskh_user_id = $1)
        `, [52]);

        const processed = rows.map(r => _processOrder(r, todayStr));
        const cho_cat_orders = processed.filter(o => o.currentStepName === 'Chờ Cắt');
        console.log('Total orders computed as "Chờ Cắt" in list:', cho_cat_orders.length);
        console.log(JSON.stringify(cho_cat_orders, null, 2));

    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
test();
