const fs = require('fs');
const content = fs.readFileSync('public/js/pages/bophaninhv.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('print_meters')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
