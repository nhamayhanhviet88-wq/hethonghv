const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('kho-vat-lieu') || line.includes('khovatlieu') || line.includes('renderVatlieutempetPage')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
