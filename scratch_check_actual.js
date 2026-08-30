const db = require('./db/pool');

async function checkActualProduction2025() {
    try {
        console.log("=== CHECKING SEWING_RECORDS 2025 ===");
        const sewingActual = await db.all(`
            SELECT 
                EXTRACT(MONTH FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at))::int AS month,
                SUM(CASE
                    WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                    WHEN sr.notes LIKE '%[HỦY BỎ - BÙ PHÍ]%' OR sr.notes LIKE '%[ĐÃ HỦY - BÙ PHÍ]%' THEN 0
                    ELSE COALESCE(sr.quantity, 0)
                END)::int AS products_done
            FROM sewing_records sr
            LEFT JOIN dht_order_items oi ON oi.id = sr.order_item_id
            WHERE sr.done_date IS NOT NULL
              AND EXTRACT(YEAR FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at)) = 2025
            GROUP BY month ORDER BY month ASC
        `);
        console.log("Sewing Actual 2025:", sewingActual);

        console.log("\n=== CHECKING CUTTING_RECORDS 2025 ===");
        const cuttingActual = await db.all(`
            SELECT 
                EXTRACT(MONTH FROM COALESCE(cr.created_at, NOW()))::int AS month,
                SUM(COALESCE(cr.real_quantity, 0))::int AS products_done
            FROM cutting_records cr
            WHERE EXTRACT(YEAR FROM COALESCE(cr.created_at, NOW())) = 2025
            GROUP BY month ORDER BY month ASC
        `);
        console.log("Cutting Actual 2025:", cuttingActual);

        console.log("\n=== CHECKING TARGETS ACTUAL (MINUTES & ERRORS) 2025 ===");
        const targetActual = await db.all(`
            SELECT 
                month,
                SUM(total_minutes)::int AS actual_minutes,
                SUM(error_count)::int AS actual_errors
            FROM kpi_production_targets
            WHERE year = 2025 AND department = 'sewing'
            GROUP BY month ORDER BY month ASC
        `);
        console.log("Targets Actual (Minutes/Errors) 2025:", targetActual);

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

checkActualProduction2025();
