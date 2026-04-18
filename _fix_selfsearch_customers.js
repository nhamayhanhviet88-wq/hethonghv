/**
 * Fix existing self-search customers missing consultation_logs and appointment_date
 * These were created before the RETURNING id fix
 */
const db = require('./db/pool');
const { getNextWorkingDay } = require('./utils/workingDay');

async function fix() {
    // Find self-search customers (crm_type=tu_tim_kiem, created today by self_search flow)
    // that DON'T have any consultation_logs
    const today = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
    
    const orphans = await db.all(`
        SELECT c.id, c.customer_name, c.phone, c.assigned_to_id, c.appointment_date, c.created_at
        FROM customers c
        WHERE c.crm_type = 'tu_tim_kiem'
          AND NOT EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = c.id)
        ORDER BY c.id DESC
        LIMIT 50
    `);

    console.log(`Found ${orphans.length} CRM TTK customers WITHOUT consultation_logs:`);
    orphans.forEach(c => {
        console.log(`  ID=${c.id} name="${c.customer_name}" phone=${c.phone} appt=${c.appointment_date} assigned_to=${c.assigned_to_id}`);
    });

    if (orphans.length === 0) {
        console.log('Nothing to fix!');
        process.exit(0);
    }

    const vnNow = new Date(Date.now() + 7 * 3600000);

    for (const c of orphans) {
        // 1. Create consultation_log
        await db.run(
            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES ($1, 'goi_dien', $2, $3)`,
            [c.id, '🔥 Có nhu cầu — Chuyển số (tự tìm kiếm)', c.assigned_to_id]
        );
        console.log(`  ✅ Created consultation_log for customer ${c.id} "${c.customer_name}"`);

        // 2. Set appointment_date if missing
        if (!c.appointment_date) {
            const nextWorkDay = await getNextWorkingDay(vnNow, c.assigned_to_id);
            await db.run(
                `UPDATE customers SET appointment_date = $1 WHERE id = $2`,
                [nextWorkDay, c.id]
            );
            console.log(`  📅 Set appointment_date = ${nextWorkDay} for customer ${c.id}`);
        }
    }

    console.log(`\n✅ Done! Fixed ${orphans.length} customers.`);
    process.exit(0);
}

fix().catch(e => { console.error('❌ Error:', e); process.exit(1); });
