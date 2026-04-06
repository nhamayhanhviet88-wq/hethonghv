const fs = require('fs');
const path = 'd:/0 - Google Antigravity/11 - NHAN VIEN KINH DOANH - Copy/public/js/pages/hethonggoidien.js';
let content = fs.readFileSync(path, 'utf-8');

// =============================================
// FIX 1: Upgrade _htgd_configColumns - add 3 missing fields, change to dropdown A-Z
// =============================================
const oldConfigColumns = `// ========== CONFIG COLUMNS ==========\r
async function _htgd_configColumns(sourceId) {\r
    const srcRes = await apiCall(\`/api/telesale/sources?crm_type=\${_htgd_settingsCrm}\`);\r
    const src = (srcRes.sources || []).find(s => s.id === sourceId);\r
    if (!src) return;\r
    const mapping = src.column_mapping || {};\r
    const fields = [\r
        { key: 'phone', label: '📱 SĐT (bắt buộc)', required: true },\r
        { key: 'customer_name', label: '👤 Tên KH' },\r
        { key: 'company_name', label: '🏢 Tên Công Ty' },\r
        { key: 'address', label: '📍 Địa Chỉ' },\r
    ];\r
    const body = \`<div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Nhập tên cột trong file CSV tương ứng với mỗi trường:</div>\r
    \${fields.map(f => \`<div class="form-group" style="margin-bottom:10px;">\r
        <label style="font-size:12px;font-weight:700;">\${f.label}</label>\r
        <input type="text" id="colMap_\${f.key}" class="form-control" value="\${mapping[f.key] || ''}" placeholder="VD: phone, sdt, so_dien_thoai...">\r
    </div>\`).join('')}\`;\r
    openModal('📝 Cấu Hình Cột Import: ' + src.name, body,\r
        \`<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>\r
         <button class="btn btn-success" onclick="_htgd_saveColumns(\${sourceId})">💾 Lưu</button>\`);\r
}\r
\r
async function _htgd_saveColumns(sourceId) {\r
    const mapping = {};\r
    ['phone','customer_name','company_name','address'].forEach(k => {\r
        const v = document.getElementById('colMap_'+k)?.value?.trim();\r
        if (v) mapping[k] = v;\r
    });\r
    const res = await apiCall(\`/api/telesale/sources/\${sourceId}\`, 'PUT', { column_mapping: mapping });\r
    if (res.success) { showToast('✅ Đã lưu cấu hình cột'); closeModal(); await _htgd_renderSettingsTab(); }\r
    else showToast(res.error, 'error');\r
}`;

const newConfigColumns = `// ========== CONFIG COLUMNS ==========\r
async function _htgd_configColumns(sourceId) {\r
    const srcRes = await apiCall(\`/api/telesale/sources?crm_type=\${_htgd_settingsCrm}\`);\r
    const src = (srcRes.sources || []).find(s => s.id === sourceId);\r
    if (!src) return;\r
    const mapping = src.column_mapping || {};\r
    const fields = [\r
        { key: 'company_name', label: '🏢 Tên Công Ty' },\r
        { key: 'group_name', label: '👥 Tên Nhóm' },\r
        { key: 'post_link', label: '🔗 Link Đăng Bài' },\r
        { key: 'post_content', label: '📝 Nội Dung ĐB' },\r
        { key: 'customer_name', label: '👤 Tên KH' },\r
        { key: 'phone', label: '📱 SĐT (bắt buộc)', required: true },\r
        { key: 'address', label: '📍 Địa Chỉ', hasAuto: true },\r
    ];\r
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');\r
    const body = \`<div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Chọn cột Excel/CSV tương ứng với mỗi trường dữ liệu:</div>\r
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">\r
    \${fields.map(f => {\r
        const curVal = mapping[f.key] || '';\r
        let opts = f.required ? '' : '<option value="">— Bỏ qua —</option>';\r
        if (f.hasAuto) opts += '<option value="AUTO" ' + (curVal === 'AUTO' ? 'selected' : '') + '>🔄 AUTO (lấy từ Nội Dung ĐB)</option>';\r
        letters.forEach((l, i) => {\r
            opts += '<option value="' + l + '" ' + (curVal === l ? 'selected' : '') + '>' + l + ' (Cột ' + (i+1) + ')</option>';\r
        });\r
        const borderColor = f.required ? '#dc2626' : '#e5e7eb';\r
        return '<div style="margin-bottom:4px;"><label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">' + f.label + (f.required ? ' <span style=\\\\"color:#dc2626;\\\\">*</span>' : '') + '</label><select id="colMap_' + f.key + '" class="form-control" style="border:1.5px solid ' + borderColor + ';border-radius:8px;padding:8px 10px;font-size:13px;font-weight:600;">' + opts + '</select></div>';\r
    }).join('')}\r
    </div>\`;\r
    openModal('📝 Cấu Hình Cột Import: ' + src.name, body,\r
        \`<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>\r
         <button class="btn btn-success" onclick="_htgd_saveColumns(\${sourceId})">💾 Lưu</button>\`);\r
}\r
\r
async function _htgd_saveColumns(sourceId) {\r
    const mapping = {};\r
    ['company_name','group_name','post_link','post_content','customer_name','phone','address'].forEach(k => {\r
        const v = document.getElementById('colMap_'+k)?.value?.trim();\r
        if (v) mapping[k] = v;\r
    });\r
    if (!mapping.phone) return showToast('SĐT là bắt buộc', 'error');\r
    const res = await apiCall(\`/api/telesale/sources/\${sourceId}\`, 'PUT', { column_mapping: mapping });\r
    if (res.success) { showToast('✅ Đã lưu cấu hình cột'); closeModal(); await _htgd_renderSettingsTab(); }\r
    else showToast(res.error, 'error');\r
}`;

if (content.includes(oldConfigColumns)) {
    content = content.replace(oldConfigColumns, newConfigColumns);
    console.log('✅ Config columns replaced directly');
} else {
    console.log('⚠️ Direct match failed, trying line-based...');
    const lines = content.split('\n');
    let startIdx = -1, endIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('// ========== CONFIG COLUMNS ==========')) startIdx = i;
        if (startIdx >= 0 && i > startIdx && lines[i].trim().startsWith('}') && i > startIdx + 5) {
            // Check if next line is empty or different section
            if (i + 1 >= lines.length || lines[i + 1].trim() === '' || lines[i + 1].trim() === '\r') {
                endIdx = i;
                // Check for saveColumns function after
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].includes('async function _htgd_saveColumns')) {
                        // Find end of saveColumns
                        for (let k = j + 1; k < lines.length; k++) {
                            if (lines[k].trim() === '}' || lines[k].trim() === '}\r') {
                                endIdx = k;
                                break;
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }
    }
    if (startIdx >= 0 && endIdx >= 0) {
        const newLines = newConfigColumns.split('\n');
        lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
        content = lines.join('\n');
        console.log(`✅ Replaced lines ${startIdx+1}-${endIdx+1}`);
    } else {
        console.log('❌ FAILED to find function boundaries');
    }
}

// =============================================
// FIX 2: Update import parsing to use column_mapping
// =============================================
// Find the CSV parsing line and replace with mapping-aware version
const oldParseLine = `            rows.push({ company_name:cols[0]||'', group_name:cols[1]||'', post_link:cols[2]||'', post_content:cols[3]||'', customer_name:cols[4]||'', phone:(cols[5]||'').trim(), address:cols[6]||'' });`;

const newParseLine = `            // Use column_mapping from source config
            const src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
            const cm = src?.column_mapping || {};
            const colIdx = (letter) => letter ? letter.charCodeAt(0) - 65 : -1;
            const getCol = (key) => { const idx = colIdx(cm[key]); return idx >= 0 && idx < cols.length ? (cols[idx]||'').trim() : ''; };
            let addr = '';
            if (cm.address === 'AUTO') {
                // Extract address from post_content - look for Vietnamese address patterns
                const pc = getCol('post_content');
                const addrMatch = pc.match(/(?:địa chỉ|đc|dc|Đ\\/c)[:\\s]*([^\\n,]+)/i) || pc.match(/(\\d+[^,\\n]*(?:phố|đường|ngõ|phường|quận|tp|hcm|hà nội|hn)[^,\\n]*)/i);
                addr = addrMatch ? addrMatch[1].trim() : '';
            } else {
                addr = getCol('address');
            }
            rows.push({ company_name:getCol('company_name'), group_name:getCol('group_name'), post_link:getCol('post_link'), post_content:getCol('post_content'), customer_name:getCol('customer_name'), phone:getCol('phone'), address:addr });`;

if (content.includes(oldParseLine)) {
    // We need to move the mapping logic OUTSIDE the for loop. Replace the whole parse block.
    // Actually, let's put the mapping vars before the for loop and just the row push inside.
    content = content.replace(oldParseLine, newParseLine);
    console.log('✅ Parse line replaced');
    
    // But the cm/colIdx/getCol should be outside the loop. Let me fix by moving them.
    // Actually, since they reference _htgd_sources which is global, and cols changes per line,
    // we should split: put src/cm/colIdx before the loop, getCol and row push inside.
    // Let me restructure:
    
    // Find "const rows = [];" and add the mapping setup after it
    const rowsDecl = "        const rows = [];";
    const rowsDeclWithMapping = `        const rows = [];
            const _src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
            const _cm = _src?.column_mapping || {};
            const _colIdx = (letter) => letter ? letter.charCodeAt(0) - 65 : -1;`;
    content = content.replace(rowsDecl, rowsDeclWithMapping);
    
    // Now simplify the in-loop code to use _cm instead of cm
    content = content.replace(
        `            // Use column_mapping from source config
            const src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
            const cm = src?.column_mapping || {};
            const colIdx = (letter) => letter ? letter.charCodeAt(0) - 65 : -1;
            const getCol = (key) => { const idx = colIdx(cm[key]); return idx >= 0 && idx < cols.length ? (cols[idx]||'').trim() : ''; };`,
        `            const getCol = (key) => { const idx = _colIdx(_cm[key]); return idx >= 0 && idx < cols.length ? (cols[idx]||'').trim() : ''; };`
    );
    
    // Also update the min cols check - with mapping, we just need phone column to exist
    content = content.replace(
        "            if (cols.length < 6) continue;",
        "            if (cols.length < 1) continue;"
    );
    
    console.log('✅ Import logic restructured');
} else {
    console.log('⚠️ Parse line not found exactly, skipping import fix');
}

fs.writeFileSync(path, content, 'utf-8');
console.log('File saved. Length:', content.length);

// Syntax check
const { execSync } = require('child_process');
try {
    execSync(`node -c "${path}"`, { stdio: 'pipe' });
    console.log('SYNTAX OK ✅');
} catch(e) {
    console.log('SYNTAX ERROR:', e.stderr?.toString()?.slice(0, 500));
}
