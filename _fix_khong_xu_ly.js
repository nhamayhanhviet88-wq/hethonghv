// Add khong_xu_ly to CONSULT_TYPES in all 8 CRM files
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public', 'js', 'pages');

const files = [
    'crm-nhucau.js', 'crm-ttk-full.js', 'crm-ctv-full.js', 'crm-affiliate-full.js',
    'crm-affhv-full.js', 'crm-gdbh-full.js', 'crm-gdht-full.js', 'crm-koctiktok-full.js'
];

let fixCount = 0;

const oldLine = `    gui_ct_kh_cu: { label: 'Gửi Chương Trình KH Cũ', icon: '🎟️', color: '#7c3aed' },\r\n};`;
const newLine = `    gui_ct_kh_cu: { label: 'Gửi Chương Trình KH Cũ', icon: '🎟️', color: '#7c3aed' },\r\n    khong_xu_ly: { label: 'Không Xử Lý', icon: '⚠️', color: '#ef4444', textColor: 'white' },\r\n};`;

for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    
    if (content.includes('khong_xu_ly')) {
        console.log(`  ⏭️ [${file}] Already has khong_xu_ly`);
        continue;
    }
    
    if (content.includes(oldLine)) {
        content = content.replace(oldLine, newLine);
        fs.writeFileSync(fp, content, 'utf8');
        fixCount++;
        console.log(`  ✅ [${file}] Added khong_xu_ly to CONSULT_TYPES`);
    } else {
        console.log(`  ⚠️ [${file}] Pattern not found`);
    }
}

console.log(`\n✅ Total: ${fixCount} files updated`);
