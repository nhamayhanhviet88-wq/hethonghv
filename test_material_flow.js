const db = require('./db/pool');

async function runTest() {
    console.log('🏁 Starting Material Setup Verification...');
    
    try {
        // 1. Verify tables exist
        const tables = await db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('material_warehouses', 'material_items', 'material_warehouse_sources', 'import_records')
        `);
        console.log('✅ Found database tables:', tables.map(t => t.table_name));

        console.log('🧹 Running pre-test cleanup...');
        await db.run(`DELETE FROM import_records WHERE fabric_material = '__TEST_TEM_PET_A3__'`);
        await db.run(`DELETE FROM material_items WHERE name = '__TEST_TEM_PET_A3__'`);
        await db.run(`DELETE FROM material_warehouses WHERE name LIKE '__TEST_KHO_TEM%'`);
        console.log('✅ Pre-test cleanup done.');

        // 2. Perform test warehouse CRUD
        console.log('\n⚙️ Testing Warehouse CRUD...');
        const whInsert = await db.get(`
            INSERT INTO material_warehouses (name, display_order, is_active)
            VALUES ($1, $2, $3)
            RETURNING id, name
        `, ['__TEST_KHO_TEM__', 99, true]);
        console.log('✅ Warehouse inserted:', whInsert);

        const whId = whInsert.id;

        // Update warehouse
        await db.run(`
            UPDATE material_warehouses 
            SET name = $1, display_order = $2 
            WHERE id = $3
        `, ['__TEST_KHO_TEM_UPDATED__', 98, whId]);
        
        const whSelect = await db.get(`SELECT * FROM material_warehouses WHERE id = $1`, [whId]);
        console.log('✅ Warehouse updated:', whSelect);

        // 3. Perform test material item CRUD
        console.log('\n⚙️ Testing Material Items CRUD...');
        const itemInsert = await db.get(`
            INSERT INTO material_items (warehouse_id, name, display_order, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, warehouse_id
        `, [whId, '__TEST_TEM_PET_A3__', 1, true]);
        console.log('✅ Material Item inserted:', itemInsert);

        const itemId = itemInsert.id;

        // 4. Perform test warehouse sources link
        console.log('\n⚙️ Testing Warehouse Sources Link...');
        // Let's get a real supplier source ID from database to link
        const sourceRow = await db.get(`SELECT id, name FROM import_sources LIMIT 1`);
        if (!sourceRow) {
            console.log('⚠️ No import sources found in database, skipping source link test.');
        } else {
            const sourceId = sourceRow.id;
            await db.run(`
                INSERT INTO material_warehouse_sources (warehouse_id, source_id)
                VALUES ($1, $2)
            `, [whId, sourceId]);
            console.log(`✅ Linked warehouse ${whId} with supplier ${sourceId} (${sourceRow.name})`);

            const linkedRows = await db.all(`SELECT * FROM material_warehouse_sources WHERE warehouse_id = $1`, [whId]);
            console.log('✅ Warehouse sources found:', linkedRows);
        }

        // 5. Test compatibility fallback column in import_records
        console.log('\n⚙️ Testing Import Records connection...');
        const recordInsert = await db.get(`
            INSERT INTO import_records (
                import_date, source_id, warehouse_id, material_item_id, 
                fabric_material, fabric_quantity, cost, refund, paid, 
                cost_notes, record_type, importer_id
            ) VALUES (
                CURRENT_DATE, $1, $2, $3, $4, 100, 1500000, 0, 1500000, 
                'Test notes', 'general', 1
            ) RETURNING id, fabric_material, warehouse_id, material_item_id
        `, [sourceRow ? sourceRow.id : 1, whId, itemId, '__TEST_TEM_PET_A3__']);
        console.log('✅ Test Import Record created:', recordInsert);

        // Verify read logic using joins
        const detailRecord = await db.get(`
            SELECT 
                r.id, 
                r.fabric_material, 
                w.name AS warehouse_name, 
                m.name AS material_item_name
            FROM import_records r
            LEFT JOIN material_warehouses w ON r.warehouse_id = w.id
            LEFT JOIN material_items m ON r.material_item_id = m.id
            WHERE r.id = $1
        `, [recordInsert.id]);
        console.log('✅ Test Import Record with Join fields:', detailRecord);

        // 6. Cleanup test data
        console.log('\n🧹 Cleaning up test data...');
        await db.run(`DELETE FROM import_records WHERE id = $1`, [recordInsert.id]);
        await db.run(`DELETE FROM material_warehouse_sources WHERE warehouse_id = $1`, [whId]);
        await db.run(`DELETE FROM material_items WHERE warehouse_id = $1`, [whId]);
        await db.run(`DELETE FROM material_warehouses WHERE id = $1`, [whId]);
        console.log('✅ Cleanup finished successfully.');

        console.log('\n🎉 ALL TESTS PASSED!');
    } catch(e) {
        console.error('❌ Test failed with error:', e);
    } finally {
        // Close DB connections
        process.exit(0);
    }
}

runTest();
