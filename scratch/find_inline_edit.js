const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

// Search for cell editing or double click handlers
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('dblclick') || line.includes('double') || line.includes('editCell') || line.includes('inlineEdit')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
