/**
 * Fix self-search assignments stuck with call_status = 'pending'
 * These were created before the new code that sets call_status = 'answered'
 */
const db = require('./db/pool');

async function fix() {
    // Find all self-search assignments that are still 'pending'
    const pending = await db.all(`
        SELECT a.id, a.data_id, a.user_id, a.assigned_date, a.call_status,
               d.customer_name, d.phone, d.self_searched_by
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        WHERE d.self_searched_by IS NOT NULL
          AND a.call_status = 'pending'
        ORDER BY a.id DESC
    `);

    console.log(`Found ${pending.length} self-search assignments with 'pending' status:`);
    pending.forEach(p => {
        console.log(`  ID=${p.id} data_id=${p.data_id} user=${p.user_id} date=${p.assigned_date} customer="${p.customer_name}" phone=${p.phone}`);
    });

    if (pending.length === 0) {
        console.log('Nothing to fix!');
        process.exit(0);
    }

    // Find the first 'transfer' answer_status_id as default
    const transferStatus = await db.get("SELECT id, name FROM telesale_answer_statuses WHERE action_type = 'transfer' ORDER BY display_order LIMIT 1");
    console.log(`\nDefault transfer answer_status: id=${transferStatus?.id} name="${transferStatus?.name}"`);

    if (!transferStatus) {
        console.log('❌ No transfer answer_status found! Cannot fix.');
        process.exit(1);
    }

    // Update all pending self-search assignments to answered + transfer
    for (const p of pending) {
        await db.run(
            `UPDATE telesale_assignments SET call_status = 'answered', answer_status_id = $1, called_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [transferStatus.id, p.id]
        );
        // Also update the telesale_data status
        await db.run(
            `UPDATE telesale_data SET status = 'answered', updated_at = NOW() WHERE id = $1 AND status = 'assigned'`,
            [p.data_id]
        );
        console.log(`  ✅ Fixed assignment ${p.id} → answered + ${transferStatus.name}`);
    }

    console.log(`\n✅ Done! Fixed ${pending.length} assignments.`);
    process.exit(0);
}

fix().catch(e => { console.error('❌ Error:', e); process.exit(1); });
