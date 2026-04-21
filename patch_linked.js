const fs = require('fs');
const c = fs.readFileSync('public/js/pages/lich-khoabieu.js', 'utf8');

// Find and replace using substring matching
const marker1 = "const _ltLinkedPage = _kbGetLinkedPage(lt.task_name);";
const marker2 = "} else if (isSelf) {";

const idx1 = c.indexOf(marker1, 90000); // after line ~1350
if (idx1 < 0) { console.log('marker1 not found'); process.exit(1); }

// Find the first "} else if (isSelf) {" AFTER marker1
const idx2 = c.indexOf(marker2, idx1);
if (idx2 < 0) { console.log('marker2 not found'); process.exit(1); }
const endIdx = idx2 + marker2.length;

const oldSection = c.substring(idx1, endIdx);
console.log('OLD SECTION LENGTH:', oldSection.length);
console.log('OLD SECTION:\n---\n' + oldSection + '\n---');

const newSection = `const _ltLinkedPage = _kbGetLinkedPage(lt.task_name);
                const _isPastNoReport = dateStr < todayStr && !realComp;
                const _isPastRejected = realComp && realComp.status === 'rejected';
                
                if (_ltLinkedPage && isSelf && !_isPastNoReport && !_isPastRejected) {
                    // Lock task has a linked menu page (today/future only)
                    actionHtml = \`<div style="margin-top:6px;text-align:center;"><a href="\${_ltLinkedPage.page}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;cursor:pointer;font-weight:700;text-decoration:none;box-shadow:0 2px 6px rgba(99,102,241,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">\${_ltLinkedPage.icon} M\u1edf trang \u2192</a></div>\`;
                } else if (_ltLinkedPage && !isSelf && !_isPastNoReport) {
                    actionHtml = ''; // manager view
                } else if (isSelf) {`;

const newContent = c.substring(0, idx1) + newSection + c.substring(endIdx);
fs.writeFileSync('public/js/pages/lich-khoabieu.js', newContent);
console.log('✅ Patched successfully!');
