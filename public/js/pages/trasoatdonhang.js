// ========== TRA SOÁT ĐƠN HÀNG — Desktop Page ==========
var _ts = { page: 1, search: '', month: '', year: '', current_step: '', debounce: null, expandedId: null };

function renderTrasoatdonhangPage(content) {
    const now = new Date();
    const curMonth = now.getMonth() + 1, curYear = now.getFullYear();
    _ts = { page: 1, search: '', month: '', year: '', current_step: '', debounce: null, expandedId: null };

    let monthOpts = '<option value="">Tất cả thời gian</option>';
    monthOpts += '<option value="Q1">Quý 1 (Tháng 1-3)</option>';
    monthOpts += '<option value="Q2">Quý 2 (Tháng 4-6)</option>';
    monthOpts += '<option value="Q3">Quý 3 (Tháng 7-9)</option>';
    monthOpts += '<option value="Q4">Quý 4 (Tháng 10-12)</option>';
    for (let m = 1; m <= 12; m++) monthOpts += `<option value="${m}" ${m===curMonth?'selected':''}>${'Tháng '+m}</option>`;
    let yearOpts = '<option value="">Tất cả các năm</option>';
    for (let y = curYear; y >= curYear - 3; y--) yearOpts += `<option value="${y}" ${y===curYear?'selected':''}>${y}</option>`;

    content.innerHTML = `
    <style>
        .ts-wrap{font-family:Inter,system-ui,sans-serif}
        .ts-search-bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;align-items:center}
        .ts-search-input{flex:1;min-width:240px;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;font-weight:600;outline:none;transition:border .2s}
        .ts-search-input:focus{border-color:#6366f1}
        .ts-select{padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:600;background:white;cursor:pointer;min-width:120px}
        .ts-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .ts-card{padding:18px;border-radius:14px;text-align:center;border:1px solid #e5e7eb;cursor:pointer;transition:all .2s}
        .ts-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
        .ts-card .num{font-size:28px;font-weight:900;line-height:1.2}
        .ts-card .lbl{font-size:11px;font-weight:700;margin-top:4px;opacity:.7}
        .ts-card .pct{font-size:12px;font-weight:800;margin-top:2px}
        .ts-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
        .ts-table th{background:#f8fafc;padding:10px 12px;text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #e2e8f0;position:sticky;top:0;z-index:1}
        .ts-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
        .ts-table tr:hover td{background:#f8fafc}
        .ts-table tr{cursor:pointer;transition:background .15s}
        .ts-progress{width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}
        .ts-progress-bar{height:100%;border-radius:4px;transition:width .4s}
        .ts-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800}
        .ts-badge-early{background:#d1fae5;color:#065f46}
        .ts-badge-on_time{background:#e0e7ff;color:#3730a3}
        .ts-badge-late{background:#fee2e2;color:#991b1b}
        .ts-badge-pending{background:#f3f4f6;color:#374151}
        .ts-badge-repair{background:#fef3c7;color:#92400e;margin-left:4px}
        .ts-badge-pet{background:#ede9fe;color:#5b21b6;margin-left:4px}
        .ts-prio{display:inline-block;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;text-align:center;box-shadow:0 0 6px rgba(0,0,0,0.05);animation:tsPrioBlink 1.5s infinite ease-in-out}
        .ts-prio-gap{background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;box-shadow:0 0 8px rgba(220,38,38,0.2)}
        .ts-prio-gui{background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;box-shadow:0 0 8px rgba(3,105,161,0.2)}
        .ts-prio-chuan{background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;box-shadow:0 0 8px rgba(126,34,206,0.2)}
        @keyframes tsPrioBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.96)}}
        .ts-detail{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:8px 12px 16px;padding:20px;animation:tsSlide .25s ease}
        @keyframes tsSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .ts-timeline{display:flex;gap:0;align-items:flex-start;flex-wrap:wrap;margin:16px 0}
        .ts-step{flex:1;min-width:100px;text-align:center;position:relative;padding:0 8px}
        .ts-step-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:16px;font-weight:800;border:3px solid #e5e7eb}
        .ts-step-icon.done{background:#10b981;border-color:#10b981;color:white}
        .ts-step-icon.active{background:#f59e0b;border-color:#f59e0b;color:white;animation:tsPulse 1.5s infinite}
        .ts-step-icon.pending{background:white;border-color:#d1d5db;color:#9ca3af}
        @keyframes tsPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4)}50%{box-shadow:0 0 0 8px rgba(245,158,11,0)}}
        .ts-step-name{font-size:11px;font-weight:700;color:#374151}
        .ts-step-time{font-size:10px;color:#6b7280;margin-top:2px}
        .ts-step-line{position:absolute;top:18px;left:calc(50% + 18px);right:calc(-50% + 18px);height:3px;background:#e5e7eb}
        .ts-step-line.done{background:#10b981}
        .ts-ship-info{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0}
        .ts-ship-item{font-size:12px;color:#475569}.ts-ship-item b{color:#1e1b4b}
        .ts-pager{display:flex;justify-content:center;gap:8px;margin-top:20px}
        .ts-pager button{padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;cursor:pointer;font-size:13px}
        .ts-pager button:disabled{opacity:.4;cursor:default}
        .ts-pager button.active{background:#4338ca;color:white;border-color:#4338ca}
        .ts-chart-wrap{margin-bottom:28px;background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}
        .ts-chart-header{padding:16px 20px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
        .ts-chart-header h3{margin:0;font-size:15px;font-weight:800}
        .ts-chart-body{display:grid;grid-template-columns:280px 1fr;gap:0;min-height:480px}
        .ts-donut-wrap{padding:20px 16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;border-right:1px solid #e5e7eb}
        .ts-bar-wrap{padding:20px;display:flex;align-items:center;justify-content:center}
        @media(max-width:900px){.ts-cards{grid-template-columns:repeat(2,1fr)}.ts-chart-body{grid-template-columns:1fr}.ts-pipeline-cards{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:600px){.ts-cards{grid-template-columns:1fr 1fr}.ts-search-bar{flex-direction:column}.ts-table th:nth-child(n+4),.ts-table td:nth-child(n+4){display:none}.ts-pipeline-cards{grid-template-columns:repeat(2,1fr)}}
        .ts-pipeline-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:24px}
        .ts-card.active{border:2.5px solid #4f46e5 !important;transform:translateY(-2px);box-shadow:0 8px 16px rgba(79,70,229,0.2)}
    </style>
    <div class="ts-wrap">
        <div class="ts-chart-wrap" id="tsChartWrap"></div>
        <div class="ts-search-bar">
            <input class="ts-search-input" id="tsSearch" placeholder="🔍 Tìm mã đơn, tên KH, SĐT..." autocomplete="off">
            <select class="ts-select" id="tsMonth" onchange="_tsFilter()">${monthOpts}</select>
            <select class="ts-select" id="tsYear" onchange="_tsFilter()">${yearOpts}</select>
            <select class="ts-select" id="tsStatus" onchange="_tsFilter()">
                <option value="">Tất cả</option><option value="early">🟢 Sớm</option><option value="on_time">🟡 Đúng</option><option value="late">🔴 Trễ</option>
            </select>
        </div>
        <div class="ts-cards" id="tsCards"><div style="grid-column:1/-1;text-align:center;padding:20px;color:#9ca3af">⏳ Đang tải...</div></div>
        <div class="ts-pipeline-cards" id="tsPipelineCards"></div>
        <div id="tsTableWrap"></div>
    </div>`;

    _ts.month = String(curMonth); _ts.year = String(curYear);
    document.getElementById('tsSearch').addEventListener('input', e => {
        const val = e.target.value;
        if (val.trim()) {
            _ts.month = '';
            _ts.year = '';
            const monthEl = document.getElementById('tsMonth');
            const yearEl = document.getElementById('tsYear');
            if (monthEl) monthEl.value = '';
            if (yearEl) yearEl.value = '';
        }
        clearTimeout(_ts.debounce);
        _ts.debounce = setTimeout(() => { 
            _ts.search = val; 
            _ts.page = 1; 
            _tsLoad(); 
            _tsLoadStats();
        }, 400);
    });
    _tsLoad();
    _tsLoadStats();
}

async function _tsLoad() {
    const p = new URLSearchParams({ page: _ts.page, limit: 50 });
    if (_ts.search) p.set('search', _ts.search);
    if (_ts.month) p.set('month', _ts.month);
    if (_ts.year) p.set('year', _ts.year);
    if (_ts.current_step) p.set('current_step', _ts.current_step);
    const statusEl = document.getElementById('tsStatus');
    if (statusEl && statusEl.value) p.set('status', statusEl.value);

    try {
        const res = await apiCall('/api/trasoat/orders?' + p.toString());
        _tsRenderTable(res.orders || [], res.totalCount || 0);
    } catch (e) {
        document.getElementById('tsTableWrap').innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444">❌ Lỗi tải dữ liệu</div>';
    }
}

function _tsFilter() {
    _ts.month = document.getElementById('tsMonth').value;
    _ts.year = document.getElementById('tsYear').value;
    _ts.current_step = ''; // Clear pipeline filter when normal filter is used
    _ts.page = 1; _ts.expandedId = null;
    _tsLoad(); _tsLoadStats();
}

function _tsSelectPipelineStep(stepName) {
    _ts.current_step = stepName;
    _ts.month = '';
    _ts.year = '';
    document.getElementById('tsMonth').value = '';
    document.getElementById('tsYear').value = '';
    document.getElementById('tsStatus').value = '';
    _ts.page = 1; _ts.expandedId = null;
    _tsLoad(); _tsLoadStats();
}

function _tsRenderTable(orders, totalCount) {
    if (!orders.length) {
        document.getElementById('tsTableWrap').innerHTML = '<div style="text-align:center;padding:50px;color:#9ca3af"><div style="font-size:48px;margin-bottom:12px">📭</div><div style="font-weight:700">Không tìm thấy đơn hàng nào</div></div>';
        return;
    }
    const formatExpectedShipDate = (dateVal, priority, standardDeliveryTime) => {
        if (!dateVal) return '-';
        const dt = new Date(dateVal);
        const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const day = localDt.getDate();
        const month = localDt.getMonth() + 1;

        const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = daysOfWeek[localDt.getDay()];

        const pri = (priority || 'CHUẨN').toUpperCase();
        if (pri === 'GẤP' || pri === 'GỬI') {
            return `${dayName} - ${day}/${month}`;
        } else {
            let timePart = '';
            if (standardDeliveryTime) {
                timePart = standardDeliveryTime.trim();
            } else {
                const hrs = String(localDt.getHours()).padStart(2, '0');
                const mins = String(localDt.getMinutes()).padStart(2, '0');
                timePart = `${hrs}:${mins}`;
            }
            return `${dayName} - ${timePart} ${day}/${month}`;
        }
    };

    let html = `<table class="ts-table"><thead><tr>
        <th>#</th><th>Mã Đơn</th><th>Khách Hàng</th><th>Tiêu Chuẩn</th><th>Ngày Gửi DK</th><th>Tiến Độ</th><th>Giai Đoạn</th><th>Chênh Lệch</th>
    </tr></thead><tbody>`;

    orders.forEach((o, i) => {
        const pColor = o.progress_percent === 100 ? '#10b981' : o.progress_percent >= 50 ? '#f59e0b' : '#6366f1';
        const badges = (o.is_repair ? '<span class="ts-badge ts-badge-repair">ĐƠN SỬA</span>' : '') +
                       (o.is_pet_tem ? '<span class="ts-badge ts-badge-pet">PET/TEM</span>' : '');
        const priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
        let priClass = 'ts-prio-chuan';
        if (priority === 'GẤP') priClass = 'ts-prio-gap';
        else if (priority === 'GỬI') priClass = 'ts-prio-gui';

        html += `<tr onclick="_tsToggleDetail(${o.id})" id="tsRow${o.id}">
            <td style="color:#9ca3af;font-weight:600">${(_ts.page-1)*50+i+1}</td>
            <td>
                <span style="color:#4338ca;font-weight:800">${o.order_code}</span>${badges}
                ${o.created_by_name ? `<div style="font-size:11px;color:#e65100;font-weight:700;margin-top:2px">👤 Sale: ${o.created_by_name}</div>` : ''}
            </td>
            <td><div style="font-weight:600">${o.customer_name||'-'}</div><div style="font-size:11px;color:#6b7280">${o.customer_phone||''}</div></td>
            <td><span class="ts-prio ${priClass}">${priority}</span></td>
            <td style="font-weight:600">${formatExpectedShipDate(o.expected_ship_date, o.shipping_priority, o.standard_delivery_time)}</td>
            <td style="min-width:120px"><div class="ts-progress"><div class="ts-progress-bar" style="width:${o.progress_percent}%;background:${pColor}"></div></div><div style="font-size:10px;font-weight:700;color:${pColor};margin-top:2px">${o.done_steps}/${o.total_steps} (${o.progress_percent}%)</div></td>
            <td><span style="font-weight:700;font-size:12px">${o.current_step_name}</span></td>
            <td><span class="ts-badge ts-badge-${o.deviation_class}">${o.deviation_label}</span></td>
        </tr>`;
        if (_ts.expandedId === o.id) {
            html += `<tr id="tsDetailRow${o.id}"><td colspan="8" style="padding:0"><div class="ts-detail" id="tsDetail${o.id}"><div style="text-align:center;color:#9ca3af">⏳ Đang tải...</div></div></td></tr>`;
            setTimeout(async () => {
                try {
                    const res = await apiCall('/api/trasoat/orders/' + o.id + '/detail');
                    const el = document.getElementById('tsDetail' + o.id);
                    if (el) el.innerHTML = _tsRenderTimeline(res);
                } catch (e) {
                    const el = document.getElementById('tsDetail' + o.id);
                    if (el) el.innerHTML = '<div style="color:#ef4444">❌ Lỗi tải chi tiết</div>';
                }
            }, 0);
        }
    });
    html += '</tbody></table>';

    // Pager
    const totalPages = Math.ceil(totalCount / 50);
    if (totalPages > 1) {
        html += '<div class="ts-pager">';
        html += `<button onclick="_tsPage(${_ts.page-1})" ${_ts.page<=1?'disabled':''}>← Trước</button>`;
        html += `<span style="padding:8px 12px;font-weight:700;color:#4338ca">Trang ${_ts.page}/${totalPages}</span>`;
        html += `<button onclick="_tsPage(${_ts.page+1})" ${_ts.page>=totalPages?'disabled':''}>Sau →</button>`;
        html += '</div>';
    }
    document.getElementById('tsTableWrap').innerHTML = html;
}

function _tsPage(p) { _ts.page = p; _ts.expandedId = null; _tsLoad(); }

async function _tsToggleDetail(id) {
    const existingDetailRow = document.getElementById('tsDetailRow' + id);
    if (existingDetailRow) {
        existingDetailRow.remove();
        _ts.expandedId = null;
        return;
    }

    if (_ts.expandedId !== null) {
        const prevDetailRow = document.getElementById('tsDetailRow' + _ts.expandedId);
        if (prevDetailRow) prevDetailRow.remove();
    }

    _ts.expandedId = id;

    const clickedRow = document.getElementById('tsRow' + id);
    if (!clickedRow) return;

    const detailRow = document.createElement('tr');
    detailRow.id = 'tsDetailRow' + id;
    detailRow.innerHTML = `<td colspan="8" style="padding:0"><div class="ts-detail" id="tsDetail${id}"><div style="text-align:center;color:#9ca3af">⏳ Đang tải...</div></div></td>`;
    clickedRow.parentNode.insertBefore(detailRow, clickedRow.nextSibling);

    try {
        const res = await apiCall('/api/trasoat/orders/' + id + '/detail');
        const el = document.getElementById('tsDetail' + id);
        if (el) {
            el.innerHTML = _tsRenderTimeline(res);
        }
    } catch (e) {
        const el = document.getElementById('tsDetail' + id);
        if (el) el.innerHTML = '<div style="color:#ef4444">❌ Lỗi tải chi tiết</div>';
    }
}

function _tsRenderTimeline(res) {
    const { order: o, timeline } = res;
    const fmtDT = d => { if (!d) return ''; const dt = new Date(d); return dt.toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }); };

    let html = '<div style="font-weight:800;font-size:14px;color:#1e1b4b;margin-bottom:12px">📋 ' + o.order_code + ' — ' + (o.customer_name||'') + '</div>';
    html += '<div class="ts-timeline">';
    timeline.forEach((s, i) => {
        const cls = s.done ? 'done' : (i > 0 && timeline[i-1].done && !s.done) ? 'active' : (i === 0 && !s.done) ? 'active' : 'pending';
        const icon = s.done ? '✓' : cls === 'active' ? '⏳' : (i+1);
        const lineCls = s.done ? 'done' : '';
        html += `<div class="ts-step">`;
        if (i < timeline.length - 1) html += `<div class="ts-step-line ${lineCls}"></div>`;
        html += `<div class="ts-step-icon ${cls}" onclick="event.stopPropagation();_tsOpenStepModal(${o.id},'${s.name}')" style="cursor:pointer" title="Xem báo cáo ${s.name}">${icon}</div>
            <div class="ts-step-name">${s.short || s.name}</div>
            ${s.progress ? `<div style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:800;margin:2px 0;background:${s.done ? '#d1fae5':'#fef3c7'};color:${s.done ? '#065f46':'#b45309'}">${s.progress} xong</div>` : ''}
            <div class="ts-step-time">${s.time ? fmtDT(s.time) : ''}</div>
            <div class="ts-step-time">${s.worker || ''}</div>
            ${s.extra ? `<div style="font-size:9px;font-weight:700;color:#7c3aed;margin-top:2px">${s.extra}</div>` : ''}
        </div>`;
    });
    html += '</div>';

    // Shipping info
    if (o.shipping_status === 'shipped') {
        html += '<div class="ts-ship-info">';
        html += `<div class="ts-ship-item">🚛 <b>NVC:</b> ${o.carrier_name||'-'}</div>`;
        html += `<div class="ts-ship-item">📦 <b>Mã vận đơn:</b> ${o.tracking_code||'-'}</div>`;
        html += `<div class="ts-ship-item">📱 <b>SĐT NX:</b> ${o.carrier_phone||'-'}</div>`;
        html += `<div class="ts-ship-item">📅 <b>Ngày gửi:</b> ${fmtDT(o.shipped_at)}</div>`;
        if (o.tracking_code && o.carrier_tracking_url) {
            const url = o.carrier_tracking_url.replace('{code}', o.tracking_code);
            html += `<div class="ts-ship-item">🔗 <a href="${url}" target="_blank" style="color:#4338ca;font-weight:700">Tra cứu vận đơn</a></div>`;
        }
        html += '</div>';
    }
    return html;
}

async function _tsLoadStats() {
    const y = _ts.year || new Date().getFullYear();
    const m = _ts.month || '';
    try {
        const s = await apiCall(`/api/trasoat/stats?year=${y}&month=${m}`);
        const activeStep = _ts.current_step || '';
        const activeStatus = document.getElementById('tsStatus')?.value || '';

        // Status cards (top row)
        const isAllActive = !activeStep && !activeStatus ? 'active' : '';
        const isEarlyActive = !activeStep && activeStatus === 'early' ? 'active' : '';
        const isOnTimeActive = !activeStep && activeStatus === 'on_time' ? 'active' : '';
        const isLateActive = !activeStep && activeStatus === 'late' ? 'active' : '';

        document.getElementById('tsCards').innerHTML = `
            <div class="ts-card ${isAllActive}" style="background:linear-gradient(135deg,#fffbeb,#fde68a);border-color:#fcd34d" onclick="document.getElementById('tsStatus').value='';_tsFilter()">
                <div class="num" style="color:#b45309">${s.total}</div>
                <div class="lbl" style="color:#b45309">TỔNG ĐƠN</div>
                <div class="pct" style="color:#b45309">100%</div>
            </div>
            <div class="ts-card ${isEarlyActive}" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7)" onclick="document.getElementById('tsStatus').value='early';_tsFilter()">
                <div class="num" style="color:#166534">${s.early}</div>
                <div class="lbl">SỚM HƠN</div>
                <div class="pct" style="color:#16a34a">${s.early_pct}%</div>
            </div>
            <div class="ts-card ${isOnTimeActive}" style="background:linear-gradient(135deg,#eef2ff,#e0e7ff)" onclick="document.getElementById('tsStatus').value='on_time';_tsFilter()">
                <div class="num" style="color:#3730a3">${s.on_time}</div>
                <div class="lbl">ĐÚNG LỊCH</div>
                <div class="pct" style="color:#4f46e5">${s.on_time_pct}%</div>
            </div>
            <div class="ts-card ${isLateActive}" style="background:linear-gradient(135deg,#fef2f2,#fee2e2)" onclick="document.getElementById('tsStatus').value='late';_tsFilter()">
                <div class="num" style="color:#991b1b">${s.late}</div>
                <div class="lbl">TRỄ LỊCH</div>
                <div class="pct" style="color:#dc2626">${s.late_pct}%</div>
            </div>`;

        // Pipeline cards (bottom row)
        const b = s.backlog || { cho_cat: 0, cho_in: 0, cho_ep: 0, dang_may_qc_ht: 0, cho_gui: 0 };
        const isCutActive = activeStep === 'Chờ Cắt' ? 'active' : '';
        const isInActive = activeStep === 'Chờ In' ? 'active' : '';
        const isEpActive = activeStep === 'Chờ Ép' ? 'active' : '';
        const isMayActive = activeStep === 'Đang May / QC / HT' ? 'active' : '';
        const isGuiActive = activeStep === 'Chờ Gửi' ? 'active' : '';

        document.getElementById('tsPipelineCards').innerHTML = `
            <div class="ts-card ${isCutActive}" style="background:linear-gradient(135deg,#f1f5f9,#cbd5e1);border-color:#94a3b8" onclick="_tsSelectPipelineStep('Chờ Cắt')">
                <div class="num" style="color:#1e293b">${b.cho_cat}</div>
                <div class="lbl" style="color:#334155">CHƯA CẮT</div>
            </div>
            <div class="ts-card ${isInActive}" style="background:linear-gradient(135deg,#ffedd5,#fed7aa);border-color:#f97316" onclick="_tsSelectPipelineStep('Chờ In')">
                <div class="num" style="color:#ea580c">${b.cho_in}</div>
                <div class="lbl" style="color:#c2410c">CHƯA IN</div>
            </div>
            <div class="ts-card ${isEpActive}" style="background:linear-gradient(135deg,#faf5ff,#f3e8ff);border-color:#c084fc" onclick="_tsSelectPipelineStep('Chờ Ép')">
                <div class="num" style="color:#7e22ce">${b.cho_ep}</div>
                <div class="lbl" style="color:#6b21a8">CHƯA ÉP</div>
            </div>
            <div class="ts-card ${isMayActive}" style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border-color:#2dd4bf" onclick="_tsSelectPipelineStep('Đang May / QC / HT')">
                <div class="num" style="color:#0f766e">${b.dang_may_qc_ht}</div>
                <div class="lbl" style="color:#0d9488">CHƯA MAY/QC/HT</div>
            </div>
            <div class="ts-card ${isGuiActive}" style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-color:#38bdf8" onclick="_tsSelectPipelineStep('Chờ Gửi')">
                <div class="num" style="color:#0369a1">${b.cho_gui}</div>
                <div class="lbl" style="color:#0284c7">CHƯA GỬI</div>
            </div>`;

        _tsRenderCharts(s);
    } catch (e) { console.error('Stats error:', e); }
}

function _tsSelectQuarter(key) {
    const tsMonth = document.getElementById('tsMonth');
    if (!tsMonth) return;
    tsMonth.value = key === 'ALL' ? '' : key;
    _tsFilter();
}

function _tsRenderCharts(s) {
    const wrap = document.getElementById('tsChartWrap');
    if (!wrap) return;

    // Compute quarters
    const quarters = [
        { name: 'Quý 1', key: 'Q1', early: 0, on_time: 0, late: 0, total: 0 },
        { name: 'Quý 2', key: 'Q2', early: 0, on_time: 0, late: 0, total: 0 },
        { name: 'Quý 3', key: 'Q3', early: 0, on_time: 0, late: 0, total: 0 },
        { name: 'Quý 4', key: 'Q4', early: 0, on_time: 0, late: 0, total: 0 },
        { name: 'Cả Năm', key: 'ALL', early: 0, on_time: 0, late: 0, total: 0 }
    ];

    (s.months || []).forEach((m, idx) => {
        let qIdx = 0;
        if (idx < 3) qIdx = 0;
        else if (idx < 6) qIdx = 1;
        else if (idx < 9) qIdx = 2;
        else qIdx = 3;

        quarters[qIdx].early += m.early;
        quarters[qIdx].on_time += m.on_time;
        quarters[qIdx].late += m.late;
        quarters[qIdx].total += m.total;

        quarters[4].early += m.early;
        quarters[4].on_time += m.on_time;
        quarters[4].late += m.late;
        quarters[4].total += m.total;
    });

    const tableRows = quarters.map(q => {
        const isAll = q.key === 'ALL';
        const rowBg = isAll ? '#f8fafc' : 'transparent';
        const rowStyle = isAll 
            ? `font-weight: 800; border-top: 2px solid #cbd5e1; background-color: ${rowBg}; cursor: pointer; transition: background 0.15s;`
            : `border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;`;
        
        const totalCellBg = isAll ? '#fef3c7' : '#fffbeb';
        const totalCellColor = isAll ? '#92400e' : '#b45309';

        return `
            <tr style="${rowStyle}" onclick="_tsSelectQuarter('${q.key}')" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${rowBg}'">
                <td style="padding: 6px 4px; font-weight: 600; text-align: left; color: ${isAll?'#1e1b4b':'#475569'}">${q.name}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 800; color: ${totalCellColor}; background-color: ${totalCellBg}">${q.total}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: #10b981">${q.early}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: #6366f1">${q.on_time}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: #ef4444">${q.late}</td>
            </tr>
        `;
    }).join('');

    const navHtml = `<div class="ts-chart-header"><h3>📊 Thống Kê Tiến Độ Giao Hàng — ${s.year}</h3>
        <div style="display:flex;gap:6px;align-items:center">
            <button onclick="_tsChartYear(-1)" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:white;cursor:pointer;font-weight:800">‹</button>
            <span id="tsChartYear" style="font-weight:800;min-width:40px;text-align:center">${s.year}</span>
            <button onclick="_tsChartYear(1)" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:white;cursor:pointer;font-weight:800">›</button>
        </div></div>`;

    wrap.innerHTML = navHtml + `<div class="ts-chart-body">
        <div class="ts-donut-wrap">
            <canvas id="tsDonutCanvas" width="220" height="220"></canvas>
            <div style="margin-top:8px;font-size:12px;text-align:center;display:flex;gap:12px;justify-content:center;">
                <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:4px"></span>Sớm ${s.early_pct}%</div>
                <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6366f1;margin-right:4px"></span>Đúng ${s.on_time_pct}%</div>
                <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:4px"></span>Trễ ${s.late_pct}%</div>
            </div>
            
            <div style="margin-top:16px; width: 100%;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="color: #64748b; font-weight: 600; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 4px; text-align: left;">Kỳ</th>
                            <th style="padding: 4px; background-color: #b45309; color: #ffffff; text-align: center;">Tổng</th>
                            <th style="padding: 4px; color: #4ade80; text-align: center;">Sớm</th>
                            <th style="padding: 4px; color: #38bdf8; text-align: center;">Đúng</th>
                            <th style="padding: 4px; color: #f87171; text-align: center;">Trễ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="ts-bar-wrap" style="flex: 1;"><canvas id="tsBarCanvas" height="340"></canvas></div>
    </div>`;

    _tsDrawDonut(s);
    _tsDrawBar(s);
}

function _tsDrawDonut(s) {
    const c = document.getElementById('tsDonutCanvas'); if (!c) return;
    const ctx = c.getContext('2d'), cx = 110, cy = 100, r = 80, lw = 28;
    const data = [s.early, s.on_time, s.late], colors = ['#10b981','#6366f1','#ef4444'];
    const total = data.reduce((a,b)=>a+b,0) || 1;
    let startAngle = -Math.PI/2;
    ctx.clearRect(0,0,c.width,c.height);
    data.forEach((v,i) => {
        const sweep = (v/total)*2*Math.PI;
        ctx.beginPath(); ctx.arc(cx,cy,r,startAngle,startAngle+sweep); ctx.lineWidth=lw; ctx.strokeStyle=colors[i]; ctx.stroke();
        startAngle += sweep;
    });
    ctx.fillStyle='#1e1b4b'; ctx.font='bold 24px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(s.total, cx, cy-8);
    ctx.font='bold 11px Inter,sans-serif'; ctx.fillStyle='#64748b'; ctx.fillText('đơn hàng', cx, cy+14);

    // Click handler for donut segments
    c.onclick = function(e) {
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Check if inside the donut ring width
        if (dist >= r - lw/2 - 8 && dist <= r + lw/2 + 8) {
            let angle = Math.atan2(dy, dx);
            let norm = angle + Math.PI/2;
            if (norm < 0) norm += 2 * Math.PI;

            let cur = 0;
            const keys = ['early', 'on_time', 'late'];
            for (let i = 0; i < data.length; i++) {
                const sweep = (data[i] / total) * 2 * Math.PI;
                if (norm >= cur && norm <= cur + sweep) {
                    const statusSelect = document.getElementById('tsStatus');
                    if (statusSelect) {
                        statusSelect.value = keys[i];
                        _tsFilter();
                    }
                    break;
                }
                cur += sweep;
            }
        }
    };

    // Hover effect
    c.onmousemove = function(e) {
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        c.style.cursor = (dist >= r - lw/2 - 8 && dist <= r + lw/2 + 8) ? 'pointer' : 'default';
    };
}

function _tsDrawBar(s) {
    const c = document.getElementById('tsBarCanvas'); if (!c) return;
    const ctx = c.getContext('2d');
    c.width = c.parentElement.clientWidth - 40;
    const W = c.width, H = c.height, pad = {t:20,r:20,b:40,l:40};
    const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;
    const months = s.months || [];
    const maxV = Math.max(...months.map(m => m.total), 1);
    const bW = Math.min(cW/12 - 8, 36);

    ctx.clearRect(0,0,W,H);
    // Grid
    ctx.strokeStyle='#f1f5f9'; ctx.lineWidth=1;
    for (let i=0;i<=4;i++){const y=pad.t+cH*(1-i/4);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
    ctx.fillStyle='#94a3b8';ctx.font='11px Inter,sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(maxV*i/4),pad.l-6,y+4);}

    months.forEach((m,i) => {
        const x = pad.l + (i+0.5)*cW/12 - bW/2;
        const parts = [{v:m.early,c:'#10b981'},{v:m.on_time,c:'#6366f1'},{v:m.late,c:'#ef4444'}];
        let cumY = 0;
        parts.forEach(p => {
            const h = (p.v/maxV)*cH;
            ctx.fillStyle = p.c;
            const ry = pad.t + cH - cumY - h;
            ctx.beginPath(); ctx.roundRect(x, ry, bW, h, 3); ctx.fill();
            cumY += h;
        });
        ctx.fillStyle='#64748b'; ctx.font='bold 11px Inter,sans-serif'; ctx.textAlign='center';
        ctx.fillText('T'+m.month, x+bW/2, H-pad.b+16);
        if (m.total > 0) { ctx.fillStyle='#1e1b4b'; ctx.font='bold 10px Inter,sans-serif'; ctx.fillText(m.total, x+bW/2, pad.t+cH-cumY-4); }
    });

    // Click handler for monthly bars
    c.onclick = function(e) {
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        for (let i = 0; i < months.length; i++) {
            const m = months[i];
            const x = pad.l + (i+0.5)*cW/12 - bW/2;

            if (clickX >= x - 2 && clickX <= x + bW + 2) {
                let cumY = 0;
                const parts = [
                    { v: m.early, key: 'early' },
                    { v: m.on_time, key: 'on_time' },
                    { v: m.late, key: 'late' }
                ];

                for (let j = 0; j < parts.length; j++) {
                    const p = parts[j];
                    const h = (p.v / maxV) * cH;
                    const ry = pad.t + cH - cumY - h;

                    if (clickY >= ry - 2 && clickY <= ry + h + 2 && p.v > 0) {
                        const tsMonth = document.getElementById('tsMonth');
                        const tsStatus = document.getElementById('tsStatus');
                        if (tsMonth && tsStatus) {
                            tsMonth.value = m.month;
                            tsStatus.value = p.key;
                            _tsFilter();
                        }
                        return;
                    }
                    cumY += h;
                }

                // If click is not inside a specific colored segment, filter by the entire month
                const tsMonth = document.getElementById('tsMonth');
                if (tsMonth) {
                    tsMonth.value = m.month;
                    _tsFilter();
                }
                return;
            }
        }
    };

    // Hover handler for monthly bars
    c.onmousemove = function(e) {
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        let hovered = false;
        for (let i = 0; i < months.length; i++) {
            const m = months[i];
            const x = pad.l + (i+0.5)*cW/12 - bW/2;

            if (clickX >= x - 2 && clickX <= x + bW + 2) {
                let cumY = 0;
                const parts = [m.early, m.on_time, m.late];
                const totalH = (parts.reduce((a,b)=>a+b,0)/maxV)*cH;
                const ry = pad.t + cH - totalH;

                if (clickY >= ry - 2 && clickY <= pad.t + cH + 2) {
                    hovered = true;
                    break;
                }
            }
        }
        c.style.cursor = hovered ? 'pointer' : 'default';
    };
}

var _tsChartYearVal;
async function _tsChartYear(delta) {
    if (!_tsChartYearVal) _tsChartYearVal = Number(_ts.year) || new Date().getFullYear();
    _tsChartYearVal += delta;
    document.getElementById('tsChartYear').textContent = _tsChartYearVal;
    try { const s = await apiCall('/api/trasoat/stats?year='+_tsChartYearVal); _tsDrawDonut(s); _tsDrawBar(s); } catch(e){}
}
