const db = require('./db/pool');
(async () => {
    // Check CTV sections (section_order > 0 = visible in rules tab)
    const ctv = await db.all(`SELECT key, label, section_order, section_group, section_group_label, rule_phase, max_appointment_days
        FROM consult_type_configs WHERE crm_menu = 'ctv' AND section_order > 0 ORDER BY section_order`);
    console.log('CTV sections (section_order > 0):');
    ctv.forEach(s => console.log(`  [${s.section_order}] ${s.key} phase=${s.rule_phase || '-'} group=${s.section_group || '-'}`));

    // Check TTK
    const ttk = await db.all(`SELECT key, label, section_order, section_group, rule_phase
        FROM consult_type_configs WHERE crm_menu = 'tu_tim_kiem' ORDER BY section_order`);
    console.log('\nTTK all buttons:');
    ttk.forEach(s => console.log(`  [${s.section_order}] ${s.key} phase=${s.rule_phase || '-'}`));

    process.exit(0);
})();
