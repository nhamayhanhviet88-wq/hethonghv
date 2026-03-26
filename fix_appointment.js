const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });
(async () => {
    const r = await p.query("UPDATE customers SET appointment_date = '2026-03-28' WHERE appointment_date IS NULL");
    console.log('Updated rows:', r.rowCount);
    process.exit();
})();
