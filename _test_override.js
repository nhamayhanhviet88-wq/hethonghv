require('dotenv').config();
const db = require('./db/pool');

async function test() {
    try {
        // Check table exists
        const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'task_user_overrides'");
        console.log('Columns:', cols.map(c => c.column_name));

        // Check constraints
        const constraints = await db.all("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'task_user_overrides'::regclass");
        console.log('Constraints:', constraints);

        // Try insert
        const result = await db.get(
            `INSERT INTO task_user_overrides (user_id, source_type, source_id, custom_points, custom_min_quantity, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, source_type, source_id)
             DO UPDATE SET custom_points = $4, custom_min_quantity = $5, updated_at = NOW()
             RETURNING *`,
            [999, 'diem', 1, 25, null, 1]
        );
        console.log('Insert result:', result);

        // Clean up
        await db.run('DELETE FROM task_user_overrides WHERE user_id = $1', [999]);
        console.log('Cleaned up');
    } catch (e) {
        console.error('ERROR:', e.message);
        console.error(e.stack);
    } finally {
        await db.close();
    }
}

test();
