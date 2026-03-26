/**
 * Minimal test: insert 1 row and verify it persists
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });

(async () => {
    const client = await pool.connect();
    try {
        // Check before
        let r = await client.query('SELECT COUNT(*) as cnt FROM users');
        console.log('Users BEFORE:', r.rows[0].cnt);

        // Insert test row
        await client.query('BEGIN');
        await client.query(`INSERT INTO users (username, password_hash, full_name, role)
            VALUES ('test_restore_xyz', 'hash123', 'Test Restore', 'nhan_vien')`);
        await client.query('COMMIT');
        console.log('INSERT committed');

        // Check after with SAME client
        r = await client.query('SELECT COUNT(*) as cnt FROM users');
        console.log('Users AFTER (same client):', r.rows[0].cnt);

        client.release();

        // Check with NEW connection
        const r2 = await pool.query('SELECT COUNT(*) as cnt FROM users');
        console.log('Users AFTER (new conn):', r2.rows[0].cnt);

        // Check specific row
        const r3 = await pool.query("SELECT * FROM users WHERE username = 'test_restore_xyz'");
        console.log('Found test row:', r3.rows.length > 0 ? 'YES' : 'NO');

        // Clean up
        await pool.query("DELETE FROM users WHERE username = 'test_restore_xyz'");
        console.log('Cleaned up test row');

    } catch (e) {
        console.log('Error:', e.message);
        client.release();
    }
    await pool.end();
})();
