// Migration: Setup CRM Affiliate — buttons + auto-create customers from TK Affiliate
const db = require('./db/pool');

(async () => {
    console.log('🚀 Step 1: Adding buttons to CRM Affiliate...');

    const existing = await db.all(`SELECT key FROM consult_type_configs WHERE crm_menu = 'affiliate'`);
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
            console.log(`  ⏭️ Skip: ${b.icon} ${b.label}`);
            continue;
        }
        await db.run(
            `INSERT INTO consult_type_configs (key, label, icon, color, text_color, max_appointment_days, section_order, section_group, section_group_label, rule_phase, sort_order, crm_menu, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, $8, $9, 'affiliate', true)`,
            [b.key, b.label, b.icon, b.color, b.text_color, b.max_days, b.section_order, b.rule_phase, b.sort_order]
        );
        inserted++;
        console.log(`  ✅ ${b.icon} ${b.label}`);
    }
    console.log(`  → Inserted ${inserted} buttons`);

    // Flow rules
    console.log('\n🔗 Step 2: Flow rules...');
    const sectionedKeys = ['pending_emergency', 'hoan_thanh_cap_cuu', 'cho_duyet_huy', 'duyet_huy', 'tu_van_lai'];
    for (const key of sectionedKeys) {
        const exists = await db.get(`SELECT id FROM consult_flow_rules WHERE from_status = $1 AND crm_menu = 'affiliate'`, [key]);
        if (exists) continue;
        await db.run(
            `INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu)
             VALUES ($1, $2, true, 0, 1, 'affiliate')`,
            [key, key]
        );
        console.log(`  ✅ ${key}`);
    }

    // Step 3: Auto-create customers from TK Affiliate
    console.log('\n👥 Step 3: Creating customers from TK Affiliate...');
    const affUsers = await db.all(`SELECT id, full_name, phone, address FROM users WHERE role = 'tkaffiliate'`);
    let created = 0;

    for (const u of affUsers) {
        // Check if a customer crm_type='affiliate' already exists for this user
        const existing = await db.get(
            `SELECT c.id FROM customers c JOIN users u ON u.source_customer_id = c.id WHERE u.id = $1 AND c.crm_type = 'affiliate'`,
            [u.id]
        );
        if (existing) {
            console.log(`  ⏭️ Skip user #${u.id} (${u.full_name}) — already has affiliate customer`);
            continue;
        }

        // Create new customer with crm_type='affiliate'
        const result = await db.run(
            `INSERT INTO customers (customer_name, phone, address, crm_type, order_status, created_at, updated_at)
             VALUES ($1, $2, $3, 'affiliate', 'moi', NOW(), NOW())
             RETURNING id`,
            [u.full_name || u.username || 'Affiliate', u.phone || '', u.address || '']
        );

        const newCustId = result?.rows?.[0]?.id || result?.id;
        if (newCustId) {
            created++;
            console.log(`  ✅ Created customer #${newCustId} for user #${u.id} (${u.full_name})`);
        } else {
            console.log(`  ⚠️ Failed for user #${u.id}`);
        }
    }

    console.log(`\n✅ Done! Created ${created} affiliate customers from ${affUsers.length} TK Affiliate.`);

    // Verify
    const total = await db.get(`SELECT COUNT(*) as cnt FROM customers WHERE crm_type = 'affiliate'`);
    console.log(`📊 Total affiliate customers: ${total.cnt}`);
    process.exit(0);
})();
