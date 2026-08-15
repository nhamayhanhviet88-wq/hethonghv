const db = require('./db/pool');

async function testCoBeDetQuery() {
    const sql = `
        SELECT sample_code, factory_price, processing_price, collection, approval_status
        FROM tsam_samples
        WHERE sample_code ILIKE '%CỔ BẺ DỆT%' AND is_active = true
    `;
    const rows = await db.all(sql);
    console.log('--- TEST THÔNG SỐ MẪU ÁO SQL RESULT ---');
    console.log(rows);
}

testCoBeDetQuery().then(() => process.exit(0));
