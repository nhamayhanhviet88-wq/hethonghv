const fs = require('fs');
const path = require('path');

function main() {
    const p1 = path.join(__dirname, 'uploads', 'sheets', 'SVTS0005 - Phieu 1.jpeg');
    const p2 = path.join(__dirname, 'uploads', 'sheets', 'SVTS0005 - Phieu 2.jpeg');
    
    [p1, p2].forEach(p => {
        if (fs.existsSync(p)) {
            const stat = fs.statSync(p);
            console.log(`File: ${path.basename(p)}, Size: ${stat.size} bytes, Created/Modified: ${stat.mtime}`);
        } else {
            console.log(`File not found: ${p}`);
        }
    });
}

main();
