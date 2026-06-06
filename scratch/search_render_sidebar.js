const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
    if (line.includes('function renderSidebar') || line.includes('function buildSidebar')) {
        start = idx;
    }
});

if (start !== -1) {
    for (let i = start; i < start + 60; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
} else {
    console.log('Not found');
}
