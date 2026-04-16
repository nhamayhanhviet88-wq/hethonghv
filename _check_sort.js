const db = require('./db/pool');
require('dotenv').config();

async function check() {
    const menus = ['ctv','nhu_cau','affiliate','goi_don_hang_thiet_ke','goi_ban_hang','koc'];
    for (const m of menus) {
        const r = await db.all(
            'SELECT key, label, sort_order, section_order FROM consult_type_configs WHERE crm_menu = $1 ORDER BY sort_order',
            [m]
        );
        console.log('\n=== ' + m + ' === ' + r.length + ' items');
        r.forEach((x, i) => {
            const flag = (x.sort_order !== i + 1) ? ' ❌ WRONG' : '';
            console.log((i+1) + '. sort=' + x.sort_order + ' sec=' + x.section_order + ' ' + x.key + ' ' + x.label + flag);
        });
    }
    process.exit(0);
}
check();
