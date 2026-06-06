const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('khovatlieu') || line.toLowerCase().includes('kho_vat_lieu') || line.toLowerCase().includes('vatlieutempet')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
