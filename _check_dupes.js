require('dotenv').config();
const db = require('./db/pool');
(async () => {
    // All CRM types total
    const all = await db.all(`
        SELECT s.crm_type, COUNT(d.id) as cnt
        FROM telesale_sources s
        LEFT JOIN telesale_data d ON d.source_id = s.id
        GROUP BY s.crm_type
    `);
    console.log('=== ALL CRM totals ===');
    all.forEach(r => console.log(' ', r.crm_type || '(null)', ':', r.cnt));

    // Check Mam Non source specifically
    const mamNon = await db.all(`
        SELECT s.id, s.name, s.crm_type, COUNT(d.id) as cnt
        FROM telesale_sources s
        LEFT JOIN telesale_data d ON d.source_id = s.id
        WHERE s.name LIKE '%Mầm%' OR s.name LIKE '%mam%' OR s.name LIKE '%M_m%'
        GROUP BY s.id
    `);
    console.log('=== Mầm Non sources ===');
    mamNon.forEach(r => console.log(' ', r.id, r.name, '[' + r.crm_type + ']', ':', r.cnt));

    // Check if same phone exists across different CRM types
    const crossCrm = await db.all(`
        SELECT d.phone, COUNT(DISTINCT s.crm_type) as crm_cnt
        FROM telesale_data d
        JOIN telesale_sources s ON s.id = d.source_id
        GROUP BY d.phone HAVING COUNT(DISTINCT s.crm_type) > 1
        LIMIT 10
    `);
    console.log('=== Cross-CRM duplicates ===', crossCrm.length, 'found');
    crossCrm.forEach(r => console.log(' ', r.phone, 'in', r.crm_cnt, 'CRMs'));

    // Grand total
    const grand = await db.get('SELECT COUNT(*) as c FROM telesale_data');
    console.log('=== Grand total telesale_data:', grand.c);

    process.exit(0);
})();
