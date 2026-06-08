const db = require('./db/pool');

async function main() {
    try {
        const depts = await db.all(`SELECT id, name FROM departments`);
        console.log("DEPARTMENTS:", depts);

        const users = await db.all(`
            SELECT u.id, u.username, u.full_name, u.role, u.department_id, d.name AS dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status = 'active'
        `);
        console.log("ACTIVE USERS:", users);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
