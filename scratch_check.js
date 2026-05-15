const c = require('fs').readFileSync('routes/khoatknv.js', 'utf8').replace(/\r\n/g, '\n');
const s = "Today's penalties for manager popup";
const a = "POST: Mark manager popup as shown today";
const sIdx = c.indexOf(s);
const aIdx = c.indexOf(a);
console.log('start:', sIdx, 'end:', aIdx);
if (sIdx >= 0) {
    console.log('BEFORE:', c.substring(sIdx - 20, sIdx + 50));
    const block = c.substring(sIdx, sIdx + 200);
    console.log('Uses ledger?', block.includes('getLedgerForDate'));
}
