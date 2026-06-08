const db = require('./db/pool');

async function main() {
    try {
        const users = await db.all(`
            SELECT id, username, full_name, role, status, department_id
            FROM users
            WHERE username ILIKE '%team%' OR full_name ILIKE '%team%' OR full_name ILIKE '%tiên phong%' OR full_name ILIKE '%tinh hoa%'
        `);
        console.log("MATCHING USERS:", users);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
