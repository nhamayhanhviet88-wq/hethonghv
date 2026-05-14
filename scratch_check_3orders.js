require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        const codes = ['AFF-VTA0015', 'AFF-VTA0017', 'VTA0018'];
        
        for (const code of codes) {
            console.log('\n═══════════════════════════════════════════════════════');
            console.log(`🔍 MÃ ĐƠN: ${code}`);
            console.log('═══════════════════════════════════════════════════════');
            
            const res = await pool.query(`
                SELECT 
                    oc.id, oc.order_code, oc.status AS oc_status, oc.deposit_amount, oc.created_at AS oc_created,
                    oc.user_id AS oc_user_id,
                    u_oc.username AS oc_username, u_oc.full_name AS oc_user_name,
                    c.id AS cust_id, c.customer_name, c.phone, c.crm_type, c.order_status,
                    c.assigned_to_id, c.receiver_id, c.referrer_id, c.referrer_customer_id,
                    c.cancel_requested, c.cancel_approved, c.cancel_reason,
                    u_assign.username AS assigned_username,
                    u_recv.username AS receiver_username,
                    u_ref.username AS referrer_username,
                    COALESCE((SELECT SUM(oi.total) FROM order_items oi WHERE oi.order_code_id = oc.id), 0) AS order_code_value,
                    COALESCE((SELECT SUM(oi.total) FROM order_items oi WHERE oi.customer_id = c.id), 0) AS customer_total
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN users u_oc ON oc.user_id = u_oc.id
                LEFT JOIN users u_assign ON c.assigned_to_id = u_assign.id
                LEFT JOIN users u_recv ON c.receiver_id = u_recv.id
                LEFT JOIN users u_ref ON c.referrer_id = u_ref.id
                WHERE oc.order_code = $1
            `, [code]);

            if (res.rows.length === 0) {
                console.log('   ❌ Không tìm thấy mã đơn này trong database!');
                continue;
            }

            const r = res.rows[0];
            const dt = new Date(r.oc_created).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            
            console.log(`   📋 Order Code ID: ${r.id}`);
            console.log(`   📦 Status mã đơn: ${r.oc_status}`);
            console.log(`   💰 Giá trị mã đơn: ${(parseFloat(r.order_code_value)||0).toLocaleString('vi-VN')} VNĐ`);
            console.log(`   💵 Cọc: ${(parseFloat(r.deposit_amount)||0).toLocaleString('vi-VN')} VNĐ`);
            console.log(`   🕐 Tạo lúc: ${dt}`);
            console.log(`   👤 User tạo mã đơn: ${r.oc_username} (ID: ${r.oc_user_id})`);
            console.log('');
            console.log(`   --- KHÁCH HÀNG ---`);
            console.log(`   🆔 Customer ID: ${r.cust_id}`);
            console.log(`   👤 Tên: ${r.customer_name}`);
            console.log(`   📞 SĐT: ${r.phone}`);
            console.log(`   📋 CRM Type: ${r.crm_type}`);
            console.log(`   📍 Trạng thái đơn: ${r.order_status}`);
            console.log(`   👤 Assigned to: ${r.assigned_username || '(null)'} (ID: ${r.assigned_to_id})`);
            console.log(`   👤 Receiver: ${r.receiver_username || '(null)'} (ID: ${r.receiver_id})`);
            console.log(`   👤 Referrer (affiliate): ${r.referrer_username || '(null)'} (ID: ${r.referrer_id})`);
            console.log(`   💰 Tổng giá trị khách: ${(parseFloat(r.customer_total)||0).toLocaleString('vi-VN')} VNĐ`);
            
            if (r.cancel_requested) {
                console.log(`   ⚠️ YÊU CẦU HỦY: có | Đã duyệt: ${r.cancel_approved ? 'Có' : 'Chưa'}`);
                console.log(`   📝 Lý do hủy: ${r.cancel_reason || '(không có)'}`);
            }

            // Check consultation logs
            const logs = await pool.query(`
                SELECT cl.log_type, cl.content, cl.created_at, u.username AS logged_by_username
                FROM consultation_logs cl
                LEFT JOIN users u ON cl.logged_by = u.id
                WHERE cl.customer_id = $1
                ORDER BY cl.created_at DESC
                LIMIT 5
            `, [r.cust_id]);

            console.log(`\n   --- 5 LOG GẦN NHẤT ---`);
            logs.rows.forEach((l, i) => {
                const ldt = new Date(l.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                console.log(`   ${i+1}. [${l.log_type}] by ${l.logged_by_username} | ${ldt}`);
                if (l.content) console.log(`      ${l.content.substring(0, 100)}`);
            });
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}
main();
