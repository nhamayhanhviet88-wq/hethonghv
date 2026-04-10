const db = require('./db/pool');
setTimeout(async () => {
    const r = await db.all("SELECT id, name, crm_type, is_active FROM telesale_sources WHERE crm_type = 'goi_hop_tac' ORDER BY id");
    console.log('goi_hop_tac sources:', JSON.stringify(r, null, 2));
    const d = await db.get("SELECT COUNT(*) as cnt FROM telesale_data d JOIN telesale_sources s ON s.id = d.source_id WHERE s.crm_type = 'goi_hop_tac'");
    console.log('goi_hop_tac data count:', d.cnt);
    process.exit();
}, 500);
