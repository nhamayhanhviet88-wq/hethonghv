const db = require('./db/pool');
(async () => {
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS zalo_link_pool (
            id SERIAL PRIMARY KEY,
            url TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'available',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )`);
        console.log('1. zalo_link_pool created');

        await db.run(`CREATE TABLE IF NOT EXISTS zalo_daily_tasks (
            id SERIAL PRIMARY KEY,
            pool_id INTEGER REFERENCES zalo_link_pool(id),
            user_id INTEGER REFERENCES users(id),
            assigned_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(pool_id)
        )`);
        console.log('2. zalo_daily_tasks created');

        await db.run(`CREATE TABLE IF NOT EXISTS zalo_task_results (
            id SERIAL PRIMARY KEY,
            task_id INTEGER REFERENCES zalo_daily_tasks(id) ON DELETE CASCADE,
            zalo_name TEXT NOT NULL,
            zalo_link TEXT NOT NULL,
            spam_status VARCHAR(20) DEFAULT 'pending',
            spam_screenshot TEXT,
            spam_by INTEGER REFERENCES users(id),
            spam_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
        console.log('3. zalo_task_results created');
        console.log('All tables created!');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
