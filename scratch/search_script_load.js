const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('script') || line.includes('src') || line.includes('.js') || line.includes('head.appendChild')) {
        if (line.includes('load') || line.includes('append') || line.includes('create') || line.includes('dynamic')) {
            if (line.length < 150) {
                console.log(`${idx + 1}: ${line.trim()}`);
            }
        }
    }
});
