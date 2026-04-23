const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    connectionTimeoutMillis: 5000
});

async function main() {
    try {
        // Step 1: Migrate 8 KH from source_id=2 to source_id=16
        const result = await pool.query(
            `UPDATE customers SET source_id = 16 WHERE source_id = 2`
        );
        console.log(`✅ Đã chuyển ${result.rowCount} KH từ "GỌI ĐIỆN TELESALE" → "GỌI ĐIỆN ĐỐI TÁC"`);

        // Step 2: Verify no customers left with source_id=2
        const check = await pool.query(`SELECT COUNT(*) as cnt FROM customers WHERE source_id = 2`);
        console.log(`   Còn lại: ${check.rows[0].cnt} KH với source_id=2`);

        if (parseInt(check.rows[0].cnt) === 0) {
            // Step 3: Delete the old source
            await pool.query(`DELETE FROM settings_sources WHERE id = 2`);
            console.log(`🗑️ Đã xóa "GỌI ĐIỆN TELESALE" (id=2) khỏi settings_sources`);
        } else {
            console.log(`⚠️ Vẫn còn KH → không xóa`);
        }

        // Verify final state
        const sources = await pool.query(`SELECT id, name FROM settings_sources WHERE name ILIKE '%GỌI ĐIỆN%' ORDER BY id`);
        console.log(`\n===== NGUỒN HIỆN TẠI =====`);
        sources.rows.forEach(r => console.log(`  id=${r.id} | "${r.name}"`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
main();
