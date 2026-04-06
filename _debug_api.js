const jwt = require('jsonwebtoken');
const http = require('http');
const token = jwt.sign({id:1,username:'admin',role:'giam_doc'}, 'dongphuchv_secret_key_2024_change_this', {expiresIn:'2h'});

// Test /api/telesale/active-members
const opts = { hostname:'localhost', port:11000, path:'/api/telesale/active-members', headers: { Cookie: 'token='+token } };
http.get(opts, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
        const res = JSON.parse(d);
        console.log('=== /api/telesale/active-members ===');
        const members = res.members || [];
        console.log('Count:', members.length);
        members.forEach(m => console.log(`  [${m.user_id}] ${m.full_name} | dept_name=${m.dept_name} | department_id=${m.department_id}`));
        console.log('\nSample keys:', members[0] ? Object.keys(members[0]) : 'no members');
        
        // Check department hierarchy
        const opts2 = { hostname:'localhost', port:11000, path:'/api/departments', headers: { Cookie: 'token='+token } };
        http.get(opts2, r2 => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
                const res2 = JSON.parse(d2);
                const depts = res2.departments || [];
                console.log('\n=== DEPARTMENT HIERARCHY ===');
                // Build tree
                const roots = depts.filter(d => !d.parent_id);
                roots.forEach(root => {
                    console.log(`\n🏢 ${root.name} (id:${root.id})`);
                    const children = depts.filter(d => d.parent_id === root.id);
                    children.forEach(child => {
                        console.log(`  📁 ${child.name} (id:${child.id})`);
                        const teams = depts.filter(d => d.parent_id === child.id);
                        teams.forEach(t => console.log(`    👥 ${t.name} (id:${t.id})`));
                    });
                });
                
                process.exit(0);
            });
        });
    });
});
