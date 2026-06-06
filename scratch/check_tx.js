const db = require('../db/pool');

async function run() {
    try {
        console.log("Checking all import_records:");
        const records = await db.all(`
            SELECT *
            FROM import_records
            ORDER BY id DESC
            LIMIT 5
        `);
        console.log(JSON.stringify(records, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}

run();
