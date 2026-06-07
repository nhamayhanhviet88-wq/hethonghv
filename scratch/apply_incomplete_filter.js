const fs = require('fs');

// 1. Update public/js/pages/bophancathv.js
const bpcPath = 'public/js/pages/bophancathv.js';
let bpcContent = fs.readFileSync(bpcPath, 'utf8');

// Target 1: Add status === 'incomplete' query param in _bpcLoadRecords
const target1 = `if (f.status === 'done') qs += '&status=done';`;
const replacement1 = `if (f.status === 'done') qs += '&status=done';\r\n    if (f.status === 'incomplete') qs += '&status=incomplete';`;

if (bpcContent.includes(target1)) {
    bpcContent = bpcContent.replace(target1, replacement1);
    console.log('✅ Successfully added status=incomplete query parameter in _bpcLoadRecords');
} else {
    console.error('❌ Could not find target1 in bophancathv.js');
}

// Target 2: Render stats in headers for incomplete status
const target2 = `if (f.year) parts.push('📆 ' + f.year);`;
const replacement2 = `if (f.year) parts.push('📆 ' + f.year);\r\n    if (f.status === 'incomplete') parts.push('⏳ Chưa Cắt Xong');`;

if (bpcContent.includes(target2)) {
    bpcContent = bpcContent.replace(target2, replacement2);
    console.log('✅ Successfully added incomplete badge text in _bpcRenderStats');
} else {
    console.error('❌ Could not find target2 in bophancathv.js');
}

// Target 3: Add "Chưa Cắt Xong" aggregate row in the sidebar
const target3 = `if (yOpen && yr.cutters) {\r\n                yr.cutters.forEach(function(c) {`;
const target3_lf = `if (yOpen && yr.cutters) {\n                yr.cutters.forEach(function(c) {`;

const replacement3 = `if (yOpen && yr.cutters) {
                // Calculate total incomplete count for all cutters in this year
                var totalIncomplete = 0;
                yr.cutters.forEach(function(c) {
                    totalIncomplete += (c.incomplete_count || 0);
                });
                
                var incYearAct = f.view === 'records' && f.year == yr.year && !f.cutter_id && f.status === 'incomplete';
                h += '<div class="bpc-sb-sub incomplete' + (incYearAct ? ' active' : '') + '" style="padding-left:23px" onclick="event.stopPropagation(); _bpcFilterCutterStatus(' + yr.year + ', null, \\\'incomplete\\\')">';
                h += '  <span>⏳ Chưa Cắt Xong</span>';
                h += '  <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:800">' + totalIncomplete + '</span>';
                h += '</div>';

                yr.cutters.forEach(function(c) {`;

if (bpcContent.includes(target3)) {
    bpcContent = bpcContent.replace(target3, replacement3);
    console.log('✅ Successfully added "Chưa Cắt Xong" aggregate row (CRLF)');
} else if (bpcContent.includes(target3_lf)) {
    bpcContent = bpcContent.replace(target3_lf, replacement3);
    console.log('✅ Successfully added "Chưa Cắt Xong" aggregate row (LF)');
} else {
    console.error('❌ Could not find target3 in bophancathv.js');
}

fs.writeFileSync(bpcPath, bpcContent, 'utf8');
console.log('Done modifying bophancathv.js');
