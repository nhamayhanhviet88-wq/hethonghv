const db = require('./db/pool');
const jwt = require('jsonwebtoken');

(async () => {
    await db.init();
    const u = await db.get("SELECT id, username, full_name, role FROM users WHERE role = 'giam_doc'");
    console.log('GD user:', u?.id, u?.username);

    const token = jwt.sign(
        { id: u.id, username: u.username, full_name: u.full_name, role: u.role },
        process.env.JWT_SECRET
    );

    const resp = await fetch(
        'http://localhost:11000/api/reports/customer-retention/advanced?period=month&date=2026-05',
        { headers: { Cookie: 'token=' + token } }
    );

    const data = await resp.json();
    console.log('STATUS:', resp.status);

    if (data.error) {
        console.log('ERROR:', data.error);
    } else {
        console.log('LB rev count:', data.leaderboard?.by_revenue?.length);
        console.log('LB orders count:', data.leaderboard?.by_orders?.length);
        console.log('LB ret count:', data.leaderboard?.by_retention?.length);
        console.log('ALERTS count:', data.alerts?.length);
        if (data.alerts?.length) console.log('ALERTS:', JSON.stringify(data.alerts.slice(0,3)));
        console.log('CONVERSION:', JSON.stringify(data.conversion));
        console.log('PROCESSING:', JSON.stringify(data.processing));
        console.log('TEAMS count:', data.teamComparison?.length);
        if (data.teamComparison?.length) console.log('TEAMS:', JSON.stringify(data.teamComparison));
        console.log('TOP CUST count:', data.topCustomers?.length);
        if (data.leaderboard?.by_revenue?.[0]) console.log('TOP1:', JSON.stringify(data.leaderboard.by_revenue[0]));
        if (data.topCustomers?.[0]) console.log('CUST1:', JSON.stringify(data.topCustomers[0]));
    }

    process.exit();
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
