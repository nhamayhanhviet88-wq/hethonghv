const db = require('./db/pool');
setTimeout(async () => {
    try {
        // 1. telesale_sources
        await db.run("UPDATE telesale_sources SET crm_type = 'goi_hop_tac' WHERE crm_type = 'nuoi_duong'");
        await db.run("UPDATE telesale_sources SET crm_type = 'goi_ban_hang' WHERE crm_type = 'sinh_vien'");
        await db.run("UPDATE telesale_sources SET crm_type = 'tu_tim_kiem' WHERE crm_type = 'hoa_hong_crm'");
        console.log('✅ telesale_sources updated');

        // 2. telesale_active_members
        await db.run("UPDATE telesale_active_members SET crm_type = 'goi_hop_tac' WHERE crm_type = 'nuoi_duong'");
        await db.run("UPDATE telesale_active_members SET crm_type = 'goi_ban_hang' WHERE crm_type = 'sinh_vien'");
        await db.run("UPDATE telesale_active_members SET crm_type = 'tu_tim_kiem' WHERE crm_type = 'hoa_hong_crm'");
        console.log('✅ telesale_active_members updated');

        // 3. role_permissions (permission keys)
        await db.run("UPDATE role_permissions SET permission = REPLACE(permission, 'crm_nuoi_duong', 'crm_goi_hop_tac') WHERE permission LIKE '%crm_nuoi_duong%'");
        await db.run("UPDATE role_permissions SET permission = REPLACE(permission, 'crm_sinh_vien', 'crm_goi_ban_hang') WHERE permission LIKE '%crm_sinh_vien%'");
        await db.run("UPDATE role_permissions SET permission = REPLACE(permission, 'crm_hoa_hong', 'crm_tu_tim_kiem') WHERE permission LIKE '%crm_hoa_hong%'");
        console.log('✅ role_permissions updated');

        // 4. customers table - crm_type column
        await db.run("UPDATE customers SET crm_type = 'goi_hop_tac' WHERE crm_type = 'nuoi_duong'");
        await db.run("UPDATE customers SET crm_type = 'goi_ban_hang' WHERE crm_type = 'sinh_vien'");
        await db.run("UPDATE customers SET crm_type = 'tu_tim_kiem' WHERE crm_type = 'hoa_hong_crm'");
        console.log('✅ customers updated');

        // Verify
        const src = await db.all("SELECT DISTINCT crm_type FROM telesale_sources");
        const mem = await db.all("SELECT DISTINCT crm_type FROM telesale_active_members");
        console.log('\nVerify sources:', src.map(r => r.crm_type));
        console.log('Verify members:', mem.map(r => r.crm_type));
    } catch(e) { console.error(e); }
    process.exit();
}, 500);
