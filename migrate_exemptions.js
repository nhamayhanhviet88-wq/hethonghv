const db = require('./db/pool');
(async () => {
    console.log('Creating task_exemptions table...');
    await db.run(`CREATE TABLE IF NOT EXISTS task_exemptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        exempt_type TEXT NOT NULL DEFAULT 'permanent',
        week_start TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
    )`);
    console.log('✅ task_exemptions table created');

    // Create index for fast lookups
    await db.run(`CREATE INDEX IF NOT EXISTS idx_exemptions_user ON task_exemptions(user_id, template_id)`);
    console.log('✅ Index created');

    process.exit();
})();
