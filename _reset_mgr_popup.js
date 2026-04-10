const db = require('./db/pool');
setTimeout(async () => {
    await db.run('UPDATE users SET penalty_mgr_popup_date = NULL');
    const r = await db.all("SELECT username, role, penalty_mgr_popup_date FROM users WHERE role IN ('giam_doc','quan_ly_cap_cao','quan_ly','truong_phong')");
    console.log(JSON.stringify(r, null, 2));
    process.exit();
}, 500);
