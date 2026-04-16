const db = require('./db/pool');
(async () => {
    try {
        // Check constraints on consult_type_configs
        const c1 = await db.all(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'consult_type_configs'::regclass
        `);
        console.log('=== consult_type_configs constraints ===');
        c1.forEach(c => console.log(`  ${c.conname}: ${c.def}`));

        // Check indexes
        const i1 = await db.all(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'consult_type_configs'
        `);
        console.log('\n=== consult_type_configs indexes ===');
        i1.forEach(i => console.log(`  ${i.indexname}: ${i.indexdef}`));

        // Check consult_flow_rules constraints
        const c2 = await db.all(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'consult_flow_rules'::regclass
        `);
        console.log('\n=== consult_flow_rules constraints ===');
        c2.forEach(c => console.log(`  ${c.conname}: ${c.def}`));

        // Check if crm_menu column exists
        const cols = await db.all(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'consult_type_configs' AND column_name = 'crm_menu'
        `);
        console.log('\n=== crm_menu column ===');
        console.log(cols.length > 0 ? cols[0] : 'NOT FOUND');

        // Count buttons per crm_menu
        const counts = await db.all(`SELECT crm_menu, COUNT(*) as cnt FROM consult_type_configs GROUP BY crm_menu ORDER BY crm_menu`);
        console.log('\n=== Buttons per crm_menu ===');
        counts.forEach(c => console.log(`  ${c.crm_menu}: ${c.cnt}`));

    } catch(e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
})();
