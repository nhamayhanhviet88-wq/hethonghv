const http = require('http');

function fetchRaw(path, token) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'localhost', port: 11000, path, method: 'GET', headers: {} };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;
        const req = http.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { console.log(`Status: ${res.statusCode}`); resolve(data); });
        });
        req.on('error', reject);
        req.end();
    });
}

function postJSON(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = { hostname: 'localhost', port: 11000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
        const req = http.request(opts, res => {
            let result = '';
            res.on('data', c => result += c);
            res.on('end', () => resolve(result));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

(async () => {
    const loginRaw = await postJSON('/api/auth/login', { username: 'admin', password: '123456' });
    console.log('Login response:', loginRaw.substring(0, 200));
    const login = JSON.parse(loginRaw);
    const token = login.token;
    
    const raw = await fetchRaw(`/api/penalty/list?dateFrom=2026-04-08&dateTo=2026-04-08`, token);
    console.log('Penalty response (first 500 chars):', raw.substring(0, 500));
})();
