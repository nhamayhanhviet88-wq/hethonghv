const db = require('./db/pool');

async function listUsers() {
    try {
        const users = await db.all("SELECT id, username, full_name, role, status FROM users");
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

listUsers();
