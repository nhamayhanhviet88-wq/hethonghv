const db = require('./db/pool');

async function getUsers() {
    const users = await db.all("SELECT id, username, role FROM users");
    console.log("=== USERS ===", users);
}

getUsers();
