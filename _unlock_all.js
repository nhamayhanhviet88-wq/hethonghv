const db = require('./db/pool');
async function main() {
    await new Promise(r => setTimeout(r, 500));
    
    // Unlock all currently locked accounts
    const result = await db.run("UPDATE users SET status = 'active' WHERE status = 'locked'");
    console.log('Unlocked all locked accounts:', result);
    
    // Reset penalty_popup_date so everyone sees the notification popup on next login
    await db.run("UPDATE users SET penalty_popup_date = NULL");
    console.log('Reset penalty_popup_date for all users');
    
    process.exit();
}
main().catch(e => { console.log('ERR:', e.message); process.exit(1); });
