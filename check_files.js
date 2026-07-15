const fs = require('fs');
const path = require('path');

function walkDir(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, files);
        } else {
            files.push(filePath);
        }
    }
    return files;
}

async function main() {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const allFiles = walkDir(uploadsDir);
            const matches = allFiles.filter(f => f.includes('133_201') || f.includes('133_202') || f.includes('SVTS0005'));
            console.log('Matching files in uploads:');
            console.log(matches.map(f => path.relative(__dirname, f)).join('\n'));
        } else {
            console.log('uploads directory does not exist');
        }
    } catch (e) {
        console.error(e);
    }
}

main();
