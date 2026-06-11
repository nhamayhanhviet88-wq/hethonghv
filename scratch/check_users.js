const db = require('../db/pool');

async function run() {
    try {
        await db.init();
        
        // Find users with 'quanlyxuong' in username (case-insensitive)
        const qlxUsers = await db.all("SELECT id, username, full_name, role, status FROM users WHERE username ILIKE '%quanlyxuong%'");
        console.log("=== Users containing 'quanlyxuong' ===");
        console.log(qlxUsers);
        
        // Let's also check for any usernames that have uppercase letters or spaces
        const upperOrSpacedUsers = await db.all("SELECT id, username, full_name, role, status FROM users WHERE username != LOWER(TRIM(username))");
        console.log("\n=== Users with uppercase letters or leading/trailing spaces ===");
        console.log(upperOrSpacedUsers);
        
        // Let's print the total count of users
        const total = await db.get("SELECT count(*) as cnt FROM users");
        console.log(`\nTotal users: ${total.cnt}`);

    } catch (e) {
        console.error("Error running script:", e);
    } finally {
        await db.close();
    }
}

run();
