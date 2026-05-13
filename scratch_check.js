const db = require('./db/pool');
(async () => {
    // Unblock all users blocked today (13/05) due to KH chưa XL
    const blocked = await db.all("SELECT id, username, access_blocked_reason FROM users WHERE access_blocked = true");
    console.log('Currently blocked users:', blocked.length);
    
    for (const u of blocked) {
        let reasons = [];
        try { reasons = JSON.parse(u.access_blocked_reason || '[]'); } catch(e) {}
        
        // Filter out "KH chưa xử lý" penalties from today (these shouldn't have blocked)
        const todayStr = '2026-05-13';
        const filtered = reasons.filter(r => !(r.task_date === todayStr && r.task_name && r.task_name.startsWith('KH chưa xử lý:')));
        
        if (filtered.length < reasons.length) {
            if (filtered.length === 0) {
                // No more reasons -> unblock completely
                await db.run("UPDATE users SET access_blocked = false, access_blocked_at = NULL, access_blocked_reason = NULL WHERE id = $1", [u.id]);
                console.log(`  ✅ Unblocked ${u.username} (id=${u.id}) — removed ${reasons.length - filtered.length} invalid KH penalties`);
            } else {
                // Still has other reasons -> keep blocked but remove invalid ones
                await db.run("UPDATE users SET access_blocked_reason = $2 WHERE id = $1", [u.id, JSON.stringify(filtered)]);
                console.log(`  ⚠️ Cleaned ${u.username} (id=${u.id}) — removed ${reasons.length - filtered.length} invalid, ${filtered.length} remain`);
            }
        }
    }
    
    process.exit(0);
})();
