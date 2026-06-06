const fs = require('fs');
const path = require('path');

const pagesDir = 'public/js/pages';
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
    if (file.endsWith('.js')) {
        const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
        if (content.includes('dblclick') || content.includes('ondblclick') || content.includes('contenteditable')) {
            console.log(`Found in page: ${file}`);
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes('dblclick') || line.includes('ondblclick') || line.includes('contenteditable')) {
                    console.log(`  Line ${idx+1}: ${line.trim()}`);
                }
            });
        }
    }
});
