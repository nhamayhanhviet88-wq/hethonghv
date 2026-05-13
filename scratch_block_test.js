const db = require('./db/pool');
(async () => {
    // Get column names for lock and chain tables
    const lockCols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='lock_task_completions' ORDER BY ordinal_position");
    console.log('lock_task_completions:', lockCols.map(c=>c.column_name).join(', '));
    
    const chainCols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='chain_task_completions' ORDER BY ordinal_position");
    console.log('chain_task_completions:', chainCols.map(c=>c.column_name).join(', '));

    // Now query with correct columns
    const uid = 52;
    
    console.log('\n📌 CV ĐIỂM:');
    const s1 = await db.all("SELECT task_date::text, penalty_amount FROM task_support_requests WHERE status='expired' AND (manager_id=$1 OR user_id=$1) AND penalty_amount > 0 AND task_date >= '2026-05-01'", [uid]);
    s1.forEach(p => console.log('  ' + p.task_date + ' | ' + p.penalty_amount.toLocaleString() + 'đ'));

    console.log('\n🔒 CV KHÓA:');
    const s2 = await db.all("SELECT completion_date::date::text as d, penalty_amount FROM lock_task_completions WHERE user_id=$1 AND penalty_amount > 0 AND completion_date >= '2026-05-01'", [uid]);
    s2.forEach(p => console.log('  ' + p.d + ' | ' + p.penalty_amount.toLocaleString() + 'đ'));

    console.log('\n🔗 CV CHUỖI:');
    const s3 = await db.all("SELECT created_at::date::text as d, penalty_amount FROM chain_task_completions WHERE user_id=$1 AND penalty_amount > 0 AND created_at >= '2026-05-01'", [uid]);
    s3.forEach(p => console.log('  ' + p.d + ' | ' + p.penalty_amount.toLocaleString() + 'đ'));

    console.log('\n🚨 CẤP CỨU:');
    const s4 = await db.all("SELECT created_at::date::text as dt, penalty_amount, reason FROM emergencies WHERE (handler_id=$1 OR handover_to=$1) AND penalty_applied=true", [uid]);
    s4.forEach(p => console.log('  ' + p.dt + ' | ' + (p.penalty_amount||0) + 'đ | ' + p.reason));

    console.log('\n⏰ KH PENALTY:');
    const s5 = await db.all('SELECT penalty_date::text, crm_type, unhandled_count, penalty_amount FROM customer_penalty_records WHERE user_id=$1 ORDER BY penalty_date DESC', [uid]);
    s5.forEach(p => console.log('  ' + p.penalty_date + ' | ' + p.crm_type + ' | ' + p.unhandled_count + 'KH | ' + p.penalty_amount.toLocaleString() + 'đ'));

    const t1=s1.reduce((s,p)=>s+p.penalty_amount,0);
    const t2=s2.reduce((s,p)=>s+p.penalty_amount,0);
    const t3=s3.reduce((s,p)=>s+p.penalty_amount,0);
    const t4=s4.reduce((s,p)=>s+(p.penalty_amount||0),0);
    const t5=s5.reduce((s,p)=>s+p.penalty_amount,0);
    console.log('\n════════════════════');
    console.log('TỔNG: '+(t1+t2+t3+t4+t5).toLocaleString()+'đ');
    process.exit();
})();
