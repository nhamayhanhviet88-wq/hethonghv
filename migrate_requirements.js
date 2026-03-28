const db = require('./db/pool');
(async () => {
    try {
        await db.run("ALTER TABLE task_point_templates ADD COLUMN IF NOT EXISTS input_requirements TEXT DEFAULT '[]'");
        await db.run("ALTER TABLE task_point_templates ADD COLUMN IF NOT EXISTS output_requirements TEXT DEFAULT '[]'");
        await db.run("ALTER TABLE daily_task_snapshots ADD COLUMN IF NOT EXISTS input_requirements TEXT DEFAULT '[]'");
        await db.run("ALTER TABLE daily_task_snapshots ADD COLUMN IF NOT EXISTS output_requirements TEXT DEFAULT '[]'");
        console.log('OK: all columns added');
    } catch (e) {
        console.log('Error:', e.message);
    }
    process.exit();
})();
