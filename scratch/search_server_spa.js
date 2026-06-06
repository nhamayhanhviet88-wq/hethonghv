const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('dashboard.html') || line.includes('sendFile') || line.includes('/*') || line.includes('setNotFoundHandler')) {
        if (line.length < 150) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
