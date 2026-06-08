const db = require('./db/pool');

async function main() {
    try {
        const row = await db.get(`SELECT * FROM departments LIMIT 1`);
        console.log("DEPARTMENTS COLS:", Object.keys(row));
        const allDepts = await db.all(`SELECT * FROM departments`);
        console.log("ALL DEPARTMENTS:", allDepts);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
