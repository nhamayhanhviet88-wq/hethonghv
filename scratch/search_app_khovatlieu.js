const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('khovatlieu') || line.toLowerCase().includes('kho_vat_lieu')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
