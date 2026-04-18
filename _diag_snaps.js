const db = require('./db/pool');
(async () => {
    await db.run('UPDATE departments SET display_order = 0 WHERE id = 1');
    const r = await db.all("SELECT id, name, display_order FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id");
    r.forEach(d => console.log(d.display_order, d.name));
    process.exit(0);
})();
