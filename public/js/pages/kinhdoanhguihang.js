// ========== ĐƠN HÀNG KINH DOANH GỬI (Read-only) ==========
let _kdShFilter = 'today';
let _kdShOrders = [];
let _kdShCounts = {};

async function renderKinhdoanhguihangPage(container) {
    _kdShFilter = 'today';
    container.innerHTML = `<div style="max-width:1600px;margin:0 auto;padding:16px;">
        <h2 style="margin:0 0 16px;font-size:22px;color:#122546;font-weight:800;">📦 Đơn Hàng Kinh Doanh Gửi</h2>
        <div style="display:flex;gap:16px;align-items:flex-start;">
            <div id="kdShSidebar" style="width:220px;flex-shrink:0;"></div>
            <div id="kdShContent" style="flex:1;min-width:0;"></div>
        </div>
    </div>`;
    _kdShRenderSidebar();
    _kdShLoadOrders();
}

function _kdShRenderSidebar() {
    const sb = document.getElementById('kdShSidebar');
    if (!sb) return;
    const filters = [
        { key:'early', icon:'🔵', label:'Gửi Sớm', color:'#3b82f6', bg:'#eff6ff' },
        { key:'today', icon:'🔴', label:'Hôm Nay Gửi', color:'#dc2626', bg:'#fef2f2' },
        { key:'rescheduled', icon:'🟡', label:'Chưa Gửi', color:'#d97706', bg:'#fffbeb' },
        { key:'shipped', icon:'✅', label:'Đã Gửi', color:'#059669', bg:'#ecfdf5' }
    ];
    sb.innerHTML = filters.map(f => {
        const active = _kdShFilter === f.key;
        const cnt = _kdShCounts[f.key] || 0;
        return `<div onclick="_kdShSetFilter('${f.key}')" style="padding:12px 14px;margin-bottom:6px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .2s;border:2px solid ${active ? f.color : '#e2e8f0'};background:${active ? f.bg : 'white'};" onmouseover="if(!${active})this.style.borderColor='${f.color}'" onmouseout="if(!${active})this.style.borderColor='#e2e8f0'">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">${f.icon}</span>
                <span style="font-size:13px;font-weight:700;color:${active ? f.color : '#334155'};">${f.label}</span>
            </div>
            <span style="background:${active ? f.color : '#e2e8f0'};color:${active ? 'white' : '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">${cnt}</span>
        </div>`;
    }).join('');
}

function _kdShSetFilter(key) { _kdShFilter = key; _kdShRenderSidebar(); _kdShLoadOrders(); }

async function _kdShLoadOrders() {
    const el = document.getElementById('kdShContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';
    try {
        const data = await apiCall(`/api/shipping/orders?filter=${_kdShFilter}&page_type=kinhdoanh`);
        _kdShOrders = data.orders || [];
        _kdShCounts = data.counts || {};
        _kdShRenderSidebar();
        _kdShRenderTable(el);
    } catch(e) {
        el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">Lỗi: ${e.message}</div>`;
    }
}

function _kdShRenderTable(el) {
    if (_kdShOrders.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px;"><div style="font-size:48px;margin-bottom:12px;">📭</div><div style="color:#9ca3af;font-size:14px;font-weight:600;">Không có đơn hàng nào</div></div>`;
        return;
    }
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const today = new Date().toISOString().split('T')[0];

    let html = `<div style="overflow-x:auto;border:2px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1000px;">
    <thead><tr style="background:linear-gradient(135deg,#122546,#1e3a5f);">
        ${['TT','Ngày ĐH','Ngày Gửi DK','Tiến Độ','Mã Đơn','TC','KH','SĐT','NVC DK','NVC TT','Mã VĐ','Giờ Gửi'].map(h =>
            `<th style="padding:10px 8px;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;text-align:left;">${h}</th>`
        ).join('')}
    </tr></thead><tbody>`;

    for (const o of _kdShOrders) {
        const overdue = o.is_overdue;
        const effDate = o.effective_ship_date;
        const daysLate = overdue ? Math.ceil((new Date(today) - new Date(effDate)) / 86400000) : 0;
        const rowBg = overdue ? '#fef2f2' : '';
        const prioColors = { 'GỬI':'#3b82f6', 'GẤP':'#dc2626', 'CHUẨN':'#7c3aed' };
        const prioColor = prioColors[o.shipping_priority] || '#6b7280';
        const statusIcon = o.shipping_status === 'shipped' ? '✅' : o.shipping_status === 'rescheduled' ? '📅' : (overdue ? '⚠️' : '⏳');

        html += `<tr style="border-bottom:1px solid #f1f5f9;background:${rowBg};" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'">`;
        html += `<td style="padding:8px 6px;text-align:center;font-size:14px;">${statusIcon}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${fmt(o.order_date)}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:700;${overdue ? 'color:#dc2626;' : 'color:#1e293b;'}">${fmt(effDate)}${overdue ? `<div style="font-size:9px;color:#dc2626;font-weight:800;">Trễ ${daysLate} ngày</div>` : ''}</td>`;
        html += `<td style="padding:8px 6px;">${o.delivery_progress ? `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#3b82f6;">${o.delivery_progress}</span>` : '—'}</td>`;
        html += `<td style="padding:8px 6px;font-weight:800;color:#1e293b;">${o.order_code || '—'}</td>`;
        html += `<td style="padding:8px 6px;"><span style="background:${prioColor};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">${o.shipping_priority || 'CHUẨN'}</span></td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;">${o.customer_name || '—'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.customer_phone || '—'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.carrier_name || '—'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#1e293b;">${o.actual_carrier_name || '—'}</td>`;
        var _kdTcDisplay = o.tracking_code || '—';
        if (o.tracking_code && o.actual_carrier_tracking_url) {
            var _kdTcUrl = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.tracking_code));
            _kdTcDisplay = `<a href="${_kdTcUrl}" target="_blank" rel="noopener" style="color:#1e40af;font-weight:700;text-decoration:underline;" title="Tra cứu vận đơn">${o.tracking_code}</a>`;
        }
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;">${_kdTcDisplay}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.shipped_at ? new Date(o.shipped_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}) : '—'}</td>`;
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    html += `<div style="margin-top:8px;font-size:11px;color:#9ca3af;">Tổng: ${_kdShOrders.length} đơn</div>`;
    el.innerHTML = html;
}
