const http = require('http');
http.get('http://localhost:11000/crm-ctv', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find all script tags with crm
        const matches = data.match(/src="[^"]*crm[^"]*"/g);
        console.log('CRM script tags in served HTML:');
        if (matches) matches.forEach(m => console.log(' ', m));
        
        // Also check for ctv_all in the page content
        const idx = data.indexOf('ctv_all');
        console.log('\nctv_all found in HTML:', idx >= 0 ? 'YES at pos ' + idx : 'NO');
        
        // Check KOC references
        const kocIdx = data.indexOf('koc_tiktok');
        console.log('koc_tiktok found in HTML:', kocIdx >= 0 ? 'YES at pos ' + kocIdx : 'NO');
    });
});
