const db = require('./db/pool');

(async () => {
    try {
        const year = 2026;
        const month = 8;

        const mktRows = await db.all(`
            SELECT channel_name, SUM(spent_amount) as total_spent, SUM(lead_count) as total_leads
            FROM marketing_budgets
            WHERE budget_year = $1 AND budget_month = $2
            GROUP BY channel_name
        `, [year, String(month)]);

        console.log('MARKETING LEADS BY CHANNEL:', mktRows);

        const totalLeads = await db.get(`
            SELECT COALESCE(SUM(lead_count), 0) as total_leads
            FROM marketing_budgets
            WHERE budget_year = $1 AND budget_month = $2
        `, [year, String(month)]);

        console.log('TOTAL LEADS:', totalLeads);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
