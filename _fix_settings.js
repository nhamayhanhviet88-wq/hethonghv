const fs = require('fs');
const path = 'd:/0 - Google Antigravity/11 - NHAN VIEN KINH DOANH - Copy/public/js/pages/hethonggoidien.js';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');

// Lines 838-848 (1-indexed) = indices 837-847 (0-indexed) need replacement
// Line 838 starts with: <button class="ts-btn ts-btn-blue ts-btn-xs" onclick=                ${sources.map...
// Line 848: }).join('')}
const newBlock = `                <button class="ts-btn ts-btn-blue ts-btn-xs" onclick="_htgd_syncSourceQuota()" style="white-space:nowrap;">Đồng bộ tất cả</button>\r
            </div>\r
        </div>\r
        <div style="border:1.5px solid #e5e7eb;border-radius:14px;overflow:auto;">\r
            <table class="ts-table" style="min-width:900px;"><thead><tr>\r
                <th style="text-align:left;">Icon</th><th style="text-align:left;">Tên Nguồn</th><th style="text-align:center;">Quota</th>\r
                <th style="text-align:center;color:#059669;">🟩Vtel</th><th style="text-align:center;color:#2563eb;">🟦Mobi</th><th style="text-align:center;color:#ca8a04;">🟨Vina</th>\r
                <th style="text-align:center;color:#16a34a;">🟩Vnmb</th><th style="text-align:center;color:#9333ea;">🟪Gmob</th><th style="text-align:center;color:#ea580c;">🟧iTel</th><th style="text-align:center;color:#b91c1c;">🟫Redd</th>\r
                <th style="text-align:center;">Chế Độ</th><th style="text-align:center;">Import</th><th style="text-align:center;">Thao Tác</th>\r
            </tr></thead><tbody>\r
                \${sources.map(s => {\r
                    const cs = sourceCarrierStats[s.id] || {};\r
                    const hasMapping = s.column_mapping && Object.values(s.column_mapping).some(v => v);\r
                    const mappingBadge = hasMapping ? '<span class="ts-badge" style="background:#dcfce7;color:#16a34a;cursor:pointer;" onclick="_htgd_configColumns('+s.id+')">✅</span>' : '<span class="ts-badge" style="background:#fef3c7;color:#92400e;cursor:pointer;" onclick="_htgd_configColumns('+s.id+')">⚠️</span>';\r
                    const mode = s.distribution_mode || 'priority';\r
                    const modeBadge = mode === 'even' ? '<span class="ts-badge" style="background:#dbeafe;color:#1e40af;cursor:pointer;font-size:10px;" onclick="_htgd_carrierPriorityModal('+s.id+')">⚖️ Đều</span>' : '<span class="ts-badge" style="background:#dcfce7;color:#059669;cursor:pointer;font-size:10px;" onclick="_htgd_carrierPriorityModal('+s.id+')">🎯 Ưu tiên</span>';\r
                    const cb = (v) => v ? '<span style="font-weight:700;font-size:11px;">'+v.toLocaleString()+'</span>' : '<span style="color:#d1d5db;">0</span>';\r
                    const safeName = (s.name||'').replace(/'/g,'');\r
                    return '<tr><td style="font-size:20px;">'+(s.icon||'📁')+'</td><td style="font-weight:700;color:#122546;white-space:nowrap;">'+s.name+'</td><td style="text-align:center;"><span class="ts-badge" style="background:#dbeafe;color:#1e40af;">'+s.daily_quota+'</span></td><td style="text-align:center;">'+cb(cs.Viettel)+'</td><td style="text-align:center;">'+cb(cs.Mobi)+'</td><td style="text-align:center;">'+cb(cs.Vina)+'</td><td style="text-align:center;">'+cb(cs.Vnmb)+'</td><td style="text-align:center;">'+cb(cs.Gmob)+'</td><td style="text-align:center;">'+cb(cs.iTel)+'</td><td style="text-align:center;">'+cb(cs.Reddi)+'</td><td style="text-align:center;">'+modeBadge+'</td><td style="text-align:center;">'+mappingBadge+'</td><td style="text-align:center;white-space:nowrap;"><button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_htgd_editSource('+s.id+')">✏️</button> <button class="ts-btn ts-btn-xs" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;" onclick="_htgd_deleteSource('+s.id+')">🗑️</button></td></tr>';\r
                }).join('')}`;

const newLines = newBlock.split('\n');

// Replace lines 838-848 (11 lines, 0-indexed 837-847)
lines.splice(837, 11, ...newLines);

fs.writeFileSync(path, lines.join('\n'), 'utf-8');
console.log('Fixed! Total lines:', lines.length);
