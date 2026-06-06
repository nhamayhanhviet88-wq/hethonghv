const db = require('d:/0 - Google Antigravity/11 - NHAN VIEN KINH DOANH - Copy/db/pool');

async function check() {
    try {
        await db.init();
        
        console.log('--- Warehouses ---');
        const whs = await db.all("SELECT id, name FROM material_warehouses");
        console.log(whs);

        console.log('--- Material Items ---');
        const items = await db.all("SELECT id, name, warehouse_id, is_active FROM material_items");
        console.log(items);

        console.log('--- Material Transactions ---');
        const txs = await db.all("SELECT * FROM material_transactions LIMIT 20");
        console.log(txs);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
