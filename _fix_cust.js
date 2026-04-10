const db = require('./db/pool');
setTimeout(async () => {
    try {
        await db.run("UPDATE customers SET crm_type = 'goi_hop_tac' WHERE crm_type = 'nuoi_duong'");
        await db.run("UPDATE customers SET crm_type = 'goi_ban_hang' WHERE crm_type = 'sinh_vien'");
        await db.run("UPDATE customers SET crm_type = 'tu_tim_kiem' WHERE crm_type = 'hoa_hong_crm'");
        const r = await db.all('SELECT DISTINCT crm_type FROM customers');
        console.log('✅ customers:', r.map(x => x.crm_type));
        const s = await db.all('SELECT DISTINCT crm_type FROM telesale_sources');
        console.log('✅ sources:', s.map(x => x.crm_type));
        const m = await db.all('SELECT DISTINCT crm_type FROM telesale_active_members');
        console.log('✅ members:', m.map(x => x.crm_type));
    } catch(e) { console.error(e); }
    process.exit();
}, 500);
