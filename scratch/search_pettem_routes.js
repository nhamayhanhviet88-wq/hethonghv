const fs = require('fs');
const path = require('path');

function search(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('/api/pettem')) {
                console.log(`Found in route file: ${fullPath}`);
            }
        }
    });
}
search('routes');
