const fs = require('fs');
const path = require('path');

function walkDir(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, files);
        } else if (file.endsWith('.sql') || file.endsWith('.db')) {
            files.push({ path: filePath, size: stat.size, mtime: stat.mtime });
        }
    }
    return files;
}

async function main() {
    const backupsDir = path.join(__dirname, 'backups');
    const allFiles = walkDir(backupsDir);
    allFiles.sort((a, b) => b.mtime - a.mtime);
    console.log('Recent backup files:');
    allFiles.slice(0, 20).forEach(f => {
        console.log(`Path: ${path.relative(__dirname, f.path)}, Size: ${f.size}, MTime: ${f.mtime}`);
    });
}

main();
