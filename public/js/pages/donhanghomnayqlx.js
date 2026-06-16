// ========== ĐƠN HÀNG HÔM NAY QUẢN LÝ XƯỞNG ==========
let _dhnqlxFilter = 'xu_ly';
let _dhnqlxData = { som: [], xu_ly: [], hen_lai: [], hoan_thanh: [] };
let _dhnqlxCounts = { som: 0, xu_ly: 0, hen_lai: 0, hoan_thanh: 0 };
let _dhnqlxSearchVal = '';

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
                ⚙️ Giờ Nghỉ QLX: <span id="dhnqlxCurrentCutoffLabel" style="color:#4f46e5;font-weight:900;">--:--</span>
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
        const hrs = Math.floor(amount / 60);
        const mins = amount % 60;
        const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        
        const btn = document.getElementById('dhnqlxConfigBtn');
        const lbl = document.getElementById('dhnqlxCurrentCutoffLabel');
        if (btn && lbl) {
            btn.style.display = 'inline-flex';
            lbl.textContent = timeStr;
            btn.dataset.cutoffValue = amount;
        }
    } catch(e) {
        console.error('Failed to load cutoff time:', e);
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
        const cnt = _dhnqlxCounts[t.key] || 0;
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

    let tbodyRows = orders.map(o => {
        const prio = (o.shipping_priority || 'CHUẨN').toUpperCase();
        let prioClass = 'dhnqlx-prio-chuan';
        if (prio === 'GẤP') prioClass = 'dhnqlx-prio-gap';
        else if (prio === 'GỬI') prioClass = 'dhnqlx-prio-gui';

        const orderDateStr = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
        
        // Progress Column
        const progressHTML = getProgressSaleHTML(o);

        // Sale Ship Date Column
        const saleExpectedDateStr = formatExpectedShipDateWithDay(o.expected_ship_date);
        const deliveryTimeHtml = o.standard_delivery_time ? `<div style="font-size:10px;color:#0369a1;font-weight:normal;">Giờ: <b>${o.standard_delivery_time}</b></div>` : '';

        // QLX Expected Date Column
        const qlxExpectedDateStr = formatExpectedShipDateWithDay(o.qlx_expected_date);
        const qlxExpectedHourStr = o.qlx_expected_hour || '—';

        // Action Buttons dependent on status
        let actionButtons = '';
        if (_dhnqlxFilter !== 'hoan_thanh') {
            actionButtons += `
                <button onclick="_dhnqlxShowExpectedTimeModal(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-blue">⏱ Báo giờ ra</button>
                <button onclick="_dhnqlxConfirmComplete(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-green">✅ Hoàn thành</button>
                <button onclick="_dhnqlxShowRescheduleModal(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-yellow">📅 Hẹn lại</button>
            `;
        }
        actionButtons += `<button onclick="_dhnqlxShowLogsModal(${o.id}, '${o.order_code}')" class="dhnqlx-action-btn dhnqlx-btn-gray">📜 Lịch sử</button>`;

        // Reschedule Reason / Status Note
        let statusNote = '';
        if (o.qlx_rescheduled_date) {
            statusNote = `<div style="color:#d97706;font-size:10px;margin-top:2px;"><b>Hẹn lại:</b> ${o.qlx_rescheduled_date_fmt} <br/> <i>${o.qlx_rescheduled_reason || ''}</i></div>`;
        } else if (o.qlx_actual_output_at) {
            statusNote = `<div style="color:#059669;font-size:10px;margin-top:2px;"><b>Xong lúc:</b> ${o.qlx_actual_output_at_fmt}</div>`;
        }

        return `
            <tr>
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

    container.innerHTML = `
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

// ===== DIALOG MODALS =====
function _dhnqlxCreateModal(title, contentHtml, footerHtml, width = '460px') {
    document.getElementById('dhnqlxActionModal')?.remove();

    const m = document.createElement('div');
    m.id = 'dhnqlxActionModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:dhnqlxModalFadeIn 0.2s ease-out;';
    
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:${width};max-width:98vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;animation:dhnqlxModalSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 24px;color:white;display:flex;align-items:center;justify-content:between;">
            <div style="font-weight:800;font-size:15px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">⚙️ ${title}</div>
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
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

function _dhnqlxOpenConfigModal() {
    const btn = document.getElementById('dhnqlxConfigBtn');
    const currentVal = btn ? parseInt(btn.dataset.cutoffValue) || 1080 : 1080;
    const hrs = Math.floor(currentVal / 60);
    const mins = currentVal % 60;
    const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const content = `
        <div style="margin-bottom:12px;">Cấu hình giờ nghỉ chốt nhận đơn của Quản Lý Xưởng.</div>
        <div style="margin-bottom:12px; font-size:12px; color:#64748b; line-height:1.5;">
            <i>* Đơn hàng do CSKH bắn sau giờ này sẽ tự động dời thời hạn tính trễ làm việc sang ngày tiếp theo (miễn phạt trễ trong ngày hôm đó).</i>
        </div>
        <div>
            <label style="display:block;font-weight:700;margin-bottom:6px;">Giờ : Phút nghỉ:</label>
            <input type="time" id="dhnqlxCutoffTimeInput" value="${timeStr}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:16px;text-align:center;color:#4f46e5;">
        </div>
    `;

    const footer = `
        <button onclick="document.getElementById('dhnqlxActionModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:8px;cursor:pointer;font-weight:600;">Hủy</button>
        <button onclick="_dhnqlxSubmitCutoffTime()" style="padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Lưu Cấu Hình</button>
    `;

    _dhnqlxCreateModal('Cài Đặt Giờ Nghỉ QLX', content, footer);
}

async function _dhnqlxSubmitCutoffTime() {
    const timeVal = document.getElementById('dhnqlxCutoffTimeInput').value;
    if (!timeVal) {
        showToast('Vui lòng chọn thời gian', 'error');
        return;
    }

    const [hrs, mins] = timeVal.split(':').map(Number);
    const totalMins = hrs * 60 + mins;

    try {
        const res = await apiCall('/api/penalty/config', 'POST', {
            configs: [
                { key: 'qlx_cutoff_time', amount: totalMins }
            ]
        });
        if (res.success) {
            showToast('Lưu giờ nghỉ QLX thành công!');
            document.getElementById('dhnqlxActionModal')?.remove();
            _dhnqlxLoadCutoffTime();
        } else {
            showToast(res.error || 'Lỗi lưu cấu hình', 'error');
        }
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
