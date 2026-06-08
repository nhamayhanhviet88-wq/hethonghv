const db = require('../db/pool');

async function check() {
    try {
        console.log("=== CHECKING PRESSING HISTORY ===");
        const history = await db.all("SELECT * FROM pressing_history WHERE pressing_id = 5 ORDER BY id");
        console.log("History:", history);
    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

check();
