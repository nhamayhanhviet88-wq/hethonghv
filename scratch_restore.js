const db = require('./db/pool');

async function main() {
    try {
        console.log("Connecting to DB...");
        await db.init();

        const now = new Date().toISOString(); // Or vnNow format if needed, but ISO string works fine for PG

        // 1. Update cutting_records 9 (VTTI0003)
        console.log("Restoring cutting record 9...");
        await db.run(`
            UPDATE cutting_records 
            SET is_cut_done = true,
                cut_done_at = '2026-06-02T11:22:28.000Z',
                cut_done_by = 8,
                cut_quantity = 100,
                kg_end = 2.0,
                kg_cut = 18.0,
                cut_ratio = 0.18,
                updated_at = $1
            WHERE id = 9
        `, [now]);

        // 2. Update cutting_records 6 (AFF-VTTI0010)
        console.log("Restoring cutting record 6...");
        await db.run(`
            UPDATE cutting_records 
            SET is_cut_done = true,
                cut_done_at = '2026-06-02T11:22:28.000Z',
                cut_done_by = 8,
                cut_quantity = 100,
                kg_end = 2.0,
                kg_cut = 18.0,
                cut_ratio = 0.18,
                updated_at = $1
            WHERE id = 6
        `, [now]);

        // 3. Update kv_rolls (Roll 18 -> 2kg, Roll 14 -> 0kg, both unlocked)
        console.log("Updating fabric rolls...");
        await db.run("UPDATE kv_rolls SET weight = 2.0, locked_by_cutting_id = NULL WHERE id = 18");
        await db.run("UPDATE kv_rolls SET weight = 0.0, locked_by_cutting_id = NULL WHERE id = 14");

        // 4. Add to history
        console.log("Writing history logs...");
        await db.run(`
            INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at)
            VALUES (9, 'restore', 'Khôi phục trạng thái cắt xong từ yêu cầu của admin (sửa lỗi do ấn nhầm)', 8, $1)
        `, [now]);
        await db.run(`
            INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at)
            VALUES (6, 'restore', 'Khôi phục trạng thái cắt xong từ yêu cầu của admin (sửa lỗi do ấn nhầm)', 8, $1)
        `, [now]);

        console.log("Restoration completed successfully!");

    } catch (e) {
        console.error("Error during restoration:", e);
    } finally {
        await db.close();
    }
}

main();
