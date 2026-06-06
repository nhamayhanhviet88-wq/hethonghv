const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('edit') || line.includes('input') || line.includes('cell') || line.includes('PATCH')) {
        if (line.includes('double') || line.includes('dblclick') || line.includes('click') || line.includes('target') || line.includes('focus')) {
            if (line.length < 150) {
                console.log(`${idx + 1}: ${line.trim()}`);
            }
        }
    }
});
