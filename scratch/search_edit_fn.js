const fs = require('fs');
const content = fs.readFileSync('public/js/pages/bophaninhv.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('function') && (line.includes('edit') || line.includes('Edit') || line.includes('update') || line.includes('Update') || line.includes('modal') || line.includes('Modal') || line.includes('show') || line.includes('Show') || line.includes('open') || line.includes('Open'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
