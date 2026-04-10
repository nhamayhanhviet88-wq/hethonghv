const http = require('http');

function apiCall(method, path, body, cookie) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'localhost', port: 11000,
            path, method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (cookie) opts.headers['Cookie'] = cookie;
        const req = http.request(opts, res => {
            let data = '';
            const setCookie = res.headers['set-cookie'];
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ body: JSON.parse(data), cookie: setCookie }); } catch(e) { resolve({ body: data, cookie: setCookie }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

(async () => {
    // 1. Login as nhanvien3
    const login = await apiCall('POST', '/api/auth/login', { username: 'nhanvien3', password: 'nhanvien3' });
    const cookieStr = (login.cookie || []).join('; ').split(';')[0];
    console.log('✅ Login OK, cookie:', cookieStr.substring(0, 30) + '...');

    // 2. Test self-search-locations
    const locs = await apiCall('GET', '/api/self-search-locations', null, cookieStr);
    console.log('📍 Locations:', JSON.stringify(locs.body));

    // 3. Test self-search sources
    const srcs = await apiCall('GET', '/api/telesale/sources?crm_type=tu_tim_kiem', null, cookieStr);
    console.log('📂 Sources:', (srcs.body.sources||[]).map(s => `${s.id}:${s.name}`));

    // 4. If no locations, create them
    if (!locs.body.locations || locs.body.locations.length === 0) {
        const adminLogin = await apiCall('POST', '/api/auth/login', { username: 'admin', password: 'admin' });
        const adminCookie = (adminLogin.cookie || []).join('; ').split(';')[0];
        for (const name of ['Facebook', 'Zalo', 'Google Maps', 'Đi thực tế']) {
            const r = await apiCall('POST', '/api/self-search-locations', { name }, adminCookie);
            console.log(`  → Added "${name}":`, r.body.success);
        }
    }

    // 5. Test self-search insert
    const locsRefresh = await apiCall('GET', '/api/self-search-locations', null, cookieStr);
    const srcId = (srcs.body.sources||[])[0]?.id;
    const locId = (locsRefresh.body.locations||[])[0]?.id;
    console.log('\n📝 Inserting test customer... srcId:', srcId, 'locId:', locId);
    
    const ins = await apiCall('POST', '/api/telesale/self-search', {
        customer_name: 'Test Nguyễn Văn A',
        fb_link: 'https://facebook.com/test_' + Date.now(),
        phone: '',
        source_id: srcId,
        search_location_id: locId
    }, cookieStr);
    console.log('Result:', JSON.stringify(ins.body));

    // 6. Stats
    const me = await apiCall('GET', '/api/auth/me', null, cookieStr);
    const userId = me.body.user?.id;
    const stats = await apiCall('GET', `/api/telesale/self-search-stats/${userId}`, null, cookieStr);
    console.log('📊 Stats:', JSON.stringify(stats.body));

    process.exit(0);
})();
