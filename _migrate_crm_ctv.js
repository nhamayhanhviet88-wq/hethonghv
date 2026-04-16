const db = require('./db/pool');
(async () => {
    console.log('=== CRM CTV Migration ===');
    
    // Use db.exec for tables without id column
    await db.exec(`INSERT INTO global_penalty_config (key, label, amount) VALUES ('kh_chua_xu_ly_hom_nay_ctv', 'KH CTV Chưa Xử Lý Hôm Nay', 100000) ON CONFLICT (key) DO NOTHING`);
    console.log('✅ global_penalty_config: added kh_chua_xu_ly_hom_nay_ctv');
    
    // Verify all 3 changes
    const r1 = await db.all(`SELECT column_name FROM information_schema.columns WHERE table_name='consult_type_configs' AND column_name='crm_menu'`);
    const r2 = await db.all(`SELECT column_name FROM information_schema.columns WHERE table_name='consult_flow_rules' AND column_name='crm_menu'`);
    const r3 = await db.get(`SELECT * FROM global_penalty_config WHERE key='kh_chua_xu_ly_hom_nay_ctv'`);
    
    console.log(`\nVerification:`);
    console.log(`  consult_type_configs.crm_menu: ${r1.length > 0 ? '✅' : '❌'}`);
    console.log(`  consult_flow_rules.crm_menu: ${r2.length > 0 ? '✅' : '❌'}`);
    console.log(`  penalty CTV: ${r3 ? '✅ ' + r3.amount + 'đ' : '❌'}`);
    
    process.exit(0);
})();
