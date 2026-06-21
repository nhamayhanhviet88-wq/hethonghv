// ========== QUẢN LÝ KHO VẢI — Fabric Warehouse Location Management Page ==========
var _qkv = {
    warehouses: [],
    selectedWid: null,
    locations: [],
    summary: [],
    searchText: '',
    draggedItem: null
};
var _qkvScanner = null;

// HTML and JS escaping helpers
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJS(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Format numbers
function _qkvFmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

// Main Page Renderer
async function renderQuanlykhovaiPage(content) {
    // Dynamically load html5-qrcode library if not loaded
    if (typeof Html5Qrcode === 'undefined') {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
        document.head.appendChild(s);
    }

    // Inject Custom Styles once
    if (!document.getElementById('qkvStyles')) {
        var st = document.createElement('style');
        st.id = 'qkvStyles';
        st.textContent = [
            '.qkv-wrap { display: flex; height: calc(100vh - 60px); overflow: hidden; background: #f8fafc; font-family: "Inter", sans-serif; }',
            '.qkv-sidebar { width: 320px; min-width: 320px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; box-shadow: 4px 0 10px rgba(0,0,0,0.02); z-index: 10; }',
            '.qkv-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 24px; overflow-y: auto; }',
            
            // Sidebar Elements
            '.qkv-sb-section { padding: 18px 20px; border-bottom: 1px solid #f1f5f9; }',
            '.qkv-sb-title { font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }',
            '.qkv-select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; outline: none; background: #fff; transition: all 0.2s; }',
            '.qkv-select:focus { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15); }',
            
            // Locations list in Sidebar
            '.qkv-loc-list { flex: 1; overflow-y: auto; padding: 12px 20px; }',
            '.qkv-loc-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; transition: all 0.15s; }',
            '.qkv-loc-item:hover { background: #f1f5f9; border-color: #cbd5e1; }',
            '.qkv-loc-name { font-size: 12px; font-weight: 700; color: #334155; }',
            '.qkv-loc-desc { font-size: 10px; color: #64748b; margin-top: 2px; }',
            '.qkv-loc-actions { display: flex; gap: 4px; }',
            '.qkv-btn-icon { background: none; border: none; font-size: 14px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.15s; }',
            '.qkv-btn-icon:hover { background: #e2e8f0; }',
            
            // Sidebar Form
            '.qkv-form-group { margin-bottom: 12px; }',
            '.qkv-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; display: block; }',
            '.qkv-input { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; transition: border-color 0.2s; }',
            '.qkv-input:focus { border-color: #0f766e; }',
            '.qkv-btn-primary { width: 100%; padding: 10px; background: linear-gradient(135deg, #0d9488, #0f766e); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }',
            '.qkv-btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }',
            
            // Search Container & Actions
            '.qkv-search-container { margin-bottom: 24px; display: flex; gap: 12px; align-items: center; }',
            '.qkv-search-wrapper { position: relative; flex: 1; }',
            '.qkv-search-input { width: 100%; padding: 14px 16px 14px 44px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 500; color: #1e293b; outline: none; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: all 0.2s; }',
            '.qkv-search-input:focus { border-color: #0f766e; box-shadow: 0 4px 20px rgba(15, 118, 110, 0.1); }',
            '.qkv-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8; }',
            '.qkv-btn-qr { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 20px; height: 48px; background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.15); white-space: nowrap; }',
            '.qkv-btn-qr:hover { opacity: 0.95; transform: translateY(-1px); }',
            
            // Layout Grid
            '.qkv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; align-items: start; }',
            
            // Shelf Cards
            '.qkv-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01); overflow: hidden; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }',
            '.qkv-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); }',
            '.qkv-card.highlighted { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25); transform: scale(1.02); }',
            '.qkv-card-header { padding: 14px 16px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }',
            '.qkv-card-title { font-size: 13px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px; }',
            '.qkv-card-count { background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px; }',
            '.qkv-card-body { padding: 12px; min-height: 80px; max-height: 320px; overflow-y: auto; }',
            
            // Items List inside Card
            '.qkv-item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: 8px; margin-bottom: 6px; border: 1px solid #f1f5f9; background: #fff; transition: all 0.15s; }',
            '.qkv-item-row:hover { background: #f8fafc; border-color: #e2e8f0; }',
            '.qkv-item-row.matched { background: #fffbeb; border-color: #fef3c7; }',
            '.qkv-item-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }',
            '.qkv-item-name { font-size: 12px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.qkv-item-sub { font-size: 10px; color: #64748b; }',
            '.qkv-item-badge { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px; display: inline-block; }',
            '.qkv-badge-mat { background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1; }',
            '.qkv-badge-col { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }',
            '.qkv-item-balance { font-size: 11px; font-weight: 800; color: #1e293b; margin-right: 8px; text-align: right; white-space: nowrap; }',
            
            // Empty State
            '.qkv-empty-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; color: #94a3b8; text-align: center; font-size: 11px; }',
            '.qkv-empty-card-icon { font-size: 24px; margin-bottom: 6px; opacity: 0.6; }',
            
            // Special Cards
            '.qkv-card-unassigned { border-style: dashed; border-width: 2px; }',
            '.qkv-card-unassigned .qkv-card-header { background: linear-gradient(135deg, #fff, #f8fafc); }',
            '.qkv-card-unassigned-header { color: #f59e0b; }',
            
            // Mobile Specific Styles
            '@media (max-width: 768px) {',
            '  .qkv-wrap { flex-direction: column; height: auto; overflow: auto; }',
            '  .qkv-sidebar { width: 100%; min-width: 100%; height: auto; border-right: none; border-bottom: 1px solid #e2e8f0; }',
            '  .qkv-main { padding: 16px; }',
            '  .qkv-grid { grid-template-columns: 1fr; gap: 16px; }',
            '  .qkv-search-container { flex-direction: column; align-items: stretch; gap: 10px; }',
            '  .qkv-btn-qr { width: 100%; height: 44px; }',
            '  .qkv-sb-collapse { display: none; }',
            '  .qkv-sb-collapse.show { display: block; }',
            '  .qkv-sb-toggle-btn { display: block; width: calc(100% - 40px); margin: 12px 20px; padding: 10px; text-align: center; font-size: 12px; color: #4f46e5; font-weight: 700; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; cursor: pointer; }',
            '}',
            '@media (min-width: 769px) {',
            '  .qkv-sb-toggle-btn { display: none !important; }',
            '}'
        ].join('\n');
        document.head.appendChild(st);
    }

    // Set page layout structure
    content.innerHTML = `
        <div class="qkv-wrap">
            <!-- Sidebar -->
            <div class="qkv-sidebar">
                <!-- Warehouse Selector -->
                <div class="qkv-sb-section">
                    <div class="qkv-sb-title">🏬 Chọn Kho Vải</div>
                    <select id="qkvWarehouseSelect" class="qkv-select" onchange="_qkvOnWarehouseChanged(this.value)">
                        <option value="">-- Đang tải... --</option>
                    </select>
                </div>
                
                <!-- Toggle Button for settings on Mobile -->
                <button id="qkvSbToggleBtn" class="qkv-sb-toggle-btn" onclick="_qkvToggleSidebarCollapse()">⚙️ Quản lý Kệ & Vị Trí (Hiện)</button>
                
                <div id="qkvSidebarCollapse" class="qkv-sb-collapse">
                    <!-- Add Location Form -->
                    <div class="qkv-sb-section">
                        <div class="qkv-sb-title">➕ Thêm Vị Trí / Kệ</div>
                        <form id="qkvAddLocationForm" onsubmit="_qkvOnAddLocation(event)">
                            <div class="qkv-form-group">
                                <label class="qkv-label">Tên vị trí (Kệ A1, Khu B...)</label>
                                <input type="text" id="qkvNewLocName" class="qkv-input" placeholder="Ví dụ: Kệ A1" required />
                            </div>
                            <div class="qkv-form-group">
                                <label class="qkv-label">Mô tả / Ghi chú</label>
                                <input type="text" id="qkvNewLocDesc" class="qkv-input" placeholder="Ví dụ: Dành cho vải Cotton" />
                            </div>
                            <button type="submit" class="qkv-btn-primary">💾 Tạo vị trí mới</button>
                        </form>
                    </div>
                    
                    <!-- Locations List -->
                    <div style="padding: 16px 20px 0 20px; font-weight: 800; font-size: 11px; color: #475569; text-transform: uppercase; border-bottom: none;">📋 Vị trí đã thiết lập</div>
                    <div class="qkv-loc-list" id="qkvLocList">
                        <div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 20px 0;">Chưa có dữ liệu</div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="qkv-main">
                <!-- Search box + Camera action -->
                <div class="qkv-search-container">
                    <div class="qkv-search-wrapper">
                        <span class="qkv-search-icon">🔍</span>
                        <input type="text" id="qkvSearchInput" class="qkv-search-input" placeholder="Nhập tên chất liệu hoặc màu vải để tra cứu vị trí..." oninput="_qkvOnSearch(this.value)" />
                    </div>
                    <button class="qkv-btn-qr" onclick="_qkvStartQRScan()">📷 Quét QR Kệ</button>
                </div>
                
                <!-- Map / Grid of locations -->
                <div class="qkv-grid" id="qkvGrid">
                    <!-- Cards will be rendered here -->
                </div>
            </div>
        </div>
    `;

    // Parse Deep Link URL parameters
    var urlParams = new URLSearchParams(window.location.search);
    var targetLoc = urlParams.get('loc');
    var targetWid = urlParams.get('wid');

    // Load initial data with URL params
    await _qkvLoadWarehouses(targetWid, targetLoc);
}

// Toggle sidebar collapse for mobile view
function _qkvToggleSidebarCollapse() {
    var el = document.getElementById('qkvSidebarCollapse');
    var btn = document.getElementById('qkvSbToggleBtn');
    if (!el || !btn) return;
    el.classList.toggle('show');
    if (el.classList.contains('show')) {
        btn.textContent = '⚙️ Quản lý Kệ & Vị Trí (Ẩn)';
    } else {
        btn.textContent = '⚙️ Quản lý Kệ & Vị Trí (Hiện)';
    }
}

// 1. Fetch Warehouses and load targeted/first one
async function _qkvLoadWarehouses(targetWid, targetLoc) {
    try {
        var res = await apiCall('/api/khovai/warehouses');
        _qkv.warehouses = res.warehouses || [];
        
        var select = document.getElementById('qkvWarehouseSelect');
        if (!select) return;
        
        if (_qkv.warehouses.length === 0) {
            select.innerHTML = '<option value="">Chưa có kho vải nào</option>';
            return;
        }
        
        var html = '';
        _qkv.warehouses.forEach(function(w) {
            html += `<option value="${w.id}">${w.name} (${w.unit})</option>`;
        });
        select.innerHTML = html;
        
        // Select matching warehouse or fall back to first one
        var selectedId = _qkv.warehouses[0].id;
        if (targetWid && _qkv.warehouses.some(w => w.id == targetWid)) {
            selectedId = Number(targetWid);
        }
        _qkv.selectedWid = selectedId;
        select.value = _qkv.selectedWid;
        
        await _qkvLoadData();

        // Process Deep-linked shelf
        if (targetLoc) {
            _qkvOpenQuickImportModal(targetLoc);
            // Clear URL params to avoid repeating modal popups on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi khi tải danh sách kho vải', 'error');
    }
}

// 2. Handle warehouse selection change
async function _qkvOnWarehouseChanged(wid) {
    _qkv.selectedWid = Number(wid);
    await _qkvLoadData();
}

// 3. Load Locations and summary data for the selected warehouse
async function _qkvLoadData() {
    if (!_qkv.selectedWid) return;
    
    // Clear display
    var locList = document.getElementById('qkvLocList');
    var grid = document.getElementById('qkvGrid');
    if (locList) locList.innerHTML = '<div style="color:#94a3b8;font-size:12px;text-align:center;padding:20px 0;">Đang tải...</div>';
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#94a3b8;">Đang tải sơ đồ...</div>';
    
    try {
        // Fetch locations and fabric summary in parallel
        var [locRes, sumRes] = await Promise.all([
            apiCall(`/api/khovai/locations?wid=${_qkv.selectedWid}`),
            apiCall(`/api/khovai/summary?wid=${_qkv.selectedWid}`)
        ]);
        
        _qkv.locations = locRes.locations || [];
        _qkv.summary = sumRes.summary || [];
        
        _qkvRenderSidebarLocations();
        _qkvRenderMap();
    } catch(e) {
        console.error(e);
        showToast('Lỗi khi tải dữ liệu sơ đồ kho', 'error');
    }
}

// 4. Render locations list in the sidebar
function _qkvRenderSidebarLocations() {
    var listEl = document.getElementById('qkvLocList');
    if (!listEl) return;
    
    if (_qkv.locations.length === 0) {
        listEl.innerHTML = '<div style="color: #94a3b8; font-size: 11px; text-align: center; padding: 20px 0;">Chưa thiết lập kệ/vị trí nào. Hãy dùng form phía trên để tạo.</div>';
        return;
    }
    
    var html = '';
    _qkv.locations.forEach(function(loc) {
        html += `
            <div class="qkv-loc-item">
                <div style="min-width: 0; flex: 1;">
                    <div class="qkv-loc-name">${escapeHTML(loc.name)}</div>
                    <div class="qkv-loc-desc">${loc.description ? escapeHTML(loc.description) : 'Không có ghi chú'}</div>
                </div>
                <div class="qkv-loc-actions">
                    <button class="qkv-btn-icon" onclick="_qkvShowLocationQRCode('${escapeJS(loc.name)}')" title="Xem mã QR kệ">📷</button>
                    <button class="qkv-btn-icon" onclick="_qkvEditLocation(${loc.id}, '${escapeJS(loc.name)}', '${escapeJS(loc.description || '')}')" title="Sửa tên/mô tả">✏️</button>
                    <button class="qkv-btn-icon" onclick="_qkvDeleteLocation(${loc.id}, '${escapeJS(loc.name)}')" title="Xóa vị trí">🗑️</button>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}

// 5. Render Warehouse Map Grid
function _qkvRenderMap() {
    var grid = document.getElementById('qkvGrid');
    if (!grid) return;
    
    var groups = {};
    
    // Initialize groups for predefined locations
    _qkv.locations.forEach(function(loc) {
        groups[loc.name] = {
            id: loc.id,
            name: loc.name,
            description: loc.description,
            items: []
        };
    });
    
    // Special unassigned group
    var unassignedKey = '__unassigned__';
    groups[unassignedKey] = {
        name: 'Chưa phân vị trí',
        items: []
    };
    
    // Group the items
    _qkv.summary.forEach(function(item) {
        var key = (item.location || '').trim();
        var isPredefined = _qkv.locations.some(l => l.name === key);
        
        if (!key || !isPredefined) {
            groups[unassignedKey].items.push(item);
        } else {
            groups[key].items.push(item);
        }
    });
    
    // Build Cards HTML
    var html = '';
    var searchKey = (_qkv.searchText || '').toLowerCase().trim();
    
    // RENDER PREDEFINED LOCATION CARDS
    _qkv.locations.forEach(function(loc) {
        var group = groups[loc.name] || { items: [] };
        var cardHtml = _qkvBuildCardHtml(group, false, searchKey);
        html += cardHtml;
    });
    
    // RENDER UNASSIGNED CARD AT THE END
    var unassignedGroup = groups[unassignedKey] || { items: [] };
    if (unassignedGroup.items.length > 0 || _qkv.locations.length === 0) {
        var cardHtml = _qkvBuildCardHtml(unassignedGroup, true, searchKey);
        html += cardHtml;
    }
    
    grid.innerHTML = html;
}

// 6. Build single Card HTML
function _qkvBuildCardHtml(group, isUnassigned, searchKey) {
    var headerClass = isUnassigned ? 'qkv-card-unassigned-header' : '';
    var cardClass = isUnassigned ? 'qkv-card qkv-card-unassigned' : 'qkv-card';
    
    var isCardHighlighted = false;
    var itemsHtml = '';
    var matchCount = 0;
    
    if (group.items.length === 0) {
        itemsHtml = `
            <div class="qkv-empty-card">
                <div class="qkv-empty-card-icon">📦</div>
                <div>Kệ trống</div>
            </div>
        `;
    } else {
        group.items.forEach(function(item) {
            var matched = false;
            if (searchKey) {
                matched = (item.material_name || '').toLowerCase().includes(searchKey)
                    || (item.color_name || '').toLowerCase().includes(searchKey)
                    || (item.location || '').toLowerCase().includes(searchKey);
                if (matched) {
                    isCardHighlighted = true;
                    matchCount++;
                }
            }
            
            var isColorOverride = !!item.color_location;
            var badgeText = isColorOverride ? 'Màu vải' : 'Chất liệu';
            var badgeClass = isColorOverride ? 'qkv-badge-col' : 'qkv-badge-mat';
            var originTip = isColorOverride ? 'Vị trí được phân riêng cho màu vải này' : 'Vị trí mặc định lấy từ Chất liệu cha';
            
            itemsHtml += `
                <div class="qkv-item-row ${matched ? 'matched' : ''}">
                    <div class="qkv-item-main">
                        <div class="qkv-item-name" title="${escapeHTML(item.material_name)} - ${escapeHTML(item.color_name)}">
                            ${escapeHTML(item.material_name)}
                        </div>
                        <div class="qkv-item-sub">
                            Màu: <span style="font-weight:700;color:#0f766e;">${escapeHTML(item.color_name)}</span>
                            <span class="qkv-item-badge ${badgeClass}" title="${originTip}">${badgeText}</span>
                        </div>
                    </div>
                    <div class="qkv-item-balance">
                        ${_qkvFmt(item.cuoi_ky)} ${escapeHTML(item.unit || 'kg')}<br>
                        <span style="font-size:9px;color:#94a3b8;font-weight:normal;">${item.so_cuc} cây</span>
                    </div>
                    <div class="qkv-loc-actions">
                        <button class="qkv-btn-icon" onclick="_qkvOnChangeItemLocation(${item.id}, ${item.material_id}, '${escapeJS(item.material_name)}', '${escapeJS(item.color_name)}', '${escapeJS(item.location || '')}')" title="Di chuyển vị trí">🚚</button>
                    </div>
                </div>
            `;
        });
    }
    
    if (isCardHighlighted) {
        cardClass += ' highlighted';
    }
    
    var icon = isUnassigned ? '⚠️' : '📍';
    var descHtml = group.description ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">${escapeHTML(group.description)}</div>` : '';
    
    var countBadge = group.items.length > 0 ? `<span class="qkv-card-count">${group.items.length} mặt hàng</span>` : '';
    if (searchKey && matchCount > 0) {
        countBadge = `<span class="qkv-card-count" style="background:#fef3c7;color:#d97706;">Tìm thấy ${matchCount}</span>`;
    }

    var qrButton = !isUnassigned ? `<button class="qkv-btn-icon" style="font-size:12px; margin-left: 6px;" onclick="_qkvShowLocationQRCode('${escapeJS(group.name)}')" title="Xem mã QR của kệ này">📷 QR</button>` : '';
    
    return `
        <div class="${cardClass}">
            <div class="qkv-card-header">
                <div style="min-width:0;flex:1;">
                    <div class="qkv-card-title ${headerClass}">
                        <span>${icon} ${escapeHTML(group.name)}</span>
                        ${qrButton}
                    </div>
                    ${descHtml}
                </div>
                ${countBadge}
            </div>
            <div class="qkv-card-body">
                ${itemsHtml}
            </div>
        </div>
    `;
}

// 7. Handle Search Input
function _qkvOnSearch(val) {
    _qkv.searchText = val;
    _qkvRenderMap();
}

// 8. Create Location
async function _qkvOnAddLocation(e) {
    e.preventDefault();
    if (!_qkv.selectedWid) return;
    
    var nameEl = document.getElementById('qkvNewLocName');
    var descEl = document.getElementById('qkvNewLocDesc');
    
    var name = nameEl.value.trim();
    var desc = descEl.value.trim();
    
    if (!name) return;
    
    try {
        var res = await apiCall('/api/khovai/locations', 'POST', {
            warehouse_id: _qkv.selectedWid,
            name: name,
            description: desc
        });
        
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        
        showToast(`Tạo vị trí "${name}" thành công!`, 'success');
        nameEl.value = '';
        descEl.value = '';
        
        await _qkvLoadData();
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi lưu vị trí mới', 'error');
    }
}

// 9. Edit Location modal
function _qkvEditLocation(id, name, desc) {
    openModal(
        '✏️ Sửa Vị Trí / Kệ',
        `
            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Tên Vị Trí</label>
                <input type="text" id="qkvEditName" class="form-control" value="${escapeHTML(name)}" required />
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:700;font-size:12px;">Mô tả / Ghi chú</label>
                <input type="text" id="qkvEditDesc" class="form-control" value="${escapeHTML(desc)}" />
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
            <button class="btn btn-primary" onclick="_qkvSaveLocation(${id})">💾 Lưu lại</button>
        `
    );
}

// 10. Save edited location to database
async function _qkvSaveLocation(id) {
    var name = document.getElementById('qkvEditName').value.trim();
    var desc = document.getElementById('qkvEditDesc').value.trim();
    
    if (!name) {
        showToast('Tên vị trí không được để trống', 'error');
        return;
    }
    
    try {
        var res = await apiCall(`/api/khovai/locations/${id}`, 'PUT', {
            name: name,
            description: desc
        });
        
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        
        showToast('Cập nhật vị trí thành công!', 'success');
        closeModal();
        await _qkvLoadData();
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi lưu thay đổi', 'error');
    }
}

// 11. Delete location
function _qkvDeleteLocation(id, name) {
    openModal(
        '⚠️ Xác nhận xóa vị trí',
        `
            <div style="font-size:13px;line-height:1.6;">
                Bạn có chắc chắn muốn xóa vị trí <strong>"${escapeHTML(name)}"</strong> không?<br>
                <span style="color:#dc2626;font-weight:700;">Lưu ý:</span> Tất cả vải/chất liệu đang được đặt tại kệ này sẽ được đưa về trạng thái <strong>"Chưa phân vị trí"</strong>. Dữ liệu số lượng cuộn vải sẽ KHÔNG bị ảnh hưởng.
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Không xóa</button>
            <button class="btn btn-danger" onclick="_qkvConfirmDeleteLocation(${id})">🗑️ Đồng ý xóa</button>
        `
    );
}

// 12. Confirm delete from database
async function _qkvConfirmDeleteLocation(id) {
    try {
        var res = await apiCall(`/api/khovai/locations/${id}`, 'DELETE');
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        showToast('Đã xóa vị trí thành công', 'success');
        closeModal();
        await _qkvLoadData();
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi xóa vị trí', 'error');
    }
}

// 13. Move item position modal
function _qkvOnChangeItemLocation(id, materialId, matName, colorName, currentLoc) {
    var optionsHtml = `<option value="" ${!currentLoc ? 'selected' : ''}>-- Chưa phân vị trí --</option>`;
    _qkv.locations.forEach(function(loc) {
        optionsHtml += `<option value="${escapeHTML(loc.name)}" ${currentLoc === loc.name ? 'selected' : ''}>${escapeHTML(loc.name)} ${loc.description ? '(' + escapeHTML(loc.description) + ')' : ''}</option>`;
    });

    openModal(
        '🚚 Di chuyển vị trí vải',
        `
            <div style="font-size:13px;line-height:1.6;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <div>🧵 Chất liệu: <strong>${escapeHTML(matName)}</strong></div>
                <div>🎨 Màu vải: <strong style="color:#0f766e;">${escapeHTML(colorName)}</strong></div>
                <div>📍 Vị trí hiện tại: <strong>${currentLoc ? escapeHTML(currentLoc) : 'Chưa phân vị trí'}</strong></div>
            </div>
            
            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Vị Trí Mới</label>
                <select id="qkvMoveSelect" class="form-control" style="width:100%;height:38px;">
                    ${optionsHtml}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label" style="font-weight:700;font-size:12px;">Phạm vi áp dụng</label>
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                        <input type="radio" name="qkvScope" value="color" checked />
                        <span>Chỉ riêng màu này (<strong>${escapeHTML(colorName)}</strong>)</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                        <input type="radio" name="qkvScope" value="material" />
                        <span>Toàn bộ chất liệu (<strong>${escapeHTML(matName)}</strong>)</span>
                    </label>
                </div>
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" onclick="_qkvSaveItemLocation(${id}, ${materialId})">🚚 Lưu vị trí mới</button>
        `
    );
}

// 14. Save new location mapping to material/color
async function _qkvSaveItemLocation(colorId, materialId) {
    var newLoc = document.getElementById('qkvMoveSelect').value;
    var scope = document.querySelector('input[name="qkvScope"]:checked').value;
    
    try {
        var res;
        if (scope === 'material') {
            res = await apiCall(`/api/khovai/materials/${materialId}`, 'PUT', {
                location: newLoc
            });
        } else {
            res = await apiCall(`/api/khovai/colors/${colorId}`, 'PUT', {
                location: newLoc
            });
        }
        
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        
        showToast('Đã di chuyển vị trí thành công!', 'success');
        closeModal();
        await _qkvLoadData();
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi chuyển vị trí', 'error');
    }
}

// 15. Show QR Code Modal for a location
function _qkvShowLocationQRCode(locName) {
    var deepLink = window.location.origin + '/quanlykhovai?loc=' + encodeURIComponent(locName) + '&wid=' + _qkv.selectedWid;
    var qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(deepLink)}`;
    
    openModal(
        `📷 Mã QR - Kệ ${escapeHTML(locName)}`,
        `
            <div style="text-align:center; padding: 16px;">
                <div id="qkvPrintArea" style="display:inline-block; padding: 24px; background: white; border: 2px solid #e2e8f0; border-radius: 16px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <img src="${qrUrl}" alt="QR Code" style="width:200px; height:200px;" />
                    <div style="font-family:'Inter',sans-serif; font-size:14px; font-weight:800; color:#475569; margin-top:16px; text-transform:uppercase; letter-spacing:0.5px;">ĐỒNG PHỤC HV - KHO VẢI</div>
                    <div style="font-family:'Inter',sans-serif; font-size:26px; font-weight:900; color:#0f766e; margin-top:4px;">KỆ: ${escapeHTML(locName)}</div>
                </div>
                <div style="margin-top:16px; font-size:12px; color:#64748b; font-weight:500; max-width: 280px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                    Quét nhãn này dán ở đầu kệ vật lý để tự động mở nhanh giao diện xếp vải vào kệ này.
                </div>
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
            <button class="btn btn-primary" onclick="_qkvPrintQRCode('${escapeJS(locName)}')" style="background:#0f766e;">🖨️ In mã QR</button>
        `
    );
}

// 16. Print QR Code Helper
function _qkvPrintQRCode(locName) {
    var printContent = document.getElementById('qkvPrintArea').innerHTML;
    var printWindow = window.open('', '_blank', 'width=600,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>In mã QR Kệ ${locName}</title>
                <style>
                    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: 'Inter', sans-serif; text-align: center; }
                    #printCard { padding: 40px; border: 3px solid #cbd5e1; border-radius: 20px; width: 280px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
                    img { width: 240px; height: 240px; }
                    .title { font-size: 14px; font-weight: 800; color:#64748b; margin-top: 20px; letter-spacing:0.5px; text-transform:uppercase; }
                    .shelf { font-size: 30px; font-weight: 900; margin-top: 4px; color: #0f766e; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div id="printCard">
                    ${printContent}
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
}

// 17. Start QR Scanner Overlay
function _qkvStartQRScan() {
    if (typeof Html5Qrcode === 'undefined') {
        showToast('Đang tải thư viện camera. Vui lòng chờ 1-2 giây rồi thử lại!', 'info');
        return;
    }
    
    var modal = document.getElementById('qkvQrModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qkvQrModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:center; align-items:center; padding:16px;';
        modal.innerHTML = `
            <div style="background:white; border-radius:20px; width:100%; max-width:420px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);">
                <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                    <span style="font-weight:800; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">📷 Quét QR Mã Kệ</span>
                    <button onclick="_qkvStopQRScan()" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">❌</button>
                </div>
                <div style="padding:20px; display:flex; flex-direction:column; align-items:center;">
                    <div id="qkvQrReader" style="width:100%; min-height:280px; background:#000; border-radius:12px; overflow:hidden;"></div>
                    <div style="margin-top:16px; font-size:11px; color:#64748b; text-align:center; font-weight:600; line-height:1.5;">
                        Hãy đặt mã QR dán trên kệ vật lý vào vùng quét của camera để truy xuất nhanh.
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    
    _qkvScanner = new Html5Qrcode("qkvQrReader");
    var config = { fps: 10, qrbox: { width: 240, height: 240 } };
    
    _qkvScanner.start(
        { facingMode: "environment" },
        config,
        function(decodedText) {
            _qkvOnQRScanSuccess(decodedText);
        },
        function(err) {
            // Silence continuous frame failures
        }
    ).catch(function(err) {
        console.error(err);
        showToast('Không truy cập được camera. Hãy chắc chắn bạn đã cấp quyền truy cập camera cho trình duyệt!', 'error');
        _qkvStopQRScan();
    });
}

// 18. Stop QR Scanner
function _qkvStopQRScan() {
    var modal = document.getElementById('qkvQrModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (_qkvScanner) {
        _qkvScanner.stop().then(function() {
            _qkvScanner.clear();
            _qkvScanner = null;
        }).catch(function(e) {
            console.error(e);
            _qkvScanner = null;
        });
    }
}

// 19. Handle Success Scan
function _qkvOnQRScanSuccess(decodedText) {
    _qkvStopQRScan();
    
    var shelfName = '';
    try {
        if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
            var url = new URL(decodedText);
            shelfName = url.searchParams.get('loc') || '';
            
            // Switch warehouse if provided in QR link
            var wid = url.searchParams.get('wid');
            if (wid && Number(wid) !== _qkv.selectedWid) {
                var select = document.getElementById('qkvWarehouseSelect');
                if (select && _qkv.warehouses.some(w => w.id == wid)) {
                    _qkv.selectedWid = Number(wid);
                    select.value = _qkv.selectedWid;
                    // reload and then open
                    _qkvLoadData().then(function() {
                        _qkvOpenQuickImportModal(shelfName);
                    });
                    return;
                }
            }
        } else {
            shelfName = decodedText;
        }
    } catch(e) {
        shelfName = decodedText;
    }
    
    shelfName = (shelfName || '').trim();
    if (!shelfName) {
        showToast('Mã QR quét được không chứa thông tin kệ phù hợp', 'error');
        return;
    }
    
    _qkvOpenQuickImportModal(shelfName);
}

// 20. Open Quick Import Modal
function _qkvOpenQuickImportModal(shelfName) {
    // Check if location exists
    var shelfExists = _qkv.locations.some(l => l.name === shelfName);
    var warnHtml = '';
    if (!shelfExists) {
        warnHtml = `
            <div style="padding:10px; background:#fef3c7; border:1px solid #fde68a; border-radius:8px; color:#b45309; font-size:11px; margin-bottom:12px; font-weight:600; line-height:1.4;">
                ⚠️ Vị trí "${escapeHTML(shelfName)}" chưa được thiết lập trong kho này. 
                Nếu bạn xếp vải vào đây, kệ "${escapeHTML(shelfName)}" sẽ tự động được ghi nhận.
            </div>
        `;
    }

    openModal(
        `📦 Nhập Vải Vào: ${escapeHTML(shelfName)}`,
        `
            ${warnHtml}
            
            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-weight:700; font-size:11px; text-transform:uppercase; color:#475569;">Phạm vi áp dụng</label>
                <div style="display:flex; gap:16px; margin-top:4px;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                        <input type="radio" name="qkvQuickScope" value="color" checked />
                        <span>Chỉ riêng màu này</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                        <input type="radio" name="qkvQuickScope" value="material" />
                        <span>Toàn bộ chất liệu</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom:12px;">
                <input type="text" id="qkvQuickSearch" class="form-control" placeholder="🔍 Tìm kiếm chất liệu hoặc màu vải..." oninput="_qkvRenderQuickImportList('${escapeJS(shelfName)}')" style="height:36px; font-size:12px;" />
            </div>
            
            <div style="font-size:11px; font-weight:800; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Danh sách vải đề xuất (Chưa xếp vị trí)</div>
            <div id="qkvQuickImportList" style="max-height:280px; overflow-y:auto; padding-right:4px;">
                <!-- List will be rendered dynamically -->
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Hoàn thành</button>
        `
    );

    // Initial render of the quick import list
    _qkvRenderQuickImportList(shelfName);
}

// 21. Render Quick Import List inside modal
function _qkvRenderQuickImportList(shelfName) {
    var searchVal = (document.getElementById('qkvQuickSearch').value || '').toLowerCase().trim();
    var listEl = document.getElementById('qkvQuickImportList');
    if (!listEl) return;
    
    var filtered = [];
    if (!searchVal) {
        // Show only unassigned
        filtered = _qkv.summary.filter(function(item) {
            var loc = (item.location || '').trim();
            var exists = _qkv.locations.some(l => l.name === loc);
            return !loc || !exists;
        });
    } else {
        // Show matching items from entire inventory
        filtered = _qkv.summary.filter(function(item) {
            return (item.material_name || '').toLowerCase().includes(searchVal)
                || (item.color_name || '').toLowerCase().includes(searchVal);
        });
    }
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:11px; font-weight:500;">Không có cây vải nào phù hợp</div>';
        return;
    }
    
    var html = '';
    filtered.forEach(function(item) {
        var currentLocText = item.location ? `(Ở kệ: ${item.location})` : '(Chưa xếp vị trí)';
        html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid #f1f5f9; background:#fff; border-radius:8px; margin-bottom:6px; border:1px solid #e2e8f0; cursor:pointer; transition:all 0.1s;" onclick="_qkvOnQuickSelectClick(${item.id}, ${item.material_id}, '${escapeJS(item.color_name)}', '${escapeJS(item.material_name)}', '${escapeJS(shelfName)}')" onmouseover="this.style.borderColor='#0d9488'" onmouseout="this.style.borderColor='#e2e8f0'">
                <div style="min-width:0; flex:1;">
                    <div style="font-size:12px; font-weight:700; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(item.material_name)}</div>
                    <div style="font-size:10px; color:#64748b; margin-top:2px;">
                        Màu: <span style="font-weight:700; color:#0f766e;">${escapeHTML(item.color_name)}</span> 
                        <span style="margin-left:4px; font-size:9px; color:#94a3b8;">${currentLocText}</span>
                    </div>
                </div>
                <div style="font-size:11px; font-weight:800; color:#1e293b; margin-left:8px; text-align:right;">
                    ${_qkvFmt(item.cuoi_ky)} ${escapeHTML(item.unit || 'kg')}<br>
                    <span style="font-size:9px; color:#94a3b8; font-weight:normal;">${item.so_cuc} cây</span>
                </div>
                <div style="font-size:16px; margin-left:12px; color:#0d9488; font-weight:bold;">📥</div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}

// 22. Handle click in quick select
function _qkvOnQuickSelectClick(colorId, materialId, colorName, materialName, shelfName) {
    var scope = document.querySelector('input[name="qkvQuickScope"]:checked').value;
    _qkvExecuteQuickImport(colorId, materialId, colorName, materialName, shelfName, scope);
}

// 23. Run quick import update API call
async function _qkvExecuteQuickImport(colorId, materialId, colorName, materialName, shelfName, scope) {
    try {
        var res;
        if (scope === 'material') {
            res = await apiCall(`/api/khovai/materials/${materialId}`, 'PUT', {
                location: shelfName
            });
        } else {
            res = await apiCall(`/api/khovai/colors/${colorId}`, 'PUT', {
                location: shelfName
            });
        }
        
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        
        showToast(`Đã xếp "${materialName} - ${colorName}" vào kệ "${shelfName}"`, 'success');
        
        // Reload data
        await _qkvLoadData();
        
        // Re-render quick import list inside modal
        _qkvRenderQuickImportList(shelfName);
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi lưu vị trí vải', 'error');
    }
}
