const db = require('./db/pool');
(async () => {
    // Reset acknowledged for quanly1's expired penalties
    await db.run("UPDATE lock_task_completions SET acknowledged = false WHERE user_id = 4 AND status = 'expired'");
    console.log('Done: reset acknowledged for quanly1 expired records');
    
    // Also set quanly1 to locked so we can test
    await db.run("UPDATE users SET status = 'locked' WHERE id = 4");
    console.log('Done: set quanly1 status = locked');
    
    // Verify
    const count = await db.get("SELECT COUNT(*) as cnt FROM lock_task_completions WHERE user_id = 4 AND status = 'expired' AND acknowledged = false");
    console.log('Unacknowledged expired penalties:', count.cnt);
    
    process.exit(0);
})();
