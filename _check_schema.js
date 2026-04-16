const db = require('./db/pool');
(async () => {
    const tables = ['consult_type_configs', 'consult_flow_rules', 'global_penalty_config', 'consultation_logs'];
    for (const t of tables) {
        const rows = await db.all(
            `SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]
        );
        console.log(`${t}: ${rows.map(r => r.column_name).join(', ')}`);
    }
    process.exit(0);
})();
