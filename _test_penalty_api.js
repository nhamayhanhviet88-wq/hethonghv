const http = require('http');

// Login first, then call penalty/list with different filters
async function fetchJSON(path, token) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'localhost', port: 11000, path, method: 'GET', headers: {} };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;
        const req = http.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function postJSON(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = { hostname: 'localhost', port: 11000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } };
        const req = http.request(opts, res => {
            let result = '';
            res.on('data', c => result += c);
            res.on('end', () => resolve(JSON.parse(result)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

(async () => {
    // Login as admin
    const login = await postJSON('/api/auth/login', { username: 'admin', password: '123456' });
    const token = login.token;
    console.log('Logged in as admin');
    
    // Test "Hôm qua" filter
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const ys = yesterday.toISOString().split('T')[0];
    const homqua = await fetchJSON(`/api/penalty/list?dateFrom=${ys}&dateTo=${ys}`, token);
    console.log(`\n=== HÔM QUA (${ys}) ===`);
    console.log(`Total: ${homqua.total}đ, Penalties: ${homqua.penalties?.length || 0}`);
    (homqua.penalties || []).forEach(p => console.log(`  ${p.penalized_username} | ${p.task_name} | ${p.task_date} | ${p.source_type} | ${p.penalty_amount}đ`));
    
    // Test "7 ngày" filter
    const d7 = new Date(); d7.setDate(d7.getDate() - 6);
    const d7s = d7.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const bay = await fetchJSON(`/api/penalty/list?dateFrom=${d7s}&dateTo=${today}`, token);
    console.log(`\n=== 7 NGÀY (${d7s} → ${today}) ===`);
    console.log(`Total: ${bay.total}đ, Penalties: ${bay.penalties?.length || 0}`);
    (bay.penalties || []).forEach(p => console.log(`  ${p.penalized_username} | ${p.task_name} | ${p.task_date} | ${p.source_type} | ${p.penalty_amount}đ`));
    
    // Test "Tháng này"
    const mStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const thang = await fetchJSON(`/api/penalty/list?monthFrom=${mStart}&monthTo=${mStart}`, token);
    console.log(`\n=== THÁNG NÀY (${mStart}) ===`);
    console.log(`Total: ${thang.total}đ, Penalties: ${thang.penalties?.length || 0}`);
    (thang.penalties || []).forEach(p => console.log(`  ${p.penalized_username} | ${p.task_name} | ${p.task_date} | ${p.source_type} | ${p.penalty_amount}đ`));
})();
