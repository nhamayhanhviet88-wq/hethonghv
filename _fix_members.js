const fs = require('fs');
const path = 'd:/0 - Google Antigravity/11 - NHAN VIEN KINH DOANH - Copy/public/js/pages/hethonggoidien.js';
let content = fs.readFileSync(path, 'utf-8');

// FIX 1: Change apiCall('/api/teams') to apiCall('/api/departments')
content = content.replace(
    "apiCall('/api/teams')",
    "apiCall('/api/departments')"
);
console.log('✅ Fix 1: /api/teams → /api/departments');

// FIX 2: Fix deptRes parsing
content = content.replace(
    "_htgd_depts = deptRes.teams || deptRes.departments || (Array.isArray(deptRes) ? deptRes : []);",
    "_htgd_depts = deptRes.departments || deptRes.teams || (Array.isArray(deptRes) ? deptRes : []);"
);
console.log('✅ Fix 2: prioritize deptRes.departments');

// FIX 3: Replace sidebar section (lines 652-675)
const lines = content.split('\n');

// Find precise markers
let sidebarStart = -1, sidebarEnd = -1;
for (let i = 0; i < lines.length; i++) {
    // Line 652 starts with: ${isAll ? '' : `<div ... and contains addMemberDeptFilter on the NEXT line
    if (lines[i].includes("addMemberDeptFilter")) {
        // Go back to find the ${isAll ? '' : `<div line
        for (let j = i - 1; j >= i - 5; j--) {
            if (lines[j].includes("${isAll ? '' : `<div") && lines[j].includes("border-radius:14px")) {
                sidebarStart = j;
                break;
            }
        }
    }
    // Line 675 ends with: </div>`}
    if (sidebarStart >= 0 && sidebarEnd < 0 && i > sidebarStart + 10) {
        if (lines[i].trim() === '</div>`}') {
            sidebarEnd = i;
            break;
        }
    }
}

if (sidebarStart >= 0 && sidebarEnd >= 0) {
    console.log(`Found sidebar: lines ${sidebarStart+1}-${sidebarEnd+1}`);
    
    const newSidebarLines = [
        '            ${isAll ? \'\' : `<div style="background:linear-gradient(180deg,#f8fafc,white);border:1.5px solid #e5e7eb;border-radius:14px;padding:16px;">\r',
        '                <h4 style="margin:0 0 12px;color:#122546;font-size:13px;font-weight:800;">➕ Thêm NV vào Telesale</h4>\r',
        '                <div id="addMemberList" class="ts-scroll" style="max-height:500px;overflow:auto;">\r',
        '                    ${availableUsers.length === 0 ? \'<div class="ts-empty" style="padding:24px;"><span class="ts-empty-icon" style="font-size:32px;">✅</span><div class="ts-empty-title" style="font-size:12px;">Tất cả NV đã được thêm</div></div>\' : \'\'}\r',
        '                    ${Object.entries(groupedUsers).map(([dId,g]) => {\r',
        '                        const memberCards = g.users.map(u => {\r',
        '                            const c2 = _htgd_avatarColor(u.full_name || u.username);\r',
        '                            return `<div class="htgd-add-member-item" data-name="${(u.full_name||u.username).toLowerCase()}" data-dept="${u.department_id||0}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;padding-left:16px;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:8px;transition:background 0.15s;" onmouseenter="this.style.background=\'#eff6ff\'" onmouseleave="this.style.background=\'transparent\'" onclick="_htgd_addMember(${u.id})"><span class="ts-avatar ts-avatar-sm" style="background:${c2};">${_htgd_initials(u.full_name || u.username)}</span><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}</div></div><span class="ts-btn ts-btn-green ts-btn-xs" style="padding:3px 8px;">➕</span></div>`;\r',
        '                        }).join(\'\');\r',
        '                        return `<div style="margin-bottom:8px;"><div onclick="var el=this.nextElementSibling;el.style.display=el.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'[data-arrow]\').textContent=el.style.display===\'none\'?\'▶\':\'▼\'" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:8px;margin-bottom:2px;cursor:pointer;"><span style="font-size:11px;font-weight:800;color:#334155;">📁 ${g.name}</span><span style="font-size:10px;color:#6b7280;margin-left:auto;">(${g.users.length})</span><span data-arrow style="font-size:10px;color:#9ca3af;margin-left:4px;">▼</span></div><div>${memberCards}</div></div>`;\r',
        '                    }).join(\'\')}\r',
        '                </div>\r',
        '            </div>`}\r',
    ];
    
    lines.splice(sidebarStart, sidebarEnd - sidebarStart + 1, ...newSidebarLines);
    console.log(`✅ Fix 3: replaced sidebar (${sidebarEnd - sidebarStart + 1} lines → ${newSidebarLines.length} lines)`);
} else {
    console.log('❌ Fix 3: could not find sidebar. start:', sidebarStart, 'end:', sidebarEnd);
}

content = lines.join('\n');
fs.writeFileSync(path, content, 'utf-8');
console.log('File saved. Length:', content.length);

const { execSync } = require('child_process');
try {
    execSync(`node -c "${path}"`, { stdio: 'pipe' });
    console.log('SYNTAX OK ✅');
} catch(e) {
    console.log('SYNTAX ERROR:', e.stderr?.toString()?.slice(0, 400));
}
