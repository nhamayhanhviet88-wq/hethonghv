// ========== ĐƠN HÀNG HÔM NAY QLX ==========
let _qlxdhFilter = 'today';
let _qlxdhOrders = [];
let _qlxdhCounts = {};
let _qlxdhCarriers = [];
let _qlxdhSearchVal = '';
let _qlxdhCskhVal = '';
let _qlxdhSearched = [];
let _qlxdhPage = 1;
const _QLXDH_PER_PAGE = 100;
let _qlxdhAllOrdersLoaded = false;
let _qlxdhAllOrdersLoading = null;
let _qlxdhSelectedYear = 'all';
let _qlxdhSelectedMonth = 'all';
let _qlxdhHolidayMap = {};
let _qlxdhMaxDate = null;
let _qlxdhSortVal = 'default';
let _qlxdhSortCol = 'expected_ship_date';
let _qlxdhSortDir = 'asc';

function _isQLXUser() {
    return window._currentUser && (
        window._currentUser.role === 'quan_ly_xuong' || 
        window._currentUser.username === 'quanlyxuong' || 
        window._currentUser.full_name === 'Lê Công Thực'
    );
}

async function renderDonhanghomnayqlxPage(container) {
    _qlxdhFilter = 'today'; _qlxdhSearchVal = ''; _qlxdhCskhVal = ''; _qlxdhPage = 1;
    _qlxdhSelectedYear = 'all'; _qlxdhSelectedMonth = 'all';
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
        @keyframes qlxdhPulseBlink {
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
        .qlxdh-hen-homnay {
            animation: qlxdhPulseBlink 1.2s infinite ease-in-out;
            border: 1px solid #d8b4fe !important;
        }
        @keyframes qlxdhKTPulseBlink {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
                filter: brightness(1);
                transform: scale(1);
            }
            50% {
                box-shadow: 0 0 8px 3px rgba(6, 182, 212, 0.4);
                filter: brightness(1.15);
                transform: scale(1.03);
            }
        }
        .qlxdh-kt-hen-homnay {
            animation: qlxdhKTPulseBlink 1.2s infinite ease-in-out;
            border: 1px solid #67e8f9 !important;
        }
        @keyframes qlxdhLatePulseBlink {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
                filter: brightness(1);
                transform: scale(1);
            }
            50% {
                box-shadow: 0 0 8px 3px rgba(220, 38, 38, 0.4);
                filter: brightness(1.2);
                transform: scale(1.03);
            }
        }
        .qlxdh-late-blink {
            animation: qlxdhLatePulseBlink 1.2s infinite ease-in-out;
            border: 1px solid #ef4444 !important;
        }
        .qlxdh-th-sortable {
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
        }
        .qlxdh-th-sortable:hover {
            background-color: rgba(255, 255, 255, 0.15) !important;
        }
    </style>
    <div style="max-width:1600px;margin:0 auto;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <h2 style="margin:0;font-size:22px;color:#122546;font-weight:800;display:flex;align-items:center;gap:8px;">📦 Đơn Hàng Hôm Nay QLX</h2>
            <div style="display:flex;gap:8px;align-items:center;">
                ${currentUser && currentUser.role === 'giam_doc' ? `
                <button onclick="_qlxdhOpenProcessingDaysModal()" style="padding:8px 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;cursor:pointer;font-weight:800;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(2,132,199,0.25);transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
                    ⚙️ Cấu Hình Ngày Xử Lý
                </button>
                <button onclick="_qlxdhOpenRescheduleLimitModal()" style="padding:8px 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:800;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(217,119,6,0.25);transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
                    📅 Giới Hạn Hẹn Lại
                </button>
                ` : ''}
            </div>
        </div>
        <div style="display:flex;gap:16px;align-items:flex-start;">
            <div id="qlxdhSidebar" style="width:220px;flex-shrink:0;"></div>
            <div style="flex:1;min-width:0;">
                <div id="qlxdhSearchBar" style="margin-bottom:12px;"></div>
                <div id="qlxdhContent"></div>
            </div>
        </div>
    </div>`;
    try { const c = await apiCall('/api/shipping/carriers'); _qlxdhCarriers = c.carriers || []; } catch(e){}
    _qlxdhRenderSidebar();
    _qlxdhRenderSearchBar();
    _qlxdhLoadOrders();
}

function _qlxdhRenderSidebar() {
    const sb = document.getElementById('qlxdhSidebar');
    if (!sb) return;
    const filters = [
        { key:'early', icon:'🔵', label:'Gửi Sớm', color:'#3b82f6', bg:'#eff6ff' },
        { key:'today', icon:'🔴', label:'Hôm Nay Xử Lý', color:'#dc2626', bg:'#fef2f2' },
        { key:'rescheduled', icon:'🟡', label:'Hẹn Lại Lịch', color:'#d97706', bg:'#fffbeb' },
        { key:'cho_kt_gui', icon:'📤', label:'Chờ KT Gửi', color:'#16a34a', bg:'#dcfce7' },
        { key:'shipped', icon:'✅', label:'Đã Gửi', color:'#059669', bg:'#ecfdf5' }
    ];
    const cskhMap = {};
    _qlxdhOrders.forEach(o => { if (o.cskh_name && o.cskh_user_id) cskhMap[o.cskh_user_id] = o.cskh_name; });
    const cskhOpts = Object.entries(cskhMap).sort((a,b) => a[1].localeCompare(b[1]));

    sb.innerHTML = filters.map(f => {
        const active = _qlxdhFilter === f.key;
        const cnt = _qlxdhCounts[f.key] || 0;
        let html = `<div onclick="_qlxdhSetFilter('${f.key}')" style="padding:12px 14px;margin-bottom:6px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .2s;border:2px solid ${active ? f.color : '#e2e8f0'};background:${active ? f.bg : 'white'};box-shadow:${active ? '0 2px 8px rgba(0,0,0,.08)' : 'none'};" onmouseover="if(!${active})this.style.borderColor='${f.color}'" onmouseout="if(!${active})this.style.borderColor='#e2e8f0'">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">${f.icon}</span>
                <span style="font-size:13px;font-weight:700;color:${active ? f.color : '#334155'};">${f.label}</span>
            </div>
            <span style="background:${active ? f.color : '#e2e8f0'};color:${active ? 'white' : '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;">${cnt}</span>
        </div>`;
        if (f.key === 'shipped' && active) {
            html += _qlxdhBuildYearMonthTreeHTML();
        }
        return html;
    }).join('') + `
    <div style="margin-top:12px;padding:10px 12px;border-radius:10px;border:2px solid #e2e8f0;background:white;">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">👤 CSKH</div>
        <select onchange="_qlxdhOnCskhChange(this.value)" style="width:100%;padding:7px 8px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:600;color:#334155;cursor:pointer;background:white;">
            <option value="">Tất cả</option>
            ${cskhOpts.map(([id,name]) => `<option value="${id}" ${_qlxdhCskhVal==String(id)?'selected':''}>${name}</option>`).join('')}
        </select>
    </div>
    ` + `${_qlxdhCounts.overdue > 0 ? `<div style="margin-top:10px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;"><div style="font-size:11px;font-weight:700;color:#dc2626;">⚠️ ${_qlxdhCounts.overdue} đơn quá hạn!</div></div>` : ''}`;
}

function _qlxdhBuildYearMonthTreeHTML() {
    const shippedOrders = _qlxdhOrders.filter(o => o.shipping_status === 'shipped');
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
    
    const isAllActive = _qlxdhSelectedYear === 'all';
    html += `<div onclick="event.stopPropagation(); _qlxdhSelectYearMonth('all', 'all')" style="padding: 4px 8px; margin-bottom: 2px; border-radius: 6px; cursor: pointer; font-weight: 700; color: ${isAllActive ? '#059669' : '#475569'}; background: ${isAllActive ? '#ecfdf5' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;">
        <span>📅 Tất cả đã gửi</span>
        <span style="font-size: 10px; background: ${isAllActive ? '#059669' : '#e2e8f0'}; color: ${isAllActive ? 'white' : '#64748b'}; padding: 1px 6px; border-radius: 8px;">${shippedOrders.length}</span>
    </div>`;

    sortedYears.forEach(y => {
        const isYearActive = _qlxdhSelectedYear === y && _qlxdhSelectedMonth === 'all';
        const yearTotal = Object.values(yearMonthMap[y]).reduce((a, b) => a + b, 0);
        
        html += `<div onclick="event.stopPropagation(); _qlxdhSelectYearMonth(${y}, 'all')" style="padding: 4px 8px; margin-top: 4px; margin-bottom: 2px; border-radius: 6px; cursor: pointer; font-weight: 700; color: ${_qlxdhSelectedYear === y ? '#059669' : '#1e293b'}; background: ${isYearActive ? '#ecfdf5' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;">
            <span>🗓️ Năm ${y}</span>
            <span style="font-size: 10px; background: ${isYearActive ? '#059669' : '#cbd5e1'}; color: ${isYearActive ? 'white' : '#475569'}; padding: 1px 6px; border-radius: 8px;">${yearTotal}</span>
        </div>`;

        const sortedMonths = Object.keys(yearMonthMap[y]).map(Number).sort((a, b) => b - a);
        html += `<div style="margin-left: 12px; border-left: 1px solid #e2e8f0; padding-left: 8px;">`;
        sortedMonths.forEach(m => {
            const isMonthActive = _qlxdhSelectedYear === y && _qlxdhSelectedMonth === m;
            const count = yearMonthMap[y][m];
            const monthLabel = m < 10 ? '0' + m : m;
            html += `<div onclick="event.stopPropagation(); _qlxdhSelectYearMonth(${y}, ${m})" style="padding: 3px 6px; margin-bottom: 2px; border-radius: 5px; cursor: pointer; font-weight: 600; color: ${isMonthActive ? '#059669' : '#64748b'}; background: ${isMonthActive ? '#ecfdf5' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='${isMonthActive ? '#ecfdf5' : '#f8fafc'}'" onmouseout="this.style.background='${isMonthActive ? '#ecfdf5' : 'transparent'}'">
                <span>Tháng ${monthLabel}</span>
                <span style="font-size: 9px; font-weight: 800; color: ${isMonthActive ? '#059669' : '#94a3b8'};">${count}</span>
            </div>`;
        });
        html += `</div>`;
    });

    html += `</div>`;
    return html;
}

function _qlxdhSelectYearMonth(year, month) {
    _qlxdhSelectedYear = year;
    _qlxdhSelectedMonth = month;
    _qlxdhPage = 1;
    _qlxdhApplySearch();
    _qlxdhRenderContent();
    _qlxdhRenderSidebar();
}

function _qlxdhSetFilter(key) {
    _qlxdhFilter = key; _qlxdhSearchVal = ''; _qlxdhCskhVal = ''; _qlxdhPage = 1;
    _qlxdhSelectedYear = 'all';
    _qlxdhSelectedMonth = 'all';
    _qlxdhAllOrdersLoaded = false;
    _qlxdhAllOrdersLoading = null;
    const si = document.getElementById('qlxdhSearchInput'); if (si) si.value = '';
    _qlxdhRenderSidebar(); _qlxdhLoadOrders();
}

function _qlxdhOnCskhChange(val) {
    _qlxdhCskhVal = val; _qlxdhPage = 1; _qlxdhApplySearch(); _qlxdhRenderContent(); _qlxdhRenderSidebar();
}

function _qlxdhRenderSearchBar() {
    const sb = document.getElementById('qlxdhSearchBar');
    if (!sb) return;
    const isQLX = _isQLXUser();
    const placeholderText = isQLX ? "Tìm mã đơn hàng, tên khách..." : "Tìm mã đơn hàng, SĐT, tên khách...";
    sb.innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div style="flex:1;max-width:420px;position:relative;min-width:250px;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;">🔍</span>
            <input type="text" id="qlxdhSearchInput" value="${_qlxdhSearchVal}" oninput="_qlxdhOnSearch(this.value)" placeholder="${placeholderText}" style="width:100%;padding:9px 12px 9px 36px;border:2px solid #fbbf24;border-radius:10px;font-size:13px;font-weight:600;background:#fffef5;outline:none;transition:border .2s;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#fbbf24'">
        </div>
    </div>`;
}

function _qlxdhOnSortChange(val) {
    _qlxdhSortVal = val;
    if (val === 'default') {
        _qlxdhSortCol = 'expected_ship_date';
        _qlxdhSortDir = 'asc';
    } else if (val === 'remaining_desc') {
        _qlxdhSortCol = 'remaining_amount';
        _qlxdhSortDir = 'desc';
    } else if (val === 'remaining_asc') {
        _qlxdhSortCol = 'remaining_amount';
        _qlxdhSortDir = 'asc';
    } else if (val === 'total_desc') {
        _qlxdhSortCol = 'total_amount';
        _qlxdhSortDir = 'desc';
    } else if (val === 'total_asc') {
        _qlxdhSortCol = 'total_amount';
        _qlxdhSortDir = 'asc';
    }
    _qlxdhApplySearch();
    _qlxdhRenderContent();
}

function _qlxdhSortByCol(col) {
    if (_qlxdhSortCol === col) {
        _qlxdhSortDir = _qlxdhSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        _qlxdhSortCol = col;
        _qlxdhSortDir = 'asc';
    }
    
    // Sync to dropdown if possible
    if (_qlxdhSortCol === 'expected_ship_date' && _qlxdhSortDir === 'asc') {
        _qlxdhSortVal = 'default';
    } else if (_qlxdhSortCol === 'remaining_amount' && _qlxdhSortDir === 'desc') {
        _qlxdhSortVal = 'remaining_desc';
    } else if (_qlxdhSortCol === 'remaining_amount' && _qlxdhSortDir === 'asc') {
        _qlxdhSortVal = 'remaining_asc';
    } else if (_qlxdhSortCol === 'total_amount' && _qlxdhSortDir === 'desc') {
        _qlxdhSortVal = 'total_desc';
    } else if (_qlxdhSortCol === 'total_amount' && _qlxdhSortDir === 'asc') {
        _qlxdhSortVal = 'total_asc';
    } else {
        _qlxdhSortVal = 'custom';
    }
    
    _qlxdhApplySearch();
    _qlxdhRenderContent();
}

async function _qlxdhOnSearch(val) {
    _qlxdhSearchVal = val; _qlxdhPage = 1;
    if (val.trim() !== '') {
        if (!_qlxdhAllOrdersLoaded) {
            if (!_qlxdhAllOrdersLoading) {
                _qlxdhAllOrdersLoading = _qlxdhLoadAllOrders();
            }
            await _qlxdhAllOrdersLoading;
        }
    }
    _qlxdhApplySearch();
    _qlxdhRenderContent();
}

async function _qlxdhLoadAllOrders() {
    try {
        const data = await apiCall('/api/shipping/orders?filter=all&page_type=qlx');
        _qlxdhOrders = data.orders || [];
        _qlxdhCounts = data.counts || {};
        _qlxdhMaxDate = data.max_date || null;
        _qlxdhAllOrdersLoaded = true;
        _qlxdhRenderSidebar();
    } catch(e) {
        console.error('Error loading all orders for search:', e);
        showToast('Lỗi tải dữ liệu tìm kiếm: ' + e.message, 'error');
    } finally {
        _qlxdhAllOrdersLoading = null;
    }
}

async function _qlxdhLoadOrders() {
    const el = document.getElementById('qlxdhContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';
    _qlxdhAllOrdersLoaded = false;
    _qlxdhAllOrdersLoading = null;
    try {
        const data = await apiCall(`/api/shipping/orders?filter=${_qlxdhFilter}&page_type=qlx`);
        _qlxdhOrders = data.orders || [];
        _qlxdhCounts = data.counts || {};
        _qlxdhMaxDate = data.max_date || null;
        _qlxdhRenderSidebar();
        _qlxdhApplySearch();
        _qlxdhRenderContent();
    } catch(e) {
        el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">Lỗi: ${e.message}</div>`;
    }
}

function _qlxdhApplySearch() {
    let list = _qlxdhOrders.slice();
    const q = (_qlxdhSearchVal || '').toLowerCase().trim();
    const isQLX = _isQLXUser();
    if (q) {
        list = list.filter(o => {
            return (o.order_code || '').toLowerCase().includes(q)
                || (!isQLX && (o.customer_phone || '').toLowerCase().includes(q))
                || (o.customer_name || '').toLowerCase().includes(q);
        });
    } else {
        if (_qlxdhCskhVal) list = list.filter(o => String(o.cskh_user_id) === _qlxdhCskhVal);
        list = list.filter(o => {
            const menu = _qlxdhGetOrderMenu(o);
            if (menu.key !== _qlxdhFilter) return false;
            
            if (_qlxdhFilter === 'shipped') {
                if (_qlxdhSelectedYear !== 'all') {
                    let dateObj = null;
                    if (o.shipped_at) dateObj = new Date(o.shipped_at);
                    else if (o.shipping_date) dateObj = new Date(o.shipping_date);
                    else if (o.expected_ship_date) dateObj = new Date(o.expected_ship_date);
                    else if (o.created_at) dateObj = new Date(o.created_at);
                    
                    if (!dateObj) return false;
                    const y = dateObj.getFullYear();
                    const m = dateObj.getMonth() + 1;
                    
                    if (y !== Number(_qlxdhSelectedYear)) return false;
                    if (_qlxdhSelectedMonth !== 'all' && m !== Number(_qlxdhSelectedMonth)) return false;
                }
            }
            return true;
        });
    }
    list.sort((a, b) => {
        let valA, valB;
        if (_qlxdhSortCol === 'status') {
            valA = _qlxdhFormatRescheduleStatus(a).label;
            valB = _qlxdhFormatRescheduleStatus(b).label;
        } else if (_qlxdhSortCol === 'expected_ship_date') {
            valA = a.expected_ship_date ? new Date(a.expected_ship_date + 'T00:00:00Z').getTime() : new Date('9999-12-31T00:00:00Z').getTime();
            valB = b.expected_ship_date ? new Date(b.expected_ship_date + 'T00:00:00Z').getTime() : new Date('9999-12-31T00:00:00Z').getTime();
        } else if (_qlxdhSortCol === 'rescheduled_ship_date') {
            valA = a.rescheduled_ship_date ? new Date(a.rescheduled_ship_date + 'T00:00:00Z').getTime() : new Date('9999-12-31T00:00:00Z').getTime();
            valB = b.rescheduled_ship_date ? new Date(b.rescheduled_ship_date + 'T00:00:00Z').getTime() : new Date('9999-12-31T00:00:00Z').getTime();
        } else if (_qlxdhSortCol === 'shipped_at') {
            valA = (a.shipped_at || a.shipping_date || a.created_at) ? new Date(a.shipped_at || a.shipping_date || a.created_at).getTime() : 0;
            valB = (b.shipped_at || b.shipping_date || b.created_at) ? new Date(b.shipped_at || b.shipping_date || b.created_at).getTime() : 0;
        } else if (_qlxdhSortCol === 'progress') {
            const getProgressValue = o => {
                if (o.shipped_at || o.shipping_status === 'shipped') {
                    const shipExpected = o.expected_ship_date ? new Date(o.expected_ship_date + 'T00:00:00Z').getTime() : 0;
                    const shipActual = new Date(o.shipped_at || o.shipping_date || o.created_at).getTime();
                    return shipExpected - shipActual;
                } else if (o.expected_ship_date) {
                    const shipExpected = new Date(o.expected_ship_date + 'T00:00:00Z').getTime();
                    const today = new Date().setHours(0,0,0,0);
                    return shipExpected - today;
                }
                return 999999999999;
            };
            valA = getProgressValue(a);
            valB = getProgressValue(b);
        } else if (_qlxdhSortCol === 'remaining_amount') {
            valA = Number(a.remaining_amount) || 0;
            valB = Number(b.remaining_amount) || 0;
        } else if (_qlxdhSortCol === 'total_amount') {
            valA = Number(a.total_amount) || 0;
            valB = Number(b.total_amount) || 0;
        } else if (_qlxdhSortCol === 'order_code') {
            valA = a.order_code || '';
            valB = b.order_code || '';
        } else if (_qlxdhSortCol === 'customer_name') {
            valA = a.customer_name || '';
            valB = b.customer_name || '';
        } else if (_qlxdhSortCol === 'customer_phone') {
            valA = a.customer_phone || '';
            valB = b.customer_phone || '';
        } else if (_qlxdhSortCol === 'cskh_name') {
            valA = a.cskh_name || '';
            valB = b.cskh_name || '';
        } else {
            valA = a.id;
            valB = b.id;
        }

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB, 'vi', { sensitivity: 'base' });
        } else {
            comparison = valA - valB;
        }

        if (comparison !== 0) {
            return _qlxdhSortDir === 'asc' ? comparison : -comparison;
        }
        return b.id - a.id;
    });
    _qlxdhSearched = list;
}

function _qlxdhGetOrderMenu(o) {
    if (o.shipping_status === 'shipped') {
        return { key: 'shipped', label: 'Đã Gửi', color: '#059669', bg: '#ecfdf5' };
    }
    const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
    const isEligibleToSend = pendingItems.length > 0 && pendingItems.every(item => item.all_done);
    if (isEligibleToSend) {
        return { key: 'cho_kt_gui', label: 'Chờ KT Gửi', color: '#16a34a', bg: '#dcfce7' };
    }
    const maxDate = _qlxdhMaxDate || vnDateStr();
    const todayStr = vnDateStr();
    let effDate = o.rescheduled_ship_date || o.expected_ship_date;
    if (effDate) {
        try {
            effDate = vnDateStr(effDate);
        } catch(e) {}
    }
    if (o.shipping_status === 'rescheduled' && o.rescheduled_ship_date) {
        let reschedDate = o.rescheduled_ship_date;
        try { reschedDate = vnDateStr(reschedDate); } catch(e){}
        if (reschedDate > maxDate || o.was_rescheduled_today) {
            return { key: 'rescheduled', label: 'Hẹn Lại Lịch', color: '#d97706', bg: '#fffbeb' };
        } else {
            return { key: 'today', label: 'Hôm Nay Xử Lý', color: '#dc2626', bg: '#fef2f2' };
        }
    }
    if (o.shipping_status === 'pending' && effDate && effDate > maxDate) {
        return { key: 'early', label: 'Gửi Sớm', color: '#3b82f6', bg: '#eff6ff' };
    }
    if (o.shipping_status === 'pending' && effDate && effDate <= maxDate) {
        return { key: 'today', label: 'Hôm Nay Xử Lý', color: '#dc2626', bg: '#fef2f2' };
    }
    return { key: 'unknown', label: 'Khác', color: '#6b7280', bg: '#f3f4f6' };
}

function _qlxdhFormatRescheduleStatus(o) {
    if (o.shipping_status === 'shipped') {
        return { label: 'Đã Gửi', color: '#059669', bg: '#ecfdf5', class: '' };
    }
    const today = vnDateStr();
    let effDate = o.rescheduled_ship_date || o.expected_ship_date;
    if (effDate) {
        try { effDate = vnDateStr(effDate); } catch(e){}
        if (effDate < today) {
            return { label: 'Xử Lý Trễ', color: '#ffffff', bg: '#dc2626', class: 'qlxdh-late-blink' };
        }
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
        
        const isKT = o.last_rescheduled_by_role === 'ke_toan';
        const prefix = isKT ? 'KToán' : 'QLX';
        
        if (diffDays === 0) {
            if (isKT) {
                return { label: 'KToán Hẹn Hôm Nay', color: '#0e7490', bg: 'linear-gradient(135deg, #ecfeff, #cffafe)', class: 'qlxdh-kt-hen-homnay' };
            } else {
                return { label: 'QLX Hẹn Hôm Nay', color: '#581c87', bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', class: 'qlxdh-hen-homnay' };
            }
        } else if (diffDays === 1) {
            return { label: `${prefix} Hẹn Hôm Qua`, color: '#d97706', bg: '#fffbeb', class: '' };
        } else if (diffDays === 2) {
            return { label: `${prefix} Hẹn Hôm Kia`, color: '#7c3aed', bg: '#f5f3ff', class: '' };
        } else {
            const day = d1.getDate();
            const month = d1.getMonth() + 1;
            return { label: `${prefix} Hẹn ${day}/${month}`, color: '#4b5563', bg: '#f3f4f6', class: '' };
        }
    } catch (e) {
        const isKT = o.last_rescheduled_by_role === 'ke_toan';
        const prefix = isKT ? 'KToán' : 'QLX';
        return { label: `${prefix} Đã Hẹn`, color: '#d97706', bg: '#fffbeb', class: '' };
    }
}

function _qlxdhPaginationHTML(total, page, perPage) {
    const totalPages = Math.ceil(total / perPage) || 1;
    if (totalPages <= 1) return '';
    const btns = [];
    btns.push(`<button onclick="_qlxdhGoPage(1)" ${page<=1?'disabled':''} style="${_qlxdhPgBtn(page>1)}">⏮</button>`);
    btns.push(`<button onclick="_qlxdhGoPage(${page-1})" ${page<=1?'disabled':''} style="${_qlxdhPgBtn(page>1)}">◀</button>`);
    btns.push(`<span style="font-size:12px;font-weight:700;color:#334155;padding:0 8px;">Trang ${page} / ${totalPages}</span>`);
    btns.push(`<button onclick="_qlxdhGoPage(${page+1})" ${page>=totalPages?'disabled':''} style="${_qlxdhPgBtn(page<totalPages)}">▶</button>`);
    btns.push(`<button onclick="_qlxdhGoPage(${totalPages})" ${page>=totalPages?'disabled':''} style="${_qlxdhPgBtn(page<totalPages)}">⏭</button>`);
    return `<div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:8px 0;">${btns.join('')}</div>`;
}

function _qlxdhPgBtn(enabled) {
    return `padding:5px 10px;border:1px solid ${enabled?'#122546':'#e2e8f0'};border-radius:6px;background:${enabled?'white':'#f1f5f9'};color:${enabled?'#122546':'#cbd5e1'};cursor:${enabled?'pointer':'not-allowed'};font-size:12px;font-weight:700;`;
}

function _qlxdhGoPage(p) {
    const totalPages = Math.ceil(_qlxdhSearched.length / _QLXDH_PER_PAGE) || 1;
    _qlxdhPage = Math.max(1, Math.min(p, totalPages));
    _qlxdhRenderContent();
}

function _qlxdhRenderContent() {
    const el = document.getElementById('qlxdhContent');
    if (!el) return;
    if (_qlxdhSearched.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px;"><div style="font-size:48px;margin-bottom:12px;">📭</div><div style="color:#9ca3af;font-size:14px;font-weight:600;">Không có đơn hàng nào</div></div>`;
        return;
    }
    const total = _qlxdhSearched.length;
    const totalPages = Math.ceil(total / _QLXDH_PER_PAGE);
    if (_qlxdhPage > totalPages) _qlxdhPage = totalPages;
    const start = (_qlxdhPage - 1) * _QLXDH_PER_PAGE;
    const pageOrders = _qlxdhSearched.slice(start, start + _QLXDH_PER_PAGE);

    const pgHTML = _qlxdhPaginationHTML(total, _qlxdhPage, _QLXDH_PER_PAGE);
    const countHTML = `<div style="font-size:11px;color:#64748b;font-weight:600;text-align:center;padding:4px 0;">Tổng: ${total} đơn${totalPages>1?` — Hiển thị ${start+1}-${Math.min(start+_QLXDH_PER_PAGE,total)}`:''}</div>`;

    let html = pgHTML + countHTML;
    html += _qlxdhBuildTable(pageOrders);
    html += countHTML + pgHTML;
    el.innerHTML = html;
}

function _qlxdhBuildTable(orders) {
    const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const today = vnDateStr();
    const isQLX = _isQLXUser();

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

    const headers = ['','Tình Trạng','Phiếu Gửi','Gửi Dự Kiến','Hẹn Lại','🚛 Ngày Gửi','Tiến Độ','Số Tiền Còn Lại','Tổng Tiền','Mã Đơn','KH','SĐT','CSKH'];
    const filteredHeaders = isQLX ? headers.filter(h => h !== 'SĐT') : headers;

    const colMap = {
        'Tình Trạng': 'status',
        'Gửi Dự Kiến': 'expected_ship_date',
        'Hẹn Lại': 'rescheduled_ship_date',
        '🚛 Ngày Gửi': 'shipped_at',
        'Tiến Độ': 'progress',
        'Số Tiền Còn Lại': 'remaining_amount',
        'Tổng Tiền': 'total_amount',
        'Mã Đơn': 'order_code',
        'KH': 'customer_name',
        'SĐT': 'customer_phone',
        'CSKH': 'cskh_name'
    };

    let html = `<div style="overflow-x:auto;border:2px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px;">
    <thead><tr style="background:linear-gradient(135deg,#122546,#1e3a5f);">
        ${filteredHeaders.map(h => {
            const align = (h === 'Phiếu Gửi' || h === 'Tình Trạng' || h === '') ? 'center' : 'left';
            const sortKey = colMap[h];
            if (sortKey) {
                const isActive = _qlxdhSortCol === sortKey;
                const arrow = isActive ? (_qlxdhSortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
                const opacity = isActive ? '1' : '0.4';
                return `<th onclick="_qlxdhSortByCol('${sortKey}')" class="qlxdh-th-sortable" style="padding:10px 8px;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;text-align:${align};">
                    ${h}<span style="opacity:${opacity};margin-left:4px;font-size:9px;">${arrow}</span>
                </th>`;
            } else {
                return `<th style="padding:10px 8px;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;text-align:${align};">${h}</th>`;
            }
        }).join('')}
    </tr></thead><tbody>`;

    for (const o of orders) {
        const overdue = o.is_overdue;
        const rowBg = overdue ? '#fef2f2' : '';
        const isKT = o.shipping_status !== 'shipped';

        const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];
        const allPendingCompleted = pendingItems.every(item => item.all_done);
        const isEligibleToSend = pendingItems.length > 0 && allPendingCompleted;

        let orderLevelAction = '';
        if (isKT && o.shipping_status !== 'shipped') {
            if (isEligibleToSend) {
                orderLevelAction = `
                    <span style="color:#15803d;font-weight:700;font-size:11px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#f0fdf4;border:1px dashed #bbf7d0;border-radius:6px;white-space:nowrap;" title="Tất cả sản phẩm đã sản xuất xong, chờ Kế toán gửi đi"><span style="font-size:12px;">✅</span> Chờ gửi</span>
                `;
            } else {
                orderLevelAction = `
                    ${!allPendingCompleted ? `<button onclick="event.stopPropagation();_qlxdhShowOrderSlipsModal('${o.id}')" style="padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:white;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;margin-bottom:3px;display:block;width:100%;" title="Chưa đủ điều kiện gửi">⚠️ Không gửi được</button>` : ''}
                    <button onclick="event.stopPropagation();_qlxdhShowReschedule('${o.id}','${(o.order_code||'').replace(/'/g,"\\'")}')" style="padding:4px 6px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Hẹn lại">📅 Hẹn</button>
                    <button onclick="event.stopPropagation();_qlxdhOpenErrorModal('${o.id}')" style="padding:4px 6px;border:1px solid #dc2626;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Báo lỗi đơn hàng">🚨 Báo Lỗi</button>
                `;
            }
        } else {
            orderLevelAction = `
                <button onclick="event.stopPropagation();_qlxdhShowShippingDetailOnly('${o.id}')" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;cursor:pointer;font-size:14px;padding:4px 10px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s;" onmouseover="this.style.background='#dbeafe';this.style.transform='scale(1.05)'" onmouseout="this.style.background='#eff6ff';this.style.transform='scale(1)'" title="Xem thông tin vận chuyển">📄</button>
                <button onclick="event.stopPropagation();_qlxdhOpenErrorModal('${o.id}')" style="padding:4px 6px;border:1px solid #dc2626;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-size:10px;font-weight:700;margin-top:3px;display:block;width:100%;" title="Báo lỗi đơn hàng">🚨 Báo Lỗi</button>
            `;
        }
        
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
                if (isEligibleToSend) {
                    if (diffDays < 0) {
                        progressBadge = `<span class="dht-tiendo-badge dht-tiendo-blue">⏳ Còn ${Math.abs(diffDays)} ngày</span>`;
                    } else if (diffDays === 0) {
                        progressBadge = `<span class="dht-tiendo-badge dht-tiendo-yellow">📦 Hôm nay!</span>`;
                    } else {
                        progressBadge = `<span class="dht-tiendo-badge dht-tiendo-green" style="opacity: 0.85;">⌛ Trễ ${diffDays} ngày (Chờ KT)</span>`;
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
            }
            tienDoClick = `onclick="event.stopPropagation(); _dhtShowTraSoatModal('${o.id}', '${o.order_code}')" title="Xem tra soát tiến độ"`;
        } else {
            progressBadge = `<span style="color:#94a3b8;font-style:italic">—</span>`;
        }

        let trAttrs = '';
        if (isQLX) {
            trAttrs = `style="border-bottom:1px solid #f1f5f9;background:${rowBg};" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'"`;
        } else {
            trAttrs = `style="border-bottom:1px solid #f1f5f9;background:${rowBg};cursor:pointer;" onclick="window._dhtDetailSource='shipping';_dhtShowDetail('${o.id}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg}'" title="Xem chi tiết đơn hàng"`;
        }
        html += `<tr ${trAttrs}>`;
        
        html += `<td style="padding:8px 6px;text-align:center;" onclick="event.stopPropagation();_qlxdhToggleOrderItems('${o.id}')">
            <span id="qlxdhChevron_${o.id}" style="font-size:14px;cursor:pointer;user-select:none;color:#64748b;font-weight:bold;padding:4px;">▶</span>
        </td>`;

        const statusData = _qlxdhFormatRescheduleStatus(o);
        const borderStyle = statusData.class ? '' : `border:1px solid ${statusData.color}40;`;
        const statusBadge = `<span class="${statusData.class}" onclick="event.stopPropagation(); _qlxdhShowHistory('${o.id}', '${o.order_code}')" style="background:${statusData.bg};color:${statusData.color};${borderStyle}padding:4px 8px;border-radius:6px;font-size:11px;font-weight:800;white-space:nowrap;display:inline-block;cursor:pointer;" title="Xem lịch sử hẹn lại">${statusData.label}</span>`;
        html += `<td style="padding:8px 6px;text-align:center;vertical-align:middle;">${statusBadge}</td>`;

        html += `<td style="padding:8px 6px;text-align:center;">${orderLevelAction}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;">${formatExpectedShipDateWithDay(o.expected_ship_date)}</td>`;
        
        let rescheduleCell = '<span style="color:#d1d5db;">—</span>';
        if (o.rescheduled_ship_date) {
            const rDate = new Date(o.rescheduled_ship_date + 'T00:00:00+07:00');
            const dayNum = rDate.getDate();
            const monthNum = rDate.getMonth() + 1;
            const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayOfWeekName = daysOfWeek[rDate.getDay()];
            
            let timePrefix = '';
            if (o.rescheduled_ship_hour !== null && o.rescheduled_ship_hour !== undefined &&
                o.rescheduled_ship_minute !== null && o.rescheduled_ship_minute !== undefined) {
                timePrefix = `${String(o.rescheduled_ship_hour).padStart(2, '0')}:${String(o.rescheduled_ship_minute).padStart(2, '0')} `;
            }
            rescheduleCell = `<span onclick="event.stopPropagation(); _qlxdhShowHistory('${o.id}', '${o.order_code}')" style="background:#fffbeb;color:#b45309;border:1.5px solid #fcd34d;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05);" title="Xem lịch sử hẹn lại">${timePrefix}${dayOfWeekName} - ${dayNum}/${monthNum}</span>`;
        }
        html += `<td style="padding:8px 6px;font-size:11px;">${rescheduleCell}</td>`;
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;text-align:center;white-space:nowrap;">${formatActualShipDateWithDay(o.shipped_at)}</td>`;
        
        html += `<td style="padding:8px 6px;" ${tienDoClick}>${progressBadge}</td>`;

        const remaining = Number(o.remaining_amount) || 0;
        const remColor = remaining > 0 ? '#dc2626' : '#059669';
        const remBg = remaining > 0 ? '#fee2e2' : '#dcfce7';
        const remBorder = remaining > 0 ? '#fca5a5' : '#86efac';
        html += `<td style="padding:8px 6px;white-space:nowrap;vertical-align:middle;">
            <span style="font-weight:800;color:${remColor};background:${remBg};border:1.5px solid ${remBorder};padding:4px 8px;border-radius:8px;font-size:12px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05);text-align:right;min-width:75px;">
                ${remaining.toLocaleString('vi-VN')}đ
            </span>
        </td>`;

        const totalAmount = Number(o.total_amount) || 0;
        html += `<td style="padding:8px 6px;white-space:nowrap;vertical-align:middle;">
            <span style="font-weight:800;color:#1e3a8a;background:#eff6ff;border:1.5px solid #bfdbfe;padding:4px 8px;border-radius:8px;font-size:12px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05);text-align:right;min-width:75px;">
                ${totalAmount.toLocaleString('vi-VN')}đ
            </span>
        </td>`;
        
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

        html += `<td style="padding:8px 6px;font-size:11px;color:#334155;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.customer_name||''}">${o.customer_name || '—'}</td>`;
        if (!isQLX) {
            html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;">${o.customer_phone || '—'}</td>`;
        }
        html += `<td style="padding:8px 6px;font-size:11px;color:#64748b;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.cskh_name || '—'}</td>`;
        html += '</tr>';

        const colCount = isQLX ? 12 : 13;
        const itemsTableHtml = _qlxdhBuildItemsTable(o);
        html += `<tr id="qlxdhItemsRow_${o.id}" style="display:none;background:#f8fafc;border-bottom:1.5px solid #cbd5e1;">
            <td colspan="${colCount}" style="padding:12px 16px;">
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

function _qlxdhToggleOrderItems(orderId) {
    const row = document.getElementById(`qlxdhItemsRow_${orderId}`);
    const chevron = document.getElementById(`qlxdhChevron_${orderId}`);
    if (!row || !chevron) return;
    if (row.style.display === 'none') {
        row.style.display = '';
        chevron.innerText = '▼';
    } else {
        row.style.display = 'none';
        chevron.innerText = '▶';
    }
}

function _qlxdhBuildProgressHTML(item) {
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

function _qlxdhBuildItemsTable(order) {
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
            actionHtml = '';
        } else {
            if (item.all_done) {
                actionHtml = `<span style="color:#10b981;font-weight:700;font-size:11.5px;">Chờ gửi</span>`;
            } else {
                actionHtml = `<button onclick="event.stopPropagation();_qlxdhAlertCannotShip('${(item.product_name||'').replace(/'/g,"\\'")}', '${item.missing_steps.join(', ')}', '${(order.order_code||'').replace(/'/g,"\\'")}', '${order.id}')" style="padding:3px 8px;border:none;border-radius:4px;background:#ef4444;color:white;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;">⚠️ Không gửi được</button>`;
            }
        }

        const progressHtml = _qlxdhBuildProgressHTML(item);
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

function _qlxdhShowAlert(title, contentHtml, width = '480px', backBtnHtml = '', headerStyle = '', icon = '⚠️') {
    document.getElementById('qlxdhAlertModal')?.remove();
    
    if (!document.getElementById('qlxdhAlertStyles')) {
        const style = document.createElement('style');
        style.id = 'qlxdhAlertStyles';
        style.innerHTML = `
            @keyframes qlxdhAlertFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes qlxdhAlertSlideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    const m = document.createElement('div');
    m.id = 'qlxdhAlertModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:qlxdhAlertFadeIn 0.2s ease-out;';
    
    const hStyle = headerStyle || 'background:linear-gradient(135deg,#ef4444,#dc2626);';
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:${width};max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;animation:qlxdhAlertSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="${hStyle}padding:18px 24px;color:white;display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">${icon}</span>
            <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;">${title}</div>
        </div>
        <div style="padding:22px 24px;font-size:13px;color:#334155;line-height:1.6;max-height:60vh;overflow-y:auto;">
            ${contentHtml}
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">
            ${backBtnHtml}
            <button onclick="document.getElementById('qlxdhAlertModal')?.remove()" style="padding:8px 20px;border:none;border-radius:8px;background:#374151;color:white;cursor:pointer;font-weight:700;font-size:13px;transition:background 0.2s;" onmouseover="this.style.background='#1f2937'" onmouseout="this.style.background='#374151'">Đóng</button>
        </div>
    </div>`;

    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

function _qlxdhAlertCannotShip(itemName, missing, orderCode, orderId = null) {
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
        backBtnHtml = `<button onclick="document.getElementById('qlxdhAlertModal')?.remove();_qlxdhAlertCannotShipOrder('${orderId}')" style="padding:8px 20px;border:1px solid #d97706;border-radius:8px;background:white;color:#d97706;cursor:pointer;font-weight:700;font-size:13px;margin-right:auto;display:inline-flex;align-items:center;gap:4px;">\u2190 Trở lại</button>`;
    }

    _qlxdhShowAlert('Không thể gửi phiếu hàng', html, '480px', backBtnHtml);
}

function _qlxdhAlertCannotShipOrder(orderId) {
    _qlxdhShowOrderSlipsModal(orderId);
}

function _qlxdhShowOrderSlipsModal(orderId) {
    const o = _qlxdhOrders.find(x => String(x.id) === String(orderId));
    if (!o) return;

    const pendingItems = o.items ? o.items.filter(item => item.shipping_status === 'pending') : [];

    let html = '';
    let title = '';
    let headerStyle = '';
    let icon = '⚠️';

    if (pendingItems.length === 0) {
        title = `Đơn hàng ${o.order_code}`;
        headerStyle = 'background:linear-gradient(135deg,#374151,#1f2937);';
        icon = '📦';
        html = `
            <div style="margin-bottom:12px;font-size:13px;color:#334155;">Đơn hàng <b style="color:#1e293b;">${o.order_code}</b> hiện tại không có phiếu sản phẩm nào ở trạng thái chờ gửi.</div>
        `;
    } else {
        title = `Đơn hàng chưa đủ điều kiện gửi — ${o.order_code}`;
        headerStyle = 'background:linear-gradient(135deg,#ef4444,#dc2626);';
        icon = '⚠️';

        const subtitleText = `Đơn hàng <b style="color:#1e293b;font-size:14px;">${o.order_code}</b> chưa đủ điều kiện gửi vì có phiếu sản phẩm chưa hoàn thành sản xuất:`;

        html = `
            <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>${subtitleText}</div>
                <div>
                    ${String(o.id).startsWith('sample_') ? '' : `<a href="/trasoatdonhang?search=${o.order_code}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#4f46e5;color:white;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 4px rgba(79,70,229,0.15)">🔍 Tra Soát Đơn</a>`}
                </div>
            </div>
            
            <div style="margin-bottom:14px;">
                ${_qlxdhBuildItemsTable(o)}
            </div>
        `;
    }

    _qlxdhShowAlert(title, html, '850px', '', headerStyle, icon);
}

// ===== RESCHEDULE MODAL =====
async function _qlxdhShowReschedule(id, code) {
    document.getElementById('qlxdhRescheduleModal')?.remove();
    await _qlxdhLoadHolidays();
    
    let limitVal = null;
    try {
        const configRes = await apiCall('/api/app-config/reschedule_limit_days_qlx');
        if (configRes && configRes.value) {
            limitVal = parseInt(configRes.value, 10);
        }
    } catch(e) { console.error(e); }

    const _today = vnDateStr();
    let dateInputHtml = '';
    
    if (limitVal && limitVal > 0) {
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
            const isHoliday = !!_qlxdhHolidayMap[dateStr];
            if (!isSunday && !isHoliday) {
                const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dayOfWeek];
                validDates.push({ dateStr, label: `${dayName} - ${d}/${m}/${y}` });
            }
        }
        
        dateInputHtml = `
            <select id="qlxdhNewDate" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;font-weight:700;color:#1e293b;background:white;cursor:pointer;">
                ${validDates.map(vd => `<option value="${vd.dateStr}">${vd.label}</option>`).join('')}
            </select>
        `;
    } else {
        const _tomorrow = new Date(_today);
        _tomorrow.setUTCDate(_tomorrow.getUTCDate() + 1);
        const _minDate = _tomorrow.toISOString().split('T')[0];
        dateInputHtml = `
            <input type="date" id="qlxdhNewDate" min="${_minDate}" onchange="_qlxdhCheckHoliday()" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;">
            <div id="qlxdhHolidayWarn" style="display:none;margin-top:6px;padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5;font-size:12px;color:#dc2626;font-weight:700;"></div>
        `;
    }

    window._qlxdhRescheduleImageBase64 = null;
    window._qlxdhClearRescheduleImage = function() {
        window._qlxdhRescheduleImageBase64 = null;
        const preview = document.getElementById('qlxdhImagePreview');
        const previewImg = document.getElementById('qlxdhPreviewImg');
        const pasteArea = document.getElementById('qlxdhPasteArea');
        if (preview && previewImg && pasteArea) {
            preview.style.display = 'none';
            previewImg.src = '';
            pasteArea.style.display = 'block';
        }
    };

    function _qlxdhCompressImage(file, callback) {
        if (!file.type.startsWith('image/')) {
            callback(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxW = 800, maxH = 800;
                let w = img.width, h = img.height;
                if (w > h) {
                    if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
                } else {
                    if (h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }
                }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    const m = document.createElement('div');
    m.id = 'qlxdhRescheduleModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    m.innerHTML = `<div style="background:white;border-radius:20px;width:440px;max-width:95vw;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;max-height:90vh;display:flex;flex-direction:column;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:20px 24px;display:flex;align-items:center;gap:10px;color:white;flex-shrink:0;">
            <span style="font-size:20px;">📅</span>
            <div>
                <div style="font-size:16px;font-weight:800;letter-spacing:-0.025em;">Hẹn Lịch Gửi Mới</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Mã đơn: <span style="color:#38bdf8;font-weight:700;">${code}</span></div>
            </div>
        </div>
        
        <!-- Body -->
        <div style="padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px;flex:1;">
            <!-- Ngày gửi mới -->
            <div>
                <label style="font-size:12.5px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">📅 Ngày gửi mới <span style="color:#ef4444">*</span></label>
                ${dateInputHtml}
            </div>
            
            <!-- Giờ & Phút (chia 2 cột) -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <label style="font-size:12.5px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">🕐 Giờ hẹn <span style="color:#ef4444">*</span></label>
                    <select id="qlxdhRescheduleHour" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13.5px;margin-top:6px;font-weight:600;color:#1e293b;background:white;cursor:pointer;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                        <option value="" disabled selected>-- Chọn giờ --</option>
                        ${Array.from({length: 24}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')} giờ</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:12.5px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">⏱️ Phút hẹn <span style="color:#ef4444">*</span></label>
                    <select id="qlxdhRescheduleMinute" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13.5px;margin-top:6px;font-weight:600;color:#1e293b;background:white;cursor:pointer;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                        <option value="" disabled selected>-- Chọn phút --</option>
                        <option value="0">00 phút</option>
                        <option value="15">15 phút</option>
                        <option value="30">30 phút</option>
                        <option value="45">45 phút</option>
                    </select>
                </div>
            </div>

            <!-- Lý do -->
            <div>
                <label style="font-size:12.5px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">📝 Lý do không ra đơn đúng ngày được <span style="color:#ef4444">*</span></label>
                <textarea id="qlxdhReason" rows="3" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13.5px;margin-top:6px;resize:none;outline:none;transition:border-color 0.2s;" placeholder="Nhập lý do chi tiết..." onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
            </div>

            <!-- Ảnh nhắn Sale báo lùi đơn -->
            <div>
                <label style="font-size:12.5px;font-weight:700;color:#334155;display:flex;align-items:center;gap:4px;">📸 Hình Ảnh Nhắn Sale báo thời gian lùi đơn <span style="color:#ef4444">*</span></label>
                <div id="qlxdhPasteArea" style="border:2px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;background:#f8fafc;color:#64748b;font-size:13px;font-weight:600;margin-top:6px;cursor:pointer;position:relative;transition:all 0.2s;" tabindex="0">
                    <div style="font-size:24px;margin-bottom:6px;">📋</div>
                    Nhấp chuột vào đây rồi nhấn <b>Ctrl + V</b> để dán hình ảnh chụp màn hình
                </div>
                <div id="qlxdhImagePreview" style="margin-top:6px;display:none;position:relative;width:100%;height:140px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
                    <img id="qlxdhPreviewImg" src="" style="width:100%;height:100%;object-fit:contain;background:#f8fafc;">
                    <button type="button" onclick="window._qlxdhClearRescheduleImage()" style="position:absolute;top:8px;right:8px;background:rgba(15,23,42,0.8);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;transition:background 0.2s;">✕</button>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
            <button onclick="document.getElementById('qlxdhRescheduleModal')?.remove()" style="padding:10px 20px;border:1.5px solid #cbd5e1;border-radius:8px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13.5px;transition:all 0.2s;">Hủy bộ</button>
            <button id="qlxdhRescheduleBtn" onclick="_qlxdhDoReschedule('${id}')" style="padding:10px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:800;font-size:13.5px;box-shadow:0 4px 6px -1px rgba(245,158,11,0.3);transition:all 0.2s;">📅 Xác nhận hẹn</button>
        </div>
    </div>`;

    const pasteHandler = function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                const blob = items[i].getAsFile();
                _qlxdhCompressImage(blob, function(compressed) {
                    if (compressed) {
                        window._qlxdhRescheduleImageBase64 = compressed;
                        const preview = document.getElementById('qlxdhImagePreview');
                        const previewImg = document.getElementById('qlxdhPreviewImg');
                        const pasteArea = document.getElementById('qlxdhPasteArea');
                        if (preview && previewImg && pasteArea) {
                            previewImg.src = compressed;
                            preview.style.display = 'block';
                            pasteArea.style.display = 'none';
                        }
                    }
                });
                break;
            }
        }
    };
    m.addEventListener('paste', pasteHandler);

    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

async function _qlxdhLoadHolidays() {
    try {
        const year = new Date().getFullYear();
        const res = await apiCall('/api/holidays?year=' + year);
        const res2 = await apiCall('/api/holidays?year=' + (year + 1));
        _qlxdhHolidayMap = {};
        (res.holidays || []).concat(res2.holidays || []).forEach(h => {
            const d = h.holiday_date ? h.holiday_date.split('T')[0] : '';
            if (d) _qlxdhHolidayMap[d] = h.holiday_name;
        });
    } catch(e) { console.error('[Holidays]', e); }
}

function _qlxdhCheckHoliday() {
    const dateVal = document.getElementById('qlxdhNewDate')?.value;
    const warnEl = document.getElementById('qlxdhHolidayWarn');
    const btn = document.getElementById('qlxdhRescheduleBtn');
    if (!dateVal || !warnEl || !btn) return;
    
    const d = new Date(dateVal + 'T00:00:00+07:00');
    const isSunday = d.getDay() === 0;
    const holidayName = _qlxdhHolidayMap[dateVal];
    
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

async function _qlxdhDoReschedule(id) {
    const newDate = document.getElementById('qlxdhNewDate')?.value;
    const hour = document.getElementById('qlxdhRescheduleHour')?.value;
    const minute = document.getElementById('qlxdhRescheduleMinute')?.value;
    const reason = document.getElementById('qlxdhReason')?.value;
    
    if (!newDate) { alert('Chọn ngày gửi mới'); return; }
    if (hour === undefined || hour === null || hour === '') { alert('⚠️ Vui lòng chọn giờ hẹn'); return; }
    if (minute === undefined || minute === null || minute === '') { alert('⚠️ Vui lòng chọn phút hẹn'); return; }
    if (!reason?.trim()) { alert('Nhập lý do không ra đơn đúng ngày được'); return; }
    if (!window._qlxdhRescheduleImageBase64) {
        alert('⚠️ Hình Ảnh Nhắn Sale báo thời gian lùi đơn là bắt buộc!');
        return;
    }
    
    const d = new Date(newDate + 'T00:00:00+07:00');
    if (d.getDay() === 0) { alert('⚠️ Không được hẹn vào ngày Chủ Nhật'); return; }
    if (_qlxdhHolidayMap[newDate]) { alert('⚠️ Không được hẹn vào ngày lễ: ' + _qlxdhHolidayMap[newDate]); return; }
    
    try {
        const r = await apiCall(`/api/shipping/orders/${id}/reschedule`, 'POST', {
            new_date: newDate,
            reason: reason.trim(),
            page_type: 'qlx',
            image_base64: window._qlxdhRescheduleImageBase64,
            reschedule_hour: hour,
            reschedule_minute: minute
        });
        if (r.error) { alert(r.error); return; }
        showToast(r.message || '✅ Đã hẹn lại');
        document.getElementById('qlxdhRescheduleModal')?.remove();
        _qlxdhLoadOrders();
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _qlxdhShowHistory(id, code) {
    document.getElementById('qlxdhHistoryModal')?.remove();
    try {
        const data = await apiCall(`/api/shipping/orders/${id}/history`);
        const rows = data.history || [];
        const m = document.createElement('div');
        m.id = 'qlxdhHistoryModal';
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
            @keyframes qlxdhHistorySlideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .qlxdh-history-card:hover {
                border-color: #3b82f6 !important;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05) !important;
            }
            .qlxdh-history-img:hover {
                transform: scale(1.02);
                border-color: #3b82f6 !important;
            }
        </style>
        <div style="background:white;border-radius:16px;width:550px;max-width:95vw;max-height:85vh;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;display:flex;flex-direction:column;animation:qlxdhHistorySlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
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
                        <div class="qlxdh-history-card" style="flex:1;background:white;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);transition:all 0.2s;">
                            
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
                                <div class="qlxdh-history-img" style="position:relative;display:inline-block;overflow:hidden;border-radius:8px;border:1px solid #e2e8f0;width:100%;max-width:240px;aspect-ratio:16/10;background:#f1f5f9;cursor:pointer;transition:all 0.2s;"
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
                <button onclick="document.getElementById('qlxdhHistoryModal')?.remove()" style="padding:8px 20px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">Đóng</button>
            </div>
        </div>`;
        document.body.appendChild(m);
        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _qlxdhShowShippingDetailOnly(orderId) {
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
            
            const shippedBatches = {};
            const pendingItems = [];

            if (data.shipments && data.shipments.length > 0) {
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
                    const itBillCid = `_qlxdhitBillImgModal_${o.id}_${it.id}`;
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
                    const _billCid = `_qlxdhbillImgModal_${o.id}`;
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

// ========== BAO LOI MODAL (QLX) ==========
window._qlxdhErrorImages = [];
window._qlxdhErrorVideo = null;
window._qlxdhSubmitBusy = false;
window._qlxdhBusy = false;
window._qlxdhPasteHandler = null;

function _qlxdhDataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

async function _qlxdhOpenErrorModal(orderId) {
    if (window._qlxdhBusy) return;
    window._qlxdhBusy = true;

    try {
        var o = _qlxdhOrders.find(function(x) { return String(x.id) === String(orderId); });
        if (!o) { showToast('Không tìm thấy đơn hàng', 'error'); window._qlxdhBusy = false; return; }

        var commonErrors = [];
        try {
            var ce = await apiCall('/api/common-errors-tpl');
            commonErrors = ce.items || [];
        } catch(e) { console.error(e); }

        var old = document.getElementById('_qlxdhErrorModal'); if (old) old.remove();

        var reporterName = 'Người Báo Lỗi: QLX - ' + (window.currentUser ? window.currentUser.full_name : 'Quản lý xưởng');
        var saleName = o.cskh_name || '—';
        var prodQty = o.items ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

        window._qlxdhErrorImages = [];
        window._qlxdhErrorVideo = null;

        var h = '<div class="bpc-modal-overlay show" id="_qlxdhErrorModal" onclick="if(event.target===this)_qlxdhCloseErrorModal()" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;overflow-y:auto">';
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
        h += '<select id="qlxdhE_common" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f8fafc;outline:none;">';
        h += '<option value="">-- Chọn loại lỗi (nếu có) --</option>';
        commonErrors.forEach(function(ce){
            h += '<option value="' + ce.error_name + '">' + ce.error_name + '</option>';
        });
        h += '</select></div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">Số Lượng Lỗi <span style="color:#ef4444">*</span></label>';
        h += '<input type="number" id="qlxdhE_qty" min="1" max="' + (prodQty || 9999) + '" value="" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:800;color:#dc2626;outline:none;" placeholder="Nhập số lượng lỗi...">';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">Nội Dung Chi Tiết <span style="color:#ef4444">*</span></label>';
        h += '<textarea id="qlxdhE_content" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-family:inherit;outline:none;" placeholder="Mô tả chi tiết lỗi..."></textarea>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">📷 Hình Ảnh Minh Họa <span style="color:#ef4444">*</span></label>';
        h += '<div style="border:1.5px dashed #7c3aed;border-radius:10px;padding:16px 20px;text-align:center;background:rgba(124,58,237,0.03);color:#7c3aed;font-size:13px;font-weight:700;">';
        h += '    Bấm <span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:800">Ctrl + V</span> tại bất kỳ đâu trên trang này để dán ảnh';
        h += '</div>';
        h += '<div id="qlxdhE_previews" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">🎥 Video Minh Họa (Không bắt buộc)</label>';
        h += '<input type="file" id="qlxdhE_video" accept="video/*" style="font-size:11px;width:100%" onchange="_qlxdhUploadErrorVideo(event)">';
        h += '</div>';

        h += '</div>';

        h += '<div class="bpc-modal-actions" style="margin-top:0;padding:16px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;border-radius:0 0 16px 16px;">';
        h += '<button class="bpc-modal-btn cancel" onclick="_qlxdhCloseErrorModal()" style="padding:10px 20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Hủy</button>';
        h += '<button class="bpc-modal-btn confirm" id="_qlxdhErrorSubmitBtn" style="padding:10px 24px;border:none;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;" onclick="_qlxdhSubmitError(\'' + orderId + '\')">🚨 BÁO LỖI</button>';
        h += '</div>';

        h += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', h);

        _qlxdhSetupPasteListener();
        window._qlxdhBusy = false;
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        window._qlxdhBusy = false;
    }
}

function _qlxdhCloseErrorModal() {
    var m = document.getElementById('_qlxdhErrorModal');
    if (m) { m.remove(); }
    if (window._qlxdhPasteHandler) {
        window.removeEventListener('paste', window._qlxdhPasteHandler);
        window._qlxdhPasteHandler = null;
    }
}

function _qlxdhCompressImage(file, callback) {
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

function _qlxdhAddErrorImage(file) {
    _qlxdhCompressImage(file, function(compressed) {
        if (!compressed) return;
        window._qlxdhErrorImages.push(compressed);
        _qlxdhRenderErrorImagePreviews();
    });
}

function _qlxdhRenderErrorImagePreviews() {
    var area = document.getElementById('qlxdhE_previews');
    if (!area) return;
    var h = '';
    window._qlxdhErrorImages.forEach(function(imgData, index) {
        h += '<div style="position:relative;display:inline-block">';
        h += '<img src="' + imgData + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">';
        h += '<span onclick="_qlxdhRemoveErrorImage(' + index + ')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:900;text-align:center;line-height:16px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>';
        h += '</div>';
    });
    area.innerHTML = h;
}

function _qlxdhRemoveErrorImage(index) {
    window._qlxdhErrorImages.splice(index, 1);
    _qlxdhRenderErrorImagePreviews();
}

function _qlxdhSetupPasteListener() {
    if (window._qlxdhPasteHandler) {
        window.removeEventListener('paste', window._qlxdhPasteHandler);
    }
    window._qlxdhPasteHandler = function(e) {
        if (!document.getElementById('_qlxdhErrorModal')) return;
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                var blob = items[i].getAsFile();
                _qlxdhAddErrorImage(blob);
            }
        }
    };
    window.addEventListener('paste', window._qlxdhPasteHandler);
}

function _qlxdhUploadErrorVideo(event) {
    const file = event.target.files[0];
    if (file) {
        window._qlxdhErrorVideo = file;
    } else {
        window._qlxdhErrorVideo = null;
    }
}

async function _qlxdhSubmitError(orderId) {
    if (window._qlxdhSubmitBusy) return;

    var qtyEl = document.getElementById('qlxdhE_qty');
    var qty = Number(qtyEl.value) || 0;
    if (qty <= 0) { showToast('Vui lòng nhập số lượng lỗi hợp lệ!', 'error'); return; }

    var contentEl = document.getElementById('qlxdhE_content');
    var content = contentEl.value.trim();
    if (!content) { showToast('Vui lòng nhập chi tiết nội dung lỗi!', 'error'); return; }

    if (!window._qlxdhErrorImages || window._qlxdhErrorImages.length === 0) {
        showToast('Vui lòng dán hoặc chọn ít nhất 1 hình ảnh minh họa bắt buộc!', 'error');
        return;
    }

    window._qlxdhSubmitBusy = true;
    var btn = document.getElementById('_qlxdhErrorSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; }

    try {
        var o = _qlxdhOrders.find(function(x) { return String(x.id) === String(orderId); });
        if (!o) { throw new Error('Không tìm thấy đơn hàng'); }

        var prodQty = o.items ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

        var today = new Date().toISOString().split('T')[0];
        if (typeof vnNow === 'function') {
            var n = vnNow();
            today = n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
        }

        var body = {
            report_date: today,
            common_error_type: document.getElementById('qlxdhE_common') ? document.getElementById('qlxdhE_common').value : '',
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

        if (window._qlxdhErrorImages && window._qlxdhErrorImages.length > 0 && result.id) {
            var fd = new FormData();
            window._qlxdhErrorImages.forEach(function(imgData, index) {
                var blob = _qlxdhDataURLtoBlob(imgData);
                fd.append('file_' + index, blob, 'image_' + index + '.jpeg');
            });
            await fetch('/api/customer-errors/' + result.id + '/images', { method: 'POST', body: fd });
        }

        if (window._qlxdhErrorVideo && result.id) {
            var fdv = new FormData();
            fdv.append('video', window._qlxdhErrorVideo);
            await fetch('/api/customer-errors/' + result.id + '/video', { method: 'POST', body: fdv });
        }

        showToast('✅ Đã báo đơn lỗi thành công!');
        _qlxdhCloseErrorModal();
        await _qlxdhLoadOrders();
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🚨 BÁO LỖI'; }
    } finally {
        window._qlxdhSubmitBusy = false;
    }
}

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

async function _qlxdhOpenRescheduleLimitModal() {
    document.getElementById('qlxdhRescheduleLimitModal')?.remove();
    
    const m = document.createElement('div');
    m.id = 'qlxdhRescheduleLimitModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    m.innerHTML = `<div style="background:white;border-radius:16px;width:450px;max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:18px 24px;color:white;display:flex;align-items:center;justify-content:between;">
            <div style="font-weight:800;font-size:16px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">📅 Giới Hạn Hẹn Lại (Hôm Nay QLX)</div>
            <button onclick="document.getElementById('qlxdhRescheduleLimitModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;font-weight:bold;margin-left:auto;">×</button>
        </div>
        <div style="padding:24px;font-size:13px;color:#334155;" id="qlxdhRescheduleLimitBody">
            <div style="display:flex;justify-content:center;padding:20px 0;">
                <div style="display:inline-block;width:24px;height:24px;border:3px solid #f3f3f3;border-top:3px solid #d97706;border-radius:50%;animation:spin 1s linear infinite;"></div>
            </div>
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="document.getElementById('qlxdhRescheduleLimitModal')?.remove()" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.2s;">Hủy bỏ</button>
            <button id="qlxdhSaveRescheduleLimitBtn" onclick="_qlxdhSaveRescheduleLimitSettings()" style="padding:9px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:800;font-size:13px;box-shadow:0 4px 10px rgba(5,150,105,0.25);transition:all 0.2s;" disabled>Lưu Cài Đặt</button>
        </div>
    </div>`;
    
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    
    try {
        const res = await apiCall('/api/app-config/reschedule_limit_days_qlx');
        const limitVal = res && res.value ? res.value : '';
        const bodyEl = document.getElementById('qlxdhRescheduleLimitBody');
        if (!bodyEl) return;
        
        bodyEl.innerHTML = `
            <div style="margin-bottom:12px;font-weight:700;color:#1e293b;">Số ngày giới hạn hẹn lại tối đa cho QLX:</div>
            <input type="number" id="qlxdhRescheduleLimitInput" value="${limitVal}" placeholder="Nhập số ngày (VD: 3)..." style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-weight:600;color:#1e293b;">
            <div style="margin-top:8px;font-size:11px;color:#64748b;line-height:1.4;">
                * Thiết lập số ngày tối đa mà QLX có thể chọn khi hẹn lại đơn hàng gửi. Hệ thống sẽ tự động bỏ qua ngày Chủ Nhật và các ngày Lễ khi tính các ngày gần nhất.
                <br>
                * Để trống hoặc nhập 0 để tắt giới hạn (QLX có thể chọn ngày bất kỳ, ngoại trừ Chủ Nhật và Lễ).
            </div>
        `;
        document.getElementById('qlxdhSaveRescheduleLimitBtn').disabled = false;
    } catch (err) {
        const bodyEl = document.getElementById('qlxdhRescheduleLimitBody');
        if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center;color:#dc2626;font-weight:700;padding:20px;">Lỗi tải dữ liệu: ${err.message}</div>`;
    }
}

async function _qlxdhSaveRescheduleLimitSettings() {
    const btn = document.getElementById('qlxdhSaveRescheduleLimitBtn');
    const input = document.getElementById('qlxdhRescheduleLimitInput');
    if (!input) return;
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang lưu...';
    }
    
    try {
        const val = input.value.trim();
        const r = await apiCall('/api/app-config/reschedule_limit_days_qlx', 'PUT', { value: val });
        if (r.error) {
            alert(r.error);
        } else {
            showToast('✅ Đã lưu cài đặt Giới Hạn Hẹn Lại QLX');
            document.getElementById('qlxdhRescheduleLimitModal')?.remove();
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

async function _qlxdhOpenProcessingDaysModal() {
    document.getElementById('qlxdhProcessingDaysModal')?.remove();
    
    const m = document.createElement('div');
    m.id = 'qlxdhProcessingDaysModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    m.innerHTML = `<div style="background:white;border-radius:16px;width:480px;max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:linear-gradient(135deg,#0284c7,#0ea5e9);padding:18px 24px;color:white;display:flex;align-items:center;justify-content:between;">
            <div style="font-weight:800;font-size:16px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">⚙️ Cấu Hình Ngày Xử Lý (Hôm Nay QLX)</div>
            <button onclick="document.getElementById('qlxdhProcessingDaysModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;font-weight:bold;margin-left:auto;">×</button>
        </div>
        <div style="padding:24px;font-size:13px;color:#334155;" id="qlxdhProcessingDaysBody">
            <div style="display:flex;justify-content:center;padding:20px 0;">
                <div style="display:inline-block;width:24px;height:24px;border:3px solid #f3f3f3;border-top:3px solid #0284c7;border-radius:50%;animation:spin 1s linear infinite;"></div>
            </div>
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="document.getElementById('qlxdhProcessingDaysModal')?.remove()" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#475569;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.2s;">Hủy bỏ</button>
            <button id="qlxdhSaveProcessingDaysBtn" onclick="_qlxdhSaveProcessingDaysSettings()" style="padding:9px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:800;font-size:13px;box-shadow:0 4px 10px rgba(5,150,105,0.25);transition:all 0.2s;" disabled>Lưu Cấu Hình</button>
        </div>
    </div>`;
    
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    
    try {
        const res = await apiCall('/api/app-config/qlx_processing_days_limit');
        const configVal = res && res.value ? parseInt(res.value, 10) : 1;
        const bodyEl = document.getElementById('qlxdhProcessingDaysBody');
        if (!bodyEl) return;
        
        let isCustom = ![1, 2, 3].includes(configVal);
        
        bodyEl.innerHTML = `
            <div style="margin-bottom:14px;font-weight:700;color:#1e293b;">Chọn phạm vi ngày gom đơn vào mục "Hôm Nay Xử Lý":</div>
            <select id="qlxdhProcessingDaysPreset" onchange="_qlxdhOnProcessingDaysPresetChange(this.value)" style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-weight:600;color:#1e293b;margin-bottom:12px;">
                <option value="1" ${configVal === 1 ? 'selected' : ''}>Chỉ hôm nay (1 ngày làm việc)</option>
                <option value="2" ${configVal === 2 ? 'selected' : ''}>Hôm nay và ngày mai (2 ngày làm việc)</option>
                <option value="3" ${configVal === 3 ? 'selected' : ''}>Hôm nay, ngày mai và ngày kia (3 ngày làm việc)</option>
                <option value="custom" ${isCustom ? 'selected' : ''}>Tùy chỉnh số ngày...</option>
            </select>
            
            <div id="qlxdhCustomProcessingDaysContainer" style="display:${isCustom ? 'block' : 'none'};margin-bottom:12px;">
                <div style="margin-bottom:6px;font-weight:700;color:#475569;">Số ngày làm việc xử lý:</div>
                <input type="number" id="qlxdhProcessingDaysInput" value="${configVal}" min="1" max="30" style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-weight:600;color:#1e293b;">
            </div>
            
            <div style="margin-top:8px;font-size:11px;color:#64748b;line-height:1.4;">
                * Hệ thống sẽ tự động bỏ qua ngày Chủ Nhật và các ngày Lễ khi tính các ngày làm việc kế tiếp.
                <br>
                * Toàn bộ đơn hàng nằm trong phạm vi ngày này (theo cột Gửi Dự Kiến hoặc Hẹn Lại) sẽ được gom vào mục <strong>Hôm Nay Xử Lý</strong> để quản lý xưởng chuẩn bị sản xuất trước.
            </div>
        `;
        document.getElementById('qlxdhSaveProcessingDaysBtn').disabled = false;
    } catch (err) {
        const bodyEl = document.getElementById('qlxdhProcessingDaysBody');
        if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center;color:#dc2626;font-weight:700;padding:20px;">Lỗi tải dữ liệu: ${err.message}</div>`;
    }
}

function _qlxdhOnProcessingDaysPresetChange(val) {
    const container = document.getElementById('qlxdhCustomProcessingDaysContainer');
    if (!container) return;
    if (val === 'custom') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        const input = document.getElementById('qlxdhProcessingDaysInput');
        if (input) input.value = val;
    }
}

async function _qlxdhSaveProcessingDaysSettings() {
    const btn = document.getElementById('qlxdhSaveProcessingDaysBtn');
    const presetSelect = document.getElementById('qlxdhProcessingDaysPreset');
    const input = document.getElementById('qlxdhProcessingDaysInput');
    if (!presetSelect || !input) return;
    
    let val = input.value.trim();
    if (presetSelect.value !== 'custom') {
        val = presetSelect.value;
    }
    
    if (!val || isNaN(parseInt(val, 10)) || parseInt(val, 10) < 1) {
        alert('Vui lòng nhập số ngày làm việc hợp lệ (từ 1 trở lên).');
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang lưu...';
    }
    
    try {
        const r = await apiCall('/api/app-config/qlx_processing_days_limit', 'PUT', { value: val });
        if (r.error) {
            alert(r.error);
        } else {
            showToast('✅ Đã lưu cấu hình ngày xử lý');
            document.getElementById('qlxdhProcessingDaysModal')?.remove();
            _qlxdhLoadOrders();
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

// Bind to window to allow HTML onclick access
window.renderDonhanghomnayqlxPage = renderDonhanghomnayqlxPage;
window._qlxdhSetFilter = _qlxdhSetFilter;
window._qlxdhOnCskhChange = _qlxdhOnCskhChange;
window._qlxdhOnSearch = _qlxdhOnSearch;
window._qlxdhSelectYearMonth = _qlxdhSelectYearMonth;
window._qlxdhToggleOrderItems = _qlxdhToggleOrderItems;
window._qlxdhAlertCannotShip = _qlxdhAlertCannotShip;
window._qlxdhAlertCannotShipOrder = _qlxdhAlertCannotShipOrder;
window._qlxdhShowOrderSlipsModal = _qlxdhShowOrderSlipsModal;
window._qlxdhShowReschedule = _qlxdhShowReschedule;
window._qlxdhCheckHoliday = _qlxdhCheckHoliday;
window._qlxdhDoReschedule = _qlxdhDoReschedule;
window._qlxdhShowHistory = _qlxdhShowHistory;
window._qlxdhShowShippingDetailOnly = _qlxdhShowShippingDetailOnly;
window._qlxdhOpenErrorModal = _qlxdhOpenErrorModal;
window._qlxdhCloseErrorModal = _qlxdhCloseErrorModal;
window._qlxdhRemoveErrorImage = _qlxdhRemoveErrorImage;
window._qlxdhUploadErrorVideo = _qlxdhUploadErrorVideo;
window._qlxdhSubmitError = _qlxdhSubmitError;
window._dhtShowTraSoatModal = _dhtShowTraSoatModal;
window._qlxdhOpenRescheduleLimitModal = _qlxdhOpenRescheduleLimitModal;
window._qlxdhSaveRescheduleLimitSettings = _qlxdhSaveRescheduleLimitSettings;
window._qlxdhOpenProcessingDaysModal = _qlxdhOpenProcessingDaysModal;
window._qlxdhOnProcessingDaysPresetChange = _qlxdhOnProcessingDaysPresetChange;
window._qlxdhSaveProcessingDaysSettings = _qlxdhSaveProcessingDaysSettings;

// version 20260619_v4
