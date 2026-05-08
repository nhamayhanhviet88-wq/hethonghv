require('dotenv').config();
const db = require('./db/pool');
(async()=>{
    await db.init();
    
    // Get ALL customers with their affiliate info
    const custs = await db.all(`
        SELECT c.id, c.customer_name, c.referrer_id, c.crm_type,
            u_self.id as own_aff_id, u_self.username as own_aff_name, u_self.source_customer_id,
            u_ref.source_customer_id as ref_source_cust
        FROM customers c
        LEFT JOIN users u_self ON u_self.source_customer_id = c.id AND u_self.status = 'active'
        LEFT JOIN users u_ref ON u_ref.id = c.referrer_id
        WHERE c.crm_type IN ('nhu_cau','ctv_hoa_hong','affiliate','koc_kol')
        ORDER BY c.id
    `);
    
    // Get completed orders
    const completed = await db.all(`SELECT DISTINCT customer_id FROM order_codes WHERE status = 'completed'`);
    const completedSet = new Set(completed.map(r => r.customer_id));
    
    console.log('=== AUDIT: next_aff_rate cho mỗi KH ===\n');
    console.log('ID | Tên KH | referrer_id | own_aff | isSelfRef | completed | CURRENT_LOGIC | CORRECT_LOGIC');
    console.log('-'.repeat(120));
    
    for (const c of custs) {
        const hasOwnAff = !!c.own_aff_id;
        const isSelfReferrer = hasOwnAff && c.referrer_id === c.own_aff_id;
        const hasCompleted = completedSet.has(c.id);
        
        // Current logic (buggy): selfOrderSet check first
        let currentRate;
        if (hasOwnAff) currentRate = 10;
        else if (!c.referrer_id) currentRate = 0;
        else if (hasCompleted) currentRate = 0;
        else currentRate = '10/15';
        
        // Correct logic: check if referrer is actually self
        let correctRate;
        if (isSelfReferrer || (hasOwnAff && !c.referrer_id)) {
            correctRate = 10; // self-order lifetime
        } else if (!c.referrer_id) {
            correctRate = 0;
        } else if (hasCompleted) {
            correctRate = 0; // first-order-only done
        } else {
            correctRate = '10/15'; // first order pending
        }
        
        const mismatch = String(currentRate) !== String(correctRate) ? ' ❌ MISMATCH' : '';
        if (hasOwnAff || c.referrer_id) {
            console.log(`${c.id} | ${c.customer_name.padEnd(25)} | ref:${String(c.referrer_id).padEnd(5)} | aff:${String(c.own_aff_id || '-').padEnd(4)} | selfRef:${isSelfReferrer ? 'YES' : 'NO '} | done:${hasCompleted ? 'YES' : 'NO '} | CURRENT:${String(currentRate).padEnd(5)} | CORRECT:${correctRate}${mismatch}`);
        }
    }
    
    process.exit();
})();
