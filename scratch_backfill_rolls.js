const db = require('./db/pool');
(async () => {
    await db.init();
    
    // Check current state
    const txs = await db.all('SELECT t.fabric_color_id, t.tx_type, t.quantity, fc.color_name FROM kv_transactions t JOIN kv_fabric_colors fc ON fc.id = t.fabric_color_id ORDER BY t.created_at');
    console.log('Transactions:', JSON.stringify(txs, null, 2));
    
    const rolls = await db.all('SELECT * FROM kv_rolls');
    console.log('Rolls:', JSON.stringify(rolls, null, 2));

    // Backfill: For each fabric_color that has NHAP transactions but no rolls,
    // create a roll with the net balance (NHAP - XUAT)
    const orphans = await db.all(`
        SELECT fc.id AS fcid, fc.color_name,
               COALESCE(SUM(CASE WHEN t.tx_type='NHAP' THEN t.quantity ELSE 0 END), 0) AS total_nhap,
               COALESCE(SUM(CASE WHEN t.tx_type='XUAT' THEN t.quantity ELSE 0 END), 0) AS total_xuat
        FROM kv_fabric_colors fc
        LEFT JOIN kv_transactions t ON t.fabric_color_id = fc.id
        WHERE fc.id NOT IN (SELECT DISTINCT fabric_color_id FROM kv_rolls WHERE is_returned = false)
        GROUP BY fc.id, fc.color_name
        HAVING COALESCE(SUM(CASE WHEN t.tx_type='NHAP' THEN t.quantity ELSE 0 END), 0) > 0
    `);
    
    console.log('\nOrphans (transactions without rolls):', orphans.length);
    for (const o of orphans) {
        const balance = Number(o.total_nhap) - Number(o.total_xuat);
        if (balance > 0) {
            console.log(`  Backfilling: ${o.color_name} (fcid=${o.fcid}) -> 1 roll of ${balance}`);
            await db.run(
                'INSERT INTO kv_rolls (fabric_color_id, weight, source, note, created_by) VALUES ($1, $2, $3, $4, $5)',
                [o.fcid, balance, 'nhap_moi', 'Backfill từ transaction cũ', 1]
            );
        }
    }
    
    console.log('\nDone!');
    process.exit();
})();
