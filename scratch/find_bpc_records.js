const fs = require('fs');
const content = fs.readFileSync('public/js/pages/bophancathv.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('function _bpcFilter') || line.includes('function _bpcShowUnassigned')) {
        console.log(`--- Match at line ${idx + 1} ---`);
        for (let i = Math.max(0, idx - 2); i < Math.min(lines.length, idx + 20); i++) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
    }
});
