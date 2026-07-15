const db = require('./db/pool');

async function run() {
    try {
        await db.init();
        
        console.log('--- User ID 58 details ---');
        const user58 = await db.get(`SELECT id, username, full_name, role FROM users WHERE id = 58`);
        console.log(user58);

        console.log('--- Admin User details ---');
        const adminUser = await db.get(`SELECT id, username, full_name, role FROM users WHERE username = 'admin'`);
        console.log(adminUser);
        
    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

run();
