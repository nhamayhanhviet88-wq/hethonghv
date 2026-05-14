const fs = require('fs');
let content = fs.readFileSync('public/js/pages/bangiao-diem.js', 'utf8');

// Find and remove the "Hoặc tạo thủ công" button div
const searchStr = '✏️ Hoặc tạo thủ công';
const idx = content.indexOf(searchStr);
console.log('Found at index:', idx);

if (idx > 0) {
    // Find the enclosing <div> ... </div> block
    // Search backward for <div style="padding:10px 20px;border-top
    const beforeIdx = content.lastIndexOf('<div style="padding:10px 20px;border-top:1px solid #f3f4f6;text-align:center;">', idx);
    // Search forward for </div> after the button
    const afterIdx = content.indexOf('</div>', idx);
    
    if (beforeIdx > 0 && afterIdx > 0) {
        const endIdx = afterIdx + '</div>'.length;
        const blockToRemove = content.substring(beforeIdx, endIdx);
        console.log('Removing block:', JSON.stringify(blockToRemove).substring(0, 200));
        
        // Also remove the surrounding whitespace/newlines
        // Find the start of the line (after previous \n)
        let lineStart = beforeIdx;
        while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;
        
        // Find end of line after </div>
        let lineEnd = endIdx;
        while (lineEnd < content.length && content[lineEnd] !== '\n') lineEnd++;
        if (content[lineEnd] === '\n') lineEnd++;
        
        content = content.substring(0, lineStart) + content.substring(lineEnd);
        fs.writeFileSync('public/js/pages/bangiao-diem.js', content);
        console.log('✅ Removed successfully');
    }
} else {
    console.log('❌ Not found');
}
