const http = require('http');
http.get('http://localhost:11000/js/pages/crm-ctv-full.js', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const idx = data.indexOf("crm_type=");
        if (idx >= 0) {
            console.log('crm_type query found:', data.substring(idx, idx + 30));
        } else {
            console.log('crm_type not found in file!');
        }
        console.log('File size:', data.length);
    });
});
