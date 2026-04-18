const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });
(async () => {
    const r = await p.query(`SELECT phone, COUNT(*) as cnt FROM telesale_data WHERE phone IS NOT NULL AND phone != '' GROUP BY phone HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 10`);
    console.log('Remaining dupes:', r.rows.length, r.rows);
    const r2 = await p.query(`SELECT COUNT(*) as cnt FROM telesale_data WHERE phone IS NULL OR phone = ''`);
    console.log('Empty phones:', r2.rows[0].cnt);
    // Check multi-phone entries (pipe-separated)
    const r3 = await p.query(`SELECT phone, COUNT(*) as cnt FROM telesale_data WHERE phone LIKE '%|%' GROUP BY phone HAVING COUNT(*) > 1 LIMIT 5`);
    console.log('Pipe-separated dupes:', r3.rows);
    await p.end();
})();
