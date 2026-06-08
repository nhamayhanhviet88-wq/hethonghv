const db = require('../db/pool');

async function check() {
    await db.init();
    try {
        console.log("=== CHECKING PRESSING HISTORY FOR 3 AND 4 ===");
        const history = await db.all("SELECT * FROM pressing_history WHERE pressing_id IN (3, 4) ORDER BY id");
        console.log("History:", JSON.stringify(history, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
