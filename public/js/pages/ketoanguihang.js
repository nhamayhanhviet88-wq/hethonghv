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
let _shAllOrdersLoaded = false;
let _shAllOrdersLoading = null;
let _shSelectedYear = 'all';
let _shSelectedMonth = 'all';

async function renderKetoanguihangPage(container) {
    _shFilter = 'today'; _shSearchVal = ''; _shCskhVal = ''; _shPage = 1;
    _shSelectedYear = 'all'; _shSelectedMonth = 'all';
    container.innerHTML = `<style>
        @keyframes shimmerSparkle {
            0% {
                background-position: -200% center;
                text-shadow: 0 0 4px rgba(124, 58, 237, 0.2);
            }
            50% {
                text-shadow: 0 0 10px rgba(124, 58, 237, 0.5), 0 0 20px rgba(236, 72, 153, 0.2);
            }
            100% {
                background-position: 200% center;
                text-shadow: 0 0 4px rgba(124, 58, 237, 0.2);
            }
        }
        .shimmer-sparkle {
            font-weight: 900;
            font-size: 12px;
            background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 25%, #ec4899 50%, #7c3aed 75%, #4f46e5 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmerSparkle 2.5s linear infinite;
            display: inline-block;
            white-space: nowrap;
        }
    </style>
    <div style="max-width:1600px;margin:0 auto;padding:16px;">
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
        let html = `<div onclick="_shSetFilter('${f.key}')" style="padding:12px 14px;margin-bottom:6px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .2s;border:2px solid ${active ? f.color : '#e2e8f0'};background:${active ? f.bg : 'white'};box-shadow:${active ? '0 2px 8px rgba(0,0,0,.08)' : 'none'};" onmouseover="if(!${active})this.style.borderColor='${f.color}'" onmouseout="if(!${active})this.style.borderColor='#e2e8f0'">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">${f.icon}</span>
                <span style="font-size:13px;font-weight:700;color:${active ? f.color : '#334155'};">${f.label}</span>
            </div>
            <span style="background:${active ? f.color : '#e2e8f0'};color:${active ? 'white' : '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">${cnt}</span>
        </div>`;
        if (f.key === 'shipped' && active) {
            html += _shBuildYearMonthTreeHTML();
        }
        return html;
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

function _shBuildYearMonthTreeHTML() {
    const shippedOrders = _shOrders.filter(o => o.shipping_status === 'shipped');
    const yearMonthMap = {};
    shippedOrders.forEach(o => {
        let dateObj = null;
        if (o.shipped_at) dateObj = new Date(o.shipped_at);
        else if (o.shipping_date) dateObj = new Date(o.shipping_date);
        else if (o.expected_ship_date) dateObj = new Date(o.expected_ship_date);
        else if (o.created_at) dateObj = new Date(o.created_at);
        
        if (dateObj) {
            const y = dateObj.getFullYear();
            const m = dateObj.getMonth() + 1;
            if (!yearMonthMap[y]) yearMonthMap[y] = {};
            if (!yearMonthMap[y][m]) yearMonthMap[y][m] = 0;
            yearMonthMap[y][m]++;
        }
    });

    const sortedYears = Object.keys(yearMonthMap).map(Number).sort((a, b) => b - a);
    if (sortedYears.length === 0) return '';

    let html = `<div style="margin-left: 10px; border-left: 2px dashed #cbd5e1; padding-left: 10px; margin-top: 4px; margin-bottom: 8px; font-size: 12px;">`;
    
    const isAllActive = _shSelectedYear === 'all';
    html += `<div onclick="event.stopPropagation(); _shSelectYearMonth('all', 'all')" style="padding: 4px 8px; margin-bottom: 2px; border-radius: 6px; cursor: pointer; font-weight: 700; color: ${isAllActive ? '#059669' : '#475569'}; background: ${isAllActive ? '#ecfdf5' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;">
        <span>📅 Tất cả đã gửi</span>
        <span style="font-size: 10px; background: ${isAllActive ? '#059669' : '#e2e8f0'}; color: ${isAllActive ? 'white' : '#64748b'}; padding: 1px 6px; border-radius: 8px;">${shippedOrders.length}</span>
    </div>`;

    sortedYears.forEach(y => {
        const isYearActive = _shSelectedYear === y && _shSelectedMonth === 'all';
        const yearTotal = Object.values(yearMonthMap[y]).reduce((a, b) => a + b, 0);
        
        html += `<div onclick="event.stopPropagation(); _shSelectYearMonth(${y}, 'all')" style="padding: 4px 8px; margin-top: 4px; margin-bottom: 2px; border-radius: 6px; cursor: pointer; font-weight: 700; color: ${_shSelectedYear === y ? '#059669' : '#1e293b'}; background: ${isYearActive ? '#ecfdf5' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;">
            <span>🗓️ Năm ${y}</span>
            <span style="font-size: 10px; background: ${isYearActive ? '#059669' : '#cbd5e1'}; color: ${isYearActive ? 'white' : '#475569'}; padding: 1px 6px; border-radius: 8px;">${yearTotal}</span>
        </div>`;

        const sortedMonths = Object.keys(yearMonthMap[y]).map(Number).sort((a, b) => b - a);
        html += `<div style="margin-left: 12px; border-left: 1px solid #e2e8f0; padding-left: 8px;">`;
        sortedMonths.forEach(m => {
            const isMonthActive = _shSelectedYear === y && _shSelectedMonth === m;
            const count = yearMonthMap[y][m];
            const monthLabel = m < 10 ? '0' + m : m;
            html += `<div onclick="event.stopPropagation(); _shSelectYearMonth(${y}, ${m})" style="padding: 3px 6px; margin-bottom: 2px; border-radius: 5px; cursor: pointer; font-weight: 600; color: ${isMonthActive ? '#059669' : '#64748b'}; background: ${isMonthActive ? '#ecfdf5' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='${isMonthActive ? '#ecfdf5' : '#f8fafc'}'" onmouseout="this.style.background='${isMonthActive ? '#ecfdf5' : 'transparent'}'">
                <span>Tháng ${monthLabel}</span>
                <span style="font-size: 9px; font-weight: 800; color: ${isMonthActive ? '#059669' : '#94a3b8'};">${count}</span>
            </div>`;
        });
        html += `</div>`;
    });

    html += `</div>`;
    return html;
}

function _shSelectYearMonth(year, month) {
    _shSelectedYear = year;
    _shSelectedMonth = month;
    _shPage = 1;
    _shApplySearch();
    _shRenderContent();
    _shRenderSidebar();
}

function _shSetFilter(key) {
    _shFilter = key; _shSearchVal = ''; _shCskhVal = ''; _shPage = 1;
    _shSelectedYear = 'all';
    _shSelectedMonth = 'all';
    _shAllOrdersLoaded = false;
    _shAllOrdersLoading = null;
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
async function _shOnSearch(val) {
    _shSearchVal = val; _shPage = 1;
    if (val.trim() !== '') {
        if (!_shAllOrdersLoaded) {
            if (!_shAllOrdersLoading) {
                _shAllOrdersLoading = _shLoadAllOrders();
            }
            await _shAllOrdersLoading;
        }
    }
    _shApplySearch();
    _shRenderContent();
}

async function _shLoadAllOrders() {
    try {
        const data = await apiCall('/api/shipping/orders?filter=all&page_type=ketoan');
        _shOrders = data.orders || [];
        _shCounts = data.counts || {};
        _shAllOrdersLoaded = true;
        _shRenderSidebar();
    } catch(e) {
        console.error('Error loading all orders for search:', e);
        showToast('Lỗi tải dữ liệu tìm kiếm: ' + e.message, 'error');
    } finally {
        _shAllOrdersLoading = null;
    }
}

// ===== DATA PIPELINE =====
async function _shLoadOrders() {
    const el = document.getElementById('shContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';
    _shAllOrdersLoaded = false;
    _shAllOrdersLoading = null;
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
    const q = (_shSearchVal || '').toLowerCase().trim();
    if (q) {
        list = list.filter(o => {
            return (o.order_code || '').toLowerCase().includes(q)
                || (o.customer_phone || '').toLowerCase().includes(q)
                || (o.customer_name || '').toLowerCase().includes(q);
        });
    } else {
        if (_shCskhVal) list = list.filter(o => String(o.cskh_user_id) === _shCskhVal);
        list = list.filter(o => {
            const menu = _shGetOrderMenu(o);
            if (menu.key !== _shFilter) return false;
            
            // Year & Month filter for shipped status
            if (_shFilter === 'shipped') {
                if (_shSelectedYear !== 'all') {
                    let dateObj = null;
                    if (o.shipped_at) dateObj = new Date(o.shipped_at);
                    else if (o.shipping_date) dateObj = new Date(o.shipping_date);
                    else if (o.expected_ship_date) dateObj = new Date(o.expected_ship_date);
                    else if (o.created_at) dateObj = new Date(o.created_at);
                    
                    if (!dateObj) return false;
                    const y = dateObj.getFullYear();
                    const m = dateObj.getMonth() + 1;
                    
                    if (y !== Number(_shSelectedYear)) return false;
                    if (_shSelectedMonth !== 'all' && m !== Number(_shSelectedMonth)) return false;
                }
            }
            return true;
        });
    }
    _shSearched = list;
}

function _shGetOrderMenu(o) {
    const today = new Date().toISOString().split('T')[0];
    let effDate = o.rescheduled_ship_date || o.expected_ship_date;
    if (effDate) {
        try {
            effDate = new Date(effDate).toISOString().split('T')[0];
        } catch(e) {}
    }
    if (o.shipping_status === 'shipped') {
        return { key: 'shipped', label: 'Đã Gửi', color: '#059669', bg: '#ecfdf5' };
    }
    if (o.shipping_status === 'rescheduled' && o.rescheduled_ship_date) {
        let reschedDate = o.rescheduled_ship_date;
        try { reschedDate = new Date(reschedDate).toISOString().split('T')[0]; } catch(e){}
        if (reschedDate > today) {
            return { key: 'rescheduled', label: 'Chưa Gửi', color: '#d97706', bg: '#fffbeb' };
        }
    }
    if (o.shipping_status === 'pending' && effDate && effDate > today) {
        return { key: 'early', label: 'Gửi Sớm', color: '#3b82f6', bg: '#eff6ff' };
    }
    if (['pending', 'rescheduled'].includes(o.shipping_status) && effDate && effDate <= today) {
        return { key: 'today', label: 'Hôm Nay Gửi', color: '#dc2626', bg: '#fef2f2' };
    }
    return { key: 'unknown', label: 'Khác', color: '#6b7280', bg: '#f3f4f6' };
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

    const formatExpectedShipDateWithDay = (dateVal) => {
        if (!dateVal) return '—';
        const dt = new Date(dateVal);
        const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const day = localDt.getDate();
        const month = localDt.getMonth() + 1;
        const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = daysOfWeek[localDt.getDay()];
        return `${dayName} - ${day}/${month}`;
    };

    const formatActualShipDateWithDay = (dateVal) => {
        if (!dateVal) return '—';
        const dt = new Date(dateVal);
        const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const hh = String(localDt.getHours()).padStart(2, '0');
        const mm = String(localDt.getMinutes()).padStart(2, '0');
        const day = localDt.getDate();
        const month = localDt.getMonth() + 1;
        const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = daysOfWeek[localDt.getDay()];
        return `<span class="shimmer-sparkle">${hh}:${mm} ${dayName} - ${day}/${month}</span>`;
    };

    let html = `<div style="overflow-x:auto;border:2px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px;">
    <thead><tr style="background:linear-gradient(135deg,#122546,#1e3a5f);">
        ${['','Phiếu Gửi','Gửi Dự Kiến','🚛 Ngày Gửi','Hẹn Lại','Tiến Độ','Mã Đơn','KH','SĐT','CSKH','NVC DK','NVC TT','Mã VĐ','SĐT NX'].map(h => {
            const align = (h === 'Phiếu Gửi' || h === '') ? 'center' : 'left';
            return `<th style="padding:10px 8px;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;text-align:${align};">${h}</th>`;
        }).join('')}
    </tr></thead><tbody>`;

    for (const o of orders) {
        const overdue = o.is_overdue;
        const rowBg = overdue ? '#fef2f2' : '';
        const isKT = o.shipping_status !== 'shipped';

        // Check pending items and their completions
        const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
        const allPendingCompleted = pendingItems.every(item => item.all_done);

        let orderLevelAction = '';
        if (isKT && o.shipping_status !== 'shipped') {
            if (allPendingCompleted && pendingItems.length > 0) {
                // All pending items are done -> Show Gửi
                orderLevelAction = `
                    <button onclick="event.stopPropagation();_shShowOrderSlipsModal(${o.id})" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Xác nhận gửi">📤 Gửi</button>
                    <button onclick="event.stopPropagation();_shShowReschedule(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                `;
            } else {
                // Not all pending items are done -> Show Không gửi được
                orderLevelAction = `
                    <button onclick="event.stopPropagation();_shShowOrderSlipsModal(${o.id})" style="padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Chưa đủ điều kiện gửi">⚠️ Không gửi được</button>
                    <button onclick="event.stopPropagation();_shShowReschedule(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                `;
            }
        } else {
            orderLevelAction = `
                <button onclick="event.stopPropagation();_shShowShippingDetailOnly(${o.id})" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;cursor:pointer;font-size:14px;padding:4px 10px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s;" onmouseover="this.style.background='#dbeafe';this.style.transform='scale(1.05)'" onmouseout="this.style.background='#eff6ff';this.style.transform='scale(1)'" title="Xem thông tin vận chuyển">📄</button>
                <button onclick="event.stopPropagation();_shShipOrder(${o.id}, '${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;margin-top:3px;display:block;width:100%;" title="Gửi lại hoặc gửi thêm hàng cho đơn này">📤 Gửi Lại/Thêm</button>
            `;
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

        // Col 3: Gửi Dự Kiến
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;">${formatExpectedShipDateWithDay(o.expected_ship_date)}</td>`;
        // Col 4: 🚛 Ngày Gửi
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;text-align:center;white-space:nowrap;">${formatActualShipDateWithDay(o.shipped_at)}</td>`;
        // Col 5: Hẹn Lại
        html += `<td style="padding:8px 6px;font-size:11px;">${o.rescheduled_ship_date ? `<span style="color:#d97706;font-weight:700;">📅 ${fmt(o.rescheduled_ship_date)}</span>` : '<span style="color:#d1d5db;">—</span>'}</td>`;
        // Col 6: Progress
        html += `<td style="padding:8px 6px;">${progressBadge}</td>`;
        
        // Col 7: Order code + Priority (combined)
        const prio = (o.shipping_priority || 'CHUẨN').toUpperCase();
        let prioBadgeHtml = '';
        if (prio === 'GẤP') {
            prioBadgeHtml = `<span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:2.5px 6px;border-radius:6px;font-size:10px;font-weight:800;margin-right:6px;display:inline-block;vertical-align:middle;line-height:1;">GẤP</span>`;
        } else if (prio === 'GỬI') {
            prioBadgeHtml = `<span style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:2.5px 6px;border-radius:6px;font-size:10px;font-weight:800;margin-right:6px;display:inline-block;vertical-align:middle;line-height:1;">GỬI</span>`;
        } else {
            prioBadgeHtml = `<span style="background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;padding:2.5px 6px;border-radius:6px;font-size:10px;font-weight:800;margin-right:6px;display:inline-block;vertical-align:middle;line-height:1;">Chuẩn</span>`;
        }
        html += `<td style="padding:8px 6px;font-weight:800;color:#1e293b;font-size:12px;white-space:nowrap;">
            <div style="display:flex;align-items:center;">
                ${prioBadgeHtml}
                <span style="font-size:12px;font-weight:900;color:#1e1b4b;letter-spacing:0.5px;">${o.order_code || '—'}</span>
            </div>
        </td>`;

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
        html += '</tr>';

        // Sub-row for items/slips
        const itemsTableHtml = _shBuildItemsTable(o);
        html += `<tr id="shItemsRow_${o.id}" style="display:none;background:#f8fafc;border-bottom:1.5px solid #cbd5e1;">
            <td colspan="14" style="padding:12px 16px;">
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
                <th style="padding:6px 8px;text-align:left;font-weight:700;width:220px;">Mã Phiếu đơn</th>
                <th style="padding:6px 8px;text-align:center;font-weight:700;width:60px;">SL</th>
                <th style="padding:6px 8px;text-align:left;font-weight:700;">Tiến độ bộ phận</th>
                <th style="padding:6px 8px;text-align:center;font-weight:700;width:110px;">Trạng thái gửi</th>
                <th style="padding:6px 8px;text-align:center;font-weight:700;width:140px;">Thao tác</th>
            </tr>
        </thead>
        <tbody>`;

    for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const trStyle = `border-bottom:1px solid #f1f5f9;`;
        
        let actionHtml = '';
        if (item.shipping_status === 'shipped') {
            actionHtml = `<button onclick="event.stopPropagation();_shShipOrder(${order.id},'${(order.order_code||'').replace(/'/g,"\\'")}')" style="padding:3px 8px;border:none;border-radius:4px;background:#4f46e5;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;" title="Gửi lại hoặc gửi thêm hàng cho đơn này">🔁 Gửi lại</button>`;
        } else {
            if (item.all_done) {
                actionHtml = `<button onclick="event.stopPropagation();_shShipOrder(${order.id},'${(order.order_code||'').replace(/'/g,"\\'")}', ${item.item_id}, '${(item.product_name||'').replace(/'/g,"\\'")}', 'Phiếu ${i + 1}')" style="padding:3px 8px;border:none;border-radius:4px;background:#10b981;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">📤 Gửi Phiếu</button>`;
            } else {
                actionHtml = `<button onclick="event.stopPropagation();_shAlertCannotShip('${(item.product_name||'').replace(/'/g,"\\'")}', '${item.missing_steps.join(', ')}', '${(order.order_code||'').replace(/'/g,"\\'")}', ${order.id})" style="padding:3px 8px;border:none;border-radius:4px;background:#ef4444;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">⚠️ Không gửi được</button>`;
            }
        }

        const progressHtml = _shBuildProgressHTML(item);
        const statusBadge = item.shipping_status === 'shipped' 
            ? `<span style="background:#ecfdf5;color:#047857;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">✅ Đã gửi</span>` 
            : `<span style="background:#fffbeb;color:#b45309;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">⏳ Chờ gửi</span>`;

        html += `<tr style="${trStyle}">
            <td style="padding:6px 8px;font-weight:600;color:#1e293b;">
                <div>🏷️ Phiếu ${i + 1}: ${item.product_name}</div>
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

function _shShowAlert(title, contentHtml, width = '480px', backBtnHtml = '', headerStyle = '', icon = '⚠️') {
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
    
    const hStyle = headerStyle || 'background:linear-gradient(135deg,#ef4444,#dc2626);';
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:${width};max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;animation:shAlertSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="${hStyle}padding:18px 24px;color:white;display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">${icon}</span>
            <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;">${title}</div>
        </div>
        <div style="padding:22px 24px;font-size:13px;color:#334155;line-height:1.6;max-height:60vh;overflow-y:auto;">
            ${contentHtml}
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">
            ${backBtnHtml}
            <button onclick="document.getElementById('shAlertModal')?.remove()" style="padding:8px 20px;border:none;border-radius:8px;background:#374151;color:white;cursor:pointer;font-weight:700;font-size:13px;transition:background 0.2s;" onmouseover="this.style.background='#1f2937'" onmouseout="this.style.background='#374151'">Đóng</button>
        </div>
    </div>`;

    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

function _shAlertCannotShip(itemName, missing, orderCode, orderId = null) {
    const missingBadges = missing.split(', ').map(step => 
        `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11px;margin:2px 4px 2px 0;">${step}</span>`
    ).join('');

    const html = `
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>Phiếu sản phẩm <b style="color:#1e293b;font-size:14px;">"${itemName}"</b> chưa đủ điều kiện để gửi hàng.</div>
            ${orderCode ? `<a href="/trasoatdonhang?search=${orderCode}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#4f46e5;color:white;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 4px rgba(79,70,229,0.15)">🔍 Tra Soát Đơn</a>` : ''}
        </div>
        <div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="font-weight:700;color:#c2410c;margin-bottom:6px;font-size:12px;">🔴 Các bộ phận chưa hoàn thành:</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">${missingBadges}</div>
        </div>
        <div style="color:#64748b;font-size:12px;margin-top:12px;">Vui lòng đốc thúc các bộ phận liên quan hoàn thành để kế toán có thể xuất hàng.</div>
    `;

    let backBtnHtml = '';
    if (orderId) {
        backBtnHtml = `<button onclick="document.getElementById('shAlertModal')?.remove();_shAlertCannotShipOrder(${orderId})" style="padding:8px 20px;border:1px solid #d97706;border-radius:8px;background:white;color:#d97706;cursor:pointer;font-weight:700;font-size:13px;margin-right:auto;display:inline-flex;align-items:center;gap:4px;">\u2190 Trở lại</button>`;
    }

    _shShowAlert('Không thể gửi phiếu hàng', html, '480px', backBtnHtml);
}

function _shAlertCannotShipOrder(orderId) {
    _shShowOrderSlipsModal(orderId);
}

function _shShowOrderSlipsModal(orderId) {
    const o = _shOrders.find(x => x.id === orderId);
    if (!o) return;

    const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
    const completedPendingItems = pendingItems.filter(item => item.all_done);
    const completedPendingIds = completedPendingItems.map(item => item.item_id);

    let html = '';
    let title = '';
    let headerStyle = '';
    let icon = '⚠️';

    const isAllDone = pendingItems.length > 0 && pendingItems.every(item => item.all_done);

    if (pendingItems.length === 0) {
        title = `Đơn hàng ${o.order_code}`;
        headerStyle = 'background:linear-gradient(135deg,#374151,#1f2937);';
        icon = '📦';
        html = `
            <div style="margin-bottom:12px;font-size:13px;color:#334155;">Đơn hàng <b style="color:#1e293b;">${o.order_code}</b> hiện tại không có phiếu sản phẩm nào ở trạng thái chờ gửi.</div>
        `;
    } else {
        let actionButtonsHtml = '';
        if (isAllDone) {
            title = `Đơn hàng sẵn sàng gửi — ${o.order_code}`;
            headerStyle = 'background:linear-gradient(135deg,#10b981,#059669);';
            icon = '📦';
            if (pendingItems.length === 1) {
                const singleItem = pendingItems[0];
                actionButtonsHtml = `<button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder(${o.id}, '${(o.order_code||'').replace(/'/g,"\\'")}', ${singleItem.item_id}, '${(singleItem.product_name||'').replace(/'/g,"\\'")}', 'Phiếu 1')" style="display:inline-flex;align-items:center;gap:6px;background:#10b981;color:white;padding:6px 12px;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(16,185,129,0.15)">📤 Gửi Đơn Hàng</button>`;
            } else {
                actionButtonsHtml = `<button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder(${o.id}, '${(o.order_code||'').replace(/'/g,"\\'")}', [${completedPendingIds.join(',')}])" style="display:inline-flex;align-items:center;gap:6px;background:#10b981;color:white;padding:6px 12px;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(16,185,129,0.15)">📤 Gửi Toàn Bộ Đơn Hàng</button>`;
            }
        } else {
            title = `Đơn hàng chưa đủ điều kiện gửi — ${o.order_code}`;
            headerStyle = 'background:linear-gradient(135deg,#ef4444,#dc2626);';
            icon = '⚠️';
            if (completedPendingIds.length > 1) {
                actionButtonsHtml = `<button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder(${o.id}, '${(o.order_code||'').replace(/'/g,"\\'")}', [${completedPendingIds.join(',')}])" style="display:inline-flex;align-items:center;gap:6px;background:#10b981;color:white;padding:6px 12px;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(16,185,129,0.15)">📤 Gửi Chung ${completedPendingIds.length} Phiếu Đã Xong</button>`;
            }
        }

        const subtitleText = isAllDone 
            ? `Đơn hàng <b style="color:#1e293b;font-size:14px;">${o.order_code}</b> hiện tại có <b style="color:#10b981;font-size:14px;">${pendingItems.length}</b> phiếu sản phẩm đã hoàn thành sản xuất:`
            : `Đơn hàng <b style="color:#1e293b;font-size:14px;">${o.order_code}</b> chưa đủ điều kiện gửi vì có phiếu sản phẩm chưa hoàn thành sản xuất:`;

        html = `
            <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>${subtitleText}</div>
                <div style="display:flex;gap:6px;align-items:center;">
                    ${actionButtonsHtml}
                    <a href="/trasoatdonhang?search=${o.order_code}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#4f46e5;color:white;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 4px rgba(79,70,229,0.15)">🔍 Tra Soát Đơn</a>
                </div>
            </div>
            
            <div style="margin-bottom:14px;">
                ${_shBuildItemsTable(o)}
            </div>
            
            <div style="color:#475569;font-size:11.5px;margin-top:14px;background:#fef3c7;border:1.5px dashed #fcd34d;padding:10px;border-radius:8px;line-height:1.5;">
                💡 <b>Mẹo cho Kế toán:</b> Bạn có thể gửi trước các phiếu đã hoàn thành xong bằng cách bấm nút <b>📤 Gửi Phiếu</b> màu xanh lá ở trên!
            </div>
        `;
    }

    _shShowAlert(title, html, '850px', '', headerStyle, icon);
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
async function _shShipOrder(id, code, itemId = null, itemName = null, itemLabel = null) {
    let o = _shOrders.find(x => x.id === id); if (!o) return;
    
    document.getElementById('shShipModal')?.remove();
    document.getElementById('shAlertModal')?.remove(); // Auto-dismiss warning modal
    const m = document.createElement('div'); m.id = 'shShipModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    
    // Show spinner/loading content inside m first
    m.innerHTML = `<div style="background:white;border-radius:16px;width:768px;max-width:98vw;box-shadow:0 25px 50px rgba(0,0,0,.3);padding:40px;text-align:center;">
        <div style="display:inline-block;width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #ea580c;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px;"></div>
        <div style="font-weight:700;color:#334155;font-size:14px;">Đang tải chi tiết đơn hàng...</div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });

    let items = [];
    let payments = [];
    let surcharges = [];
    try {
        const detailData = await apiCall(`/api/dht/orders/${id}/detail`);
        if (detailData && detailData.order) {
            o = detailData.order;
            items = detailData.items || [];
            payments = detailData.payments || [];
            surcharges = detailData.surcharges || [];
        }
    } catch (e) {
        console.error('Error loading order details for shipping modal:', e);
    }

    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const fmtMoney = n => (Number(n)||0).toLocaleString('vi-VN');
    const fmtDt = d => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };

    // Recalculate totals from items (source of truth)
    let calcBase = 0, calcVat = 0;
    for (const it of items) {
        try {
            const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]);
            const base = qs.reduce((s,x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
            calcBase += base;
            calcVat += (Number(it.item_total) || 0) - base;
        } catch(e) { calcBase += Number(it.item_total) || 0; }
    }
    if (calcVat < 0) calcVat = 0;
    const deposit = Number(o.deposit_amount) || 0;
    const vat = calcVat;
    const discount = Number(o.discount_amount) || 0;
    const surchargeTotal = surcharges.reduce((s, x) => s + Number(x.amount || 0), 0);
    const total = calcBase + calcVat + surchargeTotal - discount;
    const remaining = total - deposit;

    let carrierOpts = '<option value="">— Chọn NVC —</option>';
    _shCarriers.forEach(c => { carrierOpts += '<option value="' + c.id + '" data-name="' + c.name + '">' + c.name + '</option>'; });

    // Parse carrier_extra
    let ce = null;
    try { ce = o.carrier_extra ? (typeof o.carrier_extra === 'string' ? JSON.parse(o.carrier_extra) : o.carrier_extra) : null; } catch(e){}

    // Build Sale Dặn KT rows dynamically
    const row = (label, val) => `<tr><td style="padding:6px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:180px">${label}</td><td style="padding:6px 12px;font-size:13px;font-weight:700;color:#1e293b;word-break:break-word">${val}</td></tr>`;

    var allReminders = [];
    if (items && items.length) {
        for (const it of items) { if(it.accounting_notes) allReminders.push(it.accounting_notes); }
    }
    var reminderText = allReminders.length > 0 ? allReminders.join(' | ') : '';

    const formatExpectedShipDateWithDay = (dateVal) => {
        if (!dateVal) return '';
        const dt = new Date(dateVal);
        const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const day = localDt.getDate();
        const month = localDt.getMonth() + 1;
        const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = daysOfWeek[localDt.getDay()];
        return `${dayName} - Ngày ${day}/${month}`;
    };

    let saleKtHTML = '';
    if (o.carrier_name && o.carrier_name.trim() !== '' && o.carrier_name.trim() !== '—') {
        saleKtHTML += row('🚚 Vận Chuyển YC Của Sale', o.carrier_name);
    }
    if (ce) {
        if (ce.type === 'nha_xe') {
            if (ce.bus_name && ce.bus_name.trim() !== '' && ce.bus_name.trim() !== '—') {
                saleKtHTML += row('🚌 Tên Nhà Xe', ce.bus_name);
            }
            if (ce.bus_phone && ce.bus_phone.trim() !== '' && ce.bus_phone.trim() !== '—') {
                saleKtHTML += row('📞 SĐT Nhà Xe', '<a href="tel:'+ce.bus_phone+'" style="color:#2563eb;text-decoration:underline;">'+ce.bus_phone+'</a>');
            }
            if (ce.bus_location && ce.bus_location.trim() !== '' && ce.bus_location.trim() !== '—') {
                saleKtHTML += row('📍 Địa Điểm Xe Đỗ', ce.bus_location);
            }
            if (ce.bus_destination && ce.bus_destination.trim() !== '' && ce.bus_destination.trim() !== '—') {
                saleKtHTML += row('🗺️ Xe Đi Về Đâu', ce.bus_destination);
            }
            if (ce.bus_departure_time && ce.bus_departure_time.trim() !== '' && ce.bus_departure_time.trim() !== '—') {
                saleKtHTML += row('🕐 Giờ Xe Chạy', ce.bus_departure_time);
            }
        } else if (ce.type === 'nguoi_nhan_ho') {
            if (ce.proxy_name && ce.proxy_name.trim() !== '' && ce.proxy_name.trim() !== '—') {
                saleKtHTML += row('🤝 Người Nhận Hộ', ce.proxy_name);
            }
            if (ce.proxy_address && ce.proxy_address.trim() !== '' && ce.proxy_address.trim() !== '—') {
                saleKtHTML += row('📍 Địa Chỉ Nhận Hộ', ce.proxy_address);
            }
            if (ce.proxy_phone && ce.proxy_phone.trim() !== '' && ce.proxy_phone.trim() !== '—') {
                saleKtHTML += row('📞 SĐT Nhận Hộ', '<a href="tel:'+ce.proxy_phone+'" style="color:#2563eb;text-decoration:underline;">'+ce.proxy_phone+'</a>');
            }
        }
    }
    if (reminderText) {
        saleKtHTML += row('⚠️ Nhắc Nhở', reminderText);
    }
    if (o.sale_note_for_accountant && o.sale_note_for_accountant.trim() !== '' && o.sale_note_for_accountant.trim() !== '—') {
        saleKtHTML += row('📝 Nội Dung Dặn KT', o.sale_note_for_accountant);
    }
    var tcColor2 = (o.shipping_priority === 'GẤP') ? '#dc2626' : (o.shipping_priority === 'CHUẨN') ? '#7c3aed' : '#f59e0b';
    saleKtHTML += row('🏷️ TC Gửi', `<span style="color:${tcColor2};font-weight:900;font-size:14px">${o.shipping_priority || 'CHUẨN'}</span>`);
    
    if (o.standard_proof_image) {
        var proofHtml = `
            <div style="margin-top:4px;">
                <a href="${o.standard_proof_image}" target="_blank">
                    <img src="${o.standard_proof_image}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,0.08);" title="Bấm để phóng to">
                </a>
            </div>
        `;
        saleKtHTML += row('📷 Ảnh TC', proofHtml);
    }
    
    if (o.expected_ship_date) {
        var progressSaleHTML = '';
        var shipVN = new Date(o.expected_ship_date);
        shipVN.setHours(0,0,0,0);
        if (o.shipped_at) {
            var actualVN = new Date(o.shipped_at);
            actualVN.setHours(0,0,0,0);
            var diffDays = Math.round((shipVN - actualVN) / 86400000);
            if (diffDays > 0) {
                progressSaleHTML = '<span style="color:#0369a1;font-weight:900;font-size:14px">🚀 Nhanh ' + diffDays + ' ngày</span>';
            } else if (diffDays < 0) {
                progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Trễ ' + Math.abs(diffDays) + ' ngày</span>';
            } else {
                progressSaleHTML = '<span style="color:#059669;font-weight:900;font-size:14px">✅ Đúng hạn</span>';
            }
        } else {
            var todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            todayVN.setHours(0,0,0,0);
            var remainDays = Math.round((shipVN - todayVN) / 86400000);
            if (remainDays > 0) {
                progressSaleHTML = '<span style="color:#3b82f6;font-weight:900;font-size:14px">📅 Còn ' + remainDays + ' ngày</span>';
            } else if (remainDays < 0) {
                progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Quá hạn ' + Math.abs(remainDays) + ' ngày</span>';
            } else {
                progressSaleHTML = '<span style="color:#d97706;font-weight:900;font-size:14px">📦 Hôm nay gửi</span>';
            }
        }
        saleKtHTML += row('📊 Tiến Độ Ra Hàng', progressSaleHTML);
        saleKtHTML += row('📅 Ngày gửi dự kiến', formatExpectedShipDateWithDay(o.expected_ship_date));
    }
    
    if (o.standard_delivery_time && o.standard_delivery_time.trim() !== '' && o.standard_delivery_time.trim() !== '—') {
        var deliveryTimeHtml = `<span style="font-weight:800;color:#0369a1">${o.standard_delivery_time}</span>`;
        saleKtHTML += row('⏰ Yêu Cầu Chuẩn Giờ Hàng Ra', deliveryTimeHtml);
    }

    // Customer phone link
    const phoneHtml = o.customer_phone ? '<a href="tel:' + o.customer_phone + '" style="color:#2563eb;text-decoration:underline;">' + o.customer_phone + '</a>' : '—';

    const isReship = o.shipping_status === 'shipped' || (Number(o.ship_count) > 0);
    const isMultiple = Array.isArray(itemId);
    const itemIdsArray = isMultiple ? itemId : (itemId ? [itemId] : []);
    const modalTitle = isMultiple 
        ? `📤 Gửi Chung ${itemIdsArray.length} Phiếu — ${code}` 
        : (itemId ? `📤 Gửi  ${code} - ${itemLabel ? itemLabel.toUpperCase() : ''} - ${itemName}` : (isReship ? `📤 Gửi Lại / Thêm Hàng — ${code}` : `📤 Gửi Hàng — ${code}`));

    const backBtnHtml = isReship ? '' : '<button onclick="document.getElementById(\'shShipModal\')?.remove();_shAlertCannotShipOrder(' + id + ')" style="padding:9px 18px;border:1px solid #d97706;border-radius:8px;background:white;color:#d97706;cursor:pointer;font-weight:600;font-size:13px;margin-right:auto;display:inline-flex;align-items:center;gap:4px;">← Trở lại</button>';

    // Build items, payments, and financial HTML
    var itemsHTML = '';
    if (items.length > 0) {
        itemsHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px;margin-bottom:16px;overflow:hidden">`;
        itemsHTML += `<div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:12px">📦 Chi tiết đơn hàng <span style="background:#fbbf24;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${items.length}</span></div>`;
        itemsHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">`;
        itemsHTML += `<thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:6px;text-align:left;font-size:10px">PHỐI</th><th style="padding:6px;text-align:left;font-size:10px">SẢN PHẨM</th><th style="padding:6px;text-align:left;font-size:10px">CHẤT LIỆU</th><th style="padding:6px;text-align:left;font-size:10px">MÀU</th><th style="padding:6px;text-align:center;font-size:10px">SL</th><th style="padding:6px;text-align:right;font-size:10px">ĐƠN GIÁ</th><th style="padding:6px;text-align:center;font-size:10px">VAT</th><th style="padding:6px;text-align:right;font-size:10px;white-space:nowrap">THÀNH TIỀN</th></tr></thead><tbody>`;
        const _phoiColors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626'];
        const _phoiBgs = ['#f5f3ff','#eff6ff','#ecfdf5','#fffbeb','#fef2f2'];
        for (let idx = 0; idx < items.length; idx++) {
            const it = items[idx];
            const saleText = (it.sale_type || '').toLowerCase();
            const isBan = saleText === 'bán' || saleText === 'ban';
            const saleBadge = isBan ? '<span style="background:#059669;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">Bán</span>' : '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">Quà</span>';
            let itVat = 0;
            try { const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]); const base = qs.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0); if(base>0 && Number(it.item_total)>base) itVat=Math.round((Number(it.item_total)-base)/base*100); } catch(e){}
            let matPairs = [];
            try { matPairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e){}
            if (matPairs.length === 0) {
                matPairs = [{ material_name: it.material_name || '—', color_name: it.color_name || '—' }];
            }
            const totalQty = it.quantity || 0;
            for (let pi = 0; pi < matPairs.length; pi++) {
                const mp = matPairs[pi];
                const isFirst = pi === 0;
                const pColor = _phoiColors[idx % _phoiColors.length];
                const pBg = _phoiBgs[idx % _phoiBgs.length];
                const pLabel = matPairs.length > 1 ? `PHỐI ${pi+1}` : '';
                const phieuLabel = `Phiếu ${idx+1}`;
                const labelText = pLabel ? `${pLabel} — ${phieuLabel}` : phieuLabel;
                itemsHTML += `<tr style="border-bottom:1px solid #f1f5f9;border-left:4px solid ${pColor};background:${isFirst ? '' : pBg}">`;
                itemsHTML += `<td style="padding:6px"><div style="font-size:10px;font-weight:800;color:${pColor}">${labelText}</div>${isFirst ? '<div style="margin-top:3px">'+saleBadge+'</div>' : ''}</td>`;
                itemsHTML += `<td style="padding:6px;font-weight:700;color:#1e3a8a">${isFirst ? (it.product_name || it.description || '—') : '<span style="color:#94a3b8;font-size:11px">↳ '+( it.product_name || '')+'</span>'}</td>`;
                itemsHTML += `<td style="padding:6px;font-weight:700;color:${pColor}">${mp.material_name || '—'}</td>`;
                itemsHTML += `<td style="padding:6px;font-weight:700;color:${pColor}">${mp.color_name || '—'}</td>`;
                if (isFirst) {
                    itemsHTML += `<td style="padding:6px;text-align:center;font-weight:700">${totalQty}</td>`;
                    itemsHTML += `<td style="padding:6px;text-align:right;white-space:nowrap">${fmtMoney(it.unit_price)}đ</td>`;
                    itemsHTML += `<td style="padding:6px;text-align:center;font-weight:700;color:#6366f1">${itVat > 0 ? itVat+'%' : '0%'}</td>`;
                    itemsHTML += `<td style="padding:6px;text-align:right;font-weight:800;color:#dc2626;white-space:nowrap">${fmtMoney(it.item_total || it.total)}đ</td>`;
                } else {
                    itemsHTML += `<td style="padding:6px;text-align:center;color:#94a3b8;font-size:11px">${totalQty}</td>`;
                    itemsHTML += `<td colspan="3" style="padding:6px;text-align:center;color:#94a3b8;font-size:10px;font-style:italic">Cùng giá với Phối 1</td>`;
                }
                itemsHTML += `</tr>`;
            }
        }
        itemsHTML += `</tbody></table></div></div>`;
    }

    var displayPayments = payments.slice();
    if (displayPayments.length === 0 && deposit > 0) {
        displayPayments.push({
            payment_code: '—',
            total_order_codes: o.order_code,
            amount: deposit,
            payment_date: o.order_date || o.created_at,
            payment_type: 'dat_coc',
            payment_method: null,
            transfer_note: 'Đặt cọc khi tạo đơn',
            _synthetic: true
        });
    }
    var payHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px;margin-bottom:16px">`;
    payHTML += `<div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:12px">💳 Chi tiết cọc / thanh toán <span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${displayPayments.length}</span></div>`;
    if (displayPayments.length > 0) {
        payHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">`;
        payHTML += `<thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">MÃ THANH TOÁN</th><th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700">SỐ TIỀN</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">NGÀY TT</th><th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700">LOẠI</th><th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700">NỘI DUNG</th></tr></thead><tbody>`;
        const typeLabels = { thanh_toan: 'TT', dat_coc: 'Cọc', tt_sll: 'TT SLL', pending: '⏳ Chờ', tra_lai_coc: 'Trả Lại Cọc' };
        for (const p of displayPayments) {
            payHTML += `<tr style="border-bottom:1px solid #f1f5f9${p._synthetic ? ';background:#fffbeb' : ''}">`;
            payHTML += `<td style="padding:8px 10px;font-weight:700;color:#1e40af">${p.payment_code || '—'}</td>`;
            payHTML += `<td style="padding:8px 10px;text-align:right;font-weight:800;color:#dc2626">${fmtMoney(p.amount)}đ</td>`;
            payHTML += `<td style="padding:8px 10px;text-align:center">${fmtDt(p.payment_date)}</td>`;
            payHTML += `<td style="padding:8px 10px;text-align:center"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${typeLabels[p.payment_type] || p.payment_type || '—'}</span></td>`;
            payHTML += `<td style="padding:8px 10px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(p.transfer_note||'').replace(/"/g,'&quot;')}">${p.transfer_note || '—'}</td>`;
            payHTML += `</tr>`;
        }
        payHTML += `</tbody></table></div>`;
    } else {
        payHTML += `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px">Chưa có thanh toán / cọc nào được ghi nhận</div>`;
    }
    payHTML += `</div>`;

    var surHTML = '';
    if (surcharges.length > 0) {
        surHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px;margin-bottom:16px">`;
        surHTML += `<div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:12px">📋 Phụ phí <span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${surcharges.length}</span></div>`;
        for (const sc of surcharges) {
            surHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9">`;
            surHTML += `<span style="font-weight:600;color:#334155">${sc.name || 'Phụ phí'}</span>`;
            surHTML += `<span style="font-weight:800;color:#dc2626">${fmtMoney(sc.amount)}đ</span>`;
            surHTML += `</div>`;
        }
        surHTML += `</div>`;
    }

    const shipCK = (o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck') ? (Number(o.shipping_fee) || 0) : 0;
    const finRemaining = calcBase + surchargeTotal + vat - discount - deposit - shipCK;
    const remColor = finRemaining > 0 ? '#dc2626' : '#059669';
    var finHTML = `<div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1px solid #fde68a;padding:12px;margin-bottom:16px">`;
    finHTML += `<div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:12px">💰 Tổng kết tài chính</div>`;
    const finRows = [
        ['Tổng tiền hàng (trước VAT)', fmtMoney(calcBase) + 'đ', '#1e293b', false],
        ['Phụ phí', fmtMoney(surchargeTotal) + 'đ', '#f59e0b', false],
        ['VAT', fmtMoney(vat) + 'đ', '#6366f1', false],
        ['Ưu đãi / Giảm giá', '-' + fmtMoney(discount) + 'đ', '#059669', false],
    ];
    if (o.discount_reason) {
        finRows.push(['_reason_', o.discount_reason, '#dc2626', false]);
    }
    finRows.push(
        ['Tổng Tiền Hàng Thực Tế', fmtMoney(calcBase + surchargeTotal + vat - discount) + 'đ', '#1e293b', true],
        ['Đã thanh toán (cọc)', fmtMoney(deposit) + 'đ', '#10b981', true],
    );
    if (shipCK > 0) {
        finRows.push(['🚚 Ship HV Trả CK', fmtMoney(shipCK) + 'đ', '#7c3aed', true]);
    }
    finRows.push(
        ['Còn lại', fmtMoney(finRemaining) + 'đ', remColor, true],
    );
    for (const [label, val, color, bold] of finRows) {
        if (label === '_reason_') {
            finHTML += `<div style="padding:2px 0 6px 16px;border-bottom:1px solid rgba(0,0,0,0.05)">`;
            finHTML += `<span style="font-size:11px;color:#dc2626;font-weight:700;font-style:italic">📝 Lý do: ${val}</span>`;
            finHTML += `</div>`;
            continue;
        }
        finHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05)">`;
        finHTML += `<span style="font-size:13px;color:#64748b;font-weight:${bold?700:500}">${label}</span>`;
        finHTML += `<span style="font-size:${bold?15:13}px;font-weight:${bold?900:700};color:${color}">${val}</span>`;
        finHTML += `</div>`;
    }
    finHTML += `</div>`;

    m.innerHTML = '<div style="background:white;border-radius:16px;width:768px;max-width:98vw;box-shadow:0 25px 50px rgba(0,0,0,.3);max-height:95vh;overflow-y:auto;">'
    + '<div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:18px 24px;border-radius:16px 16px 0 0;">'
    + '<div style="color:white;font-weight:800;font-size:16px;">' + modalTitle + '</div>'
    + '<div style="color:rgba(255,255,255,.6);font-size:11px;margin-top:2px;">Tiền đơn còn lại: <b style="color:#fbbf24">' + fmtMoney(remaining) + 'đ</b></div>'
    + '</div>'
    + '<div style="padding:20px 24px;">'
    // P1: Sale Dặn KT
    + '<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #fb923c;border-radius:12px;padding:16px;margin-bottom:16px;">'
    + '<div style="font-size:15px;font-weight:900;color:#9a3412;margin-bottom:12px;">📋 Sale Dặn Kế Toán Trước Gửi Hàng</div>'
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' + saleKtHTML + '</table>'
    + itemsHTML
    + payHTML
    + surHTML
    + finHTML
    + '</div>'
    // Checkbox confirm (Moved above info)
    + '<style>'
    + '@keyframes pulseBlinkConfirm {'
    + '  0% { border-color: #fb923c; box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.3); background-color: #fffbeb; }'
    + '  50% { border-color: #dc2626; box-shadow: 0 0 14px 6px rgba(220, 38, 38, 0.25); background-color: #fef2f2; }'
    + '  100% { border-color: #fb923c; box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.3); background-color: #fffbeb; }'
    + '}'
    + '.sh-blink-confirm { animation: pulseBlinkConfirm 1.8s infinite ease-in-out; transition: all 0.3s ease; }'
    + '</style>'
    + '<div class="sh-blink-confirm" style="margin: 16px 0; padding: 14px 18px; border: 2.5px solid #fb923c; border-radius: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="const chk=document.getElementById(\'shReadConfirmCheck\'); if(event.target!==chk) { chk.checked=!chk.checked; }">'
    + '<input type="checkbox" id="shReadConfirmCheck" style="width: 20px; height: 20px; cursor: pointer; accent-color: #dc2626;" onclick="event.stopPropagation()">'
    + '<label for="shReadConfirmCheck" style="font-size: 13.5px; font-weight: 900; color: #9a3412; cursor: pointer; user-select: none; display: flex; align-items: center; gap: 6px;">'
    + '👉 <span style="color: #dc2626; font-size: 14px; text-decoration: underline; text-underline-offset: 3px;">Đã Đọc Và Làm Theo Sale Dặn</span> 👈'
    + '</label>'
    + '</div>'
    // P1.5: Thông tin đơn hàng
    + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:16px;">'
    + '<div style="font-size:13px;font-weight:800;color:#334155;margin-bottom:10px;">📄 Thông tin đơn hàng</div>'
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12px;">'
    + '<span style="color:#64748b;font-weight:600;">👤 Khách hàng</span><span style="font-weight:700;color:#1e293b;">' + (o.customer_name||'—') + '</span>'
    + '<span style="color:#64748b;font-weight:600;">📞 SĐT</span><span style="font-weight:700;color:#2563eb;">' + phoneHtml + '</span>'
    + '<span style="color:#64748b;font-weight:600;">🏠 Địa chỉ</span><span style="color:#334155;">' + (o.address||'—') + '</span>'
    + '<span style="color:#64748b;font-weight:600;">🗺️ Tỉnh / TP</span><span style="font-weight:700;color:#1e293b;">' + (o.province||'—') + '</span>'
    + '</div></div>'
    // P2: NVC
    + '<div style="margin-bottom:16px;">'
    + '<label style="font-size:12px;font-weight:700;color:#374151;">🚚 Nhà Vận Chuyển <span style="color:#dc2626">*</span></label>'
    + '<select id="shCarrierSel" onchange="_shOnCarrierChange()" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;font-weight:600;">' + carrierOpts + '</select>'
    + '</div>'
    + '<div id="shDynFields" style="margin-bottom:16px;"></div>'
    // P3: Phí Ship
    + '<div id="shFeeSection" style="border-top:1px solid #e2e8f0;padding-top:14px;">'
    + '<label style="font-size:12px;font-weight:700;color:#374151;">💰 Phí Gửi Hàng <span style="color:#dc2626">*</span></label>'
    + '<div style="position:relative;margin-top:4px;margin-bottom:12px;"><input type="text" id="shFeeInput" placeholder="0" oninput="_shFmtFee()" style="width:100%;padding:9px 40px 9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-weight:700;"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:13px;font-weight:600;">đ</span></div>'
    + '<div style="display:flex;gap:12px;margin-bottom:10px;">'
    + '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">Người trả <span style="color:#dc2626">*</span></div><div style="display:flex;gap:6px;" id="shPayerBtns"><button type="button" onclick="_shToggle(\'payer\',\'hv\')" data-val="hv" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">HV trả</button><button type="button" onclick="_shToggle(\'payer\',\'khach\')" data-val="khach" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">Khách trả</button></div></div>'
    + '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">Hình thức <span style="color:#dc2626">*</span></div><div style="display:flex;gap:6px;" id="shMethodBtns"><button type="button" onclick="_shToggle(\'method\',\'ck\')" data-val="ck" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">CK</button><button type="button" onclick="_shToggle(\'method\',\'tm\')" data-val="tm" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">TM</button></div></div>'
    + '</div>'
    + '<div id="shFeeNote" style="font-size:11px;color:#6b7280;padding:6px 8px;background:#f8fafc;border-radius:6px;margin-bottom:12px;display:none;"></div>'
    + '</div>'
    + '<div id="shNoFeeNote" style="display:none;border-top:1px solid #e2e8f0;padding-top:14px;"><div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;"><span style="font-size:22px;">📦</span><div><div style="font-weight:800;font-size:12px;color:#059669;">NVC thu phí ship riêng</div><div style="font-size:11px;color:#065f46;margin-top:2px;">Không cần nhập phí gửi hàng — NVC sẽ quyết toán sau</div></div></div></div>'
    + '<div id="shPaymentSection" style="margin-top:4px;"></div>'
    + '</div>'
    // Footer
    + '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">'
    + backBtnHtml
    + '<button onclick="document.getElementById(\'shShipModal\')?.remove()" style="padding:9px 18px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">Hủy bỏ</button>'
    + '<button onclick="_shDoShip(' + id + ')" style="padding:9px 18px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;font-size:13px;">📤 Gửi Hàng</button>'
    + '</div></div>';

    window._shModalState = { 
        payer: null, 
        method: null, 
        orderId: id, 
        remaining, 
        orderCode: code, 
        selectedPaymentId: null, 
        skipPayment: false, 
        matchingPayments: [], 
        paymentLoaded: false, 
        payLaterCarrier: false, 
        itemId: isMultiple ? null : itemId, 
        itemIds: itemIdsArray 
    };
}


function _shValidatePhoneInput(inp) {
    let val = inp.value.replace(/\D/g, '');
    if (val.length > 0 && val[0] !== '0') {
        val = '';
    }
    if (val.length > 10) {
        val = val.substring(0, 10);
    }
    inp.value = val;
}
window._shValidatePhoneInput = _shValidatePhoneInput;

function _shResizeImage(file, maxW, maxH, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                if (width > maxW || height > maxH) {
                    if (width > height) {
                        height = Math.round((height * maxW) / width);
                        width = maxW;
                    } else {
                        width = Math.round((width * maxH) / height);
                        height = maxH;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob || file);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
window._shResizeImage = _shResizeImage;

async function _shHandleBillPaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            
            const hint = document.getElementById('shBillPasteHint');
            const preview = document.getElementById('shBillPastePreview');
            const hiddenInput = document.getElementById('shBillLink');
            
            if (hint) {
                hint.textContent = '⏳ Đang nén và upload ảnh...';
                hint.style.color = '#f59e0b';
                hint.style.display = 'block';
            }
            if (preview) preview.style.display = 'none';
            
            try {
                const resizedBlob = await _shResizeImage(blob, 1000, 1000, 0.75);
                
                const fd = new FormData();
                fd.append('file', resizedBlob, 'bill_' + Date.now() + '.jpg');
                
                const resp = await fetch('/api/tsam/upload', { method: 'POST', body: fd, credentials: 'include' });
                const data = await resp.json();
                
                if (data.success && data.url) {
                    const fullUrl = window.location.origin + data.url;
                    if (hiddenInput) hiddenInput.value = fullUrl;
                    if (hint) hint.style.display = 'none';
                    if (preview) {
                        preview.src = fullUrl;
                        preview.style.display = 'block';
                    }
                } else {
                    alert(data.error || 'Lỗi upload ảnh');
                    if (hint) {
                        hint.textContent = '📋 Ctrl+V để dán ảnh';
                        hint.style.color = '#94a3b8';
                    }
                }
            } catch (err) {
                alert('Lỗi xử lý ảnh: ' + err.message);
                if (hint) {
                    hint.textContent = '📋 Ctrl+V để dán ảnh';
                    hint.style.color = '#94a3b8';
                }
            }
            return;
        }
    }
}
window._shHandleBillPaste = _shHandleBillPaste;

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
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">Bill Gửi Hàng <span style="color:#dc2626">*</span></label>
             <div id="shBillPasteZone" style="border:2px dashed #cbd5e1;border-radius:8px;min-height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:#fafafa;margin-top:4px;" tabindex="0">
                 <span id="shBillPasteHint" style="color:#94a3b8;font-size:12px">📋 Ctrl+V để dán ảnh</span>
                 <img id="shBillPastePreview" style="display:none;max-width:100%;max-height:150px;border-radius:6px">
             </div>
             <input type="hidden" id="shBillLink" value="">`;
    } else if (g === 'bill_and_phone') {
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">SĐT Nhà Xe <span style="color:#dc2626">*</span></label><input id="shCarrierPhone" style="${fStyle}" placeholder="0909..." oninput="_shValidatePhoneInput(this)">
        <div style="margin-top:8px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Bill Gửi Hàng <span style="color:#dc2626">*</span></label>
            <div id="shBillPasteZone" style="border:2px dashed #cbd5e1;border-radius:8px;min-height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:#fafafa;margin-top:4px;" tabindex="0">
                <span id="shBillPasteHint" style="color:#94a3b8;font-size:12px">📋 Ctrl+V để dán ảnh</span>
                <img id="shBillPastePreview" style="display:none;max-width:100%;max-height:150px;border-radius:6px">
            </div>
            <input type="hidden" id="shBillLink" value="">
        </div>`;
    } else if (g === 'receiver_name') {
        const isNVHV = name.toLowerCase().includes('nhân viên hv') || name.toLowerCase().includes('nhan vien hv');
        const isProxy = name.toLowerCase().includes('người nhận hàng hộ') || name.toLowerCase().includes('nguoi nhan hang ho');
        const lbl = isNVHV ? 'Tên Nhân Viên Gửi Hàng' : 'Tên Người Nhận Hàng';
        const ph = isNVHV ? 'Nhập tên nhân viên gửi...' : 'Nhập tên người nhận...';
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">${lbl} <span style="color:#dc2626">*</span></label><input id="shReceiverName" style="${fStyle}" placeholder="${ph}">`;
        if (isProxy) {
            h += `<div style="margin-top:8px;">
                <label style="font-size:12px;font-weight:700;color:#374151;">SĐT Người Nhận Hộ <span style="color:#dc2626">*</span></label>
                <input id="shReceiverPhone" style="${fStyle}" placeholder="0909..." oninput="_shValidatePhoneInput(this)">
            </div>`;
        }
    }
    el.innerHTML = h;
    
    // Attach paste listener to Bill Link paste zone if present
    const pasteZone = document.getElementById('shBillPasteZone');
    if (pasteZone) {
        pasteZone.addEventListener('paste', _shHandleBillPaste);
        pasteZone.addEventListener('click', function(){ pasteZone.focus(); });
    }
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
            const isGrab = name.toLowerCase().includes('grab');
            const isProxy = name.toLowerCase().includes('người nhận hàng hộ') || name.toLowerCase().includes('nguoi nhan hang ho');
            if (isGrab || isProxy) {
                _shLoadMatchingPayments();
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
    
    // Checkbox validation
    const readConfirmCheck = document.getElementById('shReadConfirmCheck');
    if (readConfirmCheck && !readConfirmCheck.checked) {
        return alert('⚠️ Bạn bắt buộc phải tích chọn "Đã Đọc Và Làm Theo Sale Dặn" thì mới được phép gửi hàng!');
    }

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
    if (g === 'bill_link' && !bill) return alert('Vui lòng dán Bill Gửi Hàng');
    if (g === 'bill_and_phone') {
        if (!phone) return alert('Vui lòng nhập SĐT Nhà Xe');
        var phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10 || phoneDigits[0] !== '0') {
            return alert('SĐT Nhà Xe phải bắt đầu bằng số 0 và đúng 10 số');
        }
        if (!bill) return alert('Vui lòng dán Bill Gửi Hàng');
    }
    if (g === 'receiver_name') {
        if (!receiver) return alert('Vui lòng nhập Tên Người Nhận');
        const isProxy = carrierName.toLowerCase().includes('người nhận hàng hộ') || carrierName.toLowerCase().includes('nguoi nhan hang ho');
        if (isProxy) {
            const rxPhone = document.getElementById('shReceiverPhone')?.value?.trim();
            if (!rxPhone) return alert('Vui lòng nhập SĐT Người Nhận Hộ');
            const rxPhoneDigits = rxPhone.replace(/\D/g, '');
            if (rxPhoneDigits.length !== 10 || rxPhoneDigits[0] !== '0') {
                return alert('SĐT Người Nhận Hộ phải bắt đầu bằng số 0 và đúng 10 số');
            }
        }
    }
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
    if (s.payer === 'hv' && s.method === 'ck' && !s.payLaterCarrier) {
        const fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
        const target = s.remaining - fee;
        if (target > 0) {
            if (!s.selectedPaymentId) {
                return alert('⚠️ Bắt buộc phải chọn mã giao dịch thanh toán trong mục "Thanh Toán Đơn Hàng" khi chọn HV trả bằng CK!');
            }
            const selectedPayment = s.matchingPayments.find(x => x.id === s.selectedPaymentId);
            if (!selectedPayment) {
                return alert('⚠️ Không tìm thấy thông tin giao dịch đã chọn. Vui lòng chọn lại.');
            }
            if (Number(selectedPayment.amount) < target) {
                return alert('⚠️ Số tiền giao dịch được chọn (' + Number(selectedPayment.amount).toLocaleString('vi-VN') + 'đ) nhỏ hơn số tiền tối thiểu cần thanh toán (' + target.toLocaleString('vi-VN') + 'đ)!');
            }
        }
    } else if (s.paymentLoaded && s.matchingPayments && s.matchingPayments.length > 0 && !s.payLaterCarrier) {
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
        if (s.itemIds && s.itemIds.length > 0) body.item_ids = s.itemIds;
        if (tracking) body.tracking_code = tracking;
        if (bill) body.shipping_bill_link = bill;
        const isProxy = carrierName.toLowerCase().includes('người nhận hàng hộ') || carrierName.toLowerCase().includes('nguoi nhan hang ho');
        if (isProxy) {
            const rxPhone = document.getElementById('shReceiverPhone')?.value?.trim();
            if (rxPhone) body.carrier_phone = rxPhone;
        } else if (phone) {
            body.carrier_phone = phone;
        }
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
    var isHvCk = (s.payer === 'hv' && s.method === 'ck');
    
    var h = '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:14px 16px;">';
    h += '<div style="font-weight:800;font-size:13px;color:#1e40af;margin-bottom:2px;">💳 Thanh Toán Đơn Hàng</div>';
    h += '<div style="font-size:12px;color:#3b82f6;font-weight:700;margin-bottom:10px;">Số tiền cần thanh toán: <b style="font-size:15px;color:#dc2626;">' + fmtM(target) + 'đ</b></div>';
    if (payments.length === 0) {
        if (isHvCk) {
            s.skipPayment = false;
            h += '<div style="text-align:center;padding:16px;background:#fef2f2;border:1.5px dashed #fca5a5;border-radius:10px;">';
            h += '<div style="font-size:12px;color:#dc2626;font-weight:800;">⚠️ Không tìm thấy mã tiền phù hợp (Tối thiểu ' + fmtM(target) + 'đ)</div>';
            h += '<div style="font-size:11px;color:#b91c1c;margin-top:4px;">Bắt buộc phải có giao dịch chuyển khoản trên hệ thống để đối soát. Vui lòng chờ tài khoản ngân hàng đồng bộ hoặc đổi sang hình thức phí ship Tiền Mặt (TM).</div>';
            h += '</div>';
        } else {
            // No matching payments
            s.skipPayment = true;
            h += '<div style="text-align:center;padding:12px;background:rgba(255,255,255,.7);border-radius:8px;">';
            h += '<div style="font-size:12px;color:#6b7280;font-weight:600;">📭 Không tìm thấy mã tiền phù hợp</div>';
            h += '<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Gửi hàng mà không liên kết thanh toán</div>';
            h += '</div>';
        }
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
            
            var isDeficit = isHvCk && (Number(p.amount) < target);
            var border = isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0';
            var bg = isSelected ? '#eff6ff' : mlBgs[ml];
            var shadow = isSelected ? 'box-shadow:0 0 0 3px rgba(37,99,235,0.15);' : '';
            var cursor = 'pointer';
            var opacity = '1';
            
            if (isDeficit) {
                border = '1.5px solid #cbd5e1';
                bg = '#f1f5f9';
                cursor = 'not-allowed';
                opacity = '0.65';
                isSelected = false;
            }
            
            var onClickStr = isDeficit ? '' : 'onclick="_shSelectPayment(' + p.id + ')"';
            var methodIcon = p.payment_method === 'TM' ? '💰' : '🏦';
            h += '<div ' + onClickStr + ' style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:' + border + ';border-radius:10px;margin-bottom:6px;cursor:' + cursor + ';opacity:' + opacity + ';background:' + bg + ';transition:all .15s;' + shadow + '" ' + (isDeficit ? '' : 'onmouseover="this.style.borderColor=\'#93c5fd\'" onmouseout="if(window._shModalState.selectedPaymentId!==' + p.id + ')this.style.borderColor=\'#e2e8f0\'"') + '>';
            // Radio circle
            h += '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (isSelected ? '#2563eb' : '#cbd5e1') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
            if (isSelected) h += '<div style="width:10px;height:10px;border-radius:50%;background:#2563eb;"></div>';
            h += '</div>';
            // Info
            h += '<div style="flex:1;min-width:0;">';
            h += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
            h += '<span style="font-weight:800;font-size:12px;color:#1e40af;">' + (p.payment_code||'\u2014') + '</span>';
            h += '<span style="font-weight:900;font-size:13px;color:#dc2626;">' + fmtM(p.amount) + 'đ</span>';
            if (isDeficit) {
                h += '<span style="font-size:10px;font-weight:700;color:#dc2626;background:#fee2e2;padding:1.5px 6px;border-radius:4px;margin-left:auto;">⚠️ Thiếu tiền (Cần ≥ ' + fmtM(target) + 'đ)</span>';
            } else {
                h += '<span style="font-size:10px;font-weight:700;color:' + mlColors[ml] + ';">' + mlLabels[ml] + '</span>';
            }
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
        
        if (isHvCk) {
            h += '<div style="background:#fffbeb;border:1.5px dashed #f59e0b;border-radius:8px;padding:8px 12px;font-size:12px;color:#d97706;font-weight:700;text-align:center;">';
            h += '⚠️ Bắt buộc phải chọn mã tiền thanh toán (tối thiểu ' + fmtM(target) + 'đ) để gửi hàng.</div>';
        } else {
            // Skip button
            var skipActive = s.skipPayment;
            h += '<div onclick="_shToggleSkipPayment()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid ' + (skipActive ? '#f59e0b' : '#e2e8f0') + ';border-radius:8px;cursor:pointer;background:' + (skipActive ? '#fffbeb' : 'white') + ';transition:all .15s;" onmouseover="this.style.borderColor=\'#f59e0b\'" onmouseout="if(!' + skipActive + ')this.style.borderColor=\'#e2e8f0\'">';
            h += '<div style="width:18px;height:18px;border-radius:4px;border:2px solid ' + (skipActive ? '#f59e0b' : '#cbd5e1') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + (skipActive ? '#f59e0b' : 'white') + ';">';
            if (skipActive) h += '<span style="color:white;font-size:11px;font-weight:900;">✓</span>';
            h += '</div>';
            h += '<span style="font-size:12px;font-weight:600;color:' + (skipActive ? '#d97706' : '#6b7280') + ';">\u23ed\ufe0f Không thanh toán lần này</span>';
            h += '</div>';
        }
    }
    h += '</div>';
    el.innerHTML = h;
}

function _shSelectPayment(id) {
    var s = window._shModalState; if (!s) return;
    if (s.payer === 'hv' && s.method === 'ck') {
        var p = s.matchingPayments.find(x => x.id === id);
        var fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
        var target = s.remaining - fee;
        if (p && Number(p.amount) < target) {
            return; // Block selecting deficit payments
        }
    }
    s.selectedPaymentId = (s.selectedPaymentId === id) ? null : id;
    s.skipPayment = false;
    var fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    var target = s.remaining;
    if (s.payer === 'hv' && s.method === 'ck') target = s.remaining - fee;
    _shRenderPayments(target);
}

function _shToggleSkipPayment() {
    var s = window._shModalState; if (!s) return;
    if (s.payer === 'hv' && s.method === 'ck') return; // Cannot toggle skip in HV+CK
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

async function _shShowShippingDetailOnly(orderId) {
    try {
        const data = await apiCall(`/api/dht/orders/${orderId}/detail`);
        if (!data || !data.order) {
            showToast('Không tìm thấy thông tin đơn hàng', 'error');
            return;
        }
        const o = data.order;
        const items = data.items || [];
        
        const shippedItems = items.filter(it => it.shipping_status === 'shipped');
        const totalItemsCount = items.length;
        
        let shipHTML = `<div style="background:#fff;border-radius:12px;padding:4px;font-family:sans-serif;">`;
        
        if (totalItemsCount > 0 && (shippedItems.length > 0 || totalItemsCount > 1)) {
            // Header summary
            let summaryText = '';
            let summaryBg = '#f1f5f9';
            let summaryColor = '#475569';
            if (shippedItems.length === 0) {
                summaryText = `📭 Chưa gửi phiếu nào (0/${totalItemsCount} phiếu)`;
            } else if (shippedItems.length < totalItemsCount) {
                summaryText = `🚚 Đang giao hàng (Đã gửi ${shippedItems.length}/${totalItemsCount} phiếu)`;
                summaryBg = '#fff7ed';
                summaryColor = '#c2410c';
            } else {
                summaryText = `✅ Đã giao hàng thành công (${totalItemsCount}/${totalItemsCount} phiếu)`;
                summaryBg = '#f0fdf4';
                summaryColor = '#15803d';
            }
            
            shipHTML += `<div style="background:${summaryBg};color:${summaryColor};padding:10px 14px;border-radius:8px;font-weight:800;font-size:13px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                <span>${summaryText}</span>
            </div>`;
            
            // Group shipped items by batch key OR load from shipments history
            const shippedBatches = {};
            const pendingItems = [];

            if (data.shipments && data.shipments.length > 0) {
                // Load batches from backend shipments history
                for (const s of data.shipments) {
                    let labels = [];
                    try {
                        labels = typeof s.item_labels === 'string' ? JSON.parse(s.item_labels) : (s.item_labels || []);
                    } catch(e) { console.warn('Parse item_labels error:', e); }

                    const batchKey = `shipment_${s.id}`;
                    shippedBatches[batchKey] = {
                        details: {
                            id: s.id,
                            shipped_at: s.shipped_at || s.actual_ship_datetime,
                            actual_ship_datetime: s.actual_ship_datetime || s.shipped_at,
                            actual_carrier_name: s.actual_carrier_name,
                            actual_carrier_tracking_url: s.actual_carrier_tracking_url,
                            tracking_code: s.tracking_code,
                            shipping_bill_link: s.shipping_bill_link,
                            carrier_phone: s.carrier_phone,
                            receiver_name: s.receiver_name,
                            shipping_fee: s.shipping_fee,
                            shipping_fee_payer: s.shipping_fee_payer,
                            shipping_fee_method: s.shipping_fee_method,
                            shipping_payment_code: s.shipping_payment_code,
                            shipping_payment_amount: s.shipping_payment_amount,
                            shipped_by_name: s.shipped_by_name
                        },
                        labels: labels
                    };
                }
                
                // Populate pending items
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    const phieuLabel = `Phiếu ${i + 1}`;
                    if (it.shipping_status !== 'shipped') {
                        pendingItems.push({
                            label: phieuLabel,
                            name: it.product_name || it.description || 'Sản phẩm',
                            qty: it.quantity || 0
                        });
                    }
                }
            } else {
                // Fallback grouping for legacy orders
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    const phieuLabel = `Phiếu ${i + 1}`;
                    if (it.shipping_status === 'shipped') {
                        const batchKey = [
                            it.shipped_at || '',
                            it.actual_carrier_id || '',
                            it.tracking_code || '',
                            it.shipping_bill_link || '',
                            it.shipping_fee || '0',
                            it.shipping_fee_payer || '',
                            it.shipping_fee_method || '',
                            it.shipping_payment_code || '',
                            it.shipping_payment_amount || ''
                        ].join('|');
                        
                        if (!shippedBatches[batchKey]) {
                            shippedBatches[batchKey] = {
                                details: it,
                                labels: []
                            };
                        }
                        shippedBatches[batchKey].labels.push({
                            label: phieuLabel,
                            name: it.product_name || it.description || 'Sản phẩm',
                            qty: it.quantity || 0
                        });
                    } else {
                        pendingItems.push({
                            label: phieuLabel,
                            name: it.product_name || it.description || 'Sản phẩm',
                            qty: it.quantity || 0
                        });
                    }
                }
            }
            
            // Render Shipped Batches
            for (const batchKey in shippedBatches) {
                const batch = shippedBatches[batchKey];
                const it = batch.details;
                
                const carrierName = it.actual_carrier_name || '—';
                let trackingDisplay = it.tracking_code || '—';
                if (it.tracking_code && it.actual_carrier_tracking_url) {
                    const trackingUrl = it.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(it.tracking_code));
                    trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${it.tracking_code} 🔗</a>`;
                }
                
                const payerLabel = it.shipping_fee_payer === 'hv' ? 'HV trả' : it.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                const methodLabel = it.shipping_fee_method === 'ck' ? 'Chuyển Khoản' : it.shipping_fee_method === 'tm' ? 'Tiền Mặt' : '—';
                const payerColor = it.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
                const feeAmt = Number(it.shipping_fee || 0);
                
                let billHtml = '—';
                if (it.shipping_bill_link) {
                    const itBillCid = `_itBillImgModal_${o.id}_${it.id}`;
                    billHtml = `<span id="${itBillCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                    
                    (function(_cid, _origUrl) {
                        setTimeout(async function() {
                            const el = document.getElementById(_cid);
                            if (!el) return;
                            let imgSrc = _origUrl;
                            try {
                                if (_origUrl.includes('prnt.sc') || _origUrl.includes('prntscr.com')) {
                                    const r = await apiCall('/api/shipping/resolve-image?url=' + encodeURIComponent(_origUrl));
                                    if (r && r.direct_url) imgSrc = r.direct_url;
                                } else {
                                    const dm = _origUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                                    if (dm) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm[1];
                                    const dm2 = _origUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
                                    if (dm2) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm2[1];
                                }
                            } catch(e) { console.warn('[BillResolve]', e); }
                            
                            if (imgSrc && imgSrc.includes('/uploads/')) {
                                imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                            }
                            let linkHref = _origUrl;
                            if (linkHref && linkHref.includes('/uploads/')) {
                                linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                            }
                            
                            const img = document.createElement('img');
                            img.src = imgSrc;
                            img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                            img.onerror = function() {
                                el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                            };
                            img.onclick = function() {
                                showShippingBillLightbox(imgSrc);
                            };
                            el.innerHTML = '';
                            el.appendChild(img);
                        }, 100);
                    })(itBillCid, it.shipping_bill_link);
                }
                
                const timeValue = it.actual_ship_datetime ? vnFormat(it.actual_ship_datetime) : (it.shipped_at ? vnFormat(it.shipped_at) : '—');
                
                let headerHtml = '';
                if (batch.labels.length === 1) {
                    const l = batch.labels[0];
                    headerHtml = `📦 ${l.label.toUpperCase()} — ${l.name.toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${l.qty}</span>`;
                } else {
                    const itemsHeader = batch.labels.map(l => `
                        <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:2px;">
                            ${l.label.toUpperCase()}: ${l.name} (SL: ${l.qty})
                        </span>
                    `).join(' ');
                    headerHtml = `<span style="font-weight:800;color:#166534;font-size:13px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">🚛 GỬI CHUNG: ${itemsHeader}</span>`;
                }
                
                shipHTML += `
                <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 4px rgba(22,163,74,0.03)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        ${headerHtml}
                        <span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI</span>
                    </div>
                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                        <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${it.shipped_by_name || '—'}</span>
                        <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValue}</span>
                        <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierName}</span>
                        ${it.tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplay}</span>` : ''}
                        ${it.carrier_phone ? `<span style="color:#64748b;font-weight:600;">📞 SĐT Nhà Xe:</span> <span><a href="tel:${it.carrier_phone}" style="color:#2563eb;text-decoration:underline;font-weight:700">${it.carrier_phone}</a></span>` : ''}
                        ${it.receiver_name ? `<span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${it.receiver_name}</span>` : ''}
                        <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColor}">${payerLabel}</span> — <span style="font-weight:700;color:#334155">${methodLabel}</span></span>
                        <span style="color:#64748b;font-weight:600;">💰 Phí gửi hàng:</span> <span style="font-weight:800;color:#dc2626">${feeAmt.toLocaleString('vi-VN')}đ</span>
                        ${it.shipping_payment_code ? `<span style="color:#64748b;font-weight:600;">💳 Mã thanh toán:</span> <span style="font-weight:700;color:#059669">${it.shipping_payment_code}</span>` : ''}
                        ${it.shipping_payment_code ? `<span style="color:#64748b;font-weight:600;">💵 Số tiền thanh toán:</span> <span style="font-weight:700;color:#0284c7">${(Number(it.shipping_payment_amount) || 0).toLocaleString('vi-VN')}đ</span>` : ''}
                        ${it.shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtml}</div>` : ''}
                    </div>
                </div>`;
            }
            
            // Render Pending Items
            for (let i = 0; i < pendingItems.length; i++) {
                const pit = pendingItems[i];
                shipHTML += `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;opacity:0.85;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:700;color:#475569;font-size:12.5px;display:flex;align-items:center;gap:6px;">
                        📦 ${pit.label.toUpperCase()} — ${pit.name.toUpperCase()} <span style="background:#e2e8f0;color:#475569;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;">SL: ${pit.qty}</span>
                    </span>
                    <span style="background:#e2e8f0;color:#475569;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">⏳ CHỜ GỬI</span>
                </div>`;
            }
        } else {
            // Fallback to order-level shipping details
            if (o.shipping_status === 'shipped' || o.shipped_at) {
                const row = (label, val) => `<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:180px">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;word-break:break-word">${val}</td></tr>`;
                shipHTML += `<table style="width:100%;border-collapse:collapse">`;
                shipHTML += row('👤 Người Gửi', o.shipped_by_name ? `<span style="color:#2563eb;font-weight:800">${o.shipped_by_name}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>');
                shipHTML += row('📅 Ngày giờ gửi hàng', o.actual_ship_datetime ? vnFormat(o.actual_ship_datetime) : '<span style="color:#94a3b8;font-style:italic">—</span>');
                shipHTML += row('🚛 Vận Chuyển Thực Tế', o.actual_carrier_name ? `<span style="font-weight:800;color:#1e293b">${o.actual_carrier_name}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>');
                if (o.tracking_code) {
                    let _trackingDisplay = `<span style="font-weight:700;color:#1e40af;letter-spacing:0.5px">${o.tracking_code}</span>`;
                    if (o.actual_carrier_tracking_url) {
                        const _trackingUrl = o.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(o.tracking_code));
                        _trackingDisplay = `<a href="${_trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;letter-spacing:0.5px;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${o.tracking_code} 🔗</a>`;
                    }
                    shipHTML += row('📦 Mã vận đơn', _trackingDisplay);
                }
                
                let billHtml = '—';
                if (o.shipping_bill_link) {
                    const _billCid = `_billImgModal_${o.id}`;
                    billHtml = `<span id="${_billCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                    
                    (function(_cid, _origUrl) {
                        setTimeout(async function() {
                            const el = document.getElementById(_cid);
                            if (!el) return;
                            let imgSrc = _origUrl;
                            try {
                                if (_origUrl.includes('prnt.sc') || _origUrl.includes('prntscr.com')) {
                                    const r = await apiCall('/api/shipping/resolve-image?url=' + encodeURIComponent(_origUrl));
                                    if (r && r.direct_url) imgSrc = r.direct_url;
                                } else {
                                    const dm = _origUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                                    if (dm) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm[1];
                                    const dm2 = _origUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
                                    if (dm2) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm2[1];
                                }
                            } catch(e) { console.warn('[BillResolve]', e); }
                            
                            if (imgSrc && imgSrc.includes('/uploads/')) {
                                imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                            }
                            let linkHref = _origUrl;
                            if (linkHref && linkHref.includes('/uploads/')) {
                                linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                            }
                            
                            const img = document.createElement('img');
                            img.src = imgSrc;
                            img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                            img.onerror = function() {
                                el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                            };
                            img.onclick = function() {
                                showShippingBillLightbox(imgSrc);
                            };
                            el.innerHTML = '';
                            el.appendChild(img);
                        }, 100);
                    })(_billCid, o.shipping_bill_link);
                }
                shipHTML += row('📷 Bill gửi hàng', billHtml);
                if (o.shipping_payment_code) {
                    shipHTML += row('💳 Mã thanh toán', `<span style="font-weight:700;color:#059669">${o.shipping_payment_code}</span>`);
                    shipHTML += row('💵 Số tiền thanh toán', `<span style="font-weight:700;color:#0284c7">${(Number(o.shipping_payment_amount) || 0).toLocaleString('vi-VN')}đ</span>`);
                }
                shipHTML += `</table>`;
            } else {
                shipHTML += `<div style="text-align:center;padding:20px;color:#64748b;font-size:13px;font-weight:600;">📭 Đơn hàng chưa có thông tin vận chuyển.</div>`;
            }
        }
        
        shipHTML += `</div>`;
        
        const footer = `<button class="btn btn-secondary" onclick="closeModal()" style="padding:8px 24px;font-weight:bold;">Đóng</button>`;
        openModal(`🚚 Thông tin vận chuyển — ${o.order_code}`, shipHTML, footer);
    } catch(err) {
        showToast('Lỗi khi lấy thông tin vận chuyển: ' + err.message, 'error');
    }
}

function showShippingBillLightbox(url) {
    const existing = document.getElementById('shippingBillLightbox');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'shippingBillLightbox';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:sbFadeIn .2s ease';
    overlay.onclick = function() { overlay.remove(); };

    if (!document.getElementById('shippingLightboxStyles')) {
        const style = document.createElement('style');
        style.id = 'shippingLightboxStyles';
        style.textContent = `
            @keyframes sbFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain';
    img.onclick = function(e) { e.stopPropagation(); };
    overlay.appendChild(img);

    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;cursor:pointer;font-weight:700';
    closeBtn.onclick = function() { overlay.remove(); };
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function _shShowReshipModal(orderId) {
    const o = _shOrders.find(x => x.id === orderId);
    if (!o) return;

    const items = o.items || [];
    
    let html = `
        <div style="margin-bottom:14px;font-size:13.5px;color:#334155;">
            Đơn hàng <b style="color:#1e293b;">${o.order_code}</b> đã được gửi trước đó. Chọn các phiếu sản phẩm bạn muốn <b>gửi lại hoặc gửi thêm</b>:
        </div>
        <div style="margin-bottom:16px;background:white;border:1px solid #cbd5e1;border-radius:10px;padding:8px;overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:600px;">
                <thead>
                    <tr style="border-bottom:1.5px solid #cbd5e1;background:#f8fafc;color:#475569;">
                        <th style="padding:6px 8px;text-align:center;width:40px;">
                            <input type="checkbox" id="shReshipSelectAll" style="cursor:pointer;" onchange="_shReshipToggleAll(this)">
                        </th>
                        <th style="padding:6px 8px;text-align:left;font-weight:700;">Phiếu sản phẩm</th>
                        <th style="padding:6px 8px;text-align:center;font-weight:700;width:60px;">SL</th>
                        <th style="padding:6px 8px;text-align:center;font-weight:700;width:110px;">Trạng thái cũ</th>
                        <th style="padding:6px 8px;text-align:center;font-weight:700;width:100px;">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const statusBadge = item.shipping_status === 'shipped' 
            ? `<span style="background:#ecfdf5;color:#047857;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">✅ Đã gửi</span>` 
            : `<span style="background:#fffbeb;color:#b45309;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">⏳ Chờ gửi</span>`;

        html += `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px;text-align:center;">
                    <input type="checkbox" class="sh-reship-item-check" data-item-id="${item.item_id}" style="cursor:pointer;" onchange="_shReshipUpdateSubmitBtn()">
                </td>
                <td style="padding:6px 8px;font-weight:600;color:#1e293b;">
                    <div>🏷️ Phiếu ${i + 1}: ${item.product_name}</div>
                    <div style="font-size:10px;color:#64748b;font-weight:normal;margin-top:2px;">${item.description || ''}</div>
                </td>
                <td style="padding:6px 8px;text-align:center;font-weight:700;color:#334155;">${item.quantity}</td>
                <td style="padding:6px 8px;text-align:center;">${statusBadge}</td>
                <td style="padding:6px 8px;text-align:center;">
                    <button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder(${o.id},'${(o.order_code||'').replace(/'/g,"\\'")}', ${item.item_id}, '${(item.product_name||'').replace(/'/g,"\\'")}', 'Phiếu ${i + 1}')" 
                        style="padding:3px 8px;border:none;border-radius:4px;background:#4f46e5;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">
                        🔁 Gửi lại
                    </button>
                </td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;background:#f8fafc;padding:12px;border-radius:8px;border:1.5px solid #e2e8f0;">
            <div style="font-size:11.5px;color:#475569;line-height:1.4;">
                💡 <b>Chọn nhiều phiếu:</b> Tích chọn các phiếu cần gửi và bấm nút <b>Gửi lại các phiếu đã chọn</b> để xác nhận gửi chung một đợt vận đơn mới.
            </div>
            <button id="shReshipSubmitBtn" disabled 
                onclick="event.stopPropagation();_shSubmitReshipMultiple(${o.id}, '${(o.order_code||'').replace(/'/g,"\\'")}')"
                style="padding:8px 16px;border:none;border-radius:6px;background:#94a3b8;color:white;cursor:not-allowed;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.05);transition:all 0.2s;">
                📤 Gửi lại các phiếu đã chọn
            </button>
        </div>
    `;

    _shShowAlert(`Gửi Lại / Gửi Thêm — ${o.order_code}`, html, '850px', '', 'background:linear-gradient(135deg,#4f46e5,#3730a3);', '🔁');
}

function _shReshipToggleAll(selectAllCheck) {
    document.querySelectorAll('.sh-reship-item-check').forEach(chk => {
        chk.checked = selectAllCheck.checked;
    });
    _shReshipUpdateSubmitBtn();
}

function _shReshipUpdateSubmitBtn() {
    const checked = document.querySelectorAll('.sh-reship-item-check:checked');
    const btn = document.getElementById('shReshipSubmitBtn');
    if (!btn) return;
    if (checked.length > 0) {
        btn.disabled = false;
        btn.style.background = '#4f46e5';
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 4px rgba(79,70,229,0.15)';
    } else {
        btn.disabled = true;
        btn.style.background = '#94a3b8';
        btn.style.color = 'white';
        btn.style.cursor = 'not-allowed';
        btn.style.boxShadow = 'none';
    }
}

function _shSubmitReshipMultiple(orderId, orderCode) {
    const checked = document.querySelectorAll('.sh-reship-item-check:checked');
    const ids = Array.from(checked).map(chk => Number(chk.dataset.itemId));
    if (ids.length === 0) return;
    document.getElementById('shAlertModal')?.remove();
    _shShipOrder(orderId, orderCode, ids);
}

window._shShowReshipModal = _shShowReshipModal;
window._shReshipToggleAll = _shReshipToggleAll;
window._shReshipUpdateSubmitBtn = _shReshipUpdateSubmitBtn;
window._shSubmitReshipMultiple = _shSubmitReshipMultiple;

