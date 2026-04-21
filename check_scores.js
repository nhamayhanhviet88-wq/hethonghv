const db = require('./db/pool');
(async () => {
    const uid = 2; // nhanvien
    const moduleType = 'dang_banthan_sp';
    const pattern = /đăng.*bản.*thân/i;
    const todayStr = '2026-04-21';
    
    // 1. Find matching lock tasks
    const lockTasks = await db.all("SELECT * FROM lock_tasks WHERE is_active = true");
    const matching = lockTasks.filter(lt => pattern.test(lt.task_name));
    console.log(`Matching lock tasks: ${matching.length}`);
    matching.forEach(lt => {
        console.log(`  id=${lt.id} name="${lt.task_name}" recur=${lt.recurrence_type}/${lt.recurrence_value} min_qty=${lt.min_quantity}`);
        console.log(`  created_at raw:`, lt.created_at, typeof lt.created_at);
        if (lt.created_at) {
            const d = new Date(lt.created_at);
            console.log(`  created_at ISO: ${d.toISOString().split('T')[0]}`);
        }
    });
    
    // 2. Check last 5 days
    const now = new Date(todayStr + 'T00:00:00');
    for (let i = 1; i <= 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dow = d.getDay();
        
        let applies = false;
        for (const lt of matching) {
            // Check created_at
            let taskStart = '';
            if (lt.created_at) {
                const cd = new Date(lt.created_at);
                taskStart = cd.toISOString().split('T')[0];
            }
            const skipCreate = taskStart && dateStr < taskStart;
            
            if (lt.recurrence_type === 'weekly') {
                const wDays = (lt.recurrence_value || '').split(',').map(Number);
                applies = wDays.includes(dow);
            } else if (lt.recurrence_type === 'administrative') {
                applies = dow >= 1 && dow <= 6;
            } else if (lt.recurrence_type === 'daily') {
                applies = true;
            }
            console.log(`  ${dateStr} dow=${dow}: applies=${applies}, taskStart=${taskStart}, skipCreate=${skipCreate}`);
            if (skipCreate) applies = false;
        }
        
        if (!applies) { console.log(`  → SKIP (not applicable)`); continue; }
        
        // Check entries
        const count = await db.get('SELECT COUNT(*) as cnt FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3', [uid, dateStr, moduleType]);
        const cnt = Number(count?.cnt || 0);
        const minQty = matching[0].min_quantity || 1;
        console.log(`  → entries=${cnt}/${minQty}`);
        
        if (cnt >= minQty) { console.log(`  → SKIP (enough entries)`); continue; }
        
        // Check lock completion
        const comp = await db.get("SELECT status FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 ORDER BY id DESC LIMIT 1", [matching[0].id, uid, dateStr]);
        console.log(`  → lockComp=${comp?.status || 'NONE'}`);
        if (comp?.status === 'approved') { console.log(`  → SKIP (approved)`); continue; }
        
        console.log(`  ✅ MISSING DATE!`);
    }
    
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
