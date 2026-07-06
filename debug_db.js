const db = require('./db/pool');

async function run() {
    try {
        await db.init();
        
        console.log('--- TYPE CONFIGS for huy and cap_cuu_sep ---');
        const types = await db.all(`SELECT crm_menu, key, label, section_order, is_active FROM consult_type_configs WHERE key IN ('huy', 'cap_cuu_sep')`);
        console.log(types);
        
    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

run();
