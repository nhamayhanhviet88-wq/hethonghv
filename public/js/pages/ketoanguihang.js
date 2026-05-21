// ========== ĐƠN HÀNG KẾ TOÁN GỬI ==========
let _shFilter = 'today';
let _shOrders = [];
let _shCounts = {};
let _shCarriers = [];

async function renderKetoanguihangPage(container) {
    _shFilter = 'today';
    container.innerHTML = `<div style="max-width:1600px;margin:0 auto;padding:16px;">
        <h2 style="margin:0 0 16px;font-size:22px;color:#122546;font-weight:800;">📤 Đơn Hàng Kế Toán Gửi</h2>
        <div style="display:flex;gap:16px;align-items:flex-start;">
            <div id="shSidebar" style="width:220px;flex-shrink:0;"></div>
            <div id="shContent" style="flex:1;min-width:0;"></div>
        </div>
    </div>`;
    try { const c = await apiCall('/api/shipping/carriers'); _shCarriers = c.carriers || []; } catch(e){}
    _shRenderSidebar();
    _shLoadOrders();
}

function _shRenderSidebar() {
    const sb = document.getElementById('shSidebar');
    if (!sb) return;
    const filters = [
        { key:'early', icon:'🔵', label:'Gửi Sớm', color:'#3b82f6', bg:'#eff6ff' },
        { key:'today', icon:'🔴', label:'Hôm Nay Gửi', color:'#dc2626', bg:'#fef2f2' },
        { key:'rescheduled', icon:'🟡', label:'Chưa Gửi', color:'#d97706', bg:'#fffbeb' },
        { key:'shipped', icon:'✅', label:'Đã Gửi', color:'#059669', bg:'#ecfdf5' }
    ];
    sb.innerHTML = filters.map(f => {
        const active = _shFilter === f.key;
        const cnt = _shCounts[f.key] || 0;
        return `<div onclick="_shSetFilter('${f.key}')" style="padding:12px 14px;margin-bottom:6px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .2s;border:2px solid ${active ? f.color : '#e2e8f0'};background:${active ? f.bg : 'white'};box-shadow:${active ? '0 2px 8px rgba(0,0,0,.08)' : 'none'};" onmouseover="if(!${active})this.style.borderColor='${f.color}'" onmouseout="if(!${active})this.style.borderColor='#e2e8f0'">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">${f.icon}</span>
                <span style="font-size:13px;font-weight:700;color:${active ? f.color : '#334155'};">${f.label}</span>
            </div>
            <span style="background:${active ? f.color : '#e2e8f0'};color:${active ? 'white' : '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">${cnt}</span>
        </div>`;
    }).join('') + `${_shCounts.overdue > 0 ? `<div style="margin-top:10px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;"><div style="font-size:11px;font-weight:700;color:#dc2626;">⚠️ ${_shCounts.overdue} đơn quá hạn!</div><div style="font-size:10px;color:#991b1b;margin-top:2px;">Phạt 100.000đ/ngày nếu không gửi</div></div>` : ''}`;
}

function _shSetFilter(key) { _shFilter = key; _shRenderSidebar(); _shLoadOrders(); }

async function _shLoadOrders() {
    const el = document.getElementById('shContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';
    try {
        const data = await apiCall(`/api/shipping/orders?filter=${_shFilter}&page_type=ketoan`);
        _shOrders = data.orders || [];
        _shCounts = data.counts || {};
        _shRenderSidebar();
        _shRenderTable(el);
    } catch(e) {
        el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">Lỗi: ${e.message}</div>`;
    }
}

function _shRenderTable(el) {
    if (_shOrders.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px;"><div style="font-size:48px;margin-bottom:12px;">📭</div><div style="color:#9ca3af;font-size:14px;font-weight:600;">Không có đơn hàng nào</div></div>`;
        return;
    }
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '\u2014';
    const isKT = _shFilter !== 'shipped';
    const today = new Date().toISOString().split('T')[0];

    let html = `<div style="overflow-x:auto;border:2px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px;">
    <thead><tr style="background:linear-gradient(135deg,#122546,#1e3a5f);">
        ${['','🔗','Ngày ĐH','Ngày Gửi DK','Tiến Độ','Mã Đơn','TC','KH','SĐT','CSKH','NVC DK','NVC TT','Mã VĐ','SĐT NX','Giờ Gửi','Lịch Sử'].map(h =>
            `<th style="padding:10px 8px;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;text-align:left;">${h}</th>`
        ).join('')}
    </tr></thead><tbody>`;

    for (const o of _shOrders) {
        const overdue = o.is_overdue;
        const effDate = o.effective_ship_date;
        const daysLate = overdue ? Math.ceil((new Date(today) - new Date(effDate)) / 86400000) : 0;
        const rowBg = overdue ? '#fef2f2' : '';
        const prioColors = { 'GỬI':'#3b82f6', 'GẤP':'#dc2626', 'CHUẨN':'#7c3aed' };
        const prioColor = prioColors[o.shipping_priority] || '#6b7280';

        // Tiến Độ: real-time (today vs expected_ship_date)
        let progressBadge = '<span style="color:#d1d5db;">\u2014</span>';
        if (o.expected_ship_date) {
            const shipDate = new Date(o.expected_ship_date);
            const todayDate = new Date(today);
            const diffDays = Math.round((shipDate - todayDate) / 86400000);
            if (diffDays > 0) {
                progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#ecfdf5;color:#059669;">🚀 Nhanh hơn ${diffDays} ngày</span>`;
            } else if (diffDays < 0) {
                progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#fef2f2;color:#dc2626;">⚠️ Trễ ${Math.abs(diffDays)} ngày</span>`;
            } else {
                progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#3b82f6;">📦 Đúng hạn</span>`;
            }
        }

        html += `<tr style="border-bottom:1px solid #f1f5f9;background:${rowBg};" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'">`;
        // Col 1: Ship button
        if (isKT && o.shipping_status !== 'shipped') {
            html += `<td style="padding:8px 6px;text-align:center;">
                <button onclick="_shShipOrder(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Xác nhận gửi">📤 Gửi</button>
                <button onclick="_shShowReschedule(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
            </td>`;
        } else {
            html += `<td style="padding:8px 6px;text-align:center;"><span style="color:#059669;font-size:14px;">✅</span></td>`;
        }
        // Col 2: Bill link
        html += `<td style="padding:8px 4px;text-align:center;">${o.shipping_bill_link ? `<a href="${o.shipping_bill_link}" target="_blank" style="color:#3b82f6;font-size:14px;" title="Xem bill">🔗</a>` : `<span style="color:#d1d5db;cursor:pointer;font-size:14px;" onclick="_shEditTracking(${o.id},'shipping_bill_link','${(o.shipping_bill_link||'').replace(/'/g,"\\'")}')" title="Thêm link bill">➕</span>`}</td>`;
        // Col 3-4: Dates
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${fmt(o.order_date)}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:700;${overdue ? 'color:#dc2626;' : 'color:#1e293b;'}">
            ${fmt(effDate)}${overdue ? `<div style="font-size:9px;color:#dc2626;font-weight:800;">⚠️ Trễ ${daysLate} ngày</div>` : ''}
            ${o.rescheduled_ship_date && o.shipping_status === 'rescheduled' ? `<div style="font-size:9px;color:#d97706;">📅 Hẹn lại</div>` : ''}</td>`;
        // Col 5: Progress
        html += `<td style="padding:8px 6px;">${progressBadge}</td>`;
        // Col 6: Order code
        html += `<td style="padding:8px 6px;font-weight:800;color:#1e293b;font-size:12px;">${o.order_code || '\u2014'}</td>`;
        // Col 7: Priority
        html += `<td style="padding:8px 6px;"><span style="background:${prioColor};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">${o.shipping_priority || 'CHUẨN'}</span></td>`;
        // Col 8-9: Customer
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.customer_name||''}">${o.customer_name || '\u2014'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.customer_phone || '\u2014'}</td>`;
        // Col 10: CSKH
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.cskh_name || '\u2014'}</td>`;
        // Col 11: NVC DK
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.carrier_name || '\u2014'}</td>`;
        // Col 12: NVC TT (read-only)
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:600;color:#1e293b;">${o.actual_carrier_name || '\u2014'}</td>`;
        // Col 13: Tracking code (read-only)
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;">${o.tracking_code || '\u2014'}</td>`;
        // Col 14: Carrier phone (read-only)
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.carrier_phone || '\u2014'}</td>`;
        // Col 15: Ship time
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.shipped_at ? new Date(o.shipped_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}) : '\u2014'}</td>`;
        // Col 16: History
        html += `<td style="padding:8px 6px;text-align:center;"><button onclick="_shShowHistory(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:3px 6px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;cursor:pointer;font-size:10px;font-weight:600;">📋</button></td>`;
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    html += `<div style="margin-top:8px;font-size:11px;color:#9ca3af;">Tổng: ${_shOrders.length} đơn</div>`;
    el.innerHTML = html;
}

// ===== ACTIONS =====
async function _shShipOrder(id, code) {
    if (!confirm(`Xác nhận gửi đơn ${code}?`)) return;
    try {
        const r = await apiCall(`/api/shipping/orders/${id}/ship`, 'POST');
        if (r.error) { alert(r.error); return; }
        showToast(r.message || '✅ Đã gửi');
        _shLoadOrders();
    } catch(e) { alert('Lỗi: ' + e.message); }
}

function _shShowReschedule(id, code) {
    document.getElementById('shRescheduleModal')?.remove();
    const m = document.createElement('div');
    m.id = 'shRescheduleModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    m.innerHTML = `<div style="background:white;border-radius:16px;width:420px;max-width:95vw;padding:24px;box-shadow:0 25px 50px rgba(0,0,0,.3);">
        <div style="font-size:16px;font-weight:800;color:#122546;margin-bottom:16px;">📅 Hẹn Lại — ${code}</div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Ngày gửi mới <span style="color:#dc2626">*</span></label>
            <input type="date" id="shNewDate" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;">
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Lý do <span style="color:#dc2626">*</span></label>
            <textarea id="shReason" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;resize:vertical;" placeholder="Nhập lý do hẹn lại..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('shRescheduleModal')?.remove()" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
            <button onclick="_shDoReschedule(${id})" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:700;font-size:13px;">📅 Hẹn lại</button>
        </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

async function _shDoReschedule(id) {
    const newDate = document.getElementById('shNewDate')?.value;
    const reason = document.getElementById('shReason')?.value;
    if (!newDate) { alert('Chọn ngày gửi mới'); return; }
    if (!reason?.trim()) { alert('Nhập lý do'); return; }
    try {
        const r = await apiCall(`/api/shipping/orders/${id}/reschedule`, 'POST', { new_date: newDate, reason: reason.trim() });
        if (r.error) { alert(r.error); return; }
        showToast(r.message || '✅ Đã hẹn lại');
        document.getElementById('shRescheduleModal')?.remove();
        _shLoadOrders();
    } catch(e) { alert('Lỗi: ' + e.message); }
}

function _shEditTracking(id, field, currentVal) {
    const labels = { shipping_bill_link:'Link Bill Gửi Hàng' };
    const val = prompt(labels[field] || field, currentVal || '');
    if (val === null) return;
    apiCall(`/api/shipping/orders/${id}/tracking`, 'PUT', { [field]: val })
        .then(r => { if (r.error) alert(r.error); else { showToast('✅ Đã cập nhật'); _shLoadOrders(); } })
        .catch(e => alert('Lỗi: ' + e.message));
}

async function _shShowHistory(id, code) {
    document.getElementById('shHistoryModal')?.remove();
    try {
        const data = await apiCall(`/api/shipping/orders/${id}/history`);
        const rows = data.history || [];
        const m = document.createElement('div');
        m.id = 'shHistoryModal';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '\u2014';
        m.innerHTML = `<div style="background:white;border-radius:16px;width:500px;max-width:95vw;max-height:80vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.3);">
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:18px 24px;border-radius:16px 16px 0 0;">
                <div style="color:white;font-weight:800;font-size:15px;">📋 Lịch Sử Hẹn Lại — ${code}</div>
            </div>
            <div style="padding:16px 24px;">
                ${rows.length === 0 ? '<div style="text-align:center;color:#9ca3af;padding:20px;">Chưa có lần hẹn lại nào</div>' :
                rows.map((r, i) => `<div style="display:flex;gap:12px;padding:12px 0;${i < rows.length-1 ? 'border-bottom:1px solid #f1f5f9;' : ''}">
                    <div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#2563eb;flex-shrink:0;">${rows.length - i}</div>
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(r.old_date)} → ${fmt(r.new_date)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">${r.reason || '\u2014'}</div>
                        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">Bởi: ${r.rescheduled_by_name || '\u2014'} • ${r.created_at ? new Date(r.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : '\u2014'}</div>
                    </div>
                </div>`).join('')}
            </div>
            <div style="padding:12px 24px;border-top:1px solid #e2e8f0;text-align:right;">
                <button onclick="document.getElementById('shHistoryModal')?.remove()" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">Đóng</button>
            </div>
        </div>`;
        document.body.appendChild(m);
        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    } catch(e) { alert('Lỗi: ' + e.message); }
}
