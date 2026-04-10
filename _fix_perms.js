const db = require('./db/pool');
setTimeout(async () => {
    try {
        // Update permissions table
        await db.run("UPDATE permissions SET feature = 'crm_goi_hop_tac' WHERE feature = 'crm_nuoi_duong'");
        await db.run("UPDATE permissions SET feature = 'crm_goi_ban_hang' WHERE feature = 'crm_sinh_vien'");
        await db.run("UPDATE permissions SET feature = 'crm_tu_tim_kiem' WHERE feature = 'crm_hoa_hong'");
        console.log('✅ permissions updated');
        
        const p = await db.all("SELECT DISTINCT feature FROM permissions WHERE feature LIKE 'crm_%'");
        console.log('CRM permissions:', p.map(r => r.feature));
    } catch(e) { console.error(e.message); }
    process.exit();
}, 500);
