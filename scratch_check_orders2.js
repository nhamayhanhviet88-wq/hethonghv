// Check order codes + revenue for "nhanvien" in May 2026
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        const userId = 2; // nhanvien

        // 1. Count order_codes created in May for customers that nhanvien chốt
        const orderCodesRes = await pool.query(`
            SELECT 
                oc.id, oc.order_code, oc.status, oc.deposit_amount, oc.created_at,
                c.id AS customer_id, c.customer_name, c.phone, c.crm_type, c.order_status,
                COALESCE((SELECT SUM(oi.total) FROM order_items oi WHERE oi.order_code_id = oc.id), 0) AS order_code_value,
                COALESCE((SELECT SUM(oi.total) FROM order_items oi WHERE oi.customer_id = c.id), 0) AS customer_total_value
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            WHERE oc.user_id = $1
              AND oc.created_at >= '2026-05-01 00:00:00+07'
              AND oc.created_at < '2026-06-01 00:00:00+07'
            ORDER BY oc.created_at ASC
        `, [userId]);

        console.log('═══════════════════════════════════════════════════════');
        console.log('📦 MÃ ĐƠN (ORDER CODES) CỦA NHANVIEN TRONG THÁNG 5/2026');
        console.log(`   Tổng số mã đơn: ${orderCodesRes.rows.length}`);
        console.log('═══════════════════════════════════════════════════════');
        
        let totalByOrderCode = 0;
        orderCodesRes.rows.forEach((r, i) => {
            const dt = new Date(r.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const val = parseFloat(r.order_code_value) || 0;
            totalByOrderCode += val;
            console.log(`   ${i+1}. ${r.order_code} | KH: ${r.customer_name} (ID:${r.customer_id}) | ${r.phone}`);
            console.log(`      Giá trị mã đơn: ${val.toLocaleString('vi-VN')} VNĐ | Cọc: ${(parseFloat(r.deposit_amount)||0).toLocaleString('vi-VN')} VNĐ`);
            console.log(`      Trạng thái KH: ${r.order_status} | CRM: ${r.crm_type} | Tạo: ${dt}`);
        });
        console.log('───────────────────────────────────────────────────────');
        console.log(`   💰 TỔNG (theo giá trị từng mã đơn): ${totalByOrderCode.toLocaleString('vi-VN')} VNĐ`);

        // 2. Count unique customers that have chot_don log by nhanvien in May
        const uniqueCustomers = await pool.query(`
            SELECT DISTINCT ON (c.id)
                c.id, c.customer_name, c.phone, c.crm_type, c.order_status,
                COALESCE((SELECT SUM(oi.total) FROM order_items oi WHERE oi.customer_id = c.id), 0) AS total_value,
                cl.created_at AS chot_at
            FROM consultation_logs cl
            JOIN customers c ON cl.customer_id = c.id
            WHERE cl.log_type = 'chot_don'
              AND cl.logged_by = $1
              AND cl.created_at >= '2026-05-01 00:00:00+07'
              AND cl.created_at < '2026-06-01 00:00:00+07'
            ORDER BY c.id, cl.created_at ASC
        `, [userId]);

        let totalByCustomer = 0;
        console.log('\n═══════════════════════════════════════════════════════');
        console.log(`📊 KHÁCH HÀNG UNIQUE ĐÃ CHỐT: ${uniqueCustomers.rows.length} khách`);
        console.log('═══════════════════════════════════════════════════════');
        uniqueCustomers.rows.forEach((r, i) => {
            const val = parseFloat(r.total_value) || 0;
            totalByCustomer += val;
            console.log(`   ${i+1}. [ID:${r.id}] ${r.customer_name} | ${r.phone} | ${r.order_status} | ${val.toLocaleString('vi-VN')} VNĐ`);
        });
        console.log('───────────────────────────────────────────────────────');
        console.log(`   💰 TỔNG DOANH SỐ (theo khách unique): ${totalByCustomer.toLocaleString('vi-VN')} VNĐ`);

        // 3. Summary comparison
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📋 TÓM TẮT');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`   Số mã đơn (order codes):      ${orderCodesRes.rows.length}`);
        console.log(`   Số khách unique đã chốt:      ${uniqueCustomers.rows.length}`);
        console.log(`   Số log chốt đơn:              7 (có trùng)`);
        console.log(`   Tổng DS theo mã đơn:          ${totalByOrderCode.toLocaleString('vi-VN')} VNĐ`);
        console.log(`   Tổng DS theo khách unique:     ${totalByCustomer.toLocaleString('vi-VN')} VNĐ`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}
main();
