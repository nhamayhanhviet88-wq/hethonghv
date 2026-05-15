const db = require('./db/pool');
(async () => {
    await db.run('DELETE FROM cashflow_records WHERE id = 7');
    await db.run("DELETE FROM payment_records WHERE payment_code = 'TM7-15-5-Y26' AND source = 'cashflow_chi'");
    console.log('Deleted duplicate TM7');
    process.exit(0);
})();
