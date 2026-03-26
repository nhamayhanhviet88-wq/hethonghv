const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });
(async () => {
    const r = await p.query("SELECT id, customer_name, created_at, appointment_date FROM customers WHERE customer_name ILIKE '%12323%' LIMIT 3");
    r.rows.forEach(row => {
        console.log('id:', row.id);
        console.log('name:', row.customer_name);
        console.log('created_at:', row.created_at);
        console.log('created_at ISO:', row.created_at?.toISOString?.());
        console.log('appointment_date:', row.appointment_date);
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        const cDate = new Date(row.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        console.log('todayStr:', todayStr, 'createdStr:', cStr, 'MATCH:', todayStr === cStr);
    });
    process.exit();
})();
