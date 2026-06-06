const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('sidebar') && (line.includes('click') || line.includes('onclick') || line.includes('addEventListener'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
