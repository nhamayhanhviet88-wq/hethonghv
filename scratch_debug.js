const db = require('./db/pool');
(async () => {
    // Check exact pattern_name vs sample_code
    const item = await db.get("SELECT pattern_name FROM dht_order_items WHERE id=3");
    const tsam = await db.get("SELECT sample_code FROM tsam_samples WHERE sample_code ILIKE '%CỔ BẺ DỆT%' LIMIT 1");
    
    console.log('Item pattern_name:', JSON.stringify(item.pattern_name));
    console.log('TSAM sample_code:', JSON.stringify(tsam.sample_code));
    console.log('Exact match:', item.pattern_name === tsam.sample_code);
    
    // Check with hex to see hidden chars
    console.log('Pattern hex:', Buffer.from(item.pattern_name, 'utf-8').toString('hex'));
    console.log('TSAM hex:   ', Buffer.from(tsam.sample_code, 'utf-8').toString('hex'));

    // Try the actual JOIN
    const joined = await db.get(`
        SELECT i.pattern_name, ts.factory_price, ts.processing_price
        FROM dht_order_items i
        LEFT JOIN tsam_samples ts ON ts.sample_code = i.pattern_name
        WHERE i.id = 3
    `);
    console.log('JOIN result:', JSON.stringify(joined));
    
    process.exit(0);
})();
