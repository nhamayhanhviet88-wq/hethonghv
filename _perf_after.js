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
            r.on('end', () => resolve({ path, elapsed: Date.now() - start, size: (d.length/1024).toFixed(1)+'KB' }));
        }).on('error', e => resolve({ path, elapsed: -1, error: e.message }));
    });
}

(async () => {
    console.log('=== POST-OPTIMIZATION PERFORMANCE ===\n');
    
    const apis = [
        '/api/telesale/sources?crm_type=hoa_hong_crm',
        '/api/telesale/data/stats?crm_type=hoa_hong_crm',
        '/api/telesale/data?source_id=1&page=1&limit=50',
        '/api/telesale/active-members',
        '/api/users',
        '/api/departments',
    ];
    
    // Cold run (no cache)
    console.log('--- COLD (first request, no cache) ---');
    let total1 = 0;
    for (const api of apis) {
        const r = await timeAPI(api);
        total1 += r.elapsed;
        console.log(`  ${r.elapsed.toString().padStart(5)}ms | ${r.size.padStart(8)} | ${r.path}`);
    }
    console.log(`  Total: ${total1}ms\n`);
    
    // Warm run (stats cached)
    console.log('--- WARM (cached stats) ---');
    let total2 = 0;
    for (const api of apis) {
        const r = await timeAPI(api);
        total2 += r.elapsed;
        console.log(`  ${r.elapsed.toString().padStart(5)}ms | ${r.size.padStart(8)} | ${r.path}`);
    }
    console.log(`  Total: ${total2}ms`);
    console.log(`  Improvement: ${total1}ms → ${total2}ms (${((1-total2/total1)*100).toFixed(0)}% faster)\n`);
    
    // Parallel simulation
    console.log('--- PARALLEL (Promise.all simulation) ---');
    const start = Date.now();
    await Promise.all(apis.map(a => timeAPI(a)));
    const parallelTime = Date.now() - start;
    console.log(`  All 6 APIs in parallel: ${parallelTime}ms`);
    console.log(`  vs Sequential cold: ${total1}ms → ${((1-parallelTime/total1)*100).toFixed(0)}% faster\n`);
    
    // Check indexes
    const db = require('./db/pool');
    const indexes = await db.all(`SELECT indexname FROM pg_indexes WHERE tablename = 'telesale_data' ORDER BY indexname`);
    console.log('--- Active Indexes ---');
    indexes.forEach(i => console.log(`  ✅ ${i.indexname}`));
    
    process.exit(0);
})();
