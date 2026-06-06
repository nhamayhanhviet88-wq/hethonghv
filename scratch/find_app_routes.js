const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('function navigate') || line.includes('function route') || line.includes('switch') && (line.includes('page') || line.includes('path'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
