const db = require('./db/pool');
(async () => {
    // Get all customers with crm_type tu_tim_kiem
    const custs = await db.all(`
        SELECT c.id, c.customer_name, c.phone, c.crm_type, c.appointment_date,
               c.cancel_requested, c.cancel_approved, c.created_at,
               c.assigned_to_id
        FROM customers c
        WHERE c.crm_type = 'tu_tim_kiem'
        ORDER BY c.id
    `);
    console.log('=== ALL tu_tim_kiem customers ===', custs.length);
    custs.forEach(c => {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        let cat = 'unknown';
        
        if (c.cancel_requested === 1 && c.cancel_approved === 0) cat = 'da_xu_ly (cho duyet huy)';
        else if (c.cancel_approved === 1) cat = 'huy_khach';
        else {
            let appointIsToday = false, appointIsFuture = false;
            if (c.appointment_date) {
                const ad = new Date(c.appointment_date);
                const as2 = ad.getFullYear() + '-' + String(ad.getMonth()+1).padStart(2,'0') + '-' + String(ad.getDate()).padStart(2,'0');
                appointIsToday = (as2 === todayStr);
                appointIsFuture = (as2 > todayStr);
            }
            let createdToday = false;
            if (c.created_at) {
                const cd = new Date(c.created_at);
                const cs = cd.getFullYear() + '-' + String(cd.getMonth()+1).padStart(2,'0') + '-' + String(cd.getDate()).padStart(2,'0');
                createdToday = (cs === todayStr);
            }
            if (createdToday) cat = 'moi_chuyen';
            else if (appointIsToday) cat = 'phai_xu_ly';
            else if (c.appointment_date && !appointIsToday && !appointIsFuture) cat = 'xu_ly_tre';
            else if (appointIsFuture) cat = 'cho_xu_ly';
            else cat = 'cho_xu_ly (no appointment)';
        }
        console.log(`ID=${c.id} | ${c.customer_name} | appt=${c.appointment_date} | created=${c.created_at?.toString().substring(0,10)} | cat=${cat}`);
    });
    process.exit();
})();
