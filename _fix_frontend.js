const fs = require('fs');
const path = 'd:/0 - Google Antigravity/11 - NHAN VIEN KINH DOANH - Copy/public/js/pages/hethonggoidien.js';
let content = fs.readFileSync(path, 'utf-8');

// Fix 1: Remove phone masking - show full phone number
// Change: const phoneShort = d.phone ? d.phone.replace(/^84/, '0').slice(-3) : '—';
// To:     const phoneFull = d.phone ? d.phone.replace(/^84/, '0') : '—';
content = content.replace(
    "const phoneShort = d.phone ? d.phone.replace(/^84/, '0').slice(-3) : '\u2014';",
    "const phoneFull = d.phone ? d.phone.replace(/^84/, '0') : '\u2014';"
);

// Fix 2: Change ***${phoneShort} to ${phoneFull}
content = content.replace(
    ">***${phoneShort}</td>",
    ">${phoneFull}</td>"
);

// Fix 3: Upgrade viewDetail modal
const oldViewDetail = `// ========== VIEW DETAIL ==========
async function _htgd_viewDetail(dataId) {
    const res = await apiCall(\`/api/telesale/data/\${dataId}\`);
    const d = res.data || res;
    if (!d || !d.phone) return showToast('Kh\u00f4ng t\u00ecm th\u1ea5y data', 'error');
    const carriers = (d.carrier||'').split('|').filter(Boolean);
    const carrierHtml = carriers.map(c => {
        const cm = _carrierMap[c] || _carrierMap['invalid'];
        return \`<span class="ts-badge" style="background:\${cm.bg};color:\${cm.color};font-size:11px;padding:2px 8px;">\${cm.label}</span>\`;
    }).join(' ') || '\u2014';
    openModal('\ud83d\udccb Chi Ti\u1ebft Data #' + d.id, \`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><label style="font-size:10px;color:#6b7280;font-weight:600;">S\u0110T</label><div style="font-size:15px;font-weight:700;color:#2563eb;font-family:'SF Mono',monospace;">\${d.phone}</div></div>
            <div><label style="font-size:10px;color:#6b7280;font-weight:600;">Nh\u00e0 M\u1ea1ng</label><div>\${carrierHtml}</div></div>
            <div><label style="font-size:10px;color:#6b7280;font-weight:600;">T\u00ean KH</label><div style="font-weight:700;">\${d.customer_name || '\u2014'}</div></div>
            <div><label style="font-size:10px;color:#6b7280;font-weight:600;">C\u00f4ng Ty</label><div style="font-weight:600;">\${d.company_name || '\u2014'}</div></div>
            <div style="grid-column:span 2;"><label style="font-size:10px;color:#6b7280;font-weight:600;">\u0110\u1ecba Ch\u1ec9</label><div>\${d.address || '\u2014'}</div></div>
        </div>
    \`, \`<button class="btn btn-secondary" onclick="closeModal()">\u0110\u00f3ng</button>\`);
}`;

const newViewDetail = `// ========== VIEW DETAIL ==========
async function _htgd_viewDetail(dataId) {
    const res = await apiCall(\`/api/telesale/data/\${dataId}\`);
    if (!res.success) return showToast(res.error || 'Kh\u00f4ng t\u00ecm th\u1ea5y data', 'error');
    const d = res.data;
    const assignments = res.assignments || [];
    const carriers = (d.carrier||'').split('|').filter(Boolean);
    const carrierHtml = carriers.map(c => {
        const cm = _carrierMap[c] || _carrierMap['invalid'];
        return \`<span class="ts-badge" style="background:\${cm.bg};color:\${cm.color};font-size:11px;padding:2px 8px;">\${cm.label}</span>\`;
    }).join(' ') || '\u2014';
    const statusMap = {
        available: { icon:'\u2705', label:'S\u1eb5n s\u00e0ng', bg:'#dcfce7', color:'#16a34a' },
        assigned: { icon:'\ud83d\udce4', label:'\u0110\u00e3 ph\u00e2n', bg:'#dbeafe', color:'#2563eb' },
        answered: { icon:'\ud83d\udcde', label:'\u0110\u00e3 g\u1ecdi', bg:'#fef3c7', color:'#d97706' },
        cold: { icon:'\ud83e\uddca', label:'Kho l\u1ea1nh', bg:'#eef2ff', color:'#6366f1' },
        invalid: { icon:'\u274c', label:'K.t\u1ed3n t\u1ea1i', bg:'#fef2f2', color:'#dc2626' },
    };
    const sm = statusMap[d.status] || statusMap.available;
    const statusHtml = \`<span class="ts-badge" style="background:\${sm.bg};color:\${sm.color};">\${sm.icon} \${sm.label}</span>\`;
    let assignHtml = '<div style="color:#9ca3af;font-size:12px;text-align:center;padding:12px;">Ch\u01b0a c\u00f3 l\u1ecbch s\u1eed ph\u00e2n b\u1ed5</div>';
    if (assignments.length > 0) {
        assignHtml = \`<table class="ts-table" style="font-size:12px;"><thead><tr>
            <th>Ng\u00e0y</th><th>NV</th><th>Tr\u1ea1ng th\u00e1i</th><th>Ghi ch\u00fa</th>
        </tr></thead><tbody>
        \${assignments.map(a => \`<tr>
            <td style="white-space:nowrap;">\${a.assigned_date ? new Date(a.assigned_date).toLocaleDateString('vi-VN') : '\u2014'}</td>
            <td style="font-weight:600;">\${a.user_name || '\u2014'}</td>
            <td>\${a.call_status || '\u2014'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">\${a.notes || '\u2014'}</td>
        </tr>\`).join('')}
        </tbody></table>\`;
    }
    openModal('\ud83d\udccb Chi Ti\u1ebft Data #' + d.id, \`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
            <div style="background:#f0f9ff;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udcf1 S\u0110T</label><div style="font-size:18px;font-weight:800;color:#2563eb;font-family:'SF Mono',monospace;letter-spacing:1px;">\${d.phone}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udce1 Nh\u00e0 M\u1ea1ng</label><div style="margin-top:2px;">\${carrierHtml}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udc64 T\u00ean KH</label><div style="font-weight:700;font-size:15px;color:#122546;">\${d.customer_name || '\u2014'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83c\udfe2 C\u00f4ng Ty</label><div style="font-weight:600;color:#374151;">\${d.company_name || '\u2014'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udccd \u0110\u1ecba Ch\u1ec9</label><div style="color:#374151;">\${d.address || '\u2014'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udcca Tr\u1ea1ng Th\u00e1i</label><div style="margin-top:2px;">\${statusHtml}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udc68\u200d\ud83d\udcbc NV Ph\u00e2n Cho</label><div style="font-weight:600;color:#374151;">\${d.last_assigned_user_name || '\u2014'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">\ud83d\udcc5 Ng\u00e0y Ph\u00e2n</label><div style="color:#374151;">\${d.last_assigned_date ? new Date(d.last_assigned_date).toLocaleDateString('vi-VN') : '\u2014'}</div></div>
        </div>
        <div style="border-top:1.5px solid #e5e7eb;padding-top:14px;">
            <div style="font-size:13px;font-weight:700;color:#122546;margin-bottom:10px;">\ud83d\udcdc L\u1ecbch S\u1eed Ph\u00e2n B\u1ed5 (\${assignments.length})</div>
            <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;max-height:200px;overflow-y:auto;">\${assignHtml}</div>
        </div>
    \`, \`<button class="btn btn-secondary" onclick="closeModal()">\u0110\u00f3ng</button>\`);
}`;

if (content.includes(oldViewDetail)) {
    content = content.replace(oldViewDetail, newViewDetail);
    console.log('viewDetail replaced successfully');
} else {
    console.log('WARNING: Could not find exact viewDetail match. Trying line-based approach...');
    // Find the line range and replace
    const lines = content.split('\n');
    let startIdx = -1, endIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('// ========== VIEW DETAIL ==========')) startIdx = i;
        if (startIdx >= 0 && lines[i].includes("closeModal()\">Đóng</button>")) {
            // Find the closing }
            for (let j = i; j < lines.length; j++) {
                if (lines[j].trim() === '}') { endIdx = j; break; }
            }
            break;
        }
    }
    if (startIdx >= 0 && endIdx >= 0) {
        const newLines = newViewDetail.split('\n');
        lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
        content = lines.join('\n');
        console.log(`Replaced lines ${startIdx+1}-${endIdx+1} with new viewDetail`);
    } else {
        console.log('FAILED: Could not find viewDetail function boundaries');
    }
}

fs.writeFileSync(path, content, 'utf-8');
console.log('File saved. Total length:', content.length);

// Verify syntax
const { execSync } = require('child_process');
try {
    execSync(`node -c "${path}"`, { stdio: 'pipe' });
    console.log('SYNTAX OK ✅');
} catch(e) {
    console.log('SYNTAX ERROR:', e.stderr?.toString()?.slice(0, 300));
}
