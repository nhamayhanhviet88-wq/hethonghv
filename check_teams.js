const db = require('./db/pool');
(async () => {
    const all = await db.all("SELECT id, name, parent_id, status FROM departments ORDER BY parent_id, name");
    console.table(all);
    process.exit();
})();
