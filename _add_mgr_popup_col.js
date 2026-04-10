const db = require('./db/pool');
async function main() {
    await new Promise(r => setTimeout(r, 500));
    
    // Add penalty_mgr_popup_date column for manager penalty popup tracking
    try {
        await db.run("ALTER TABLE users ADD COLUMN penalty_mgr_popup_date TEXT");
        console.log('Added penalty_mgr_popup_date column');
    } catch(e) {
        if (e.message.includes('already exists')) console.log('Column already exists');
        else console.error('Error:', e.message);
    }
    
    process.exit();
}
main().catch(e => { console.log('ERR:', e.message); process.exit(1); });
