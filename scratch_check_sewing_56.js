const db = require('./db/pool');

async function main() {
    try {
        const row = await db.get(`SELECT * FROM sewing_records WHERE id = 56`);
        console.log("SEWING RECORD 56:", JSON.stringify(row, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
