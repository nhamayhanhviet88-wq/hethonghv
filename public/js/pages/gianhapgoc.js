// ========== GIÁ NHẬP GỐC — Desktop SPA (Master-Detail Design) ==========
var _gng = {
    prices: [],
    history: [],
    pending: [],
    filter: {
        tab: 'approved', // 'approved', 'history', 'pending'
        search: '',
        supplierId: 'all', // 'all', 'pending_all', or number (source_id)
        supplierSearch: '',
        type: '' // '', 'fabric', 'material'
    },
    isDuyetUser: false
};

async function renderGiaNhapGocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Inject custom premium CSS for Master-Detail layout
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
                margin-bottom: 20px;
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
            
            /* Stats Overview */
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

            /* Master-Detail Layout */
            .gng-layout {
                display: flex;
                gap: 20px;
                min-height: calc(100vh - 240px);
                align-items: stretch;
            }
            
            /* Left Sidebar: Supplier List */
            .gng-sidebar {
                width: 280px;
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
            }
            .gng-sidebar-header {
                font-size: 12px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .gng-sidebar-search {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
                outline: none;
                width: 100%;
                transition: all 0.2s;
            }
            .gng-sidebar-search:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
            }
            .gng-sidebar-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
                overflow-y: auto;
                flex: 1;
                max-height: calc(100vh - 380px);
            }
            .gng-sidebar-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                border: 1px solid transparent;
            }
            .gng-sidebar-item:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            .gng-sidebar-item.active {
                background: #e0e7ff;
                color: #4338ca;
                border-color: #c7d2fe;
            }
            .gng-sidebar-sub-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s;
                border: 1px solid transparent;
            }
            .gng-sidebar-sub-item:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            .gng-sidebar-sub-item.active {
                background: #4f46e5;
                color: white;
                font-weight: 700;
            }
            .gng-sidebar-sub-item.active .gng-sidebar-item-name {
                color: white;
            }
            .gng-sidebar-item-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 160px;
            }
            .gng-sidebar-badges {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            .gng-sidebar-badge-count {
                font-size: 10px;
                background: #f1f5f9;
                color: #64748b;
                padding: 2px 6px;
                border-radius: 6px;
            }
            .gng-sidebar-item.active .gng-sidebar-badge-count {
                background: #c7d2fe;
                color: #4338ca;
            }
            .gng-sidebar-badge-pending {
                font-size: 10px;
                background: #fee2e2;
                color: #b91c1c;
                padding: 2px 6px;
                border-radius: 6px;
                font-weight: 700;
                animation: gngPulse 2s infinite;
            }
            @keyframes gngPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            /* Right Content: Material details */
            .gng-detail-panel {
                flex: 1;
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            /* Tabs Navigation */
            .gng-tabs {
                display: flex;
                gap: 8px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 1px;
            }
            .gng-tab-btn {
                padding: 10px 16px;
                font-size: 13px;
                font-weight: 600;
                color: #64748b;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
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
                font-size: 10px;
                background: #ef4444;
                color: white;
                padding: 1px 6px;
                border-radius: 9999px;
                font-weight: 700;
            }

            /* Controls and filters */
            .gng-controls {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
            }
            .gng-input {
                flex: 1;
                min-width: 200px;
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid #cbd5e1;
                font-size: 13px;
                outline: none;
                transition: all 0.2s;
            }
            .gng-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            .gng-select {
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid #cbd5e1;
                font-size: 13px;
                background-color: white;
                outline: none;
                cursor: pointer;
                transition: all 0.2s;
            }

            /* Tables and cards */
            .gng-table-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }
            .gng-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
            }
            .gng-table th {
                background: #f8fafc;
                padding: 12px 14px;
                font-size: 11px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
            }
            .gng-table td {
                padding: 12px 14px;
                font-size: 13px;
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
                gap: 14px;
            }
            .gng-pending-card {
                background: white;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                padding: 16px;
            }
            .gng-pending-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 10px;
                margin-bottom: 12px;
            }
            .gng-pending-title {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
            }
            .gng-pending-meta {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            .gng-pending-actions {
                display: flex;
                gap: 8px;
            }
            .gng-btn-approve {
                background: #10b981;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
            }
            .gng-btn-approve:hover {
                background: #059669;
            }
            .gng-disc-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
            }
            .gng-disc-table th {
                background: #fffbeb;
                color: #b45309;
                font-size: 11px;
                padding: 6px 10px;
                text-align: left;
            }
            .gng-disc-table td {
                padding: 8px 10px;
                font-size: 12px;
                border-bottom: 1px solid #fef3c7;
            }
            .gng-badge-type {
                font-size: 10px;
                padding: 2px 4px;
                border-radius: 4px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .gng-badge-fabric { background: #e0e7ff; color: #4338ca; }
            .gng-badge-material { background: #fef3c7; color: #d97706; }

            .gng-badge {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 6px;
                font-weight: 600;
            }
            .gng-badge-stable { background: #dcfce7; color: #15803d; }
            .gng-badge-alert { background: #fee2e2; color: #b91c1c; }

            /* Modal Styles */
            .gng-modal-backdrop {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                z-index: 1000;
            }
            .gng-modal-card {
                background: white; border-radius: 12px; width: 100%; max-width: 500px;
                border: 1px solid #e2e8f0; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .gng-modal-header {
                padding: 12px 16px; border-bottom: 1px solid #e2e8f0;
                display: flex; justify-content: space-between; align-items: center;
                background: #f8fafc;
            }
            .gng-modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
            .gng-modal-close { background: transparent; border: none; font-size: 18px; cursor: pointer; color: #64748b; }
            .gng-modal-body { padding: 16px; max-height: 60vh; overflow-y: auto; }
            .gng-modal-footer { padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; background: #f8fafc; }
            .gng-form-group { margin-bottom: 12px; }
            .gng-form-group label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
            .gng-btn-primary { background: #4f46e5; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; }
            .gng-btn-primary:hover { background: #4338ca; }
            .gng-btn-secondary { background: #e2e8f0; color: #475569; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; }
            .gng-btn-secondary:hover { background: #cbd5e1; }
            .gng-empty { padding: 32px; text-align: center; color: #64748b; }
            .gng-empty-icon { font-size: 32px; margin-bottom: 8px; }

            /* Accordion Styling */
            .gng-group-header {
                cursor: pointer;
                background: #f8fafc !important;
                font-weight: 700;
                color: #0f172a;
                border-bottom: 1px solid #e2e8f0;
                transition: background 0.15s ease;
            }
            .gng-group-header:hover {
                background: #f1f5f9 !important;
            }
            .gng-sub-row {
                background: #ffffff;
            }
            .gng-sub-row td {
                padding: 10px 14px 10px 32px !important;
                font-size: 12.5px;
                border-bottom: 1px solid #f1f5f9;
            }
            .gng-group-arrow {
                display: inline-block;
                transition: transform 0.2s ease;
                margin-right: 8px;
                font-size: 11px;
                color: #64748b;
            }
            .gng-badge-count-color {
                font-size: 10.5px;
                background: #f1f5f9;
                color: #475569;
                padding: 2px 6px;
                border-radius: 6px;
                font-weight: 600;
                margin-left: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    _gng.content = content;

    // Fetch user permissions
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

    // Compute stats
    const totalPrices = _gng.prices.length;
    const totalPending = _gng.pending.length;
    const totalDiff = _gng.pending.reduce((acc, curr) => acc + (curr.discrepancies?.length || 0), 0);

    // Render header and overall stats
    _gng.content.innerHTML = `
        <div class="gng-container">
            <div class="gng-header">
                <div class="gng-title-area">
                    <h2>🏷️ Giá Nhập Gốc</h2>
                    <p>Quản lý, tra cứu và duyệt đơn giá nguyên vật liệu & phụ liệu sản xuất</p>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="gng-stats">
                <div class="gng-stat-card" style="border-top: 4px solid #4f46e5;">
                    <div class="gng-stat-val">${totalPrices}</div>
                    <div class="gng-stat-label">Tổng Vật Tư Đã Lưu Giá Gốc</div>
                </div>
                <div class="gng-stat-card" style="border-top: 4px solid #10b981;">
                    <div class="gng-stat-val">${totalPending}</div>
                    <div class="gng-stat-label">Hóa Đơn Chờ Duyệt Lệch Giá</div>
                </div>
                <div class="gng-stat-card" style="border-top: 4px solid #ef4444;">
                    <div class="gng-stat-val">${totalDiff}</div>
                    <div class="gng-stat-label">Mục Bị Chênh Lệch Đang Chờ Duyệt</div>
                </div>
            </div>

            <!-- Master-Detail Structure -->
            <div class="gng-layout">
                <!-- Left Sidebar: Supplier List -->
                <div class="gng-sidebar">
                    <div class="gng-sidebar-header">
                        <span>🏢 Nhà cung cấp</span>
                        <button class="gng-btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="_gngLoadData()">🔄 Tải lại</button>
                    </div>
                    <input type="text" id="gngSidebarSearch" class="gng-sidebar-search" placeholder="Tìm kiếm nhà cung cấp..." value="${_gng.filter.supplierSearch || ''}">
                    <div class="gng-sidebar-list" id="gngSidebarListArea">
                        <!-- Suppliers loaded dynamically -->
                    </div>
                </div>

                <!-- Right Detail Panel -->
                <div class="gng-detail-panel" id="gngDetailPanelArea">
                    <!-- Dynamic details -->
                </div>
            </div>
        </div>
    `;

    // Bind sidebar search event
    const sidebarSearch = document.getElementById('gngSidebarSearch');
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', function(e) {
            _gng.filter.supplierSearch = e.target.value;
            _gngRenderSidebar();
        });
    }

    _gngRenderSidebar();
    _gngRenderDetailPanel();
}

function _gngRenderSidebar() {
    const listArea = document.getElementById('gngSidebarListArea');
    if (!listArea) return;

    // Process unique suppliers and their statistics
    const suppliersMap = new Map(); // source_id -> { name, priceCount, pendingCount }
    
    _gng.prices.forEach(p => {
        if (p.source_id) {
            if (!suppliersMap.has(p.source_id)) {
                suppliersMap.set(p.source_id, { name: p.source_name, priceCount: 0, pendingCount: 0 });
            }
            suppliersMap.get(p.source_id).priceCount++;
        }
    });

    _gng.pending.forEach(rec => {
        if (rec.source_id) {
            if (!suppliersMap.has(rec.source_id)) {
                suppliersMap.set(rec.source_id, { name: rec.source_name, priceCount: 0, pendingCount: 0 });
            }
            suppliersMap.get(rec.source_id).pendingCount += (rec.discrepancies?.length || 0);
        }
    });

    const suppliersList = [];
    suppliersMap.forEach((val, key) => {
        suppliersList.push({ id: key, ...val });
    });

    // Sort alphabetically by name
    suppliersList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

    // Global Statistics
    const totalPendingCount = _gng.pending.reduce((acc, curr) => acc + (curr.discrepancies?.length || 0), 0);

    let html = `
        <div class="gng-sidebar-item ${_gng.filter.supplierId === 'all' ? 'active' : ''}" onclick="_gngSelectSupplier('all')">
            <span class="gng-sidebar-item-name">🌍 Tất cả nhà cung cấp</span>
            <div class="gng-sidebar-badges">
                <span class="gng-sidebar-badge-count">${_gng.prices.length}</span>
            </div>
        </div>
        <div class="gng-sidebar-item ${_gng.filter.supplierId === 'pending_all' ? 'active' : ''}" onclick="_gngSelectSupplier('pending_all')">
            <span class="gng-sidebar-item-name">⚠️ Tổng hợp chờ duyệt</span>
            <div class="gng-sidebar-badges">
                ${totalPendingCount > 0 ? `<span class="gng-sidebar-badge-pending">${totalPendingCount}</span>` : `<span class="gng-sidebar-badge-count">0</span>`}
            </div>
        </div>
        <hr style="border:0; border-top: 1px solid #e2e8f0; margin: 4px 0;" />
    `;

    // Filter suppliers
    const q = (_gng.filter.supplierSearch || '').toLowerCase().trim();
    const filteredSuppliers = suppliersList.filter(s => (s.name || '').toLowerCase().includes(q));

    filteredSuppliers.forEach(s => {
        const isActive = _gng.filter.supplierId == s.id;
        
        // Find materials for this supplier
        const materialsSet = new Set();
        _gng.prices.forEach(p => {
            if (p.source_id == s.id) {
                const name = p.item_type === 'fabric' ? p.fabric_material_name : p.item_name;
                if (name) materialsSet.add(name);
            }
        });
        const materials = Array.from(materialsSet);
        materials.sort((a, b) => a.localeCompare(b, 'vi'));

        html += `
            <div class="gng-sidebar-item ${isActive ? 'active' : ''}" onclick="_gngSelectSupplier(${s.id})">
                <span class="gng-sidebar-item-name" title="${s.name}">${s.name}</span>
                <div class="gng-sidebar-badges">
                    <span class="gng-sidebar-badge-count">${s.priceCount}</span>
                    ${s.pendingCount > 0 ? `<span class="gng-sidebar-badge-pending">${s.pendingCount}</span>` : ''}
                </div>
            </div>
        `;

        if (isActive && materials.length > 0) {
            let subItemsHtml = '';
            materials.forEach(m => {
                const isSubActive = _gng.filter.materialName === m;
                subItemsHtml += `
                    <div class="gng-sidebar-sub-item ${isSubActive ? 'active' : ''}" onclick="event.stopPropagation(); _gngSelectMaterial(${s.id}, '${escapeJS(m)}')">
                        <span class="gng-sidebar-item-name" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;" title="${m}">🧵 ${m}</span>
                    </div>
                `;
            });
            html += `
                <div class="gng-sidebar-sub-list" style="margin-left: 16px; padding-left: 8px; border-left: 1.5px solid #cbd5e1; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; margin-bottom: 4px;">
                    ${subItemsHtml}
                </div>
            `;
        }
    });

    listArea.innerHTML = html;
}

function _gngSelectSupplier(id) {
    _gng.filter.supplierId = id;
    
    // Auto shift tab if 'pending_all' is selected
    if (id === 'pending_all') {
        _gng.filter.tab = 'pending';
        _gng.filter.materialName = null;
    } else if (id === 'all') {
        _gng.filter.materialName = null;
    } else {
        // Auto select first material for this supplier
        const materialsSet = new Set();
        _gng.prices.forEach(p => {
            if (p.source_id == id) {
                const name = p.item_type === 'fabric' ? p.fabric_material_name : p.item_name;
                if (name) materialsSet.add(name);
            }
        });
        const materials = Array.from(materialsSet);
        materials.sort((a, b) => a.localeCompare(b, 'vi'));

        if (materials.length > 0) {
            if (!_gng.filter.materialName || !materials.includes(_gng.filter.materialName)) {
                _gng.filter.materialName = materials[0];
            }
        } else {
            _gng.filter.materialName = null;
        }

        if (_gng.filter.tab === 'pending') {
            const hasPending = _gng.pending.some(rec => rec.source_id == id);
            if (!hasPending) _gng.filter.tab = 'approved';
        }
    }

    _gngRenderSidebar();
    _gngRenderDetailPanel();
}

function _gngSelectMaterial(supplierId, materialName) {
    _gng.filter.supplierId = supplierId;
    _gng.filter.materialName = materialName;
    _gngRenderSidebar();
    _gngRenderDetailPanel();
}

function _gngRenderDetailPanel() {
    const detailPanel = document.getElementById('gngDetailPanelArea');
    if (!detailPanel) return;

    // Determine Title name
    let titleName = 'Tất cả nhà cung cấp';
    if (_gng.filter.supplierId === 'pending_all') {
        titleName = 'Tổng hợp yêu cầu chờ duyệt giá';
    } else if (_gng.filter.supplierId !== 'all') {
        // Find supplier name
        const match = _gng.prices.find(p => p.source_id == _gng.filter.supplierId) || 
                      _gng.history.find(h => h.source_id == _gng.filter.supplierId) ||
                      _gng.pending.find(r => r.source_id == _gng.filter.supplierId);
        titleName = match ? match.source_name : `Nhà cung cấp #${_gng.filter.supplierId}`;
        if (_gng.filter.materialName) {
            titleName += ` &gt; <span style="color: #4f46e5;">🧵 ${_gng.filter.materialName}</span>`;
        }
    }

    // Number of pending records specifically for selected supplier
    const pendingFiltered = _gng.pending.filter(rec => _gng.filter.supplierId === 'all' || _gng.filter.supplierId === 'pending_all' || rec.source_id == _gng.filter.supplierId);
    const pendingCount = pendingFiltered.length;

    detailPanel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;">🏢 ${titleName}</h3>
        </div>

        <!-- Detail Tabs -->
        <div class="gng-tabs">
            ${_gng.filter.supplierId !== 'pending_all' ? `
                <button class="gng-tab-btn ${_gng.filter.tab === 'approved' ? 'active' : ''}" onclick="_gngSwitchDetailTab('approved')">
                    📋 Bảng Giá Gốc
                </button>
                <button class="gng-tab-btn ${_gng.filter.tab === 'history' ? 'active' : ''}" onclick="_gngSwitchDetailTab('history')">
                    ⏳ Lịch Sử Nhập Hàng
                </button>
            ` : ''}
            <button class="gng-tab-btn ${_gng.filter.tab === 'pending' ? 'active' : ''}" onclick="_gngSwitchDetailTab('pending')">
                ⚠️ Chờ Duyệt Giá ${pendingCount > 0 ? `<span class="gng-tab-badge">${pendingCount}</span>` : ''}
            </button>
        </div>

        <!-- Right Side search/type filter -->
        ${_gng.filter.tab !== 'pending' ? `
            <div class="gng-controls">
                <input type="text" id="gngDetailSearch" class="gng-input" placeholder="🔍 Tìm tên vật tư, màu sắc..." value="${_gng.filter.search}">
                <select id="gngDetailType" class="gng-select" onchange="_gngUpdateDetailFilters()">
                    <option value="" ${_gng.filter.type === '' ? 'selected' : ''}>Loại: Tất cả</option>
                    <option value="fabric" ${_gng.filter.type === 'fabric' ? 'selected' : ''}>🧵 Vải (Fabric)</option>
                    <option value="material" ${_gng.filter.type === 'material' ? 'selected' : ''}>📦 Phụ liệu</option>
                </select>
            </div>
        ` : ''}

        <!-- Tab content container -->
        <div id="gngDetailContentArea"></div>
    `;

    // Bind inputs
    const detailSearch = document.getElementById('gngDetailSearch');
    if (detailSearch) {
        detailSearch.addEventListener('input', function(e) {
            _gng.filter.search = e.target.value;
            _gngRenderDetailTabContent();
        });
    }

    _gngRenderDetailTabContent();
}

function _gngSwitchDetailTab(tabName) {
    _gng.filter.tab = tabName;
    _gngRenderDetailPanel();
}

function _gngUpdateDetailFilters() {
    const typeEl = document.getElementById('gngDetailType');
    if (typeEl) _gng.filter.type = typeEl.value;
    _gngRenderDetailTabContent();
}

function _gngRenderDetailTabContent() {
    const target = document.getElementById('gngDetailContentArea');
    if (!target) return;

    if (_gng.filter.tab === 'approved') {
        _gngRenderDetailApproved(target);
    } else if (_gng.filter.tab === 'history') {
        _gngRenderDetailHistory(target);
    } else if (_gng.filter.tab === 'pending') {
        _gngRenderDetailPending(target);
    }
}

function _gngRenderDetailApproved(target) {
    const q = (_gng.filter.search || '').toLowerCase().trim();
    const filtered = _gng.prices.filter(p => {
        // Supplier filter
        if (_gng.filter.supplierId !== 'all' && p.source_id != _gng.filter.supplierId) return false;
        // Material filter
        if (_gng.filter.supplierId !== 'all' && _gng.filter.materialName) {
            const name = p.item_type === 'fabric' ? p.fabric_material_name : p.item_name;
            if (name !== _gng.filter.materialName) return false;
        }
        // Type filter
        if (_gng.filter.type && p.item_type !== _gng.filter.type) return false;
        // Search filter
        if (q) {
            const matches = (p.item_name || '').toLowerCase().includes(q) ||
                            (p.fabric_material_name || '').toLowerCase().includes(q) ||
                            (p.fabric_color_name || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        const showInitBtn = _gng.isDuyetUser && _gng.prices.length === 0;
        target.innerHTML = `
            <div class="gng-empty">
                <div class="gng-empty-icon">📂</div>
                <h3>Không tìm thấy giá nhập gốc</h3>
                <p>Nhà cung cấp chưa có giá gốc lưu trữ hoặc không khớp bộ lọc.</p>
                ${showInitBtn ? `
                    <button class="gng-btn-primary" style="margin-top: 15px; padding: 10px 20px; font-weight:700;" onclick="_gngInitializeFromHistory()">
                        ⚡ Khởi tạo nhanh Giá Gốc từ Lịch Sử Nhập Hàng
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    const isSingleMaterialMode = (_gng.filter.supplierId !== 'all' && _gng.filter.materialName);

    if (isSingleMaterialMode) {
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
                    <td style="font-weight: 600; color: #475569;">
                        ${isFabric ? (p.fabric_material_name || '---') : (p.item_name || '---')}
                    </td>
                    <td style="color: #0f172a; font-weight: 700;">
                        ${isFabric ? `🎨 ${p.fabric_color_name || 'Màu sắc'}` : `🏢 ${p.warehouse_name || '---'}`}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #059669;">${formattedPrice}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="gng-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); _gngShowItemHistory('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                            📈 Lịch sử
                        </button>
                        ${_gng.isDuyetUser ? `
                            <button class="gng-btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 2px;" onclick="event.stopPropagation(); _gngOpenEditPriceModal('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, ${p.price}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                                ✏️ Sửa
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
                            <th style="width: 80px;">Loại</th>
                            <th>Chất Liệu / Vật Liệu</th>
                            <th>Màu Sắc / Kho</th>
                            <th style="text-align: right;">Đơn Giá Gốc</th>
                            <th>Cập Nhật Cuối</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // Group items by unique material + supplier combination
    const groupsMap = {};
    let groupIndex = 0;
    filtered.forEach(p => {
        const isFabric = p.item_type === 'fabric';
        const mapKey = isFabric ? `fabric_${p.fabric_material_name}_${p.source_id}` : `material_${p.item_name}_${p.source_id}`;
        if (!groupsMap[mapKey]) {
            groupIndex++;
            groupsMap[mapKey] = {
                key: `gng_group_${groupIndex}`,
                name: isFabric ? p.fabric_material_name : p.item_name,
                item_type: p.item_type,
                source_id: p.source_id,
                source_name: p.source_name,
                items: []
            };
        }
        groupsMap[mapKey].items.push(p);
    });

    const groups = Object.values(groupsMap);
    // Sort groups alphabetically by name
    groups.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

    let rowsHtml = '';
    groups.forEach(g => {
        const isFabric = g.item_type === 'fabric';
        
        // Calculate price range
        const pricesList = g.items.map(it => Number(it.price) || 0);
        const minPrice = Math.min(...pricesList);
        const maxPrice = Math.max(...pricesList);
        let priceRangeText = '';
        if (minPrice === maxPrice) {
            priceRangeText = minPrice.toLocaleString('vi-VN') + ' đ';
        } else {
            priceRangeText = `${minPrice.toLocaleString('vi-VN')} đ - ${maxPrice.toLocaleString('vi-VN')} đ`;
        }

        // Get latest update date
        const datesList = g.items.map(it => it.updated_at ? new Date(it.updated_at).getTime() : 0);
        const latestTime = Math.max(...datesList);
        const latestDateText = latestTime > 0 ? new Date(latestTime).toLocaleDateString('vi-VN') : '---';

        // Render Group Header
        rowsHtml += `
            <tr class="gng-group-header" onclick="_gngToggleGroup('${g.key}')">
                <td>
                    <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                        ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                    </span>
                </td>
                <td style="font-weight: 700; color: #1e293b;">
                    <span class="gng-group-arrow" id="arrow_${g.key}">▶</span>
                    ${g.name}
                    <span class="gng-badge-count-color">
                        ${g.items.length} ${isFabric ? 'màu' : 'kho/mục'}
                    </span>
                </td>
                <td style="color: #64748b; font-style: italic; font-size:12px;">(Nhấp để xem chi tiết)</td>
                ${_gng.filter.supplierId === 'all' ? `<td style="font-weight: 600;">${g.source_name || '---'}</td>` : ''}
                <td style="text-align: right; font-weight: 700; color: #4f46e5;">${priceRangeText}</td>
                <td>${latestDateText}</td>
                <td>
                    <span style="font-size: 11px; color: #64748b; font-weight:600;">Xem ${g.items.length} mục</span>
                </td>
            </tr>
        `;

        // Render Sub-rows
        g.items.forEach(p => {
            const formattedPrice = Number(p.price).toLocaleString('vi-VN') + ' đ';
            const formattedDate = p.updated_at ? new Date(p.updated_at).toLocaleDateString('vi-VN') : '---';
            
            rowsHtml += `
                <tr class="gng-sub-row ${g.key}" style="display: none;">
                    <td></td>
                    <td></td>
                    <td style="color: #0f172a; font-weight: 600;">
                        ${isFabric ? `🎨 ${p.fabric_color_name || 'Màu sắc'}` : `🏢 ${p.warehouse_name || '---'}`}
                    </td>
                    ${_gng.filter.supplierId === 'all' ? `<td></td>` : ''}
                    <td style="text-align: right; font-weight: 700; color: #059669;">${formattedPrice}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="gng-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); _gngShowItemHistory('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                            📈 Lịch sử
                        </button>
                        ${_gng.isDuyetUser ? `
                            <button class="gng-btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 2px;" onclick="event.stopPropagation(); _gngOpenEditPriceModal('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, ${p.price}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                                ✏️ Sửa
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
    });

    target.innerHTML = `
        <div class="gng-table-card">
            <table class="gng-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">Loại</th>
                        <th>Tên Chất Liệu / Vật Tư</th>
                        <th>Màu Sắc / Kho</th>
                        ${_gng.filter.supplierId === 'all' ? '<th>Nhà Cung Cấp</th>' : ''}
                        <th style="text-align: right;">Đơn Giá Gốc</th>
                        <th>Cập Nhật Cuối</th>
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

function _gngRenderDetailHistory(target) {
    const q = (_gng.filter.search || '').toLowerCase().trim();
    const filtered = _gng.history.filter(h => {
        // Supplier filter
        if (_gng.filter.supplierId !== 'all' && h.source_id != _gng.filter.supplierId) return false;
        // Material filter
        if (_gng.filter.supplierId !== 'all' && _gng.filter.materialName) {
            const name = h.material_name;
            if (name !== _gng.filter.materialName) return false;
        }
        // Type filter
        if (_gng.filter.type && h.item_type !== _gng.filter.type) return false;
        // Search filter
        if (q) {
            const matches = (h.material_name || '').toLowerCase().includes(q) ||
                            (h.color_name || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        target.innerHTML = `
            <div class="gng-empty">
                <div class="gng-empty-icon">⏳</div>
                <h3>Chưa có lịch sử nhập hàng</h3>
                <p>Nhà cung cấp chưa có hóa đơn hoàn thành trong lịch sử.</p>
            </div>
        `;
        return;
    }

    // Group by unique (item_type, item_id, source_id)
    const groupsMap = {};
    filtered.forEach(h => {
        const itemId = h.item_type === 'fabric' ? h.fabric_color_id : h.material_item_id;
        const key = `${h.item_type}_${itemId}_${h.source_id}`;
        if (!groupsMap[key]) {
            groupsMap[key] = [];
        }
        groupsMap[key].push(h);
    });

    // Extract latest and sort descending
    const groupedList = Object.values(groupsMap).map(group => {
        const sortedGroup = [...group].sort((a, b) => {
            const dateA = new Date(a.import_date || 0);
            const dateB = new Date(b.import_date || 0);
            if (dateB - dateA !== 0) return dateB - dateA;
            return b.import_id - a.import_id;
        });
        return {
            latest: sortedGroup[0],
            records: sortedGroup
        };
    });

    // Sort grouped list alphabetically
    groupedList.sort((a, b) => {
        const nameA = a.latest.material_name || '';
        const nameB = b.latest.material_name || '';
        const comp = nameA.localeCompare(nameB, 'vi');
        if (comp !== 0) return comp;
        const colorA = a.latest.color_name || '';
        const colorB = b.latest.color_name || '';
        return colorA.localeCompare(colorB, 'vi');
    });

    const isSingleMaterialMode = (_gng.filter.supplierId !== 'all' && _gng.filter.materialName);

    let rowsHtml = '';
    groupedList.forEach(g => {
        const h = g.latest;
        const formattedPrice = Number(h.unit_price).toLocaleString('vi-VN') + ' đ';
        const formattedDate = h.import_date ? new Date(h.import_date).toLocaleDateString('vi-VN') : '---';
        const isFabric = h.item_type === 'fabric';
        const itemId = isFabric ? h.fabric_color_id : h.material_item_id;

        rowsHtml += `
            <tr style="cursor: pointer;" onclick="_gngShowItemHistory('${h.item_type}', ${itemId}, ${h.source_id}, '${escapeJS(h.material_name)}')">
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
                ${_gng.filter.supplierId === 'all' ? `<td style="font-weight: 600;">${h.source_name || '---'}</td>` : ''}
                <td style="text-align: right; font-weight: 700; color: #4f46e5;">${formattedPrice}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="gng-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); _gngShowItemHistory('${h.item_type}', ${itemId}, ${h.source_id}, '${escapeJS(h.material_name)}')">
                        📈 Lịch sử (${g.records.length})
                    </button>
                </td>
            </tr>
        `;
    });

    target.innerHTML = `
        <div class="gng-table-card">
            <table class="gng-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">Loại</th>
                        <th>Chất Liệu / Vật Liệu</th>
                        <th>Màu Sắc</th>
                        ${_gng.filter.supplierId === 'all' ? '<th>Nhà Cung Cấp</th>' : ''}
                        <th style="text-align: right;">Đơn Giá Nhập Gần Nhất</th>
                        <th>Ngày Nhập Gần Nhất</th>
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

function _gngRenderDetailPending(target) {
    const filtered = _gng.pending.filter(rec => 
        _gng.filter.supplierId === 'all' || 
        _gng.filter.supplierId === 'pending_all' || 
        rec.source_id == _gng.filter.supplierId
    );

    let cardsHtml = '';
    filtered.forEach(rec => {
        const isFabric = rec.record_type === 'fabric';
        const formattedDate = rec.import_date ? new Date(rec.import_date).toLocaleDateString('vi-VN') : '---';
        const totalCostStr = Number(rec.total_amount || rec.cost).toLocaleString('vi-VN') + ' đ';

        // Filter discrepancies inside this record if we have a specific material filtered
        let discList = rec.discrepancies || [];
        if (_gng.filter.supplierId !== 'all' && _gng.filter.materialName) {
            const filterMat = _gng.filter.materialName.toLowerCase();
            discList = discList.filter(d => (d.item_name || '').toLowerCase().includes(filterMat));
        }

        // If no discrepancies match the filter, do not show this bill at all
        if (discList.length === 0) return;

        let discrepanciesHtml = '';
        discList.forEach(d => {
            const unitPriceStr = Number(d.unit_price).toLocaleString('vi-VN') + ' đ';
            const approvedPriceStr = d.approved_price !== null 
                ? Number(d.approved_price).toLocaleString('vi-VN') + ' đ' 
                : 'Lần đầu nhập (Mới)';
            
            let diffHtml = '';
            if (d.approved_price !== null) {
                if (d.difference > 0) {
                    diffHtml = `<span style="color:#ef4444; font-weight:700;">📈 Tăng +${d.difference.toLocaleString('vi-VN')} đ</span>`;
                } else if (d.difference < 0) {
                    diffHtml = `<span style="color:#10b981; font-weight:700;">📉 Giảm ${d.difference.toLocaleString('vi-VN')} đ</span>`;
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
                                Phê Duyệt
                            </button>
                        ` : '<span style="color:#ef4444; font-weight:600; font-size:12px;">⏳ Đang chờ Giám đốc duyệt giá</span>'}
                    </div>
                </div>
                <div>
                    <h5 style="margin: 0 0 6px 0; color:#475569; font-size:12px; font-weight:700;">CHI TIẾT LỆCH GIÁ:</h5>
                    <table class="gng-disc-table">
                        <thead>
                            <tr>
                                <th>Tên Vật Tư / Chất Liệu</th>
                                <th>Giá Trên Bill</th>
                                <th>Giá Gốc Cũ</th>
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

    if (cardsHtml === '') {
        target.innerHTML = `
            <div class="gng-empty">
                <div class="gng-empty-icon">✅</div>
                <h3>Không có hóa đơn lệch giá</h3>
                <p>Tất cả hóa đơn nhập hàng của nhà cung cấp này đều khớp giá gốc.</p>
            </div>
        `;
        return;
    }

    target.innerHTML = `<div class="gng-pending-list">${cardsHtml}</div>`;
}

async function _gngApproveBill(id, code) {
    if (!confirm(`Xác nhận phê duyệt giá và hoàn tất hóa đơn #${code}?`)) return;
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

    const sorted = [...filtered].sort((a, b) => {
        const dateA = new Date(a.import_date || 0);
        const dateB = new Date(b.import_date || 0);
        if (dateB - dateA !== 0) return dateB - dateA;
        return b.import_id - a.import_id;
    });

    let modalRowsHtml = '';
    sorted.forEach(h => {
        const isPending = !h.is_checked && h.requires_price_approval;
        modalRowsHtml += `
            <tr>
                <td>${h.import_date ? new Date(h.import_date).toLocaleDateString('vi-VN') : '---'}</td>
                <td style="font-weight:700; text-align:right;">${Number(h.unit_price).toLocaleString('vi-VN')} đ</td>
                <td>
                    <span class="gng-badge ${isPending ? 'gng-badge-alert' : 'gng-badge-stable'}">
                        ${isPending ? 'Chờ duyệt' : 'Khớp giá'}
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
                    <div style="margin-bottom:12px; font-size:13px; color:#475569;">
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
                            ${modalRowsHtml || '<tr><td colspan="3" style="text-align:center; padding:16px;">Không có dữ liệu lịch sử</td></tr>'}
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
            <div class="gng-modal-card" style="max-width: 400px;">
                <div class="gng-modal-header">
                    <h3>✏️ Cập Nhật Đơn Giá Gốc</h3>
                    <button class="gng-modal-close" onclick="_gngCloseModal('gngEditPriceModal')">&times;</button>
                </div>
                <div class="gng-modal-body">
                    <div style="margin-bottom:12px; font-size:12px; color:#64748b;">
                        Thay đổi đơn giá gốc tiêu chuẩn cho vật tư:<br>
                        <b style="color:#0f172a;">${itemName}</b>
                    </div>
                    <div class="gng-form-group">
                        <label for="gngNewPriceInput">Đơn Giá Gốc Mới (đ):</label>
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
            if (typeof showToast === 'function') showToast('Cập nhật giá gốc thành công', 'success');
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

function escapeJS(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

async function _gngInitializeFromHistory() {
    if (!confirm('Bạn có muốn tự động lấy Đơn giá nhập gần đây nhất của từng vật tư trong Lịch sử để làm Giá Gốc không?')) {
        return;
    }
    
    try {
        const res = await apiCall('/api/gianhapgoc/initialize-from-history', 'POST');
        if (res.error) {
            alert('Lỗi: ' + res.error);
        } else {
            alert(`Thành công! Đã khởi tạo ${res.count} đơn giá gốc từ lịch sử nhập hàng.`);
            await _gngLoadData();
        }
    } catch (e) {
        console.error(e);
        alert('Có lỗi xảy ra khi khởi tạo.');
    }
}

function _gngToggleGroup(groupKey) {
    const rows = document.querySelectorAll('.' + groupKey);
    const arrow = document.getElementById('arrow_' + groupKey);
    if (!rows || rows.length === 0) return;
    
    const isCollapsed = rows[0].style.display === 'none';
    rows.forEach(r => {
        r.style.display = isCollapsed ? 'table-row' : 'none';
    });
    
    if (arrow) {
        arrow.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

