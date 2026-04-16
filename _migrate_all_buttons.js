const db = require('./db/pool');
(async () => {
    // Use nhu_cau as source (28 buttons - the complete set)
    const srcButtons = await db.all(
        `SELECT key, label, icon, color, text_color, is_active, sort_order, section_order, rule_phase
         FROM consult_type_configs WHERE crm_menu='nhu_cau' ORDER BY sort_order`
    );
    console.log(`Source (nhu_cau): ${srcButtons.length} buttons`);

    const srcRules = await db.all(
        `SELECT from_status, to_type_key, is_default, delay_days, sort_order
         FROM consult_flow_rules WHERE crm_menu='nhu_cau'`
    );
    console.log(`Source (nhu_cau): ${srcRules.length} flow rules`);

    // All CRM menus that need the full button set
    const targets = ['ctv', 'affiliate', 'tu_tim_kiem', 'goi_hop_tac', 'goi_ban_hang', 'koc_tiktok', 'affiliate_hv'];

    for (const menu of targets) {
        let addedBtns = 0;
        for (const btn of srcButtons) {
            try {
                const res = await db.run(
                    `INSERT INTO consult_type_configs (key, label, icon, color, text_color, is_active, sort_order, section_order, crm_menu, rule_phase)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (key, crm_menu) DO NOTHING`,
                    [btn.key, btn.label, btn.icon, btn.color, btn.text_color, btn.is_active, btn.sort_order, btn.section_order, menu, btn.rule_phase]
                );
                if (res && res.rowCount > 0) addedBtns++;
            } catch (e) { }
        }

        let addedRules = 0;
        for (const rule of srcRules) {
            try {
                const res = await db.run(
                    `INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT DO NOTHING`,
                    [rule.from_status, rule.to_type_key, rule.is_default, rule.delay_days, rule.sort_order, menu]
                );
                if (res && res.rowCount > 0) addedRules++;
            } catch (e) { }
        }

        const totalBtns = await db.get(`SELECT COUNT(*) as c FROM consult_type_configs WHERE crm_menu=$1`, [menu]);
        const totalRules = await db.get(`SELECT COUNT(*) as c FROM consult_flow_rules WHERE crm_menu=$1`, [menu]);
        console.log(`${menu}: +${addedBtns} buttons (${totalBtns.c} total), +${addedRules} rules (${totalRules.c} total)`);
    }

    process.exit(0);
})();
