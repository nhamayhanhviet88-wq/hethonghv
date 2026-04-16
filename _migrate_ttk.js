const db = require('./db/pool');
(async () => {
    console.log('=== CRM Tự Tìm Kiếm DB Migration ===\n');

    // 1. Insert 7 emergency/cancellation buttons for crm_menu='tu_tim_kiem'
    const emergencyButtons = [
        { key: 'cap_cuu_sep', label: 'Cấp Cứu Sếp', icon: '🚨', color: '#ef4444', text_color: 'white', sort_order: 900, rule_phase: 'huy_capuu' },
        { key: 'hoan_thanh_cap_cuu', label: 'Hoàn Thành Cấp Cứu', icon: '🏥', color: '#122546', text_color: '#fad24c', sort_order: 901, rule_phase: 'huy_capuu' },
        { key: 'huy', label: 'Hủy Khách', icon: '❌', color: '#dc2626', text_color: 'white', sort_order: 902, rule_phase: 'huy_capuu' },
        { key: 'tu_van_lai', label: 'Tư Vấn Lại', icon: '🔄', color: '#0891b2', text_color: 'white', sort_order: 903, rule_phase: 'huy_capuu' },
        { key: 'cho_duyet_huy', label: 'Chờ Duyệt Hủy', icon: '⏳', color: '#6b7280', text_color: 'white', sort_order: 904, rule_phase: 'huy_capuu' },
        { key: 'duyet_huy', label: 'Hủy Khách (Đã Duyệt)', icon: '🚫', color: '#dc2626', text_color: 'white', sort_order: 905, rule_phase: 'huy_capuu' },
        { key: 'pending_emergency', label: 'Đang có Cấp Cứu Sếp', icon: '🔒', color: '#991b1b', text_color: '#fecaca', sort_order: 906, rule_phase: 'huy_capuu' },
    ];

    let insertedBtns = 0;
    for (const btn of emergencyButtons) {
        try {
            await db.run(`INSERT INTO consult_type_configs (key, label, icon, color, text_color, is_active, sort_order, crm_menu, rule_phase)
                VALUES ($1, $2, $3, $4, $5, true, $6, 'tu_tim_kiem', $7)
                ON CONFLICT (key, crm_menu) DO NOTHING`,
                [btn.key, btn.label, btn.icon, btn.color, btn.text_color, btn.sort_order, btn.rule_phase]);
            insertedBtns++;
        } catch(e) { console.log(`  Skip ${btn.key}: ${e.message}`); }
    }
    console.log(`✅ Inserted ${insertedBtns} emergency buttons`);

    // 2. Insert 5 flow rules for emergency/cancellation
    const flowRules = [
        { from_status: 'hoan_thanh_cap_cuu', to_type_key: 'cap_cuu_sep', is_default: false, delay_days: 0, sort_order: 1 },
        { from_status: 'pending_emergency', to_type_key: 'cap_cuu_sep', is_default: true, delay_days: 0, sort_order: 1 },
        { from_status: 'duyet_huy', to_type_key: 'tu_van_lai', is_default: true, delay_days: 0, sort_order: 1 },
        { from_status: 'duyet_huy', to_type_key: 'huy', is_default: false, delay_days: 0, sort_order: 2 },
        { from_status: 'tu_van_lai', to_type_key: 'cap_cuu_sep', is_default: false, delay_days: 0, sort_order: 2 },
    ];

    let insertedRules = 0;
    for (const rule of flowRules) {
        try {
            await db.run(`INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu)
                VALUES ($1, $2, $3, $4, $5, 'tu_tim_kiem')
                ON CONFLICT DO NOTHING`,
                [rule.from_status, rule.to_type_key, rule.is_default, rule.delay_days, rule.sort_order]);
            insertedRules++;
        } catch(e) { console.log(`  Skip rule ${rule.from_status}->${rule.to_type_key}: ${e.message}`); }
    }
    console.log(`✅ Inserted ${insertedRules} flow rules`);

    // 3. Verify
    const btnCount = await db.get(`SELECT COUNT(*) as cnt FROM consult_type_configs WHERE crm_menu = 'tu_tim_kiem'`);
    const ruleCount = await db.get(`SELECT COUNT(*) as cnt FROM consult_flow_rules WHERE crm_menu = 'tu_tim_kiem'`);
    console.log(`\n📊 Final: ${btnCount.cnt} buttons, ${ruleCount.cnt} flow rules for tu_tim_kiem`);

    process.exit(0);
})();
