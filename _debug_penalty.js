require('dotenv').config();
const db = require('./db/pool');

(async () => {
    try {
        const u = await db.get("SELECT id FROM users WHERE username='nhanvien'");
        
        // Key question: after user acknowledged, does deadline-checker RESET acknowledged back to false?
        // Check records where acknowledged=true but status=expired
        const ackTrue = await db.get(
            `SELECT COUNT(*) as cnt FROM lock_task_completions 
             WHERE user_id = $1 AND status = 'expired' AND acknowledged = true`, [u.id]
        );
        const ackFalse = await db.get(
            `SELECT COUNT(*) as cnt FROM lock_task_completions 
             WHERE user_id = $1 AND status = 'expired' AND acknowledged = false`, [u.id]
        );
        console.log('acknowledged=TRUE expired:', ackTrue.cnt);
        console.log('acknowledged=FALSE expired:', ackFalse.cnt);

        // Check if deadline-checker RESETS acknowledged
        // Look at the same task for consecutive days
        const sample = await db.all(
            `SELECT ltc.id, lt.task_name, ltc.completion_date::text as d, ltc.status, ltc.acknowledged, ltc.redo_count
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = $1 AND lt.task_name = 'CÔNG VIỆC NHÂN VIÊN'
             ORDER BY ltc.completion_date DESC LIMIT 10`, [u.id]
        );
        console.log('\nCONG VIEC NHAN VIEN history:');
        sample.forEach(r => console.log(`  ${r.d} | status:${r.status} | ack:${r.acknowledged} | redo:${r.redo_count}`));

    } catch (e) {
        console.error('ERR:', e.message);
    }
    process.exit(0);
})();
