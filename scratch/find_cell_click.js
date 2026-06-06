const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('click') && (line.includes('td') || line.includes('cell') || line.includes('target') || line.includes('table'))) {
        if (line.length < 150) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
