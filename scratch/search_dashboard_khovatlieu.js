const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('khovatlieu') || line.toLowerCase().includes('vatlieutempet')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
