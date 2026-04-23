// One-time script: Mark all partner_outreach entries as transferred
// if their fb_link or partner_name already exists in the customers table
require('dotenv').config();
const db = require('./db/pool');

(async () => {
    await db.init();
    
    // Find all entries NOT yet marked as transferred
    const entries = await db.all(`
        SELECT id, partner_name, fb_link, phone 
        FROM partner_outreach_entries 
        WHERE transferred_to_crm IS NOT TRUE
    `);
    
    console.log(`Found ${entries.length} entries not yet marked as transferred`);
    
    let updated = 0;
    for (const e of entries) {
        // Check if this entry's data exists in customers table
        let found = false;
        if (e.fb_link) {
            const cust = await db.get('SELECT id FROM customers WHERE facebook_link = $1', [e.fb_link]);
            if (cust) found = true;
        }
        if (!found && e.phone) {
            const cust = await db.get('SELECT id FROM customers WHERE phone = $1', [e.phone]);
            if (cust) found = true;
        }
        
        if (found) {
            await db.run(
                'UPDATE partner_outreach_entries SET transferred_to_crm = true, transferred_at = NOW() WHERE id = $1',
                [e.id]
            );
            console.log(`✅ Marked entry #${e.id} (${e.partner_name || e.fb_link}) as transferred`);
            updated++;
        }
    }
    
    console.log(`\nDone! Updated ${updated} entries.`);
    process.exit(0);
})();
