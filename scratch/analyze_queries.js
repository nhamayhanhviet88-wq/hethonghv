const dotenv = require('dotenv');
dotenv.config();
const db = require('../db/pool');

async function runAnalysis() {
    try {
        await db.init();
        
        console.log('--- TABLE ROW COUNTS ---');
        const counts = await Promise.all([
            db.get('SELECT COUNT(*) FROM sewing_records'),
            db.get('SELECT COUNT(*) FROM cutting_records'),
            db.get('SELECT COUNT(*) FROM dht_orders'),
            db.get('SELECT COUNT(*) FROM dht_order_items'),
            db.get('SELECT COUNT(*) FROM sewing_history')
        ]);
        
        console.log(`sewing_records: ${counts[0].count}`);
        console.log(`cutting_records: ${counts[1].count}`);
        console.log(`dht_orders: ${counts[2].count}`);
        console.log(`dht_order_items: ${counts[3].count}`);
        console.log(`sewing_history: ${counts[4].count}`);
        
        console.log('\n--- MEASURING QUERY TIME (No Limit) ---');
        
        for (let tab of ['1', '2', '3', '4']) {
            let where = 'WHERE 1=1';
            if (tab === '1') {
                where += ` AND sr.contractor_id IS NULL AND sr.done_date IS NULL AND sr.expected_date <= (timezone('Asia/Ho_Chi_Minh', now())::date)`;
            } else if (tab === '2') {
                where += ` AND sr.contractor_id IS NULL AND sr.done_date IS NULL AND sr.expected_date > (timezone('Asia/Ho_Chi_Minh', now())::date)`;
            } else if (tab === '3') {
                where += ` AND sr.contractor_id IS NULL AND sr.sewing_team_id IS NULL AND sr.done_date IS NULL`;
            } else if (tab === '4') {
                where += ` AND sr.done_date IS NULL`;
            }
            
            const orderByClause = `
                CASE WHEN sr.done_date IS NULL THEN 0 ELSE 1 END ASC,
                CASE 
                    WHEN UPPER(COALESCE(o.shipping_priority, 'CHUẨN')) = 'CHUẨN' THEN 1
                    WHEN UPPER(COALESCE(o.shipping_priority, 'CHUẨN')) = 'GẤP' THEN 2
                    WHEN UPPER(COALESCE(o.shipping_priority, 'CHUẨN')) = 'GỬI' THEN 3
                    ELSE 4
                END ASC,
                COALESCE(o.expected_ship_date, o.shipping_date) ASC NULLS LAST,
                CASE 
                    WHEN sr.sewing_team_id IS NULL AND sr.contractor_id IS NULL THEN 1
                    WHEN sr.sewing_team_id IS NOT NULL AND sr.contractor_id IS NULL THEN 2
                    ELSE 3
                END ASC,
                sr.expected_date ASC NULLS LAST,
                sr.created_at DESC`;
                
            let queryStr = `
                SELECT sr.*, COALESCE(dt.name, u.full_name) AS sewer_name, c.name AS contractor_name,
                       u_rpt.full_name AS reported_by_name, u_sal.full_name AS salary_by_name, o.order_code, o.shipping_priority,
                       o.expected_ship_date, o.shipping_date, o.standard_delivery_time,
                       u_cskh.full_name AS cskh_name,
                       (SELECT product_name FROM cutting_records WHERE order_item_id = sr.order_item_id ORDER BY CASE WHEN product_name LIKE '%P1%' THEN 0 ELSE 1 END, id ASC LIMIT 1) AS cut_product_name,
                       cc.name AS category_name,
                       oi.material_name, oi.color_name, oi.pattern_name, oi.sewing_techniques, oi.quantity AS order_qty,
                       ts.factory_price AS ts_factory_price, ts.processing_price AS ts_processing_price, ts.sewing_tech AS ts_sewing_tech, ts.spec_image AS ts_spec_image,
                       lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by,
                       COUNT(*) OVER() AS total_count
                FROM sewing_records sr 
                LEFT JOIN users u ON sr.sewer_id=u.id 
                LEFT JOIN departments dt ON sr.sewing_team_id=dt.id
                LEFT JOIN sewing_contractors c ON sr.contractor_id=c.id
                LEFT JOIN users u_rpt ON sr.reported_by=u_rpt.id LEFT JOIN users u_sal ON sr.salary_approved_by=u_sal.id
                LEFT JOIN dht_orders o ON sr.dht_order_id=o.id
                LEFT JOIN users u_cskh ON o.cskh_user_id=u_cskh.id
                LEFT JOIN dht_order_items oi ON sr.order_item_id = oi.id
                LEFT JOIN tsam_samples ts ON oi.pattern_name = ts.sample_code AND ts.is_active = true
                LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(oi.product_name, oi.description)) AND p.is_active = true
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
                LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM sewing_history h WHERE h.sewing_id=sr.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
                LEFT JOIN users lhu ON lh.performed_by=lhu.id
                ${where} ORDER BY ${orderByClause}`;
            
            const start = Date.now();
            const res = await db.all(queryStr);
            const duration = Date.now() - start;
            console.log(`Tab ${tab}: returned ${res.length} rows in ${duration}ms`);
        }
        
    } catch (err) {
        console.error('Error during analysis:', err);
    } finally {
        await db.close();
    }
}

runAnalysis();
