const db = require('./db/pool');
(async () => {
    // 1. Current customers
    const custs = await db.get(`SELECT COUNT(*) as cnt FROM customers WHERE crm_type = 'tu_tim_kiem'`);
    console.log('Customers tu_tim_kiem:', custs.cnt);

    // 2. Current buttons
    const btns = await db.all(`SELECT key, label, crm_menu FROM consult_type_configs WHERE crm_menu = 'tu_tim_kiem' ORDER BY sort_order`);
    console.log('Buttons tu_tim_kiem:', btns.length, btns.map(b => b.key));

    // 3. Current flow rules
    const rules = await db.all(`SELECT from_status, to_type_key FROM consult_flow_rules WHERE crm_menu = 'tu_tim_kiem'`);
    console.log('Flow rules tu_tim_kiem:', rules.length);

    // 4. What does renderCRMPage use?
    console.log('\n--- Current CRM page uses generic renderCRMPage with crm_type=tu_tim_kiem ---');
    console.log('This lacks: stat cards, emergency, cancellation, date filters, pin, etc.');
    
    // 5. Check existing CTV buttons for reference
    const ctvBtns = await db.all(`SELECT key FROM consult_type_configs WHERE crm_menu = 'ctv' AND rule_phase = 'huy_capuu'`);
    console.log('\nCTV emergency/cancel buttons:', ctvBtns.map(b => b.key));

    process.exit(0);
})();
