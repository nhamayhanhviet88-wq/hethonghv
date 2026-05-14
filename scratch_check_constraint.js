const db = require('./db/pool');
(async () => {
    // Drop old constraint and add new one with ql_expired
    await db.run(`ALTER TABLE task_support_requests DROP CONSTRAINT IF EXISTS task_support_requests_status_check`);
    await db.run(`ALTER TABLE task_support_requests ADD CONSTRAINT task_support_requests_status_check CHECK (status IN ('pending', 'supported', 'expired', 'resolved', 'ql_expired'))`);
    console.log('✅ Constraint updated — ql_expired added');
    
    // Verify
    const r = await db.all(`SELECT conname, pg_get_constraintdef(c.oid) as def 
        FROM pg_constraint c 
        JOIN pg_class t ON c.conrelid = t.oid 
        WHERE t.relname = 'task_support_requests' AND c.contype = 'c'`);
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
})();
