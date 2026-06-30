// ========== GIÁ NHẬP GỐC — Desktop SPA ==========
var _gng = {
    prices: [],
    history: [],
    pending: [],
    filter: {
        tab: 'approved', // 'approved', 'history', 'pending'
        search: '',
        supplier: '',
        type: '' // '', 'fabric', 'material'
    },
    isDuyetUser: false
};

async function renderGiaNhapGocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Inject custom premium CSS for this page
    if (!document.getElementById('_gngStyles')) {
        const style = document.createElement('style');
        style.id = '_gngStyles';
        style.textContent = `
            .gng-container {
                padding: 24px;
                background: #f8fafc;
                min-height: 100%;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                animation: gngFadeIn 0.3s ease-out;
            }
            @keyframes gngFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .gng-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
            }
            .gng-title-area h2 {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                background: linear-gradient(135deg, #1e293b, #475569);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .gng-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0 0;
            }
            
            /* Tabs Navigation */
            .gng-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 1px;
            }
            .gng-tab-btn {
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 600;
                color: #64748b;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .gng-tab-btn:hover {
                color: #4f46e5;
                background: #f1f5f9;
                border-radius: 8px 8px 0 0;
            }
            .gng-tab-btn.active {
                color: #4f46e5;
                border-bottom-color: #4f46e5;
                font-weight: 700;
            }
            .gng-tab-badge {
                font-size: 11px;
                background: #ef4444;
                color: white;
                padding: 2px 8px;
                border-radius: 9999px;
                font-weight: 700;
            }

            /* Stats grid */
            .gng-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }
            .gng-stat-card {
                background: white;
                border-radius: 16px;
                padding: 20px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01);
                transition: all 0.2s ease;
                position: relative;
            }
            .gng-stat-card:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 12px -3px rgba(0,0,0,0.04);
            }
            .gng-stat-val {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 4px;
            }
            .gng-stat-label {
                font-size: 13px;
                color: #64748b;
                font-weight: 500;
            }

            /* Controls and filters */
            .gng-controls {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                align-items: center;
            }
            .gng-input {
                flex: 1;
                min-width: 260px;
                padding: 10px 14px;
                border-radius: 10px;
                border: 1px solid #cbd5e1;
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
            }
            .gng-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            }
            .gng-select {
                padding: 10px 14px;
                border-radius: 10px;
                border: 1px solid #cbd5e1;
                font-size: 14px;
                background-color: white;
                outline: none;
                cursor: pointer;
                transition: all 0.2s;
            }
            .gng-select:focus {
                border-color: #4f46e5;
            }

            /* Cards and tables */
            .gng-table-card {
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                overflow: hidden;
            }
            .gng-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
            }
            .gng-table th {
                background: #f8fafc;
                padding: 14px 18px;
                font-size: 12px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
            }
            .gng-table td {
                padding: 14px 18px;
                font-size: 14px;
                color: #334155;
                border-bottom: 1px solid #f1f5f9;
            }
            .gng-table tr:last-child td {
                border-bottom: none;
            }
            .gng-table tr:hover td {
                background: #f8fafc;
            }

            /* Pending approvals list */
            .gng-pending-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .gng-pending-card {
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                transition: all 0.2s;
            }
            .gng-pending-card:hover {
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04);
            }
            .gng-pending-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 12px;
                margin-bottom: 14px;
            }
            .gng-pending-title {
                font-size: 16px;
                font-weight: 700;
                color: #0f172a;
            }
            .gng-pending-meta {
                font-size: 13px;
                color: #64748b;
                margin-top: 4px;
                display: flex;
                gap: 16px;
            }
            .gng-pending-actions {
                display: flex;
                gap: 8px;
            }
            .gng-btn-approve {
                background: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .gng-btn-approve:hover {
                background: #059669;
            }
            .gng-disc-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
            }
            .gng-disc-table th {
                background: #fffbeb;
                color: #b45309;
                font-size: 12px;
                padding: 8px 12px;
                text-align: left;
            }
            .gng-disc-table td {
                padding: 10px 12px;
                font-size: 13px;
                border-bottom: 1px solid #fef3c7;
            }
            .gng-disc-table tr:last-child td {
                border-bottom: none;
            }
            .gng-badge-type {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .gng-badge-fabric { background: #e0e7ff; color: #4338ca; }
            .gng-badge-material { background: #fef3c7; color: #d97706; }

            .gng-badge {
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 9999px;
                font-weight: 600;
            }
            .gng-badge-stable { background: #dcfce7; color: #15803d; }
            .gng-badge-alert { background: #fee2e2; color: #b91c1c; }

            /* Modal Styles */
            .gng-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: gngFadeIn 0.2s ease-out;
            }
            .gng-modal-card {
                background: white;
                border-radius: 16px;
                width: 100%;
                max-width: 600px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                overflow: hidden;
            }
            .gng-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .gng-modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
                color: #0f172a;
            }
            .gng-modal-close {
                background: transparent;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #64748b;
            }
            .gng-modal-body {
                padding: 20px;
                max-height: 70vh;
                overflow-y: auto;
            }
            .gng-modal-footer {
                padding: 14px 20px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: #f8fafc;
            }
            .gng-form-group {
                margin-bottom: 16px;
            }
            .gng-form-group label {
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                margin-bottom: 6px;
            }
            .gng-btn-primary {
                background: #4f46e5;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 14px;
                cursor: pointer;
            }
            .gng-btn-primary:hover {
                background: #4338ca;
            }
            .gng-btn-secondary {
                background: #e2e8f0;
                color: #475569;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 14px;
                cursor: pointer;
            }
            .gng-btn-secondary:hover {
                background: #cbd5e1;
            }
            .gng-empty {
                padding: 40px;
                text-align: center;
                color: #64748b;
            }
            .gng-empty-icon {
                font-size: 40px;
                margin-bottom: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    // Set active area
    _gng.content = content;

    // Fetch user permissions first
    try {
        const permRes = await apiCall('/api/import/check-duyet-perm', 'GET');
        _gng.isDuyetUser = !!permRes.allowed;
    } catch(e) {
        _gng.isDuyetUser = false;
    }

    await _gngLoadData();
}

async function _gngLoadData() {
    try {
        const [pricesRes, historyRes, pendingRes] = await Promise.all([
            apiCall('/api/gianhapgoc/prices', 'GET'),
            apiCall('/api/gianhapgoc/history', 'GET'),
            apiCall('/api/gianhapgoc/pending', 'GET')
        ]);

        _gng.prices = pricesRes.prices || [];
        _gng.history = historyRes.history || [];
        _gng.pending = pendingRes.pending || [];

        _gngRenderLayout();
    } catch(err) {
        console.error('[GNG Load error]', err);
        if (typeof showToast === 'function') showToast('Không thể tải dữ liệu giá nhập gốc: ' + err.message, 'error');
    }
}

function _gngRenderLayout() {
    if (!_gng.content) return;

    // Compile list of unique suppliers
    const suppliers = new Set();
    _gng.prices.forEach(p => { if (p.source_name) suppliers.add(p.source_name); });
    _gng.history.forEach(h => { if (h.source_name) suppliers.add(h.source_name); });

    let supplierOptions = '';
    suppliers.forEach(s => {
        supplierOptions += `<option value="${s}" ${_gng.filter.supplier === s ? 'selected' : ''}>${s}</option>`;
    });

    _gng.content.innerHTML = `
        <div class="gng-container">
            <div class="gng-header">
                <div class="gng-title-area">
                    <h2>🏷️ Giá Nhập Gốc</h2>
                    <p>Quản lý, tra cứu và kiểm soát chênh lệch đơn giá của nguyên vật liệu & phụ liệu sản xuất</p>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="gng-stats">
                <div class="gng-stat-card" style="border-top: 4px solid #4f46e5;">
                    <div class="gng-stat-val">${_gng.prices.length}</div>
                    <div class="gng-stat-label">Tổng Vật Tư Đã Lưu Giá Gốc</div>
                </div>
                <div class="gng-stat-card" style="border-top: 4px solid #10b981;">
                    <div class="gng-stat-val">${_gng.pending.length}</div>
                    <div class="gng-stat-label">Đang Chờ Duyệt Biến Động Giá</div>
                </div>
                <div class="gng-stat-card" style="border-top: 4px solid #ef4444;">
                    <div class="gng-stat-val">
                        ${_gng.pending.reduce((acc, curr) => acc + (curr.discrepancies?.length || 0), 0)}
                    </div>
                    <div class="gng-stat-label">Mục Bị Chênh Lệch Đang Chờ Duyệt</div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <div class="gng-tabs">
                <button class="gng-tab-btn ${_gng.filter.tab === 'approved' ? 'active' : ''}" onclick="_gngSwitchTab('approved')">
                    📋 Bảng Giá Nhập Gốc
                </button>
                <button class="gng-tab-btn ${_gng.filter.tab === 'history' ? 'active' : ''}" onclick="_gngSwitchTab('history')">
                    ⏳ Lịch Sử Thay Đổi Đơn Giá
                </button>
                <button class="gng-tab-btn ${_gng.filter.tab === 'pending' ? 'active' : ''}" onclick="_gngSwitchTab('pending')">
                    ⚠️ Yêu Cầu Duyệt Giá 
                    ${_gng.pending.length > 0 ? `<span class="gng-tab-badge">${_gng.pending.length}</span>` : ''}
                </button>
            </div>

            <!-- Filters Area -->
            ${_gng.filter.tab !== 'pending' ? `
                <div class="gng-controls">
                    <input type="text" id="gngSearch" class="gng-input" placeholder="🔍 Tìm kiếm vật tư, màu sắc, nhà cung cấp..." value="${_gng.filter.search}">
                    <select id="gngSupplierFilter" class="gng-select" onchange="_gngUpdateFilters()">
                        <option value="">Nhà cung cấp: Tất cả</option>
                        ${supplierOptions}
                    </select>
                    <select id="gngTypeFilter" class="gng-select" onchange="_gngUpdateFilters()">
                        <option value="" ${_gng.filter.type === '' ? 'selected' : ''}>Loại vật tư: Tất cả</option>
                        <option value="fabric" ${_gng.filter.type === 'fabric' ? 'selected' : ''}>Vải (Fabric)</option>
                        <option value="material" ${_gng.filter.type === 'material' ? 'selected' : ''}>Phụ liệu/Vật liệu</option>
                    </select>
                </div>
            ` : ''}

            <!-- Main Render Area -->
            <div id="gngTabContent">
                <!-- Rendered Dynamically -->
            </div>
        </div>
    `;

    // Rebind search events
    const searchInput = document.getElementById('gngSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            _gng.filter.search = e.target.value;
            _gngRenderTabContent();
        });
    }

    _gngRenderTabContent();
}

function _gngSwitchTab(tabName) {
    _gng.filter.tab = tabName;
    _gngRenderLayout();
}

function _gngUpdateFilters() {
    const supplierEl = document.getElementById('gngSupplierFilter');
    const typeEl = document.getElementById('gngTypeFilter');
    if (supplierEl) _gng.filter.supplier = supplierEl.value;
    if (typeEl) _gng.filter.type = typeEl.value;
    _gngRenderTabContent();
}

function _gngRenderTabContent() {
    const tabArea = document.getElementById('gngTabContent');
    if (!tabArea) return;

    if (_gng.filter.tab === 'approved') {
        _gngRenderApprovedTab(tabArea);
    } else if (_gng.filter.tab === 'history') {
        _gngRenderHistoryTab(tabArea);
    } else if (_gng.filter.tab === 'pending') {
        _gngRenderPendingTab(tabArea);
    }
}

function _gngRenderApprovedTab(target) {
    // Filter prices
    const q = _gng.filter.search.toLowerCase();
    const filtered = _gng.prices.filter(p => {
        if (_gng.filter.supplier && p.source_name !== _gng.filter.supplier) return false;
        if (_gng.filter.type && p.item_type !== _gng.filter.type) return false;
        if (q) {
            const matches = (p.item_name || '').toLowerCase().includes(q) ||
                            (p.fabric_material_name || '').toLowerCase().includes(q) ||
                            (p.source_name || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        target.innerHTML = `
            <div class="gng-table-card">
                <div class="gng-empty">
                    <div class="gng-empty-icon">📂</div>
                    <h3>Chưa có bảng giá nhập gốc phù hợp</h3>
                    <p>Hệ thống tự động ghi nhận giá nhập gốc khi các hóa đơn mua vải/vật liệu lần đầu được duyệt.</p>
                </div>
            </div>
        `;
        return;
    }

    let rowsHtml = '';
    filtered.forEach(p => {
        const formattedPrice = Number(p.price).toLocaleString('vi-VN') + ' đ';
        const formattedDate = p.updated_at ? new Date(p.updated_at).toLocaleDateString('vi-VN') : '---';
        const isFabric = p.item_type === 'fabric';

        rowsHtml += `
            <tr>
                <td>
                    <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                        ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                    </span>
                </td>
                <td style="font-weight: 700; color: #1e293b;">
                    ${isFabric ? (p.fabric_material_name || 'Vải') : (p.item_name || 'Vật tư')}
                </td>
                <td style="color: #475569;">
                    ${isFabric ? (p.fabric_color_name || 'Màu sắc') : (p.warehouse_name || '---')}
                </td>
                <td style="font-weight: 600; color: #0f172a;">${p.source_name || 'Chưa rõ'}</td>
                <td style="text-align: right; font-weight: 700; color: #4f46e5;">${formattedPrice}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="gng-btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="_gngShowItemHistory('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                        📈 Lịch sử
                    </button>
                    ${_gng.isDuyetUser ? `
                        <button class="gng-btn-primary" style="padding: 4px 10px; font-size: 12px; margin-left: 4px;" onclick="_gngOpenEditPriceModal('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, ${p.price}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                            ✏️ Sửa giá
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    target.innerHTML = `
        <div class="gng-table-card">
            <table class="gng-table">
                <thead>
                    <tr>
                        <th style="width: 100px;">Loại</th>
                        <th>Tên Vật Tư / Chất Liệu</th>
                        <th>Màu Sắc / Kho</th>
                        <th>Nhà Cung Cấp</th>
                        <th style="text-align: right;">Đơn Giá Nhập Gốc</th>
                        <th>Ngày Cập Nhật</th>
                        <th>Hành Động</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function _gngRenderHistoryTab(target) {
    const q = _gng.filter.search.toLowerCase();
    const filtered = _gng.history.filter(h => {
        if (_gng.filter.supplier && h.source_name !== _gng.filter.supplier) return false;
        if (_gng.filter.type && h.item_type !== _gng.filter.type) return false;
        if (q) {
            const matches = (h.material_name || '').toLowerCase().includes(q) ||
                            (h.color_name || '').toLowerCase().includes(q) ||
                            (h.source_name || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        target.innerHTML = `
            <div class="gng-table-card">
                <div class="gng-empty">
                    <div class="gng-empty-icon">⏳</div>
                    <h3>Chưa có lịch sử biến động giá</h3>
                    <p>Các hóa đơn nhập hàng thành công sẽ tự động xuất hiện tại đây.</p>
                </div>
            </div>
        `;
        return;
    }

    let rowsHtml = '';
    filtered.forEach(h => {
        const formattedPrice = Number(h.unit_price).toLocaleString('vi-VN') + ' đ';
        const formattedDate = h.import_date ? new Date(h.import_date).toLocaleDateString('vi-VN') : '---';
        const isFabric = h.item_type === 'fabric';

        rowsHtml += `
            <tr>
                <td>
                    <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                        ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                    </span>
                </td>
                <td style="font-weight: 700; color: #1e293b;">
                    ${h.material_name || 'Chất liệu'}
                </td>
                <td>
                    ${isFabric ? (h.color_name || '---') : '---'}
                </td>
                <td style="color: #475569;">${h.source_name || 'Chưa rõ'}</td>
                <td style="text-align: right; font-weight: 700; color: #0f172a;">${formattedPrice}</td>
                <td>${formattedDate}</td>
                <td>
                    <span class="gng-badge ${h.is_checked ? 'gng-badge-stable' : 'gng-badge-alert'}">
                        ${h.is_checked ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                </td>
            </tr>
        `;
    });

    target.innerHTML = `
        <div class="gng-table-card">
            <table class="gng-table">
                <thead>
                    <tr>
                        <th style="width: 100px;">Loại</th>
                        <th>Tên Vật Tư / Chất Liệu</th>
                        <th>Màu Sắc</th>
                        <th>Nhà Cung Cấp</th>
                        <th style="text-align: right;">Giá Nhập Thực Tế</th>
                        <th>Ngày Nhập Hàng</th>
                        <th>Trạng Thái Hóa Đơn</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function _gngRenderPendingTab(target) {
    if (_gng.pending.length === 0) {
        target.innerHTML = `
            <div class="gng-table-card">
                <div class="gng-empty">
                    <div class="gng-empty-icon">✅</div>
                    <h3>Không có hóa đơn chờ duyệt giá</h3>
                    <p>Tất cả hóa đơn nhập hàng hiện đã khớp hoặc áp dụng đúng đơn giá nhập gốc đã lưu.</p>
                </div>
            </div>
        `;
        return;
    }

    let cardsHtml = '';
    _gng.pending.forEach(rec => {
        const isFabric = rec.record_type === 'fabric';
        const formattedDate = rec.import_date ? new Date(rec.import_date).toLocaleDateString('vi-VN') : '---';
        const totalCostStr = Number(rec.total_amount || rec.cost).toLocaleString('vi-VN') + ' đ';

        let discrepanciesHtml = '';
        (rec.discrepancies || []).forEach(d => {
            const unitPriceStr = Number(d.unit_price).toLocaleString('vi-VN') + ' đ';
            const approvedPriceStr = d.approved_price !== null 
                ? Number(d.approved_price).toLocaleString('vi-VN') + ' đ' 
                : 'Lần đầu nhập (Chưa có giá gốc)';
            
            let diffHtml = '';
            if (d.approved_price !== null) {
                const diff = d.difference;
                if (diff > 0) {
                    diffHtml = `<span style="color:#ef4444; font-weight:700;">📈 Tăng +${diff.toLocaleString('vi-VN')} đ</span>`;
                } else if (diff < 0) {
                    diffHtml = `<span style="color:#10b981; font-weight:700;">📉 Giảm ${diff.toLocaleString('vi-VN')} đ</span>`;
                } else {
                    diffHtml = `<span style="color:#64748b;">Khớp</span>`;
                }
            } else {
                diffHtml = `<span style="color:#3b82f6; font-weight:700;">✨ Giá mới</span>`;
            }

            discrepanciesHtml += `
                <tr>
                    <td style="font-weight:600;">${d.item_name}</td>
                    <td style="color:#ef4444; font-weight:700;">${unitPriceStr}</td>
                    <td style="color:#64748b;">${approvedPriceStr}</td>
                    <td>${diffHtml}</td>
                </tr>
            `;
        });

        cardsHtml += `
            <div class="gng-pending-card">
                <div class="gng-pending-header">
                    <div>
                        <div class="gng-pending-title">
                            <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                                ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                            </span>
                            Hóa đơn #${rec.fabric_import_code || rec.id}
                        </div>
                        <div class="gng-pending-meta">
                            <span>🏢 Nhà cung cấp: <b>${rec.source_name || '---'}</b></span>
                            <span>👤 Người nhập: <b>${rec.importer_name || '---'}</b></span>
                            <span>📅 Ngày nhập: <b>${formattedDate}</b></span>
                            <span>💰 Giá trị bill: <b>${totalCostStr}</b></span>
                        </div>
                    </div>
                    <div class="gng-pending-actions">
                        ${_gng.isDuyetUser ? `
                            <button class="gng-btn-approve" onclick="_gngApproveBill(${rec.id}, '${rec.fabric_import_code || rec.id}')">
                                Phê Duyệt Giá & Hóa Đơn
                            </button>
                        ` : '<span style="color:#ef4444; font-weight:600; font-size:13px;">⚠️ Đang chờ Giám đốc/QLCC duyệt giá</span>'}
                    </div>
                </div>
                <div>
                    <h5 style="margin: 0 0 10px 0; color:#475569; font-size:13px; font-weight:700;">CHI TIẾT CHÊNH LỆCH ĐƠN GIÁ:</h5>
                    <table class="gng-disc-table">
                        <thead>
                            <tr>
                                <th>Tên Vật Tư / Chất Liệu</th>
                                <th>Đơn Giá Trên Bill</th>
                                <th>Đơn Giá Gốc Cũ</th>
                                <th>Chênh Lệch</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${discrepanciesHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    target.innerHTML = `<div class="gng-pending-list">${cardsHtml}</div>`;
}

async function _gngApproveBill(id, code) {
    if (!confirm(`Xác nhận phê duyệt giá và hoàn tất hóa đơn nhập hàng #${code}?`)) return;
    try {
        const res = await apiCall('/api/import/toggle/' + id, 'POST', { action: 'check' });
        if (res.success) {
            if (typeof showToast === 'function') showToast(`Đã phê duyệt hóa đơn #${code} thành công`, 'success');
            await _gngLoadData();
        } else {
            throw new Error(res.error || 'Lỗi phê duyệt');
        }
    } catch(e) {
        if (typeof showToast === 'function') showToast(e.message, 'error');
    }
}

function _gngShowItemHistory(itemType, itemId, sourceId, itemName) {
    const filtered = _gng.history.filter(h => 
        h.item_type === itemType && 
        (itemType === 'fabric' ? h.fabric_color_id === itemId : h.material_item_id === itemId) &&
        h.source_id === sourceId
    );

    let modalRowsHtml = '';
    filtered.forEach(h => {
        modalRowsHtml += `
            <tr>
                <td>${h.import_date ? new Date(h.import_date).toLocaleDateString('vi-VN') : '---'}</td>
                <td style="font-weight:700; text-align:right;">${Number(h.unit_price).toLocaleString('vi-VN')} đ</td>
                <td>
                    <span class="gng-badge ${h.is_checked ? 'gng-badge-stable' : 'gng-badge-alert'}">
                        ${h.is_checked ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                </td>
            </tr>
        `;
    });

    const modalHtml = `
        <div class="gng-modal-backdrop" id="gngHistoryModal">
            <div class="gng-modal-card">
                <div class="gng-modal-header">
                    <h3>📈 Lịch Sử Biến Động Đơn Giá</h3>
                    <button class="gng-modal-close" onclick="_gngCloseModal('gngHistoryModal')">&times;</button>
                </div>
                <div class="gng-modal-body">
                    <div style="margin-bottom:14px; font-size:14px; color:#475569;">
                        Vật tư: <b style="color:#0f172a;">${itemName}</b><br>
                        Nhà cung cấp: <b style="color:#0f172a;">${filtered[0]?.source_name || '---'}</b>
                    </div>
                    <table class="gng-disc-table" style="width:100%;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="color:#475569; background:#f1f5f9;">Ngày nhập</th>
                                <th style="color:#475569; background:#f1f5f9; text-align:right;">Đơn giá</th>
                                <th style="color:#475569; background:#f1f5f9;">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${modalRowsHtml || '<tr><td colspan="3" style="text-align:center; padding:20px;">Không có dữ liệu lịch sử</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="gng-modal-footer">
                    <button class="gng-btn-secondary" onclick="_gngCloseModal('gngHistoryModal')">Đóng</button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'gngHistoryModalWrapper';
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
}

function _gngOpenEditPriceModal(itemType, itemId, sourceId, currentPrice, itemName) {
    const modalHtml = `
        <div class="gng-modal-backdrop" id="gngEditPriceModal">
            <div class="gng-modal-card" style="max-width: 420px;">
                <div class="gng-modal-header">
                    <h3>✏️ Cập Nhật Đơn Giá Gốc</h3>
                    <button class="gng-modal-close" onclick="_gngCloseModal('gngEditPriceModal')">&times;</button>
                </div>
                <div class="gng-modal-body">
                    <div style="margin-bottom:14px; font-size:13px; color:#64748b;">
                        Thay đổi đơn giá nhập gốc tiêu chuẩn cho vật tư:<br>
                        <b style="color:#0f172a;">${itemName}</b>
                    </div>
                    <div class="gng-form-group">
                        <label for="gngNewPriceInput">Đơn Giá Gốc Mới (đ/kg hoặc đ/cái...):</label>
                        <input type="number" id="gngNewPriceInput" class="gng-input" style="width:100%;" value="${currentPrice}">
                    </div>
                </div>
                <div class="gng-modal-footer">
                    <button class="gng-btn-secondary" onclick="_gngCloseModal('gngEditPriceModal')">Hủy</button>
                    <button class="gng-btn-primary" onclick="_gngSubmitEditPrice('${itemType}', ${itemId}, ${sourceId})">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'gngEditPriceModalWrapper';
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
}

async function _gngSubmitEditPrice(itemType, itemId, sourceId) {
    const priceInput = document.getElementById('gngNewPriceInput');
    if (!priceInput) return;
    const newPrice = Number(priceInput.value);
    if (isNaN(newPrice) || newPrice < 0) {
        alert('Vui lòng nhập đơn giá hợp lệ');
        return;
    }

    try {
        const body = {
            item_type: itemType,
            source_id: sourceId,
            price: newPrice
        };
        if (itemType === 'fabric') {
            body.fabric_color_id = itemId;
        } else {
            body.material_item_id = itemId;
        }

        const res = await apiCall('/api/gianhapgoc/set-price', 'POST', body);
        if (res.success) {
            if (typeof showToast === 'function') showToast('Cập nhật giá nhập gốc thành công', 'success');
            _gngCloseModal('gngEditPriceModal');
            await _gngLoadData();
        } else {
            throw new Error(res.error || 'Lỗi lưu giá');
        }
    } catch(e) {
        alert(e.message);
    }
}

function _gngCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        const wrapper = document.getElementById(modalId + 'Wrapper');
        if (wrapper) wrapper.remove();
    }
}

// Helpers
function escapeJS(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
