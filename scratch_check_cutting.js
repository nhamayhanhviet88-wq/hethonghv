const db = require('./db/pool');

async function main() {
    try {
        console.log("Connecting to DB...");
        await db.init();
        
        const record = await db.get(`SELECT * FROM cutting_records LIMIT 1`);
        console.log("Columns:", Object.keys(record));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.close();
    }
}

main();
