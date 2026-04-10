require('dotenv').config();
const db = require('./db/pool');

async function check() {
    await db.init();
    
    // Current status breakdown by CRM type
    const result = await db.all(`
        SELECT s.crm_type,
            COUNT(d.id) as total,
            COUNT(d.id) FILTER (WHERE d.status = 'available') as available,
            COUNT(d.id) FILTER (WHERE d.status = 'assigned') as assigned,
            COUNT(d.id) FILTER (WHERE d.status = 'answered') as answered,
            COUNT(d.id) FILTER (WHERE d.status = 'cold') as cold
        FROM telesale_sources s
        LEFT JOIN telesale_data d ON d.source_id = s.id
        WHERE s.is_active = true
        GROUP BY s.crm_type
    `);
    console.log('\n=== HIỆN TẠI (SAU THU HỒI) ===');
    console.table(result);

    // Assigned today only
    const today = '2026-04-10';
    const todayAssigned = await db.all(`
        SELECT s.crm_type, COUNT(DISTINCT a.data_id) as assigned_today
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        JOIN telesale_sources s ON s.id = d.source_id
        WHERE a.assigned_date = $1
        GROUP BY s.crm_type
    `, [today]);
    console.log('\n=== ASSIGNED HÔM NAY ===');
    console.table(todayAssigned);

    // Total all
    const total = await db.get(`
        SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'available') as available,
            COUNT(*) FILTER (WHERE status = 'assigned') as assigned
        FROM telesale_data d
        JOIN telesale_sources s ON s.id = d.source_id AND s.is_active = true
    `);
    console.log('\n=== TỔNG TẤT CẢ CRM ===');
    console.log(`Total: ${total.total} | Available: ${total.available} | Assigned: ${total.assigned}`);

    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
