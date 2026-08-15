const db = require('./db/pool');

async function testCoBeDet() {
    const rows = await db.all(`
        SELECT sample_code, factory_price, processing_price, collection, approval_status
        FROM tsam_samples
        WHERE sample_code ILIKE '%CỔ BẺ DỆT%' OR sample_code ILIKE '%BO TAY DỆT%'
    `);
    console.log('--- TSAM_SAMPLES SEARCH RESULT FOR CỔ BẺ DỆT ---');
    console.log(rows);
}

testCoBeDet().then(() => process.exit(0));
