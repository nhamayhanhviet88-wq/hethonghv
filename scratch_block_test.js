const db = require('./db/pool');
(async () => {
    // ALL customer_penalty_records for user 52
    const all = await db.all(
        `SELECT id, user_id, penalty_date::text, crm_type, unhandled_count, penalty_amount, created_at::text
         FROM customer_penalty_records WHERE user_id = 52 ORDER BY penalty_date, id`
    );
    console.log('ALL customer_penalty_records for user 52:');
    all.forEach(r => console.log(`  id=${r.id} date=${r.penalty_date} crm=${r.crm_type} count=${r.unhandled_count} amt=${r.penalty_amount} created=${r.created_at}`));
    
    // Check: which ones fall in date range 13/5 - 13/5?
    const filtered = all.filter(r => r.penalty_date === '2026-05-13');
    console.log(`\nFiltered to 2026-05-13: ${filtered.length}`);
    filtered.forEach(r => console.log(`  id=${r.id} crm=${r.crm_type} amt=${r.penalty_amount}`));
    
    // Check KH Trễ specifically - look for tre_ prefix
    const treRecords = all.filter(r => r.crm_type.startsWith('tre_'));
    console.log(`\nAll tre_ records: ${treRecords.length}`);
    treRecords.forEach(r => console.log(`  id=${r.id} date=${r.penalty_date} crm=${r.crm_type}`));

    // Check the penalty_date=14 record that might have leaked
    const d14 = await db.all(
        `SELECT id, user_id, penalty_date::text, crm_type, unhandled_count, penalty_amount
         FROM customer_penalty_records WHERE user_id = 52 AND penalty_date = '2026-05-14'`
    );
    console.log(`\nRecords on 14/5: ${d14.length}`);
    d14.forEach(r => console.log(`  id=${r.id} crm=${r.crm_type} amt=${r.penalty_amount}`));
    
    process.exit();
})();
