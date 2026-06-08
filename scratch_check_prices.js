const db = require('./db/pool');

async function main() {
    try {
        console.log("=== BGM ITEMS (BẢNG GIÁ MAY) ===");
        const bgm = await db.all(`SELECT id, name, group_name, factory_price, processing_price FROM bgm_items LIMIT 10`);
        console.log(bgm);

        console.log("\n=== TSAM SAMPLES (THÔNG SỐ ÁO MẪU) ===");
        const tsam = await db.all(`SELECT id, sample_code, factory_price, processing_price FROM tsam_samples LIMIT 10`);
        console.log(tsam);

        console.log("\n=== PRODUCTS (SẢN PHẨM) ===");
        const products = await db.all(`SELECT id, name FROM dht_products LIMIT 10`);
        console.log(products);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
