require('dotenv').config();
const db = require('./db/pool');

async function check() {
    await db.init();
    
    // 1. Assignments with call_status = 'answered' (card count source)
    const answered = await db.all(`
        SELECT a.id, a.data_id, a.call_status, a.assigned_date, a.user_id,
            d.status as data_status, d.customer_name, d.company_name, d.phone,
            ans.name as answer_status_name, ans.action_type,
            s.crm_type, s.name as source_name
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        JOIN telesale_sources s ON s.id = d.source_id
        LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
        WHERE a.call_status = 'answered' AND s.crm_type = 'goi_hop_tac'
        ORDER BY a.assigned_date DESC
    `);
    console.log('\n=== ASSIGNMENTS với call_status=answered (card đếm 3) ===');
    console.table(answered.map(r => ({
        assignment_id: r.id,
        data_id: r.data_id,
        customer: r.customer_name,
        data_status: r.data_status,
        answer_status: r.answer_status_name,
        action_type: r.action_type,
        assigned_date: r.assigned_date
    })));

    // 2. Data with status = 'answered' (table filter)
    const dataAnswered = await db.all(`
        SELECT d.id, d.customer_name, d.company_name, d.phone, d.status
        FROM telesale_data d
        JOIN telesale_sources s ON s.id = d.source_id
        WHERE d.status = 'answered' AND s.crm_type = 'goi_hop_tac'
    `);
    console.log('\n=== DATA với status=answered (bảng hiện 1) ===');
    console.table(dataAnswered);

    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
