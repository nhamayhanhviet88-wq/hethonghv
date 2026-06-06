const fs = require('fs');
const path = require('path');

function search(dir) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.gemini') || dir.includes('artifacts') || dir.includes('local_backups')) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            search(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.ejs')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('roll_start_qty')) {
                console.log(`Found in: ${fullPath}`);
            }
        }
    });
}

search('.');
