const db = require('../db/pool');

async function check() {
    try {
        const rows = await db.all('SELECT id, name FROM departments');
        console.log('DEPARTMENTS:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
