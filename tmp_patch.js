const fs = require('fs');
let content = fs.readFileSync('./routes/affiliate.js', 'utf8');

// Replace the GOD VIEW branch to support filters
const oldGod = `        // ★ GOD VIEW: Giám Đốc xem toàn bộ hệ thống affiliate
        if (request.user.role === 'giam_doc') {
            const children = await db.all(\`
                SELECT u.id, u.full_name, u.phone, u.role, u.status, u.created_at,
                       ct.name as tier_name, ct.percentage as tier_percentage,
                       p.full_name as parent_affiliate_name
                FROM users u
                LEFT JOIN commission_tiers ct ON ct.id = u.commission_tier_id
                LEFT JOIN users p ON p.id = u.assigned_to_user_id
                WHERE u.role = 'tkaffiliate'
                ORDER BY u.created_at DESC
            \`);`;

const newGod = `        // ★ GOD VIEW: Giám Đốc xem toàn bộ hệ thống affiliate
        if (request.user.role === 'giam_doc') {
            const { managerId, from, to } = request.query;

            // Build dynamic WHERE clause
            let whereClauses = ["u.role = 'tkaffiliate'"];
            let whereParams = [];
            if (managerId) { whereClauses.push("u.managed_by_user_id = ?"); whereParams.push(Number(managerId)); }
            if (from) { whereClauses.push("u.created_at >= ?"); whereParams.push(from + ' 00:00:00'); }
            if (to) { whereClauses.push("u.created_at <= ?"); whereParams.push(to + ' 23:59:59'); }

            const children = await db.all(\`
                SELECT u.id, u.full_name, u.phone, u.role, u.status, u.created_at,
                       ct.name as tier_name, ct.percentage as tier_percentage,
                       p.full_name as parent_affiliate_name,
                       mgr.full_name as manager_name
                FROM users u
                LEFT JOIN commission_tiers ct ON ct.id = u.commission_tier_id
                LEFT JOIN users p ON p.id = u.assigned_to_user_id
                LEFT JOIN users mgr ON mgr.id = u.managed_by_user_id
                WHERE \${whereClauses.join(' AND ')}
                ORDER BY u.created_at DESC
            \`, whereParams);`;

if (content.includes(oldGod)) {
    content = content.replace(oldGod, newGod);
    
    // Also add date filter to customer stats queries
    const oldCustQuery = `                    FROM customers c WHERE c.referrer_id IN (\${ph}) GROUP BY c.referrer_id
                \`, allIds);`;
    const newCustQuery = `                    FROM customers c WHERE c.referrer_id IN (\${ph})\${from ? ' AND c.created_at >= \\'' + from + ' 00:00:00\\'' : ''}\${to ? ' AND c.created_at <= \\'' + to + ' 23:59:59\\'' : ''} GROUP BY c.referrer_id
                \`, allIds);`;
    // Only replace the first occurrence (in GOD VIEW section)
    const idx = content.indexOf(oldCustQuery);
    if (idx > 0) {
        content = content.substring(0, idx) + newCustQuery + content.substring(idx + oldCustQuery.length);
        console.log('✅ Customer stats date filter added');
    }

    fs.writeFileSync('./routes/affiliate.js', content, 'utf8');
    console.log('✅ GOD VIEW filters patched');
} else {
    console.log('❌ GOD VIEW marker not found');
}
