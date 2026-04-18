// Fix 2 bugs across all 7 CRM files:
// 1. Pinned customers should never go to xu_ly_tre → always phai_xu_ly
// 2. Skip appointment_date validation when customer is pinned

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public', 'js', 'pages');

const files = [
    'crm-ttk-full.js', 'crm-ctv-full.js', 'crm-affiliate-full.js',
    'crm-affhv-full.js', 'crm-gdbh-full.js', 'crm-gdht-full.js', 'crm-koctiktok-full.js'
];

let totalFixes = 0;

for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    let fixes = 0;

    // FIX 1: Before "Priority 5: xu_ly_tre", add pin check
    // Find: "// Priority 5: Khách xử lý trễ (appointment was in the past, not consulted today)"
    // Replace with pin check first
    const fix1Old = `    // Priority 5: Khách xử lý trễ (appointment was in the past, not consulted today)\r\n    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';`;
    const fix1New = `    // Priority 5: Pinned customers ALWAYS show as phai_xu_ly (never xu_ly_tre)\r\n    if (c.is_pinned) return 'phai_xu_ly';\r\n\r\n    // Priority 6: Khách xử lý trễ (appointment was in the past, not consulted today)\r\n    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';`;
    
    if (content.includes(fix1Old)) {
        content = content.replace(fix1Old, fix1New);
        fixes++;
        console.log(`  ✅ [${file}] FIX 1: Added pin → phai_xu_ly before xu_ly_tre`);
    } else {
        console.log(`  ⚠️ [${file}] FIX 1: Pattern not found (may already be fixed)`);
    }

    // FIX 2: Skip appointment validation when pinned
    // Find the line: if (!appointment_date) { showToast('Vui lòng chọn ngày hẹn!'
    // Get prefix for this file
    const prefixes = {
        'crm-ttk-full.js': '_ttkEnableSubmitBtn',
        'crm-ctv-full.js': '_ctvEnableSubmitBtn',
        'crm-affiliate-full.js': '_affEnableSubmitBtn',
        'crm-affhv-full.js': '_ahvEnableSubmitBtn',
        'crm-gdbh-full.js': '_gdbhEnableSubmitBtn',
        'crm-gdht-full.js': '_gdhtEnableSubmitBtn',
        'crm-koctiktok-full.js': '_kocEnableSubmitBtn'
    };
    const enableFn = prefixes[file];
    
    // Pattern: if (!appointment_date) { showToast('Vui lòng chọn ngày hẹn!', 'error'); _xxxEnableSubmitBtn(); return; }
    const fix2Regex = new RegExp(
        `    if \\(!appointment_date\\) \\{ showToast\\('Vui lòng chọn ngày hẹn!', 'error'\\); ${enableFn}\\(\\); return; \\}`,
        'g'
    );
    const fix2New = `    if (!appointment_date && !window._currentConsultCustomerPinned) { showToast('Vui lòng chọn ngày hẹn!', 'error'); ${enableFn}(); return; }`;
    
    if (fix2Regex.test(content)) {
        content = content.replace(fix2Regex, fix2New);
        fixes++;
        console.log(`  ✅ [${file}] FIX 2: Skip appointment validation for pinned customers`);
    } else {
        console.log(`  ⚠️ [${file}] FIX 2: Pattern not found`);
    }

    if (fixes > 0) {
        fs.writeFileSync(fp, content, 'utf8');
        totalFixes += fixes;
    }
}

console.log(`\n✅ Total: ${totalFixes} fixes across ${files.length} files`);
