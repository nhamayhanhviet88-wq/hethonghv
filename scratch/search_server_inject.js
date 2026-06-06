const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('js/pages') || line.includes('pages') && line.includes('readdir') || line.includes('inject')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
