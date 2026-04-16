const db = require('./db/pool');
(async () => {
    // Fix flow_rules constraint too
    console.log('🔧 Fixing flow rules constraint...');
    try {
        await db.run(`ALTER TABLE consult_flow_rules DROP CONSTRAINT IF EXISTS consult_flow_rules_from_status_to_type_key_key`);
        await db.run(`ALTER TABLE consult_flow_rules ADD CONSTRAINT consult_flow_rules_from_to_crm_unique UNIQUE (from_status, to_type_key, crm_menu)`);
        console.log('  ✅ Fixed constraint to (from_status, to_type_key, crm_menu)');
    } catch(e) { console.log('  ⚠️ ' + e.message); }

    // Add missing flow rules
    const keys = ['cho_duyet_huy', 'duyet_huy', 'tu_van_lai'];
    for (const key of keys) {
        const exists = await db.get(`SELECT id FROM consult_flow_rules WHERE from_status = $1 AND crm_menu = 'ctv'`, [key]);
        if (exists) { console.log(`  ⏭️ Skip: ${key}`); continue; }
        await db.run(
            `INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu) VALUES ($1, $2, true, 0, 1, 'ctv')`,
            [key, key]
        );
        console.log(`  ✅ Flow: ${key}`);
    }

    // Verify all CTV data
    const types = await db.all(`SELECT key, label, icon, section_order, rule_phase FROM consult_type_configs WHERE crm_menu = 'ctv' ORDER BY section_order, sort_order`);
    console.log(`\n✅ CTV has ${types.length} buttons:`);
    types.forEach(t => console.log(`  ${t.icon} ${t.label} (section:${t.section_order}, phase:${t.rule_phase})`));

    const rules = await db.all(`SELECT from_status, to_type_key FROM consult_flow_rules WHERE crm_menu = 'ctv'`);
    console.log(`\n🔗 CTV has ${rules.length} flow rules`);
    process.exit(0);
})();
