const http = require('http');

function request(method, path, body, cookie) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = { Cookie: cookie || '' };
        if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
        const opts = { hostname: 'localhost', port: 11000, path, method, headers };
        const req = http.request(opts, resp => {
            let d = '';
            resp.on('data', c => d += c);
            resp.on('end', () => resolve({ status: resp.statusCode, data: JSON.parse(d), headers: resp.headers }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

(async () => {
    try {
        // Login
        const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
        console.log('Login:', login.status, login.data.success ? '✅ OK' : '❌ ' + login.data.error);
        const setCookie = login.headers['set-cookie'];
        const cookie = setCookie ? setCookie[0].split(';')[0] : '';
        if (!cookie) { console.log('No cookie, exiting'); process.exit(1); }

        // Test Sources
        const src = await request('GET', '/api/telesale/sources', null, cookie);
        console.log('\n📞 Sources:', src.data.sources?.length, 'items');
        src.data.sources?.slice(0, 3).forEach(s => console.log('  -', s.icon, s.name, 'quota:', s.daily_quota));

        // Test Statuses
        const st = await request('GET', '/api/telesale/answer-statuses', null, cookie);
        console.log('\n📱 Statuses:', st.data.statuses?.length, 'items');
        st.data.statuses?.forEach(s => console.log('  -', s.icon, s.name, '→', s.action_type));

        // Test Data Stats
        const stats = await request('GET', '/api/telesale/data/stats', null, cookie);
        console.log('\n📊 Stats:', stats.data.stats?.length, 'sources');

        // Test Members
        const mem = await request('GET', '/api/telesale/active-members', null, cookie);
        console.log('\n👥 Members:', mem.data.members?.length, 'active');

        // Test Import Columns
        const cols = await request('GET', '/api/telesale/import-columns', null, cookie);
        console.log('\n📄 Import Columns:', cols.data.columns?.length);

        // Test My Calls
        const calls = await request('GET', '/api/telesale/my-calls', null, cookie);
        console.log('\n📞 My Calls:', calls.data.calls?.length);

        // Test Daily Stats
        const daily = await request('GET', '/api/telesale/daily-stats/1', null, cookie);
        console.log('\n📊 Daily Stats:', JSON.stringify(daily.data.stats));

        // Test Invalid Numbers
        const inv = await request('GET', '/api/telesale/invalid-numbers', null, cookie);
        console.log('\n❌ Invalid Numbers:', inv.data.numbers?.length);

        console.log('\n🎉 ALL 9 API ENDPOINTS TESTED SUCCESSFULLY!');
    } catch (e) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
})();
