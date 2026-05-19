const db = require('./db/pool');
(async () => {
    const r1 = await db.get("SELECT id, username, role FROM users WHERE username = $1", ['quanlyxuong']);
    console.log('QLX:', JSON.stringify(r1));
    const r2 = await db.get("SELECT id, username, role FROM users WHERE username = $1", ['leviettrinh']);
    console.log('LVT:', JSON.stringify(r2));
    const bgm = await db.all("SELECT id, name, allowed_roles FROM bgm_items WHERE is_active = true LIMIT 5");
    console.log('BGM:', JSON.stringify(bgm));
    process.exit();
})();
