const db = require('../db/pool');

async function main() {
    try {
        const row = await db.get(`SELECT * FROM sewing_records LIMIT 1`);
        if (row) {
            console.log("SEWING RECORDS COLS:", Object.keys(row));
            if ('sew_notes' in row) {
                console.log("✅ sew_notes column exists in sewing_records!");
            } else {
                console.log("❌ sew_notes column does NOT exist in sewing_records!");
            }
        } else {
            console.log("No sewing records found to check columns.");
        }
    } catch (e) {
        console.error("Error checking columns:", e);
    } finally {
        process.exit();
    }
}

main();
