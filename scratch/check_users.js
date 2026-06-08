const db = require('../db/pool');

async function run() {
    try {
        await db.init();
        const users = await db.all(`SELECT id, username, full_name, role FROM users WHERE id IN (68, 69)`);
        console.table(users);
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
run();
