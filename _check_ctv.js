const db = require('./db/pool');
(async () => {
    // Simulate what ctv_all returns
    const ctvAll = await db.all("SELECT id, customer_name, crm_type FROM customers WHERE crm_type IN ('ctv','ctv_hoa_hong') ORDER BY id");
    console.log('ctv_all count:', ctvAll.length);
    
    // Simulate what ctv exact returns  
    const ctvExact = await db.all("SELECT id, customer_name, crm_type FROM customers WHERE crm_type = 'ctv' ORDER BY id");
    console.log('ctv exact count:', ctvExact.length);
    
    // Check what the user sees - giam_doc has no filter
    console.log('\nctv exact records:');
    ctvExact.forEach(r => console.log(`  ID=${r.id} name=${r.customer_name} type=${r.crm_type}`));
    
    console.log('\nctv_all records:');
    ctvAll.forEach(r => console.log(`  ID=${r.id} name=${r.customer_name} type=${r.crm_type}`));
    
    process.exit(0);
})();
