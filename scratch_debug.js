const db = require('./db/pool');
(async () => {
    const tsam = await db.all("SELECT sample_code, factory_price, processing_price, sewing_tech FROM tsam_samples LIMIT 3");
    console.log(JSON.stringify(tsam, null, 2));
    process.exit(0);
})();
