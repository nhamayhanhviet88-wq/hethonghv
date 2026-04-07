const db = require('./db/pool');

async function migrate() {
    console.log('=== Migration: department_history + department_joined_at ===');

    // 1. Create department_history table
    await db.run(`
        CREATE TABLE IF NOT EXISTS department_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            department_id INTEGER NOT NULL,
            joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
            left_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    await db.run('CREATE INDEX IF NOT EXISTS idx_dept_history_user ON department_history(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_dept_history_dept ON department_history(department_id)');
    console.log('✅ Created department_history table');

    // 2. Add department_joined_at column to users
    try {
        await db.run('ALTER TABLE users ADD COLUMN department_joined_at TIMESTAMP');
        console.log('✅ Added department_joined_at column');
    } catch(e) {
        if (e.message.includes('already exists')) {
            console.log('ℹ️  department_joined_at column already exists');
        } else {
            throw e;
        }
    }

    // 3. Set department_joined_at = created_at for existing users with department_id
    const result = await db.run(`
        UPDATE users SET department_joined_at = created_at
        WHERE department_id IS NOT NULL AND department_joined_at IS NULL
    `);
    console.log(`✅ Set department_joined_at for ${result.changes || 0} existing users`);

    // 4. Create initial department_history records for existing users
    const users = await db.all(`
        SELECT id, department_id, created_at FROM users
        WHERE department_id IS NOT NULL
    `);
    let inserted = 0;
    for (const u of users) {
        const exists = await db.get(
            'SELECT id FROM department_history WHERE user_id = $1 AND department_id = $2',
            [u.id, u.department_id]
        );
        if (!exists) {
            await db.run(
                'INSERT INTO department_history (user_id, department_id, joined_at) VALUES ($1, $2, $3)',
                [u.id, u.department_id, u.created_at]
            );
            inserted++;
        }
    }
    console.log(`✅ Created ${inserted} initial department_history records`);

    console.log('\n=== Migration complete! ===');
    process.exit(0);
}

migrate().catch(e => { console.error('❌ Migration error:', e); process.exit(1); });
