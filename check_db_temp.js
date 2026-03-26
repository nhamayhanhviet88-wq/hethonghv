require('dotenv').config();
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000});

(async () => {
    try {
        const c = await p.query('SELECT COUNT(*) as cnt FROM customers');
        console.log('Customers:', c.rows[0].cnt);
        const u = await p.query('SELECT COUNT(*) as cnt FROM users');
        console.log('Users:', u.rows[0].cnt);

        const users = await p.query('SELECT id, username, full_name, role FROM users ORDER BY id');
        console.log('\n--- Users ---');
        users.rows.forEach(u => console.log('  ID:' + u.id + ' ' + u.username + ' (' + u.role + ') - ' + u.full_name));
        
        const custs = await p.query('SELECT id, customer_name, phone, crm_type FROM customers ORDER BY id');
        console.log('\n--- Customers ---');
        custs.rows.forEach(c => console.log('  ID:' + c.id + ' ' + c.customer_name + ' ' + c.phone + ' [' + c.crm_type + ']'));
    } catch(e) {
        console.log('Error:', e.message);
    } finally {
        p.end();
    }
})();
