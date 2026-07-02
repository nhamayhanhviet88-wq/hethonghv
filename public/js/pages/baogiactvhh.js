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
                                let html = `
                                    <label class="ctv-checkbox-label">
                                        <input type="checkbox" id="ctv_sc_collar" ${_ctvState.surcharges.collar ? 'checked' : ''} onchange="_ctvToggleSurcharge('collar', this.checked)">
                                        Cổ bẻ (+${Number(config.surcharges.collar).toLocaleString('vi-VN')}đ)
                                    </label>
                                    <label class="ctv-checkbox-label">
                                        <input type="checkbox" id="ctv_sc_raglan" ${_ctvState.surcharges.raglan ? 'checked' : ''} onchange="_ctvToggleSurcharge('raglan', this.checked)">
                                        Raglan (+${Number(config.surcharges.raglan).toLocaleString('vi-VN')}đ)
                                    </label>
                                    <label class="ctv-checkbox-label">
                                        <input type="checkbox" id="ctv_sc_color_block" ${_ctvState.surcharges.color_block ? 'checked' : ''} onchange="_ctvToggleSurcharge('color_block', this.checked)">
                                        Phối màu (+${Number(config.surcharges.color_block).toLocaleString('vi-VN')}đ)
                                    </label>
                                    <label class="ctv-checkbox-label">
                                        <input type="checkbox" id="ctv_sc_primary_school" ${_ctvState.surcharges.primary_school ? 'checked' : ''} onchange="_ctvToggleSurcharge('primary_school', this.checked)">
                                        Tiểu học (${Number(config.surcharges.primary_school).toLocaleString('vi-VN')}đ)
                                    </label>
                                `;
                                const customList = config.surcharges?.custom || [];
                                customList.forEach((item) => {
                                    const safeName = item.name.replace(/\s+/g, '_');
                                    html += `
                                        <label class="ctv-checkbox-label">
                                            <input type="checkbox" id="ctv_sc_${safeName}" ${_ctvState.surcharges[item.name] ? 'checked' : ''} onchange="_ctvToggleSurcharge('${item.name}', this.checked)">
                                            ${item.name} (${item.value >= 0 ? '+' : ''}${Number(item.value).toLocaleString('vi-VN')}đ)
                                        </label>
                                    `;
                                });
                                return html;
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
        panel.innerHTML = `
            <div class="ctv-print-config-box">
                <h4>🧬 In PET Báo Giá CTV</h4>
                <div style="font-size:12px; color:#0d9488; margin-bottom:12px;">
                    Biểu phí cấu hình: <strong>${petConfig.sheet_price.toLocaleString('vi-VN')} đ/khổ mét (58x100cm)</strong>. Khoảng cách an toàn hình in: <strong>${petConfig.spacing} cm</strong>.
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
                    <input type="number" class="ctv-input" id="ctv_emb_cost" min="0" value="${_ctvState.embroideryCost}" oninput="_ctvOnEmbCostChange(this.value)">
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
    _ctvState.embroideryCost = Math.max(0, Number(val) || 0);
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
    
    if (_ctvState.surcharges.collar) {
        const fee = Number(config.surcharges.collar) || 0;
        surchargeTotal += fee;
        surchargesBreakdown.push({ label: 'Cổ bẻ', price: fee });
    }
    if (_ctvState.surcharges.raglan) {
        const fee = Number(config.surcharges.raglan) || 0;
        surchargeTotal += fee;
        surchargesBreakdown.push({ label: 'Raglan', price: fee });
    }
    if (_ctvState.surcharges.color_block) {
        const fee = Number(config.surcharges.color_block) || 0;
        surchargeTotal += fee;
        surchargesBreakdown.push({ label: 'Phối màu', price: fee });
    }
    if (_ctvState.surcharges.primary_school) {
        const fee = Number(config.surcharges.primary_school) || 0;
        surchargeTotal += fee; // fee is negative (e.g. -5000)
        surchargesBreakdown.push({ label: 'Tiểu học', price: fee });
    }
    // Auto surcharge for low quantity < 20
    if (qty < 20) {
        const fee = Number(config.surcharges.qty_under_20) || 0;
        surchargeTotal += fee;
        surchargesBreakdown.push({ label: 'Số lượng < 20 áo', price: fee });
    }
    // Custom surcharges
    const customSurcharges = config.surcharges?.custom || [];
    customSurcharges.forEach(item => {
        if (_ctvState.surcharges[item.name]) {
            const fee = Number(item.value) || 0;
            surchargeTotal += fee;
            surchargesBreakdown.push({ label: item.name, price: fee });
        }
    });
    
    // 3. Printing costs
    let printCost = 0;
    const printBreakdown = [];
    const pt = _ctvState.printType;
    
    if (pt === 'pet') {
        const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
        const sheetPrice = Number(petConfig.sheet_price) || 60000;
        const spacing = Number(petConfig.spacing) || 0.4;
        
        _ctvState.petShapes.forEach((s, idx) => {
            const packed = _ctvState.activeConfig ? _ctvCalcPetPlacement(58, 100, s.width, s.height, spacing) : { aligned: 0, optimized: 0 };
            const perSheetCount = s.mode === 'nested' ? packed.optimized : packed.aligned;
            
            if (perSheetCount > 0) {
                const sheetFraction = s.qty_per_shirt / perSheetCount;
                const costPerShirt = Math.round(sheetFraction * sheetPrice);
                printCost += costPerShirt;
                printBreakdown.push({
                    label: `PET #${idx+1}: ${s.width}x${s.height}cm (${s.qty_per_shirt} hình, xếp ${s.mode === 'nested' ? 'tối ưu' : 'thẳng'})`,
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
        printCost = _ctvState.embroideryCost;
        printBreakdown.push({ label: 'Thêu vi tính đồng giá', price: printCost });
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
                ${calc.surchargesBreakdown.map(s => `
                    <div class="ctv-result-row" style="font-size:13px; margin-bottom:4px;">
                        <span style="padding-left:8px;">+ ${s.label}</span>
                        <span>${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <!-- Printing breakdown -->
        ${calc.printBreakdown.length > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.1); margin:8px 0; padding-top:8px;">
                <div style="font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Chi tiết in/thêu:</div>
                ${calc.printBreakdown.map(p => `
                    <div class="ctv-result-row" style="font-size:13px; margin-bottom:4px;">
                        <span style="padding-left:8px;">+ ${p.label}</span>
                        <span>+${p.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <!-- Grand Totals -->
        <div class="ctv-result-row total">
            <span>Đơn giá / Áo:</span>
            <span style="color:#38bdf8;">${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ / áo</span>
        </div>
        
        <div class="ctv-result-row" style="font-size: 16px; font-weight: 700; color: white; margin-top: 10px;">
            <span>Tổng cộng (${_ctvState.quantity} áo):</span>
            <span>${calc.grandTotal.toLocaleString('vi-VN')} đ</span>
        </div>
        
        <div class="ctv-words">
            Bằng chữ: <strong>${docSoTienVietNam(calc.grandTotal)}</strong>
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
                                        ${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ
                                    </td>
                                </tr>
                            `).join('')}
                            ${calc.printBreakdown.map(p => `
                                <tr>
                                    <td style="border:1px solid #cbd5e1; padding:10px; padding-left:24px; color:#0d9488;">
                                        + Công nghệ in: ${p.label}
                                    </td>
                                    <td style="border:1px solid #cbd5e1; padding:10px; text-align:right; color:#0d9488;">
                                        +${p.price.toLocaleString('vi-VN')} đ
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="background:#f8fafc; font-weight:800; font-size:14px;">
                                <td style="border:1px solid #cbd5e1; padding:12px; text-align:right;">
                                    CỘNG ĐƠN GIÁ TRÊN MỖI ÁO:
                                </td>
                                <td style="border:1px solid #cbd5e1; padding:12px; text-align:right; color:#1e3a8a;">
                                    ${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ / áo
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Grand total and words -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:20px; background:#f8fafc; text-align:right; margin-bottom:30px;">
                        <div style="font-size:14px; color:#475569; margin-bottom:6px;">TỔNG TIỀN THANH TOÁN (${_ctvState.quantity} áo):</div>
                        <div style="font-size:24px; font-weight:950; color:#1e3a8a;">${calc.grandTotal.toLocaleString('vi-VN')} VNĐ</div>
                        <div style="font-size:13px; font-style:italic; color:#0369a1; margin-top:8px;">
                            Bằng chữ: <strong>${docSoTienVietNam(calc.grandTotal)}</strong>
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
        text += `  + Phụ phí ${s.label}: ${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ\n`;
    });
    
    calc.printBreakdown.forEach(p => {
        text += `  + In/thêu ${p.label}: +${p.price.toLocaleString('vi-VN')} đ\n`;
    });
    
    text += `----------------------------------------\n`;
    text += `💰 ĐƠN GIÁ CUỐI: ${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ / áo\n`;
    text += `💵 TỔNG CỘNG ĐƠN HÀNG: ${calc.grandTotal.toLocaleString('vi-VN')} đ\n`;
    text += `✍️ (Bằng chữ: ${docSoTienVietNam(calc.grandTotal)})\n`;
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
        print3dCost: q.input_details.print3dCost || 30000
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
    
    _ctvState.activeConfig = tempState.activeConfig;
    _ctvState.selectedCustomer = tempState.selectedCustomer;
    _ctvState.quantity = tempState.quantity;
    _ctvState.selectedMaterialIndex = tempState.selectedMaterialIndex;
    _ctvState.surcharges = tempState.surcharges;
    _ctvState.printType = tempState.printType;
    _ctvState.petShapes = tempState.petShapes;
    _ctvState.screenColors = tempState.screenColors;
    _ctvState.embroideryCost = tempState.embroideryCost;
    
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
    
    modal.innerHTML = `
        <div style="background:white; border-radius:16px; max-width:600px; width:100%; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#1e293b;">📋 Chi Tiết Biểu Phí: ${c.version_name}</h3>
                <button onclick="document.getElementById('ctv_config_preview_modal').style.display='none'" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">×</button>
            </div>
            
            <div style="padding:24px; overflow-y:auto; font-size:13px; line-height:1.6; flex-grow:1;">
                <!-- Materials list -->
                <h4 style="margin:0 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">👕 Bảng Giá Phôi May Cổ Tròn</h4>
                <ul style="margin:0 0 16px 0; padding-left:20px;">
                    ${mats.map(m => `<li>${m.name}: <strong>${Number(m.price).toLocaleString('vi-VN')} đ</strong></li>`).join('')}
                </ul>
                
                <!-- Chi tiết thêm -->
                <h4 style="margin:0 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">➕ Bảng Chi Tiết Thêm</h4>
                <ul style="margin:0 0 16px 0; padding-left:20px;">
                    <li>Cổ bẻ: <strong>+${Number(sc.collar).toLocaleString('vi-VN')} đ</strong></li>
                    <li>Sản xuất dưới 20 áo: <strong>+${Number(sc.qty_under_20).toLocaleString('vi-VN')} đ</strong></li>
                    <li>Chiết khấu tiểu học: <strong>${Number(sc.primary_school).toLocaleString('vi-VN')} đ</strong></li>
                    <li>Tay Raglan: <strong>+${Number(sc.raglan).toLocaleString('vi-VN')} đ</strong></li>
                    <li>Phối màu vải: <strong>+${Number(sc.color_block).toLocaleString('vi-VN')} đ</strong></li>
                    ${(sc.custom || []).map(item => `<li>${item.name}: <strong>${item.value >= 0 ? '+' : ''}${Number(item.value).toLocaleString('vi-VN')} đ</strong></li>`).join('')}
                </ul>
                
                <!-- Printing -->
                <h4 style="margin:0 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">🎨 Cấu Hình Giá In CTV</h4>
                <ul style="margin:0; padding-left:20px;">
                    <li><strong>In PET:</strong> Khổ mét ${Number(pr.pet?.sheet_price).toLocaleString('vi-VN')} đ, khoảng cách ${pr.pet?.spacing}cm</li>
                    <li><strong>Thêu vi tính:</strong> Đồng giá ${Number(pr.embroidery?.flat_price).toLocaleString('vi-VN')} đ/áo</li>
                    <li><strong>In 3D Toàn thân:</strong> ${Number(pr.print3d?.flat_price || 30000).toLocaleString('vi-VN')} đ/áo</li>
                    <li>
                        <strong>In lưới (Screen):</strong> Áo tối thiểu ${pr.screen?.qty_threshold} chiếc, Phí đơn < ${pr.screen?.qty_threshold} áo: ${Number(pr.screen?.price_low).toLocaleString('vi-VN')}đ
                        <div style="font-size:11.5px; color:#64748b; margin-top:2px;">
                            • Đơn giá >= ${pr.screen?.qty_threshold} áo (1-3 màu): ${Number(pr.screen?.price_high_1_3).toLocaleString('vi-VN')}đ/áo/màu<br>
                            • Đơn giá >= ${pr.screen?.qty_threshold} áo (4+ màu): ${Number(pr.screen?.price_high_4_plus).toLocaleString('vi-VN')}đ/áo/màu
                        </div>
                    </li>
                </ul>
            </div>
            
            <div style="padding:16px; border-top:1px solid #e2e8f0; text-align:right; background:#f8fafc; border-bottom-left-radius:16px; border-bottom-right-radius:16px;">
                <button class="ctv-btn-secondary" onclick="document.getElementById('ctv_config_preview_modal').style.display='none'">Đóng</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function _ctvOpenNewConfigForm() {
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
    
    // Fill values with active config or base defaults
    const cfg = _ctvState.activeConfig || {
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
    
    const matRows = cfg.materials.map((m, idx) => `
        <div class="ctv-mat-row" style="display:flex; gap:8px; margin-bottom:8px;">
            <input type="text" class="ctv-input" placeholder="Tên chất liệu" value="${m.name}" style="flex-grow:1;">
            <input type="number" class="ctv-input" placeholder="Đơn giá" value="${m.price}" style="width:120px;">
            <button type="button" class="ctv-remove-btn" onclick="this.parentElement.remove()">×</button>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div style="background:white; border-radius:16px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#1e293b;">➕ Tạo Phiên Bản Bảng Giá Mới</h3>
                <button onclick="document.getElementById('ctv_config_new_modal').style.display='none'" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">×</button>
            </div>
            
            <div style="padding:24px; overflow-y:auto; flex-grow:1; font-size:13px;">
                <div class="ctv-form-group">
                    <label>Tên phiên bản bảng giá mới (Ví dụ: "Bảng giá CTV Tháng 2/2026")</label>
                    <input type="text" class="ctv-input" id="new_cfg_version_name" placeholder="Bắt buộc nhập..." value="${cfg.version_name ? cfg.version_name + ' (Sao chép)' : ''}">
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
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div class="ctv-form-group">
                        <label>Cổ Bẻ (đ/áo)</label>
                        <input type="text" class="ctv-input" id="new_cfg_sc_collar" value="${cfg.surcharges.collar}" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
                    </div>
                    <div class="ctv-form-group">
                        <label>Đơn Hàng < 20 Áo (đ/áo)</label>
                        <input type="text" class="ctv-input" id="new_cfg_sc_qty_under_20" value="${cfg.surcharges.qty_under_20}" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
                    </div>
                    <div class="ctv-form-group">
                        <label>Chiết Khấu Tiểu Học (đ/áo, nhập âm để giảm)</label>
                        <input type="text" class="ctv-input" id="new_cfg_sc_primary_school" value="${cfg.surcharges.primary_school}" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
                    </div>
                    <div class="ctv-form-group">
                        <label>Raglan (đ/áo)</label>
                        <input type="text" class="ctv-input" id="new_cfg_sc_raglan" value="${cfg.surcharges.raglan}" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
                    </div>
                    <div class="ctv-form-group" style="grid-column: span 2;">
                        <label>Phối màu vải (đ/áo)</label>
                        <input type="text" class="ctv-input" id="new_cfg_sc_color_block" value="${cfg.surcharges.color_block}" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
                    </div>
                </div>
                <div id="new_cfg_custom_surcharges_container">
                    ${(cfg.surcharges?.custom || []).map((item, idx) => `
                        <div class="ctv-custom-sc-row" style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
                            <input type="text" class="ctv-input" placeholder="Tên chi tiết" value="${item.name}" style="flex-grow:1;">
                            <input type="text" class="ctv-input" placeholder="Giá (đ/áo)" value="${item.value}" style="width:120px;" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
                            <button type="button" class="ctv-remove-btn" onclick="this.parentElement.remove()">×</button>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Printing setup -->
                <h4 style="margin:20px 0 8px 0; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">🎨 Thiết Lập Giá In CTV</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- PET -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
                        <strong style="color:#0d9488;">🧬 In PET</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:8px;">
                            <label>Giá mét PET (58x100cm)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_sheet" value="${cfg.print_prices.pet?.sheet_price || 60000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                        <div class="ctv-form-group" style="margin-bottom:0;">
                            <label>Khoảng cách spacing (cm)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_pet_space" value="${cfg.print_prices.pet?.spacing || 0.4}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')">
                        </div>
                    </div>
                    
                    <!-- Embroidery -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
                        <strong style="color:#b45309;">🧵 Thêu Vi Tính</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:0;">
                            <label>Giá thêu đồng giá (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_emb_flat" value="${cfg.print_prices.embroidery?.flat_price || 15000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                    </div>
                    
                    <!-- Screen Print -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; grid-column: span 2;">
                        <strong style="color:#7e22ce;">🎨 In Lưới (Screen)</strong>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Hạn mức tối thiểu (áo)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_threshold" value="${cfg.print_prices.screen?.qty_threshold || 20}" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Đơn giá thấp cồng kềnh (đ/đơn/màu)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_low" value="${cfg.print_prices.screen?.price_low || 60000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Giá in 1-3 màu (đ/áo/màu)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_high_13" value="${cfg.print_prices.screen?.price_high_1_3 || 4000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                            </div>
                            <div class="ctv-form-group" style="margin-bottom:0;">
                                <label>Giá in 4+ màu (đ/áo/màu)</label>
                                <input type="text" class="ctv-input" id="new_cfg_pr_scr_high_4" value="${cfg.print_prices.screen?.price_high_4_plus || 3500}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                            </div>
                        </div>
                    </div>
                    
                    <!-- In 3D -->
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:12px; grid-column: span 2;">
                        <strong style="color:#0284c7;">🌀 In 3D Toàn Thân</strong>
                        <div class="ctv-form-group" style="margin-top:8px; margin-bottom:8px;">
                            <label>Giá in 3D (đ/áo)</label>
                            <input type="text" class="ctv-input" id="new_cfg_pr_3d_flat" value="${cfg.print_prices.print3d?.flat_price || 30000}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')">
                        </div>
                        <div style="font-size:11px; color:#64748b; font-style:italic; line-height:1.4;">
                            * Giá in 3D được tính trực tiếp theo đ/áo. Ví dụ: 30.000đ × 10 áo = 300.000đ.
                        </div>
                    </div>
                </div>
                
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <label class="ctv-checkbox-label">
                        <input type="checkbox" id="new_cfg_apply_now" checked>
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
}

function _ctvOn3dCostChange(val) {
    _ctvState.print3dCost = Math.max(0, Number(val) || 0);
    _ctvUpdateCalculations();
}

function _ctvAddCustomSurchargeRow(name = '', value = 0) {
    const container = document.getElementById('new_cfg_custom_surcharges_container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ctv-custom-sc-row';
    div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
    div.innerHTML = `
        <input type="text" class="ctv-input" placeholder="Tên chi tiết" value="${name}" style="flex-grow:1;">
        <input type="text" class="ctv-input" placeholder="Giá (đ/áo)" value="${value}" style="width:120px;" oninput="this.value = this.value.replace(/[^0-9.-]/g, '')">
        <button type="button" class="ctv-remove-btn" onclick="this.parentElement.remove()">×</button>
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
    div.style.margin_bottom = '8px';
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
    
    // Collect custom surcharges from dynamic rows
    const customSurcharges = [];
    document.querySelectorAll('#new_cfg_custom_surcharges_container .ctv-custom-sc-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 2) {
            const name = inputs[0].value.trim();
            const value = parseFloat(inputs[1].value) || 0;
            if (name) customSurcharges.push({ name, value });
        }
    });
    
    const body = {
        version_name: vNameInput.value.trim(),
        materials,
        surcharges: {
            collar: parseFloat(document.getElementById('new_cfg_sc_collar').value) || 0,
            qty_under_20: parseFloat(document.getElementById('new_cfg_sc_qty_under_20').value) || 0,
            primary_school: parseFloat(document.getElementById('new_cfg_sc_primary_school').value) || 0,
            raglan: parseFloat(document.getElementById('new_cfg_sc_raglan').value) || 0,
            color_block: parseFloat(document.getElementById('new_cfg_sc_color_block').value) || 0,
            custom: customSurcharges
        },
        print_prices: {
            pet: {
                sheet_price: parseFloat(document.getElementById('new_cfg_pr_pet_sheet').value) || 0,
                spacing: parseFloat(document.getElementById('new_cfg_pr_pet_space').value) || 0
            },
            embroidery: {
                flat_price: parseFloat(document.getElementById('new_cfg_pr_emb_flat').value) || 0
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
    
    try {
        const res = await apiFetch('/api/ctv-quotations/config', {
            method: 'POST',
            body
        });
        if (res && res.success) {
            showToast('Đã lưu cấu hình bảng giá mới!', 'success');
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
