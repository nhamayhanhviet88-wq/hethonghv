require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    // 1. Check affiliate affiliatenhanvien3
    const aff = await pool.query(`SELECT id, username, full_name, role, managed_by_user_id, assigned_to_user_id, source_customer_id FROM users WHERE full_name ILIKE '%affiliatenhanvien3%' OR username ILIKE '%affiliatenhanvien3%'`);
    console.log('═══ AFFILIATE affiliatenhanvien3 ═══');
    console.log(JSON.stringify(aff.rows, null, 2));

    // 2. Check all customers referred by this affiliate
    if (aff.rows.length > 0) {
        const affId = aff.rows[0].id;
        const custs = await pool.query(`
            SELECT c.id, c.customer_name, c.phone, c.assigned_to_id, c.receiver_id, c.created_by, c.crm_type, c.order_status,
                   ua.username AS assigned_username,
                   ur.username AS receiver_username,
                   ucr.username AS created_by_username,
                   c.created_at
            FROM customers c
            LEFT JOIN users ua ON ua.id = c.assigned_to_id
            LEFT JOIN users ur ON ur.id = c.receiver_id
            LEFT JOIN users ucr ON ucr.id = c.created_by
            WHERE c.referrer_id = $1
            ORDER BY c.created_at
        `, [affId]);
        
        console.log(`\n═══ KHÁCH HÀNG DO affiliatenhanvien3 (ID:${affId}) GIỚI THIỆU ═══`);
        custs.rows.forEach((r, i) => {
            const dt = new Date(r.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            console.log(`${i+1}. [ID:${r.id}] ${r.customer_name} | ${r.phone}`);
            console.log(`   assigned_to: ${r.assigned_username} (ID:${r.assigned_to_id})`);
            console.log(`   receiver: ${r.receiver_username} (ID:${r.receiver_id})`);
            console.log(`   created_by: ${r.created_by_username} (ID:${r.created_by})`);
            console.log(`   crm: ${r.crm_type} | status: ${r.order_status} | tạo: ${dt}`);
        });
    }

    // 3. Check managed_by of nhanvien vs nhanvien2
    const users = await pool.query(`SELECT id, username, full_name, role, department_id FROM users WHERE username IN ('nhanvien', 'nhanvien2')`);
    console.log('\n═══ SO SÁNH NHANVIEN vs NHANVIEN2 ═══');
    console.log(JSON.stringify(users.rows, null, 2));

    await pool.end();
})();
