const db = require('../db/pool');

async function main() {
    await db.init();
    try {
        const tierAss = await db.get("SELECT * FROM user_pressing_salary_tiers WHERE user_id = 1");
        console.log("Tier assignment for user 1:", tierAss);
        if (tierAss) {
            const tier = await db.get("SELECT * FROM pressing_salary_tiers WHERE id = $1", [tierAss.tier_id]);
            console.log("Tier details:", tier);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
