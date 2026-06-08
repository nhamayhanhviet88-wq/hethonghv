const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('Auto-injecting')) {
        console.log(`--- Lines ${i-15} to ${i+20} ---`);
        console.log(lines.slice(Math.max(0, i-15), Math.min(lines.length, i+20)).join('\n'));
    }
});
