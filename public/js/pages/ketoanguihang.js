// ========== ĐƠN HÀNG KẾ TOÁN GỬI ==========
let _shFilter = 'today';
let _shOrders = [];
let _shCounts = {};
let _shCarriers = [];
let _shSearchVal = '';
let _shCskhVal = '';
let _shSearched = [];
let _shPage = 1;
const _SH_PER_PAGE = 100;

async function renderKetoanguihangPage(container) {
    _shFilter = 'today'; _shSearchVal = ''; _shCskhVal = ''; _shPage = 1;
    container.innerHTML = `<div style="max-width:1600px;margin:0 auto;padding:16px;">
        <h2 style="margin:0 0 16px;font-size:22px;color:#122546;font-weight:800;">📤 Đơn Hàng Kế Toán Gửi</h2>
        <div style="display:flex;gap:16px;align-items:flex-start;">
            <div id="shSidebar" style="width:220px;flex-shrink:0;"></div>
            <div style="flex:1;min-width:0;">
                <div id="shSearchBar" style="margin-bottom:12px;"></div>
                <div id="shContent"></div>
            </div>
        </div>
    </div>`;
    try { const c = await apiCall('/api/shipping/carriers'); _shCarriers = c.carriers || []; } catch(e){}
    _shRenderSidebar();
    _shRenderSearchBar();
    _shLoadOrders();
}

// ===== SIDEBAR =====
function _shRenderSidebar() {
    const sb = document.getElementById('shSidebar');
    if (!sb) return;
    const filters = [
        { key:'early', icon:'🔵', label:'Gửi Sớm', color:'#3b82f6', bg:'#eff6ff' },
        { key:'today', icon:'🔴', label:'Hôm Nay Gửi', color:'#dc2626', bg:'#fef2f2' },
        { key:'rescheduled', icon:'🟡', label:'Chưa Gửi', color:'#d97706', bg:'#fffbeb' },
        { key:'shipped', icon:'✅', label:'Đã Gửi', color:'#059669', bg:'#ecfdf5' }
    ];
    // Build CSKH options from loaded data
    const cskhMap = {};
    _shOrders.forEach(o => { if (o.cskh_name && o.cskh_user_id) cskhMap[o.cskh_user_id] = o.cskh_name; });
    const cskhOpts = Object.entries(cskhMap).sort((a,b) => a[1].localeCompare(b[1]));

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
    }).join('') + `
    <div style="margin-top:12px;padding:10px 12px;border-radius:10px;border:2px solid #e2e8f0;background:white;">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">👤 CSKH</div>
        <select onchange="_shOnCskhChange(this.value)" style="width:100%;padding:7px 8px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:600;color:#334155;cursor:pointer;background:white;">
            <option value="">Tất cả</option>
            ${cskhOpts.map(([id,name]) => `<option value="${id}" ${_shCskhVal==String(id)?'selected':''}>${name}</option>`).join('')}
        </select>
    </div>
    ` + `${_shCounts.overdue > 0 ? `<div style="margin-top:10px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;"><div style="font-size:11px;font-weight:700;color:#dc2626;">⚠️ ${_shCounts.overdue} đơn quá hạn!</div><div style="font-size:10px;color:#991b1b;margin-top:2px;">Phạt 100.000đ/ngày nếu không gửi</div></div>` : ''}`;
}

function _shSetFilter(key) {
    _shFilter = key; _shSearchVal = ''; _shCskhVal = ''; _shPage = 1;
    const si = document.getElementById('shSearchInput'); if (si) si.value = '';
    _shRenderSidebar(); _shLoadOrders();
}
function _shOnCskhChange(val) {
    _shCskhVal = val; _shPage = 1; _shApplySearch(); _shRenderContent(); _shRenderSidebar();
}

// ===== SEARCH BAR =====
function _shRenderSearchBar() {
    const sb = document.getElementById('shSearchBar');
    if (!sb) return;
    sb.innerHTML = `<div style="display:flex;gap:8px;align-items:center;">
        <div style="flex:1;max-width:420px;position:relative;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;">🔍</span>
            <input type="text" id="shSearchInput" value="${_shSearchVal}" oninput="_shOnSearch(this.value)" placeholder="Tìm mã đơn hàng, SĐT, tên khách..." style="width:100%;padding:9px 12px 9px 36px;border:2px solid #fbbf24;border-radius:10px;font-size:13px;font-weight:600;background:#fffef5;outline:none;transition:border .2s;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#fbbf24'">
        </div>
    </div>`;
}
function _shOnSearch(val) {
    _shSearchVal = val; _shPage = 1; _shApplySearch(); _shRenderContent();
}

// ===== DATA PIPELINE =====
async function _shLoadOrders() {
    const el = document.getElementById('shContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';
    try {
        const data = await apiCall(`/api/shipping/orders?filter=${_shFilter}&page_type=ketoan`);
        _shOrders = data.orders || [];
        _shCounts = data.counts || {};
        _shRenderSidebar();
        _shApplySearch();
        _shRenderContent();
    } catch(e) {
        el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">Lỗi: ${e.message}</div>`;
    }
}

function _shApplySearch() {
    let list = _shOrders.slice();
    // CSKH filter
    if (_shCskhVal) list = list.filter(o => String(o.cskh_user_id) === _shCskhVal);
    // Search filter
    const q = (_shSearchVal || '').toLowerCase().trim();
    if (q) {
        list = list.filter(o => {
            return (o.order_code || '').toLowerCase().includes(q)
                || (o.customer_phone || '').toLowerCase().includes(q)
                || (o.customer_name || '').toLowerCase().includes(q);
        });
    }
    _shSearched = list;
}


// ===== PAGINATION =====
function _shPaginationHTML(total, page, perPage) {
    const totalPages = Math.ceil(total / perPage) || 1;
    if (totalPages <= 1) return '';
    const btns = [];
    btns.push(`<button onclick="_shGoPage(1)" ${page<=1?'disabled':''} style="${_shPgBtn(page>1)}">⏮</button>`);
    btns.push(`<button onclick="_shGoPage(${page-1})" ${page<=1?'disabled':''} style="${_shPgBtn(page>1)}">◀</button>`);
    btns.push(`<span style="font-size:12px;font-weight:700;color:#334155;padding:0 8px;">Trang ${page} / ${totalPages}</span>`);
    btns.push(`<button onclick="_shGoPage(${page+1})" ${page>=totalPages?'disabled':''} style="${_shPgBtn(page<totalPages)}">▶</button>`);
    btns.push(`<button onclick="_shGoPage(${totalPages})" ${page>=totalPages?'disabled':''} style="${_shPgBtn(page<totalPages)}">⏭</button>`);
    return `<div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:8px 0;">${btns.join('')}</div>`;
}
function _shPgBtn(enabled) {
    return `padding:5px 10px;border:1px solid ${enabled?'#122546':'#e2e8f0'};border-radius:6px;background:${enabled?'white':'#f1f5f9'};color:${enabled?'#122546':'#cbd5e1'};cursor:${enabled?'pointer':'not-allowed'};font-size:12px;font-weight:700;`;
}
function _shGoPage(p) {
    const totalPages = Math.ceil(_shSearched.length / _SH_PER_PAGE) || 1;
    _shPage = Math.max(1, Math.min(p, totalPages));
    _shRenderContent();
}

// ===== RENDER =====
function _shRenderContent() {
    const el = document.getElementById('shContent');
    if (!el) return;
    if (_shSearched.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px;"><div style="font-size:48px;margin-bottom:12px;">📭</div><div style="color:#9ca3af;font-size:14px;font-weight:600;">Không có đơn hàng nào</div></div>`;
        return;
    }
    const total = _shSearched.length;
    const totalPages = Math.ceil(total / _SH_PER_PAGE);
    if (_shPage > totalPages) _shPage = totalPages;
    const start = (_shPage - 1) * _SH_PER_PAGE;
    const pageOrders = _shSearched.slice(start, start + _SH_PER_PAGE);

    const pgHTML = _shPaginationHTML(total, _shPage, _SH_PER_PAGE);
    const countHTML = `<div style="font-size:11px;color:#64748b;font-weight:600;text-align:center;padding:4px 0;">Tổng: ${total} đơn${totalPages>1?` — Hiển thị ${start+1}-${Math.min(start+_SH_PER_PAGE,total)}`:''}</div>`;

    let html = pgHTML + countHTML;
    html += _shBuildTable(pageOrders);
    html += countHTML + pgHTML;
    el.innerHTML = html;
}

function _shBuildTable(orders) {
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const today = new Date().toISOString().split('T')[0];

    let html = `<div style="overflow-x:auto;border:2px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px;">
    <thead><tr style="background:linear-gradient(135deg,#122546,#1e3a5f);">
        ${['','','🔗','Gửi Dự Kiến','🚛 Ngày Gửi','Hẹn Lại','Tiến Độ','Mã Đơn','TC','KH','SĐT','CSKH','NVC DK','NVC TT','Mã VĐ','SĐT NX','Giờ Gửi','Lịch Sử'].map(h =>
            `<th style="padding:10px 8px;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;text-align:left;">${h}</th>`
        ).join('')}
    </tr></thead><tbody>`;

    for (const o of orders) {
        const overdue = o.is_overdue;
        const rowBg = overdue ? '#fef2f2' : '';
        const prioColors = { 'GỬI':'#3b82f6', 'GẤP':'#dc2626', 'CHUẨN':'#7c3aed' };
        const prioColor = prioColors[o.shipping_priority] || '#6b7280';
        const isKT = o.shipping_status !== 'shipped';

        // Check pending items and their completions
        const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
        const allPendingCompleted = pendingItems.every(item => item.all_done);

        let orderLevelAction = '';
        if (isKT && o.shipping_status !== 'shipped') {
            if (allPendingCompleted && pendingItems.length > 0) {
                // All pending items are done -> Show Gửi
                orderLevelAction = `
                    <button onclick="event.stopPropagation();_shShipOrder(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Xác nhận gửi">📤 Gửi</button>
                    <button onclick="event.stopPropagation();_shShowReschedule(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                `;
            } else {
                // Not all pending items are done -> Show Không gửi được
                orderLevelAction = `
                    <button onclick="event.stopPropagation();_shAlertCannotShipOrder(${o.id})" style="padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Chưa đủ điều kiện gửi">⚠️ Không gửi được</button>
                    <button onclick="event.stopPropagation();_shShowReschedule(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                `;
            }
        } else {
            orderLevelAction = `<span style="color:#059669;font-size:14px;">✅</span>`;
        }

        // Progress badge
        let progressBadge = '<span style="color:#d1d5db;">—</span>';
        if (o.expected_ship_date) {
            const expectedDate = new Date(o.expected_ship_date); expectedDate.setHours(0,0,0,0);
            if (o.shipped_at) {
                const actualDate = new Date(o.shipped_at); actualDate.setHours(0,0,0,0);
                const diffDays = Math.round((expectedDate - actualDate) / 86400000);
                if (diffDays > 0) progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#ecfdf5;color:#059669;">🚀 Nhanh ${diffDays} ngày</span>`;
                else if (diffDays < 0) progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#fef2f2;color:#dc2626;">⚠️ Trễ ${Math.abs(diffDays)} ngày</span>`;
                else progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#3b82f6;">📦 Đúng hạn</span>`;
            } else {
                const todayDate = new Date(today);
                const remainDays = Math.round((expectedDate - todayDate) / 86400000);
                if (remainDays > 0) progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#3b82f6;">📅 Còn ${remainDays} ngày</span>`;
                else if (remainDays < 0) progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#fef2f2;color:#dc2626;">⚠️ Quá hạn ${Math.abs(remainDays)} ngày</span>`;
                else progressBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#fef3c7;color:#d97706;">📦 Hôm nay gửi</span>`;
            }
        }

        html += `<tr style="border-bottom:1px solid #f1f5f9;background:${rowBg};cursor:pointer;" onclick="window._dhtDetailSource='shipping';_dhtShowDetail(${o.id})" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'" title="Xem chi tiết đơn hàng">`;
        
        // Expander column
        html += `<td style="padding:8px 6px;text-align:center;" onclick="event.stopPropagation();_shToggleOrderItems(${o.id})">
            <span id="shChevron_${o.id}" style="font-size:14px;cursor:pointer;user-select:none;color:#64748b;font-weight:bold;padding:4px;">▶</span>
        </td>`;

        // Col 1: Action
        html += `<td style="padding:8px 6px;text-align:center;">${orderLevelAction}</td>`;
        // Col 2: Bill link
        html += `<td style="padding:8px 4px;text-align:center;">${o.shipping_bill_link ? `<a href="${o.shipping_bill_link}" target="_blank" style="color:#3b82f6;font-size:14px;" title="Xem bill" onclick="event.stopPropagation()">🔗</a>` : `<span style="color:#d1d5db;cursor:pointer;font-size:14px;" onclick="event.stopPropagation();_shEditTracking(${o.id},'shipping_bill_link','${(o.shipping_bill_link||'').replace(/'/g,"\\'")}')" title="Thêm link bill">➕</span>`}</td>`;
        // Col 3: Gửi Dự Kiến
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:700;color:#1e293b;">${fmt(o.expected_ship_date)}</td>`;
        // Col 4: 🚛 Ngày Gửi
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.shipped_at ? fmt(o.shipped_at) : '—'}</td>`;
        // Col 5: Hẹn Lại
        html += `<td style="padding:8px 6px;font-size:11px;">${o.rescheduled_ship_date ? `<span style="color:#d97706;font-weight:700;">📅 ${fmt(o.rescheduled_ship_date)}</span>` : '<span style="color:#d1d5db;">—</span>'}</td>`;
        // Col 6: Progress
        html += `<td style="padding:8px 6px;">${progressBadge}</td>`;
        // Col 7: Order code
        html += `<td style="padding:8px 6px;font-weight:800;color:#1e293b;font-size:12px;">${o.order_code || '—'}</td>`;
        // Col 8: Priority
        html += `<td style="padding:8px 6px;"><span style="background:${prioColor};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">${o.shipping_priority || 'CHUẨN'}</span></td>`;
        // Col 9-10: Customer
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.customer_name||''}">${o.customer_name || '—'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.customer_phone || '—'}</td>`;
        // Col 11: CSKH
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.cskh_name || '—'}</td>`;
        // Col 12-13: NVC
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.carrier_name || '—'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:600;color:#1e293b;">${o.actual_carrier_name || '—'}</td>`;
        // Col 14: Tracking
        var _tcDisplay = o.tracking_code || '—';
        if (o.tracking_code && o.actual_carrier_tracking_url) {
            var _tcUrl = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.tracking_code));
            _tcDisplay = `<a href="${_tcUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#1e40af;font-weight:700;text-decoration:underline;" title="Tra cứu vận đơn">${o.tracking_code}</a>`;
        }
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;">${_tcDisplay}</td>`;
        // Col 15: Carrier phone
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.carrier_phone || '—'}</td>`;
        // Col 16: Ship time
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.shipped_at ? new Date(o.shipped_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}) : '—'}</td>`;
        // Col 17: History
        html += `<td style="padding:8px 6px;text-align:center;"><button onclick="event.stopPropagation();_shShowHistory(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:3px 6px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;cursor:pointer;font-size:10px;font-weight:600;">📋</button></td>`;
        html += '</tr>';

        // Sub-row for items/slips
        const itemsTableHtml = _shBuildItemsTable(o);
        html += `<tr id="shItemsRow_${o.id}" style="display:none;background:#f8fafc;border-bottom:1.5px solid #cbd5e1;">
            <td colspan="19" style="padding:12px 16px;">
                <div style="font-size:12px;font-weight:800;color:#1e3a5f;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <span>📋 Danh sách phiếu sản phẩm của đơn ${o.order_code}</span>
                </div>
                ${itemsTableHtml}
            </td>
        </tr>`;
    }
    html += '</tbody></table></div>';
    return html;
}

function _shToggleOrderItems(orderId) {
    const row = document.getElementById(`shItemsRow_${orderId}`);
    const chevron = document.getElementById(`shChevron_${orderId}`);
    if (!row || !chevron) return;
    if (row.style.display === 'none') {
        row.style.display = '';
        chevron.innerText = '▼';
    } else {
        row.style.display = 'none';
        chevron.innerText = '▶';
    }
}

function _shBuildProgressHTML(item) {
    const steps = [
        { label: 'Cắt', done: item.cut_done, needed: item.needs_cut },
        { label: 'In', done: item.print_done, needed: item.needs_print },
        { label: 'Ép', done: item.press_done, needed: item.needs_press },
        { label: 'May', done: item.sew_done, needed: item.needs_sew },
        { label: 'QC', done: item.qc_done, needed: item.needs_sew },
        { label: 'HT', done: item.finish_done, needed: item.needs_finishing }
    ];

    return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">` + 
        steps.map(s => {
            if (!s.needed) return '';
            const bg = s.done ? '#dcfce7' : '#fee2e2';
            const color = s.done ? '#15803d' : '#b91c1c';
            const icon = s.done ? '✓' : '✗';
            return `<span style="padding:1.5px 5px;border-radius:4px;font-size:9.5px;font-weight:700;background:${bg};color:${color};display:inline-flex;align-items:center;gap:2.5px;" title="${s.label}: ${s.done ? 'Đã hoàn thành' : 'Chưa hoàn thành'}">
                ${s.label} ${icon}
            </span>`;
        }).join('') + `</div>`;
}

function _shBuildItemsTable(order) {
    if (!order.items || !order.items.length) {
        return `<div style="color:#64748b;font-style:italic;font-size:11px;">Không có chi tiết phiếu sản phẩm</div>`;
    }

    let html = `<div style="background:white;border:1px solid #cbd5e1;border-radius:10px;padding:8px;box-shadow:inset 0 1px 3px rgba(0,0,0,.05);overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:700px;">
        <thead>
            <tr style="border-bottom:1.5px solid #cbd5e1;background:#f8fafc;color:#475569;">
                <th style="padding:6px 8px;text-align:left;font-weight:700;width:220px;">Sản phẩm / Mô tả</th>
                <th style="padding:6px 8px;text-align:center;font-weight:700;width:60px;">SL</th>
                <th style="padding:6px 8px;text-align:left;font-weight:700;">Tiến độ bộ phận</th>
                <th style="padding:6px 8px;text-align:center;font-weight:700;width:110px;">Trạng thái gửi</th>
                <th style="padding:6px 8px;text-align:center;font-weight:700;width:140px;">Thao tác</th>
            </tr>
        </thead>
        <tbody>`;

    for (const item of order.items) {
        const trStyle = `border-bottom:1px solid #f1f5f9;`;
        
        let actionHtml = '';
        if (item.shipping_status === 'shipped') {
            actionHtml = `<span style="color:#64748b;font-size:11px;">—</span>`;
        } else {
            if (item.all_done) {
                actionHtml = `<button onclick="event.stopPropagation();_shShipOrder(${order.id},'${(order.order_code||'').replace(/'/g,"\\'")}', ${item.item_id}, '${(item.product_name||'').replace(/'/g,"\\'")}')" style="padding:3px 8px;border:none;border-radius:4px;background:#10b981;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">📤 Gửi Phiếu</button>`;
            } else {
                actionHtml = `<button onclick="event.stopPropagation();_shAlertCannotShip('${(item.product_name||'').replace(/'/g,"\\'")}', '${item.missing_steps.join(', ')}')" style="padding:3px 8px;border:none;border-radius:4px;background:#ef4444;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">⚠️ Không gửi được</button>`;
            }
        }

        const progressHtml = _shBuildProgressHTML(item);
        const statusBadge = item.shipping_status === 'shipped' 
            ? `<span style="background:#ecfdf5;color:#047857;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">✅ Đã gửi</span>` 
            : `<span style="background:#fffbeb;color:#b45309;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">⏳ Chờ gửi</span>`;

        html += `<tr style="${trStyle}">
            <td style="padding:6px 8px;font-weight:600;color:#1e293b;">
                <div>${item.product_name}</div>
                <div style="font-size:10px;color:#64748b;font-weight:normal;margin-top:2px;">${item.description || ''}</div>
            </td>
            <td style="padding:6px 8px;text-align:center;font-weight:700;color:#334155;">${item.quantity}</td>
            <td style="padding:6px 8px;">${progressHtml}</td>
            <td style="padding:6px 8px;text-align:center;">${statusBadge}</td>
            <td style="padding:6px 8px;text-align:center;">${actionHtml}</td>
        </tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

function _shShowAlert(title, contentHtml) {
    document.getElementById('shAlertModal')?.remove();
    
    if (!document.getElementById('shAlertStyles')) {
        const style = document.createElement('style');
        style.id = 'shAlertStyles';
        style.innerHTML = `
            @keyframes shAlertFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes shAlertSlideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    const m = document.createElement('div');
    m.id = 'shAlertModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:shAlertFadeIn 0.2s ease-out;';
    
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:480px;max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;animation:shAlertSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:18px 24px;color:white;display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">⚠️</span>
            <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;">${title}</div>
        </div>
        <div style="padding:22px 24px;font-size:13px;color:#334155;line-height:1.6;max-height:60vh;overflow-y:auto;">
            ${contentHtml}
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">
            <button onclick="document.getElementById('shAlertModal')?.remove()" style="padding:8px 20px;border:none;border-radius:8px;background:#374151;color:white;cursor:pointer;font-weight:700;font-size:13px;transition:background 0.2s;" onmouseover="this.style.background='#1f2937'" onmouseout="this.style.background='#374151'">Đóng</button>
        </div>
    </div>`;

    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

function _shAlertCannotShip(itemName, missing) {
    const missingBadges = missing.split(', ').map(step => 
        `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11px;margin:2px 4px 2px 0;">${step}</span>`
    ).join('');

    const html = `
        <div style="margin-bottom:12px;">Phiếu sản phẩm <b style="color:#1e293b;font-size:14px;">"${itemName}"</b> chưa đủ điều kiện để gửi hàng.</div>
        <div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="font-weight:700;color:#c2410c;margin-bottom:6px;font-size:12px;">🔴 Các bộ phận chưa hoàn thành:</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">${missingBadges}</div>
        </div>
        <div style="color:#64748b;font-size:12px;margin-top:12px;">Vui lòng đốc thúc các bộ phận liên quan hoàn thành để kế toán có thể xuất hàng.</div>
    `;
    _shShowAlert('Không thể gửi phiếu hàng', html);
}

function _shAlertCannotShipOrder(orderId) {
    const o = _shOrders.find(x => x.id === orderId);
    if (!o) return;

    const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
    
    let html = '';
    if (pendingItems.length === 0) {
        html = `
            <div style="margin-bottom:12px;">Đơn hàng <b style="color:#1e293b;font-size:14px;">${o.order_code}</b> hiện tại chưa có phiếu sản phẩm nào ở trạng thái chờ gửi.</div>
        `;
    } else {
        html = `
            <div style="margin-bottom:14px;">Đơn hàng <b style="color:#1e293b;font-size:14px;">${o.order_code}</b> chưa đủ điều kiện gửi vì có các phiếu sản phẩm chưa hoàn thành sản xuất:</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
        `;

        pendingItems.filter(item => !item.all_done).forEach(item => {
            const missingBadges = item.missing_steps.map(step => 
                `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">${step}</span>`
            ).join(' ');

            html += `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;">
                    <div style="font-weight:700;color:#1e293b;margin-bottom:4px;font-size:12px;">📦 ${item.product_name}</div>
                    <div style="font-size:10px;color:#64748b;margin-bottom:6px;">${item.description || ''} (SL: ${item.quantity})</div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:11px;color:#b91c1c;font-weight:600;">Chưa xong:</span>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">${missingBadges}</div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div style="color:#475569;font-size:11.5px;margin-top:14px;background:#fef3c7;border:1.5px dashed #fcd34d;padding:10px;border-radius:8px;line-height:1.5;">
                💡 <b>Mẹo cho Kế toán:</b> Bạn có thể click vào biểu tượng <b>▶</b> ở đầu dòng để xem chi tiết tiến độ từng bộ phận và gửi trước những phiếu đã hoàn thành xong!
            </div>
        `;
    }

    _shShowAlert(`Đơn hàng chưa đủ điều kiện gửi`, html);
}

// ===== CARRIER RULES =====
const _SH_CARRIER_RULES = {
    tracking_code: ['Vận Chuyển J&T','Viettel Post','Hoả Tốc Máy Bay'],
    bill_link: ['Grab','Chú Sơn'],
    bill_and_phone: ['Nhà Xe'],
    receiver_name: ['Khách Đến Lấy','Nhân Viên HV','Người Nhận Hàng Hộ']
};
// NVC thu phí ship riêng (không cần nhập phí ship khi gửi)
const _SH_NO_FEE_CARRIERS = ['Vận Chuyển J&T', 'Viettel Post', 'Hoả Tốc Máy Bay Nasco', 'Hoả Tốc Máy Bay ViettelPost', 'Khách Đến Lấy'];
function _shIsNoFeeCarrier(name) {
    if (!name) return false;
    return _SH_NO_FEE_CARRIERS.some(n => name.toLowerCase().includes(n.toLowerCase()));
}
// NVC thu tiền COD sau — ẩn phần Thanh Toán Đơn Hàng khi gửi
const _SH_PAY_LATER_CARRIERS = ['Vận Chuyển J&T', 'Viettel Post', 'Hoả Tốc Máy Bay Nasco', 'Hoả Tốc Máy Bay ViettelPost'];
function _shIsPayLaterCarrier(name) {
    if (!name) return false;
    return _SH_PAY_LATER_CARRIERS.some(n => name.toLowerCase().includes(n.toLowerCase()));
}
function _shGetCarrierGroup(name) {
    if (!name) return null;
    for (const [g, list] of Object.entries(_SH_CARRIER_RULES)) { if (list.some(n => name.toLowerCase().includes(n.toLowerCase()))) return g; }
    return 'bill_link';
}

// ===== SHIP MODAL =====
function _shShipOrder(id, code, itemId = null, itemName = null) {
    const o = _shOrders.find(x => x.id === id); if (!o) return;
    document.getElementById('shShipModal')?.remove();
    const m = document.createElement('div'); m.id = 'shShipModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '\u2014';
    const fmtMoney = n => (Number(n)||0).toLocaleString('vi-VN');
    const today = new Date().toISOString().split('T')[0];
    let diffText = '\u2014';
    if (o.expected_ship_date) {
        const expectedD = new Date(o.expected_ship_date); expectedD.setHours(0,0,0,0);
        if (o.shipped_at) {
            const actualD = new Date(o.shipped_at); actualD.setHours(0,0,0,0);
            const diff = Math.round((expectedD - actualD) / 86400000);
            if (diff > 0) diffText = '\ud83d\ude80 Nhanh ' + diff + ' ng\u00e0y';
            else if (diff < 0) diffText = '\u26a0\ufe0f Tr\u1ec5 ' + Math.abs(diff) + ' ng\u00e0y';
            else diffText = '\ud83d\udce6 \u0110\u00fang h\u1ea1n';
        } else {
            const todayD = new Date(today);
            const remain = Math.round((expectedD - todayD) / 86400000);
            if (remain > 0) diffText = '\ud83d\udcc5 C\u00f2n ' + remain + ' ng\u00e0y';
            else if (remain < 0) diffText = '\u26a0\ufe0f Qu\u00e1 h\u1ea1n ' + Math.abs(remain) + ' ng\u00e0y';
            else diffText = '\ud83d\udce6 H\u00f4m nay g\u1eedi';
        }
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

    const modalTitle = itemId ? `📤 Gửi Phiếu — ${code} (${itemName})` : `📤 Gửi Hàng — ${code}`;

    m.innerHTML = '<div style="background:white;border-radius:16px;width:560px;max-width:98vw;box-shadow:0 25px 50px rgba(0,0,0,.3);max-height:95vh;overflow-y:auto;">'
    + '<div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:18px 24px;border-radius:16px 16px 0 0;">'
    + '<div style="color:white;font-weight:800;font-size:16px;">' + modalTitle + '</div>'
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
    // P3: Ph\u00ed Ship (wrapped in shFeeSection for show/hide)
    + '<div id="shFeeSection" style="border-top:1px solid #e2e8f0;padding-top:14px;">'
    + '<label style="font-size:12px;font-weight:700;color:#374151;">\ud83d\udcb0 Ph\u00ed G\u1eedi H\u00e0ng <span style="color:#dc2626">*</span></label>'
    + '<div style="position:relative;margin-top:4px;margin-bottom:12px;"><input type="text" id="shFeeInput" placeholder="0" oninput="_shFmtFee()" style="width:100%;padding:9px 40px 9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-weight:700;"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:13px;font-weight:600;">\u0111</span></div>'
    + '<div style="display:flex;gap:12px;margin-bottom:10px;">'
    + '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">Ng\u01b0\u1eddi tr\u1ea3 <span style="color:#dc2626">*</span></div><div style="display:flex;gap:6px;" id="shPayerBtns"><button type="button" onclick="_shToggle(\'payer\',\'hv\')" data-val="hv" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">HV tr\u1ea3</button><button type="button" onclick="_shToggle(\'payer\',\'khach\')" data-val="khach" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">Kh\u00e1ch tr\u1ea3</button></div></div>'
    + '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">H\u00ecnh th\u1ee9c <span style="color:#dc2626">*</span></div><div style="display:flex;gap:6px;" id="shMethodBtns"><button type="button" onclick="_shToggle(\'method\',\'ck\')" data-val="ck" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">CK</button><button type="button" onclick="_shToggle(\'method\',\'tm\')" data-val="tm" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">TM</button></div></div>'
    + '</div>'
    + '<div id="shFeeNote" style="font-size:11px;color:#6b7280;padding:6px 8px;background:#f8fafc;border-radius:6px;margin-bottom:12px;display:none;"></div>'
    + '</div>'
    + '<div id="shNoFeeNote" style="display:none;border-top:1px solid #e2e8f0;padding-top:14px;"><div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;"><span style="font-size:22px;">\ud83d\udce6</span><div><div style="font-weight:800;font-size:12px;color:#059669;">NVC thu ph\u00ed ship ri\u00eang</div><div style="font-size:11px;color:#065f46;margin-top:2px;">Kh\u00f4ng c\u1ea7n nh\u1eadp ph\u00ed g\u1eedi h\u00e0ng \u2014 NVC s\u1ebd quy\u1ebft to\u00e1n sau</div></div></div></div>'
    + '<div id="shPaymentSection" style="margin-top:4px;"></div>'
    + '</div>'
    // Footer
    + '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">'
    + '<button onclick="document.getElementById(\'shShipModal\')?.remove()" style="padding:9px 18px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">H\u1ee7y b\u1ecf</button>'
    + '<button onclick="_shDoShip(' + id + ')" style="padding:9px 18px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;font-size:13px;">\ud83d\udce4 G\u1eedi H\u00e0ng</button>'
    + '</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    window._shModalState = { payer: null, method: null, orderId: id, remaining, orderCode: code, selectedPaymentId: null, skipPayment: false, matchingPayments: [], paymentLoaded: false, payLaterCarrier: false, itemId: itemId };
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
        const isNVHV = name.toLowerCase().includes('nhân viên hv') || name.toLowerCase().includes('nhan vien hv');
        const lbl = isNVHV ? 'Tên Nhân Viên Gửi Hàng' : 'Tên Người Nhận Hàng';
        const ph = isNVHV ? 'Nhập tên nhân viên gửi...' : 'Nhập tên người nhận...';
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">${lbl} <span style="color:#dc2626">*</span></label><input id="shReceiverName" style="${fStyle}" placeholder="${ph}">`;
    }
    el.innerHTML = h;
    // ★ Toggle fee section visibility based on carrier type
    const noFee = _shIsNoFeeCarrier(name);
    const feeSection = document.getElementById('shFeeSection');
    const noFeeNote = document.getElementById('shNoFeeNote');
    if (feeSection) feeSection.style.display = noFee ? 'none' : '';
    if (noFeeNote) noFeeNote.style.display = noFee ? '' : 'none';
    // Update state
    var s = window._shModalState;
    var isPayLater = _shIsPayLaterCarrier(name);
    if (s) {
        s.noFeeCarrier = noFee;
        s.payLaterCarrier = isPayLater;
        if (noFee) {
            // Clear fee/payer/method
            s.payer = null;
            s.method = null;
            // Reset fee input
            var feeInp = document.getElementById('shFeeInput');
            if (feeInp) feeInp.value = '0';
            // Hide fee note
            var feeNote = document.getElementById('shFeeNote');
            if (feeNote) feeNote.style.display = 'none';
            if (isPayLater) {
                // ★ Pay-later NVC (J&T, Viettel Post, Nasco...): ẩn phần thanh toán, hiện note COD
                s.paymentLoaded = true;
                s.selectedPaymentId = null;
                s.matchingPayments = [];
                var payEl = document.getElementById('shPaymentSection');
                if (payEl) {
                    if (s.remaining <= 0) {
                        // Đã thanh toán đủ — hiện thông báo bất kể NVC nào
                        s.skipPayment = true;
                        payEl.innerHTML = '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:14px 16px;">'
                            + '<div style="font-weight:800;font-size:13px;color:#059669;margin-bottom:4px;">✅ Đơn hàng đã thanh toán đủ</div>'
                            + '<div style="font-size:12px;color:#065f46;">Số tiền còn lại = 0đ — Không cần thanh toán thêm.</div>'
                            + '</div>';
                    } else {
                        // Còn tiền → NVC sẽ thu COD từ khách
                        s.skipPayment = true;
                        payEl.innerHTML = '<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #fdba74;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">'
                            + '<span style="font-size:26px;">📦</span>'
                            + '<div>'
                            + '<div style="font-weight:800;font-size:13px;color:#c2410c;">NVC sẽ thu tiền COD từ khách</div>'
                            + '<div style="font-size:12px;color:#9a3412;margin-top:3px;">Số tiền cần thu: <b style="color:#dc2626;">' + (s.remaining > 0 ? s.remaining.toLocaleString('vi-VN') : '0') + 'đ</b> — Không cần chọn mã thanh toán lúc gửi hàng.</div>'
                            + '</div></div>';
                    }
                }
            } else {
                // No-fee nhưng KHÔNG phải pay-later (VD: Khách Đến Lấy): vẫn load payment
                _shLoadMatchingPayments();
            }
        } else {
            // Reset payment section (needs payer+method to trigger)
            var payEl = document.getElementById('shPaymentSection');
            if (payEl) payEl.innerHTML = '';
            s.selectedPaymentId = null;
            s.skipPayment = false;
            s.paymentLoaded = false;
            s.matchingPayments = [];
        }
    }
}

function _shToggle(type, val) {
    if (!window._shModalState) return;
    var s = window._shModalState;
    s[type] = val;
    var containerId = type === 'payer' ? 'shPayerBtns' : 'shMethodBtns';
    document.querySelectorAll('#' + containerId + ' button').forEach(function(b) {
        var active = b.dataset.val === val;
        b.style.background = active ? '#122546' : 'white';
        b.style.color = active ? 'white' : '#374151';
        b.style.borderColor = active ? '#122546' : '#e2e8f0';
    });
    // ★ When remaining <= 0 and payer = 'hv': disable CK, auto-select TM
    var ckBtn = document.querySelector('#shMethodBtns button[data-val="ck"]');
    if (s.remaining <= 0 && s.payer === 'hv') {
        if (ckBtn) {
            ckBtn.disabled = true;
            ckBtn.style.opacity = '0.35';
            ckBtn.style.cursor = 'not-allowed';
            ckBtn.title = 'Tiền đơn còn lại = 0đ, không thể trừ CK';
        }
        // If CK was selected, force switch to TM
        if (s.method === 'ck') {
            s.method = 'tm';
            _shToggle('method', 'tm');
            return;
        }
    } else {
        // Re-enable CK when payer != hv or remaining > 0
        if (ckBtn) {
            ckBtn.disabled = false;
            ckBtn.style.opacity = '1';
            ckBtn.style.cursor = 'pointer';
            ckBtn.title = '';
        }
    }
    _shUpdateFeeNote();
}

function _shUpdateFeeNote() {
    const s = window._shModalState; if (!s) return;
    const el = document.getElementById('shFeeNote'); if (!el) return;
    const fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    if (s.remaining <= 0 && s.payer === 'hv' && s.method === 'ck') {
        el.style.display = 'block';
        el.innerHTML = '⚠️ <b style="color:#dc2626">Tiền đơn còn lại = 0đ</b> — Không thể trừ CK. Vui lòng chọn TM nếu HV trả.';
    } else if (s.payer === 'hv' && s.method === 'ck' && fee > 0) {
        el.style.display = 'block';
        el.innerHTML = '💡 Ship sẽ CK vào STK công ty: <b>' + (s.remaining - fee).toLocaleString('vi-VN') + 'đ</b> (đã trừ ' + fee.toLocaleString('vi-VN') + 'đ ship)';
    } else if (s.payer === 'hv' && s.method === 'tm') {
        el.style.display = 'block';
        el.innerHTML = '💡 Sẽ tự tạo <b>phiếu CHI tiền mặt</b> trong Sổ Thu Chi';
    } else { el.style.display = 'none'; }
    // ★ Trigger payment search when both payer + method selected
    if (s.payer && s.method) {
        _shLoadMatchingPayments();
    }
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
    if (g === 'bill_and_phone') {
        if (!phone) return alert('Vui lòng nhập SĐT Nhà Xe');
        var phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) return alert('SĐT Nhà Xe phải đúng 10 số (hiện tại: ' + phoneDigits.length + ' số)');
        if (!bill) return alert('Vui lòng nhập Bill Gửi Hàng');
    }
    if (g === 'receiver_name' && !receiver) return alert('Vui lòng nhập Tên Người Nhận');
    // ★ Fee validation: skip for no-fee carriers
    const isNoFee = s.noFeeCarrier || false;
    let feeRaw = '0';
    if (!isNoFee) {
        feeRaw = (document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'');
        if (!feeRaw) return alert('Vui lòng nhập Phí Gửi Hàng');
        if (!s.payer) return alert('Vui lòng chọn Người trả');
        if (!s.method) return alert('Vui lòng chọn Hình thức trả');
        // ★ Block HV+CK when remaining <= 0
        if (s.payer === 'hv' && s.method === 'ck' && s.remaining <= 0) {
            return alert('⚠️ Tiền đơn còn lại = 0đ — Không thể chọn HV trả CK. Vui lòng chọn TM.');
        }
    }
    // ★ Payment validation: if loaded with results, must select or skip
    if (s.paymentLoaded && s.matchingPayments && s.matchingPayments.length > 0 && !s.payLaterCarrier) {
        if (!s.selectedPaymentId && !s.skipPayment) {
            return alert('Vui lòng chọn mã tiền thanh toán hoặc đánh dấu "Không thanh toán lần này"');
        }
    }

    // Submit
    try {
        const body = {
            actual_carrier_id: Number(carrierId),
            shipping_fee: isNoFee ? 0 : Number(feeRaw),
            shipping_fee_payer: isNoFee ? null : s.payer,
            shipping_fee_method: isNoFee ? null : s.method,
            no_fee_carrier: isNoFee
        };
        if (s.selectedPaymentId) body.selected_payment_id = s.selectedPaymentId;
        if (s.itemId) body.item_id = s.itemId;
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

// ===== PAYMENT MATCHING =====
var _shPaymentSearchTimer = null;

async function _shLoadMatchingPayments() {
    var s = window._shModalState; if (!s) return;
    var el = document.getElementById('shPaymentSection'); if (!el) return;
    // Reset selection when params change
    s.selectedPaymentId = null;
    s.skipPayment = false;
    s.paymentLoaded = false;
    // Calculate target amount
    var fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    var target = s.remaining;
    if (s.payer === 'hv' && s.method === 'ck') target = s.remaining - fee;
    if (target <= 0) {
        // Nothing to pay
        s.paymentLoaded = true;
        s.skipPayment = true;
        el.innerHTML = '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:14px 16px;">'
            + '<div style="font-weight:800;font-size:13px;color:#059669;margin-bottom:4px;">✅ Đơn hàng đã thanh toán đủ</div>'
            + '<div style="font-size:12px;color:#065f46;">Số tiền còn lại = 0đ — Không cần thanh toán thêm.</div>'
            + '</div>';
        return;
    }
    // Show loading
    el.innerHTML = '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:14px 16px;">'
        + '<div style="font-weight:800;font-size:13px;color:#1e40af;margin-bottom:4px;">💳 Thanh Toán Đơn Hàng</div>'
        + '<div style="text-align:center;padding:12px;color:#3b82f6;font-size:12px;">\u23f3 Đang tìm mã tiền phù hợp...</div>'
        + '</div>';
    // Debounce
    if (_shPaymentSearchTimer) clearTimeout(_shPaymentSearchTimer);
    _shPaymentSearchTimer = setTimeout(async function() {
        try {
            var data = await apiCall('/api/shipping/matching-payments?order_code=' + encodeURIComponent(s.orderCode) + '&target_amount=' + target);
            s.matchingPayments = data.payments || [];
            s.paymentLoaded = true;
            _shRenderPayments(target);
        } catch(e) {
            s.paymentLoaded = true;
            s.matchingPayments = [];
            _shRenderPayments(target);
        }
    }, 300);
}

function _shRenderPayments(target) {
    var s = window._shModalState; if (!s) return;
    var el = document.getElementById('shPaymentSection'); if (!el) return;
    var payments = s.matchingPayments || [];
    var fmtM = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    var fmtD = function(d) { if(!d) return '\u2014'; var dt = new Date(d); return dt.getDate()+'/'+(dt.getMonth()+1)+'/'+dt.getFullYear(); };
    var h = '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:14px 16px;">';
    h += '<div style="font-weight:800;font-size:13px;color:#1e40af;margin-bottom:2px;">💳 Thanh Toán Đơn Hàng</div>';
    h += '<div style="font-size:12px;color:#3b82f6;font-weight:700;margin-bottom:10px;">Số tiền cần thanh toán: <b style="font-size:15px;color:#dc2626;">' + fmtM(target) + 'đ</b></div>';
    if (payments.length === 0) {
        // No matching payments
        s.skipPayment = true;
        h += '<div style="text-align:center;padding:12px;background:rgba(255,255,255,.7);border-radius:8px;">';
        h += '<div style="font-size:12px;color:#6b7280;font-weight:600;">📭 Không tìm thấy mã tiền phù hợp</div>';
        h += '<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Gửi hàng mà không liên kết thanh toán</div>';
        h += '</div>';
    } else {
        // Payment list
        h += '<div style="max-height:220px;overflow-y:auto;margin-bottom:8px;">';
        for (var i = 0; i < payments.length; i++) {
            var p = payments[i];
            var diff = Number(p.diff) || 0;
            var isSelected = s.selectedPaymentId === p.id;
            var mlColors = { exact:'#059669', close:'#d97706', approximate:'#6b7280', far:'#9ca3af' };
            var mlLabels = { exact:'✅ Khớp chính xác', close:'🟡 Gần giống', approximate:'⚪ Chênh lệch', far:'⚪ Xa' };
            var mlBgs = { exact:'#f0fdf4', close:'#fffbeb', approximate:'#f8fafc', far:'#f8fafc' };
            var ml = p.match_level || 'far';
            var border = isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0';
            var bg = isSelected ? '#eff6ff' : mlBgs[ml];
            var shadow = isSelected ? 'box-shadow:0 0 0 3px rgba(37,99,235,0.15);' : '';
            var methodIcon = p.payment_method === 'TM' ? '💰' : '🏦';
            h += '<div onclick="_shSelectPayment(' + p.id + ')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:' + border + ';border-radius:10px;margin-bottom:6px;cursor:pointer;background:' + bg + ';transition:all .15s;' + shadow + '" onmouseover="if(' + (!isSelected) + ')this.style.borderColor=\'#93c5fd\'" onmouseout="if(' + (!isSelected) + ')this.style.borderColor=\'#e2e8f0\'">';
            // Radio circle
            h += '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (isSelected ? '#2563eb' : '#cbd5e1') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
            if (isSelected) h += '<div style="width:10px;height:10px;border-radius:50%;background:#2563eb;"></div>';
            h += '</div>';
            // Info
            h += '<div style="flex:1;min-width:0;">';
            h += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
            h += '<span style="font-weight:800;font-size:12px;color:#1e40af;">' + (p.payment_code||'\u2014') + '</span>';
            h += '<span style="font-weight:900;font-size:13px;color:#dc2626;">' + fmtM(p.amount) + 'đ</span>';
            h += '<span style="font-size:10px;font-weight:700;color:' + mlColors[ml] + ';">' + mlLabels[ml] + '</span>';
            h += '</div>';
            h += '<div style="font-size:10px;color:#64748b;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;">';
            h += '<span>' + methodIcon + ' ' + (p.payment_method||'') + '</span>';
            if (p.bank_name) h += '<span>🏦 ' + p.bank_name + '</span>';
            h += '<span>📅 ' + fmtD(p.payment_date) + '</span>';
            if (diff > 0) h += '<span style="color:' + (diff <= 50000 ? '#d97706' : '#dc2626') + ';">Chênh: ' + (diff>0?'+':'') + fmtM(diff) + 'đ</span>';
            h += '</div>';
            if (p.transfer_note) {
                h += '<div style="font-size:10px;color:#9ca3af;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (p.transfer_note||'').replace(/"/g,'&quot;') + '">📝 ' + p.transfer_note + '</div>';
            }
            h += '</div></div>';
        }
        h += '</div>';
        // Skip button
        var skipActive = s.skipPayment;
        h += '<div onclick="_shToggleSkipPayment()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid ' + (skipActive ? '#f59e0b' : '#e2e8f0') + ';border-radius:8px;cursor:pointer;background:' + (skipActive ? '#fffbeb' : 'white') + ';transition:all .15s;" onmouseover="this.style.borderColor=\'#f59e0b\'" onmouseout="if(!' + skipActive + ')this.style.borderColor=\'#e2e8f0\'">';
        h += '<div style="width:18px;height:18px;border-radius:4px;border:2px solid ' + (skipActive ? '#f59e0b' : '#cbd5e1') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + (skipActive ? '#f59e0b' : 'white') + ';">';
        if (skipActive) h += '<span style="color:white;font-size:11px;font-weight:900;">✓</span>';
        h += '</div>';
        h += '<span style="font-size:12px;font-weight:600;color:' + (skipActive ? '#d97706' : '#6b7280') + ';">\u23ed\ufe0f Không thanh toán lần này</span>';
        h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
}

function _shSelectPayment(id) {
    var s = window._shModalState; if (!s) return;
    s.selectedPaymentId = (s.selectedPaymentId === id) ? null : id;
    s.skipPayment = false;
    var fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    var target = s.remaining;
    if (s.payer === 'hv' && s.method === 'ck') target = s.remaining - fee;
    _shRenderPayments(target);
}

function _shToggleSkipPayment() {
    var s = window._shModalState; if (!s) return;
    s.skipPayment = !s.skipPayment;
    if (s.skipPayment) s.selectedPaymentId = null;
    var fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    var target = s.remaining;
    if (s.payer === 'hv' && s.method === 'ck') target = s.remaining - fee;
    _shRenderPayments(target);
}

function _shShowReschedule(id, code) {
    document.getElementById('shRescheduleModal')?.remove();
    // Calculate tomorrow's date for min attribute
    const _now = new Date(); _now.setDate(_now.getDate() + 1);
    const _minDate = _now.toISOString().split('T')[0];
    const m = document.createElement('div');
    m.id = 'shRescheduleModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    m.innerHTML = `<div style="background:white;border-radius:16px;width:420px;max-width:95vw;padding:24px;box-shadow:0 25px 50px rgba(0,0,0,.3);">
        <div style="font-size:16px;font-weight:800;color:#122546;margin-bottom:16px;">📅 Hẹn Lại — ${code}</div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Ngày gửi mới <span style="color:#dc2626">*</span></label>
            <input type="date" id="shNewDate" min="${_minDate}" onchange="_shCheckHoliday()" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;">
            <div id="shHolidayWarn" style="display:none;margin-top:6px;padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5;font-size:12px;color:#dc2626;font-weight:700;"></div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Lý do <span style="color:#dc2626">*</span></label>
            <textarea id="shReason" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;resize:vertical;" placeholder="Nhập lý do hẹn lại..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('shRescheduleModal')?.remove()" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
            <button id="shRescheduleBtn" onclick="_shDoReschedule(${id})" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:700;font-size:13px;">📅 Hẹn lại</button>
        </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    // Load holidays for validation
    _shLoadHolidays();
}

// Holiday cache
var _shHolidayMap = {};

async function _shLoadHolidays() {
    try {
        const year = new Date().getFullYear();
        const res = await apiCall('/api/holidays?year=' + year);
        const res2 = await apiCall('/api/holidays?year=' + (year + 1));
        _shHolidayMap = {};
        (res.holidays || []).concat(res2.holidays || []).forEach(h => {
            const d = h.holiday_date ? h.holiday_date.split('T')[0] : '';
            if (d) _shHolidayMap[d] = h.holiday_name;
        });
    } catch(e) { console.error('[Holidays]', e); }
}

function _shCheckHoliday() {
    const dateVal = document.getElementById('shNewDate')?.value;
    const warnEl = document.getElementById('shHolidayWarn');
    const btn = document.getElementById('shRescheduleBtn');
    if (!dateVal || !warnEl || !btn) return;
    const holidayName = _shHolidayMap[dateVal];
    if (holidayName) {
        warnEl.style.display = 'block';
        warnEl.innerHTML = '⚠️ Ngày ' + dateVal.split('-').reverse().join('/') + ' là <b>' + holidayName + '</b> — Không được hẹn vào ngày lễ!';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    } else {
        warnEl.style.display = 'none';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}

async function _shDoReschedule(id) {
    const newDate = document.getElementById('shNewDate')?.value;
    const reason = document.getElementById('shReason')?.value;
    if (!newDate) { alert('Chọn ngày gửi mới'); return; }
    if (!reason?.trim()) { alert('Nhập lý do'); return; }
    // Double-check holiday on client
    if (_shHolidayMap[newDate]) { alert('⚠️ Không được hẹn vào ngày lễ: ' + _shHolidayMap[newDate]); return; }
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
