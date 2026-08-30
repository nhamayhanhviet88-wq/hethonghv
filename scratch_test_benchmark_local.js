const db = require('./db/pool');

async function testBenchmarkLocal() {
    const year = 2026;
    const department = 'sewing';
    const startBaseYear = 2023;
    const recentYears = [];
    for (let y = year - 1; y >= startBaseYear; y--) {
        recentYears.push(y);
    }
    const yearsData = {};
    for (const y of recentYears) {
        let prodRows = await db.all(`
            SELECT EXTRACT(MONTH FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at))::int AS month,
                   SUM(CASE
                       WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                       WHEN sr.notes LIKE '%[HỦY BỎ - BÙ PHÍ]%' OR sr.notes LIKE '%[ĐÃ HỦY - BÙ PHÍ]%' THEN 0
                       ELSE COALESCE(sr.quantity, 0)
                   END)::int AS products_done
            FROM sewing_records sr
            LEFT JOIN dht_order_items oi ON oi.id = sr.order_item_id
            WHERE sr.done_date IS NOT NULL
              AND EXTRACT(YEAR FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at)) = $1
            GROUP BY month
        `, [y]);

        const actualTargets = await db.all(`
            SELECT month, SUM(total_minutes)::int AS total_minutes, SUM(error_count)::int AS error_count
            FROM kpi_production_targets
            WHERE year = $1 AND department = $2 AND month >= 1 AND month <= 12
            GROUP BY month
        `, [y, department]);

        const months = {};
        for (let m = 1; m <= 12; m++) months[m] = 0;
        let totalActualProducts = 0;
        let totalActualErrors = 0;
        let totalActualMinutes = 0;

        prodRows.forEach(pr => {
            const m = pr.month;
            if (m >= 1 && m <= 12) {
                months[m] = parseInt(pr.products_done || 0, 10);
                totalActualProducts += months[m];
            }
        });

        actualTargets.forEach(at => {
            totalActualErrors += parseInt(at.error_count || 0, 10);
            totalActualMinutes += parseInt(at.total_minutes || 0, 10);
        });

        const quarters = { 1: 0, 2: 0, 3: 0, 4: 0 };
        for (let m = 1; m <= 12; m++) {
            const q = Math.ceil(m / 3);
            quarters[q] += months[m];
        }

        const actualRate = totalActualMinutes > 0 ? (totalActualProducts / totalActualMinutes) : 0;

        yearsData[y] = {
            year: y,
            actual_products: totalActualProducts,
            actual_errors: totalActualErrors,
            actual_rate: actualRate,
            quarters: quarters,
            months: months
        };
    }
    console.log("Years Data Actual:", yearsData);
    process.exit(0);
}

testBenchmarkLocal();
