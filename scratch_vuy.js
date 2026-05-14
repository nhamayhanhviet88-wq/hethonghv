require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    const r = await pool.query(`SELECT u.id, u.username, u.full_name, u.role, u.order_code_prefix, u.department_id FROM users u WHERE u.order_code_prefix ILIKE '%VUY%'`);
    console.log('👤 Tài khoản có prefix VUY:');
    console.log(JSON.stringify(r.rows, null, 2));
    
    // Also check order_codes with VUY prefix
    const oc = await pool.query(`SELECT oc.order_code, oc.user_id, u.username, u.full_name, c.customer_name, c.assigned_to_id, ua.username AS assigned_username FROM order_codes oc JOIN users u ON oc.user_id = u.id JOIN customers c ON oc.customer_id = c.id LEFT JOIN users ua ON c.assigned_to_id = ua.id WHERE oc.order_code LIKE '%VUY%' ORDER BY oc.created_at`);
    console.log('\n📦 Tất cả mã đơn VUY:');
    oc.rows.forEach((r, i) => {
        console.log(`   ${i+1}. ${r.order_code} | Tạo bởi: ${r.username} (${r.full_name}) | KH: ${r.customer_name} | Assigned: ${r.assigned_username}`);
    });
    
    await pool.end();
})();
