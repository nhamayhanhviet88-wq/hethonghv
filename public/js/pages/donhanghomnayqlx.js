// ========== ĐƠN HÀNG HÔM NAY QUẢN LÝ XƯỞNG ==========
let _dhnqlxFilter = 'xu_ly';
let _dhnqlxData = { som: [], xu_ly: [], hen_lai: [], hoan_thanh: [] };
let _dhnqlxCounts = { som: 0, xu_ly: 0, hen_lai: 0, hoan_thanh: 0 };
let _dhnqlxSearchVal = '';
let _dhnqlxConfig = { xu_ly_days: 1, hoan_thanh_mode: 'today' };
let _dhnqlxCompletedMonths = [];
let _dhnqlxExpandedMonths = new Set();
let _dhnqlxMonthOrders = {};
let _qlxHolidaysSet = new Set();

async function _qlxLoadHolidays() {
    try {
        _qlxHolidaysSet.clear();
        const currentYear = new Date().getFullYear();
        const res1 = await apiCall(`/api/holidays?year=${currentYear}`);
        if (res1 && res1.holidays) {
            res1.holidays.forEach(h => {
                const dateStr = h.holiday_date.split('T')[0];
                _qlxHolidaysSet.add(dateStr);
            });
        }
        const res2 = await apiCall(`/api/holidays?year=${currentYear + 1}`);
        if (res2 && res2.holidays) {
            res2.holidays.forEach(h => {
                const dateStr = h.holiday_date.split('T')[0];
                _qlxHolidaysSet.add(dateStr);
            });
        }
    } catch (e) {
        console.error('Lỗi tải danh sách ngày lễ:', e);
    }
}

function _qlxGetMinDateTimeStr() {
    const date = new Date();
    const tzOffset = 7 * 60; // Vietnam timezone (UTC+7)
    const localTime = new Date(date.getTime() + tzOffset * 60 * 1000);
    return localTime.toISOString().slice(0, 16);
}


async function renderDonhanghomnayqlxPage(container) {
    _dhnqlxFilter = 'xu_ly';
    _dhnqlxSearchVal = '';
    
    container.innerHTML = `
    <style>
        .dhnqlx-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 16px;
            font-family: 'Inter', sans-serif;
        }
        .dhnqlx-title {
            margin: 0 0 16px;
            font-size: 22px;
            color: #1e293b;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
        }
        .dhnqlx-layout {
            display: flex;
            gap: 16px;
            align-items: flex-start;
        }
        .dhnqlx-sidebar {
            width: 240px;
            flex-shrink: 0;
        }
        .dhnqlx-main {
            flex: 1;
            min-width: 0;
        }
        .dhnqlx-tab-card {
            padding: 12px 14px;
            margin-bottom: 8px;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.2s ease;
            border: 2px solid #e2e8f0;
            background: white;
        }
        .dhnqlx-tab-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .dhnqlx-tab-card.active {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .dhnqlx-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 800;
            color: white;
        }
        .dhnqlx-search-input {
            width: 100%;
            padding: 9px 12px 9px 36px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            outline: none;
            transition: all 0.2s;
        }
        .dhnqlx-search-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .dhnqlx-table-container {
            overflow-x: auto;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,.05);
            background: white;
            margin-top: 12px;
        }
        .dhnqlx-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            min-width: 1100px;
        }
        .dhnqlx-table th {
            padding: 10px 8px;
            color: white;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .5px;
            text-align: left;
        }
        .dhnqlx-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            vertical-align: middle;
        }
        .dhnqlx-action-btn {
            padding: 4px 8px;
            border: 1px solid transparent;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .dhnqlx-action-btn:hover {
            transform: scale(1.02);
        }
        .dhnqlx-btn-blue { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
        .dhnqlx-btn-blue:hover { background: #dbeafe; }
        .dhnqlx-btn-green { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
        .dhnqlx-btn-green:hover { background: #d1fae5; }
        .dhnqlx-btn-yellow { background: #fffbeb; color: #d97706; border-color: #fde68a; }
        .dhnqlx-btn-yellow:hover { background: #fef3c7; }
        .dhnqlx-btn-gray { background: #f9fafb; color: #4b5563; border-color: #e5e7eb; }
        .dhnqlx-btn-gray:hover { background: #f3f4f6; }
        
        .dhnqlx-prio-tag {
            padding: 2.5px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 800;
            display: inline-block;
            line-height: 1;
        }
        .dhnqlx-prio-gap { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
        .dhnqlx-prio-gui { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .dhnqlx-prio-chuan { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }

        @keyframes dhnqlxModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dhnqlxModalSlideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
    
    <div class="dhnqlx-container">
        <div class="dhnqlx-title">
            <span style="display:flex;align-items:center;gap:8px;">🏭 Đơn Hàng Hôm Nay QLX</span>
            <button id="dhnqlxConfigBtn" onclick="_dhnqlxOpenConfigModal()" style="display:none; padding:8px 14px; background:white; border:1.5px solid #cbd5e1; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; color:#475569; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.borderColor='#4f46e5';this.style.color='#4f46e5';" onmouseout="this.style.borderColor='#cbd5e1';this.style.color='#475569';">
                ⚙️ Cấu Hình QLX
            </button>
        </div>
        <div class="dhnqlx-layout">
            <div id="dhnqlxSidebar" class="dhnqlx-sidebar"></div>
            <div class="dhnqlx-main">
                <div style="position:relative; max-width: 400px;">
                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;">🔍</span>
                    <input type="text" id="dhnqlxSearchInput" class="dhnqlx-search-input" placeholder="Tìm mã đơn, tên khách, SĐT..." oninput="_dhnqlxOnSearch(this.value)">
                </div>
                <div id="dhnqlxContent"></div>
            </div>
        </div>
    </div>`;

    await _dhnqlxLoadData();
    _dhnqlxLoadCutoffTime();
    _qlxLoadHolidays();
}

// ===== DATA OPERATIONS =====
async function _dhnqlxLoadData() {
    const el = document.getElementById('dhnqlxContent');
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải dữ liệu...</div>';
    
    try {
        const res = await apiCall('/api/qlx-orders/today-summary');
        if (res && res.tabs) {
            _dhnqlxData.som = res.tabs.som.orders || [];
            _dhnqlxData.xu_ly = res.tabs.xu_ly.orders || [];
            _dhnqlxData.hen_lai = res.tabs.hen_lai.orders || [];
            _dhnqlxData.hoan_thanh = res.tabs.hoan_thanh.orders || [];

            _dhnqlxCounts.som = res.tabs.som.count || 0;
            _dhnqlxCounts.xu_ly = res.tabs.xu_ly.count || 0;
            _dhnqlxCounts.hen_lai = res.tabs.hen_lai.count || 0;
            _dhnqlxCounts.hoan_thanh = res.tabs.hoan_thanh.count || 0;

            if (res.config) {
                _dhnqlxConfig.xu_ly_days = res.config.xu_ly_days;
                _dhnqlxConfig.hoan_thanh_mode = res.config.hoan_thanh_mode;
            }
        }

        // If hoan_thanh_mode is 'all', let's load completed-months list
        if (_dhnqlxConfig.hoan_thanh_mode === 'all') {
            const monthsRes = await apiCall('/api/qlx-orders/completed-months');
            _dhnqlxCompletedMonths = monthsRes || [];
        } else {
            _dhnqlxCompletedMonths = [];
        }

        _dhnqlxRenderSidebar();
        _dhnqlxRenderContent();
    } catch(e) {
        if (el) el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

async function _dhnqlxLoadCutoffTime() {
    if (typeof currentUser === 'undefined' || !currentUser || currentUser.role !== 'giam_doc') return;
    try {
        const res = await apiCall('/api/penalty/config');
        const configs = res.configs || [];
        const cfg = configs.find(c => c.key === 'qlx_cutoff_time');
        const amount = cfg ? cfg.amount : 1080; // default 18:00
        
        // Load QLX configs
        const qlxRes = await apiCall('/api/qlx-orders/config');
        _dhnqlxConfig.xu_ly_days = qlxRes.xu_ly_days || 1;
        _dhnqlxConfig.hoan_thanh_mode = qlxRes.hoan_thanh_mode || 'today';
        
        const btn = document.getElementById('dhnqlxConfigBtn');
        if (btn) {
            btn.style.display = 'inline-flex';
            btn.dataset.cutoffValue = amount;
            btn.innerHTML = `⚙️ Cấu Hình QLX`;
        }
    } catch(e) {
        console.error('Failed to load configs:', e);
    }
}

function _dhnqlxRenderSidebar() {
    const sb = document.getElementById('dhnqlxSidebar');
    if (!sb) return;

    const tabsDef = [
        { key: 'xu_ly', label: 'ĐƠN HÀNG XỬ LÝ', icon: '🔴', color: '#dc2626', bg: '#fef2f2', badgeClass: 'xu_ly' },
        { key: 'som', label: 'ĐƠN HÀNG SỚM', icon: '🔵', color: '#3b82f6', bg: '#eff6ff', badgeClass: 'som' },
        { key: 'hen_lai', label: 'ĐƠN HÀNG HẸN LẠI', icon: '🟡', color: '#d97706', bg: '#fffbeb', badgeClass: 'hen_lai' },
        { key: 'hoan_thanh', label: 'ĐƠN HÀNG HOÀN THÀNH', icon: '✅', color: '#059669', bg: '#ecfdf5', badgeClass: 'hoan_thanh' }
    ];

    sb.innerHTML = tabsDef.map(t => {
        const active = _dhnqlxFilter === t.key;
        
        // Compute count dynamically based on search filter
        let cnt = 0;
        const list = _dhnqlxData[t.key] || [];
        if (_dhnqlxSearchVal) {
            cnt = list.filter(o => 
                (o.order_code || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                (o.customer_name || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                (o.customer_phone || '').toLowerCase().includes(_dhnqlxSearchVal)
            ).length;
        } else {
            cnt = list.length;
        }

        const borderColor = active ? t.color : '#e2e8f0';
        const background = active ? t.bg : 'white';
        const textColor = active ? t.color : '#475569';
        const badgeBg = t.color;

        return `
            <div onclick="_dhnqlxSetFilter('${t.key}')" class="dhnqlx-tab-card ${active ? 'active' : ''}" style="border-color: ${borderColor}; background: ${background};">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">${t.icon}</span>
                    <span style="font-size:12px;font-weight:700;color:${textColor};">${t.label}</span>
                </div>
                <span class="dhnqlx-badge" style="background:${badgeBg};">${cnt}</span>
            </div>
        `;
    }).join('');
}

function _dhnqlxSetFilter(key) {
    _dhnqlxFilter = key;
    _dhnqlxRenderSidebar();
    _dhnqlxRenderContent();
}

function _dhnqlxOnSearch(val) {
    _dhnqlxSearchVal = val.trim().toLowerCase();

    if (_dhnqlxSearchVal) {
        const tabsDefKeys = ['xu_ly', 'som', 'hen_lai', 'hoan_thanh'];
        const matchedCounts = {};
        tabsDefKeys.forEach(key => {
            const list = _dhnqlxData[key] || [];
            matchedCounts[key] = list.filter(o => 
                (o.order_code || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                (o.customer_name || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                (o.customer_phone || '').toLowerCase().includes(_dhnqlxSearchVal)
            ).length;
        });

        // If the query matches anything, switch the filter to the first tab that has matches
        const firstMatchTab = tabsDefKeys.find(key => matchedCounts[key] > 0);
        if (firstMatchTab && firstMatchTab !== _dhnqlxFilter) {
            _dhnqlxFilter = firstMatchTab;
        }

        // If we switched to/are in hoan_thanh, auto-expand any months containing matches
        if (_dhnqlxFilter === 'hoan_thanh') {
            for (const monthKey in _dhnqlxMonthOrders) {
                const monthOrders = _dhnqlxMonthOrders[monthKey] || [];
                const monthMatches = monthOrders.filter(o => 
                    (o.order_code || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                    (o.customer_name || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                    (o.customer_phone || '').toLowerCase().includes(_dhnqlxSearchVal)
                ).length;
                if (monthMatches > 0) {
                    _dhnqlxExpandedMonths.add(monthKey);
                }
            }
        }
    }

    _dhnqlxRenderSidebar();
    _dhnqlxRenderContent();
}

function getProgressSaleHTML(o) {
    if (!o.expected_ship_date) {
        return '<span style="color:#94a3b8;font-style:italic">—</span>';
    }
    const shipVN = new Date(o.expected_ship_date);
    shipVN.setHours(0,0,0,0);
    
    if (o.shipped_at) {
        const actualVN = new Date(o.shipped_at);
        actualVN.setHours(0,0,0,0);
        const diffDays = Math.round((shipVN - actualVN) / 86400000);
        if (diffDays > 0) {
            return `<span style="color:#0369a1;font-weight:800;">🚀 Nhanh ${diffDays} ngày</span>`;
        } else if (diffDays < 0) {
            return `<span style="color:#dc2626;font-weight:800;">⚠️ Trễ ${Math.abs(diffDays)} ngày</span>`;
        } else {
            return `<span style="color:#059669;font-weight:800;">✅ Đúng hạn</span>`;
        }
    } else {
        const todayVN = typeof vnNow === 'function' ? vnNow() : new Date();
        todayVN.setHours(0,0,0,0);
        const remainDays = Math.round((shipVN - todayVN) / 86400000);
        if (remainDays > 0) {
            return `<span style="color:#2563eb;font-weight:800;">📅 Còn ${remainDays} ngày</span>`;
        } else if (remainDays < 0) {
            return `<span style="color:#dc2626;font-weight:800;">⚠️ Quá hạn ${Math.abs(remainDays)} ngày</span>`;
        } else {
            return `<span style="color:#d97706;font-weight:800;">📦 Hôm nay gửi</span>`;
        }
    }
}

function formatExpectedShipDateWithDay(dateVal) {
    if (!dateVal) return '—';
    const dt = new Date(dateVal);
    const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const day = localDt.getDate();
    const month = localDt.getMonth() + 1;
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = daysOfWeek[localDt.getDay()];
    return `${dayName} - ${day}/${month}`;
}

function _dhnqlxRenderContent() {
    const container = document.getElementById('dhnqlxContent');
    if (!container) return;

    // Year-Month grouping for completed orders if configured to show all completed history
    if (_dhnqlxFilter === 'hoan_thanh' && _dhnqlxConfig.hoan_thanh_mode === 'all') {
        if (_dhnqlxCompletedMonths.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px;">
                    <div style="font-size:48px;margin-bottom:12px;">📭</div>
                    <div style="color:#9ca3af;font-size:14px;font-weight:600;">Không có đơn hàng hoàn thành nào trong lịch sử</div>
                </div>`;
            return;
        }

        let html = '<div class="completed-tree-container" style="display:flex; flex-direction:column; gap:16px;">';
        _dhnqlxCompletedMonths.forEach(y => {
            html += `
                <div class="completed-year-group" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px;">
                    <div style="font-size:16px; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <span>📁</span> Năm ${y.year}
                    </div>
                    <div class="completed-months-list" style="display:flex; flex-direction:column; gap:8px; padding-left:12px;">
            `;
            y.months.forEach(m => {
                const monthKey = `${y.year}-${m.month}`;
                const isExpanded = _dhnqlxExpandedMonths.has(monthKey);
                const ordersList = _dhnqlxMonthOrders[monthKey] || [];
                
                let filteredOrders = ordersList;
                if (_dhnqlxSearchVal) {
                    filteredOrders = ordersList.filter(o => 
                        (o.order_code || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                        (o.customer_name || '').toLowerCase().includes(_dhnqlxSearchVal) ||
                        (o.customer_phone || '').toLowerCase().includes(_dhnqlxSearchVal)
                    );
                }

                html += `
                    <div class="completed-month-item" style="border:1px solid #f1f5f9; border-radius:8px; background:white; overflow:hidden;">
                        <div onclick="_dhnqlxToggleMonth('${monthKey}')" style="display:flex; justify-content:between; align-items:center; padding:10px 14px; cursor:pointer; background:#f8fafc; font-weight:700; color:#475569; user-select:none; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span>📅</span> Tháng ${m.month} <span style="font-weight:normal; color:#64748b;">(${m.count} đơn)</span>
                            </div>
                            <span style="font-size:12px; color:#94a3b8; margin-left:auto;">${isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}</span>
                        </div>
                `;

                if (isExpanded) {
                    html += `<div style="padding:12px; border-top:1px solid #e2e8f0; overflow-x:auto;">`;
                    if (filteredOrders.length === 0) {
                        html += `
                            <div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">
                                ${ordersList.length === 0 ? '⏳ Đang tải dữ liệu...' : 'Không tìm thấy đơn hàng phù hợp'}
                            </div>`;
                    } else {
                        html += _dhnqlxBuildTableHTML(filteredOrders);
                    }
                    html += `</div>`;
                }

                html += `</div>`;
            });
            html += `
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        return;
    }

    let orders = _dhnqlxData[_dhnqlxFilter] || [];
    
    if (_dhnqlxSearchVal) {
        orders = orders.filter(o => 
            (o.order_code || '').toLowerCase().includes(_dhnqlxSearchVal) ||
            (o.customer_name || '').toLowerCase().includes(_dhnqlxSearchVal) ||
            (o.customer_phone || '').toLowerCase().includes(_dhnqlxSearchVal)
        );
    }

    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;">
                <div style="font-size:48px;margin-bottom:12px;">📭</div>
                <div style="color:#9ca3af;font-size:14px;font-weight:600;">Không có đơn hàng nào trong mục này</div>
            </div>`;
        return;
    }

    container.innerHTML = _dhnqlxBuildTableHTML(orders);
}

function _dhnqlxBuildTableHTML(orders) {
    let tbodyRows = orders.map(o => {
        const prio = (o.shipping_priority || 'CHUẨN').toUpperCase();
        let prioClass = 'dhnqlx-prio-chuan';
        if (prio === 'GẤP') prioClass = 'dhnqlx-prio-gap';
        else if (prio === 'GỬI') prioClass = 'dhnqlx-prio-gui';

        const orderDateStr = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
        const progressHTML = getProgressSaleHTML(o);

        // Sale Ship Date Column
        const saleExpectedDateStr = formatExpectedShipDateWithDay(o.expected_ship_date);
        const deliveryTimeHtml = o.standard_delivery_time ? `<div style="font-size:10px;color:#0369a1;font-weight:normal;">Giờ: <b>${o.standard_delivery_time}</b></div>` : '';

        // QLX Expected Date Column
        const qlxExpectedDateStr = formatExpectedShipDateWithDay(o.qlx_expected_date);
        const qlxExpectedHourStr = o.qlx_expected_hour || '—';

        // Action Buttons dependent on status
        let actionButtons = '';
        if (!o.qlx_actual_output_at) {
            actionButtons += `
                <button onclick="event.stopPropagation(); _dhnqlxShowExpectedTimeModal(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-blue">⏱ Báo giờ ra</button>
                <button onclick="event.stopPropagation(); _dhnqlxConfirmComplete(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-green">✅ Hoàn thành</button>
                <button onclick="event.stopPropagation(); _dhnqlxShowRescheduleModal(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-yellow">📅 Hẹn lại</button>
            `;
        }
        actionButtons += `<button onclick="event.stopPropagation(); _dhnqlxShowLogsModal(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-gray">📜 Lịch sử</button>`;

        // Reschedule Reason / Status Note
        let statusNote = '';
        if (o.qlx_rescheduled_date) {
            statusNote = `<div style="color:#d97706;font-size:10px;margin-top:2px;"><b>Hẹn lại:</b> ${o.qlx_rescheduled_date_fmt} <br/> <i>${o.qlx_rescheduled_reason || ''}</i></div>`;
        } else if (o.qlx_actual_output_at) {
            statusNote = `<div style="color:#059669;font-size:10px;margin-top:2px;"><b>Xong lúc:</b> ${o.qlx_actual_output_at_fmt}</div>`;
        }

        return `
            <tr id="dhnqlxRow${o.id}" onclick="_dhnqlxToggleDetail(${o.id})" style="cursor:pointer;">
                <td style="white-space:nowrap;font-weight:bold;">
                    ${progressHTML}
                </td>
                <td style="font-weight: 800; white-space: nowrap;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="dhnqlx-prio-tag ${prioClass}">${prio}</span>
                        <a href="/trasoatdonhang?search=${o.order_code}" target="_blank" onclick="event.stopPropagation()" style="font-size:12px; font-weight:900; color:#1e1b4b; text-decoration:none;">${o.order_code}</a>
                    </div>
                </td>
                <td>
                    <div style="font-weight:600;color:#1e293b;">${o.customer_name || '—'}</div>
                    <div style="font-size:10px;color:#64748b;">${o.customer_phone || '—'}</div>
                </td>
                <td style="font-size:11px;">
                    <div>${o.category_name || '—'}</div>
                    <div style="font-size:10px;color:#64748b;">SL: <b>${o.total_quantity || 0}</b></div>
                </td>
                <td style="font-weight:600;color:#0f172a; white-space:nowrap;">
                    <div>${saleExpectedDateStr}</div>
                    ${deliveryTimeHtml}
                </td>
                <td style="font-weight:600;color:#0f172a; white-space:nowrap;">
                    <div>${qlxExpectedDateStr}</div>
                    <div style="font-size:10px;color:#4b5563;font-weight:normal;">Giờ: <b>${qlxExpectedHourStr}</b></div>
                    ${statusNote}
                </td>
                <td>
                    <div style="font-size:11px;color:#475569;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.notes||''}">
                        ${o.notes || '<span style="color:#cbd5e1;">—</span>'}
                    </div>
                </td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="dhnqlx-table-container">
            <table class="dhnqlx-table">
                <thead>
                    <tr style="background: linear-gradient(135deg, #1e293b, #334155);">
                        <th style="width: 140px;">📊 Tiến Độ Ra Hàng</th>
                        <th style="width: 130px;">Mã Đơn</th>
                        <th style="width: 150px;">Khách Hàng</th>
                        <th style="width: 130px;">Thông Tin</th>
                        <th style="width: 160px;">Ngày Ra Đơn (SALE)</th>
                        <th style="width: 160px;">Hẹn Ra Đơn (QLX)</th>
                        <th>Ghi Chú Đơn</th>
                        <th style="width: 320px;">Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbodyRows}
                </tbody>
            </table>
        </div>
    `;
}

async function _dhnqlxToggleMonth(monthKey) {
    if (_dhnqlxExpandedMonths.has(monthKey)) {
        _dhnqlxExpandedMonths.delete(monthKey);
        _dhnqlxRenderContent();
    } else {
        _dhnqlxExpandedMonths.add(monthKey);
        if (!_dhnqlxMonthOrders[monthKey]) {
            _dhnqlxRenderContent();
            try {
                const res = await apiCall(`/api/qlx-orders/completed-by-month?month=${monthKey}`);
                _dhnqlxMonthOrders[monthKey] = res.orders || [];
            } catch (e) {
                showToast('Lỗi tải danh sách đơn hoàn thành: ' + e.message, 'error');
                _dhnqlxExpandedMonths.delete(monthKey);
            }
        }
        _dhnqlxRenderContent();
    }
}

// ===== DIALOG MODALS =====
function _dhnqlxCreateModal(title, contentHtml, footerHtml, width = '460px') {
    document.getElementById('dhnqlxActionModal')?.remove();

    const m = document.createElement('div');
    m.id = 'dhnqlxActionModal';
    m.setAttribute('data-no-debounce', 'true');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:dhnqlxModalFadeIn 0.2s ease-out;';
    
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:${width};max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;animation:dhnqlxModalSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);transition:all 0.2s ease;">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 24px;color:white;display:flex;align-items:center;justify-content:between;" data-no-debounce="true">
            <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;" data-no-debounce="true">⚙️ ${title}</div>
            <span onclick="document.getElementById('dhnqlxActionModal').remove()" style="cursor:pointer;color:white;font-size:20px;font-weight:700;opacity:0.8;margin-left:auto;">✕</span>
        </div>
        <div style="padding:22px 24px;font-size:13px;color:#334155;line-height:1.6;max-height:60vh;overflow-y:auto;">
            ${contentHtml}
        </div>
        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">
            ${footerHtml}
        </div>
    </div>`;

    document.body.appendChild(m);
    
    const isSpecial = title.includes('Báo báo') || title.includes('Báo cáo') || title.includes('Báo Cáo') || title.includes('Chi tiết Chặng');
    if (isSpecial) {
        m.style.zIndex = '99999';
        const closeCross = m.querySelector('span[onclick*="remove"]');
        if (closeCross) closeCross.style.display = 'none';
    } else {
        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    }
}

function _dhnqlxOpenConfigModal() {
    const btn = document.getElementById('dhnqlxConfigBtn');
    const currentCutoff = btn ? parseInt(btn.dataset.cutoffValue) || 1080 : 1080;
    const hrs = Math.floor(currentCutoff / 60);
    const mins = currentCutoff % 60;
    const cutoffTimeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const content = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
                <label style="display:block;font-weight:700;margin-bottom:6px;color:#1e293b;">1. Giờ nghỉ chốt nhận đơn của QLX:</label>
                <input type="time" id="dhnqlxCutoffTimeInput" value="${cutoffTimeStr}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:16px;text-align:center;color:#4f46e5;">
                <div style="font-size:11px; color:#64748b; margin-top:4px; line-height:1.4;">
                    * Đơn do CSKH bắn sau giờ này sẽ tự động dời thời hạn sang ngày tiếp theo (miễn phạt trễ ngày hôm đó).
                </div>
            </div>
            
            <div style="border-top:1px solid #e2e8f0; padding-top:12px;">
                <label style="display:block;font-weight:700;margin-bottom:6px;color:#1e293b;">2. Phạm vi ngày hiển thị trong "Đơn Hàng Xử Lý":</label>
                <select id="dhnqlxXuLyDaysSelect" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:600;font-size:14px;color:#1e293b;background:white;">
                    <option value="1" ${_dhnqlxConfig.xu_ly_days === 1 ? 'selected' : ''}>Hôm nay + Ngày mai (Mặc định)</option>
                    <option value="2" ${_dhnqlxConfig.xu_ly_days === 2 ? 'selected' : ''}>Hôm nay + Ngày mai + Ngày kia</option>
                    <option value="3" ${_dhnqlxConfig.xu_ly_days === 3 ? 'selected' : ''}>Hôm nay + 3 ngày tới</option>
                    <option value="5" ${_dhnqlxConfig.xu_ly_days === 5 ? 'selected' : ''}>Hôm nay + 5 ngày tới</option>
                </select>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">
                    * Điều chỉnh khoảng thời gian gom đơn từ tab "Sớm" chuyển về tab "Xử Lý".
                </div>
            </div>

            <div style="border-top:1px solid #e2e8f0; padding-top:12px;">
                <label style="display:block;font-weight:700;margin-bottom:6px;color:#1e293b;">3. Chế độ hiển thị "Đơn Hàng Hoàn Thành":</label>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
                        <input type="radio" name="dhnqlxHoanThanhMode" value="today" ${_dhnqlxConfig.hoan_thanh_mode === 'today' ? 'checked' : ''}>
                        Chỉ hiển thị đơn hoàn thành trong ngày hôm nay
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
                        <input type="radio" name="dhnqlxHoanThanhMode" value="all" ${_dhnqlxConfig.hoan_thanh_mode === 'all' ? 'checked' : ''}>
                        Hiển thị tất cả đơn hoàn thành (Theo Năm/Tháng)
                    </label>
                </div>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:8px;cursor:pointer;font-weight:600;">Hủy</button>
        <button onclick="_dhnqlxSubmitConfig()" style="padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Lưu Cấu Hình</button>
    `;

    _dhnqlxCreateModal('Cài Đặt Hệ Thống QLX', content, footer, '500px');
}

async function _dhnqlxSubmitConfig() {
    const timeVal = document.getElementById('dhnqlxCutoffTimeInput').value;
    if (!timeVal) {
        showToast('Vui lòng chọn thời gian chốt đơn', 'error');
        return;
    }
    const xuLyDays = parseInt(document.getElementById('dhnqlxXuLyDaysSelect').value) || 1;
    const hoanThanhMode = document.querySelector('input[name="dhnqlxHoanThanhMode"]:checked').value;

    const [hrs, mins] = timeVal.split(':').map(Number);
    const totalMins = hrs * 60 + mins;

    try {
        const resCutoff = await apiCall('/api/penalty/config', 'POST', {
            configs: [
                { key: 'qlx_cutoff_time', amount: totalMins }
            ]
        });
        if (!resCutoff.success) {
            showToast('Lỗi lưu cấu hình giờ chốt đơn: ' + (resCutoff.error || ''), 'error');
            return;
        }

        const resQlx = await apiCall('/api/qlx-orders/config', 'POST', {
            xu_ly_days: xuLyDays,
            hoan_thanh_mode: hoanThanhMode
        });
        if (!resQlx.success) {
            showToast('Lỗi lưu cấu hình khoảng ngày QLX: ' + (resQlx.error || ''), 'error');
            return;
        }

        showToast('Lưu cấu hình hệ thống QLX thành công!');
        document.getElementById('dhnqlxActionModal')?.remove();
        
        await _dhnqlxLoadCutoffTime();
        await _dhnqlxLoadData();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function _dhnqlxShowExpectedTimeModal(orderId, orderCode) {
    const todayStr = vnDateStr(vnNow());
    const content = `
        <div style="margin-bottom:12px;">Báo giờ ra cho đơn hàng <b style="color:#1e3a8a;">${orderCode}</b></div>
        <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:700;margin-bottom:4px;">Ngày ra đơn dự kiến:</label>
            <input type="date" id="expectedDateInput" value="${todayStr}" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;">
        </div>
        <div>
            <label style="display:block;font-weight:700;margin-bottom:4px;">Giờ ra đơn dự kiến (ví dụ: 14:00, 16:30):</label>
            <input type="time" id="expectedHourInput" value="17:00" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;">
        </div>
    `;

    const footer = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:8px;cursor:pointer;font-weight:600;">Hủy</button>
        <button onclick="_dhnqlxSubmitExpectedTime(${orderId})" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Xác nhận</button>
    `;

    _dhnqlxCreateModal('Báo Giờ Ra Đơn', content, footer);
}

async function _dhnqlxSubmitExpectedTime(orderId) {
    const qlx_expected_date = document.getElementById('expectedDateInput').value;
    const qlx_expected_hour = document.getElementById('expectedHourInput').value;

    if (!qlx_expected_date || !qlx_expected_hour) {
        showToast('Vui lòng điền đầy đủ ngày và giờ', 'error');
        return;
    }

    try {
        const res = await apiCall(`/api/qlx-orders/${orderId}/expected-time`, 'POST', { qlx_expected_date, qlx_expected_hour });
        if (res.success) {
            showToast('Cập nhật giờ ra đơn thành công!');
            document.getElementById('dhnqlxActionModal')?.remove();
            _dhnqlxLoadData();
        } else {
            showToast(res.error || 'Lỗi cập nhật', 'error');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function _dhnqlxConfirmComplete(orderId, orderCode) {
    const content = `
        <div style="font-size:14px;text-align:center;padding:10px 0;">
            Bạn có chắc chắn đã sản xuất hoàn thành đơn hàng <b>${orderCode}</b>?<br/>
            Đơn hàng sẽ được chuyển sang danh sách <b>Chờ Kế Toán Xuất Hàng</b>.
        </div>
    `;
    const footer = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:8px;cursor:pointer;font-weight:600;">Hủy</button>
        <button onclick="_dhnqlxSubmitComplete(${orderId})" style="padding:8px 16px;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Đúng, Hoàn Thành</button>
    `;
    _dhnqlxCreateModal('Báo Hoàn Thành Đơn', content, footer);
}

async function _dhnqlxSubmitComplete(orderId) {
    try {
        const res = await apiCall(`/api/qlx-orders/${orderId}/complete`, 'POST');
        if (res.success) {
            showToast('Báo hoàn thành đơn thành công!');
            document.getElementById('dhnqlxActionModal')?.remove();
            _dhnqlxLoadData();
        } else {
            showToast(res.error || 'Lỗi báo hoàn thành', 'error');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function _dhnqlxShowRescheduleModal(orderId, orderCode) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2); // default reschedule to som D+2
    const defaultDateStr = vnDateStr(tomorrow);

    const content = `
        <div style="margin-bottom:12px;">Hẹn lại lịch ra đơn cho đơn hàng <b style="color:#d97706;">${orderCode}</b></div>
        <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:700;margin-bottom:4px;">Ngày hẹn mới (D+2 trở đi để vào Đơn Hẹn Lại):</label>
            <input type="date" id="rescheduledDateInput" value="${defaultDateStr}" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;">
        </div>
        <div>
            <label style="display:block;font-weight:700;margin-bottom:4px;">Lý do hẹn lại:</label>
            <textarea id="rescheduledReasonInput" rows="3" placeholder="Nhập lý do chi tiết..." style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-family:inherit;font-size:13px;"></textarea>
        </div>
    `;

    const footer = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:8px;cursor:pointer;font-weight:600;">Hủy</button>
        <button onclick="_dhnqlxSubmitReschedule(${orderId})" style="padding:8px 16px;background:#d97706;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Hẹn Lại</button>
    `;

    _dhnqlxCreateModal('Hẹn Lại Lịch Ra Đơn', content, footer);
}

async function _dhnqlxSubmitReschedule(orderId) {
    const qlx_rescheduled_date = document.getElementById('rescheduledDateInput').value;
    const qlx_rescheduled_reason = document.getElementById('rescheduledReasonInput').value.trim();

    if (!qlx_rescheduled_date || !qlx_rescheduled_reason) {
        showToast('Vui lòng điền đầy đủ ngày hẹn và lý do', 'error');
        return;
    }

    try {
        const res = await apiCall(`/api/qlx-orders/${orderId}/reschedule`, 'POST', { qlx_rescheduled_date, qlx_rescheduled_reason });
        if (res.success) {
            showToast('Hẹn lại đơn hàng thành công!');
            document.getElementById('dhnqlxActionModal')?.remove();
            _dhnqlxLoadData();
        } else {
            showToast(res.error || 'Lỗi hẹn lại đơn', 'error');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function _dhnqlxShowLogsModal(orderId, orderCode) {
    _dhnqlxCreateModal(`Lịch sử cập nhật — ${orderCode}`, '<div style="text-align:center;padding:20px;color:#9ca3af;">⏳ Đang tải lịch sử...</div>', `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 20px;border:none;border-radius:8px;background:#374151;color:white;cursor:pointer;font-weight:700;">Đóng</button>
    `, '550px');

    try {
        const res = await apiCall(`/api/qlx-orders/${orderId}/logs`);
        const history = res.history || [];
        
        let logsHtml = '';
        if (history.length === 0) {
            logsHtml = '<div style="text-align:center;color:#9ca3af;padding:20px 0;">Chưa có lịch sử cập nhật nào cho đơn hàng này.</div>';
        } else {
            logsHtml = '<div style="display:flex;flex-direction:column;gap:12px;">';
            history.forEach(h => {
                const actionLabel = h.action === 'qlx_expected_time' ? '⏱ Báo giờ ra' : 
                                    h.action === 'qlx_complete' ? '✅ Hoàn thành' : 
                                    h.action === 'qlx_reschedule' ? '📅 Hẹn lại' : h.action;

                logsHtml += `
                    <div style="border-left: 3px solid #6366f1; padding-left: 10px; font-size:12px;">
                        <div style="display:flex;justify-content:space-between;font-weight:700;color:#1e293b;">
                            <span>${actionLabel}</span>
                            <span style="font-weight:normal;color:#94a3b8;font-size:10px;">${vnFormat(h.performed_at)}</span>
                        </div>
                        <div style="color:#4b5563;margin-top:2px;">${h.details || ''}</div>
                        <div style="color:#94a3b8;font-size:10px;margin-top:1px;">Thực hiện bởi: <b>${h.performed_by_name || 'Hệ thống'}</b></div>
                    </div>
                `;
            });
            logsHtml += '</div>';
        }

        const modalBody = document.querySelector('#dhnqlxActionModal div div:nth-child(2)');
        if (modalBody) {
            modalBody.innerHTML = logsHtml;
        }
    } catch(e) {
        const modalBody = document.querySelector('#dhnqlxActionModal div div:nth-child(2)');
        if (modalBody) {
            modalBody.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px 0;">Lỗi tải lịch sử: ${e.message}</div>`;
        }
    }
}

async function _dhnqlxToggleDetail(id) {
    const clickedRow = document.getElementById('dhnqlxRow' + id);
    if (!clickedRow) return;

    const existingDetailRow = document.getElementById('dhnqlxDetailRow' + id);
    if (existingDetailRow) {
        existingDetailRow.remove();
        return;
    }

    // Close any other open details to keep the UI clean
    const openRows = document.querySelectorAll('[id^="dhnqlxDetailRow"]');
    openRows.forEach(row => row.remove());

    const detailRow = document.createElement('tr');
    detailRow.id = 'dhnqlxDetailRow' + id;
    detailRow.innerHTML = `<td colspan="8" style="padding:0"><div class="ts-detail" id="dhnqlxDetail${id}"><div style="text-align:center;color:#9ca3af;padding:16px;">⏳ Đang tải...</div></div></td>`;
    clickedRow.parentNode.insertBefore(detailRow, clickedRow.nextSibling);

    try {
        const res = await apiCall('/api/trasoat/orders/' + id + '/detail');
        const el = document.getElementById('dhnqlxDetail' + id);
        if (el) {
            el.innerHTML = _qlxRenderTimeline(res);
        }
    } catch (e) {
        const el = document.getElementById('dhnqlxDetail' + id);
        if (el) el.innerHTML = '<div style="color:#ef4444;padding:16px;">❌ Lỗi tải chi tiết</div>';
    }
}

function _qlxRenderTimeline(res) {
    if (!document.getElementById('_tsTimelineStyles')) {
        const style = document.createElement('style');
        style.id = '_tsTimelineStyles';
        style.textContent = `
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
        `;
        document.head.appendChild(style);
    }

    const { order: o, items } = res;
    const fmtDT = d => { 
        if (!d) return ''; 
        const dt = new Date(d); 
        return dt.toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }); 
    };

    let html = `
        <style>
            .qlx-step-expected { font-size: 10px; font-weight: 700; color: #4338ca; margin-top: 4px; background: #e0e7ff; padding: 2px 4px; border-radius: 4px; display: inline-block; }
            .qlx-step-history-btn { font-size: 9px; font-weight: 700; color: #4b5563; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 1px 4px; cursor: pointer; margin-top: 4px; }
            .qlx-step-history-btn:hover { background: #e5e7eb; }
        </style>
        <div style="font-weight:800;font-size:14px;color:#1e1b4b;margin-bottom:12px;padding: 4px 8px;border-left:4px solid #4f46e5;background:#f3f4f6;border-radius:0 4px 4px 0;display:flex;justify-content:space-between;align-items:center;">
            <span>📋 ${o.order_code} — ${o.customer_name||''}</span>
        </div>
    `;
    
    if (!items || !items.length) {
        html += '<div style="text-align:center;padding:12px;color:#9ca3af">Không có sản phẩm nào</div>';
    } else {
        items.forEach((item, itemIdx) => {
            html += `<div class="ts-item-timeline-section" style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background:#fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">`;
            html += `<div style="font-weight:700;font-size:13px;color:#4338ca;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <span>🏷️ Phiếu ${itemIdx + 1}: ${item.product_name || 'Sản phẩm'} ${item.description ? `(${item.description})` : ''}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="background:#e0e7ff;color:#3730a3;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;">SL: ${item.quantity || 0}</span>
                    <button type="button" onclick="event.stopPropagation(); _qlxShowSetupScheduleModal(${o.id}, ${item.id}, '${o.order_code}', '${encodeURIComponent(JSON.stringify(item.qlx_schedule || {}))}', '${encodeURIComponent(JSON.stringify(item.timeline || []))}')" style="background:#4f46e5;color:white;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(79,70,229,0.2);">📢 Báo cáo tiến trình đơn hàng</button>
                </div>
            </div>`;
            
            html += '<div class="ts-timeline" style="margin-top: 20px;">';
            const timeline = item.timeline || [];
            timeline.forEach((s, i) => {
                const cls = s.done ? 'done' : (i > 0 && timeline[i-1].done && !s.done) ? 'active' : (i === 0 && !s.done) ? 'active' : 'pending';
                const icon = s.done ? '✓' : cls === 'active' ? '⏳' : (i+1);
                const lineCls = s.done ? 'done' : '';
                
                let stepKey = null;
                if (s.name === 'Cắt') stepKey = 'cat';
                else if (s.name === 'In') stepKey = 'in';
                else if (s.name === 'Ép') stepKey = 'ep';
                else if (s.name === 'May') stepKey = 'may';
                else if (s.name === 'Kiểm Tra CL') stepKey = 'qc';
                else if (s.name === 'Hoàn Thiện') stepKey = 'ht';
                else if (s.name === 'Gửi Hàng') stepKey = 'gui';

                const escArg = str => (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                const rawReports = encodeURIComponent(JSON.stringify(s.reports || []));
                const workerEsc = escArg(s.worker);
                const extraEsc = escArg(s.extra);
                const progressEsc = escArg(s.progress);
                const scheduleAtVal = s.schedule_at || '';
                const timeVal = s.time || '';

                let blockedByStepName = '';
                for (let j = 0; j < i; j++) {
                    const prevStep = timeline[j];
                    if (!prevStep.done && !prevStep.schedule_at) {
                        blockedByStepName = prevStep.name;
                        break;
                    }
                }

                html += `<div class="ts-step">`;
                if (i < timeline.length - 1) html += `<div class="ts-step-line ${lineCls}"></div>`;
                
                html += `
                    <div class="ts-step-icon ${cls}" onclick="event.stopPropagation(); _qlxShowStepReportModal(${o.id}, ${item.id}, '${o.order_code}', '${s.name}', '${stepKey}', '${workerEsc}', '${extraEsc}', '${progressEsc}', '${scheduleAtVal}', '${timeVal}', '${rawReports}', ${s.done ? 1 : 0}, '${blockedByStepName}', '${encodeURIComponent(JSON.stringify(item.qlx_schedule || {}))}')" style="cursor:pointer" title="Chi tiết chặng ${s.name}">${icon}</div>
                    <div class="ts-step-name" style="font-weight:800;">${s.short || s.name}</div>
                    ${s.progress ? `<div style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:800;margin:2px 0;background:${s.done ? '#d1fae5':'#fef3c7'};color:${s.done ? '#065f46':'#b45309'}">${s.progress} xong</div>` : ''}
                    
                    ${s.schedule_at ? `<div class="qlx-step-expected" title="Giờ dự kiến hoàn thành chặng này">📅 ${fmtDT(s.schedule_at)}</div>` : `<div style="font-size:10px;color:#94a3b8;margin-top:4px;font-style:italic;">Chưa lên lịch</div>`}
                    
                    <div class="ts-step-time" style="color:#059669;font-weight:700;margin-top:2px;">${s.time ? 'Thực tế: ' + fmtDT(s.time) : ''}</div>
                    <div class="ts-step-time" style="font-weight:600;">${s.worker || ''}</div>
                    ${s.extra ? `<div style="font-size:9px;font-weight:700;color:#7c3aed;margin-top:2px">${s.extra}</div>` : ''}
                    
                    ${s.reports && s.reports.length > 0 ? `<button class="qlx-step-history-btn" onclick="event.stopPropagation(); _qlxShowStepReportsHistoryModal('${o.order_code}', '${s.name}', '${encodeURIComponent(JSON.stringify(s.reports))}')">💬 Báo cáo (${s.reports.length})</button>` : ''}
                </div>`;
            });
            html += '</div>';
            html += '</div>';
        });
    }

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

function _qlxActivatePasteCard(stepKey) {
    window._qlxActivePasteStep = stepKey;
    
    // Highlight UI
    document.querySelectorAll('.qlx-step-card').forEach(card => {
        card.style.border = '1px solid #e2e8f0';
        card.style.boxShadow = 'none';
        card.style.background = '#f8fafc';
    });
    
    const activeCard = document.getElementById(`card_${stepKey}`);
    if (activeCard) {
        activeCard.style.border = '2px solid #6366f1';
        activeCard.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)';
        activeCard.style.background = '#ffffff';
    }

    // Toggle badges
    const steps = ['cut', 'in', 'ep', 'may_qc_ht', 'gui'];
    steps.forEach(sk => {
        const badge = document.querySelector(`.active-badge-${sk}`);
        if (badge) {
            badge.style.display = (sk === stepKey) ? 'inline-block' : 'none';
        }
    });
}

function _qlxClearMultiStepImage(stepKey) {
    if (window._qlxUploadedImages) {
        delete window._qlxUploadedImages[stepKey];
    }
    const capStep = stepKey === 'may_qc_ht' ? 'MayQcHt' : (stepKey.charAt(0).toUpperCase() + stepKey.slice(1));
    const preview = document.getElementById(`setup${capStep}ImagePreview`);
    if (preview) preview.style.display = 'none';
    const zone = document.getElementById(`setup${capStep}PasteZone`);
    if (zone) zone.innerText = `Bấm chọn chặng này rồi ấn Ctrl+V để dán ảnh`;
}

function _qlxUploadAndResizeMulti(file, stepKey) {
    const capStep = stepKey === 'may_qc_ht' ? 'MayQcHt' : (stepKey.charAt(0).toUpperCase() + stepKey.slice(1));
    const zone = document.getElementById(`setup${capStep}PasteZone`);
    if (zone) zone.innerText = '⚙️ Đang xử lý & tải ảnh lên...';

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1000;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    showToast('Lỗi nén ảnh', 'error');
                    if (zone) zone.innerText = 'Lỗi nén ảnh. Thử lại.';
                    return;
                }
                const formData = new FormData();
                formData.append('file', blob, 'report_image.jpg');

                fetch('/api/qlx/upload-image', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                    }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        if (!window._qlxUploadedImages) window._qlxUploadedImages = {};
                        window._qlxUploadedImages[stepKey] = data.image_url;
                        
                        const preview = document.getElementById(`setup${capStep}ImagePreview`);
                        const previewImg = document.getElementById(`setup${capStep}PreviewImg`);
                        if (preview && previewImg) {
                            previewImg.src = data.image_url;
                            preview.style.display = 'block';
                        }
                        if (zone) zone.innerText = '✅ Tải ảnh thành công!';
                    } else {
                        showToast(data.error || 'Lỗi tải ảnh', 'error');
                        if (zone) zone.innerText = 'Lỗi tải ảnh. Thử lại.';
                    }
                })
                .catch(err => {
                    showToast(err.message, 'error');
                    if (zone) zone.innerText = 'Lỗi kết nối. Thử lại.';
                });
            }, 'image/jpeg', 0.7);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function _qlxFormatDateTimeToShow(valStr) {
    if (!valStr) return '';
    const dt = new Date(valStr);
    if (isNaN(dt.getTime())) return '';
    
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[dt.getDay()];
    
    const pad = n => String(n).padStart(2, '0');
    return `${dayName} - ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function _qlxOpenDateTimePicker(hiddenInputId, minValStr) {
    // Remove existing picker if any
    const existing = document.getElementById('qlxCustomDateTimePicker');
    if (existing) {
        existing.remove();
    }

    const hiddenInput = document.getElementById(hiddenInputId);
    const displayInput = document.getElementById(hiddenInputId + '_display');
    if (!hiddenInput || !displayInput) return;

    // Inject custom style if not present
    if (!document.getElementById('_qlxDateTimePickerStyles')) {
        const style = document.createElement('style');
        style.id = '_qlxDateTimePickerStyles';
        style.textContent = `
            @keyframes qlxPickerFadeIn {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .qlx-picker-calendar {
                width: 250px;
                padding: 12px 14px;
                border-right: 1px solid #e2e8f0;
                background: #ffffff;
            }
            .qlx-picker-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            .qlx-picker-month-title {
                font-size: 13px;
                font-weight: 800;
                color: #1e293b;
            }
            .qlx-picker-nav-btn {
                width: 24px;
                height: 24px;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #475569;
                transition: all 0.15s;
            }
            .qlx-picker-nav-btn:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
                color: #1e293b;
            }
            .qlx-picker-weekdays {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 2px;
                margin-bottom: 6px;
            }
            .qlx-picker-weekday {
                text-align: center;
                font-size: 10px;
                font-weight: 800;
                color: #475569;
                padding: 4px 0;
            }
            .qlx-picker-weekday.sunday {
                color: #ef4444;
            }
            .qlx-picker-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 2px;
            }
            .qlx-picker-day {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 600;
                color: #1e293b;
                border-radius: 6px;
                cursor: pointer;
                border: 1px solid transparent;
                background: transparent;
                transition: all 0.15s;
            }
            .qlx-picker-day:hover:not(.disabled) {
                background: #eff6ff;
                color: #2563eb;
            }
            .qlx-picker-day.other-month {
                color: #94a3b8;
                opacity: 0.5;
            }
            .qlx-picker-day.selected {
                background: #f0f7ff;
                border: 1.5px solid #3b82f6;
                color: #1d4ed8;
                font-weight: 800;
            }
            .qlx-picker-day.disabled {
                color: #cbd5e1;
                cursor: not-allowed;
                opacity: 0.4;
                background: #f8fafc;
            }
            .qlx-picker-day.today:not(.selected) {
                border: 1.5px dashed #94a3b8;
            }
            .qlx-picker-time {
                width: 170px;
                padding: 12px 14px;
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .qlx-picker-time-title {
                font-size: 11px;
                font-weight: 800;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .qlx-picker-manual-time {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-top: 12px;
            }
            .qlx-picker-time-col {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                flex: 1;
            }
            .qlx-picker-time-label {
                font-size: 9px;
                font-weight: 700;
                color: #64748b;
            }
            .qlx-picker-time-select {
                width: 100%;
                padding: 5px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 700;
                color: #1e293b;
                background: #ffffff;
                text-align: center;
                cursor: pointer;
            }
            .qlx-picker-footer {
                display: flex;
                justify-content: flex-end;
                gap: 6px;
                margin-top: auto;
                border-top: 1px solid #e2e8f0;
                padding-top: 8px;
            }
            .qlx-picker-btn {
                padding: 5px 12px;
                font-size: 11px;
                font-weight: 700;
                border-radius: 6px;
                cursor: pointer;
                border: none;
            }
            .qlx-picker-btn-cancel {
                background: #e2e8f0;
                color: #475569;
            }
            .qlx-picker-btn-confirm {
                background: #3b82f6;
                color: #ffffff;
            }
            .qlx-picker-btn-confirm:hover {
                background: #2563eb;
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize date/time values
    const minDate = minValStr ? new Date(minValStr) : null;
    let currentVal = hiddenInput.value;
    let activeDate = currentVal ? new Date(currentVal) : new Date();
    if (isNaN(activeDate.getTime())) {
        activeDate = new Date();
    }
    if (minDate && activeDate < minDate) {
        activeDate = new Date(minDate.getTime());
    }

    let selectYear = activeDate.getFullYear();
    let selectMonth = activeDate.getMonth();
    let selectDay = activeDate.getDate();
    let selectHour = activeDate.getHours();
    let selectMin = activeDate.getMinutes();

    // Snap selectMin to nearest 15 mins (0, 15, 30, 45)
    let snappedMin = Math.round(selectMin / 15) * 15;
    if (snappedMin >= 60) {
        snappedMin = 0;
        selectHour = selectHour + 1;
        if (selectHour >= 24) {
            selectHour = 0;
            const d = new Date(selectYear, selectMonth, selectDay + 1);
            selectYear = d.getFullYear();
            selectMonth = d.getMonth();
            selectDay = d.getDate();
        }
    }
    selectMin = snappedMin;

    if (minDate) {
        let checkDate = new Date(selectYear, selectMonth, selectDay, selectHour, selectMin);
        if (checkDate < minDate) {
            while (checkDate < minDate) {
                selectMin += 15;
                if (selectMin >= 60) {
                    selectMin = 0;
                    selectHour += 1;
                    if (selectHour >= 24) {
                        selectHour = 0;
                        selectDay += 1;
                    }
                }
                checkDate = new Date(selectYear, selectMonth, selectDay, selectHour, selectMin);
            }
            selectYear = checkDate.getFullYear();
            selectMonth = checkDate.getMonth();
            selectDay = checkDate.getDate();
            selectHour = checkDate.getHours();
            selectMin = checkDate.getMinutes();
        }
    }

    // Calculate position relative to container or body
    const rect = displayInput.getBoundingClientRect();
    const pickerWidth = 420;
    const pickerHeight = 285;
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;

    if (rect.bottom + pickerHeight > window.innerHeight && rect.top - pickerHeight > 0) {
        top = rect.top + window.scrollY - pickerHeight - 6;
    }
    if (rect.left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - 16;
    }
    if (left < 10) left = 10;

    const picker = document.createElement('div');
    picker.id = 'qlxCustomDateTimePicker';
    picker.style.cssText = `
        position: absolute;
        top: ${top}px;
        left: ${left}px;
        z-index: 100005;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        display: flex;
        font-family: 'Inter', sans-serif;
        user-select: none;
        overflow: hidden;
        width: ${pickerWidth}px;
        height: ${pickerHeight}px;
        animation: qlxPickerFadeIn 0.15s ease-out;
    `;

    picker.innerHTML = `
        <div class="qlx-picker-calendar">
            <div class="qlx-picker-header">
                <button type="button" class="qlx-picker-nav-btn" id="qlxPrevMonth">◀</button>
                <div class="qlx-picker-month-title" id="qlxMonthTitle">Tháng 6 2026</div>
                <button type="button" class="qlx-picker-nav-btn" id="qlxNextMonth">▶</button>
            </div>
            <div class="qlx-picker-weekdays">
                <div class="qlx-picker-weekday">H</div>
                <div class="qlx-picker-weekday">B</div>
                <div class="qlx-picker-weekday">T</div>
                <div class="qlx-picker-weekday">N</div>
                <div class="qlx-picker-weekday">S</div>
                <div class="qlx-picker-weekday">B</div>
                <div class="qlx-picker-weekday sunday">C</div>
            </div>
            <div class="qlx-picker-days" id="qlxCalendarDays"></div>
        </div>
        <div class="qlx-picker-time">
            <div class="qlx-picker-time-title">Chọn Giờ</div>
            <div class="qlx-picker-manual-time">
                <div class="qlx-picker-time-col">
                    <span class="qlx-picker-time-label">Giờ</span>
                    <select id="qlxTimeHour" class="qlx-picker-time-select"></select>
                </div>
                <div class="qlx-picker-time-col">
                    <span class="qlx-picker-time-label">Phút</span>
                    <select id="qlxTimeMin" class="qlx-picker-time-select"></select>
                </div>
            </div>
            <div class="qlx-picker-footer">
                <button type="button" class="qlx-picker-btn qlx-picker-btn-cancel" id="qlxPickerCancel">Hủy</button>
                <button type="button" class="qlx-picker-btn qlx-picker-btn-confirm" id="qlxPickerConfirm">Xác nhận</button>
            </div>
        </div>
    `;

    document.body.appendChild(picker);

    const hourSelect = picker.querySelector('#qlxTimeHour');
    const minSelect = picker.querySelector('#qlxTimeMin');

    for (let h = 0; h < 24; h++) {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = String(h).padStart(2, '0');
        hourSelect.appendChild(opt);
    }
    hourSelect.value = selectHour;

    const allowedMins = [0, 15, 30, 45];
    for (const m of allowedMins) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = String(m).padStart(2, '0');
        minSelect.appendChild(opt);
    }
    minSelect.value = selectMin;

    let viewYear = selectYear;
    let viewMonth = selectMonth;

    function renderCalendar() {
        const monthTitle = picker.querySelector('#qlxMonthTitle');
        const daysContainer = picker.querySelector('#qlxCalendarDays');
        
        monthTitle.textContent = `Tháng ${viewMonth + 1} ${viewYear}`;
        daysContainer.innerHTML = '';

        const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
        const startPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        const pad2 = n => String(n).padStart(2, '0');
        const minDateOnly = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;

        // Render padding days of prev month
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const pmYear = viewMonth === 0 ? viewYear - 1 : viewYear;
            const pmMonth = viewMonth === 0 ? 11 : viewMonth - 1;
            const cellDate = new Date(pmYear, pmMonth, d);
            
            const cellDateStr = `${pmYear}-${pad2(pmMonth + 1)}-${pad2(d)}`;
            const isHoliday = _qlxHolidaysSet.has(cellDateStr);
            const isDisabled = (minDateOnly && cellDate < minDateOnly) || isHoliday;
            const isSelected = selectYear === pmYear && selectMonth === pmMonth && selectDay === d;
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `qlx-picker-day other-month ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;
            btn.disabled = isDisabled;
            btn.textContent = d;

            const isSunday = cellDate.getDay() === 0;
            if (isSunday) btn.style.color = '#ef4444';

            if (isHoliday) {
                btn.style.color = '#ef4444';
                btn.style.fontWeight = '800';
                btn.title = 'Ngày nghỉ lễ';
                btn.style.textDecoration = 'line-through';
            }

            if (!isDisabled) {
                btn.onclick = () => selectDate(pmYear, pmMonth, d);
            }
            daysContainer.appendChild(btn);
        }

        // Render current month days
        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const cellDate = new Date(viewYear, viewMonth, d);
            
            const cellDateStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`;
            const isHoliday = _qlxHolidaysSet.has(cellDateStr);
            const isDisabled = (minDateOnly && cellDate < minDateOnly) || isHoliday;
            const isSelected = selectYear === viewYear && selectMonth === viewMonth && selectDay === d;
            const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `qlx-picker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''}`;
            btn.disabled = isDisabled;
            btn.textContent = d;

            const isSunday = cellDate.getDay() === 0;
            if (isSunday) btn.style.color = '#ef4444';

            if (isHoliday) {
                btn.style.color = '#ef4444';
                btn.style.fontWeight = '800';
                btn.title = 'Ngày nghỉ lễ';
                btn.style.textDecoration = 'line-through';
            }

            if (!isDisabled) {
                btn.onclick = () => selectDate(viewYear, viewMonth, d);
            }
            daysContainer.appendChild(btn);
        }

        // Render padding days of next month
        const totalRendered = startPadding + daysInMonth;
        const totalCells = totalRendered > 35 ? 42 : 35;
        const nextPadding = totalCells - totalRendered;
        for (let d = 1; d <= nextPadding; d++) {
            const nmYear = viewMonth === 11 ? viewYear + 1 : viewYear;
            const nmMonth = viewMonth === 11 ? 0 : viewMonth + 1;
            const cellDate = new Date(nmYear, nmMonth, d);
            
            const cellDateStr = `${nmYear}-${pad2(nmMonth + 1)}-${pad2(d)}`;
            const isHoliday = _qlxHolidaysSet.has(cellDateStr);
            const isDisabled = (minDateOnly && cellDate < minDateOnly) || isHoliday;
            const isSelected = selectYear === nmYear && selectMonth === nmMonth && selectDay === d;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `qlx-picker-day other-month ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;
            btn.disabled = isDisabled;
            btn.textContent = d;

            const isSunday = cellDate.getDay() === 0;
            if (isSunday) btn.style.color = '#ef4444';

            if (isHoliday) {
                btn.style.color = '#ef4444';
                btn.style.fontWeight = '800';
                btn.title = 'Ngày nghỉ lễ';
                btn.style.textDecoration = 'line-through';
            }

            if (!isDisabled) {
                btn.onclick = () => selectDate(nmYear, nmMonth, d);
            }
            daysContainer.appendChild(btn);
        }
    }

    function selectDate(year, month, day) {
        selectYear = year;
        selectMonth = month;
        selectDay = day;
        renderCalendar();
    }

    picker.querySelector('#qlxPrevMonth').onclick = () => {
        if (viewMonth === 0) {
            viewMonth = 11;
            viewYear--;
        } else {
            viewMonth--;
        }
        renderCalendar();
    };

    picker.querySelector('#qlxNextMonth').onclick = () => {
        if (viewMonth === 11) {
            viewMonth = 0;
            viewYear++;
        } else {
            viewMonth++;
        }
        renderCalendar();
    };

    hourSelect.onchange = (e) => {
        selectHour = parseInt(e.target.value);
    };

    minSelect.onchange = (e) => {
        selectMin = parseInt(e.target.value);
    };

    const removePicker = () => {
        picker.remove();
        document.removeEventListener('mousedown', outsideClick);
        document.removeEventListener('scroll', closeOnScroll, true);
    };

    picker.querySelector('#qlxPickerCancel').onclick = removePicker;

    picker.querySelector('#qlxPickerConfirm').onclick = () => {
        const selectedDateObj = new Date(selectYear, selectMonth, selectDay, selectHour, selectMin);
        if (minDate && selectedDateObj < minDate) {
            showToast('Thời gian chọn không được trước thời gian tối thiểu cho phép', 'error');
            return;
        }
        
        const pad = n => String(n).padStart(2, '0');
        const formattedVal = `${selectYear}-${pad(selectMonth + 1)}-${pad(selectDay)}T${pad(selectHour)}:${pad(selectMin)}`;
        
        hiddenInput.value = formattedVal;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        displayInput.value = _qlxFormatDateTimeToShow(formattedVal);
        
        removePicker();
    };

    const outsideClick = (e) => {
        if (!picker.contains(e.target) && e.target !== displayInput && !displayInput.contains(e.target)) {
            removePicker();
        }
    };

    const closeOnScroll = (e) => {
        if (!picker.contains(e.target)) {
            removePicker();
        }
    };

    setTimeout(() => {
        document.addEventListener('mousedown', outsideClick);
        document.addEventListener('scroll', closeOnScroll, true);
    }, 50);

    renderCalendar();
}

function _qlxShowSetupScheduleModal(orderId, itemId, orderCode, rawSchedule, rawTimeline) {
    const schedule = JSON.parse(decodeURIComponent(rawSchedule) || '{}');
    window._qlxCurrentSchedule = schedule;
    window._qlxUploadedImages = {};

    const timeline = JSON.parse(decodeURIComponent(rawTimeline || '') || '[]');
    const isCutDone = timeline.some(s => s.name === 'Cắt' && s.done);
    const isInDone = timeline.some(s => s.name === 'In' && s.done);
    const isEpDone = timeline.some(s => s.name === 'Ép' && s.done);
    
    const isMayDone = timeline.some(s => s.name === 'May' && s.done);
    const isQcDone = timeline.some(s => s.name === 'Kiểm Tra CL' && s.done);
    const isHtDone = timeline.some(s => s.name === 'Hoàn Thiện' && s.done);
    const isMayQcHtDone = isMayDone && isQcDone && isHtDone;
    
    const isGuiDone = timeline.some(s => s.name === 'Gửi Hàng' && s.done);
    
    const toInputVal = d => {
        if (!d) return '';
        const date = new Date(d);
        const tzOffset = 7 * 60; 
        const localTime = new Date(date.getTime() + tzOffset * 60 * 1000);
        return localTime.toISOString().slice(0, 16);
    };

    const getMinForStep = (stepKey) => {
        let minTime = new Date(); // default to now
        const tzOffset = 7 * 60; // UTC+7
        
        const parseDate = (dStr) => {
            if (!dStr || dStr === 'null' || dStr === 'undefined') return null;
            return new Date(dStr);
        };

        const getActualOrScheduled = (stepName, scheduleField) => {
            const step = timeline.find(s => s.name === stepName);
            if (step && step.done && step.time) return parseDate(step.time);
            return parseDate(schedule[scheduleField]);
        };

        let depTime = null;
        if (stepKey === 'ep') {
            const cut = getActualOrScheduled('Cắt', 'cut_expected_at');
            const inn = getActualOrScheduled('In', 'in_expected_at');
            const times = [];
            if (cut) times.push(cut.getTime() + 15 * 60 * 1000);
            if (inn) times.push(inn.getTime() + 15 * 60 * 1000);
            if (times.length > 0) depTime = new Date(Math.max(...times));
        } else if (stepKey === 'may_qc_ht') {
            const ep = getActualOrScheduled('Ép', 'ep_expected_at');
            if (ep) depTime = new Date(ep.getTime() + 15 * 60 * 1000);
        } else if (stepKey === 'gui') {
            const m = getActualOrScheduled('May', 'may_qc_ht_expected_at');
            const q = getActualOrScheduled('Kiểm Tra CL', 'may_qc_ht_expected_at');
            const h = getActualOrScheduled('Hoàn Thiện', 'may_qc_ht_expected_at');
            const times = [];
            if (m) times.push(m.getTime() + 15 * 60 * 1000);
            if (q) times.push(q.getTime() + 15 * 60 * 1000);
            if (h) times.push(h.getTime() + 15 * 60 * 1000);
            
            if (times.length > 0) {
                depTime = new Date(Math.max(...times));
            } else {
                const mayQcHt = parseDate(schedule.may_qc_ht_expected_at);
                if (mayQcHt) depTime = new Date(mayQcHt.getTime() + 15 * 60 * 1000);
            }
        }

        if (depTime && depTime > minTime) {
            minTime = depTime;
        }

        const localTime = new Date(minTime.getTime() + tzOffset * 60 * 1000);
        return localTime.toISOString().slice(0, 16);
    };

    const _qlxRecalculateSetupLimits = () => {
        const parseDate = (dStr) => {
            if (!dStr || dStr === 'null' || dStr === 'undefined') return null;
            return new Date(dStr);
        };

        const getStepDateVal = (inputId, scheduleField, timelineName) => {
            const el = document.getElementById(inputId);
            if (el) {
                return el.value ? new Date(el.value) : null;
            }
            const step = timeline.find(s => s.name === timelineName);
            if (step && step.done && step.time) return parseDate(step.time);
            return parseDate(schedule[scheduleField]);
        };

        const cutVal = getStepDateVal('setupCut', 'cut_expected_at', 'Cắt');
        const inVal = getStepDateVal('setupIn', 'in_expected_at', 'In');
        const epVal = getStepDateVal('setupEp', 'ep_expected_at', 'Ép');
        const mayVal = getStepDateVal('setupMayQcHt', 'may_qc_ht_expected_at', 'May');

        const baseMin = new Date();
        const tzOffset = 7 * 60;
        
        const toISO = (dateObj) => {
            const localTime = new Date(dateObj.getTime() + tzOffset * 60 * 1000);
            return localTime.toISOString().slice(0, 16);
        };

        const updateMinAttr = (inputId, minDateObj) => {
            const displayEl = document.getElementById(inputId + '_display');
            if (displayEl) {
                displayEl.setAttribute('data-min-val', toISO(minDateObj));
            }
        };

        const checkAndAdjust = (inputId, minDateObj) => {
            const el = document.getElementById(inputId);
            if (el && el.value) {
                const currentVal = new Date(el.value);
                if (currentVal < minDateObj) {
                    const newISO = toISO(minDateObj);
                    el.value = newISO;
                    
                    const displayEl = document.getElementById(inputId + '_display');
                    if (displayEl) {
                        displayEl.value = _qlxFormatDateTimeToShow(newISO);
                        
                        // Visual cue: orange highlight
                        displayEl.style.borderColor = '#f97316';
                        displayEl.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.2)';
                        setTimeout(() => {
                            displayEl.style.borderColor = '#cbd5e1';
                            displayEl.style.boxShadow = 'none';
                        }, 1500);
                    }
                    return true;
                }
            }
            return false;
        };

        // 1. Recalculate and adjust Chặng Ép
        const epDeps = [];
        if (cutVal) epDeps.push(cutVal.getTime() + 15 * 60 * 1000);
        if (inVal) epDeps.push(inVal.getTime() + 15 * 60 * 1000);
        let minEp = epDeps.length > 0 ? new Date(Math.max(...epDeps)) : baseMin;
        if (minEp < baseMin) minEp = baseMin;
        
        updateMinAttr('setupEp', minEp);
        const epAdjusted = checkAndAdjust('setupEp', minEp);
        const finalEpVal = epAdjusted ? minEp : epVal;

        // 2. Recalculate and adjust Chặng May/QC/HT
        const mayDeps = [];
        if (finalEpVal) mayDeps.push(finalEpVal.getTime() + 15 * 60 * 1000);
        if (cutVal) mayDeps.push(cutVal.getTime() + 15 * 60 * 1000);
        if (inVal) mayDeps.push(inVal.getTime() + 15 * 60 * 1000);
        let minMay = mayDeps.length > 0 ? new Date(Math.max(...mayDeps)) : baseMin;
        if (minMay < baseMin) minMay = baseMin;

        updateMinAttr('setupMayQcHt', minMay);
        const mayAdjusted = checkAndAdjust('setupMayQcHt', minMay);
        const finalMayVal = mayAdjusted ? minMay : mayVal;

        // 3. Recalculate and adjust Chặng Gửi
        let minGui = finalMayVal ? new Date(finalMayVal.getTime() + 15 * 60 * 1000) : baseMin;
        if (minGui < baseMin) minGui = baseMin;

        updateMinAttr('setupGui', minGui);
        checkAndAdjust('setupGui', minGui);
    };

    const renderStepCard = (stepKey, label, isDone, scheduleVal, minVal) => {
        if (isDone) {
            return `
                <div id="card_${stepKey}" style="border:1px solid #e2d8f0;border-radius:10px;padding:12px;background:#f0fdf4;margin-bottom:12px;user-select:none;" data-no-debounce="true">
                    <div style="font-weight:800;font-size:13px;color:#166534;margin-bottom:6px;border-bottom:1px solid #bbf7d0;padding-bottom:6px;display:flex;align-items:center;gap:6px;" data-no-debounce="true">
                        ✅ Chặng ${label}
                    </div>
                    <div style="color:#065f46;font-weight:700;font-size:12px;text-align:center;padding:4px;" data-no-debounce="true">
                        🟢 Đã hoàn thành
                    </div>
                </div>
            `;
        }

        const capStep = stepKey === 'may_qc_ht' ? 'MayQcHt' : (stepKey.charAt(0).toUpperCase() + stepKey.slice(1));
        const valISO = toInputVal(scheduleVal);
        
        return `
            <div id="card_${stepKey}" class="qlx-step-card" onclick="_qlxActivatePasteCard('${stepKey}')" onfocusin="_qlxActivatePasteCard('${stepKey}')" data-no-debounce="true" style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#f8fafc;margin-bottom:12px;cursor:pointer;transition:all 0.2s ease;">
                <div style="font-weight:800;font-size:13px;color:#1e293b;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;display:flex;justify-content:space-between;align-items:center;" data-no-debounce="true">
                    <span data-no-debounce="true">⚙️ Chặng ${label}</span>
                    <span class="active-badge-${stepKey}" style="display:none;font-size:10px;background:#6366f1;color:white;padding:2px 6px;border-radius:4px;font-weight:700;" data-no-debounce="true">👉 Đang chọn để dán ảnh</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;" onclick="event.stopPropagation();" data-no-debounce="true">
                    <div>
                        <label style="display:block;font-weight:700;margin-bottom:4px;font-size:11px;color:#475569;">Thời gian dự kiến xong:</label>
                        <div class="qlx-datetime-picker-wrap" style="position:relative;">
                            <input type="hidden" id="setup${capStep}" value="${valISO}">
                            <input type="text" id="setup${capStep}_display" class="modal-input qlx-custom-datetime-input" style="width:100%;padding:6px 10px;border:2px solid #cbd5e1;border-radius:6px;font-size:12px;background:#fff;cursor:pointer;font-weight:600;transition:all 0.3s;" readonly value="${_qlxFormatDateTimeToShow(valISO)}" data-min-val="${minVal}" onclick="_qlxOpenDateTimePicker('setup${capStep}', this.getAttribute('data-min-val'))">
                            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#64748b;font-size:12px;">📅</span>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-weight:700;margin-bottom:4px;font-size:11px;color:#475569;">Nội dung báo cáo:</label>
                        <textarea id="setup${capStep}Notes" style="width:100%;padding:6px 10px;border:2px solid #cbd5e1;border-radius:6px;height:45px;font-size:12px;resize:none;" placeholder="Nhập ghi chú hoặc báo cáo tiến trình..."></textarea>
                    </div>
                    <div>
                        <label style="display:block;font-weight:700;margin-bottom:4px;font-size:11px;color:#475569;">Hình ảnh báo cáo (Dán Ctrl+V):</label>
                        <div id="setup${capStep}PasteZone" style="border:2px dashed #cbd5e1;padding:12px;text-align:center;border-radius:6px;background:#fff;color:#64748b;font-weight:700;font-size:11px;user-select:none;">
                            Bấm chọn chặng này rồi ấn Ctrl+V để dán ảnh
                        </div>
                        <div id="setup${capStep}ImagePreview" style="margin-top:8px;text-align:center;display:none;">
                            <img id="setup${capStep}PreviewImg" style="max-height:100px;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.05);"><br/>
                            <button type="button" onclick="event.stopPropagation(); _qlxClearMultiStepImage('${stepKey}')" style="margin-top:4px;color:#ef4444;border:none;background:none;font-weight:700;cursor:pointer;font-size:10px;">Xóa ảnh</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const contentHtml = `
        <div style="display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow-y:auto;padding-right:4px;">
            <div style="font-size:12px;color:#475569;margin-bottom:8px;background:#f1f5f9;padding:8px;border-radius:6px;">
                💡 <b>Nguyên tắc:</b> Thời gian chặng sau không được bắt đầu trước chặng sản xuất trước đó. Lịch trình sẽ tự động tránh <b>Chủ nhật</b> và <b>Ngày lễ</b>.
                <br/>👉 <b>Mẹo:</b> Click chọn thẻ của chặng cần báo cáo để hiển thị badge màu tím rồi ấn <b>Ctrl + V</b> để dán hình ảnh chặng đó.
            </div>
            ${renderStepCard('cut', 'Cắt', isCutDone, schedule.cut_expected_at, getMinForStep('cut'))}
            ${renderStepCard('in', 'In', isInDone, schedule.in_expected_at, getMinForStep('in'))}
            ${renderStepCard('ep', 'Ép', isEpDone, schedule.ep_expected_at, getMinForStep('ep'))}
            ${renderStepCard('may_qc_ht', 'May/QC/HT', isMayQcHtDone, schedule.may_qc_ht_expected_at, getMinForStep('may_qc_ht'))}
            ${renderStepCard('gui', 'Gửi', isGuiDone, schedule.gui_expected_at, getMinForStep('gui'))}
        </div>
    `;

    const footerHtml = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:8px;background:white;cursor:pointer;font-weight:700;color:#475569;">Hủy</button>
        <button onclick="_qlxSubmitSetupSchedule(${orderId}, ${itemId})" style="padding:8px 20px;border:none;border-radius:8px;background:#4f46e5;color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 4px rgba(79,70,229,0.2);">Lưu lịch trình & Báo cáo</button>
    `;

    _dhnqlxCreateModal(`Báo cáo tiến trình đơn hàng — ${orderCode}`, contentHtml, footerHtml, '500px');

    // Bind change listeners to trigger cascading auto-recalculation
    ['setupCut', 'setupIn', 'setupEp', 'setupMayQcHt', 'setupGui'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                _qlxRecalculateSetupLimits();
            });
        }
    });

    // Register active step and paste listener
    let defaultActive = null;
    if (!isCutDone) defaultActive = 'cut';
    else if (!isInDone) defaultActive = 'in';
    else if (!isEpDone) defaultActive = 'ep';
    else if (!isMayQcHtDone) defaultActive = 'may_qc_ht';
    else if (!isGuiDone) defaultActive = 'gui';

    if (defaultActive) {
        setTimeout(() => {
            _qlxActivatePasteCard(defaultActive);
        }, 80);
    }

    const modalEl = document.getElementById('dhnqlxActionModal');
    if (modalEl) {
        const pasteHandler = async (e) => {
            if (window._qlxActivePasteStep) {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let item of items) {
                    if (item.type.indexOf('image') === 0) {
                        const file = item.getAsFile();
                        _qlxUploadAndResizeMulti(file, window._qlxActivePasteStep);
                        break;
                    }
                }
            }
        };
        document.addEventListener('paste', pasteHandler);
        
        const originalRemove = modalEl.remove;
        modalEl.remove = function() {
            document.removeEventListener('paste', pasteHandler);
            originalRemove.apply(modalEl);
        };
    }
}

async function _qlxSubmitSetupSchedule(orderId, itemId) {
    const validateField = (id, label) => {
        const el = document.getElementById(id);
        if (!el) return true;
        const val = el.value;
        if (!val) return true;
        const expDate = new Date(val);
        if (isNaN(expDate.getTime())) {
            showToast(`Thời gian chặng ${label} không hợp lệ`, 'error');
            return false;
        }
        if (expDate.getTime() < Date.now() - 60000) {
            showToast(`Thời gian chặng ${label} không được ở trong quá khứ`, 'error');
            return false;
        }
        const vnDateStr = val.slice(0, 10);
        if (_qlxHolidaysSet.has(vnDateStr)) {
            showToast(`Chặng ${label}: Không được hẹn lịch vào ngày lễ (${vnDateStr})`, 'error');
            return false;
        }
        return true;
    };

    if (!validateField('setupCut', 'Cắt')) return;
    if (!validateField('setupIn', 'In')) return;
    if (!validateField('setupEp', 'Ép')) return;
    if (!validateField('setupMayQcHt', 'May/QC/HT')) return;
    if (!validateField('setupGui', 'Gửi')) return;

    // Final client-side dependency validation
    const parseDate = (dStr) => {
        if (!dStr || dStr === 'null' || dStr === 'undefined') return null;
        return new Date(dStr);
    };

    const getVal = (id, fieldName) => {
        const el = document.getElementById(id);
        if (el) return el.value ? new Date(el.value) : null;
        return (window._qlxCurrentSchedule && window._qlxCurrentSchedule[fieldName]) ? new Date(window._qlxCurrentSchedule[fieldName]) : null;
    };

    const cutVal = getVal('setupCut', 'cut_expected_at');
    const inVal = getVal('setupIn', 'in_expected_at');
    const epVal = getVal('setupEp', 'ep_expected_at');
    const mayVal = getVal('setupMayQcHt', 'may_qc_ht_expected_at');
    const guiVal = getVal('setupGui', 'gui_expected_at');

    if (epVal) {
        if (cutVal && epVal.getTime() < cutVal.getTime() + 15 * 60 * 1000) {
            showToast('Chặng Ép phải cách chặng Cắt ít nhất 15 phút', 'error');
            return;
        }
        if (inVal && epVal.getTime() < inVal.getTime() + 15 * 60 * 1000) {
            showToast('Chặng Ép phải cách chặng In ít nhất 15 phút', 'error');
            return;
        }
    }
    if (mayVal) {
        if (epVal && mayVal.getTime() < epVal.getTime() + 15 * 60 * 1000) {
            showToast('Chặng May/QC/HT phải cách chặng Ép ít nhất 15 phút', 'error');
            return;
        }
        if (cutVal && mayVal.getTime() < cutVal.getTime() + 15 * 60 * 1000) {
            showToast('Chặng May/QC/HT phải cách chặng Cắt ít nhất 15 phút', 'error');
            return;
        }
        if (inVal && mayVal.getTime() < inVal.getTime() + 15 * 60 * 1000) {
            showToast('Chặng May/QC/HT phải cách chặng In ít nhất 15 phút', 'error');
            return;
        }
    }
    if (guiVal) {
        if (mayVal && guiVal.getTime() < mayVal.getTime() + 15 * 60 * 1000) {
            showToast('Chặng Gửi phải cách chặng May/QC/HT ít nhất 15 phút', 'error');
            return;
        }
    }

    const getISOVal = (id, fieldName) => {
        const el = document.getElementById(id);
        if (!el) {
            return window._qlxCurrentSchedule ? window._qlxCurrentSchedule[fieldName] : null;
        }
        const val = el.value;
        return val ? new Date(val).toISOString() : null;
    };

    const getReportForStep = (stepKey) => {
        const capStep = stepKey === 'may_qc_ht' ? 'MayQcHt' : (stepKey.charAt(0).toUpperCase() + stepKey.slice(1));
        const notesEl = document.getElementById(`setup${capStep}Notes`);
        const notes = notesEl ? notesEl.value.trim() : '';
        const image_url = window._qlxUploadedImages ? window._qlxUploadedImages[stepKey] : null;
        
        if (notes || image_url) {
            return { notes, image_url };
        }
        return null;
    };

    const payload = {
        dht_order_id: orderId,
        order_item_id: itemId,
        cut_expected_at: getISOVal('setupCut', 'cut_expected_at'),
        in_expected_at: getISOVal('setupIn', 'in_expected_at'),
        ep_expected_at: getISOVal('setupEp', 'ep_expected_at'),
        may_qc_ht_expected_at: getISOVal('setupMayQcHt', 'may_qc_ht_expected_at'),
        gui_expected_at: getISOVal('setupGui', 'gui_expected_at'),
        reports: {
            cat: getReportForStep('cut'),
            in: getReportForStep('in'),
            ep: getReportForStep('ep'),
            may_qc_ht: getReportForStep('may_qc_ht'),
            gui: getReportForStep('gui')
        }
    };

    try {
        const res = await apiCall('/api/qlx-orders/schedule', 'POST', payload);
        if (res.success) {
            showToast('Lưu lịch trình sản xuất và gửi báo cáo thành công!');
            document.getElementById('dhnqlxActionModal')?.remove();
            
            _dhnqlxLoadData();
            setTimeout(() => {
                _dhnqlxToggleDetail(orderId);
            }, 600);
        } else {
            showToast(res.error || 'Lỗi lưu lịch trình', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

let _qlxUploadedImageUrl = null;

function _qlxClearStepImage() {
    _qlxUploadedImageUrl = null;
    const preview = document.getElementById('qlxStepImagePreview');
    if (preview) preview.style.display = 'none';
    const zone = document.getElementById('qlxStepPasteZone');
    if (zone) zone.innerText = 'Nhấn Ctrl+V để dán hình ảnh báo cáo vào đây (Bắt buộc)';
}

async function _qlxShowStepReportModal(orderId, itemId, orderCode, stepName, stepKey, worker, extra, progress, scheduleAt, time, rawReports, isDone, blockedBy, rawSchedule) {
    _qlxUploadedImageUrl = null;
    const isUnscheduled = !scheduleAt || scheduleAt === 'null' || scheduleAt === 'undefined' || scheduleAt === '';
    const schedule = JSON.parse(decodeURIComponent(rawSchedule || '{}'));

    const getMinForStep = () => {
        let minTime = new Date(); // default to now
        const tzOffset = 7 * 60; // UTC+7
        
        const parseDate = (dStr) => {
            if (!dStr || dStr === 'null' || dStr === 'undefined') return null;
            return new Date(dStr);
        };

        if (schedule) {
            let depTime = null;
            if (stepKey === 'ep') {
                const cut = parseDate(schedule.cut_expected_at);
                const inn = parseDate(schedule.in_expected_at);
                const times = [];
                if (cut) times.push(cut.getTime() + 15 * 60 * 1000);
                if (inn) times.push(inn.getTime() + 15 * 60 * 1000);
                if (times.length > 0) depTime = new Date(Math.max(...times));
            } else if (stepKey === 'may' || stepKey === 'qc' || stepKey === 'ht') {
                const ep = parseDate(schedule.ep_expected_at);
                if (ep) depTime = new Date(ep.getTime() + 15 * 60 * 1000);
            } else if (stepKey === 'gui') {
                const may = parseDate(schedule.may_qc_ht_expected_at);
                if (may) depTime = new Date(may.getTime() + 15 * 60 * 1000);
            }

            if (depTime && depTime > minTime) {
                minTime = depTime;
            }
        }

        const localTime = new Date(minTime.getTime() + tzOffset * 60 * 1000);
        return localTime.toISOString().slice(0, 16);
    };

    // Show initial loading modal
    _dhnqlxCreateModal(`Chi tiết Chặng ${stepName} — ${orderCode}`, `
        <div style="text-align:center;padding:30px;color:#64748b;font-weight:700;">
            <div style="font-size:24px;margin-bottom:8px;animation:spin 1s linear infinite;">⏳</div>
            Đang tải chi tiết bộ phận...
        </div>
    `, '', '450px');

    let resData = null;
    try {
        const url = `/api/trasoat/orders/${orderId}/step/${stepKey}${itemId ? '?item_id=' + itemId : ''}`;
        resData = await apiCall(url);
    } catch(err) {
        console.error('Lỗi tải dữ liệu trasoat:', err);
    }

    // Override _tsCloseModal temporarily to close our custom modal instead of the global one
    window._tsCloseModal = function() {
        document.getElementById('dhnqlxActionModal')?.remove();
    };

    let detailHtml = '';
    let hasNativeDetail = false;

    if (resData && typeof _tsRenderStepModal === 'function') {
        try {
            detailHtml = _tsRenderStepModal(stepKey, resData);
            // Strip the trailing "Đóng" button footer container
            const closeBtnTag = '<div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">';
            const lastIdx = detailHtml.lastIndexOf(closeBtnTag);
            if (lastIdx !== -1) {
                detailHtml = detailHtml.substring(0, lastIdx);
            }
            hasNativeDetail = true;
        } catch(e) {
            console.error('Lỗi render _tsRenderStepModal:', e);
        }
    }

    if (!hasNativeDetail) {
        // Fallback to our clean table detail
        const fmtDT = d => { 
            if (!d) return ''; 
            const dt = new Date(d); 
            return dt.toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }); 
        };
        const reports = JSON.parse(decodeURIComponent(rawReports || '') || '[]');

        detailHtml = `
            <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 24px;color:white;display:flex;align-items:center;justify-content:between;">
                <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">📋 Chi tiết Chặng ${stepName} — ${orderCode}</div>
                <span onclick="document.getElementById('dhnqlxActionModal').remove()" style="cursor:pointer;color:white;font-size:20px;font-weight:700;opacity:0.8;margin-left:auto;">✕</span>
            </div>
            <div style="padding:22px 24px;font-size:13px;color:#334155;line-height:1.6;max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; font-size:13px; line-height: 1.6;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Chặng sản xuất:</span>
                        <span style="color:#1e1b4b; font-weight:800; font-size:14px;">${stepName}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; gap:8px;">
                        <span style="color:#64748b; font-weight:600; flex-shrink:0;">Bộ phận đảm nhận:</span>
                        <span style="color:#0f172a; font-weight:700; text-align:right; word-break:break-word;">${worker || 'Chưa phân công'}</span>
                    </div>
                    ${extra ? `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; gap:8px;">
                        <span style="color:#64748b; font-weight:600; flex-shrink:0;">Chi tiết triển khai:</span>
                        <span style="color:#7c3aed; font-weight:700; text-align:right; word-break:break-word;">${extra}</span>
                    </div>` : ''}
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="color:#64748b; font-weight:600;">Tiến độ hoàn thành:</span>
                        <span style="color:#059669; font-weight:700; background:#d1fae5; padding:2px 8px; border-radius:12px; font-size:11px;">${progress ? progress + ' xong' : '0 xong'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="color:#64748b; font-weight:600;">Lịch dự kiến QLX:</span>
                        <span style="color:#2563eb; font-weight:700;">${scheduleAt ? fmtDT(scheduleAt) : 'Chưa lên lịch'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    const modalEl = document.getElementById('dhnqlxActionModal');
    if (!modalEl) return;

    modalEl.innerHTML = `
    <div style="background:white;border-radius:16px;width:600px;max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;animation:dhnqlxModalSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <!-- View 1: Step Detail View -->
        <div id="qlxStepDetailView" style="display:flex; flex-direction:column; max-height:85vh; overflow-y:auto;">
            ${detailHtml}
            <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:8px;background:white;cursor:pointer;font-weight:700;color:#475569;">Đóng</button>
                ${isDone ? '' : `<button onclick="_qlxSwitchToReportForm('${scheduleAt ? 'scheduled' : 'unscheduled'}', '${blockedBy || ''}')" style="padding:8px 20px;border:none;border-radius:8px;background:#4f46e5;color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 4px rgba(79,70,229,0.2);">📢 Báo cáo tiến trình đơn hàng</button>`}
            </div>
        </div>

        <!-- View 2: Step Report Form View (Hidden by default) -->
        <div id="qlxStepReportFormView" style="display:none; flex-direction:column;">
            <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 24px;color:white;display:flex;align-items:center;justify-content:between;">
                <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">📢 Báo Cáo Tiến Độ Chặng ${stepName} — ${orderCode}</div>
                <span onclick="document.getElementById('dhnqlxActionModal').remove()" style="cursor:pointer;color:white;font-size:20px;font-weight:700;opacity:0.8;margin-left:auto;">✕</span>
            </div>
            
            <div style="padding:22px 24px;font-size:13px;color:#334155;line-height:1.6;max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="display:block;font-weight:700;margin-bottom:4px;">Trạng thái tiến độ:</label>
                    <select id="qlxStepStatus" style="width:100%;padding:8px;border:2px solid #cbd5e1;border-radius:6px;" onchange="_qlxOnStepStatusChange()">
                        ${isUnscheduled ? '' : '<option value="on_track">🟢 Đúng tiến độ (Không bị trễ)</option>'}
                        <option value="delayed">${isUnscheduled ? '📅 Hẹn giờ dự kiến hoàn thành (Bắt buộc)' : '🔴 Chậm tiến độ (Cần hẹn lại giờ xong)'}</option>
                    </select>
                </div>
                
                <div id="qlxDelayInputs" style="display:${isUnscheduled ? 'flex' : 'none'};flex-direction:column;gap:12px;">
                    <div>
                        <label style="display:block;font-weight:700;margin-bottom:4px;">${isUnscheduled ? 'Giờ dự kiến hoàn thành (Bắt buộc):' : 'Giờ dự kiến hoàn thành mới (Bắt buộc):'}</label>
                        <div class="qlx-datetime-picker-wrap" style="position:relative;">
                            <input type="hidden" id="qlxStepExpectedAt" value="">
                            <input type="text" id="qlxStepExpectedAt_display" class="modal-input qlx-custom-datetime-input" style="width:100%;padding:8px;border:2px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-weight:600;" readonly value="" placeholder="Chọn giờ dự kiến hoàn thành..." onclick="_qlxOpenDateTimePicker('qlxStepExpectedAt', '${getMinForStep()}')">
                            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#64748b;font-size:14px;">📅</span>
                        </div>
                    </div>
                    
                    <div>
                        <label style="display:block;font-weight:700;margin-bottom:4px;">${isUnscheduled ? 'Nội dung/Lý do hẹn lịch (Bắt buộc):' : 'Lý do chậm trễ (Bắt buộc):'}</label>
                        <textarea id="qlxStepNotes" style="width:100%;padding:8px;border:2px solid #cbd5e1;border-radius:6px;height:60px;" placeholder="${isUnscheduled ? 'Nhập lý do hẹn lịch...' : 'Nhập lý do chậm trễ chi tiết...'}"></textarea>
                    </div>
                    
                    <div>
                        <label style="display:block;font-weight:700;margin-bottom:4px;">Hình ảnh báo cáo thực tế (Bắt buộc):</label>
                        <div id="qlxStepPasteZone" style="border:2px dashed #cbd5e1;padding:20px;text-align:center;border-radius:8px;background:#f8fafc;cursor:default;color:#64748b;font-weight:700;font-size:12px;">
                            Nhấn Ctrl+V để dán hình ảnh báo cáo vào đây (Bắt buộc)
                        </div>
                        
                        <div id="qlxStepImagePreview" style="margin-top:10px;text-align:center;display:none;">
                            <img id="qlxStepPreviewImg" style="max-height:150px;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.1);"><br/>
                            <button type="button" onclick="_qlxClearStepImage()" style="margin-top:4px;color:#ef4444;border:none;background:none;font-weight:700;cursor:pointer;font-size:11px;">Xóa ảnh</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="_qlxSwitchToDetailView()" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:8px;background:white;cursor:pointer;font-weight:700;color:#475569;">Quay lại</button>
                <button onclick="_qlxSubmitStepReport(${orderId}, ${itemId}, '${stepKey}')" style="padding:8px 20px;border:none;border-radius:8px;background:#059669;color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 4px rgba(5,150,105,0.2);">Gửi báo cáo</button>
            </div>
        </div>
    </div>`;

    const pasteHandler = async (e) => {
        const formView = document.getElementById('qlxStepReportFormView');
        if (formView && formView.style.display !== 'none') {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.type.indexOf('image') === 0) {
                    const file = item.getAsFile();
                    _qlxUploadAndResize(file);
                    break;
                }
            }
        }
    };
    
    document.addEventListener('paste', pasteHandler);
    
    const originalRemove = modalEl.remove;
    modalEl.remove = function() {
        document.removeEventListener('paste', pasteHandler);
        originalRemove.apply(modalEl);
    };
}

function _qlxSwitchToReportForm(scheduleState, blockedBy) {
    if (blockedBy && blockedBy !== 'undefined' && blockedBy !== 'null' && blockedBy !== '') {
        showToast(`Vui lòng thiết lập lịch trình cho chặng ${blockedBy} trước.`, 'error');
        return;
    }
    const detailView = document.getElementById('qlxStepDetailView');
    const reportView = document.getElementById('qlxStepReportFormView');
    
    if (detailView && reportView) {
        detailView.style.display = 'none';
        reportView.style.display = 'flex';
    }
}

function _qlxSwitchToDetailView() {
    const detailView = document.getElementById('qlxStepDetailView');
    const reportView = document.getElementById('qlxStepReportFormView');
    
    if (detailView && reportView) {
        detailView.style.display = 'flex';
        reportView.style.display = 'none';
    }
}

function _qlxOnStepStatusChange() {
    const status = document.getElementById('qlxStepStatus').value;
    const delayDiv = document.getElementById('qlxDelayInputs');
    if (status === 'delayed') {
        delayDiv.style.display = 'flex';
    } else {
        delayDiv.style.display = 'none';
    }
}

function _qlxHandleStepFileSelect(input) {
    if (input.files && input.files[0]) {
        _qlxUploadAndResize(input.files[0]);
    }
}

function _qlxUploadAndResize(file) {
    const zone = document.getElementById('qlxStepPasteZone');
    if (zone) zone.innerText = '⚙️ Đang xử lý & tải ảnh lên...';

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1000;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    showToast('Lỗi nén ảnh', 'error');
                    if (zone) zone.innerText = 'Lỗi nén ảnh. Thử lại.';
                    return;
                }
                const formData = new FormData();
                formData.append('file', blob, 'report_image.jpg');

                fetch('/api/qlx/upload-image', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                    }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        _qlxUploadedImageUrl = data.image_url;
                        
                        const preview = document.getElementById('qlxStepImagePreview');
                        const previewImg = document.getElementById('qlxStepPreviewImg');
                        if (preview && previewImg) {
                            previewImg.src = data.image_url;
                            preview.style.display = 'block';
                        }
                        if (zone) zone.innerText = '✅ Tải ảnh thành công!';
                    } else {
                        showToast(data.error || 'Lỗi tải ảnh', 'error');
                        if (zone) zone.innerText = 'Lỗi tải ảnh. Thử lại.';
                    }
                })
                .catch(err => {
                    showToast(err.message, 'error');
                    if (zone) zone.innerText = 'Lỗi kết nối. Thử lại.';
                });
            }, 'image/jpeg', 0.7);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function _qlxSubmitStepReport(orderId, itemId, stepKey) {
    let reportStepKey = stepKey;
    if (stepKey === 'may' || stepKey === 'qc' || stepKey === 'ht') {
        reportStepKey = 'may_qc_ht';
    }
    const status = document.getElementById('qlxStepStatus').value;
    const payload = {
        dht_order_id: orderId,
        order_item_id: itemId,
        step_name: status === 'on_track' ? 'on_track' : reportStepKey
    };

    if (status === 'delayed') {
        const expected_at = document.getElementById('qlxStepExpectedAt').value;
        const notes = document.getElementById('qlxStepNotes').value.trim();
        
        if (!expected_at) {
            showToast('Vui lòng chọn giờ dự kiến hoàn thành mới', 'error');
            return;
        }
        const expDate = new Date(expected_at);
        if (isNaN(expDate.getTime())) {
            showToast('Thời gian dự kiến không hợp lệ', 'error');
            return;
        }
        if (expDate.getTime() < Date.now() - 60000) {
            showToast('Thời gian dự kiến không được ở trong quá khứ', 'error');
            return;
        }
        const vnDateStr = expected_at.slice(0, 10);
        if (_qlxHolidaysSet.has(vnDateStr)) {
            showToast(`Không được hẹn lịch vào ngày lễ (${vnDateStr})`, 'error');
            return;
        }
        if (!notes) {
            showToast('Vui lòng nhập lý do chậm trễ', 'error');
            return;
        }
        if (!_qlxUploadedImageUrl) {
            showToast('Vui lòng dán hoặc tải lên hình ảnh báo cáo', 'error');
            return;
        }

        payload.expected_at = new Date(expected_at).toISOString();
        payload.notes = notes;
        payload.image_url = _qlxUploadedImageUrl;
    }

    try {
        const res = await apiCall('/api/qlx-orders/step-report', 'POST', payload);
        if (res.success) {
            showToast('Gửi báo cáo tiến độ thành công!');
            document.getElementById('dhnqlxActionModal')?.remove();
            
            _dhnqlxLoadData();
            setTimeout(() => {
                _dhnqlxToggleDetail(orderId);
            }, 600);
        } else {
            showToast(res.error || 'Lỗi gửi báo cáo', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function _qlxShowStepReportsHistoryModal(orderCode, stepName, rawReports) {
    const reports = JSON.parse(decodeURIComponent(rawReports) || '[]');
    const fmtDT = d => { if (!d) return ''; const dt = new Date(d); return dt.toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }); };

    let html = '<div style="display:flex;flex-direction:column;gap:12px;max-height:450px;overflow-y:auto;padding-right:4px;">';
    reports.forEach((r, idx) => {
        html += `
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; font-size:12px;">
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1e293b; margin-bottom:4px;">
                    <span>Báo cáo #${idx + 1}</span>
                    <span style="font-weight:normal; color:#64748b; font-size:10px;">${fmtDT(r.created_at)}</span>
                </div>
                <div style="margin-top:2px;">• Người báo cáo: <b>${r.reporter_name || 'Hệ thống'}</b></div>
                ${r.expected_at ? `<div style="margin-top:2px;">• Giờ hẹn mới: <b style="color:#2563eb;">${fmtDT(r.expected_at)}</b></div>` : ''}
                <div style="margin-top:4px; font-style:italic; background:white; padding:6px; border-radius:4px; border:1px solid #e2e8f0; color:#475569;">
                    "${r.notes || 'Không có ghi chú'}"
                </div>
                ${r.image_url ? `
                    <div style="margin-top:8px;">
                        <a href="${r.image_url}" target="_blank">
                            <img src="${r.image_url}" style="max-width:100%; max-height:200px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:zoom-in;">
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    });
    html += '</div>';

    const footerHtml = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 20px;border:none;border-radius:8px;background:#374151;color:white;cursor:pointer;font-weight:700;">Đóng</button>
    `;

    _dhnqlxCreateModal(`Báo cáo chặng ${stepName} — ${orderCode}`, html, footerHtml, '450px');
}

