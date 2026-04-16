const db = require('./db/pool');
(async () => {
    for (const menu of ['ctv', 'affiliate', 'tu_tim_kiem']) {
        const rules = await db.all(`SELECT id, from_status, to_type_key, is_default, crm_menu 
            FROM consult_flow_rules WHERE crm_menu = '${menu}' ORDER BY from_status, to_type_key`);
        console.log(`\n=== ${menu} (${rules.length} rules) ===`);
        
        // Find duplicates
        const seen = {};
        const dupes = [];
        for (const r of rules) {
            const key = `${r.from_status}->${r.to_type_key}`;
            if (seen[key]) {
                dupes.push(r.id);
                console.log(`  DUP id=${r.id}: ${key}`);
            } else {
                seen[key] = r.id;
                console.log(`  OK  id=${r.id}: ${key}`);
            }
        }
        console.log(`  Duplicates to delete: ${dupes.length} (IDs: ${dupes.join(',')})`);
    }
    process.exit(0);
})();
