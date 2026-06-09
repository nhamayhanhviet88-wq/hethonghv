const db = require('./db/pool');

async function main() {
    try {
        console.log("Starting DB update for existing unapproved sewing records...");
        
        // Query active (unapproved) records and their associated technique and pricing details
        const query = `
            SELECT sr.id, sr.contractor_id, sr.base_price AS old_base_price, sr.quantity, sr.salary_approved,
                   oi.sewing_techniques, oi.pattern_name,
                   ts.factory_price AS ts_factory_price, ts.processing_price AS ts_processing_price
            FROM sewing_records sr
            JOIN dht_order_items oi ON sr.order_item_id = oi.id
            LEFT JOIN tsam_samples ts ON oi.pattern_name = ts.sample_code AND ts.is_active = true
            WHERE sr.salary_approved IS NOT TRUE
        `;
        
        const records = await db.all(query);
        console.log(`Found ${records.length} unapproved sewing records to analyze.`);

        let updatedCount = 0;
        for (const r of records) {
            if (!r.pattern_name) {
                console.log(`Record #${r.id} has no pattern name, skipping.`);
                continue;
            }

            const isGiaCong = r.contractor_id !== null && r.contractor_id !== undefined;
            const factoryPrice = Number(r.ts_factory_price) || 0;
            const processingPrice = Number(r.ts_processing_price) || 0;

            if (factoryPrice === 0 && processingPrice === 0) {
                console.log(`Record #${r.id}: pattern pricing not found for code "${r.pattern_name}", skipping.`);
                continue;
            }

            // Parse sewing techniques
            let extraFactory = 0;
            let extraProcessing = 0;
            try {
                const extraTechs = typeof r.sewing_techniques === 'string' ? JSON.parse(r.sewing_techniques) : (r.sewing_techniques || []);
                if (Array.isArray(extraTechs)) {
                    for (let i = 0; i < extraTechs.length; i++) {
                        extraFactory += (Number(extraTechs[i].fp) || 0) * (Number(extraTechs[i].qty) || 1);
                        extraProcessing += (Number(extraTechs[i].pp) || 0) * (Number(extraTechs[i].qty) || 1);
                    }
                }
            } catch (e) {
                console.error(`Record #${r.id}: failed to parse techniques:`, e);
            }

            const totalFactoryPrice = factoryPrice + extraFactory;
            const totalProcessingPrice = processingPrice + extraProcessing;

            const expectedNewPrice = isGiaCong ? totalProcessingPrice : totalFactoryPrice;
            const oldPrice = Number(r.old_base_price) || 0;

            if (expectedNewPrice !== oldPrice) {
                console.log(`Record #${r.id} (${isGiaCong ? 'May GC' : 'May Nhà'}, Mẫu: ${r.pattern_name}): Updating base_price from ${oldPrice} to ${expectedNewPrice}`);
                
                // Update base_price and recalculate salary (if checked_price or other fields depend on it)
                // Note: since it is not salary approved, salary is 0 anyway, but let's keep it safe.
                await db.run(
                    `UPDATE sewing_records SET base_price = $1 WHERE id = $2`,
                    [expectedNewPrice, r.id]
                );
                updatedCount++;
            }
        }

        console.log(`Done! Successfully updated ${updatedCount} records.`);
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

main();
