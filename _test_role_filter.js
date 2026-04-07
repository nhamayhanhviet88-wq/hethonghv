const jwt = require('jsonwebtoken');
const http = require('http');

async function fetchData(token, role) {
    return new Promise(resolve => {
        const opts = { hostname:'localhost', port:11000, path:'/api/telesale/data?source_id=129&page=1&limit=3', headers: { Cookie: 'token='+token } };
        http.get(opts, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => {
                const res = JSON.parse(d);
                if (res.error) { console.log(`\n=== ${role} === ERROR: ${res.error}`); resolve(); return; }
                const data = res.data || [];
                console.log(`\n=== ${role} (${data.length} records) ===`);
                data.forEach(d => {
                    const c = d.post_content || '';
                    const hasSalary = /lương|thu nhập|triệu|tr\/|vnđ|lcb|bao tiền/i.test(c);
                    console.log(`  [${d.id}] salary=${hasSalary?'VISIBLE':'HIDDEN'} | ${c.substring(0,120).replace(/\n/g,' ')}`);
                });
                resolve();
            });
        });
    });
}

(async () => {
    const secret = 'dongphuchv_secret_key_2024_change_this';
    // GD - full access
    await fetchData(jwt.sign({id:1,username:'admin',role:'giam_doc'}, secret, {expiresIn:'2h'}), 'GIÁM ĐỐC');
    // NV - filtered
    await fetchData(jwt.sign({id:2,username:'nhanvien',role:'nhan_vien'}, secret, {expiresIn:'2h'}), 'NHÂN VIÊN');
    // TP - filtered
    await fetchData(jwt.sign({id:3,username:'tp',role:'truong_phong'}, secret, {expiresIn:'2h'}), 'TRƯỞNG PHÒNG');
    process.exit(0);
})();
