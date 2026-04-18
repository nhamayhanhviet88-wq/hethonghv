const db = require('./db/pool');
(async () => {
    const r = await db.all("SELECT id, name, parent_id FROM departments WHERE status = 'active' ORDER BY parent_id NULLS FIRST, name");
    r.forEach(d => console.log(`id=${d.id} parent=${d.parent_id} name="${d.name}"`));
    process.exit(0);
})();
