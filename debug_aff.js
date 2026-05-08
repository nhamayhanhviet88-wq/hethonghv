require('dotenv').config();
const db = require('./db/pool');
(async()=>{
    await db.init();
    // Find the customer affiliatenhanvien3
    const r = await db.all(`SELECT c.id, c.customer_name, c.referrer_id, c.order_status,
        u.id as aff_user_id, u.username as aff_username, u.source_customer_id
        FROM customers c 
        LEFT JOIN users u ON u.source_customer_id = c.id AND u.status = 'active' 
        WHERE c.crm_type = 'ctv_hoa_hong'
        ORDER BY c.id`);
    console.log('=== Customers with affiliate info ===');
    for (const c of r) {
        const hasCompleted = await db.get(`SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id = $1 AND status = 'completed'`, [c.id]);
        console.log(`ID:${c.id} | ${c.customer_name} | referrer_id:${c.referrer_id} | aff_user:${c.aff_user_id||'null'} (${c.aff_username||'-'}) | completed_orders:${hasCompleted.cnt} | status:${c.order_status}`);
    }
    process.exit();
})();
