const fs = require('fs');
const lines = fs.readFileSync('routes/deadline-checker.js', 'utf8').split('\n');
let found = 0;
lines.forEach((l, i) => {
    // Find lines that set status to locked but don't have shouldLockAccounts guard
    if (l.includes("'locked'") && l.includes('UPDATE') && !l.includes('shouldLock')) {
        found++;
        console.log(`${i+1}: ${l.trim().substring(0, 100)}`);
    }
});
console.log(`\nUngated lock statements: ${found}`);
