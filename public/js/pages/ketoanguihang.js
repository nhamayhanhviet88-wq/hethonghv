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
        .dht-tiendo-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 2px 4px rgba(0,0,0,0.03);border:1px solid transparent}
        .dht-tiendo-badge:hover{transform:translateY(-1px);box-shadow:0 4px 8px rgba(0,0,0,0.08);filter:brightness(1.05)}
        .dht-tiendo-badge:active{transform:translateY(0)}
        .dht-tiendo-green{background-color:#dcfce7;color:#15803d;border-color:rgba(21,128,61,0.2)}
        .dht-tiendo-red{background-color:#fee2e2;color:#b91c1c;border-color:rgba(185,28,28,0.2)}
        .dht-tiendo-blue{background-color:#dbeafe;color:#1d4ed8;border-color:rgba(29,78,216,0.2)}
        .dht-tiendo-yellow{background-color:#fef3c7;color:#b45309;border-color:rgba(180,83,9,0.2)}
        @keyframes dhtBlink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes shPulseBlink {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
                filter: brightness(1);
                transform: scale(1);
            }
            50% {
                box-shadow: 0 0 8px 3px rgba(168, 85, 247, 0.4);
                filter: brightness(1.15);
                transform: scale(1.03);
            }
        }
        .sh-hen-homnay {
            animation: shPulseBlink 1.2s infinite ease-in-out;
            border: 1px solid #d8b4fe !important;
        }
    </style>
    <div style="max-width:1600px;margin:0 auto;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <h2 style="margin:0;font-size:22px;color:#122546;font-weight:800;display:flex;align-items:center;gap:8px;">📤 Đơn Hàng Kế Toán Gửi</h2>
            <div style="display:flex;gap:8px;align-items:center;">
                ${currentUser && currentUser.role === 'giam_doc' ? `
                <button onclick="_shOpenRescheduleLimitModal()" style="padding:8px 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:800;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(217,119,6,0.25);transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
                    📅 Giới Hạn Hẹn Lại
                </button>
                ` : ''}
                <button onclick="_shOpenCarrierSettingsModal()" style="padding:8px 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;cursor:pointer;font-weight:800;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(79,70,229,0.25);transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
                    ⚙️ Cấu hình Nhà Vận Chuyển
                </button>
            </div>
        </div>
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
    const today = vnDateStr();
    let effDate = o.rescheduled_ship_date || o.expected_ship_date;
    if (effDate) {
        try {
            effDate = vnDateStr(effDate);
        } catch(e) {}
    }
    if (o.shipping_status === 'shipped') {
        return { key: 'shipped', label: 'Đã Gửi', color: '#059669', bg: '#ecfdf5' };
    }
    if (o.shipping_status === 'rescheduled' && o.rescheduled_ship_date) {
        let reschedDate = o.rescheduled_ship_date;
        try { reschedDate = vnDateStr(reschedDate); } catch(e){}
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

function _shFormatRescheduleStatus(o) {
    if (o.shipping_status === 'shipped') {
        return { label: 'Đã Gửi', color: '#059669', bg: '#ecfdf5', class: '' };
    }
    const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
    const isEligibleToSend = pendingItems.length > 0 && pendingItems.every(item => item.all_done);
    if (isEligibleToSend) {
        return { label: 'Chờ KT Gửi', color: '#16a34a', bg: '#dcfce7', class: '' };
    }
    if (!o.last_rescheduled_at) {
        return { label: 'Chưa Hẹn', color: '#64748b', bg: '#f1f5f9', class: '' };
    }
    try {
        const reschedDateStr = vnDateStr(o.last_rescheduled_at);
        const todayStr = vnDateStr();
        const d1 = new Date(reschedDateStr + 'T00:00:00+07:00');
        const d2 = new Date(todayStr + 'T00:00:00+07:00');
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);
        
        if (diffDays === 0) {
            return { label: 'QLX Hẹn Hôm Nay', color: '#581c87', bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', class: 'sh-hen-homnay' };
        } else if (diffDays === 1) {
            return { label: 'QLX Hẹn Hôm Qua', color: '#d97706', bg: '#fffbeb', class: '' };
        } else if (diffDays === 2) {
            return { label: 'QLX Hẹn Hôm Kia', color: '#7c3aed', bg: '#f5f3ff', class: '' };
        } else {
            const day = d1.getDate();
            const month = d1.getMonth() + 1;
            return { label: `QLX Hẹn ${day}/${month}`, color: '#4b5563', bg: '#f3f4f6', class: '' };
        }
    } catch (e) {
        return { label: 'QLX Đã Hẹn', color: '#d97706', bg: '#fffbeb', class: '' };
    }
}

function _shBuildTable(orders) {
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const today = vnDateStr();

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
        ${['','Tình Trạng','Phiếu Gửi','Gửi Dự Kiến','🚛 Ngày Gửi','Hẹn Lại','Tiến Độ','Số Tiền Còn Lại','Tổng Tiền','Mã Đơn','KH','SĐT','CSKH'].map(h => {
            const align = (h === 'Phiếu Gửi' || h === 'Tình Trạng' || h === '') ? 'center' : 'left';
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
                    <button onclick="event.stopPropagation();_shShowOrderSlipsModal('${o.id}')" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Xác nhận gửi">📤 Gửi</button>
                    <button onclick="event.stopPropagation();_shShowReschedule('${o.id}','${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                    <button onclick="event.stopPropagation();_shOpenErrorModal('${o.id}')" style="padding:4px 6px;border:1px solid #dc2626;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Báo lỗi đơn hàng">🚨 Báo Lỗi</button>
                `;
            } else {
                // Not all pending items are done -> Show Không gửi được
                orderLevelAction = `
                    <button onclick="event.stopPropagation();_shShowOrderSlipsModal('${o.id}')" style="padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;" title="Chưa đủ điều kiện gửi">⚠️ Không gửi được</button>
                    <button onclick="event.stopPropagation();_shShowReschedule('${o.id}','${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                    <button onclick="event.stopPropagation();_shOpenErrorModal('${o.id}')" style="padding:4px 6px;border:1px solid #dc2626;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Báo lỗi đơn hàng">🚨 Báo Lỗi</button>
                `;
            }
        } else {
            const isSample = String(o.id).startsWith('sample_');
            orderLevelAction = `
                <button onclick="event.stopPropagation();_shShowShippingDetailOnly('${o.id}')" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;cursor:pointer;font-size:14px;padding:4px 10px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s;" onmouseover="this.style.background='#dbeafe';this.style.transform='scale(1.05)'" onmouseout="this.style.background='#eff6ff';this.style.transform='scale(1)'" title="Xem thông tin vận chuyển">📄</button>
                ${isSample ? '' : `<button onclick="event.stopPropagation();_shShipOrder('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;margin-top:3px;display:block;width:100%;" title="Gửi thêm hoặc hoàn hàng cho đơn này">📤 Gửi Thêm/Hoàn</button>`}
                <button onclick="event.stopPropagation();_shOpenErrorModal('${o.id}')" style="padding:4px 6px;border:1px solid #dc2626;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Báo lỗi đơn hàng">🚨 Báo Lỗi</button>
            `;
        }
        
        if (o.is_pending_update) {
            orderLevelAction = `
                <button onclick="event.stopPropagation();_shOpenUpdateShipmentModal('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:6px 10px;border:none;border-radius:8px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 4px 12px rgba(217,119,6,0.3);display:block;width:100%;margin-bottom:4px;" title="Cập nhật phí ship và bill">⚡ Cập nhật</button>
                <button onclick="event.stopPropagation();_shOpenErrorModal('${o.id}')" style="padding:4px 6px;border:1px solid #dc2626;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Báo lỗi đơn hàng">🚨 Báo Lỗi</button>
            `;
        }

        // Progress badge (Tiến Độ)
        let progressBadge = '';
        let tienDoClick = '';
        if (o.expected_ship_date) {
            const shipExpected = new Date(o.expected_ship_date); shipExpected.setHours(0,0,0,0);
            const _todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })); _todayVN.setHours(0,0,0,0);
            const diffDays = Math.round((_todayVN.getTime() - shipExpected.getTime()) / 86400000);
            if (o.shipped_at || o.shipping_status === 'shipped') {
                const shipActual = new Date(o.shipped_at || o.shipping_date || o.created_at); shipActual.setHours(0,0,0,0);
                const shipDiff = Math.round((shipExpected.getTime() - shipActual.getTime()) / 86400000);
                if (shipDiff > 0) {
                    progressBadge = `<span class="dht-tiendo-badge dht-tiendo-green">🚀 Nhanh ${shipDiff} ngày</span>`;
                } else if (shipDiff === 0) {
                    progressBadge = `<span class="dht-tiendo-badge dht-tiendo-green">📦 Đúng hạn</span>`;
                } else {
                    progressBadge = `<span class="dht-tiendo-badge dht-tiendo-red">⚠️ Trễ ${Math.abs(shipDiff)} ngày</span>`;
                }
            } else {
                if (diffDays < 0) {
                    progressBadge = `<span class="dht-tiendo-badge dht-tiendo-blue">⏳ Còn ${Math.abs(diffDays)} ngày</span>`;
                } else if (diffDays === 0) {
                    progressBadge = `<span class="dht-tiendo-badge dht-tiendo-yellow">📦 Hôm nay!</span>`;
                } else {
                    progressBadge = `<span class="dht-tiendo-badge dht-tiendo-red" style="animation:dhtBlink 1s infinite">🔥 Trễ ${diffDays} ngày</span>`;
                }
            }
            tienDoClick = `onclick="event.stopPropagation(); _dhtShowTraSoatModal('${o.id}', '${o.order_code}')" title="Xem tra soát tiến độ"`;
        } else {
            progressBadge = `<span style="color:#94a3b8;font-style:italic">—</span>`;
        }

        html += `<tr style="border-bottom:1px solid #f1f5f9;background:${rowBg};cursor:pointer;" onclick="window._dhtDetailSource='shipping';_dhtShowDetail('${o.id}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'" title="Xem chi tiết đơn hàng">`;
        
        // Expander column
        html += `<td style="padding:8px 6px;text-align:center;" onclick="event.stopPropagation();_shToggleOrderItems('${o.id}')">
            <span id="shChevron_${o.id}" style="font-size:14px;cursor:pointer;user-select:none;color:#64748b;font-weight:bold;padding:4px;">▶</span>
        </td>`;

        // Col: Tình Trạng
        const statusData = _shFormatRescheduleStatus(o);
        const borderStyle = statusData.class ? '' : 'border:1.5px solid #cbd5e1;';
        const statusBadge = `<span class="${statusData.class}" onclick="event.stopPropagation(); _shShowHistory('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}')" style="background:${statusData.bg};color:${statusData.color};${borderStyle}padding:4px 8px;border-radius:6px;font-size:11px;font-weight:800;white-space:nowrap;display:inline-block;cursor:pointer;" title="Xem lịch sử hẹn lại">${statusData.label}</span>`;
        html += `<td style="padding:8px 6px;text-align:center;">${statusBadge}</td>`;

        // Col 1: Action (Phiếu Gửi)
        html += `<td style="padding:8px 6px;text-align:center;">${orderLevelAction}</td>`;

        // Col 3: Gửi Dự Kiến
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;">${formatExpectedShipDateWithDay(o.expected_ship_date)}</td>`;
        // Col 4: 🚛 Ngày Gửi
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;text-align:center;white-space:nowrap;">${formatActualShipDateWithDay(o.shipped_at)}</td>`;
        // Col 5: Hẹn Lại
        html += `<td style="padding:8px 6px;font-size:11px;">${o.rescheduled_ship_date ? `<span style="color:#d97706;font-weight:700;">📅 ${fmt(o.rescheduled_ship_date)}</span>` : '<span style="color:#d1d5db;">—</span>'}</td>`;
        // Col 6: Progress
        html += `<td style="padding:8px 6px;" ${tienDoClick}>${progressBadge}</td>`;

        // Col: Số Tiền Còn Lại
        const remaining = Number(o.remaining_amount) || 0;
        const remColor = remaining > 0 ? '#dc2626' : '#059669';
        const remBg = remaining > 0 ? '#fee2e2' : '#dcfce7';
        const remBorder = remaining > 0 ? '#fca5a5' : '#86efac';
        html += `<td style="padding:8px 6px;white-space:nowrap;vertical-align:middle;">
            <span style="font-weight:800;color:${remColor};background:${remBg};border:1.5px solid ${remBorder};padding:4px 8px;border-radius:8px;font-size:12px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05);text-align:right;min-width:75px;">
                ${remaining.toLocaleString('vi-VN')}đ
            </span>
        </td>`;

        // Col: Tổng Tiền
        const totalAmount = Number(o.total_amount) || 0;
        html += `<td style="padding:8px 6px;white-space:nowrap;vertical-align:middle;">
            <span style="font-weight:800;color:#1e3a8a;background:#eff6ff;border:1.5px solid #bfdbfe;padding:4px 8px;border-radius:8px;font-size:12px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05);text-align:right;min-width:75px;">
                ${totalAmount.toLocaleString('vi-VN')}đ
            </span>
        </td>`;
        
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
                <span style="font-size:12px;font-weight:900;color:#1e1b4b;letter-spacing:0.5px;display:inline-flex;align-items:center;gap:4px;">
                    ${o.is_hoan_hang ? '🔄 <span style="background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;padding:2.5px 6px;border-radius:6px;font-size:10px;font-weight:800;display:inline-block;vertical-align:middle;line-height:1;">Hoàn</span>' : ''}${o.order_code || '—'}
                </span>
            </div>
        </td>`;

        // Col 9-10: Customer
        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.customer_name||''}">${o.customer_name || '—'}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.customer_phone || '—'}</td>`;
        // Col 11: CSKH
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.cskh_name || '—'}</td>`;
        html += '</tr>';

        // Sub-row for items/slips
        const itemsTableHtml = _shBuildItemsTable(o);
        html += `<tr id="shItemsRow_${o.id}" style="display:none;background:#f8fafc;border-bottom:1.5px solid #cbd5e1;">
            <td colspan="13" style="padding:12px 16px;">
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
            const isSample = String(order.id).startsWith('sample_');
            actionHtml = isSample ? '' : `<button onclick="event.stopPropagation();_shShipOrder('${order.id}','${(order.order_code||'').replace(/'/g,"\\'")}')" style="padding:3px 8px;border:none;border-radius:4px;background:#4f46e5;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;" title="Gửi thêm hoặc hoàn hàng cho đơn này">🔁 Gửi lại</button>`;
        } else {
            if (item.all_done) {
                actionHtml = `<button onclick="event.stopPropagation();_shShipOrder('${order.id}','${(order.order_code||'').replace(/'/g,"\\'")}', '${item.item_id}', '${(item.product_name||'').replace(/'/g,"\\'")}', 'Phiếu ${i + 1}')" style="padding:3px 8px;border:none;border-radius:4px;background:#10b981;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">📤 Gửi Phiếu</button>`;
            } else {
                actionHtml = `<button onclick="event.stopPropagation();_shAlertCannotShip('${(item.product_name||'').replace(/'/g,"\\'")}', '${item.missing_steps.join(', ')}', '${(order.order_code||'').replace(/'/g,"\\'")}', '${order.id}')" style="padding:3px 8px;border:none;border-radius:4px;background:#ef4444;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">⚠️ Không gửi được</button>`;
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
        backBtnHtml = `<button onclick="document.getElementById('shAlertModal')?.remove();_shAlertCannotShipOrder('${orderId}')" style="padding:8px 20px;border:1px solid #d97706;border-radius:8px;background:white;color:#d97706;cursor:pointer;font-weight:700;font-size:13px;margin-right:auto;display:inline-flex;align-items:center;gap:4px;">\u2190 Trở lại</button>`;
    }

    _shShowAlert('Không thể gửi phiếu hàng', html, '480px', backBtnHtml);
}

function _shAlertCannotShipOrder(orderId) {
    _shShowOrderSlipsModal(orderId);
}

function _shShowOrderSlipsModal(orderId) {
    const o = _shOrders.find(x => String(x.id) === String(orderId));
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
                actionButtonsHtml = `<button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}', '${singleItem.item_id}', '${(singleItem.product_name||'').replace(/'/g,"\\'")}', 'Phiếu 1')" style="display:inline-flex;align-items:center;gap:6px;background:#10b981;color:white;padding:6px 12px;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(16,185,129,0.15)">📤 Gửi Đơn Hàng</button>`;
            } else {
                actionButtonsHtml = `<button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}', [${completedPendingIds.map(x=>`'${x}'`).join(',')}])" style="display:inline-flex;align-items:center;gap:6px;background:#10b981;color:white;padding:6px 12px;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(16,185,129,0.15)">📤 Gửi Toàn Bộ Đơn Hàng</button>`;
            }
        } else {
            title = `Đơn hàng chưa đủ điều kiện gửi — ${o.order_code}`;
            headerStyle = 'background:linear-gradient(135deg,#ef4444,#dc2626);';
            icon = '⚠️';
            if (completedPendingIds.length > 1) {
                actionButtonsHtml = `<button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}', [${completedPendingIds.map(x=>`'${x}'`).join(',')}])" style="display:inline-flex;align-items:center;gap:6px;background:#10b981;color:white;padding:6px 12px;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(16,185,129,0.15)">📤 Gửi Chung ${completedPendingIds.length} Phiếu Đã Xong</button>`;
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
                    ${String(o.id).startsWith('sample_') ? '' : `<a href="/trasoatdonhang?search=${o.order_code}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#4f46e5;color:white;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 4px rgba(79,70,229,0.15)">🔍 Tra Soát Đơn</a>`}
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
    let o = _shOrders.find(x => String(x.id) === String(id)); if (!o) return;
    
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
    if (String(o.id).startsWith('sample_')) {
        for (const it of items) {
            calcBase += Number(it.total_amount) || (Number(it.price_per_item) * Number(it.quantity)) || 0;
        }
    } else {
        for (const it of items) {
            try {
                const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]);
                const base = qs.reduce((s,x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
                calcBase += base;
                calcVat += (Number(it.item_total) || 0) - base;
            } catch(e) { calcBase += Number(it.item_total) || 0; }
        }
    }
    if (calcVat < 0) calcVat = 0;
    const deposit = Number(o.deposit_amount) || 0;
    const vat = calcVat;
    const discount = Number(o.discount_amount) || 0;
    const surchargeTotal = surcharges.reduce((s, x) => s + Number(x.amount || 0), 0);
    const total = String(o.id).startsWith('sample_') ? calcBase : (calcBase + calcVat + surchargeTotal - discount);
    const hasCarrierPayment = payments.some(p => p.money_source === 'nha_van_chuyen');
    const shipCK = o.ship_ck_deduct !== undefined ? (Number(o.ship_ck_deduct) || 0) : ((!hasCarrierPayment && o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck' && !(o.tracking_code && o.tracking_code.trim())) ? (Number(o.shipping_fee) || 0) : 0);
    const remaining = (o.remaining_amount !== undefined && o.remaining_amount !== null) ? Number(o.remaining_amount) : (String(o.id).startsWith('sample_') ? (Number(o.remaining_amount) || 0) : Math.max(0, total - deposit - shipCK));

    let carrierOpts = '<option value="">— Chọn NVC —</option>';
    _shCarriers.forEach(c => { carrierOpts += '<option value="' + c.id + '" data-name="' + c.name + '" data-allow-update-later="' + (c.allow_update_later ? 'true' : 'false') + '">' + c.name + '</option>'; });

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
        if (String(o.id).startsWith('sample_')) {
            return `<strong>${dayName} - Ngày ${day}/${month}/${localDt.getFullYear()}</strong>`;
        }
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
                if (String(o.id).startsWith('sample_')) {
                    progressSaleHTML = '<span style="color:#0369a1;font-weight:900;font-size:14px">⏳ Còn ' + remainDays + ' ngày</span>';
                } else {
                    progressSaleHTML = '<span style="color:#3b82f6;font-weight:900;font-size:14px">📅 Còn ' + remainDays + ' ngày</span>';
                }
            } else if (remainDays < 0) {
                progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Quá hạn ' + Math.abs(remainDays) + ' ngày</span>';
            } else {
                if (String(o.id).startsWith('sample_')) {
                    progressSaleHTML = '<span style="color:#059669;font-weight:900;font-size:14px">✅ Hôm nay</span>';
                } else {
                    progressSaleHTML = '<span style="color:#d97706;font-weight:900;font-size:14px">📦 Hôm nay gửi</span>';
                }
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

    const backBtnHtml = isReship ? '' : '<button onclick="document.getElementById(\'shShipModal\')?.remove();_shAlertCannotShipOrder(\'' + id + '\')" style="padding:9px 18px;border:1px solid #d97706;border-radius:8px;background:white;color:#d97706;cursor:pointer;font-weight:600;font-size:13px;margin-right:auto;display:inline-flex;align-items:center;gap:4px;">← Trở lại</button>';

    // Build items, payments, and financial HTML
    var itemsHTML = '';
    if (items.length > 0) {
        if (String(o.id).startsWith('sample_')) {
            itemsHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:12px;margin-bottom:16px;overflow:hidden">`;
            itemsHTML += `<div style="font-weight:800;font-size:14px;color:#059669;margin-bottom:12px">👕 Chi Tiết Sản Phẩm Gửi</div>`;
            itemsHTML += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">`;
            itemsHTML += `<thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:6px;text-align:left;font-size:10px">PHÂN LOẠI</th><th style="padding:6px;text-align:left;font-size:10px">LĨNH VỰC</th><th style="padding:6px;text-align:left;font-size:10px">SẢN PHẨM / NỘI DUNG</th><th style="padding:6px;text-align:center;font-size:10px">SL</th><th style="padding:6px;text-align:right;font-size:10px">ĐƠN GIÁ</th><th style="padding:6px;text-align:right;font-size:10px;white-space:nowrap">TỔNG TIẾN</th></tr></thead><tbody>`;
            for (let idx = 0; idx < items.length; idx++) {
                const it = items[idx];
                const typeText = it.category || 'Gửi mẫu áo';
                const lvText = it.linh_vuc || '—';
                const lvBadge = lvText !== '—' ? `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${lvText}</span>` : '—';
                
                itemsHTML += `<tr style="border-bottom:1px solid #f1f5f9;">`;
                itemsHTML += `<td style="padding:8px 6px;font-weight:700;color:#1e293b">${typeText}</td>`;
                itemsHTML += `<td style="padding:8px 6px">${lvBadge}</td>`;
                itemsHTML += `<td style="padding:8px 6px;font-weight:700;color:#1e3a8a">${it.product_name || '—'}</td>`;
                itemsHTML += `<td style="padding:8px 6px;text-align:center;font-weight:700">${it.quantity || 0}</td>`;
                itemsHTML += `<td style="padding:8px 6px;text-align:right;white-space:nowrap">${fmtMoney(it.price_per_item || 0)}đ</td>`;
                itemsHTML += `<td style="padding:8px 6px;text-align:right;font-weight:800;color:#059669;white-space:nowrap">${fmtMoney(it.total_amount || 0)}đ</td>`;
                itemsHTML += `</tr>`;
            }
            itemsHTML += `</tbody></table></div></div>`;
        } else {
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
        const typeLabels = { thanh_toan: 'Thanh Toán', dat_coc: 'Cọc', tt_sll: 'TT SLL', pending: '⏳ Chờ', tra_lai_coc: 'Trả Lại Cọc' };
        for (const p of displayPayments) {
            payHTML += `<tr style="border-bottom:1px solid #f1f5f9${p._synthetic ? ';background:#fffbeb' : ''}">`;
            payHTML += `<td style="padding:8px 10px;font-weight:700;color:#1e40af">${p.payment_code || '—'}</td>`;
            payHTML += `<td style="padding:8px 10px;text-align:right;font-weight:800;color:#dc2626">${fmtMoney(p.amount)}đ</td>`;
            payHTML += `<td style="padding:8px 10px;text-align:center">${fmtDt(p.payment_date)}</td>`;
            
            let badgeStyle = 'background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
            let typeText = typeLabels[p.payment_type] || p.payment_type || '—';
            
            if (p.money_source === 'nha_van_chuyen') {
                badgeStyle = 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                typeText = 'NVC';
            } else if (p.money_source === 'khach_hang_sll' || p.payment_type === 'tt_sll' || p.payment_type === 'child_sll') {
                badgeStyle = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;';
                typeText = 'KH SLL';
            } else if (p.payment_type === 'dat_coc') {
                badgeStyle = 'background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;text-shadow:0 1px 2px rgba(0,0,0,.15);';
                typeText = 'Đặt Cọc';
            } else if (p.payment_type === 'thanh_toan') {
                badgeStyle = 'background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;display:inline-block;';
                typeText = 'Thanh Toán';
            }
            payHTML += `<td style="padding:8px 10px;text-align:center"><span style="${badgeStyle}">${typeText}</span></td>`;
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

    const finRemaining = (o.remaining_amount !== undefined && o.remaining_amount !== null) ? Number(o.remaining_amount) : (String(o.id).startsWith('sample_') ? (Number(o.remaining_amount) || 0) : Math.max(0, calcBase + surchargeTotal + vat - discount - deposit - shipCK));
    const remColor = finRemaining > 0 ? '#dc2626' : '#059669';
    var finHTML = `<div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1px solid #fde68a;padding:12px;margin-bottom:16px">`;
    finHTML += `<div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:12px">💰 Tổng kết tài chính</div>`;
    let finRows = [];
    if (String(o.id).startsWith('sample_')) {
        const otherPaid = Math.max(0, (Number(o.total_amount) || 0) - (Number(o.remaining_amount) || 0) - (Number(deposit) || 0) - shipCK);
        const totalPaid = (Number(deposit) || 0) + otherPaid;
        finRows.push(
            ['Tổng Tiền Hàng Thực Tế', fmtMoney(calcBase) + 'đ', '#1e293b', true],
            ['Đã thanh toán (cọc)', fmtMoney(totalPaid) + 'đ', '#10b981', true]
        );
        if (shipCK > 0) {
            finRows.push(['🚚 Cước Vận Chuyển (HV Trả CK)', fmtMoney(shipCK) + 'đ', '#f97316', true]);
        }
        finRows.push(['Còn lại', fmtMoney(finRemaining) + 'đ', remColor, true]);
    } else {
        finRows = [
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
            finRows.push(['🚚 Cước Vận Chuyển (HV Trả CK)', fmtMoney(shipCK) + 'đ', '#7c3aed', true]);
        }
        finRows.push(
            ['Còn lại', fmtMoney(finRemaining) + 'đ', remColor, true],
        );
    }
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
    + '<table style="width:100%;border-collapse:collapse;">' + saleKtHTML + '</table>'
    + '</div>'
    + itemsHTML
    + payHTML
    + surHTML
    + finHTML
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
    + '</div>'
    + (o.sample_image ? 
        '<div style="text-align:center;margin-top:14px;background:#ffffff;padding:12px;border-radius:8px;border:1.5px dashed #cbd5e1">'
        + '<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">🖼️ HÌNH ẢNH MẪU CHỤP</div>'
        + '<a href="' + o.sample_image + '" target="_blank">'
        + '<img src="' + o.sample_image + '" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.08);" title="Bấm để phóng to">'
        + '</a>'
        + '</div>'
      : '')
    + '</div>'
    // P2: NVC
    + '<div style="margin-bottom:16px;">'
    + '<label style="font-size:12px;font-weight:700;color:#374151;">🚚 Nhà Vận Chuyển <span style="color:#dc2626">*</span></label>'
    + '<select id="shCarrierSel" onchange="_shOnCarrierChange()" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;font-weight:600;">' + carrierOpts + '</select>'
    + '<div id="shUpdateLaterContainer" style="margin-top: 8px; display: none;">'
    + '<label style="display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; color: #d97706; cursor: pointer;">'
    + '<input type="checkbox" id="shUpdateLaterCheck" onchange="_shOnUpdateLaterChange()" style="width: 17px; height: 17px; cursor: pointer; accent-color: #d97706;">'
    + '⚡ Cập nhật phí gửi hàng & bill sau'
    + '</label>'
    + '</div>'
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
    + '<button onclick="_shDoShip(\'' + id + '\')" style="padding:9px 18px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;font-size:13px;">📤 Gửi Hàng</button>'
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


async function _shCheckTrackingDup(val) {
    const s = window._shModalState;
    if (!s) return;
    const trackingCode = String(val || '').trim();
    const warnElId = 'shTrackingCodeWarning';
    let warnEl = document.getElementById(warnElId);
    
    if (!trackingCode) {
        if (warnEl) warnEl.remove();
        const inputEl = document.getElementById('shTrackingCode');
        if (inputEl) {
            inputEl.style.borderColor = '#e2e8f0';
            inputEl.style.background = 'white';
        }
        return;
    }
    
    try {
        const r = await apiCall(`/api/shipping/check-tracking-dup?code=${encodeURIComponent(trackingCode)}&excludeOrderId=${s.orderId}`);
        if (r.duplicate) {
            if (!warnEl) {
                warnEl = document.createElement('div');
                warnEl.id = warnElId;
                warnEl.style = 'color: #dc2626; font-size: 12px; font-weight: 700; margin-top: 6px; padding: 6px 10px; background: #fee2e2; border: 1.5px solid #fca5a5; border-radius: 6px;';
                const inputEl = document.getElementById('shTrackingCode');
                if (inputEl) {
                    inputEl.parentNode.insertBefore(warnEl, inputEl.nextSibling);
                    inputEl.style.borderColor = '#dc2626';
                    inputEl.style.background = '#fef2f2';
                }
            }
            warnEl.innerHTML = `⚠️ Mã Vận Đơn * này đã bị trùng với đơn <b>${r.order_code}</b>`;
        } else {
            if (warnEl) warnEl.remove();
            const inputEl = document.getElementById('shTrackingCode');
            if (inputEl) {
                inputEl.style.borderColor = '#e2e8f0';
                inputEl.style.background = 'white';
            }
        }
    } catch(e) {
        console.error(e);
    }
}
window._shCheckTrackingDup = _shCheckTrackingDup;

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
    const opt = sel.options[sel.selectedIndex];
    const name = opt?.dataset?.name || '';
    const allowUpdateLater = opt?.dataset?.allowUpdateLater === 'true';
    const container = document.getElementById('shUpdateLaterContainer');
    const chk = document.getElementById('shUpdateLaterCheck');
    if (container) {
        container.style.display = allowUpdateLater ? 'block' : 'none';
    }
    if (chk) {
        chk.checked = false;
    }
    
    const dynFields = document.getElementById('shDynFields');
    if (dynFields) dynFields.style.display = '';
    const feeSection = document.getElementById('shFeeSection');
    if (feeSection) feeSection.style.display = '';

    const g = _shGetCarrierGroup(name);
    const el = document.getElementById('shDynFields'); if (!el) return;
    let h = '';
    const fStyle = 'width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;';
    if (g === 'tracking_code') {
        h = `<label style="font-size:12px;font-weight:700;color:#374151;">Mã Vận Đơn <span style="color:#dc2626">*</span></label><input id="shTrackingCode" oninput="_shCheckTrackingDup(this.value)" style="${fStyle}" placeholder="Nhập mã vận đơn...">`;
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

    const updateLaterCheck = document.getElementById('shUpdateLaterCheck');
    const isPendingUpdate = updateLaterCheck && updateLaterCheck.checked;

    let tracking = '', bill = '', phone = '', receiver = '', isNoFee = false, feeRaw = '0';

    if (!isPendingUpdate) {
        // Validate conditional fields
        tracking = document.getElementById('shTrackingCode')?.value?.trim();
        bill = document.getElementById('shBillLink')?.value?.trim();
        phone = document.getElementById('shCarrierPhone')?.value?.trim();
        receiver = document.getElementById('shReceiverName')?.value?.trim();
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
        isNoFee = s.noFeeCarrier || false;
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
    }

    // Submit
    try {
        const body = {
            actual_carrier_id: Number(carrierId),
            is_pending_update: isPendingUpdate,
            shipping_fee: isPendingUpdate ? 0 : (isNoFee ? 0 : Number(feeRaw)),
            shipping_fee_payer: isPendingUpdate ? null : (isNoFee ? null : s.payer),
            shipping_fee_method: isPendingUpdate ? null : (isNoFee ? null : s.method),
            no_fee_carrier: isNoFee
        };
        if (!isPendingUpdate) {
            if (s.selectedPaymentId) body.selected_payment_id = s.selectedPaymentId;
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
        }
        if (s.itemId) body.item_id = s.itemId;
        if (s.itemIds && s.itemIds.length > 0) body.item_ids = s.itemIds;
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
    
    // Check if we need to initialize the container
    var containerExists = document.getElementById('shPaymentListContainer');
    if (!containerExists) {
        var h = '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;">';
        h += '<div style="font-weight:800;font-size:13px;color:#1e40af;">💳 Thanh Toán Đơn Hàng</div>';
        h += '<div id="shPaymentTargetAmount" style="font-size:12px;color:#3b82f6;font-weight:700;">Số tiền cần thanh toán: <b style="font-size:15px;color:#dc2626;">' + Number(target).toLocaleString('vi-VN') + 'đ</b></div>';
        
        // Search input
        h += '<div style="position:relative;display:flex;align-items:center;">';
        h += '<input type="text" id="shPaymentSearch" placeholder="🔍 Tìm mã tiền, số tiền, khách..." style="width:100%;padding:8px 12px;padding-right:30px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;outline:none;font-family:inherit;font-weight:600;color:#334155;background:#fff;" oninput="_shOnPaymentSearchInput(this.value)">';
        h += '<span id="shPaymentSearchClear" onclick="_shClearPaymentSearch()" style="position:absolute;right:10px;cursor:pointer;color:#94a3b8;font-weight:800;font-size:14px;display:none;">×</span>';
        h += '</div>';
        
        // List container
        h += '<div id="shPaymentListContainer" style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;"></div>';
        
        // Footer (skip / info)
        h += '<div id="shPaymentFooter"></div>';
        h += '</div>';
        
        el.innerHTML = h;
    } else {
        // Update target amount text in case it changed
        var targetEl = document.getElementById('shPaymentTargetAmount');
        if (targetEl) {
            targetEl.innerHTML = 'Số tiền cần thanh toán: <b style="font-size:15px;color:#dc2626;">' + Number(target).toLocaleString('vi-VN') + 'đ</b>';
        }
    }
    
    // Render list and footer
    var q = s.searchQuery || '';
    var searchInput = document.getElementById('shPaymentSearch');
    if (searchInput) {
        searchInput.value = q;
        var clearBtn = document.getElementById('shPaymentSearchClear');
        if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    }
    
    _shRenderPaymentsList(target, q);
}

function _shRenderPaymentsList(target, q) {
    var s = window._shModalState; if (!s) return;
    var listEl = document.getElementById('shPaymentListContainer'); if (!listEl) return;
    var payments = s.matchingPayments || [];
    var isHvCk = (s.payer === 'hv' && s.method === 'ck');
    
    var query = (q || '').toLowerCase().trim();
    
    // Filter payments
    var filtered = payments.filter(p => {
        if (!query) return true;
        
        var matchCode = (p.payment_code || '').toLowerCase().includes(query);
        var matchCust = (p.customer_name || '').toLowerCase().includes(query);
        var matchPhone = (p.customer_phone || '').includes(query);
        var matchBank = (p.bank_name || '').toLowerCase().includes(query);
        var matchNote = (p.transfer_note || '').toLowerCase().includes(query);
        
        var cleanQ = query.replace(/[\.,đ]/g, '');
        var matchAmount = cleanQ && (String(p.original_amount || '').includes(cleanQ) || String(p.amount || '').includes(cleanQ) || String(p.surplus || '').includes(cleanQ));
        
        return matchCode || matchCust || matchPhone || matchBank || matchNote || matchAmount;
    });
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:24px 12px;color:#94a3b8;font-size:12px;background:#fff;border-radius:8px;border:1.5px dashed #cbd5e1;">\u2205 Không tìm thấy mã tiền phù hợp</div>';
        _shUpdatePaymentFooter(target);
        return;
    }
    
    var suggestions = [];
    var surplusList = [];
    var zeroList = [];
    
    filtered.forEach(p => {
        var isSuggestion = (Number(p.amount) > 0) && (p.match_level === 'exact' || p.match_level === 'close' || p.match_level === 'approximate');
        
        // Show suggestions at the top regardless of search query
        if (isSuggestion) {
            suggestions.push(p);
        } else if (Number(p.amount) > 0) {
            surplusList.push(p);
        } else {
            zeroList.push(p);
        }
    });
    
    var h = '';
    
    // Render Suggestions
    if (suggestions.length > 0) {
        h += '<div style="font-size:11px;font-weight:800;color:#1e40af;margin-top:4px;margin-bottom:2px;display:flex;align-items:center;gap:4px;">✨ Đề xuất phù hợp (' + suggestions.length + ')</div>';
        suggestions.forEach(p => {
            h += _shBuildPaymentRowHTML(p, target, isHvCk, 'suggestion');
        });
    }
    
    // Render Surplus > 0 (Fully display)
    if (surplusList.length > 0) {
        var title = query ? 'Mã tiền còn dư (> 0đ)' : 'Danh sách mã tiền còn dư (> 0đ)';
        h += '<div style="font-size:11px;font-weight:800;color:#059669;margin-top:6px;margin-bottom:2px;display:flex;align-items:center;gap:4px;">🟢 ' + title + ' (' + surplusList.length + ')</div>';
        
        surplusList.forEach(p => {
            h += _shBuildPaymentRowHTML(p, target, isHvCk, 'surplus');
        });
    }
    
    listEl.innerHTML = h;
    _shUpdatePaymentFooter(target);
}

function _shUpdatePaymentFooter(target) {
    var s = window._shModalState; if (!s) return;
    var el = document.getElementById('shPaymentFooter'); if (!el) return;
    var fmtM = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    
    var h = '<div style="margin-top:4px;border-top:1.5px solid #cbd5e1;padding-top:8px;display:flex;flex-direction:column;gap:6px;">';
    
    if (s.selectedPaymentId) {
        var p = s.matchingPayments.find(x => x.id === s.selectedPaymentId);
        if (p) {
            h += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">';
            h += '<div style="font-size:11.5px;color:#166534;font-weight:700;line-height:1.4;">';
            h += '👉 Đã chọn: <span style="color:#15803d;font-weight:900;">' + p.payment_code + '</span> (' + fmtM(p.amount) + 'đ)';
            h += '</div>';
            h += '<button type="button" onclick="_shSelectPayment(' + p.id + ')" style="padding:4px 8px;border:1px solid #fca5a5;background:#fef2f2;color:#ef4444;font-size:10.5px;font-weight:700;border-radius:6px;cursor:pointer;">Bỏ chọn</button>';
            h += '</div>';
        }
    } else if (s.skipPayment) {
        h += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">';
        h += '<div style="font-size:11.5px;color:#92400e;font-weight:700;line-height:1.4;">';
        h += '👉 Đang bỏ qua thanh toán lần này';
        h += '</div>';
        h += '<button type="button" onclick="_shToggleSkipPayment()" style="padding:4px 8px;border:1px solid #cbd5e1;background:#fff;color:#64748b;font-size:10.5px;font-weight:700;border-radius:6px;cursor:pointer;">Hủy bỏ qua</button>';
        h += '</div>';
    } else {
        var isHvCk = (s.payer === 'hv' && s.method === 'ck');
        if (isHvCk) {
            h += '<div style="font-size:11px;font-weight:700;color:#dc2626;padding:4px 8px;background:#fef2f2;border-radius:6px;border:1px solid #fca5a5;line-height:1.4;">';
            h += '⚠️ Bắt buộc phải chọn mã tiền thanh toán (tối thiểu ' + fmtM(target) + 'đ) để gửi hàng.</div>';
        } else {
            // Skip button
            var skipActive = s.skipPayment;
            h += '<div onclick="_shToggleSkipPayment()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid ' + (skipActive ? '#f59e0b' : '#e2e8f0') + ';border-radius:8px;cursor:pointer;background:' + (skipActive ? '#fffbeb' : 'white') + ';transition:all .15s;" onmouseover="this.style.borderColor=\'#f59e0b\'" onmouseout="if(!' + skipActive + ')this.style.borderColor=\'#e2e8f0\'">';
            h += '<div style="width:18px;height:18px;border-radius:4px;border:2px solid ' + (skipActive ? '#f59e0b' : '#cbd5e1') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + (skipActive ? '#f59e0b' : 'white') + ';">';
            if (skipActive) h += '<span style="color:white;font-size:11px;font-weight:900;">✓</span>';
            h += '</div>';
            h += '<span style="font-size:12px;font-weight:600;color:' + (skipActive ? '#d97706' : '#6b7280') + ';">⏭️ Không thanh toán lần này</span>';
            h += '</div>';
        }
    }
    h += '</div>';
    el.innerHTML = h;
}

function _shOnPaymentSearchInput(val) {
    var s = window._shModalState; if (!s) return;
    s.searchQuery = val;
    var fee = Number((document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'')) || 0;
    var target = s.remaining;
    if (s.payer === 'hv' && s.method === 'ck') target = s.remaining - fee;
    
    var clearBtn = document.getElementById('shPaymentSearchClear');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    
    _shRenderPaymentsList(target, val);
}

function _shClearPaymentSearch() {
    var searchInput = document.getElementById('shPaymentSearch');
    if (searchInput) searchInput.value = '';
    _shOnPaymentSearchInput('');
}

function _shBuildPaymentRowHTML(p, target, isHvCk, groupType) {
    var s = window._shModalState; if (!s) return '';
    var fmtM = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
    var fmtD = function(d) { if(!d) return '\u2014'; var dt = new Date(d); return dt.getDate()+'/'+(dt.getMonth()+1)+'/'+dt.getFullYear(); };
    
    var isSelected = s.selectedPaymentId === p.id;
    var isZero = (Number(p.amount) <= 0);
    var isDeficit = isHvCk && (Number(p.amount) < target);
    
    var mlColors = { exact:'#059669', close:'#d97706', approximate:'#6b7280', far:'#9ca3af' };
    var mlLabels = { exact:'✅ Khớp chính xác', close:'🟡 Gần giống', approximate:'⚪ Chênh lệch', far:'⚪ Xa' };
    var mlBgs = { exact:'#f0fdf4', close:'#fffbeb', approximate:'#f8fafc', far:'#f8fafc' };
    var ml = p.match_level || 'far';
    
    var border = isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0';
    var bg = isSelected ? '#eff6ff' : (isZero ? '#f1f5f9' : (groupType === 'suggestion' ? mlBgs[ml] : '#fff'));
    var shadow = isSelected ? 'box-shadow:0 0 0 3px rgba(37,99,235,0.15);' : '';
    
    var cursor = 'pointer';
    var opacity = '1';
    var canSelect = true;
    
    if (isZero || isDeficit) {
        cursor = 'not-allowed';
        opacity = '0.65';
        isSelected = false;
        canSelect = false;
        shadow = '';
        if (isSelected) {
            border = '1.5px solid #cbd5e1';
        }
    }
    
    var onClickStr = canSelect ? 'onclick="_shSelectPayment(' + p.id + ')"' : '';
    var methodIcon = p.payment_method === 'TM' ? '💰' : '🏦';
    
    var row = '<div ' + onClickStr + ' style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:' + border + ';border-radius:10px;margin-bottom:6px;cursor:' + cursor + ';opacity:' + opacity + ';background:' + bg + ';transition:all .15s;' + shadow + '" ' + (canSelect ? 'onmouseover="this.style.borderColor=\'#93c5fd\'" onmouseout="if(window._shModalState.selectedPaymentId!==' + p.id + ')this.style.borderColor=\'#e2e8f0\'"' : '') + '>';
    
    // Radio button
    row += '<div style="width:18px;height:18px;border-radius:50%;border:2px solid ' + (isSelected ? '#2563eb' : '#cbd5e1') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fff;">';
    if (isSelected) row += '<div style="width:9px;height:9px;border-radius:50%;background:#2563eb;"></div>';
    row += '</div>';
    
    // Info
    row += '<div style="flex:1;min-width:0;line-height:1.35;">';
    row += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
    row += '<span style="font-weight:800;font-size:11.5px;color:#1e40af;">' + (p.payment_code||'\u2014') + '</span>';
    
    var surplusVal = Number(p.surplus) || 0;
    var originalAmtVal = Number(p.original_amount) || Number(p.amount) || 0;
    var displayAmtVal = Number(p.amount) || 0;
    
    row += '<span style="font-weight:900;font-size:12px;color:#dc2626;">' + fmtM(displayAmtVal) + 'đ</span>';
    
    if (isZero) {
        row += '<span style="font-size:9.5px;font-weight:700;color:#64748b;background:#e2e8f0;padding:1.5px 5px;border-radius:4px;margin-left:auto;">⚠️ Hết tiền (Dư 0đ)</span>';
    } else if (isDeficit) {
        row += '<span style="font-size:9.5px;font-weight:700;color:#dc2626;background:#fee2e2;padding:1.5px 5px;border-radius:4px;margin-left:auto;">⚠️ Thiếu tiền (Cần ≥ ' + fmtM(target) + 'đ)</span>';
    } else if (groupType === 'suggestion') {
        row += '<span style="font-size:9.5px;font-weight:700;color:' + mlColors[ml] + ';margin-left:auto;">' + mlLabels[ml] + '</span>';
    } else {
        row += '<span style="font-size:9.5px;font-weight:700;color:#059669;background:#dcfce7;padding:1.5px 5px;border-radius:4px;margin-left:auto;">Dư: ' + fmtM(p.amount) + 'đ</span>';
    }
    row += '</div>';
    
    // Subtext (bank, date, chênh lệch)
    row += '<div style="font-size:10px;color:#64748b;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
    row += '<span>' + methodIcon + ' ' + (p.payment_method||'') + '</span>';
    if (p.bank_name) row += '<span>🏦 ' + p.bank_name + '</span>';
    row += '<span>📅 ' + fmtD(p.payment_date) + '</span>';
    
    if (originalAmtVal !== displayAmtVal && displayAmtVal > 0) {
        row += '<span style="color:#0ea5e9;font-weight:700;">(Gốc: ' + fmtM(originalAmtVal) + 'đ)</span>';
    }
    
    if (groupType === 'suggestion' && Number(p.diff) > 0) {
        var diff = Number(p.diff);
        row += '<span style="color:' + (diff <= 50000 ? '#d97706' : '#dc2626') + ';font-weight:700;">Chênh: ' + fmtM(diff) + 'đ</span>';
    }
    row += '</div>';
    
    if (p.transfer_note) {
        row += '<div style="font-size:9.5px;color:#9ca3af;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (p.transfer_note||'').replace(/"/g,'&quot;') + '">📝 ' + p.transfer_note + '</div>';
    }
    
    row += '</div></div>';
    return row;
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

async function _shShowReschedule(id, code) {
    document.getElementById('shRescheduleModal')?.remove();
    // Load holidays first so we have them for validation and calculating options
    await _shLoadHolidays();
    
    // Fetch reschedule limit days config
    let limitVal = null;
    try {
        const configRes = await apiCall('/api/app-config/reschedule_limit_days');
        if (configRes && configRes.value) {
            limitVal = parseInt(configRes.value, 10);
        }
    } catch(e) { console.error(e); }

    const _today = vnDateStr();
    let dateInputHtml = '';
    
    if (limitVal && limitVal > 0) {
        // Generate limitVal valid dates
        const validDates = [];
        let checkDate = new Date(_today + 'T00:00:00+07:00');
        let safetyCounter = 0;
        while (validDates.length < limitVal && safetyCounter < 100) {
            safetyCounter++;
            checkDate.setDate(checkDate.getDate() + 1);
            const y = checkDate.getFullYear();
            const m = String(checkDate.getMonth() + 1).padStart(2, '0');
            const d = String(checkDate.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            const dayOfWeek = checkDate.getDay();
            const isSunday = dayOfWeek === 0;
            const isHoliday = !!_shHolidayMap[dateStr];
            if (!isSunday && !isHoliday) {
                const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dayOfWeek];
                validDates.push({ dateStr, label: `${dayName} - ${d}/${m}/${y}` });
            }
        }
        
        dateInputHtml = `
            <select id="shNewDate" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;font-weight:700;color:#1e293b;background:white;cursor:pointer;">
                ${validDates.map(vd => `<option value="${vd.dateStr}">${vd.label}</option>`).join('')}
            </select>
        `;
    } else {
        // Fallback to normal date picker but validate Sunday + holidays
        const _tomorrow = new Date(_today);
        _tomorrow.setUTCDate(_tomorrow.getUTCDate() + 1);
        const _minDate = _tomorrow.toISOString().split('T')[0];
        dateInputHtml = `
            <input type="date" id="shNewDate" min="${_minDate}" onchange="_shCheckHoliday()" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;">
            <div id="shHolidayWarn" style="display:none;margin-top:6px;padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5;font-size:12px;color:#dc2626;font-weight:700;"></div>
        `;
    }

    const m = document.createElement('div');
    m.id = 'shRescheduleModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    m.innerHTML = `<div style="background:white;border-radius:16px;width:420px;max-width:95vw;padding:24px;box-shadow:0 25px 50px rgba(0,0,0,.3);">
        <div style="font-size:16px;font-weight:800;color:#122546;margin-bottom:16px;">📅 Hẹn Lại — ${code}</div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Ngày gửi mới <span style="color:#dc2626">*</span></label>
            ${dateInputHtml}
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Lý do <span style="color:#dc2626">*</span></label>
            <textarea id="shReason" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;resize:vertical;" placeholder="Nhập lý do hẹn lại..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('shRescheduleModal')?.remove()" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
            <button id="shRescheduleBtn" onclick="_shDoReschedule('${id}')" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:700;font-size:13px;">📅 Hẹn lại</button>
        </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
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
    
    // Check Sunday
    const d = new Date(dateVal + 'T00:00:00+07:00');
    const isSunday = d.getDay() === 0;
    const holidayName = _shHolidayMap[dateVal];
    
    if (isSunday) {
        warnEl.style.display = 'block';
        warnEl.innerHTML = '⚠️ Ngày ' + dateVal.split('-').reverse().join('/') + ' là <b>Chủ Nhật</b> — Theo quy định không được hẹn vào ngày Chủ Nhật!';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    } else if (holidayName) {
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
    
    // Double-check holiday and Sunday on client
    const d = new Date(newDate + 'T00:00:00+07:00');
    if (d.getDay() === 0) { alert('⚠️ Không được hẹn vào ngày Chủ Nhật'); return; }
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
        m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        
        const formatDayOfWeekAndDate = d => {
            if (!d) return '—';
            let dStr = typeof d === 'string' && d.includes('T') ? d.split('T')[0] : d;
            const parts = dStr.split('-');
            if (parts.length === 3) {
                const yyyy = parseInt(parts[0]);
                const mm = parseInt(parts[1]) - 1;
                const dd = parseInt(parts[2]);
                const dt = new Date(yyyy, mm, dd);
                const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dt.getDay()];
                return `${dayName} - ${String(dd).padStart(2, '0')}/${String(mm + 1).padStart(2, '0')}`;
            }
            const dt = new Date(d);
            const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dt.getDay()];
            const dd = String(dt.getDate()).padStart(2, '0');
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            return `${dayName} - ${dd}/${mm}`;
        };

        const calculateProgress = (oldDateStr, newDateStr) => {
            if (!oldDateStr || !newDateStr) return '—';
            let d1Str = oldDateStr.includes('T') ? oldDateStr.split('T')[0] : oldDateStr;
            let d2Str = newDateStr.includes('T') ? newDateStr.split('T')[0] : newDateStr;
            
            const parts1 = d1Str.split('-');
            const parts2 = d2Str.split('-');
            if (parts1.length === 3 && parts2.length === 3) {
                const dt1 = new Date(parseInt(parts1[0]), parseInt(parts1[1]) - 1, parseInt(parts1[2]));
                const dt2 = new Date(parseInt(parts2[0]), parseInt(parts2[1]) - 1, parseInt(parts2[2]));
                const diffTime = dt2.getTime() - dt1.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0) {
                    return `Chậm ${diffDays} ngày`;
                } else if (diffDays < 0) {
                    return `Nhanh ${Math.abs(diffDays)} ngày`;
                } else {
                    return `Đúng hạn`;
                }
            }
            return '—';
        };

        const formatCreatedTimeWithDayOfWeek = (dtStr) => {
            if (!dtStr) return '—';
            const date = new Date(dtStr);
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false
            });
            const parts = formatter.formatToParts(date);
            const partMap = {};
            parts.forEach(p => partMap[p.type] = p.value);
            
            const year = parseInt(partMap.year);
            const month = parseInt(partMap.month) - 1;
            const day = parseInt(partMap.day);
            const localDt = new Date(year, month, day);
            
            const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][localDt.getDay()];
            
            const hh = String(partMap.hour).padStart(2, '0');
            const mm = String(partMap.minute).padStart(2, '0');
            const ss = String(partMap.second).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const mo = String(month + 1).padStart(2, '0');
            
            return `${hh}:${mm}:${ss} ${dayName} - ${dd}/${mo}`;
        };

        m.innerHTML = `<style>
            @keyframes shHistorySlideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .sh-history-card:hover {
                border-color: #3b82f6 !important;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05) !important;
            }
            .sh-history-img:hover {
                transform: scale(1.02);
                border-color: #3b82f6 !important;
            }
        </style>
        <div style="background:white;border-radius:16px;width:550px;max-width:95vw;max-height:85vh;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;display:flex;flex-direction:column;animation:shHistorySlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 24px;display:flex;align-items:center;gap:12px;color:white;flex-shrink:0;">
                <span style="font-size:22px;">📋</span>
                <div>
                    <div style="font-weight:800;font-size:16px;letter-spacing:-0.025em;">Lịch Sử Hẹn Lại</div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Mã đơn: <span style="color:#38bdf8;font-weight:700;">${code}</span></div>
                </div>
            </div>
            
            <!-- Timeline Body -->
            <div style="padding:24px;overflow-y:auto;flex:1;background:#f8fafc;display:flex;flex-direction:column;gap:20px;">
                ${rows.length === 0 ? `
                <div style="text-align:center;color:#64748b;padding:40px 20px;">
                    <div style="font-size:40px;margin-bottom:12px;">📅</div>
                    <div style="font-weight:600;font-size:14px;">Chưa có lịch sử hẹn lại cho đơn hàng này</div>
                </div>` :
                rows.map((r, i) => {
                    const isLast = i === rows.length - 1;
                    return `
                    <div style="display:flex;gap:16px;position:relative;">
                        <!-- Timeline Connector Line -->
                        ${!isLast ? `<div style="position:absolute;left:15px;top:32px;bottom:-20px;width:2px;background:#cbd5e1;z-index:1;"></div>` : ''}
                        
                        <!-- Step Indicator Circle -->
                        <div style="width:32px;height:32px;border-radius:50%;background:#eff6ff;border:2px solid #3b82f6;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#1d4ed8;z-index:2;flex-shrink:0;box-shadow:0 2px 4px rgba(59,130,246,0.15);">
                            ${rows.length - i}
                        </div>
                        
                        <!-- Card Content Box -->
                        <div class="sh-history-card" style="flex:1;background:white;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);transition:all 0.2s;">
                            
                            <!-- Card Key-Value Information -->
                            <div style="font-size:13px;color:#1e293b;display:grid;grid-template-columns:auto 1fr;gap:6px 8px;align-items:start;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
                                <span style="color:#64748b;font-weight:600;">Ngày Gửi Dự Kiến (Sale) :</span> 
                                <span style="font-weight:700;color:#334155;">${formatDayOfWeekAndDate(r.old_date)}</span>
                                
                                <span style="color:#64748b;font-weight:600;">Ngày Hẹn Lại :</span> 
                                <span style="font-weight:700;color:#b45309;">
                                    ${r.reschedule_hour !== null && r.reschedule_minute !== null ? `${String(r.reschedule_hour).padStart(2, '0')}:${String(r.reschedule_minute).padStart(2, '0')} ` : ''}${formatDayOfWeekAndDate(r.new_date)}
                                </span>
                                
                                <span style="color:#64748b;font-weight:600;">Tiến Độ Dự Kiến :</span> 
                                <span style="font-weight:700;color:#1d4ed8;">${calculateProgress(r.old_date, r.new_date)}</span>
                            </div>
                            
                            <!-- Card Reason Body -->
                            <div style="margin-bottom:12px;">
                                <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">📝 Lý do không ra đơn đúng ngày được :</div>
                                <div style="font-size:13px;color:#334155;line-height:1.5;background:#f8fafc;border-left:3px solid #cbd5e1;padding:8px 12px;border-radius:0 8px 8px 0;font-style:italic;">
                                    "${r.reason || 'Không có lý do'}"
                                </div>
                            </div>
                            
                            <!-- Card Image -->
                            ${r.image_url ? `
                            <div style="margin-bottom:12px;">
                                <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">📸 Ảnh nhắn Sale báo thời gian lùi đơn:</div>
                                <div class="sh-history-img" style="position:relative;display:inline-block;overflow:hidden;border-radius:8px;border:1px solid #e2e8f0;width:100%;max-width:240px;aspect-ratio:16/10;background:#f1f5f9;cursor:pointer;transition:all 0.2s;"
                                     onclick="showShippingBillLightbox('${r.image_url}')">
                                    <img src="${r.image_url}" style="width:100%;height:100%;object-fit:cover;">
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Card Footer: Sender and Date -->
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;flex-wrap:wrap;gap:8px;border-top:1px dashed #e2e8f0;padding-top:8px;margin-top:8px;">
                                <span style="display:inline-flex;align-items:center;gap:4px;">
                                    👤 Người Báo Cáo : <span style="color:#0f172a;font-weight:700;">${r.rescheduled_by_name || '—'}</span>
                                </span>
                                <span style="color:#1e293b;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                                    ⏱️ ${formatCreatedTimeWithDayOfWeek(r.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            
            <!-- Footer -->
            <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:right;flex-shrink:0;">
                <button onclick="document.getElementById('shHistoryModal')?.remove()" style="padding:8px 20px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">Đóng</button>
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
        const payments = data.payments || [];
        
        const shippedItems = items.filter(it => it.shipping_status === 'shipped');
        const totalItemsCount = items.length;
        
        let shipHTML = `<div style="background:#fff;border-radius:12px;padding:4px;font-family:sans-serif;">`;
        
        if (totalItemsCount > 0) {
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
                            shipping_cashflow_code: s.shipping_cashflow_code,
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
                            it.shipping_payment_amount || '',
                            it.shipping_cashflow_code || ''
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
            let countLanGui = 0;
            let batchIdx = 0;
            for (const batchKey in shippedBatches) {
                const batch = shippedBatches[batchKey];
                const it = batch.details;
                const isReship = batchIdx > 0;
                batchIdx++;
                countLanGui++;
                
                const carrierName = it.actual_carrier_name || '—';
                let trackingDisplay = it.tracking_code || '—';
                if (it.tracking_code && it.actual_carrier_tracking_url) {
                    const trackingUrl = it.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(it.tracking_code));
                    trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${it.tracking_code} 🔗</a>`;
                }
                
                const payerLabel = it.shipping_fee_payer === 'hv' ? ((it.tracking_code && it.tracking_code.trim()) ? 'HV trả cước vận chuyển' : (it.shipping_fee_method === 'ck' ? 'HV trả CK' : (it.shipping_fee_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : it.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
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
                    if (isReship) {
                        headerHtml = `GỬI LẦN ${countLanGui} - 📦 GỬI THÊM/HOÀN: ${l.label.toUpperCase()} — ${l.name.toUpperCase()} <span style="background:#ffedd5;color:#c2410c;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${l.qty}</span>`;
                    } else {
                        headerHtml = `GỬI LẦN ${countLanGui} - 📦 ${l.label.toUpperCase()} — ${l.name.toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${l.qty}</span>`;
                    }
                } else {
                    if (isReship) {
                        const itemsHeader = batch.labels.map(l => `
                            <span style="background:#ffedd5;color:#c2410c;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:2px;">
                                ${l.label.toUpperCase()}: ${l.name} (SL: ${l.qty})
                            </span>
                        `).join(' ');
                        headerHtml = `<span style="font-weight:800;color:#c2410c;font-size:13px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">GỬI LẦN ${countLanGui} - 🚛 GỬI THÊM/HOÀN: ${itemsHeader}</span>`;
                    } else {
                        const itemsHeader = batch.labels.map(l => `
                            <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:2px;">
                                ${l.label.toUpperCase()}: ${l.name} (SL: ${l.qty})
                            </span>
                        `).join(' ');
                        headerHtml = `<span style="font-weight:800;color:#166534;font-size:13px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">GỬI LẦN ${countLanGui} - 🚛 GỬI CHUNG: ${itemsHeader}</span>`;
                    }
                }
                
                const boxBg = isReship ? '#fff7ed' : '#f0fdf4';
                const boxBorder = isReship ? '1.5px solid #fed7aa' : '1.5px solid #bbf7d0';
                const boxHeaderBorder = isReship ? '1.5px solid #ffedd5' : '1.5px solid #dcfce7';
                const boxShadow = isReship ? '0 2px 4px rgba(234,88,12,0.03)' : '0 2px 4px rgba(22,163,74,0.03)';
                const badgeHtml = isReship 
                    ? `<span style="background:#ea580c;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟠 GỬI THÊM/HOÀN</span>`
                    : `<span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI</span>`;
                
                shipHTML += `
                <div style="background:${boxBg};border:${boxBorder};border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:${boxShadow}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:${boxHeaderBorder};padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        ${headerHtml}
                        ${badgeHtml}
                    </div>
                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                        <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${(it.shipped_by_name && it.shipped_by_name !== '—') ? it.shipped_by_name : 'Kế Toán'}</span>
                        <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValue}</span>
                        <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierName}</span>
                        ${it.tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplay}</span>` : ''}
                        ${it.carrier_phone ? `<span style="color:#64748b;font-weight:600;">📞 SĐT Nhà Xe:</span> <span><a href="tel:${it.carrier_phone}" style="color:#2563eb;text-decoration:underline;font-weight:700">${it.carrier_phone}</a></span>` : ''}
                        ${it.receiver_name ? `<span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${it.receiver_name}</span>` : ''}
                        <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColor}">${payerLabel}</span></span>
                        ${(it.shipping_fee_payer === 'hv' && it.shipping_fee_method === 'tm') ? `
                            <span style="color:#64748b;font-weight:600;">💵 Mã Tiền Chi TM:</span> 
                            <span style="font-weight:700;color:#d97706">${it.shipping_cashflow_code || '—'}</span>
                        ` : ''}
                        <span style="color:#64748b;font-weight:600;">💰 Cước Vận Chuyển:</span> <span style="font-weight:800;color:#dc2626">${feeAmt.toLocaleString('vi-VN')}đ</span>
                        ${(() => {
                            if (!it.tracking_code) return '';
                            const cleanCode = it.tracking_code.trim().toLowerCase();
                            let totalPaid = 0;
                            let found = false;
                            for (const p of payments) {
                                const note = (p.transfer_note || '').toLowerCase();
                                if (note.includes(cleanCode)) {
                                    totalPaid += Number(p.amount) || 0;
                                    found = true;
                                }
                            }
                            if (found && totalPaid > 0) {
                                return `<span style="color:#64748b;font-weight:600;">💸 Tiền Thanh Toán Vận Chuyển Này:</span> <span style="font-weight:800;color:#10b981">${totalPaid.toLocaleString('vi-VN')}đ</span>`;
                            }
                            return '';
                        })()}
                        ${it.shipping_payment_code ? `<span style="color:#64748b;font-weight:600;">💳 Mã thanh toán:</span> <span style="font-weight:700;color:#059669">${it.shipping_payment_code}</span>` : ''}
                        ${it.shipping_payment_code ? `<span style="color:#64748b;font-weight:600;">💵 Số tiền thanh toán:</span> <span style="font-weight:700;color:#0284c7">${(Number(it.shipping_payment_amount) || 0).toLocaleString('vi-VN')}đ</span>` : ''}
                        ${it.shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtml}</div>` : ''}
                    </div>
                </div>`;
            }
            
            // Render Pending Items
            for (let i = 0; i < pendingItems.length; i++) {
                const pit = pendingItems[i];
                countLanGui++;
                shipHTML += `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;opacity:0.85;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:700;color:#475569;font-size:12.5px;display:flex;align-items:center;gap:6px;">
                        GỬI LẦN ${countLanGui} - 📦 ${pit.label.toUpperCase()} — ${pit.name.toUpperCase()} <span style="background:#e2e8f0;color:#475569;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;">SL: ${pit.qty}</span>
                    </span>
                    <span style="background:#e2e8f0;color:#475569;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">⏳ CHỜ GỬI</span>
                </div>`;
            }
        } else {
            // Fallback to order-level shipping details
            if (o.shipping_status === 'shipped' || o.shipped_at) {
                const row = (label, val) => `<tr><td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;vertical-align:top;width:180px">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;word-break:break-word">${val}</td></tr>`;
                shipHTML += `<table style="width:100%;border-collapse:collapse">`;
                const senderNameFallback = (o.shipped_by_name && o.shipped_by_name !== '—') ? o.shipped_by_name : 'Kế Toán';
                shipHTML += row('👤 Người Gửi', `<span style="color:#2563eb;font-weight:800">${senderNameFallback}</span>`);
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
                const _payerLabel = o.shipping_fee_payer === 'hv' ? ((o.tracking_code && o.tracking_code.trim()) ? 'HV trả cước vận chuyển' : (o.shipping_fee_method === 'ck' ? 'HV trả CK' : (o.shipping_fee_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : o.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                const _payerColor = o.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
                shipHTML += row('💳 Người Trả', `<span style="font-weight:800;color:${_payerColor}">${_payerLabel}</span>`);
                if (o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'tm') {
                    shipHTML += row('💵 Mã Tiền Chi TM', `<span style="font-weight:700;color:#d97706">${o.shipping_cashflow_code || '—'}</span>`);
                }
                const _sfee = Number(o.shipping_fee) || 0;
                shipHTML += row('💰 Cước Vận Chuyển', `<span style="font-weight:800;color:#dc2626">${_sfee.toLocaleString('vi-VN')}đ</span>`);
                
                let carrierPaidHtml = '';
                if (o.tracking_code) {
                    const cleanCode = o.tracking_code.trim().toLowerCase();
                    let totalPaid = 0;
                    let found = false;
                    for (const p of payments) {
                        const note = (p.transfer_note || '').toLowerCase();
                        if (note.includes(cleanCode)) {
                            totalPaid += Number(p.amount) || 0;
                            found = true;
                        }
                    }
                    if (found && totalPaid > 0) {
                        carrierPaidHtml = `<span style="font-weight:800;color:#10b981">${totalPaid.toLocaleString('vi-VN')}đ</span>`;
                    }
                }
                if (carrierPaidHtml) {
                    shipHTML += row('💸 Tiền Thanh Toán Vận Chuyển Này', carrierPaidHtml);
                }
                
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
    const o = _shOrders.find(x => String(x.id) === String(orderId));
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
                    <button onclick="event.stopPropagation();document.getElementById('shAlertModal')?.remove();_shShipOrder('${o.id}','${(o.order_code||'').replace(/'/g,"\\'")}', '${item.item_id}', '${(item.product_name||'').replace(/'/g,"\\'")}', 'Phiếu ${i + 1}')" 
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
                onclick="event.stopPropagation();_shSubmitReshipMultiple('${o.id}', '${(o.order_code||'').replace(/'/g,"\\'")}')"
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

// ========== BAO LOI MODAL (Kế Toán Gửi Hàng) ==========
window._shErrorImages = [];
window._shErrorVideo = null;
window._shSubmitBusy = false;
window._shBusy = false;
window._shPasteHandler = null;

function _shDataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

async function _shOpenErrorModal(orderId) {
    if (window._shBusy) return;
    window._shBusy = true;

    try {
        var o = _shOrders.find(function(x) { return String(x.id) === String(orderId); });
        if (!o) { showToast('Không tìm thấy đơn hàng', 'error'); window._shBusy = false; return; }

        var commonErrors = [];
        try {
            var ce = await apiCall('/api/common-errors-tpl');
            commonErrors = ce.items || [];
        } catch(e) { console.error(e); }

        var old = document.getElementById('_shErrorModal'); if (old) old.remove();

        var reporterName = 'Người Báo Lỗi: Bộ Phận Gửi Hàng - ' + (window.currentUser ? window.currentUser.full_name : 'Kế toán gửi hàng');
        var saleName = o.cskh_name || '—';
        var prodQty = o.items ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

        window._shErrorImages = [];
        window._shErrorVideo = null;

        var h = '<div class="bpc-modal-overlay show" id="_shErrorModal" onclick="if(event.target===this)_shCloseErrorModal()" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;overflow-y:auto">';
        h += '<div class="bpc-modal" style="width:520px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;margin-bottom:40px;">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:12px;"><div class="m-icon" style="font-size:24px">🚨</div><div><div class="m-title" style="font-weight:800;font-size:16px;line-height:1.2">BÁO ĐƠN LỖI</div><div class="m-sub" style="font-size:12px;opacity:0.9;margin-top:2px">' + (o.order_code || '') + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="overflow-y:auto;flex:1;padding:20px;display:flex;flex-direction:column;gap:14px;color:#334155">';

        h += '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;">';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">📋 Mã Đơn</span><span style="font-weight:700;color:#1e3a8a">' + (o.order_code || '—') + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">👤 Khách Hàng</span><span style="font-weight:700;color:#1e293b">' + (o.customer_name || '—') + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">💼 CSKH</span><span style="font-weight:700;color:#1e293b">' + saleName + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">📦 SL Sản Xuất</span><span style="font-weight:700;color:#059669">' + prodQty + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;border-top:1px dashed #e2e8f0;padding-top:8px;margin-top:4px;"><span style="color:#64748b;font-weight:600;">✍️ Người Báo Lỗi</span><span style="font-weight:700;color:#7c3aed">' + reporterName + '</span></div>';
        h += '</div>';

        h += '<div style="display:none"><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">Lỗi Thường Gặp (Nếu có)</label>';
        h += '<select id="shE_common" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f8fafc;outline:none;">';
        h += '<option value="">-- Chọn loại lỗi (nếu có) --</option>';
        commonErrors.forEach(function(ce){
            h += '<option value="' + ce.error_name + '">' + ce.error_name + '</option>';
        });
        h += '</select></div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">Số Lượng Lỗi <span style="color:#ef4444">*</span></label>';
        h += '<input type="number" id="shE_qty" min="1" max="' + (prodQty || 9999) + '" value="" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:800;color:#dc2626;outline:none;" placeholder="Nhập số lượng lỗi...">';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">Nội Dung Chi Tiết <span style="color:#ef4444">*</span></label>';
        h += '<textarea id="shE_content" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-family:inherit;outline:none;" placeholder="Mô tả chi tiết lỗi..."></textarea>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">📷 Hình Ảnh Minh Họa <span style="color:#ef4444">*</span></label>';
        h += '<div style="border:1.5px dashed #7c3aed;border-radius:10px;padding:16px 20px;text-align:center;background:rgba(124,58,237,0.03);color:#7c3aed;font-size:13px;font-weight:700;">';
        h += '    Bấm <span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:800">Ctrl + V</span> tại bất kỳ đâu trên trang này để dán ảnh';
        h += '</div>';
        h += '<div id="shE_previews" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">🎥 Video Minh Họa (Không bắt buộc)</label>';
        h += '<input type="file" id="shE_video" accept="video/*" style="font-size:11px;width:100%" onchange="_shUploadErrorVideo(event)">';
        h += '</div>';

        h += '</div>';

        h += '<div class="bpc-modal-actions" style="margin-top:0;padding:16px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;border-radius:0 0 16px 16px;">';
        h += '<button class="bpc-modal-btn cancel" onclick="_shCloseErrorModal()" style="padding:10px 20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Hủy</button>';
        h += '<button class="bpc-modal-btn confirm" id="_shErrorSubmitBtn" style="padding:10px 24px;border:none;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;" onclick="_shSubmitError(\'' + orderId + '\')">🚨 BÁO LỖI</button>';
        h += '</div>';

        h += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', h);

        _shSetupPasteListener();
        window._shBusy = false;
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        window._shBusy = false;
    }
}

function _shCloseErrorModal() {
    var m = document.getElementById('_shErrorModal');
    if (m) { m.remove(); }
    if (window._shPasteHandler) {
        window.removeEventListener('paste', window._shPasteHandler);
        window._shPasteHandler = null;
    }
}

function _shCompressImage(file, callback) {
    if (!file.type.startsWith('image/')) {
        callback(null);
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxW = 800, maxH = 800;
            var w = img.width, h = img.height;
            if (w > h) {
                if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
            } else {
                if (h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }
            }
            canvas.width = w; canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function _shAddErrorImage(file) {
    _shCompressImage(file, function(compressed) {
        if (!compressed) return;
        window._shErrorImages.push(compressed);
        _shRenderErrorImagePreviews();
    });
}

function _shRenderErrorImagePreviews() {
    var area = document.getElementById('shE_previews');
    if (!area) return;
    var h = '';
    window._shErrorImages.forEach(function(imgData, index) {
        h += '<div style="position:relative;display:inline-block">';
        h += '<img src="' + imgData + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">';
        h += '<span onclick="_shRemoveErrorImage(' + index + ')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:900;text-align:center;line-height:16px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>';
        h += '</div>';
    });
    area.innerHTML = h;
}

function _shRemoveErrorImage(index) {
    window._shErrorImages.splice(index, 1);
    _shRenderErrorImagePreviews();
}

function _shSetupPasteListener() {
    if (window._shPasteHandler) {
        window.removeEventListener('paste', window._shPasteHandler);
    }
    window._shPasteHandler = function(e) {
        if (!document.getElementById('_shErrorModal')) return;
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                var blob = items[i].getAsFile();
                _shAddErrorImage(blob);
            }
        }
    };
    window.addEventListener('paste', window._shPasteHandler);
}

function _shUploadErrorVideo(event) {
    const file = event.target.files[0];
    if (file) {
        window._shErrorVideo = file;
    } else {
        window._shErrorVideo = null;
    }
}

async function _shSubmitError(orderId) {
    if (window._shSubmitBusy) return;

    var qtyEl = document.getElementById('shE_qty');
    var qty = Number(qtyEl.value) || 0;
    if (qty <= 0) { showToast('Vui lòng nhập số lượng lỗi hợp lệ!', 'error'); return; }

    var contentEl = document.getElementById('shE_content');
    var content = contentEl.value.trim();
    if (!content) { showToast('Vui lòng nhập chi tiết nội dung lỗi!', 'error'); return; }

    if (!window._shErrorImages || window._shErrorImages.length === 0) {
        showToast('Vui lòng dán hoặc chọn ít nhất 1 hình ảnh minh họa bắt buộc!', 'error');
        return;
    }

    window._shSubmitBusy = true;
    var btn = document.getElementById('_shErrorSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; }

    try {
        var o = _shOrders.find(function(x) { return String(x.id) === String(orderId); });
        if (!o) { throw new Error('Không tìm thấy đơn hàng'); }

        var prodQty = o.items ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

        var today = new Date().toISOString().split('T')[0];
        if (typeof vnNow === 'function') {
            var n = vnNow();
            today = n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
        }

        var body = {
            report_date: today,
            common_error_type: document.getElementById('shE_common') ? document.getElementById('shE_common').value : '',
            order_code: o.order_code,
            cskh_name: o.cskh_name || '',
            error_quantity: qty,
            error_content: content,
            dht_order_id: o.id,
            customer_name: o.customer_name,
            production_quantity: prodQty,
            error_department: null,
            error_type: 'Nội Bộ'
        };

        var result = await apiCall('/api/customer-errors', 'POST', body);
        if (result.error) { throw new Error(result.error); }

        if (window._shErrorImages && window._shErrorImages.length > 0 && result.id) {
            var fd = new FormData();
            window._shErrorImages.forEach(function(imgData, index) {
                var blob = _shDataURLtoBlob(imgData);
                fd.append('file_' + index, blob, 'image_' + index + '.jpeg');
            });
            await fetch('/api/customer-errors/' + result.id + '/images', { method: 'POST', body: fd });
        }

        if (window._shErrorVideo && result.id) {
            var fdv = new FormData();
            fdv.append('video', window._shErrorVideo);
            await fetch('/api/customer-errors/' + result.id + '/video', { method: 'POST', body: fdv });
        }

        showToast('✅ Đã báo đơn lỗi thành công!');
        _shCloseErrorModal();
        await _shLoadOrders();
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🚨 BÁO LỖI'; }
    } finally {
        window._shSubmitBusy = false;
    }
}

window._shOpenErrorModal = _shOpenErrorModal;
window._shCloseErrorModal = _shCloseErrorModal;
window._shUploadErrorVideo = _shUploadErrorVideo;
window._shSubmitError = _shSubmitError;
window._shRemoveErrorImage = _shRemoveErrorImage;
window._shOnPaymentSearchInput = _shOnPaymentSearchInput;
window._shClearPaymentSearch = _shClearPaymentSearch;

// Carrier settings, defer updates & extra functions
function _shOnUpdateLaterChange() {
    const chk = document.getElementById('shUpdateLaterCheck');
    const isChecked = chk && chk.checked;
    
    const dynFields = document.getElementById('shDynFields');
    const feeSection = document.getElementById('shFeeSection');
    const noFeeNote = document.getElementById('shNoFeeNote');
    const paySection = document.getElementById('shPaymentSection');
    
    if (isChecked) {
        if (dynFields) dynFields.style.display = 'none';
        if (feeSection) feeSection.style.display = 'none';
        if (noFeeNote) noFeeNote.style.display = 'none';
        if (paySection) paySection.style.display = 'none';
        
        const s = window._shModalState;
        if (s) {
            s.isPendingUpdate = true;
        }
    } else {
        if (dynFields) dynFields.style.display = '';
        if (feeSection) feeSection.style.display = '';
        
        _shOnCarrierChange();
        
        const s = window._shModalState;
        if (s) {
            s.isPendingUpdate = false;
        }
    }
}
window._shOnUpdateLaterChange = _shOnUpdateLaterChange;

async function _shOpenCarrierSettingsModal() {
    document.getElementById('shCarrierSettingsModal')?.remove();
    
    const m = document.createElement('div');
    m.id = 'shCarrierSettingsModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    m.innerHTML = `<div style="background:white;border-radius:16px;width:550px;max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;display:flex;flex-direction:column;max-height:85vh;">
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:18px 24px;color:white;display:flex;align-items:center;justify-content:between;">
            <div style="font-weight:800;font-size:16px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">⚙️ Cấu hình Nhà Vận Chuyển</div>
            <button onclick="document.getElementById('shCarrierSettingsModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;font-weight:bold;margin-left:auto;">×</button>
        </div>
        <div style="padding:20px 24px;font-size:13px;color:#334155;overflow-y:auto;flex:1;" id="shCarrierSettingsList">
            <div style="display:flex;justify-content:center;padding:40px 0;">
                <div style="display:inline-block;width:30px;height:30px;border:3px solid #f3f3f3;border-top:3px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:8px;"></div>
            </div>
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="document.getElementById('shCarrierSettingsModal')?.remove()" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.2s;">Hủy bỏ</button>
            <button id="shSaveCarriersBtn" onclick="_shSaveCarrierSettings()" style="padding:9px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:800;font-size:13px;box-shadow:0 4px 10px rgba(5,150,105,0.25);transition:all 0.2s;" disabled>Lưu Cấu Hình</button>
        </div>
    </div>`;
    
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    
    try {
        const data = await apiCall('/api/shipping/carriers');
        const carriers = data.carriers || [];
        const listEl = document.getElementById('shCarrierSettingsList');
        if (!listEl) return;
        
        if (carriers.length === 0) {
            listEl.innerHTML = `<div style="text-align:center;color:#64748b;padding:20px;">Không tìm thấy nhà vận chuyển nào</div>`;
            return;
        }
        
        let html = `<div style="margin-bottom:14px;color:#475569;line-height:1.5;font-weight:500;">
            Tích chọn các nhà vận chuyển mà bạn muốn cho phép <b>cập nhật phí ship và bill sau</b> (ví dụ: Chú Sơn, Nhân Viên HV, v.v.). Khi gửi hàng bằng các đơn vị này, kế toán có thể điền thông tin sau.
        </div>`;
        
        carriers.forEach(c => {
            const checked = c.allow_update_later ? 'checked' : '';
            html += `
            <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1';this.style.background='#f1f5f9'" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#f8fafc'">
                <span style="font-weight:700;color:#1e293b;font-size:13.5px;">${c.name}</span>
                <input type="checkbox" class="sh-carrier-setting-chk" data-carrier-id="${c.id}" ${checked} style="width:20px;height:20px;cursor:pointer;accent-color:#4f46e5;">
            </label>`;
        });
        
        listEl.innerHTML = html;
        document.getElementById('shSaveCarriersBtn').disabled = false;
    } catch (err) {
        const listEl = document.getElementById('shCarrierSettingsList');
        if (listEl) listEl.innerHTML = `<div style="text-align:center;color:#dc2626;font-weight:700;padding:20px;">Lỗi tải dữ liệu: ${err.message}</div>`;
    }
}
window._shOpenCarrierSettingsModal = _shOpenCarrierSettingsModal;

async function _shSaveCarrierSettings() {
    const btn = document.getElementById('shSaveCarriersBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang lưu...';
    }
    
    const settings = {};
    document.querySelectorAll('.sh-carrier-setting-chk').forEach(chk => {
        const cid = chk.dataset.carrierId;
        settings[cid] = chk.checked;
    });
    
    try {
        const r = await apiCall('/api/shipping/carriers/update-settings', 'POST', { settings });
        if (r.error) {
            alert(r.error);
        } else {
            showToast(r.message || 'Đã lưu cấu hình thành công!');
            document.getElementById('shCarrierSettingsModal')?.remove();
            
            const data = await apiCall('/api/shipping/carriers');
            if (data && data.carriers) {
                window._shCarriers = data.carriers;
            }
        }
    } catch (err) {
        alert('Lỗi khi lưu cấu hình: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Lưu Cấu Hình';
        }
    }
}
window._shSaveCarrierSettings = _shSaveCarrierSettings;

async function _shOpenRescheduleLimitModal() {
    document.getElementById('shRescheduleLimitModal')?.remove();
    
    const m = document.createElement('div');
    m.id = 'shRescheduleLimitModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    m.innerHTML = `<div style="background:white;border-radius:16px;width:450px;max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:18px 24px;color:white;display:flex;align-items:center;justify-content:between;">
            <div style="font-weight:800;font-size:16px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">📅 Giới Hạn Hẹn Lại (Kế Toán Gửi)</div>
            <button onclick="document.getElementById('shRescheduleLimitModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;font-weight:bold;margin-left:auto;">×</button>
        </div>
        <div style="padding:24px;font-size:13px;color:#334155;" id="shRescheduleLimitBody">
            <div style="display:flex;justify-content:center;padding:20px 0;">
                <div style="display:inline-block;width:24px;height:24px;border:3px solid #f3f3f3;border-top:3px solid #d97706;border-radius:50%;animation:spin 1s linear infinite;"></div>
            </div>
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="document.getElementById('shRescheduleLimitModal')?.remove()" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.2s;">Hủy bỏ</button>
            <button id="shSaveRescheduleLimitBtn" onclick="_shSaveRescheduleLimitSettings()" style="padding:9px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:800;font-size:13px;box-shadow:0 4px 10px rgba(5,150,105,0.25);transition:all 0.2s;" disabled>Lưu Cài Đặt</button>
        </div>
    </div>`;
    
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    
    try {
        const res = await apiCall('/api/app-config/reschedule_limit_days');
        const limitVal = res && res.value ? res.value : '';
        const bodyEl = document.getElementById('shRescheduleLimitBody');
        if (!bodyEl) return;
        
        bodyEl.innerHTML = `
            <div style="margin-bottom:12px;font-weight:700;color:#1e293b;">Số ngày giới hạn hẹn lại tối đa:</div>
            <input type="number" id="shRescheduleLimitInput" value="${limitVal}" placeholder="Nhập số ngày (VD: 3)..." style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-weight:600;color:#1e293b;">
            <div style="margin-top:8px;font-size:11px;color:#64748b;line-height:1.4;">
                * Thiết lập số ngày tối đa mà Kế toán có thể chọn khi hẹn lại đơn hàng gửi. Hệ thống sẽ tự động bỏ qua ngày Chủ Nhật và các ngày Lễ khi tính các ngày gần nhất.
                <br>
                * Để trống hoặc nhập 0 để tắt giới hạn (Kế toán có thể chọn ngày bất kỳ, ngoại trừ Chủ Nhật và Lễ).
            </div>
        `;
        document.getElementById('shSaveRescheduleLimitBtn').disabled = false;
    } catch (err) {
        const bodyEl = document.getElementById('shRescheduleLimitBody');
        if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center;color:#dc2626;font-weight:700;padding:20px;">Lỗi tải dữ liệu: ${err.message}</div>`;
    }
}
window._shOpenRescheduleLimitModal = _shOpenRescheduleLimitModal;

async function _shSaveRescheduleLimitSettings() {
    const btn = document.getElementById('shSaveRescheduleLimitBtn');
    const input = document.getElementById('shRescheduleLimitInput');
    if (!input) return;
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang lưu...';
    }
    
    try {
        const val = input.value.trim();
        const r = await apiCall('/api/app-config/reschedule_limit_days', 'PUT', { value: val });
        if (r.error) {
            alert(r.error);
        } else {
            showToast('✅ Đã lưu cài đặt Giới Hạn Hẹn Lại');
            document.getElementById('shRescheduleLimitModal')?.remove();
        }
    } catch (err) {
        alert('Lỗi khi lưu cài đặt: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Lưu Cài Đặt';
        }
    }
}
window._shSaveRescheduleLimitSettings = _shSaveRescheduleLimitSettings;

async function _shOpenUpdateShipmentModal(id, code) {
    document.getElementById('shUpdateShipmentModal')?.remove();
    const m = document.createElement('div');
    m.id = 'shUpdateShipmentModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    
    m.innerHTML = `<div style="background:white;border-radius:16px;width:768px;max-width:98vw;box-shadow:0 25px 50px rgba(0,0,0,.3);padding:40px;text-align:center;">
        <div style="display:inline-block;width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #ea580c;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px;"></div>
        <div style="font-weight:700;color:#334155;font-size:14px;">Đang tải chi tiết đơn hàng...</div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });

    let o = null;
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
        console.error('Error loading order details for update shipment modal:', e);
    }
    
    if (!o) {
        m.remove();
        return alert('Không tìm thấy thông tin đơn hàng');
    }

    const fmtMoney = n => (Number(n)||0).toLocaleString('vi-VN');

    let calcBase = 0, calcVat = 0;
    if (String(o.id).startsWith('sample_')) {
        for (const it of items) {
            calcBase += Number(it.total_amount) || (Number(it.price_per_item) * Number(it.quantity)) || 0;
        }
    } else {
        for (const it of items) {
            try {
                const qs = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities||[]);
                const base = qs.reduce((s,x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
                calcBase += base;
                calcVat += (Number(it.item_total) || 0) - base;
            } catch(e) { calcBase += Number(it.item_total) || 0; }
        }
    }
    if (calcVat < 0) calcVat = 0;
    const deposit = Number(o.deposit_amount) || 0;
    const vat = calcVat;
    const discount = Number(o.discount_amount) || 0;
    const surchargeTotal = surcharges.reduce((s, x) => s + Number(x.amount || 0), 0);
    const total = String(o.id).startsWith('sample_') ? calcBase : (calcBase + calcVat + surchargeTotal - discount);
    const hasCarrierPayment = payments.some(p => p.money_source === 'nha_van_chuyen');
    const shipCK = o.ship_ck_deduct !== undefined ? (Number(o.ship_ck_deduct) || 0) : ((!hasCarrierPayment && o.shipping_fee_payer === 'hv' && o.shipping_fee_method === 'ck' && !(o.tracking_code && o.tracking_code.trim())) ? (Number(o.shipping_fee) || 0) : 0);
    const remaining = (o.remaining_amount !== undefined && o.remaining_amount !== null) ? Number(o.remaining_amount) : (String(o.id).startsWith('sample_') ? (Number(o.remaining_amount) || 0) : Math.max(0, total - deposit - shipCK));

    let carrierName = o.actual_carrier_name || '';
    let carrierId = o.actual_carrier_id || '';
    if (!carrierName && items.length > 0) {
        const shippedIt = items.find(it => it.shipping_status === 'shipped');
        if (shippedIt) {
            carrierName = shippedIt.actual_carrier_name || '';
            carrierId = shippedIt.actual_carrier_id || '';
        }
    }
    
    const carrier = _shCarriers.find(c => String(c.id) === String(carrierId)) || _shCarriers.find(c => c.name.toLowerCase() === carrierName.toLowerCase());
    const finalCarrierName = carrier ? carrier.name : carrierName;
    const finalCarrierId = carrier ? carrier.id : carrierId;
    const g = _shGetCarrierGroup(finalCarrierName);

    const fStyle = 'width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;font-weight:600;';
    
    let dynFieldsHtml = '';
    if (g === 'tracking_code') {
        dynFieldsHtml = `<label style="font-size:12px;font-weight:700;color:#374151;">Mã Vận Đơn <span style="color:#dc2626">*</span></label>
                         <input id="shTrackingCode" oninput="_shCheckTrackingDup(this.value)" style="${fStyle}" placeholder="Nhập mã vận đơn...">`;
    } else if (g === 'bill_link') {
        dynFieldsHtml = `<label style="font-size:12px;font-weight:700;color:#374151;">Bill Gửi Hàng <span style="color:#dc2626">*</span></label>
             <div id="shBillPasteZone" style="border:2px dashed #cbd5e1;border-radius:8px;min-height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:#fafafa;margin-top:4px;" tabindex="0">
                 <span id="shBillPasteHint" style="color:#94a3b8;font-size:12px">📋 Ctrl+V để dán ảnh</span>
                 <img id="shBillPastePreview" style="display:none;max-width:100%;max-height:150px;border-radius:6px">
             </div>
             <input type="hidden" id="shBillLink" value="">`;
    } else if (g === 'bill_and_phone') {
        dynFieldsHtml = `<label style="font-size:12px;font-weight:700;color:#374151;">SĐT Nhà Xe <span style="color:#dc2626">*</span></label>
        <input id="shCarrierPhone" style="${fStyle}" placeholder="0909..." oninput="_shValidatePhoneInput(this)">
        <div style="margin-top:8px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Bill Gửi Hàng <span style="color:#dc2626">*</span></label>
            <div id="shBillPasteZone" style="border:2px dashed #cbd5e1;border-radius:8px;min-height:80px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:#fafafa;margin-top:4px;" tabindex="0">
                <span id="shBillPasteHint" style="color:#94a3b8;font-size:12px">📋 Ctrl+V để dán ảnh</span>
                <img id="shBillPastePreview" style="display:none;max-width:100%;max-height:150px;border-radius:6px">
            </div>
            <input type="hidden" id="shBillLink" value="">
        </div>`;
    } else if (g === 'receiver_name') {
        const isNVHV = finalCarrierName.toLowerCase().includes('nhân viên hv') || finalCarrierName.toLowerCase().includes('nhan vien hv');
        const isProxy = finalCarrierName.toLowerCase().includes('người nhận hàng hộ') || finalCarrierName.toLowerCase().includes('nguoi nhan hang ho');
        const lbl = isNVHV ? 'Tên Nhân Viên Gửi Hàng' : 'Tên Người Nhận Hàng';
        const ph = isNVHV ? 'Nhập tên nhân viên gửi...' : 'Nhập tên người nhận...';
        dynFieldsHtml = `<label style="font-size:12px;font-weight:700;color:#374151;">${lbl} <span style="color:#dc2626">*</span></label>
                         <input id="shReceiverName" style="${fStyle}" placeholder="${ph}">`;
        if (isProxy) {
            dynFieldsHtml += `<div style="margin-top:8px;">
                <label style="font-size:12px;font-weight:700;color:#374151;">SĐT Người Nhận Hộ <span style="color:#dc2626">*</span></label>
                <input id="shReceiverPhone" style="${fStyle}" placeholder="0909..." oninput="_shValidatePhoneInput(this)">
            </div>`;
        }
    }

    const modalHtml = `
    <div style="background:white;border-radius:16px;width:768px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,.3);overflow:hidden;animation:shAlertSlideUp 0.25s ease-out;">
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:18px 24px;color:white;display:flex;align-items:center;justify-content:between;">
            <div style="font-weight:900;font-size:15px;letter-spacing:0.5px;">⚡ Cập nhật thông tin gửi hàng — ${code}</div>
            <button onclick="document.getElementById('shUpdateShipmentModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;font-weight:bold;margin-left:auto;">×</button>
        </div>
        
        <div style="padding:22px 24px;overflow-y:auto;flex:1;text-align:left;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:16px;font-size:12px;">
                <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;">
                    <span style="color:#64748b;font-weight:600;">👤 Khách hàng</span><span style="font-weight:700;color:#1e293b;">${o.customer_name||'—'}</span>
                    <span style="color:#64748b;font-weight:600;">🚚 Nhà vận chuyển</span><span style="font-weight:800;color:#2563eb;">${finalCarrierName}</span>
                </div>
            </div>

            <div style="margin-bottom:16px;">
                ${dynFieldsHtml}
            </div>

            <div style="border-top:1px solid #e2e8f0;padding-top:14px;">
                <label style="font-size:12px;font-weight:700;color:#374151;">💰 Phí Gửi Hàng <span style="color:#dc2626">*</span></label>
                <div style="position:relative;margin-top:4px;margin-bottom:12px;">
                    <input type="text" id="shFeeInput" placeholder="0" oninput="_shFmtFee()" style="width:100%;padding:9px 40px 9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-weight:700;">
                    <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:13px;font-weight:600;">đ</span>
                </div>
                
                <div style="display:flex;gap:12px;margin-bottom:10px;">
                    <div style="flex:1;">
                        <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">Người trả <span style="color:#dc2626">*</span></div>
                        <div style="display:flex;gap:6px;" id="shPayerBtns">
                            <button type="button" onclick="_shToggle('payer','hv')" data-val="hv" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">HV trả</button>
                            <button type="button" onclick="_shToggle('payer','khach')" data-val="khach" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">Khách trả</button>
                        </div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">Hình thức <span style="color:#dc2626">*</span></div>
                        <div style="display:flex;gap:6px;" id="shMethodBtns">
                            <button type="button" onclick="_shToggle('method','ck')" data-val="ck" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">CK</button>
                            <button type="button" onclick="_shToggle('method','tm')" data-val="tm" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;font-weight:700;font-size:12px;cursor:pointer;">TM</button>
                        </div>
                    </div>
                </div>
                <div id="shFeeNote" style="font-size:11px;color:#6b7280;padding:6px 8px;background:#f8fafc;border-radius:6px;margin-bottom:12px;display:none;"></div>
            </div>

            <div id="shPaymentSection" style="margin-top:4px;"></div>
        </div>

        <div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc;">
            <button onclick="document.getElementById('shUpdateShipmentModal')?.remove()" style="padding:9px 18px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;font-size:13px;">Hủy bỏ</button>
            <button onclick="_shDoUpdateShipmentDetails('${id}')" style="padding:9px 18px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 4px 10px rgba(5,150,105,0.25);">📤 Cập nhật</button>
        </div>
    </div>`;

    m.innerHTML = modalHtml;

    window._shModalState = { 
        payer: null, 
        method: null, 
        orderId: id, 
        remaining, 
        orderCode: code, 
        carrierName: finalCarrierName,
        selectedPaymentId: null, 
        skipPayment: false, 
        matchingPayments: [], 
        paymentLoaded: false, 
        payLaterCarrier: _shIsPayLaterCarrier(finalCarrierName),
        noFeeCarrier: _shIsNoFeeCarrier(finalCarrierName),
        itemId: null, 
        itemIds: []
    };

    const pasteZone = document.getElementById('shBillPasteZone');
    if (pasteZone) {
        pasteZone.addEventListener('paste', _shHandleBillPaste);
        pasteZone.addEventListener('click', function(){ pasteZone.focus(); });
    }
}
window._shOpenUpdateShipmentModal = _shOpenUpdateShipmentModal;

async function _shDoUpdateShipmentDetails(id) {
    const s = window._shModalState; if (!s) return;
    const g = _shGetCarrierGroup(s.carrierName);

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
        const isProxy = s.carrierName.toLowerCase().includes('người nhận hàng hộ') || s.carrierName.toLowerCase().includes('nguoi nhan hang ho');
        if (isProxy) {
            const rxPhone = document.getElementById('shReceiverPhone')?.value?.trim();
            if (!rxPhone) return alert('Vui lòng nhập SĐT Người Nhận Hộ');
            const rxPhoneDigits = rxPhone.replace(/\D/g, '');
            if (rxPhoneDigits.length !== 10 || rxPhoneDigits[0] !== '0') {
                return alert('SĐT Người Nhận Hộ phải bắt đầu bằng số 0 và đúng 10 số');
            }
        }
    }

    const isNoFee = s.noFeeCarrier || false;
    let feeRaw = '0';
    if (!isNoFee) {
        feeRaw = (document.getElementById('shFeeInput')?.value||'').replace(/\D/g,'');
        if (!feeRaw) return alert('Vui lòng nhập Phí Gửi Hàng');
        if (!s.payer) return alert('Vui lòng chọn Người trả');
        if (!s.method) return alert('Vui lòng chọn Hình thức trả');
        if (s.payer === 'hv' && s.method === 'ck' && s.remaining <= 0) {
            return alert('⚠️ Tiền đơn còn lại = 0đ — Không thể chọn HV trả CK. Vui lòng chọn TM.');
        }
    }

    if (s.payer === 'hv' && s.method === 'ck' && !s.payLaterCarrier) {
        const fee = Number(feeRaw) || 0;
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

    try {
        const body = {
            shipping_fee: isNoFee ? 0 : Number(feeRaw),
            shipping_fee_payer: isNoFee ? null : s.payer,
            shipping_fee_method: isNoFee ? null : s.method,
            no_fee_carrier: isNoFee
        };
        if (s.selectedPaymentId) body.selected_payment_id = s.selectedPaymentId;
        if (tracking) body.tracking_code = tracking;
        if (bill) body.shipping_bill_link = bill;
        const isProxy = s.carrierName.toLowerCase().includes('người nhận hàng hộ') || s.carrierName.toLowerCase().includes('nguoi nhan hang ho');
        if (isProxy) {
            const rxPhone = document.getElementById('shReceiverPhone')?.value?.trim();
            if (rxPhone) body.carrier_phone = rxPhone;
        } else if (phone) {
            body.carrier_phone = phone;
        }
        if (receiver) body.receiver_name = receiver;

        const r = await apiCall(`/api/shipping/orders/${id}/update-shipment-details`, 'POST', body);
        if (r.error) { alert(r.error); return; }
        showToast(r.message || '✅ Đã cập nhật thông tin gửi hàng');
        document.getElementById('shUpdateShipmentModal')?.remove();
        _shLoadOrders();
    } catch(e) { alert('Lỗi: ' + e.message); }
}
window._shDoUpdateShipmentDetails = _shDoUpdateShipmentDetails;

window._shOnPaymentSearchInput = _shOnPaymentSearchInput;
window._shClearPaymentSearch = _shClearPaymentSearch;

async function _dhtShowTraSoatModal(orderId, orderCode) {
    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '900px';
        container.style.width = '95%';
    }
    
    const initialBody = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:12px;color:#6b7280;">
        <div style="width:36px;height:36px;border:3px solid #e5e7eb;border-top-color:#ea580c;border-radius:50%;animation:dhtSpin 1s linear infinite;"></div>
        <div style="font-size:13px;font-weight:600;">Đang tải dữ liệu tra soát đơn hàng...</div>
    </div>
    <style>
        @keyframes dhtSpin { to { transform: rotate(360deg); } }
    </style>`;
    
    openModal(`🔍 Tra Soát Đơn Hàng — ${orderCode}`, initialBody, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);
    
    try {
        const res = await apiCall('/api/trasoat/orders/' + orderId + '/detail');
        if (typeof _tsRenderTimeline === 'function') {
            const html = _tsRenderTimeline(res);
            document.getElementById('modalBody').innerHTML = html;
        } else {
            document.getElementById('modalBody').innerHTML = `<div style="text-align:center;padding:30px;color:#dc2626;">
                <span style="font-size:24px;">⚠️</span>
                <div style="font-weight:700;margin-top:8px;">Lỗi: Thư viện Tra Soát Đơn Hàng chưa được tải</div>
            </div>`;
        }
    } catch(err) {
        document.getElementById('modalBody').innerHTML = `<div style="text-align:center;padding:30px;color:#dc2626;">
            <span style="font-size:24px;">❌</span>
            <div style="font-weight:700;margin-top:8px;">Lỗi khi lấy dữ liệu: ${err.message || err}</div>
        </div>`;
    }
}
window._dhtShowTraSoatModal = _dhtShowTraSoatModal;


