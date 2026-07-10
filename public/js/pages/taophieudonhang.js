// ========== TẠO PHIẾU ĐƠN HÀNG — Bộ Phận Sản Xuất & Văn Phòng ==========
var _tpd = {
    orders: [],
    filter: {
        search: '',
        year: new Date().getFullYear(),
        month: '',
        status: 'all' // 'all', 'draft', 'official'
    },
    activeOrderId: null,
    activeOrderDetails: null,
    scanner: null
};

// Main Entry Point
async function renderTaophieudonhangPage(content) {
    // Inject clean styling for page and print layout
    _tpdInjectStyles();

    // Set page skeleton
    content.innerHTML = `
        <div class="tpd-page-container">
            <!-- Header Filter Section -->
            <div class="tpd-header-card">
                <div class="tpd-header-top">
                    <div class="tpd-title-group">
                        <span class="tpd-title-icon">📝</span>
                        <div>
                            <h2 class="tpd-title-text">Tạo Phiếu Đơn Hàng</h2>
                            <p class="tpd-subtitle-text">Quản lý kỹ thuật đơn hàng, in phiếu sản xuất và cập nhật khâu sản xuất</p>
                        </div>
                    </div>
                    <div class="tpd-actions">
                        <button class="tpd-btn tpd-btn-scanner" onclick="_tpdStartQRScan()">
                            <span class="btn-icon">📷</span> Quét QR Sản Xuất
                        </button>
                    </div>
                </div>

                <div class="tpd-filter-grid">
                    <div class="tpd-search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="tpdSearchInput" placeholder="Tìm kiếm mã đơn, tên khách, số điện thoại..." value="${_tpd.filter.search}" oninput="_tpdOnSearchChange(event)">
                    </div>

                    <div class="tpd-select-group">
                        <div class="tpd-field-wrapper">
                            <label class="tpd-field-label">Năm</label>
                            <select id="tpdFilterYear" class="tpd-select" onchange="_tpdOnFilterChange('year', this.value)">
                                <option value="">Tất cả</option>
                                <option value="2025" ${_tpd.filter.year == 2025 ? 'selected' : ''}>2025</option>
                                <option value="2026" ${_tpd.filter.year == 2026 ? 'selected' : ''}>2026</option>
                                <option value="2027" ${_tpd.filter.year == 2027 ? 'selected' : ''}>2027</option>
                            </select>
                        </div>

                        <div class="tpd-field-wrapper">
                            <label class="tpd-field-label">Tháng</label>
                            <select id="tpdFilterMonth" class="tpd-select" onchange="_tpdOnFilterChange('month', this.value)">
                                <option value="">Tất cả</option>
                                ${Array.from({length: 12}, (_, i) => i + 1).map(m => `
                                    <option value="${m}" ${_tpd.filter.month == m ? 'selected' : ''}>Tháng ${m}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="tpd-field-wrapper">
                            <label class="tpd-field-label">Loại đơn</label>
                            <select id="tpdFilterStatus" class="tpd-select" onchange="_tpdOnFilterChange('status', this.value)">
                                <option value="all" ${_tpd.filter.status === 'all' ? 'selected' : ''}>Tất cả đơn</option>
                                <option value="draft" ${_tpd.filter.status === 'draft' ? 'selected' : ''}>Đơn nháp</option>
                                <option value="official" ${_tpd.filter.status === 'official' ? 'selected' : ''}>Đơn chính thức</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Content Body: Responsive list and side detail view -->
            <div class="tpd-content-split">
                <!-- Left Side: Order List -->
                <div class="tpd-list-panel">
                    <div class="tpd-panel-header">
                        <span class="panel-title-count" id="tpdOrderCount">Đang tải...</span>
                    </div>
                    <div class="tpd-order-grid" id="tpdOrderGrid">
                        <!-- Cards will render here -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side Tech Card Sliding Drawer -->
        <div class="tpd-drawer-overlay" id="tpdDrawerOverlay" onclick="_tpdCloseDrawer()"></div>
        <div class="tpd-drawer" id="tpdDrawer">
            <div class="tpd-drawer-header">
                <span class="drawer-title">Phiếu Chi Tiết Đơn Hàng</span>
                <button class="drawer-close-btn" onclick="_tpdCloseDrawer()">✕</button>
            </div>
            <div class="tpd-drawer-body" id="tpdDrawerBody">
                <div style="text-align:center; padding: 40px; color: #94a3b8;">
                    <div style="font-size:40px; margin-bottom:12px;">📄</div>
                    <p>Chọn một đơn hàng từ danh sách để xem chi tiết phiếu đơn hàng sản xuất</p>
                </div>
            </div>
        </div>
    `;

    // Load initial data
    await _tpdLoadOrders();

    // Check URL parameters for scanned ID
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id') || params.get('scan');
    if (queryId) {
        // Clear search params to keep the browser URL clean
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // Open details
        _tpdOpenOrderTechCard(queryId);
    }

    // Event delegation for deleting draft orders
    if (!_tpd.deleteListenerAttached) {
        document.addEventListener('click', function(event) {
            const btn = event.target.closest('.tpd-delete-draft-btn');
            if (btn) {
                event.stopPropagation();
                event.preventDefault();
                const orderId = btn.getAttribute('data-id');
                const orderCode = btn.getAttribute('data-code');
                _tpdDeleteDraft(orderId, orderCode);
            }
        }, true);
        _tpd.deleteListenerAttached = true;
    }
}

// === Dedicated Design Draft Full-Page Route (Phiếu Sản Xuất SPA Workspace) ===
async function renderDesignDraftPage(content) {
    _tpdInjectStyles();
    _tpdInjectWorkspaceStyles();

    // Enable full page mode and set container
    window._dhtFullPageMode = true;
    window._dhtFullPageContainer = content;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (!orderId) {
        content.innerHTML = `
            <div class="card" style="margin: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div class="card-body" style="padding: 40px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="font-weight: 700; color: #1e293b; margin-bottom: 8px;">Thiếu thông tin đơn hàng</h3>
                    <p style="color: #64748b; font-size: 14px;">Không tìm thấy ID của bản nháp cần thiết kế.</p>
                    <button class="btn btn-secondary" onclick="navigate('taophieudonhang')" style="margin-top: 16px; padding: 8px 24px; border-radius: 8px;"> Quay lại danh sách</button>
                </div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="tpd-drawer-loading" style="padding: 60px; text-align: center; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-top: 10px;">
            <div class="tpd-spinner" style="margin: 0 auto 15px;"></div>
            <p style="color: #64748b; font-weight: 500;">Đang tải chi tiết phiếu kỹ thuật đơn hàng...</p>
        </div>
    `;

    try {
        // 1. Fetch order details, user info, and options in parallel
        const [details, myInfoRes] = await Promise.all([
            apiCall(`/api/dht/orders/${orderId}/detail`),
            apiCall('/api/dht/my-info'),
            _tpdLoadSizeConfig()
        ]);

        if (!details || !details.order) throw new Error('Không lấy được chi tiết đơn hàng');
        const order = details.order;
        const items = details.items || [];
        const myInfo = myInfoRes.user || {};

        // 2. Determine permissions
        const isOwner = order.created_by === myInfo.id;
        const isAdmin = ['giam_doc', 'quan_ly'].includes(myInfo.role);
        const hasEditPermission = isOwner || isAdmin;

        // 3. Initialize workspace state
        window._tpdWorkspaceState = {
            orderId: orderId,
            order: order,
            items: items,
            payments: details.payments || [],
            surcharges: details.surcharges || [],
            activeItemIndex: 0,
            hasEditPermission: hasEditPermission,
            role: myInfo.role || '',
            // Deep copy of active item editing state
            editingItem: items.length > 0 ? _tpdCloneItemState(items[0]) : null
        };

        // Render main workspace wrapper
        _tpdRenderWorkspace(content);

    } catch(e) {
        console.error(e);
        content.innerHTML = `
            <div class="card" style="margin: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div class="card-body" style="padding: 40px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="font-weight: 700; color: #dc2626; margin-bottom: 8px;">Không thể tải thông tin</h3>
                    <p style="color: #64748b; font-size: 14px;">${e.message}</p>
                    <button class="btn btn-secondary" onclick="navigate('taophieudonhang')" style="margin-top: 16px; padding: 8px 24px; border-radius: 8px;"> Quay lại danh sách</button>
                </div>
            </div>
        `;
    }
}

// Clone order item to independent workspace editing state
function _tpdCloneItemState(item) {
    if (!item) return null;

    // Check if there is a draft in localStorage
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id') || (window._tpdWorkspaceState && window._tpdWorkspaceState.orderId) || '';
    if (orderId && item.id) {
        const draftStr = localStorage.getItem(`tpd_draft_${orderId}_${item.id}`);
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                if (draft && draft.id === item.id) {
                    return draft;
                }
            } catch(e) {}
        }
    }

    let qtyArr = [];
    try { qtyArr = typeof item.quantities === 'string' ? JSON.parse(item.quantities) : (item.quantities || []); } catch(e) {}
    if (!Array.isArray(qtyArr)) qtyArr = [];
    
    // Ensure currently configured sizes exist in quantities list for easy editor binding
    const config = _tpd.sizeTypesConfig || {
        "Size TT": ["S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"],
        "Size Nam / Nữ": ["Nam S", "Nam M", "Nam L", "Nam XL", "Nam XXL", "Nữ S", "Nữ M", "Nữ L", "Nữ XL", "Nữ XXL"]
    };
    const currentSizeType = item.size_type || Object.keys(config).filter(k => !k.startsWith('_'))[0] || 'Size TT';
    const stdSizes = config[currentSizeType] || [];
    const mergedQuantities = [];
    
    // Only import existing sizes that actually have a quantity greater than 0 or a non-empty note
    qtyArr.forEach(q => {
        if (q.size && (Number(q.qty) > 0 || (q.note && q.note.trim()))) {
            mergedQuantities.push({
                size: q.size.trim(),
                qty: Number(q.qty) || 0,
                price: Number(q.price) || Number(item.unit_price) || 0,
                note: q.note || ''
            });
        }
    });

    item.quantities = mergedQuantities;

    let printDetails = [];
    if (item.print_details) {
        try {
            printDetails = typeof item.print_details === 'string' ? JSON.parse(item.print_details) : item.print_details;
        } catch(e) { printDetails = []; }
    }
    if (!Array.isArray(printDetails)) printDetails = [];

    // Backwards-compatibility self-healing & default pre-population
    if (printDetails.length === 0) {
        printDetails.push({ position: 'Ngực', image: item.front_technique_image || '' });
        printDetails.push({ position: 'Lưng', image: item.back_technique_image || '' });
        printDetails.push({ position: 'Tay Trái', image: '' });
        printDetails.push({ position: 'Tay Phải', image: '' });
    }

    const clonedPrintDetails = printDetails.map(d => ({
        ...d,
        position: d.position || '',
        image: d.image || '',
        print_type: d.print_type || '',
        width: d.width || '',
        height: d.height || '',
        dimension: d.dimension || ''
    }));

    return {
        id: item.id,
        style_name: item.style_name || '',
        material_name: item.material_name || '',
        color_name: item.color_name || '',
        workshop_note: item.workshop_note || '',
        mockup_image: item.mockup_image || '',
        front_technique_image: item.front_technique_image || '',
        back_technique_image: item.back_technique_image || '',
        print_details: clonedPrintDetails,
        quantities: item.quantities,
        unit_price: Number(item.unit_price) || 0,
        product_name: item.product_name || '',
        pattern_name: item.pattern_name || '',
        size_type: item.size_type || 'Size TT'
    };
}

// Helper to sort size list cleanly (Nam first, Nữ second, Unisex/others last; inside each group, sort by standard size progression)
function _tpdSortSizes(sizes) {
    if (!Array.isArray(sizes)) return [];

    const sizeOrder = [
        'S', 'M', 'L', 'XL', 'XXL',
        'XXXL', '3XL', 'XXXXL', '4XL', 'XXXXXL', '5XL', 'XXXXXXL', '6XL', '7XL'
    ];

    const getSizeRank = (sz) => {
        let core = sz.replace(/^(Nam|Nữ)\s+/i, '').trim().toUpperCase();
        
        const idx = sizeOrder.indexOf(core);
        if (idx !== -1) return idx;

        const parsed = parseInt(core);
        if (!isNaN(parsed)) return 1000 + parsed;

        return 9999;
    };

    const getGroupRank = (sz) => {
        const lower = sz.toLowerCase();
        if (lower.startsWith('nam')) return 0;
        if (lower.startsWith('nữ')) return 1;
        return 2;
    };

    return [...sizes].sort((a, b) => {
        const groupA = getGroupRank(a);
        const groupB = getGroupRank(b);

        if (groupA !== groupB) {
            return groupA - groupB;
        }

        const rankA = getSizeRank(a);
        const rankB = getSizeRank(b);
        if (rankA !== rankB) {
            return rankA - rankB;
        }

        return a.localeCompare(b, 'vi', { sensitivity: 'base' });
    });
}

function _tpdGetLabelStyle(sz, isCustom) {
    const lower = sz.trim().toLowerCase();
    
    // Male / Female sizes
    if (lower.startsWith('nam')) {
        return 'background: #1e3a8a; color: #eff6ff; font-weight: 800; box-shadow: 0 1px 3px rgba(30,58,138,0.3);';
    }
    if (lower.startsWith('nữ')) {
        return 'background: #db2777; color: #fff1f2; font-weight: 800; box-shadow: 0 1px 3px rgba(219,39,119,0.3);';
    }

    // Standard unisex sizes
    const stdColors = {
        's': 'background: #047857; color: #ecfdf5; font-weight: 800;',
        'm': 'background: #0f766e; color: #f0fdfa; font-weight: 800;',
        'l': 'background: #4338ca; color: #e0e7ff; font-weight: 800;',
        'xl': 'background: #6d28d9; color: #f5f3ff; font-weight: 800;',
        'xxl': 'background: #be185d; color: #fdf2f8; font-weight: 800;',
        'xxxl': 'background: #c2410c; color: #fff7ed; font-weight: 800;',
        '3xl': 'background: #c2410c; color: #fff7ed; font-weight: 800;',
        'xxxxl': 'background: #b91c1c; color: #fef2f2; font-weight: 800;',
        '4xl': 'background: #b91c1c; color: #fef2f2; font-weight: 800;',
        'xxxxxl': 'background: #374151; color: #f9fafb; font-weight: 800;',
        '5xl': 'background: #374151; color: #f9fafb; font-weight: 800;',
        'xxxxxxl': 'background: #111827; color: #f9fafb; font-weight: 800;',
        '6xl': 'background: #111827; color: #f9fafb; font-weight: 800;'
    };

    if (stdColors[lower]) {
        return stdColors[lower] + ' box-shadow: 0 1px 2px rgba(0,0,0,0.1);';
    }

    // Child / Numeric sizes (e.g. "2", "4", "S1", "S2")
    const numericColors = {
        '1': 'background: #b45309; color: #fef3c7; font-weight: 800;',
        '2': 'background: #d97706; color: #fef3c7; font-weight: 800;',
        '3': 'background: #eab308; color: #fefde8; font-weight: 800;',
        '4': 'background: #84cc16; color: #f7fee7; font-weight: 800;',
        '6': 'background: #10b981; color: #ecfdf5; font-weight: 800;',
        '8': 'background: #06b6d4; color: #ecfeff; font-weight: 800;',
        '10': 'background: #3b82f6; color: #eff6ff; font-weight: 800;',
        '12': 'background: #6366f1; color: #e0e7ff; font-weight: 800;',
        '14': 'background: #8b5cf6; color: #f3e8ff; font-weight: 800;',
        '16': 'background: #d946ef; color: #fdf4ff; font-weight: 800;'
    };

    if (numericColors[lower]) {
        return numericColors[lower] + ' box-shadow: 0 1px 2px rgba(0,0,0,0.1);';
    }

    if (isCustom) {
        return 'background: #f97316; color: #fff7ed; font-weight: 800; box-shadow: 0 1px 2px rgba(249,115,22,0.2);';
    }
    return 'background: #475569; color: #f8fafc; font-weight: 800; box-shadow: 0 1px 2px rgba(71,85,105,0.2);';
}

// Fetch all orders/drafts from server
async function _tpdLoadOrders() {
    try {
        const grid = document.getElementById('tpdOrderGrid');
        if (grid) grid.innerHTML = '<div class="tpd-loading"><div class="tpd-spinner"></div><p>Đang tải đơn hàng...</p></div>';

        // Load dht orders
        let url = '/api/dht/orders?include_drafts=true&';
        if (_tpd.filter.year) url += `year=${_tpd.filter.year}&`;
        if (_tpd.filter.month) url += `month=${_tpd.filter.month}&`;

        const res = await apiCall(url);
        if (res && res.orders) {
            _tpd.orders = res.orders;
            _tpdRenderList();
        } else {
            throw new Error('Lỗi cấu trúc phản hồi API');
        }
    } catch (e) {
        console.error(e);
        const grid = document.getElementById('tpdOrderGrid');
        if (grid) grid.innerHTML = `<div class="tpd-error">⚠️ Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

// Filter and Render the Order Cards List
function _tpdRenderList() {
    const grid = document.getElementById('tpdOrderGrid');
    const countLabel = document.getElementById('tpdOrderCount');
    if (!grid) return;

    // Apply Client-side Filtering
    let filtered = _tpd.orders;

    // 1. Status Filter (Draft vs Official)
    if (_tpd.filter.status === 'draft') {
        filtered = filtered.filter(o => o.is_draft === true || o.is_draft === 1);
    } else if (_tpd.filter.status === 'official') {
        filtered = filtered.filter(o => o.is_draft !== true && o.is_draft !== 1);
    }

    // 2. Search Text filter
    if (_tpd.filter.search.trim()) {
        const query = _tpd.filter.search.toLowerCase().trim();
        filtered = filtered.filter(o => 
            (o.order_code && o.order_code.toLowerCase().includes(query)) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
            (o.customer_phone && o.customer_phone.includes(query))
        );
    }

    countLabel.textContent = `Tìm thấy ${filtered.length} đơn hàng`;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="tpd-empty-state">
                <div class="empty-icon">📂</div>
                <h3>Không tìm thấy đơn hàng nào</h3>
                <p>Thử đổi điều kiện tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(o => {
        const isDraft = o.is_draft === true || o.is_draft === 1;
        const badgeClass = isDraft ? 'tpd-badge-draft' : 'tpd-badge-official';
        const badgeLabel = isDraft ? 'Dự Thảo (Nháp)' : 'Chính thức';
        
        // Date formats
        const orderDate = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
        const shipDate = o.expected_ship_date ? new Date(o.expected_ship_date).toLocaleDateString('vi-VN') : '—';

        // Render card
        return `
            <div class="tpd-order-card ${isDraft ? 'card-draft' : ''} ${_tpd.activeOrderId == o.id ? 'card-active' : ''}" onclick="${isDraft ? `navigate('design-draft?id=${o.id}')` : `_tpdOpenOrderTechCard(${o.id})`}">
                <div class="card-header">
                    <span class="card-code" style="display: flex; flex-direction: column; gap: 2px;">
                        ${isDraft && o.draft_name ? `<span class="draft-name-label" style="color: #d97706; font-size: 14px; font-weight: 800;">📝 ${escapeHTML(o.draft_name)}</span>` : ''}
                        <span style="${isDraft ? 'font-size: 11px; color: #64748b; font-weight: 500;' : ''}">${escapeHTML(o.order_code || 'CHƯA CÓ MÃ')}</span>
                    </span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="tpd-badge ${badgeClass}">${badgeLabel}</span>
                        ${isDraft ? `<button class="tpd-delete-draft-btn" data-id="${o.id}" data-code="${escapeHTML(o.order_code || '')}" data-no-debounce="true" title="Xóa bản nháp" style="background:#fee2e2;border:none;color:#dc2626;cursor:pointer;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;transition:all 0.15s;outline:none;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">🗑️ Xóa</button>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-row">
                        <span class="card-label">Khách hàng:</span>
                        <span class="card-value font-highlight">${escapeHTML(o.customer_name || '—')}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Điện thoại:</span>
                        <span class="card-value">${escapeHTML(o.customer_phone || '—')}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Ngày lên đơn:</span>
                        <span class="card-value">${orderDate}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Hạn giao:</span>
                        <span class="card-value font-warning">${shipDate}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="card-cat">📂 ${escapeHTML(o.category_name || 'Đồng Phục')}</span>
                    <button class="tpd-card-btn" onclick="event.stopPropagation(); ${isDraft ? `navigate('design-draft?id=${o.id}')` : `_tpdOpenOrderTechCard(${o.id})`}">Thiết kế phiếu →</button>
                </div>
            </div>
        `;
    }).join('');
}

// Search input handler (debounce-like)
let _tpdSearchTimeout = null;
function _tpdOnSearchChange(e) {
    if (_tpdSearchTimeout) clearTimeout(_tpdSearchTimeout);
    _tpdSearchTimeout = setTimeout(() => {
        _tpd.filter.search = e.target.value;
        _tpdRenderList();
    }, 200);
}

// Filter selects handler
function _tpdOnFilterChange(key, value) {
    _tpd.filter[key] = value;
    if (key === 'year' || key === 'month') {
        _tpdLoadOrders();
    } else {
        _tpdRenderList();
    }
}

async function _tpdDeleteDraft(orderId, orderCode) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bản nháp "${orderCode || 'này'}" không?`)) {
        return;
    }
    try {
        const res = await apiCall(`/api/dht/orders/${orderId}`, 'DELETE');
        if (res && res.success) {
            showToast('Đã xóa bản nháp thành công!', 'success');
            await _tpdLoadOrders();
        } else {
            throw new Error(res.error || 'Lỗi không xác định');
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi xóa bản nháp: ' + e.message, 'error');
    }
}

// Open sliding drawer and load Technical Card details
async function _tpdOpenOrderTechCard(orderId) {
    _tpd.activeOrderId = orderId;
    _tpdRenderList(); // Refresh active card border highlights

    const drawer = document.getElementById('tpdDrawer');
    const overlay = document.getElementById('tpdDrawerOverlay');
    const body = document.getElementById('tpdDrawerBody');

    if (!drawer || !body) return;

    // Show drawer
    drawer.classList.add('drawer-open');
    if (overlay) overlay.style.display = 'block';

    body.innerHTML = `
        <div class="tpd-drawer-loading">
            <div class="tpd-spinner"></div>
            <p>Đang tải chi tiết phiếu kỹ thuật đơn hàng...</p>
        </div>
    `;

    try {
        // 1. Load details
        const details = await apiCall(`/api/dht/orders/${orderId}/detail`);
        if (!details || !details.order) throw new Error('Không lấy được chi tiết đơn hàng');

        // 2. Load production steps
        const prodRes = await apiCall(`/api/dht/orders/${orderId}/production`);
        const steps = prodRes && prodRes.steps ? prodRes.steps : [];

        _tpd.activeOrderDetails = details;
        _tpd.activeOrderDetails.steps = steps;

        _tpdRenderTechCardContent(details, steps);
    } catch(e) {
        console.error(e);
        body.innerHTML = `
            <div class="tpd-drawer-error">
                <h3>⚠️ Không thể tải thông tin</h3>
                <p>${e.message}</p>
                <button class="tpd-btn" onclick="_tpdOpenOrderTechCard(${orderId})">Thử lại</button>
            </div>
        `;
    }
}

// Close sliding drawer
function _tpdCloseDrawer() {
    const drawer = document.getElementById('tpdDrawer');
    const overlay = document.getElementById('tpdDrawerOverlay');
    if (drawer) drawer.classList.remove('drawer-open');
    if (overlay) overlay.style.display = 'none';
}

// Render the actual production job card content inside the drawer
function _tpdRenderTechCardContent(data, steps) {
    const body = (window._dhtFullPageMode && window._dhtFullPageContainer)
        ? window._dhtFullPageContainer
        : document.getElementById('tpdDrawerBody');
    if (!body) return;

    const o = data.order;
    const items = data.items || [];
    
    // Setup Dates
    const orderDate = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
    const shipDate = o.expected_ship_date ? new Date(o.expected_ship_date).toLocaleDateString('vi-VN') : '—';

    // Build unique URL for QR code scan
    const deepLink = `${window.location.origin}/taophieudonhang?id=${o.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(deepLink)}`;

    // Prepare design proof image
    const proofImage = o.standard_proof_image || o.sample_image || '';
    const isFullPage = window._dhtFullPageMode;

    // HTML Structure of Tech Card
    body.innerHTML = `
        <div class="tpd-tech-card-wrapper" style="${isFullPage ? 'padding: 24px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); margin-top: 10px;' : ''}">
            <!-- Toolbar -->
            <div class="tpd-tech-card-toolbar no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 8px;">
                    <button class="tpd-btn tpd-btn-print" onclick="_tpdPrintOrderTechCard(${o.id})">
                        🖨️ In Phiếu Đơn Hàng
                    </button>
                    <button class="tpd-btn tpd-btn-secondary" onclick="_tpdCopyScanLink('${deepLink}')">
                        🔗 Copy Link Quét
                    </button>
                    ${isFullPage ? `
                        <button class="tpd-btn" onclick="_dhtInitializeEditState(${o.id})" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 700;">
                            ✏️ Sửa Đơn Nháp
                        </button>
                    ` : ''}
                </div>
                ${isFullPage ? `
                    <button class="btn btn-secondary" onclick="closeModal()" style="font-weight: 700; padding: 8px 20px; border-radius: 8px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                        ← Quay lại danh sách
                    </button>
                ` : ''}
            </div>

            <!-- Printable Sheet Area -->
            <div class="tpd-printable-sheet" id="tpdPrintSheet">
                <!-- Header of job card -->
                <div class="sheet-header">
                    <div class="sheet-logo-group">
                        <img src="/images/logo.png" class="sheet-logo" onerror="this.style.display='none'">
                        <div class="sheet-company-info">
                            <span class="comp-brand">ĐỒNG PHỤC HV</span>
                            <span class="comp-sub">Công Ty TNHH SX & TM Quốc Tế Trương Tùng</span>
                            <span class="comp-contact">📞 0939 845 956 | LK02-21 KĐT Đô Nghĩa, Hà Đông, Hà Nội</span>
                        </div>
                    </div>
                    <div class="sheet-qr-box">
                        <img src="${qrUrl}" class="sheet-qr-img">
                        <span class="sheet-qr-desc">QUÉT MÃ TRUY XUẤT</span>
                    </div>
                </div>

                <div class="sheet-title-banner">
                    <h2 class="sheet-title-text">PHIẾU SẢN XUẤT ĐƠN HÀNG</h2>
                    <span class="sheet-order-code">
                        Mã đơn: ${escapeHTML(o.order_code || 'DRAFT')}
                        ${(o.is_draft === true || o.is_draft === 1 || o.is_draft === 'true') && o.draft_name ? ` (Bản nháp: ${escapeHTML(o.draft_name)})` : ''}
                    </span>
                </div>

                <!-- Two Column Layout: Specs & Design -->
                <div class="sheet-columns-grid">
                    <!-- Column 1: Technical Details -->
                    <div class="sheet-col-left">
                        <div class="sheet-section">
                            <div class="section-title">👤 Thông tin khách hàng & Tiến độ</div>
                            <table class="sheet-table-info">
                                <tr>
                                    <td class="info-label">Khách hàng:</td>
                                    <td class="info-value text-bold">${escapeHTML(o.customer_name || '—')}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">SĐT:</td>
                                    <td class="info-value">${escapeHTML(o.customer_phone || '—')}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Ngày lên đơn:</td>
                                    <td class="info-value">${orderDate}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Ngày giao hàng:</td>
                                    <td class="info-value text-bold color-warning">${shipDate}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Lĩnh vực/Thể loại:</td>
                                    <td class="info-value">${escapeHTML(o.category_name || 'Đồng Phục')}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Người thiết kế:</td>
                                    <td class="info-value text-bold color-primary">${escapeHTML(o.designer_name || '—')}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Products, Materials, Size Breakdowns -->
                        <div class="sheet-section">
                            <div class="section-title">📐 Chi tiết vải, kỹ thuật & Số lượng</div>
                            ${items.map((it, idx) => {
                                // Parse JSON arrays
                                let quantities = [], techniques = [], extraMats = [], matPairs = [];
                                try { quantities = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities || []); } catch(e){}
                                try { techniques = typeof it.sewing_techniques === 'string' ? JSON.parse(it.sewing_techniques) : (it.sewing_techniques || []); } catch(e){}
                                try { extraMats = typeof it.extra_materials === 'string' ? JSON.parse(it.extra_materials) : (it.extra_materials || []); } catch(e){}
                                try { matPairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e){}

                                return `
                                    <div class="item-block">
                                        <div class="item-name">
                                            #${idx + 1}: ${escapeHTML(it.product_name || 'Sản phẩm')} (SL: ${it.quantity || 0})
                                        </div>
                                        
                                        <!-- Fabrics list -->
                                        <div class="item-detail-row">
                                            <span class="detail-label">Vải & Màu sắc:</span>
                                            <div class="detail-tags">
                                                ${matPairs.length > 0 ? matPairs.map(mp => `
                                                    <span class="tag-mat">${escapeHTML(mp.material_name)} - ${escapeHTML(mp.color_name)}</span>
                                                `).join('') : `
                                                    <span class="tag-mat">${escapeHTML(it.material_name || '—')} ${it.color_name ? '- ' + escapeHTML(it.color_name) : ''}</span>
                                                `}
                                            </div>
                                        </div>

                                        <!-- Sewing techniques -->
                                        <div class="item-detail-row">
                                            <span class="detail-label">Kỹ thuật may:</span>
                                            <div class="detail-tags">
                                                <span class="tag-sew">📐 Mẫu Rập: ${escapeHTML(it.pattern_name || 'Mặc định')}</span>
                                                ${techniques.map(t => `
                                                    <span class="tag-sew">${escapeHTML(t.name)} (x${t.qty || 1})</span>
                                                `).join('')}
                                            </div>
                                        </div>

                                        <!-- Extra materials -->
                                        ${extraMats.length > 0 ? `
                                            <div class="item-detail-row">
                                                <span class="detail-label">Phụ liệu phụ:</span>
                                                <div class="detail-tags">
                                                    ${extraMats.map(em => `
                                                        <span class="tag-extra">${escapeHTML(em)}</span>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}

                                        <!-- Size breakdown quantities table -->
                                        <div class="item-size-table-wrap">
                                            <table class="item-size-table">
                                                <thead>
                                                    <tr>
                                                        <th>Số lượng tổng</th>
                                                        <th>Mã Rập mẫu</th>
                                                        <th>Chi tiết kỹ thuật thêm</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td class="text-center text-bold" style="font-size: 15px; color: #4338ca;">
                                                            ${it.quantity || 0}
                                                        </td>
                                                        <td class="text-center font-monospace">${escapeHTML(it.pattern_name || '—')}</td>
                                                        <td>
                                                            ${techniques.length > 0 ? techniques.map(t => `${escapeHTML(t.name)} (x${t.qty || 1})`).join(', ') : 'May tiêu chuẩn'}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Sale / Coordinator Note -->
                        ${o.sale_note_for_accountant ? `
                            <div class="sheet-section">
                                <div class="section-title">✍️ Ghi chú của Văn phòng (CSKH)</div>
                                <div class="sheet-note-box">
                                    ${escapeHTML(o.sale_note_for_accountant)}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Column 2: Market Mockup Image & QR Steps Tracker -->
                    <div class="sheet-col-right">
                        <!-- Design Market Image -->
                        <div class="sheet-section">
                            <div class="section-title">🎨 Thiết Kế Market Ảnh (Mẫu Phối Cảnh)</div>
                            <div class="market-img-container" id="tpdMarketContainer">
                                ${proofImage ? `
                                    <img src="${proofImage}" class="market-proof-image" onclick="_tpdViewFullImage('${proofImage}')">
                                    <div class="market-img-actions no-print">
                                        <button class="tpd-mini-btn" onclick="_tpdTriggerChangeMarket(${o.id})">Thay ảnh mới</button>
                                    </div>
                                ` : `
                                    <div class="market-paste-box" id="tpdPasteArea" onpaste="_tpdOnImagePaste(event, ${o.id})">
                                        <div class="paste-icon">📋</div>
                                        <span class="paste-title">Chưa có ảnh Market</span>
                                        <span class="paste-subtitle">Click vào đây rồi nhấn <b>Ctrl+V</b> để dán ảnh thiết kế</span>
                                        <input type="file" id="tpdMarketFileInput" style="display:none" onchange="_tpdOnImageFileSelect(event, ${o.id})">
                                        <button class="tpd-mini-btn" style="margin-top:8px" onclick="document.getElementById('tpdMarketFileInput').click()">Chọn file từ máy</button>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Production Steps Checklist Tracker -->
                        <div class="sheet-section">
                            <div class="section-title">⚙️ Khâu Sản Xuất & Xác Nhận Công Nhân</div>
                            
                            <div class="tpd-steps-timeline">
                                ${steps.length > 0 ? steps.map((s, idx) => {
                                    const isDone = s.is_completed === true || s.is_completed === 1;
                                    const timeStr = s.completed_at ? _tpdFormatVietnamTime(s.completed_at) : '';
                                    const workerName = s.completed_by_name || '';

                                    return `
                                        <div class="timeline-step ${isDone ? 'step-completed' : ''}">
                                            <div class="step-circle-badge">
                                                ${isDone ? '✓' : idx + 1}
                                            </div>
                                            <div class="step-content">
                                                <div class="step-header">
                                                    <span class="step-name">${escapeHTML(s.name)}</span>
                                                    <span class="step-badge ${isDone ? 'badge-done' : 'badge-pending'}">
                                                        ${isDone ? 'Đã xong' : 'Chờ xử lý'}
                                                    </span>
                                                </div>
                                                ${isDone ? `
                                                    <div class="step-meta">
                                                        👤 Nhân viên: <span class="meta-worker">${escapeHTML(workerName)}</span>
                                                        <br>
                                                        ⏰ Xong lúc: <span class="meta-time">${timeStr}</span>
                                                    </div>
                                                ` : ''}
                                                <div class="step-actions no-print">
                                                    <button class="tpd-step-btn ${isDone ? 'btn-undo' : 'btn-confirm'}" onclick="_tpdToggleProductionStep(${o.id}, ${s.step_id})">
                                                        ${isDone ? '↩ Hoàn tác' : '✓ Xác nhận xong'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('') : `
                                    <div style="color: #94a3b8; font-size:12px; text-align:center; padding: 10px;">
                                        Không tìm thấy khâu sản xuất nào phù hợp cho đơn này
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer signatures -->
                <div class="sheet-signatures">
                    <div class="sig-box">
                        <span class="sig-title">Người Lập Phiếu</span>
                        <span class="sig-desc">(Ký, ghi rõ họ tên)</span>
                        <div class="sig-space"></div>
                    </div>
                    <div class="sig-box">
                        <span class="sig-title">Trưởng Bộ Phận SX</span>
                        <span class="sig-desc">(Ký, ghi rõ họ tên)</span>
                        <div class="sig-space"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Copy URL link helper
function _tpdCopyScanLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showToast('Đã sao chép link quét mã QR!', 'success');
    }).catch(err => {
        showToast('Lỗi sao chép: ' + err, 'error');
    });
}

// Toggle a production step (complete/incomplete) via API
async function _tpdToggleProductionStep(orderId, stepId) {
    try {
        const res = await apiCall(`/api/dht/orders/${orderId}/production/${stepId}`, 'POST');
        if (res && res.success) {
            showToast('Cập nhật khâu sản xuất thành công!', 'success');
            
            // Re-fetch step progress for this order
            const prodRes = await apiCall(`/api/dht/orders/${orderId}/production`);
            const steps = prodRes && prodRes.steps ? prodRes.steps : [];

            if (_tpd.activeOrderDetails) {
                _tpd.activeOrderDetails.steps = steps;
                _tpdRenderTechCardContent(_tpd.activeOrderDetails, steps);
            }
        } else {
            throw new Error(res.error || 'Lỗi không xác định');
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi cập nhật khâu sản xuất: ' + e.message, 'error');
    }
}

// Handle Paste Action to upload design proof image
async function _tpdOnImagePaste(e, orderId) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            await _tpdUploadImageFile(file, orderId);
            return;
        }
    }
    showToast('Vui lòng dán định dạng HÌNH ẢNH!', 'warning');
}

// Handle traditional File Input change
async function _tpdOnImageFileSelect(e, orderId) {
    const file = e.target.files[0];
    if (file) {
        await _tpdUploadImageFile(file, orderId);
    }
}

// Perform image upload as base64 to put API
async function _tpdUploadImageFile(file, orderId) {
    const container = document.getElementById('tpdMarketContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <div class="tpd-spinner" style="margin: 0 auto 10px;"></div>
                <p style="font-size:12px; color:#64748b;">Đang tải lên ảnh market thiết kế...</p>
            </div>
        `;
    }

    const reader = new FileReader();
    reader.onload = async function(evt) {
        const base64 = evt.target.result;
        try {
            const res = await apiCall(`/api/dht/orders/${orderId}`, 'PUT', {
                standard_proof_image: base64
            });

            showToast('Đã lưu ảnh market thiết kế thành công!', 'success');
            
            // Reload card details
            _tpdReloadTechCard(orderId);
        } catch(e) {
            console.error(e);
            showToast('Lỗi lưu ảnh thiết kế: ' + e.message, 'error');
            _tpdReloadTechCard(orderId);
        }
    };
    reader.readAsDataURL(file);
}

// Reload card details on page or drawer depending on mode
async function _tpdReloadTechCard(orderId) {
    if (window._dhtFullPageMode && window._dhtFullPageContainer) {
        try {
            const details = await apiCall(`/api/dht/orders/${orderId}/detail`);
            if (!details || !details.order) throw new Error('Không lấy được chi tiết đơn hàng');

            const prodRes = await apiCall(`/api/dht/orders/${orderId}/production`);
            const steps = prodRes && prodRes.steps ? prodRes.steps : [];

            _tpd.activeOrderDetails = details;
            _tpd.activeOrderDetails.steps = steps;

            _tpdRenderTechCardContent(details, steps);
        } catch(e) {
            console.error('Reload tech card error:', e);
            showToast('Lỗi tải lại chi tiết: ' + e.message, 'error');
        }
    } else {
        _tpdOpenOrderTechCard(orderId);
    }
}

// Trigger change market image (show paste zone)
function _tpdTriggerChangeMarket(orderId) {
    const container = document.getElementById('tpdMarketContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="market-paste-box" id="tpdPasteArea" onpaste="_tpdOnImagePaste(event, ${orderId})">
            <div class="paste-icon">📋</div>
            <span class="paste-title">Đổi ảnh Market mới</span>
            <span class="paste-subtitle">Click vào đây rồi nhấn <b>Ctrl+V</b> để dán ảnh thiết kế</span>
            <input type="file" id="tpdMarketFileInput" style="display:none" onchange="_tpdOnImageFileSelect(event, ${orderId})">
            <button class="tpd-mini-btn" style="margin-top:8px" onclick="document.getElementById('tpdMarketFileInput').click()">Chọn file từ máy</button>
            <button class="tpd-mini-btn btn-cancel" style="margin-top:4px" onclick="_tpdReloadTechCard(${orderId})">Hủy</button>
        </div>
    `;
}

// Print tech card using a clean separate printer pop-up
function _tpdPrintOrderTechCard(orderId) {
    const sheetHTML = document.getElementById('tpdPrintSheet').innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>In Phiếu Sản Xuất - ${orderId}</title>
            <style>
                @page { size: A4; margin: 8mm 8mm; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                    color: #1e293b;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                }
                .no-print { display: none !important; }
                
                /* Copy exact layout rules from screen container */
                .tpd-printable-sheet {
                    width: 100%;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .sheet-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #1e293b;
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }
                
                .sheet-logo-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .sheet-logo {
                    width: 50px;
                    height: 50px;
                    object-fit: contain;
                }
                
                .sheet-company-info {
                    display: flex;
                    flex-direction: column;
                }
                
                .comp-brand {
                    font-size: 16px;
                    font-weight: 900;
                    color: #1e293b;
                    letter-spacing: 0.5px;
                }
                
                .comp-sub {
                    font-size: 9px;
                    font-weight: 700;
                    color: #475569;
                }
                
                .comp-contact {
                    font-size: 8px;
                    color: #64748b;
                }
                
                .sheet-qr-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                
                .sheet-qr-img {
                    width: 70px;
                    height: 70px;
                }
                
                .sheet-qr-desc {
                    font-size: 7px;
                    font-weight: 800;
                    color: #475569;
                    margin-top: 2px;
                }
                
                .sheet-title-banner {
                    text-align: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px;
                    margin-bottom: 12px;
                }
                
                .sheet-title-text {
                    font-size: 16px;
                    font-weight: 900;
                    color: #1e293b;
                    margin: 0;
                    letter-spacing: 1px;
                }
                
                .sheet-order-code {
                    font-size: 11px;
                    font-weight: 800;
                    color: #dc2626;
                    margin-top: 2px;
                    display: block;
                }
                
                .sheet-columns-grid {
                    display: grid;
                    grid-template-columns: 1.1fr 0.9fr;
                    gap: 14px;
                }
                
                .sheet-section {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 12px;
                    page-break-inside: avoid;
                }
                
                .section-title {
                    font-size: 10px;
                    font-weight: 900;
                    color: #1e293b;
                    text-transform: uppercase;
                    border-bottom: 1.5px solid #e2e8f0;
                    padding-bottom: 4px;
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
                }
                
                .sheet-table-info {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .sheet-table-info td {
                    padding: 4px 0;
                    font-size: 11px;
                }
                
                .info-label {
                    color: #64748b;
                    font-weight: 600;
                    width: 110px;
                }
                
                .info-value {
                    font-weight: 700;
                    color: #1e293b;
                }
                
                .text-bold { font-weight: 800; }
                .color-warning { color: #d97706; }
                .color-primary { color: #4338ca; }
                
                .item-block {
                    border-bottom: 1px dotted #cbd5e1;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }
                
                .item-block:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                    margin-bottom: 0;
                }
                
                .item-name {
                    font-size: 12px;
                    font-weight: 900;
                    color: #1e293b;
                    margin-bottom: 4px;
                }
                
                .item-detail-row {
                    display: flex;
                    margin-bottom: 4px;
                }
                
                .detail-label {
                    font-weight: 700;
                    color: #64748b;
                    width: 90px;
                    font-size: 10px;
                }
                
                .detail-tags {
                    flex: 1;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 3px;
                }
                
                .tag-mat, .tag-sew, .tag-extra {
                    font-size: 9px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                
                .tag-mat { background: #e0f2fe; color: #0369a1; }
                .tag-sew { background: #e0e7ff; color: #4338ca; }
                .tag-extra { background: #fef3c7; color: #b45309; }
                
                .item-size-table-wrap {
                    margin-top: 6px;
                }
                
                .item-size-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .item-size-table th {
                    background: #f1f5f9;
                    font-size: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 3px 6px;
                    border: 1px solid #cbd5e1;
                    text-align: left;
                }
                
                .item-size-table td {
                    padding: 4px 6px;
                    border: 1px solid #cbd5e1;
                    font-size: 10px;
                }
                
                .text-center { text-align: center; }
                
                .sheet-note-box {
                    background: #fffbeb;
                    border: 1px solid #fef3c7;
                    padding: 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    color: #b45309;
                    font-weight: 600;
                    white-space: pre-wrap;
                }
                
                .market-img-container {
                    text-align: center;
                    border: 1px dashed #cbd5e1;
                    border-radius: 8px;
                    padding: 6px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 180px;
                }
                
                .market-proof-image {
                    max-width: 100%;
                    max-height: 260px;
                    object-fit: contain;
                    border-radius: 4px;
                }
                
                /* Timeline styles */
                .tpd-steps-timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .timeline-step {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 6px;
                }
                
                .timeline-step:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }
                
                .step-circle-badge {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #cbd5e1;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 9px;
                    font-weight: 800;
                    flex-shrink: 0;
                    margin-top: 1px;
                }
                
                .step-completed .step-circle-badge {
                    background: #10b981;
                    color: #fff;
                }
                
                .step-content {
                    flex: 1;
                }
                
                .step-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .step-name {
                    font-size: 10px;
                    font-weight: 800;
                    color: #1e293b;
                }
                
                .step-badge {
                    font-size: 7px;
                    font-weight: 800;
                    padding: 1px 4px;
                    border-radius: 3px;
                }
                
                .badge-done { background: #d1fae5; color: #065f46; }
                .badge-pending { background: #f1f5f9; color: #475569; }
                
                .step-meta {
                    font-size: 8px;
                    color: #64748b;
                    margin-top: 2px;
                }
                
                .sheet-signatures {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    margin-top: 24px;
                    text-align: center;
                    page-break-inside: avoid;
                }
                
                .sig-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .sig-title {
                    font-size: 11px;
                    font-weight: 900;
                    color: #1e293b;
                }
                
                .sig-desc {
                    font-size: 8px;
                    color: #94a3b8;
                    margin-top: 2px;
                }
                
                .sig-space {
                    height: 50px;
                }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="tpd-printable-sheet">
                ${sheetHTML}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Lightbox full image viewer helper
function _tpdViewFullImage(src) {
    openModal(
        '🎨 Ảnh thiết kế Market',
        `<div style="text-align:center;"><img src="${src}" style="max-width:100%; max-height:80vh; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15)"></div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`
    );
}

// Format Time in VN time (Asia/Ho_Chi_Minh)
function _tpdFormatVietnamTime(dateStr) {
    if (!dateStr) return '';
    try {
        const dt = new Date(dateStr);
        return dt.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch(e) {
        return dateStr;
    }
}

// CAMERA SCANNING CODE
function _tpdStartQRScan() {
    if (typeof Html5Qrcode === 'undefined') {
        showToast('Đang khởi động camera, vui lòng đợi 1-2 giây...', 'info');
        return;
    }

    let modal = document.getElementById('tpdScanModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tpdScanModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:center; align-items:center; padding:16px;';
        modal.innerHTML = `
            <div style="background:white; border-radius:20px; width:100%; max-width:420px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);">
                <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                    <span style="font-weight:800; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">📷 Quét QR Sản Xuất</span>
                    <button onclick="_tpdStopQRScan()" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">❌</button>
                </div>
                <div style="padding:20px; display:flex; flex-direction:column; align-items:center;">
                    <div id="tpdQrReader" style="width:100%; min-height:280px; background:#000; border-radius:12px; overflow:hidden;"></div>
                    <div style="margin-top:16px; font-size:11px; color:#64748b; text-align:center; font-weight:600; line-height:1.5;">
                        Đặt mã QR in trên Phiếu Sản Xuất vào vùng quét của camera để truy xuất nhanh tiến độ khâu.
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    _tpd.scanner = new Html5Qrcode('tpdQrReader');

    const config = { fps: 10, qrbox: { width: 240, height: 240 } };

    _tpd.scanner.start(
        { facingMode: 'environment' },
        config,
        function(decodedText) {
            _tpdOnQRScanSuccess(decodedText);
        },
        function(err) {
            // Frame search failure, quiet
        }
    ).catch(function(err) {
        console.error(err);
        showToast('Lỗi bật camera: ' + (err.message || err), 'error');
        _tpdStopQRScan();
    });
}

function _tpdStopQRScan() {
    const modal = document.getElementById('tpdScanModal');
    if (modal) modal.style.display = 'none';

    if (_tpd.scanner) {
        _tpd.scanner.stop().then(() => {
            _tpd.scanner = null;
        }).catch(err => console.error(err));
    }
}

function _tpdOnQRScanSuccess(decodedText) {
    _tpdStopQRScan();
    console.log('[TPD Scan Success]', decodedText);
    
    let orderId = '';
    try {
        if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
            const url = new URL(decodedText);
            orderId = url.searchParams.get('id') || url.searchParams.get('scan');
        } else {
            orderId = decodedText.trim();
        }
    } catch(e) {
        orderId = decodedText.trim();
    }

    if (orderId) {
        _tpdOpenOrderTechCard(orderId);
    } else {
        showToast('Mã QR không khớp với phiếu sản xuất của hệ thống!', 'error');
    }
}

// CSS Injection
function _tpdInjectStyles() {
    if (document.getElementById('tpd-page-styles')) return;

    const style = document.createElement('style');
    style.id = 'tpd-page-styles';
    style.textContent = `
        /* Main Layout Styles */
        .tpd-page-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e293b;
        }

        /* Header Filter Panel */
        .tpd-header-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .tpd-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .tpd-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .tpd-title-icon {
            font-size: 32px;
        }

        .tpd-title-text {
            font-size: 20px;
            font-weight: 900;
            color: #1a1a2e;
            margin: 0;
        }

        .tpd-subtitle-text {
            font-size: 12px;
            color: #64748b;
            margin: 2px 0 0 0;
            font-weight: 500;
        }

        .tpd-actions {
            display: flex;
            gap: 10px;
        }

        .tpd-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: none;
            border-radius: 10px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tpd-btn-scanner {
            background: linear-gradient(135deg, #0f766e, #14b8a6);
            color: white !important;
            box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
        }
        .tpd-btn-scanner:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(15, 118, 110, 0.4);
        }

        .tpd-btn-print {
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: white !important;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        .tpd-btn-print:hover {
            transform: translateY(-1px);
        }

        .tpd-btn-secondary {
            background: #f1f5f9;
            color: #475569 !important;
            border: 1px solid #e2e8f0;
        }
        .tpd-btn-secondary:hover {
            background: #e2e8f0;
        }

        /* Filter Grid */
        .tpd-filter-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            align-items: end;
        }

        @media (max-width: 768px) {
            .tpd-filter-grid {
                grid-template-columns: 1fr;
            }
        }

        .tpd-search-box {
            position: relative;
            flex: 1;
        }

        .tpd-search-box input {
            width: 100%;
            padding: 10px 14px 10px 38px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            outline: none;
            transition: all 0.2s;
        }

        .tpd-search-box input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .tpd-search-box .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 14px;
        }

        .tpd-select-group {
            display: flex;
            gap: 12px;
        }

        .tpd-field-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .tpd-field-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .tpd-select {
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            background-color: white;
            outline: none;
            min-width: 120px;
        }

        /* Splits Panels */
        .tpd-content-split {
            display: flex;
            gap: 20px;
        }

        .tpd-list-panel {
            flex: 1;
        }

        .tpd-panel-header {
            margin-bottom: 12px;
        }

        .panel-title-count {
            font-size: 13px;
            font-weight: 700;
            color: #64748b;
        }

        /* Order Cards Grid */
        .tpd-order-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }

        .tpd-order-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01);
        }

        .tpd-order-card:hover {
            transform: translateY(-2px);
            border-color: #cbd5e1;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04);
        }

        .card-active {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }

        .card-draft {
            background: #fffbeb;
            border-color: #fde68a;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .card-code {
            font-size: 13px;
            font-weight: 900;
            color: #1e293b;
        }

        .tpd-badge {
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 6px;
        }

        .tpd-badge-draft { background: #fef3c7; color: #d97706; }
        .tpd-badge-official { background: #e0e7ff; color: #4f46e5; }

        .card-body {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 14px;
        }

        .card-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
        }

        .card-label {
            color: #64748b;
            font-weight: 500;
        }

        .card-value {
            font-weight: 700;
            color: #1e293b;
        }

        .font-highlight {
            color: #4f46e5;
        }
        .font-warning {
            color: #ea580c;
        }

        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
            margin-top: auto;
        }

        .card-cat {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
        }

        .tpd-card-btn {
            background: none;
            border: none;
            color: #6366f1;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
            padding: 2px 6px;
        }

        /* Drawer Slide-in Panel */
        .tpd-drawer-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            z-index: 1000;
        }

        .tpd-drawer {
            position: fixed;
            top: 0;
            right: -600px;
            width: 600px;
            height: 100%;
            background: white;
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
            z-index: 1001;
            transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
        }

        @media (max-width: 640px) {
            .tpd-drawer {
                width: 100%;
                right: -100%;
            }
        }

        .drawer-open {
            right: 0 !important;
        }

        .tpd-drawer-header {
            padding: 16px 20px;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
        }

        .drawer-title {
            font-size: 14px;
            font-weight: 900;
            color: #1e293b;
            text-transform: uppercase;
        }

        .drawer-close-btn {
            background: #f1f5f9;
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .drawer-close-btn:hover {
            background: #e2e8f0;
        }

        .tpd-drawer-body {
            flex: 1;
            overflow-y: auto;
            background: #f8fafc;
        }

        /* Printable Tech Card Styling */
        .tpd-tech-card-wrapper {
            padding: 20px;
        }

        .tpd-tech-card-toolbar {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }

        .tpd-printable-sheet {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
            color: #1e293b;
        }

        .sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }

        .sheet-logo-group {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .sheet-logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
        }

        .sheet-company-info {
            display: flex;
            flex-direction: column;
        }

        .comp-brand {
            font-size: 18px;
            font-weight: 900;
            color: #1e293b;
            letter-spacing: 0.5px;
        }

        .comp-sub {
            font-size: 10px;
            font-weight: 700;
            color: #475569;
        }

        .comp-contact {
            font-size: 9px;
            color: #64748b;
        }

        .sheet-qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .sheet-qr-img {
            width: 80px;
            height: 80px;
        }

        .sheet-qr-desc {
            font-size: 8px;
            font-weight: 850;
            color: #475569;
            margin-top: 3px;
        }

        .sheet-title-banner {
            text-align: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 16px;
        }

        .sheet-title-text {
            font-size: 18px;
            font-weight: 900;
            color: #1e293b;
            margin: 0;
            letter-spacing: 1px;
        }

        .sheet-order-code {
            font-size: 13px;
            font-weight: 900;
            color: #dc2626;
            margin-top: 3px;
            display: block;
        }

        .sheet-columns-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        @media (max-width: 580px) {
            .sheet-columns-grid {
                grid-template-columns: 1fr;
            }
        }

        .sheet-section {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 16px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 900;
            color: #1e293b;
            text-transform: uppercase;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
        }

        .sheet-table-info {
            width: 100%;
            border-collapse: collapse;
        }

        .sheet-table-info td {
            padding: 6px 0;
            font-size: 12px;
        }

        .info-label {
            color: #64748b;
            font-weight: 600;
            width: 120px;
        }

        .info-value {
            font-weight: 700;
            color: #1e293b;
        }

        .text-bold { font-weight: 800; }
        .color-warning { color: #d97706; }
        .color-primary { color: #4338ca; }

        .item-block {
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 12px;
            margin-bottom: 12px;
        }

        .item-block:last-child {
            border-bottom: none;
            padding-bottom: 0;
            margin-bottom: 0;
        }

        .item-name {
            font-size: 13px;
            font-weight: 950;
            color: #1e293b;
            margin-bottom: 6px;
        }

        .item-detail-row {
            display: flex;
            margin-bottom: 6px;
        }

        .detail-label {
            font-weight: 700;
            color: #64748b;
            width: 100px;
            font-size: 11px;
        }

        .detail-tags {
            flex: 1;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .tag-mat, .tag-sew, .tag-extra {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 6px;
        }

        .tag-mat { background: #e0f2fe; color: #0369a1; }
        .tag-sew { background: #e0e7ff; color: #4338ca; }
        .tag-extra { background: #fef3c7; color: #b45309; }

        .item-size-table-wrap {
            margin-top: 8px;
        }

        .item-size-table {
            width: 100%;
            border-collapse: collapse;
        }

        .item-size-table th {
            background: #f1f5f9;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 4px 8px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }

        .item-size-table td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            font-size: 11px;
        }

        .text-center { text-align: center; }

        .sheet-note-box {
            background: #fffbeb;
            border: 1px solid #fef3c7;
            padding: 10px;
            border-radius: 8px;
            font-size: 11px;
            color: #b45309;
            font-weight: 600;
            white-space: pre-wrap;
        }

        .market-img-container {
            text-align: center;
            border: 2px dashed #cbd5e1;
            border-radius: 10px;
            padding: 8px;
            background: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
            position: relative;
        }

        .market-proof-image {
            max-width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 6px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .market-proof-image:hover {
            transform: scale(1.02);
        }

        .market-img-actions {
            position: absolute;
            bottom: 8px;
            right: 8px;
        }

        .tpd-mini-btn {
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(4px);
            color: white;
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .tpd-mini-btn:hover {
            background: rgba(15, 23, 42, 0.9);
        }

        .market-paste-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 24px;
            cursor: pointer;
            width: 100%;
        }

        .paste-icon {
            font-size: 32px;
            margin-bottom: 8px;
        }

        .paste-title {
            font-size: 13px;
            font-weight: 800;
            color: #475569;
        }

        .paste-subtitle {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
        }

        /* Timeline Tracker Styles */
        .tpd-steps-timeline {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .timeline-step {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 12px;
        }

        .timeline-step:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .step-circle-badge {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #cbd5e1;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 900;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .step-completed .step-circle-badge {
            background: #10b981;
            color: #fff;
        }

        .step-content {
            flex: 1;
        }

        .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .step-name {
            font-size: 12px;
            font-weight: 900;
            color: #1e293b;
        }

        .step-badge {
            font-size: 9px;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 4px;
        }

        .badge-done { background: #d1fae5; color: #065f46; }
        .badge-pending { background: #f1f5f9; color: #475569; }

        .step-meta {
            font-size: 10px;
            color: #64748b;
            margin-top: 4px;
        }

        .meta-worker { font-weight: 700; color: #1e293b; }
        .meta-time { font-weight: 600; color: #64748b; }

        .step-actions {
            margin-top: 8px;
        }

        .tpd-step-btn {
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-confirm { background: #e0f2fe; color: #0369a1; }
        .btn-confirm:hover { background: #bae6fd; }
        
        .btn-undo { background: #fee2e2; color: #991b1b; }
        .btn-undo:hover { background: #fecaca; }

        /* Signatures Banner */
        .sheet-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
            text-align: center;
        }

        .sig-box {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .sig-title {
            font-size: 12px;
            font-weight: 900;
            color: #1e293b;
        }

        .sig-desc {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 2px;
        }

        .sig-space {
            height: 60px;
        }

        /* Generic Loading/Error States */
        .tpd-loading, .tpd-drawer-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 12px;
            font-size: 13px;
            color: #64748b;
        }

        .tpd-spinner {
            width: 28px;
            height: 28px;
            border: 3px solid #e2e8f0;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: tpdSpin 0.6s linear infinite;
        }

        @keyframes tpdSpin {
            to { transform: rotate(360deg); }
        }

        .tpd-empty-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
            background: white;
            border: 1px dashed #cbd5e1;
            border-radius: 16px;
        }

        .empty-icon {
            font-size: 40px;
            margin-bottom: 12px;
        }

        .tpd-empty-state h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
        }

        .tpd-empty-state p {
            margin: 6px 0 0 0;
            font-size: 12px;
            color: #64748b;
        }
    `;
    document.head.appendChild(style);
}

// === Dedicated Split-Panel Workspace Styles Injection ===
function _tpdInjectWorkspaceStyles() {
    if (document.getElementById('tpd-workspace-styles')) return;

    const style = document.createElement('style');
    style.id = 'tpd-workspace-styles';
    style.textContent = `
        /* Workspace Layout styling */
        .tpd-ws-wrapper {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 80px);
            font-family: 'Inter', system-ui, sans-serif;
            color: #0f172a;
            background: #f1f5f9;
            overflow: hidden;
            margin-top: -15px;
        }

        .tpd-ws-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #122546;
            color: white;
            padding: 12px 24px;
            box-shadow: 0 4px 12px rgba(18, 37, 70, 0.15);
            z-index: 10;
        }

        .tpd-ws-topbar-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .tpd-ws-logo {
            height: 36px;
            object-fit: contain;
        }

        .tpd-ws-title {
            font-size: 16px;
            font-weight: 800;
            margin: 0;
        }

        .tpd-ws-subtitle {
            font-size: 11px;
            color: #cbd5e1;
            margin: 2px 0 0 0;
        }

        .tpd-ws-topbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .tpd-ws-main {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* Workspace Panels split */
        .tpd-ws-left-panel {
            flex: 1.6;
            padding: 24px;
            overflow-y: auto;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            background: #cbd5e1;
        }

        .tpd-ws-right-panel {
            flex: 1;
            background: white;
            border-left: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .tpd-ws-editor-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }

        .tpd-ws-editor-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .tpd-ws-editor-footer {
            padding: 16px 20px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        /* Tabs styling */
        .tpd-ws-tabs {
            display: flex;
            gap: 4px;
            overflow-x: auto;
            background: #f8fafc;
            padding: 8px 16px 0;
            border-bottom: 1px solid #cbd5e1;
        }

        .tpd-ws-tab-btn {
            background: #e2e8f0;
            color: #475569;
            border: 1px solid #cbd5e1;
            border-bottom: none;
            border-radius: 6px 6px 0 0;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .tpd-ws-tab-btn:hover {
            background: #cbd5e1;
            color: #0f172a;
        }

        .tpd-ws-tab-btn.active {
            background: white;
            color: #122546;
            border-color: #cbd5e1;
            box-shadow: 0 -2px 6px rgba(18, 37, 70, 0.05);
            position: relative;
            z-index: 2;
        }

        /* Form elements */
        .tpd-ws-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .tpd-ws-form-label {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
        }

        .tpd-ws-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            outline: none;
            transition: all 0.2s;
        }

        .tpd-ws-input:focus {
            border-color: #122546;
            box-shadow: 0 0 0 3px rgba(18, 37, 70, 0.1);
        }

        .tpd-ws-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        /* Size grid */
        .tpd-ws-size-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
            gap: 8px;
        }

        .tpd-ws-size-input-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #f8fafc;
            overflow: hidden;
        }

        .tpd-ws-size-label {
            font-size: 10px;
            font-weight: 800;
            background: #ea580c;
            color: white;
            width: 100%;
            text-align: center;
            padding: 3px 0;
        }

        .tpd-ws-size-qty {
            width: 100%;
            border: none;
            background: transparent;
            text-align: center;
            padding: 6px 0;
            font-weight: 700;
            font-size: 13px;
            outline: none;
        }

        /* Paste Image Zones */
        .tpd-ws-upload-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
        }

        .tpd-ws-upload-box {
            border: 2px dashed #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
            background: #f8fafc;
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
            min-height: 120px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .tpd-ws-upload-box:hover {
            border-color: #122546;
            background: #f0fdf4;
        }

        .tpd-ws-upload-box.dragging {
            border-color: #10b981;
            background: #ecfdf5;
        }

        .tpd-ws-upload-icon {
            font-size: 20px;
            margin-bottom: 6px;
        }

        .tpd-ws-upload-text {
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
            line-height: 1.4;
        }

        .tpd-ws-upload-preview {
            max-width: 100%;
            max-height: 110px;
            object-fit: contain;
            border-radius: 6px;
            margin-top: 4px;
        }

        .tpd-ws-upload-clear {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            font-size: 9px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 5;
        }

        /* Printable Preview Card (A4 landscape scale-fit) */
        .tpd-a4-preview-card {
            width: 297mm;
            height: 210mm;
            background: white;
            border: 1px solid #cbd5e1;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            box-sizing: border-box;
            padding: 8mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            transform-origin: top center;
        }

        /* High-contrast brand elements */
        .tpd-a4-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #122546;
            padding-bottom: 6px;
            margin-bottom: 10px;
        }

        .tpd-a4-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .tpd-a4-logo {
            height: 48px;
            object-fit: contain;
        }

        .tpd-a4-brand {
            font-size: 20px;
            font-weight: 900;
            color: #122546;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .tpd-a4-brand-gold {
            color: #fad24c;
        }

        .tpd-a4-header-right {
            text-align: right;
        }

        .tpd-a4-title {
            font-size: 22px;
            font-weight: 900;
            color: #122546;
            margin: 0;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .tpd-a4-order-code {
            font-size: 14px;
            font-weight: 800;
            color: #475569;
            margin-top: 2px;
        }

        /* Metadata info grid */
        .tpd-a4-meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
        }

        .tpd-a4-meta-item {
            font-size: 12.5px;
            line-height: 1.4;
        }

        .tpd-a4-meta-label {
            font-weight: 700;
            color: #334155;
        }

        .tpd-a4-meta-val {
            font-weight: 800;
            color: #0f172a;
        }

        /* Images Layout row */
        .tpd-a4-images-row {
            display: flex;
            gap: 10px;
            height: 84mm; /* Adjusted to fit neatly on A4 */
            margin-bottom: 10px;
        }

        .tpd-a4-mockup-wrapper {
            flex: 1.65;
            border: 1.5px solid #122546;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
            position: relative;
        }

        .tpd-a4-tech-wrapper {
            flex: 1.65;
            display: flex;
            gap: 10px;
        }

        .tpd-a4-tech-box {
            flex: 1;
            border: 1.5px dashed #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
            position: relative;
        }

        .tpd-a4-img-header {
            background: #122546;
            color: white;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
            padding: 4px 0;
            text-transform: uppercase;
        }

        .tpd-a4-img-body {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 4px;
        }

        .tpd-a4-img-body img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        .tpd-a4-img-placeholder {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
            text-align: center;
            padding: 20px;
        }

        /* Size table */
        .tpd-a4-table-row {
            margin-bottom: 10px;
        }

        .tpd-a4-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
        }

        .tpd-a4-table th {
            background: #ea580c;
            color: white;
            font-weight: 800;
            border: 1px solid #ea580c;
            padding: 5px;
            text-align: center;
        }

        .tpd-a4-table td {
            border: 1px solid #cbd5e1;
            padding: 5px;
            text-align: center;
            font-weight: 700;
        }

        .tpd-a4-table-qty-val {
            color: #122546;
            font-weight: 900;
            background: #fef08a; /* Gold-highlight for quantities */
        }

        /* Bottom Row: Note & QR, Signatures */
        .tpd-a4-bottom-row {
            display: flex;
            gap: 15px;
            align-items: stretch;
        }

        .tpd-a4-note-section {
            flex: 2.2;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .tpd-a4-note-title {
            font-size: 11px;
            font-weight: 900;
            color: #122546;
            text-transform: uppercase;
        }

        .tpd-a4-note-content {
            font-size: 11px;
            font-weight: 600;
            line-height: 1.4;
            color: #334155;
            white-space: pre-line;
            flex: 1;
        }

        .tpd-a4-qr-section {
            flex: 0.8;
            border: 1.5px solid #122546;
            border-radius: 8px;
            padding: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
            text-align: center;
        }

        .tpd-a4-qr-img {
            width: 64px;
            height: 64px;
            object-fit: contain;
        }

        .tpd-a4-qr-text {
            font-size: 8px;
            font-weight: 800;
            color: #122546;
            margin-top: 3px;
            text-transform: uppercase;
        }

        .tpd-a4-sigs-section {
            flex: 2;
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            padding-bottom: 5px;
        }

        .tpd-a4-sig-box {
            text-align: center;
        }

        .tpd-a4-sig-title {
            font-size: 11px;
            font-weight: 900;
            color: #122546;
            text-transform: uppercase;
        }

        .tpd-a4-sig-space {
            height: 38px;
        }

        .tpd-a4-sig-desc {
            font-size: 8px;
            color: #64748b;
            font-weight: 600;
        }

        /* Printable styles */
        #tpdPrintAllSheetsContainer {
            display: none;
        }

        @media print {
            body * {
                visibility: hidden !important;
            }
            #tpdPrintAllSheetsContainer, #tpdPrintAllSheetsContainer * {
                visibility: visible !important;
            }
            #tpdPrintAllSheetsContainer {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }
            .tpd-print-page {
                width: 297mm !important;
                height: 210mm !important;
                box-sizing: border-box !important;
                padding: 8mm !important;
                page-break-after: always !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                margin: 0 !important;
            }
            @page {
                size: A4 landscape;
                margin: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Render the Split Panel Workspace UI
function _tpdRenderWorkspace(container) {
    const state = window._tpdWorkspaceState;
    const o = state.order;
    const items = state.items;

    // Create item tabs
    let tabButtonsHtml = '';
    items.forEach((item, idx) => {
        const activeClass = state.activeItemIndex === idx ? 'active' : '';
        tabButtonsHtml += `
            <button class="tpd-ws-tab-btn ${activeClass}" onclick="_tpdSwitchItemTab(${idx})">
                📦 Phiếu ${idx + 1}: ${item.product_name || 'Đồng phục'} (${item.quantity || 0} áo)
            </button>
        `;
    });

    // Create Main Workspace Split DOM
    container.innerHTML = `
        <div class="tpd-ws-wrapper">
            <!-- Topbar sticky -->
            <div class="tpd-ws-topbar no-print">
                <div class="tpd-ws-topbar-left">
                    <img src="/images/logo.png" class="tpd-ws-logo" onerror="this.style.display='none'">
                    <div>
                        <h1 class="tpd-ws-title">THIẾT KẾ PHIẾU SẢN XUẤT</h1>
                        <p class="tpd-ws-subtitle">Mã đơn: <strong>${o.order_code}</strong> | KH: <strong>${o.customer_name}</strong> | Sale: <strong>${o.cskh_name || 'Chưa nhận'}</strong></p>
                    </div>
                </div>
                <div class="tpd-ws-topbar-right">
                    <button class="tpd-btn" onclick="_dhtInitializeEditState(${state.orderId})" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 700;">
                        ✏️ Sửa Thông Tin Đơn (Giá/Cọc)
                    </button>
                    <button class="tpd-btn tpd-btn-print" onclick="_tpdPrintSingleSheet()">
                        🖨️ In Phiếu Này (A4)
                    </button>
                    <button class="tpd-btn tpd-btn-scanner" onclick="_tpdPrintAllSheets()">
                        🖨️ In Tất Cả (${items.length} Phiếu)
                    </button>
                    <button class="tpd-btn tpd-btn-secondary" onclick="navigate('taophieudonhang')">
                        ✕ Đóng Workspace
                    </button>
                </div>
            </div>

            <!-- Tabs row -->
            <div class="tpd-ws-tabs no-print">
                ${tabButtonsHtml}
            </div>

            <!-- Workspace Main Content split -->
            <div class="tpd-ws-main">
                <!-- Left Panel: Live Preview Card (Scaled dynamically in UI) -->
                <div class="tpd-ws-left-panel">
                    <div id="tpdWorkspacePreviewContainer"></div>
                </div>

                <!-- Right Panel: Inputs Editor form -->
                <div class="tpd-ws-right-panel no-print">
                    <div class="tpd-ws-editor-header">
                        <h2 style="font-size: 14px; font-weight: 900; color: #122546; margin: 0; text-transform: uppercase;">
                            ✏️ HIỆU CHỈNH THÔNG TIN SẢN XUẤT
                        </h2>
                        <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">
                            ${state.hasEditPermission ? 'Điền thông tin và hình ảnh kỹ thuật để cập nhật trực tiếp lên phiếu.' : '🔒 Bạn chỉ có quyền xem chi tiết phiếu này (Read-only)'}
                        </p>
                    </div>

                    <div class="tpd-ws-editor-body" id="tpdWorkspaceFormContainer">
                        <!-- Filled dynamically -->
                    </div>

                    <div class="tpd-ws-editor-footer">
                        ${state.hasEditPermission ? `
                            <button class="tpd-btn" onclick="_tpdSaveProductionSheet()" style="background: linear-gradient(135deg, #122546, #1e3a8a); color: white; padding: 10px 24px; font-size: 13px; box-shadow: 0 4px 10px rgba(18, 37, 70, 0.2);">
                                💾 Lưu Thay Đổi Phiếu
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>

        <!-- Hidden Container for Printing all sheets at once -->
        <div id="tpdPrintAllSheetsContainer"></div>
    `;

    // Initialize layout scaling and trigger preview/form rendering
    _tpdUpdateLivePreview();
    _tpdRenderFormInputs();
    _tpdSetupPasteZones();
    _tpdSetupPreviewScale();
}

// Dynamically scale A4 landscape preview to fit left panel width
function _tpdSetupPreviewScale() {
    const leftPanel = document.querySelector('.tpd-ws-left-panel');
    const previewCard = document.querySelector('.tpd-a4-preview-card');
    if (!leftPanel || !previewCard) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const containerWidth = entry.contentRect.width - 48; // padding
            const cardWidth = 1122.52; // 297mm in pixels (approx)
            const scale = containerWidth / cardWidth;
            if (scale < 1) {
                previewCard.style.transform = `scale(${scale})`;
            } else {
                previewCard.style.transform = 'scale(1)';
            }
        }
    });
    resizeObserver.observe(leftPanel);
}

// Switch Item Tab, saving current state first
function _tpdSwitchItemTab(idx) {
    const state = window._tpdWorkspaceState;
    if (state.activeItemIndex === idx) return;

    // Check if there are unsaved changes (optional prompt, or auto-save)
    state.activeItemIndex = idx;
    state.editingItem = _tpdCloneItemState(state.items[idx]);

    // Redraw workspace inside full page container
    const content = window._dhtFullPageContainer || document.getElementById('main-content');
    _tpdRenderWorkspace(content);
}

// Helper to detect if a size type should render using the split gender layout
function _tpdIsNamNuSize(sizeType) {
    if (!sizeType) return false;
    const lower = sizeType.toLowerCase();
    return lower.includes('nam / nữ') || lower.includes('nam/nữ');
}

// Predefined beautiful, high-contrast, premium color palette for different size types
const _TPD_SIZE_PALETTE = [
    { bg: '#ea580c', text: '#ffffff' }, // Orange
    { bg: '#0d9488', text: '#ffffff' }, // Teal
    { bg: '#7c3aed', text: '#ffffff' }, // Violet
    { bg: '#059669', text: '#ffffff' }, // Emerald
    { bg: '#2563eb', text: '#ffffff' }, // Royal Blue
    { bg: '#4f46e5', text: '#ffffff' }, // Indigo
    { bg: '#e11d48', text: '#ffffff' }, // Rose/Dark Pink
    { bg: '#b45309', text: '#ffffff' }, // Amber/Brown
    { bg: '#0891b2', text: '#ffffff' }, // Cyan
    { bg: '#c026d3', text: '#ffffff' }, // Magenta
    { bg: '#15803d', text: '#ffffff' }, // Forest Green
    { bg: '#881337', text: '#ffffff' }  // Wine/Plum
];

function _tpdGetSizeTheme(sizeType) {
    if (!sizeType) return { bg: '#ea580c', text: '#ffffff' };
    const name = String(sizeType).trim();
    const lower = name.toLowerCase();

    // Specific mapping for known size templates to ensure they look excellent and distinct
    const mappings = {
        'size áo thun oversize': { bg: '#ea580c', text: '#ffffff' }, // Orange
        'size sơ mi oversize': { bg: '#4f46e5', text: '#ffffff' },   // Indigo
        'size tạp dề :': { bg: '#16a34a', text: '#ffffff' },         // Green
        'size cái': { bg: '#475569', text: '#ffffff' },              // Slate
        'size chữ': { bg: '#059669', text: '#ffffff' },              // Emerald
        'size áo gió': { bg: '#0d9488', text: '#ffffff' },           // Teal
        'size túi vải bố': { bg: '#b45309', text: '#ffffff' },       // Brown
        'size áo sơ mi': { bg: '#7c3aed', text: '#ffffff' },         // Violet
        'size quần dài thể dục': { bg: '#2563eb', text: '#ffffff' },  // Royal Blue
        'size áo mầm non': { bg: '#0891b2', text: '#ffffff' },       // Cyan
        'size áo tiểu học': { bg: '#881337', text: '#ffffff' },      // Wine/Plum
        'size quần ngắn mầm non': { bg: '#c026d3', text: '#ffffff' }, // Magenta
        'size váy mầm non': { bg: '#e11d48', text: '#ffffff' },       // Rose
        'size quần ngắn tiểu học': { bg: '#0284c7', text: '#ffffff' },// Light Blue
        'size váy tiểu học': { bg: '#be123c', text: '#ffffff' },      // Dark Red
        'size quần ngắn người lớn': { bg: '#5b21b6', text: '#ffffff' },// Deep Purple
        'size váy người lớn': { bg: '#065f46', text: '#ffffff' },     // Forest Green
        'size tạp dề ngắn': { bg: '#c2410c', text: '#ffffff' },      // Burnt Orange
        'size tạp dề dài': { bg: '#4d7c0f', text: '#ffffff' },       // Olive
        'size tạp dề cách điệu': { bg: '#991b1b', text: '#ffffff' }   // Crimson
    };

    if (mappings[lower]) {
        return mappings[lower];
    }

    for (const key of Object.keys(mappings)) {
        if (lower.includes(key)) {
            return mappings[key];
        }
    }

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % _TPD_SIZE_PALETTE.length;
    return _TPD_SIZE_PALETTE[index];
}

// Generate HTML for the size table on the A4 sheet, grouping by gender if size type is 'Size Nam / Nữ'
function _tpdRenderA4SizeTable(it) {
    const filledQuantities = it.quantities || [];
    const sortedQuantities = _tpdSortSizes(filledQuantities.map(q => q.size))
        .map(sz => filledQuantities.find(q => q.size === sz))
        .filter(Boolean)
        .filter(q => Number(q.qty) > 0 || (q.note && q.note.trim()));

    const hasSizes = sortedQuantities.length > 0;
    if (!hasSizes) {
        const theme = _tpdGetSizeTheme(it.size_type);
        return `
            <table class="tpd-a4-table">
                <thead>
                    <tr>
                        <th style="background:${theme.bg}; color:${theme.text}; border-color:${theme.bg}; text-transform:uppercase;">${(it.size_type || 'Size Số áo').toUpperCase()}</th>
                        <th style="background:${theme.bg}; color:${theme.text}; border-color:${theme.bg}; width: 80px; text-align:center;">TỔNG SL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight:800; color:#122546; text-align:left; padding-left:12px; font-size:10px; line-height:1.2;">
                            <div>Số lượng ( ${(it.product_name || 'Áo').toUpperCase()} )</div>
                            ${it.pattern_name ? `<div style="font-weight:900; color:#dc2626; font-size:11px; margin-top:4px;">${escapeHTML(it.pattern_name)}</div>` : ''}
                        </td>
                        <td style="background:#fef08a; font-weight:900; font-size:13px; color:#122546;">0</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    if (_tpdIsNamNuSize(it.size_type)) {
        const namSizes = sortedQuantities.filter(q => q.size.toLowerCase().includes('nam'));
        const nuSizes = sortedQuantities.filter(q => q.size.toLowerCase().includes('nữ') || q.size.toLowerCase().includes('nu'));
        const otherSizes = sortedQuantities.filter(q => !q.size.toLowerCase().includes('nam') && !q.size.toLowerCase().includes('nữ') && !q.size.toLowerCase().includes('nu'));

        const getShortSize = (fullSize) => {
            return fullSize.replace(/^Nam\s+/i, '').replace(/^Nữ\s+/i, '').replace(/^Nu\s+/i, '');
        };

        const getNamQty = (shortSize) => {
            const match = namSizes.find(q => getShortSize(q.size) === shortSize);
            return match ? Number(match.qty || 0) : null;
        };

        const getNuQty = (shortSize) => {
            const match = nuSizes.find(q => getShortSize(q.size) === shortSize);
            return match ? Number(match.qty || 0) : null;
        };

        const getOtherQty = (shortSize) => {
            const match = otherSizes.find(q => getShortSize(q.size) === shortSize);
            return match ? Number(match.qty || 0) : null;
        };

        let html = '<div class="tpd-a4-tables-container" style="display: flex; flex-direction: column; gap: 8px;">';
        let grandTotal = 0;

        if (namSizes.length > 0) {
            const namShortSizes = [];
            namSizes.forEach(q => {
                const short = getShortSize(q.size);
                if (!namShortSizes.includes(short)) {
                    namShortSizes.push(short);
                }
            });

            let rowTotal = 0;
            let headers = '';
            let values = '';
            namShortSizes.forEach(short => {
                const qObj = namSizes.find(q => getShortSize(q.size) === short);
                headers += `<th style="background:#e0f2fe; color:#0369a1; border: 1px solid #cbd5e1; font-weight:700; text-align:center; padding: 4px;">${short}</th>`;
                if (qObj) {
                    const noteHtml = qObj.note && qObj.note.trim() ? `<div style="font-size: 11px; font-weight: 800; color: #dc2626; margin-top: 2px; text-transform: none; line-height: 1.1;">${escapeHTML(qObj.note)}</div>` : '';
                    values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#0369a1; text-align:center; padding: 4px 6px;">
                        <div>${qObj.qty || 0}</div>
                        ${noteHtml}
                    </td>`;
                    rowTotal += Number(qObj.qty || 0);
                } else {
                    values += `<td style="border: 1px solid #cbd5e1; background:#f8fafc; color:#cbd5e1; text-align:center; padding: 6px;">-</td>`;
                }
            });
            grandTotal += rowTotal;

            html += `
                <table class="tpd-a4-table" style="border-collapse: collapse; width:100%; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr>
                            <th style="background:#1e3a8a; color:#ffffff; width: 250px; font-weight:bold; border: 1px solid #cbd5e1; text-align:center;">NAM</th>
                            ${headers}
                            <th style="background:#1e3a8a; color:#ffffff; width: 80px; border: 1px solid #cbd5e1; text-align:center;">TỔNG NAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700; color:#1e3a8a; text-align:left; padding-left:12px; font-size:10px; border: 1px solid #cbd5e1; line-height:1.2;">
                                <div>Số lượng Nam (${(it.product_name || 'Áo').toUpperCase()})</div>
                                ${it.pattern_name ? `<div style="font-weight:900; color:#dc2626; font-size:11px; margin-top:4px;">${escapeHTML(it.pattern_name)}</div>` : ''}
                            </td>
                            ${values}
                            <td style="background:#fef08a; font-weight:900; color:#122546; text-align:center; border: 1px solid #cbd5e1; font-size:13px;">${rowTotal}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        if (nuSizes.length > 0) {
            const nuShortSizes = [];
            nuSizes.forEach(q => {
                const short = getShortSize(q.size);
                if (!nuShortSizes.includes(short)) {
                    nuShortSizes.push(short);
                }
            });

            let rowTotal = 0;
            let headers = '';
            let values = '';
            nuShortSizes.forEach(short => {
                const qObj = nuSizes.find(q => getShortSize(q.size) === short);
                headers += `<th style="background:#fce7f3; color:#be185d; border: 1px solid #cbd5e1; font-weight:700; text-align:center; padding: 4px;">${short}</th>`;
                if (qObj) {
                    const noteHtml = qObj.note && qObj.note.trim() ? `<div style="font-size: 11px; font-weight: 800; color: #dc2626; margin-top: 2px; text-transform: none; line-height: 1.1;">${escapeHTML(qObj.note)}</div>` : '';
                    values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#be185d; text-align:center; padding: 4px 6px;">
                        <div>${qObj.qty || 0}</div>
                        ${noteHtml}
                    </td>`;
                    rowTotal += Number(qObj.qty || 0);
                } else {
                    values += `<td style="border: 1px solid #cbd5e1; background:#f8fafc; color:#cbd5e1; text-align:center; padding: 6px;">-</td>`;
                }
            });
            grandTotal += rowTotal;

            html += `
                <table class="tpd-a4-table" style="border-collapse: collapse; width:100%; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr>
                            <th style="background:#db2777; color:#ffffff; width: 250px; font-weight:bold; border: 1px solid #cbd5e1; text-align:center;">NỮ</th>
                            ${headers}
                            <th style="background:#db2777; color:#ffffff; width: 80px; border: 1px solid #cbd5e1; text-align:center;">TỔNG NỮ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700; color:#db2777; text-align:left; padding-left:12px; font-size:10px; border: 1px solid #cbd5e1; line-height:1.2;">
                                <div>Số lượng Nữ (${(it.product_name || 'Áo').toUpperCase()})</div>
                                ${it.pattern_name ? `<div style="font-weight:900; color:#dc2626; font-size:11px; margin-top:4px;">${escapeHTML(it.pattern_name)}</div>` : ''}
                            </td>
                            ${values}
                            <td style="background:#fef08a; font-weight:900; color:#122546; text-align:center; border: 1px solid #cbd5e1; font-size:13px;">${rowTotal}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        if (otherSizes.length > 0) {
            const otherShortSizes = [];
            otherSizes.forEach(q => {
                const short = getShortSize(q.size);
                if (!otherShortSizes.includes(short)) {
                    otherShortSizes.push(short);
                }
            });

            let rowTotal = 0;
            let headers = '';
            let values = '';
            otherShortSizes.forEach(short => {
                const qObj = otherSizes.find(q => getShortSize(q.size) === short);
                headers += `<th style="background:#f1f5f9; color:#475569; border: 1px solid #cbd5e1; font-weight:700; text-align:center; padding: 4px;">${short}</th>`;
                if (qObj) {
                    const noteHtml = qObj.note && qObj.note.trim() ? `<div style="font-size: 11px; font-weight: 800; color: #dc2626; margin-top: 2px; text-transform: none; line-height: 1.1;">${escapeHTML(qObj.note)}</div>` : '';
                    values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#475569; text-align:center; padding: 4px 6px;">
                        <div>${qObj.qty || 0}</div>
                        ${noteHtml}
                    </td>`;
                    rowTotal += Number(qObj.qty || 0);
                } else {
                    values += `<td style="border: 1px solid #cbd5e1; background:#f8fafc; color:#cbd5e1; text-align:center; padding: 6px;">-</td>`;
                }
            });
            grandTotal += rowTotal;

            const theme = _tpdGetSizeTheme(it.size_type);

            html += `
                <table class="tpd-a4-table" style="border-collapse: collapse; width:100%; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr>
                            <th style="background:${theme.bg}; color:${theme.text}; width: 250px; font-weight:bold; border: 1px solid #cbd5e1; text-align:center;">KHÁC</th>
                            ${headers}
                            <th style="background:${theme.bg}; color:${theme.text}; width: 80px; border: 1px solid #cbd5e1; text-align:center;">TỔNG KHÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700; color:${theme.bg}; text-align:left; padding-left:12px; font-size:10px; border: 1px solid #cbd5e1; line-height:1.2;">
                                <div>Số lượng Khác (${(it.product_name || 'Áo').toUpperCase()})</div>
                                ${it.pattern_name ? `<div style="font-weight:900; color:#dc2626; font-size:11px; margin-top:4px;">${escapeHTML(it.pattern_name)}</div>` : ''}
                            </td>
                            ${values}
                            <td style="background:#fef08a; font-weight:900; color:#122546; text-align:center; border: 1px solid #cbd5e1; font-size:13px;">${rowTotal}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        // Add Grand Total Row at the bottom
        html += `
            <div style="text-align:right; font-weight:900; color:#122546; font-size:11px; padding: 8px 12px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px;">
                TỔNG CỘNG CẢ HAI: <span style="background:#fad24c; padding: 4px 12px; border-radius: 4px; font-size:13px; margin-left: 8px; border: 1px solid #fbbf24;">${grandTotal} ÁO</span>
            </div>
        `;

        html += '</div>';
        return html;
    } else {
        let sizeHeaders = '';
        let sizeValues = '';
        let totalQty = 0;

        sortedQuantities.forEach(q => {
            sizeHeaders += `<th>${q.size}</th>`;
            const noteHtml = q.note && q.note.trim() ? `<div style="font-size: 11px; font-weight: 800; color: #dc2626; margin-top: 2px; text-transform: none; line-height: 1.1;">${escapeHTML(q.note)}</div>` : '';
            sizeValues += `<td class="tpd-a4-table-qty-val" style="padding: 4px 5px;">
                <div>${q.qty || 0}</div>
                ${noteHtml}
            </td>`;
            totalQty += Number(q.qty || 0);
        });

        const theme = _tpdGetSizeTheme(it.size_type);

        return `
            <table class="tpd-a4-table">
                <thead>
                    <tr>
                        <th style="background:${theme.bg}; color:${theme.text}; border-color:${theme.bg}; text-transform:uppercase;">${(it.size_type || 'Size Số áo').toUpperCase()}</th>
                        ${sizeHeaders}
                        <th style="background:${theme.bg}; color:${theme.text}; border-color:${theme.bg}; width: 80px; text-align:center;">TỔNG SL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight:800; color:#122546; text-align:left; padding-left:12px; font-size:10px; line-height:1.2;">
                            <div>Số lượng ( ${(it.product_name || 'Áo').toUpperCase()} )</div>
                            ${it.pattern_name ? `<div style="font-weight:900; color:#dc2626; font-size:11px; margin-top:4px;">${escapeHTML(it.pattern_name)}</div>` : ''}
                        </td>
                        ${sizeValues}
                        <td style="background:#fef08a; font-weight:900; font-size:13px; color:#122546;">${totalQty}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }
}

// Calculate table count to adjust images row height dynamically and avoid A4 overflow
function _tpdGetImagesRowHeight(it) {
    let tableCount = 1;
    if (_tpdIsNamNuSize(it.size_type)) {
        const activeQuantities = (it.quantities || []).filter(q => Number(q.qty) > 0 || (q.note && q.note.trim()));
        if (activeQuantities.length > 0) {
            const hasNam = activeQuantities.some(q => q.size.toLowerCase().includes('nam'));
            const hasNu = activeQuantities.some(q => q.size.toLowerCase().includes('nữ') || q.size.toLowerCase().includes('nu'));
            const hasOther = activeQuantities.some(q => !q.size.toLowerCase().includes('nam') && !q.size.toLowerCase().includes('nữ') && !q.size.toLowerCase().includes('nu'));
            tableCount = [hasNam, hasNu, hasOther].filter(Boolean).length;
            if (tableCount === 0) tableCount = 1;
        }
    }
    
    if (tableCount === 2) {
        return '62mm';
    } else if (tableCount >= 3) {
        return '46mm';
    }
    return '84mm';
}

// Generate the Left landscape A4 Card Preview HTML
function _tpdUpdateLivePreview() {
    const container = document.getElementById('tpdWorkspacePreviewContainer');
    if (!container) return;

    const state = window._tpdWorkspaceState;
    const o = state.order;
    const it = state.editingItem;
    if (!it) return;

    // Dates
    const orderDate = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
    const shipDate = o.expected_ship_date ? new Date(o.expected_ship_date).toLocaleDateString('vi-VN') : '—';

    // Build department deep link QR url
    const deepLink = `${window.location.origin}/taophieudonhang?id=${o.id}&activeTab=${state.activeItemIndex}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(deepLink)}`;

    const mockupSrc = it.mockup_image || '';

    container.innerHTML = `
        <div class="tpd-a4-preview-card" id="tpdPrintSheet">
            <!-- Header Block -->
            <div class="tpd-a4-header">
                <div class="tpd-a4-header-left">
                    <img src="/images/logo.png" class="tpd-a4-logo" onerror="this.style.display='none'">
                    <span class="tpd-a4-brand">Đồng Phục <span class="tpd-a4-brand-gold">HV</span></span>
                </div>
                <div class="tpd-a4-header-right">
                    <h1 class="tpd-a4-title">PHIẾU SẢN XUẤT</h1>
                    <div class="tpd-a4-order-code">MÃ ĐƠN: ${o.order_code} | PHIẾU ${state.activeItemIndex + 1}/${state.items.length}</div>
                </div>
            </div>

            <!-- Metadata info grid -->
            <div class="tpd-a4-meta-grid">
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Khách hàng:</span> <span class="tpd-a4-meta-val">${o.customer_name || '—'}</span></div>
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Tiêu chuẩn gửi:</span> <span class="tpd-a4-meta-val" style="font-weight: 800; color: ${o.shipping_priority === 'GẤP' ? '#dc2626' : o.shipping_priority === 'GỬI' ? '#f59e0b' : '#7c3aed'};">${o.shipping_priority || 'CHUẨN'}</span></div>
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Ngày lên đơn:</span> <span class="tpd-a4-meta-val">${orderDate}</span></div>
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Ngày gửi hàng:</span> <span class="tpd-a4-meta-val" style="color: #ea580c;">${shipDate}</span></div>

                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Sản phẩm:</span> <span id="prev_product_name" class="tpd-a4-meta-val" style="color: #16a34a;">${it.product_name || '—'}</span></div>
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Thiết kế / Mẫu rập:</span> <span class="tpd-a4-meta-val">${o.designer_name || '—'} / ${it.pattern_name || '—'}</span></div>
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Chất liệu vải:</span> <span id="prev_material_name" class="tpd-a4-meta-val">${it.material_name || '—'}</span></div>
                <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Màu sắc phối:</span> <span id="prev_color_name" class="tpd-a4-meta-val">${it.color_name || '—'}</span></div>
            </div>

            <!-- Images Row -->
            <div class="tpd-a4-images-row" style="height: ${_tpdGetImagesRowHeight(it)};">
                <div class="tpd-a4-mockup-wrapper paste-target" data-zone="mockup">
                    <div class="tpd-a4-img-header">Ảnh Thiết Kế Mockup lớn (Click/Ctrl+V)</div>
                    <div class="tpd-a4-img-body" id="prev_mockup_container">
                        ${mockupSrc ? `<img src="${mockupSrc}">` : `<div class="tpd-a4-img-placeholder">Chưa có ảnh Mockup<br><span style="font-size:10px; color:#cbd5e1;">Bấm vào đây hoặc vùng bên phải rồi Ctrl+V để dán</span></div>`}
                    </div>
                </div>
                ${_tpdGetTechWrapperHtml(it, false)}
            </div>

            <!-- Size breakdown table -->
            <div class="tpd-a4-table-row">
                ${_tpdRenderA4SizeTable(it)}
            </div>

            <!-- Bottom Row (Note, QR and Signatures) -->
            <div class="tpd-a4-bottom-row">
                <!-- Notes -->
                <div class="tpd-a4-note-section">
                    <span class="tpd-a4-note-title">📝 Ghi chú Kỹ thuật may của Xưởng:</span>
                    <div id="prev_workshop_note" class="tpd-a4-note-content">${it.workshop_note || 'Chưa có ghi chú kỹ thuật xưởng.'}</div>
                </div>

                <!-- QR Link -->
                <div class="tpd-a4-qr-section">
                    <img src="${qrUrl}" class="tpd-a4-qr-img">
                    <span class="tpd-a4-qr-text">Quét mã tiến độ</span>
                </div>

                <!-- Signatures -->
                <div class="tpd-a4-sigs-section">
                    <div class="tpd-a4-sig-box">
                        <span class="tpd-a4-sig-title">Người Lập Phiếu</span>
                        <div class="tpd-a4-sig-space"></div>
                        <span class="tpd-a4-sig-desc">${o.cskh_name || 'Kinh Doanh'}</span>
                    </div>
                    <div class="tpd-a4-sig-box">
                        <span class="tpd-a4-sig-title">Quản Lý Xưởng</span>
                        <div class="tpd-a4-sig-space"></div>
                        <span class="tpd-a4-sig-desc">Ký xác nhận</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate the Right inputs form editor UI
function _tpdRenderFormInputs() {
    const container = document.getElementById('tpdWorkspaceFormContainer');
    if (!container) return;

    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    const disabledAttr = state.hasEditPermission ? '' : 'disabled';

    // 1. Text Fields
    let html = `
        <div class="tpd-ws-form-group">
            <label class="tpd-ws-form-label">Sản phẩm</label>
            <input type="text" class="tpd-ws-input" value="${it.product_name || ''}" placeholder="Tên sản phẩm..." disabled style="background:#f1f5f9; color:#94a3b8; cursor:not-allowed; border-color:#e2e8f0;">
        </div>

        <div class="tpd-ws-grid-2">
            <div class="tpd-ws-form-group">
                <label class="tpd-ws-form-label">Chất liệu vải</label>
                <input type="text" class="tpd-ws-input" value="${it.material_name || ''}" placeholder="Cá sấu, thun cotton..." disabled style="background:#f1f5f9; color:#94a3b8; cursor:not-allowed; border-color:#e2e8f0;">
            </div>
            <div class="tpd-ws-form-group">
                <label class="tpd-ws-form-label">Màu sắc phối</label>
                <input type="text" class="tpd-ws-input" value="${it.color_name || ''}" placeholder="Navy phối vàng, đen..." disabled style="background:#f1f5f9; color:#94a3b8; cursor:not-allowed; border-color:#e2e8f0;">
            </div>
        </div>
    `;

    // 2. Size Breakdown Grid
    const currentSizeType = it.size_type || 'Size TT';
    const config = _tpd.sizeTypesConfig || {
        "Size TT": ["S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"],
        "Size Nam / Nữ": ["Nam S", "Nam M", "Nam L", "Nam XL", "Nam XXL", "Nữ S", "Nữ M", "Nữ L", "Nữ XL", "Nữ XXL"]
    };
    const configuredSizes = config[currentSizeType] || [];

    // Auto-clean up legacy sizes that have 0 or empty quantity and are not in config
    if (it.quantities && Array.isArray(it.quantities)) {
        it.quantities = it.quantities.filter(q => {
            const isConfigured = configuredSizes.includes(q.size);
            const hasQty = q.qty && Number(q.qty) > 0;
            const hasNote = q.note && q.note.trim().length > 0;
            return isConfigured || hasQty || hasNote;
        });
    }

    const ncList = (config._nc_config && config._nc_config[currentSizeType]) || [];

    let sizeGridHtml = '';
    if (it.quantities.length === 0) {
        sizeGridHtml = `<div style="grid-column:1/-1; text-align:center; padding:12px; color:#94a3b8; font-size:12px;">Chưa chọn size nào để hiển thị. Hãy tích chọn size ở trên.</div>`;
    } else {
        const sortedQuantities = _tpdSortSizes(it.quantities.map(q => q.size))
            .map(sz => it.quantities.find(q => q.size === sz))
            .filter(Boolean);

        if (_tpdIsNamNuSize(currentSizeType)) {
            const namQty = [];
            const nuQty = [];
            const khacQty = [];

            sortedQuantities.forEach(q => {
                const lower = q.size.toLowerCase();
                if (lower.startsWith('nam')) {
                    namQty.push(q);
                } else if (lower.startsWith('nữ')) {
                    nuQty.push(q);
                } else {
                    khacQty.push(q);
                }
            });

            sizeGridHtml = `
                <div style="display:flex; flex-direction:column; gap:12px; width:100%;">
                    <!-- Nam row -->
                    <div style="display:flex; align-items:flex-start; gap:10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                        <span style="background:#1e3a8a; color:white; font-weight:800; font-size:11px; padding:4px 10px; border-radius:4px; min-width:60px; text-align:center; text-transform:uppercase; margin-top: 4px; box-shadow: 0 2px 4px rgba(30,58,138,0.2);">Nam</span>
                        <div style="display:flex; flex-wrap:wrap; gap:8px; flex:1;">
                            ${namQty.length === 0 ? '<span style="font-size:11px; color:#94a3b8; padding-top:4px;">Chưa chọn size Nam</span>' : namQty.map(q => {
                                const isCustom = !configuredSizes.includes(q.size);
                                const isNC = ncList.includes(q.size);
                                const labelBg = _tpdGetLabelStyle(q.size, isCustom);
                                if (isNC) {
                                    return `
                                        <div class="tpd-ws-size-input-box" style="width:140px; flex-shrink:0;">
                                            <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                                            <div style="display:flex; flex-direction:column; width:100%; box-sizing:border-box; padding:4px;">
                                                <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr} style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 0; margin-bottom:4px; font-weight:700; text-align:center; width:100%; background:white;">
                                                <input type="text" class="tpd-ws-size-note" value="${q.note || ''}" placeholder="Ghi chú..." onchange="_tpdUpdateSizeNote('${q.size}', this.value)" onkeyup="_tpdUpdateSizeNote('${q.size}', this.value)" ${disabledAttr} style="font-size:10px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; outline:none; width:100%; box-sizing:border-box; background:white;">
                                            </div>
                                        </div>
                                    `;
                                }
                                return `
                                    <div class="tpd-ws-size-input-box" style="width:70px; flex-shrink:0;">
                                        <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                                        <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr}>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Nữ row -->
                    <div style="display:flex; align-items:flex-start; gap:10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                        <span style="background:#db2777; color:white; font-weight:800; font-size:11px; padding:4px 10px; border-radius:4px; min-width:60px; text-align:center; text-transform:uppercase; margin-top: 4px; box-shadow: 0 2px 4px rgba(219,39,119,0.2);">Nữ</span>
                        <div style="display:flex; flex-wrap:wrap; gap:8px; flex:1;">
                            ${nuQty.length === 0 ? '<span style="font-size:11px; color:#94a3b8; padding-top:4px;">Chưa chọn size Nữ</span>' : nuQty.map(q => {
                                const isCustom = !configuredSizes.includes(q.size);
                                const isNC = ncList.includes(q.size);
                                const labelBg = _tpdGetLabelStyle(q.size, isCustom);
                                if (isNC) {
                                    return `
                                        <div class="tpd-ws-size-input-box" style="width:140px; flex-shrink:0;">
                                            <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                                            <div style="display:flex; flex-direction:column; width:100%; box-sizing:border-box; padding:4px;">
                                                <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr} style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 0; margin-bottom:4px; font-weight:700; text-align:center; width:100%; background:white;">
                                                <input type="text" class="tpd-ws-size-note" value="${q.note || ''}" placeholder="Ghi chú..." onchange="_tpdUpdateSizeNote('${q.size}', this.value)" onkeyup="_tpdUpdateSizeNote('${q.size}', this.value)" ${disabledAttr} style="font-size:10px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; outline:none; width:100%; box-sizing:border-box; background:white;">
                                            </div>
                                        </div>
                                    `;
                                }
                                return `
                                    <div class="tpd-ws-size-input-box" style="width:70px; flex-shrink:0;">
                                        <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                                        <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr}>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Khác row -->
                    ${khacQty.length > 0 ? `
                    <div style="display:flex; align-items:flex-start; gap:10px; padding-bottom: 4px;">
                        <span style="background:#ea580c; color:white; font-weight:800; font-size:11px; padding:4px 10px; border-radius:4px; min-width:60px; text-align:center; text-transform:uppercase; margin-top: 4px; box-shadow: 0 2px 4px rgba(234,88,12,0.2);">Khác</span>
                        <div style="display:flex; flex-wrap:wrap; gap:8px; flex:1;">
                            ${khacQty.map(q => {
                                const isCustom = !configuredSizes.includes(q.size);
                                const isNC = ncList.includes(q.size);
                                const labelBg = _tpdGetLabelStyle(q.size, isCustom);
                                if (isNC) {
                                    return `
                                        <div class="tpd-ws-size-input-box" style="width:140px; flex-shrink:0;">
                                            <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                                            <div style="display:flex; flex-direction:column; width:100%; box-sizing:border-box; padding:4px;">
                                                <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr} style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 0; margin-bottom:4px; font-weight:700; text-align:center; width:100%; background:white;">
                                                <input type="text" class="tpd-ws-size-note" value="${q.note || ''}" placeholder="Ghi chú..." onchange="_tpdUpdateSizeNote('${q.size}', this.value)" onkeyup="_tpdUpdateSizeNote('${q.size}', this.value)" ${disabledAttr} style="font-size:10px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; outline:none; width:100%; box-sizing:border-box; background:white;">
                                            </div>
                                        </div>
                                    `;
                                }
                                return `
                                    <div class="tpd-ws-size-input-box" style="width:70px; flex-shrink:0;">
                                        <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                                        <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr}>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            sizeGridHtml = sortedQuantities.map(q => {
                const isCustom = !configuredSizes.includes(q.size);
                const isNC = ncList.includes(q.size);
                const labelBg = _tpdGetLabelStyle(q.size, isCustom);
                if (isNC) {
                    return `
                        <div class="tpd-ws-size-input-box" style="grid-column: span 2; min-width: 140px;">
                            <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                            <div style="display:flex; flex-direction:column; width:100%; box-sizing:border-box; padding:4px;">
                                <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr} style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 0; margin-bottom:4px; font-weight:700; text-align:center; width:100%; background:white;">
                                <input type="text" class="tpd-ws-size-note" value="${q.note || ''}" placeholder="Ghi chú..." onchange="_tpdUpdateSizeNote('${q.size}', this.value)" onkeyup="_tpdUpdateSizeNote('${q.size}', this.value)" ${disabledAttr} style="font-size:10px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; outline:none; width:100%; box-sizing:border-box; background:white;">
                            </div>
                        </div>
                    `;
                }
                return `
                    <div class="tpd-ws-size-input-box">
                        <span class="tpd-ws-size-label" style="${labelBg}">${q.size}</span>
                        <input type="number" class="tpd-ws-size-qty" value="${q.qty || ''}" min="0" placeholder="0" onchange="_tpdUpdateQty('${q.size}', this.value)" onkeyup="_tpdUpdateQty('${q.size}', this.value)" ${disabledAttr}>
                    </div>
                `;
            }).join('');
        }
    }

    html += `
        <div class="tpd-ws-form-group" style="margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <label class="tpd-ws-form-label" style="margin-bottom:0;">Loại Size</label>
                <div style="display:flex; gap: 8px; align-items:center;">
                    <select class="tpd-ws-select" style="padding: 4px 8px; font-size:12px; height:auto; width:150px; border-radius:4px; border:1px solid #cbd5e1;" onchange="_tpdChangeSizeType(this.value)" ${disabledAttr}>
                        ${Object.keys(config).filter(k => !k.startsWith('_')).map(typeName => `
                            <option value="${typeName}" ${currentSizeType === typeName ? 'selected' : ''}>${typeName}</option>
                        `).join('')}
                    </select>
                    ${state.role === 'giam_doc' ? `
                        <button type="button" class="btn" onclick="_tpdOpenSizeConfigModal()" style="padding: 4px 8px; font-size:11px; border-radius:4px; font-weight:700; background:#f59e0b; border:none; color:white; cursor:pointer;">⚙️ Cài đặt</button>
                    ` : ''}
                </div>
            </div>

            <!-- Active size selector (Checkboxes) -->
            <div class="tpd-ws-size-selector-panel" style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:8px; margin-bottom:12px;">
                <div style="font-size:11px; font-weight:600; color:#64748b; margin-bottom:6px;">Chọn các size hiển thị:</div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${_tpdSortSizes(configuredSizes).map(sz => {
                        const isActive = it.quantities.some(q => q.size === sz);
                        return `
                            <label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; cursor:pointer; font-weight:500; margin:0;">
                                <input type="checkbox" style="cursor:pointer; margin:0;" ${isActive ? 'checked' : ''} onchange="_tpdToggleSizeActive('${sz}', this.checked)" ${disabledAttr}>
                                <span>${sz}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <label class="tpd-ws-form-label" style="margin-bottom:0;">Phân bổ Số lượng Size số</label>
                ${state.hasEditPermission ? `
                    <button type="button" class="btn btn-secondary" onclick="_tpdAddCustomSize()" style="padding: 2px 8px; font-size: 10px; border-radius:4px; font-weight:700;">+ Thêm size khác</button>
                ` : ''}
            </div>
            <div class="${_tpdIsNamNuSize(currentSizeType) ? '' : 'tpd-ws-size-grid'}" style="margin-top:8px;">
                ${sizeGridHtml}
            </div>
        </div>
    `;

    // 3. Paste Zones (Mockup & Dynamic Print Details)
    const mockupSrc = it.mockup_image || '';
    const details = it.print_details || [];

    // Build upload boxes for dynamic details
    let detailBoxesHtml = '';
    details.forEach((d, idx) => {
        const isCustomType = d.print_type && !['Thêu', 'In PET', 'In 3D', 'In lưới', 'In Decal'].includes(d.print_type);
        
        let valWidth = d.width || '';
        let valHeight = d.height || '';
        if (!valWidth && !valHeight && d.dimension && d.dimension.trim()) {
            const dim = d.dimension.trim();
            const lowerDim = dim.toLowerCase();
            if (lowerDim.includes('cao') || lowerDim.includes('h')) {
                valHeight = dim.replace(/cao/i, '').trim();
            } else if (lowerDim.includes('ngang') || lowerDim.includes('w')) {
                valWidth = dim.replace(/ngang/i, '').trim();
            } else {
                valWidth = dim;
            }
        }

        detailBoxesHtml += `
            <div class="tpd-ws-detail-card" style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #ffffff; display: flex; flex-direction: column; gap: 6px; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <!-- Clear / Delete button -->
                <button type="button" class="tpd-ws-upload-clear" onclick="event.stopPropagation(); _tpdRemoveDetailZone(${idx})" style="background:#ef4444; position: absolute; top: 4px; right: 4px; border: none; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; line-height: 1; z-index: 10;" title="Xóa vị trí này" ${disabledAttr}>✕</button>
                
                <!-- Paste Image Target -->
                <div class="tpd-ws-upload-box paste-target" data-zone="detail_${idx}" id="zone_detail_${idx}" style="height: 75px; margin: 0; min-height: unset; width: 100%; border: 1.5px dashed #cbd5e1; border-radius: 6px; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; position: relative;">
                    ${d.image ? `
                        <img src="${d.image}" class="tpd-ws-upload-preview" style="max-height: 70px; object-fit: contain;">
                        <button type="button" class="tpd-ws-upload-clear" onclick="event.stopPropagation(); _tpdClearZone('detail_${idx}')" style="background:#ef4444; position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; font-size: 8px; line-height: 1; border-radius: 50%; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xóa ảnh" ${disabledAttr}>✕</button>
                    ` : `
                        <span class="tpd-ws-upload-icon" style="font-size: 14px; margin-bottom: 2px;">📍</span>
                        <span style="font-size: 8.5px; color: #64748b; font-weight: 600;">Dán ảnh (Ctrl+V)</span>
                    `}
                </div>
                
                <!-- Position title -->
                <div style="font-size: 11px; font-weight: 700; color: #1e293b; text-align: center; margin-top: 1px;">
                    ${d.position}
                </div>

                <!-- Input Controls -->
                <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span style="font-size: 9px; color: #64748b; min-width: 38px; font-weight: 700;">Kiểu:</span>
                        <select onchange="_tpdUpdateDetailField(${idx}, 'print_type', this.value)" class="tpd-ws-input" style="flex: 1; padding: 2px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none; background: #fff;" ${disabledAttr}>
                            <option value="">-- Kiểu in/thêu --</option>
                            <option value="Thêu" ${d.print_type === 'Thêu' ? 'selected' : ''}>Thêu</option>
                            <option value="In PET" ${d.print_type === 'In PET' ? 'selected' : ''}>In PET</option>
                            <option value="In 3D" ${d.print_type === 'In 3D' ? 'selected' : ''}>In 3D</option>
                            <option value="In lưới" ${d.print_type === 'In lưới' ? 'selected' : ''}>In lưới</option>
                            <option value="In Decal" ${d.print_type === 'In Decal' ? 'selected' : ''}>In Decal</option>
                            <option value="Khác" ${isCustomType || d.print_type === 'Khác' ? 'selected' : ''}>Khác...</option>
                        </select>
                    </div>

                    ${(isCustomType || d.print_type === 'Khác') ? `
                        <input type="text" placeholder="Nhập kiểu in/thêu..." value="${d.print_type === 'Khác' ? '' : d.print_type}" onchange="_tpdUpdateDetailField(${idx}, 'print_type', this.value)" class="tpd-ws-input" style="padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none;" ${disabledAttr}>
                    ` : ''}

                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span style="font-size: 9px; color: #64748b; font-weight: 700;">Ngang:</span>
                        <input id="tpd_width_${idx}" type="text" placeholder="8cm" value="${valWidth}" oninput="_tpdUpdateDetailField(${idx}, 'width', this.value)" class="tpd-ws-input" style="flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none;" ${disabledAttr || (valHeight ? 'disabled' : '')}>
                        <span style="font-size: 9px; color: #64748b; font-weight: 700; margin-left: 2px;">Cao:</span>
                        <input id="tpd_height_${idx}" type="text" placeholder="10cm" value="${valHeight}" oninput="_tpdUpdateDetailField(${idx}, 'height', this.value)" class="tpd-ws-input" style="flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none;" ${disabledAttr || (valWidth ? 'disabled' : '')}>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        <div class="tpd-ws-form-group">
            <label class="tpd-ws-form-label">Hình ảnh thiết kế Mockup lớn (Ctrl+V để dán)</label>
            <div class="tpd-ws-upload-box paste-target" data-zone="mockup" id="zone_mockup" style="min-height: 140px;">
                ${mockupSrc ? `
                    <button type="button" class="tpd-ws-upload-clear" onclick="event.stopPropagation(); _tpdClearZone('mockup')" ${disabledAttr}>✕</button>
                    <img src="${mockupSrc}" class="tpd-ws-upload-preview" style="max-height:120px;">
                ` : `
                    <span class="tpd-ws-upload-icon">🎨</span>
                    <span class="tpd-ws-upload-text">Ảnh Mockup lớn (Click dán)</span>
                `}
            </div>
        </div>

        <div class="tpd-ws-form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label class="tpd-ws-form-label" style="margin-bottom:0;">Vị trí in / thêu chi tiết</label>
                ${state.hasEditPermission ? `
                    <div style="display:flex; gap:6px; align-items:center;">
                        <select id="tpdNewPositionSelect" class="tpd-ws-input" style="padding:2px 6px; font-size:11px; height:24px; width:110px; border-radius:4px;">
                            <option value="Ngực">Ngực</option>
                            <option value="Lưng">Lưng</option>
                            <option value="Bụng">Bụng</option>
                            <option value="Tay Trái">Tay Trái</option>
                            <option value="Tay Phải">Tay Phải</option>
                            <option value="Gáy">Gáy</option>
                            <option value="Vị Trí Khác">Vị Trí Khác...</option>
                        </select>
                        <button type="button" class="btn btn-primary" onclick="_tpdAddPosition()" style="padding:2px 8px; font-size:11px; height:24px; border-radius:4px; font-weight:700; background:#122546; border:1px solid #122546;">Thêm</button>
                    </div>
                ` : ''}
            </div>
            <div class="tpd-ws-upload-row" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
                ${detailBoxesHtml || `<div style="grid-column:1/-1; padding:20px; text-align:center; color:#94a3b8; font-size:11px; font-weight:600; border:2px dashed #cbd5e1; border-radius:10px;">Chưa thêm vị trí in/thêu nào.</div>`}
            </div>
        </div>
    `;

    // 4. Workshop Note Textarea
    html += `
        <div class="tpd-ws-form-group">
            <label class="tpd-ws-form-label">Ghi chú kỹ thuật của xưởng</label>
            <textarea class="tpd-ws-input" rows="4" style="resize:vertical; font-family:inherit;" placeholder="Nhập ghi chú yêu cầu kỹ thuật chi tiết như: Cắt gấu bo len, phối chỉ vàng..." onkeyup="_tpdUpdateField('workshop_note', this.value)" ${disabledAttr}>${it.workshop_note || ''}</textarea>
        </div>
    `;

    container.innerHTML = html;
}

// Update single field in editing item state
function _tpdUpdateField(field, val) {
    const state = window._tpdWorkspaceState;
    if (!state.editingItem) return;

    state.editingItem[field] = val;

    // Live sync preview text immediately
    const prevEl = document.getElementById(`prev_${field}`);
    if (prevEl) {
        prevEl.innerText = val || '—';
    }

    _tpdSaveDraft(state.editingItem);
}

// Update size quantity in editing item state
function _tpdUpdateQty(size, val) {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    const qty = Number(val) || 0;
    const qObj = it.quantities.find(q => q.size === size);
    if (qObj) {
        qObj.qty = qty;
    } else {
        it.quantities.push({ size: size, qty: qty, price: it.unit_price || 0, note: '' });
    }

    _tpdSaveDraft(it);
    // Refresh preview size table dynamically (without full rerender)
    _tpdUpdateLivePreview();
}

// Update size note in editing item state
function _tpdUpdateSizeNote(size, noteVal) {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    const qObj = it.quantities.find(q => q.size === size);
    if (qObj) {
        qObj.note = noteVal;
    } else {
        it.quantities.push({ size: size, qty: 0, price: it.unit_price || 0, note: noteVal });
    }

    _tpdSaveDraft(it);
    _tpdUpdateLivePreview();
}

// Add a custom size name input popup
function _tpdAddCustomSize() {
    const state = window._tpdWorkspaceState;
    if (!state.hasEditPermission) return;

    const name = prompt('Nhập tên size muốn thêm (Ví dụ: 6XL, Child 4, 30, 31...):');
    if (!name) return;

    const cleanName = name.trim().toUpperCase();
    if (!cleanName) return;

    const it = state.editingItem;
    if (it.quantities.some(q => q.size === cleanName)) {
        showToast('Size này đã tồn tại!', 'warning');
        return;
    }

    it.quantities.push({ size: cleanName, qty: 0, price: it.unit_price || 0 });
    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdSetupPasteZones();
}

// Dynamic print details helper
function _tpdGetTechWrapperHtml(it, isPrintMode = false) {
    const allDetails = it.print_details || [];
    const details = allDetails
        .map((d, idx) => ({ ...d, originalIndex: idx }))
        .filter(d => d.image && d.image.trim().length > 0);
        
    let techBoxesHtml = '';

    if (details.length === 0) {
        techBoxesHtml = `
            <div class="tpd-a4-tech-box">
                <div class="tpd-a4-img-header">Chi tiết in / thêu</div>
                <div class="tpd-a4-img-body">
                    <div class="tpd-a4-img-placeholder">Chưa thêm vị trí in/thêu nào.<br><span style="font-size: 8px; color: #94a3b8;">Chọn vị trí ở cột phải rồi bấm Thêm</span></div>
                </div>
            </div>
        `;
    } else {
        details.forEach((d, index) => {
            const idx = d.originalIndex;
            const pasteClass = isPrintMode ? '' : 'paste-target';
            
            // Format header text: e.g. "Ngực - Thêu" or "Lưng - In PET"
            const headerText = d.print_type && d.print_type.trim() && d.print_type !== 'Khác'
                ? `${d.position} - ${d.print_type.trim()}`
                : d.position;

            // Backward compatibility logic
            let widthText = '';
            let heightText = '';
            
            if (d.width && d.width.trim()) {
                widthText = d.width.trim();
                if (!widthText.toLowerCase().includes('ngang') && !widthText.toLowerCase().includes('w')) {
                    widthText = `Ngang ${widthText}`;
                }
            }
            
            if (d.height && d.height.trim()) {
                heightText = d.height.trim();
                if (!heightText.toLowerCase().includes('cao') && !heightText.toLowerCase().includes('h')) {
                    heightText = `Cao ${heightText}`;
                }
            }

            // Fallback to old 'dimension' field if width/height are empty
            if (!widthText && !heightText && d.dimension && d.dimension.trim()) {
                const dim = d.dimension.trim();
                const lowerDim = dim.toLowerCase();
                if (lowerDim.includes('cao') || lowerDim.includes('h')) {
                    heightText = dim;
                } else if (lowerDim.includes('ngang') || lowerDim.includes('w')) {
                    widthText = dim;
                } else {
                    // Default to width if no orientation specified
                    widthText = `Ngang ${dim}`;
                }
            }

            const paddingStyle = (widthText || heightText)
                ? 'padding: 10px 25px 26px 10px;'
                : 'padding: 4px;';

            techBoxesHtml += `
                <div class="tpd-a4-tech-box ${pasteClass}" data-zone="detail_${idx}" style="cursor: pointer; display: flex; flex-direction: column; height: 100%;">
                    <div class="tpd-a4-img-header">${headerText}</div>
                    <div class="tpd-a4-img-body" style="background: #ffffff; display: flex; align-items: center; justify-content: center; flex: 1; box-sizing: border-box; overflow: visible; ${paddingStyle} min-height: 0;">
                        ${d.image ? `
                            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; max-width: 100%; height: 100%;">
                                <img src="${d.image}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;">
                                
                                <!-- Width indicator (Horizontal line) -->
                                ${widthText ? `
                                    <div style="position: absolute; bottom: -23px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; width: 100%; z-index: 5;">
                                        <svg width="100%" height="8" style="overflow: visible; display: block;">
                                            <defs>
                                                <marker id="arrow-start-${idx}" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                                                    <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#ef4444" />
                                                </marker>
                                                <marker id="arrow-end-${idx}" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                                                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ef4444" />
                                                </marker>
                                            </defs>
                                            <line x1="0" y1="4" x2="100%" y2="4" stroke="#ef4444" stroke-width="2" marker-start="url(#arrow-start-${idx})" marker-end="url(#arrow-end-${idx})" />
                                        </svg>
                                        <div style="color: #ef4444; font-size: 10.5px; font-weight: 800; text-align: center; line-height: 1.1; margin-top: 1px; white-space: nowrap;">
                                            ${widthText}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Height indicator (Vertical line) -->
                                ${heightText ? `
                                    <div style="position: absolute; right: -22px; top: 0; bottom: 0; width: 18px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                                        <div style="position: relative; height: 100%; width: 100%; display: flex; align-items: center;">
                                            <svg width="8" height="100%" style="overflow: visible; display: block; height: 100%;">
                                                <defs>
                                                    <marker id="arrow-top-${idx}" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="5" markerHeight="5" orient="auto">
                                                        <path d="M 1.5 10 L 5 0 L 8.5 10 z" fill="#ef4444" />
                                                    </marker>
                                                    <marker id="arrow-bottom-${idx}" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="5" markerHeight="5" orient="auto">
                                                        <path d="M 1.5 0 L 5 10 L 8.5 0 z" fill="#ef4444" />
                                                    </marker>
                                                </defs>
                                                <line x1="4" y1="0" x2="4" y2="100%" stroke="#ef4444" stroke-width="2" marker-start="url(#arrow-top-${idx})" marker-end="url(#arrow-bottom-${idx})" />
                                            </svg>
                                            <div style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%) rotate(90deg); transform-origin: left center; color: #ef4444; font-size: 10.5px; font-weight: 800; white-space: nowrap; line-height: 1;">
                                                ${heightText}
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="tpd-a4-img-placeholder" style="font-size: 9px; padding: 10px; text-align: center; width: 100%;">Chưa có ảnh vị trí ${d.position}<br><span style="font-size: 8px; color: #94a3b8;">Click & Ctrl+V để dán</span></div>
                        `}
                    </div>
                </div>
            `;
        });
    }

    let gridCols = '1fr';
    let gridRows = '1fr';
    const count = details.length;
    if (count === 2) {
        gridCols = '1fr 1fr';
    } else if (count === 3) {
        gridCols = 'repeat(3, 1fr)';
    } else if (count === 4) {
        gridCols = 'repeat(2, 1fr)';
        gridRows = 'repeat(2, 1fr)';
    } else if (count >= 5 && count <= 6) {
        gridCols = 'repeat(3, 1fr)';
        gridRows = 'repeat(2, 1fr)';
    } else if (count >= 7) {
        gridCols = 'repeat(4, 1fr)';
        gridRows = 'repeat(2, 1fr)';
    }

    return `
        <div class="tpd-a4-tech-wrapper" style="flex: 1.65; display: grid; grid-template-columns: ${gridCols}; grid-template-rows: ${gridRows}; gap: 8px; height: 100%;">
            ${techBoxesHtml}
        </div>
    `;
}

// Add a print position
function _tpdAddPosition() {
    const state = window._tpdWorkspaceState;
    if (!state.hasEditPermission) return;

    const select = document.getElementById('tpdNewPositionSelect');
    if (!select) return;

    let val = select.value;
    if (val === 'Vị Trí Khác') {
        const custom = prompt('Nhập tên vị trí in/thêu khác (Ví dụ: Cổ áo, Sườn áo...):');
        if (!custom) return;
        val = custom.trim();
    }

    if (!val) return;

    const it = state.editingItem;
    if (!it.print_details) it.print_details = [];

    // Prevent duplicates
    if (it.print_details.some(d => d.position.toLowerCase() === val.toLowerCase())) {
        showToast('Vị trí này đã được thêm!', 'warning');
        return;
    }

    it.print_details.push({ position: val, image: '' });

    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
    _tpdSetupPasteZones();
    showToast(`✅ Đã thêm vị trí in/thêu: ${val}`, 'success');
}

// Remove position from print_details list
function _tpdRemoveDetailZone(idx) {
    const state = window._tpdWorkspaceState;
    if (!state.hasEditPermission || !state.editingItem) return;

    const it = state.editingItem;
    if (!it.print_details) return;

    const removed = it.print_details[idx];
    it.print_details.splice(idx, 1);

    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
    _tpdSetupPasteZones();
    if (removed) {
        showToast(`❌ Đã xóa vị trí: ${removed.position}`, 'info');
    }
}

// Update detail print/embroidery type or dimension
function _tpdUpdateDetailField(idx, field, value) {
    const state = window._tpdWorkspaceState;
    if (!state || !state.editingItem) return;

    const it = state.editingItem;
    if (!it.print_details || !it.print_details[idx]) return;

    it.print_details[idx][field] = value;

    _tpdSaveDraft(it);
    // If the field is print_type, we might toggle showing the custom input box
    if (field === 'print_type') {
        _tpdRenderFormInputs();
        _tpdSetupPasteZones();
    } else if (field === 'width') {
        const heightEl = document.getElementById(`tpd_height_${idx}`);
        if (heightEl) {
            heightEl.disabled = !!(value && value.trim());
        }
    } else if (field === 'height') {
        const widthEl = document.getElementById(`tpd_width_${idx}`);
        if (widthEl) {
            widthEl.disabled = !!(value && value.trim());
        }
    }
    _tpdUpdateLivePreview();
}

// Clear image inside upload zone
function _tpdClearZone(zone) {
    const state = window._tpdWorkspaceState;
    if (!state.hasEditPermission || !state.editingItem) return;

    if (zone === 'mockup') {
        state.editingItem.mockup_image = '';
    } else if (zone.startsWith('detail_')) {
        const idx = parseInt(zone.replace('detail_', ''), 10);
        if (state.editingItem.print_details && state.editingItem.print_details[idx]) {
            state.editingItem.print_details[idx].image = '';
        }
    }

    _tpdSaveDraft(state.editingItem);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
    _tpdSetupPasteZones();
}

// Setup Paste (Ctrl+V) listener on both form zones and active preview wrappers
function _tpdSetupPasteZones() {
    const state = window._tpdWorkspaceState;
    if (!state || !state.hasEditPermission) return;

    const activeZoneClass = 'dragging';
    const targets = document.querySelectorAll('.paste-target');
    let activeTarget = null;

    targets.forEach(t => {
        t.addEventListener('click', () => {
            targets.forEach(el => el.classList.remove(activeZoneClass));
            t.classList.add(activeZoneClass);
            activeTarget = t;
            showToast(`👉 Đã chọn vùng "${t.getAttribute('data-zone').toUpperCase()}". Nhấn Ctrl+V để dán ảnh.`, 'info');
        });
    });

    const pasteHandler = async (e) => {
        if (!activeTarget) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (!file) continue;

                const zone = activeTarget.getAttribute('data-zone');
                showToast(`⏳ Đang tải ảnh ${zone.toUpperCase()} lên...`);

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    if (zone === 'mockup') {
                        state.editingItem.mockup_image = base64;
                    } else if (zone.startsWith('detail_')) {
                        const idx = parseInt(zone.replace('detail_', ''), 10);
                        if (state.editingItem.print_details && state.editingItem.print_details[idx]) {
                            state.editingItem.print_details[idx].image = base64;
                        }
                    }

                    activeTarget.classList.remove(activeZoneClass);
                    activeTarget = null;

                    _tpdSaveDraft(state.editingItem);
                    _tpdRenderFormInputs();
                    _tpdUpdateLivePreview();
                    _tpdSetupPasteZones();
                    showToast('✅ Dán ảnh thành công!', 'success');
                };
                reader.readAsDataURL(file);
                e.preventDefault();
                break;
            }
        }
    };

    if (window._tpdGlobalPasteHandler) {
        document.removeEventListener('paste', window._tpdGlobalPasteHandler);
    }
    window._tpdGlobalPasteHandler = pasteHandler;
    document.addEventListener('paste', pasteHandler);
}

// Save active production sheet changes via PUT API
async function _tpdSaveProductionSheet() {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    if (!state.hasEditPermission) {
        showToast('Bạn không có quyền chỉnh sửa phiếu này.', 'error');
        return;
    }

    showToast('⏳ Đang lưu thông tin phiếu sản xuất...', 'info');

    try {
        const payload = {
            style_name: it.style_name,
            material_name: it.material_name,
            color_name: it.color_name,
            workshop_note: it.workshop_note,
            mockup_image: it.mockup_image,
            print_details: it.print_details || [],
            front_technique_image: it.print_details && it.print_details[0] ? it.print_details[0].image : null,
            back_technique_image: it.print_details && it.print_details[1] ? it.print_details[1].image : null,
            quantities: it.quantities,
            size_type: it.size_type || 'Size TT'
        };

        const res = await apiCall(`/api/dht/orders/${state.orderId}/items/${it.id}/sheet`, 'PUT', payload);
        if (res.success) {
            showToast('✅ Đã lưu phiếu sản xuất thành công!', 'success');
            
            // Clear the draft from localStorage since it is now saved to the DB
            _tpdClearDraft(it);
            
            // Reload details in workspace state to keep other components in sync
            const details = await apiCall(`/api/dht/orders/${state.orderId}/detail`);
            state.items = details.items || [];
            state.order = details.order;
            state.editingItem = _tpdCloneItemState(state.items[state.activeItemIndex]);
            
            // Refresh preview and tab buttons
            _tpdRenderWorkspace(window._dhtFullPageContainer || document.getElementById('main-content'));
        } else {
            showToast('Lưu phiếu thất bại: ' + (res.error || 'Lỗi không xác định'), 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi khi lưu phiếu sản xuất: ' + e.message, 'error');
    }
}

// Print single active production sheet layout
function _tpdPrintSingleSheet() {
    // Generate clean printing element
    const state = window._tpdWorkspaceState;
    const printContainer = document.getElementById('tpdPrintAllSheetsContainer');
    if (!printContainer) return;

    // Render single card inside container
    const activePreview = document.getElementById('tpdWorkspacePreviewContainer').innerHTML;
    printContainer.innerHTML = `<div class="tpd-print-page">${activePreview}</div>`;

    window.print();
}

// Render all sheets of the order and print them sequentially using CSS page breaks
async function _tpdPrintAllSheets() {
    const state = window._tpdWorkspaceState;
    const orderId = state.orderId;
    const items = state.items;
    const o = state.order;

    const printContainer = document.getElementById('tpdPrintAllSheetsContainer');
    if (!printContainer) return;

    showToast('⏳ Đang chuẩn bị bản in cho tất cả phiếu...', 'info');

    let printHtml = '';

    // Render each item's sheet A4 preview
    items.forEach((item, idx) => {
        const it = _tpdCloneItemState(item);

        // Dates
        const orderDate = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
        const shipDate = o.expected_ship_date ? new Date(o.expected_ship_date).toLocaleDateString('vi-VN') : '—';

        // QR
        const deepLink = `${window.location.origin}/taophieudonhang?id=${o.id}&activeTab=${idx}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(deepLink)}`;

        const mockupSrc = it.mockup_image || '';

        printHtml += `
            <div class="tpd-print-page">
                <div class="tpd-a4-preview-card" style="border:none; box-shadow:none; width:100%; height:100%;">
                    <!-- Header Block -->
                    <div class="tpd-a4-header">
                        <div class="tpd-a4-header-left">
                            <img src="/images/logo.png" class="tpd-a4-logo" onerror="this.style.display='none'">
                            <span class="tpd-a4-brand">Đồng Phục <span class="tpd-a4-brand-gold">HV</span></span>
                        </div>
                        <div class="tpd-a4-header-right">
                            <h1 class="tpd-a4-title">PHIẾU SẢN XUẤT</h1>
                            <div class="tpd-a4-order-code">MÃ ĐƠN: ${o.order_code} | PHIẾU ${idx + 1}/${items.length}</div>
                        </div>
                    </div>

                    <!-- Metadata info grid -->
                    <div class="tpd-a4-meta-grid">
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Khách hàng:</span> <span class="tpd-a4-meta-val">${o.customer_name || '—'}</span></div>
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Tiêu chuẩn gửi:</span> <span class="tpd-a4-meta-val" style="font-weight: 800; color: ${o.shipping_priority === 'GẤP' ? '#dc2626' : o.shipping_priority === 'GỬI' ? '#f59e0b' : '#7c3aed'};">${o.shipping_priority || 'CHUẨN'}</span></div>
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Ngày lên đơn:</span> <span class="tpd-a4-meta-val">${orderDate}</span></div>
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Ngày gửi hàng:</span> <span class="tpd-a4-meta-val" style="color: #ea580c;">${shipDate}</span></div>

                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Sản phẩm:</span> <span class="tpd-a4-meta-val" style="color: #16a34a;">${it.product_name || '—'}</span></div>
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Thiết kế / Mẫu rập:</span> <span class="tpd-a4-meta-val">${o.designer_name || '—'} / ${it.pattern_name || '—'}</span></div>
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Chất liệu vải:</span> <span class="tpd-a4-meta-val">${it.material_name || '—'}</span></div>
                        <div class="tpd-a4-meta-item"><span class="tpd-a4-meta-label">Màu sắc phối:</span> <span class="tpd-a4-meta-val">${it.color_name || '—'}</span></div>
                    </div>

                    <!-- Images Row -->
                    <div class="tpd-a4-images-row" style="height: ${_tpdGetImagesRowHeight(it)};">
                        <div class="tpd-a4-mockup-wrapper">
                            <div class="tpd-a4-img-header">Ảnh Thiết Kế Mockup lớn</div>
                            <div class="tpd-a4-img-body">
                                ${mockupSrc ? `<img src="${mockupSrc}">` : `<div class="tpd-a4-img-placeholder">Chưa có ảnh Mockup</div>`}
                            </div>
                        </div>
                        ${_tpdGetTechWrapperHtml(it, true)}
                    </div>

                    <!-- Size breakdown table -->
                    <div class="tpd-a4-table-row">
                        ${_tpdRenderA4SizeTable(it)}
                    </div>

                    <!-- Bottom Row -->
                    <div class="tpd-a4-bottom-row">
                        <div class="tpd-a4-note-section">
                            <span class="tpd-a4-note-title"> Ghi chú Kỹ thuật may của Xưởng:</span>
                            <div class="tpd-a4-note-content">${it.workshop_note || 'Chưa có ghi chú kỹ thuật xưởng.'}</div>
                        </div>

                        <div class="tpd-a4-qr-section">
                            <img src="${qrUrl}" class="tpd-a4-qr-img">
                            <span class="tpd-a4-qr-text">Quét mã tiến độ</span>
                        </div>

                        <div class="tpd-a4-sigs-section">
                            <div class="tpd-a4-sig-box">
                                <span class="tpd-a4-sig-title">Người Lập Phiếu</span>
                                <div class="tpd-a4-sig-space"></div>
                                <span class="tpd-a4-sig-desc">${o.cskh_name || 'Kinh Doanh'}</span>
                            </div>
                            <div class="tpd-a4-sig-box">
                                <span class="tpd-a4-sig-title">Quản Lý Xưởng</span>
                                <div class="tpd-a4-sig-space"></div>
                                <span class="tpd-a4-sig-desc">Ký xác nhận</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    printContainer.innerHTML = printHtml;
    setTimeout(() => {
        window.print();
    }, 100);
}

// Load size configuration from backend
async function _tpdLoadSizeConfig() {
    try {
        const res = await apiCall('/api/dht/size-config', 'GET');
        if (res && !res.error) {
            _tpd.sizeTypesConfig = res;
        }
    } catch (e) {
        console.error('Failed to load size config:', e);
    }
    // Fallback if not loaded
    if (!_tpd.sizeTypesConfig) {
        _tpd.sizeTypesConfig = {
            "Size TT": ["S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"],
            "Size Nam / Nữ": ["Nam S", "Nam M", "Nam L", "Nam XL", "Nam XXL", "Nữ S", "Nữ M", "Nữ L", "Nữ XL", "Nữ XXL"]
        };
    }
}

// Change size type for the current editing item
function _tpdChangeSizeType(val) {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    it.size_type = val;

    // Filter out sizes that don't match the new size type config
    const config = _tpd.sizeTypesConfig || {
        "Size TT": ["S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"],
        "Size Nam / Nữ": ["Nam S", "Nam M", "Nam L", "Nam XL", "Nam XXL", "Nữ S", "Nữ M", "Nữ L", "Nữ XL", "Nữ XXL"]
    };
    const configuredSizes = config[val] || [];
    if (it.quantities && Array.isArray(it.quantities)) {
        it.quantities = it.quantities.filter(q => configuredSizes.includes(q.size));
    }

    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
}

// Toggle a size active/inactive in the quantities list
function _tpdToggleSizeActive(sizeName, isChecked) {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    if (isChecked) {
        if (!it.quantities.some(q => q.size === sizeName)) {
            it.quantities.push({ size: sizeName, qty: 0, price: it.unit_price || 0 });
        }
    } else {
        it.quantities = it.quantities.filter(q => q.size !== sizeName);
    }

    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
}

// Open modal for Director to configure size templates (supports dynamically adding, renaming, and deleting custom templates)
function _tpdOpenSizeConfigModal() {
    const state = window._tpdWorkspaceState;
    if (state.role !== 'giam_doc') {
        showToast('Chỉ Giám Đốc mới có quyền thay đổi cấu hình này!', 'danger');
        return;
    }

    const config = _tpd.sizeTypesConfig || {
        "Size TT": ["S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"],
        "Size Nam / Nữ": ["Nam S", "Nam M", "Nam L", "Nam XL", "Nam XXL", "Nữ S", "Nữ M", "Nữ L", "Nữ XL", "Nữ XXL"]
    };

    window._tpdModalSizeTemplates = JSON.parse(JSON.stringify(config));

    // Create Modal Element
    const modal = document.createElement('div');
    modal.id = 'tpdSizeConfigModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 620px; max-width: 95%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); overflow: hidden; display: flex; flex-direction: column; max-height: 85vh;">
            <div style="background: #1e293b; color: white; padding: 16px; font-weight: 700; font-size: 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <span>⚙️ Cài đặt mẫu size sản xuất</span>
                <span style="cursor: pointer; font-size: 18px;" onclick="document.getElementById('tpdSizeConfigModal').remove()">✕</span>
            </div>
            
            <div style="padding: 16px 20px 0; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #64748b; font-style: italic;">Bạn có thể đổi tên mẫu size, thêm/xóa size hoặc tạo/xóa các mẫu khác.</span>
                <button type="button" onclick="_tpdAddNewSizeTemplate()" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(16,185,129,0.15);">
                    <span>+ Tạo mẫu size mới</span>
                </button>
            </div>

            <div id="tpdSizeTemplatesContainer" style="padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex-grow: 1; box-sizing: border-box;">
                <!-- Templates list will be rendered dynamically here -->
            </div>

            <div style="background: #f8fafc; padding: 12px 16px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                <button type="button" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="document.getElementById('tpdSizeConfigModal').remove()">Hủy</button>
                <button type="button" style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="_tpdSaveSizeConfig()">Lưu cài đặt</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Initial render
    _tpdRenderAllSizeTemplates();
}

// Render dynamic size templates inside modal
function _tpdRenderAllSizeTemplates() {
    const container = document.getElementById('tpdSizeTemplatesContainer');
    if (!container) return;

    const templates = window._tpdModalSizeTemplates || {};
    const keys = Object.keys(templates).filter(k => !k.startsWith('_'));

    if (keys.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <span style="font-size: 32px;">📋</span>
                <p style="margin-top: 8px; font-size: 13px;">Chưa có mẫu size nào. Hãy nhấn "+ Tạo mẫu size mới" để bắt đầu.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = keys.map(tplName => {
        const list = templates[tplName] || [];
        return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; flex-wrap: wrap;">
                    <!-- Template Name Input -->
                    <div style="display: flex; align-items: center; gap: 6px; flex-grow: 1; min-width: 200px;">
                        <span style="font-size: 14px;">📋</span>
                        <input type="text" value="${tplName}" onchange="_tpdRenameSizeTemplate('${tplName}', this.value)" style="font-weight: 700; font-size: 13px; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; width: 100%; max-width: 250px; background: white;" placeholder="Nhập tên mẫu size...">
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" onclick="_tpdAddModalSize('${tplName}')" style="background: #2563eb; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            <span>+ Thêm size</span>
                        </button>
                        <button type="button" onclick="_tpdDeleteSizeTemplate('${tplName}')" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;" title="Xóa mẫu size này">
                            <span>Xóa mẫu</span>
                        </button>
                    </div>
                </div>
                <!-- Size items container -->
                <div style="display: flex; flex-wrap: wrap; gap: 8px; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; min-height: 50px; background: white; box-sizing: border-box; max-height: 120px; overflow-y: auto;">
                    ${list.length === 0 ? `
                        <span style="font-size: 11px; color: #94a3b8; font-style: italic;">Chưa có size nào. Nhấn "+ Thêm size"</span>
                    ` : list.map((sz, idx) => {
                        const ncList = (templates._nc_config && templates._nc_config[tplName]) || [];
                        const isNC = ncList.includes(sz);
                        return `
                            <div style="display: inline-flex; align-items: center; background: ${isNC ? '#ffe4e6' : '#f1f5f9'}; border: 1px solid ${isNC ? '#fda4af' : '#e2e8f0'}; border-radius: 6px; padding: 2px 6px; gap: 6px; box-sizing: border-box;">
                                <input type="checkbox" ${isNC ? 'checked' : ''} onchange="_tpdToggleModalSizeNC('${tplName}', '${sz}', this.checked)" title="Đánh dấu Ngoại cỡ (NC) để ghi chú số lượng & chữ" style="cursor: pointer; margin: 0; width: 13px; height: 13px;">
                                <input type="text" value="${sz}" oninput="_tpdUpdateModalSizeVal('${tplName}', ${idx}, this.value)" style="border: none; background: transparent; font-size: 12px; font-weight: 600; width: 70px; color: #1e293b; outline: none; padding: 0; margin: 0; box-sizing: border-box;" placeholder="Nhập size...">
                                <button type="button" onclick="_tpdDeleteModalSize('${tplName}', ${idx})" style="color: #ef4444; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 700; padding: 0 2px; margin: 0; line-height: 1; display: inline-flex; align-items: center;" title="Xóa size">✕</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Add new template block
function _tpdAddNewSizeTemplate() {
    const templates = window._tpdModalSizeTemplates || {};
    let newName = 'Mẫu Size Mới';
    let counter = 1;
    while (templates[newName] !== undefined) {
        counter++;
        newName = `Mẫu Size Mới ${counter}`;
    }
    templates[newName] = [];
    _tpdRenderAllSizeTemplates();

    // Scroll to the bottom of the container
    const container = document.getElementById('tpdSizeTemplatesContainer');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }
}

// Rename template block key
function _tpdRenameSizeTemplate(oldName, newName) {
    newName = newName.trim();
    if (!newName) {
        showToast('Tên mẫu size không được để trống!', 'warning');
        _tpdRenderAllSizeTemplates();
        return;
    }
    if (newName === oldName) return;

    const templates = window._tpdModalSizeTemplates || {};
    if (templates[newName] !== undefined) {
        showToast('Tên mẫu size này đã tồn tại!', 'danger');
        _tpdRenderAllSizeTemplates();
        return;
    }

    // Also rename in _nc_config
    if (templates._nc_config && templates._nc_config[oldName]) {
        templates._nc_config[newName] = templates._nc_config[oldName];
        delete templates._nc_config[oldName];
    }

    const updated = {};
    Object.keys(templates).forEach(k => {
        if (k === oldName) {
            updated[newName] = templates[oldName];
        } else {
            updated[k] = templates[k];
        }
    });
    window._tpdModalSizeTemplates = updated;
    _tpdRenderAllSizeTemplates();
}

// Delete template block key
function _tpdDeleteSizeTemplate(tplName) {
    if (confirm(`Bạn có chắc chắn muốn xóa mẫu size "${tplName}"?`)) {
        delete window._tpdModalSizeTemplates[tplName];
        if (window._tpdModalSizeTemplates._nc_config) {
            delete window._tpdModalSizeTemplates._nc_config[tplName];
        }
        _tpdRenderAllSizeTemplates();
    }
}

// Add size input inside a template block
function _tpdAddModalSize(tplName) {
    const templates = window._tpdModalSizeTemplates || {};
    if (templates[tplName]) {
        templates[tplName].push("");
        _tpdRenderAllSizeTemplates();
    }
}

// Delete size input inside a template block
function _tpdDeleteModalSize(tplName, idx) {
    const templates = window._tpdModalSizeTemplates || {};
    if (templates[tplName]) {
        const oldVal = templates[tplName][idx];
        templates[tplName].splice(idx, 1);
        
        // Remove from _nc_config
        if (templates._nc_config && templates._nc_config[tplName]) {
            const list = templates._nc_config[tplName];
            const oldIdx = list.indexOf(oldVal);
            if (oldIdx !== -1) {
                list.splice(oldIdx, 1);
            }
        }
        _tpdRenderAllSizeTemplates();
    }
}

// Update size input value inside a template block
function _tpdUpdateModalSizeVal(tplName, idx, val) {
    const templates = window._tpdModalSizeTemplates || {};
    if (templates[tplName]) {
        const oldVal = templates[tplName][idx];
        templates[tplName][idx] = val;
        
        // Update in _nc_config if present
        if (templates._nc_config && templates._nc_config[tplName]) {
            const list = templates._nc_config[tplName];
            const oldIdx = list.indexOf(oldVal);
            if (oldIdx !== -1) {
                if (val && val.trim()) {
                    list[oldIdx] = val;
                } else {
                    list.splice(oldIdx, 1);
                }
            }
        }
    }
}

// Toggle size NC configuration in modal
function _tpdToggleModalSizeNC(tplName, sz, isChecked) {
    const templates = window._tpdModalSizeTemplates || {};
    if (!templates._nc_config) {
        templates._nc_config = {};
    }
    if (!templates._nc_config[tplName]) {
        templates._nc_config[tplName] = [];
    }
    
    const list = templates._nc_config[tplName];
    const idxOf = list.indexOf(sz);
    if (isChecked) {
        if (idxOf === -1) {
            list.push(sz);
        }
    } else {
        if (idxOf !== -1) {
            list.splice(idxOf, 1);
        }
    }
    _tpdRenderAllSizeTemplates();
}

// Save size configuration to backend
async function _tpdSaveSizeConfig() {
    const templates = window._tpdModalSizeTemplates || {};
    const payload = {};

    // Clean and validate
    for (const key of Object.keys(templates)) {
        if (key.startsWith('_')) continue;
        const cleanedSizes = (templates[key] || [])
            .map(s => s.trim())
            .filter(s => s.length > 0);
        payload[key] = cleanedSizes;
    }

    // Clean and validate _nc_config
    if (templates._nc_config) {
        payload._nc_config = {};
        for (const key of Object.keys(templates._nc_config)) {
            const cleanedNc = (templates._nc_config[key] || [])
                .map(s => s.trim())
                .filter(s => s.length > 0 && payload[key] && payload[key].includes(s));
            if (cleanedNc.length > 0) {
                payload._nc_config[key] = cleanedNc;
            }
        }
    }

    try {
        const res = await apiCall('/api/dht/size-config', 'PUT', payload);
        if (res && res.success) {
            showToast('Lưu cài đặt mẫu size thành công!', 'success');
            const modal = document.getElementById('tpdSizeConfigModal');
            if (modal) modal.remove();
            
            // Reload size config and redraw
            await _tpdLoadSizeConfig();
            _tpdRenderFormInputs();
        } else {
            showToast(res && res.error ? res.error : 'Có lỗi xảy ra khi lưu cấu hình', 'danger');
        }
    } catch(e) {
        console.error(e);
        showToast('Không thể kết nối đến máy chủ', 'danger');
    }
}

// Draft helpers to save/clear editing progress in localStorage on F5 refresh
function _tpdSaveDraft(it) {
    if (!it || !it.id) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id') || (window._tpdWorkspaceState && window._tpdWorkspaceState.orderId) || '';
    if (!orderId) return;
    localStorage.setItem(`tpd_draft_${orderId}_${it.id}`, JSON.stringify(it));
}

function _tpdClearDraft(it) {
    if (!it || !it.id) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id') || (window._tpdWorkspaceState && window._tpdWorkspaceState.orderId) || '';
    if (!orderId) return;
    localStorage.removeItem(`tpd_draft_${orderId}_${it.id}`);
}
