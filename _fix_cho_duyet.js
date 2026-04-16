const db = require('./db/pool');
(async () => {
    const menus = ['tu_tim_kiem', 'goi_hop_tac', 'goi_ban_hang', 'koc_tiktok'];
    for (const menu of menus) {
        await db.run(`INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, delay_days, sort_order, crm_menu)
            VALUES ('cho_duyet_huy', 'cho_duyet_huy', false, 0, 1, '${menu}')
            ON CONFLICT DO NOTHING`);
        const cnt = await db.get(`SELECT COUNT(*) as c FROM consult_flow_rules WHERE crm_menu='${menu}'`);
        console.log(`${menu}: ${cnt.c} rules (added cho_duyet_huy)`);
    }
    process.exit(0);
})();
