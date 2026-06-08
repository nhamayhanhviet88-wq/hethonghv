const db = require('../db/pool');
(async () => {
    try {
        console.log('=== Constraints for kv_rolls ===');
        const kvConstraints = await db.all(`
            SELECT
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name='kv_rolls'
        `);
        console.log(JSON.stringify(kvConstraints, null, 2));

        console.log('\n=== Constraints for import_records ===');
        const importConstraints = await db.all(`
            SELECT
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name='import_records'
        `);
        console.log(JSON.stringify(importConstraints, null, 2));

        console.log('\n=== Check if any custom check constraints exist ===');
        const checkConstraints = await db.all(`
            SELECT tc.constraint_name, tc.table_name, cc.check_clause
            FROM information_schema.table_constraints tc
            JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name IN ('kv_rolls', 'import_records', 'kv_transactions')
        `);
        console.log(JSON.stringify(checkConstraints, null, 2));

    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
})();
