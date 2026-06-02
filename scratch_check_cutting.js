const db = require('./db/pool');

async function main() {
    try {
        console.log("Connecting to DB...");
        await db.init();
        
        const rolls = await db.all("SELECT id, roll_code, weight, locked_by_cutting_id, is_returned FROM kv_rolls WHERE id IN (14, 18)");
        console.log("\nRolls details:");
        console.log(JSON.stringify(rolls, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.close();
    }
}

main();
