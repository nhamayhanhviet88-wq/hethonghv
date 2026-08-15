const db = require('./db/pool');

(async () => {
    try {
        console.log('--- SEARCHING FOR 5.21 OR 40.00 IN ALL TABLES ---');
        
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
                    if (['text', 'character varying', 'numeric', 'double precision', 'real'].includes(c.data_type)) {
                        const check = await db.all(`
                            SELECT "${c.column_name}" 
                            FROM "${tableName}" 
                            WHERE CAST("${c.column_name}" AS TEXT) LIKE '%5.21%' OR CAST("${c.column_name}" AS TEXT) LIKE '%40.00%' OR CAST("${c.column_name}" AS TEXT) LIKE '%40%'
                            LIMIT 1
                        `);
                        if (check.length > 0) {
                            console.log(`FOUND IN TABLE: ${tableName}, COLUMN: ${c.column_name}`);
                            const allRows = await db.all(`SELECT * FROM "${tableName}" LIMIT 10`);
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
