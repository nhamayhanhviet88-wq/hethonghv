const db = require('./db/pool');
(async () => {
    // Check ALL crm_menus and their button counts
    const menus = await db.all(
        `SELECT crm_menu, COUNT(*) as cnt FROM consult_type_configs GROUP BY crm_menu ORDER BY crm_menu`
    );
    console.log('=== Button counts per crm_menu ===');
    menus.forEach(m => console.log(`  ${m.crm_menu}: ${m.cnt} buttons`));

    // Show CTV buttons detail
    const ctv = await db.all(
        `SELECT key, label, sort_order, section_order, rule_phase FROM consult_type_configs WHERE crm_menu='ctv' ORDER BY sort_order`
    );
    console.log('\n=== CTV buttons ===');
    ctv.forEach(b => console.log(`  ${b.sort_order} | sec=${b.section_order} | ${b.rule_phase} | ${b.key} (${b.label})`));

    // Check original 'affiliate' (Chăm Sóc Affiliate) which was the first clone
    const aff = await db.all(
        `SELECT key, label, sort_order, section_order, rule_phase FROM consult_type_configs WHERE crm_menu='affiliate' ORDER BY sort_order`
    );
    console.log('\n=== Affiliate buttons ===');
    aff.forEach(b => console.log(`  ${b.sort_order} | sec=${b.section_order} | ${b.rule_phase} | ${b.key} (${b.label})`));

    process.exit(0);
})();
