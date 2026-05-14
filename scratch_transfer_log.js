require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    // Check affiliate transfer/handover logs
    const r1 = await pool.query(`SELECT cl.*, u.username as logged_by_user FROM consultation_logs cl LEFT JOIN users u ON u.id = cl.logged_by WHERE cl.content ILIKE '%affiliatenhanvien3%' ORDER BY cl.created_at DESC LIMIT 10`);
    console.log('═══ LOGS liên quan affiliatenhanvien3 ═══');
    r1.rows.forEach(r => {
        const dt = new Date(r.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        console.log(`[${dt}] by ${r.logged_by_user} | type: ${r.log_type} | ${r.content}`);
    });

    // Check transfer-bulk logs
    const r2 = await pool.query(`SELECT cl.*, u.username as logged_by_user FROM consultation_logs cl LEFT JOIN users u ON u.id = cl.logged_by WHERE cl.log_type ILIKE '%transfer%' OR cl.log_type ILIKE '%handover%' OR cl.content ILIKE '%chuyển quản lý%' OR cl.content ILIKE '%bàn giao affiliate%' ORDER BY cl.created_at DESC LIMIT 10`);
    console.log('\n═══ LOGS chuyển quản lý / bàn giao ═══');
    r2.rows.forEach(r => {
        const dt = new Date(r.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        console.log(`[${dt}] by ${r.logged_by_user} | type: ${r.log_type} | cust:${r.customer_id} | ${r.content}`);
    });

    // Check if there's an affiliate_transfer_logs or similar table
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%transfer%' OR table_name ILIKE '%handover%' OR table_name ILIKE '%audit%'`);
    console.log('\n═══ Tables liên quan transfer/audit ═══');
    console.log(tables.rows);

    await pool.end();
})();
