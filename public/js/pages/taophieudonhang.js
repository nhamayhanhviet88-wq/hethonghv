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

function _tpdFormatDateWithDayOfWeek(dateStr) {
    if (!dateStr) return '—';
    let d;
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
    }
    if (!d || isNaN(d.getTime())) {
        d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return '—';

    const dayOfWeek = d.getDay();
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[dayOfWeek];
    const date = d.getDate();
    const month = d.getMonth() + 1;
    return `${dayName} - ${date}/${month}`;
}

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
    await Promise.all([
        _tpdLoadOrders(),
        _tpdLoadPrintPositionsConfig(),
        _tpdLoadPrintTypesConfig(),
        _tpdLoadSewingTechsConfig(),
        _tpdLoadLayoutConfig()
    ]);

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
            _tpdLoadSizeConfig(),
            _tpdLoadPrintPositionsConfig(),
            _tpdLoadPrintTypesConfig(),
            _tpdLoadSewingTechsConfig(),
            _tpdLoadLayoutConfig()
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
        let activeIdx = 0;
        const sheetParam = params.get('sheet');
        if (sheetParam) {
            const parsed = parseInt(sheetParam) - 1;
            if (!isNaN(parsed) && parsed >= 0 && parsed < items.length) {
                activeIdx = parsed;
            }
        } else {
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('sheet', '1');
                window.history.replaceState({}, '', url.toString());
            } catch(e) {}
        }

        window._tpdWorkspaceState = {
            orderId: orderId,
            order: order,
            items: items,
            payments: details.payments || [],
            surcharges: details.surcharges || [],
            activeItemIndex: activeIdx,
            hasEditPermission: hasEditPermission,
            role: myInfo.role || '',
            // Deep copy of active item editing state
            editingItem: items.length > 0 ? _tpdCloneItemState(items[activeIdx]) : null
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
                    // Sync latest DB values into loaded draft to prevent stale data
                    draft.quantity = item.quantity;
                    draft.product_name = item.product_name;
                    draft.material_name = item.material_name;
                    draft.color_name = item.color_name;
                    draft.size_type = item.size_type;
                    draft.unit_price = item.unit_price;
                    draft.pattern_name = item.pattern_name;
                    draft.sewing_techniques = item.sewing_techniques;
                    draft.tsam_sewing_tech = item.tsam_sewing_tech;
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
        const defaultPositions = [
            { name: "Ngực", require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Lưng", require_offset: true, offset_label: "Gáy xuống", offset_placeholder: "Ví dụ: 10cm" }
        ];
        defaultPositions.forEach(pos => {
            let img = '';
            if (pos.name === 'Ngực') img = item.front_technique_image || '';
            else if (pos.name === 'Lưng') img = item.back_technique_image || '';
            printDetails.push({ position: pos.name, image: img });
        });
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

    let customLayout = { height: '', topSpacing: 7, alignment: 'flex-start', contentEditable: false };
    if (item.custom_layout) {
        try {
            customLayout = typeof item.custom_layout === 'string' ? JSON.parse(item.custom_layout) : item.custom_layout;
        } catch(e) {}
    }

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
        sale_type: item.sale_type || '',
        pattern_name: item.pattern_name || '',
        size_type: item.size_type || 'Size TT',
        custom_layout: customLayout,
        sewing_techniques: item.sewing_techniques || [],
        tsam_sewing_tech: item.tsam_sewing_tech || []
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

function _tpdFormatSizeItem(sz, qty, note) {
    const cleanSz = escapeHTML(sz.trim());
    const qtyNum = Number(qty) || 0;
    let sizeText = '';
    
    // Highlight the size name in a professional blue/indigo color
    const sizeNameHtml = `<span style="color: #2563eb; font-weight: 800;">${cleanSz}</span>`;
    
    if (qtyNum > 0) {
        // Always separated by a clear space
        sizeText = `<span style="color: #0f172a; font-weight: 900;">${qtyNum}</span> ${sizeNameHtml}`;
    } else {
        sizeText = sizeNameHtml;
    }
    
    if (note && note.trim()) {
        sizeText += ` <span style="color: #dc2626; font-weight: 700;">(${escapeHTML(note.trim())})</span>`;
    }
    return sizeText;
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
            (o.customer_phone && o.customer_phone.includes(query)) ||
            (o.draft_name && o.draft_name.toLowerCase().includes(query))
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
        const orderDate = _tpdFormatDateWithDayOfWeek(o.order_date);
        const shipDate = _tpdFormatDateWithDayOfWeek(o.expected_ship_date);

        // Render card
        return `
            <div class="tpd-order-card ${isDraft ? 'card-draft' : ''} ${_tpd.activeOrderId == o.id ? 'card-active' : ''}" onclick="${isDraft ? `navigate('design-draft?id=${o.id}')` : `_tpdOpenOrderTechCard(${o.id})`}">
                <div class="card-header">
                    <span class="card-code" style="display: flex; flex-direction: column; gap: 2px;">
                        ${isDraft && o.draft_name ? `<span class="draft-name-label" style="color: #d97706; font-size: 14px; font-weight: 800;">📝 ${escapeHTML(o.draft_name)}</span>` : ''}
                        ${isDraft && (o.order_code || '').startsWith('NHAP-') ? '' : `<span style="${isDraft ? 'font-size: 11px; color: #64748b; font-weight: 500;' : ''}">${escapeHTML(o.order_code || 'CHƯA CÓ MÃ')}</span>`}
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
                        <span class="card-value font-warning">${shipDate}${o.shipping_priority ? ` - <span style="font-weight: 800; color: ${o.shipping_priority === 'GẤP' ? '#dc2626' : o.shipping_priority === 'GỬI' ? '#f59e0b' : '#7c3aed'};">${o.shipping_priority}</span>` : ''}</span>
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
    const orderDate = _tpdFormatDateWithDayOfWeek(o.order_date);
    const shipDate = _tpdFormatDateWithDayOfWeek(o.expected_ship_date);
    const creatorName = (window.currentUser && window.currentUser.username) || o.cskh_name || '—';

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
                        ${(o.is_draft && (o.order_code || '').startsWith('NHAP-')) ? `Tên đơn nháp: <strong>${escapeHTML(o.draft_name || 'ĐƠN NHÁP')}</strong>` : `Mã đơn: <strong>${escapeHTML(o.order_code || 'DRAFT')}</strong>${(o.is_draft && o.draft_name) ? ' (' + escapeHTML(o.draft_name) + ')' : ''}`}
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
                                    <td class="info-label">Người lên đơn:</td>
                                    <td class="info-value">${escapeHTML(creatorName)}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Ngày giao hàng:</td>
                                    <td class="info-value text-bold color-warning">${shipDate}${o.shipping_priority ? ` - <span style="font-weight: 800; color: ${o.shipping_priority === 'GẤP' ? '#dc2626' : o.shipping_priority === 'GỬI' ? '#f59e0b' : '#7c3aed'};">${o.shipping_priority}</span>` : ''}</td>
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
                                                    <span class="tag-mat">${escapeHTML(mp.material_name)} - ${escapeHTML(_tpdFormatColorName(mp.color_name))}</span>
                                                `).join('') : `
                                                    <span class="tag-mat">${escapeHTML(it.material_name || '—')} ${it.color_name ? '- ' + escapeHTML(_tpdFormatColorName(it.color_name)) : ''}</span>
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

// Handle select file for mockup image
function _tpdOnMockupFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    showToast('⏳ Đang đọc file ảnh mockup...', 'info');
    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64 = evt.target.result;
        const state = window._tpdWorkspaceState;
        if (state && state.editingItem) {
            state.editingItem.mockup_image = base64;
            _tpdSaveDraft(state.editingItem);
            _tpdRenderFormInputs();
            _tpdUpdateLivePreview();
            _tpdSetupPasteZones();
            showToast('✅ Đã tải file ảnh mockup thành công!', 'success');
        }
    };
    reader.readAsDataURL(file);
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
            margin-bottom: 6px;
        }

        .tpd-a4-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .tpd-a4-logo {
            height: 64px;
            object-fit: contain;
        }

        .tpd-a4-brand {
            font-size: 24px;
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
            font-size: 15px;
            font-weight: 900;
            color: #dc2626;
            margin-top: 2px;
            letter-spacing: 0.5px;
        }

        /* Metadata info grid */
        .tpd-a4-meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 4px;
            background: #122546;
            border: 1px solid #122546;
            border-radius: 8px;
            padding: 8px 12px;
        }

        .tpd-a4-meta-item {
            font-size: 12.5px;
            line-height: 1.4;
            color: #fad24c;
        }

        .tpd-a4-meta-label {
            font-weight: 700;
            color: #fad24c;
        }

        .tpd-a4-meta-val {
            font-weight: 800;
            color: #fad24c;
        }

        /* Images Layout row */
        .tpd-a4-images-row {
            display: flex;
            justify-content: flex-start;
            gap: 10px;
            height: 84mm; /* Adjusted to fit neatly on A4 */
            margin-bottom: 10px;
        }

        .tpd-a4-mockup-wrapper {
            width: fit-content;
            max-width: 100%;
            border: 1.5px solid #122546;
            border-radius: 8px;
            overflow: auto;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
            position: relative;
            resize: both;
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
            width: fit-content;
            max-width: 100%;
        }

        .tpd-a4-img-body img {
            max-width: 100%;
            height: 100%;
            width: auto;
            object-fit: contain;
            display: block;
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
            body > *:not(#tpdPrintAllSheetsContainer) {
                display: none !important;
            }
            #tpdPrintAllSheetsContainer {
                display: block !important;
            }
            #tpdPrintAllSheetsContainer {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 297mm !important;
                height: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }
            .tpd-print-page {
                width: 297mm !important;
                height: 210mm !important;
                box-sizing: border-box !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                margin: 0 !important;
            }
            .tpd-print-page .tpd-a4-preview-card {
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                width: 297mm !important;
                height: 210mm !important;
                box-sizing: border-box !important;
            }
            .tpd-print-page:not(:last-child) {
                page-break-after: always !important;
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
                        <p class="tpd-ws-subtitle">${(o.is_draft && (o.order_code || '').startsWith('NHAP-')) ? `Tên đơn nháp: <strong>${escapeHTML(o.draft_name || 'ĐƠN NHÁP')}</strong>` : `Mã đơn: <strong>${escapeHTML(o.order_code)}</strong>`}${o.is_draft && !(o.order_code || '').startsWith('NHAP-') && o.draft_name ? ` (${escapeHTML(o.draft_name)})` : ''} | KH: <strong>${escapeHTML(o.customer_name)}</strong> | Sale: <strong>${escapeHTML(o.cskh_name || 'Chưa nhận')}</strong></p>
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
                        <h2 style="font-size: 15px; font-weight: 900; color: #b91c1c; margin: 0; text-transform: uppercase; background: #fff; padding: 4px 8px; border-radius: 4px; display: inline-block;">
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
                            <button class="tpd-btn" onclick="_tpdExportSheetAndOrder()" style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 10px 24px; font-size: 13px; font-weight: 800; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.2); border-radius: 8px;">
                                📤 Xuất Phiếu & Lên Đơn
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>

    `;

    // Ensure printing container is a direct child of document.body
    if (!document.getElementById('tpdPrintAllSheetsContainer')) {
        const printContainer = document.createElement('div');
        printContainer.id = 'tpdPrintAllSheetsContainer';
        document.body.appendChild(printContainer);
    }

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

    // Update URL query parameter without reload
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('sheet', idx + 1);
        window.history.replaceState({}, '', url.toString());
    } catch(e) {}

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
    const config = _tpd.sizeTypesConfig || {};
    const ncList = (config._nc_config && config._nc_config[it.size_type]) || [];

    const filledQuantities = it.quantities || [];
    const sortedQuantities = _tpdSortSizes(filledQuantities.map(q => q.size))
        .map(sz => filledQuantities.find(q => q.size === sz))
        .filter(Boolean)
        .filter(q => Number(q.qty) > 0 || (q.note && q.note.trim()));

    const hasSizes = sortedQuantities.length > 0;
    if (!hasSizes) {
        return '';
    }

    if (_tpdIsNamNuSize(it.size_type)) {
        const namSizes = sortedQuantities.filter(q => q.size.toLowerCase().includes('nam'));
        const nuSizes = sortedQuantities.filter(q => q.size.toLowerCase().includes('nữ') || q.size.toLowerCase().includes('nu'));
        const otherSizes = sortedQuantities.filter(q => !q.size.toLowerCase().includes('nam') && !q.size.toLowerCase().includes('nữ') && !q.size.toLowerCase().includes('nu'));

        const getShortSize = (fullSize) => {
            return fullSize.replace(/^Nam\s+/i, '').replace(/^Nữ\s+/i, '').replace(/^Nu\s+/i, '');
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
                const isNC = qObj ? ncList.includes(qObj.size) : false;
                headers += `<th style="background:#e0f2fe; color:#0369a1; border: 1px solid #cbd5e1; font-weight:700; text-align:center; padding: 4px;${isNC ? ' min-width: 120px;' : ''}">${short}</th>`;
                if (qObj) {
                    if (isNC && qObj.note && qObj.note.trim()) {
                        const cleanNote = qObj.note.trim().replace(/\s*,\s*/g, ', ');
                        values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#0369a1; text-align:center; padding: 4px 6px; background: #fee2e2; min-width: 120px;">
                            <div style="color: #dc2626; font-size: 12px; font-weight: 800;">${qObj.qty || 0}</div>
                            <div style="font-size: 10px; color: #dc2626; font-weight: 800; line-height: 1.1; margin-top: 2px; white-space: nowrap; overflow: visible; text-align: center; display: block;" title="${escapeHTML(cleanNote)}">${escapeHTML(cleanNote)}</div>
                        </td>`;
                    } else {
                        values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#0369a1; text-align:center; padding: 4px 6px;">
                            <div style="font-size: 12px;">${qObj.qty || 0}</div>
                        </td>`;
                    }
                    rowTotal += Number(qObj.qty || 0);
                } else {
                    values += `<td style="border: 1px solid #cbd5e1; background:#f8fafc; color:#cbd5e1; text-align:center; padding: 6px;${isNC ? ' min-width: 120px;' : ''}">-</td>`;
                }
            });
            grandTotal += rowTotal;

            html += `
                <table class="tpd-a4-table" style="border-collapse: collapse; width:100%; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr>
                            <th style="background:#1e3a8a; color:#ffffff; width: 140px; font-weight:bold; border: 1px solid #cbd5e1; text-align:center;">NAM</th>
                            ${headers}
                            <th style="background:#1e3a8a; color:#ffffff; width: 80px; border: 1px solid #cbd5e1; text-align:center;">TỔNG NAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700; color:#1e3a8a; text-align:left; padding-left:12px; font-size:10px; border: 1px solid #cbd5e1; line-height:1.2; width: 140px;">
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
                const isNC = qObj ? ncList.includes(qObj.size) : false;
                headers += `<th style="background:#fce7f3; color:#be185d; border: 1px solid #cbd5e1; font-weight:700; text-align:center; padding: 4px;${isNC ? ' min-width: 120px;' : ''}">${short}</th>`;
                if (qObj) {
                    const isNC = ncList.includes(qObj.size);
                    if (isNC && qObj.note && qObj.note.trim()) {
                        const cleanNote = qObj.note.trim().replace(/\s*,\s*/g, ', ');
                        values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#be185d; text-align:center; padding: 4px 6px; background: #fee2e2; min-width: 120px;">
                            <div style="color: #dc2626; font-size: 12px; font-weight: 800;">${qObj.qty || 0}</div>
                            <div style="font-size: 10px; color: #dc2626; font-weight: 800; line-height: 1.1; margin-top: 2px; white-space: nowrap; overflow: visible; text-align: center; display: block;" title="${escapeHTML(cleanNote)}">${escapeHTML(cleanNote)}</div>
                        </td>`;
                    } else {
                        values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#be185d; text-align:center; padding: 4px 6px;">
                            <div style="font-size: 12px;">${qObj.qty || 0}</div>
                        </td>`;
                    }
                    rowTotal += Number(qObj.qty || 0);
                } else {
                    values += `<td style="border: 1px solid #cbd5e1; background:#f8fafc; color:#cbd5e1; text-align:center; padding: 6px;${isNC ? ' min-width: 120px;' : ''}">-</td>`;
                }
            });
            grandTotal += rowTotal;

            html += `
                <table class="tpd-a4-table" style="border-collapse: collapse; width:100%; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr>
                            <th style="background:#db2777; color:#ffffff; width: 140px; font-weight:bold; border: 1px solid #cbd5e1; text-align:center;">NỮ</th>
                            ${headers}
                            <th style="background:#db2777; color:#ffffff; width: 80px; border: 1px solid #cbd5e1; text-align:center;">TỔNG NỮ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700; color:#db2777; text-align:left; padding-left:12px; font-size:10px; border: 1px solid #cbd5e1; line-height:1.2; width: 140px;">
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
                const isNC = qObj ? ncList.includes(qObj.size) : false;
                headers += `<th style="background:#f1f5f9; color:#475569; border: 1px solid #cbd5e1; font-weight:700; text-align:center; padding: 4px;${isNC ? ' min-width: 120px;' : ''}">${short}</th>`;
                if (qObj) {
                    const isNC = ncList.includes(qObj.size);
                    if (isNC && qObj.note && qObj.note.trim()) {
                        const cleanNote = qObj.note.trim().replace(/\s*,\s*/g, ', ');
                        values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#475569; text-align:center; padding: 4px 6px; background: #fee2e2; min-width: 120px;">
                            <div style="color: #dc2626; font-size: 12px; font-weight: 800;">${qObj.qty || 0}</div>
                            <div style="font-size: 10px; color: #dc2626; font-weight: 800; line-height: 1.1; margin-top: 2px; white-space: nowrap; overflow: visible; text-align: center; display: block;" title="${escapeHTML(cleanNote)}">${escapeHTML(cleanNote)}</div>
                        </td>`;
                    } else {
                        values += `<td style="border: 1px solid #cbd5e1; font-weight:700; color:#475569; text-align:center; padding: 4px 6px;">
                            <div style="font-size: 12px;">${qObj.qty || 0}</div>
                        </td>`;
                    }
                    rowTotal += Number(qObj.qty || 0);
                } else {
                    values += `<td style="border: 1px solid #cbd5e1; background:#f8fafc; color:#cbd5e1; text-align:center; padding: 6px;${isNC ? ' min-width: 120px;' : ''}">-</td>`;
                }
            });
            grandTotal += rowTotal;

            const theme = _tpdGetSizeTheme(it.size_type);

            html += `
                <table class="tpd-a4-table" style="border-collapse: collapse; width:100%; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr>
                            <th style="background:${theme.bg}; color:${theme.text}; width: 140px; font-weight:bold; border: 1px solid #cbd5e1; text-align:center;">KHÁC</th>
                            ${headers}
                            <th style="background:${theme.bg}; color:${theme.text}; width: 80px; border: 1px solid #cbd5e1; text-align:center;">TỔNG KHÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700; color:${theme.bg}; text-align:left; padding-left:12px; font-size:10px; border: 1px solid #cbd5e1; line-height:1.2; width: 140px;">
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
            const isNC = ncList.includes(q.size);
            sizeHeaders += `<th style="${isNC ? 'min-width: 120px;' : ''}">${q.size}</th>`;
            if (isNC && q.note && q.note.trim()) {
                const cleanNote = q.note.trim().replace(/\s*,\s*/g, ', ');
                sizeValues += `<td class="tpd-a4-table-qty-val" style="padding: 4px 5px; background: #fee2e2; min-width: 120px;">
                    <div style="font-weight:700; color: #dc2626; font-size: 12px;">${q.qty || 0}</div>
                    <div style="font-size: 10px; color: #dc2626; font-weight: 800; line-height: 1.1; margin-top: 2px; white-space: nowrap; overflow: visible; text-align: center; display: block;" title="${escapeHTML(cleanNote)}">${escapeHTML(cleanNote)}</div>
                </td>`;
            } else {
                sizeValues += `<td class="tpd-a4-table-qty-val" style="padding: 4px 5px;">
                    <div style="font-weight:700; font-size: 12px;">${q.qty || 0}</div>
                </td>`;
            }
            totalQty += Number(q.qty || 0);
        });

        const theme = _tpdGetSizeTheme(it.size_type);

        let tableHtml = `
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

        return tableHtml;
    }
}

// Adjust mockup wrapper width to match the image's actual rendered width
function _tpdAdjustMockupWidth(img) {
    if (!img) return;
    const wrapper = img.closest('.tpd-a4-mockup-wrapper');
    if (!wrapper) return;
    const body = img.closest('.tpd-a4-img-body');
    if (!body) return;

    let retries = 0;
    const adjust = () => {
        if (!img.naturalHeight) {
            if (retries < 30) {
                retries++;
                setTimeout(adjust, 50);
            } else {
                img.dataset.widthAdjusted = "true";
            }
            return;
        }
        const bodyHeight = body.clientHeight;
        if (bodyHeight > 0) {
            const ratio = img.naturalWidth / img.naturalHeight;
            const targetWidth = Math.ceil(bodyHeight * ratio) + 8; // 8px for body padding (4px on each side)
            wrapper.style.width = targetWidth + 'px';
            img.dataset.widthAdjusted = "true";
        } else if (retries < 30) {
            retries++;
            setTimeout(adjust, 50);
        } else {
            img.dataset.widthAdjusted = "true";
        }
    };
    adjust();
}

// Helper to retrieve or initialize custom layout options for an item index
function _tpdGetCustomLayout(index) {
    const state = window._tpdWorkspaceState;
    if (!state) return { height: '', topSpacing: 7, alignment: 'flex-start', contentEditable: false };

    let it = null;
    if (index === state.activeItemIndex && state.editingItem) {
        it = state.editingItem;
    } else {
        const item = state.items[index];
        it = _tpdCloneItemState(item);
    }

    if (!it) return { height: '', topSpacing: 7, alignment: 'flex-start', contentEditable: false };

    let layout;
    const defLayout = _tpdGetDefaultLayoutConfig();
    if (!it.custom_layout) {
        layout = { ...defLayout };
    } else if (typeof it.custom_layout === 'string') {
        try {
            layout = JSON.parse(it.custom_layout);
        } catch(e) {
            layout = { ...defLayout };
        }
    } else {
        layout = it.custom_layout;
    }

    if (layout.height === undefined || layout.height === '') layout.height = defLayout.height;
    if (layout.topSpacing === undefined) layout.topSpacing = defLayout.topSpacing;
    if (layout.alignment === undefined) layout.alignment = defLayout.alignment;

    // Smart sync sewing techniques from master order item & TSAM pattern
    if (!layout.sewing_items) {
        if (layout.custom_sewing && layout.custom_sewing !== '—') {
            layout.sewing_items = _tpdParseSewingTechs(layout.custom_sewing);
        } else {
            layout.sewing_items = [];
        }
    }

    // Sanitize layout.sewing_items to make sure tech properties are always strings (healing)
    if (Array.isArray(layout.sewing_items)) {
        layout.sewing_items.forEach(item => {
            if (item) {
                item.tech = _tpdExtractString(item.tech);
            }
        });
    }

    const orderTechNames = _tpdGetSewingTechniqueNames(it.sewing_techniques);
    const patternTechNames = _tpdGetSewingTechniqueNames(it.tsam_sewing_tech);
    let uniqueMasterTechs;
    if (orderTechNames.length > 0) {
        uniqueMasterTechs = [...new Set(orderTechNames)];
    } else {
        uniqueMasterTechs = [...new Set(patternTechNames)];
    }

    // 1. Add missing techs from master order / TSAM pattern (and mark them as is_bgm)
    uniqueMasterTechs.forEach(techName => {
        const existingItem = layout.sewing_items.find(x => x.tech === techName);
        if (existingItem) {
            existingItem.is_bgm = true;
        } else {
            layout.sewing_items.push({ tech: techName, detail: '', is_bgm: true });
        }
    });

    // Tag any other items that match master tech names as is_bgm
    layout.sewing_items.forEach(item => {
        if (item && uniqueMasterTechs.includes(item.tech)) {
            item.is_bgm = true;
        }
    });

    // 2. Remove techs not in master order (under Option A: only if details are empty AND it was a BGM tag)
    layout.sewing_items = layout.sewing_items.filter(item => {
        const inMaster = uniqueMasterTechs.includes(item.tech);
        if (inMaster) return true;
        
        // If it was NOT a synced BGM tag, it was manually added by user -> KEEP IT!
        if (!item.is_bgm) return true;

        // If it was a BGM tag but is no longer in the master list -> keep ONLY if it has custom details
        return item.detail && item.detail.trim().length > 0;
    });

    // Sort sewing items by group priority
    if (Array.isArray(layout.sewing_items)) {
        _tpdSortBySewingGroup(layout.sewing_items, x => x.tech);
    }

    // Sync back to custom_sewing string representation
    _tpdSyncCustomSewingText(layout);

    it.custom_layout = layout;
    return layout;
}

function _tpdChangeLayoutHeight(val) {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    layout.height = Number(val);
    _tpdUpdateLivePreview();
    const lbl = document.getElementById('tpd_lbl_height');
    if (lbl) lbl.innerText = val + 'mm';
    _tpdSaveDraft(state.editingItem);
}

// Reset wrapper height to auto/dynamic behavior
function _tpdResetLayoutHeight() {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    layout.height = 'auto';
    _tpdUpdateLivePreview();
    _tpdRenderFormInputs();
    _tpdSaveDraft(state.editingItem);
}

function _tpdChangeLayoutSpacing(val) {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    layout.topSpacing = Number(val);
    _tpdUpdateLivePreview();
    const lbl = document.getElementById('tpd_lbl_spacing');
    if (lbl) lbl.innerText = val + 'px';
    _tpdSaveDraft(state.editingItem);
}

function _tpdChangeLayoutAlignment(val) {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    layout.alignment = val;
    _tpdUpdateLivePreview();
    _tpdRenderFormInputs();
    _tpdSaveDraft(state.editingItem);
}

function _tpdChangeLayoutEditable(checked) {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    layout.contentEditable = checked;
    _tpdUpdateLivePreview();
    _tpdSaveDraft(state.editingItem);
}

// Load global default layout settings from server
async function _tpdLoadLayoutConfig() {
    try {
        const res = await apiCall(`/api/dht/layout-config?_=${Date.now()}`, 'GET');
        if (res && !res.error) {
            _tpd.defaultLayoutConfig = res;
        }
    } catch (e) {
        console.error('Failed to load layout config:', e);
    }
    if (!_tpd.defaultLayoutConfig) {
        _tpd.defaultLayoutConfig = { height: '', topSpacing: 7, alignment: 'flex-start', contentEditable: false };
    }
}

// Get the default layout configuration object fallback
function _tpdGetDefaultLayoutConfig() {
    const def = _tpd.defaultLayoutConfig || { height: '', topSpacing: 7, alignment: 'flex-start', contentEditable: false };
    return {
        height: def.height !== undefined ? def.height : '',
        topSpacing: def.topSpacing !== undefined ? def.topSpacing : 7,
        alignment: def.alignment !== undefined ? def.alignment : 'flex-start',
        contentEditable: def.contentEditable !== undefined ? def.contentEditable : false
    };
}

// Save the active sheet layout configuration as the global system default
async function _tpdSaveAsGlobalDefaultLayout() {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    
    const defaultData = {
        height: layout.height !== undefined ? layout.height : '',
        topSpacing: layout.topSpacing !== undefined ? layout.topSpacing : 7,
        alignment: layout.alignment !== undefined ? layout.alignment : 'flex-start'
    };

    try {
        const res = await apiCall('/api/dht/layout-config', 'PUT', defaultData);
        if (res && res.success) {
            _tpd.defaultLayoutConfig = { ..._tpd.defaultLayoutConfig, ...defaultData };
            showToast('Đã lưu bố cục làm mặc định cho toàn bộ hệ thống thành công!', 'success');
        } else {
            showToast(res && res.error ? res.error : 'Lỗi khi lưu cấu hình mặc định', 'danger');
        }
    } catch (e) {
        console.error(e);
        showToast('Không thể lưu cấu hình mặc định hệ thống', 'danger');
    }
}

function _tpdChangeLayoutRedSheet(checked) {
    const state = window._tpdWorkspaceState;
    if (!state) return;

    // 1. Update the active item
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    layout.is_red_sheet = checked;
    _tpdSaveDraft(state.editingItem);

    // 2. Automatically propagate to all other sheets in this order
    state.items.forEach((item, idx) => {
        if (idx === state.activeItemIndex) return;

        // Load the cloned item state (reads from localStorage if exists, otherwise original item)
        let it = _tpdCloneItemState(item);
        if (it) {
            const defLayout = _tpdGetDefaultLayoutConfig();
            if (!it.custom_layout) {
                it.custom_layout = { ...defLayout };
            } else if (typeof it.custom_layout === 'string') {
                try { it.custom_layout = JSON.parse(it.custom_layout); } catch(e) {
                    it.custom_layout = { ...defLayout };
                }
            }
            it.custom_layout.is_red_sheet = checked;
            _tpdSaveDraft(it);
        }

        // Also update in-memory state.items so that it's up to date
        const defLayout = _tpdGetDefaultLayoutConfig();
        if (!item.custom_layout) {
            item.custom_layout = { ...defLayout };
        } else if (typeof item.custom_layout === 'string') {
            try { item.custom_layout = JSON.parse(item.custom_layout); } catch(e) {
                item.custom_layout = { ...defLayout };
            }
        }
        item.custom_layout.is_red_sheet = checked;
    });

    _tpdUpdateLivePreview();
    _tpdRenderFormInputs();
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
    const orderDate = _tpdFormatDateWithDayOfWeek(o.order_date);
    const shipDate = _tpdFormatDateWithDayOfWeek(o.expected_ship_date);
    const creatorName = (window.currentUser && window.currentUser.username) || o.cskh_name || '—';

    // Build department deep link QR url
    const deepLink = `${window.location.origin}/taophieudonhang?id=${o.id}&activeTab=${state.activeItemIndex}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;

    const mockupSrc = it.mockup_image || '';

    // Layout options
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    const customHeight = (layout.height && layout.height !== 'auto') ? layout.height + 'mm' : _tpdGetImagesRowHeight(it);
    const alignmentStyle = `justify-content: ${layout.alignment || 'flex-start'};`;
    const metaMarginStyle = `margin-bottom: ${layout.topSpacing !== undefined ? layout.topSpacing : 7}px;`;

    container.innerHTML = `
        <div class="tpd-a4-preview-card" id="tpdPrintSheet" ${layout.contentEditable ? 'contenteditable="true"' : ''}>
            <!-- Header Block -->
            <div class="tpd-a4-header" contenteditable="false" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #122546; padding-bottom: 6px; margin-bottom: 6px;">
                <div class="tpd-a4-header-left" style="display: flex; align-items: center; gap: 12px;">
                    <img src="/images/logo.png" class="tpd-a4-logo" style="height: 64px; object-fit: contain;" onerror="this.style.display='none'">
                    <span class="tpd-a4-brand" style="font-size: 24px; font-weight: 900; color: #122546; text-transform: uppercase; letter-spacing: 0.5px;">ĐỒNG PHỤC <span class="tpd-a4-brand-gold" style="color: #fad24c; font-weight: 900;">HV</span></span>
                </div>
                <div class="tpd-a4-header-center" style="text-align: center; flex: 1; margin-right: 20px;">
                    <h1 class="tpd-a4-title" style="font-size: 22px; font-weight: 900; color: #122546; margin: 0; text-transform: uppercase;">PHIẾU SẢN XUẤT</h1>
                    <div class="tpd-a4-order-code" style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 2px; letter-spacing: 0.5px;">${(o.is_draft && (o.order_code || '').startsWith('NHAP-')) ? `TÊN ĐƠN NHÁP: ${escapeHTML((o.draft_name || 'ĐƠN NHÁP').toUpperCase())}` : `MÃ ĐƠN: ${escapeHTML(o.order_code.toUpperCase())}`} | PHIẾU ${state.activeItemIndex + 1}/${state.items.length}</div>
                </div>
                <div class="tpd-a4-header-right-qr" style="display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1.5px solid #122546; border-radius: 6px; padding: 4px 6px; background: #ffffff; margin-top: -10px;">
                    <img src="${qrUrl}" style="width: 80px; height: 80px; object-fit: contain;">
                    <span style="font-size: 7px; font-weight: 800; color: #122546; text-transform: uppercase; white-space: nowrap;">Quét mã tiến độ</span>
                </div>
            </div>

            <!-- Metadata info grid -->
            ${(() => {
                const isSourceVip = !!(o && ['VT', 'HVVT'].includes(o.source));
                const isRedSheet = isSourceVip ? true : ((layout && typeof layout.is_red_sheet === 'boolean') ? layout.is_red_sheet : false);
                const gridStyle = isRedSheet ? 'background: #dc2626 !important; border-color: #dc2626 !important;' : '';
                const itemStyle = isRedSheet ? 'color: #ffffff !important;' : '';
                return `
                    <div class="tpd-a4-meta-grid" style="${metaMarginStyle} ${gridStyle}">
                        <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Khách hàng:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.customer_name || '—'}</span></div>
                        <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Người lên đơn:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${creatorName}</span></div>
                        <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Thiết kế:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.designer_name || '—'}</span></div>
                        <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Ngày lên đơn:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${orderDate}</span></div>
                    </div>
                `;
            })()}

            <!-- Images Row -->
            <div class="tpd-a4-images-row" style="height: ${customHeight}; ${alignmentStyle}">
                <div class="tpd-a4-mockup-wrapper" contenteditable="false" style="width: fit-content; max-width: 100%; height: 100%; min-width: 120px;">
                    <div class="tpd-a4-img-header">Ảnh Thiết Kế Mockup lớn</div>
                    <div class="tpd-a4-img-body" id="prev_mockup_container">
                        ${mockupSrc ? `<img src="${mockupSrc}" onload="_tpdAdjustMockupWidth(this)" onclick="_tpdViewFullImage('${mockupSrc}')" style="cursor: pointer;">` : `<div class="tpd-a4-img-placeholder">Chưa có ảnh Mockup<br><span style="font-size:10px; color:#cbd5e1;">Tải lên ảnh từ bảng bên phải</span></div>`}
                    </div>
                </div>
                ${_tpdGetInfoBoxHtml(it, layout, o)}
            </div>

            <!-- Size breakdown table -->
            <div class="tpd-a4-table-row" style="display: none;">
                ${_tpdRenderA4SizeTable(it)}
            </div>


        </div>
    `;
}

const POSITION_ORDER = ["Ngực", "Lưng", "Bụng", "Tay Trái", "Tay Phải", "Gáy"];

function _tpdSortPrintDetails(details) {
    if (!Array.isArray(details)) return [];
    return [...details].sort((a, b) => {
        const idxA = POSITION_ORDER.indexOf(a.position);
        const idxB = POSITION_ORDER.indexOf(b.position);
        const valA = idxA === -1 ? 999 : idxA;
        const valB = idxB === -1 ? 999 : idxB;
        if (valA !== valB) {
            return valA - valB;
        }
        return (a.position || '').localeCompare(b.position || '');
    });
}

function _tpdGetMappedOffsets(d, posConfig) {
    const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
    const posOffsets = posConfig ? (posConfig.offsets || []) : [];
    
    // Fallback if legacy config style
    let normalizedConfigOffsets = [...posOffsets];
    if (normalizedConfigOffsets.length === 0 && posConfig && (posConfig.has_offset || posConfig.require_offset || posConfig.offset_label)) {
        normalizedConfigOffsets = [{
            label: posConfig.offset_label || 'Khoảng cách',
            placeholder: posConfig.offset_placeholder || 'Ví dụ: 10cm',
            require: !!posConfig.require_offset
        }];
    }
    
    // Predefined labels in the config
    const predefinedLabels = normalizedConfigOffsets.map(o => o.label).filter(l => l !== '');
    
    // Keys in selectedOffsets that are not predefined
    const selectedKeys = Object.keys(selectedOffsets);
    const customKeys = selectedKeys.filter(k => !predefinedLabels.includes(k));
    
    let customKeyIdx = 0;
    
    // Map each config offset to a label and value
    return normalizedConfigOffsets.map((off, offIdx) => {
        if (off.label !== '') {
            const isChecked = selectedOffsets[off.label] !== undefined;
            return {
                configLabel: off.label,
                isPredefined: true,
                label: off.label,
                value: isChecked ? selectedOffsets[off.label] : '',
                isChecked,
                placeholder: off.placeholder,
                require: off.require
            };
        } else {
            // This is a custom/dynamic offset config
            // See if there is an available custom key
            let label = '';
            let value = '';
            let isChecked = false;
            if (customKeyIdx < customKeys.length) {
                label = customKeys[customKeyIdx];
                value = selectedOffsets[label] || '';
                isChecked = true;
                customKeyIdx++;
            } else {
                // Tên khoảng cách để trống thì mặc định BẮT BUỘC ĐIỀN
                let defaultName = `_custom_offset_${offIdx + 1}`;
                let counter = 1;
                while (selectedOffsets[defaultName] !== undefined) {
                    defaultName = `_custom_offset_${offIdx + 1}_${counter}`;
                    counter++;
                }
                selectedOffsets[defaultName] = '';
                label = defaultName;
                value = '';
                isChecked = true;
                customKeys.push(defaultName);
                customKeyIdx++;
            }
            return {
                configLabel: '',
                isPredefined: false,
                label: label,
                value: value,
                isChecked: true, // Luôn tích chọn vì bắt buộc
                placeholder: off.placeholder,
                require: true // Không điền tên thì mặc định bắt buộc điền
            };
        }
    });
}

function _tpdNormalizePrintDetailOffsets(d, posConfig) {
    if (d && typeof d.selected_offsets === 'string') {
        try {
            d.selected_offsets = JSON.parse(d.selected_offsets);
        } catch(e) {
            d.selected_offsets = null;
        }
    }
    if (d && (!d.selected_offsets || typeof d.selected_offsets !== 'object')) {
        d.selected_offsets = {};
        // Migration from legacy single offset
        const legacyVal = d.offset_value || d.gay_xuong || d.co_xuong || '';
        let posOffsets = posConfig ? (posConfig.offsets || []) : [];
        if (posOffsets.length === 0 && posConfig && (posConfig.has_offset || posConfig.require_offset || posConfig.offset_label)) {
            posOffsets = [{
                label: posConfig.offset_label || 'Khoảng cách',
                placeholder: posConfig.offset_placeholder || 'Ví dụ: 10cm',
                require: !!posConfig.require_offset
            }];
        }
        if (legacyVal && posOffsets.length > 0) {
            d.selected_offsets[posOffsets[0].label] = legacyVal;
        } else {
            posOffsets.forEach((off, offIdx) => {
                if (off.require || off.label === '') { // Label rỗng thì mặc định require
                    const defaultName = off.label || `_custom_offset_${offIdx + 1}`;
                    d.selected_offsets[defaultName] = '';
                }
            });
        }
    }
    return d ? d.selected_offsets : {};
}

function _tpdIsPrintDetailComplete(d) {
    if (!d || !d.position) return false;
    
    const isPrint3D = d.print_type === 'In 3D' || (d.position && d.position.toLowerCase().includes('in 3d'));
    const printType = isPrint3D ? 'In 3D' : (d.print_type || '').trim();
    if (!printType || printType === '-- Kiểu in/thêu --') return false;
    
    if (!isPrint3D) {
        const hasWidth = d.width && d.width.trim();
        const hasHeight = d.height && d.height.trim();
        const hasDim = d.dimension && d.dimension.trim();
        if (!hasWidth && !hasHeight && !hasDim) return false;
    }
    
    const posConfig = (window._tpd?.printPositionsConfig || []).find(p => p.name === d.position);
    if (posConfig) {
        const mapped = _tpdGetMappedOffsets(d, posConfig);
        for (const item of mapped) {
            if (item.require) {
                if (!item.isChecked || !item.value || !item.value.trim()) return false;
                if (!item.isPredefined) {
                    if (!item.label || !item.label.trim() || item.label.startsWith('_custom_offset_')) return false;
                }
            }
        }
    }
    return true;
}

// Generate the Right inputs form editor UI
function _tpdRenderFormInputs() {
    const container = document.getElementById('tpdWorkspaceFormContainer');
    if (!container) return;

    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    const layout = _tpdGetCustomLayout(state.activeItemIndex);

    const disabledAttr = state.hasEditPermission ? '' : 'disabled';

    // Compute defaults for overrides placeholders
    let defaultSewing = '—';
    const orderTechNames = _tpdGetSewingTechniqueNames(it.sewing_techniques);
    const patternTechNames = _tpdGetSewingTechniqueNames(it.tsam_sewing_tech);
    if (orderTechNames.length > 0) {
        defaultSewing = orderTechNames.join(', ');
    } else if (patternTechNames.length > 0) {
        defaultSewing = patternTechNames.join(', ');
    }

    const isSourceVip = !!(state.order && ['VT', 'HVVT'].includes(state.order.source));
    const isRedSheet = isSourceVip ? true : ((layout && typeof layout.is_red_sheet === 'boolean') ? layout.is_red_sheet : false);

    // 1. Text Fields (Sản phẩm, Chất liệu vải, Màu sắc phối)
    let html = `
        <div class="tpd-ws-form-group" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="tpdRedSheetCheckbox" ${isRedSheet ? 'checked' : ''} onchange="_tpdChangeLayoutRedSheet(this.checked)" style="width: 18px; height: 18px; cursor: pointer;" ${disabledAttr || isSourceVip ? 'disabled' : ''}>
            <label for="tpdRedSheetCheckbox" style="font-weight: 800; color: #dc2626; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; gap: 4px; margin: 0;">
                🔴 PHIẾU ĐỎ (Khách hàng VIP)
            </label>
        </div>

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
                <input type="text" class="tpd-ws-input" value="${escapeHTML(_tpdFormatColorName(it.color_name))}" placeholder="Navy phối vàng, đen..." disabled style="background:#f1f5f9; color:#94a3b8; cursor:not-allowed; border-color:#e2e8f0;">
            </div>
        </div>
    `;

    // 2. Kỹ Thuật May (Smart Sync is already handled in _tpdGetCustomLayout)
    if (!layout.sewing_items) {
        layout.sewing_items = [];
    }

    let sewingListHtml = '';
    const normalizedConfig = _tpdGetNormalizedSewingTechs();
    const configSewingTechs = normalizedConfig.map(c => c.tech);

    if (layout.sewing_items.length === 0) {
        sewingListHtml = `
            <div style="padding: 10px; text-align: center; color: #94a3b8; font-size: 11px; border: 1.5px dashed #cbd5e1; border-radius: 8px; margin-bottom: 10px; background: #f8fafc;">
                Chưa chọn kỹ thuật may nào. Mặc định sẽ dùng: ${escapeHTML(defaultSewing)}
            </div>
        `;
    } else {
        sewingListHtml = layout.sewing_items.map((sewItem, sIdx) => {
            const isCustom = !configSewingTechs.includes(sewItem.tech) && sewItem.tech !== 'Khác';
            const groups = {};
            normalizedConfig.forEach(c => {
                const groupName = c.group || 'Khác';
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(c.tech);
            });

            let selectOptions = '';
            for (const [groupName, techs] of _tpdSortGroups(groups)) {
                if (techs.length > 0) {
                    selectOptions += `<optgroup label="${escapeHTML(groupName)}">`;
                    techs.forEach(t => {
                        const selected = t === sewItem.tech ? 'selected' : '';
                        let disabled = '';
                        if (groupName !== 'Khác' && t !== sewItem.tech) {
                            const isGroupAlreadyChosen = layout.sewing_items.some((otherItem, otherIdx) => {
                                if (otherIdx === sIdx) return false;
                                const isPredefined = configSewingTechs.includes(otherItem.tech);
                                if (!isPredefined) return false;
                                return _tpdGetSewingTechGroup(otherItem.tech) === groupName;
                            });
                            if (isGroupAlreadyChosen) {
                                disabled = 'disabled';
                            }
                        }
                        selectOptions += `<option value="${escapeHTML(t)}" ${selected} ${disabled}>${escapeHTML(t)}</option>`;
                    });
                    selectOptions += `</optgroup>`;
                }
            }


            const otherSelected = sewItem.tech === 'Khác' || isCustom ? 'selected' : '';
            const techSelectId = `tpd_sew_tech_${sIdx}`;
            const customInputHtml = (sewItem.tech === 'Khác' || isCustom) ? `
                <input type="text" placeholder="Nhập kỹ thuật khác..." value="${escapeHTML(isCustom ? sewItem.tech : '')}" onchange="_tpdUpdateSewingItem(${sIdx}, 'tech', this.value)" class="tpd-ws-input" style="font-size: 11px; height: 26px; flex: 1; min-width: 100px; padding: 2px 6px;" ${disabledAttr}>
            ` : '';

            return `
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <select id="${techSelectId}" onchange="_tpdUpdateSewingItem(${sIdx}, 'tech', this.value)" class="tpd-ws-input" style="font-size: 11px; height: 26px; width: 110px; padding: 2px 4px;" ${disabledAttr}>
                                ${selectOptions}
                                <option value="Khác" ${otherSelected}>Kỹ thuật khác...</option>
                            </select>
                            ${customInputHtml}
                        </div>
                        <input type="text" placeholder="Nhập thông tin chi tiết (Ví dụ: Navy phối 2 sọc trắng, chỉ vàng...)" value="${escapeHTML(sewItem.detail || '')}" onchange="_tpdUpdateSewingItem(${sIdx}, 'detail', this.value)" class="tpd-ws-input" style="font-size: 11px; height: 26px; flex: 1;" ${disabledAttr}>
                    </div>
                    ${state.hasEditPermission ? `
                        <button type="button" class="btn-remove-detail" onclick="_tpdRemoveSewingItem(${sIdx})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; font-size: 14px;" title="Xóa">✕</button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    html += `
        <div class="tpd-ws-form-group" style="margin-top: 10px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="tpd-ws-form-label" style="margin-bottom: 0;">Kỹ Thuật May</label>
                ${state.hasEditPermission ? `
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" class="btn btn-primary" onclick="_tpdAddSewingItem()" style="padding: 2px 8px; font-size: 11px; height: 24px; border-radius: 4px; font-weight: 700; background: #122546; border: 1px solid #122546; color: white;">+ Thêm</button>
                        ${state.role === 'giam_doc' ? `
                            <button type="button" class="btn btn-secondary" onclick="_tpdOpenSewingTechsConfigModal()" style="padding: 2px 6px; font-size: 12px; height: 24px; border-radius: 4px; font-weight: 700; background: #64748b; border: 1px solid #64748b; color: white;" title="Cấu hình danh sách kỹ thuật may">⚙️</button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div style="background: #ffffff; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
                ${sewingListHtml}
            </div>
        </div>
    `;

    // 3. Vị trí in / thêu chi tiết
    const details = (it.print_details || [])
        .map((d, idx) => ({ ...d, originalIndex: idx }));

    const posWeights = {
        'ngực': 1,
        'lưng': 2,
        'bụng': 3,
        'tay trái': 4,
        'tay phải': 5,
        'gáy': 6
    };
    details.sort((a, b) => {
        const aPos = (a.position || '').trim().toLowerCase();
        const bPos = (b.position || '').trim().toLowerCase();
        let aW = 999;
        let bW = 999;
        for (const [k, w] of Object.entries(posWeights)) {
            if (aPos === k || aPos.startsWith(k)) { aW = w; break; }
        }
        for (const [k, w] of Object.entries(posWeights)) {
            if (bPos === k || bPos.startsWith(k)) { bW = w; break; }
        }
        if (aW !== bW) return aW - bW;
        return aPos.localeCompare(bPos, 'vi');
    });

    let detailBoxesHtml = '';
    details.forEach((d) => {
        const idx = d.originalIndex;
        const configPrintTypes = _tpd.printTypesConfig || ["Thêu", "In PET", "In 3D", "In lưới", "In Decal"];
        const isPrint3DPosition = d.position && d.position.toLowerCase().includes('in 3d');
        
        let localTypes = [...configPrintTypes];
        if (!isPrint3DPosition) {
            localTypes = localTypes.filter(t => t.toLowerCase() !== 'in 3d');
        }

        if (d.print_type && d.print_type.trim() && !localTypes.includes(d.print_type)) {
            localTypes.push(d.print_type);
        }
        
        if (isPrint3DPosition) {
            d.print_type = 'In 3D';
            d.width = '';
            d.height = '';
        }

        let valWidth = isPrint3DPosition ? '' : (d.width || '');
        let valHeight = isPrint3DPosition ? '' : (d.height || '');
        if (!isPrint3DPosition && !valWidth && !valHeight && d.dimension && d.dimension.trim()) {
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

        const isTypeMissing = !d.print_type || !d.print_type.trim();
        const isDimMissing = !isPrint3DPosition && !valWidth && !valHeight;
        
        const typeStyle = isTypeMissing 
            ? 'flex: 1; padding: 2px; font-size: 9px; height: 18px; border-radius: 4px; border: 1.5px solid #ef4444; background: #fef2f2; outline: none;' 
            : 'flex: 1; padding: 2px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none; background: #fff;';
            
        const widthStyle = isDimMissing 
            ? 'flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1.5px solid #ef4444; background: #fef2f2; outline: none;' 
            : 'flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none;';
            
        const heightStyle = isDimMissing 
            ? 'flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1.5px solid #ef4444; background: #fef2f2; outline: none;' 
            : 'flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none;';

        const imgSrc = d.image || '';
        const imageZoneHtml = `
            <div style="display: none; margin-top: 4px; border-top: 1px dashed #f1f5f9; padding-top: 4px;">
                <span style="font-size: 9px; color: #64748b; font-weight: 700; display: block; margin-bottom: 2px;">Ảnh vị trí:</span>
                <div class="tpd-ws-upload-box paste-target" data-zone="detail_${idx}" style="min-height: 60px; cursor: pointer; padding: 4px; border-radius: 6px; position: relative; display: flex; align-items: center; justify-content: center; border: 1.5px dashed #cbd5e1; background: #f8fafc; transition: all 0.2s;">
                    ${imgSrc ? `
                        <button type="button" class="tpd-ws-upload-clear" onclick="event.stopPropagation(); _tpdClearZone('detail_${idx}')" style="background:#ef4444; border: none; color: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 8px; cursor: pointer; position: absolute; top: 2px; right: 2px; z-index: 10;" ${disabledAttr}>✕</button>
                        <img src="${imgSrc}" class="tpd-ws-upload-preview" style="max-height:50px; max-width: 100%; object-fit: contain;">
                    ` : `
                        <div style="text-align: center; line-height: 1;">
                            <span class="tpd-ws-upload-icon" style="font-size: 11px; display: block; margin-bottom: 1px;">📋</span>
                            <span class="tpd-ws-upload-text" style="font-size: 8px; color: #64748b;">Dán ảnh (Ctrl+V)</span>
                        </div>
                    `}
                </div>
            </div>
        `;

        detailBoxesHtml += `
            <div class="tpd-ws-detail-card" style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #ffffff; display: flex; flex-direction: column; gap: 6px; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <!-- Clear / Delete button -->
                <button type="button" class="tpd-ws-upload-clear" onclick="event.stopPropagation(); _tpdRemoveDetailZone(${idx})" style="background:#ef4444; position: absolute; top: 4px; right: 4px; border: none; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; line-height: 1; z-index: 10;" title="Xóa vị trí này" ${disabledAttr}>✕</button>
                
                <!-- Position title -->
                <div style="font-size: 12px; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 2px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                    📍 ${d.position}
                </div>

                <!-- Input Controls -->
                <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span style="font-size: 9px; color: #64748b; min-width: 38px; font-weight: 700;">Kiểu:</span>
                        <select onchange="_tpdUpdateDetailField(${idx}, 'print_type', this.value)" class="tpd-ws-input" style="${typeStyle}" ${disabledAttr || isPrint3DPosition ? 'disabled' : ''}>
                            <option value="">-- Kiểu in/thêu --</option>
                            ${localTypes.map(t => `<option value="${t}" ${d.print_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>

                    ${isPrint3DPosition ? `
                        <div style="display: flex; align-items: center; justify-content: center; height: 18px; background: #f8fafc; border-radius: 4px; border: 1px dashed #cbd5e1; padding: 2px 4px; box-sizing: border-box;">
                            <span style="font-size: 8px; color: #64748b; font-weight: 700;">✨ In 3D tràn thân (Không kích thước)</span>
                        </div>
                    ` : `
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span style="font-size: 9px; color: #64748b; font-weight: 700;">Ngang:</span>
                            <input id="tpd_width_${idx}" type="text" placeholder="8cm" value="${valWidth}" oninput="document.getElementById('tpd_height_${idx}').disabled = !!this.value.trim()" onchange="_tpdUpdateDetailField(${idx}, 'width', this.value)" class="tpd-ws-input" style="${widthStyle}" ${disabledAttr || (valHeight ? 'disabled' : '')}>
                            <span style="font-size: 9px; color: #64748b; font-weight: 700; margin-left: 2px;">Cao:</span>
                            <input id="tpd_height_${idx}" type="text" placeholder="10cm" value="${valHeight}" oninput="document.getElementById('tpd_width_${idx}').disabled = !!this.value.trim()" onchange="_tpdUpdateDetailField(${idx}, 'height', this.value)" class="tpd-ws-input" style="${heightStyle}" ${disabledAttr || (valWidth ? 'disabled' : '')}>
                        </div>
                    `}

                    ${(() => {
                        const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
                        if (!posConfig) return '';
                        
                        const mapped = _tpdGetMappedOffsets(d, posConfig);
                        if (mapped.length === 0) return '';
                        
                        return mapped.map((item, oIdx) => {
                            const inputPlaceholder = item.placeholder || 'Ví dụ: 10cm';
                            const borderBgStyle = (item.require && item.isChecked && !item.value.trim()) 
                                ? 'border: 1.5px solid #ef4444; background: #fef2f2;' 
                                : 'border: 1px solid #cbd5e1;';
                            
                            if (item.isPredefined) {
                                return `
                                    <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                                        <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; color: #475569; margin: 0; cursor: pointer; min-width: 75px;">
                                            <input type="checkbox" ${item.isChecked ? 'checked' : ''} onchange="_tpdToggleDetailOffset(${idx}, '${item.configLabel}', this.checked, ${oIdx})" style="width: 12px; height: 12px; margin: 0; cursor: pointer;" ${disabledAttr}>
                                            <span>${item.label}:</span>
                                        </label>
                                        <input type="text" placeholder="${inputPlaceholder}" value="${item.value}" onchange="_tpdUpdateDetailOffsetVal(${idx}, '${item.configLabel}', this.value, ${oIdx})" class="tpd-ws-input" style="flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; outline: none; ${borderBgStyle}" ${disabledAttr} ${item.isChecked ? '' : 'disabled'}>
                                    </div>
                                `;
                            } else {
                                const isTempLabel = item.label.startsWith('_custom_offset_');
                                const displayLabel = isTempLabel ? '' : item.label;
                                const isLabelInvalid = !displayLabel || !displayLabel.trim();
                                const labelBorderStyle = isLabelInvalid
                                    ? 'border: 1.5px solid #ef4444; background: #fef2f2;' 
                                    : 'border: 1px solid #cbd5e1;';
                                
                                return `
                                    <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                                        <input type="checkbox" checked disabled style="width: 12px; height: 12px; margin: 0; cursor: not-allowed;">
                                        <input type="text" placeholder="Tên khoảng cách..." value="${displayLabel}" onchange="_tpdUpdateDetailOffsetLabel(${idx}, '${item.label}', this.value, ${oIdx})" style="width: 75px; font-size: 9px; font-weight: 700; color: #475569; padding: 2px 4px; height: 18px; outline: none; border-radius: 4px; ${labelBorderStyle}" ${disabledAttr}>
                                        <input type="text" placeholder="${inputPlaceholder}" value="${item.value}" onchange="_tpdUpdateDetailOffsetVal(${idx}, '', this.value, ${oIdx})" class="tpd-ws-input" style="flex: 1; min-width: 0; padding: 2px 4px; font-size: 9px; height: 18px; border-radius: 4px; outline: none; ${borderBgStyle}" ${disabledAttr}>
                                    </div>
                                `;
                            }
                        }).join('');
                    })()}

                    ${imageZoneHtml}
                </div>
            </div>
        `;
    });

    html += `
        <div class="tpd-ws-form-group" style="margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label class="tpd-ws-form-label" style="margin-bottom:0;">Vị trí in / thêu chi tiết</label>
                ${state.hasEditPermission ? `
                    <div style="display:flex; gap:6px; align-items:center;">
                        <select id="tpdNewPositionSelect" class="tpd-ws-input" style="padding:2px 6px; font-size:11px; height:24px; width:110px; border-radius:4px;">
                            ${(_tpd.printPositionsConfig || []).map(p => `
                                <option value="${p.name}">${p.name}</option>
                            `).join('')}
                            <option value="Vị Trí Khác">Vị Trí Khác...</option>
                        </select>
                        <button type="button" class="btn btn-primary" onclick="_tpdAddPosition()" style="padding:2px 8px; font-size:11px; height:24px; border-radius:4px; font-weight:700; background:#122546; border:1px solid #122546; color: white;">Thêm</button>
                        ${state.role === 'giam_doc' ? `
                            <button type="button" class="btn btn-secondary" onclick="_tpdOpenPrintPositionsConfigModal()" style="padding:2px 6px; font-size:12px; height:24px; border-radius:4px; font-weight:700; background:#64748b; border:1px solid #64748b; color: white;" title="Cấu hình vị trí in/thêu">⚙️</button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="tpd-ws-upload-row" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
                ${detailBoxesHtml || `<div style="grid-column:1/-1; padding:20px; text-align:center; color:#94a3b8; font-size:11px; font-weight:600; border:2px dashed #cbd5e1; border-radius:10px;">Chưa thêm vị trí in/thêu nào.</div>`}
            </div>
        </div>
    `;

    // 4. Size Selection & Quantities Grid
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
                ${_tpdIsNamNuSize(currentSizeType) ? (() => {
                    const sorted = _tpdSortSizes(configuredSizes);
                    const namSizes = sorted.filter(sz => sz.toLowerCase().startsWith('nam'));
                    const nuSizes = sorted.filter(sz => sz.toLowerCase().startsWith('nữ'));
                    const otherSizes = sorted.filter(sz => !sz.toLowerCase().startsWith('nam') && !sz.toLowerCase().startsWith('nữ'));
                    
                    const renderSizeCheck = (sz) => {
                        const isActive = it.quantities.some(q => q.size === sz);
                        return `
                            <label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; cursor:pointer; font-weight:500; margin:0; padding: 2px 4px;">
                                <input type="checkbox" style="cursor:pointer; margin:0;" ${isActive ? 'checked' : ''} onchange="_tpdToggleSizeActive('${sz}', this.checked)" ${disabledAttr}>
                                <span>${sz}</span>
                            </label>
                        `;
                    };
                    
                    return `
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${namSizes.length > 0 ? `
                                <div style="display:flex; align-items:center; gap:8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                                    <span style="font-size:10px; font-weight:800; color:#1e3a8a; min-width:40px;">NAM:</span>
                                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                                        ${namSizes.map(renderSizeCheck).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${nuSizes.length > 0 ? `
                                <div style="display:flex; align-items:center; gap:8px; padding-top: 2px;">
                                    <span style="font-size:10px; font-weight:800; color:#db2777; min-width:40px;">NỮ:</span>
                                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                                        ${nuSizes.map(renderSizeCheck).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${otherSizes.length > 0 ? `
                                <div style="display:flex; align-items:center; gap:8px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                                    <span style="font-size:10px; font-weight:800; color:#ea580c; min-width:40px;">KHÁC:</span>
                                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                                        ${otherSizes.map(renderSizeCheck).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                })() : `
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
                `}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <label class="tpd-ws-form-label" style="margin-bottom:0;">Phân bổ Số lượng Size số</label>
                ${(state.hasEditPermission && state.role === 'giam_doc') ? `
                    <button type="button" class="btn btn-secondary" onclick="_tpdAddCustomSize()" style="padding: 2px 8px; font-size: 10px; border-radius:4px; font-weight:700;">+ Thêm size khác</button>
                ` : ''}
            </div>
            <div class="${_tpdIsNamNuSize(currentSizeType) ? '' : 'tpd-ws-size-grid'}" style="margin-top:8px; margin-bottom: 8px;">
                ${sizeGridHtml}
            </div>
            <div id="tpd-qty-warning" style="display:${(() => {
                const dhtQ = Number(it.quantity) || 0;
                const totalQ = (it.quantities || []).reduce((s,q) => s + (Number(q.qty)||0), 0);
                return (dhtQ > 0 && totalQ !== dhtQ) ? 'block' : 'none';
            })()}; padding:8px 12px; border-radius:6px; font-size:12px; font-weight:700; margin-bottom:12px; ${(() => {
                const dhtQ = Number(it.quantity) || 0;
                const totalQ = (it.quantities || []).reduce((s,q) => s + (Number(q.qty)||0), 0);
                if (dhtQ > 0 && totalQ > dhtQ) return 'color:#dc2626; background:#fef2f2; border:1px solid #fecaca;';
                if (dhtQ > 0 && totalQ < dhtQ) return 'color:#d97706; background:#fffbeb; border:1px solid #fde68a;';
                return 'color:#059669; background:#ecfdf5; border:1px solid #a7f3d0;';
            })()}">
                ${(() => {
                    const dhtQ = Number(it.quantity) || 0;
                    const totalQ = (it.quantities || []).reduce((s,q) => s + (Number(q.qty)||0), 0);
                    if (dhtQ > 0 && totalQ > dhtQ) return '⚠️ Tổng size (<b>' + totalQ + '</b>) vượt quá SL phiếu (<b>' + dhtQ + '</b>). Vui lòng điều chỉnh!';
                    if (dhtQ > 0 && totalQ < dhtQ) return '⚠️ Tổng size (<b>' + totalQ + '</b>) chưa đủ SL phiếu (<b>' + dhtQ + '</b>). Còn thiếu <b>' + (dhtQ - totalQ) + '</b> áo.';
                    return '';
                })()}
            </div>
            <div id="tpd-size-summary-box" style="font-size:11px; color:#64748b; font-weight:600; margin-bottom:12px; padding:6px 10px; background:#f1f5f9; border-radius:4px; display:flex; justify-content:space-between;">
                <span>📋 SL phiếu DHT: <b style="color:#1e40af">${Number(it.quantity) || 0}</b></span>
                <span>📊 Tổng size đã điền: <b style="color:${(() => {
                    const dhtQ = Number(it.quantity) || 0;
                    const totalQ = (it.quantities || []).reduce((s,q) => s + (Number(q.qty)||0), 0);
                    if (dhtQ > 0 && totalQ === dhtQ) return '#059669';
                    if (totalQ > dhtQ) return '#dc2626';
                    return '#d97706';
                })()}">${(it.quantities || []).reduce((s,q) => s + (Number(q.qty)||0), 0)}</b> / <b>${Number(it.quantity) || 0}</b></span>
            </div>
        </div>
    `;

    // 5. Mockup Image upload box
    const mockupSrc = it.mockup_image || '';
    html += `
        <div class="tpd-ws-form-group" style="margin-bottom: 20px;">
            <label class="tpd-ws-form-label">Hình ảnh thiết kế Mockup lớn (Chọn file từ máy tính)</label>
            <input type="file" id="tpdMockupFileInput" accept="image/*" style="display:none;" onchange="_tpdOnMockupFileSelect(event)" ${disabledAttr}>
            <div class="tpd-ws-upload-box paste-target" id="zone_mockup" data-zone="mockup" style="min-height: 140px; cursor: pointer;" onclick="if(document.getElementById('tpdMockupFileInput')) document.getElementById('tpdMockupFileInput').click()">
                ${mockupSrc ? `
                    <button type="button" class="tpd-ws-upload-clear" onclick="event.stopPropagation(); _tpdClearZone('mockup')" ${disabledAttr}>✕</button>
                    <img src="${mockupSrc}" class="tpd-ws-upload-preview" style="max-height:120px;">
                ` : `
                    <span class="tpd-ws-upload-icon">📁</span>
                    <span class="tpd-ws-upload-text">Bấm vào đây để tải file ảnh từ máy tính</span>
                    <span style="font-size: 9px; color: #94a3b8; margin-top: 4px;">(Hỗ trợ PNG, JPG, JPEG)</span>
                `}
            </div>
        </div>
    `;



    // 7. Layout Customize Panel (Only show and edit for giam_doc)
    if (state.role === 'giam_doc') {
        html += `
            <div class="tpd-ws-form-group" style="margin-top: 24px; padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
                <div style="font-size: 12px; font-weight: 900; color: #122546; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    📐 TÙY CHỈNH BỐ CỤC PHIẾU (A4 LAYOUT)
                </div>
                
                <!-- Mockup Height slider -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">
                        <span>Chiều cao khung ảnh:</span>
                        <span id="tpd_lbl_height">${(layout.height && layout.height !== 'auto') ? layout.height + 'mm' : 'Tự động'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" min="30" max="200" value="${(layout.height && layout.height !== 'auto') ? layout.height : 84}" class="slider" style="flex: 1; cursor: pointer;" oninput="_tpdChangeLayoutHeight(this.value)">
                        <button type="button" class="tpd-btn" style="padding: 2px 6px; font-size: 10px; height: auto;" onclick="_tpdResetLayoutHeight()">Tự động</button>
                    </div>
                </div>

                <!-- Spacing top slider -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">
                        <span>Khoảng cách từ viền trên:</span>
                        <span id="tpd_lbl_spacing">${layout.topSpacing !== undefined ? layout.topSpacing : 7}px</span>
                    </div>
                    <input type="range" min="0" max="50" value="${layout.topSpacing !== undefined ? layout.topSpacing : 7}" class="slider" style="width: 100%; cursor: pointer;" oninput="_tpdChangeLayoutSpacing(this.value)">
                </div>

                <!-- Alignment buttons -->
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">Căn lề khung ảnh:</div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="tpd-btn ${layout.alignment === 'flex-start' ? 'tpd-btn-primary' : 'tpd-btn-secondary'}" style="flex:1; padding: 4px; font-size:11px; font-weight:700; height: auto;" onclick="_tpdChangeLayoutAlignment('flex-start')">Trái</button>
                        <button type="button" class="tpd-btn ${layout.alignment === 'center' ? 'tpd-btn-primary' : 'tpd-btn-secondary'}" style="flex:1; padding: 4px; font-size:11px; font-weight:700; height: auto;" onclick="_tpdChangeLayoutAlignment('center')">Giữa</button>
                        <button type="button" class="tpd-btn ${layout.alignment === 'flex-end' ? 'tpd-btn-primary' : 'tpd-btn-secondary'}" style="flex:1; padding: 4px; font-size:11px; font-weight:700; height: auto;" onclick="_tpdChangeLayoutAlignment('flex-end')">Phải</button>
                    </div>
                </div>

                <!-- Global Default Layout Settings (Director only) -->
                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: flex-end;">
                    <button type="button" class="btn btn-primary" style="width: 100%; padding: 6px; font-size: 11px; font-weight: 700; height: auto; background: #0f766e; border: 1px solid #0f766e; color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 4px;" onclick="_tpdSaveAsGlobalDefaultLayout()">
                        💾 Lưu làm mặc định cho mọi phiếu mới
                    </button>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

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

    let qty = Math.max(0, Number(val) || 0);

    // ★ Hard cap: total sizes must not exceed DHT quantity
    const dhtQty = Number(it.quantity) || 0;
    if (dhtQty > 0) {
        // Sum of all OTHER sizes (excluding the one being edited)
        const otherTotal = (it.quantities || []).reduce((s, q) => {
            if (q.size === size) return s;
            return s + (Number(q.qty) || 0);
        }, 0);
        const maxAllowed = Math.max(0, dhtQty - otherTotal);
        if (qty > maxAllowed) {
            qty = maxAllowed;
            showToast(`⚠️ Giới hạn ${maxAllowed} cho size ${size} (tổng không được vượt ${dhtQty})`, 'warning');
            // Update the input DOM value to reflect capped number
            document.querySelectorAll('.tpd-ws-size-qty').forEach(inp => {
                if (inp.getAttribute('onchange')?.includes("'" + size + "'") || inp.getAttribute('onkeyup')?.includes("'" + size + "'")) {
                    inp.value = qty;
                }
            });
        }
    }

    const qObj = it.quantities.find(q => q.size === size);
    if (qObj) {
        qObj.qty = qty;
    } else {
        it.quantities.push({ size: size, qty: qty, price: it.unit_price || 0, note: '' });
    }

    // Update warning banner
    const totalSizeQty = (it.quantities || []).reduce((s, q) => s + (Number(q.qty) || 0), 0);
    const qtyWarning = document.getElementById('tpd-qty-warning');
    if (dhtQty > 0 && totalSizeQty < dhtQty) {
        if (qtyWarning) {
            qtyWarning.style.display = 'block';
            qtyWarning.innerHTML = `⚠️ Tổng size (<b>${totalSizeQty}</b>) chưa đủ SL phiếu (<b>${dhtQty}</b>). Còn thiếu <b>${dhtQty - totalSizeQty}</b> áo.`;
            qtyWarning.style.color = '#d97706';
            qtyWarning.style.background = '#fffbeb';
            qtyWarning.style.borderColor = '#fde68a';
        }
    } else if (dhtQty > 0 && totalSizeQty === dhtQty) {
        if (qtyWarning) {
            qtyWarning.style.display = 'block';
            qtyWarning.innerHTML = `✅ Tổng size (<b>${totalSizeQty}</b>) khớp với SL phiếu (<b>${dhtQty}</b>)`;
            qtyWarning.style.color = '#059669';
            qtyWarning.style.background = '#ecfdf5';
            qtyWarning.style.borderColor = '#a7f3d0';
            setTimeout(() => {
                if (qtyWarning) { qtyWarning.style.display = 'none'; }
            }, 3000);
        }
    } else {
        if (qtyWarning) qtyWarning.style.display = 'none';
    }

    _tpdSaveDraft(it);
    _tpdUpdateSizeSummary();
    _tpdUpdateLivePreview();
}

function _tpdUpdateSizeSummary() {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    const summaryBox = document.getElementById('tpd-size-summary-box');
    if (!summaryBox) return;

    const dhtQ = Number(it.quantity) || 0;
    const totalQ = (it.quantities || []).reduce((s, q) => s + (Number(q.qty) || 0), 0);

    let color = '#d97706'; // orange
    if (dhtQ > 0 && totalQ === dhtQ) color = '#059669'; // green
    else if (totalQ > dhtQ) color = '#dc2626'; // red

    summaryBox.innerHTML = `
        <span>📋 SL phiếu DHT: <b style="color:#1e40af">${dhtQ}</b></span>
        <span>📊 Tổng size đã điền: <b style="color:${color}">${totalQ}</b> / <b>${dhtQ}</b></span>
    `;
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
    if (!state.hasEditPermission || state.role !== 'giam_doc') {
        showToast('Bạn không có quyền thêm size mới. Chỉ Giám đốc mới có quyền này!', 'error');
        return;
    }

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
    const details = allDetails.map((d, idx) => ({ ...d, originalIndex: idx }));
        
    const posWeights = {
        'ngực': 1,
        'lưng': 2,
        'bụng': 3,
        'tay trái': 4,
        'tay phải': 5,
        'gáy': 6
    };
    details.sort((a, b) => {
        const aPos = (a.position || '').trim().toLowerCase();
        const bPos = (b.position || '').trim().toLowerCase();
        let aW = 999;
        let bW = 999;
        for (const [k, w] of Object.entries(posWeights)) {
            if (aPos === k || aPos.startsWith(k)) { aW = w; break; }
        }
        for (const [k, w] of Object.entries(posWeights)) {
            if (bPos === k || bPos.startsWith(k)) { bW = w; break; }
        }
        if (aW !== bW) return aW - bW;
        return aPos.localeCompare(bPos, 'vi');
    });

    if (details.length === 0) {
        return `
            <div class="tpd-a4-tech-wrapper" style="flex: 1; display: flex; width: 100%;">
                <div class="tpd-a4-tech-box" style="border: 1.5px solid #122546; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; background: #ffffff; flex: 1; min-height: 100%;">
                    <div class="tpd-a4-img-header" style="background: #122546; color: white; padding: 6px 10px; font-weight: 700; font-size: 13px; text-transform: uppercase; text-align: center;">Thông số in / thêu chi tiết</div>
                    <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: 600; padding: 20px; text-align: center;">
                        Chưa cấu hình thông số in / thêu.
                    </div>
                </div>
            </div>
        `;
    }

    const rowsHtml = details.map((d, index) => {
        let dimStr = '';
        if (d.width && d.width.trim()) {
            dimStr += `Ngang: ${d.width.trim()}`;
        }
        if (d.height && d.height.trim()) {
            if (dimStr) dimStr += ' x ';
            dimStr += `Cao: ${d.height.trim()}`;
        }
        if (!dimStr && d.dimension && d.dimension.trim()) {
            dimStr = d.dimension.trim();
        }
        if (!dimStr) {
            dimStr = '<span style="color: #ef4444; font-weight: 700;">CHƯA NHẬP</span>';
        }

        const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
        let offsetStr = '—';
        if (posConfig) {
            const mapped = _tpdGetMappedOffsets(d, posConfig);
            const displayParts = [];
            
            mapped.forEach(item => {
                const displayName = (item.label && !item.label.startsWith('_custom_offset_')) ? item.label : 'Khoảng cách';
                if (item.isChecked) {
                    const val = item.value.trim();
                    if (val) {
                        displayParts.push(`<span style="font-weight: 700; color: #dc2626;">${displayName}: ${val}</span>`);
                    } else if (item.require) {
                        displayParts.push(`<span style="color: #ef4444; font-weight: 700;">${displayName}: CHƯA ĐIỀN</span>`);
                    }
                } else if (item.require) {
                    displayParts.push(`<span style="color: #ef4444; font-weight: 700;">${displayName}: CHƯA ĐIỀN</span>`);
                }
            });
            
            if (displayParts.length > 0) {
                offsetStr = displayParts.join('<br>');
            }
        }

        return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                <td style="padding: 8px 6px; font-weight: 800; color: #0f172a;">${d.position}</td>
                <td style="padding: 8px 6px; font-weight: 700; color: #1e3a8a;">${d.print_type || '—'}</td>
                <td style="padding: 8px 6px; font-weight: 700; color: #1e293b;">${dimStr}</td>
                <td style="padding: 8px 6px;">${offsetStr}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="tpd-a4-tech-wrapper" style="flex: 1; display: flex; width: 100%;">
            <div class="tpd-a4-tech-box" style="border: 1.5px solid #122546; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; background: #ffffff; flex: 1; min-height: 100%;">
                <div class="tpd-a4-img-header" style="background: #122546; color: white; padding: 6px 10px; font-weight: 700; font-size: 13px; text-transform: uppercase; text-align: center;">Thông số in / thêu chi tiết</div>
                <div style="flex: 1; padding: 6px 8px; overflow-y: auto; background: #ffffff;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
                                <th style="padding: 4px 6px;">Vị trí</th>
                                <th style="padding: 4px 6px;">Kiểu</th>
                                <th style="padding: 4px 6px;">Kích thước</th>
                                <th style="padding: 4px 6px;">Khoảng cách</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function _tpdGetInfoBoxHtml(it, layout, o, hideShippingBanner = false) {
    if (!layout) layout = {};

    // 1. Fabric (Chất liệu vải)
    const fabricVal = layout.custom_material !== undefined && layout.custom_material !== '' ? layout.custom_material : (it.material_name || '—');

    // 2. Color (Màu sắc phối)
    const rawColor = layout.custom_color !== undefined && layout.custom_color !== '' ? layout.custom_color : (it.color_name || '—');
    const colorVal = rawColor !== '—' ? _tpdFormatColorName(rawColor) : '—';

    // Pair fabric parts and color parts if they match in length when split by '+' or '/' or ','
    let usePairedLayout = false;
    let pairsHtml = '';
    const splitRegex = /\s*[\+\/,]\s*/;
    const fabricParts = typeof fabricVal === 'string' ? fabricVal.split(splitRegex).map(s => s.trim()).filter(Boolean) : [];
    const colorParts = typeof colorVal === 'string' ? colorVal.split(splitRegex).map(s => s.trim()).filter(Boolean) : [];

    if (fabricParts.length > 0 && fabricParts.length === colorParts.length) {
        usePairedLayout = true;
        pairsHtml = fabricParts.map((f, i) => {
            const rawCol = colorParts[i];
            let colLabel = rawCol;
            if (rawCol && rawCol !== '—') {
                colLabel = rawCol.toLowerCase().startsWith('màu') ? rawCol : `Màu ${rawCol}`;
            }
            return `<div style="margin-top: 2px; font-weight: 700; color: #1e3a8a;">${escapeHTML(f)} : <span style="color: #b91c1c; font-weight: 800;">${escapeHTML(colLabel)}</span></div>`;
        }).join('');
    }

    // 3. Sewing tech (Kỹ thuật may)
    let defaultSewing = '—';
    const orderTechNames = _tpdGetSewingTechniqueNames(it.sewing_techniques);
    const patternTechNames = _tpdGetSewingTechniqueNames(it.tsam_sewing_tech);
    if (orderTechNames.length > 0) {
        defaultSewing = orderTechNames.join(', ');
    } else if (patternTechNames.length > 0) {
        defaultSewing = patternTechNames.join(', ');
    }
    const sewingVal = layout.custom_sewing !== undefined && layout.custom_sewing !== '' ? layout.custom_sewing : defaultSewing;
    let sewingHtml = '—';
    if (sewingVal && sewingVal !== '—') {
        const parts = sewingVal.split(/,\s*/).map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
            sewingHtml = parts.map(part => {
                return `<div style="margin-top: 1px;">• ${escapeHTML(part)}</div>`;
            }).join('');
        }
    }
    if (layout.custom_sewing_note && layout.custom_sewing_note.trim()) {
        const noteHtml = `<div style="margin-top: 2px; color: #dc2626; font-weight: 800;">* Ghi chú: ${escapeHTML(layout.custom_sewing_note.trim())}</div>`;
        if (sewingHtml === '—') {
            sewingHtml = noteHtml;
        } else {
            sewingHtml += noteHtml;
        }
    }


    // 4. Print Tech (Kỹ thuật in)
    let defaultPrinting = '—';
    if (it.print_details && it.print_details.length > 0) {
        try {
            const details = typeof it.print_details === 'string' ? JSON.parse(it.print_details) : it.print_details;
            if (Array.isArray(details) && details.length > 0) {
                const completedDetails = details.filter(_tpdIsPrintDetailComplete);
                const sortedDetails = _tpdSortPrintDetails(completedDetails);
                if (sortedDetails.length > 0) {
                    defaultPrinting = sortedDetails.map(d => {
                        let dimStr = '';
                        const w = (d.width || '').trim();
                        const h = (d.height || '').trim();
                        if (w) {
                            const wSuffix = w.toLowerCase().endsWith('cm') ? '' : 'cm';
                            dimStr += `<span style="color: #ea580c; font-weight: 800;">Ngang ${escapeHTML(w)}${wSuffix}</span>`;
                        }
                        if (h) {
                            const hSuffix = h.toLowerCase().endsWith('cm') ? '' : 'cm';
                            if (dimStr) dimStr += ' x ';
                            dimStr += `<span style="color: #ea580c; font-weight: 800;">Cao ${escapeHTML(h)}${hSuffix}</span>`;
                        }
                        const posConfig = (window._tpd?.printPositionsConfig || []).find(p => p.name === d.position);
                        let offsetStr = '';
                        if (posConfig) {
                            const mapped = _tpdGetMappedOffsets(d, posConfig);
                            const parts = [];
                            mapped.forEach(item => {
                                if (item.isChecked) {
                                    const val = item.value.trim();
                                    if (val) {
                                        const suffix = val.toLowerCase().endsWith('cm') ? '' : 'cm';
                                        let label = item.label || 'Khoảng cách';
                                        if (label.startsWith('_custom_offset_')) {
                                            label = 'Khoảng cách';
                                        }
                                        if (label === 'Gáy xuống') label = 'Gáy';
                                        if (label === 'Cổ xuống') label = 'Cổ';
                                        const displayLabel = label.toLowerCase().startsWith('cách') ? label : `Cách ${label}`;
                                        parts.push(`${displayLabel} : ${val}${suffix}`);
                                    }
                                }
                            });
                            if (parts.length > 0) {
                                offsetStr = ` - ${parts.join(', ')}`;
                            }
                        }
                        const safePosition = escapeHTML(d.position || '—');
                        const safePrintType = escapeHTML(d.print_type || '—');
                        const isPrint3D = d.print_type === 'In 3D' || (d.position && d.position.toLowerCase().includes('in 3d'));
                        const safeDimStr = isPrint3D ? ' - In 3D tràn thân (Không kích thước)' : (dimStr ? ` - ${dimStr}` : '');
                        const safeOffsetStr = escapeHTML(offsetStr);
                        return `<div style="margin-top: 1px;">• <span style="color: #047857; font-weight: 800;">${safePosition}:</span> <span style="color: #1e40af; font-weight: 800;">${safePrintType}</span>${safeDimStr}${safeOffsetStr}</div>`;
                    }).join('');
                }
            }
        } catch(e){}
    }
    const printingVal = layout.custom_printing !== undefined && layout.custom_printing !== '' ? escapeHTML(layout.custom_printing) : defaultPrinting;

    // 5. Size Header (Báo size)
    const baoSizeVal = layout.custom_bao_size !== undefined && layout.custom_bao_size !== '' ? layout.custom_bao_size : (it.product_name ? `(${it.product_name})` : '—');

    // 6. Size breakdown (Size TT)
    let defaultSizeTT = '—';
    if (it.quantities && it.quantities.length > 0) {
        try {
            const filledQuantities = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : it.quantities;
            if (Array.isArray(filledQuantities)) {
                const activeQuantities = filledQuantities.filter(q => Number(q.qty) > 0 || (q.note && q.note.trim()));
                if (activeQuantities.length > 0) {
                    if (it.size_type === 'Size Nam / Nữ') {
                        const namList = activeQuantities.filter(q => q.size.startsWith('Nam'));
                        const nuList = activeQuantities.filter(q => q.size.startsWith('Nữ'));
                        const otherList = activeQuantities.filter(q => !q.size.startsWith('Nam') && !q.size.startsWith('Nữ'));

                        const lines = [];

                        // Nam line
                        let namStr = '—';
                        if (namList.length > 0) {
                            const sortedNam = _tpdSortSizes(namList.map(q => q.size));
                            namStr = sortedNam.map(sz => {
                                const q = namList.find(x => x.size === sz);
                                const cleanSz = sz.replace(/^Nam\s+/, '');
                                return _tpdFormatSizeItem(cleanSz, q.qty, q.note);
                            }).join(' | ');
                        }
                        lines.push(`<div style="margin-top: 1px;"><span style="color: #1e3a8a; font-weight: 800;">Nam:</span> ${namStr}</div>`);

                        // Nữ line
                        let nuStr = '—';
                        if (nuList.length > 0) {
                            const sortedNu = _tpdSortSizes(nuList.map(q => q.size));
                            nuStr = sortedNu.map(sz => {
                                const q = nuList.find(x => x.size === sz);
                                const cleanSz = sz.replace(/^Nữ\s+/, '');
                                return _tpdFormatSizeItem(cleanSz, q.qty, q.note);
                            }).join(' | ');
                        }
                        lines.push(`<div style="margin-top: 1px;"><span style="color: #db2777; font-weight: 800;">Nữ:</span> ${nuStr}</div>`);

                        if (otherList.length > 0) {
                            const sortedOther = _tpdSortSizes(otherList.map(q => q.size));
                            const otherStr = sortedOther.map(sz => {
                                const q = otherList.find(x => x.size === sz);
                                return _tpdFormatSizeItem(sz, q.qty, q.note);
                            }).join(' | ');
                            lines.push(`<div style="margin-top: 1px;"><span style="color: #ea580c; font-weight: 800;">Khác:</span> ${otherStr}</div>`);
                        }

                        defaultSizeTT = lines.join('');
                    } else {
                        const sorted = _tpdSortSizes(activeQuantities.map(q => q.size))
                            .map(sz => activeQuantities.find(q => q.size === sz))
                            .filter(Boolean);
                        defaultSizeTT = sorted.map(q => {
                            return _tpdFormatSizeItem(q.size, q.qty, q.note);
                        }).join(' | ');
                    }
                } else {
                    if (it.size_type === 'Size Nam / Nữ') {
                        defaultSizeTT = `
                            <div style="margin-top: 1px;"><span style="color: #1e3a8a; font-weight: 800;">Nam:</span> —</div>
                            <div style="margin-top: 1px;"><span style="color: #db2777; font-weight: 800;">Nữ:</span> —</div>
                        `;
                    }
                }
            }
        } catch(e){}
    } else {
        if (it.size_type === 'Size Nam / Nữ') {
            defaultSizeTT = `
                <div style="margin-top: 1px;"><span style="color: #1e3a8a; font-weight: 800;">Nam:</span> —</div>
                <div style="margin-top: 1px;"><span style="color: #db2777; font-weight: 800;">Nữ:</span> —</div>
            `;
        }
    }
    const sizeTTVal = layout.custom_size_tt !== undefined && layout.custom_size_tt !== '' ? escapeHTML(layout.custom_size_tt) : defaultSizeTT;

    // 7. Total Qty (Tổng SL)
    let defaultTotalQty = 0;
    if (it.quantities && it.quantities.length > 0) {
        const filledQuantities = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : it.quantities;
        if (Array.isArray(filledQuantities)) {
            defaultTotalQty = filledQuantities.reduce((sum, q) => sum + (Number(q.qty) || 0), 0);
        }
    }
    const tongSlVal = layout.custom_tong_sl !== undefined && layout.custom_tong_sl !== '' ? layout.custom_tong_sl : defaultTotalQty;

    // 8. Expected Sender (Người gửi dự kiến)
    const senderVal = layout.custom_sender !== undefined && layout.custom_sender !== '' 
        ? layout.custom_sender 
        : ((o && o.created_by_name) ? o.created_by_name : '—');

    // 0. Sale Type (Bán/Quà)
    const saleTypeVal = (it.sale_type || '').trim();
    const normalizedSaleType = (saleTypeVal.toLowerCase() === 'bán' || saleTypeVal.toLowerCase() === 'ban') ? 'Bán' : (saleTypeVal.toLowerCase() === 'quà' || saleTypeVal.toLowerCase() === 'qua') ? 'Quà' : (saleTypeVal || 'Bán');

    return `
        <div class="tpd-a4-info-box" style="flex: 1; border: 1.5px solid #122546; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; background: #ffffff; height: 100%; box-sizing: border-box; min-width: 200px;">
            <div style="background: #122546; color: white; padding: 5px 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; text-align: center; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Thông Tin Chi Tiết Sản Xuất
            </div>
            <div style="flex: 1; padding: 8px 12px; display: flex; flex-direction: column; justify-content: flex-start; font-size: 13px; line-height: 1.45; color: #1e293b; background: #ffffff; box-sizing: border-box; height: 100%;">
                <div style="display: flex; flex-direction: column; justify-content: flex-start; gap: 8px; flex: 1;">
                    <!-- Phần 1: Sản phẩm bán -->
                    <div style="display: flex; flex-direction: column; gap: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                        <div>
                            <strong style="color: #0f172a; font-weight: 800;">Sản Phẩm ${normalizedSaleType}:</strong> 
                            <span style="font-weight: 700; color: #1e293b;">${escapeHTML(it.product_name || '—')}</span>
                        </div>
                        ${usePairedLayout ? `
                        <div>
                            <strong style="color: #0f172a; font-weight: 800;">Chất liệu vải:</strong> 
                            <div style="padding-left: 0px; display: flex; flex-direction: column; margin-top: 2px;">
                                ${pairsHtml}
                            </div>
                        </div>
                        ` : `
                        <div>
                            <strong style="color: #0f172a; font-weight: 800;">Chất liệu vải:</strong> 
                            <span style="font-weight: 700; color: #1e3a8a;">${escapeHTML(fabricVal)}</span>
                        </div>
                        <div>
                            <strong style="color: #0f172a; font-weight: 800;">Màu sắc phối:</strong> 
                            <span style="font-weight: 800; color: #dc2626;">${escapeHTML(colorVal)}</span>
                        </div>
                        `}
                    </div>

                    <!-- Phần 2: Kỹ thuật may -->
                    <div style="display: flex; flex-direction: column; gap: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                        <strong style="color: #0f172a; font-weight: 800;">Kỹ Thuật May:</strong> 
                        <span style="font-weight: 700; color: #b45309; display: block; margin-top: 2px;">${sewingHtml}</span>
                    </div>

                    <!-- Phần 3: Kỹ thuật in -->
                    <div style="display: flex; flex-direction: column; gap: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                        <strong style="color: #0f172a; font-weight: 800;">Kỹ Thuật In:</strong> 
                        <span style="font-weight: 700; color: #047857; display: block; margin-top: 2px;">${printingVal}</span>
                    </div>

                    <!-- Phần 4: Báo size -->
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div>
                            <strong style="color: #0f172a; font-weight: 800;">Báo Size:</strong> 
                            <span style="font-weight: 800; color: #1e293b; text-transform: uppercase;">${escapeHTML(baoSizeVal)}</span>
                        </div>
                        <div>
                            <strong style="color: #0f172a; font-weight: 800;">${escapeHTML(it.size_type || 'Size TT')}:</strong> 
                            <span style="font-weight: 700; color: #0f172a; display: block; margin-top: 2px;">${sizeTTVal}</span>
                        </div>
                    </div>
                </div>
                <div style="border-top: 2px solid #122546; padding: 4px 6px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 4px; box-sizing: border-box;">
                    <div>
                        <strong style="color: #0f172a; font-weight: 800; font-size: 11px;">Tổng SL:</strong> 
                        <span style="font-size: 15px; font-weight: 900; color: #dc2626;">${tongSlVal}</span>
                    </div>
                    <div>
                        <strong style="color: #0f172a; font-weight: 800; font-size: 11px;">Người gửi:</strong> 
                        <span style="font-size: 12px; font-weight: 800; color: #122546;">${escapeHTML(senderVal)}</span>
                    </div>
                </div>
                ${(() => {
                    // ★ Shipping info banner — below Tổng SL
                    if (hideShippingBanner) return '';
                    if (!o || !o.expected_ship_date) return '';
                    const sDate = new Date(o.expected_ship_date);
                    if (isNaN(sDate.getTime())) return '';
                    const dayNames = ['CHỦ NHẬT', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
                    const dayStr = dayNames[sDate.getDay()];
                    const dateStr = sDate.getDate() + '/' + (sDate.getMonth() + 1);
                    const pri = (o.shipping_priority || 'GỬI').toUpperCase();
                    const timeStr = o.standard_delivery_time ? o.standard_delivery_time.replace(':', 'h') : '';
                    let bgColor, borderColor, label;
                    if (pri === 'CHUẨN') {
                        bgColor = '#dc2626'; borderColor = '#b91c1c'; label = 'ĐƠN CHUẨN';
                    } else if (pri === 'GẤP') {
                        bgColor = '#ea580c'; borderColor = '#c2410c'; label = 'ĐƠN GẤP';
                    } else {
                        bgColor = '#2563eb'; borderColor = '#1d4ed8'; label = 'ĐƠN GỬI';
                    }
                    const parts = ['GỬI HÀNG:'];
                    if (timeStr) parts.push(timeStr);
                    parts.push(dayStr);
                    parts.push(dateStr);
                    parts.push(label);
                    return `
                        <div style="background:${bgColor}; color:#fff; border:2px solid ${borderColor}; border-radius:4px; padding:4px 8px; margin-top:4px; text-align:center; font-weight:900; font-size:12px; letter-spacing:0.5px; line-height:1.3; box-sizing:border-box;">
                            ${parts.join(' - ')}
                        </div>
                    `;
                })()}
            </div>
        </div>
    `;
}

function _tpdChangeCustomInfo(field, value) {
    const state = window._tpdWorkspaceState;
    const it = state.editingItem;
    if (!it) return;

    const defLayout = _tpdGetDefaultLayoutConfig();
    if (!it.custom_layout) {
        it.custom_layout = { ...defLayout };
    } else if (typeof it.custom_layout === 'string') {
        try { it.custom_layout = JSON.parse(it.custom_layout); } catch(e) {
            it.custom_layout = { ...defLayout };
        }
    }

    it.custom_layout[field] = value;
    _tpdSaveDraft(it);
    _tpdUpdateLivePreview();
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

    const isPrint3D = val.toLowerCase().includes('in 3d');
    it.print_details.push({ 
        position: val, 
        image: '',
        print_type: isPrint3D ? 'In 3D' : ''
    });

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

    let cleanVal = value ? value.trim() : '';
    if (['width', 'height', 'gay_xuong', 'co_xuong', 'offset_value'].includes(field)) {
        if (cleanVal) {
            // If it is a number (integer or float), automatically append 'cm'
            if (/^\d+(\.\d+)?$/.test(cleanVal)) {
                cleanVal = cleanVal + 'cm';
            }
        }
    }

    it.print_details[idx][field] = cleanVal;

    // Mutually exclusive Ngang (width) and Cao (height)
    if (field === 'width' && cleanVal) {
        it.print_details[idx]['height'] = '';
    } else if (field === 'height' && cleanVal) {
        it.print_details[idx]['width'] = '';
    }

    // Backward compatibility sync
    if (field === 'offset_value') {
        const d = it.print_details[idx];
        const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
        if (posConfig) {
            const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
            const firstKey = Object.keys(selectedOffsets)[0];
            if (firstKey) {
                selectedOffsets[firstKey] = cleanVal;
            }
            const lbl = (firstKey || '').toLowerCase();
            if (lbl.includes('gáy')) {
                d.gay_xuong = cleanVal;
            } else if (lbl.includes('cổ')) {
                d.co_xuong = cleanVal;
            }
        }
    }

    _tpdSaveDraft(it);
    
    // Re-render inputs to reflect format (e.g. 10 -> 10cm) and toggle disabled states
    _tpdRenderFormInputs();
    _tpdSetupPasteZones();
    _tpdUpdateLivePreview();
}

function _tpdToggleDetailOffset(idx, label, isChecked, offsetIndex) {
    const state = window._tpdWorkspaceState;
    if (!state || !state.editingItem) return;
    const it = state.editingItem;
    if (!it.print_details || !it.print_details[idx]) return;
    const d = it.print_details[idx];
    const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
    const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
    
    if (label !== '') {
        // Predefined offset
        if (isChecked) {
            let defaultVal = '';
            const posOffsets = posConfig ? (posConfig.offsets || []) : [];
            const off = posOffsets.find(o => o.label === label);
            if (off && off.placeholder) {
                defaultVal = off.placeholder.replace(/^ví dụ:\s*/i, '').trim();
            }
            selectedOffsets[label] = defaultVal;
        } else {
            delete selectedOffsets[label];
        }
    } else {
        // Dynamic offset
        const mapped = _tpdGetMappedOffsets(d, posConfig);
        const currentItem = mapped[offsetIndex];
        if (isChecked) {
            // Generate a unique default name that doesn't conflict
            let defaultName = `_custom_offset_${offsetIndex + 1}`;
            let counter = 1;
            while (selectedOffsets[defaultName] !== undefined) {
                defaultName = `_custom_offset_${offsetIndex + 1}_${counter}`;
                counter++;
            }
            selectedOffsets[defaultName] = '';
        } else {
            // Remove the currently mapped custom label
            if (currentItem && currentItem.label) {
                delete selectedOffsets[currentItem.label];
            }
        }
    }
    
    _tpdSyncLegacyOffsets(d, selectedOffsets);
    
    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdSetupPasteZones();
    _tpdUpdateLivePreview();
}

function _tpdUpdateDetailOffsetLabel(idx, oldLabel, newLabel, offsetIndex) {
    const state = window._tpdWorkspaceState;
    if (!state || !state.editingItem) return;
    const it = state.editingItem;
    if (!it.print_details || !it.print_details[idx]) return;
    const d = it.print_details[idx];
    const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
    const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
    
    let cleanNewLabel = newLabel ? newLabel.trim() : '';
    if (!cleanNewLabel) {
        cleanNewLabel = oldLabel.startsWith('_custom_offset_') ? oldLabel : `_custom_offset_${offsetIndex + 1}`;
    }
    
    // Avoid overwriting a predefined key or existing key unless it's the old one
    if (cleanNewLabel !== oldLabel) {
        const val = selectedOffsets[oldLabel] || '';
        delete selectedOffsets[oldLabel];
        selectedOffsets[cleanNewLabel] = val;
    }
    
    _tpdSyncLegacyOffsets(d, selectedOffsets);
    
    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdSetupPasteZones();
    _tpdUpdateLivePreview();
}

function _tpdUpdateDetailOffsetVal(idx, label, value, offsetIndex) {
    const state = window._tpdWorkspaceState;
    if (!state || !state.editingItem) return;
    const it = state.editingItem;
    if (!it.print_details || !it.print_details[idx]) return;
    const d = it.print_details[idx];
    const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
    const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
    
    let cleanVal = value ? value.trim() : '';
    if (cleanVal) {
        if (/^\d+(\.\d+)?$/.test(cleanVal)) {
            cleanVal = cleanVal + 'cm';
        }
    }
    
    if (label !== '') {
        // Predefined
        selectedOffsets[label] = cleanVal;
    } else {
        // Dynamic
        const mapped = _tpdGetMappedOffsets(d, posConfig);
        const currentItem = mapped[offsetIndex];
        if (currentItem && currentItem.label) {
            selectedOffsets[currentItem.label] = cleanVal;
        }
    }
    
    _tpdSyncLegacyOffsets(d, selectedOffsets);
    
    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdSetupPasteZones();
    _tpdUpdateLivePreview();
}

function _tpdSyncLegacyOffsets(d, selectedOffsets) {
    const checkedKeys = Object.keys(selectedOffsets);
    if (checkedKeys.length > 0) {
        const firstVal = selectedOffsets[checkedKeys[0]];
        d.offset_value = firstVal;
        const lbl = checkedKeys[0].toLowerCase();
        if (lbl.includes('gáy')) {
            d.gay_xuong = firstVal;
            d.co_xuong = '';
        } else if (lbl.includes('cổ')) {
            d.co_xuong = firstVal;
            d.gay_xuong = '';
        } else {
            d.gay_xuong = '';
            d.co_xuong = '';
        }
    } else {
        d.offset_value = '';
        d.gay_xuong = '';
        d.co_xuong = '';
    }
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
    if (!it) return false;

    if (!state.hasEditPermission) {
        showToast('Bạn không có quyền chỉnh sửa phiếu này.', 'error');
        return false;
    }

    // ★ Validation: Mockup image is mandatory
    if (!it.mockup_image || !it.mockup_image.trim()) {
        showToast('⚠️ Vui lòng tải lên ảnh Mockup trước khi lưu phiếu sản xuất!', 'error');
        return false;
    }

    // ★ Validation: total size qty must match DHT quantity
    const dhtQty = Number(it.quantity) || 0;
    const totalSizeQty = (it.quantities || []).reduce((s, q) => s + (Number(q.qty) || 0), 0);
    if (dhtQty > 0 && totalSizeQty < dhtQty) {
        showToast(`⚠️ Số lượng đã nhập (${totalSizeQty}) chưa đủ so với số lượng phiếu (${dhtQty}). Còn thiếu ${dhtQty - totalSizeQty} áo! Vui lòng nhập đủ số lượng mới có thể lưu.`, 'error');
        return false;
    }
    if (dhtQty > 0 && totalSizeQty > dhtQty) {
        showToast(`⚠️ Số lượng đã nhập (${totalSizeQty}) vượt quá số lượng phiếu (${dhtQty})! Vui lòng điều chỉnh chính xác bằng số lượng phiếu mới có thể lưu.`, 'error');
        return false;
    }

    // Validation for print details: Kiểu, Kích thước (ngang hoặc cao), and offset
    if (it.print_details && it.print_details.length > 0) {
        for (let i = 0; i < it.print_details.length; i++) {
            const d = it.print_details[i];
            
            // 1. Kiểu
            const isPrint3DPosition = d.position && d.position.toLowerCase().includes('in 3d');
            if (isPrint3DPosition) {
                d.print_type = 'In 3D';
            }
            if (!d.print_type || !d.print_type.trim()) {
                showToast(`⚠️ Vui lòng chọn Kiểu in/thêu cho vị trí "${d.position}"!`, 'error');
                return false;
            }
            
            // 2. Kích thước (ngang hoặc cao) - Bỏ qua đối với In 3D
            const isPrint3DPosition = d.position && d.position.toLowerCase().includes('in 3d');
            if (!isPrint3DPosition) {
                const hasWidth = d.width && d.width.trim();
                const hasHeight = d.height && d.height.trim();
                const hasDim = d.dimension && d.dimension.trim();
                if (!hasWidth && !hasHeight && !hasDim) {
                    showToast(`⚠️ Vui lòng điền kích thước Ngang hoặc Cao cho vị trí "${d.position}"!`, 'error');
                    return false;
                }
                if (hasWidth && hasHeight) {
                    showToast(`⚠️ Vui lòng chỉ điền một chiều kích thước (Ngang HOẶC Cao) cho vị trí "${d.position}"!`, 'error');
                    return false;
                }
            }
            
            // 3. Offset if required
            const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
            if (posConfig) {
                const mapped = _tpdGetMappedOffsets(d, posConfig);
                for (const item of mapped) {
                    if (item.require) {
                        if (!item.isChecked || !item.value || !item.value.trim()) {
                            const displayName = item.label || 'khoảng cách';
                            showToast(`⚠️ Vui lòng điền thông tin "${displayName}" cho vị trí "${d.position}"!`, 'error');
                            return false;
                        }
                        if (!item.isPredefined) {
                            if (!item.label || !item.label.trim() || item.label === 'Khoảng cách') {
                                showToast(`⚠️ Vui lòng điền tên khoảng cách hợp lệ cho vị trí "${d.position}"!`, 'error');
                                return false;
                            }
                        }
                    }
                }
            }
        }
    }

    // Validation for sewing items details
    const layout = _tpdGetCustomLayout(state.activeItemIndex);
    let hasCoBe = false;
    let hasBoTay = false;
    if (layout.sewing_items && layout.sewing_items.length > 0) {
        for (let i = 0; i < layout.sewing_items.length; i++) {
            const s = layout.sewing_items[i];
            const techName = (s.tech || '').trim();
            if (!techName || techName === 'Khác') {
                showToast(`⚠️ Vui lòng chọn hoặc nhập tên kỹ thuật may ở dòng thứ ${i + 1}!`, 'error');
                return false;
            }
            if (!s.detail || !s.detail.trim()) {
                showToast(`⚠️ Vui lòng nhập thông tin chi tiết cho kỹ thuật may "${techName}"!`, 'error');
                return false;
            }

            // Check if Cổ bẻ is selected
            const normalizedTech = techName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, 'd');
            if (normalizedTech.includes('co be')) {
                hasCoBe = true;
            }
            // Check if Bo tay is selected
            if (_tpdIsBoTay(techName)) {
                hasBoTay = true;
            }
        }
    }
    if (hasCoBe && !hasBoTay) {
        showToast('⚠️ Bạn đã chọn Cổ Bẻ, bắt buộc phải thêm Bo Tay ở Kỹ Thuật May!', 'error');
        return false;
    }

    showToast('⏳ Đang lưu thông tin phiếu sản xuất...', 'info');

    try {
        const ngucDetail = (it.print_details || []).find(d => d.position === 'Ngực');
        const lungDetail = (it.print_details || []).find(d => d.position === 'Lưng');
        const payload = {
            style_name: it.style_name,
            material_name: it.material_name,
            color_name: it.color_name,
            workshop_note: it.workshop_note,
            mockup_image: it.mockup_image,
            print_details: it.print_details || [],
            front_technique_image: ngucDetail ? ngucDetail.image : null,
            back_technique_image: lungDetail ? lungDetail.image : null,
            quantities: it.quantities,
            size_type: it.size_type || 'Size TT',
            custom_layout: it.custom_layout || {}
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
            return true;
        } else {
            showToast('Lưu phiếu thất bại: ' + (res.error || 'Lỗi không xác định'), 'error');
            return false;
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi khi lưu phiếu sản xuất: ' + e.message, 'error');
        return false;
    }
}

// Validate all sheets of the order to ensure they are fully filled
function _tpdValidateAllSheets() {
    const state = window._tpdWorkspaceState;
    if (!state) return false;

    // First, gather and validate quantity checks for all sheets at once
    const missingSheets = [];
    const exceedSheets = [];
    for (let idx = 0; idx < state.items.length; idx++) {
        const it = (idx === state.activeItemIndex) ? state.editingItem : _tpdCloneItemState(state.items[idx]);
        if (!it) continue;
        const dhtQty = Number(it.quantity) || 0;
        const totalSizeQty = (it.quantities || []).reduce((s, q) => s + (Number(q.qty) || 0), 0);
        if (dhtQty > 0 && totalSizeQty < dhtQty) {
            missingSheets.push({
                idx: idx,
                name: it.product_name || 'Không tên',
                totalSizeQty: totalSizeQty,
                dhtQty: dhtQty,
                missing: dhtQty - totalSizeQty
            });
        }
        if (dhtQty > 0 && totalSizeQty > dhtQty) {
            exceedSheets.push({
                idx: idx,
                name: it.product_name || 'Không tên',
                totalSizeQty: totalSizeQty,
                dhtQty: dhtQty,
                exceed: totalSizeQty - dhtQty
            });
        }
    }

    if (missingSheets.length > 0) {
        const messages = missingSheets.map(s => `• Phiếu ${s.idx + 1} ("${s.name}"): Đã nhập ${s.totalSizeQty}/${s.dhtQty} áo (thiếu ${s.missing} áo)`).join('\n');
        alert(`⚠️ CẢNH BÁO: Số lượng nhập chưa đủ!\n\nCó ${missingSheets.length} phiếu chưa nhập đủ số lượng:\n${messages}\n\nVui lòng nhập đủ số lượng cho các phiếu này trước khi Xuất Phiếu & Lên Đơn.`);
        _tpdSwitchItemTab(missingSheets[0].idx); // Switch to the first problematic sheet
        return false;
    }

    if (exceedSheets.length > 0) {
        const messages = exceedSheets.map(s => `• Phiếu ${s.idx + 1} ("${s.name}"): Đã nhập ${s.totalSizeQty}/${s.dhtQty} áo (vượt quá ${s.exceed} áo)`).join('\n');
        alert(`⚠️ CẢNH BÁO: Số lượng nhập vượt quá!\n\nCó ${exceedSheets.length} phiếu nhập vượt quá số lượng của đơn hàng:\n${messages}\n\nVui lòng điều chỉnh chính xác bằng số lượng của đơn hàng.`);
        _tpdSwitchItemTab(exceedSheets[0].idx); // Switch to the first problematic sheet
        return false;
    }

    // Now, run print details validation
    for (let idx = 0; idx < state.items.length; idx++) {
        const it = (idx === state.activeItemIndex) ? state.editingItem : _tpdCloneItemState(state.items[idx]);
        if (!it) continue;

        const layout = _tpdGetCustomLayout(idx);

        // 2. Validate print details
        if (it.print_details && it.print_details.length > 0) {
            for (let k = 0; k < it.print_details.length; k++) {
                const d = it.print_details[k];
                if (!d.print_type || !d.print_type.trim()) {
                    showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Vui lòng chọn Kiểu in/thêu cho vị trí "${d.position}"!`, 'error');
                    _tpdSwitchItemTab(idx);
                    return false;
                }
                const isPrint3DPosition = d.position && d.position.toLowerCase().includes('in 3d');
                if (!isPrint3DPosition) {
                    const hasWidth = d.width && d.width.trim();
                    const hasHeight = d.height && d.height.trim();
                    const hasDim = d.dimension && d.dimension.trim();
                    if (!hasWidth && !hasHeight && !hasDim) {
                        showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Vui lòng điền kích thước Ngang hoặc Cao cho vị trí "${d.position}"!`, 'error');
                        _tpdSwitchItemTab(idx);
                        return false;
                    }
                    if (hasWidth && hasHeight) {
                        showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Chỉ được điền kích thước Ngang HOẶC Cao cho vị trí "${d.position}" (không điền cả hai)!`, 'error');
                        _tpdSwitchItemTab(idx);
                        return false;
                    }
                }
                const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
                if (posConfig) {
                    let posOffsets = posConfig.offsets || [];
                    if (posOffsets.length === 0 && (posConfig.has_offset || posConfig.require_offset || posConfig.offset_label)) {
                        posOffsets = [{
                            label: posConfig.offset_label || 'Khoảng cách',
                            placeholder: posConfig.offset_placeholder || 'Ví dụ: 10cm',
                            require: !!posConfig.require_offset
                        }];
                    }
                    let missingOffset = false;
                    for (const off of posOffsets) {
                        if (off.require) {
                            const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
                            const val = selectedOffsets[off.label] || '';
                            if (!val || !val.trim()) {
                                showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Vui lòng điền thông tin "${off.label || 'khoảng cách'}" cho vị trí "${d.position}"!`, 'error');
                                missingOffset = true;
                                break;
                            }
                        }
                    }
                    if (missingOffset) {
                        _tpdSwitchItemTab(idx);
                        return false;
                    }
                }
            }
        }

        // 3. Validate sewing items
        let hasCoBe = false;
        let hasBoTay = false;
        if (layout.sewing_items && layout.sewing_items.length > 0) {
            for (let k = 0; k < layout.sewing_items.length; k++) {
                const s = layout.sewing_items[k];
                const techName = (s.tech || '').trim();
                if (!techName || techName === 'Khác') {
                    showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Vui lòng chọn hoặc nhập tên kỹ thuật may ở dòng thứ ${k + 1}!`, 'error');
                    _tpdSwitchItemTab(idx);
                    return false;
                }
                if (!s.detail || !s.detail.trim()) {
                    showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Vui lòng nhập thông tin chi tiết cho kỹ thuật may "${techName}"!`, 'error');
                    _tpdSwitchItemTab(idx);
                    return false;
                }

                // Check if Cổ bẻ is selected
                const normalizedTech = techName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, 'd');
                if (normalizedTech.includes('co be')) {
                    hasCoBe = true;
                }
                // Check if Bo tay is selected
                if (_tpdIsBoTay(techName)) {
                    hasBoTay = true;
                }
            }
        }
        if (hasCoBe && !hasBoTay) {
            showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Bạn đã chọn Cổ Bẻ, bắt buộc phải thêm Bo Tay ở Kỹ Thuật May!`, 'error');
            _tpdSwitchItemTab(idx);
            return false;
        }

        // 4. Validate mockup image is uploaded
        if (!it.mockup_image || !it.mockup_image.trim()) {
            showToast(`⚠️ Phiếu ${idx + 1} ("${it.product_name || 'Không tên'}"): Vui lòng tải lên Hình ảnh thiết kế Mockup lớn!`, 'error');
            _tpdSwitchItemTab(idx);
            return false;
        }
    }
    return true;
}

// Export all sheets as images and prompt mandatory downloads before final order confirmation
async function _tpdExportSheetAndOrder() {
    const state = window._tpdWorkspaceState;
    if (!state) return;

    // Condition 1: Must be official order or have official_save_clicked = true
    if (state.order && !state.order.official_save_clicked && (state.order.is_draft === true || state.order.is_draft === 'true' || (state.order.order_code || '').startsWith('NHAP-') || (state.order.order_code || '').startsWith('📝'))) {
        showToast('⚠️ Đơn hàng hiện tại là bản nháp chưa được Lưu Chính Thức. Vui lòng bấm nút "✏️ Sửa Thông Tin Đơn (Giá/Cọc)" ở góc phải trên màn hình và chọn "Lưu Chính Thức" trước khi Xuất Phiếu.', 'error');
        return;
    }

    // Condition 2: Validate all sheets in order
    const allValid = _tpdValidateAllSheets();
    if (!allValid) return;

    // Save active sheet changes first
    const saveSuccess = await _tpdSaveProductionSheet();
    if (!saveSuccess) return;

    // Show export modal and process images
    _tpdShowExportSheetsModal();
}

// Helper to wait for all images to finish loading inside a container
async function _tpdWaitForImages(container) {
    const imgs = container.querySelectorAll('img');
    const promises = Array.from(imgs).map(img => {
        const loadPromise = new Promise(resolve => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if load fails
            }
        });

        // If it's a mockup image inside .tpd-a4-img-body, also wait for layout width adjustment
        const isMockup = img.closest('.tpd-a4-img-body');
        if (isMockup) {
            return loadPromise.then(() => {
                return new Promise(resolve => {
                    let retries = 0;
                    const check = () => {
                        if (img.dataset.widthAdjusted === "true" || retries > 40) {
                            resolve();
                        } else {
                            retries++;
                            setTimeout(check, 25);
                        }
                    };
                    check();
                });
            });
        }

        return loadPromise;
    });
    await Promise.all(promises);
}

// Generate confirmation text to send to customers based on current setup
function _tpdGenerateConfirmationText(o, items, templateText) {
    // 1. Generate print details segment
    let printDetailsStr = '';
    items.forEach((item, idx) => {
        printDetailsStr += `• Phiếu ${idx + 1} (${item.product_name || 'Đồng phục'}):\n`;
        
        let printDetails = [];
        if (typeof item.print_details === 'string') {
            try { printDetails = JSON.parse(item.print_details); } catch(e) {}
        } else if (Array.isArray(item.print_details)) {
            printDetails = item.print_details;
        }

        if (printDetails && printDetails.length > 0) {
            printDetails.forEach(d => {
                const parts = [];
                if (d.print_type) parts.push(d.print_type.trim());
                if (d.width && d.width.trim()) parts.push(`Ngang ${d.width.trim()}`);
                if (d.height && d.height.trim()) parts.push(`Cao ${d.height.trim()}`);
                if (d.dimension && d.dimension.trim()) parts.push(d.dimension.trim());
                const posConfig = (_tpd.printPositionsConfig || []).find(p => p.name === d.position);
                const selectedOffsets = _tpdNormalizePrintDetailOffsets(d, posConfig);
                const offsetParts = [];
                Object.keys(selectedOffsets).forEach(lbl => {
                    const val = selectedOffsets[lbl];
                    if (val && val.trim()) {
                        const displayName = lbl.startsWith('_custom_offset_') ? 'Khoảng cách' : lbl;
                        offsetParts.push(`${displayName}: ${val.trim()}`);
                    }
                });
                if (offsetParts.length > 0) {
                    parts.push(offsetParts.join(', '));
                }
                printDetailsStr += `  + Vị trí ${d.position}: ${parts.join(' - ') || '—'}\n`;
            });
        } else {
            printDetailsStr += `  + Không có thông tin in/thêu\n`;
        }
    });

    // 2. Generate size details segment
    let sizeDetailsStr = '';
    items.forEach((item, idx) => {
        let qtyArr = [];
        if (typeof item.quantities === 'string') {
            try { qtyArr = JSON.parse(item.quantities); } catch(e) {}
        } else if (Array.isArray(item.quantities)) {
            qtyArr = item.quantities;
        }

        const sorted = (qtyArr && qtyArr.length > 0)
            ? _tpdSortSizes(qtyArr.map(q => q.size)).map(sz => qtyArr.find(q => q.size === sz)).filter(Boolean)
            : [];
            
        const qtyList = sorted
            .map(q => {
                let sVal = `${q.size}: ${q.qty}`;
                if (q.note && q.note.trim()) {
                    sVal += ` (${q.note.trim()})`;
                }
                return sVal;
            })
            .join(' | ');
        sizeDetailsStr += `• Phiếu ${idx + 1} (${item.product_name || 'Đồng phục'}): ${qtyList || '—'} (Tổng: ${item.quantity || 0} áo)\n`;
    });

    // 3. Generate fabric/color details segment
    let fabricDetailsStr = '';
    items.forEach((item, idx) => {
        const fabricVal = item.material_name || '';
        const colorVal = item.color_name || '';
        const splitRegex = /\s*[\+\/,]\s*/;
        const fabricParts = fabricVal.split(splitRegex).map(s => s.trim()).filter(Boolean);
        const colorParts = colorVal.split(splitRegex).map(s => s.trim()).filter(Boolean);
        
        fabricDetailsStr += `• Phiếu ${idx + 1} (${item.product_name || 'Đồng phục'}):\n`;
        if (fabricParts.length > 0 && fabricParts.length === colorParts.length) {
            fabricParts.forEach((f, i) => {
                const rawCol = colorParts[i];
                let colLabel = rawCol;
                if (rawCol && rawCol !== '—') {
                    colLabel = rawCol.toLowerCase().startsWith('màu') ? rawCol : `Màu ${rawCol}`;
                }
                fabricDetailsStr += `  + ${f} : ${colLabel}\n`;
            });
        } else {
            const colLabel = colorVal ? (colorVal.toLowerCase().startsWith('màu') ? colorVal : `Màu ${colorVal}`) : '—';
            fabricDetailsStr += `  + ${fabricVal || '—'} : ${colLabel}\n`;
        }
    });

    // Trim trailing newlines if any
    printDetailsStr = printDetailsStr.trim();
    sizeDetailsStr = sizeDetailsStr.trim();
    fabricDetailsStr = fabricDetailsStr.trim();

    const defaultTemplate = `Để đơn hàng hoàn thiện như mong muốn, bên em xin gửi lại các thông tin như sau, mong anh/chị xác nhận giúp em ạ :
 1. Nội dung in / thêu và kích thước trên MAKET :
{print_details}
• Mong anh/chị kiểm tra kỹ nội dung, phông chữ, kích thước logo ,bố cục và vị trí logo xem đã chính xác chưa ?
• Tuy nhiên, bên em rất mong anh/chị đo thử chiều ngang logo thực tế trên áo mẫu để cảm nhận trực tiếp kích thước có phù hợp không ?

 2. Báo size đã chốt ở phiếu đơn hàng :
{size_details}

3. Màu áo & chất liệu:
{fabric_details}
• Màu logo in/thêu chỉ giống tương đối so với màu cổ và nẹp áo.
• Màu áo và cổ/nẹp có thể có độ lệch nhẹ do chất liệu vải khác nhau.
• Tất cả màu áo và chất liệu đều có độ phai màu nhất định , khi giặt a/c lưu ý ạ
⸻
*LƯU Ý QUAN TRỌNG : Mọi điều chỉnh xin được báo lại sớm trước khi in hàng loạt ạ

Để tránh những vấn đề sau khi sản xuất, bên em xin phép không chịu trách nhiệm trong các trường hợp sau:
 • Nội dung in, size áo, chất liệu và màu áo có sai sót sau khi đã được chốt.
 • Kích thước logo quá to hoặc quá nhỏ, vì đã làm đúng theo thông tin được xác nhận trước đó.
 • Trong trường hợp anh/chị không ưng cây vải và bên em phải đổi sang cây vải mới, bên em xin phép được lùi thời gian sản xuất đơn hàng ạ`;

    let finalStr = templateText || defaultTemplate;
    finalStr = finalStr.replace('{print_details}', printDetailsStr);
    finalStr = finalStr.replace('{size_details}', sizeDetailsStr);
    finalStr = finalStr.replace('{fabric_details}', fabricDetailsStr);
    return finalStr;
}

// Generate financial summary text for copy block
function _tpdGenerateFinancialSummaryText(o, items) {
    const fmt = n => Number(n || 0).toLocaleString('vi-VN');
    
    let text = `💰 TỔNG KẾT TIỀN ĐƠN HÀNG\n\n`;
    
    items.forEach((item, idx) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        text += `Phiếu ${idx + 1}: ${qty} áo . Giá tiền ${fmt(price)}đ\n`;
    });
    
    text += `\n`;

    const totalItemsAmt = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    const hasVat = !!o.has_vat || (Number(o.vat_amount) > 0);
    const vatAmount = Number(o.vat_amount) || 0;
    const totalAmount = Number(o.total_amount) || 0;
    const depositAmount = Number(o.deposit_amount) || 0;
    const remainingAmount = Number(o.remaining_amount) || 0;

    text += `Tổng Tiền Hàng : ${fmt(totalItemsAmt)}đ\n`;
    if (hasVat) {
        text += `Tổng VAT : ${fmt(vatAmount)}đ\n`;
        text += `Tổng Sau VAT : ${fmt(totalAmount)}đ\n`;
    }
    text += `Đã Cọc : ${fmt(depositAmount)}đ\n`;
    text += `Còn Lại : ${fmt(remainingAmount)}đ\n`;
    text += `\n`;
    
    const creatorName = o.cskh_name || (window.currentUser && (window.currentUser.full_name || window.currentUser.username)) || '—';
    const customerName = o.customer_name || '—';
    const customerPhone = o.customer_phone || '—';
    const fullAddress = [o.address, o.province].filter(Boolean).join(', ') || '—';
    const shipCarrier = o.carrier_name || '—';
    
    text += `Nhân Viên Lên Đơn : ${creatorName}\n`;
    text += `Tên Khách Hàng : ${customerName}\n`;
    text += `SĐT : ${customerPhone}\n`;
    text += `Địa Chỉ : ${fullAddress}\n`;
    text += `Hình Thức Gửi : ${shipCarrier}\n`;
    
    return text;
}


// Render and show the export modal with image generation and mandatory download flow
async function _tpdShowExportSheetsModal() {
    const state = window._tpdWorkspaceState;
    if (!state) return;
    const o = state.order;
    const items = state.items;

    // Fetch dynamic template from settings
    let templateText = '';
    try {
        const configRes = await apiCall('/api/app-config/export_confirmation_template');
        if (configRes && configRes.value) {
            templateText = configRes.value;
        }
    } catch (e) {
        console.error('Failed to load export confirmation template:', e);
    }

    window._tpdCopiedConfirmationText = false;
    window._tpdCopiedFinancialSummaryText = false;

    // Create the overlay container if not exists
    let overlay = document.getElementById('tpdExportOverlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'tpdExportOverlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.7)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.fontFamily = "'Inter', system-ui, sans-serif";

    // Build the modal card HTML
    overlay.innerHTML = `
        <div class="tpd-export-modal" style="background: #ffffff; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); width: 850px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: tpdFadeIn 0.3s ease;">
            <!-- Modal Header -->
            <div style="padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #122546; color: white;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">📥 Tải về phiếu sản xuất để lên đơn</h3>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">${(o.is_draft && (o.order_code || '').startsWith('NHAP-')) ? `Tên đơn nháp: <strong style="color: #fad24c;">${escapeHTML(o.draft_name || 'Đơn nháp')}</strong>` : `Mã đơn: <strong style="color: #fad24c;">${escapeHTML(o.order_code)}</strong>`} | Bạn cần tải xuống toàn bộ phiếu dưới đây để gửi cho xưởng trước khi hoàn tất.</p>
                </div>
                <button onclick="document.getElementById('tpdExportOverlay').remove()" style="background: none; border: none; color: #ffffff; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
            </div>
            
            <!-- Modal Body -->
            <div style="padding: 24px; overflow-y: auto; flex: 1; background: #f8fafc;">
                <!-- Main Status Banner -->
                <div id="tpdExportMainStatus" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 22px;">⏳</div>
                    <div style="font-size: 13px; color: #1e3a8a; font-weight: 500; line-height: 1.4;">
                        Đang khởi tạo hình ảnh kỹ thuật chất lượng cao cho các phiếu sản xuất. Vui lòng đợi trong giây lát...
                    </div>
                </div>

                <!-- Grid of sheets -->
                <div id="tpdExportGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    ${items.map((item, idx) => `
                        <div class="tpd-export-card" id="exportCard_${idx}" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); transition: all 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="flex: 1; min-width: 0;">
                                    <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        Phiếu ${idx + 1}: ${item.product_name || 'Đồng phục'}
                                    </h4>
                                    <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">SL: ${item.quantity || 0} áo | ${item.material_name || '—'} - ${item.color_name || '—'}</span>
                                </div>
                                <div id="exportStatusBadge_${idx}" style="background: #f1f5f9; color: #64748b; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; white-space: nowrap;">
                                    Đang tạo...
                                </div>
                            </div>
                            
                            <!-- Thumbnail Preview Container -->
                            <div id="exportThumbContainer_${idx}" style="height: 150px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                                <div class="tpd-spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>
                            </div>

                            <!-- Action Button -->
                            <button id="exportDlBtn_${idx}" disabled style="width: 100%; border: none; border-radius: 8px; background: #cbd5e1; color: #64748b; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: not-allowed; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                📥 Tải xuống hình ảnh
                            </button>
                        </div>
                    `).join('')}
                </div>

                <!-- Financial Summary copy block -->
                <div style="margin-top: 24px; padding: 18px; border: 1.5px solid #d97706; background: #fffbeb; border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                        <span style="font-size: 13px; font-weight: 800; color: #78350f; display: flex; align-items: center; gap: 6px;">💰 TỔNG KẾT TIỀN ĐƠN HÀNG</span>
                        <span id="tpdFinancialSummaryCopyStatus" style="font-size: 11px; font-weight: 800; color: #ef4444; background: #fee2e2; padding: 4px 10px; border-radius: 6px;">⚠️ YÊU CẦU BẮT BUỘC: CLICK VÀO KHUNG DƯỚI ĐỂ SAO CHÉP</span>
                    </div>
                    <div id="tpdCopyableFinancialSummaryContainer" onclick="_tpdCopyFinancialSummaryToClipboard()" data-text-to-copy="${escapeHTML(_tpdGenerateFinancialSummaryText(o, items))}" style="cursor: pointer; background: #ffffff; border: 1.5px solid #fef3c7; border-radius: 8px; padding: 14px; font-size: 12px; line-height: 1.6; color: #1f2937; white-space: pre-wrap; max-height: 250px; overflow-y: auto; user-select: none; transition: all 0.2s;" onmouseover="this.style.borderColor='#d97706'; this.style.boxShadow='0 0 10px rgba(217,119,6,0.1)';" onmouseout="this.style.borderColor='#fef3c7'; this.style.boxShadow='none';">${escapeHTML(_tpdGenerateFinancialSummaryText(o, items))}</div>
                </div>

                <!-- Confirmation Text copy block -->
                <div style="margin-top: 24px; padding: 18px; border: 1.5px solid #10b981; background: #f0fdf4; border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                        <span style="font-size: 13px; font-weight: 800; color: #065f46; display: flex; align-items: center; gap: 6px;">📋 MẪU NỘI DUNG XÁC NHẬN CHO KHÁCH HÀNG</span>
                        <span id="tpdCopyStatus" style="font-size: 11px; font-weight: 800; color: #ef4444; background: #fee2e2; padding: 4px 10px; border-radius: 6px;">⚠️ YÊU CẦU BẮT BUỘC: CLICK VÀO KHUNG DƯỚI ĐỂ SAO CHÉP</span>
                    </div>
                    <div id="tpdCopyableTextContainer" onclick="_tpdCopyToClipboard()" data-text-to-copy="${escapeHTML(_tpdGenerateConfirmationText(o, items, templateText))}" style="cursor: pointer; background: #ffffff; border: 1.5px solid #d1fae5; border-radius: 8px; padding: 14px; font-size: 12px; line-height: 1.6; color: #1f2937; white-space: pre-wrap; max-height: 250px; overflow-y: auto; user-select: none; transition: all 0.2s;" onmouseover="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 10px rgba(16,185,129,0.1)';" onmouseout="this.style.borderColor='#d1fae5'; this.style.boxShadow='none';">${escapeHTML(_tpdGenerateConfirmationText(o, items, templateText))}</div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div style="padding: 20px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
                <button onclick="document.getElementById('tpdExportOverlay').remove()" style="border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #475569; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                    Hủy bỏ
                </button>
                <button id="exportConfirmBtn" disabled style="border: none; border-radius: 8px; background: #cbd5e1; color: #64748b; padding: 10px 28px; font-size: 13px; font-weight: 800; cursor: not-allowed; transition: all 0.3s; box-shadow: none;">
                    ✓ Xác Nhận Lên Đơn & Hoàn Tất
                </button>
            </div>
        </div>
        <style>
            @keyframes tpdFadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        </style>
    `;

    document.body.appendChild(overlay);

    // Setup A4 hidden container and render all pages
    let tempContainer = document.getElementById('tpdTempExportContainer');
    if (tempContainer) tempContainer.remove();

    tempContainer = document.createElement('div');
    tempContainer.id = 'tpdTempExportContainer';
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '297mm';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.background = 'white';
    document.body.appendChild(tempContainer);

    let printHtml = '';

    // Loop and generate A4 print templates
    items.forEach((item, idx) => {
        const it = _tpdCloneItemState(item);
        const orderDate = _tpdFormatDateWithDayOfWeek(o.order_date);
        const shipDate = _tpdFormatDateWithDayOfWeek(o.expected_ship_date);
        const deepLink = `${window.location.origin}/taophieudonhang?id=${o.id}&activeTab=${idx}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;
        const mockupSrc = it.mockup_image || '';
        const layout = _tpdGetCustomLayout(idx);
        const customHeight = (layout.height && layout.height !== 'auto') ? layout.height + 'mm' : _tpdGetImagesRowHeight(it);
        const alignmentStyle = `justify-content: ${layout.alignment || 'flex-start'};`;
        const metaMarginStyle = `margin-bottom: ${layout.topSpacing !== undefined ? layout.topSpacing : 7}px;`;

        printHtml += `
            <div class="tpd-print-page" id="tempExportPage_${idx}" style="width: 297mm; height: 210mm; box-sizing: border-box; padding: 8mm; background: white; border: none; margin: 0; overflow: hidden;">
                <div class="tpd-a4-preview-card" style="border:none; box-shadow:none; width:100%; height:100%; padding:0;">
                    <!-- Header Block -->
                    <div class="tpd-a4-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #122546; padding-bottom: 6px; margin-bottom: 6px;">
                        <div class="tpd-a4-header-left" style="display: flex; align-items: center; gap: 12px;">
                            <img src="/images/logo.png" class="tpd-a4-logo" style="height: 64px; object-fit: contain;" onerror="this.style.display='none'">
                            <span class="tpd-a4-brand" style="font-size: 24px; font-weight: 900; color: #122546; text-transform: uppercase; letter-spacing: 0.5px;">ĐỒNG PHỤC <span class="tpd-a4-brand-gold" style="color: #fad24c; font-weight: 900;">HV</span></span>
                        </div>
                        <div class="tpd-a4-header-center" style="text-align: center; flex: 1; margin-right: 20px;">
                            <h1 class="tpd-a4-title" style="font-size: 22px; font-weight: 900; color: #122546; margin: 0; text-transform: uppercase;">PHIẾU SẢN XUẤT</h1>
                            <div class="tpd-a4-order-code" style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 2px; letter-spacing: 0.5px;">${(o.is_draft && (o.order_code || '').startsWith('NHAP-')) ? `TÊN ĐƠN NHÁP: ${escapeHTML((o.draft_name || 'ĐƠN NHÁP').toUpperCase())}` : `MÃ ĐƠN: ${escapeHTML(o.order_code.toUpperCase())}`} | PHIẾU ${idx + 1}/${items.length}</div>
                        </div>
                        <div class="tpd-a4-header-right-qr" style="display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1.5px solid #122546; border-radius: 6px; padding: 4px 6px; background: #ffffff; margin-top: -10px;">
                            <img src="${qrUrl}" style="width: 80px; height: 80px; object-fit: contain;">
                            <span style="font-size: 7px; font-weight: 800; color: #122546; text-transform: uppercase; white-space: nowrap;">Quét mã tiến độ</span>
                        </div>
                    </div>

                    <!-- Metadata info grid -->
                    ${(() => {
                        const isSourceVip = !!(o && ['VT', 'HVVT'].includes(o.source));
                        const isRedSheet = isSourceVip ? true : ((layout && typeof layout.is_red_sheet === 'boolean') ? layout.is_red_sheet : false);
                        const gridStyle = isRedSheet ? 'background: #dc2626 !important; border-color: #dc2626 !important;' : '';
                        const itemStyle = isRedSheet ? 'color: #ffffff !important;' : '';
                        return `
                            <div class="tpd-a4-meta-grid" style="${metaMarginStyle} ${gridStyle}">
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Khách hàng:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.customer_name || '—'}</span></div>
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Người lên đơn:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.cskh_name || '—'}</span></div>
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Thiết kế:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.designer_name || '—'}</span></div>
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Ngày lên đơn:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${orderDate}</span></div>
                            </div>
                        `;
                    })()}

                    <!-- Images Row -->
                    <div class="tpd-a4-images-row" style="height: ${customHeight}; ${alignmentStyle}">
                        <div class="tpd-a4-mockup-wrapper" contenteditable="false" style="width: fit-content; max-width: 100%; height: 100%; min-width: 120px;">
                            <div class="tpd-a4-img-header">Ảnh Thiết Kế Mockup lớn</div>
                            <div class="tpd-a4-img-body">
                                ${mockupSrc ? `<img src="${mockupSrc}" onload="_tpdAdjustMockupWidth(this)">` : `<div class="tpd-a4-img-placeholder">Chưa có ảnh Mockup</div>`}
                            </div>
                        </div>
                        ${_tpdGetInfoBoxHtml(it, layout, o, true)}
                    </div>
                </div>
            </div>
        `;
    });

    tempContainer.innerHTML = printHtml;

    // Wait for all images inside tempContainer to load
    await _tpdWaitForImages(tempContainer);

    // Track download state
    const downloaded = new Array(items.length).fill(false);
    const generatedImages = new Array(items.length).fill(null);

    // Generate canvas for each page sequentially
    for (let idx = 0; idx < items.length; idx++) {
        const pageEl = document.getElementById(`tempExportPage_${idx}`);
        if (!pageEl) continue;

        try {
            const canvas = await html2canvas(pageEl, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgUrl = canvas.toDataURL('image/png');
            generatedImages[idx] = imgUrl;

            // Update Thumbnail Preview
            const thumbContainer = document.getElementById(`exportThumbContainer_${idx}`);
            if (thumbContainer) {
                thumbContainer.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px;">`;
            }

            // Update Badge Status
            const statusBadge = document.getElementById(`exportStatusBadge_${idx}`);
            if (statusBadge) {
                statusBadge.innerHTML = 'Chưa tải';
                statusBadge.style.backgroundColor = '#fef3c7';
                statusBadge.style.color = '#d97706';
            }

            // Enable Download Button
            const dlBtn = document.getElementById(`exportDlBtn_${idx}`);
            if (dlBtn) {
                dlBtn.disabled = false;
                dlBtn.style.background = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
                dlBtn.style.color = '#ffffff';
                dlBtn.style.cursor = 'pointer';

                dlBtn.onclick = function() {
                    const cleanProductName = (items[idx].product_name || 'SanPham')
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove tone accents
                        .replace(/đ/g, "d").replace(/Đ/g, "D")
                        .replace(/[^a-zA-Z0-9]/g, "_"); // replace special chars with underscore
                    const filename = `${o.order_code || 'HV'}_Phieu_${idx + 1}_${cleanProductName}.png`;
                    
                    const link = document.createElement('a');
                    link.href = imgUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Mark as downloaded
                    downloaded[idx] = true;
                    
                    // Update Badge to success
                    if (statusBadge) {
                        statusBadge.innerHTML = '✓ Đã tải';
                        statusBadge.style.backgroundColor = '#dcfce7';
                        statusBadge.style.color = '#15803d';
                    }

                    // Re-evaluate unlock status
                    if (typeof window._tpdCheckConfirmUnlock === 'function') {
                        window._tpdCheckConfirmUnlock();
                    }
                };
            }

        } catch (err) {
            console.error(`Error rendering sheet index ${idx}:`, err);
            const thumbContainer = document.getElementById(`exportThumbContainer_${idx}`);
            if (thumbContainer) {
                thumbContainer.innerHTML = `<span style="font-size: 11px; color: #ef4444; font-weight: 500;">⚠️ Lỗi render hình ảnh</span>`;
            }
        }
    }

    // Update banner status when complete
    const mainStatus = document.getElementById('tpdExportMainStatus');
    if (mainStatus) {
        mainStatus.innerHTML = `
            <div style="font-size: 22px;">✅</div>
            <div style="font-size: 13px; color: #15803d; font-weight: 500; line-height: 1.4;">
                Đã khởi tạo xong hình ảnh toàn bộ phiếu sản xuất! Vui lòng tải xuống từng phiếu để mở khóa nút Xác Nhận.
            </div>
        `;
        mainStatus.style.background = '#f0fdf4';
        mainStatus.style.borderColor = '#bbf7d0';
    }

    // Setup verification functions
    window._tpdCopyToClipboard = function() {
        const textContainer = document.getElementById('tpdCopyableTextContainer');
        if (!textContainer) return;
        
        const text = textContainer.getAttribute('data-text-to-copy') || textContainer.innerText || textContainer.textContent;
        navigator.clipboard.writeText(text).then(() => {
            window._tpdCopiedConfirmationText = true;
            
            // Update Copy Status indicator
            const copyStatus = document.getElementById('tpdCopyStatus');
            if (copyStatus) {
                copyStatus.innerHTML = '✓ ĐÃ SAO CHÉP THÀNH CÔNG VÀO CLIPBOARD!';
                copyStatus.style.backgroundColor = '#d1fae5';
                copyStatus.style.color = '#065f46';
            }
            
            // Show toast
            showToast('📋 Đã sao chép nội dung xác nhận vào bộ nhớ tạm!', 'success');
            
            // Re-evaluate unlock status
            if (typeof window._tpdCheckConfirmUnlock === 'function') {
                window._tpdCheckConfirmUnlock();
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('⚠️ Lỗi sao chép nội dung.', 'error');
        });
    };

    window._tpdCopyFinancialSummaryToClipboard = function() {
        const textContainer = document.getElementById('tpdCopyableFinancialSummaryContainer');
        if (!textContainer) return;
        
        const text = textContainer.getAttribute('data-text-to-copy') || textContainer.innerText || textContainer.textContent;
        navigator.clipboard.writeText(text).then(() => {
            window._tpdCopiedFinancialSummaryText = true;
            
            // Update Copy Status indicator
            const copyStatus = document.getElementById('tpdFinancialSummaryCopyStatus');
            if (copyStatus) {
                copyStatus.innerHTML = '✓ ĐÃ SAO CHÉP THÀNH CÔNG VÀO CLIPBOARD!';
                copyStatus.style.backgroundColor = '#d1fae5';
                copyStatus.style.color = '#065f46';
            }
            
            // Show toast
            showToast('📋 Đã sao chép tổng kết tiền vào bộ nhớ tạm!', 'success');
            
            // Re-evaluate unlock status
            if (typeof window._tpdCheckConfirmUnlock === 'function') {
                window._tpdCheckConfirmUnlock();
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('⚠️ Lỗi sao chép nội dung.', 'error');
        });
    };

    window._tpdCheckConfirmUnlock = function() {
        const confirmBtn = document.getElementById('exportConfirmBtn');
        if (!confirmBtn) return;
        
        const allDownloaded = downloaded.every(d => d === true);
        if (allDownloaded && window._tpdCopiedConfirmationText && window._tpdCopiedFinancialSummaryText) {
            confirmBtn.disabled = false;
            confirmBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            confirmBtn.style.color = '#ffffff';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
            confirmBtn.onclick = async function() {
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = 'Đang xử lý...';
                    const res = await apiCall(`/api/dht/orders/${o.id}/confirm-export`, 'POST');
                    if (res.success) {
                        showToast('🎉 Xác nhận lên đơn và xuất phiếu thành công!', 'success');
                        overlay.remove();
                        if (tempContainer) tempContainer.remove();
                        navigate('taophieudonhang'); // Redirect back to list
                    } else {
                        confirmBtn.disabled = false;
                        confirmBtn.innerHTML = '✓ Xác Nhận Lên Đơn & Hoàn Tất';
                        showToast('⚠️ Lên đơn thất bại: ' + (res.error || 'Lỗi hệ thống'), 'error');
                    }
                } catch (err) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '✓ Xác Nhận Lên Đơn & Hoàn Tất';
                    console.error(err);
                    showToast('⚠️ Lên đơn thất bại: ' + err.message, 'error');
                }
            };
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.background = '#cbd5e1';
            confirmBtn.style.color = '#64748b';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.style.boxShadow = 'none';
            confirmBtn.onclick = null;
        }
    };

    // Run initial unlock evaluation
    window._tpdCheckConfirmUnlock();
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
        const orderDate = _tpdFormatDateWithDayOfWeek(o.order_date);
        const shipDate = _tpdFormatDateWithDayOfWeek(o.expected_ship_date);

        // QR
        const deepLink = `${window.location.origin}/taophieudonhang?id=${o.id}&activeTab=${idx}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;

        const mockupSrc = it.mockup_image || '';

        // Layout options for this specific sheet
        const layout = _tpdGetCustomLayout(idx);
        const customHeight = (layout.height && layout.height !== 'auto') ? layout.height + 'mm' : _tpdGetImagesRowHeight(it);
        const alignmentStyle = `justify-content: ${layout.alignment || 'flex-start'};`;
        const metaMarginStyle = `margin-bottom: ${layout.topSpacing !== undefined ? layout.topSpacing : 7}px;`;

        printHtml += `
            <div class="tpd-print-page">
                <div class="tpd-a4-preview-card" style="border:none; box-shadow:none; width:100%; height:100%;">
                    <!-- Header Block -->
                    <div class="tpd-a4-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #122546; padding-bottom: 6px; margin-bottom: 6px;">
                        <div class="tpd-a4-header-left" style="display: flex; align-items: center; gap: 12px;">
                            <img src="/images/logo.png" class="tpd-a4-logo" style="height: 64px; object-fit: contain;" onerror="this.style.display='none'">
                            <span class="tpd-a4-brand" style="font-size: 24px; font-weight: 900; color: #122546; text-transform: uppercase; letter-spacing: 0.5px;">ĐỒNG PHỤC <span class="tpd-a4-brand-gold" style="color: #fad24c; font-weight: 900;">HV</span></span>
                        </div>
                        <div class="tpd-a4-header-center" style="text-align: center; flex: 1; margin-right: 20px;">
                            <h1 class="tpd-a4-title" style="font-size: 22px; font-weight: 900; color: #122546; margin: 0; text-transform: uppercase;">PHIẾU SẢN XUẤT</h1>
                            <div class="tpd-a4-order-code" style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 2px; letter-spacing: 0.5px;">${(o.is_draft && (o.order_code || '').startsWith('NHAP-')) ? `TÊN ĐƠN NHÁP: ${escapeHTML((o.draft_name || 'ĐƠN NHÁP').toUpperCase())}` : `MÃ ĐƠN: ${escapeHTML(o.order_code.toUpperCase())}`} | PHIẾU ${idx + 1}/${items.length}</div>
                        </div>
                        <div class="tpd-a4-header-right-qr" style="display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1.5px solid #122546; border-radius: 6px; padding: 4px 6px; background: #ffffff; margin-top: -10px;">
                            <img src="${qrUrl}" style="width: 80px; height: 80px; object-fit: contain;">
                            <span style="font-size: 7px; font-weight: 800; color: #122546; text-transform: uppercase; white-space: nowrap;">Quét mã tiến độ</span>
                        </div>
                    </div>

                    <!-- Metadata info grid -->
                    ${(() => {
                        const isSourceVip = !!(o && ['VT', 'HVVT'].includes(o.source));
                        const isRedSheet = isSourceVip ? true : ((layout && typeof layout.is_red_sheet === 'boolean') ? layout.is_red_sheet : false);
                        const gridStyle = isRedSheet ? 'background: #dc2626 !important; border-color: #dc2626 !important;' : '';
                        const itemStyle = isRedSheet ? 'color: #ffffff !important;' : '';
                        return `
                            <div class="tpd-a4-meta-grid" style="${metaMarginStyle} ${gridStyle}">
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Khách hàng:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.customer_name || '—'}</span></div>
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Người lên đơn:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.cskh_name || '—'}</span></div>
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Thiết kế:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${o.designer_name || '—'}</span></div>
                                <div class="tpd-a4-meta-item" style="${itemStyle}"><span class="tpd-a4-meta-label" style="${itemStyle}">Ngày lên đơn:</span> <span class="tpd-a4-meta-val" style="${itemStyle}">${orderDate}</span></div>
                            </div>
                        `;
                    })()}

                    <!-- Images Row -->
                    <div class="tpd-a4-images-row" style="height: ${customHeight}; ${alignmentStyle}">
                        <div class="tpd-a4-mockup-wrapper" style="width: fit-content; max-width: 100%; height: 100%; min-width: 120px;">
                            <div class="tpd-a4-img-header">Ảnh Thiết Kế Mockup lớn</div>
                            <div class="tpd-a4-img-body">
                                ${mockupSrc ? `<img src="${mockupSrc}" onload="_tpdAdjustMockupWidth(this)" onclick="_tpdViewFullImage('${mockupSrc}')" style="cursor: pointer;">` : `<div class="tpd-a4-img-placeholder">Chưa có ảnh Mockup</div>`}
                            </div>
                        </div>
                        ${_tpdGetInfoBoxHtml(it, layout, o)}
                    </div>

                    <!-- Size breakdown table -->
                    <div class="tpd-a4-table-row" style="display: none;">
                        ${_tpdRenderA4SizeTable(it)}
                    </div>


                </div>
            </div>
        `;
    });

    printContainer.innerHTML = printHtml;
    await _tpdWaitForImages(printContainer);
    setTimeout(() => {
        window.print();
    }, 100);
}

// Load size configuration from backend
async function _tpdLoadSizeConfig() {
    try {
        const res = await apiCall(`/api/dht/size-config?_=${Date.now()}`, 'GET');
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

// Load print positions configuration from backend
async function _tpdLoadPrintPositionsConfig() {
    try {
        const res = await apiCall(`/api/dht/print-positions?_=${Date.now()}`, 'GET');
        if (res && !res.error) {
            _tpd.printPositionsConfig = res;
        }
    } catch (e) {
        console.error('Failed to load print positions config:', e);
    }
    // Fallback if not loaded
    if (!_tpd.printPositionsConfig) {
        _tpd.printPositionsConfig = [
            { name: "Ngực", require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Lưng", require_offset: true, offset_label: "Gáy xuống", offset_placeholder: "Ví dụ: 10cm" },
            { name: "Bụng", require_offset: true, offset_label: "Cổ xuống", offset_placeholder: "Ví dụ: 12cm" },
            { name: "Tay Trái", require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Tay Phải", require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Gáy", require_offset: true, offset_label: "Gáy xuống", offset_placeholder: "Ví dụ: 4cm" }
        ];
    }
}

// Load print types configuration from backend
async function _tpdLoadPrintTypesConfig() {
    try {
        const res = await apiCall(`/api/dht/print-types?_=${Date.now()}`, 'GET');
        if (res && !res.error) {
            _tpd.printTypesConfig = res;
        }
    } catch (e) {
        console.error('Failed to load print types config:', e);
    }
    // Fallback if not loaded
    if (!_tpd.printTypesConfig) {
        _tpd.printTypesConfig = ["Thêu", "In PET", "In 3D", "In lưới", "In Decal"];
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
    const key = `tpd_draft_${orderId}_${it.id}`;
    try {
        localStorage.setItem(key, JSON.stringify(it));
    } catch(e) {
        console.warn('LocalStorage quota exceeded or draft save failed:', e);
        try {
            // Clean up other old drafts to free up space
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.startsWith('tpd_draft_') && !k.startsWith(`tpd_draft_${orderId}_`)) {
                    localStorage.removeItem(k);
                }
            }
            // Retry saving
            localStorage.setItem(key, JSON.stringify(it));
        } catch(retryErr) {
            console.error('Failed to save draft even after cleanup:', retryErr);
        }
    }
}

function _tpdClearDraft(it) {
    if (!it || !it.id) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id') || (window._tpdWorkspaceState && window._tpdWorkspaceState.orderId) || '';
    if (!orderId) return;
    localStorage.removeItem(`tpd_draft_${orderId}_${it.id}`);
}

// Print Positions Configuration Modal and Management
// Print Positions Configuration Modal and Management
function _tpdOpenPrintPositionsConfigModal() {
    const state = window._tpdWorkspaceState;
    if (state.role !== 'giam_doc') {
        showToast('Chỉ Giám Đốc mới có quyền thay đổi cấu hình này!', 'danger');
        return;
    }

    let rawConfig = _tpd.printPositionsConfig;
    if (!rawConfig || rawConfig.length === 0) {
        rawConfig = [
            { name: "Ngực", has_offset: false, require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Lưng", has_offset: true, require_offset: true, offset_label: "Gáy xuống", offset_placeholder: "Ví dụ: 10cm" },
            { name: "Bụng", has_offset: true, require_offset: true, offset_label: "Cổ xuống", offset_placeholder: "Ví dụ: 12cm" },
            { name: "Tay Trái", has_offset: false, require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Tay Phải", has_offset: false, require_offset: false, offset_label: "", offset_placeholder: "" },
            { name: "Gáy", has_offset: true, require_offset: true, offset_label: "Gáy xuống", offset_placeholder: "Ví dụ: 4cm" }
        ];
    }
    
    const config = rawConfig.map(p => {
        const offsets = p.offsets || [];
        if (offsets.length === 0 && (p.has_offset || p.require_offset || p.offset_label)) {
            offsets.push({
                label: p.offset_label || 'Khoảng cách',
                placeholder: p.offset_placeholder || 'Ví dụ: 10cm',
                require: !!p.require_offset
            });
        }
        return {
            name: p.name || '',
            offsets: offsets.map(o => ({
                label: o.label || '',
                placeholder: o.placeholder || '',
                require: !!o.require
            }))
        };
    });

    window._tpdModalPrintPositions = JSON.parse(JSON.stringify(config));
    window._tpdModalPrintTypes = JSON.parse(JSON.stringify(_tpd.printTypesConfig || ["Thêu", "In PET", "In 3D", "In lưới", "In Decal"]));

    // Create Modal Element
    const modal = document.createElement('div');
    modal.id = 'tpdPrintPositionsConfigModal';
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
        <div style="background: white; border-radius: 12px; width: 680px; max-width: 95%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); overflow: hidden; display: flex; flex-direction: column; max-height: 85vh;">
            <div style="background: #1e293b; color: white; padding: 16px; font-weight: 700; font-size: 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <span>⚙️ Cài đặt vị trí & kiểu in / thêu sản xuất</span>
                <span style="cursor: pointer; font-size: 18px;" onclick="document.getElementById('tpdPrintPositionsConfigModal').remove()">✕</span>
            </div>
            
            <div style="display: flex; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
                <button type="button" id="tpdModalTabPositions" onclick="_tpdSwitchModalTab('positions')" style="flex: 1; padding: 12px; border: none; background: transparent; font-weight: 700; font-size: 13px; color: #1e293b; border-bottom: 3px solid #2563eb; cursor: pointer; outline: none; transition: all 0.2s;">📍 Vị trí & Khoảng cách</button>
                <button type="button" id="tpdModalTabTypes" onclick="_tpdSwitchModalTab('types')" style="flex: 1; padding: 12px; border: none; background: transparent; font-weight: 700; font-size: 13px; color: #64748b; border-bottom: 3px solid transparent; cursor: pointer; outline: none; transition: all 0.2s;">🎨 Kiểu in/thêu mặc định</button>
            </div>

            <!-- Tab Content: Positions -->
            <div id="tpdModalTabContentPositions" style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
                <div style="padding: 16px 20px 0; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; color: #64748b; font-style: italic;">Cấu hình vị trí in/thêu và các nhãn khoảng cách bắt buộc điền cho Sales.</span>
                    <button type="button" onclick="_tpdAddNewPrintPosition()" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(16,185,129,0.15);">
                        <span>+ Thêm vị trí mới</span>
                    </button>
                </div>

                <div id="tpdPrintPositionsContainer" style="padding: 20px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex-grow: 1; box-sizing: border-box;">
                    <!-- Positions list will be rendered dynamically here -->
                </div>
            </div>

            <!-- Tab Content: Types -->
            <div id="tpdModalTabContentTypes" style="display: none; flex-direction: column; flex-grow: 1; overflow: hidden;">
                <div style="padding: 16px 20px 0; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; color: #64748b; font-style: italic;">Danh sách kiểu in/thêu mặc định hiển thị trong dropdown cho Sales chọn.</span>
                    <button type="button" onclick="_tpdAddNewPrintType()" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(16,185,129,0.15);">
                        <span>+ Thêm kiểu mới</span>
                    </button>
                </div>

                <div id="tpdPrintTypesContainer" style="padding: 20px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex-grow: 1; box-sizing: border-box;">
                    <!-- Print types list will be rendered dynamically here -->
                </div>
            </div>

            <div style="background: #f8fafc; padding: 12px 16px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                <button type="button" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="document.getElementById('tpdPrintPositionsConfigModal').remove()">Hủy</button>
                <button type="button" style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="_tpdSavePrintPositionsConfig()">Lưu cấu hình</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Initial render
    _tpdRenderPrintPositionsModalList();
}

function _tpdSwitchModalTab(tab) {
    const tabPos = document.getElementById('tpdModalTabPositions');
    const tabType = document.getElementById('tpdModalTabTypes');
    const contentPos = document.getElementById('tpdModalTabContentPositions');
    const contentType = document.getElementById('tpdModalTabContentTypes');
    
    if (tab === 'positions') {
        tabPos.style.color = '#1e293b';
        tabPos.style.borderBottomColor = '#2563eb';
        tabType.style.color = '#64748b';
        tabType.style.borderBottomColor = 'transparent';
        contentPos.style.display = 'flex';
        contentType.style.display = 'none';
    } else {
        tabPos.style.color = '#64748b';
        tabPos.style.borderBottomColor = 'transparent';
        tabType.style.color = '#1e293b';
        tabType.style.borderBottomColor = '#2563eb';
        contentPos.style.display = 'none';
        contentType.style.display = 'flex';
        _tpdRenderPrintTypesModalList();
    }
}

function _tpdRenderPrintTypesModalList() {
    const container = document.getElementById('tpdPrintTypesContainer');
    if (!container) return;
    
    const list = window._tpdModalPrintTypes || [];
    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <span style="font-size: 32px;">🎨</span>
                <p style="margin-top: 8px; font-size: 13px;">Chưa có kiểu in/thêu nào. Hãy nhấn "+ Thêm kiểu mới" để bắt đầu.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = list.map((item, idx) => `
        <div style="display: flex; gap: 8px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <span style="font-size: 13px; font-weight: 700; color: #64748b; width: 30px;">#${idx + 1}</span>
            <input type="text" value="${item}" onchange="_tpdUpdateModalPrintTypeVal(${idx}, this.value)" style="font-size: 13px; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; flex: 1; outline: none; height: 32px; background: white;" placeholder="Nhập tên kiểu (ví dụ: In PET, Thêu, In decal...)">
            <button type="button" onclick="_tpdDeleteModalPrintType(${idx})" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;" title="Xóa kiểu này">✕</button>
        </div>
    `).join('');
}

function _tpdAddNewPrintType() {
    window._tpdModalPrintTypes = window._tpdModalPrintTypes || [];
    window._tpdModalPrintTypes.push("");
    _tpdRenderPrintTypesModalList();
    
    const container = document.getElementById('tpdPrintTypesContainer');
    if (container) {
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
    }
}

function _tpdUpdateModalPrintTypeVal(idx, val) {
    window._tpdModalPrintTypes = window._tpdModalPrintTypes || [];
    window._tpdModalPrintTypes[idx] = val ? val.trim() : '';
}

// Delete print type from modal state list
function _tpdDeleteModalPrintType(idx) {
    window._tpdModalPrintTypes = window._tpdModalPrintTypes || [];
    window._tpdModalPrintTypes.splice(idx, 1);
    _tpdRenderPrintTypesModalList();
}

function _tpdRenderPrintPositionsModalList() {
    const container = document.getElementById('tpdPrintPositionsContainer');
    if (!container) return;

    const list = window._tpdModalPrintPositions || [];

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <span style="font-size: 32px;">📍</span>
                <p style="margin-top: 8px; font-size: 13px;">Chưa có vị trí nào. Hãy nhấn "+ Thêm vị trí mới" để bắt đầu.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map((item, idx) => {
        const offsetsHtml = (item.offsets || []).map((off, oIdx) => `
            <div style="display: flex; gap: 8px; align-items: center; background: white; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px 8px; margin-top: 4px; flex-wrap: wrap;">
                <!-- Checkbox for required -->
                <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #334155; cursor: ${!off.label ? 'not-allowed' : 'pointer'}; margin: 0; min-width: 100px;">
                    <input type="checkbox" ${off.require || !off.label ? 'checked' : ''} ${!off.label ? 'disabled' : ''} onchange="_tpdUpdateModalOffsetVal(${idx}, ${oIdx}, 'require', this.checked)" style="cursor: ${!off.label ? 'not-allowed' : 'pointer'}; width: 13px; height: 13px; margin: 0;">
                    <span>Bắt buộc điền</span>
                </label>
                
                <!-- Label Input -->
                <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 140px;">
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; min-width: 80px;">Tên k.cách:</span>
                    <input type="text" value="${off.label || ''}" onchange="_tpdUpdateModalOffsetVal(${idx}, ${oIdx}, 'label', this.value)" style="font-size: 11px; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; flex: 1; height: 22px;" placeholder="Ví dụ: Gáy xuống, Cổ xuống...">
                </div>
                
                <!-- Placeholder Input -->
                <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 140px;">
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; min-width: 70px;">Gợi ý/Ví dụ:</span>
                    <input type="text" value="${off.placeholder || ''}" onchange="_tpdUpdateModalOffsetVal(${idx}, ${oIdx}, 'placeholder', this.value)" style="font-size: 11px; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; flex: 1; height: 22px;" placeholder="Ví dụ: 10cm, 12cm...">
                </div>
                
                <!-- Delete Offset Button -->
                <button type="button" onclick="_tpdDeleteModalOffset(${idx}, ${oIdx})" style="background: none; border: none; color: #ef4444; font-size: 14px; font-weight: 700; cursor: pointer; padding: 2px 6px; display: flex; align-items: center;" title="Xóa khoảng cách này">✕</button>
            </div>
        `).join('');

        return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                    <!-- Position Name -->
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 200px;">
                        <span style="font-size: 12px; font-weight: 700; color: #475569; min-width: 70px;">Vị trí in:</span>
                        <input type="text" value="${item.name || ''}" onchange="_tpdUpdateModalPosVal(${idx}, 'name', this.value)" style="font-weight: 700; font-size: 13px; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; flex: 1; background: white;" placeholder="Ví dụ: Ngực, Lưng, Bụng...">
                    </div>
                    
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <!-- Add offset button -->
                        <button type="button" onclick="_tpdAddNewModalOffset(${idx})" style="background: #2563eb; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;" title="Thêm khoảng cách cho vị trí này">
                            <span>+ Thêm khoảng cách</span>
                        </button>
                        
                        <!-- Delete position button -->
                        <button type="button" onclick="_tpdDeleteModalPrintPosition(${idx})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;" title="Xóa vị trí này">
                            <span>Xóa vị trí</span>
                        </button>
                    </div>
                </div>

                <!-- Offsets list -->
                <div style="margin-top: 4px;">
                    <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 2px;">Các khoảng cách cấu hình:</div>
                    ${item.offsets && item.offsets.length > 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${offsetsHtml}
                        </div>
                    ` : `
                        <div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; background: white;">Không có khoảng cách nào cho vị trí này. Nhấn "+ Thêm khoảng cách" để tạo mới.</div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function _tpdAddNewPrintPosition() {
    const list = window._tpdModalPrintPositions || [];
    list.push({ name: '', offsets: [] });
    _tpdRenderPrintPositionsModalList();
    
    const container = document.getElementById('tpdPrintPositionsContainer');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }
}

function _tpdUpdateModalPosVal(idx, field, val) {
    const list = window._tpdModalPrintPositions || [];
    if (list[idx]) {
        list[idx][field] = val;
        _tpdRenderPrintPositionsModalList();
    }
}

function _tpdAddNewModalOffset(idx) {
    const list = window._tpdModalPrintPositions || [];
    if (list[idx]) {
        if (!list[idx].offsets) list[idx].offsets = [];
        list[idx].offsets.push({ label: 'Gáy xuống', placeholder: 'Ví dụ: 10cm', require: false });
        _tpdRenderPrintPositionsModalList();
    }
}

function _tpdUpdateModalOffsetVal(idx, oIdx, field, val) {
    const list = window._tpdModalPrintPositions || [];
    if (list[idx] && list[idx].offsets && list[idx].offsets[oIdx]) {
        if (field === 'require') {
            list[idx].offsets[oIdx][field] = !!val;
        } else {
            list[idx].offsets[oIdx][field] = val;
        }
        _tpdRenderPrintPositionsModalList();
    }
}

function _tpdDeleteModalOffset(idx, oIdx) {
    const list = window._tpdModalPrintPositions || [];
    if (list[idx] && list[idx].offsets && list[idx].offsets[oIdx]) {
        list[idx].offsets.splice(oIdx, 1);
        _tpdRenderPrintPositionsModalList();
    }
}

function _tpdDeleteModalPrintPosition(idx) {
    const list = window._tpdModalPrintPositions || [];
    if (confirm('Bạn có chắc chắn muốn xóa vị trí in này?')) {
        list.splice(idx, 1);
        _tpdRenderPrintPositionsModalList();
    }
}

async function _tpdSavePrintPositionsConfig() {
    const list = window._tpdModalPrintPositions || [];
    // Validate positions
    const cleaned = [];
    for (const item of list) {
        const name = item.name ? item.name.trim() : '';
        if (!name) {
            showToast('Tên vị trí in không được để trống!', 'warning');
            return;
        }
        const offsets = [];
        if (item.offsets) {
            for (const off of item.offsets) {
                const label = off.label ? off.label.trim() : '';
                // Cho phép để trống nhãn để Sales tự điền và bắt buộc điền
                offsets.push({
                    label,
                    placeholder: off.placeholder ? off.placeholder.trim() : 'Ví dụ: 10cm',
                    require: label === '' ? true : !!off.require
                });
            }
        }
        cleaned.push({
            name,
            offsets
        });
    }

    // Validate print types
    const printTypes = window._tpdModalPrintTypes || [];
    const cleanedPrintTypes = printTypes.map(t => t.trim()).filter(t => t.length > 0);

    try {
        const [resPositions, resTypes] = await Promise.all([
            apiCall('/api/dht/print-positions', 'PUT', cleaned),
            apiCall('/api/dht/print-types', 'PUT', cleanedPrintTypes)
        ]);

        if (resPositions && resPositions.success && resTypes && resTypes.success) {
            showToast('Lưu toàn bộ cài đặt thành công!', 'success');
            const modal = document.getElementById('tpdPrintPositionsConfigModal');
            if (modal) modal.remove();
            
            // Reload and redraw
            await Promise.all([
                _tpdLoadPrintPositionsConfig(),
                _tpdLoadPrintTypesConfig()
            ]);
            _tpdRenderFormInputs();
        } else {
            const errPos = resPositions && resPositions.error ? resPositions.error : '';
            const errType = resTypes && resTypes.error ? resTypes.error : '';
            showToast(`⚠️ Lỗi lưu cấu hình: ${errPos || errType || 'Có lỗi xảy ra'}`, 'danger');
        }
    } catch(e) {
        console.error(e);
        showToast('Không thể kết nối đến máy chủ', 'danger');
    }
}

// Load sewing techniques configuration from backend
async function _tpdLoadSewingTechsConfig() {
    try {
        const res = await apiCall(`/api/dht/sewing-techniques?_=${Date.now()}`, 'GET');
        if (res && !res.error) {
            _tpd.sewingTechsConfig = res;
        }
    } catch (e) {
        console.error('Failed to load sewing techs config:', e);
    }
    // Fallback if not loaded
    if (!_tpd.sewingTechsConfig) {
        _tpd.sewingTechsConfig = ["Bo cổ dệt", "Bo tay dệt", "Móc xích", "Trần đè", "Xẻ tà", "May lé", "Đắp túi", "May gấu", "Nẹp gấp", "Đính dây cổ"];
    }
}

// Helper to parse existing comma-separated sewing techniques string into structured object array
function _tpdParseSewingTechs(customSewingStr) {
    if (!customSewingStr || !customSewingStr.trim()) return [];
    
    const parts = customSewingStr.split(',');
    const items = [];
    
    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        
        const colonIdx = part.indexOf(':');
        if (colonIdx !== -1) {
            const tech = part.substring(0, colonIdx).trim();
            const detail = part.substring(colonIdx + 1).trim();
            items.push({ tech, detail });
        } else {
            const configSewingTechs = _tpdGetNormalizedSewingTechs().map(c => c.tech);
            const match = configSewingTechs.find(t => part.toLowerCase().startsWith(t.toLowerCase()));
            if (match) {
                const detail = part.substring(match.length).replace(/^[:\s-]+/, '').trim();
                items.push({ tech: match, detail: detail });
            } else {
                items.push({ tech: part, detail: '' });
            }
        }
    }
    return items;
}

function _tpdFormatColorName(color) {
    if (!color) return '';
    return String(color).replace(/\s*\+\s*/g, ' + ');
}

function _tpdSortBySewingGroup(arr, getTechFn) {
    if (!arr || arr.length <= 1) return arr;
    const priority = ['NHÓM NẸP', 'Nhóm Cổ', 'Nhóm Bo / Tay', 'Khác'];
    const normPriority = priority.map(p => _tpdNormalizeText(p));
    
    return arr.sort((a, b) => {
        const techA = getTechFn ? getTechFn(a) : a;
        const techB = getTechFn ? getTechFn(b) : b;
        
        const groupA = _tpdGetSewingTechGroup(techA);
        const groupB = _tpdGetSewingTechGroup(techB);
        
        const normA = _tpdNormalizeText(groupA);
        const normB = _tpdNormalizeText(groupB);
        
        let idxA = normPriority.indexOf(normA);
        let idxB = normPriority.indexOf(normB);
        
        if (idxA === -1 && (normA === 'NHÓM KHÁC' || normA === 'KHÁC')) idxA = normPriority.indexOf('KHÁC');
        if (idxB === -1 && (normB === 'NHÓM KHÁC' || normB === 'KHÁC')) idxB = normPriority.indexOf('KHÁC');
        
        if (idxA !== -1 && idxB !== -1) {
            if (idxA !== idxB) {
                return idxA - idxB;
            }
            const tA = _tpdNormalizeText(techA);
            const tB = _tpdNormalizeText(techB);
            return tA.localeCompare(tB);
        }
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        
        return normA.localeCompare(normB);
    });
}

function _tpdGetSewingTechniqueNames(sewingTechField) {
    if (!sewingTechField) return [];
    try {
        const arr = typeof sewingTechField === 'string' ? JSON.parse(sewingTechField) : sewingTechField;
        if (Array.isArray(arr)) {
            const names = arr.map(x => {
                if (x && typeof x === 'object') {
                    return x.name || x.tech || '';
                }
                return String(x);
            }).filter(Boolean);
            return _tpdSortBySewingGroup(names);
        }
    } catch(e) {}
    return [];
}

function _tpdGetNormalizedSewingTechs() {
    const raw = _tpd.sewingTechsConfig || ["Bo cổ dệt", "Bo tay dệt", "Móc xích", "Trần đè", "Xẻ tà", "May lé", "Đắp túi", "May gấu", "Nẹp gấp", "Đính dây cổ"];
    return raw.map(item => {
        if (item && typeof item === 'object') {
            return {
                tech: item.tech || '',
                group: item.group || 'Khác'
            };
        } else {
            const tech = String(item || '');
            let group = 'Khác';
            const lower = tech.toLowerCase();
            if (lower.normalize('NFC').includes('nẹp')) {
                group = 'NHÓM NẸP';
            } else if (lower.includes('cổ')) {
                group = 'Nhóm Cổ';
            } else if (lower.includes('bo') || lower.includes('tay')) {
                group = 'Nhóm Bo / Tay';
            }
            return { tech, group };
        }
    });
}

function _tpdExtractString(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const possibleString = val.tech || val.name || val.techName || '';
        return _tpdExtractString(possibleString);
    }
    return String(val);
}

function _tpdNormalizeText(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFC')
        .trim()
        .toUpperCase();
}

function _tpdSortGroups(groups) {
    const priority = ['NHÓM NẸP', 'Nhóm Cổ', 'Nhóm Bo / Tay', 'Khác'];
    const normPriority = priority.map(p => _tpdNormalizeText(p));
    
    return Object.entries(groups).sort((a, b) => {
        const keyA = _tpdNormalizeText(a[0]);
        const keyB = _tpdNormalizeText(b[0]);
        
        const indexA = normPriority.indexOf(keyA);
        const indexB = normPriority.indexOf(keyB);
        
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        return keyA.localeCompare(keyB);
    });
}

function _tpdGetSewingTechGroup(tech) {
    if (!tech) return 'Khác';
    const techName = _tpdExtractString(tech);
    if (!techName || techName === 'Khác') return 'Khác';
    
    const normalized = _tpdGetNormalizedSewingTechs();
    const match = normalized.find(n => {
        const t1 = _tpdNormalizeText(_tpdExtractString(n.tech));
        const t2 = _tpdNormalizeText(techName);
        return t1 === t2;
    });
    if (match) return match.group;
    
    // Heuristic fallback for custom/new entries
    const lower = techName.toLowerCase();
    if (lower.normalize('NFC').includes('nẹp')) return 'NHÓM NẸP';
    if (lower.includes('cổ')) return 'Nhóm Cổ';
    const accentRemoved = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/đ/g, 'd');
    if (accentRemoved.startsWith('bo tay') || accentRemoved.startsWith('bo o tay')) return 'Nhóm Bo / Tay';
    return 'Khác';
}

function _tpdIsBoTay(techName) {
    if (!techName) return false;
    const trimmed = techName.trim();
    if (!trimmed || trimmed === 'Khác') return false;

    const normalizedConfig = _tpdGetNormalizedSewingTechs();
    const normTech = _tpdNormalizeText(trimmed);
    const match = normalizedConfig.find(n => {
        return _tpdNormalizeText(n.tech) === normTech;
    });
    if (match) {
        return match.group === 'Nhóm Bo / Tay';
    }

    const accentRemoved = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, 'd');
    return accentRemoved.startsWith('bo tay') || accentRemoved.startsWith('bo o tay');
}

// Add sewing technique item row
function _tpdAddSewingItem() {
    const state = window._tpdWorkspaceState;
    if (!state.hasEditPermission || !state.editingItem) return;

    const it = state.editingItem;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);

    if (!layout.sewing_items) {
        if (layout.custom_sewing) {
            layout.sewing_items = _tpdParseSewingTechs(layout.custom_sewing);
        } else {
            layout.sewing_items = [];
        }
    }

    const configSewingTechs = _tpd.sewingTechsConfig || ["Bo cổ dệt", "Bo tay dệt", "Móc xích", "Trần đè", "Xẻ tà", "May lé", "Đắp túi", "May gấu", "Nẹp gấp", "Đính dây cổ"];
    
    let defaultTech = 'Khác';
    for (const t of configSewingTechs) {
        const tName = typeof t === 'object' ? (t.tech || '') : String(t);
        const group = _tpdGetSewingTechGroup(tName);
        if (group === 'Khác') {
            defaultTech = tName;
            break;
        } else {
            const configTechNames = configSewingTechs.map(t => typeof t === 'object' ? (t.tech || '') : String(t));
            const alreadyChosen = layout.sewing_items.some(item => {
                if (!configTechNames.includes(item.tech)) return false;
                return _tpdGetSewingTechGroup(item.tech) === group;
            });
            if (!alreadyChosen) {
                defaultTech = tName;
                break;
            }
        }
    }
    
    layout.sewing_items.push({ tech: defaultTech, detail: '' });

    _tpdSyncCustomSewingText(layout);
    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
}

// Update sewing item field (tech name or detail info)
function _tpdUpdateSewingItem(sIdx, field, value) {
    const state = window._tpdWorkspaceState;
    if (!state || !state.editingItem) return;

    const it = state.editingItem;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);

    if (!layout.sewing_items || !layout.sewing_items[sIdx]) return;

    if (field === 'tech') {
        const newGroup = _tpdGetSewingTechGroup(value);
        if (newGroup !== 'Khác') {
            const hasDuplicate = layout.sewing_items.some((item, idx) => {
                if (idx === sIdx) return false;
                return _tpdGetSewingTechGroup(item.tech) === newGroup;
            });
            if (hasDuplicate) {
                showToast(`Mỗi nhóm kỹ thuật may chỉ được chọn duy nhất 1 loại (Nhóm "${newGroup}" đã được chọn)!`, 'warning');
                _tpdRenderFormInputs();
                return;
            }
        }
    }

    layout.sewing_items[sIdx][field] = value ? value.trim() : '';

    _tpdSyncCustomSewingText(layout);
    _tpdSaveDraft(it);
    _tpdUpdateLivePreview();
    
    if (field === 'tech') {
        _tpdRenderFormInputs();
    }
}

function _tpdUpdateSewingNote(value) {
    const state = window._tpdWorkspaceState;
    if (!state || !state.editingItem) return;

    const it = state.editingItem;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);

    layout.custom_sewing_note = value ? value.trim() : '';

    _tpdSaveDraft(it);
    _tpdUpdateLivePreview();
}

// Remove sewing item row
function _tpdRemoveSewingItem(sIdx) {
    const state = window._tpdWorkspaceState;
    if (!state.hasEditPermission || !state.editingItem) return;

    const it = state.editingItem;
    const layout = _tpdGetCustomLayout(state.activeItemIndex);

    if (!layout.sewing_items || !layout.sewing_items[sIdx]) return;

    layout.sewing_items.splice(sIdx, 1);

    _tpdSyncCustomSewingText(layout);
    _tpdSaveDraft(it);
    _tpdRenderFormInputs();
    _tpdUpdateLivePreview();
}

// Format and sync sewing items array back into layout.custom_sewing string for layout preview
function _tpdSyncCustomSewingText(layout) {
    if (!layout.sewing_items || layout.sewing_items.length === 0) {
        layout.custom_sewing = '';
        return;
    }
    _tpdSortBySewingGroup(layout.sewing_items, x => x.tech);
    layout.custom_sewing = layout.sewing_items
        .map(item => {
            const techName = item.tech === 'Khác' ? '' : item.tech;
            if (!techName && !item.detail) return '';
            return techName + (item.detail ? (techName ? ': ' : '') + item.detail : '');
        })
        .filter(Boolean)
        .join(', ');
}

// Sewing Techniques Configuration Modal and Management
function _tpdOpenSewingTechsConfigModal() {
    const state = window._tpdWorkspaceState;
    if (state.role !== 'giam_doc') {
        showToast('Chỉ Giám Đốc mới có quyền thay đổi cấu hình này!', 'danger');
        return;
    }

    let config = _tpd.sewingTechsConfig || ["Bo cổ dệt", "Bo tay dệt", "Móc xích", "Trần đè", "Xẻ tà", "May lé", "Đắp túi", "May gấu", "Nẹp gấp", "Đính dây cổ"];
    window._tpdModalSewingTechs = JSON.parse(JSON.stringify(config));

    const modal = document.createElement('div');
    modal.id = 'tpdSewingTechsConfigModal';
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
        <div style="background: white; border-radius: 12px; width: 500px; max-width: 95%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); overflow: hidden; display: flex; flex-direction: column; max-height: 85vh;">
            <div style="background: #1e293b; color: white; padding: 16px; font-weight: 700; font-size: 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <span>⚙️ Cài đặt danh sách kỹ thuật may sản xuất</span>
                <span style="cursor: pointer; font-size: 18px;" onclick="document.getElementById('tpdSewingTechsConfigModal').remove()">✕</span>
            </div>
            
            <div style="padding: 16px 20px 0; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #64748b; font-style: italic;">Quản lý danh sách các kỹ thuật may mặc định cho nhân viên chọn.</span>
                <button type="button" onclick="_tpdAddNewSewingTechOption()" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(16,185,129,0.15);">
                    <span>+ Thêm kỹ thuật</span>
                </button>
            </div>

            <div id="tpdSewingTechsContainer" style="padding: 20px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex-grow: 1; box-sizing: border-box;">
                <!-- Tech list will be rendered dynamically here -->
            </div>

            <div style="background: #f8fafc; padding: 12px 16px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                <button type="button" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="document.getElementById('tpdSewingTechsConfigModal').remove()">Hủy</button>
                <button type="button" style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="_tpdSaveSewingTechsConfig()">Lưu cấu hình</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    _tpdRenderSewingTechsModalList();
}

function _tpdRenderSewingTechsModalList() {
    const container = document.getElementById('tpdSewingTechsContainer');
    if (!container) return;

    const list = window._tpdModalSewingTechs || [];

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <span style="font-size: 32px;">🧵</span>
                <p style="margin-top: 8px; font-size: 13px;">Chưa có kỹ thuật may nào. Nhấn "+ Thêm kỹ thuật" để bắt đầu.</p>
            </div>
        `;
        return;
    }

    const groups = {};

    list.forEach((item, idx) => {
        let tech = '';
        let group = 'Khác';
        if (item && typeof item === 'object') {
            tech = item.tech || '';
            group = item.group || 'Khác';
        } else {
            tech = String(item || '');
            group = _tpdGetSewingTechGroup(tech);
        }
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push({ tech, idx, group });
    });

    let html = '';
    for (const [groupName, items] of _tpdSortGroups(groups)) {
        if (items.length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 800; font-size: 12px; color: #1e3a8a; margin-bottom: 8px; padding-left: 2px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${escapeHTML(groupName)}</span>
                        <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 9999px; font-size: 10px;">${items.length} kỹ thuật</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
            `;
            items.forEach(item => {
                html += `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; gap: 10px; align-items: center; justify-content: space-between;">
                        <div style="flex: 2; display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em;">TÊN KỸ THUẬT</label>
                            <input type="text" value="${escapeHTML(item.tech)}" onchange="_tpdUpdateModalSewingTech(${item.idx}, 'tech', this.value)" style="font-weight: 700; font-size: 13px; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 10px; background: white;" placeholder="Tên kỹ thuật...">
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em;">NHÓM</label>
                            <input type="text" value="${escapeHTML(item.group)}" onchange="_tpdUpdateModalSewingTech(${item.idx}, 'group', this.value)" style="font-size: 12px; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 10px; background: white;" placeholder="Nhóm...">
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; margin-top: 14px;">
                            <button type="button" onclick="_tpdDeleteModalSewingTech(${item.idx})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;" title="Xóa">
                                <span>Xóa</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `
                    </div>
                </div>
            `;
        }
    }
    container.innerHTML = html;
}

function _tpdAddNewSewingTechOption() {
    const list = window._tpdModalSewingTechs || [];
    
    // Get unique existing groups
    const normalized = list.map(item => {
        if (item && typeof item === 'object') {
            return item.group || 'Khác';
        } else {
            return _tpdGetSewingTechGroup(item);
        }
    });
    const uniqueGroups = [...new Set(normalized)];
    if (!uniqueGroups.includes('NHÓM NẸP')) uniqueGroups.push('NHÓM NẸP');
    if (!uniqueGroups.includes('Nhóm Cổ')) uniqueGroups.push('Nhóm Cổ');
    if (!uniqueGroups.includes('Nhóm Bo / Tay')) uniqueGroups.push('Nhóm Bo / Tay');
    if (!uniqueGroups.includes('Khác')) uniqueGroups.push('Khác');

    // Create prompt overlay modal
    const promptModal = document.createElement('div');
    promptModal.id = 'tpdAddSewingTechPromptModal';
    promptModal.style.position = 'fixed';
    promptModal.style.top = '0';
    promptModal.style.left = '0';
    promptModal.style.width = '100%';
    promptModal.style.height = '100%';
    promptModal.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
    promptModal.style.display = 'flex';
    promptModal.style.alignItems = 'center';
    promptModal.style.justifyContent = 'center';
    promptModal.style.zIndex = '999999';

    const groupOptionsHtml = uniqueGroups.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('');

    promptModal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 400px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px;">Thêm Kỹ Thuật May Mới</div>
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 11px; font-weight: 700; color: #64748b;">TÊN KỸ THUẬT</label>
                <input type="text" id="tpdNewTechName" class="tpd-ws-input" style="font-size: 12px; padding: 6px 10px; height: 28px;" placeholder="Ví dụ: Cổ Tròn, Trần đè, Bo tay dệt...">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 11px; font-weight: 700; color: #64748b;">CHỌN NHÓM</label>
                <select id="tpdNewTechGroupSelect" class="tpd-ws-input" style="font-size: 12px; padding: 4px 6px; height: 28px;" onchange="document.getElementById('tpdNewTechCustomGroupContainer').style.display = this.value === '__NEW__' ? 'flex' : 'none'">
                    ${groupOptionsHtml}
                    <option value="__NEW__" style="font-weight: bold; color: #2563eb;">+ Tạo nhóm mới...</option>
                </select>
            </div>

            <div id="tpdNewTechCustomGroupContainer" style="display: none; flex-direction: column; gap: 4px;">
                <label style="font-size: 11px; font-weight: 700; color: #2563eb;">TÊN NHÓM MỚI</label>
                <input type="text" id="tpdNewTechCustomGroup" class="tpd-ws-input" style="font-size: 12px; padding: 6px 10px; height: 28px;" placeholder="Ví dụ: Nhóm Gấu, Nhóm Túi...">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                <button type="button" style="padding: 6px 12px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;" onclick="document.getElementById('tpdAddSewingTechPromptModal').remove()">Hủy</button>
                <button type="button" style="padding: 6px 12px; border: none; background: #2563eb; color: white; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;" onclick="_tpdSubmitNewSewingTechOption()">Xác nhận</button>
            </div>
        </div>
    `;

    document.body.appendChild(promptModal);
    document.getElementById('tpdNewTechName').focus();
}

function _tpdSubmitNewSewingTechOption() {
    const nameInput = document.getElementById('tpdNewTechName');
    const groupSelect = document.getElementById('tpdNewTechGroupSelect');
    const customGroupInput = document.getElementById('tpdNewTechCustomGroup');

    const techName = nameInput ? nameInput.value.trim() : '';
    if (!techName) {
        showToast('Vui lòng nhập tên kỹ thuật!', 'warning');
        return;
    }

    let groupName = groupSelect ? groupSelect.value : 'Khác';
    if (groupName === '__NEW__') {
        groupName = customGroupInput ? customGroupInput.value.trim() : '';
        if (!groupName) {
            showToast('Vui lòng nhập tên nhóm mới!', 'warning');
            return;
        }
    }

    const list = window._tpdModalSewingTechs || [];
    
    const exists = list.some(item => {
        if (item && typeof item === 'object') {
            return item.tech.toLowerCase() === techName.toLowerCase();
        } else {
            return String(item).toLowerCase() === techName.toLowerCase();
        }
    });

    if (exists) {
        showToast('Kỹ thuật may này đã tồn tại!', 'warning');
        return;
    }

    list.push({ tech: techName, group: groupName });

    const promptModal = document.getElementById('tpdAddSewingTechPromptModal');
    if (promptModal) promptModal.remove();

    _tpdRenderSewingTechsModalList();

    const container = document.getElementById('tpdSewingTechsContainer');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }
}

function _tpdUpdateModalSewingTech(idx, field, val) {
    const list = window._tpdModalSewingTechs || [];
    if (list[idx] !== undefined) {
        if (list[idx] && typeof list[idx] === 'object') {
            list[idx][field] = val ? val.trim() : '';
        } else {
            const tech = field === 'tech' ? (val ? val.trim() : '') : String(list[idx]);
            let group = _tpdGetSewingTechGroup(tech);
            if (field === 'group') {
                group = val ? val.trim() : '';
            }
            list[idx] = { tech, group };
        }
    }
}

function _tpdDeleteModalSewingTech(idx) {
    const list = window._tpdModalSewingTechs || [];
    if (confirm('Bạn có chắc chắn muốn xóa kỹ thuật may này khỏi danh sách?')) {
        list.splice(idx, 1);
        _tpdRenderSewingTechsModalList();
    }
}

async function _tpdSaveSewingTechsConfig() {
    const list = window._tpdModalSewingTechs || [];
    const cleaned = list.map(item => {
        if (item && typeof item === 'object') {
            return {
                tech: (item.tech || '').trim(),
                group: (item.group || 'Khác').trim()
            };
        } else {
            const tech = String(item || '').trim();
            const group = _tpdGetSewingTechGroup(tech);
            return { tech, group };
        }
    }).filter(item => item.tech);

    try {
        const res = await apiCall('/api/dht/sewing-techniques', 'PUT', cleaned);
        if (res && res.success) {
            showToast('Lưu cấu hình kỹ thuật may thành công!', 'success');
            const modal = document.getElementById('tpdSewingTechsConfigModal');
            if (modal) modal.remove();
            
            await _tpdLoadSewingTechsConfig();
            _tpdRenderFormInputs();
        } else {
            showToast(res && res.error ? res.error : 'Có lỗi xảy ra khi lưu cấu hình', 'danger');
        }
    } catch(e) {
        console.error(e);
        showToast('Không thể kết nối đến máy chủ', 'danger');
    }
}


