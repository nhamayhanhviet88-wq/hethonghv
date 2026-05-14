const db = require('./db/pool');
(async () => {
    // Check ALL days for dept 1 — find any day with total > 100
    for (let dow = 1; dow <= 7; dow++) {
        const templates = await db.all(`
            SELECT t.id, t.task_name, t.points, t.time_start, t.time_end
            FROM task_point_templates t
            WHERE t.target_type = 'team' AND t.target_id = 1 AND t.day_of_week = $1
            ORDER BY t.time_start, t.id
        `, [dow]);
        const total = templates.reduce((s, t) => s + t.points, 0);
        const dayNames = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const flag = total > 100 ? ' ⚠️ OVER' : (total === 100 ? ' ✅' : ` (${total}đ)`);
        console.log(`${dayNames[dow]}: ${total}/100đ${flag} — ${templates.length} templates`);
        
        // Check for duplicate slots (same time_start+time_end, multiple tasks)
        const slotMap = {};
        templates.forEach(t => {
            const key = `${t.time_start}-${t.time_end}`;
            if (!slotMap[key]) slotMap[key] = [];
            slotMap[key].push(t);
        });
        for (const [slot, tasks] of Object.entries(slotMap)) {
            if (tasks.length > 1) {
                console.log(`  ⚠️ DUPLICATE SLOT [${slot}]:`);
                tasks.forEach(t => console.log(`    ID=${t.id} "${t.task_name}" = ${t.points}đ`));
            }
        }
    }
    process.exit(0);
})();
