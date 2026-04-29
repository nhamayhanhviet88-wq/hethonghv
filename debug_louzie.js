const db = require('./db/pool');

async function debug() {
    // Find Lou Zie in customers
    const customers = await db.all("SELECT id, customer_name, crm_type, referrer_id, referrer_customer_id FROM customers WHERE customer_name ILIKE '%lou%zie%' OR customer_name ILIKE '%lou%zi%'");
    console.log('\n=== Lou Zie CUSTOMERS ===');
    customers.forEach(c => console.log(JSON.stringify(c)));

    // Find Lou Zie in users
    const users = await db.all("SELECT id, full_name, username, role, source_crm_type, source_customer_id FROM users WHERE full_name ILIKE '%lou%zie%' OR full_name ILIKE '%lou%zi%' OR username ILIKE '%lou%zi%'");
    console.log('\n=== Lou Zie USERS ===');
    users.forEach(u => console.log(JSON.stringify(u)));

    // Find the referred customer in Nhu Cau that has Lou Zie as referrer
    if (customers.length > 0) {
        const custId = customers[0].id;
        const referred = await db.all(
            "SELECT id, customer_name, crm_type, referrer_id, referrer_customer_id FROM customers WHERE referrer_customer_id = ?",
            [custId]
        );
        console.log(`\n=== Customers referred by customer ID ${custId} (referrer_customer_id) ===`);
        referred.forEach(r => console.log(JSON.stringify(r)));
    }
    if (users.length > 0) {
        const userId = users[0].id;
        const referred2 = await db.all(
            "SELECT id, customer_name, crm_type, referrer_id, referrer_customer_id FROM customers WHERE referrer_id = ?",
            [userId]
        );
        console.log(`\n=== Customers referred by user ID ${userId} (referrer_id) ===`);
        referred2.forEach(r => console.log(JSON.stringify(r)));
    }

    process.exit(0);
}
debug().catch(e => { console.error(e); process.exit(1); });
