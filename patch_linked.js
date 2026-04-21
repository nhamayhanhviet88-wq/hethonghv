const fs = require('fs');
const c = fs.readFileSync('public/js/pages/dailylinks.js', 'utf8');

// 1. Add "Báo cáo bù" button next to "Báo cáo công việc" in _dlUpdateActions
const oldBtn = `h += \`<button onclick="_dlAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:\${m.grad};color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">＋ Báo cáo công việc</button>\`;`;

const newBtn = `h += \`<button onclick="_dlBackfillModal()" style="padding:8px 16px;border:2px solid \${m.accent};border-radius:8px;background:white;color:\${m.accent};cursor:pointer;font-weight:700;font-size:13px;margin-right:8px;">📋 Báo cáo bù</button>\`;
        h += \`<button onclick="_dlAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:\${m.grad};color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">＋ Báo cáo công việc</button>\`;`;

if (!c.includes(oldBtn)) {
    console.log('❌ Button pattern not found');
    process.exit(1);
}

let result = c.replace(oldBtn, newBtn);

// 2. Add _dlBackfillModal function before the last line
const backfillCode = `
// ===== BACKFILL MODAL: Báo cáo bù cho ngày chưa hoàn thành =====
async function _dlBackfillModal() {
    const m = _dl.mod;
    document.getElementById('dlBackfillModal')?.remove();
    
    // Show loading
    const d = document.createElement('div'); d.id = 'dlBackfillModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    d.onclick = e => { if (e.target === d) d.remove(); };
    d.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;"><div style="font-size:24px;">⏳</div><div style="margin-top:8px;color:#6b7280;">Đang tải...</div></div>';
    document.body.appendChild(d);
    
    try {
        const res = await apiCall('/api/dailylinks/missing-dates?module_type=' + m.type);
        const dates = res.dates || [];
        
        if (dates.length === 0) {
            d.innerHTML = \`
            <div style="background:white;border-radius:16px;width:min(440px,90vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
                <div style="background:\${m.grad};padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
                    <div style="font-size:18px;font-weight:800;">📋 Báo cáo bù - \${m.label}</div>
                </div>
                <div style="padding:30px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:12px;">🎉</div>
                    <div style="font-size:16px;font-weight:700;color:#16a34a;">Không có ngày nào cần báo cáo bù!</div>
                    <div style="margin-top:6px;color:#6b7280;font-size:13px;">Bạn đã hoàn thành tất cả công việc</div>
                    <button onclick="document.getElementById('dlBackfillModal').remove()" style="margin-top:20px;padding:8px 24px;border:none;border-radius:8px;background:#e5e7eb;color:#374151;cursor:pointer;font-weight:600;">Đóng</button>
                </div>
            </div>\`;
            return;
        }
        
        let listHtml = dates.map(dt => {
            const parts = dt.date.split('-');
            const display = parts[2] + '/' + parts[1] + '/' + parts[0];
            const statusColor = dt.status === 'missing' ? '#dc2626' : (dt.status === 'expired' ? '#f59e0b' : '#6b7280');
            const statusLabel = dt.status === 'missing' ? '🔥 Chưa báo cáo' : (dt.status === 'expired' ? '⏰ Hết hạn' : (dt.status === 'rejected' ? '❌ Bị từ chối' : '⚠️ ' + dt.status));
            return \`<div onclick="_dlBackfillSelect('\${dt.date}')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all .15s;margin-bottom:8px;" onmouseover="this.style.borderColor='\${m.accent}';this.style.background='#f8fafc'" onmouseout="this.style.borderColor='#e5e7eb';this.style.background='white'">
                <div>
                    <span style="font-weight:800;font-size:14px;color:#1e293b;">\${dt.day_name} - \${display}</span>
                    <span style="margin-left:8px;font-size:11px;color:#9ca3af;">\${dt.current_count}/\${dt.target} đã nộp</span>
                </div>
                <span style="font-size:11px;font-weight:700;color:\${statusColor};">\${statusLabel}</span>
            </div>\`;
        }).join('');
        
        d.innerHTML = \`
        <div style="background:white;border-radius:16px;width:min(500px,90vw);max-height:80vh;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
            <div style="background:\${m.grad};padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:18px;font-weight:800;">📋 Báo cáo bù - \${m.label}</div>
                    <button onclick="document.getElementById('dlBackfillModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
                </div>
                <div style="font-size:12px;opacity:0.85;margin-top:6px;">Chọn ngày chưa hoàn thành để báo cáo bù</div>
            </div>
            <div style="padding:20px;max-height:50vh;overflow-y:auto;">
                \${listHtml}
            </div>
        </div>\`;
    } catch(e) {
        d.innerHTML = '<div style="background:white;border-radius:16px;padding:30px;text-align:center;"><div style="color:#dc2626;">❌ Lỗi: ' + (e.message||'') + '</div><button onclick="document.getElementById(\\'dlBackfillModal\\').remove()" style="margin-top:12px;padding:6px 16px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;">Đóng</button></div>';
    }
}

// Select a date → open the normal add modal but with backfill_date
function _dlBackfillSelect(dateStr) {
    document.getElementById('dlBackfillModal')?.remove();
    window._dlBackfillDate = dateStr;
    const parts = dateStr.split('-');
    const display = parts[2] + '/' + parts[1] + '/' + parts[0];
    _dlAddModal();
    // After modal opens, inject date badge
    setTimeout(() => {
        const modal = document.getElementById('dlModal');
        if (!modal) return;
        // Find the header div and add backfill date indicator
        const header = modal.querySelector('div[style*="border-radius:16px 16px 0 0"]');
        if (header) {
            const badge = document.createElement('div');
            badge.style.cssText = 'margin-top:8px;padding:4px 12px;background:rgba(255,255,255,0.2);border-radius:6px;display:inline-block;font-size:12px;font-weight:700;';
            badge.innerHTML = '📅 Báo cáo bù cho ngày: ' + display;
            header.appendChild(badge);
        }
    }, 50);
}
`;

// Find the end of the file (last line should be empty or end of renderDailyLinksPage)
const lastFuncIdx = result.lastIndexOf('function _dlIsViewingSelf');
// Add before the function exports or at the end of the file
result = result.trimEnd() + '\n' + backfillCode;

// 3. Modify _dlSave to pass backfill_date if set
const oldSaveBody = `fb_link: firstLink,
                module_type: m.type,
                links_json: linksJson`;
const newSaveBody = `fb_link: firstLink,
                module_type: m.type,
                links_json: linksJson,
                backfill_date: window._dlBackfillDate || undefined`;
result = result.replace(oldSaveBody, newSaveBody);

// Also fix default save path (single-link modules)
const oldApiCall = "await apiCall('/api/dailylinks/entries', 'POST', body);";
// Find the default save body construction
const defaultBodyPattern = "const body = { fb_link: link, module_type: m.type };";
if (result.includes(defaultBodyPattern)) {
    result = result.replace(defaultBodyPattern, "const body = { fb_link: link, module_type: m.type, backfill_date: window._dlBackfillDate || undefined };");
}

// Clear _dlBackfillDate after successful save
const oldShowToast1 = "showToast('✅ Đã thêm thành công!'); _dlLoadData();";
if (result.includes(oldShowToast1)) {
    result = result.replace(new RegExp(oldShowToast1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "window._dlBackfillDate = null; showToast('✅ Đã thêm thành công!'); _dlLoadData();");
}

fs.writeFileSync('public/js/pages/dailylinks.js', result);
console.log('✅ Frontend patched with Báo cáo bù feature');
