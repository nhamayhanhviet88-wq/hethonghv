require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
});

(async () => {
    try {
        // Check what dept_id the affiliate users actually have
        const users = await pool.query("SELECT id, full_name, department_id, role FROM users WHERE role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')");
        console.log('Affiliate users:');
        users.rows.forEach(u => console.log(`  id=${u.id} ${u.full_name} dept=${u.department_id} role=${u.role}`));

        // Update ALL affiliate users to dept 21 (AFFILIATE TOÀN QUỐC)
        const result = await pool.query(
            "UPDATE users SET department_id = 21 WHERE role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate') AND (department_id IS NULL OR department_id != 21)"
        );
        console.log('\nUpdated', result.rowCount, 'users to AFFILIATE TOÀN QUỐC (id=21)');

    } catch (e) {
        console.error('ERR:', e.message);
    } finally {
        await pool.end();
    }
})();
