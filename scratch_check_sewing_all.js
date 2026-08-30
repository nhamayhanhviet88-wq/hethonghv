const db = require('./db/pool');

async function checkSewingRecordsAll() {
    try {
        const count = await db.get(`SELECT COUNT(*)::int AS cnt FROM sewing_records`);
        console.log("Total sewing_records count:", count);

        const sample = await db.all(`
            SELECT id, sewing_team_id, quantity, done_date, handover_date, created_at
            FROM sewing_records
            LIMIT 5
        `);
        console.log("Sample sewing_records:", sample);
    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

checkSewingRecordsAll();
