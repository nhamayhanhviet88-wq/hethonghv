const db = require('./db/pool');
(async () => {
    // Simulate exactly what the API does
    const requests = await db.all(`SELECT r.*, c.customer_name, c.phone, c.facebook_link, c.crm_type, c.referrer_id,
        req.full_name as requested_by_name, req.role as requested_by_role,
        apr.full_name as approved_by_name,
        cu.full_name as created_user_name, cu.username as created_username
        FROM affiliate_account_requests r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users req ON r.requested_by = req.id
        LEFT JOIN users apr ON r.approved_by = apr.id
        LEFT JOIN users cu ON r.created_user_id = cu.id
        WHERE r.proposed_username = 'khnhucaunv3'`);

    const req = requests[0];
    console.log('proposed_data type:', typeof req.proposed_data);
    console.log('proposed_data:', JSON.stringify(req.proposed_data));
    
    const pd = req.proposed_data ? (typeof req.proposed_data === 'string' ? JSON.parse(req.proposed_data) : req.proposed_data) : {};
    console.log('\nparsed pd.assigned_to_user_id:', pd.assigned_to_user_id, 'type:', typeof pd.assigned_to_user_id);
    
    const parentId = pd.assigned_to_user_id || null;
    console.log('parentId:', parentId);
    
    if (parentId) {
        const parent = await db.get('SELECT full_name, username FROM users WHERE id = ?', [Number(parentId)]);
        console.log('parent query result:', JSON.stringify(parent));
    }

    // CRM conversion
    const conv = await db.get(
        `SELECT from_crm_type, to_crm_type FROM crm_conversion_requests
         WHERE customer_id = ? AND status = 'approved'
         ORDER BY processed_at DESC LIMIT 1`,
        [req.customer_id]
    );
    console.log('\nCRM conv result:', JSON.stringify(conv));

    process.exit(0);
})();
