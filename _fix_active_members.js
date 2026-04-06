const fs = require('fs');
const path = 'd:/0 - Google Antigravity/11 - NHAN VIEN KINH DOANH - Copy/public/js/pages/hethonggoidien.js';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');

// Find the active members grid section: lines 618-643
// Marker: line 618 starts with ` : ` and contains "display:grid;grid-template-columns:repeat"
// End marker: line 643 is "}).join('')}"
let gridStart = -1, gridEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))") && lines[i].includes("gap:12px")) {
        gridStart = i;
    }
    if (gridStart >= 0 && gridEnd < 0 && i > gridStart + 5 && lines[i].trim().startsWith('</div>') && lines[i-1] && lines[i-1].trim().startsWith("}).join('')}")) {
        gridEnd = i;
        break;
    }
}

console.log('Grid section:', gridStart >= 0 ? `lines ${gridStart+1}-${gridEnd+1}` : 'NOT FOUND');

if (gridStart >= 0 && gridEnd >= 0) {
    // New grouped member section
    const newLines = [
        '                <div>\r',
        '                    ${(() => {\r',
        '                        // Build department hierarchy for active members\r',
        '                        const deptById = {};\r',
        '                        _htgd_depts.forEach(d => { deptById[d.id] = d; });\r',
        '                        \r',
        '                        // Find parent dept (phòng) for each member\r',
        '                        const tree = {}; // { parentId: { name, teams: { teamId: { name, members: [] } } } }\r',
        '                        _htgd_members.forEach(m => {\r',
        '                            const deptId = m.department_id;\r',
        '                            const dept = deptById[deptId];\r',
        '                            let parentId = 0, parentName = "Chưa phân phòng", teamId = 0, teamName = "";\r',
        '                            if (dept) {\r',
        '                                // If dept has a parent that also has a parent → dept is a team\r',
        '                                const parent = deptById[dept.parent_id];\r',
        '                                if (parent && deptById[parent.parent_id]) {\r',
        '                                    // dept is team, parent is phòng\r',
        '                                    parentId = parent.id; parentName = parent.name;\r',
        '                                    teamId = dept.id; teamName = dept.name;\r',
        '                                } else if (parent) {\r',
        '                                    // dept is phòng (only 1 level under root)\r',
        '                                    parentId = dept.id; parentName = dept.name;\r',
        '                                    teamId = 0; teamName = "";\r',
        '                                } else {\r',
        '                                    parentId = dept.id; parentName = dept.name;\r',
        '                                }\r',
        '                            }\r',
        '                            if (!tree[parentId]) tree[parentId] = { name: parentName, teams: {} };\r',
        '                            if (!tree[parentId].teams[teamId]) tree[parentId].teams[teamId] = { name: teamName, members: [] };\r',
        '                            tree[parentId].teams[teamId].members.push(m);\r',
        '                        });\r',
        '                        \r',
        '                        return Object.entries(tree).map(([pId, pData]) => {\r',
        '                            const teamsHtml = Object.entries(pData.teams).map(([tId, tData]) => {\r',
        '                                const teamHeader = tData.name ? `<div style="padding:4px 10px;margin:8px 0 4px;font-size:11px;font-weight:700;color:#6366f1;">👥 ${tData.name} (${tData.members.length})</div>` : "";\r',
        '                                const cards = tData.members.map(m => {\r',
        '                                    const c = _htgd_avatarColor(m.full_name || m.username);\r',
        '                                    const crmBadge = isAll ? `<span style="font-size:9px;padding:2px 6px;border-radius:6px;font-weight:700;background:${crmColorMap[m.crm_type] || "#6b7280"}20;color:${crmColorMap[m.crm_type] || "#6b7280"}">${crmLabelMap[m.crm_type] || m.crm_type}</span>` : "";\r',
        '                                    return `<div class="ts-nv-card" style="animation:ts-fadeInUp 0.3s ease both;">\r',
        '                                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">\r',
        '                                            <span class="ts-avatar" style="background:${c};width:38px;height:38px;font-size:14px;">${_htgd_initials(m.full_name || m.username)}</span>\r',
        '                                            <div style="flex:1;min-width:0;">\r',
        '                                                <div style="font-weight:700;color:#122546;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name || m.username}</div>\r',
        '                                                <div style="font-size:10px;color:#6366f1;font-weight:600;">${m.dept_name || "—"} ${crmBadge}</div>\r',
        '                                            </div>\r',
        '                                            ${m.is_active ? \'<span class="ts-badge" style="background:#dcfce7;color:#16a34a;font-size:9px;">● Active</span>\' : \'<span class="ts-badge" style="background:#fef2f2;color:#dc2626;font-size:9px;">● Inactive</span>\'}\r',
        '                                        </div>\r',
        '                                        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;">\r',
        '                                            <div style="display:flex;align-items:center;gap:6px;">\r',
        '                                                <span style="font-size:10px;color:#6b7280;font-weight:600;">Quota/ngày:</span>\r',
        '                                                ${isAll\r',
        '                                                    ? `<span style="font-weight:700;font-size:12px;color:#334155;">${m.daily_quota}</span>`\r',
        '                                                    : `<input type="number" value="${m.daily_quota}" style="width:65px;padding:4px 6px;border:1.5px solid #e5e7eb;border-radius:8px;text-align:center;font-weight:700;font-size:12px;" onchange="_htgd_updateQuota(${m.user_id},this.value)">`}\r',
        '                                            </div>\r',
        "                                            ${isAll ? '' : `<button class=\"ts-btn ts-btn-ghost ts-btn-xs\" onclick=\"_htgd_removeMember(${m.user_id},'${(m.full_name||m.username).replace(/'/g,\"\\\\\\\\\\\\\\\\\\\\\\\\'\")}')\" title=\"Bỏ NV\">❌</button>`}\r",
        '                                        </div>\r',
        '                                    </div>`;\r',
        '                                }).join("");\r',
        '                                return teamHeader + `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">${cards}</div>`;\r',
        '                            }).join("");\r',
        '                            return `<div style="margin-bottom:16px;"><div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:10px;margin-bottom:6px;cursor:pointer;" onclick="var el=this.nextElementSibling;el.style.display=el.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'[data-arrow]\').textContent=el.style.display===\'none\'?\'▶\':\'▼\'"><span style="font-size:13px;font-weight:800;color:#334155;">📁 ${pData.name}</span><span style="font-size:11px;color:#6b7280;margin-left:auto;">(${Object.values(pData.teams).reduce((s,t)=>s+t.members.length,0)})</span><span data-arrow style="font-size:11px;color:#9ca3af;margin-left:4px;">▼</span></div><div>${teamsHtml}</div></div>`;\r',
        '                        }).join("");\r',
        '                    })()}\r',
        '                </div>\r',
    ];
    
    lines.splice(gridStart, gridEnd - gridStart + 1, ...newLines);
    console.log(`✅ Replaced lines ${gridStart+1}-${gridEnd+1} with ${newLines.length} lines`);
} else {
    console.log('❌ Could not find grid section');
}

content = lines.join('\n');
fs.writeFileSync(path, content, 'utf-8');
console.log('File saved. Length:', content.length);

const { execSync } = require('child_process');
try {
    execSync(`node -c "${path}"`, { stdio: 'pipe' });
    console.log('SYNTAX OK ✅');
} catch(e) {
    console.log('SYNTAX ERROR:', e.stderr?.toString()?.slice(0, 500));
}
