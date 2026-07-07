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
            <div class="tpd-order-card ${isDraft ? 'card-draft' : ''} ${_tpd.activeOrderId == o.id ? 'card-active' : ''}" onclick="_tpdOpenOrderTechCard(${o.id})">
                <div class="card-header">
                    <span class="card-code">${escapeHTML(o.order_code || 'CHƯA CÓ MÃ')}</span>
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
                    <button class="tpd-card-btn" onclick="event.stopPropagation(); _tpdOpenOrderTechCard(${o.id})">Thiết kế phiếu →</button>
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
    const body = document.getElementById('tpdDrawerBody');
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

    // HTML Structure of Tech Card
    body.innerHTML = `
        <div class="tpd-tech-card-wrapper">
            <!-- Toolbar -->
            <div class="tpd-tech-card-toolbar no-print">
                <button class="tpd-btn tpd-btn-print" onclick="_tpdPrintOrderTechCard(${o.id})">
                    🖨️ In Phiếu Đơn Hàng
                </button>
                <button class="tpd-btn tpd-btn-secondary" onclick="_tpdCopyScanLink('${deepLink}')">
                    🔗 Copy Link Quét
                </button>
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
                    <span class="sheet-order-code">Mã đơn: ${escapeHTML(o.order_code || 'DRAFT')}</span>
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
            _tpdOpenOrderTechCard(orderId);
        } catch(e) {
            console.error(e);
            showToast('Lỗi lưu ảnh thiết kế: ' + e.message, 'error');
            _tpdOpenOrderTechCard(orderId);
        }
    };
    reader.readAsDataURL(file);
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
            <button class="tpd-mini-btn btn-cancel" style="margin-top:4px" onclick="_tpdOpenOrderTechCard(${orderId})">Hủy</button>
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
