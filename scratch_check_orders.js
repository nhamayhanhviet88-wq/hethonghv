// Scratch script: check orders closed by "nhanvien" account in May 2026
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        // 1. Find the user with username = 'nhanvien'
        const userRes = await pool.query(`SELECT id, username, full_name, role, department_id FROM users WHERE username = 'nhanvien'`);
        if (userRes.rows.length === 0) {
            console.log('❌ Không tìm thấy tài khoản username = "nhanvien"');
            return;
        }
        const user = userRes.rows[0];
        console.log('═══════════════════════════════════════════════════════');
        console.log('👤 THÔNG TIN TÀI KHOẢN');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Họ tên: ${user.full_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Phòng ban ID: ${user.department_id}`);
        console.log('');

        // 2. Find orders that have "chot_don" consultation log in May 2026 (assigned to this user)
        const ordersWithChotLog = await pool.query(`
            SELECT 
                c.id AS customer_id,
                c.customer_name,
                c.phone,
                c.crm_type,
                c.order_status,
                c.province,
                cl.created_at AS chot_don_at,
                cl.content AS chot_don_content,
                cl.deposit_amount,
                COALESCE(
                    (SELECT SUM(oi.total) FROM order_items oi WHERE oi.customer_id = c.id), 0
                ) AS total_order_value,
                COALESCE(
                    (SELECT string_agg(oc.order_code, ', ') FROM order_codes oc WHERE oc.customer_id = c.id), ''
                ) AS order_codes
            FROM consultation_logs cl
            JOIN customers c ON cl.customer_id = c.id
            WHERE cl.log_type = 'chot_don'
              AND cl.logged_by = $1
              AND cl.created_at >= '2026-05-01 00:00:00+07'
              AND cl.created_at < '2026-06-01 00:00:00+07'
            ORDER BY cl.created_at ASC
        `, [user.id]);

        console.log('═══════════════════════════════════════════════════════');
        console.log(`📦 ĐƠN HÀNG ĐÃ CHỐT TRONG THÁNG 5/2026 (theo log chốt đơn)`);
        console.log(`   Tổng số: ${ordersWithChotLog.rows.length} đơn`);
        console.log('═══════════════════════════════════════════════════════');

        if (ordersWithChotLog.rows.length === 0) {
            console.log('   (Không có đơn hàng nào)');
        } else {
            let totalRevenue = 0;
            let totalDeposit = 0;
            ordersWithChotLog.rows.forEach((row, idx) => {
                const chotDate = new Date(row.chot_don_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                totalRevenue += parseFloat(row.total_order_value) || 0;
                totalDeposit += parseFloat(row.deposit_amount) || 0;
                console.log(`\n   ${idx + 1}. [ID: ${row.customer_id}] ${row.customer_name}`);
                console.log(`      📞 SĐT: ${row.phone}`);
                console.log(`      📋 Loại CRM: ${row.crm_type}`);
                console.log(`      📍 Trạng thái hiện tại: ${row.order_status}`);
                console.log(`      💰 Giá trị đơn: ${(parseFloat(row.total_order_value) || 0).toLocaleString('vi-VN')} VNĐ`);
                console.log(`      💵 Tiền cọc: ${(parseFloat(row.deposit_amount) || 0).toLocaleString('vi-VN')} VNĐ`);
                console.log(`      🏷️ Mã đơn: ${row.order_codes || '(chưa có)'}`);
                console.log(`      🕐 Thời gian chốt: ${chotDate}`);
                if (row.chot_don_content) {
                    console.log(`      📝 Ghi chú: ${row.chot_don_content}`);
                }
                if (row.province) {
                    console.log(`      📍 Tỉnh/TP: ${row.province}`);
                }
            });
            console.log('\n───────────────────────────────────────────────────────');
            console.log(`   💰 TỔNG GIÁ TRỊ ĐƠN: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
            console.log(`   💵 TỔNG TIỀN CỌC: ${totalDeposit.toLocaleString('vi-VN')} VNĐ`);
            console.log('───────────────────────────────────────────────────────');
        }

        // 3. Also check: customers currently in chot_don status assigned to this user
        const currentChot = await pool.query(`
            SELECT 
                c.id, c.customer_name, c.phone, c.crm_type, c.order_status, c.created_at,
                COALESCE((SELECT SUM(oi.total) FROM order_items oi WHERE oi.customer_id = c.id), 0) AS total_value
            FROM customers c
            WHERE c.assigned_to_id = $1
              AND c.order_status IN ('chot_don', 'hoan_thanh', 'san_xuat', 'giao_hang', 'sau_ban_hang')
              AND c.created_at >= '2026-05-01 00:00:00+07'
              AND c.created_at < '2026-06-01 00:00:00+07'
            ORDER BY c.created_at ASC
        `, [user.id]);

        console.log('\n═══════════════════════════════════════════════════════');
        console.log(`📊 KHÁCH HÀNG ĐANG Ở TRẠNG THÁI CHỐT+ (tạo trong T5, assigned cho ${user.full_name})`);
        console.log(`   Tổng: ${currentChot.rows.length}`);
        console.log('═══════════════════════════════════════════════════════');
        currentChot.rows.forEach((row, idx) => {
            const created = new Date(row.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            console.log(`   ${idx + 1}. [ID: ${row.id}] ${row.customer_name} | ${row.phone} | ${row.crm_type} | ${row.order_status} | ${(parseFloat(row.total_value) || 0).toLocaleString('vi-VN')} VNĐ | Tạo: ${created}`);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
