const db = require('./db/pool');

async function checkBenchmark2025() {
    try {
        const department = 'sewing';
        const year = 2025;

        console.log("=== CHECKING DEPT CONFIGS FOR 2025 ===");
        const deptConfigs = await db.all(`
            SELECT * FROM kpi_production_dept_configs WHERE year = $1 AND department = $2 ORDER BY month ASC
        `, [year, department]);
        console.log("Dept Configs 2025:", deptConfigs);

        console.log("\n=== CHECKING KPI TARGETS FOR 2025 ===");
        const targets = await db.all(`
            SELECT month, SUM(target_products)::int AS total_products, SUM(target_errors)::int AS total_errors, AVG(target_rate)::numeric AS avg_rate
            FROM kpi_production_targets
            WHERE year = $1 AND department = $2
            GROUP BY month ORDER BY month ASC
        `, [year, department]);
        console.log("Targets 2025 aggregated by month:", targets);

        console.log("\n=== CHECKING DAILY LOGS FOR 2025 ===");
        const logs = await db.all(`
            SELECT 
                SUM(quantity_produced)::int AS total_produced,
                SUM(error_count)::int AS total_errors,
                AVG(avg_rate)::numeric AS avg_rate
            FROM kpi_production_daily_logs
            WHERE EXTRACT(YEAR FROM date) = $1 AND department = $2
        `, [year, department]);
        console.log("Daily logs 2025 total:", logs);

    } catch (err) {
        console.error("Error:", err);
    } process.exit(0);
}

checkBenchmark2025();
