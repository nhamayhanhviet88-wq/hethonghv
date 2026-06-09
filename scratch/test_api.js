const http = require('http');

http.get('http://localhost:11000/api/sewing/records?tab=4&page=1&limit=5', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log('HTTP STATUS:', res.statusCode);
            const parsed = JSON.parse(data);
            console.log('COUNT:', parsed.records ? parsed.records.length : 0);
            if (parsed.records && parsed.records.length > 0) {
                console.log('FIRST RECORD KEYS:', Object.keys(parsed.records[0]));
                console.log('FIRST RECORD checked_techniques:', parsed.records[0].checked_techniques);
                console.log('FIRST RECORD ts_sewing_tech:', parsed.records[0].ts_sewing_tech);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw output snippet:', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.error('HTTP REQUEST ERROR:', err.message);
});
