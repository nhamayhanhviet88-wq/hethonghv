const db = require('./db/pool');
(async () => {
    console.log('=== CRM Gọi Điện Hợp Tác DB Migration ===\n');

    const emergencyButtons = [
        { key: 'cap_cuu_sep', label: 'Cấp Cứu Sếp', icon: '🚨', color: '#ef4444', text_color: 'white', sort_order: 900, section_order: 0 },
        { key: 'hoan_thanh_cap_cuu', label: 'Hoàn Thành Cấp Cứu', icon: '🏥', color: '#122546', text_color: '#fad24c', sort_order: 901, section_order: 16 },
        { key: 'huy', label: 'Hủy Khách', icon: '❌', color: '#dc2626', text_color: 'white', sort_order: 902, section_order: 0 },
        { key: 'tu_van_lai', label: 'Tư Vấn Lại', icon: '🔄', color: '#0891b2', text_color: 'white', sort_order: 903, section_order: 19 },
        { key: 'cho_duyet_huy', label: 'Chờ Duyệt Hủy', icon: '⏳', color: '#6b7280', text_color: 'white', sort_order: 904, section_order: 17 },
        { key: 'duyet_huy', label: 'Hủy Khách (Đã Duyệt)', icon: '🚫', color: '#dc2626', text_color: 'white', sort_order: 905, section_order: 18 },
        { key: 'pending_emergency', label: 'Đang có Cấp Cứu Sếp', icon: '🔒', color: '#991b1b', text_color: '#fecaca', sort_order: 906, section_order: 15 },
    ];

    for (const btn of emergencyButtons) {
        await db.run(`INSERT INTO consult_type_configs (key, label, icon, color, text_color, is_active, sort_order, section_order, crm_menu, rule_phase)
            VALUES ('${btn.key}', '${btn.label}', '${btn.icon}', '${btn.color}', '${btn.text_color}', true, ${btn.sort_order}, ${btn.section_order}, 'goi_hop_tac', 'huy_capuu')
            ON CONFLICT (key, crm_menu) DO NOTHING`);
    }
    console.log('✅ 7 emergency buttons inserted');

    const flowRules = [
        ['hoan_thanh_cap_cuu', 'cap_cuu_sep', false, 0, 1],
        ['pending_emergency', 'cap_cuu_sep', true, 0, 1],
        ['duyet_huy', 'tu_van_lai', true, 0, 1],
        ['duyet_huy', 'huy', false, 0, 2],
        ['tu_van_lai', 'cap_cuu_sep', false, 0, 2],
    ];
    for (const [from, to, isDef, delay, sort] of flowRules) {
        await db.run(`INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu)
            VALUES ('${from}', '${to}', ${isDef}, ${delay}, ${sort}, 'goi_hop_tac')
            ON CONFLICT DO NOTHING`);
    }
    console.log('✅ 5 flow rules inserted');

    const cnt = await db.get(`SELECT COUNT(*) as c FROM consult_type_configs WHERE crm_menu = 'goi_hop_tac'`);
    const rcnt = await db.get(`SELECT COUNT(*) as c FROM consult_flow_rules WHERE crm_menu = 'goi_hop_tac'`);
    console.log(`\n📊 Final: ${cnt.c} buttons, ${rcnt.c} rules for goi_hop_tac`);
    process.exit(0);
})();
