require('dotenv').config();
const db = require('./db/pool');

async function manualRecall() {
    await db.init();
    
    const today = new Date().toISOString().split('T')[0];
    // Recall everything BEFORE today (keep today's assignments intact)
    console.log(`\n🔄 Thu hồi data assigned trước ngày ${today}...\n`);

    // 1. Count what we'll recall
    const before = await db.all(`
        SELECT d.status, COUNT(*) as count
        FROM telesale_data d WHERE d.status = 'assigned'
        GROUP BY d.status
    `);
    console.log('=== TRƯỚC KHI THU HỒI ===');
    console.table(before);

    // 2. Get all assignments from BEFORE today that are still pending
    const pendingOld = await db.all(`
        SELECT a.id, a.data_id, a.assigned_date, a.call_status, a.user_id
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        WHERE a.assigned_date < $1 AND a.call_status = 'pending' AND d.status = 'assigned'
    `, [today]);
    console.log(`\n📋 Pending cũ (trước ${today}): ${pendingOld.length} records`);

    // 3. Get no_answer/busy from before today
    const noAnswerOld = await db.all(`
        SELECT a.id, a.data_id, a.assigned_date, a.call_status
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        WHERE a.assigned_date < $1 AND a.call_status IN ('no_answer', 'busy') AND d.status = 'assigned'
    `, [today]);
    console.log(`📋 No answer/busy cũ: ${noAnswerOld.length} records`);

    // 4. Get invalid from before today
    const invalidOld = await db.all(`
        SELECT a.id, a.data_id, a.assigned_date
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        WHERE a.assigned_date < $1 AND a.call_status = 'invalid' AND d.status = 'assigned'
    `, [today]);
    console.log(`📋 Invalid cũ: ${invalidOld.length} records`);

    // 5. Execute recall
    let recalled = 0, invalidated = 0;

    // Pending → available
    for (const a of pendingOld) {
        await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ? AND status = 'assigned'", [a.data_id]);
        recalled++;
    }
    console.log(`\n✅ Thu hồi pending → available: ${recalled}`);

    // No answer/busy → available
    let recalledNAB = 0;
    for (const a of noAnswerOld) {
        await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ? AND status = 'assigned'", [a.data_id]);
        recalledNAB++;
    }
    console.log(`✅ Thu hồi no_answer/busy → available: ${recalledNAB}`);

    // Invalid → delete
    for (const a of invalidOld) {
        await db.run('DELETE FROM telesale_assignments WHERE data_id = ?', [a.data_id]);
        await db.run('DELETE FROM telesale_data WHERE id = ?', [a.data_id]);
        invalidated++;
    }
    console.log(`✅ Xóa invalid: ${invalidated}`);

    // 6. Verify after
    const after = await db.all(`
        SELECT d.status, COUNT(*) as count
        FROM telesale_data d
        GROUP BY d.status
        ORDER BY count DESC
    `);
    console.log('\n=== SAU KHI THU HỒI ===');
    console.table(after);

    const totalRecalled = recalled + recalledNAB;
    console.log(`\n🎉 TỔNG KẾT: Thu hồi ${totalRecalled} SĐT → available, Xóa ${invalidated} invalid`);

    process.exit(0);
}
manualRecall().catch(e => { console.error(e); process.exit(1); });
