const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('dashboard.html')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
