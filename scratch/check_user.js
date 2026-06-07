const db = require('../db/pool');

async function check() {
    try {
        const user = await db.get(`SELECT id, username, full_name, role FROM users WHERE id = 66`);
        console.log('User ID 66:', user);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

check();
