// ========== XUẤT HÓA ĐƠN VAT — Bộ Phận Văn Phòng & Kế Toán ==========
var _vatState = {
    orders: [],
    activeFilter: 'chua_xuat', // 'chua_xuat', 'chua_thu_giay_to', 'hoan_thanh'
    activeYear: null,
    activeMonth: null,
    searchQuery: '',
    page: 1,
    pageSize: 50,
    openYears: {} // track collapsible years in sidebar
};

// Helper: Formatter for currency
function _vatFmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

// Helper: Custom timezone formatting for giờ:phút ngày/tháng/năm
function _vatFormatTime(d) {
    if (!d) return '—';
    const date = new Date(d);
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const hh = String(tzDate.getHours()).padStart(2, '0');
    const mm = String(tzDate.getMinutes()).padStart(2, '0');
    const day = String(tzDate.getDate()).padStart(2, '0');
    const month = String(tzDate.getMonth() + 1).padStart(2, '0');
    const year = tzDate.getFullYear();
    return `${hh}:${mm} ${day}/${month}/${year}`;
}

// Check permission: Only GĐ, QLCC, or users in Kế Toán department can edit/modify
function _vatCanEdit() {
    if (!currentUser) return false;
    if (currentUser.role === 'giam_doc' || currentUser.role === 'quan_ly_cap_cao') return true;
    // Check if user is in Accountant department
    if (currentUser.department_name && (currentUser.department_name.toLowerCase().includes('kế toán') || currentUser.department_name.toLowerCase().includes('ke toan'))) {
        return true;
    }
    return false;
}

// Check if user is an accountant to render read-only view in invoice modal
function _vatIsAccountant() {
    if (!currentUser) return false;
    if (currentUser.role === 'ke_toan') return true;
    if (currentUser.department_name && (currentUser.department_name.toLowerCase().includes('kế toán') || currentUser.department_name.toLowerCase().includes('ke toan'))) {
        return true;
    }
    return false;
}

// Copy to clipboard helper
function _vatCopyToClipboard(text) {
    if (!text) {
        showToast('Không có thông tin để copy!', 'warning');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Đã copy vào bộ nhớ tạm!');
    }).catch(err => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('📋 Đã copy vào bộ nhớ tạm!');
    });
}

// main render entry point called by the app.js SPA router
async function renderXuatvathvPage(content) {
    // 1. Inject Styles once
    if (!document.getElementById('vatPageStyles')) {
        const style = document.createElement('style');
        style.id = 'vatPageStyles';
        style.textContent = `
            .vat-wrap { display: flex; height: calc(100vh - 60px); overflow: hidden; font-family: inherit; }
            .vat-sidebar { width: 280px; min-width: 280px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow-y: auto; }
            .vat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-y: auto; padding: 20px; background: #f8fafc; }
            
            /* Sidebar items */
            .vat-sb-header { padding: 18px; font-weight: 800; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; background: #fafafa; }
            .vat-sb-item { padding: 12px 18px; font-size: 13px; font-weight: 600; color: #475569; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid #f1f5f9; }
            .vat-sb-item:hover { background: #f1f5f9; color: #0f172a; }
            .vat-sb-item.active { background: #e0f2fe; color: #0284c7; border-left: 4px solid #0284c7; font-weight: 800; }
            .vat-sb-badge { background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
            .vat-sb-item.active .vat-sb-badge { background: #0284c7; color: #ffffff; }
            
            /* Sidebar Tree */
            .vat-tree-year { padding: 10px 18px; font-weight: 700; font-size: 13px; color: #334155; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
            .vat-tree-month { padding: 8px 18px 8px 32px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s; border-bottom: 1px solid #f1f5f9; }
            .vat-tree-month:hover { background: #f0f9ff; color: #0369a1; }
            .vat-tree-month.active { background: #e0f2fe; color: #0284c7; font-weight: 800; }
            
            /* Premium action icons styling */
            .vat-action-btn { width: 28px; height: 28px; border-radius: 8px; border: 1.5px solid #cbd5e1; background: #ffffff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; transition: all 0.2s; margin: 0 2px; }
            .vat-action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            
            /* Action button states */
            .vat-btn-invoice.has-info { background: #e0f2fe; border-color: #0ea5e9; color: #0284c7; }
            .vat-btn-export.done { background: #dcfce7; border-color: #22c55e; color: #15803d; }
            .vat-btn-contract.done { background: #ede9fe; border-color: #8b5cf6; color: #6d28d9; }
            .vat-btn-handover.done { background: #ffedd5; border-color: #f97316; color: #c2410c; }
            
            .vat-btn-invoice.pending { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }
            .vat-btn-export.pending { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }
            .vat-btn-contract.pending { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }
            .vat-btn-handover.pending { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }

            /* Tooltip helper */
            .vat-tooltip { position: relative; }
            .vat-tooltip::after { content: attr(data-tooltip); position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%); background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 10px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 100; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .vat-tooltip:hover::after { opacity: 1; }
            
            /* Custom input search */
            .vat-search-input:focus { border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); background: #ffffff; }

            /* Modal customized elements */
            .vat-modal-field { margin-bottom: 14px; }
            .vat-modal-field label { display: block; font-weight: 700; margin-bottom: 6px; font-size: 12.5px; color: #334155; }
            .vat-modal-field input, .vat-modal-field textarea { width: 100%; padding: 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-family: inherit; transition: all 0.15s; outline: none; }
            .vat-modal-field input:focus, .vat-modal-field textarea:focus { border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
            
            .vat-upload-area { border: 2.5px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s; position: relative; }
            .vat-upload-area:hover { border-color: #0284c7; background: #f0f9ff; }
            .vat-upload-preview { max-width: 100%; max-height: 250px; border-radius: 8px; margin-top: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        `;
        document.head.appendChild(style);
    }

    // 2. Initial Page Layout
    content.innerHTML = `
        <div class="vat-wrap">
            <div class="vat-sidebar" id="vatSidebar">
                <div class="vat-sb-header">🧾 Quản Lý Hóa Đơn VAT</div>
                <div class="vat-sb-item active" id="vatSbChuaXuat" onclick="_vatSelectFilter('chua_xuat')">
                    <span>Chưa Xuất VAT</span>
                    <span class="vat-sb-badge" id="vatBadgeChuaXuat">0</span>
                </div>
                <div class="vat-sb-item" id="vatSbChuaThuGiayTo" onclick="_vatSelectFilter('chua_thu_giay_to')">
                    <span>Chưa Thu Giấy Tờ</span>
                    <span class="vat-sb-badge" id="vatBadgeChuaThuGiayTo">0</span>
                </div>
                <div class="vat-sb-header" style="border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12.5px;color:#64748b;">📂 Hoàn Thành VAT</div>
                <div id="vatSidebarTree" style="flex:1;overflow-y:auto;"></div>
            </div>
            <div class="vat-main">
                <!-- Top controls -->
                <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
                    <div id="vatTableTitle" style="font-size:16px;font-weight:800;color:#1e293b;">Đang tải dữ liệu...</div>
                    <div id="vatSearchContainer" style="position:relative;width:300px;margin-left:8px;">
                        <input type="text" id="vatSearchInput" class="vat-search-input" placeholder="🔍 Tìm mã đơn, tên khách, SĐT..." oninput="_vatOnSearch(this.value)" style="width:100%;font-family:inherit;font-size:13px;font-weight:600;padding:8px 32px 8px 32px;border:1.8px solid #cbd5e1;border-radius:10px;outline:none;transition:all 0.2s;">
                        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#94a3b8;pointer-events:none;">🔍</span>
                        <button id="vatSearchClearBtn" onclick="_vatClearSearch()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:14px;color:#94a3b8;cursor:pointer;display:none;font-weight:700;padding:0;line-height:1;">✕</button>
                    </div>
                    <div id="vatStatsText" style="margin-left:auto;font-size:13px;font-weight:700;color:#64748b;"></div>
                </div>

                <!-- Table content -->
                <div class="card" style="border-radius:12px;box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);overflow:hidden;border:none;">
                    <div class="card-body" style="overflow-x:auto;padding:0;">
                        <table class="table" style="font-size:12.5px;white-space:nowrap;margin:0;" id="vatTable">
                            <thead>
                                <tr style="background:#f1f5f9;color:#334155;border-bottom:2px solid #cbd5e1;">
                                    <th style="padding:12px 8px;text-align:center;width:40px;">Thông Tin</th>
                                    <th style="padding:12px 8px;text-align:center;width:40px;">Xuất VAT</th>
                                    <th style="padding:12px 8px;text-align:center;width:40px;">Hợp Đồng</th>
                                    <th style="padding:12px 8px;text-align:center;width:40px;">BB Bàn Giao</th>
                                    <th style="padding:12px 14px;">Lĩnh Vực</th>
                                    <th style="padding:12px 14px;text-align:right;">Còn Lại</th>
                                    <th style="padding:12px 14px;">Mã Đơn</th>
                                    <th style="padding:12px 14px;">Tên Khách</th>
                                    <th style="padding:12px 14px;">Số Điện Thoại</th>
                                    <th style="padding:12px 14px;">Thành Phố</th>
                                    <th style="padding:12px 14px;">CSKH</th>
                                    <th style="padding:12px 14px;">Lịch Sử Cập Nhật</th>
                                </tr>
                            </thead>
                            <tbody id="vatTbody">
                                <tr><td colspan="12" style="text-align:center;padding:40px;color:#94a3b8;">⏳ Đang tải dữ liệu hóa đơn...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="vatPagination" style="margin-top:16px;display:flex;justify-content:center;"></div>
            </div>
        </div>
    `;

    // 3. Reset local state
    _vatState.activeFilter = 'chua_xuat';
    _vatState.activeYear = null;
    _vatState.activeMonth = null;
    _vatState.searchQuery = '';
    _vatState.page = 1;

    // 4. Load order data from backend API
    await _vatLoadData();
    _vatSetupGlobalPasteListener();
}

// Load data & rebuild everything
async function _vatLoadData() {
    try {
        const res = await apiCall('/api/dht/vat-orders');
        _vatState.orders = res.orders || [];
        _vatRenderSidebar();
        _vatRenderTable();
    } catch (e) {
        console.error('[VAT Page Load Error]:', e);
        const tbody = document.getElementById('vatTbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:#ef4444;font-weight:700;">⚠️ Lỗi tải dữ liệu: ${e.message || 'Không thể kết nối đến máy chủ'}</td></tr>`;
        }
    }
}

// Render Sidebar menu items and the Hoàn Thành VAT tree
function _vatRenderSidebar() {
    // 1. Calculate main counts
    const countChuaXuat = _vatState.orders.filter(o => !o.vat_exported).length;
    const countChuaThuGiayTo = _vatState.orders.filter(o => o.vat_exported && (!o.vat_contract_received || !o.vat_handover_received)).length;

    const badgeChuaXuat = document.getElementById('vatBadgeChuaXuat');
    const badgeChuaThuGiayTo = document.getElementById('vatBadgeChuaThuGiayTo');

    if (badgeChuaXuat) badgeChuaXuat.textContent = countChuaXuat;
    if (badgeChuaThuGiayTo) badgeChuaThuGiayTo.textContent = countChuaThuGiayTo;

    // 2. Build Completed Tree dynamically
    const tree = {};
    _vatState.orders.forEach(o => {
        if (o.vat_exported && o.vat_contract_received && o.vat_handover_received) {
            const dateVal = o.vat_exported_at || o.order_date;
            if (dateVal) {
                const date = new Date(dateVal);
                const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                const year = tzDate.getFullYear();
                const month = tzDate.getMonth() + 1;
                
                if (!tree[year]) {
                    tree[year] = { count: 0, months: {} };
                }
                tree[year].count++;
                tree[year].months[month] = (tree[year].months[month] || 0) + 1;
            }
        }
    });

    // 3. Render Tree HTML
    const treeContainer = document.getElementById('vatSidebarTree');
    if (!treeContainer) return;

    const yearsSorted = Object.keys(tree).map(Number).sort((a, b) => b - a);
    if (yearsSorted.length === 0) {
        treeContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;font-weight:600;">Chưa có đơn hoàn thành</div>';
        return;
    }

    let h = '';
    yearsSorted.forEach(yr => {
        const yrData = tree[yr];
        const isOpen = !!_vatState.openYears[yr];
        
        h += `
            <div class="vat-tree-year" onclick="_vatToggleYear(${yr})">
                <span>${isOpen ? '▼' : '▶'} Năm ${yr}</span>
                <span class="vat-sb-badge" style="background:#0284c7;color:#fff;">${yrData.count}</span>
            </div>
            <div style="display:${isOpen ? 'block' : 'none'};">
        `;
        
        // List months from 12 down to 1
        for (let m = 12; m >= 1; m--) {
            const mCount = yrData.months[m] || 0;
            if (mCount > 0) {
                const isActive = _vatState.activeFilter === 'hoan_thanh' && _vatState.activeYear === yr && _vatState.activeMonth === m;
                h += `
                    <div class="vat-tree-month ${isActive ? 'active' : ''}" onclick="event.stopPropagation();_vatSelectMonth(${yr}, ${m})">
                        <span>▸ Tháng ${String(m).padStart(2, '0')}</span>
                        <span style="font-weight:700;color:${isActive ? '#0284c7' : '#64748b'};">${mCount}</span>
                    </div>
                `;
            }
        }
        h += '</div>';
    });

    treeContainer.innerHTML = h;
}

// Toggle year expand/collapse in completed tree
function _vatToggleYear(yr) {
    _vatState.openYears[yr] = !_vatState.openYears[yr];
    _vatRenderSidebar();
}

// Select main sidebar filter
function _vatSelectFilter(filterType) {
    _vatState.activeFilter = filterType;
    _vatState.activeYear = null;
    _vatState.activeMonth = null;
    _vatState.page = 1;

    // Toggle active classes on DOM
    const itemChuaXuat = document.getElementById('vatSbChuaXuat');
    const itemChuaThuGiayTo = document.getElementById('vatSbChuaThuGiayTo');

    if (itemChuaXuat) itemChuaXuat.classList.toggle('active', filterType === 'chua_xuat');
    if (itemChuaThuGiayTo) itemChuaThuGiayTo.classList.toggle('active', filterType === 'chua_thu_giay_to');

    _vatRenderSidebar(); // redraw sidebar to reset months active highlight
    _vatRenderTable();
}

// Select month inCompleted Tree
function _vatSelectMonth(yr, m) {
    _vatState.activeFilter = 'hoan_thanh';
    _vatState.activeYear = yr;
    _vatState.activeMonth = m;
    _vatState.page = 1;

    // Deactivate main filters UI
    const itemChuaXuat = document.getElementById('vatSbChuaXuat');
    const itemChuaThuGiayTo = document.getElementById('vatSbChuaThuGiayTo');
    if (itemChuaXuat) itemChuaXuat.classList.remove('active');
    if (itemChuaThuGiayTo) itemChuaThuGiayTo.classList.remove('active');

    _vatRenderSidebar();
    _vatRenderTable();
}

// Handle search input
function _vatOnSearch(val) {
    _vatState.searchQuery = String(val || '').trim().toLowerCase();
    _vatState.page = 1;

    const clearBtn = document.getElementById('vatSearchClearBtn');
    if (clearBtn) {
        clearBtn.style.display = _vatState.searchQuery ? 'block' : 'none';
    }
    _vatRenderTable();
}

function _vatClearSearch() {
    const input = document.getElementById('vatSearchInput');
    if (input) input.value = '';
    _vatOnSearch('');
}

// Render the main table and pagination controls
function _vatRenderTable() {
    const tableTitle = document.getElementById('vatTableTitle');
    const tbody = document.getElementById('vatTbody');
    const statsText = document.getElementById('vatStatsText');
    if (!tbody) return;

    // 1. Filter orders based on active sidebar tab
    let filtered = [];
    let titleStr = '';

    if (_vatState.activeFilter === 'chua_xuat') {
        filtered = _vatState.orders.filter(o => !o.vat_exported);
        titleStr = '📁 Danh Sách Chưa Xuất Hóa Đơn';
    } else if (_vatState.activeFilter === 'chua_thu_giay_to') {
        filtered = _vatState.orders.filter(o => o.vat_exported && (!o.vat_contract_received || !o.vat_handover_received));
        titleStr = '📂 Danh Sách Chưa Thu Giấy Tờ';
    } else if (_vatState.activeFilter === 'hoan_thanh') {
        filtered = _vatState.orders.filter(o => {
            if (!o.vat_exported || !o.vat_contract_received || !o.vat_handover_received) return false;
            const dateVal = o.vat_exported_at || o.order_date;
            if (!dateVal) return false;
            const date = new Date(dateVal);
            const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            return tzDate.getFullYear() === _vatState.activeYear && (tzDate.getMonth() + 1) === _vatState.activeMonth;
        });
        titleStr = `✅ Hoàn Thành VAT: Tháng ${String(_vatState.activeMonth).padStart(2, '0')}/${_vatState.activeYear}`;
    }

    if (tableTitle) tableTitle.textContent = titleStr;

    // 2. Filter by search query
    if (_vatState.searchQuery) {
        filtered = filtered.filter(o => {
            return String(o.order_code || '').toLowerCase().includes(_vatState.searchQuery) ||
                   String(o.customer_name || '').toLowerCase().includes(_vatState.searchQuery) ||
                   String(o.customer_phone || '').toLowerCase().includes(_vatState.searchQuery);
        });
    }

    if (statsText) {
        statsText.textContent = `Tổng: ${filtered.length} đơn hàng`;
    }

    // 3. Paginate
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / _vatState.pageSize) || 1;
    if (_vatState.page > totalPages) _vatState.page = totalPages;

    const startIdx = (_vatState.page - 1) * _vatState.pageSize;
    const pagedItems = filtered.slice(startIdx, startIdx + _vatState.pageSize);

    // 4. Render Table rows
    if (pagedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:#94a3b8;font-weight:600;">Không có đơn hàng nào khớp điều kiện</td></tr>`;
        const pag = document.getElementById('vatPagination');
        if (pag) pag.innerHTML = '';
        return;
    }

    let rowsHtml = '';
    pagedItems.forEach(o => {
        // Parse invoice info if present
        let invInfo = {};
        if (o.vat_invoice_info) {
            try {
                invInfo = typeof o.vat_invoice_info === 'string' ? JSON.parse(o.vat_invoice_info) : o.vat_invoice_info;
            } catch(e) {}
        }
        
        // Build tooltip content for invoice
        const hasInvInfo = !!(invInfo.company_name && invInfo.tax_code && invInfo.company_address && invInfo.company_email);
        const invTooltip = hasInvInfo 
            ? `MST: ${invInfo.tax_code || '—'} | ${invInfo.company_name || '—'}`
            : 'Chưa nhập thông tin hóa đơn';

        // Build tooltips for other statuses
        const expTooltip = o.vat_exported 
            ? `Đã xuất bởi ${o.vat_exported_by_name || '—'} lúc ${_vatFormatTime(o.vat_exported_at)}`
            : 'Chưa xuất hóa đơn';

        const contractTooltip = o.vat_contract_received
            ? `Đã nhận bởi ${o.vat_contract_received_by_name || '—'} lúc ${_vatFormatTime(o.vat_contract_received_at)}`
            : 'Chưa nhận hợp đồng';

        const handoverTooltip = o.vat_handover_received
            ? `Đã nhận bởi ${o.vat_handover_received_by_name || '—'} lúc ${_vatFormatTime(o.vat_handover_received_at)}`
            : 'Chưa nhận biên bản bàn giao';

        rowsHtml += `
            <tr style="border-bottom:1px solid #e2e8f0;align-items:center;">
                <!-- Icon 1: Invoice Info -->
                <td style="padding:10px 8px;text-align:center;">
                    <button class="vat-action-btn vat-tooltip vat-btn-invoice ${hasInvInfo ? 'has-info' : 'pending'}" data-tooltip="${invTooltip}" onclick="_vatShowInvoiceModal(${o.id})">
                        📝
                    </button>
                </td>
                <!-- Icon 2: Export Invoice -->
                <td style="padding:10px 8px;text-align:center;">
                    ${hasInvInfo ? `
                        <button class="vat-action-btn vat-tooltip vat-btn-export ${o.vat_exported ? 'done' : 'pending'}" data-tooltip="${expTooltip}" onclick="_vatShowExportModal(${o.id})">
                            🧾
                        </button>
                    ` : '<span style="color:#cbd5e1;">—</span>'}
                </td>
                <!-- Icon 3: Contract -->
                <td style="padding:10px 8px;text-align:center;">
                    <button class="vat-action-btn vat-tooltip vat-btn-contract ${o.vat_contract_received ? 'done' : 'pending'}" data-tooltip="${contractTooltip}" onclick="_vatShowContractModal(${o.id})">
                        📜
                    </button>
                </td>
                <!-- Icon 4: Handover -->
                <td style="padding:10px 8px;text-align:center;">
                    <button class="vat-action-btn vat-tooltip vat-btn-handover ${o.vat_handover_received ? 'done' : 'pending'}" data-tooltip="${handoverTooltip}" onclick="_vatShowHandoverModal(${o.id})">
                        📦
                    </button>
                </td>
                <!-- Columns -->
                <td style="padding:10px 14px;font-weight:600;color:#334155;">${o.category_name || '—'}</td>
                <td style="padding:10px 14px;text-align:right;font-weight:700;color:${o.remaining_amount > 0 ? '#ef4444' : '#10b981'};">${_vatFmt(o.remaining_amount)} đ</td>
                <td style="padding:10px 14px;font-weight:700;color:#0284c7;">${o.order_code || '—'}</td>
                <td style="padding:10px 14px;font-weight:600;color:#1e293b;">${o.customer_name || '—'}</td>
                <td style="padding:10px 14px;font-weight:600;color:#475569;">${o.customer_phone || '—'}</td>
                <td style="padding:10px 14px;color:#475569;">${o.province || '—'}</td>
                <td style="padding:10px 14px;font-weight:600;color:#0f172a;">${o.cskh_name || o.created_by_name || '—'}</td>
                <td style="padding:10px 14px;font-size:11.5px;color:#64748b;">
                    ${o.last_updated_by_name ? `<b>${o.last_updated_by_name}</b><br>` : ''}
                    ${o.last_updated_at ? _vatFormatTime(o.last_updated_at) : '—'}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    // 5. Render Pagination
    _vatRenderPagination(totalItems, totalPages);
}

// Render dynamic pagination buttons
function _vatRenderPagination(totalItems, totalPages) {
    const pag = document.getElementById('vatPagination');
    if (!pag) return;

    if (totalPages <= 1) {
        pag.innerHTML = '';
        return;
    }

    let h = '<div class="pagination-container" style="display:flex;gap:4px;align-items:center;">';
    
    // Previous Page Button
    h += `<button class="btn btn-light" style="padding:6px 12px;font-size:12px;font-weight:600;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer;" ${_vatState.page === 1 ? 'disabled' : ''} onclick="_vatSelectPage(${_vatState.page - 1})">◀</button>`;
    
    // Page indicators
    for (let p = 1; p <= totalPages; p++) {
        const isCurrent = _vatState.page === p;
        h += `<button class="btn ${isCurrent ? 'btn-primary' : 'btn-light'}" style="padding:6px 12px;font-size:12px;font-weight:${isCurrent ? '800' : '600'};border-radius:6px;border:1px solid ${isCurrent ? '#0284c7' : '#cbd5e1'};background:${isCurrent ? '#0284c7' : '#fff'};color:${isCurrent ? '#fff' : '#334155'};cursor:pointer;" onclick="_vatSelectPage(${p})">${p}</button>`;
    }
    
    // Next Page Button
    h += `<button class="btn btn-light" style="padding:6px 12px;font-size:12px;font-weight:600;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer;" ${_vatState.page === totalPages ? 'disabled' : ''} onclick="_vatSelectPage(${_vatState.page + 1})">▶</button>`;
    h += '</div>';

    pag.innerHTML = h;
}

function _vatSelectPage(p) {
    _vatState.page = p;
    _vatRenderTable();
}


// ==================== MODAL DIALOGS ====================

// 1. MODAL: Nhập Thông Tin Hóa Đơn
function _vatShowInvoiceModal(id) {
    const o = _vatState.orders.find(item => item.id === id);
    if (!o) return;

    let info = {};
    if (o.vat_invoice_info) {
        try {
            info = typeof o.vat_invoice_info === 'string' ? JSON.parse(o.vat_invoice_info) : o.vat_invoice_info;
        } catch(e) {}
    }

    const isAcc = _vatIsAccountant();
    const editable = _vatCanEdit() && !isAcc;

    function renderField(label, fieldId, val, type = 'text', required = false) {
        const reqStar = required ? `<span style="color:#ef4444;">*</span>` : '';
        if (editable) {
            if (type === 'textarea') {
                return `
                    <div class="vat-modal-field">
                        <label>${label} ${reqStar}</label>
                        <textarea id="${fieldId}" rows="2" placeholder="Nhập ${label.toLowerCase()}...">${val || ''}</textarea>
                    </div>
                `;
            } else {
                return `
                    <div class="vat-modal-field">
                        <label>${label} ${reqStar}</label>
                        <input type="${type}" id="${fieldId}" value="${val || ''}" placeholder="Nhập ${label.toLowerCase()}...">
                    </div>
                `;
            }
        } else {
            const escapedVal = String(val || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            if (type === 'textarea') {
                return `
                    <div class="vat-modal-field">
                        <label>${label} ${reqStar}</label>
                        <div style="position:relative; display:flex; align-items:center;">
                            <textarea id="${fieldId}" rows="2" readonly style="width:100%; padding: 8px 36px 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size:13px; background:#f8fafc; color:#334155; font-weight:600; font-family:inherit; resize:none;">${val || ''}</textarea>
                            <span class="vat-tooltip" data-tooltip="Copy" style="position:absolute; right:12px; top:12px; cursor:pointer; font-size:15px; user-select:none;" onclick="_vatCopyToClipboard('${escapedVal}')">📋</span>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="vat-modal-field">
                        <label>${label} ${reqStar}</label>
                        <div style="position:relative; display:flex; align-items:center;">
                            <input type="${type}" id="${fieldId}" value="${val || ''}" readonly style="width:100%; padding: 8px 36px 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size:13px; background:#f8fafc; color:#334155; font-weight:600;">
                            <span class="vat-tooltip" data-tooltip="Copy" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:15px; user-select:none;" onclick="_vatCopyToClipboard('${escapedVal}')">📋</span>
                        </div>
                    </div>
                `;
            }
        }
    }

    const bodyHTML = `
        <div class="vat-modal-content" style="padding:4px;">
            ${renderField('Tên Công Ty (Xuất Hóa Đơn)', 'vatModalCompanyName', info.company_name, 'text', true)}
            ${renderField('Mã Số Thuế (MST)', 'vatModalTaxCode', info.tax_code, 'text', true)}
            ${renderField('Địa Chỉ Công Ty', 'vatModalCompanyAddress', info.company_address, 'textarea', true)}
            ${renderField('Email Nhận Hóa Đơn', 'vatModalCompanyEmail', info.company_email, 'email', true)}
            ${renderField('Số Điện Thoại', 'vatModalCompanyPhone', info.company_phone, 'text', false)}
            ${renderField('Ghi Chú nếu nhập số lượng và giá khác', 'vatModalCompanyNote', info.company_note, 'textarea', false)}
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;border-radius:8px;font-weight:600;">Đóng</button>
        ${editable ? `<button class="btn btn-primary" onclick="_vatSaveInvoice(${id})" style="padding:10px 24px;border-radius:8px;font-weight:700;margin-left:8px;background:#0284c7;border-color:#0284c7;">Lưu Lại</button>` : ''}
    `;

    openModal(`📝 Thông Tin Hóa Đơn: Đơn ${o.order_code}`, bodyHTML, footerHTML);
}

async function _vatSaveInvoice(id) {
    const company_name = document.getElementById('vatModalCompanyName').value.trim();
    const tax_code = document.getElementById('vatModalTaxCode').value.trim();
    const company_address = document.getElementById('vatModalCompanyAddress').value.trim();
    const company_email = document.getElementById('vatModalCompanyEmail').value.trim();
    const company_phone = document.getElementById('vatModalCompanyPhone').value.trim();
    const company_note = document.getElementById('vatModalCompanyNote').value.trim();

    if (!company_name) {
        showToast('Vui lòng nhập Tên Công Ty!', 'error');
        document.getElementById('vatModalCompanyName').focus();
        return;
    }
    if (!tax_code) {
        showToast('Vui lòng nhập Mã Số Thuế (MST)!', 'error');
        document.getElementById('vatModalTaxCode').focus();
        return;
    }
    if (!company_address) {
        showToast('Vui lòng nhập Địa Chỉ Công Ty!', 'error');
        document.getElementById('vatModalCompanyAddress').focus();
        return;
    }
    if (!company_email) {
        showToast('Vui lòng nhập Email Nhận Hóa Đơn!', 'error');
        document.getElementById('vatModalCompanyEmail').focus();
        return;
    }

    const payload = {
        company_name,
        tax_code,
        company_address,
        company_email,
        company_phone,
        company_note
    };

    try {
        await apiCall(`/api/dht/orders/${id}/vat-invoice-info`, 'POST', payload);
        showToast('Đã lưu thông tin hóa đơn thành công!');
        closeModal();
        await _vatLoadData();
    } catch(e) {
        alert('Lưu thất bại: ' + e.message);
    }
}


// 2. MODAL: Xuất Hóa Đơn VAT (Image upload & toggle)
function _vatShowExportModal(id) {
    const o = _vatState.orders.find(item => item.id === id);
    if (!o) return;

    const editable = _vatCanEdit();

    const bodyHTML = `
        <div class="vat-modal-content" style="padding:4px;">
            <div style="margin-bottom:16px;padding:12px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
                <span style="font-weight:800;color:#0369a1;">Trạng Thái Xuất:</span> 
                ${o.vat_exported 
                    ? `<span style="color:#15803d;font-weight:900;">✅ ĐÃ XUẤT</span><br><span style="font-size:11.5px;color:#64748b;">Xuất bởi ${o.vat_exported_by_name || '—'} vào ${_vatFormatTime(o.vat_exported_at)}</span>` 
                    : '<span style="color:#ef4444;font-weight:900;">❌ CHƯA XUẤT</span>'}
            </div>
            
            ${editable ? `
                <div class="vat-modal-field" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                    <input type="checkbox" id="vatModalExportToggle" style="width:20px;height:20px;cursor:pointer;" ${o.vat_exported ? 'checked' : ''}>
                    <label for="vatModalExportToggle" style="margin:0;cursor:pointer;font-weight:800;color:#1e293b;">Đã Xuất Hóa Đơn VAT</label>
                </div>
            ` : ''}

            <!-- Proof Image Area -->
            <div id="vatModalExportUploadWrapper" style="display:${o.vat_exported || editable ? 'block' : 'none'};">
                <label style="font-weight:700;font-size:12.5px;color:#334155;display:block;margin-bottom:6px;">📸 Bằng Chứng / Ảnh Hóa Đơn <span style="color:#ef4444;">* (Bắt buộc khi chọn đã xuất)</span></label>
                ${editable ? `
                    <div class="vat-upload-area" tabindex="0" onclick="this.focus()" onpaste="_vatOnAreaPaste(event, ${o.id}, 'export')" style="border:2px dashed #0284c7;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#f8fafc;outline:none;transition:all 0.2s;" onfocus="this.style.borderColor='#0369a1';this.style.background='#f0f9ff';this.style.boxShadow='0 0 0 3px rgba(2, 132, 199, 0.3)';" onblur="this.style.borderColor='#0284c7';this.style.background='#f8fafc';this.style.boxShadow='none';">
                        <div style="font-size:24px;margin-bottom:6px;">📤</div>
                        <div style="font-weight:700;font-size:13px;color:#0284c7;line-height:1.4;">
                            Nhấp vào đây rồi nhấn Ctrl+V để dán ảnh nhanh<br>hoặc <span onclick="event.stopPropagation(); document.getElementById('vatModalExportFile').click()" style="text-decoration:underline;color:#0369a1;">click vào đây để chọn file</span>
                        </div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Hỗ trợ JPG, PNG, WEBP</div>
                        <input type="file" id="vatModalExportFile" style="display:none;" accept="image/*" onchange="_vatOnExportFileSelected(this, ${id})">
                    </div>
                ` : ''}
                <div id="vatModalExportPreviewWrapper" style="text-align:center;margin-top:12px;">
                    ${o.vat_proof_image 
                        ? `<a href="${o.vat_proof_image}" target="_blank"><img class="vat-upload-preview" src="${o.vat_proof_image}" alt="Bằng chứng xuất VAT"></a>` 
                        : '<div style="font-style:italic;color:#94a3b8;font-size:12px;margin:10px 0;">Chưa tải lên ảnh bằng chứng</div>'}
                </div>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;border-radius:8px;font-weight:600;">Đóng</button>
        ${editable ? `<button class="btn btn-primary" onclick="_vatConfirmModal(${o.id}, 'export')" style="padding:10px 24px;border-radius:8px;font-weight:600;background:#0284c7;border:none;color:#fff;">Xác nhận</button>` : ''}
    `;

    openModal(`🧾 Xuất Hóa Đơn VAT: Đơn ${o.order_code}`, bodyHTML, footerHTML);
}

// File selected for export proof
async function _vatOnExportFileSelected(input, id) {
    const file = input.files[0];
    if (!file) return;
    await _vatUploadProofImage(file, id, 'export');
}


// 3. MODAL: Nhận Hợp Đồng
function _vatShowContractModal(id) {
    const o = _vatState.orders.find(item => item.id === id);
    if (!o) return;

    const editable = _vatCanEdit();

    const bodyHTML = `
        <div class="vat-modal-content" style="padding:4px;">
            <div style="margin-bottom:16px;padding:12px;background:#f3e8ff;border-radius:8px;border:1px solid #d8b4fe;">
                <span style="font-weight:800;color:#6b21a8;">Hợp Đồng:</span> 
                ${o.vat_contract_received 
                    ? `<span style="color:#6d28d9;font-weight:900;">✅ ĐÃ NHẬN</span><br><span style="font-size:11.5px;color:#64748b;">Nhận bởi ${o.vat_contract_received_by_name || '—'} vào ${_vatFormatTime(o.vat_contract_received_at)}</span>` 
                    : '<span style="color:#ef4444;font-weight:900;">❌ CHƯA THU HỢP ĐỒNG</span>'}
            </div>
            
            ${editable ? `
                <div class="vat-modal-field" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                    <input type="checkbox" id="vatModalContractToggle" style="width:20px;height:20px;cursor:pointer;" ${o.vat_contract_received ? 'checked' : ''}>
                    <label for="vatModalContractToggle" style="margin:0;cursor:pointer;font-weight:800;color:#1e293b;">Đã Thu Nhận Hợp Đồng</label>
                </div>
            ` : ''}

            <!-- Contract proof image area -->
            <div id="vatModalContractUploadWrapper" style="display:${o.vat_contract_received || editable ? 'block' : 'none'};">
                <label style="font-weight:700;font-size:12.5px;color:#334155;display:block;margin-bottom:6px;">📸 Ảnh Scan/Hình Chụp Hợp Đồng <span style="color:#ef4444;">* (Bắt buộc khi chọn đã nhận)</span></label>
                ${editable ? `
                    <div class="vat-upload-area" tabindex="0" onclick="this.focus()" onpaste="_vatOnAreaPaste(event, ${o.id}, 'contract')" style="border:2px dashed #8b5cf6;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#f8fafc;outline:none;transition:all 0.2s;" onfocus="this.style.borderColor='#6d28d9';this.style.background='#faf5ff';this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.3)';" onblur="this.style.borderColor='#8b5cf6';this.style.background='#f8fafc';this.style.boxShadow='none';">
                        <div style="font-size:24px;margin-bottom:6px;">📤</div>
                        <div style="font-weight:700;font-size:13px;color:#8b5cf6;line-height:1.4;">
                            Nhấp vào đây rồi nhấn Ctrl+V để dán ảnh nhanh<br>hoặc <span onclick="event.stopPropagation(); document.getElementById('vatModalContractFile').click()" style="text-decoration:underline;color:#6d28d9;">click vào đây để chọn file</span>
                        </div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Hỗ trợ JPG, PNG, WEBP</div>
                        <input type="file" id="vatModalContractFile" style="display:none;" accept="image/*" onchange="_vatOnContractFileSelected(this, ${id})">
                    </div>
                ` : ''}
                <div id="vatModalContractPreviewWrapper" style="text-align:center;margin-top:12px;">
                    ${o.vat_contract_proof 
                        ? `<a href="${o.vat_contract_proof}" target="_blank"><img class="vat-upload-preview" src="${o.vat_contract_proof}" alt="Bằng chứng hợp đồng"></a>` 
                        : '<div style="font-style:italic;color:#94a3b8;font-size:12px;margin:10px 0;">Chưa tải lên ảnh bằng chứng</div>'}
                </div>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;border-radius:8px;font-weight:600;">Đóng</button>
        ${editable ? `<button class="btn btn-primary" onclick="_vatConfirmModal(${o.id}, 'contract')" style="padding:10px 24px;border-radius:8px;font-weight:600;background:#8b5cf6;border:none;color:#fff;">Xác nhận</button>` : ''}
    `;

    openModal(`📜 Nhận Hợp Đồng VAT: Đơn ${o.order_code}`, bodyHTML, footerHTML);
}

// Upload contract proof image
async function _vatOnContractFileSelected(input, id) {
    const file = input.files[0];
    if (!file) return;
    await _vatUploadProofImage(file, id, 'contract');
}


// 4. MODAL: Biên Bản Bàn Giao
function _vatShowHandoverModal(id) {
    const o = _vatState.orders.find(item => item.id === id);
    if (!o) return;

    const editable = _vatCanEdit();

    const bodyHTML = `
        <div class="vat-modal-content" style="padding:4px;">
            <div style="margin-bottom:16px;padding:12px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;">
                <span style="font-weight:800;color:#c2410c;">Biên Bản Bàn Giao:</span> 
                ${o.vat_handover_received 
                    ? `<span style="color:#c2410c;font-weight:900;">✅ ĐÃ NHẬN</span><br><span style="font-size:11.5px;color:#64748b;">Nhận bởi ${o.vat_handover_received_by_name || '—'} vào ${_vatFormatTime(o.vat_handover_received_at)}</span>` 
                    : '<span style="color:#ef4444;font-weight:900;">❌ CHƯA THU BIÊN BẢN BÀN GIAO</span>'}
            </div>
            
            ${editable ? `
                <div class="vat-modal-field" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                    <input type="checkbox" id="vatModalHandoverToggle" style="width:20px;height:20px;cursor:pointer;" ${o.vat_handover_received ? 'checked' : ''}>
                    <label for="vatModalHandoverToggle" style="margin:0;cursor:pointer;font-weight:800;color:#1e293b;">Đã Thu Nhận Biên Bản Bàn Giao</label>
                </div>
            ` : ''}

            <!-- Handover proof image area -->
            <div id="vatModalHandoverUploadWrapper" style="display:${o.vat_handover_received || editable ? 'block' : 'none'};">
                <label style="font-weight:700;font-size:12.5px;color:#334155;display:block;margin-bottom:6px;">📸 Ảnh Scan/Hình Chụp Biên Bản Bàn Giao <span style="color:#ef4444;">* (Bắt buộc khi chọn đã nhận)</span></label>
                ${editable ? `
                    <div class="vat-upload-area" tabindex="0" onclick="this.focus()" onpaste="_vatOnAreaPaste(event, ${o.id}, 'handover')" style="border:2px dashed #f97316;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#f8fafc;outline:none;transition:all 0.2s;" onfocus="this.style.borderColor='#ea580c';this.style.background='#fff7ed';this.style.boxShadow='0 0 0 3px rgba(249, 115, 22, 0.3)';" onblur="this.style.borderColor='#f97316';this.style.background='#f8fafc';this.style.boxShadow='none';">
                        <div style="font-size:24px;margin-bottom:6px;">📤</div>
                        <div style="font-weight:700;font-size:13px;color:#f97316;line-height:1.4;">
                            Nhấp vào đây rồi nhấn Ctrl+V để dán ảnh nhanh<br>hoặc <span onclick="event.stopPropagation(); document.getElementById('vatModalHandoverFile').click()" style="text-decoration:underline;color:#ea580c;">click vào đây để chọn file</span>
                        </div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Hỗ trợ JPG, PNG, WEBP</div>
                        <input type="file" id="vatModalHandoverFile" style="display:none;" accept="image/*" onchange="_vatOnHandoverFileSelected(this, ${id})">
                    </div>
                ` : ''}
                <div id="vatModalHandoverPreviewWrapper" style="text-align:center;margin-top:12px;">
                    ${o.vat_handover_proof 
                        ? `<a href="${o.vat_handover_proof}" target="_blank"><img class="vat-upload-preview" src="${o.vat_handover_proof}" alt="Bằng chứng BB bàn giao"></a>` 
                        : '<div style="font-style:italic;color:#94a3b8;font-size:12px;margin:10px 0;">Chưa tải lên ảnh bằng chứng</div>'}
                </div>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;border-radius:8px;font-weight:600;">Đóng</button>
        ${editable ? `<button class="btn btn-primary" onclick="_vatConfirmModal(${o.id}, 'handover')" style="padding:10px 24px;border-radius:8px;font-weight:600;background:#f97316;border:none;color:#fff;">Xác nhận</button>` : ''}
    `;

    openModal(`📦 Nhận Biên Bản Bàn Giao: Đơn ${o.order_code}`, bodyHTML, footerHTML);
}

// Upload handover proof image
async function _vatOnHandoverFileSelected(input, id) {
    const file = input.files[0];
    if (!file) return;
    await _vatUploadProofImage(file, id, 'handover');
}

// Unified confirm & save function for all three modals with mandatory image validation
async function _vatConfirmModal(id, type) {
    const o = _vatState.orders.find(item => item.id === id);
    if (!o) return;

    if (type === 'export') {
        const checked = document.getElementById('vatModalExportToggle')?.checked || false;
        if (checked && !o.vat_proof_image) {
            showToast('⚠️ Vui lòng tải lên ảnh bằng chứng xuất hóa đơn VAT!', 'error');
            return;
        }
        try {
            await apiCall(`/api/dht/orders/${id}/vat-export-toggle`, 'POST', { exported: checked });
            showToast('Lưu trạng thái xuất VAT thành công!');
            closeModal();
            await _vatLoadData();
            _vatRenderTable();
        } catch(e) {
            alert('Cập nhật thất bại: ' + e.message);
        }
    } else if (type === 'contract') {
        const checked = document.getElementById('vatModalContractToggle')?.checked || false;
        if (checked && !o.vat_contract_proof) {
            showToast('⚠️ Vui lòng tải lên ảnh bằng chứng nhận hợp đồng!', 'error');
            return;
        }
        try {
            await apiCall(`/api/dht/orders/${id}/vat-contract`, 'POST', { received: checked });
            showToast('Lưu trạng thái nhận hợp đồng thành công!');
            closeModal();
            await _vatLoadData();
            _vatRenderTable();
        } catch(e) {
            alert('Cập nhật thất bại: ' + e.message);
        }
    } else if (type === 'handover') {
        const checked = document.getElementById('vatModalHandoverToggle')?.checked || false;
        if (checked && !o.vat_handover_proof) {
            showToast('⚠️ Vui lòng tải lên ảnh bằng chứng biên bản bàn giao!', 'error');
            return;
        }
        try {
            await apiCall(`/api/dht/orders/${id}/vat-handover`, 'POST', { received: checked });
            showToast('Lưu trạng thái nhận biên bản bàn giao thành công!');
            closeModal();
            await _vatLoadData();
            _vatRenderTable();
        } catch(e) {
            alert('Cập nhật thất bại: ' + e.message);
        }
    }
}

// Paste handler specifically for focusable paste zone
async function _vatOnAreaPaste(e, orderId, modalType) {
    console.log('[VAT Paste] Area paste triggered', orderId, modalType);
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) {
        console.log('[VAT Paste] Area paste: no items');
        return;
    }
    for (let i = 0; i < items.length; i++) {
        console.log(`[VAT Paste] Area paste item ${i} type:`, items[i].type);
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (file) {
                console.log('[VAT Paste] Area paste retrieved file, starting upload...');
                await _vatUploadProofImage(file, orderId, modalType);
            }
            return;
        }
    }
}

// ==================== IMAGE RESIZING, COMPRESSION & PASTE HELPERS ====================

// Helper to resize/compress images
function _vatResizeImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 800;
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
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Convert base64 to Blob
function _vatBase64ToBlob(base64, mimeType) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
}

// Shared image uploader function with auto compression
async function _vatUploadProofImage(file, orderId, modalType) {
    let uploadUrl = '';
    let successMessage = '';
    let callback = null;
    let loadingColor = '#0284c7';
    
    if (modalType === 'export') {
        uploadUrl = `/api/dht/orders/${orderId}/export-vat`;
        successMessage = 'Đã tải ảnh hóa đơn VAT lên thành công!';
        callback = _vatShowExportModal;
        loadingColor = '#0284c7';
    } else if (modalType === 'contract') {
        uploadUrl = `/api/dht/orders/${orderId}/vat-contract`;
        successMessage = 'Đã tải ảnh hợp đồng thành công!';
        callback = _vatShowContractModal;
        loadingColor = '#8b5cf6';
    } else if (modalType === 'handover') {
        uploadUrl = `/api/dht/orders/${orderId}/vat-handover`;
        successMessage = 'Đã tải ảnh biên bản bàn giao thành công!';
        callback = _vatShowHandoverModal;
        loadingColor = '#f97316';
    }
    
    const uploadArea = document.querySelector('.vat-upload-area');
    const oldHtml = uploadArea ? uploadArea.innerHTML : '';
    if (uploadArea) {
        uploadArea.innerHTML = `<div style="font-weight:700;color:${loadingColor};padding:10px;">⏳ Đang nén ảnh & tải lên...</div>`;
    }
    
    try {
        const compressedBase64 = await _vatResizeImage(file);
        const blob = _vatBase64ToBlob(compressedBase64, 'image/jpeg');
        const fd = new FormData();
        fd.append('file', blob, 'proof_image.jpg');
        
        const res = await fetch(uploadUrl, {
            method: 'POST',
            body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload ảnh');
        
        showToast(successMessage);
        await _vatLoadData();
        if (callback) callback(orderId);
    } catch (err) {
        alert('Tải ảnh thất bại: ' + err.message);
        if (uploadArea) uploadArea.innerHTML = oldHtml;
    }
}

// Global paste handler to support Ctrl+V for proof images in active modal
function _vatSetupGlobalPasteListener() {
    if (window._vatGlobalPasteHandler) {
        document.removeEventListener('paste', window._vatGlobalPasteHandler);
    }
    
    window._vatGlobalPasteHandler = async function(e) {
        console.log('[VAT Paste] paste event triggered on document');
        const modalTitleEl = document.getElementById('modalTitle');
        if (!modalTitleEl) {
            console.log('[VAT Paste] no modalTitle element found in DOM');
            return;
        }
        
        const titleText = modalTitleEl.textContent || '';
        console.log('[VAT Paste] modal titleText:', titleText);
        
        let modalType = '';
        if (document.getElementById('vatModalExportFile')) {
            modalType = 'export';
        } else if (document.getElementById('vatModalContractFile')) {
            modalType = 'contract';
        } else if (document.getElementById('vatModalHandoverFile')) {
            modalType = 'handover';
        }
        
        console.log('[VAT Paste] detected modalType:', modalType);
        if (!modalType) {
            console.log('[VAT Paste] none of the target file input elements are present');
            return;
        }
        
        // Extract order code: find the pattern of non-whitespace characters following 'Đơn '
        const match = titleText.match(/Đơn\s+([A-Za-z0-9\-]+)/);
        const orderCode = match ? match[1].trim() : '';
        console.log('[VAT Paste] extracted orderCode:', orderCode);
        if (!orderCode) {
            console.log('[VAT Paste] could not extract orderCode from title');
            return;
        }
        
        // Verify user permission
        if (!_vatCanEdit()) {
            console.log('[VAT Paste] permission check failed (_vatCanEdit returns false)');
            showToast('Bạn không có quyền thực hiện thao tác này!', 'error');
            return;
        }
        
        const o = _vatState.orders.find(item => item.order_code === orderCode);
        if (!o) {
            console.log('[VAT Paste] order not found in state for code:', orderCode);
            return;
        }
        
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) {
            console.log('[VAT Paste] clipboard items is empty/null');
            return;
        }
        
        console.log('[VAT Paste] clipboard items count:', items.length);
        for (let i = 0; i < items.length; i++) {
            console.log(`[VAT Paste] item ${i} type:`, items[i].type);
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    console.log('[VAT Paste] successfully retrieved image file, starting upload...');
                    await _vatUploadProofImage(file, o.id, modalType);
                } else {
                    console.log('[VAT Paste] file object is null from item.getAsFile()');
                }
                return;
            }
        }
        console.log('[VAT Paste] no image items found in clipboard');
    };
    
    document.addEventListener('paste', window._vatGlobalPasteHandler);
    console.log('[VAT Paste] global paste event listener registered successfully');
}
