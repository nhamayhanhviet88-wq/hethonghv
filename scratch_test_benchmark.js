const http = require('http');

http.get('http://localhost:11000/api/kpi-production/benchmark?year=2026&department=sewing', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("Benchmark API Output:", JSON.stringify(JSON.parse(data), null, 2));
        process.exit(0);
    });
}).on('error', err => {
    console.error("Error:", err);
    process.exit(1);
});
