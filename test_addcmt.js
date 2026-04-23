const http = require('http');

function post(path, body, cookie) {
    return new Promise((resolve) => {
        const opts = {
            hostname: 'localhost', port: 11000, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }
        };
        const r = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
        });
        r.write(JSON.stringify(body));
        r.end();
    });
}

(async () => {
    // Login
    const login = await post('/api/auth/login', { username: 'nhanvien', password: 'nhanvien' });
    console.log('LOGIN:', login.status, login.body);
    
    const cookies = login.headers['set-cookie'] || [];
    const token = cookies.find(c => c.startsWith('token='));
    if (!token) { console.log('NO TOKEN'); process.exit(1); }
    const tk = token.split(';')[0];
    
    // Test addcmt
    const result = await post('/api/addcmt/entries', {
        fb_link: 'test_' + Date.now(),
        image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }, tk);
    
    console.log('ADDCMT:', result.status, result.body);
    process.exit(0);
})();
