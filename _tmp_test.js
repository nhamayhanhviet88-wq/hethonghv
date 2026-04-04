const db = require('./db/pool');
(async () => {
    // Find a customer in nhu_cau CRM that has no birthday set
    const c = await db.get("SELECT id, customer_name, birthday FROM customers WHERE crm_type = 'nhu_cau' AND cancel_approved IS DISTINCT FROM 1 ORDER BY id LIMIT 1");
    if (!c) { console.log('No customer found'); process.exit(0); }
    
    // Set birthday to today: 4/4 (day/month format)
    await db.run("UPDATE customers SET birthday = ? WHERE id = ?", ['4/4', c.id]);
    console.log(`Updated customer #${c.id} "${c.customer_name}" birthday to 4/4 (today)`);
    
    // Also check current data
    const all = await db.all("SELECT id, customer_name, birthday, job FROM customers WHERE crm_type = 'nhu_cau' AND cancel_approved IS DISTINCT FROM 1 ORDER BY id LIMIT 5");
    console.log('\nFirst 5 customers:');
    all.forEach(r => console.log(`  #${r.id} ${r.customer_name} | birthday: ${r.birthday || '—'} | job: ${r.job || '—'}`));
    
    process.exit(0);
})();
