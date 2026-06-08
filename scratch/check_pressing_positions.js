const db = require('../db/pool');

async function main() {
    await db.init();
    try {
        const positions = await db.all("SELECT * FROM pressing_positions");
        console.log("Pressing positions:", positions);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
