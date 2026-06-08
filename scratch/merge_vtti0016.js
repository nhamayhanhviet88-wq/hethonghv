const db = require('../db/pool');

async function main() {
    await db.init();
    try {
        console.log('--- STARTING MERGE FOR CTV-VTTI0016 ---');
        
        // Fetch the two records to double check
        const rec3 = await db.get("SELECT * FROM pressing_records WHERE id = 3");
        const rec4 = await db.get("SELECT * FROM pressing_records WHERE id = 4");
        
        if (!rec3 || !rec4) {
            console.error("Error: Could not find pressing_records with ID 3 and/or 4.");
            process.exit(1);
        }

        console.log("Record 3:", JSON.stringify(rec3, null, 2));
        console.log("Record 4:", JSON.stringify(rec4, null, 2));

        // Parse images
        let images3 = [];
        try { images3 = JSON.parse(rec3.press_images || '[]'); } catch(e) { images3 = []; }
        let images4 = [];
        try { images4 = JSON.parse(rec4.press_images || '[]'); } catch(e) { images4 = []; }
        
        // Combine images and remove duplicates
        const combinedImages = [...new Set([...images3, ...images4])];

        // Combine fields
        const newProductName = 'CTV-VTTI0016 — Phiếu 1 — ÁO CỔ BẺ';
        const newFabricColor = 'Bích, Bò';
        const newPressQty = (Number(rec3.press_quantity) || 0) + (Number(rec4.press_quantity) || 0); // 34 + 198 = 232
        const newPosChestArm = (Number(rec3.pos_chest_arm) || 0) + (Number(rec4.pos_chest_arm) || 0); // 20 + 99 = 119
        const newPosBackBelly = (Number(rec3.pos_back_belly) || 0) + (Number(rec4.pos_back_belly) || 0); // 20 + 99 = 119
        const newPosProtective = (Number(rec3.pos_protective) || 0) + (Number(rec4.pos_protective) || 0); // 0
        const newPosPackaging = (Number(rec3.pos_packaging) || 0) + (Number(rec4.pos_packaging) || 0); // 34
        
        // pos_other is text in pressing_records.
        // Let's sum if numeric, otherwise concatenate or take the non-zero one.
        const val3 = parseFloat(rec3.pos_other) || 0;
        const val4 = parseFloat(rec4.pos_other) || 0;
        const newPosOther = (val3 + val4).toString(); // '4' + '0' -> '4'

        console.log("\n--- Combined Values ---");
        console.log("Product Name:", newProductName);
        console.log("Colors:", newFabricColor);
        console.log("Press Qty:", newPressQty);
        console.log("Chest/Arm:", newPosChestArm);
        console.log("Back/Belly:", newPosBackBelly);
        console.log("Protective:", newPosProtective);
        console.log("Packaging:", newPosPackaging);
        console.log("Other:", newPosOther);
        console.log("Images:", combinedImages);

        await db.run("BEGIN");

        // 1. Update record 3
        await db.run(`
            UPDATE pressing_records
            SET product_name = $1,
                fabric_color = $2,
                press_quantity = $3,
                pos_chest_arm = $4,
                pos_back_belly = $5,
                pos_protective = $6,
                pos_packaging = $7,
                pos_other = $8,
                press_images = $9,
                updated_at = NOW()
            WHERE id = 3
        `, [
            newProductName,
            newFabricColor,
            newPressQty,
            newPosChestArm,
            newPosBackBelly,
            newPosProtective,
            newPosPackaging,
            newPosOther,
            JSON.stringify(combinedImages)
        ]);

        // 2. Re-assign pressing_history of record 4 to record 3
        await db.run(`
            UPDATE pressing_history
            SET pressing_id = 3,
                details = details || ' (Gộp từ bản ghi phối 2 cũ)'
            WHERE pressing_id = 4
        `);

        // 3. Delete record 4
        await db.run("DELETE FROM pressing_records WHERE id = 4");

        // 4. Insert log history for the merge itself
        await db.run(`
            INSERT INTO pressing_history (pressing_id, action, details, performed_by, performed_at)
            VALUES (3, 'merge', 'Gộp bản ghi phối P1 và P2 của đơn CTV-VTTI0016 thành một dòng duy nhất.', 1, NOW())
        `);

        await db.run("COMMIT");
        console.log("\nSuccessfully merged pressing records 3 and 4.");

    } catch (e) {
        await db.run("ROLLBACK");
        console.error("Error during merge:", e);
    } finally {
        process.exit();
    }
}

main();
