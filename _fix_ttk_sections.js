const db = require('./db/pool');
(async () => {
    const updates = [
        ['pending_emergency', 15],
        ['hoan_thanh_cap_cuu', 16],
        ['cho_duyet_huy', 17],
        ['duyet_huy', 18],
        ['tu_van_lai', 19],
    ];
    for (const [key, order] of updates) {
        await db.run(`UPDATE consult_type_configs SET section_order = ${order} WHERE key = '${key}' AND crm_menu = 'tu_tim_kiem'`);
        console.log('Updated', key, '-> section_order', order);
    }
    console.log('Done!');
    process.exit(0);
})();
