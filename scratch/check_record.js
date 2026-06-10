const db = require('../db/pool');

async function run() {
    try {
        const row = await db.get(`SELECT id, name FROM contractors WHERE id = 4`);
        console.log(row);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
