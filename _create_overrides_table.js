// Migration: Create task_user_overrides table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS task_user_overrides (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id),
                source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('diem', 'khoa')),
                source_id INT NOT NULL,
                custom_points INT,
                custom_min_quantity INT,
                created_by INT NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, source_type, source_id)
            );
            CREATE INDEX IF NOT EXISTS idx_tuo_user ON task_user_overrides(user_id);
            CREATE INDEX IF NOT EXISTS idx_tuo_source ON task_user_overrides(source_type, source_id);
        `);
        console.log('✅ Table task_user_overrides created successfully');

        // Verify
        const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'task_user_overrides' ORDER BY ordinal_position`);
        r.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
})();
