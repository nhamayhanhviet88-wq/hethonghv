const fs = require('fs');
const content = fs.readFileSync('public/js/pages/bophaninhv.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('addEventListener') || line.includes('on') || line.includes('click') || line.includes('dblclick') || line.includes('input') || line.includes('change')) {
        if (line.includes('Tb') || line.includes('Table') || line.includes('row') || line.includes('cell') || line.includes('edit') || line.includes('update')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
