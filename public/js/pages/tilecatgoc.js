// ========== TỈ LỆ CẮT GỐC — Desktop SPA ==========
var _tlcg = {
    materials: [],
    colors: [],
    ranges: [],
    stats: [],
    products: [],
    selectedRangeId: '',
    filter: {
        search: ''
    },
    isGD: false,
    activeMaterial: null
};

async function renderTilecatgocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Inject custom CSS
    if (!document.getElementById('_tlcgStyles')) {
        const style = document.createElement('style');
        style.id = '_tlcgStyles';
        style.textContent = `
            .tlcg-container {
                padding: 24px;
                background: #f8fafc;
                min-height: 100%;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                animation: tlcgFadeIn 0.3s ease-out;
            }
            @keyframes tlcgFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .tlcg-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
                gap: 16px;
                flex-wrap: wrap;
            }
            .tlcg-title-area h2 {
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
            .tlcg-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0 0;
            }
            .tlcg-header-actions {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .tlcg-btn {
                padding: 9px 16px;
                border-radius: 10px;
                font-weight: 700;
                font-size: 13.5px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid #cbd5e1;
                background: white;
                color: #334155;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tlcg-btn:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            .tlcg-btn-primary {
                background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                color: white;
                border: none;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
            }
            .tlcg-btn-primary:hover {
                background: linear-gradient(135deg, #4338ca 0%, #2e288a 100%);
                box-shadow: 0 6px 12px -1px rgba(79, 70, 229, 0.3);
                transform: translateY(-1px);
            }
            
            /* Stats Row */
            .tlcg-stats-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .tlcg-stat-card {
                background: white;
                border-radius: 16px;
                padding: 16px 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02);
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
            }
            .tlcg-stat-val {
                font-size: 26px;
                font-weight: 800;
                color: #4f46e5;
                margin-bottom: 4px;
            }
            .tlcg-stat-label {
                font-size: 13px;
                color: #64748b;
                font-weight: 600;
            }
            
            /* Toolbar */
            .tlcg-toolbar {
                background: white;
                border-radius: 16px;
                padding: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                margin-bottom: 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }
            .tlcg-search-box {
                position: relative;
                flex: 1;
                max-width: 400px;
            }
            .tlcg-search-input {
                width: 100%;
                padding: 9px 16px 9px 40px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                outline: none;
                transition: all 0.2s;
            }
            .tlcg-search-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            .tlcg-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: #94a3b8;
                font-size: 16px;
                pointer-events: none;
            }
            .tlcg-range-select-wrapper {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .tlcg-range-label {
                font-size: 13px;
                font-weight: 700;
                color: #475569;
            }
            .tlcg-range-select {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                font-weight: 600;
                color: #334155;
                outline: none;
                background-color: white;
                cursor: pointer;
            }
            
            /* Material Grid */
            .tlcg-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
            }
            .tlcg-mat-card {
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                padding: 20px;
                cursor: pointer;
                transition: all 0.2s ease-in-out;
                position: relative;
                overflow: hidden;
            }
            .tlcg-mat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03);
                border-color: #cbd5e1;
            }
            .tlcg-mat-badge {
                position: absolute;
                top: 20px;
                right: 20px;
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 6px;
                font-weight: 700;
                background: #f1f5f9;
                color: #475569;
            }
            .tlcg-mat-name {
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 16px 0;
                padding-right: 60px;
                line-height: 1.3;
            }
            .tlcg-segment-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px dashed #f1f5f9;
            }
            .tlcg-segment-row:last-child {
                border-bottom: none;
            }
            .tlcg-segment-name {
                font-size: 13px;
                color: #64748b;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .tlcg-segment-val {
                font-size: 13px;
                font-weight: 700;
                color: #1e293b;
            }
            .tlcg-segment-val.val-active {
                color: #4f46e5;
            }
            
            /* Side Drawer */
            .tlcg-drawer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .tlcg-drawer-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .tlcg-drawer {
                position: fixed;
                top: 0;
                right: -600px;
                width: 600px;
                height: 100%;
                background: white;
                box-shadow: -10px 0 25px -5px rgba(0,0,0,0.1), -10px 0 10px -5px rgba(0,0,0,0.04);
                z-index: 1001;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
            }
            .tlcg-drawer.active {
                right: 0;
            }
            .tlcg-drawer-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .tlcg-drawer-title h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 800;
                color: #0f172a;
            }
            .tlcg-drawer-title p {
                margin: 2px 0 0 0;
                font-size: 12px;
                color: #64748b;
            }
            .tlcg-drawer-close {
                background: #f1f5f9;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-weight: 700;
                font-size: 16px;
                transition: background 0.15s;
            }
            .tlcg-drawer-close:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .tlcg-drawer-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
                background: #f8fafc;
            }
            
            /* Color stats card */
            .tlcg-color-card {
                background: white;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.01);
            }
            .tlcg-color-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #f1f5f9;
            }
            .tlcg-color-name {
                font-size: 14px;
                font-weight: 800;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tlcg-color-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #cbd5e1;
                border: 1px solid #94a3b8;
            }
            
            /* Ticket table inside drawer */
            .tlcg-ticket-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 12px;
            }
            .tlcg-ticket-table th {
                background: #f8fafc;
                padding: 8px 10px;
                color: #475569;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
                text-align: left;
            }
            .tlcg-ticket-table td {
                padding: 8px 10px;
                color: #334155;
                border-bottom: 1px solid #f1f5f9;
            }
            .tlcg-ticket-table tr.pending-row {
                background: #fffbeb;
            }
            .tlcg-ticket-table tr.pending-row:hover {
                background: #fef3c7;
            }
            
            /* Modal overlay */
            .tlcg-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                z-index: 1010;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.25s ease;
            }
            .tlcg-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .tlcg-modal {
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 650px;
                max-height: 85vh;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: translateY(20px);
                transition: transform 0.25s ease;
            }
            .tlcg-modal-overlay.active .tlcg-modal {
                transform: translateY(0);
            }
            .tlcg-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .tlcg-modal-title {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
            }
            .tlcg-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            .tlcg-modal-footer {
                padding: 14px 20px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: #f8fafc;
            }
            
            /* Range manager table */
            .tlcg-range-row {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 10px;
            }
            .tlcg-range-input {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
                width: 120px;
                text-align: center;
                outline: none;
            }
            .tlcg-range-input:focus {
                border-color: #4f46e5;
            }
            
            /* Product list for mapping */
            .tlcg-prod-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 400px;
                overflow-y: auto;
                padding-right: 4px;
            }
            .tlcg-prod-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
            }
            .tlcg-prod-name {
                font-weight: 700;
                font-size: 13px;
                color: #1e293b;
            }
            .tlcg-prod-select {
                padding: 6px 10px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 600;
                color: #334155;
                outline: none;
                background: white;
            }
        `;
        document.head.appendChild(style);
    }

    _tlcg.content = content;
    _tlcg.isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';

    await _tlcgLoadData();
}

async function _tlcgLoadData() {
    try {
        const query = _tlcg.selectedRangeId ? `?range_id=${_tlcg.selectedRangeId}` : '';
        const res = await apiCall(`/api/cutting/ratio-stats${query}`, 'GET');
        _tlcg.materials = res.materials || [];
        _tlcg.colors = res.colors || [];
        _tlcg.ranges = res.ranges || [];
        _tlcg.stats = res.stats || [];
        
        // Auto select first range if none selected
        if (!_tlcg.selectedRangeId && _tlcg.ranges.length > 0) {
            // Wait, default should be "All" or a selected range, let's keep selectedRangeId empty to mean "All"
        }

        _tlcgRenderPage();
    } catch (err) {
        console.error('[TLCG load error]', err);
        if (typeof showToast === 'function') showToast('Không thể tải dữ liệu tỉ lệ cắt thực tế: ' + err.message, 'error');
    }
}

function _tlcgRenderPage() {
    if (!_tlcg.content) return;

    // Calculate stats
    const totalMaterials = _tlcg.materials.length;
    // Count how many materials have at least one approved ratio in current range
    const activeMaterialsSet = new Set();
    _tlcg.stats.forEach(s => {
        if (Number(s.total_kg) > 0) {
            const mat = _tlcg.materials.find(m => m.name.trim().toLowerCase() === s.material_name.trim().toLowerCase());
            if (mat) activeMaterialsSet.add(mat.id);
        }
    });
    const configuredCount = activeMaterialsSet.size;

    let html = `
        <div class="tlcg-container">
            <div class="tlcg-header">
                <div class="tlcg-title-area">
                    <h2>📏 Tỉ Lệ Cắt Gốc Thực Tế</h2>
                    <p>Số liệu sản phẩm cắt được trên mỗi kg vải (sp/kg) từ các đơn cắt thành công</p>
                </div>
                <div class="tlcg-header-actions">
                    <button class="tlcg-btn" onclick="_tlcgOpenProductSegmentModal()">
                        ⚙️ Cấu Hình Phân Loại
                    </button>
                    ${_tlcg.isGD ? `
                        <button class="tlcg-btn" onclick="_tlcgOpenRangeModal()">
                            ⚙️ Cấu Hình Khung Số Lượng
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="tlcg-stats-row">
                <div class="tlcg-stat-card">
                    <span class="tlcg-stat-val">${totalMaterials}</span>
                    <span class="tlcg-stat-label">Tổng số loại vải</span>
                </div>
                <div class="tlcg-stat-card">
                    <span class="tlcg-stat-val" style="color: #10b981;">${configuredCount}</span>
                    <span class="tlcg-stat-label">Loại vải có tỉ lệ thực tế</span>
                </div>
                <div class="tlcg-stat-card">
                    <span class="tlcg-stat-val" style="color: #f59e0b;">${totalMaterials - configuredCount}</span>
                    <span class="tlcg-stat-label">Chưa có số liệu thực tế</span>
                </div>
            </div>

            <div class="tlcg-toolbar">
                <div class="tlcg-search-box">
                    <span class="tlcg-search-icon">🔍</span>
                    <input type="text" class="tlcg-search-input" id="tlcgSearch" placeholder="Tìm kiếm loại vải..." value="${_tlcg.filter.search}" oninput="_tlcgHandleSearch(this.value)">
                </div>
                
                <div class="tlcg-range-select-wrapper">
                    <span class="tlcg-range-label">Khung Số Lượng:</span>
                    <select class="tlcg-range-select" onchange="_tlcgChangeRange(this.value)">
                        <option value="">-- Tất cả số lượng --</option>
                        ${_tlcg.ranges.map(r => {
                            const label = r.max_qty >= 999999 ? `Từ ${r.min_qty} sp trở lên` : `${r.min_qty} - ${r.max_qty} sp`;
                            const selected = String(_tlcg.selectedRangeId) === String(r.id) ? 'selected' : '';
                            return `<option value="${r.id}" ${selected}>${label}</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>

            <div class="tlcg-grid" id="tlcgGrid">
                ${_tlcgRenderGrid()}
            </div>
        </div>
    `;

    _tlcg.content.innerHTML = html;
}

function _tlcgGetMaterialStats(matName) {
    const mStats = _tlcg.stats.filter(s => s.material_name.trim().toLowerCase() === matName.trim().toLowerCase());
    
    // Group stats by size segment
    const segments = { 'Người Lớn': { qty: 0, kg: 0 }, 'Trẻ Em': { qty: 0, kg: 0 }, 'Oversize': { qty: 0, kg: 0 } };
    mStats.forEach(s => {
        if (segments[s.size_segment]) {
            segments[s.size_segment].qty += Number(s.total_qty);
            segments[s.size_segment].kg += Number(s.total_kg);
        }
    });

    const formatRatio = (seg) => {
        const data = segments[seg];
        if (data.kg > 0) {
            return `${(data.qty / data.kg).toFixed(2)} sp/kg`;
        }
        return '---';
    };

    return {
        adult: formatRatio('Người Lớn'),
        child: formatRatio('Trẻ Em'),
        oversize: formatRatio('Oversize')
    };
}

function _tlcgRenderGrid() {
    const q = (_tlcg.filter.search || '').trim().toLowerCase();
    const filtered = _tlcg.materials.filter(m => {
        return !q || (m.name || '').toLowerCase().indexOf(q) >= 0 || (m.warehouse_name || '').toLowerCase().indexOf(q) >= 0;
    });

    if (filtered.length === 0) {
        return `<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: #64748b; font-weight: 600;">Không tìm thấy loại vải nào</div>`;
    }

    return filtered.map(m => {
        const s = _tlcgGetMaterialStats(m.name);
        return `
            <div class="tlcg-mat-card" onclick="_tlcgOpenMaterialDrawer(${m.id})">
                <span class="tlcg-mat-badge">${m.unit || 'kg'}</span>
                <h4 class="tlcg-mat-name">${m.name}</h4>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">👔 Người Lớn</span>
                    <span class="tlcg-segment-val ${s.adult !== '---' ? 'val-active' : ''}">${s.adult}</span>
                </div>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">👶 Trẻ Em</span>
                    <span class="tlcg-segment-val ${s.child !== '---' ? 'val-active' : ''}">${s.child}</span>
                </div>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">👕 Oversize</span>
                    <span class="tlcg-segment-val ${s.oversize !== '---' ? 'val-active' : ''}">${s.oversize}</span>
                </div>
            </div>
        `;
    }).join('');
}

function _tlcgHandleSearch(val) {
    _tlcg.filter.search = val;
    const grid = document.getElementById('tlcgGrid');
    if (grid) {
        grid.innerHTML = _tlcgRenderGrid();
    }
}

async function _tlcgChangeRange(val) {
    _tlcg.selectedRangeId = val;
    await _tlcgLoadData();
}

// ========== DRAWER FUNCTIONS (Color breakdown & approvals) ==========

async function _tlcgOpenMaterialDrawer(matId) {
    const mat = _tlcg.materials.find(m => m.id === matId);
    if (!mat) return;
    _tlcg.activeMaterial = mat;

    // Inject drawer overlay and drawer if not present
    if (!document.getElementById('tlcgDrawerOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgDrawerOverlay';
        overlay.className = 'tlcg-drawer-overlay';
        overlay.onclick = _tlcgCloseDrawer;
        document.body.appendChild(overlay);
    }
    
    if (!document.getElementById('tlcgDrawer')) {
        const drawer = document.createElement('div');
        drawer.id = 'tlcgDrawer';
        drawer.className = 'tlcg-drawer';
        document.body.appendChild(drawer);
    }

    const overlay = document.getElementById('tlcgDrawerOverlay');
    const drawer = document.getElementById('tlcgDrawer');

    // Load ticket list and stats details
    let drawerHtml = `
        <div class="tlcg-drawer-header">
            <div class="tlcg-drawer-title">
                <h3>${mat.name}</h3>
                <p>Chi tiết tỉ lệ cắt thực tế theo màu vải và phân khúc</p>
            </div>
            <button class="tlcg-drawer-close" onclick="_tlcgCloseDrawer()">×</button>
        </div>
        <div class="tlcg-drawer-body">
            <div id="tlcgDrawerLoading" style="text-align: center; padding: 40px; color: #64748b; font-weight: 600;">
                ⏳ Đang tải dữ liệu...
            </div>
            <div id="tlcgDrawerContent" style="display: none;"></div>
        </div>
    `;
    drawer.innerHTML = drawerHtml;

    overlay.classList.add('active');
    drawer.classList.add('active');

    await _tlcgLoadDrawerContent(mat);
}

function _tlcgCloseDrawer() {
    const overlay = document.getElementById('tlcgDrawerOverlay');
    const drawer = document.getElementById('tlcgDrawer');
    if (overlay) overlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    _tlcg.activeMaterial = null;
}

async function _tlcgLoadDrawerContent(mat) {
    try {
        const contentDiv = document.getElementById('tlcgDrawerContent');
        const loadingDiv = document.getElementById('tlcgDrawerLoading');
        
        // Fetch tickets matching the material
        const queryParams = `?material_name=${encodeURIComponent(mat.name)}${_tlcg.selectedRangeId ? `&range_id=${_tlcg.selectedRangeId}` : ''}`;
        const res = await apiCall(`/api/cutting/material-tickets${queryParams}`, 'GET');
        const tickets = res.tickets || [];

        // Colors of this material
        const matColors = _tlcg.colors.filter(c => c.material_id === mat.id);

        let html = '';

        // 1. Render stats breakdown per color
        html += `<h4 style="margin: 0 0 12px 0; color: #334155; font-size: 14px; font-weight: 700;">📊 Tỉ lệ cắt thực tế theo màu sắc</h4>`;
        
        if (matColors.length === 0) {
            html += `<div class="tlcg-color-card" style="text-align: center; color: #64748b; font-size: 13px;">Loại vải này chưa được cấu hình màu sắc trong kho</div>`;
        } else {
            matColors.forEach(c => {
                // Calculate stats for this specific color
                const cStats = _tlcg.stats.filter(s => 
                    s.material_name.trim().toLowerCase() === mat.name.trim().toLowerCase() &&
                    s.fabric_color.trim().toLowerCase() === c.color_name.trim().toLowerCase()
                );
                
                const segs = { 'Người Lớn': { qty: 0, kg: 0 }, 'Trẻ Em': { qty: 0, kg: 0 }, 'Oversize': { qty: 0, kg: 0 } };
                cStats.forEach(s => {
                    if (segs[s.size_segment]) {
                        segs[s.size_segment].qty += Number(s.total_qty);
                        segs[s.size_segment].kg += Number(s.total_kg);
                    }
                });

                const getRatio = (seg) => {
                    const d = segs[seg];
                    return d.kg > 0 ? `${(d.qty / d.kg).toFixed(2)} sp/kg` : '---';
                };

                html += `
                    <div class="tlcg-color-card">
                        <div class="tlcg-color-header">
                            <span class="tlcg-color-name">
                                <span class="tlcg-color-dot" style="background: ${c.color_name === 'Trắng' ? '#fff' : (c.color_name === 'Đen' ? '#000' : '#4f46e5')};"></span>
                                ${c.color_name}
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 600;">Người Lớn</div>
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 4px;">${getRatio('Người Lớn')}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 600;">Trẻ Em</div>
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 4px;">${getRatio('Trẻ Em')}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 600;">Oversize</div>
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 4px;">${getRatio('Oversize')}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // 2. Render ticket list for approval
        html += `<h4 style="margin: 24px 0 12px 0; color: #334155; font-size: 14px; font-weight: 700;">📝 Danh sách đơn cắt cần duyệt tỉ lệ</h4>`;
        
        if (tickets.length === 0) {
            html += `<div style="text-align: center; padding: 30px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Không phát sinh đơn cắt lẻ nào thỏa mãn điều kiện lọc</div>`;
        } else {
            html += `
                <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.01);">
                    <table class="tlcg-ticket-table">
                        <thead>
                            <tr>
                                <th>Mã Đơn / SP</th>
                                <th>Màu sắc</th>
                                <th>Phân khúc</th>
                                <th style="text-align: center;">SL cắt / Kg</th>
                                <th style="text-align: center;">Tỉ lệ</th>
                                <th style="text-align: center; width: 100px;">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tickets.map(t => {
                                const isPending = !t.ratio_approved;
                                const rowClass = isPending ? 'pending-row' : '';
                                const segmentLabel = t.size_segment || '<span style="color:#ef4444;font-style:italic;">Chưa phân loại</span>';
                                return `
                                    <tr class="${rowClass}">
                                        <td>
                                            <div style="font-weight: 800; color: #1e293b;">${t.order_code || '---'}</div>
                                            <div style="font-size: 10.5px; color: #64748b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.product_name}</div>
                                        </td>
                                        <td style="font-weight: 600;">${t.fabric_color}</td>
                                        <td>${segmentLabel}</td>
                                        <td style="text-align: center; font-weight: 600;">${t.cut_quantity} áo / ${t.kg_cut} kg</td>
                                        <td style="text-align: center; font-weight: 800; color: #4f46e5;">${Number(t.cut_ratio).toFixed(2)}</td>
                                        <td style="text-align: center;">
                                            ${_tlcg.isGD ? `
                                                ${isPending ? `
                                                    <button class="btn btn-sm btn-success" style="font-size: 11px; padding: 3px 8px; font-weight: 700;" onclick="_tlcgApproveTicket(${t.id})">Duyệt</button>
                                                ` : `
                                                    <button class="btn btn-sm btn-outline-danger" style="font-size: 10px; padding: 2px 6px; font-weight: 700;" onclick="_tlcgUnapproveTicket(${t.id})">Hủy duyệt</button>
                                                `}
                                            ` : `
                                                <span class="badge ${t.ratio_approved ? 'badge-success' : 'badge-warning'}" style="font-size:10px;">
                                                    ${t.ratio_approved ? 'Đã duyệt' : 'Chờ duyệt'}
                                                </span>
                                            `}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        loadingDiv.style.display = 'none';
        contentDiv.innerHTML = html;
        contentDiv.style.display = 'block';

    } catch (err) {
        console.error('[TLCG load drawer error]', err);
        const loadingDiv = document.getElementById('tlcgDrawerLoading');
        if (loadingDiv) loadingDiv.innerHTML = '❌ Lỗi tải dữ liệu chi tiết!';
    }
}

async function _tlcgApproveTicket(id) {
    try {
        const res = await apiCall(`/api/cutting/approve-ratio/${id}`, 'POST');
        if (res.success) {
            if (typeof showToast === 'function') showToast('Đã duyệt tỉ lệ đơn cắt thành công!', 'success');
            // Refresh drawer and page
            await _tlcgLoadDrawerContent(_tlcg.activeMaterial);
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Duyệt thất bại', 'error');
        }
    } catch (err) {
        console.error('[Approve ticket error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

async function _tlcgUnapproveTicket(id) {
    try {
        const res = await apiCall(`/api/cutting/unapprove-ratio/${id}`, 'POST');
        if (res.success) {
            if (typeof showToast === 'function') showToast('Đã hủy duyệt tỉ lệ đơn cắt!', 'success');
            // Refresh drawer and page
            await _tlcgLoadDrawerContent(_tlcg.activeMaterial);
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Hủy duyệt thất bại', 'error');
        }
    } catch (err) {
        console.error('[Unapprove ticket error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

// ========== PRODUCT SEGMENT MODAL ==========

async function _tlcgOpenProductSegmentModal() {
    // Inject overlay if not present
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');
    
    // Load products
    overlay.innerHTML = `
        <div class="tlcg-modal">
            <div class="tlcg-modal-header">
                <h4 class="tlcg-modal-title">⚙️ Cấu Hình Phân Loại Sản Phẩm Nhóm "Bán"</h4>
                <button class="tlcg-drawer-close" onclick="_tlcgCloseModal()">×</button>
            </div>
            <div class="tlcg-modal-body">
                <div style="margin-bottom: 16px;">
                    <input type="text" class="tlcg-search-input" id="tlcgProdSearch" placeholder="Tìm tên sản phẩm..." oninput="_tlcgFilterModalProducts(this.value)">
                </div>
                <div class="tlcg-prod-list" id="tlcgProdList">
                    ⏳ Đang tải danh sách sản phẩm...
                </div>
            </div>
            <div class="tlcg-modal-footer">
                <button class="tlcg-btn" onclick="_tlcgCloseModal()">Hủy</button>
                <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgSaveProductSegments()">Lưu Cấu Hình</button>
            </div>
        </div>
    `;
    overlay.classList.add('active');

    try {
        const res = await apiCall('/api/cutting/products-segment', 'GET');
        _tlcg.products = res.products || [];
        _tlcgRenderModalProducts();
    } catch (err) {
        console.error('[Load prod segments error]', err);
        document.getElementById('tlcgProdList').innerText = '❌ Không thể tải danh sách sản phẩm!';
    }
}

function _tlcgCloseModal() {
    const overlay = document.getElementById('tlcgModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function _tlcgRenderModalProducts() {
    const listDiv = document.getElementById('tlcgProdList');
    if (!listDiv) return;

    const q = (document.getElementById('tlcgProdSearch')?.value || '').trim().toLowerCase();
    const filtered = _tlcg.products.filter(p => !q || p.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
        listDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Không tìm thấy sản phẩm nào</div>';
        return;
    }

    listDiv.innerHTML = filtered.map(p => {
        const seg = p.size_segment || '';
        return `
            <div class="tlcg-prod-row" data-id="${p.id}">
                <span class="tlcg-prod-name">${p.name}</span>
                <select class="tlcg-prod-select" data-id="${p.id}">
                    <option value="" ${seg === '' ? 'selected' : ''}>-- Chưa phân loại --</option>
                    <option value="Người Lớn" ${seg === 'Người Lớn' ? 'selected' : ''}>👔 Người Lớn</option>
                    <option value="Trẻ Em" ${seg === 'Trẻ Em' ? 'selected' : ''}>👶 Trẻ Em</option>
                    <option value="Oversize" ${seg === 'Oversize' ? 'selected' : ''}>👕 Oversize</option>
                </select>
            </div>
        `;
    }).join('');
}

function _tlcgFilterModalProducts(val) {
    _tlcgRenderModalProducts();
}

async function _tlcgSaveProductSegments() {
    const selects = document.querySelectorAll('.tlcg-prod-select');
    const updates = [];
    selects.forEach(sel => {
        updates.push({
            id: Number(sel.dataset.id),
            size_segment: sel.value || null
        });
    });

    try {
        const res = await apiCall('/api/cutting/products-segment', 'POST', { updates });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Lưu cấu hình phân loại thành công!', 'success');
            _tlcgCloseModal();
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        console.error('[Save product segment error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

// ========== QUANTITY RANGES MODAL ==========

async function _tlcgOpenRangeModal() {
    // Inject overlay if not present
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');

    overlay.innerHTML = `
        <div class="tlcg-modal" style="max-width: 450px;">
            <div class="tlcg-modal-header">
                <h4 class="tlcg-modal-title">⚙️ Cấu Hình Khung Số Lượng Thống Kê</h4>
                <button class="tlcg-drawer-close" onclick="_tlcgCloseModal()">×</button>
            </div>
            <div class="tlcg-modal-body">
                <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">Định nghĩa các khung số lượng (số lượng áo trong 1 ticket cắt) để hệ thống phân loại thống kê tỉ lệ. Nhập số cực đại lớn (ví dụ: 999999) cho khung "Từ ... trở lên".</p>
                <div id="tlcgRangeList">
                    <!-- Loaded dynamically -->
                </div>
                <button class="tlcg-btn" style="width: 100%; border-style: dashed; border-color: #4f46e5; color: #4f46e5; margin-top: 12px; justify-content: center;" onclick="_tlcgAddEmptyRangeRow()">
                    ➕ Thêm khung mới
                </button>
            </div>
            <div class="tlcg-modal-footer">
                <button class="tlcg-btn" onclick="_tlcgCloseModal()">Hủy</button>
                <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgSaveRanges()">Lưu Cấu Hình</button>
            </div>
        </div>
    `;
    overlay.classList.add('active');

    _tlcgRenderRangesModalContent();
}

function _tlcgRenderRangesModalContent() {
    const listDiv = document.getElementById('tlcgRangeList');
    if (!listDiv) return;

    listDiv.innerHTML = _tlcg.ranges.map((r, idx) => `
        <div class="tlcg-range-row" data-idx="${idx}">
            <input type="number" class="tlcg-range-input r-min" placeholder="Từ (Min)" value="${r.min_qty}">
            <span style="color: #64748b; font-weight: 700;">➔</span>
            <input type="number" class="tlcg-range-input r-max" placeholder="Đến (Max)" value="${r.max_qty >= 999999 ? '' : r.max_qty}">
            <span style="font-size: 11px; color: #64748b; flex: 1;">${r.max_qty >= 999999 ? 'Trở lên' : 'sản phẩm'}</span>
            <button class="tlcg-drawer-close" style="background:#fee2e2; color:#ef4444; width: 28px; height: 28px;" onclick="_tlcgRemoveRangeRow(${idx})">×</button>
        </div>
    `).join('');
}

function _tlcgAddEmptyRangeRow() {
    _tlcg.ranges.push({ min_qty: 0, max_qty: 999999 });
    _tlcgRenderRangesModalContent();
}

function _tlcgRemoveRangeRow(idx) {
    _tlcg.ranges.splice(idx, 1);
    _tlcgRenderRangesModalContent();
}

async function _tlcgSaveRanges() {
    const rows = document.querySelectorAll('.tlcg-range-row');
    const ranges = [];
    
    for (const r of rows) {
        const minVal = parseInt(r.querySelector('.r-min').value);
        let maxVal = parseInt(r.querySelector('.r-max').value);
        if (isNaN(maxVal) || !maxVal) {
            maxVal = 999999; // Default upper bound
        }

        if (isNaN(minVal) || minVal < 0 || maxVal < minVal) {
            if (typeof showToast === 'function') showToast('Giá trị khoảng số lượng không hợp lệ!', 'error');
            return;
        }

        ranges.push({ min_qty: minVal, max_qty: maxVal });
    }

    // Sort by min_qty
    ranges.sort((a, b) => a.min_qty - b.min_qty);

    try {
        const res = await apiCall('/api/cutting/quantity-ranges', 'POST', { ranges });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Cấu hình khung số lượng thành công!', 'success');
            _tlcgCloseModal();
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        console.error('[Save ranges error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}
