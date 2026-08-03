const http = require('http');

http.get('http://localhost:11000/api/reports/kpi-marketing?month=2026-08', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            console.log("=== API RESPONSE CATEGORIES ===");
            console.log(JSON.stringify(parsedData.categories, null, 2));
            console.log("=== HANDLERS ===");
            console.log(JSON.stringify(parsedData.handlers, null, 2));
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
