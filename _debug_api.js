const jwt = require('jsonwebtoken');
const http = require('http');
const token = jwt.sign({id:1,username:'admin',role:'giam_doc'}, 'dongphuchv_secret_key_2024_change_this', {expiresIn:'2h'});

// Test /api/departments
const opts = { hostname:'localhost', port:11000, path:'/api/departments', headers: { Cookie: 'token='+token } };
http.get(opts, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
        const res = JSON.parse(d);
        console.log('=== /api/departments ===');
        console.log('Keys:', Object.keys(res));
        const depts = res.departments || res.teams || res;
        console.log('Dept count:', Array.isArray(depts) ? depts.length : 'NOT ARRAY');
        if (Array.isArray(depts) && depts.length > 0) {
            console.log('Sample:', JSON.stringify(depts[0]).slice(0, 200));
        }
        
        // Also test /api/users to check department_id
        const opts2 = { hostname:'localhost', port:11000, path:'/api/users', headers: { Cookie: 'token='+token } };
        http.get(opts2, r2 => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
                const res2 = JSON.parse(d2);
                const users = res2.users || res2;
                const active = users.filter(u => u.status === 'active');
                console.log('\n=== /api/users ===');
                console.log('Active users:', active.length);
                active.forEach(u => console.log(`  [${u.id}] ${u.full_name} dept_id=${u.department_id}`));
                process.exit(0);
            });
        });
    });
});
