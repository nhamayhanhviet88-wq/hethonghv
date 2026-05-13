const db = require('./db/pool');
(async () => {
    await db.run("UPDATE users SET access_blocked = false, access_blocked_reason = null WHERE id = 51");
    console.log('Unblocked user 51 (truongphongtest3)');
    process.exit(0);
})();
