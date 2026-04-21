// Simulate the missing-dates API logic locally
const db = require('./db/pool');
(async () => {
    const uid = 2;
    const moduleType = 'dang_banthan_sp';
    const pattern = /đăng.*bản.*thân/i;
    
    // Use same _vnToday as server
    const todayStr = (() => { const n = new Date(Date.now() + 7 * 3600000); return n.toISOString().split('T')[0]; })();
    console.log('todayStr:', todayStr);
    
    function _localDateStr(date) {
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }
    
    const lockTasks = await db.all("SELECT * FROM lock_tasks WHERE is_active = true");
    const matchingLTs = lockTasks.filter(lt => pattern.test(lt.task_name));
    console.log('Matching:', matchingLTs.length, matchingLTs.map(lt => `id=${lt.id} "${lt.task_name}" recur=${lt.recurrence_type}/${lt.recurrence_value}`));
    
    for (let i = 1; i <= 5; i++) {
        const [y, m, dd] = todayStr.split('-').map(Number);
        const d = new Date(y, m - 1, dd - i);
        const dateStr = _localDateStr(d);
        const dow = d.getDay();
        
        let applies = false;
        for (const lt of matchingLTs) {
            if (lt.created_at) {
                const ca = new Date(lt.created_at);
                const caStr = _localDateStr(ca);
                if (dateStr < caStr) { console.log(`  ${dateStr} dow=${dow}: SKIP (before created ${caStr})`); continue; }
            }
            if (lt.recurrence_type === 'weekly') {
                const wDays = (lt.recurrence_value || '').split(',').map(Number);
                applies = wDays.includes(dow);
            }
        }
        
        if (!applies) { console.log(`  ${dateStr} dow=${dow}: NOT applicable (weekly=${matchingLTs[0]?.recurrence_value})`); continue; }
        
        const count = await db.get('SELECT COUNT(*) as cnt FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3', [uid, dateStr, moduleType]);
        const cnt = Number(count?.cnt || 0);
        console.log(`  ${dateStr} dow=${dow}: APPLIES! entries=${cnt}`);
        
        if (cnt >= 1) { console.log(`    → SKIP (enough)`); continue; }
        
        const comp = await db.get("SELECT status FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 ORDER BY id DESC LIMIT 1", [matchingLTs[0].id, uid, dateStr]);
        console.log(`    → lockComp=${comp?.status || 'NONE'}`);
        if (comp?.status === 'approved') { console.log(`    → SKIP (approved)`); continue; }
        
        console.log(`    ✅ MISSING!`);
    }
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
