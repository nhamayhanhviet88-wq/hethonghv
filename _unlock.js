const db = require('./db/pool');
(async () => {
    await db.init();
    const users = await db.all("SELECT id, username, role, status FROM users WHERE role = 'giam_doc' OR username LIKE '%giam%' OR username LIKE '%admin%' ORDER BY id LIMIT 10");
    console.log('GD users:', users);
    const all = await db.all("SELECT id, username, role, status FROM users WHERE status = 'active' ORDER BY id LIMIT 10");
    console.log('Active users:', all);
    await db.close();
    process.exit(0);
})();
