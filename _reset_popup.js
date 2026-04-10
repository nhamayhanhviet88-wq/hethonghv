const db = require('./db/pool');
async function main() {
    await new Promise(r => setTimeout(r, 500));
    await db.run("UPDATE users SET penalty_popup_date = NULL WHERE username = 'quanly1'");
    console.log('Reset OK');
    process.exit();
}
main().catch(e => { console.log('ERR:', e.message); process.exit(1); });
