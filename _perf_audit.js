const jwt = require('jsonwebtoken');
const http = require('http');
const token = jwt.sign({id:1,username:'admin',role:'giam_doc'}, 'dongphuchv_secret_key_2024_change_this', {expiresIn:'2h'});

async function timeAPI(path) {
    return new Promise(resolve => {
        const start = Date.now();
        const opts = { hostname:'localhost', port:11000, path, headers: { Cookie: 'token='+token } };
        http.get(opts, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => {
                const elapsed = Date.now() - start;
                let size = d.length;
                let count = '?';
                try {
                    const j = JSON.parse(d);
                    if (j.data) count = j.data.length;
                    else if (j.sources) count = j.sources.length;
                    else if (j.members) count = j.members.length;
                    else if (j.users) count = j.users.length;
                    else if (j.departments) count = j.departments.length;
                    else if (j.stats) count = JSON.stringify(j.stats).length + ' bytes';
                } catch(e) {}
                resolve({ path, elapsed, size: (size/1024).toFixed(1)+'KB', count });
            });
        }).on('error', e => resolve({ path, elapsed: -1, error: e.message }));
    });
}

(async () => {
    console.log('=== PERFORMANCE AUDIT: /hethonggoidien page load ===\n');
    
    // These are the API calls the page init makes
    const apis = [
        '/api/telesale/sources?crm_type=all',
        '/api/telesale/data-pool?source_id=1&page=1&limit=50',
        '/api/telesale/data-pool/stats?crm_type=hoa_hong_crm',
        '/api/telesale/active-members',
        '/api/users',
        '/api/departments',
    ];
    
    // Sequential timing (simulates page load)
    console.log('--- Sequential API calls ---');
    let total = 0;
    for (const api of apis) {
        const r = await timeAPI(api);
        total += r.elapsed;
        console.log(`  ${r.elapsed.toString().padStart(5)}ms | ${r.size.padStart(8)} | ${String(r.count).padStart(6)} items | ${r.path}`);
    }
    console.log(`  Total: ${total}ms\n`);
    
    // Check data volume
    const db = require('./db/pool');
    const counts = await Promise.all([
        db.get('SELECT COUNT(*) as cnt FROM telesale_data'),
        db.get('SELECT COUNT(*) as cnt FROM telesale_sources'),
        db.get('SELECT COUNT(*) as cnt FROM telesale_assignments'),
        db.get("SELECT pg_size_pretty(pg_total_relation_size('telesale_data')) as size"),
    ]);
    console.log('--- Data Volume ---');
    console.log(`  telesale_data:        ${counts[0].cnt.toLocaleString()} rows (${counts[3].size})`);
    console.log(`  telesale_sources:     ${counts[1].cnt.toLocaleString()} rows`);
    console.log(`  telesale_assignments: ${counts[2].cnt.toLocaleString()} rows`);
    
    // Check if there are indexes
    const indexes = await db.all(`SELECT indexname, tablename FROM pg_indexes WHERE tablename = 'telesale_data' ORDER BY indexname`);
    console.log(`\n--- Indexes on telesale_data ---`);
    indexes.forEach(i => console.log(`  ${i.indexname}`));
    
    // Check the heaviest query - data-pool with large offset
    console.log('\n--- Stress test: large page offset ---');
    const r1 = await timeAPI('/api/telesale/data-pool?source_id=1&page=1&limit=50');
    const r2 = await timeAPI('/api/telesale/data-pool?source_id=1&page=100&limit=50');
    const r3 = await timeAPI('/api/telesale/data-pool?source_id=1&page=1000&limit=50');
    console.log(`  Page 1:    ${r1.elapsed}ms`);
    console.log(`  Page 100:  ${r2.elapsed}ms`);
    console.log(`  Page 1000: ${r3.elapsed}ms`);
    
    // Stats query performance
    console.log('\n--- Stats query ---');
    const s1 = await timeAPI('/api/telesale/data-pool/stats?crm_type=hoa_hong_crm');
    const s2 = await timeAPI('/api/telesale/data-pool/stats?crm_type=all');
    console.log(`  Stats (hoa_hong_crm): ${s1.elapsed}ms`);
    console.log(`  Stats (all):          ${s2.elapsed}ms`);
    
    // Projection: 3x and 5x data
    const currentRows = counts[0].cnt;
    console.log(`\n--- Growth Projection ---`);
    console.log(`  Current: ${currentRows.toLocaleString()} rows`);
    console.log(`  x3:      ${(currentRows*3).toLocaleString()} rows`);
    console.log(`  x5:      ${(currentRows*5).toLocaleString()} rows`);
    console.log(`  ⚠️ Without indexes: stats queries scale O(n) → ${(s2.elapsed*3)}ms at x3, ${(s2.elapsed*5)}ms at x5`);
    
    process.exit(0);
})();
