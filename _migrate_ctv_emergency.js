const db = require('./db/pool');

(async () => {
    console.log('🔧 Step 1: Fix unique constraint to include crm_menu...');
    
    // Drop old unique constraint on key only
    try {
        await db.run(`ALTER TABLE consult_type_configs DROP CONSTRAINT IF EXISTS consult_type_configs_key_key`);
        console.log('  ✅ Dropped old constraint consult_type_configs_key_key');
    } catch (e) {
        console.log('  ⚠️ ' + e.message);
    }
    
    // Create new unique constraint on (key, crm_menu)
    try {
        await db.run(`ALTER TABLE consult_type_configs ADD CONSTRAINT consult_type_configs_key_crm_menu_unique UNIQUE (key, crm_menu)`);
        console.log('  ✅ Created new constraint on (key, crm_menu)');
    } catch (e) {
        console.log('  ⚠️ Constraint may already exist: ' + e.message);
    }

    console.log('\n🚀 Step 2: Adding buttons to CRM CTV...');

    const existing = await db.all(`SELECT key FROM consult_type_configs WHERE crm_menu = 'ctv'`);
    const existingKeys = new Set(existing.map(r => r.key));

    const buttons = [
        { key: 'cap_cuu_sep', label: 'Cấp Cứu Sếp', icon: '🚨', color: '#ef4444', text_color: 'white', max_days: 0, section_order: 0, rule_phase: 'huy_capuu', sort_order: 17 },
        { key: 'pending_emergency', label: 'Đang Có Cấp Cứu Sếp', icon: '🚨', color: '#ef4444', text_color: 'white', max_days: 0, section_order: 15, rule_phase: 'huy_capuu', sort_order: 999 },
        { key: 'hoan_thanh_cap_cuu', label: 'Hoàn Thành Cấp Cứu', icon: '🏥', color: '#122546', text_color: '#fad24c', max_days: 0, section_order: 16, rule_phase: 'huy_capuu', sort_order: 19 },
        { key: 'huy', label: 'Hủy Khách', icon: '❌', color: '#dc2626', text_color: 'white', max_days: 0, section_order: 0, rule_phase: 'huy_capuu', sort_order: 20 },
        { key: 'cho_duyet_huy', label: 'Chờ Duyệt Hủy', icon: '⏳', color: '#6b7280', text_color: 'white', max_days: 0, section_order: 17, rule_phase: 'huy_capuu', sort_order: 24 },
        { key: 'duyet_huy', label: 'Hủy Khách (Đã Duyệt)', icon: '🚫', color: '#991b1b', text_color: 'white', max_days: 0, section_order: 18, rule_phase: 'huy_capuu', sort_order: 25 },
        { key: 'tu_van_lai', label: 'Tư Vấn Lại', icon: '🔄', color: '#0891b2', text_color: 'white', max_days: 15, section_order: 19, rule_phase: 'huy_capuu', sort_order: 22 },
    ];

    let inserted = 0;
    for (const b of buttons) {
        if (existingKeys.has(b.key)) {
            console.log(`  ⏭️ Skip (exists): ${b.icon} ${b.label}`);
            continue;
        }
        await db.run(
            `INSERT INTO consult_type_configs (key, label, icon, color, text_color, max_appointment_days, section_order, section_group, section_group_label, rule_phase, sort_order, crm_menu, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, $8, $9, 'ctv', true)`,
            [b.key, b.label, b.icon, b.color, b.text_color, b.max_days, b.section_order, b.rule_phase, b.sort_order]
        );
        inserted++;
        console.log(`  ✅ Added: ${b.icon} ${b.label} (${b.key})`);
    }

    // Create flow rules
    console.log('\n🔗 Step 3: Creating basic flow rules...');
    const sectionedKeys = ['pending_emergency', 'hoan_thanh_cap_cuu', 'cho_duyet_huy', 'duyet_huy', 'tu_van_lai'];
    for (const key of sectionedKeys) {
        const exists = await db.get(`SELECT id FROM consult_flow_rules WHERE from_status = $1 AND crm_menu = 'ctv'`, [key]);
        if (exists) { console.log(`  ⏭️ Skip: ${key}`); continue; }
        await db.run(
            `INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu)
             VALUES ($1, $2, true, 0, 1, 'ctv')`,
            [key, key]
        );
        console.log(`  ✅ Flow: ${key}`);
    }

    // Verify
    const final = await db.all(`SELECT key, label, icon, section_order, rule_phase FROM consult_type_configs WHERE crm_menu = 'ctv' ORDER BY section_order, sort_order`);
    console.log(`\n✅ Done! CTV now has ${final.length} buttons:`);
    final.forEach(t => console.log(`  ${t.icon} ${t.label} (section: ${t.section_order}, phase: ${t.rule_phase})`));
    process.exit(0);
})();
