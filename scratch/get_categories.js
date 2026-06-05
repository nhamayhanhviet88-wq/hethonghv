const db = require('../db/pool');

async function main() {
    try {
        const rows = await db.all("SELECT id, name FROM dht_categories ORDER BY display_order ASC, id ASC");
        console.log("Categories:", rows);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
main();
