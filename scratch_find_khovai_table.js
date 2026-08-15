const db = require('./db/pool');

(async () => {
    try {
        console.log('--- SEARCHING FOR "POLY THÁI" OR "279" IN ALL TABLES ---');
        
        // Search kv_fabric_colors
        const kvFc = await db.all(`SELECT * FROM kv_fabric_colors WHERE color_name ILIKE '%poly%' OR notes ILIKE '%poly%' LIMIT 10`);
        console.log('kv_fabric_colors:', kvFc);

        // Search kv_materials
        const kvMat = await db.all(`SELECT * FROM kv_materials WHERE name ILIKE '%poly%' LIMIT 10`);
        console.log('kv_materials:', kvMat);

        // Search fabric_transactions
        const fabTx = await db.all(`SELECT * FROM fabric_transactions WHERE material_name ILIKE '%poly%' OR color_name ILIKE '%poly%' LIMIT 10`);
        console.log('fabric_transactions:', fabTx);

        // Check if there is a table storing fabric inventory balances like kv_cut_orders, kv_fabric_rolls, etc.
        const allTables = await db.all(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'kv_%' OR table_name LIKE '%fabric%' OR table_name LIKE '%kho%'`);
        console.log('KHO VẢI TABLES:', allTables.map(t => t.table_name));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
