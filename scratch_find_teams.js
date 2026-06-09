const db = require('./db/pool');

async function main() {
    try {
        const users = await db.all(`
            SELECT id, username, full_name, role, status, department_id
            FROM users
            ORDER BY role, username
        `);
        console.log("ALL USERS:", users);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
