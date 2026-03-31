const db = require('./db/pool');
(async () => {
    // Check KHÁCH 11 AFFILIATE
    const c = await db.get("SELECT id, customer_name, assigned_to_id, crm_type, cancel_requested, cancel_approved, order_status, appointment_date FROM customers WHERE customer_name LIKE '%11 AFFILIATE%'");
    console.log('KHACH 11:', JSON.stringify(c, null, 2));
    
    // Check nhanvien user id
    const u = await db.get("SELECT id, full_name, role FROM users WHERE full_name = 'nhanvien'");
    console.log('nhanvien:', JSON.stringify(u));
    
    // Check ALL customers assigned to nhanvien with crm_type=nhu_cau
    if (u) {
        const all = await db.all("SELECT id, customer_name, cancel_requested, cancel_approved, order_status FROM customers WHERE assigned_to_id = ? AND crm_type = 'nhu_cau' ORDER BY id", [u.id]);
        console.log('All nhanvien nhu_cau customers (' + all.length + '):');
        all.forEach(r => console.log('  ', r.id, r.customer_name.trim(), 'cancel_req=' + r.cancel_requested, 'cancel_app=' + r.cancel_approved, 'status=' + r.order_status));
    }
    process.exit(0);
})();
