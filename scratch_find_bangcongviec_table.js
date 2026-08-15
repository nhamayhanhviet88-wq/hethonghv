const db = require('./db/pool');

(async () => {
    try {
        console.log('--- SEARCHING FOR "CV-034" OR "qlmkt1" IN ALL TABLES ---');

        const tables = await db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        for (const t of tables) {
            const tableName = t.table_name;
            try {
                const cols = await db.all(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                `, [tableName]);
                
                for (const c of cols) {
                    if (['text', 'character varying'].includes(c.data_type)) {
                        const check = await db.all(`
                            SELECT "${c.column_name}" 
                            FROM "${tableName}" 
                            WHERE "${c.column_name}" ILIKE '%CV-034%' OR "${c.column_name}" ILIKE '%qlmkt1%'
                            LIMIT 1
                        `);
                        if (check.length > 0) {
                            console.log(`FOUND IN TABLE: ${tableName}, COLUMN: ${c.column_name}`);
                            const allRows = await db.all(`SELECT * FROM "${tableName}" LIMIT 5`);
                            console.log(allRows);
                        }
                    }
                }
            } catch(e) {
                // ignore
            }
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
