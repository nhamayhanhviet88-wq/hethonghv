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

        html += `<tr style="border-bottom:1px solid #f1f5f9;background:${rowBg};cursor:pointer;" onclick="_dhtShowDetail(${o.id})" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'" title="Xem chi tiết đơn hàng">`;
        // Col 1: Ship button
        if (isKT && o.shipping_status !== 'shipped') {
            html += `<td style="padding:8px 6px;text-align:center;">
                <button onclick="event.stopPropagation();_shShipOrder(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Xác nhận gửi">📤 Gửi</button>
                <button onclick="event.stopPropagation();_shShowReschedule(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
            </td>`;
        } else {
            html += `<td style="padding:8px 6px;text-align:center;"><span style="color:#059669;font-size:14px;">✅</span></td>`;
        }
        // Col 2: Bill link
        html += `<td style="padding:8px 4px;text-align:center;">${o.shipping_bill_link ? `<a href="${o.shipping_bill_link}" target="_blank" style="color:#3b82f6;font-size:14px;" title="Xem bill" onclick="event.stopPropagation()">🔗</a>` : `<span style="color:#d1d5db;cursor:pointer;font-size:14px;" onclick="event.stopPropagation();_shEditTracking(${o.id},'shipping_bill_link','${(o.shipping_bill_link||'').replace(/'/g,"\\'")}')" title="Thêm link bill">➕</span>`}</td>`;
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
        html += `<td style="padding:8px 6px;text-align:center;"><button onclick="event.stopPropagation();_shShowHistory(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:3px 6px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;cursor:pointer;font-size:10px;font-weight:600;">📋</button></td>`;
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    html += `<div style="margin-top:8px;font-size:11px;color:#9ca3af;">Tổng: ${_shOrders.length} đơn</div>`;
    el.innerHTML = html;
}

// ===== CARRIER RULES =====
const _SH_CARRIER_RULES = {
    tracking_code: ['Vận Chuyển J&T','Viettel Post','Hoả Tốc Máy Bay'],
    bill_link: ['Grab','Chú Sơn'],
    bill_and_phone: ['Nhà Xe'],
    receiver_name: ['Khách Đến Lấy','Nhân Viên HV','Người Nhận Hàng Hộ']
};
function _shGetCarrierGroup(name) {
    if (!name) return null;
    for (const [g, list] of Object.entries(_SH_CARRIER_RULES)) { if (list.some(n => name.toLowerCase().includes(n.toLowerCase()))) return g; }
    return 'bill_link';
}

// ===== SHIP MODAL =====
function _shShipOrder(id, code) {
    const o = _shOrders.find(x => x.id === id); if (!o) return;
    document.getElementById('shShipModal')?.remove();
    const m = document.createElement('div'); m.id = 'shShipModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '\u2014';
    const fmtMoney = n => (Number(n)||0).toLocaleString('vi-VN');
    const today = new Date().toISOString().split('T')[0];
    let diffText = '\u2014';
    if (o.expected_ship_date) {
        const diff = Math.round((new Date(o.expected_ship_date) - new Date(today)) / 86400000);
        if (diff > 0) diffText = '\ud83d\ude80 Nhanh h\u01a1n ' + diff + ' ng\u00e0y';
        else if (diff < 0) diffText = '\u26a0\ufe0f Tr\u1ec5 ' + Math.abs(diff) + ' ng\u00e0y';
        else diffText = '\ud83d\udce6 \u0110\u00fang h\u1ea1n';
    }
    const prioMap = {'G\u1eecI':'#3b82f6','G\u1ea4P':'#dc2626','CHU\u1ea8N':'#7c3aed'};
    const pc = prioMap[o.shipping_priority] || '#6b7280';
    const deposit = Number(o.deposit_amount) || 0;
    const remaining = (Number(o.total_amount)||0) - deposit - (Number(o.discount_amount)||0);
    let carrierOpts = '<option value="">\u2014 Ch\u1ecdn NVC \u2014</option>';
    _shCarriers.forEach(c => { carrierOpts += '<option value="' + c.id + '" data-name="' + c.name + '">' + c.name + '</option>'; });
    // Parse carrier_extra
    let ce = null;
    try { ce = o.carrier_extra ? (typeof o.carrier_extra === 'string' ? JSON.parse(o.carrier_extra) : o.carrier_extra) : null; } catch(e){}
    // Build Sale D\u1eb7n KT rows dynamically
    const _R = (icon, lbl, val) => !val ? '' : '<span style="color:#92400e;font-weight:600;">' + icon + ' ' + lbl + '</span><span style="font-weight:700;color:#1e293b;">' + val + '</span>';
    let sR = _R('\ud83d\ude9a','V\u1eadn Chuy\u1ec3n YC C\u1ee7a Sale', o.carrier_name);
    if (ce && ce.type === 'nha_xe') {
        sR += _R('\ud83d\ude8c','T\u00ean Nh\u00e0 Xe', ce.bus_name);
        if (ce.bus_phone) sR += '<span style="color:#92400e;font-weight:600;">\ud83d\udcde S\u0110T Nh\u00e0 Xe</span><span style="font-weight:700;"><a href="tel:' + ce.bus_phone + '" style="color:#2563eb;text-decoration:underline;">' + ce.bus_phone + '</a></span>';
        sR += _R('\ud83d\udccd','\u0110\u1ecba \u0110i\u1ec3m Xe \u0110\u1ed7', ce.bus_location);
        sR += _R('\ud83d\ude80','Xe \u0110i V\u1ec1 \u0110\u00e2u', ce.bus_destination);
        sR += _R('\u23f0','Gi\u1edd Xe Ch\u1ea1y', ce.bus_departure_time);
    }
    if (o.notes) sR += _R('\ud83d\udd14','Nh\u1eafc Nh\u1edf', o.notes);
    sR += _R('\ud83d\udcdd','N\u1ed9i Dung D\u1eb7n KT', o.sale_note_for_accountant);
    sR += '<span style="color:#92400e;font-weight:600;">\ud83d\udd25 TC G\u1eedi</span><span><span style="background:' + pc + ';color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:800;">' + (o.shipping_priority||'CHU\u1ea8N') + '</span></span>';
    if (o.standard_delivery_time) sR += _R('\u23f1\ufe0f','Y\u00eau C\u1ea7u Chu\u1ea9n Gi\u1edd H\u00e0ng Ra', o.standard_delivery_time);
    if (o.standard_proof_image) sR += '<span style="color:#92400e;font-weight:600;">\ud83d\udcf7 \u1ea2nh TC</span><span><a href="' + o.standard_proof_image + '" target="_blank" style="color:#2563eb;text-decoration:underline;font-weight:700;">Xem \u1ea3nh</a></span>';
    sR += '<span style="color:#92400e;font-weight:600;">\ud83d\ude80 Ti\u1ebfn \u0110\u1ed9 Ra H\u00e0ng</span><span style="font-weight:700;color:#059669;">' + diffText + '</span>';
    sR += '<span style="color:#92400e;font-weight:600;">\ud83d\udcc5 Ng\u00e0y g\u1eedi d\u1ef1 ki\u1ebfn</span><span style="font-weight:700;color:#1e293b;">' + fmt(o.expected_ship_date) + '</span>';
    // Customer phone link
    const phoneHtml = o.customer_phone ? '<a href="tel:' + o.customer_phone + '" style="color:#2563eb;text-decoration:underline;">' + o.customer_phone + '</a>' : '\u2014';

    m.innerHTML = '<div style="background:white;border-radius:16px;width:560px;max-width:98vw;box-shadow:0 25px 50px rgba(0,0,0,.3);max-height:95vh;overflow-y:auto;">'
    + '<div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:18px 24px;border-radius:16px 16px 0 0;">'
    + '<div style="color:white;font-weight:800;font-size:16px;">\ud83d\udce4 G\u1eedi H\u00e0ng \u2014 ' + code + '</div>'
    + '<div style="color:rgba(255,255,255,.6);font-size:11px;margin-top:2px;">Ti\u1ec1n \u0111\u01a1n c\u00f2n l\u1ea1i: <b style="color:#fbbf24">' + fmtMoney(remaining) + '\u0111</b></div>'
    + '</div>'
    + '<div style="padding:20px 24px;">'
    // P1: Sale D\u1eb7n KT
    + '<div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:12px;padding:14px 16px;margin-bottom:16px;">'
    + '<div style="font-size:13px;font-weight:800;color:#92400e;margin-bottom:10px;">\ud83d\udccb Sale D\u1eb7n K\u1ebf To\u00e1n Tr\u01b0\u1edbc G\u1eedi H\u00e0ng</div>'
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12px;">' + sR + '</div>'
    + '</div>'
    // P1.5: Th\u00f4ng tin \u0111\u01a1n h\u00e0ng
    + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:16px;">'
    + '<div style="font-size:13px;font-weight:800;color:#334155;margin-bottom:10px;">\ud83d\udcc4 Th\u00f4ng tin \u0111\u01a1n h\u00e0ng</div>'
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12px;">'
    + '<span style="color:#64748b;font-weight:600;">\ud83d\udc64 Kh\u00e1ch h\u00e0ng</span><span style="font-weight:700;color:#1e293b;">' + (o.customer_name||'\u2014') + '</span>'
    + '<span style="color:#64748b;font-weight:600;">\ud83d\udcde S\u0110T</span><span style="font-weight:700;color:#2563eb;">' + phoneHtml + '</span>'
    + '<span style="color:#64748b;font-weight:600;">\ud83c\udfe0 \u0110\u1ecba ch\u1ec9</span><span style="color:#334155;">' + (o.address||'\u2014') + '</span>'
    + '<span style="color:#64748b;font-weight:600;">\ud83d\uddfa T\u1ec9nh / TP</span><span style="font-weight:700;color:#1e293b;">' + (o.province||'\u2014') + '</span>'
    + '</div></div>'
    // P2: NVC
    + '<div style="margin-bottom:16px;">'
    + '<label style="font-size:12px;font-weight:700;color:#374151;">\ud83d\ude9b Nh\u00e0 V\u1eadn Chuy\u1ec3n <span style="color:#dc2626">*</span></label>'
    + '<select id="shCarrierSel" onchange="_shOnCarrierChange()" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;font-weight:600;">' + carrierOpts + '</select>'
    + '</div>'
    + '<div id="shDynFields" style="margin-bottom:16px;"></div>'
    // P3: Ph\u00ed Ship
    + '<div style="border-top:1px solid #e2e8f0;padding-top:14px;">'
    + '<label style="font-size:12px;font-weight:700;color:#374151;">\ud83d\udcb0 Ph\u00ed G\u1eedi H\u00e0ng <span style="color:#dc2626">*</span></label>'
    + '<div style="position:relative;margin-top:4px;margin-bottom:12px;"><input type="text" id="shFeeInput" placeholder="0" oninput="_shFmtFee()" style="width:100%;padding:9px 40px 9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-weight:700;"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:13px;font-weight:600;">\u0111</span></div>'
    + '<div style="display:flex;gap:12px;margin-bottom:10px;">'
    + '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">Ng\u01b0\u1eddi tr\u1ea3 <span style="color:#dc2626">*</span></div><div style="display:flex;gap:6px;" id="shPayerBtns"><button type="button" onclick="_shToggle(\'payer\',\'hv\')" data-val="hv" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">HV tr\u1ea3</button><button type="button" onclick="_shToggle(\'payer\',\'khach\')" data-val="khach" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">Kh\u00e1ch tr\u1ea3</button></div></div>'
    + '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">H\u00ecnh th\u1ee9c <span style="color:#dc2626">*</span></div><div style="display:flex;gap:6px;" id="shMethodBtns"><button type="button" onclick="_shToggle(\'method\',\'ck\')" data-val="ck" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">CK</button><button type="button" onclick="_shToggle(\'method\',\'tm\')" data-val="tm" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">TM</button></div></div>'
    + '</div>'
    + '<div id="shFeeNote" style="font-size:11px;color:#6b7280;padding:6px 8px;background:#f8fafc;border-radius:6px;margin-bottom:12px;display:none;"></div>'
    + '</div></div>'
    // Footer
    + '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">'
    + '<button onclick="document.getElementById(\'shShipModal\')?.remove()" style="padding:9px 18px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">H\u1ee7y b\u1ecf</button>'
    + '<button onclick="_shDoShip(' + id + ')" style="padding:9px 18px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;font-size:13px;">\ud83d\udce4 G\u1eedi H\u00e0ng</button>'
    + '</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    window._shModalState = { payer: null, method: null, orderId: id, remaining };
}


function _shOnCarrierChange() {
    const sel = document.getElementById('shCarrierSel'); if (!sel) return;
    const name = sel.options[sel.selectedIndex]?.dataset?.name || '';
    const g = _shGetCarrierGroup(name);
    const el = document.getElementById('shDynFields'); if (!el) return;
    let h = '';
    const fStyle = 'width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;';
    if (g === 'tracking_code') {
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">Mã Vận Đơn <span style="color:#dc2626">*</span></label><input id="shTrackingCode" style="${fStyle}" placeholder="Nhập mã vận đơn...">`;
    } else if (g === 'bill_link') {
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">Bill Gửi Hàng <span style="color:#dc2626">*</span></label><input id="shBillLink" style="${fStyle}" placeholder="https://...">`;
    } else if (g === 'bill_and_phone') {
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">SĐT Nhà Xe <span style="color:#dc2626">*</span></label><input id="shCarrierPhone" style="${fStyle}" placeholder="0909...">
        <div style="margin-top:8px;"><label style="font-size:12px;font-weight:700;color:#374151;">Bill Gửi Hàng <span style="color:#dc2626">*</span></label><input id="shBillLink" style="${fStyle}" placeholder="https://..."></div>`;
    } else if (g === 'receiver_name') {
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">Tên Người Nhận Hàng <span style="color:#dc2626">*</span></label><input id="shReceiverName" style="${fStyle}" placeholder="Nhập tên người nhận...">`;
    }
    el.innerHTML = h;
}

function _shToggle(type, val) {
    if (!window._shModalState) return;
    window._shModalState[type] = val;
    const containerId = type === 'payer' ? 'shPayerBtns' : 'shMethodBtns';
    document.querySelectorAll(`#${containerId} button`).forEach(b => {
        const active = b.dataset.val === val;
        b.style.background = active ? '#122546' : 'white';
        b.style.color = active ? 'white' : '#374151';
        b.style.borderColor = active ? '#122546' : '#e2e8f0';
    });
    _shUpdateFeeNote();
}

function _shUpdateFeeNote() {
    const s = window._shModalState; if (!s) return;
    const el = document.getElementById('shFeeNote'); if (!el) return;
    const fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    if (s.payer === 'hv' && s.method === 'ck' && fee > 0) {
        el.style.display = 'block';
        el.innerHTML = `💡 Ship sẽ CK vào STK công ty: <b>${(s.remaining - fee).toLocaleString('vi-VN')}đ</b> (đã trừ ${fee.toLocaleString('vi-VN')}đ ship)`;
    } else if (s.payer === 'hv' && s.method === 'tm') {
        el.style.display = 'block';
        el.innerHTML = '💡 Sẽ tự tạo <b>phiếu CHI tiền mặt</b> trong Sổ Thu Chi';
    } else { el.style.display = 'none'; }
}
function _shFmtFee() {
    const inp = document.getElementById('shFeeInput'); if (!inp) return;
    const raw = inp.value.replace(/\D/g, '');
    inp.value = raw ? Number(raw).toLocaleString('vi-VN') : '';
    _shUpdateFeeNote();
}

async function _shDoShip(id) {
    const s = window._shModalState; if (!s) return;
    const carrierId = document.getElementById('shCarrierSel')?.value;
    if (!carrierId) return alert('Vui lòng chọn Nhà Vận Chuyển');
    const carrierName = document.getElementById('shCarrierSel')?.options[document.getElementById('shCarrierSel').selectedIndex]?.dataset?.name || '';
    const g = _shGetCarrierGroup(carrierName);
    // Validate conditional fields
    const tracking = document.getElementById('shTrackingCode')?.value?.trim();
    const bill = document.getElementById('shBillLink')?.value?.trim();
    const phone = document.getElementById('shCarrierPhone')?.value?.trim();
    const receiver = document.getElementById('shReceiverName')?.value?.trim();
    if (g === 'tracking_code' && !tracking) return alert('Vui lòng nhập Mã Vận Đơn');
    if (g === 'bill_link' && !bill) return alert('Vui lòng nhập Bill Gửi Hàng');
    if (g === 'bill_and_phone') { if (!phone) return alert('Vui lòng nhập SĐT Nhà Xe'); if (!bill) return alert('Vui lòng nhập Bill Gửi Hàng'); }
    if (g === 'receiver_name' && !receiver) return alert('Vui lòng nhập Tên Người Nhận');
    // Validate fee
    const feeRaw = (document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'');
    if (!feeRaw) return alert('Vui lòng nhập Phí Gửi Hàng');
    if (!s.payer) return alert('Vui lòng chọn Người trả');
    if (!s.method) return alert('Vui lòng chọn Hình thức trả');
    // Submit
    try {
        const body = {
            actual_carrier_id: Number(carrierId),
            shipping_fee: Number(feeRaw),
            shipping_fee_payer: s.payer,
            shipping_fee_method: s.method
        };
        if (tracking) body.tracking_code = tracking;
        if (bill) body.shipping_bill_link = bill;
        if (phone) body.carrier_phone = phone;
        if (receiver) body.receiver_name = receiver;
        const r = await apiCall(`/api/shipping/orders/${id}/ship`, 'POST', body);
        if (r.error) { alert(r.error); return; }
        showToast(r.message || '✅ Đã gửi');
        document.getElementById('shShipModal')?.remove();
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
