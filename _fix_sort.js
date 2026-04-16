const db = require('./db/pool');
require('dotenv').config();

async function fix() {
    const menus = ['ctv','nhu_cau','affiliate','goi_ban_hang'];
    for (const m of menus) {
        const rows = await db.all(
            'SELECT key, sort_order FROM consult_type_configs WHERE crm_menu = $1 ORDER BY sort_order',
            [m]
        );
        console.log('\n=== Fixing ' + m + ' (' + rows.length + ' items) ===');
        for (let i = 0; i < rows.length; i++) {
            const newSort = i + 1;
            if (rows[i].sort_order !== newSort) {
                await db.run(
                    'UPDATE consult_type_configs SET sort_order = $1 WHERE key = $2 AND crm_menu = $3',
                    [newSort, rows[i].key, m]
                );
                console.log('  ' + rows[i].key + ': ' + rows[i].sort_order + ' → ' + newSort);
            }
        }
    }
    console.log('\n✅ All sort orders fixed to sequential 1,2,3...');
    process.exit(0);
}
fix();
