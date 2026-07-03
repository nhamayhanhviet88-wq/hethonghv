/**
 * Báo Giá CTV/HH Page Controller (Desktop)
 * Path: public/js/pages/baogiactvhh.js
 */

async function apiFetch(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || null;
    const fetchOptions = {
        method,
        headers: {},
        credentials: 'include'
    };
    if (body) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
    }
    const res = await fetch(url, fetchOptions);
    if (res.status === 401 || res.status === 403) {
        window.location.href = '/';
        throw new Error('Chưa đăng nhập');
    }
    return res.json();
}

// State variables
var _ctvState = {
    activeTab: 'calculator',
    activeConfig: null,
    customers: [],
    selectedCustomer: null,
    quantity: '',
    selectedMaterialIndex: 0,
    surcharges: {
        collar: false,
        raglan: false,
        color_block: false,
        primary_school: false
    },
    // Print config
    printType: 'none', // none, pet, print3d, screen, embroidery
    savedPrints: [],
    // PET Shapes list
    petShapes: [], // { width, height, qty_per_shirt, mode: 'aligned'|'nested' }
    // Screen print state
    screenColors: 1,
    // Embroidery state
    embroideryCost: 15000,
    // 3D printing cost state
    print3dCost: 30000,
    petChestPrint: false,
    showPetInputForm: false,
    includeCommission: false,
    targetType: null,
    
    // History list
    historyLogs: [],
    // Config version history
    configVersions: []
};

async function renderBaogiactvhhPage(content) {
    if (!document.getElementById('_baogiactvhh_styles')) {
        const style = document.createElement('style');
        style.id = '_baogiactvhh_styles';
        style.textContent = `
            .baogiactvhh-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 24px;
                font-family: 'Inter', sans-serif;
                color: #1e293b;
            }
            .baogiactvhh-header {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                border-radius: 16px;
                padding: 24px;
                color: white;
                margin-bottom: 24px;
                box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .baogiactvhh-header h2 {
                margin: 0;
                font-size: 24px;
                font-weight: 800;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .baogiactvhh-header p {
                margin: 6px 0 0 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.85);
            }
            .baogiactvhh-tabs {
                display: flex;
                gap: 8px;
                border-bottom: 2px solid #e2e8f0;
                margin-bottom: 24px;
                padding-bottom: 6px;
            }
            .baogiactvhh-tabs .tab-btn {
                background: transparent !important;
                border: none !important;
                padding: 10px 20px !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #0f172a !important; /* Xanh đen */
                cursor: pointer;
                border-radius: 8px !important;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .baogiactvhh-tabs .tab-btn:hover {
                color: #1e3a8a !important;
                background-color: #f1f5f9 !important;
            }
            .baogiactvhh-tabs .tab-btn.active {
                color: white !important;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%) !important;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
            }
            .ctv-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 24px;
            }
            @media (min-width: 1024px) {
                .ctv-grid {
                    grid-template-columns: 1.2fr 1fr;
                }
            }
            .ctv-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                border: 1px solid #f1f5f9;
                padding: 24px;
                margin-bottom: 24px;
            }
            .ctv-card-title {
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                margin-top: 0;
                margin-bottom: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
                border-bottom: 1.5px dashed #f1f5f9;
                padding-bottom: 10px;
            }
            .ctv-form-group {
                margin-bottom: 20px;
                position: relative;
            }
            .ctv-form-group label {
                display: block;
                font-size: 12.5px;
                font-weight: 700;
                color: #334155;
                margin-bottom: 6px;
            }
            .ctv-input {
                width: 100%;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                padding: 10px 14px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                background-color: #fff;
                color: #1e293b;
            }
            .ctv-input:focus {
                border-color: #3b82f6;
                outline: none;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            .ctv-select {
                width: 100%;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                padding: 10px 14px;
                font-size: 14px;
                font-weight: 500;
                background-color: #fff;
                color: #1e293b;
            }
            .ctv-checkbox-group {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                border: 1px solid #e2e8f0;
            }
            .ctv-checkbox-label {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 13.5px;
                font-weight: 600;
                color: #475569;
                cursor: pointer;
                user-select: none;
            }
            .ctv-checkbox-label input {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .ctv-autocomplete-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1.5px solid #e2e8f0;
                border-radius: 10px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 50;
                max-height: 220px;
                overflow-y: auto;
                margin-top: 4px;
            }
            .ctv-autocomplete-item {
                padding: 10px 14px;
                cursor: pointer;
                font-size: 13.5px;
                border-bottom: 1px solid #f1f5f9;
                transition: background 0.15s;
            }
            .ctv-autocomplete-item:hover {
                background: #f1f5f9;
            }
            .ctv-selected-badge {
                display: inline-flex;
                align-items: center;
                background: #e0f2fe;
                color: #0369a1;
                border: 1px solid #bae6fd;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                margin-top: 8px;
                gap: 8px;
            }
            .ctv-selected-badge button {
                background: none;
                border: none;
                color: #0369a1;
                cursor: pointer;
                font-weight: 800;
                font-size: 14px;
                padding: 0;
            }
            .ctv-print-config-box {
                background: #f0fdfa;
                border: 1.5px dashed #99f6e4;
                border-radius: 12px;
                padding: 16px;
                margin-top: 16px;
            }
            .ctv-print-config-box h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: #0d9488;
                font-weight: 700;
            }
            .ctv-btn-action {
                background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
                margin-top: 12px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
            }
            .ctv-btn-action:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
            }
            .ctv-btn-secondary {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                padding: 8px 14px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
            }
            .ctv-btn-secondary:hover {
                background: #e2e8f0;
            }
            .ctv-btn-primary {
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 750;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .ctv-btn-primary:hover {
                transform: translateY(-2px);
                filter: brightness(1.15);
            }
            .ctv-btn-primary:active {
                transform: translateY(0);
            }
            .btn-add-pet-shape {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
                color: white !important;
                border: none !important;
                font-weight: 700 !important;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
                transition: all 0.2s ease;
            }
            .btn-add-pet-shape:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45) !important;
                filter: brightness(1.15);
            }
            .btn-add-pet-shape:active {
                transform: translateY(0);
            }
            .btn-print-pet {
                background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
            }
            .btn-print-pet:hover {
                box-shadow: 0 6px 20px rgba(13, 148, 136, 0.45);
            }
            .btn-print-3d {
                background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
                box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
            }
            .btn-print-3d:hover {
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
            }
            .btn-print-screen {
                background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
                box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
            }
            .btn-print-screen:hover {
                box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
            }
            .btn-print-emb {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
            }
            .btn-print-emb:hover {
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
            }
            /* Result Breakdown area */
            .ctv-result-card {
                background: #1e293b;
                color: white;
                border-radius: 16px;
                padding: 24px;
                position: sticky;
                top: 24px;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
            }
            .ctv-result-title {
                font-size: 18px;
                font-weight: 800;
                border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
                padding-bottom: 12px;
                margin-bottom: 16px;
                color: #38bdf8;
            }
            .ctv-result-row {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                margin-bottom: 10px;
                color: #cbd5e1;
            }
            .ctv-result-row.total {
                border-top: 2px solid rgba(255, 255, 255, 0.2);
                padding-top: 14px;
                font-size: 20px;
                font-weight: 800;
                color: #ffffff;
                margin-top: 16px;
            }
            .ctv-words {
                font-style: italic;
                font-size: 13px;
                color: #38bdf8;
                margin-top: 8px;
                text-align: right;
                line-height: 1.4;
            }
            .ctv-pet-shape-form {
                display: grid;
                grid-template-columns: 1.5fr 1fr 1fr auto;
                gap: 8px;
                align-items: end;
                margin-bottom: 12px;
            }
            .ctv-shapes-table {
                width: 100%;
                font-size: 12.5px;
                border-collapse: collapse;
                margin-top: 8px;
            }
            .ctv-shapes-table th, .ctv-shapes-table td {
                border-bottom: 1px solid #cbd5e1;
                padding: 6px 8px;
                text-align: center;
            }
            .ctv-shapes-table th {
                font-weight: 700;
                color: #475569;
                background: #f1f5f9;
            }
            .ctv-remove-btn {
                background: #fee2e2;
                color: #ef4444;
                border: none;
                padding: 4px 8px;
                border-radius: 6px;
                cursor: pointer;
            }
            .ctv-remove-btn:hover {
                background: #fecaca;
            }
            /* History & Settings Tables */
            .ctv-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13.5px;
            }
            .ctv-table th, .ctv-table td {
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            .ctv-table th {
                background: #f8fafc;
                font-weight: 700;
                color: #475569;
            }
            .ctv-badge {
                display: inline-flex;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
            }
            .ctv-badge-active {
                background: #dcfce7;
                color: #15803d;
            }
            .ctv-badge-inactive {
                background: #f1f5f9;
                color: #475569;
            }
            .ctv-filter-bar {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .ctv-filter-bar input, .ctv-filter-bar select {
                padding: 8px 12px;
                border: 1.5px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
            }
            /* Printable Quote Styles */
            @media print {
                body * {
                    visibility: hidden;
                }
                #ctv_print_export_modal_content, #ctv_print_export_modal_content *,
                #ctv_fee_print_content, #ctv_fee_print_content * {
                    visibility: visible;
                }
                #ctv_print_export_modal_content, #ctv_fee_print_content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                }
                .no-print {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    _ctvState.content = content;
    
    // 1. Fetch current active configuration
    await _ctvLoadActiveConfig();
    
    // 2. Initial rendering
    _ctvRenderPageLayout();
}

async function _ctvLoadActiveConfig() {
    try {
        const res = await apiFetch('/api/ctv-quotations/config/active');
        if (res && res.config) {
            _ctvState.activeConfig = res.config;
            _ctvState.print3dCost = res.config.print_prices.print3d?.flat_price || 30000;
            
            // Ensure activeConfig is in configVersions so we can preview it
            if (!_ctvState.configVersions) _ctvState.configVersions = [];
            if (!_ctvState.configVersions.some(v => v.id === res.config.id)) {
                _ctvState.configVersions.push(res.config);
            }
        } else {
            _ctvState.activeConfig = null;
        }
    } catch (e) {
        console.error('Lỗi lấy active config:', e);
        _ctvState.activeConfig = null;
    }
}

function _ctvRenderPageLayout() {
    const isManager = currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'quan_ly_cap_cao');
    
    _ctvState.content.innerHTML = `
        <div class="baogiactvhh-container">
            <div class="baogiactvhh-header">
                <div>
                    <h2>🤝 Báo Giá CTV/HH</h2>
                    <p>Tính toán bảng giá may & in ấn chuyên nghiệp cho Cộng Tác Viên & Đại Lý</p>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="ctv-btn-secondary" style="background:#fff; border:none; color:#1e3a8a; padding:8px 16px; border-radius:10px; font-size:12px; display:flex; align-items:center; gap:6px; font-weight:800; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px -2px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" onclick="_ctvOpenCompanySettingsModal()">
                        🏢 Cài Đặt Công Ty
                    </button>
                    ${_ctvState.activeConfig ? `
                        <button class="ctv-btn-primary" style="background:#2563eb; border:none; color:white; padding:6px 14px; border-radius:10px; text-align:left; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.2s; display:flex; flex-direction:column; justify-content:center; gap:2px;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px -2px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" onclick="_ctvPreviewConfigDetails(${_ctvState.activeConfig.id}, 'ctv')">
                            <span style="font-size: 10px; font-weight: 700; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">👥 Biểu phí CTV</span>
                            <span style="font-size: 12px; font-weight: 850;">${_ctvState.activeConfig.version_name}</span>
                        </button>
                        <button class="ctv-btn-primary" style="background:#f97316; border:none; color:white; padding:6px 14px; border-radius:10px; text-align:left; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.2s; display:flex; flex-direction:column; justify-content:center; gap:2px;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px -2px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" onclick="_ctvPreviewConfigDetails(${_ctvState.activeConfig.id}, 'customer')">
                            <span style="font-size: 10px; font-weight: 700; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">🛍️ Biểu phí Khách</span>
                            <span style="font-size: 12px; font-weight: 850;">${_ctvState.activeConfig.version_name}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="baogiactvhh-tabs">
                <button class="tab-btn active" id="ctv-tab-btn-calculator" onclick="_ctvSwitchTab('calculator')">🧮 Tính Báo Giá</button>
                <button class="tab-btn" id="ctv-tab-btn-history" onclick="_ctvSwitchTab('history')">📜 Lịch Sử Đã Tạo</button>
                ${isManager ? `
                    <button class="tab-btn" id="ctv-tab-btn-settings" onclick="_ctvSwitchTab('settings')">⚙️ Thiết Lập Biểu Phí</button>
                ` : ''}
            </div>
            
            <div id="ctv-tab-content">
                <!-- Inner views will be rendered here -->
            </div>
        </div>
    `;
    
    // Load initial tab
    _ctvSwitchTab(_ctvState.activeTab);
}

function _ctvSwitchTab(tabName) {
    _ctvState.activeTab = tabName;
    
    // Toggle active class on tab buttons
    document.querySelectorAll('.baogiactvhh-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`ctv-tab-btn-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const container = document.getElementById('ctv-tab-content');
    if (!container) return;
    
    if (tabName === 'calculator') {
        _ctvRenderCalculator(container);
    } else if (tabName === 'history') {
        _ctvRenderHistory(container);
    } else if (tabName === 'settings') {
        _ctvRenderSettings(container);
    }
}

// ==========================================
// TAB 1: CALCULATOR
// ==========================================

function _ctvRenderCalculator(container) {
    if (!_ctvState.activeConfig) {
        container.innerHTML = `
            <div class="ctv-card" style="text-align: center; padding: 48px;">
                <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
                <h3 style="margin:0 0 10px 0;">Chưa có biểu phí cấu hình hoạt động</h3>
                <p style="color:#64748b; margin-bottom:20px;">Vui lòng liên hệ Giám Đốc hoặc Quản Lý để thiết lập kích hoạt phiên bản biểu phí đầu tiên.</p>
            </div>
        `;
        return;
    }
    
    const config = _ctvState.activeConfig;
    
    // Auto-select first active material if current selection is inactive or invalid
    let activeMats = config.materials.map((m, idx) => ({ ...m, originalIndex: idx })).filter(m => !m.inactive);
    if (activeMats.length > 0) {
        const currentMat = config.materials[_ctvState.selectedMaterialIndex];
        if (!currentMat || currentMat.inactive) {
            _ctvState.selectedMaterialIndex = activeMats[0].originalIndex;
        }
    }
    
    container.innerHTML = `
        <div class="ctv-grid">
            <!-- Left Side: Inputs -->
            <div>
                <!-- Target Selection (Mandatory) -->
                <div class="ctv-card" style="border: 2px solid #3b82f6;">
                    <div class="ctv-card-title" style="color: #1d4ed8; display: flex; align-items: center; justify-content: space-between;">
                        <span>🎯 Chọn Đối Tượng Báo Giá <span style="color:#ef4444;">*</span></span>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 8px;">
                        <div onclick="_ctvSelectTargetType('ctv')" id="target_type_ctv" style="flex: 1; padding: 12px; border-radius: 10px; border: 2px solid #cbd5e1; cursor: pointer; text-align: center; transition: all 0.2s; background: white; font-weight: 700; color: #475569; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                            <span style="font-size: 24px;">👥</span>
                            <span>Báo giá CTV / Đại lý</span>
                        </div>
                        <div onclick="_ctvSelectTargetType('customer')" id="target_type_customer" style="flex: 1; padding: 12px; border-radius: 10px; border: 2px solid #cbd5e1; cursor: pointer; text-align: center; transition: all 0.2s; background: white; font-weight: 700; color: #475569; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                            <span style="font-size: 24px;">🛍️</span>
                            <span>Báo giá Khách hàng</span>
                        </div>
                    </div>
                </div>

                <!-- Customer Lookup -->
                <div class="ctv-card">
                    <div class="ctv-card-title">👤 Thông Tin Khách Hàng</div>
                    <div class="ctv-form-group">
                        <label>Tìm kiếm Khách hàng (Telesale/Chăm sóc)</label>
                        <input type="text" class="ctv-input" id="ctv_cust_search" placeholder="Nhập tên hoặc số điện thoại để tìm kiếm..." oninput="_ctvOnCustomerSearch(this.value)">
                        <div id="ctv_cust_dropdown" class="ctv-autocomplete-dropdown" style="display:none;"></div>
                        <div id="ctv_selected_cust_badge"></div>
                    </div>
                    
                    <div class="ctv-form-group">
                        <label>Số lượng áo đặt hàng</label>
                        <input type="number" class="ctv-input" id="ctv_qty" min="1" value="${_ctvState.quantity}" oninput="_ctvOnQuantityChange(this.value)">
                    </div>
                </div>
                
                <!-- Blank Materials & Surcharges -->
                <div class="ctv-card">
                    <div class="ctv-card-title">👕 Phôi Trơn & Phụ Phí</div>
                    <div class="ctv-form-group">
                        <label>Chọn Chất liệu vải</label>
                        <select class="ctv-select" id="ctv_material" onchange="_ctvOnMaterialChange(this.value)">
                            ${config.materials.map((m, idx) => {
                                if (m.inactive) return '';
                                const price = _ctvState.targetType === 'customer' 
                                    ? (m.customer_price !== undefined ? Number(m.customer_price) : Math.round(Number(m.price) * 1.15)) 
                                    : Number(m.price);
                                return `
                                    <option value="${idx}" ${idx === _ctvState.selectedMaterialIndex ? 'selected' : ''}>
                                        ${m.name} - ${price.toLocaleString('vi-VN')} đ (May cổ tròn)
                                    </option>
                                `;
                            }).join('')}
                        </select>
                    </div>
                    
                    <div class="ctv-form-group">
                        <label>Các phụ phí tùy chọn</label>
                        <div class="ctv-checkbox-group" id="ctv_surcharges_group"></div>
                    </div>
                </div>
                
                <!-- Print Configuration -->
                <div class="ctv-card">
                    <div class="ctv-card-title">🎨 Phương Án In</div>
                    <div class="ctv-form-group">
                        <label>Loại hình in</label>
                        <select class="ctv-select" id="ctv_print_type" onchange="_ctvOnPrintTypeChange(this.value)">
                            <option value="none" ${_ctvState.printType === 'none' ? 'selected' : ''}>Không in</option>
                            <option value="pet" ${_ctvState.printType === 'pet' ? 'selected' : ''}>In PET</option>
                            <option value="screen" ${_ctvState.printType === 'screen' ? 'selected' : ''}>In Lưới</option>
                            <option value="print3d" ${_ctvState.printType === 'print3d' ? 'selected' : ''}>In 3D</option>
                            <option value="embroidery" ${_ctvState.printType === 'embroidery' ? 'selected' : ''}>Thêu</option>
                        </select>
                    </div>
                    
                    <!-- Dynamic Print Panel -->
                    <div id="ctv_print_panel"></div>
                    
                    <!-- Saved Prints List -->
                    <div id="ctv_saved_prints_container" style="margin-top: 14px;"></div>
                </div>
            </div>
            
            <!-- Right Side: Live Calculation & Export -->
            <div>
                <div class="ctv-result-card" id="ctv_result_card">
                    <!-- Live calculations will render here -->
                </div>
            </div>
        </div>
    `;
    
    // Restore selected customer badge if any
    _ctvRenderSelectedCustomer();
    // Render dynamic printing fields
    _ctvRenderPrintPanel();
    _ctvRenderSavedPrintsList();
    _ctvUpdatePrintTypeDropdown();
    if (_ctvState.targetType) {
        _ctvSelectTargetType(_ctvState.targetType);
    }
    // Render live breakdown results
    _ctvUpdateCalculations();
}

async function _ctvOnCustomerSearch(val) {
    const dropdown = document.getElementById('ctv_cust_dropdown');
    if (!dropdown) return;
    
    const query = val.trim();
    if (query.length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    
    try {
        const res = await apiFetch(`/api/ctv-quotations/customers?search=${encodeURIComponent(query)}`);
        if (res && res.customers) {
            _ctvState.customers = res.customers;
            if (res.customers.length === 0) {
                dropdown.innerHTML = `<div style="padding:10px; color:#64748b; font-size:13px; text-align:center;">Không tìm thấy khách hàng phù hợp</div>`;
            } else {
                dropdown.innerHTML = res.customers.map(c => `
                    <div class="ctv-autocomplete-item" onclick="_ctvSelectCustomer(${c.id})">
                        <strong>${c.customer_name}</strong> - ${c.phone} 
                        <span style="font-size:11px; padding:2px 6px; border-radius:4px; margin-left:6px; background:#f1f5f9; color:#475569;">
                            ${c.crm_type}
                        </span>
                    </div>
                `).join('');
            }
            dropdown.style.display = 'block';
        }
    } catch(e) {
        console.error('Lỗi search KH:', e);
    }
}

function _ctvSelectCustomer(id) {
    const customer = _ctvState.customers.find(c => c.id === id);
    if (customer) {
        _ctvState.selectedCustomer = customer;
        const searchInput = document.getElementById('ctv_cust_search');
        if (searchInput) searchInput.value = '';
        _ctvRenderSelectedCustomer();
        _ctvUpdateCalculations();
    }
    const dropdown = document.getElementById('ctv_cust_dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function _ctvRenderSelectedCustomer() {
    const container = document.getElementById('ctv_selected_cust_badge');
    if (!container) return;
    
    if (_ctvState.selectedCustomer) {
        container.innerHTML = `
            <div class="ctv-selected-badge">
                👤 ${_ctvState.selectedCustomer.customer_name} (${_ctvState.selectedCustomer.phone})
                <button type="button" onclick="_ctvClearCustomer()">×</button>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

function _ctvClearCustomer() {
    _ctvState.selectedCustomer = null;
    _ctvRenderSelectedCustomer();
    _ctvUpdateCalculations();
}

function _ctvOnQuantityChange(val) {
    if (val === '') {
        _ctvState.quantity = '';
    } else {
        _ctvState.quantity = Math.max(1, parseInt(val) || 1);
    }
    _ctvRenderSurchargeCheckboxes();
    if (_ctvState.printType === 'print3d') {
        _ctvRenderPrintPanel();
    }
    _ctvUpdateCalculations();
}

function _ctvOnMaterialChange(idx) {
    _ctvState.selectedMaterialIndex = Number(idx);
    _ctvUpdateCalculations();
}

function _ctvSelectTargetType(type) {
    _ctvState.targetType = type;
    _ctvState.includeCommission = (type === 'customer');
    
    const ctvCard = document.getElementById('target_type_ctv');
    const customerCard = document.getElementById('target_type_customer');
    
    if (ctvCard && customerCard) {
        if (type === 'ctv') {
            ctvCard.style.borderColor = '#2563eb';
            ctvCard.style.background = '#eff6ff';
            ctvCard.style.color = '#1d4ed8';
            ctvCard.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)';
            
            customerCard.style.borderColor = '#cbd5e1';
            customerCard.style.background = 'white';
            customerCard.style.color = '#475569';
            customerCard.style.boxShadow = 'none';
        } else if (type === 'customer') {
            customerCard.style.borderColor = '#ea580c';
            customerCard.style.background = '#fff7ed';
            customerCard.style.color = '#c2410c';
            customerCard.style.boxShadow = '0 0 0 2px rgba(234,88,12,0.2)';
            
            ctvCard.style.borderColor = '#cbd5e1';
            ctvCard.style.background = 'white';
            ctvCard.style.color = '#475569';
            ctvCard.style.boxShadow = 'none';
        }
    }
    
    // Auto-select first active material if current selection is inactive or invalid
    if (_ctvState.activeConfig) {
        const config = _ctvState.activeConfig;
        let activeMats = config.materials.map((m, idx) => ({ ...m, originalIndex: idx })).filter(m => !m.inactive);
        if (activeMats.length > 0) {
            const currentMat = config.materials[_ctvState.selectedMaterialIndex];
            if (!currentMat || currentMat.inactive) {
                _ctvState.selectedMaterialIndex = activeMats[0].originalIndex;
            }
        }
    }
    
    // Update material dropdown options dynamically
    const materialSelect = document.getElementById('ctv_material');
    if (materialSelect && _ctvState.activeConfig) {
        const config = _ctvState.activeConfig;
        const currentIdx = materialSelect.value !== "" ? Number(materialSelect.value) : _ctvState.selectedMaterialIndex;
        materialSelect.innerHTML = config.materials.map((m, idx) => {
            if (m.inactive) return '';
            const price = type === 'customer' 
                ? (m.customer_price !== undefined ? Number(m.customer_price) : Math.round(Number(m.price) * 1.15)) 
                : Number(m.price);
            return `<option value="${idx}" ${idx === currentIdx ? 'selected' : ''}>
                ${m.name} - ${price.toLocaleString('vi-VN')} đ (May cổ tròn)
            </option>`;
        }).join('');
    }
    
    // Update surcharge checkboxes dynamically
    _ctvRenderSurchargeCheckboxes();
}

function _ctvRenderSurchargeCheckboxes() {
    const group = document.getElementById('ctv_surcharges_group');
    if (!group || !_ctvState.activeConfig) return;
    
    const config = _ctvState.activeConfig;
    const type = _ctvState.targetType || 'ctv';
    const qty = parseInt(_ctvState.quantity) || 0;
    
    const ordered = _ctvGetOrderedOptionalSurcharges(config);
    
    group.innerHTML = ordered.filter(item => {
        if (item.inactive) return false;
        if (type === 'customer') {
            if (item.customer_inactive) return false;
        } else {
            if (item.ctv_inactive) return false;
        }
        const surchargeVal = type === 'customer'
            ? (item.customer_value !== undefined ? item.customer_value : item.value)
            : item.value;
        const priceInfo = _ctvGetPriceInfo(surchargeVal);
        return !priceInfo.isContact;
    }).map(item => {
        const is100Plus = item.name.toLowerCase().includes('từ 100 áo') || item.name.toLowerCase().includes('tu 100 ao');
        const is200Plus = item.name.toLowerCase().includes('từ 200 áo') || item.name.toLowerCase().includes('tu 200 ao');
        
        let isChecked = false;
        let isDisabled = false;
        
        if (is200Plus) {
            if (qty >= 200) {
                isChecked = true;
                isDisabled = true;
                _ctvState.surcharges[item.key] = true;
            } else {
                _ctvState.surcharges[item.key] = false;
                isChecked = false;
                isDisabled = true;
            }
        } else if (is100Plus) {
            if (qty >= 100 && qty < 200) {
                isChecked = true;
                isDisabled = true;
                _ctvState.surcharges[item.key] = true;
            } else {
                _ctvState.surcharges[item.key] = false;
                isChecked = false;
                isDisabled = true;
            }
        } else {
            isChecked = !!_ctvState.surcharges[item.key];
            isDisabled = false;
        }
        
        const surchargeVal = type === 'customer'
            ? (item.customer_value !== undefined ? item.customer_value : item.value)
            : item.value;
        const priceInfo = _ctvGetPriceInfo(surchargeVal);
        const safeId = 'ctv_sc_' + item.key.replace(/\s+/g, '_');
        
        return `
            <label class="ctv-checkbox-label" style="${isDisabled ? 'opacity:0.7; cursor:not-allowed;' : ''}">
                <input type="checkbox" id="${safeId}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} onchange="_ctvToggleSurcharge('${item.key}', this.checked)">
                ${item.name} (${priceInfo.text})
            </label>
        `;
    }).join('');
    
    _ctvRenderPrintPanel();
    _ctvUpdatePrintTypeDropdown();
    _ctvUpdateCalculations();
}

function _ctvToggleSurcharge(key, checked) {
    _ctvState.surcharges[key] = !!checked;
    _ctvUpdateCalculations();
}

function _ctvTogglePetChestPrint(checked) {
    _ctvState.petChestPrint = !!checked;
    _ctvUpdateCalculations();
}

function _ctvGetOrderedOptionalSurcharges(config) {
    if (!config) return [];
    const allItems = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: config.surcharges.collar || 0, customer_value: config.surcharges.collar_customer || 0, inactive: config.surcharges.collar_inactive || false, ctv_inactive: config.surcharges.collar_ctv_inactive || false, customer_inactive: config.surcharges.collar_customer_inactive || false },
        primary_school: { key: 'primary_school', name: 'Tiểu học', value: config.surcharges.primary_school || 0, customer_value: config.surcharges.primary_school_customer || 0, inactive: config.surcharges.primary_school_inactive || false, ctv_inactive: config.surcharges.primary_school_ctv_inactive || false, customer_inactive: config.surcharges.primary_school_customer_inactive || false },
        raglan: { key: 'raglan', name: 'Raglan', value: config.surcharges.raglan || 0, customer_value: config.surcharges.raglan_customer || 0, inactive: config.surcharges.raglan_inactive || false, ctv_inactive: config.surcharges.raglan_ctv_inactive || false, customer_inactive: config.surcharges.raglan_customer_inactive || false },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: config.surcharges.color_block || 0, customer_value: config.surcharges.color_block_customer || 0, inactive: config.surcharges.color_block_inactive || false, ctv_inactive: config.surcharges.color_block_ctv_inactive || false, customer_inactive: config.surcharges.color_block_customer_inactive || false }
    };
    const customList = config.surcharges?.custom || [];
    customList.forEach(item => {
        const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
        allItems[customKey] = { key: customKey, name: item.name, value: item.value || 0, customer_value: item.customer_value || 0, is_custom: true, inactive: item.inactive || false, ctv_inactive: item.ctv_inactive || false, customer_inactive: item.customer_inactive || false };
    });
    let ordered = [];
    if (config.surcharges?.display_order && Array.isArray(config.surcharges.display_order)) {
        config.surcharges.display_order.forEach(o => {
            let found = null;
            if (o.key && allItems[o.key]) {
                found = allItems[o.key];
                found.name = o.name || found.name; // Keep edited name
                found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                delete allItems[o.key];
            } else {
                const matchedKey = Object.keys(allItems).find(k => allItems[k].name === o.name || allItems[k].key === o.name);
                if (matchedKey) {
                    found = allItems[matchedKey];
                    found.name = o.name || found.name; // Keep edited name
                    found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                    found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                    found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                    delete allItems[matchedKey];
                }
            }
            if (found && found.key !== 'qty_under_20') {
                ordered.push(found);
            }
        });
    } else {
        Object.keys(allItems).forEach(k => {
            if (allItems[k].key !== 'qty_under_20') {
                ordered.push(allItems[k]);
            }
        });
    }
    return ordered.filter(item => !item.name.toLowerCase().includes('in 3d'));
}

function _ctvGetOrderedSurchargesList(surchargesObj) {
    if (!surchargesObj) return [];
    const defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: surchargesObj.collar || 0, customer_value: surchargesObj.collar_customer || 0, is_default: true },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: surchargesObj.qty_under_20 || 0, customer_value: surchargesObj.qty_under_20_customer || 0, is_default: true, is_auto: true },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: surchargesObj.primary_school || 0, customer_value: surchargesObj.primary_school_customer || 0, is_default: true },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: surchargesObj.raglan || 0, customer_value: surchargesObj.raglan_customer || 0, is_default: true },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: surchargesObj.color_block || 0, customer_value: surchargesObj.color_block_customer || 0, is_default: true }
    };
    const customList = surchargesObj.custom || [];
    const customs = {};
    customList.forEach(c => {
        const customKey = 'custom_' + c.name.replace(/\s+/g, '_');
        customs[customKey] = { key: customKey, name: c.name, value: c.value || 0, customer_value: c.customer_value || 0, is_default: false };
    });
    
    let ordered = [];
    if (surchargesObj.display_order && Array.isArray(surchargesObj.display_order)) {
        surchargesObj.display_order.forEach(o => {
            let found = null;
            if (defaults[o.key]) {
                found = defaults[o.key];
                found.name = o.name; // Keep edited name
                delete defaults[o.key];
            } else if (customs[o.key]) {
                found = customs[o.key];
                found.name = o.name; // Keep edited name
                delete customs[o.key];
            } else {
                const dk = Object.keys(defaults).find(k => defaults[k].name === o.name);
                if (dk) {
                    found = defaults[dk];
                    delete defaults[dk];
                } else {
                    const ck = Object.keys(customs).find(k => customs[k].name === o.name);
                    if (ck) {
                        found = customs[ck];
                        delete customs[ck];
                    }
                }
            }
            if (found) {
                ordered.push(found);
            }
        });
    } else {
        ordered = Object.values(defaults);
        Object.values(customs).forEach(c => ordered.push(c));
    }
    return ordered;
}

function _ctvOnPrintTypeChange(val) {
    _ctvState.printType = val;
    _ctvState.showPetInputForm = false;
    _ctvRenderPrintPanel();
    _ctvUpdateCalculations();
    _ctvUpdatePrintTypeDropdown();
}

function _ctvUpdatePrintTypeDropdown() {
    const selectEl = document.getElementById('ctv_print_type');
    if (!selectEl) return;
    const savedTypes = (_ctvState.savedPrints || []).map(p => p.type);
    const config = _ctvState.activeConfig || {};
    const pr = config.print_prices || {};
    
    Array.from(selectEl.options).forEach(opt => {
        if (opt.value === 'none') {
            opt.disabled = false;
            opt.style.display = 'block';
            return;
        }
        
        let isInactive = false;
        if (opt.value === 'pet' && pr.pet?.inactive) isInactive = true;
        if (opt.value === 'screen' && pr.screen?.inactive) isInactive = true;
        
        if (isInactive || (savedTypes.includes(opt.value) && opt.value !== _ctvState.printType)) {
            opt.disabled = true;
            opt.style.display = 'none';
        } else {
            opt.disabled = false;
            opt.style.display = 'block';
        }
    });
}

function _ctvRenderPrintPanel() {
    const panel = document.getElementById('ctv_print_panel');
    if (!panel) return;
    
    const config = _ctvState.activeConfig || {};
    const pr = config.print_prices || {};
    if (_ctvState.printType === 'pet' && pr.pet?.inactive) {
        _ctvState.printType = 'none';
        const selectEl = document.getElementById('ctv_print_type');
        if (selectEl) selectEl.value = 'none';
    }
    if (_ctvState.printType === 'screen' && pr.screen?.inactive) {
        _ctvState.printType = 'none';
        const selectEl = document.getElementById('ctv_print_type');
        if (selectEl) selectEl.value = 'none';
    }
    
    if (_ctvState.printType === 'none') {
        panel.innerHTML = '';
        _ctvUpdatePrintTypeDropdown();
        return;
    }
    
    if (_ctvState.printType === 'pet') {
        const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
        const isCust = _ctvState.targetType === 'customer';
        const sheetPrice = isCust
            ? (petConfig.sheet_price_customer !== undefined ? Number(petConfig.sheet_price_customer) : Number(petConfig.sheet_price) || 60000)
            : (Number(petConfig.sheet_price) || 60000);
        const chestPrice = isCust
            ? (petConfig.chest_price_customer !== undefined ? Number(petConfig.chest_price_customer) : (petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000))
            : (petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000);
        panel.innerHTML = `
            <div class="ctv-print-config-box">
                <h4>🧬 In PET Báo Giá ${isCust ? 'Khách Hàng' : 'CTV'}</h4>
                <div style="font-size:12px; color:#0d9488; margin-bottom:12px;">
                    Biểu phí cấu hình: <strong>${sheetPrice.toLocaleString('vi-VN')} đ/khổ mét (58x100cm)</strong>. Khoảng cách an toàn hình in: <strong>${petConfig.spacing} cm</strong>.
                </div>
                
                <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:10px; padding:12px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:700; color:#0369a1; cursor:pointer; margin:0; width: 100%;">
                        <input type="checkbox" id="ctv_pet_chest_print" ${_ctvState.petChestPrint ? 'checked' : ''} onchange="_ctvTogglePetChestPrint(this.checked)" style="transform:scale(1.2); margin-right: 4px;">
                        🎯 In PET Ngực (Cố định +${chestPrice.toLocaleString('vi-VN')} đ/áo)
                    </label>
                </div>
                
                ${_ctvState.showPetInputForm ? `
                <div class="ctv-pet-shape-form" style="margin-bottom:12px;">
                    <div>
                        <label style="font-size:11px; font-weight:700; color:#0f766e;">Tên hình in</label>
                        <input type="text" class="ctv-input" id="ctv_pet_name" placeholder="Ví dụ: Lưng, Ngực..." oninput="_ctvUpdateCalculations()">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:700; color:#0f766e;">Rộng (cm)</label>
                        <input type="number" class="ctv-input" id="ctv_pet_w" step="0.1" value="10" oninput="_ctvUpdateCalculations()">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:700; color:#0f766e;">Cao (cm)</label>
                        <input type="number" class="ctv-input" id="ctv_pet_h" step="0.1" value="10" oninput="_ctvUpdateCalculations()">
                    </div>
                    <button type="button" class="ctv-btn-secondary btn-add-pet-shape" style="padding: 10px 14px;" onclick="_ctvAddPetShape()">Thêm</button>
                </div>
                ` : `
                <div style="margin-bottom: 12px;">
                    <button type="button" class="ctv-btn-secondary btn-add-pet-shape" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px;" onclick="_ctvShowPetInput(true)">
                        ➕ Thêm hình in PET
                    </button>
                </div>
                `}
                
                <div id="ctv_pet_shapes_list"></div>
                <div style="margin-top: 14px; border-top: 1px dashed #5eead4; padding-top: 10px;">
                    <button type="button" class="ctv-btn-primary btn-print-pet" style="width:100%;" onclick="_ctvSaveActivePrint()">
                        💾 Lưu phương án In PET
                    </button>
                </div>
            </div>
        `;
        _ctvRenderPetShapesList();
    } else if (_ctvState.printType === 'print3d') {
        const qty = _ctvState.quantity || 0;
        if (_ctvState.print3dCost != 30000 && _ctvState.print3dCost != 25000) {
            _ctvState.print3dCost = 30000;
        }
        let html = '';
        if (qty <= 0) {
            html = `
                <div class="ctv-print-config-box" style="border-color:#38bdf8; background:#f0f9ff; color:#0369a1;">
                    <h4 style="color:#0284c7;">🌀 Phương Án In 3D</h4>
                    <div style="font-size:12.5px; line-height:1.5; margin-bottom:10px;">
                        Số lượng áo đặt hàng chưa được điền. Vui lòng chọn phân khúc In 3D hoặc nhập số lượng áo ở trên.
                    </div>
                    <div class="ctv-form-group" style="margin-bottom:12px;">
                        <label style="color:#0284c7;">Chọn mốc In 3D</label>
                        <select class="ctv-select" id="ctv_3d_cost_select" onchange="_ctvOn3dCostSelectChange(this.value)">
                            <option value="30000" ${_ctvState.print3dCost == 30000 ? 'selected' : ''}>In 3D dưới 20 Áo (+30.000đ)</option>
                            <option value="25000" ${_ctvState.print3dCost == 25000 ? 'selected' : ''}>In 3D trên 20 Áo (+25.000đ)</option>
                        </select>
                    </div>
                    <div style="margin-top: 14px; border-top: 1px dashed #7dd3fc; padding-top: 10px;">
                        <button type="button" class="ctv-btn-primary btn-print-3d" style="width:100%;" onclick="_ctvSaveActivePrint()">
                            💾 Lưu phương án In 3D
                        </button>
                    </div>
                </div>
            `;
        } else {
            const autoCost = qty < 20 ? 30000 : 25000;
            _ctvState.print3dCost = autoCost;
            html = `
                <div class="ctv-print-config-box" style="border-color:#38bdf8; background:#f0f9ff; color:#0369a1;">
                    <h4 style="color:#0284c7;">🌀 Phương Án In 3D (Tự động)</h4>
                    <div style="font-size:12.5px; line-height:1.5; margin-bottom:10px;">
                        Số lượng: <strong>${qty} áo</strong>. Mốc áp dụng: <strong>${qty < 20 ? 'Dưới 20 áo' : 'Trên 20 áo'}</strong>.
                    </div>
                    <div class="ctv-form-group" style="margin-bottom:12px;">
                        <label style="color:#0284c7;">Đơn giá In 3D (Tự động khóa)</label>
                        <select class="ctv-select" disabled style="background:#e2e8f0; cursor:not-allowed;">
                            <option selected>${qty < 20 ? 'In 3D dưới 20 Áo (+30.000đ)' : 'In 3D trên 20 Áo (+25.000đ)'}</option>
                        </select>
                    </div>
                    <div style="margin-top: 14px; border-top: 1px dashed #7dd3fc; padding-top: 10px;">
                        <button type="button" class="ctv-btn-primary btn-print-3d" style="width:100%;" onclick="_ctvSaveActivePrint()">
                            💾 Lưu phương án In 3D
                        </button>
                    </div>
                </div>
            `;
        }
        panel.innerHTML = html;
    } else if (_ctvState.printType === 'screen') {
        const screenConfig = config.print_prices.screen || { qty_threshold: 20 };
        panel.innerHTML = `
            <div class="ctv-print-config-box" style="border-color:#a855f7; background:#faf5ff; color:#6b21a8;">
                <h4 style="color:#7e22ce;">🎨 In Lưới (Screen Print) CTV</h4>
                <div style="font-size:12px; margin-bottom:12px;">
                    Mức tối thiểu đơn hàng: <strong>${screenConfig.qty_threshold} áo</strong>. Bảng giá in lưới được cấu hình riêng theo số lượng & màu sắc.
                </div>
                <div class="ctv-form-group" style="margin-bottom:12px;">
                    <label style="color:#7e22ce;">Số màu in lưới</label>
                    <input type="number" class="ctv-input" id="ctv_screen_colors" min="1" value="${_ctvState.screenColors}" oninput="_ctvOnScreenColorsChange(this.value)">
                </div>
                <div style="margin-top: 14px; border-top: 1px dashed #c084fc; padding-top: 10px;">
                    <button type="button" class="ctv-btn-primary btn-print-screen" style="width:100%;" onclick="_ctvSaveActivePrint()">
                        💾 Lưu phương án In Lưới
                    </button>
                </div>
            </div>
        `;
    } else if (_ctvState.printType === 'embroidery') {
        panel.innerHTML = `
            <div class="ctv-print-config-box" style="border-color:#f59e0b; background:#fffbeb; color:#92400e;">
                <h4 style="color:#b45309;">🧵 Thêu Vi Tính</h4>
                <div class="ctv-form-group" style="margin-bottom:12px;">
                    <label style="color:#b45309;">Giá thêu trên mỗi áo (đ/áo)</label>
                    <input type="text" class="ctv-input" id="ctv_emb_cost" value="${_ctvState.embroideryCost}" oninput="_ctvOnEmbCostChange(this.value)">
                </div>
                <div style="margin-top: 14px; border-top: 1px dashed #fde047; padding-top: 10px;">
                    <button type="button" class="ctv-btn-primary btn-print-emb" style="width:100%;" onclick="_ctvSaveActivePrint()">
                        💾 Lưu phương án Thêu
                    </button>
                </div>
            </div>
        `;
    }
    _ctvUpdatePrintTypeDropdown();
}

function _ctvSaveActivePrint() {
    if (_ctvState.printType === 'none') return;
    
    if (_ctvState.printType === 'pet') {
        if (_ctvState.showPetInputForm) {
            const nameEl = document.getElementById('ctv_pet_name');
            const wEl = document.getElementById('ctv_pet_w');
            const hEl = document.getElementById('ctv_pet_h');
            
            const nameVal = nameEl ? nameEl.value.trim() : '';
            const wVal = wEl ? wEl.value.trim() : '';
            const hVal = hEl ? hEl.value.trim() : '';
            
            if (!nameVal) {
                alert('Vui lòng điền tên hình in PET.');
                return;
            }
            if (!wVal || !hVal || parseFloat(wVal) <= 0 || parseFloat(hVal) <= 0) {
                alert('Vui lòng điền đầy đủ kích thước hình in PET.');
                return;
            }
            
            // Auto-add the shape if valid
            _ctvState.petShapes.push({
                name: nameVal,
                width: parseFloat(wVal),
                height: parseFloat(hVal),
                qty_per_shirt: 1,
                mode: 'aligned'
            });
            _ctvState.showPetInputForm = false;
        }
        
        if (_ctvState.petShapes.length === 0 && !_ctvState.petChestPrint) {
            alert('Vui lòng thêm hình in PET hoặc chọn In PET Ngực.');
            return;
        }
    }
    
    const printItem = {
        id: 'print_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: _ctvState.printType,
        details: {
            petShapes: [..._ctvState.petShapes],
            petChestPrint: _ctvState.petChestPrint,
            print3dCost: _ctvState.print3dCost,
            screenColors: _ctvState.screenColors,
            embroideryCost: _ctvState.embroideryCost
        }
    };
    
    if (!_ctvState.savedPrints) {
        _ctvState.savedPrints = [];
    }
    _ctvState.savedPrints.push(printItem);
    
    _ctvState.printType = 'none';
    _ctvState.petShapes = [];
    _ctvState.petChestPrint = false;
    _ctvState.showPetInputForm = false;
    
    const selectEl = document.getElementById('ctv_print_type');
    if (selectEl) selectEl.value = 'none';
    
    _ctvRenderPrintPanel();
    _ctvRenderSavedPrintsList();
    _ctvUpdateCalculations();
}

function _ctvRenderSavedPrintsList() {
    const container = document.getElementById('ctv_saved_prints_container');
    if (!container) return;
    
    if (!_ctvState.savedPrints || _ctvState.savedPrints.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: 700; font-size: 12px; color: #475569; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                <span>📋 CÁC PHƯƠNG ÁN IN ĐÃ CHỌN (${_ctvState.savedPrints.length})</span>
                <span style="font-size: 10px; color: #94a3b8;">Click nút để sửa/xóa</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
    `;
    
    _ctvState.savedPrints.forEach((item, index) => {
        let typeName = '';
        let desc = '';
        if (item.type === 'pet') {
            typeName = '🧬 In PET';
            const shapeDescs = [];
            if (item.details.petChestPrint) shapeDescs.push('PET Ngực');
            (item.details.petShapes || []).forEach(s => {
                shapeDescs.push(`${s.width}x${s.height}cm (${s.qty_per_shirt} hình)`);
            });
            desc = shapeDescs.join(', ') || 'Chưa cấu hình chi tiết';
        } else if (item.type === 'print3d') {
            typeName = '🌀 In 3D';
            const cost = Number(item.details.print3dCost) || 0;
            desc = `Mốc giá: ${cost.toLocaleString('vi-VN')} đ/áo`;
        } else if (item.type === 'screen') {
            typeName = '🎨 In Lưới';
            desc = `${item.details.screenColors || 1} màu`;
        } else if (item.type === 'embroidery') {
            typeName = '🧵 Thêu';
            const embInfo = _ctvGetEmbPriceInfo(item.details.embroideryCost);
            desc = `Giá: ${embInfo.text}`;
        }
        
        html += `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; gap: 8px;">
                <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                    <div style="font-weight: 700; color: #1e293b;">${typeName}</div>
                    <div style="color: #64748b; font-size: 11px;">${desc}</div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button type="button" class="ctv-btn-secondary" style="padding: 4px 8px; font-size: 11px; background: #f1f5f9; border-color: #cbd5e1;" onclick="_ctvEditSavedPrint('${item.id}')">✏️ Sửa</button>
                    <button type="button" class="ctv-btn-secondary" style="padding: 4px 8px; font-size: 11px; background: #fee2e2; border-color: #fca5a5; color: #991b1b;" onclick="_ctvDeleteSavedPrint('${item.id}')">🗑️ Xóa</button>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function _ctvEditSavedPrint(id) {
    const idx = _ctvState.savedPrints.findIndex(p => p.id === id);
    if (idx === -1) return;
    const item = _ctvState.savedPrints[idx];
    
    _ctvState.printType = item.type;
    _ctvState.petShapes = [...(item.details.petShapes || [])];
    _ctvState.petChestPrint = item.details.petChestPrint || false;
    _ctvState.print3dCost = item.details.print3dCost || 30000;
    _ctvState.screenColors = item.details.screenColors || 1;
    _ctvState.embroideryCost = item.details.embroideryCost || 15000;
    
    _ctvState.savedPrints.splice(idx, 1);
    
    const selectEl = document.getElementById('ctv_print_type');
    if (selectEl) selectEl.value = item.type;
    
    _ctvRenderPrintPanel();
    _ctvRenderSavedPrintsList();
    _ctvUpdateCalculations();
}

function _ctvDeleteSavedPrint(id) {
    _ctvState.savedPrints = _ctvState.savedPrints.filter(p => p.id !== id);
    _ctvRenderSavedPrintsList();
    _ctvUpdateCalculations();
    _ctvUpdatePrintTypeDropdown();
}

function _ctvOn3dCostSelectChange(val) {
    _ctvState.print3dCost = Number(val) || 0;
    _ctvUpdateCalculations();
}

function _ctvOnScreenColorsChange(val) {
    _ctvState.screenColors = Math.max(1, Number(val) || 1);
    _ctvUpdateCalculations();
}

function _ctvOnEmbCostChange(val) {
    _ctvState.embroideryCost = val.replace(/[^0-9]/g, '');
    _ctvUpdateCalculations();
}

function _ctvShowPetInput(show) {
    _ctvState.showPetInputForm = show;
    _ctvRenderPrintPanel();
    _ctvUpdateCalculations();
}

function _ctvAddPetShape() {
    const nameInput = document.getElementById('ctv_pet_name');
    const wInput = document.getElementById('ctv_pet_w');
    const hInput = document.getElementById('ctv_pet_h');
    
    if (!nameInput || !wInput || !hInput) return;
    
    const name = nameInput.value.trim();
    const w = parseFloat(wInput.value) || 0;
    const h = parseFloat(hInput.value) || 0;
    const qty = 1;
    
    if (!name) {
        showToast('Vui lòng nhập tên hình in', 'error');
        return;
    }
    if (w <= 0 || h <= 0) {
        showToast('Vui lòng nhập kích thước hình in hợp lệ', 'error');
        return;
    }
    
    _ctvState.petShapes.push({
        name: name,
        width: w,
        height: h,
        qty_per_shirt: qty,
        mode: 'aligned' // Mode xếp thẳng hàng mặc định
    });
    
    _ctvState.showPetInputForm = false;
    _ctvRenderPetShapesList();
    _ctvUpdateCalculations();
    _ctvRenderPrintPanel();
}

function _ctvRemovePetShape(idx) {
    _ctvState.petShapes.splice(idx, 1);
    _ctvRenderPetShapesList();
    _ctvUpdateCalculations();
}

function _ctvRenderPetShapesList() {
    const listContainer = document.getElementById('ctv_pet_shapes_list');
    if (!listContainer) return;
    
    if (_ctvState.petShapes.length === 0) {
        listContainer.innerHTML = `<div style="font-size:12px; color:#64748b; font-style:italic; margin-top:8px; text-align:center;">Chưa thêm hình in PET nào</div>`;
        return;
    }
    
    listContainer.innerHTML = `
        <table class="ctv-shapes-table">
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Tên hình in</th>
                    <th>Kích thước</th>
                    <th>Xóa</th>
                </tr>
            </thead>
            <tbody>
                ${_ctvState.petShapes.map((s, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${s.name || 'Hình ' + (idx + 1)}</td>
                        <td>${s.width} x ${s.height} cm</td>
                        <td>
                            <button type="button" class="ctv-remove-btn" onclick="_ctvRemovePetShape(${idx})">×</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function _ctvUpdateShapeMode(idx, val) {
    if (_ctvState.petShapes[idx]) {
        _ctvState.petShapes[idx].mode = val;
        _ctvUpdateCalculations();
    }
}

// 2D PET calculation wrapper helper
function _ctvCalcPetPlacement(W_sheet, H_sheet, w, h, s) {
    if (w <= 0 || h <= 0 || W_sheet <= 0 || H_sheet <= 0) return { aligned: 0, optimized: 0 };
    s = Number(s) || 0;
    
    const nw_horiz = Math.floor((W_sheet + s) / (w + s));
    const nh_horiz = Math.floor((H_sheet + s) / (h + s));
    const countHoriz = (nw_horiz > 0 && nh_horiz > 0) ? nw_horiz * nh_horiz : 0;
    
    const nw_vert = Math.floor((W_sheet + s) / (h + s));
    const nh_vert = Math.floor((H_sheet + s) / (w + s));
    const countVert = (nw_vert > 0 && nh_vert > 0) ? nw_vert * nh_vert : 0;
    
    const aligned = Math.max(countHoriz, countVert);
    let optimized = aligned;
    
    function checkHorizontalSplit(wA, hA, wB, hB) {
        const maxA = Math.floor((H_sheet + s) / (hA + s));
        for (let rA = 0; rA <= maxA; rA++) {
            const heightA = rA > 0 ? (rA * (hA + s) - s) : 0;
            const remainH = H_sheet - heightA - (rA > 0 ? s : 0);
            const rB = remainH >= hB ? Math.floor((remainH + s) / (hB + s)) : 0;
            const cA = Math.floor((W_sheet + s) / (wA + s));
            const cB = Math.floor((W_sheet + s) / (wB + s));
            const total = (rA * cA) + (rB * cB);
            if (total > optimized) optimized = total;
        }
    }
    
    function checkVerticalSplit(wA, hA, wB, hB) {
        const maxA = Math.floor((W_sheet + s) / (wA + s));
        for (let cA = 0; cA <= maxA; cA++) {
            const widthA = cA > 0 ? (cA * (wA + s) - s) : 0;
            const remainW = W_sheet - widthA - (cA > 0 ? s : 0);
            const cB = remainW >= wB ? Math.floor((remainW + s) / (wB + s)) : 0;
            const rA = Math.floor((H_sheet + s) / (hA + s));
            const rB = Math.floor((H_sheet + s) / (hB + s));
            const total = (cA * rA) + (cB * rB);
            if (total > optimized) optimized = total;
        }
    }
    
    checkHorizontalSplit(w, h, h, w);
    checkHorizontalSplit(h, w, w, h);
    checkVerticalSplit(w, h, h, w);
    checkVerticalSplit(h, w, w, h);
    
    return { aligned, optimized };
}

function _ctvGetPriceInfo(val) {
    const cleanVal = String(val === undefined || val === null ? '' : val).trim();
    if (cleanVal === '') {
        return { isContact: false, value: 0, text: '0đ' };
    }
    const parsed = parseFloat(cleanVal.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed) && isFinite(parsed) && /^-?\d+(\.\d+)?$/.test(cleanVal.replace(/[,.đ]/g, ''))) {
        return { isContact: false, value: parsed, text: (parsed >= 0 ? '+' : '') + parsed.toLocaleString('vi-VN') + 'đ' };
    }
    return { isContact: true, value: 0, text: cleanVal };
}

function _ctvGetEmbPriceInfo(val) {
    const cleanVal = String(val || '').trim();
    const parsed = parseFloat(cleanVal.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed) && isFinite(parsed)) {
        return { isContact: false, value: parsed, text: parsed.toLocaleString('vi-VN') + 'đ/áo' };
    }
    return { isContact: true, value: 0, text: cleanVal || 'Liên hệ' };
}

function _ctvParseShippingLimit(val) {
    const str = String(val || '').toLowerCase();
    let num = parseInt(str.replace(/[^0-9]/g, '')) || 0;
    if (str.includes('triệu') || str.includes('tr') || str.includes('m') || (num > 0 && num < 1000 && !str.includes('áo') && !str.includes('pcs'))) {
        num = num * 1000000;
    }
    return num;
}

function _ctvFormatShippingRange(minStr, maxStr) {
    const min = _ctvParseShippingLimit(minStr);
    const max = _ctvParseShippingLimit(maxStr) || 999999999;
    
    const isMinMoney = (str => {
        const s = String(str || '').toLowerCase();
        if (s.includes('áo') || s.includes('cái') || s.includes('pcs')) return false;
        const num = parseInt(s.replace(/[^0-9]/g, '')) || 0;
        if (s.includes('triệu') || s.includes('tr') || s.includes('m') || s.includes('đ') || s.includes('k') || s.includes('vnd')) return true;
        if (num >= 10000) return true;
        return false;
    })(minStr);
    
    const isMaxMoney = (str => {
        const s = String(str || '').toLowerCase();
        if (s.includes('áo') || s.includes('cái') || s.includes('pcs') || s.includes('trở lên')) return false;
        const num = parseInt(s.replace(/[^0-9]/g, '')) || 0;
        if (s.includes('triệu') || s.includes('tr') || s.includes('m') || s.includes('đ') || s.includes('k') || s.includes('vnd')) return true;
        if (num >= 10000) return true;
        return false;
    })(maxStr);
    
    const isMoney = isMinMoney || isMaxMoney;
    
    if (!isMoney) {
        if (min === 0 && max === 19) {
            return 'Dưới 20 áo';
        } else if (max >= 99999) {
            return `Đơn từ ${min} áo trở lên`;
        } else {
            return `Từ ${min} - ${max} áo`;
        }
    }
    
    const formatMil = (num) => {
        if (num >= 1000000) {
            const mil = num / 1000000;
            return Number.isInteger(mil) ? `${mil} triệu` : `${mil.toFixed(1)} triệu`;
        }
        return num.toLocaleString('vi-VN') + 'đ';
    };
    
    if (min === 0) {
        const roundedMax = Math.round((max + 1) / 100000) * 100000;
        return `Đơn dưới ${formatMil(roundedMax)}`;
    } else if (max >= 999999999) {
        return `Đơn từ ${formatMil(min)} trở lên`;
    } else {
        return `Đơn từ ${formatMil(min)} - ${formatMil(max)}`;
    }
}

function _ctvShortenShippingDesc(desc) {
    if (!desc) return '';
    let val = desc.trim();
    const descLower = val.toLowerCase();
    if (descLower.includes('miễn phí vận chuyển thường j&t') || 
        descLower.includes('miễn phí vc thường j&t') || 
        descLower.includes('miễn phí j&t thường')) {
        return 'Miễn Phí VC Thường J&T';
    }
    if (descLower.includes('miễn phí vận chuyển thường j&t / viettel post') || 
        descLower.includes('miễn phí j&t/viettel thường') ||
        descLower.includes('miễn phí vc thường j&t/viettel')) {
        return 'Miễn Phí VC Thường J&T/Viettel';
    }
    return val;
}

function _ctvMatchShippingPolicy(shippingList, qty, grandTotal) {
    if (!shippingList || shippingList.length === 0) return null;
    
    const isMoneyBased = shippingList.some(s => {
        const max = _ctvParseShippingLimit(s.max_qty);
        return max >= 10000;
    });
    
    const valueToCompare = isMoneyBased ? grandTotal : qty;
    
    return shippingList.find(s => {
        const min = _ctvParseShippingLimit(s.min_qty);
        const max = _ctvParseShippingLimit(s.max_qty) || 999999999;
        return valueToCompare >= min && valueToCompare <= max;
    });
}

function _ctvCalculateAllCosts() {
    if (_ctvState.targetType === null || _ctvState.targetType === undefined) return null;
    const config = _ctvState.activeConfig;
    if (!config) return null;
    
    const qty = _ctvState.quantity;
    
    // 1. Phôi trơn base price
    const m = config.materials[_ctvState.selectedMaterialIndex];
    const basePrice = m ? Number(m.price) : 0;
    const materialName = m ? m.name : 'Unknown';
    
    // 2. Surcharges
    let surchargeTotal = 0;
    const surchargesBreakdown = [];
    
    // Auto surcharge for low quantity < 20
    if (qty > 0 && qty < 20 && !config.surcharges.qty_under_20_inactive) {
        const surchargeVal = _ctvState.targetType === 'customer'
            ? (config.surcharges.qty_under_20_customer !== undefined ? config.surcharges.qty_under_20_customer : config.surcharges.qty_under_20)
            : config.surcharges.qty_under_20;
        const priceInfo = _ctvGetPriceInfo(surchargeVal);
        surchargeTotal += priceInfo.value;
        surchargesBreakdown.push({
            label: 'Số lượng < 20 áo',
            price: priceInfo.value,
            text: priceInfo.text,
            isContact: priceInfo.isContact,
            contactText: priceInfo.text
        });
    }
    
    // Optional surcharges ordered
    const optionalSurcharges = _ctvGetOrderedOptionalSurcharges(config);
    optionalSurcharges.forEach(item => {
        if (_ctvState.surcharges[item.key]) {
            if (_ctvState.targetType === 'customer') {
                if (item.customer_inactive) return;
            } else {
                if (item.ctv_inactive) return;
            }
            const surchargeVal = _ctvState.targetType === 'customer'
                ? (item.customer_value !== undefined ? item.customer_value : item.value)
                : item.value;
            const priceInfo = _ctvGetPriceInfo(surchargeVal);
            surchargeTotal += priceInfo.value;
            surchargesBreakdown.push({
                label: item.name,
                price: priceInfo.value,
                text: priceInfo.text,
                isContact: priceInfo.isContact,
                contactText: priceInfo.text
            });
        }
    });
    
    // Always put 'Giá Tại Xưởng' at the very end of surcharges breakdown
    surchargesBreakdown.sort((a, b) => {
        const aHas = a.label.toLowerCase().includes('giá tại xưởng') || a.label.toLowerCase().includes('gia tai xuong');
        const bHas = b.label.toLowerCase().includes('giá tại xưởng') || b.label.toLowerCase().includes('gia tai xuong');
        if (aHas && !bHas) return 1;
        if (!aHas && bHas) return -1;
        return 0;
    });
    
    // 3. Printing costs
    let printCost = 0;
    const printBreakdown = [];

    // Helper to calculate cost for a single print configuration
    function calcSinglePrint(type, details) {
        let cost = 0;
        const breakdown = [];
        
        if (type === 'pet' && config.print_prices?.pet?.inactive) {
            return { cost: 0, breakdown: [] };
        }
        if (type === 'screen' && config.print_prices?.screen?.inactive) {
            return { cost: 0, breakdown: [] };
        }
        
        if (type === 'pet') {
            const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
            const isCust = _ctvState.targetType === 'customer';
            const sheetPrice = isCust
                ? (petConfig.sheet_price_customer !== undefined ? Number(petConfig.sheet_price_customer) : Number(petConfig.sheet_price) || 60000)
                : (Number(petConfig.sheet_price) || 60000);
            const spacing = Number(petConfig.spacing) || 0.4;
            const chestPrice = isCust
                ? (petConfig.chest_price_customer !== undefined ? Number(petConfig.chest_price_customer) : (petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000))
                : (petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000);
            const minPositionPrice = isCust
                ? (petConfig.min_position_price_customer !== undefined ? Number(petConfig.min_position_price_customer) : (petConfig.min_position_price !== undefined ? Number(petConfig.min_position_price) : 5000))
                : (petConfig.min_position_price !== undefined ? Number(petConfig.min_position_price) : 5000);
            
            if (details.petChestPrint) {
                cost += chestPrice;
                breakdown.push({ label: `In PET Ngực (cố định)`, price: chestPrice });
            }
            
            const shapes = [...(details.petShapes || [])];
            if (_ctvState.showPetInputForm && details.petShapes === _ctvState.petShapes) {
                const nameEl = document.getElementById('ctv_pet_name');
                const wEl = document.getElementById('ctv_pet_w');
                const hEl = document.getElementById('ctv_pet_h');
                
                const name = nameEl ? nameEl.value.trim() : '';
                const w = wEl ? parseFloat(wEl.value) : 10;
                const h = hEl ? parseFloat(hEl.value) : 10;
                const qty = 1;
                
                if (w > 0 && h > 0 && qty > 0) {
                    shapes.push({
                        name: name,
                        width: w,
                        height: h,
                        qty_per_shirt: qty,
                        mode: 'aligned',
                        isActiveInput: true
                    });
                }
            }
            
            shapes.forEach((s, idx) => {
                const packed = _ctvState.activeConfig ? _ctvCalcPetPlacement(58, 100, s.width, s.height, spacing) : { aligned: 0, optimized: 0 };
                const perSheetCount = s.mode === 'nested' ? packed.optimized : packed.aligned;
                
                if (perSheetCount > 0) {
                    const sheetFraction = s.qty_per_shirt / perSheetCount;
                    let costPerShirt = Math.round(sheetFraction * sheetPrice);
                    let labelText = `In PET ${s.name || `#${idx+1}`}: ${s.width}x${s.height}cm${s.isActiveInput ? ' (Dự tính)' : ''}`;
                    
                    if (costPerShirt < minPositionPrice) {
                        costPerShirt = minPositionPrice;
                    }
                    
                    costPerShirt = Math.ceil(costPerShirt / 1000) * 1000;
                    cost += costPerShirt;
                    breakdown.push({ label: labelText, price: costPerShirt });
                }
            });
        } else if (type === 'print3d') {
            let cost3d = Number(details.print3dCost) || 0;
            if (qty > 0) {
                cost3d = qty < 20 ? 30000 : 25000;
            }
            cost = cost3d;
            breakdown.push({ label: `In 3D toàn thân (${cost3d.toLocaleString('vi-VN')} đ/áo)`, price: cost3d });
        } else if (type === 'screen') {
            const configScreen = config.print_prices.screen || { qty_threshold: 20, price_low: 60000, price_high_1_3: 4000, price_high_4_plus: 3500 };
            const colors = details.screenColors || 1;
            const threshold = configScreen.qty_threshold || 20;
            let singleScreenPrice = 0;
            
            if (qty === 0) {
                singleScreenPrice = 0;
                breakdown.push({ label: `In lưới (${colors} màu, chưa nhập số lượng)`, price: 0 });
            } else if (qty < threshold) {
                const totalOrderCost = configScreen.price_low * colors;
                singleScreenPrice = Math.round(totalOrderCost / qty);
                breakdown.push({ label: `In lưới dưới hạn (${colors} màu, phân bổ đơn)`, price: singleScreenPrice });
            } else {
                if (colors <= 3) {
                    singleScreenPrice = configScreen.price_high_1_3 * colors;
                } else {
                    singleScreenPrice = configScreen.price_high_4_plus * colors;
                }
                breakdown.push({ label: `In lưới (${colors} màu, đơn giá/áo)`, price: singleScreenPrice });
            }
            cost = singleScreenPrice;
        } else if (type === 'embroidery') {
            const embInfo = _ctvGetEmbPriceInfo(details.embroideryCost);
            if (embInfo.isContact) {
                cost = 0;
                breakdown.push({ label: `Thêu vi tính: ${embInfo.text}`, price: 0, isContact: true, contactText: embInfo.text });
            } else {
                cost = embInfo.value;
                breakdown.push({ label: `Thêu vi tính đồng giá`, price: cost });
            }
        }
        return { cost, breakdown };
    }
    
    // 1. Calculate saved prints
    if (_ctvState.savedPrints && _ctvState.savedPrints.length > 0) {
        _ctvState.savedPrints.forEach((item, index) => {
            const res = calcSinglePrint(item.type, item.details);
            printCost += res.cost;
            const prefix = item.type === 'pet' ? 'PET: ' : item.type === 'print3d' ? '3D: ' : item.type === 'screen' ? 'Lưới: ' : 'Thêu: ';
            res.breakdown.forEach(b => {
                printBreakdown.push({
                    label: prefix + b.label,
                    price: b.price,
                    isContact: b.isContact,
                    contactText: b.contactText
                });
            });
        });
    }
    
    // 2. Calculate active editing print
    if (_ctvState.printType !== 'none') {
        const res = calcSinglePrint(_ctvState.printType, {
            petShapes: _ctvState.petShapes,
            petChestPrint: _ctvState.petChestPrint,
            print3dCost: _ctvState.print3dCost,
            screenColors: _ctvState.screenColors,
            embroideryCost: _ctvState.embroideryCost
        });
        printCost += res.cost;
        res.breakdown.forEach(b => {
            printBreakdown.push(b);
        });
    }
    
    let commissionAmount = 0;
    let commissionPercent = 0;
    if (m) {
        const custPrice = m.customer_price !== undefined ? Number(m.customer_price) : Math.round(basePrice * 1.15);
        if (_ctvState.includeCommission) {
            commissionAmount = custPrice - basePrice;
            commissionPercent = basePrice > 0 ? Math.round((commissionAmount / basePrice) * 100) : 15;
        }
    }
    
    const finalPricePerShirt = basePrice + surchargeTotal + printCost + commissionAmount;
    const grandTotal = finalPricePerShirt * qty;
    
    const isCust = _ctvState.targetType === 'customer';
    const shippingList = isCust
        ? (_ctvState.activeConfig?.print_prices?.shipping_customer || [
            { min_qty: "0", max_qty: "Trở lên", desc: "Miễn Phí VC Thường J&T", value: 50000 }
        ])
        : (_ctvState.activeConfig?.print_prices?.shipping || [
            { min_qty: "0", max_qty: "9.999.999", desc: "Không hỗ trợ vận chuyển (Nhận hàng tại xưởng)", value: 0 },
            { min_qty: "10.000.000", max_qty: "Trở lên", desc: "Miễn phí ship 1 chiều", value: 0 }
        ]);
    let matchedShipping = null;
    if (qty > 0) {
        const matched = _ctvMatchShippingPolicy(shippingList, qty, grandTotal);
        if (matched) {
            matchedShipping = { ...matched, desc: _ctvShortenShippingDesc(matched.desc) };
        }
    }
    
    return {
        materialName,
        basePrice,
        surchargesBreakdown,
        surchargeTotal,
        printBreakdown,
        printCost,
        commissionAmount,
        commissionPercent,
        finalPricePerShirt,
        grandTotal,
        matchedShipping
    };
}

function _ctvUpdateCalculations() {
    const card = document.getElementById('ctv_result_card');
    if (!card) return;
    
    const calc = _ctvCalculateAllCosts();
    if (!calc) {
        if (_ctvState.targetType === null || _ctvState.targetType === undefined) {
            card.innerHTML = `
                <div class="ctv-result-title">📊 Chi Tiết Giá Dự Kiến</div>
                <div style="text-align: center; padding: 40px 20px; color: #ef4444; font-weight: 700; border: 2px dashed #fca5a5; border-radius: 12px; background: #fef2f2; margin-top: 15px; font-size: 13px;">
                    ⚠️ Vui lòng chọn Đối tượng báo giá ở khung bên trái trước khi bắt đầu tính toán!
                </div>
            `;
        } else {
            card.innerHTML = `<div style="text-align:center; padding:20px; font-style:italic;">Không thể tính toán chi phí. Vui lòng kiểm tra cấu hình bảng giá.</div>`;
        }
        return;
    }
    
    const hasCustomerSelected = !!_ctvState.selectedCustomer;
    
    const contactTexts = [];
    calc.printBreakdown.forEach(p => {
        if (p.isContact) contactTexts.push(p.contactText);
    });
    calc.surchargesBreakdown.forEach(s => {
        if (s.isContact) contactTexts.push(s.contactText);
    });
    const hasContactPrice = contactTexts.length > 0;
    const contactNote = hasContactPrice ? ` + ${contactTexts.join(', ')}` : '';
    
    const finalPricePerShirtText = `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo${contactNote}`;
    
    const grandTotalText = `${calc.grandTotal.toLocaleString('vi-VN')} đ${contactNote}`;
        
    const wordsText = hasContactPrice
        ? `${docSoTienVietNam(calc.grandTotal)} (và ${contactTexts.join(', ')})`
        : docSoTienVietNam(calc.grandTotal);
    
    card.innerHTML = `
        <div class="ctv-result-title">📊 Chi Tiết Giá Dự Kiến</div>
        
        <div class="ctv-result-row">
            <span>Khách hàng:</span>
            <strong style="color:white;">${hasCustomerSelected ? _ctvState.selectedCustomer.customer_name : '<span style="color:#ef4444; font-weight:700;">Chưa chọn khách hàng</span>'}</strong>
        </div>
        <div class="ctv-result-row">
            <span>Số lượng đơn:</span>
            <strong style="color:white;">${_ctvState.quantity ? _ctvState.quantity + ' áo' : '<span style="color:#ef4444; font-weight:700;">Chưa nhập số lượng</span>'}</strong>
        </div>
        ${calc.matchedShipping ? `
        <div class="ctv-result-row">
            <span>Vận chuyển:</span>
            <strong style="color:#38bdf8;">${calc.matchedShipping.desc}</strong>
        </div>
        ` : ''}
        
        <div style="border-top:1px solid rgba(255,255,255,0.1); margin:12px 0; padding-top:12px;">
            <div class="ctv-result-row">
                <span>Phôi trơn: <strong>${calc.materialName}</strong></span>
                <span>${(_ctvState.targetType === 'customer' ? (calc.basePrice + calc.commissionAmount) : calc.basePrice).toLocaleString('vi-VN')} đ/áo</span>
            </div>
        </div>
        
        ${(_ctvState.targetType !== 'customer' && calc.commissionAmount > 0) ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.1); margin:8px 0; padding-top:8px;">
                <div class="ctv-result-row" style="color: #f97316; font-weight: bold;">
                    <span>Hoa hồng đại lý (+${calc.commissionPercent}%):</span>
                    <span>+${calc.commissionAmount.toLocaleString('vi-VN')} đ/áo</span>
                </div>
            </div>
        ` : ''}
        
        <!-- Surcharges breakdown -->
        ${calc.surchargesBreakdown.length > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.1); margin:8px 0; padding-top:8px;">
                <div style="font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Phụ phí thêm:</div>
                ${calc.surchargesBreakdown.map(s => {
                    if (s.isContact) {
                        return `
                            <div class="ctv-result-row" style="font-size:13px; margin-bottom:4px;">
                                <span style="padding-left:8px;">+ ${s.label} ${s.contactText}</span>
                                <span></span>
                            </div>
                        `;
                    }
                    return `
                        <div class="ctv-result-row" style="font-size:13px; margin-bottom:4px;">
                            <span style="padding-left:8px;">+ ${s.label}</span>
                            <span>${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
        
        <!-- Printing breakdown -->
        ${calc.printBreakdown.length > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.1); margin:8px 0; padding-top:8px;">
                <div style="font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Chi tiết in/thêu:</div>
                ${calc.printBreakdown.map(p => {
                    if (p.isContact) {
                        return `
                            <div class="ctv-result-row" style="font-size:13px; margin-bottom:4px;">
                                <span style="padding-left:8px;">+ ${p.label}</span>
                                <span></span>
                            </div>
                        `;
                    }
                    return `
                        <div class="ctv-result-row" style="font-size:13px; margin-bottom:4px;">
                            <span style="padding-left:8px;">+ ${p.label}</span>
                            <span>+${p.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
        
        <!-- Grand Totals -->
        <div class="ctv-result-row total">
            <span>Đơn giá / Áo:</span>
            <span style="color:#38bdf8;">${finalPricePerShirtText}</span>
        </div>
        <div style="font-size: 11.5px; color: #94a3b8; text-align: right; margin-top: -6px; margin-bottom: 6px; font-style: italic;">
            * Giá chưa bao gồm VAT
        </div>
        <div class="ctv-result-row" style="font-size: 16px; font-weight: 700; color: white; margin-top: 10px;">
            <span>Tổng cộng (${_ctvState.quantity} áo):</span>
            <span>${grandTotalText}</span>
        </div>
        
        <div class="ctv-words">
            Bằng chữ: <strong>${wordsText}</strong>
        </div>
        
        <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
            <button class="ctv-btn-action" style="margin-top:0;" onclick="_ctvSaveQuotation()" ${!hasCustomerSelected ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
                💾 Lưu Báo Giá Hệ Thống
            </button>
            <button class="ctv-btn-secondary" style="background:transparent; border-color:rgba(255,255,255,0.3); color:white; padding:12px; font-weight:700; font-size:14px;" onclick="_ctvOpenExportModal()">
                🖨️ Xuất File Báo Giá Đẹp
            </button>
        </div>
    `;
}

async function _ctvSaveQuotation() {
    if (!_ctvState.selectedCustomer) {
        showToast('Vui lòng chọn khách hàng trước khi lưu', 'error');
        return;
    }
    
    const calc = _ctvCalculateAllCosts();
    if (!calc) return;
    
    const body = {
        customer_id: _ctvState.selectedCustomer.id,
        config_version_id: _ctvState.activeConfig.id,
        input_details: {
            quantity: _ctvState.quantity,
            selectedMaterialIndex: _ctvState.selectedMaterialIndex,
            surcharges: _ctvState.surcharges,
            printType: _ctvState.printType,
            petShapes: _ctvState.petShapes,
            screenColors: _ctvState.screenColors,
            embroideryCost: _ctvState.embroideryCost,
            print3dCost: _ctvState.print3dCost,
            petChestPrint: _ctvState.petChestPrint,
            savedPrints: _ctvState.savedPrints || [],
            materialName: calc.materialName,
            targetType: _ctvState.targetType,
            includeCommission: _ctvState.includeCommission
        },
        calculated_price: calc.finalPricePerShirt,
        total_amount: calc.grandTotal
    };
    
    try {
        const res = await apiFetch('/api/ctv-quotations', {
            method: 'POST',
            body
        });
        if (res && res.success) {
            showToast('Đã lưu lịch sử báo giá thành công!', 'success');
            // Reset input values
            _ctvState.selectedCustomer = null;
            _ctvState.petShapes = [];
            _ctvState.savedPrints = [];
            _ctvState.targetType = null;
            _ctvState.includeCommission = false;
            
            const tabContent = document.getElementById('ctv-tab-content');
            if (tabContent && _ctvState.activeTab === 'calculator') {
                _ctvRenderCalculator(tabContent);
            } else {
                _ctvRenderSelectedCustomer();
                _ctvRenderPrintPanel();
                _ctvUpdateCalculations();
            }
            
            // Re-render history log
            if (_ctvState.activeTab === 'history') {
                _ctvLoadHistoryLogs();
            }
        } else {
            showToast(res.error || 'Lỗi lưu báo giá', 'error');
        }
    } catch (e) {
        showToast('Lỗi gửi request: ' + e.message, 'error');
    }
}

function _ctvGetCompanyInfo() {
    let info = null;
    try {
        info = JSON.parse(localStorage.getItem('ctv_company_info'));
    } catch(e) {}
    if (!info) {
        info = {
            name: "XƯỞNG MAY ĐỒNG PHỤC HV",
            address: "Xưởng may Đồng Phục HV, Hà Nội",
            phone: "0988.888.888",
            website: "dongphuchv.net",
            logo: ""
        };
    }
    return info;
}

function _ctvOpenCompanySettingsModal() {
    const info = _ctvGetCompanyInfo();
    
    let modal = document.getElementById('ctv_company_settings_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ctv_company_settings_modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); display:flex; justify-content:center; align-items:center; z-index:9999; font-family:\'Inter\', sans-serif;';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background:#fff; border-radius:16px; width:460px; max-width:95%; padding:28px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); position:relative; box-sizing:border-box;">
            <h3 style="margin:0 0 20px 0; color:#1e3a8a; font-size:18px; font-weight:800; display:flex; align-items:center; gap:8px;">🏢 Cấu Hình Thông Tin Công Ty</h3>
            
            <div style="display:flex; flex-direction:column; gap:16px; font-size:13px; color:#475569;">
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:6px; color:#334155;">Tên đơn vị / Xưởng may</label>
                    <input type="text" id="ctv_comp_name" value="${info.name}" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:6px; color:#334155;">Địa chỉ</label>
                    <input type="text" id="ctv_comp_address" value="${info.address}" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:6px; color:#334155;">Điện thoại</label>
                        <input type="text" id="ctv_comp_phone" value="${info.phone}" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:6px; color:#334155;">Website</label>
                        <input type="text" id="ctv_comp_website" value="${info.website}" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                    </div>
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:6px; color:#334155;">Logo thương hiệu (Hiển thị góc trái báo giá)</label>
                    <div style="display:flex; gap:16px; align-items:center; margin-top:8px;">
                        <div id="ctv_comp_logo_preview" style="width:90px; height:60px; border:2px dashed #e2e8f0; border-radius:10px; display:flex; justify-content:center; align-items:center; background:#f8fafc; overflow:hidden; padding:4px; box-sizing:border-box;">
                            ${info.logo ? `<img src="${info.logo}" style="max-width:100%; max-height:100%; object-fit:contain;" />` : '<span style="font-size:11px; color:#94a3b8; font-weight:550;">Chưa có logo</span>'}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <input type="file" id="ctv_comp_logo_file" accept="image/*" style="display:none;" onchange="_ctvHandleLogoUpload(this)">
                            <button type="button" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:6px 12px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer;" onclick="document.getElementById('ctv_comp_logo_file').click()">Tải ảnh lên</button>
                            ${info.logo ? `<button type="button" style="background:transparent; border:none; color:#ef4444; font-size:12px; font-weight:700; cursor:pointer; text-align:left; padding:2px 0;" onclick="_ctvRemoveLogo()">Xóa logo</button>` : ''}
                        </div>
                    </div>
                    <input type="hidden" id="ctv_comp_logo_base64" value="${info.logo || ''}">
                </div>
            </div>
            
            <div style="margin-top:28px; display:flex; justify-content:end; gap:10px; border-top:1px solid #f1f5f9; padding-top:16px;">
                <button type="button" style="background:#fff; border:1px solid #cbd5e1; color:#475569; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;" onclick="_ctvCloseCompanySettingsModal()">Hủy</button>
                <button type="button" style="background:#1e3a8a; border:none; color:#fff; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;" onclick="_ctvSaveCompanySettings()">Lưu cấu hình</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function _ctvCloseCompanySettingsModal() {
    const modal = document.getElementById('ctv_company_settings_modal');
    if (modal) modal.style.display = 'none';
}

function _ctvHandleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) {
        showToast('Ảnh quá dung lượng. Vui lòng chọn ảnh dưới 1MB!', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('ctv_comp_logo_base64').value = base64;
        const preview = document.getElementById('ctv_comp_logo_preview');
        preview.innerHTML = `<img src="${base64}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
        
        // Refresh buttons to show delete button if needed
        const fileDiv = input.parentElement;
        if (!fileDiv.querySelector('button[onclick*="Remove"]')) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.style.cssText = 'background:transparent; border:none; color:#ef4444; font-size:12px; font-weight:700; cursor:pointer; text-align:left; padding:2px 0;';
            delBtn.textContent = 'Xóa logo';
            delBtn.onclick = _ctvRemoveLogo;
            fileDiv.appendChild(delBtn);
        }
    };
    reader.readAsDataURL(file);
}

function _ctvRemoveLogo() {
    document.getElementById('ctv_comp_logo_base64').value = '';
    const preview = document.getElementById('ctv_comp_logo_preview');
    preview.innerHTML = '<span style="font-size:11px; color:#94a3b8; font-weight:550;">Chưa có logo</span>';
    
    const fileInput = document.getElementById('ctv_comp_logo_file');
    if (fileInput) fileInput.value = '';
    
    // Remove the delete button
    const fileDiv = document.querySelector('button[onclick*="Remove"]')?.parentElement;
    if (fileDiv) {
        const delBtn = fileDiv.querySelector('button[onclick*="Remove"]');
        if (delBtn) delBtn.remove();
    }
}

function _ctvSaveCompanySettings() {
    const name = document.getElementById('ctv_comp_name').value.trim();
    const address = document.getElementById('ctv_comp_address').value.trim();
    const phone = document.getElementById('ctv_comp_phone').value.trim();
    const website = document.getElementById('ctv_comp_website').value.trim();
    const logo = document.getElementById('ctv_comp_logo_base64').value;
    
    if (!name) {
        showToast('Vui lòng nhập tên công ty/đơn vị!', 'warning');
        return;
    }
    
    const info = { name, address, phone, website, logo };
    localStorage.setItem('ctv_company_info', JSON.stringify(info));
    
    showToast('Cấu hình thông tin công ty thành công!', 'success');
    _ctvCloseCompanySettingsModal();
    
    // If export modal is open, re-render it to show new changes
    const exportModal = document.getElementById('ctv_export_modal');
    if (exportModal && exportModal.style.display !== 'none') {
        _ctvOpenExportModal(_ctvState.exportMode);
    }
}

// Open beautiful printable export modal popup
function _ctvUpdateCreatorName(val) {
    _ctvState.creatorName = val;
    const printedEl = document.getElementById('ctv_printed_creator_name');
    if (printedEl) {
        printedEl.textContent = val;
    }
    const printedFeeEl = document.getElementById('ctv_price_list_printed_creator_name');
    if (printedFeeEl) {
        printedFeeEl.textContent = val;
    }
    const labelFeeEl = document.getElementById('ctv_price_list_creator_label');
    if (labelFeeEl) {
        labelFeeEl.textContent = val;
    }
    const inputExport = document.getElementById('ctv_export_creator_input');
    if (inputExport && inputExport.value !== val) {
        inputExport.value = val;
    }
    const inputPriceList = document.getElementById('ctv_price_list_creator_input');
    if (inputPriceList && inputPriceList.value !== val) {
        inputPriceList.value = val;
    }
}

function _ctvOpenExportModal(mode = null) {
    _ctvInjectUnifiedPrintStyles();
    const info = _ctvGetCompanyInfo();
    const userObj = window._currentUser || window.currentUser;
    const creatorName = _ctvState.creatorName || (userObj ? (userObj.full_name || userObj.username) : '');
    if (!_ctvState.creatorName && creatorName) {
        _ctvState.creatorName = creatorName;
    }
    if (!mode) {
        mode = _ctvState.targetType === 'customer' ? 'customer' : 'ctv';
    }
    _ctvState.exportMode = mode;
    const calc = _ctvCalculateAllCosts();
    if (!calc) return;
    
    const hasCustomer = !!_ctvState.selectedCustomer;
    const name = hasCustomer ? _ctvState.selectedCustomer.customer_name : 'Quý Khách Hàng';
    const phone = hasCustomer ? _ctvState.selectedCustomer.phone : 'Chưa có SĐT';
    const code = (mode === 'customer' ? 'BGKH-' : 'BGCTV-') + Math.floor(Math.random()*900000 + 100000);
    const dateStr = vnDateStr(vnNow());
    
    const contactTexts = [];
    calc.printBreakdown.forEach(p => {
        if (p.isContact) contactTexts.push(p.contactText);
    });
    calc.surchargesBreakdown.forEach(s => {
        if (s.isContact) contactTexts.push(s.contactText);
    });
    const hasContactPrice = contactTexts.length > 0;
    const contactNote = hasContactPrice ? ` + ${contactTexts.join(', ')}` : '';
    
    const finalPricePerShirtText = `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo${contactNote}`;
    const grandTotalText = `${calc.grandTotal.toLocaleString('vi-VN')} đ${contactNote}`;
    const wordsText = hasContactPrice
        ? `${docSoTienVietNam(calc.grandTotal)} (và ${contactTexts.join(', ')})`
        : docSoTienVietNam(calc.grandTotal);
    
    let modal = document.getElementById('ctv_export_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ctv_export_modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(15,23,42,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '16px';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background:white; border-radius:16px; max-width:800px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <!-- Modal Header -->
            <div class="no-print" style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:16px; font-weight:800; color:#1e293b;">🖨️ Xuất Bản Báo Giá</h3>
                
                <div style="display:flex; align-items:center; gap:16px; margin-left: 20px;">
                    <!-- Toggle Mode Button Group -->
                    <div style="display:flex; background:#f1f5f9; padding:3px; border-radius:10px; gap:4px; border:1px solid #cbd5e1;">
                        ${(!_ctvState.targetType || _ctvState.targetType === 'ctv') ? `
                            <button onclick="_ctvOpenExportModal('ctv')" style="background: ${mode === 'ctv' ? '#2563eb' : 'transparent'}; color: ${mode === 'ctv' ? 'white' : '#475569'}; border: none; padding: 6px 16px; border-radius: 8px; font-weight:700; font-size:12px; cursor:pointer; transition: all 0.2s;">👥 Bản in CTV</button>
                        ` : ''}
                        ${(!_ctvState.targetType || _ctvState.targetType === 'customer') ? `
                            <button onclick="_ctvOpenExportModal('customer')" style="background: ${mode === 'customer' ? '#f97316' : 'transparent'}; color: ${mode === 'customer' ? 'white' : '#475569'}; border: none; padding: 6px 16px; border-radius: 8px; font-weight:700; font-size:12px; cursor:pointer; transition: all 0.2s;">🛍️ Bản in Khách hàng</button>
                        ` : ''}
                    </div>
                    
                    <!-- Creator input -->
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:12px; font-weight:700; color:#475569; white-space:nowrap;">Người lập:</span>
                        <input type="text" id="ctv_export_creator_input" value="${creatorName}" placeholder="Tên người lập..." style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; width:150px; box-sizing:border-box; background-color:#f1f5f9; color:#64748b; cursor:not-allowed;" disabled />
                    </div>
                </div>
                
                <button onclick="_ctvCloseExportModal()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">×</button>
            </div>
            
            <!-- Printable Bill area -->
            <div style="padding:40px; overflow-y:auto; flex-grow:1; background:#f8fafc;" id="ctv_print_export_modal_content">
                <div style="font-family:'Inter', sans-serif; color:#1e293b; line-height:1.5; background:white; padding:30px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <!-- Company Info -->
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:30px; border-bottom:3px solid #1e3a8a; padding-bottom:20px;">
                        <div style="display:flex; gap:16px; align-items:center;">
                            ${info.logo ? `<img src="${info.logo}" style="max-height:65px; max-width:130px; object-fit:contain;" />` : ''}
                            <div>
                                <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:900; color:#1e3a8a; letter-spacing:-0.5px;">${info.name}</h1>
                                <p style="margin:0; font-size:12px; color:#475569;">📍 Địa chỉ: ${info.address}</p>
                                <p style="margin:2px 0 0 0; font-size:12px; color:#475569;">📞 Điện thoại: ${info.phone} | Website: ${info.website}</p>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <h2 style="margin:0 0 4px 0; font-size:14px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">${mode === 'customer' ? 'BẢNG BÁO GIÁ SẢN PHẨM' : 'BẢNG BÁO GIÁ ĐẠI LÝ / CTV'}</h2>
                            <p style="margin:0; font-size:11px; color:#64748b;">Mã số: <strong style="color:#0f172a;">${code}</strong></p>
                            <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Ngày lập: ${dateStr}</p>
                        </div>
                    </div>
                    
                    <!-- Customer details -->
                    <div style="background:#f8fafc; border-radius:10px; padding:16px; margin-bottom:24px; border:1px solid #e2e8f0; border-left:5px solid #1e3a8a; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                        <h3 style="margin:0 0 12px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
                            <span>👤</span> ${mode === 'customer' ? 'Kính gửi quý khách hàng' : 'Kính gửi đối tác đại lý / ctv'}
                        </h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 16px; font-size:13px;">
                            <div>• ${mode === 'customer' ? 'Tên Khách hàng' : 'Tên Đại lý/CTV'}: <strong style="color:#0f172a;">${name}</strong></div>
                            <div>• Số điện thoại: <strong style="color:#0f172a;">${phone}</strong></div>
                            <div>• Số lượng: <strong style="color:#0f172a;">${_ctvState.quantity} chiếc</strong></div>
                            <div>• Kiểu dáng may: <strong style="color:#0f172a;">Áo thun đồng phục cổ tròn</strong></div>
                            ${calc.matchedShipping ? `<div style="grid-column: span 2;">• Hỗ trợ vận chuyển: <strong style="color:#1e3a8a;">${calc.matchedShipping.desc}</strong></div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Price breakdown list -->
                    <h3 style="margin:0 0 12px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px;">Chi tiết đơn giá sản xuất</h3>
                    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:24px; border:1px solid #cbd5e1;">
                        <thead>
                            <tr style="background:#1e3a8a; color:white; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                                <th style="border:1px solid #cbd5e1; padding:10px 14px; text-align:left; color:white; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.5px;">Hạng mục sản xuất</th>
                                <th style="border:1px solid #cbd5e1; padding:10px 14px; text-align:right; width:160px; color:white; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.5px;">Đơn giá (đ/áo)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="background:white;">
                                <td style="border:1px solid #cbd5e1; padding:10px 14px; font-size:13px;">
                                    <strong style="color:#1e3a8a;">May phôi trơn:</strong> Vải ${calc.materialName}
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:10px 14px; text-align:right; font-weight:600; color:#0f172a; font-size:13px;">
                                    ${(mode === 'customer' ? (calc.basePrice + calc.commissionAmount) : calc.basePrice).toLocaleString('vi-VN')} đ
                                </td>
                            </tr>
                            ${(mode !== 'customer' && calc.commissionAmount > 0) ? `
                                <tr style="background:#fff7ed; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                                    <td style="border:1px solid #cbd5e1; padding:10px 14px; padding-left:24px; color:#c2410c; font-weight:500; font-size:12.5px; font-style:italic;">
                                        + Hoa hồng đại lý (+${calc.commissionPercent}%)
                                    </td>
                                    <td style="border:1px solid #cbd5e1; padding:10px 14px; text-align:right; color:#c2410c; font-weight:700; font-size:12.5px;">
                                        +${calc.commissionAmount.toLocaleString('vi-VN')} đ
                                    </td>
                                </tr>
                            ` : ''}
                            ${calc.surchargesBreakdown.map(s => `
                                <tr style="background:#f8fafc; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                                    <td style="border:1px solid #cbd5e1; padding:10px 14px; padding-left:24px; color:#475569; font-size:12.5px; font-style:italic;">
                                        + Phụ phí: ${s.label}
                                    </td>
                                    <td style="border:1px solid #cbd5e1; padding:10px 14px; text-align:right; color:#475569; font-size:12.5px;">
                                        ${s.isContact ? s.contactText : `${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ`}
                                    </td>
                                </tr>
                            `).join('')}
                            ${calc.printBreakdown.map(p => `
                                <tr style="background:#f0fdf4; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                                    <td style="border:1px solid #cbd5e1; padding:10px 14px; padding-left:24px; color:#15803d; font-size:12.5px; font-style:italic;">
                                        + Công nghệ in/thêu: ${p.label}
                                    </td>
                                    <td style="border:1px solid #cbd5e1; padding:10px 14px; text-align:right; color:#15803d; font-size:12.5px;">
                                        ${p.isContact ? p.contactText : `+${p.price.toLocaleString('vi-VN')} đ`}
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="background:#eff6ff; font-weight:800; font-size:13.5px; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                                <td style="border:1px solid #cbd5e1; padding:12px 14px; text-align:right; color:#1e3a8a; border-bottom: 3px double #1e3a8a;">
                                    CỘNG ĐƠN GIÁ TRÊN MỖI ÁO:
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:12px 14px; text-align:right; color:#1e3a8a; font-size:14px; font-weight:900; border-bottom: 3px double #1e3a8a;">
                                    ${finalPricePerShirtText}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Grand total and words -->
                    <div style="border:1px solid #cbd5e1; border-left:5px solid #1e3a8a; border-radius:10px; padding:18px 24px; background:#f8fafc; text-align:right; margin-bottom:30px; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
                        <div style="font-size:11.5px; color:#64748b; margin-bottom:4px; font-style:italic;">* Giá chưa bao gồm VAT</div>
                        <div style="font-size:13px; font-weight:700; color:#475569; margin-bottom:4px;">TỔNG TIỀN THANH TOÁN (${_ctvState.quantity} áo):</div>
                        <div style="font-size:26px; font-weight:950; color:#1e3a8a; letter-spacing:-0.5px;">${grandTotalText}</div>
                        <div style="font-size:13px; font-style:italic; color:#0369a1; margin-top:6px; border-top:1px dashed #cbd5e1; padding-top:6px; display:inline-block; min-width:250px;">
                            Bằng chữ: <strong style="color:#0f172a;">${wordsText}</strong>
                        </div>
                    </div>
                    
                    <!-- Footer signatures -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; text-align:center; font-size:13px; margin-top:40px;">
                        <div>
                            <p style="margin:0 0 6px 0; font-weight:700; color:#475569; text-transform:uppercase;">ĐẠI DIỆN KHÁCH HÀNG</p>
                            <p style="margin:0; color:#64748b; font-style:italic; font-size:11px;">(Ký và ghi rõ họ tên)</p>
                            <div style="height:70px;"></div>
                            <p style="margin:0; font-weight:800; color:#475569; font-size:14px; opacity:0;">(Ký tên)</p>
                        </div>
                        <div>
                            <p style="margin:0 0 6px 0; font-weight:700; color:#1e3a8a; text-transform:uppercase;">ĐẠI DIỆN ${info.name.toUpperCase()}</p>
                            <p style="margin:0; font-weight:800; color:#1e3a8a;">NGƯỜI LẬP BIỂU</p>
                            <div style="height:70px;"></div>
                            <p id="ctv_printed_creator_name" style="margin:0; font-weight:800; color:#1e3a8a; font-size:14px;">${creatorName}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modal actions -->
            <div class="no-print" style="padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; background:#f8fafc; border-bottom-left-radius:16px; border-bottom-right-radius:16px;">
                <button class="ctv-btn-secondary" onclick="_ctvCopyTextQuotation()">📋 Sao chép text nhanh</button>
                <button class="ctv-btn-secondary" style="background:#1e3a8a; color:white; border-color:#1e3a8a;" onclick="_ctvPrintQuotation('${mode}')">🖨️ In / Tải PDF</button>
                <button class="ctv-btn-secondary" onclick="_ctvCloseExportModal()">Đóng</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function _ctvCloseExportModal() {
    const modal = document.getElementById('ctv_export_modal');
    if (modal) modal.style.display = 'none';
}

function _ctvCopyTextQuotation() {
    const calc = _ctvCalculateAllCosts();
    if (!calc) return;
    
    const mode = _ctvState.exportMode || 'ctv';
    const hasCustomer = !!_ctvState.selectedCustomer;
    const name = hasCustomer ? _ctvState.selectedCustomer.customer_name : 'Quý Khách Hàng';
    const phone = hasCustomer ? _ctvState.selectedCustomer.phone : 'Chưa có SĐT';
    const dateStr = vnDateStr(vnNow());
    
    let text = mode === 'customer' ? `🤝 BÁO GIÁ SẢN PHẨM ĐỒNG PHỤC 🤝\n` : `🤝 BÁO GIÁ ĐẠI LÝ / CỘNG TÁC VIÊN 🤝\n`;
    text += `Ngày lập: ${dateStr}\n`;
    text += `----------------------------------------\n`;
    text += `• ${mode === 'customer' ? 'Tên Khách hàng' : 'Tên Khách hàng/Đại lý'}: ${name}\n`;
    text += `• Số điện thoại: ${phone}\n`;
    text += `• Kiểu dáng: Áo thun cổ tròn\n`;
    text += `• Chất liệu vải: ${calc.materialName}\n`;
    text += `• Số lượng đặt: ${_ctvState.quantity} áo\n`;
    text += `----------------------------------------\n`;
    
    const displayBasePrice = mode === 'customer' ? (calc.basePrice + calc.commissionAmount) : calc.basePrice;
    text += `• Đơn giá phôi trơn: ${displayBasePrice.toLocaleString('vi-VN')} đ/áo\n`;
    
    if (mode !== 'customer' && calc.commissionAmount > 0) {
        text += `  + Hoa hồng đại lý (+${calc.commissionPercent}%): +${calc.commissionAmount.toLocaleString('vi-VN')} đ/áo\n`;
    }
    
    calc.surchargesBreakdown.forEach(s => {
        text += `  + Phụ phí ${s.label}: ${s.isContact ? s.contactText : (s.price >= 0 ? '+' : '') + s.price.toLocaleString('vi-VN') + ' đ'}\n`;
    });
    
    calc.printBreakdown.forEach(p => {
        text += `  + In/thêu ${p.label}: ${p.isContact ? p.contactText : '+' + p.price.toLocaleString('vi-VN') + ' đ'}\n`;
    });
    
    const contactTextsCopy = [];
    calc.printBreakdown.forEach(p => {
        if (p.isContact) contactTextsCopy.push(p.contactText);
    });
    calc.surchargesBreakdown.forEach(s => {
        if (s.isContact) contactTextsCopy.push(s.contactText);
    });
    const hasContactPriceText = contactTextsCopy.length > 0;
    const contactNoteCopy = hasContactPriceText ? ` + ${contactTextsCopy.join(', ')}` : '';
    
    const finalPricePerShirtTextCopy = `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo${contactNoteCopy}`;
    const grandTotalTextCopy = `${calc.grandTotal.toLocaleString('vi-VN')} đ${contactNoteCopy}`;
    const wordsTextCopy = hasContactPriceText
        ? `${docSoTienVietNam(calc.grandTotal)} (và ${contactTextsCopy.join(', ')})`
        : docSoTienVietNam(calc.grandTotal);
        
    text += `----------------------------------------\n`;
    text += `💰 ĐƠN GIÁ CUỐI: ${finalPricePerShirtTextCopy}\n`;
    text += `* Giá chưa bao gồm VAT\n`;
    text += `💵 TỔNG CỘNG ĐƠN HÀNG: ${grandTotalTextCopy}\n`;
    text += `✍️ (Bằng chữ: ${wordsTextCopy})\n`;
    if (calc.matchedShipping) {
        text += `🚚 Vận chuyển: ${calc.matchedShipping.desc}\n`;
    }
    text += `----------------------------------------\n`;
    text += `Xin cảm ơn quý khách đã tin dùng sản phẩm của Đồng Phục HV!`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép nội dung báo giá dạng text thành công!', 'success');
    }).catch(err => {
        showToast('Không thể tự động copy: ' + err.message, 'error');
    });
}

// ==========================================
// TAB 2: HISTORICAL LOGS
// ==========================================

async function _ctvRenderHistory(container) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    container.innerHTML = `
        <div class="ctv-card">
            <div class="ctv-card-title">📜 Lịch Sử Tính Báo Giá</div>
            
            <div class="ctv-filter-bar">
                <input type="text" id="ctv_history_search" placeholder="Tìm tên, SĐT khách hàng..." style="flex-grow:1;" oninput="_ctvOnHistoryFilter()">
                <select id="ctv_history_month" onchange="_ctvOnHistoryFilter()">
                    <option value="">-- Tất cả tháng --</option>
                    ${Array.from({length: 12}, (_, i) => `
                        <option value="${i+1}" ${i+1 === currentMonth ? 'selected' : ''}>Tháng ${i+1}</option>
                    `).join('')}
                </select>
                <select id="ctv_history_year" onchange="_ctvOnHistoryFilter()">
                    <option value="">-- Tất cả năm --</option>
                    <option value="${currentYear}" selected>${currentYear}</option>
                    <option value="${currentYear-1}">${currentYear-1}</option>
                </select>
                <button class="ctv-btn-secondary" onclick="_ctvLoadHistoryLogs()">🔄 Tải lại</button>
            </div>
            
            <div id="ctv_history_table_container" style="overflow-x:auto;">
                <div style="text-align:center; padding:30px; color:#64748b;">Đang tải danh sách lịch sử...</div>
            </div>
        </div>
    `;
    
    await _ctvLoadHistoryLogs();
}

async function _ctvLoadHistoryLogs() {
    const searchVal = document.getElementById('ctv_history_search')?.value || '';
    const mVal = document.getElementById('ctv_history_month')?.value || '';
    const yVal = document.getElementById('ctv_history_year')?.value || '';
    
    let url = `/api/ctv-quotations?1=1`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (mVal) url += `&month=${mVal}`;
    if (yVal) url += `&year=${yVal}`;
    
    try {
        const res = await apiFetch(url);
        const container = document.getElementById('ctv_history_table_container');
        if (!container) return;
        
        if (res && res.quotations) {
            _ctvState.historyLogs = res.quotations;
            _ctvRenderHistoryTable(container, res.quotations);
        } else {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Không thể tải dữ liệu lịch sử</div>`;
        }
    } catch (e) {
        console.error('Lỗi load lịch sử:', e);
    }
}

var _ctvDebounceTimeout = null;
function _ctvOnHistoryFilter() {
    clearTimeout(_ctvDebounceTimeout);
    _ctvDebounceTimeout = setTimeout(() => {
        _ctvLoadHistoryLogs();
    }, 400);
}

function _ctvRenderHistoryTable(container, list) {
    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b; font-style:italic;">
                Không tìm thấy bản ghi tính toán báo giá nào trong bộ lọc này.
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="ctv-table">
            <thead>
                <tr>
                    <th>Ngày tạo</th>
                    <th>Khách hàng</th>
                    <th>Chất liệu</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Tổng tiền</th>
                    <th>Người tạo</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(q => {
                    const dateStr = vnFormat(q.created_at, 'HH:mm DD/MM/YYYY');
                    const details = q.input_details || {};
                    return `
                        <tr>
                            <td><strong>${dateStr}</strong></td>
                            <td>
                                <strong>${q.customer_name || 'N/A'}</strong><br>
                                <span style="font-size:11.5px; color:#64748b;">${q.customer_phone || ''} (${q.customer_crm_type || ''})</span>
                            </td>
                            <td>${details.materialName || 'N/A'}</td>
                            <td>${details.quantity || 0} áo</td>
                            <td><strong>${Number(q.calculated_price).toLocaleString('vi-VN')} đ</strong></td>
                            <td style="color:#1e3a8a; font-weight:800;">${Number(q.total_amount).toLocaleString('vi-VN')} đ</td>
                            <td><span class="ctv-badge ctv-badge-inactive">${q.creator_name || 'N/A'}</span></td>
                            <td>
                                <button class="ctv-btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="_ctvShowHistoryDetail(${q.id})">Xem</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function _ctvShowHistoryDetail(quoteId) {
    const q = _ctvState.historyLogs.find(log => log.id === quoteId);
    if (!q) return;
    
    // Temporarily overwrite active config snapshot and run inputs to preview inside modal
    const tempState = {
        activeConfig: q.config_snapshot,
        selectedCustomer: {
            customer_name: q.customer_name,
            phone: q.customer_phone
        },
        quantity: q.input_details.quantity,
        selectedMaterialIndex: q.input_details.selectedMaterialIndex,
        surcharges: q.input_details.surcharges,
        printType: q.input_details.printType,
        petShapes: q.input_details.petShapes || [],
        screenColors: q.input_details.screenColors || 1,
        embroideryCost: q.input_details.embroideryCost || 15000,
        print3dCost: q.input_details.print3dCost || 30000,
        petChestPrint: q.input_details.petChestPrint || false,
        savedPrints: q.input_details.savedPrints || [],
        targetType: q.input_details.targetType || (q.input_details.includeCommission ? 'customer' : 'ctv'),
        includeCommission: q.input_details.includeCommission || false
    };
    
    // Save state temporarily, render export modal, then restore state
    const originalConfig = _ctvState.activeConfig;
    const originalCustomer = _ctvState.selectedCustomer;
    const originalQty = _ctvState.quantity;
    const originalMat = _ctvState.selectedMaterialIndex;
    const originalSc = _ctvState.surcharges;
    const originalPt = _ctvState.printType;
    const originalPet = _ctvState.petShapes;
    const originalScr = _ctvState.screenColors;
    const originalEmb = _ctvState.embroideryCost;
    const originalPrint3d = _ctvState.print3dCost;
    const originalPetChest = _ctvState.petChestPrint;
    const originalSavedPrints = _ctvState.savedPrints;
    const originalTargetType = _ctvState.targetType;
    const originalIncludeCommission = _ctvState.includeCommission;
    
    _ctvState.activeConfig = tempState.activeConfig;
    _ctvState.selectedCustomer = tempState.selectedCustomer;
    _ctvState.quantity = tempState.quantity;
    _ctvState.selectedMaterialIndex = tempState.selectedMaterialIndex;
    _ctvState.surcharges = tempState.surcharges;
    _ctvState.printType = tempState.printType;
    _ctvState.petShapes = tempState.petShapes;
    _ctvState.screenColors = tempState.screenColors;
    _ctvState.embroideryCost = tempState.embroideryCost;
    _ctvState.print3dCost = tempState.print3dCost;
    _ctvState.petChestPrint = tempState.petChestPrint;
    _ctvState.savedPrints = tempState.savedPrints;
    _ctvState.targetType = tempState.targetType;
    _ctvState.includeCommission = tempState.includeCommission;
    
    _ctvOpenExportModal(tempState.targetType);
    
    // Restore
    _ctvState.activeConfig = originalConfig;
    _ctvState.selectedCustomer = originalCustomer;
    _ctvState.quantity = originalQty;
    _ctvState.selectedMaterialIndex = originalMat;
    _ctvState.surcharges = originalSc;
    _ctvState.printType = originalPt;
    _ctvState.petShapes = originalPet;
    _ctvState.screenColors = originalScr;
    _ctvState.embroideryCost = originalEmb;
    _ctvState.print3dCost = originalPrint3d;
    _ctvState.petChestPrint = originalPetChest;
    _ctvState.savedPrints = originalSavedPrints;
    _ctvState.targetType = originalTargetType;
    _ctvState.includeCommission = originalIncludeCommission;
}

// ==========================================
// TAB 3: SETTINGS (ADMIN / DIRECTOR ONLY)
// ==========================================

async function _ctvRenderSettings(container) {
    container.innerHTML = `
        <div class="ctv-card">
            <div class="ctv-card-title">⚙️ Cài Đặt Bảng Giá CTV/HH</div>
            
            <div style="margin-bottom:24px; border-bottom:1px solid #e2e8f0; padding-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; color:#64748b;">
                    Thiết lập, chỉnh sửa các chất liệu, chi phí surcharge và in ấn cho hệ thống CTV. Mỗi lần lưu sẽ tạo 1 version lịch sử.
                </span>
                <button class="ctv-btn-secondary" style="background:#1e3a8a; color:white; border-color:#1e3a8a;" onclick="_ctvOpenNewConfigForm()">
                    ➕ Tạo Phiên Bản Bảng Giá Mới
                </button>
            </div>
            
            <div id="ctv_config_history_table_container" style="overflow-x:auto;">
                <div style="text-align:center; padding:30px; color:#64748b;">Đang tải danh sách lịch sử cấu hình bảng giá...</div>
            </div>
        </div>
    `;
    
    await _ctvLoadConfigVersionsList();
}

async function _ctvLoadConfigVersionsList() {
    try {
        const res = await apiFetch('/api/ctv-quotations/config/history');
        const container = document.getElementById('ctv_config_history_table_container');
        if (!container) return;
        
        if (res && res.history) {
            _ctvState.configVersions = res.history;
            
            if (res.history.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b; font-style:italic;">Chưa có phiên bản bảng giá nào được thiết lập.</div>`;
                return;
            }
            
            container.innerHTML = `
                <table class="ctv-table">
                    <thead>
                        <tr>
                            <th>Phiên bản</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Người tạo</th>
                            <th>Chất liệu phôi</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${res.history.map(c => {
                            const dateStr = vnFormat(c.created_at, 'HH:mm DD/MM/YYYY');
                            const mats = c.materials || [];
                            const isActive = c.status === 'active';
                            return `
                                <tr>
                                    <td><strong>${c.version_name}</strong></td>
                                    <td>
                                        <span class="ctv-badge ${isActive ? 'ctv-badge-active' : 'ctv-badge-inactive'}">
                                            ${isActive ? '🟢 ĐANG ÁP DỤNG' : '🔴 NHÁP / KHOA'}
                                        </span>
                                    </td>
                                    <td>${dateStr}</td>
                                    <td>${c.creator_name || 'Hệ thống'}</td>
                                    <td>
                                        <div style="font-size:12px; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                            ${mats.map(m => `${m.name}: ${Number(m.price).toLocaleString('vi-VN')}đ`).join(', ')}
                                        </div>
                                    </td>
                                    <td>
                                        <div style="display:flex; gap:6px;">
                                            <button class="ctv-btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="_ctvPreviewConfigDetails(${c.id})">Chi tiết</button>
                                            <button class="ctv-btn-secondary" style="padding:4px 8px; font-size:11px; background:#f59e0b; color:white; border-color:#f59e0b;" onclick="_ctvOpenNewConfigForm(${c.id})">✏️ Sửa</button>
                                            ${!isActive ? `
                                                <button class="ctv-btn-secondary" style="padding:4px 8px; font-size:11px; background:#22c55e; color:white; border-color:#22c55e;" onclick="_ctvApplyConfigVersion(${c.id})">⚡ Áp dụng</button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch(e) {
        console.error('Lỗi load config versions:', e);
    }
}

async function _ctvApplyConfigVersion(id) {
    if (!confirm('Bạn có chắc chắn muốn kích hoạt áp dụng phiên bản bảng giá này cho toàn bộ hệ thống tính toán CTV không?')) {
        return;
    }
    
    try {
        const res = await apiFetch(`/api/ctv-quotations/config/${id}/apply`, {
            method: 'POST'
        });
        if (res && res.success) {
            showToast('Kích hoạt bảng giá thành công!', 'success');
            // Reload active config & render UI
            await _ctvLoadActiveConfig();
            _ctvRenderPageLayout();
        } else {
            showToast(res.error || 'Lỗi áp dụng bảng giá', 'error');
        }
    } catch (e) {
        showToast('Lỗi gửi request: ' + e.message, 'error');
    }
}

function _ctvPreviewConfigDetails(id, mode = 'ctv') {
    const c = _ctvState.configVersions.find(v => v.id === id);
    if (!c) return;
    
    let modal = document.getElementById('ctv_config_preview_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ctv_config_preview_modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(15,23,42,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '16px';
        document.body.appendChild(modal);
    }
    
    const mats = c.materials || [];
    const sc = c.surcharges || {};
    const pr = c.print_prices || {};
    const commissionPercent = Number(pr.commission_percent !== undefined ? pr.commission_percent : 15);

    // Sort surcharge items by configured display order (only show items in display_order)
    let surchargeItems = [];
    const _defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: sc.collar || 0, customer_value: sc.collar_customer !== undefined ? sc.collar_customer : (sc.collar || 0), is_default: true, inactive: sc.collar_inactive || false, ctv_inactive: sc.collar_ctv_inactive || false, customer_inactive: sc.collar_customer_inactive || false },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: sc.qty_under_20 || 0, customer_value: sc.qty_under_20_customer !== undefined ? sc.qty_under_20_customer : (sc.qty_under_20 || 0), is_default: true, inactive: sc.qty_under_20_inactive || false, ctv_inactive: sc.qty_under_20_ctv_inactive || false, customer_inactive: sc.qty_under_20_customer_inactive || false },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: sc.primary_school || 0, customer_value: sc.primary_school_customer !== undefined ? sc.primary_school_customer : (sc.primary_school || 0), is_default: true, inactive: sc.primary_school_inactive || false, ctv_inactive: sc.primary_school_ctv_inactive || false, customer_inactive: sc.primary_school_customer_inactive || false },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: sc.raglan || 0, customer_value: sc.raglan_customer !== undefined ? sc.raglan_customer : (sc.raglan || 0), is_default: true, inactive: sc.raglan_inactive || false, ctv_inactive: sc.raglan_ctv_inactive || false, customer_inactive: sc.raglan_customer_inactive || false },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: sc.color_block || 0, customer_value: sc.color_block_customer !== undefined ? sc.color_block_customer : (sc.color_block || 0), is_default: true, inactive: sc.color_block_inactive || false, ctv_inactive: sc.color_block_ctv_inactive || false, customer_inactive: sc.color_block_customer_inactive || false }
    };
    const _customs = {};
    if (sc.custom && Array.isArray(sc.custom)) {
        sc.custom.forEach(item => {
            if (item && item.name) {
                const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
                _customs[customKey] = { key: customKey, name: item.name, value: item.value || 0, customer_value: item.customer_value !== undefined ? item.customer_value : (item.value || 0), is_default: false, inactive: item.inactive || false, ctv_inactive: item.ctv_inactive || false, customer_inactive: item.customer_inactive || false };
            }
        });
    }
    
    if (sc.display_order && Array.isArray(sc.display_order)) {
        sc.display_order.forEach(o => {
            if (!o) return;
            let found = null;
            const oKey = typeof o === 'string' ? o : o.key;
            const oName = typeof o === 'string' ? o : o.name;
            
            if (_defaults[oKey]) {
                found = _defaults[oKey];
                found.name = oName || found.name;
                found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                delete _defaults[oKey];
            } else if (_customs[oKey]) {
                found = _customs[oKey];
                found.name = oName || found.name;
                found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                delete _customs[oKey];
            } else {
                const dk = Object.keys(_defaults).find(k => _defaults[k].name === oName || _defaults[k].key === oName);
                if (dk) {
                    found = _defaults[dk];
                    found.name = oName || found.name;
                    found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                    found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                    found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                    delete _defaults[dk];
                } else {
                    const ck = Object.keys(_customs).find(k => _customs[k].name === oName || _customs[k].key === oName);
                    if (ck) {
                        found = _customs[ck];
                        found.name = oName || found.name;
                        found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                        found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                        found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                        delete _customs[ck];
                    }
                }
            }
            if (found) {
                surchargeItems.push(found);
            }
        });
    } else {
        surchargeItems = Object.values(_defaults);
        Object.values(_customs).forEach(c => surchargeItems.push(c));
    }

    modal.innerHTML = `
        <div style="background:white; border-radius:24px; max-width:720px; width:100%; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 25px 60px -15px rgba(15,23,42,0.3); border: 1px solid rgba(226, 232, 240, 0.8); overflow: hidden; font-family: 'Inter', sans-serif;">
            
            <div id="ctv_fee_print_content" style="display:flex; flex-direction:column; overflow-y:auto; flex-grow:1; background:#f8fafc;">
                <!-- Header section -->
                <div style="padding:20px 24px; background:linear-gradient(135deg, #1e293b, #0f172a); display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #3b82f6;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <div style="font-size:11px; font-weight:800; color:#3b82f6; text-transform:uppercase; letter-spacing:1.5px;">Bảng Chi Tiết Biểu Phí</div>
                        <h3 style="margin:0; font-size:18px; font-weight:900; color:white; display:flex; align-items:center; gap:8px;">
                            📋 ${c.version_name}
                        </h3>
                    </div>
                    
                    <!-- Mode Selector Group inside Header -->
                    <div class="no-print" style="display:flex; background:rgba(255,255,255,0.08); padding:3px; border-radius:10px; gap:4px; border:1px solid rgba(255,255,255,0.12); margin-left: 20px;">
                        <button onclick="_ctvPreviewConfigDetails(${c.id}, 'ctv')" style="background: ${mode === 'ctv' ? '#2563eb' : 'transparent'}; color: ${mode === 'ctv' ? 'white' : '#94a3b8'}; border: none; padding: 6px 14px; border-radius: 8px; font-weight:700; font-size:11px; cursor:pointer; transition: all 0.2s;">👥 Biểu phí CTV</button>
                        <button onclick="_ctvPreviewConfigDetails(${c.id}, 'customer')" style="background: ${mode === 'customer' ? '#f97316' : 'transparent'}; color: ${mode === 'customer' ? 'white' : '#94a3b8'}; border: none; padding: 6px 14px; border-radius: 8px; font-weight:700; font-size:11px; cursor:pointer; transition: all 0.2s;">🛍️ Biểu phí Khách hàng</button>
                    </div>
                    
                    <button class="no-print" onclick="document.getElementById('ctv_config_preview_modal').style.display='none'" style="background:rgba(255,255,255,0.1); border:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer; color:#cbd5e1; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'; this.style.color='#ef4444';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#cbd5e1';">×</button>
                </div>
                
                <!-- Brand watermark block -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: ${mode === 'customer' ? 'linear-gradient(135deg, #ea580c, #f97316)' : 'linear-gradient(135deg, #1e3b8a, #2563eb)'}; color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.15); border-bottom: 1px solid rgba(226, 232, 240, 0.1);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 900; font-size: 14px; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">⚡ ĐỒNG PHỤC HV</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 800; opacity: 0.95; letter-spacing: 0.5px; text-transform: uppercase;">
                        ${mode === 'customer' ? 'BẢNG GIÁ BÁN KHÁCH HÀNG TRỰC TIẾP' : 'HỆ THỐNG BIỂU PHÍ CTV & ĐẠI LÝ CHÍNH THỨC'}
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div style="padding:24px; font-size:13px; line-height:1.6; background:#f8fafc; display:flex; flex-direction:column; gap:20px;">
                    
                    <!-- Two Column Layout for Fabrics and Surcharges -->
                    <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 20px;">
                        
                        <!-- Column 1: Fabric Prices -->
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;">
                            <div style="font-weight: 800; color: #1e3a8a; font-size: 13.5px; border-bottom: 2.5px solid #3b82f6; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                                👕 ĐƠN GIÁ PHÔI TRƠN ${mode === 'customer' ? 'BÁN KHÁCH HÀNG' : '(CỔ TRÒN)'}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${mats.filter(m => !m.inactive).map(m => {
                                    const displayPrice = mode === 'customer' ? (m.customer_price !== undefined ? Number(m.customer_price) : Math.round(Number(m.price) * 1.15)) : Number(m.price);
                                    return `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9;">
                                            <span style="font-weight: 700; color: #334155; font-size:12.5px;">${m.name}</span>
                                            <span style="background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12px; border: 1px solid #dbeafe;">
                                                ${displayPrice.toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <!-- Column 2: Surcharges & Extra Details -->
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;">
                            <div style="font-weight: 800; color: #0d9488; font-size: 13.5px; border-bottom: 2.5px solid #0d9488; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                                ➕ BẢNG PHỤ PHÍ & CHI TIẾT THÊM
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${surchargeItems.filter(item => {
                                    if (item.inactive) return false;
                                    if (mode === 'customer') {
                                        if (item.customer_inactive) return false;
                                    } else {
                                        if (item.ctv_inactive) return false;
                                    }
                                    return true;
                                }).map(item => {
                                    const surchargeVal = mode === 'customer'
                                        ? (item.customer_value !== undefined ? item.customer_value : item.value)
                                        : item.value;
                                    const priceInfo = _ctvGetPriceInfo(surchargeVal);
                                    const isNegative = !priceInfo.isContact && priceInfo.value < 0;
                                    return `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9;">
                                            <span style="font-weight: 700; color: #334155; font-size:12.5px;">${item.name}</span>
                                            <span style="background: ${isNegative ? '#fef2f2' : '#f0fdf4'}; color: ${isNegative ? '#b91c1c' : '#15803d'}; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12px; border: 1px solid ${isNegative ? '#fee2e2' : '#dcfce7'};">
                                                ${priceInfo.text}
                                            </span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                    </div>
                    
                    <!-- Print config full width section -->
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 14px;">
                        <div style="font-weight: 800; color: #7c3aed; font-size: 13.5px; border-bottom: 2.5px solid #7c3aed; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                            🎨 CẤU HÌNH PHƯƠNG ÁN IN & VẬN CHUYỂN
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                            
                            <!-- PET Card -->
                            ${!pr.pet?.inactive ? `
                            <div style="background: #fdfcff; border: 1px solid #f3e8ff; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                                <div style="font-weight: 800; color: #6b21a8; font-size: 12px; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed #e9d5ff; padding-bottom: 6px; margin-bottom: 2px;">
                                    🧬 IN PET KHỔ MÉT
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span style="color:#64748b; font-weight:600;">Khổ mét (58x100cm):</span>
                                        <strong style="color:#0f172a; font-weight:750;">
                                            ${mode === 'customer' 
                                                ? `${Number(pr.pet?.sheet_price_customer !== undefined ? pr.pet.sheet_price_customer : pr.pet?.sheet_price).toLocaleString('vi-VN')}đ`
                                                : `${Number(pr.pet?.sheet_price).toLocaleString('vi-VN')}đ`
                                            }
                                        </strong>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span style="color:#64748b; font-weight:600;">Khoảng cách an toàn:</span>
                                        <strong style="color:#0f172a; font-weight:750;">${pr.pet?.spacing} cm</strong>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span style="color:#64748b; font-weight:600;">In PET Ngực (cố định):</span>
                                        <strong style="color:#0f172a; font-weight:750;">
                                            ${mode === 'customer'
                                                ? `+${Number(pr.pet?.chest_price_customer !== undefined ? pr.pet.chest_price_customer : (pr.pet?.chest_price || 5000)).toLocaleString('vi-VN')}đ/áo`
                                                : `+${Number(pr.pet?.chest_price || 5000).toLocaleString('vi-VN')}đ/áo`
                                            }
                                        </strong>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span style="color:#64748b; font-weight:600;">Tối thiểu/Vị trí khác:</span>
                                        <strong style="color:#0f172a; font-weight:750;">
                                            ${mode === 'customer'
                                                ? `${Number(pr.pet?.min_position_price_customer !== undefined ? pr.pet.min_position_price_customer : (pr.pet?.min_position_price || 5000)).toLocaleString('vi-VN')}đ/vị trí`
                                                : `${Number(pr.pet?.min_position_price || 5000).toLocaleString('vi-VN')}đ/vị trí`
                                            }
                                        </strong>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Shipping Policy Card -->
                            <div style="background: ${mode === 'customer' ? '#fff7ed' : '#f0fdfa'}; border: 1px solid ${mode === 'customer' ? '#ffedd5' : '#ccfbf1'}; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 12px; ${pr.pet?.inactive && pr.screen?.inactive ? 'grid-column: span 2;' : ''}">
                                ${mode === 'ctv' ? `
                                <div>
                                    <div style="font-weight: 800; color: #0f766e; font-size: 12px; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed #99f6e4; padding-bottom: 6px; margin-bottom: 6px;">
                                        🚚 HỖ TRỢ VẬN CHUYỂN CTV
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                                        ${(pr.shipping || [
                                            { min_qty: 0, max_qty: 19, desc: "Không Miễn Phí Vận Chuyển", value: 0 },
                                            { min_qty: 20, max_qty: 100, desc: "Miễn phí J&T/Viettel thường (Khác hỗ trợ 50k)", value: 50000 }
                                        ]).map(s => {
                                            const qtyRange = _ctvFormatShippingRange(s.min_qty, s.max_qty);
                                            const descLower = String(s.desc).toLowerCase();
                                            const isFree = descLower.includes('miễn phí') || descLower.includes('free') || s.value > 0;
                                            
                                            let badgeHTML = isFree 
                                                ? `<span style="color:#0f766e; font-weight:800; font-size:10px; background:#ccfbf1; padding:2px 6px; border-radius:4px; border:1px solid #99f6e4; display:inline-block;">Miễn Phí Ship</span>`
                                                : `<span style="color:#64748b; font-weight:700; font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1; display:inline-block;">Không hỗ trợ</span>`;
                                            
                                            let detailsHTML = `<span style="font-size:10px; color:#475569; display:block; margin-top:2px;">${_ctvShortenShippingDesc(s.desc)} ${s.value > 0 ? `(Khác hỗ trợ <strong>${s.value.toLocaleString('vi-VN')}đ</strong>)` : ''}</span>`;
                                            
                                            return `
                                                <div style="border-bottom:1px solid #f1f5f9; padding-bottom:4px; display:flex; justify-content:space-between; align-items:start; min-height:36px;">
                                                    <div style="display:flex; flex-direction:column; flex-grow:1; padding-right:8px;">
                                                        <span style="font-weight:700; color:#1e293b;">SL: ${qtyRange}</span>
                                                        ${detailsHTML}
                                                    </div>
                                                    <div style="white-space:nowrap; text-align:right;">
                                                        ${badgeHTML}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                ` : ''}

                                ${mode === 'customer' ? `
                                <div>
                                    <div style="font-weight: 800; color: #c2410c; font-size: 12px; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed #fed7aa; padding-bottom: 6px; margin-bottom: 6px;">
                                        🚚 HỖ TRỢ VẬN CHUYỂN KHÁCH HÀNG
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                                        ${(pr.shipping_customer || [
                                            { min_qty: "0", max_qty: "Trở lên", desc: "Miễn phí J&T thường (Khác hỗ trợ 50k)", value: 50000 }
                                        ]).map(s => {
                                            const qtyRange = _ctvFormatShippingRange(s.min_qty, s.max_qty);
                                            const descLower = String(s.desc).toLowerCase();
                                            const isFree = descLower.includes('miễn phí') || descLower.includes('free') || s.value > 0;
                                            
                                            let badgeHTML = isFree 
                                                ? `<span style="color:#c2410c; font-weight:800; font-size:10px; background:#ffedd5; padding:2px 6px; border-radius:4px; border:1px solid #fed7aa; display:inline-block;">Miễn Phí Ship</span>`
                                                : `<span style="color:#64748b; font-weight:700; font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1; display:inline-block;">Không hỗ trợ</span>`;
                                            
                                            let detailsHTML = `<span style="font-size:10px; color:#475569; display:block; margin-top:2px;">${_ctvShortenShippingDesc(s.desc)} ${s.value > 0 ? `(Khác hỗ trợ <strong>${s.value.toLocaleString('vi-VN')}đ</strong>)` : ''}</span>`;
                                            
                                            return `
                                                <div style="border-bottom:1px solid #f1f5f9; padding-bottom:4px; display:flex; justify-content:space-between; align-items:start; min-height:36px;">
                                                    <div style="display:flex; flex-direction:column; flex-grow:1; padding-right:8px;">
                                                        <span style="font-weight:700; color:#1e293b;">SL: ${qtyRange}</span>
                                                        ${detailsHTML}
                                                    </div>
                                                    <div style="white-space:nowrap; text-align:right;">
                                                        ${badgeHTML}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                            
                            <!-- Screen Printing Card -->
                            ${!pr.screen?.inactive ? `
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; ${!pr.pet?.inactive ? 'grid-column: span 2;' : ''} display: flex; flex-direction: column; gap: 8px;">
                                <div style="font-weight: 800; color: #334155; font-size: 12px; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 2px;">
                                    🖌️ IN LƯỚI CTV (SCREEN PRINTING)
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; font-size: 12px;">
                                    <div style="display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #e2e8f0; padding-right: 12px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <span style="color:#64748b; font-weight:600;">Đơn tối thiểu:</span>
                                            <strong style="color:#0f172a; font-weight:750;">${pr.screen?.qty_threshold} áo</strong>
                                        </div>
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <span style="color:#64748b; font-weight:600;">Đơn hàng &lt; ${pr.screen?.qty_threshold} áo:</span>
                                            <strong style="color:#0f172a; font-weight:750;">${Number(pr.screen?.price_low).toLocaleString('vi-VN')}đ/màu</strong>
                                        </div>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 6px; justify-content: center;">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <span style="color:#64748b; font-weight:600;">Đơn >= ${pr.screen?.qty_threshold} áo (1-3 màu):</span>
                                            <strong style="color:#0f172a; font-weight:750;">${Number(pr.screen?.price_high_1_3).toLocaleString('vi-VN')}đ/áo/màu</strong>
                                        </div>
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <span style="color:#64748b; font-weight:600;">Đơn >= ${pr.screen?.qty_threshold} áo (4+ màu):</span>
                                            <strong style="color:#0f172a; font-weight:750;">${Number(pr.screen?.price_high_4_plus).toLocaleString('vi-VN')}đ/áo/màu</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                        </div>
                    </div>
                    
                </div>
            </div>
            
            <!-- Footer -->
            <div class="no-print" style="padding:16px 24px; border-top:1px solid #e2e8f0; text-align:right; background:#f8fafc; border-bottom-left-radius:24px; border-bottom-right-radius:24px; display:flex; justify-content:flex-end; gap:12px;">
                <button class="ctv-btn-secondary" style="background:#1e3a8a; color:white; border-color:#1e3a8a; padding:8px 24px; border-radius:10px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;" onclick="_ctvOpenPriceListExportModal(${c.id}, '${mode}')">🖨️ In / Xuất PDF</button>
                <button class="ctv-btn-secondary" onclick="document.getElementById('ctv_config_preview_modal').style.display='none'" style="padding:8px 24px; border-radius:10px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;">Đóng</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function _ctvOpenPriceListExportModal(configId, mode = 'ctv') {
    const c = _ctvState.configVersions.find(v => v.id === configId);
    if (!c) return;

    const info = _ctvGetCompanyInfo();
    const userObj = window._currentUser || window.currentUser;
    const creatorName = _ctvState.creatorName || (userObj ? (userObj.full_name || userObj.username) : '');
    if (!_ctvState.creatorName && creatorName) {
        _ctvState.creatorName = creatorName;
    }
    
    _ctvInjectUnifiedPrintStyles();

    const mats = c.materials || [];
    const sc = c.surcharges || {};
    const pr = c.print_prices || {};

    // Get Surcharges list in configured order
    let surchargeItems = [];
    const _defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: sc.collar || 0, customer_value: sc.collar_customer !== undefined ? sc.collar_customer : (sc.collar || 0), inactive: sc.collar_inactive || false, ctv_inactive: sc.collar_ctv_inactive || false, customer_inactive: sc.collar_customer_inactive || false },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: sc.qty_under_20 || 0, customer_value: sc.qty_under_20_customer !== undefined ? sc.qty_under_20_customer : (sc.qty_under_20 || 0), inactive: sc.qty_under_20_inactive || false, ctv_inactive: sc.qty_under_20_ctv_inactive || false, customer_inactive: sc.qty_under_20_customer_inactive || false },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: sc.primary_school || 0, customer_value: sc.primary_school_customer !== undefined ? sc.primary_school_customer : (sc.primary_school || 0), inactive: sc.primary_school_inactive || false, ctv_inactive: sc.primary_school_ctv_inactive || false, customer_inactive: sc.primary_school_customer_inactive || false },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: sc.raglan || 0, customer_value: sc.raglan_customer !== undefined ? sc.raglan_customer : (sc.raglan || 0), inactive: sc.raglan_inactive || false, ctv_inactive: sc.raglan_ctv_inactive || false, customer_inactive: sc.raglan_customer_inactive || false },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: sc.color_block || 0, customer_value: sc.color_block_customer !== undefined ? sc.color_block_customer : (sc.color_block || 0), inactive: sc.color_block_inactive || false, ctv_inactive: sc.color_block_ctv_inactive || false, customer_inactive: sc.color_block_customer_inactive || false }
    };
    const _customs = {};
    if (sc.custom && Array.isArray(sc.custom)) {
        sc.custom.forEach(item => {
            if (item && item.name) {
                const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
                _customs[customKey] = { key: customKey, name: item.name, value: item.value || 0, customer_value: item.customer_value !== undefined ? item.customer_value : (item.value || 0), inactive: item.inactive || false, ctv_inactive: item.ctv_inactive || false, customer_inactive: item.customer_inactive || false };
            }
        });
    }
    if (sc.display_order && Array.isArray(sc.display_order)) {
        sc.display_order.forEach(o => {
            if (!o) return;
            const oKey = typeof o === 'string' ? o : o.key;
            const oName = typeof o === 'string' ? o : o.name;
            let found = null;
            if (_defaults[oKey]) {
                found = _defaults[oKey];
                found.name = oName || found.name;
                found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                delete _defaults[oKey];
            } else if (_customs[oKey]) {
                found = _customs[oKey];
                found.name = oName || found.name;
                found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                delete _customs[oKey];
            } else {
                const dk = Object.keys(_defaults).find(k => _defaults[k].name === oName || _defaults[k].key === oName);
                if (dk) {
                    found = _defaults[dk];
                    found.name = oName || found.name;
                    found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                    found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                    found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                    delete _defaults[dk];
                } else {
                    const ck = Object.keys(_customs).find(k => _customs[k].name === oName || _customs[k].key === oName);
                    if (ck) {
                        found = _customs[ck];
                        found.name = oName || found.name;
                        found.inactive = o.inactive !== undefined ? o.inactive : found.inactive;
                        found.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : found.ctv_inactive;
                        found.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : found.customer_inactive;
                        delete _customs[ck];
                    }
                }
            }
            if (found) {
                surchargeItems.push(found);
            }
        });
    } else {
        surchargeItems = Object.values(_defaults);
        Object.values(_customs).forEach(c => surchargeItems.push(c));
    }

    const logoSrc = info.logo || '/images/logo.png';
    const titleText = mode === 'customer' ? 'BẢNG GIÁ BÁN KHÁCH HÀNG TRỰC TIẾP' : 'HỆ THỐNG BIỂU PHÍ CTV & ĐẠI LÝ CHÍNH THỨC';

    let modal = document.getElementById('ctv_price_list_export_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ctv_price_list_export_modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(15,23,42,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.zIndex = '1005'; // higher than the detail modal (1000)
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '16px';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white; border-radius:16px; max-width:850px; width:100%; max-height:95vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <!-- Modal Header -->
            <div class="no-print" style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <h3 style="margin:0; font-size:16px; font-weight:800; color:#1e293b;">🖨️ Xuất Bản Biểu Phí</h3>
                </div>
                
                <div style="display:flex; align-items:center; gap:16px;">
                    <!-- Toggle Mode Button Group -->
                    <div style="display:flex; background:#f1f5f9; padding:3px; border-radius:10px; gap:4px; border:1px solid #cbd5e1;">
                        <button onclick="_ctvOpenPriceListExportModal(${configId}, 'ctv')" style="background: ${mode === 'ctv' ? '#2563eb' : 'transparent'}; color: ${mode === 'ctv' ? 'white' : '#475569'}; border: none; padding: 6px 16px; border-radius: 8px; font-weight:700; font-size:12px; cursor:pointer; transition: all 0.2s;">👥 Bản in CTV</button>
                        <button onclick="_ctvOpenPriceListExportModal(${configId}, 'customer')" style="background: ${mode === 'customer' ? '#f97316' : 'transparent'}; color: ${mode === 'customer' ? 'white' : '#475569'}; border: none; padding: 6px 16px; border-radius: 8px; font-weight:700; font-size:12px; cursor:pointer; transition: all 0.2s;">🛍️ Bản in Khách hàng</button>
                    </div>
                    
                    <!-- Creator input -->
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:12px; font-weight:700; color:#475569; white-space:nowrap;">Người lập:</span>
                        <input type="text" id="ctv_price_list_creator_input" value="${creatorName}" placeholder="Tên người lập..." style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; width:150px; box-sizing:border-box; background-color:#f1f5f9; color:#64748b; cursor:not-allowed;" disabled />
                    </div>
                </div>
                
                <button onclick="_ctvClosePriceListExportModal()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">×</button>
            </div>
            
            <!-- Printable content area -->
            <div style="padding:40px; overflow-y:auto; flex-grow:1; background:#f8fafc;" id="ctv_price_list_print_content">
                <div style="font-family:'Inter', sans-serif; color:#1e293b; line-height:1.5; background:white; padding:30px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <!-- Company Header -->
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:30px; border-bottom:3px double #e2e8f0; padding-bottom:20px;">
                        <div style="display:flex; gap:16px; align-items:center;">
                            <img src="${logoSrc}" style="height:60px; width:60px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;" />
                            <div>
                                <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:900; color:#1e3a8a; letter-spacing:-0.5px;">${info.name}</h1>
                                <p style="margin:0; font-size:12px; color:#475569;">📍 Địa chỉ: ${info.address}</p>
                                <p style="margin:2px 0 0 0; font-size:12px; color:#475569;">📞 Điện thoại: ${info.phone} | Website: ${info.website}</p>
                            </div>
                        </div>
                        <div style="text-align:right; max-width: 320px;">
                            <h2 style="margin:0 0 4px 0; font-size:14px; font-weight:800; color:#1e3a8a; line-height: 1.3;">${titleText}</h2>
                            <p style="margin:0; font-size:11px; color:#64748b;">Mã số: <strong>BG-${c.id}-${mode.toUpperCase()}</strong></p>
                            <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Ngày lập: ${vnDateStr(vnNow())}</p>
                        </div>
                    </div>
                    
                    <!-- Client Details Block -->
                    <div style="background:#f8fafc; border-radius:10px; padding:16px; margin-bottom:24px; border:1px solid #e2e8f0;">
                        <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px;">
                            ${mode === 'customer' ? 'Kính gửi quý khách hàng' : 'Kính gửi đối tác đại lý / ctv'}
                        </h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:13px;">
                            <div>• Đối tượng áp dụng: <strong>${mode === 'customer' ? 'Khách hàng bán trực tiếp' : 'Cộng Tác Viên & Đại Lý'}</strong></div>
                            <div>• Người lập biểu: <strong id="ctv_price_list_creator_label">${creatorName || 'Giám Đốc'}</strong></div>
                            <div>• Phiên bản bảng giá: <strong>${c.version_name}</strong></div>
                            <div>• Trạng thái áp dụng: <strong style="color:#16a34a;">Đang hoạt động</strong></div>
                        </div>
                    </div>
                    
                    <!-- Side-by-Side Tables -->
                    <div style="display:grid; grid-template-columns:1fr 1.1fr; gap:20px;">
                        <!-- Fabrics Table -->
                        <div>
                            <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;">👕 Đơn giá phôi trơn</h3>
                            <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #cbd5e1;">
                                <thead>
                                    <tr style="background:#f1f5f9;">
                                        <th style="border:1px solid #cbd5e1; padding:10px; text-align:left; font-weight:800; color:#1e3a8a;">Tên loại vải (Cổ tròn)</th>
                                        <th style="border:1px solid #cbd5e1; padding:10px; text-align:right; width:130px; font-weight:800; color:#1e3a8a;">Đơn giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${mats.filter(m => !m.inactive).map((m, idx) => {
                                        const displayPrice = mode === 'customer' ? (m.customer_price !== undefined ? Number(m.customer_price) : Math.round(Number(m.price) * 1.15)) : Number(m.price);
                                        return `
                                            <tr style="${idx % 2 === 1 ? 'background:#f8fafc;' : ''}">
                                                <td style="border:1px solid #cbd5e1; padding:10px; font-weight:600; color:#334155;">Vải ${m.name}</td>
                                                <td style="border:1px solid #cbd5e1; padding:10px; text-align:right; font-weight:750; color:#1e293b;">${displayPrice.toLocaleString('vi-VN')} đ/áo</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Surcharges Table -->
                        <div>
                            <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#0d9488; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;">➕ Phụ phí & chi tiết thêm</h3>
                            <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #cbd5e1;">
                                <thead>
                                    <tr style="background:#f1f5f9;">
                                        <th style="border:1px solid #cbd5e1; padding:10px; text-align:left; font-weight:800; color:#0d9488;">Hạng mục phụ phí</th>
                                        <th style="border:1px solid #cbd5e1; padding:10px; text-align:right; width:130px; font-weight:800; color:#0d9488;">Mức phí / Chiết khấu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${surchargeItems.filter(item => {
                                        if (item.inactive) return false;
                                        if (mode === 'customer') {
                                            if (item.customer_inactive) return false;
                                        } else {
                                            if (item.ctv_inactive) return false;
                                        }
                                        return true;
                                    }).map((item, idx) => {
                                        const surchargeVal = mode === 'customer'
                                            ? (item.customer_value !== undefined ? item.customer_value : item.value)
                                            : item.value;
                                        const priceInfo = _ctvGetPriceInfo(surchargeVal);
                                        return `
                                            <tr style="${idx % 2 === 1 ? 'background:#f8fafc;' : ''}">
                                                <td style="border:1px solid #cbd5e1; padding:10px; font-weight:600; color:#334155;">${item.name}</td>
                                                <td style="border:1px solid #cbd5e1; padding:10px; text-align:right; font-weight:750; color:#1e293b;">${priceInfo.text}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Print and Shipping Blocks -->
                    ${(!pr.pet?.inactive || !pr.screen?.inactive) ? `
                    <div style="margin-top:20px; display:grid; grid-template-columns: ${(!pr.pet?.inactive && !pr.screen?.inactive) ? '1fr 1fr' : '1fr'}; gap:20px;">
                        <!-- PET Card -->
                        ${!pr.pet?.inactive ? `
                        <div style="background:#fdfcff; border:1px solid #e9d5ff; border-radius:10px; padding:14px; font-size:12.5px;">
                            <h4 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#6b21a8; border-bottom:1px dashed #d8b4fe; padding-bottom:6px;">🧬 IN PET KHỔ MÉT</h4>
                            <div style="display:flex; flex-direction:column; gap:6px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Khổ mét (58x100cm):</span>
                                    <strong style="color:#0f172a;">
                                        ${mode === 'customer' 
                                            ? `${Number(pr.pet?.sheet_price_customer !== undefined ? pr.pet.sheet_price_customer : pr.pet?.sheet_price).toLocaleString('vi-VN')}đ`
                                            : `${Number(pr.pet?.sheet_price).toLocaleString('vi-VN')}đ`
                                        }
                                    </strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Khoảng cách an toàn:</span>
                                    <strong style="color:#0f172a;">${pr.pet?.spacing} cm</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">In PET Ngực (cố định):</span>
                                    <strong style="color:#0f172a;">
                                        ${mode === 'customer'
                                            ? `+${Number(pr.pet?.chest_price_customer !== undefined ? pr.pet.chest_price_customer : (pr.pet?.chest_price || 5000)).toLocaleString('vi-VN')}đ/áo`
                                            : `+${Number(pr.pet?.chest_price || 5000).toLocaleString('vi-VN')}đ/áo`
                                        }
                                    </strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Tối thiểu/Vị trí khác:</span>
                                    <strong style="color:#0f172a;">
                                        ${mode === 'customer'
                                            ? `${Number(pr.pet?.min_position_price_customer !== undefined ? pr.pet.min_position_price_customer : (pr.pet?.min_position_price || 5000)).toLocaleString('vi-VN')}đ/vị trí`
                                            : `${Number(pr.pet?.min_position_price || 5000).toLocaleString('vi-VN')}đ/vị trí`
                                        }
                                    </strong>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Screen Print Card -->
                        ${!pr.screen?.inactive ? `
                        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:14px; font-size:12.5px;">
                            <h4 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#334155; border-bottom:1px dashed #cbd5e1; padding-bottom:6px;">🖌️ IN LƯỚI CTV (SCREEN PRINTING)</h4>
                            <div style="display:flex; flex-direction:column; gap:6px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Đơn tối thiểu:</span>
                                    <strong style="color:#0f172a;">${pr.screen?.qty_threshold} áo</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Đơn hàng &lt; ${pr.screen?.qty_threshold} áo:</span>
                                    <strong style="color:#0f172a;">${Number(pr.screen?.price_low).toLocaleString('vi-VN')}đ/màu</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Đơn >= ${pr.screen?.qty_threshold} áo (1-3 màu):</span>
                                    <strong style="color:#0f172a;">${Number(pr.screen?.price_high_1_3).toLocaleString('vi-VN')}đ/áo/màu</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b;">Đơn >= ${pr.screen?.qty_threshold} áo (4+ màu):</span>
                                    <strong style="color:#0f172a;">${Number(pr.screen?.price_high_4_plus).toLocaleString('vi-VN')}đ/áo/màu</strong>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Shipping Policy Card -->
                    <div style="margin-top:20px; background:${mode === 'customer' ? '#fff7ed' : '#f0fdfa'}; border:1px solid ${mode === 'customer' ? '#fed7aa' : '#ccfbf1'}; border-radius:10px; padding:14px; font-size:12.5px;">
                        <h4 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:${mode === 'customer' ? '#c2410c' : '#0f766e'}; border-bottom:1px dashed ${mode === 'customer' ? '#fed7aa' : '#99f6e4'}; padding-bottom:6px;">
                            🚚 HỖ TRỢ VẬN CHUYỂN ${mode === 'customer' ? 'KHÁCH HÀNG' : 'CTV'}
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; column-gap:24px; row-gap:8px;">
                            ${(mode === 'customer' ? pr.shipping_customer : pr.shipping || []).map(s => {
                                const qtyRange = _ctvFormatShippingRange(s.min_qty, s.max_qty);
                                return `
                                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">
                                        <span style="font-weight:600; color:#475569;">SL: ${qtyRange}</span>
                                        <span style="color:#1e293b; font-weight:700;">${_ctvShortenShippingDesc(s.desc)} ${s.value > 0 ? `(Hỗ trợ ${s.value.toLocaleString('vi-VN')}đ)` : ''}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- Signatures -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; text-align:center; font-size:13px; margin-top:40px;">
                        <div>
                            <p style="margin:0 0 10px 0; font-weight:700; color:#475569;">NGƯỜI XEM BIỂU PHÍ</p>
                            <p style="margin:0; color:#64748b; font-style:italic; font-size:11px;">(Ký và ghi rõ họ tên)</p>
                            <div style="height:50px;"></div>
                            <p style="margin:0; font-weight:800; color:#475569; font-size:14px; opacity:0;">(Ký tên)</p>
                        </div>
                        <div>
                            <p style="margin:0 0 10px 0; font-weight:700; color:#1e3a8a;">ĐẠI DIỆN ${info.name.toUpperCase()}</p>
                            <p style="margin:0; font-weight:800; color:#1e3a8a;">NGƯỜI LẬP BIỂU</p>
                            <div style="height:50px;"></div>
                            <p id="ctv_price_list_printed_creator_name" style="margin:0; font-weight:800; color:#1e3a8a; font-size:14px;">${creatorName || 'Giám Đốc'}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Action Footer (Image 5) -->
            <div class="no-print" style="padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; background:#f8fafc; border-bottom-left-radius:16px; border-bottom-right-radius:16px;">
                <button class="ctv-btn-secondary" onclick="_ctvCopyPriceListText(${configId}, '${mode}')" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">📋 Sao chép text nhanh</button>
                <button class="ctv-btn-secondary" style="background:#1e3a8a; color:white; border-color:#1e3a8a; display:inline-flex; align-items:center; gap:6px; cursor:pointer;" onclick="_ctvPrintPriceList('${mode}')">🖨️ In / Tải PDF</button>
                <button class="ctv-btn-secondary" onclick="_ctvClosePriceListExportModal()" style="cursor:pointer;">Đóng</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function _ctvClosePriceListExportModal() {
    const modal = document.getElementById('ctv_price_list_export_modal');
    if (modal) modal.style.display = 'none';
}

function _ctvPrintPriceList(mode) {
    const originalTitle = document.title;
    const d = typeof vnNow === 'function' ? vnNow() : new Date();
    const vnParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    }).formatToParts(d);
    const day = vnParts.find(p => p.type === 'day').value;
    const month = vnParts.find(p => p.type === 'month').value;
    const year = vnParts.find(p => p.type === 'year').value;
    const formattedDate = `${day}-${month}-${year}`;

    if (mode === 'customer') {
        document.title = `Báo Giá Khách Hàng HV ${formattedDate}`;
    } else {
        document.title = `Báo Giá CTV HV ${formattedDate}`;
    }
    
    document.body.classList.add('print-price-list');
    document.body.classList.remove('print-quotation');
    
    window.print();
    
    setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('print-price-list');
    }, 100);
}

function _ctvPrintQuotation(mode) {
    const originalTitle = document.title;
    const d = typeof vnNow === 'function' ? vnNow() : new Date();
    const vnParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    }).formatToParts(d);
    const day = vnParts.find(p => p.type === 'day').value;
    const month = vnParts.find(p => p.type === 'month').value;
    const year = vnParts.find(p => p.type === 'year').value;
    const formattedDate = `${day}-${month}-${year}`;

    const hasCustomer = !!_ctvState.selectedCustomer;
    const customerName = hasCustomer ? _ctvState.selectedCustomer.customer_name : '';
    
    if (mode === 'customer') {
        const displayCustName = customerName ? `(${customerName})` : '(Quý Khách)';
        document.title = `Báo Giá HV - Gửi Khách ${displayCustName} ${formattedDate}`;
    } else {
        const displayCustName = customerName ? `(${customerName})` : '(Đại Lý)';
        document.title = `Báo Giá CTV HV ${displayCustName} ${formattedDate}`;
    }
    
    document.body.classList.add('print-quotation');
    document.body.classList.remove('print-price-list');
    
    window.print();
    
    setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('print-quotation');
    }, 100);
}

function _ctvInjectUnifiedPrintStyles() {
    let style = document.getElementById('ctv_price_list_print_style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'ctv_price_list_print_style';
        style.innerHTML = `
            @media print {
                /* General rules */
                body, body * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important;
                }
                .no-print {
                    display: none !important;
                }
                @page {
                    size: A4 portrait;
                    margin: 0; /* Hides default header/footer */
                }
                
                /* Case 1: Printing Price List */
                body.print-price-list > *:not(#ctv_price_list_export_modal) {
                    display: none !important;
                }
                body.print-price-list #ctv_price_list_export_modal {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 10mm 12mm !important;
                    background: white !important;
                    box-shadow: none !important;
                    box-sizing: border-box !important;
                }
                body.print-price-list #ctv_price_list_export_modal, 
                body.print-price-list #ctv_price_list_export_modal * {
                    visibility: visible !important;
                }
                body.print-price-list #ctv_price_list_export_modal > div {
                    max-width: 100% !important;
                    width: 100% !important;
                    max-height: none !important;
                    height: auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                body.print-price-list #ctv_price_list_print_content {
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                    overflow: visible !important;
                    zoom: 0.85 !important;
                }
                body.print-price-list #ctv_price_list_print_content > div {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                body.print-price-list #ctv_price_list_print_content div[style*="margin-bottom:30px"] {
                    margin-bottom: 12px !important;
                    padding-bottom: 8px !important;
                }
                body.print-price-list #ctv_price_list_print_content div[style*="margin-bottom:24px"] {
                    margin-bottom: 10px !important;
                    padding: 8px 14px !important;
                }
                body.print-price-list #ctv_price_list_print_content div[style*="margin-top:20px"] {
                    margin-top: 12px !important;
                }
                body.print-price-list #ctv_price_list_print_content div[style*="margin-top:40px"] {
                    margin-top: 20px !important;
                }
                body.print-price-list #ctv_price_list_print_content table th, 
                body.print-price-list #ctv_price_list_print_content table td {
                    padding: 6px 8px !important;
                    font-size: 12px !important;
                    border: 1px solid #cbd5e1 !important;
                }
                body.print-price-list #ctv_price_list_print_content img[style*="height:60px"] {
                    height: 50px !important;
                    width: auto !important;
                }
                body.print-price-list #ctv_price_list_print_content h1 {
                    font-size: 18px !important;
                }
                body.print-price-list #ctv_price_list_print_content h2 {
                    font-size: 12px !important;
                }
                body.print-price-list #ctv_price_list_print_content h3,
                body.print-price-list #ctv_price_list_print_content h4 {
                    font-size: 12px !important;
                    margin-bottom: 8px !important;
                }
                body.print-price-list #ctv_price_list_print_content div[style*="height:50px"] {
                    height: 35px !important;
                }
                
                /* Case 2: Printing Quotation */
                body.print-quotation > *:not(#ctv_export_modal) {
                    display: none !important;
                }
                body.print-quotation #ctv_export_modal {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 15mm 20mm !important;
                    background: white !important;
                    box-shadow: none !important;
                    box-sizing: border-box !important;
                }
                body.print-quotation #ctv_export_modal, 
                body.print-quotation #ctv_export_modal * {
                    visibility: visible !important;
                }
                body.print-quotation #ctv_export_modal > div {
                    max-width: 100% !important;
                    width: 100% !important;
                    max-height: none !important;
                    height: auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                body.print-quotation #ctv_print_export_modal_content {
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                    overflow: visible !important;
                    zoom: 0.9 !important;
                }
                body.print-quotation #ctv_print_export_modal_content > div {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                body.print-quotation #ctv_print_export_modal_content div[style*="margin-bottom:30px"] {
                    margin-bottom: 20px !important;
                    padding-bottom: 12px !important;
                }
                body.print-quotation #ctv_print_export_modal_content div[style*="margin-bottom:24px"] {
                    margin-bottom: 18px !important;
                    padding: 12px 16px !important;
                }
                body.print-quotation #ctv_print_export_modal_content div[style*="margin-top:20px"] {
                    margin-top: 14px !important;
                }
                body.print-quotation #ctv_print_export_modal_content div[style*="margin-top:40px"] {
                    margin-top: 24px !important;
                }
                body.print-quotation #ctv_print_export_modal_content table th {
                    background-color: #1e3a8a !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    font-size: 11px !important;
                    letter-spacing: 0.5px !important;
                    padding: 8px 12px !important;
                    border: 1px solid #cbd5e1 !important;
                }
                body.print-quotation #ctv_print_export_modal_content table td {
                    padding: 8px 12px !important;
                    font-size: 12px !important;
                    border: 1px solid #cbd5e1 !important;
                }
                body.print-quotation #ctv_print_export_modal_content tr[style*="background:#fff7ed"] {
                    background-color: #fff7ed !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body.print-quotation #ctv_print_export_modal_content tr[style*="background:#f8fafc"] {
                    background-color: #f8fafc !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body.print-quotation #ctv_print_export_modal_content tr[style*="background:#f0fdf4"] {
                    background-color: #f0fdf4 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body.print-quotation #ctv_print_export_modal_content tr[style*="background:#eff6ff"] {
                    background-color: #eff6ff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body.print-quotation #ctv_print_export_modal_content img[style*="height:65px"] {
                    height: 55px !important;
                    width: auto !important;
                }
                body.print-quotation #ctv_print_export_modal_content h1 {
                    font-size: 20px !important;
                }
                body.print-quotation #ctv_print_export_modal_content h2 {
                    font-size: 13px !important;
                }
                body.print-quotation #ctv_print_export_modal_content h3,
                body.print-quotation #ctv_print_export_modal_content h4 {
                    font-size: 12px !important;
                    margin-bottom: 8px !important;
                }
                body.print-quotation #ctv_print_export_modal_content div[style*="height:70px"] {
                    height: 50px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function _ctvCopyPriceListText(configId, mode) {
    const c = _ctvState.configVersions.find(v => v.id === configId);
    if (!c) return;
    
    const mats = c.materials || [];
    const sc = c.surcharges || {};
    const pr = c.print_prices || {};
    
    let text = `⚡ ĐỒNG PHỤC HV\n`;
    text += `${mode === 'customer' ? 'BẢNG GIÁ BÁN KHÁCH HÀNG TRỰC TIẾP' : 'HỆ THỐNG BIỂU PHÍ CTV & ĐẠI LÝ CHÍNH THỨC'}\n`;
    text += `Phiên bản: ${c.version_name}\n`;
    text += `Ngày lập: ${vnDateStr(vnNow())}\n`;
    text += `-------------------------------------------\n\n`;
    
    text += `👕 ĐƠN GIÁ PHÔI TRƠN (CỔ TRÒN):\n`;
    mats.forEach(m => {
        const displayPrice = mode === 'customer' ? (m.customer_price !== undefined ? Number(m.customer_price) : Math.round(Number(m.price) * 1.15)) : Number(m.price);
        text += `- Vải ${m.name}: ${displayPrice.toLocaleString('vi-VN')}đ\n`;
    });
    text += `\n`;
    
    // Get Surcharges list in configured order
    let surchargeItems = [];
    const _defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: sc.collar || 0 },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: sc.qty_under_20 || 0 },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: sc.primary_school || 0 },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: sc.raglan || 0 },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: sc.color_block || 0 }
    };
    const _customs = {};
    if (sc.custom && Array.isArray(sc.custom)) {
        sc.custom.forEach(item => {
            if (item && item.name) {
                const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
                _customs[customKey] = { key: customKey, name: item.name, value: item.value || 0 };
            }
        });
    }
    if (sc.display_order && Array.isArray(sc.display_order)) {
        sc.display_order.forEach(o => {
            if (!o) return;
            const oKey = typeof o === 'string' ? o : o.key;
            const oName = typeof o === 'string' ? o : o.name;
            let found = null;
            if (_defaults[oKey]) {
                found = _defaults[oKey];
                found.name = oName || found.name;
                delete _defaults[oKey];
            } else if (_customs[oKey]) {
                found = _customs[oKey];
                found.name = oName || found.name;
                delete _customs[oKey];
            }
            if (found) surchargeItems.push(found);
        });
    }
    
    text += `➕ PHỤ PHÍ & CHI TIẾT THÊM:\n`;
    surchargeItems.forEach(item => {
        const priceInfo = _ctvGetPriceInfo(item.value);
        text += `- ${item.name}: ${priceInfo.text}\n`;
    });
    text += `\n`;
    
    text += `🧬 IN PET KHỔ MÉT:\n`;
    const sheetPrice = mode === 'customer'
        ? (pr.pet?.sheet_price_customer !== undefined ? Number(pr.pet.sheet_price_customer) : Number(pr.pet?.sheet_price) || 60000)
        : (Number(pr.pet?.sheet_price) || 60000);
    const chestPrice = mode === 'customer'
        ? (pr.pet?.chest_price_customer !== undefined ? Number(pr.pet.chest_price_customer) : (pr.pet?.chest_price || 5000))
        : (pr.pet?.chest_price || 5000);
    const minPositionPrice = mode === 'customer'
        ? (pr.pet?.min_position_price_customer !== undefined ? Number(pr.pet.min_position_price_customer) : (pr.pet?.min_position_price || 5000))
        : (pr.pet?.min_position_price || 5000);
    
    text += `- Khổ mét (58x100cm): ${sheetPrice.toLocaleString('vi-VN')}đ\n`;
    text += `- Khoảng cách an toàn: ${pr.pet?.spacing || 0.4} cm\n`;
    text += `- In PET Ngực: +${chestPrice.toLocaleString('vi-VN')}đ/áo\n`;
    text += `- Tối thiểu/Vị trí khác: ${minPositionPrice.toLocaleString('vi-VN')}đ/vị trí\n\n`;
    
    text += `🖌️ IN LƯỚI CTV (SCREEN PRINTING):\n`;
    text += `- Đơn tối thiểu: ${pr.screen?.qty_threshold || 20} áo\n`;
    text += `- Đơn hàng < ${pr.screen?.qty_threshold || 20} áo: ${Number(pr.screen?.price_low || 0).toLocaleString('vi-VN')}đ/màu\n`;
    text += `- Đơn hàng >= ${pr.screen?.qty_threshold || 20} áo (1-3 màu): ${Number(pr.screen?.price_high_1_3 || 0).toLocaleString('vi-VN')}đ/áo/màu\n`;
    text += `- Đơn hàng >= ${pr.screen?.qty_threshold || 20} áo (4+ màu): ${Number(pr.screen?.price_high_4_plus || 0).toLocaleString('vi-VN')}đ/áo/màu\n\n`;
    
    text += `🚚 HỖ TRỢ VẬN CHUYỂN:\n`;
    const shippingList = mode === 'customer' ? pr.shipping_customer : pr.shipping;
    if (shippingList && shippingList.length > 0) {
        shippingList.forEach(s => {
            const qtyRange = _ctvFormatShippingRange(s.min_qty, s.max_qty);
            text += `- Số lượng ${qtyRange}: ${_ctvShortenShippingDesc(s.desc)} ${s.value > 0 ? `(Hỗ trợ ${s.value.toLocaleString('vi-VN')}đ)` : ''}\n`;
        });
    } else {
        text += `- Không có cấu hình vận chuyển.\n`;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép bảng biểu phí vào clipboard!', 'success');
    }).catch(err => {
        showToast('Lỗi sao chép: ' + err.message, 'error');
    });
}

function _ctvOpenNewConfigForm(editId = null) {
    const isDirector = currentUser && currentUser.role === 'giam_doc';
    const commissionDisabled = isDirector ? '' : 'disabled style="background-color:#f1f5f9; color:#94a3b8; cursor:not-allowed;"';
    let modal = document.getElementById('ctv_config_new_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ctv_config_new_modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(15,23,42,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '16px';
        document.body.appendChild(modal);
    }
    
    if (editId) {
        modal.setAttribute('data-edit-id', editId);
    } else {
        modal.removeAttribute('data-edit-id');
    }
    
    // Fill values with active config or base defaults
    let cfg = null;
    if (editId && _ctvState.configVersions) {
        cfg = _ctvState.configVersions.find(v => v.id === editId);
    }
    
    if (!cfg) {
        cfg = _ctvState.activeConfig || {
            version_name: '',
            materials: [
                { name: 'Cotton Lite 100%', price: 75000 },
                { name: 'Cotton Premium 100%', price: 95000 },
                { name: 'Thun Cá Sấu', price: 85000 }
            ],
            surcharges: { collar: 10000, qty_under_20: 10000, primary_school: -5000, raglan: 5000, color_block: 15000 },
            print_prices: {
                pet: { sheet_price: 60000, spacing: 0.4 },
                commission_percent: 15,
                print3d: {
                    meters_per_shirt: 0.8,
                    print_tiers: [
                        { min: 500, max: null, price: 30000 },
                        { min: 100, max: 500, price: 35000 },
                        { min: 10, max: 100, price: 40000 },
                        { min: 0, max: 10, price: 45000 }
                    ],
                    laser_tiers: [
                        { min: 500, max: null, price: 3000 },
                        { min: 0, max: 500, price: 4000 }
                    ]
                },
                screen: { qty_threshold: 20, price_low: 60000, price_high_1_3: 4000, price_high_4_plus: 3500 },
                embroidery: { flat_price: 15000 }
            }
        };
    }
    
    const matRows = (cfg.materials || []).map((m, idx) => {
        const custPrice = m.customer_price !== undefined ? Number(m.customer_price) : Math.round(Number(m.price) * 1.15);
        const opacity = m.inactive ? '0.5' : '1';
        return `
            <div class="ctv-mat-row" style="display:flex; gap:8px; margin-bottom:8px; align-items:center; opacity: ${opacity}; transition: opacity 0.2s;">
                <input type="checkbox" class="ctv-mat-active" title="Cho phép bán" ${m.inactive ? '' : 'checked'} style="width:16px; height:16px; cursor:pointer;" onchange="this.parentElement.style.opacity = this.checked ? '1' : '0.5'">
                <input type="text" class="ctv-input" placeholder="Tên chất liệu" value="${m.name}" style="flex-grow:1;">
                <input type="number" class="ctv-input ctv-price-input" placeholder="Giá CTV" value="${m.price}" style="width:110px;">
                <input type="number" class="ctv-input customer-price-input" placeholder="Giá Khách" value="${custPrice}" style="width:110px; font-weight:700; color:#ea580c;">
                <button type="button" class="ctv-remove-btn" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="background:white; border-radius:16px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#1e293b;">${editId ? '✏️ Chỉnh Sửa Phiên Bản Bảng Giá' : '➕ Tạo Phiên Bản Bảng Giá Mới'}</h3>
                <button onclick="document.getElementById('ctv_config_new_modal').style.display='none'" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">×</button>
            </div>
            
            <div style="padding:24px; overflow-y:auto; flex-grow:1; font-size:13px;">
                <div class="ctv-form-group">
                    <label>Tên phiên bản bảng giá ${editId ? 'chỉnh sửa' : 'mới'} (Ví dụ: "Bảng giá CTV Tháng 2/2026")</label>
                    <input type="text" class="ctv-input" id="new_cfg_version_name" placeholder="Bắt buộc nhập..." value="${editId ? cfg.version_name : (cfg.version_name ? cfg.version_name + ' (Sao chép)' : '')}">
                </div>
                
                <!-- Materials list setup -->
                <h4 style="margin:16px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; display:flex; justify-content:space-between;">
                    <span>👕 Chất Liệu Phôi Trơn Cổ Tròn</span>
                    <button class="ctv-btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="_ctvAddMatRowInput()">+ Thêm chất liệu</button>
                </h4>
                
                <div style="display:flex; gap:8px; margin-bottom:6px; font-weight:800; color:#475569; font-size:11px; padding-left:28px; padding-right:32px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;">
                    <div style="flex-grow:1;">Tên chất liệu vải</div>
                    <div style="width:110px; text-align:center;">Giá CTV</div>
                    <div style="width:110px; text-align:center;">Giá Khách hàng</div>
                </div>

                <div id="new_cfg_mats_container">
                    ${matRows}
                </div>
                
                <!-- Chi tiết thêm setup -->
                <h4 style="margin:20px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; display:flex; justify-content:space-between;">
                    <span>➕ Thiết Lập Chi Tiết Thêm</span>
                    <button class="ctv-btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="_ctvAddCustomSurchargeRow()">+ Thêm chi tiết</button>
                </h4>
                
                <div style="display:flex; gap:8px; margin-bottom:6px; font-weight:800; color:#475569; font-size:11px; padding-left:62px; padding-right:32px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;">
                    <div style="flex-grow:1;">Tên chi tiết thêm</div>
                    <div style="width:110px; text-align:center;">Giá CTV</div>
                    <div style="width:110px; text-align:center;">Giá Khách hàng</div>
                </div>

                <div id="new_cfg_surcharges_container" style="display:flex; flex-direction:column; gap:4px; max-height:250px; overflow-y:auto; padding-right:4px;">
                    <!-- Will be populated by _ctvRenderSurchargeRows -->
                </div>
                
                <!-- Printing setup -->
                <h4 style="margin:20px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">🎨 Thiết Lập Giá In CTV</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- PET -->
                    <div id="cfg_pet_container" style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; opacity: ${cfg.print_prices?.pet?.inactive ? '0.5' : '1'}; transition: opacity 0.2s;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <input type="checkbox" id="new_cfg_pr_pet_active" title="Sử dụng In PET" ${cfg.print_prices?.pet?.inactive ? '' : 'checked'} style="width:16px; height:16px; cursor:pointer;" onchange="document.getElementById('cfg_pet_container').style.opacity = this.checked ? '1' : '0.5'">
                            <strong style="color:#0d9488; margin:0;">🧬 In PET</strong>
                        </div>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                            <div class="ctv-form-group" style="margin-bottom:8px;">
                                <label>Giá mét PET CTV</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_pet_sheet" value="${cfg.print_prices?.pet?.sheet_price || 60000}" oninput="this.value = this.value.replace(/[^0-9.]/g, ''); _ctvSyncPetPriceField(this, 'new_cfg_pr_pet_sheet_cust')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:8px;">
                                <label style="color:#c2410c; font-weight:700;">Giá mét PET Khách</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_pet_sheet_cust" value="${cfg.print_prices?.pet?.sheet_price_customer !== undefined ? cfg.print_prices.pet.sheet_price_customer : (cfg.print_prices?.pet?.sheet_price || 60000)}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')" style="border-color:#fed7aa; color:#c2410c; font-weight:700;">
                            </div>
                        </div>

                        <div class="ctv-form-group" style="margin-bottom:8px;">
                            <label>Khoảng cách spacing (cm)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_space" value="${cfg.print_prices?.pet?.spacing || 0.4}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')">
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <div class="ctv-form-group" style="margin-bottom:8px;">
                                <label>Giá in PET Ngực CTV</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_pet_chest" value="${cfg.print_prices?.pet?.chest_price || 5000}" oninput="this.value = this.value.replace(/[^0-9.]/g, ''); _ctvSyncPetPriceField(this, 'new_cfg_pr_pet_chest_cust')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:8px;">
                                <label style="color:#c2410c; font-weight:700;">Giá in PET Ngực Khách</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_pet_chest_cust" value="${cfg.print_prices?.pet?.chest_price_customer !== undefined ? cfg.print_prices.pet.chest_price_customer : (cfg.print_prices?.pet?.chest_price || 5000)}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')" style="border-color:#fed7aa; color:#c2410c; font-weight:700;">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Giá tối thiểu/khác CTV</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_pet_min_pos" value="${cfg.print_prices?.pet?.min_position_price || 5000}" oninput="this.value = this.value.replace(/[^0-9.]/g, ''); _ctvSyncPetPriceField(this, 'new_cfg_pr_pet_min_pos_cust')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label style="color:#c2410c; font-weight:700;">Giá tối thiểu Khách</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_pet_min_pos_cust" value="${cfg.print_prices?.pet?.min_position_price_customer !== undefined ? cfg.print_prices.pet.min_position_price_customer : (cfg.print_prices?.pet?.min_position_price || 5000)}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')" style="border-color:#fed7aa; color:#c2410c; font-weight:700;">
                            </div>
                        </div>
                        <div class="ctv-form-group" style="display:none;">
                            <label style="color:#c2410c; font-weight:700;">Phần trăm hoa hồng CTV (%)</label>
                            <input type="text" class="ctv-input" id="new_cfg_commission_percent" value="${cfg.print_prices?.commission_percent !== undefined ? cfg.print_prices.commission_percent : 15}">
                        </div>
                    </div>
                    
                    <!-- Embroidery -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; display:none;">
                        <strong style="color:#b45309;">🧵 Thêu Vi Tính</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:0;">
                            <label>Giá thêu đồng giá (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_emb_flat" value="${cfg.print_prices?.embroidery?.flat_price || 15000}">
                        </div>
                    </div>
                    
                    <!-- Screen Print -->
                    <div id="cfg_screen_container" style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; grid-column: span 2; opacity: ${cfg.print_prices?.screen?.inactive ? '0.5' : '1'}; transition: opacity 0.2s;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <input type="checkbox" id="new_cfg_pr_scr_active" title="Sử dụng In Lưới" ${cfg.print_prices?.screen?.inactive ? '' : 'checked'} style="width:16px; height:16px; cursor:pointer;" onchange="document.getElementById('cfg_screen_container').style.opacity = this.checked ? '1' : '0.5'">
                            <strong style="color:#7e22ce; margin:0;">🎨 In Lưới (Screen)</strong>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Hạn mức tối thiểu (áo)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_threshold" value="${cfg.print_prices?.screen?.qty_threshold || 20}" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Đơn giá thấp cồng kềnh (đ/đơn/màu)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_low" value="${cfg.print_prices?.screen?.price_low || 60000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Giá in 1-3 màu (đ/áo/màu)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_high_13" value="${cfg.print_prices?.screen?.price_high_1_3 || 4000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Giá in 4+ màu (đ/áo/màu)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_high_4" value="${cfg.print_prices?.screen?.price_high_4_plus || 3500}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                            </div>
                        </div>
                    </div>
                    
                    <!-- In 3D -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; grid-column: span 2; display:none;">
                        <strong style="color:#0284c7;">🌀 In 3D Toàn Thân</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:8px;">
                            <label>Giá in 3D (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_3d_flat" value="${cfg.print_prices?.print3d?.flat_price || 30000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                        <div style="font-size:11px; color:#64748b; font-style:italic; line-height:1.4;">
                            * Giá in 3D được tính trực tiếp theo đ/áo. Ví dụ: 30.000đ × 10 áo = 300.000đ.
                        </div>
                    </div>
                </div>
                
                <!-- Shipping setup -->
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div>
                        <h4 style="margin:20px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                            <span>🚚 VC cho CTV</span>
                            <button type="button" class="ctv-btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="_ctvAddShippingRowInput('ctv')">+ Thêm</button>
                        </h4>
                        <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; background: #fafafa;">
                            <div style="display:grid; grid-template-columns: 80px 80px 1fr 30px; gap:8px; font-weight:bold; margin-bottom:8px; color:#475569; font-size:12px;">
                                <span>Từ</span>
                                <span>Đến</span>
                                <span>Chính sách vận chuyển</span>
                                <span></span>
                            </div>
                            <div id="new_cfg_shipping_container" style="display:flex; flex-direction:column; gap:8px;">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin:20px 0 8px 0; color:#c2410c; border-bottom:1px solid #fed7aa; padding-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#c2410c;">🚚 VC cho Khách Hàng</span>
                            <button type="button" class="ctv-btn-secondary" style="padding:2px 8px; font-size:11px; border-color:#fed7aa; color:#c2410c;" onclick="_ctvAddShippingRowInput('customer')">+ Thêm</button>
                        </h4>
                        <div style="border:1px solid #fed7aa; border-radius:10px; padding:12px; background-color:#fffbeb;">
                            <div style="display:grid; grid-template-columns: 80px 80px 1fr 120px 30px; gap:8px; font-weight:bold; margin-bottom:8px; color:#475569; font-size:12px;">
                                <span>Từ</span>
                                <span>Đến</span>
                                <span>Chính sách vận chuyển</span>
                                <span>Hỗ trợ (đ)</span>
                                <span></span>
                            </div>
                            <div id="new_cfg_shipping_customer_container" style="display:flex; flex-direction:column; gap:8px;">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <label class="ctv-checkbox-label">
                        <input type="checkbox" id="new_cfg_apply_now" ${cfg.status === 'active' || !editId ? 'checked' : ''}>
                        Kích hoạt áp dụng bảng giá này ngay lập tức (Active)
                    </label>
                </div>
            </div>
            
            <div style="padding:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; background:#f8fafc; border-bottom-left-radius:16px; border-bottom-right-radius:16px;">
                <button class="ctv-btn-secondary" onclick="document.getElementById('ctv_config_new_modal').style.display='none'">Hủy</button>
                <button class="ctv-btn-secondary" style="background:#1e3a8a; color:white; border-color:#1e3a8a;" onclick="_ctvSaveNewConfigVersion()">Lưu Cấu Hình</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    _ctvRenderSurchargeRows(cfg.surcharges);
    _ctvRenderShippingRows(cfg.print_prices?.shipping, cfg.print_prices?.shipping_customer);
}

function _ctvOn3dCostChange(val) {
    _ctvState.print3dCost = Math.max(0, Number(val) || 0);
    _ctvUpdateCalculations();
}

function _ctvMoveSurchargeRow(btn, direction) {
    const row = btn.closest('.ctv-sc-row');
    if (!row) return;
    if (direction === -1) {
        const prev = row.previousElementSibling;
        if (prev) {
            row.parentElement.insertBefore(row, prev);
        }
    } else {
        const next = row.nextElementSibling;
        if (next) {
            row.parentElement.insertBefore(next, row);
        }
    }
}

function _ctvRenderSurchargeRows(surchargesObj) {
    const container = document.getElementById('new_cfg_surcharges_container');
    if (!container) return;
    
    let items = [];
    if (surchargesObj) {
        const defaults = {
            collar: { key: 'collar', name: 'Cổ Bẻ (đ/áo)', value: surchargesObj.collar || 0, customer_value: surchargesObj.collar_customer !== undefined ? surchargesObj.collar_customer : (surchargesObj.collar || 0), is_default: true, inactive: surchargesObj.collar_inactive || false, ctv_inactive: surchargesObj.collar_ctv_inactive || false, customer_inactive: surchargesObj.collar_customer_inactive || false },
            qty_under_20: { key: 'qty_under_20', name: 'Đơn Hàng < 20 Áo (đ/áo)', value: surchargesObj.qty_under_20 || 0, customer_value: surchargesObj.qty_under_20_customer !== undefined ? surchargesObj.qty_under_20_customer : (surchargesObj.qty_under_20 || 0), is_default: true, is_auto: true, inactive: surchargesObj.qty_under_20_inactive || false, ctv_inactive: surchargesObj.qty_under_20_ctv_inactive || false, customer_inactive: surchargesObj.qty_under_20_customer_inactive || false },
            primary_school: { key: 'primary_school', name: 'Chiết Khấu Tiểu Học (đ/áo, nhập âm để giảm)', value: surchargesObj.primary_school || 0, customer_value: surchargesObj.primary_school_customer !== undefined ? surchargesObj.primary_school_customer : (surchargesObj.primary_school || 0), is_default: true, inactive: surchargesObj.primary_school_inactive || false, ctv_inactive: surchargesObj.primary_school_ctv_inactive || false, customer_inactive: surchargesObj.primary_school_customer_inactive || false },
            raglan: { key: 'raglan', name: 'Raglan (đ/áo)', value: surchargesObj.raglan || 0, customer_value: surchargesObj.raglan_customer !== undefined ? surchargesObj.raglan_customer : (surchargesObj.raglan || 0), is_default: true, inactive: surchargesObj.raglan_inactive || false, ctv_inactive: surchargesObj.raglan_ctv_inactive || false, customer_inactive: surchargesObj.raglan_customer_inactive || false },
            color_block: { key: 'color_block', name: 'Phối màu vải (đ/áo)', value: surchargesObj.color_block || 0, customer_value: surchargesObj.color_block_customer !== undefined ? surchargesObj.color_block_customer : (surchargesObj.color_block || 0), is_default: true, inactive: surchargesObj.color_block_inactive || false, ctv_inactive: surchargesObj.color_block_ctv_inactive || false, customer_inactive: surchargesObj.color_block_customer_inactive || false }
        };
        
        const customs = {};
        if (surchargesObj.custom && Array.isArray(surchargesObj.custom)) {
            surchargesObj.custom.forEach(c => {
                const customKey = 'custom_' + c.name.replace(/\s+/g, '_');
                customs[customKey] = { key: customKey, name: c.name, value: c.value || 0, customer_value: c.customer_value !== undefined ? c.customer_value : (c.value || 0), is_default: false, inactive: c.inactive || false, ctv_inactive: c.ctv_inactive || false, customer_inactive: c.customer_inactive || false };
            });
        }
        
        if (surchargesObj.display_order && Array.isArray(surchargesObj.display_order)) {
            surchargesObj.display_order.forEach(o => {
                let matched = null;
                if (defaults[o.key]) {
                    matched = defaults[o.key];
                    matched.name = o.name;
                    matched.inactive = o.inactive !== undefined ? o.inactive : matched.inactive;
                    matched.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : matched.ctv_inactive;
                    matched.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : matched.customer_inactive;
                    delete defaults[o.key];
                } else if (customs[o.key]) {
                    matched = customs[o.key];
                    matched.name = o.name;
                    matched.inactive = o.inactive !== undefined ? o.inactive : matched.inactive;
                    matched.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : matched.ctv_inactive;
                    matched.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : matched.customer_inactive;
                    delete customs[o.key];
                } else {
                    const dk = Object.keys(defaults).find(k => defaults[k].name === o.name);
                    if (dk) {
                        matched = defaults[dk];
                        matched.inactive = o.inactive !== undefined ? o.inactive : matched.inactive;
                        matched.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : matched.ctv_inactive;
                        matched.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : matched.customer_inactive;
                        delete defaults[dk];
                    } else {
                        const ck = Object.keys(customs).find(k => customs[k].name === o.name);
                        if (ck) {
                            matched = customs[ck];
                            matched.inactive = o.inactive !== undefined ? o.inactive : matched.inactive;
                            matched.ctv_inactive = o.ctv_inactive !== undefined ? o.ctv_inactive : matched.ctv_inactive;
                            matched.customer_inactive = o.customer_inactive !== undefined ? o.customer_inactive : matched.customer_inactive;
                            delete customs[ck];
                        }
                    }
                }
                if (matched) {
                    items.push(matched);
                }
            });
        } else {
            items = Object.values(defaults);
            Object.values(customs).forEach(c => items.push(c));
        }
    }
    
    container.innerHTML = items.map((item, idx) => {
        const isDefault = item.is_default;
        const isAuto = item.is_auto;
        const opacity = item.inactive ? '0.5' : '1';
        return `
            <div class="ctv-sc-row" data-key="${item.key}" data-is-default="${isDefault}" data-is-auto="${isAuto || false}" style="display:flex; align-items:center; gap:8px; margin-bottom:8px; width: 100%; opacity: ${opacity}; transition: opacity 0.2s;">
                <div style="display:flex; flex-direction:column; gap:2px; min-width:30px; align-items:center;">
                    <button type="button" class="ctv-btn-move" onclick="_ctvMoveSurchargeRow(this, -1)" style="padding:1px 6px; font-size:10px; line-height:1; cursor:pointer;">▲</button>
                    <button type="button" class="ctv-btn-move" onclick="_ctvMoveSurchargeRow(this, 1)" style="padding:1px 6px; font-size:10px; line-height:1; cursor:pointer;">▼</button>
                </div>
                <input type="checkbox" class="ctv-sc-active" title="Sử dụng chi tiết này" ${item.inactive ? '' : 'checked'} style="width:16px; height:16px; cursor:pointer;" onchange="this.parentElement.style.opacity = this.checked ? '1' : '0.5'">
                <div style="flex-grow:1;">
                    <input type="text" class="ctv-input ctv-sc-name" placeholder="Tên chi tiết" value="${item.name}" style="width: 100%;" ${isDefault ? 'disabled' : ''}>
                </div>
                <div style="width:125px; display:flex; align-items:center; gap:6px;">
                    <input type="checkbox" class="ctv-sc-ctv-show" title="Hiển thị bên CTV" ${item.ctv_inactive ? '' : 'checked'} style="width:15px; height:15px; cursor:pointer;" onchange="this.nextElementSibling.style.opacity = this.checked ? '1' : '0.4'; this.nextElementSibling.disabled = !this.checked;">
                    <input type="text" class="ctv-input ctv-sc-value" placeholder="Giá CTV" value="${item.value}" style="flex-grow:1; text-align:center; opacity: ${item.ctv_inactive ? '0.4' : '1'};" ${item.ctv_inactive ? 'disabled' : ''} oninput="_ctvUpdateSurchargeCustomerPrice(this)">
                </div>
                <div style="width:125px; display:flex; align-items:center; gap:6px;">
                    <input type="checkbox" class="ctv-sc-customer-show" title="Hiển thị bên Khách" ${item.customer_inactive ? '' : 'checked'} style="width:15px; height:15px; cursor:pointer;" onchange="this.nextElementSibling.style.opacity = this.checked ? '1' : '0.4'; this.nextElementSibling.disabled = !this.checked;">
                    <input type="text" class="ctv-input ctv-sc-customer-value" placeholder="Giá Khách" value="${item.customer_value !== undefined ? item.customer_value : item.value}" style="flex-grow:1; text-align:center; border-color:#fed7aa; color:#c2410c; font-weight:700; opacity: ${item.customer_inactive ? '0.4' : '1'};" ${item.customer_inactive ? 'disabled' : ''}>
                </div>
                <div style="width:30px; text-align:right;">
                    ${isDefault ? '' : '<button type="button" class="ctv-remove-btn" onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-size:16px; border:none; background:none;">×</button>'}
                </div>
            </div>
        `;
    }).join('');
}

function _ctvRenderShippingRows(shippingList, shippingCustomerList) {
    const container = document.getElementById('new_cfg_shipping_container');
    const containerCust = document.getElementById('new_cfg_shipping_customer_container');
    
    if (container) {
        container.innerHTML = '';
        const list = shippingList || [
            { min_qty: "0", max_qty: "9.999.999", desc: "Không hỗ trợ vận chuyển (Nhận hàng tại xưởng)", value: 0 },
            { min_qty: "10.000.000", max_qty: "Trở lên", desc: "Miễn phí ship 1 chiều", value: 0 }
        ];
        list.forEach(item => {
            _ctvAddShippingRowInput('ctv', item.min_qty, item.max_qty, item.desc, item.value);
        });
    }
    
    if (containerCust) {
        containerCust.innerHTML = '';
        const listCust = shippingCustomerList || [
            { min_qty: "0", max_qty: "Trở lên", desc: "Miễn phí J&T thường (Khác hỗ trợ 50k)", value: 50000 }
        ];
        listCust.forEach(item => {
            _ctvAddShippingRowInput('customer', item.min_qty, item.max_qty, item.desc, item.value);
        });
    }
}

function _ctvAddShippingRowInput(target = 'ctv', min_qty = '', max_qty = '', desc = '', value = 0) {
    const containerId = target === 'customer' ? 'new_cfg_shipping_customer_container' : 'new_cfg_shipping_container';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'ctv-shipping-row';
    
    if (target === 'ctv') {
        div.style.cssText = 'display:grid; grid-template-columns: 80px 80px 1fr 30px; gap:8px; align-items:center;';
        div.innerHTML = `
            <input type="text" class="ctv-input shipping-min" value="${min_qty}" placeholder="Từ">
            <input type="text" class="ctv-input shipping-max" value="${max_qty}" placeholder="Đến">
            <input type="text" class="ctv-input shipping-desc" value="${desc}" placeholder="Chính sách vận chuyển" style="font-size:12px;">
            <div style="text-align:right;">
                <button type="button" class="ctv-remove-btn" onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-size:16px; border:none; background:none;">×</button>
            </div>
        `;
    } else {
        div.style.cssText = 'display:grid; grid-template-columns: 80px 80px 1fr 120px 30px; gap:8px; align-items:center;';
        div.innerHTML = `
            <input type="text" class="ctv-input shipping-min" value="${min_qty}" placeholder="Từ">
            <input type="text" class="ctv-input shipping-max" value="${max_qty}" placeholder="Đến">
            <input type="text" class="ctv-input shipping-desc" value="${desc}" placeholder="Chính sách vận chuyển" style="font-size:12px;">
            <input type="text" class="ctv-input shipping-value" value="${value}" placeholder="Hỗ trợ" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
            <div style="text-align:right;">
                <button type="button" class="ctv-remove-btn" onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-size:16px; border:none; background:none;">×</button>
            </div>
        `;
    }
    container.appendChild(div);
}

function _ctvAddCustomSurchargeRow(name = '', value = 0, customer_value = 0, inactive = false, ctv_inactive = false, customer_inactive = false) {
    const container = document.getElementById('new_cfg_surcharges_container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ctv-sc-row';
    div.setAttribute('data-key', 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    div.setAttribute('data-is-default', 'false');
    div.setAttribute('data-is-auto', 'false');
    div.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px; width: 100%;';
    div.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px; min-width:30px; align-items:center;">
            <button type="button" class="ctv-btn-move" onclick="_ctvMoveSurchargeRow(this, -1)" style="padding:1px 6px; font-size:10px; line-height:1; cursor:pointer;">▲</button>
            <button type="button" class="ctv-btn-move" onclick="_ctvMoveSurchargeRow(this, 1)" style="padding:1px 6px; font-size:10px; line-height:1; cursor:pointer;">▼</button>
        </div>
        <input type="checkbox" class="ctv-sc-active" title="Sử dụng chi tiết này" ${inactive ? '' : 'checked'} style="width:16px; height:16px; cursor:pointer;">
        <div style="flex-grow:1;">
            <input type="text" class="ctv-input ctv-sc-name" placeholder="Tên chi tiết" value="${name}" style="width: 100%;">
        </div>
        <div style="width:125px; display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="ctv-sc-ctv-show" title="Hiển thị bên CTV" ${ctv_inactive ? '' : 'checked'} style="width:15px; height:15px; cursor:pointer;" onchange="this.nextElementSibling.style.opacity = this.checked ? '1' : '0.4'; this.nextElementSibling.disabled = !this.checked;">
            <input type="text" class="ctv-input ctv-sc-value" placeholder="Giá CTV" value="${value}" style="flex-grow:1; text-align:center; opacity: ${ctv_inactive ? '0.4' : '1'};" ${ctv_inactive ? 'disabled' : ''} oninput="_ctvUpdateSurchargeCustomerPrice(this)">
        </div>
        <div style="width:125px; display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="ctv-sc-customer-show" title="Hiển thị bên Khách" ${customer_inactive ? '' : 'checked'} style="width:15px; height:15px; cursor:pointer;" onchange="this.nextElementSibling.style.opacity = this.checked ? '1' : '0.4'; this.nextElementSibling.disabled = !this.checked;">
            <input type="text" class="ctv-input ctv-sc-customer-value" placeholder="Giá Khách" value="${customer_value !== undefined ? customer_value : value}" style="flex-grow:1; text-align:center; border-color:#fed7aa; color:#c2410c; font-weight:700; opacity: ${customer_inactive ? '0.4' : '1'};" ${customer_inactive ? 'disabled' : ''}>
        </div>
        <div style="width:30px; text-align:right;">
            <button type="button" class="ctv-remove-btn" onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-size:16px; border:none; background:none;">×</button>
        </div>
    `;
    container.appendChild(div);
}

function _ctvUpdateSurchargeCustomerPrice(ctvInput) {
    const row = ctvInput.closest('.ctv-sc-row');
    if (!row) return;
    const custInput = row.querySelector('.ctv-sc-customer-value');
    if (custInput) {
        custInput.value = ctvInput.value;
    }
}

function _ctvSyncPetPriceField(ctvInput, targetId) {
    const target = document.getElementById(targetId);
    if (target) {
        target.value = ctvInput.value;
    }
}

function _ctvUpdateCustomerPrice(ctvInput) {
    const row = ctvInput.closest('.ctv-mat-row');
    if (!row) return;
    const customerInput = row.querySelector('.customer-price-input');
    if (!customerInput) return;
    const commissionInput = document.getElementById('new_cfg_commission_percent');
    const pct = commissionInput ? (parseFloat(commissionInput.value) || 0) : 15;
    const ctvPrice = parseFloat(ctvInput.value) || 0;
    customerInput.value = Math.round(ctvPrice * (1 + pct / 100));
}

function _ctvUpdateAllCustomerPrices() {
    const commissionInput = document.getElementById('new_cfg_commission_percent');
    const pct = commissionInput ? (parseFloat(commissionInput.value) || 0) : 15;
    document.querySelectorAll('#new_cfg_mats_container .ctv-mat-row').forEach(row => {
        const ctvInput = row.querySelector('.ctv-price-input');
        const customerInput = row.querySelector('.customer-price-input');
        if (ctvInput && customerInput) {
            const ctvPrice = parseFloat(ctvInput.value) || 0;
            customerInput.value = Math.round(ctvPrice * (1 + pct / 100));
        }
    });
}

function _ctvAddMatRowInput(name = '', price = 75000, inactive = false) {
    const container = document.getElementById('new_cfg_mats_container');
    if (!container) return;
    
    const custPrice = Math.round(price * 1.15);
    
    const div = document.createElement('div');
    div.className = 'ctv-mat-row';
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    div.style.alignItems = 'center';
    div.innerHTML = `
        <input type="checkbox" class="ctv-mat-active" title="Cho phép bán" ${inactive ? '' : 'checked'} style="width:16px; height:16px; cursor:pointer;">
        <input type="text" class="ctv-input" placeholder="Tên chất liệu" value="${name}" style="flex-grow:1;">
        <input type="number" class="ctv-input ctv-price-input" placeholder="Giá CTV" value="${price}" style="width:110px;">
        <input type="number" class="ctv-input customer-price-input" placeholder="Giá Khách" value="${custPrice}" style="width:110px; font-weight:700; color:#ea580c;">
        <button type="button" class="ctv-remove-btn" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

async function _ctvSaveNewConfigVersion() {
    const vNameInput = document.getElementById('new_cfg_version_name');
    if (!vNameInput || !vNameInput.value.trim()) {
        showToast('Vui lòng nhập tên phiên bản bảng giá mới', 'error');
        return;
    }
    
    const materials = [];
    document.querySelectorAll('#new_cfg_mats_container .ctv-mat-row').forEach(row => {
        const activeCheckbox = row.querySelector('.ctv-mat-active');
        const inactive = activeCheckbox ? !activeCheckbox.checked : false;
        const inputs = row.querySelectorAll('input:not([type="checkbox"])');
        if (inputs.length >= 3) {
            const name = inputs[0].value.trim();
            const price = parseFloat(inputs[1].value) || 0;
            const customer_price = parseFloat(inputs[2].value) || 0;
            if (name) {
                materials.push({ name, price, customer_price, inactive });
            }
        }
    });
    
    if (materials.length === 0) {
        showToast('Vui lòng thêm ít nhất một chất liệu vải', 'error');
        return;
    }
    
    // Collect ordered surcharges from rows
    const surcharges = {
        collar: 0,
        qty_under_20: 0,
        primary_school: 0,
        raglan: 0,
        color_block: 0,
        custom: [],
        display_order: []
    };
    
    document.querySelectorAll('#new_cfg_surcharges_container .ctv-sc-row').forEach(row => {
        const key = row.getAttribute('data-key');
        const isDefault = row.getAttribute('data-is-default') === 'true';
        const name = row.querySelector('.ctv-sc-name').value.trim();
        const activeCheckbox = row.querySelector('.ctv-sc-active');
        const inactive = activeCheckbox ? !activeCheckbox.checked : false;
        
        const ctvActiveCheckbox = row.querySelector('.ctv-sc-ctv-show');
        const ctv_inactive = ctvActiveCheckbox ? !ctvActiveCheckbox.checked : false;
        
        const customerActiveCheckbox = row.querySelector('.ctv-sc-customer-show');
        const customer_inactive = customerActiveCheckbox ? !customerActiveCheckbox.checked : false;
        
        const rawVal = row.querySelector('.ctv-sc-value').value.trim();
        const parsedVal = parseFloat(rawVal);
        const value = (!isNaN(parsedVal) && isFinite(parsedVal) && /^-?\d+(\.\d+)?$/.test(rawVal)) ? parsedVal : rawVal;
        
        const rawCustVal = row.querySelector('.ctv-sc-customer-value').value.trim();
        const parsedCustVal = parseFloat(rawCustVal);
        const customer_value = (!isNaN(parsedCustVal) && isFinite(parsedCustVal) && /^-?\d+(\.\d+)?$/.test(rawCustVal)) ? parsedCustVal : rawCustVal;
        
        surcharges.display_order.push({ key, name, inactive, ctv_inactive, customer_inactive });
        
        if (isDefault) {
            if (key === 'collar') {
                surcharges.collar = value;
                surcharges.collar_customer = customer_value;
                surcharges.collar_inactive = inactive;
                surcharges.collar_ctv_inactive = ctv_inactive;
                surcharges.collar_customer_inactive = customer_inactive;
            } else if (key === 'qty_under_20') {
                surcharges.qty_under_20 = value;
                surcharges.qty_under_20_customer = customer_value;
                surcharges.qty_under_20_inactive = inactive;
                surcharges.qty_under_20_ctv_inactive = ctv_inactive;
                surcharges.qty_under_20_customer_inactive = customer_inactive;
            } else if (key === 'primary_school') {
                surcharges.primary_school = value;
                surcharges.primary_school_customer = customer_value;
                surcharges.primary_school_inactive = inactive;
                surcharges.primary_school_ctv_inactive = ctv_inactive;
                surcharges.primary_school_customer_inactive = customer_inactive;
            } else if (key === 'raglan') {
                surcharges.raglan = value;
                surcharges.raglan_customer = customer_value;
                surcharges.raglan_inactive = inactive;
                surcharges.raglan_ctv_inactive = ctv_inactive;
                surcharges.raglan_customer_inactive = customer_inactive;
            } else if (key === 'color_block') {
                surcharges.color_block = value;
                surcharges.color_block_customer = customer_value;
                surcharges.color_block_inactive = inactive;
                surcharges.color_block_ctv_inactive = ctv_inactive;
                surcharges.color_block_customer_inactive = customer_inactive;
            }
        } else {
            if (name) {
                surcharges.custom.push({ name, value, customer_value, inactive, ctv_inactive, customer_inactive });
            }
        }
    });
    
    const body = {
        version_name: vNameInput.value.trim(),
        materials,
        surcharges,
        print_prices: {
            commission_percent: document.getElementById('new_cfg_commission_percent') ? (parseFloat(document.getElementById('new_cfg_commission_percent').value) || 0) : 15,
            pet: {
                inactive: !document.getElementById('new_cfg_pr_pet_active').checked,
                sheet_price: parseFloat(document.getElementById('new_cfg_pr_pet_sheet').value) || 0,
                sheet_price_customer: parseFloat(document.getElementById('new_cfg_pr_pet_sheet_cust').value) || 0,
                spacing: parseFloat(document.getElementById('new_cfg_pr_pet_space').value) || 0,
                chest_price: parseFloat(document.getElementById('new_cfg_pr_pet_chest').value) || 0,
                chest_price_customer: parseFloat(document.getElementById('new_cfg_pr_pet_chest_cust').value) || 0,
                min_position_price: parseFloat(document.getElementById('new_cfg_pr_pet_min_pos').value) || 0,
                min_position_price_customer: parseFloat(document.getElementById('new_cfg_pr_pet_min_pos_cust').value) || 0
            },
            embroidery: {
                flat_price: document.getElementById('new_cfg_pr_emb_flat').value.trim()
            },
            screen: {
                inactive: !document.getElementById('new_cfg_pr_scr_active').checked,
                qty_threshold: parseFloat(document.getElementById('new_cfg_pr_scr_threshold').value) || 0,
                price_low: parseFloat(document.getElementById('new_cfg_pr_scr_low').value) || 0,
                price_high_1_3: parseFloat(document.getElementById('new_cfg_pr_scr_high_13').value) || 0,
                price_high_4_plus: parseFloat(document.getElementById('new_cfg_pr_scr_high_4').value) || 0
            },
            print3d: {
                flat_price: parseFloat(document.getElementById('new_cfg_pr_3d_flat').value) || 30000
            },
            shipping: (function() {
                const list = [];
                document.querySelectorAll('#new_cfg_shipping_container .ctv-shipping-row').forEach(row => {
                    const min_qty = row.querySelector('.shipping-min').value.trim();
                    const max_qty = row.querySelector('.shipping-max').value.trim();
                    const desc = row.querySelector('.shipping-desc').value.trim();
                    const valEl = row.querySelector('.shipping-value');
                    const value = valEl ? (parseFloat(valEl.value) || 0) : 0;
                    list.push({ min_qty, max_qty, desc, value });
                });
                return list;
            })(),
            shipping_customer: (function() {
                const list = [];
                document.querySelectorAll('#new_cfg_shipping_customer_container .ctv-shipping-row').forEach(row => {
                    const min_qty = row.querySelector('.shipping-min').value.trim();
                    const max_qty = row.querySelector('.shipping-max').value.trim();
                    const desc = row.querySelector('.shipping-desc').value.trim();
                    const valEl = row.querySelector('.shipping-value');
                    const value = valEl ? (parseFloat(valEl.value) || 0) : 0;
                    list.push({ min_qty, max_qty, desc, value });
                });
                return list;
            })()
        },
        apply_now: document.getElementById('new_cfg_apply_now').checked
    };
    
    const editId = document.getElementById('ctv_config_new_modal')?.getAttribute('data-edit-id');
    
    try {
        const url = editId ? `/api/ctv-quotations/config/${editId}` : '/api/ctv-quotations/config';
        const method = editId ? 'PUT' : 'POST';
        
        const res = await apiFetch(url, {
            method,
            body
        });
        if (res && res.success) {
            showToast(editId ? 'Đã cập nhật cấu hình bảng giá thành công!' : 'Đã lưu cấu hình bảng giá mới!', 'success');
            document.getElementById('ctv_config_new_modal').style.display = 'none';
            // Reload page layout/active config
            await _ctvLoadActiveConfig();
            _ctvRenderPageLayout();
            
            // Switch back to settings tab
            _ctvSwitchTab('settings');
        } else {
            showToast(res.error || 'Lỗi lưu cấu hình', 'error');
        }
    } catch (e) {
        showToast('Lỗi gửi request: ' + e.message, 'error');
    }
}

// ==========================================
// VIETNAMESE MONEY TRANSLATOR
// ==========================================

function docSoTienVietNam(number) {
    if (number === 0) return 'Không đồng';
    const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    
    function docGroup3(n, showZeroHundred) {
        let hundred = Math.floor(n / 100);
        let remain = n % 100;
        let ten = Math.floor(remain / 10);
        let unit = remain % 10;
        let result = '';
        
        if (hundred > 0 || showZeroHundred) {
            result += digits[hundred] + ' trăm ';
        }
        
        if (ten > 0) {
            if (ten === 1) result += 'mười ';
            else result += digits[ten] + ' mươi ';
        } else if (hundred > 0 && unit > 0) {
            result += 'lẻ ';
        }
        
        if (unit > 0) {
            if (unit === 1 && ten > 1) result += 'mốt';
            else if (unit === 5 && ten > 0) result += 'lăm';
            else result += digits[unit];
        }
        return result.trim();
    }
    
    let strNum = String(Math.floor(number));
    let groups = [];
    while (strNum.length > 0) {
        groups.push(strNum.substring(Math.max(0, strNum.length - 3)));
        strNum = strNum.substring(0, Math.max(0, strNum.length - 3));
    }
    
    let result = '';
    let hasValueBefore = false;
    for (let i = groups.length - 1; i >= 0; i--) {
        let val = Number(groups[i]);
        if (val > 0) {
            let showZeroHundred = hasValueBefore;
            let groupStr = docGroup3(val, showZeroHundred);
            result += ' ' + groupStr + units[i];
            hasValueBefore = true;
        }
    }
    
    result = result.trim() + ' đồng';
    // Capitalize first letter
    return result.charAt(0).toUpperCase() + result.slice(1);
}
