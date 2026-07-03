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
    quantity: 10,
    selectedMaterialIndex: 0,
    surcharges: {
        collar: false,
        raglan: false,
        color_block: false,
        primary_school: false
    },
    // Print config
    printType: 'none', // none, pet, print3d, screen, embroidery
    // PET Shapes list
    petShapes: [], // { width, height, qty_per_shirt, mode: 'aligned'|'nested' }
    // Screen print state
    screenColors: 1,
    // Embroidery state
    embroideryCost: 15000,
    // 3D printing cost state
    print3dCost: 30000,
    petChestPrint: false,
    
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
                background: none;
                border: none;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 700;
                color: #64748b;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .baogiactvhh-tabs .tab-btn:hover {
                color: #1e3a8a;
                background-color: #f1f5f9;
            }
            .baogiactvhh-tabs .tab-btn.active {
                color: white;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
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
                grid-template-columns: 1fr 1fr 1fr auto;
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
                #ctv_print_export_modal_content, #ctv_print_export_modal_content * {
                    visibility: visible;
                }
                #ctv_print_export_modal_content {
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
                ${_ctvState.activeConfig ? `
                    <div style="background: rgba(255,255,255,0.2); padding: 8px 14px; border-radius: 10px; text-align: right;">
                        <div style="font-size: 11px; font-weight: 700; opacity: 0.9;">BIỂU PHÍ HIỆN TẠI:</div>
                        <div style="font-size: 14px; font-weight: 800;">${_ctvState.activeConfig.version_name}</div>
                    </div>
                ` : ''}
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
    
    container.innerHTML = `
        <div class="ctv-grid">
            <!-- Left Side: Inputs -->
            <div>
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
                            ${config.materials.map((m, idx) => `
                                <option value="${idx}" ${idx === _ctvState.selectedMaterialIndex ? 'selected' : ''}>
                                    ${m.name} - ${Number(m.price).toLocaleString('vi-VN')} đ (May cổ tròn)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="ctv-form-group">
                        <label>Các phụ phí tùy chọn</label>
                        <div class="ctv-checkbox-group">
                            ${(function() {
                                const ordered = _ctvGetOrderedOptionalSurcharges(config);
                                return ordered.map(item => {
                                    const isChecked = _ctvState.surcharges[item.key] ? 'checked' : '';
                                    const priceInfo = _ctvGetPriceInfo(item.value);
                                    const safeId = 'ctv_sc_' + item.key.replace(/\s+/g, '_');
                                    return `
                                        <label class="ctv-checkbox-label">
                                            <input type="checkbox" id="${safeId}" ${isChecked} onchange="_ctvToggleSurcharge('${item.key}', this.checked)">
                                            ${item.name} (${priceInfo.text})
                                        </label>
                                    `;
                                }).join('');
                            })()}
                        </div>
                    </div>
                </div>
                
                <!-- Print Configuration -->
                <div class="ctv-card">
                    <div class="ctv-card-title">🎨 Phương Án In / Thêu</div>
                    <div class="ctv-form-group">
                        <label>Loại hình in/thêu</label>
                        <select class="ctv-select" id="ctv_print_type" onchange="_ctvOnPrintTypeChange(this.value)">
                            <option value="none" ${_ctvState.printType === 'none' ? 'selected' : ''}>Không in/thêu</option>
                            <option value="pet" ${_ctvState.printType === 'pet' ? 'selected' : ''}>In PET CTV</option>
                            <option value="print3d" ${_ctvState.printType === 'print3d' ? 'selected' : ''}>In 3D CTV</option>
                            <option value="screen" ${_ctvState.printType === 'screen' ? 'selected' : ''}>In Lưới CTV</option>
                            <option value="embroidery" ${_ctvState.printType === 'embroidery' ? 'selected' : ''}>Thêu CTV</option>
                        </select>
                    </div>
                    
                    <!-- Dynamic Print Panel -->
                    <div id="ctv_print_panel"></div>
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
    _ctvState.quantity = Math.max(1, Number(val) || 1);
    _ctvUpdateCalculations();
}

function _ctvOnMaterialChange(idx) {
    _ctvState.selectedMaterialIndex = Number(idx);
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
        collar: { key: 'collar', name: 'Cổ bẻ', value: config.surcharges.collar || 0 },
        primary_school: { key: 'primary_school', name: 'Tiểu học', value: config.surcharges.primary_school || 0 },
        raglan: { key: 'raglan', name: 'Raglan', value: config.surcharges.raglan || 0 },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: config.surcharges.color_block || 0 }
    };
    const customList = config.surcharges?.custom || [];
    customList.forEach(item => {
        const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
        allItems[customKey] = { key: customKey, name: item.name, value: item.value || 0, is_custom: true };
    });
    let ordered = [];
    if (config.surcharges?.display_order && Array.isArray(config.surcharges.display_order)) {
        config.surcharges.display_order.forEach(o => {
            let found = null;
            if (o.key && allItems[o.key]) {
                found = allItems[o.key];
                found.name = o.name || found.name; // Keep edited name
                delete allItems[o.key];
            } else {
                const matchedKey = Object.keys(allItems).find(k => allItems[k].name === o.name || allItems[k].key === o.name);
                if (matchedKey) {
                    found = allItems[matchedKey];
                    found.name = o.name || found.name; // Keep edited name
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
    return ordered;
}

function _ctvGetOrderedSurchargesList(surchargesObj) {
    if (!surchargesObj) return [];
    const defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: surchargesObj.collar || 0, is_default: true },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: surchargesObj.qty_under_20 || 0, is_default: true, is_auto: true },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: surchargesObj.primary_school || 0, is_default: true },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: surchargesObj.raglan || 0, is_default: true },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: surchargesObj.color_block || 0, is_default: true }
    };
    const customList = surchargesObj.custom || [];
    const customs = {};
    customList.forEach(c => {
        const customKey = 'custom_' + c.name.replace(/\s+/g, '_');
        customs[customKey] = { key: customKey, name: c.name, value: c.value || 0, is_default: false };
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
    _ctvRenderPrintPanel();
    _ctvUpdateCalculations();
}

function _ctvRenderPrintPanel() {
    const panel = document.getElementById('ctv_print_panel');
    if (!panel) return;
    
    if (_ctvState.printType === 'none') {
        panel.innerHTML = '';
        return;
    }
    
    const config = _ctvState.activeConfig;
    
    if (_ctvState.printType === 'pet') {
        const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
        const chestPrice = petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000;
        panel.innerHTML = `
            <div class="ctv-print-config-box">
                <h4>🧬 In PET Báo Giá CTV</h4>
                <div style="font-size:12px; color:#0d9488; margin-bottom:12px;">
                    Biểu phí cấu hình: <strong>${petConfig.sheet_price.toLocaleString('vi-VN')} đ/khổ mét (58x100cm)</strong>. Khoảng cách an toàn hình in: <strong>${petConfig.spacing} cm</strong>.
                </div>
                
                <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:10px; padding:12px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:700; color:#0369a1; cursor:pointer; margin:0; width: 100%;">
                        <input type="checkbox" id="ctv_pet_chest_print" ${_ctvState.petChestPrint ? 'checked' : ''} onchange="_ctvTogglePetChestPrint(this.checked)" style="transform:scale(1.2); margin-right: 4px;">
                        🎯 In PET Ngực (Cố định +${chestPrice.toLocaleString('vi-VN')} đ/áo)
                    </label>
                </div>
                
                <div class="ctv-pet-shape-form">
                    <div>
                        <label style="font-size:11px; font-weight:700; color:#0f766e;">Rộng (cm)</label>
                        <input type="number" class="ctv-input" id="ctv_pet_w" step="0.1" value="10">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:700; color:#0f766e;">Cao (cm)</label>
                        <input type="number" class="ctv-input" id="ctv_pet_h" step="0.1" value="10">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:700; color:#0f766e;">SL/Áo</label>
                        <input type="number" class="ctv-input" id="ctv_pet_qty" value="1" min="1">
                    </div>
                    <button type="button" class="ctv-btn-secondary" style="padding: 10px 14px;" onclick="_ctvAddPetShape()">Thêm</button>
                </div>
                
                <div id="ctv_pet_shapes_list"></div>
            </div>
        `;
        _ctvRenderPetShapesList();
    } else if (_ctvState.printType === 'print3d') {
        const config3d = config.print_prices.print3d || { flat_price: 30000 };
        const flatPrice = Number(config3d.flat_price) || 30000;
        panel.innerHTML = `
            <div class="ctv-print-config-box" style="border-color:#38bdf8; background:#f0f9ff; color:#0369a1;">
                <h4 style="color:#0284c7;">🌀 In 3D Toàn Thân CTV</h4>
                <div style="font-size:12.5px; line-height:1.5; margin-bottom:10px;">
                    Giá in 3D tính theo <strong>đ/áo</strong>. Giá cấu hình mặc định: <strong>${flatPrice.toLocaleString('vi-VN')} đ/áo</strong>.
                </div>
                <div class="ctv-form-group" style="margin-bottom:0;">
                    <label style="color:#0284c7;">Giá in 3D (đ/áo)</label>
                    <input type="text" class="ctv-input" id="ctv_3d_cost" value="${_ctvState.print3dCost}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); _ctvOn3dCostChange(this.value)">
                </div>
            </div>
        `;
    } else if (_ctvState.printType === 'screen') {
        const screenConfig = config.print_prices.screen || { qty_threshold: 20 };
        panel.innerHTML = `
            <div class="ctv-print-config-box" style="border-color:#a855f7; background:#faf5ff; color:#6b21a8;">
                <h4 style="color:#7e22ce;">🎨 In Lưới (Screen Print) CTV</h4>
                <div style="font-size:12px; margin-bottom:12px;">
                    Mức tối thiểu đơn hàng: <strong>${screenConfig.qty_threshold} áo</strong>. Bảng giá in lưới được cấu hình riêng theo số lượng & màu sắc.
                </div>
                <div class="ctv-form-group" style="margin-bottom:0;">
                    <label style="color:#7e22ce;">Số màu in lưới</label>
                    <input type="number" class="ctv-input" id="ctv_screen_colors" min="1" value="${_ctvState.screenColors}" oninput="_ctvOnScreenColorsChange(this.value)">
                </div>
            </div>
        `;
    } else if (_ctvState.printType === 'embroidery') {
        const embConfig = config.print_prices.embroidery || { flat_price: 15000 };
        panel.innerHTML = `
            <div class="ctv-print-config-box" style="border-color:#f59e0b; background:#fffbeb; color:#92400e;">
                <h4 style="color:#b45309;">🧵 Thêu Vi Tính CTV</h4>
                <div class="ctv-form-group" style="margin-bottom:0;">
                    <label style="color:#b45309;">Giá thêu trên mỗi áo (đ/áo)</label>
                    <input type="text" class="ctv-input" id="ctv_emb_cost" value="${_ctvState.embroideryCost}" oninput="_ctvOnEmbCostChange(this.value)">
                </div>
            </div>
        `;
    }
}

function _ctvOnScreenColorsChange(val) {
    _ctvState.screenColors = Math.max(1, Number(val) || 1);
    _ctvUpdateCalculations();
}

function _ctvOnEmbCostChange(val) {
    _ctvState.embroideryCost = val;
    _ctvUpdateCalculations();
}

function _ctvAddPetShape() {
    const wInput = document.getElementById('ctv_pet_w');
    const hInput = document.getElementById('ctv_pet_h');
    const qtyInput = document.getElementById('ctv_pet_qty');
    
    if (!wInput || !hInput || !qtyInput) return;
    
    const w = parseFloat(wInput.value) || 0;
    const h = parseFloat(hInput.value) || 0;
    const qty = parseInt(qtyInput.value) || 0;
    
    if (w <= 0 || h <= 0 || qty <= 0) {
        showToast('Vui lòng nhập kích thước và số lượng hình in hợp lệ', 'error');
        return;
    }
    
    _ctvState.petShapes.push({
        width: w,
        height: h,
        qty_per_shirt: qty,
        mode: 'aligned' // Mode xếp thẳng hàng mặc định
    });
    
    _ctvRenderPetShapesList();
    _ctvUpdateCalculations();
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
                    <th>Kích thước</th>
                    <th>SL/áo</th>
                    <th>Cách xếp</th>
                    <th>Xóa</th>
                </tr>
            </thead>
            <tbody>
                ${_ctvState.petShapes.map((s, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${s.width} x ${s.height} cm</td>
                        <td>${s.qty_per_shirt} hình</td>
                        <td>
                            <select onchange="_ctvUpdateShapeMode(${idx}, this.value)" style="padding:2px 4px; font-size:11px; border-radius:4px;">
                                <option value="aligned" ${s.mode === 'aligned' ? 'selected' : ''}>Xếp thẳng</option>
                                <option value="nested" ${s.mode === 'nested' ? 'selected' : ''}>Xếp tối ưu</option>
                            </select>
                        </td>
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

function _ctvCalculateAllCosts() {
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
    if (qty < 20) {
        const priceInfo = _ctvGetPriceInfo(config.surcharges.qty_under_20);
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
            const priceInfo = _ctvGetPriceInfo(item.value);
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
    const pt = _ctvState.printType;
    
    if (pt === 'pet') {
        const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
        const sheetPrice = Number(petConfig.sheet_price) || 60000;
        const spacing = Number(petConfig.spacing) || 0.4;
        const chestPrice = petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000;
        const minPositionPrice = petConfig.min_position_price !== undefined ? Number(petConfig.min_position_price) : 5000;
        
        // Add flat chest print if enabled
        if (_ctvState.petChestPrint) {
            printCost += chestPrice;
            printBreakdown.push({ label: `In PET Ngực (cố định)`, price: chestPrice });
        }
        
        _ctvState.petShapes.forEach((s, idx) => {
            const packed = _ctvState.activeConfig ? _ctvCalcPetPlacement(58, 100, s.width, s.height, spacing) : { aligned: 0, optimized: 0 };
            const perSheetCount = s.mode === 'nested' ? packed.optimized : packed.aligned;
            
            if (perSheetCount > 0) {
                const sheetFraction = s.qty_per_shirt / perSheetCount;
                let costPerShirt = Math.round(sheetFraction * sheetPrice);
                let labelText = `PET #${idx+1}: ${s.width}x${s.height}cm (${s.qty_per_shirt} hình, xếp ${s.mode === 'nested' ? 'tối ưu' : 'thẳng'})`;
                
                if (costPerShirt < minPositionPrice) {
                    costPerShirt = minPositionPrice;
                    labelText += ` (Tối thiểu ${minPositionPrice.toLocaleString('vi-VN')}đ)`;
                }
                
                printCost += costPerShirt;
                printBreakdown.push({
                    label: labelText,
                    price: costPerShirt
                });
            }
        });
    } else if (pt === 'print3d') {
        // In 3D CTV: tính đơn giản theo đ/áo (flat_price)
        const flatPrice = Number(_ctvState.print3dCost) || 0;
        printCost = flatPrice;
        printBreakdown.push({ label: `In 3D toàn thân (${flatPrice.toLocaleString('vi-VN')} đ/áo)`, price: flatPrice });
    } else if (pt === 'screen') {
        const configScreen = config.print_prices.screen || { qty_threshold: 20, price_low: 60000, price_high_1_3: 4000, price_high_4_plus: 3500 };
        const colors = _ctvState.screenColors;
        const threshold = configScreen.qty_threshold || 20;
        let singleScreenPrice = 0;
        
        if (qty < threshold) {
            const totalOrderCost = configScreen.price_low * colors;
            singleScreenPrice = Math.round(totalOrderCost / qty);
            printBreakdown.push({ label: `In lưới dưới hạn (${colors} màu, phân bổ đơn)`, price: singleScreenPrice });
        } else {
            if (colors <= 3) {
                singleScreenPrice = configScreen.price_high_1_3 * colors;
            } else {
                singleScreenPrice = configScreen.price_high_4_plus * colors;
            }
            printBreakdown.push({ label: `In lưới (${colors} màu, đơn giá/áo)`, price: singleScreenPrice });
        }
        printCost = singleScreenPrice;
    } else if (pt === 'embroidery') {
        const embInfo = _ctvGetEmbPriceInfo(_ctvState.embroideryCost);
        if (embInfo.isContact) {
            printCost = 0;
            printBreakdown.push({ label: `Thêu vi tính: ${embInfo.text}`, price: 0, isContact: true, contactText: embInfo.text });
        } else {
            printCost = embInfo.value;
            printBreakdown.push({ label: `Thêu vi tính đồng giá`, price: printCost });
        }
    }
    
    const finalPricePerShirt = basePrice + surchargeTotal + printCost;
    const grandTotal = finalPricePerShirt * qty;
    
    return {
        materialName,
        basePrice,
        surchargesBreakdown,
        surchargeTotal,
        printBreakdown,
        printCost,
        finalPricePerShirt,
        grandTotal
    };
}

function _ctvUpdateCalculations() {
    const card = document.getElementById('ctv_result_card');
    if (!card) return;
    
    const calc = _ctvCalculateAllCosts();
    if (!calc) {
        card.innerHTML = `<div style="text-align:center; padding:20px; font-style:italic;">Không thể tính toán chi phí. Vui lòng kiểm tra cấu hình bảng giá.</div>`;
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
            <strong style="color:white;">${_ctvState.quantity} áo</strong>
        </div>
        
        <div style="border-top:1px solid rgba(255,255,255,0.1); margin:12px 0; padding-top:12px;">
            <div class="ctv-result-row">
                <span>Phôi trơn: <strong>${calc.materialName}</strong></span>
                <span>${calc.basePrice.toLocaleString('vi-VN')} đ/áo</span>
            </div>
        </div>
        
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
            materialName: calc.materialName
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
            _ctvRenderSelectedCustomer();
            _ctvRenderPrintPanel();
            _ctvUpdateCalculations();
            
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

// Open beautiful printable export modal popup
function _ctvOpenExportModal() {
    const calc = _ctvCalculateAllCosts();
    if (!calc) return;
    
    const hasCustomer = !!_ctvState.selectedCustomer;
    const name = hasCustomer ? _ctvState.selectedCustomer.customer_name : 'Quý Khách Hàng';
    const phone = hasCustomer ? _ctvState.selectedCustomer.phone : 'Chưa có SĐT';
    const code = 'BGCTV-' + Math.floor(Math.random()*900000 + 100000);
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
                <h3 style="margin:0; font-size:16px; font-weight:800; color:#1e293b;">🖨️ Xuất Bản Báo Giá Chi Tiết</h3>
                <button onclick="_ctvCloseExportModal()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">×</button>
            </div>
            
            <!-- Printable Bill area -->
            <div style="padding:40px; overflow-y:auto; flex-grow:1;" id="ctv_print_export_modal_content">
                <div style="font-family:'Inter', sans-serif; color:#1e293b; line-height:1.5;">
                    <!-- Company Info -->
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:30px; border-bottom:3px double #e2e8f0; padding-bottom:20px;">
                        <div>
                            <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:900; color:#1e3a8a; letter-spacing:-0.5px;">XƯỞNG MAY ĐỒNG PHỤC HV</h1>
                            <p style="margin:0; font-size:12px; color:#475569;">📍 Địa chỉ: Xưởng may Đồng Phục HV, Hà Nội</p>
                            <p style="margin:2px 0 0 0; font-size:12px; color:#475569;">📞 Điện thoại: 0988.888.888 | Website: dongphuchv.net</p>
                        </div>
                        <div style="text-align:right;">
                            <h2 style="margin:0 0 4px 0; font-size:14px; font-weight:800; color:#475569;">BẢNG BÁO GIÁ ĐẠI LÝ / CTV</h2>
                            <p style="margin:0; font-size:11px; color:#64748b;">Mã số: <strong>${code}</strong></p>
                            <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Ngày lập: ${dateStr}</p>
                        </div>
                    </div>
                    
                    <!-- Customer details -->
                    <div style="background:#f8fafc; border-radius:10px; padding:16px; margin-bottom:24px; border:1px solid #e2e8f0;">
                        <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px;">Kính gửi khách hàng</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:13px;">
                            <div>• Tên Đại lý/CTV: <strong>${name}</strong></div>
                            <div>• Số điện thoại: <strong>${phone}</strong></div>
                            <div>• Số lượng: <strong>${_ctvState.quantity} chiếc</strong></div>
                            <div>• Kiểu dáng may: <strong>Áo thun đồng phục cổ tròn</strong></div>
                        </div>
                    </div>
                    
                    <!-- Price breakdown list -->
                    <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px;">Chi tiết đơn giá sản xuất</h3>
                    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:24px; border:1px solid #cbd5e1;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="border:1px solid #cbd5e1; padding:10px; text-align:left;">Hạng mục sản xuất</th>
                                <th style="border:1px solid #cbd5e1; padding:10px; text-align:right; width:150px;">Đơn giá (đ/áo)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border:1px solid #cbd5e1; padding:10px;">
                                    <strong>May phôi trơn:</strong> Vải ${calc.materialName} (Chưa bao gồm in ấn/sửa đổi)
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:10px; text-align:right;">
                                    ${calc.basePrice.toLocaleString('vi-VN')} đ
                                </td>
                            </tr>
                            ${calc.surchargesBreakdown.map(s => `
                                <tr>
                                    <td style="border:1px solid #cbd5e1; padding:10px; padding-left:24px; color:#475569;">
                                        + Phụ phí: ${s.label}
                                    </td>
                                    <td style="border:1px solid #cbd5e1; padding:10px; text-align:right; color:#475569;">
                                        ${s.isContact ? s.contactText : `${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ`}
                                    </td>
                                </tr>
                            `).join('')}
                            ${calc.printBreakdown.map(p => `
                                <tr>
                                    <td style="border:1px solid #cbd5e1; padding:10px; padding-left:24px; color:#0d9488;">
                                        + Công nghệ in/thêu: ${p.label}
                                    </td>
                                    <td style="border:1px solid #cbd5e1; padding:10px; text-align:right; color:#0d9488;">
                                        ${p.isContact ? p.contactText : `+${p.price.toLocaleString('vi-VN')} đ`}
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="background:#f8fafc; font-weight:800; font-size:14px;">
                                <td style="border:1px solid #cbd5e1; padding:12px; text-align:right;">
                                    CỘNG ĐƠN GIÁ TRÊN MỖI ÁO:
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:12px; text-align:right; color:#1e3a8a;">
                                    ${finalPricePerShirtText}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Grand total and words -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:20px; background:#f8fafc; text-align:right; margin-bottom:30px;">
                        <div style="font-size:12px; color:#64748b; margin-bottom:6px; font-style:italic;">* Giá chưa bao gồm VAT</div>
                        <div style="font-size:14px; color:#475569; margin-bottom:6px;">TỔNG TIỀN THANH TOÁN (${_ctvState.quantity} áo):</div>
                        <div style="font-size:24px; font-weight:950; color:#1e3a8a;">${grandTotalText}</div>
                        <div style="font-size:13px; font-style:italic; color:#0369a1; margin-top:8px;">
                            Bằng chữ: <strong>${wordsText}</strong>
                        </div>
                    </div>
                    
                    <!-- Footer signatures -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; text-align:center; font-size:13px; margin-top:40px;">
                        <div>
                            <p style="margin:0 0 60px 0; font-weight:700;">ĐẠI DIỆN KHÁCH HÀNG</p>
                            <p style="margin:0; color:#64748b; font-style:italic;">(Ký và ghi rõ họ tên)</p>
                        </div>
                        <div>
                            <p style="margin:0 0 60px 0; font-weight:700; color:#1e3a8a;">ĐẠI DIỆN XƯỞNG MAY ĐỒNG PHỤC HV</p>
                            <p style="margin:0; font-weight:800; color:#1e3a8a;">NGƯỜI LẬP BIỂU</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modal actions -->
            <div class="no-print" style="padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; background:#f8fafc; border-bottom-left-radius:16px; border-bottom-right-radius:16px;">
                <button class="ctv-btn-secondary" onclick="_ctvCopyTextQuotation()">📋 Sao chép text nhanh</button>
                <button class="ctv-btn-secondary" style="background:#1e3a8a; color:white; border-color:#1e3a8a;" onclick="window.print()">🖨️ In / Tải PDF</button>
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
    
    const hasCustomer = !!_ctvState.selectedCustomer;
    const name = hasCustomer ? _ctvState.selectedCustomer.customer_name : 'Quý Khách Hàng';
    const phone = hasCustomer ? _ctvState.selectedCustomer.phone : 'Chưa có SĐT';
    const dateStr = vnDateStr(vnNow());
    
    let text = `🤝 BÁO GIÁ ĐẠI LÝ / CỘNG TÁC VIÊN 🤝\n`;
    text += `Ngày lập: ${dateStr}\n`;
    text += `----------------------------------------\n`;
    text += `• Tên Khách hàng: ${name}\n`;
    text += `• Số điện thoại: ${phone}\n`;
    text += `• Kiểu dáng: Áo thun cổ tròn\n`;
    text += `• Chất liệu vải: ${calc.materialName}\n`;
    text += `• Số lượng đặt: ${_ctvState.quantity} áo\n`;
    text += `----------------------------------------\n`;
    text += `• Đơn giá phôi trơn: ${calc.basePrice.toLocaleString('vi-VN')} đ/áo\n`;
    
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
        petChestPrint: q.input_details.petChestPrint || false
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
    
    _ctvOpenExportModal();
    
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

function _ctvPreviewConfigDetails(id) {
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

    // Sort surcharge items by configured display order (only show items in display_order)
    let surchargeItems = [];
    const _defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: sc.collar || 0, is_default: true },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: sc.qty_under_20 || 0, is_default: true },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: sc.primary_school || 0, is_default: true },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: sc.raglan || 0, is_default: true },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: sc.color_block || 0, is_default: true }
    };
    const _customs = {};
    if (sc.custom && Array.isArray(sc.custom)) {
        sc.custom.forEach(item => {
            if (item && item.name) {
                const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
                _customs[customKey] = { key: customKey, name: item.name, value: item.value || 0, is_default: false };
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
                delete _defaults[oKey];
            } else if (_customs[oKey]) {
                found = _customs[oKey];
                found.name = oName || found.name;
                delete _customs[oKey];
            } else {
                const dk = Object.keys(_defaults).find(k => _defaults[k].name === oName || _defaults[k].key === oName);
                if (dk) {
                    found = _defaults[dk];
                    found.name = oName || found.name;
                    delete _defaults[dk];
                } else {
                    const ck = Object.keys(_customs).find(k => _customs[k].name === oName || _customs[k].key === oName);
                    if (ck) {
                        found = _customs[ck];
                        found.name = oName || found.name;
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
            
            <!-- Header section -->
            <div style="padding:20px 24px; background:linear-gradient(135deg, #1e293b, #0f172a); display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #3b82f6;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <div style="font-size:11px; font-weight:800; color:#3b82f6; text-transform:uppercase; letter-spacing:1.5px;">Bảng Chi Tiết Biểu Phí</div>
                    <h3 style="margin:0; font-size:18px; font-weight:900; color:white; display:flex; align-items:center; gap:8px;">
                        📋 ${c.version_name}
                    </h3>
                </div>
                <button onclick="document.getElementById('ctv_config_preview_modal').style.display='none'" style="background:rgba(255,255,255,0.1); border:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer; color:#cbd5e1; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'; this.style.color='#ef4444';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#cbd5e1';">×</button>
            </div>
            
            <!-- Brand watermark block (nền và chữ ảnh 1 ở dưới ảnh 3) -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: linear-gradient(135deg, #1e3b8a, #2563eb); color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.15); border-bottom: 1px solid rgba(226, 232, 240, 0.1);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 900; font-size: 14px; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">⚡ ĐỒNG PHỤC HV</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; opacity: 0.95; letter-spacing: 0.5px; text-transform: uppercase;">
                    HỆ THỐNG BIỂU PHÍ CTV & ĐẠI LÝ CHÍNH THỨC
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div style="padding:24px; overflow-y:auto; font-size:13px; line-height:1.6; flex-grow:1; background:#f8fafc; display:flex; flex-direction:column; gap:20px;">
                
                <!-- Two Column Layout for Fabrics and Surcharges -->
                <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 20px;">
                    
                    <!-- Column 1: Fabric Prices -->
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;">
                        <div style="font-weight: 800; color: #1e3a8a; font-size: 13.5px; border-bottom: 2.5px solid #3b82f6; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                            👕 ĐƠN GIÁ PHÔI TRƠN (CỔ TRÒN)
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${mats.map(m => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9;">
                                    <span style="font-weight: 700; color: #334155; font-size:12.5px;">${m.name}</span>
                                    <span style="background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12px; border: 1px solid #dbeafe;">
                                        ${Number(m.price).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Column 2: Surcharges & Extra Details -->
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;">
                        <div style="font-weight: 800; color: #0d9488; font-size: 13.5px; border-bottom: 2.5px solid #0d9488; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                            ➕ BẢNG PHỤ PHÍ & CHI TIẾT THÊM
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${surchargeItems.map(item => {
                                const priceInfo = _ctvGetPriceInfo(item.value);
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
                        🎨 CẤU HÌNH PHƯƠNG ÁN IN / THÊU CTV
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                        
                        <!-- PET Card -->
                        <div style="background: #fdfcff; border: 1px solid #f3e8ff; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-weight: 800; color: #6b21a8; font-size: 12px; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed #e9d5ff; padding-bottom: 6px; margin-bottom: 2px;">
                                🧬 IN PET KHỔ MÉT
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b; font-weight:600;">Khổ mét (58x100cm):</span>
                                    <strong style="color:#0f172a; font-weight:750;">${Number(pr.pet?.sheet_price).toLocaleString('vi-VN')}đ</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b; font-weight:600;">Khoảng cách an toàn:</span>
                                    <strong style="color:#0f172a; font-weight:750;">${pr.pet?.spacing} cm</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b; font-weight:600;">In PET Ngực (cố định):</span>
                                    <strong style="color:#0f172a; font-weight:750;">+${Number(pr.pet?.chest_price || 5000).toLocaleString('vi-VN')}đ/áo</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#64748b; font-weight:600;">Tối thiểu/Vị trí khác:</span>
                                    <strong style="color:#0f172a; font-weight:750;">${Number(pr.pet?.min_position_price || 5000).toLocaleString('vi-VN')}đ/vị trí</strong>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Embroidery and 3D Print Card -->
                        <div style="background: #fcfaff; border: 1px solid #fae8ff; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-weight: 800; color: #86198f; font-size: 12px; display: flex; align-items: center; gap: 4px; border-bottom: 1px dashed #f5d0fe; padding-bottom: 6px; margin-bottom: 2px;">
                                ⚡ THÊU VI TÍNH & IN 3D TOÀN THÂN
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; justify-content: center; height: 100%;">
                                <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0;">
                                    <span style="color:#64748b; font-weight:600;">Thêu vi tính đồng giá:</span>
                                    <strong style="color:#0f172a; font-weight:750; background:#fae8ff; padding:2px 8px; border-radius:6px;">
                                        ${(() => {
                                            const val = pr.embroidery?.flat_price;
                                            const isNum = !isNaN(parseFloat(val)) && isFinite(val);
                                            return isNum ? Number(val).toLocaleString('vi-VN') + 'đ/áo' : (val || 'Liên hệ');
                                        })()}
                                    </strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0;">
                                    <span style="color:#64748b; font-weight:600;">In 3D toàn thân (tính theo áo):</span>
                                    <strong style="color:#0f172a; font-weight:750; background:#f5d0fe; padding:2px 8px; border-radius:6px;">${Number(pr.print3d?.flat_price || 30000).toLocaleString('vi-VN')}đ/áo</strong>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Screen Printing Card (Span 2) -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; grid-column: span 2; display: flex; flex-direction: column; gap: 8px;">
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
                        
                    </div>
                </div>
                
            </div>
            
            <!-- Footer -->
            <div style="padding:16px 24px; border-top:1px solid #e2e8f0; text-align:right; background:#f8fafc; border-bottom-left-radius:24px; border-bottom-right-radius:24px; display:flex; justify-content:flex-end;">
                <button class="ctv-btn-secondary" onclick="document.getElementById('ctv_config_preview_modal').style.display='none'" style="padding:8px 24px; border-radius:10px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;">Đóng</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function _ctvOpenNewConfigForm(editId = null) {
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
    
    const matRows = (cfg.materials || []).map((m, idx) => `
        <div class="ctv-mat-row" style="display:flex; gap:8px; margin-bottom:8px;">
            <input type="text" class="ctv-input" placeholder="Tên chất liệu" value="${m.name}" style="flex-grow:1;">
            <input type="number" class="ctv-input" placeholder="Đơn giá" value="${m.price}" style="width:120px;">
            <button type="button" class="ctv-remove-btn" onclick="this.parentElement.remove()">×</button>
        </div>
    `).join('');
    
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
                <div id="new_cfg_mats_container">
                    ${matRows}
                </div>
                
                <!-- Chi tiết thêm setup -->
                <h4 style="margin:20px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; display:flex; justify-content:space-between;">
                    <span>➕ Thiết Lập Chi Tiết Thêm</span>
                    <button class="ctv-btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="_ctvAddCustomSurchargeRow()">+ Thêm chi tiết</button>
                </h4>
                <div id="new_cfg_surcharges_container" style="display:flex; flex-direction:column; gap:4px; max-height:250px; overflow-y:auto; padding-right:4px;">
                    <!-- Will be populated by _ctvRenderSurchargeRows -->
                </div>
                
                <!-- Printing setup -->
                <h4 style="margin:20px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">🎨 Thiết Lập Giá In CTV</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- PET -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
                        <strong style="color:#0d9488;">🧬 In PET</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:8px;">
                            <label>Giá mét PET (58x100cm)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_sheet" value="${cfg.print_prices?.pet?.sheet_price || 60000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                        <div class="ctv-form-group" style="margin-bottom:8px;">
                            <label>Khoảng cách spacing (cm)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_space" value="${cfg.print_prices?.pet?.spacing || 0.4}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')">
                        </div>
                        <div class="ctv-form-group" style="margin-bottom:8px;">
                            <label>Giá in PET Ngực (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_chest" value="${cfg.print_prices?.pet?.chest_price || 5000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                        <div class="ctv-form-group" style="margin-bottom:0;">
                            <label>Giá tối thiểu/vị trí khác (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_min_pos" value="${cfg.print_prices?.pet?.min_position_price || 5000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                    </div>
                    
                    <!-- Embroidery -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
                        <strong style="color:#b45309;">🧵 Thêu Vi Tính</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:0;">
                            <label>Giá thêu đồng giá (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_emb_flat" value="${cfg.print_prices?.embroidery?.flat_price || 15000}">
                        </div>
                    </div>
                    
                    <!-- Screen Print -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; grid-column: span 2;">
                        <strong style="color:#7e22ce;">🎨 In Lưới (Screen)</strong>
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
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; grid-column: span 2;">
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
            collar: { key: 'collar', name: 'Cổ Bẻ (đ/áo)', value: surchargesObj.collar || 0, is_default: true },
            qty_under_20: { key: 'qty_under_20', name: 'Đơn Hàng < 20 Áo (đ/áo)', value: surchargesObj.qty_under_20 || 0, is_default: true, is_auto: true },
            primary_school: { key: 'primary_school', name: 'Chiết Khấu Tiểu Học (đ/áo, nhập âm để giảm)', value: surchargesObj.primary_school || 0, is_default: true },
            raglan: { key: 'raglan', name: 'Raglan (đ/áo)', value: surchargesObj.raglan || 0, is_default: true },
            color_block: { key: 'color_block', name: 'Phối màu vải (đ/áo)', value: surchargesObj.color_block || 0, is_default: true }
        };
        
        const customs = {};
        if (surchargesObj.custom && Array.isArray(surchargesObj.custom)) {
            surchargesObj.custom.forEach(c => {
                const customKey = 'custom_' + c.name.replace(/\s+/g, '_');
                customs[customKey] = { key: customKey, name: c.name, value: c.value || 0, is_default: false };
            });
        }
        
        if (surchargesObj.display_order && Array.isArray(surchargesObj.display_order)) {
            surchargesObj.display_order.forEach(o => {
                let matched = null;
                if (defaults[o.key]) {
                    matched = defaults[o.key];
                    matched.name = o.name;
                    delete defaults[o.key];
                } else if (customs[o.key]) {
                    matched = customs[o.key];
                    matched.name = o.name;
                    delete customs[o.key];
                } else {
                    const dk = Object.keys(defaults).find(k => defaults[k].name === o.name);
                    if (dk) {
                        matched = defaults[dk];
                        delete defaults[dk];
                    } else {
                        const ck = Object.keys(customs).find(k => customs[k].name === o.name);
                        if (ck) {
                            matched = customs[ck];
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
        return `
            <div class="ctv-sc-row" data-key="${item.key}" data-is-default="${isDefault}" data-is-auto="${isAuto || false}" style="display:flex; align-items:center; gap:8px; margin-bottom:8px; width: 100%;">
                <div style="display:flex; flex-direction:column; gap:2px; min-width:30px; align-items:center;">
                    <button type="button" class="ctv-btn-move" onclick="_ctvMoveSurchargeRow(this, -1)" style="padding:1px 6px; font-size:10px; line-height:1; cursor:pointer;">▲</button>
                    <button type="button" class="ctv-btn-move" onclick="_ctvMoveSurchargeRow(this, 1)" style="padding:1px 6px; font-size:10px; line-height:1; cursor:pointer;">▼</button>
                </div>
                <div style="flex-grow:1;">
                    <input type="text" class="ctv-input ctv-sc-name" placeholder="Tên chi tiết" value="${item.name}" style="width: 100%;">
                </div>
                <div style="width:150px;">
                    <input type="text" class="ctv-input ctv-sc-value" placeholder="Giá (đ/áo)" value="${item.value}" style="width: 100%;">
                </div>
                <div style="width:30px; text-align:right;">
                    <button type="button" class="ctv-remove-btn" onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-size:16px; border:none; background:none;">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function _ctvAddCustomSurchargeRow(name = '', value = 0) {
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
        <div style="flex-grow:1;">
            <input type="text" class="ctv-input ctv-sc-name" placeholder="Tên chi tiết" value="${name}" style="width: 100%;">
        </div>
        <div style="width:150px;">
            <input type="text" class="ctv-input ctv-sc-value" placeholder="Giá (đ/áo)" value="${value}" style="width: 100%;">
        </div>
        <div style="width:30px; text-align:right;">
            <button type="button" class="ctv-remove-btn" onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-size:16px; border:none; background:none;">×</button>
        </div>
    `;
    container.appendChild(div);
}

function _ctvAddMatRowInput(name = '', price = 75000) {
    const container = document.getElementById('new_cfg_mats_container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'ctv-mat-row';
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
        <input type="text" class="ctv-input" placeholder="Tên chất liệu" value="${name}" style="flex-grow:1;">
        <input type="number" class="ctv-input" placeholder="Đơn giá" value="${price}" style="width:120px;">
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
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 2) {
            const name = inputs[0].value.trim();
            const price = parseFloat(inputs[1].value) || 0;
            if (name) {
                materials.push({ name, price });
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
        
        const rawVal = row.querySelector('.ctv-sc-value').value.trim();
        const parsedVal = parseFloat(rawVal);
        const value = (!isNaN(parsedVal) && isFinite(parsedVal) && /^-?\d+(\.\d+)?$/.test(rawVal)) ? parsedVal : rawVal;
        
        surcharges.display_order.push({ key, name });
        
        if (isDefault) {
            if (key === 'collar') surcharges.collar = value;
            else if (key === 'qty_under_20') surcharges.qty_under_20 = value;
            else if (key === 'primary_school') surcharges.primary_school = value;
            else if (key === 'raglan') surcharges.raglan = value;
            else if (key === 'color_block') surcharges.color_block = value;
        } else {
            if (name) {
                surcharges.custom.push({ name, value });
            }
        }
    });
    
    const body = {
        version_name: vNameInput.value.trim(),
        materials,
        surcharges,
        print_prices: {
            pet: {
                sheet_price: parseFloat(document.getElementById('new_cfg_pr_pet_sheet').value) || 0,
                spacing: parseFloat(document.getElementById('new_cfg_pr_pet_space').value) || 0,
                chest_price: parseFloat(document.getElementById('new_cfg_pr_pet_chest').value) || 0,
                min_position_price: parseFloat(document.getElementById('new_cfg_pr_pet_min_pos').value) || 0
            },
            embroidery: {
                flat_price: document.getElementById('new_cfg_pr_emb_flat').value.trim()
            },
            screen: {
                qty_threshold: parseFloat(document.getElementById('new_cfg_pr_scr_threshold').value) || 0,
                price_low: parseFloat(document.getElementById('new_cfg_pr_scr_low').value) || 0,
                price_high_1_3: parseFloat(document.getElementById('new_cfg_pr_scr_high_13').value) || 0,
                price_high_4_plus: parseFloat(document.getElementById('new_cfg_pr_scr_high_4').value) || 0
            },
            print3d: {
                flat_price: parseFloat(document.getElementById('new_cfg_pr_3d_flat').value) || 30000
            }
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
