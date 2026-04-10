require('dotenv').config();
const db = require('./db/pool');

async function check() {
    await db.init();
    
    // 1. Actual data status breakdown for goi_hop_tac
    const dataStatus = await db.all(`
        SELECT d.status, COUNT(*) as count
        FROM telesale_data d
        JOIN telesale_sources s ON s.id = d.source_id
        WHERE s.crm_type = 'goi_hop_tac' AND s.is_active = true
        GROUP BY d.status ORDER BY count DESC
    `);
    console.log('\n=== DATA STATUS (nguồn thật — telesale_data) ===');
    console.table(dataStatus);
    const totalData = dataStatus.reduce((s, r) => s + parseInt(r.count), 0);
    console.log('TỔNG DATA THẬT:', totalData);

    // 2. Assignment-based counts (card counts)
    const today = '2026-04-10';
    const assignmentCounts = await db.all(`
        SELECT 
            COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status = 'answered') as answered,
            COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status = 'invalid') as invalid,
            COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status IN ('no_answer','busy')) as no_answer_busy
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        JOIN telesale_sources s ON s.id = d.source_id
        WHERE s.crm_type = 'goi_hop_tac'
    `);
    console.log('\n=== ASSIGNMENT COUNTS (all time) ===');
    console.table(assignmentCounts);

    // 3. Find records that are counted in MULTIPLE categories
    // Records with assignment call_status='invalid' but data.status is NOT cold/deleted
    const invalidButStillAssigned = await db.all(`
        SELECT d.id, d.customer_name, d.status as data_status, a.call_status, a.assigned_date
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        JOIN telesale_sources s ON s.id = d.source_id
        WHERE a.call_status = 'invalid' AND s.crm_type = 'goi_hop_tac'
        ORDER BY a.assigned_date DESC
    `);
    console.log('\n=== RECORDS với assignment=invalid (card "Hủy Khách") ===');
    console.table(invalidButStillAssigned.map(r => ({
        data_id: r.id, customer: r.customer_name, 
        data_status: r.data_status, call_status: r.call_status,
        double_counted: r.data_status !== 'cold' ? `✅ CŨNG đếm trong "${r.data_status}"` : '—'
    })));

    // 4. Records with answered assignment but data.status != 'answered'
    const answeredButDiff = await db.all(`
        SELECT d.id, d.customer_name, d.status as data_status, a.call_status, ans.name as answer_name, ans.action_type
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        JOIN telesale_sources s ON s.id = d.source_id
        LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
        WHERE a.call_status = 'answered' AND s.crm_type = 'goi_hop_tac'
    `);
    console.log('\n=== RECORDS với assignment=answered ===');
    console.table(answeredButDiff.map(r => ({
        data_id: r.id, customer: r.customer_name,
        data_status: r.data_status, answer: r.answer_name, action: r.action_type,
        also_in: r.data_status === 'cold' ? '"Hủy Khách" (via cold)' : `"${r.data_status}"`
    })));

    // 5. NCC answered records
    const nccRecords = await db.all(`
        SELECT d.id, d.customer_name, d.status as data_status
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        JOIN telesale_sources s ON s.id = d.source_id
        JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
        WHERE ans.action_type = 'cold_ncc' AND s.crm_type = 'goi_hop_tac'
    `);
    console.log('\n=== NCC RECORDS (card "Đã Có NCC") ===');
    console.table(nccRecords.map(r => ({
        data_id: r.id, customer: r.customer_name,
        data_status: r.data_status,
        also_in: r.data_status === 'cold' ? '"Hủy Khách" (via cold)' : `"${r.data_status}"`
    })));

    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
