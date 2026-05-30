const db = require('./db/pool');

async function fix() {
    try {
        await db.run(`UPDATE cashflow_records SET amount = 1000000 WHERE id = 31 AND amount::text = 'NaN'`);
        console.log('Fixed record id=31, amount set to 1000000');
        
        // Verify
        const r = await db.get(`SELECT id, cashflow_code, amount FROM cashflow_records WHERE id = 31`);
        console.log('Verified:', r);
    } catch(e) {
        console.error(e);
    }
    process.exit();
}

fix();
