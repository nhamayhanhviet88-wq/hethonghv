const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    connectionTimeoutMillis: 5000
});

async function main() {
    try {
        const today = '2026-04-23';
        
        // Check nhanvien's goi_hop_tac assignments - why only 50 instead of 210?
        console.log('===== NHANVIEN - GỌI HỢP TÁC: CHI TIẾT =====');
        
        // Check how many were pumped at 1:23 AM (cron) vs 9:28 AM (force pump)
        const nv1_detail = await pool.query(`
            SELECT 
                s.crm_type,
                s.name as source_name,
                COUNT(*) as cnt,
                MIN(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as first_at,
                MAX(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as last_at
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = 2 AND a.assigned_date = $1
            GROUP BY s.crm_type, s.name
            ORDER BY s.crm_type, s.name
        `, [today]);
        nv1_detail.rows.forEach(r => console.log(`  ${r.crm_type} | ${r.source_name}: ${r.cnt} SĐT | ${r.first_at} → ${r.last_at}`));

        // Check if nhanvien's goi_hop_tac was already pumped before force pump
        console.log('\n===== NHANVIEN - PHÂN BỔ THEO THỜI GIAN =====');
        const nv1_timeline = await pool.query(`
            SELECT 
                CASE 
                    WHEN a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < '2026-04-23 09:00:00' THEN 'Bơm lúc 1h sáng (cron/manual)'
                    ELSE 'Bơm lúc 9h28 (pump)'
                END as batch,
                s.crm_type,
                COUNT(*) as cnt
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = 2 AND a.assigned_date = $1
            GROUP BY 1, s.crm_type
            ORDER BY 1, s.crm_type
        `, [today]);
        nv1_timeline.rows.forEach(r => console.log(`  ${r.batch} | ${r.crm_type}: ${r.cnt} SĐT`));

        // The real question: pump logic skips if already pumped today
        // Line 1744-1748: if (existing && existing.cnt > 0) continue;
        // This means if nhanvien was force-pumped at 1AM with 50 numbers for goi_hop_tac,
        // the 9AM cron pump would SKIP goi_hop_tac entirely!
        
        console.log('\n===== KẾT LUẬN =====');
        console.log('Pump logic (line 1744-1748): Nếu NV đã có assignment hôm nay cho CRM type đó → BỎ QUA HOÀN TOÀN');
        console.log('→ nhanvien đã được bơm 50 số goi_hop_tac lúc 1h sáng');
        console.log('→ Khi cron chạy lúc 9h28, thấy goi_hop_tac đã có data → SKIP');
        console.log('→ Kết quả: chỉ được 50 thay vì 210 (thiếu 160 số goi_hop_tac)');
        console.log('→ nhanvien2 chưa có gì → cron bơm đầy đủ 210 goi_hop_tac');

        // Verify: goi_ban_hang was pumped at 9:28 for both (cron pump)
        console.log('\n===== NHANVIEN2 - CHI TIẾT =====');
        const nv2_detail = await pool.query(`
            SELECT 
                s.crm_type,
                COUNT(*) as cnt,
                MIN(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as first_at
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = 7 AND a.assigned_date = $1
            GROUP BY s.crm_type ORDER BY s.crm_type
        `, [today]);
        nv2_detail.rows.forEach(r => console.log(`  ${r.crm_type}: ${r.cnt} SĐT (bắt đầu ${r.first_at})`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
main();
