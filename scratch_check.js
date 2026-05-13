const db = require('./db/pool');
(async () => {
    // Reset popup date for GĐ to re-show popup
    const gd = await db.get("SELECT id, penalty_mgr_popup_date FROM users WHERE role = 'giam_doc' LIMIT 1");
    console.log('GĐ popup date:', JSON.stringify(gd));
    
    // Reset it to force re-show
    await db.run("UPDATE users SET penalty_mgr_popup_date = NULL WHERE id = $1", [gd.id]);
    console.log('Reset popup date -> popup will show again on next page load');
    
    process.exit(0);
})();
