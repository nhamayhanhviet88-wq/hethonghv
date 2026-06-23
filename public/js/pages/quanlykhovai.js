// ========== QUẢN LÝ KHO VẢI — Fabric Warehouse Location Management Page ==========
var _qkv = {
    warehouses: [],
    selectedWid: null,
    locations: [],
    summary: [],
    searchText: '',
    draggedItem: null,
    showZeroWeight: false,
    activeItems: []
};
var _qkvScanner = null;
var _qkvCollapsedShelves = {};

function _qkvToggleShelfCollapse(element, shelfName) {
    var card = element.closest('.qkv-card');
    if (!card) return;
    card.classList.toggle('collapsed');
    
    var isCollapsed = card.classList.contains('collapsed');
    _qkvCollapsedShelves[shelfName] = isCollapsed;
}

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
            '.qkv-toggle-zero { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; user-select: none; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.02); height: 48px; }',
            '.qkv-toggle-zero:hover { border-color: #0f766e; background: #f8fafc; }',
            '.qkv-toggle-zero input { width: 16px; height: 16px; accent-color: #0f766e; cursor: pointer; margin: 0; }',
            '.qkv-btn-qr { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 20px; height: 48px; background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.15); white-space: nowrap; }',
            '.qkv-btn-qr:hover { opacity: 0.95; transform: translateY(-1px); }',
            
            // Layout Grid
            '.qkv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 20px; align-items: start; }',
            
            // Shelf Cards
            '.qkv-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01); overflow: hidden; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }',
            '.qkv-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); }',
            '.qkv-card.highlighted { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25); transform: scale(1.02); }',
            '.qkv-card-header { padding: 14px 16px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }',
            '.qkv-card-title { font-size: 13px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px; }',
            '.qkv-card-count { background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px; }',
            '.qkv-card-body { padding: 12px; min-height: 80px; max-height: 420px; overflow-y: auto; }',
            
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
            '@keyframes qkvShimmerGlow {',
            '  0% { background-position: 0% 50%; }',
            '  50% { background-position: 100% 50%; }',
            '  100% { background-position: 0% 50%; }',
            '}',
            '@keyframes qkvSparkleStars {',
            '  0%, 100% { opacity: 0.8; text-shadow: 0 0 4px rgba(255,255,255,0.4); }',
            '  50% { opacity: 1; text-shadow: 0 0 8px rgba(255,255,255,0.8); }',
            '}',
            '.qkv-card-unassigned { border-style: dashed; border-width: 2px; }',
            '.qkv-card-unassigned .qkv-card-header { background: linear-gradient(135deg, #fff, #f8fafc); }',
            '.qkv-card-unassigned-header { color: #f59e0b; }',
            '.qkv-card-unassigned-nguyen { border-color: #f59e0b !important; }',
            '.qkv-card-unassigned-nguyen-header {',
            '  background: linear-gradient(135deg, #f59e0b, #d97706, #f59e0b, #b45309) !important;',
            '  background-size: 300% 300% !important;',
            '  animation: qkvShimmerGlow 6s ease infinite !important;',
            '  color: #ffffff !important;',
            '  font-weight: 900 !important;',
            '  text-shadow: 0 1px 2px rgba(0,0,0,0.2);',
            '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);',
            '}',
            '.qkv-card-unassigned-nguyen-header .qkv-card-title { color: #ffffff !important; animation: qkvSparkleStars 2s infinite ease-in-out; }',
            '.qkv-card-unassigned-nguyen-header .qkv-card-count { background: rgba(255, 255, 255, 0.2) !important; color: #ffffff !important; border: 1px solid rgba(255,255,255,0.3) !important; }',
            '.qkv-card-unassigned-le { border-color: #ec4899 !important; }',
            '.qkv-card-unassigned-le-header {',
            '  background: linear-gradient(135deg, #ec4899, #be185d, #ec4899, #9d174d) !important;',
            '  background-size: 300% 300% !important;',
            '  animation: qkvShimmerGlow 6s ease infinite !important;',
            '  color: #ffffff !important;',
            '  font-weight: 900 !important;',
            '  text-shadow: 0 1px 2px rgba(0,0,0,0.2);',
            '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);',
            '}',
            '.qkv-card-unassigned-le-header .qkv-card-title { color: #ffffff !important; animation: qkvSparkleStars 2s infinite ease-in-out; }',
            '.qkv-card-unassigned-le-header .qkv-card-count { background: rgba(255, 255, 255, 0.2) !important; color: #ffffff !important; border: 1px solid rgba(255,255,255,0.3) !important; }',
            ' ',
            
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
            '}',
            '.qkv-card.collapsed .qkv-card-body { display: none !important; }'
        ].join('\n');
        document.head.appendChild(st);
    }

    // Set page layout structure
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    content.innerHTML = `
        <div class="qkv-wrap">
            <!-- Sidebar -->
            <div class="qkv-sidebar" style="${!isGD ? 'display: none !important;' : ''}">
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
                            <div class="qkv-form-group">
                                <label class="qkv-label">Giới hạn chất liệu</label>
                                <select id="qkvNewLocIsRestricted" class="qkv-select">
                                    <option value="false">Đa năng (Chất liệu nào cũng được)</option>
                                    <option value="true">Duy nhất (Chỉ 1 số chất liệu nhất định)</option>
                                </select>
                            </div>
                            <button type="submit" class="qkv-btn-primary">💾 Tạo vị trí mới</button>
                        </form>
                    </div>

                    ${isGD ? `
                    <!-- Assign Material to Shelf Form -->
                    <div class="qkv-sb-section">
                        <div class="qkv-sb-title">🚚 Xếp Chất Liệu Vào Kệ</div>
                        <form id="qkvAssignMatForm" onsubmit="_qkvOnAssignMaterial(event)">
                            <div class="qkv-form-group">
                                <label class="qkv-label">Chọn chất liệu</label>
                                <select id="qkvAssignMatSelect" class="qkv-select" required>
                                    <option value="">-- Chọn chất liệu --</option>
                                </select>
                            </div>
                            <div class="qkv-form-group">
                                <label class="qkv-label">Chọn kệ / vị trí</label>
                                <select id="qkvAssignLocSelect" class="qkv-select" required>
                                    <option value="">-- Chọn kệ / vị trí --</option>
                                </select>
                            </div>
                            <button type="submit" class="qkv-btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1);">🚚 Xếp vào kệ</button>
                        </form>
                    </div>
                    ` : ''}
                    
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

    // Pre-check toggle checkbox state
    var chkZero = document.getElementById('qkvToggleZeroInput');

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
        
        var html = '<option value="all">🏭 TẤT CẢ KHO VẢI</option>';
        _qkv.warehouses.forEach(function(w) {
            html += `<option value="${w.id}">🏭 ${w.name} (${w.unit})</option>`;
        });
        select.innerHTML = html;
        
        // Select matching warehouse or fall back to first one
        var selectedId = 'all';
        if (targetWid) {
            selectedId = targetWid === 'all' ? 'all' : (_qkv.warehouses.some(w => w.id == targetWid) ? Number(targetWid) : 'all');
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
    _qkv.selectedWid = wid === 'all' ? 'all' : Number(wid);
    await _qkvLoadData();
}

// 3. Load Locations, summary, and materials data for the selected warehouse
async function _qkvLoadData() {
    if (!_qkv.selectedWid) return;
    
    // Clear display
    var locList = document.getElementById('qkvLocList');
    var grid = document.getElementById('qkvGrid');
    if (locList) locList.innerHTML = '<div style="color:#94a3b8;font-size:12px;text-align:center;padding:20px 0;">Đang tải...</div>';
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#94a3b8;">Đang tải sơ đồ...</div>';
    
    try {
        var widParam = _qkv.selectedWid === 'all' ? '' : `?wid=${_qkv.selectedWid}`;
        var [locRes, sumRes, matRes] = await Promise.all([
            apiCall(`/api/khovai/locations`),
            apiCall(`/api/khovai/summary`),
            apiCall(`/api/khovai/materials${widParam}`)
        ]);
        
        _qkv.locations = locRes.locations || [];
        _qkv.summary = sumRes.summary || [];
        _qkv.materials = matRes.materials || [];
        
        _qkvPopulateSidebarDropdowns();
        _qkvRenderSidebarLocations();
        _qkvRenderMap();
    } catch(e) {
        console.error(e);
        showToast('Lỗi khi tải dữ liệu sơ đồ kho', 'error');
    }
}

function _qkvPopulateSidebarDropdowns() {
    var assignMat = document.getElementById('qkvAssignMatSelect');
    var assignLoc = document.getElementById('qkvAssignLocSelect');

    var assignMatOptions = '<option value="">-- Chọn chất liệu --</option>';
    (_qkv.materials || []).forEach(function(m) {
        if (m.location && m.location.trim()) {
            return;
        }
        assignMatOptions += `<option value="${m.id}">${escapeHTML(m.name)}</option>`;
    });

    if (assignMat) assignMat.innerHTML = assignMatOptions;

    var locOptions = '<option value="">-- Chọn kệ / vị trí --</option>';
    (_qkv.locations || []).forEach(function(l) {
        locOptions += `<option value="${escapeHTML(l.name)}">${escapeHTML(l.name)}</option>`;
    });
    if (assignLoc) assignLoc.innerHTML = locOptions;
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
        // Find materials assigned to this location
        var assignedMatNames = (_qkv.materials || [])
            .filter(function(m) {
                return m.location && m.location.trim().toLowerCase() === loc.name.trim().toLowerCase();
            })
            .map(function(m) { return m.name; });

        var restrictionBadge = '';
        if (loc.is_restricted) {
            if (assignedMatNames.length > 0) {
                var tooltip = escapeHTML(assignedMatNames.join(', '));
                restrictionBadge = `<span style="font-size:9px;font-weight:800;color:#e11d48;background:#fff1f2;border:1px solid #ffe4e6;padding:1px 6px;border-radius:4px;margin-left:6px;" title="${tooltip}">🔒 Duy nhất (${assignedMatNames.length} CL)</span>`;
            } else {
                restrictionBadge = `<span style="font-size:9px;font-weight:800;color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:1px 6px;border-radius:4px;margin-left:6px;">🔒 Duy nhất (Trống)</span>`;
            }
        } else {
            restrictionBadge = '<span style="font-size:9px;font-weight:800;color:#059669;background:#ecfdf5;border:1px solid #d1fae5;padding:1px 6px;border-radius:4px;margin-left:6px;">🔓 Đa năng</span>';
        }

        html += `
            <div class="qkv-loc-item">
                <div style="min-width: 0; flex: 1;">
                    <div class="qkv-loc-name">
                        ${escapeHTML(loc.name)}
                        ${restrictionBadge}
                    </div>
                    <div class="qkv-loc-desc">${loc.description ? escapeHTML(loc.description) : 'Không có ghi chú'}</div>
                </div>
                <div class="qkv-loc-actions">
                    <button class="qkv-btn-icon" onclick="_qkvShowLocationQRCode('${escapeJS(loc.name)}')" title="Xem mã QR kệ">📷</button>
                    <button class="qkv-btn-icon" onclick="_qkvEditLocation(${loc.id}, '${escapeJS(loc.name)}', '${escapeJS(loc.description || '')}', ${loc.is_restricted ? 'true' : 'false'}, ${loc.restricted_material_id || 'null'})" title="Sửa tên/mô tả/giới hạn">✏️</button>
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
    
    _qkv.activeItems = [];
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
    
    // Special unassigned groups
    var unassignedNguyen = {
        name: 'Chưa Phân Vị Trí Cây Nguyên',
        items: []
    };
    var unassignedLe = {
        name: 'Chưa Phân Vị Trí Cây Lẻ',
        items: []
    };
    
    // Group the items
    _qkv.summary.forEach(function(item) {
        if (Number(item.cuoi_ky || 0) <= 0 && Number(item.so_cuc || 0) <= 0) {
            return;
        }
        var key = (item.location || '').trim();
        var isPredefined = _qkv.locations.some(l => l.name === key);
        
        var rollsList = item.roll_weights || [];
        
        if (rollsList.length === 0) {
            if (key && isPredefined) {
                groups[key].items.push(item);
            } else {
                if (_qkv.selectedWid === 'all' || item.warehouse_id === _qkv.selectedWid) {
                    unassignedNguyen.items.push(item);
                }
            }
        } else {
            // Group rolls of this item by their target bucket
            var rollBuckets = {}; // key -> array of rolls
            
            rollsList.forEach(function(r) {
                var rollLoc = (r.loc !== null && r.loc !== undefined) ? r.loc.trim() : null;
                var isNguyen = Number(r.w) >= Number(r.ow);
                
                var targetBucket = '';
                if (isNguyen) {
                    if (rollLoc && _qkv.locations.some(l => l.name === rollLoc)) {
                        targetBucket = rollLoc;
                    } else if (rollLoc === '') {
                        targetBucket = 'unassignedNguyen';
                    } else {
                        if (key && isPredefined) {
                            targetBucket = key;
                        } else {
                            targetBucket = 'unassignedNguyen';
                        }
                    }
                } else {
                    if (rollLoc && _qkv.locations.some(l => l.name === rollLoc)) {
                        targetBucket = rollLoc;
                    } else {
                        targetBucket = 'unassignedLe';
                    }
                }
                
                if (!rollBuckets[targetBucket]) {
                    rollBuckets[targetBucket] = [];
                }
                rollBuckets[targetBucket].push(r);
            });
            
            // For each target bucket, create a copied item and push it
            for (var target in rollBuckets) {
                var subRolls = rollBuckets[target];
                
                // For unassigned items, filter by selectedWid
                if (target === 'unassignedNguyen') {
                    if (_qkv.selectedWid !== 'all' && item.warehouse_id !== _qkv.selectedWid) {
                        continue;
                    }
                } else if (target === 'unassignedLe') {
                    if (_qkv.selectedWid !== 'all' && item.warehouse_id !== _qkv.selectedWid) {
                        continue;
                    }
                }
                
                var subItem = Object.assign({}, item);
                subItem.roll_weights = subRolls;
                subItem.so_cuc = subRolls.length;
                subItem.cuoi_ky = subRolls.reduce(function(sum, r) { return sum + Number(r.w); }, 0);
                
                if (target === 'unassignedNguyen') {
                    unassignedNguyen.items.push(subItem);
                } else if (target === 'unassignedLe') {
                    unassignedLe.items.push(subItem);
                } else {
                    if (groups[target]) {
                        groups[target].items.push(subItem);
                    }
                }
            }
        }
    });

    _qkv.unassignedLe = unassignedLe.items || [];
    _qkv.unassignedNguyen = unassignedNguyen.items || [];
    
    // Build Cards HTML
    var html = '';
    var searchKey = (_qkv.searchText || '').toLowerCase().trim();
    
    // RENDER PREDEFINED LOCATION CARDS
    _qkv.locations.forEach(function(loc) {
        var group = groups[loc.name] || { items: [] };
        var cardHtml = _qkvBuildCardHtml(group, false, searchKey);
        html += cardHtml;
    });
    
    // RENDER UNASSIGNED CARDS AT THE END
    if (unassignedLe.items.length > 0 || _qkv.locations.length === 0) {
        var cardHtml = _qkvBuildCardHtml(unassignedLe, 'le', searchKey);
        html += cardHtml;
    }
    
    if (unassignedNguyen.items.length > 0 || (_qkv.locations.length === 0 && unassignedLe.items.length === 0)) {
        var cardHtml = _qkvBuildCardHtml(unassignedNguyen, 'nguyen', searchKey);
        html += cardHtml;
    }
    
    grid.innerHTML = html;
    _qkv.groups = groups;
}

// 6. Build single Card HTML
function _qkvBuildCardHtml(group, isUnassigned, searchKey) {
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var headerClass = '';
    var cardClass = 'qkv-card';
    
    if (isUnassigned === 'nguyen') {
        headerClass = 'qkv-card-unassigned-nguyen-header';
        cardClass = 'qkv-card qkv-card-unassigned qkv-card-unassigned-nguyen';
    } else if (isUnassigned === 'le') {
        headerClass = 'qkv-card-unassigned-le-header';
        cardClass = 'qkv-card qkv-card-unassigned qkv-card-unassigned-le';
    } else if (isUnassigned) {
        headerClass = 'qkv-card-unassigned-header';
        cardClass = 'qkv-card qkv-card-unassigned';
    }
    
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
        // Group the items inside the card by material_name
        var materialGroups = {};
        group.items.forEach(function(item) {
            var matName = item.material_name;
            if (!materialGroups[matName]) {
                materialGroups[matName] = {
                    material_name: matName,
                    unit: item.unit,
                    warehouse_name: item.warehouse_name,
                    items: [],
                    anyMatched: false
                };
            }
            
            _qkv.activeItems.push(item);
            var itemIdx = _qkv.activeItems.length - 1;
            item._itemIdx = itemIdx;

            var matched = false;
            if (searchKey) {
                matched = (item.material_name || '').toLowerCase().includes(searchKey)
                    || (item.color_name || '').toLowerCase().includes(searchKey)
                    || (item.location || '').toLowerCase().includes(searchKey);
                if (matched) {
                    isCardHighlighted = true;
                    matchCount++;
                    materialGroups[matName].anyMatched = true;
                }
            }
            
            item._matched = matched;
            materialGroups[matName].items.push(item);
        });

        // Generate HTML for grouped materials
        Object.keys(materialGroups).forEach(function(matName) {
            var materialGroup = materialGroups[matName];
            var totalWeight = materialGroup.items.reduce((sum, item) => sum + Number(item.cuoi_ky || 0), 0);
            var totalRolls = materialGroup.items.reduce((sum, item) => sum + Number(item.so_cuc || 0), 0);
            
            var groupBodyStyle = (searchKey && materialGroup.anyMatched) ? 'display: block;' : 'display: none;';
            var groupArrowText = (searchKey && materialGroup.anyMatched) ? '▼' : '▶';

            itemsHtml += `
                <div class="qkv-material-group" data-material="${escapeHTML(matName)}" style="margin-bottom: 8px;">
                    <div class="qkv-material-group-header" onclick="_qkvToggleMaterialGroup(this)" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; font-weight:800; font-size:12.5px; color:#1e293b; user-select:none;">
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;">🧵 ${escapeHTML(matName)}</span>
                        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                            <span style="font-size:11px; color:#475569; font-weight:700;">${_qkvFmt(totalWeight)} ${escapeHTML(materialGroup.unit || 'kg')} (${totalRolls} cây)</span>
                            <span class="qkv-group-arrow" style="font-size:10px; color:#64748b;">${groupArrowText}</span>
                        </div>
                    </div>
                    <div class="qkv-material-group-body" style="${groupBodyStyle} padding-left:6px; border-left:2px dashed #cbd5e1; margin-top:6px; margin-left:8px;">
            `;

            materialGroup.items.forEach(function(item) {
                var prefix = isUnassigned ? `<span style="font-size:10px; background:#0f766e; color:#ffffff; padding:2px 6px; border-radius:4px; margin-right:6px; font-weight:normal; text-transform:uppercase;">${escapeHTML(item.warehouse_name)}</span>` : '';
                
                var colorBodyStyle = (searchKey && item._matched) ? 'display: flex;' : 'display: none;';
                var colorArrowText = (searchKey && item._matched) ? '▼' : '▶';

                itemsHtml += `
                    <div class="qkv-material-color-frame" style="border: 1px solid #e2e8f0; background: #fafafa; border-radius: 8px; padding: 8px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.01);">
                        <div class="qkv-item-row ${item._matched ? 'matched' : ''}" onclick="_qkvToggleColorRolls(this)" style="border:none; background:transparent; margin-bottom:0; padding:0; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
                            <div class="qkv-item-main" style="min-width:0; flex:1;">
                                <div class="qkv-item-sub" style="margin-top:0; font-size:12px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                                    ${prefix}
                                    Màu: <span style="font-weight:700;color:#ffffff;background:#e65100;padding:2px 6px;border-radius:4px;font-size:11px;box-shadow: 0 0 6px rgba(230,81,0,0.4);display:inline-block;">${escapeHTML(item.color_name)}</span>
                                </div>
                            </div>
                            <div class="qkv-item-balance" style="font-size:12px; text-align:right; font-weight:700; color:#334155; margin-left:8px; flex-shrink:0;">
                                ${_qkvFmt(item.cuoi_ky)} ${escapeHTML(item.unit || 'kg')} / <span style="font-size:10px;color:#64748b;font-weight:normal;">${item.so_cuc} cây</span>
                            </div>
                            <div class="qkv-loc-actions" style="margin-left:8px; display:flex; align-items:center; gap:6px; flex-shrink:0;">
                                ${(!isUnassigned && isGD) ? `
                                <button class="qkv-btn-icon" style="padding:4px; font-size:11px;" onclick="event.stopPropagation(); _qkvOnChangeItemLocationByIndex(${item._itemIdx})" title="Di chuyển vị trí">🚚</button>
                                ` : ''}
                                <span class="qkv-color-arrow" style="font-size:10px; color:#94a3b8; font-weight:bold; margin-left:2px;">${colorArrowText}</span>
                            </div>
                        </div>
                        
                        <!-- Rolls list for this color (collapsible!) -->
                        <div class="roll-list-container" style="${colorBodyStyle} background:#f8fafc; border-radius:6px; padding:6px; margin-top:8px; border:1px solid #e2e8f0; flex-direction:column; gap:4px; width:100%; box-sizing:border-box;">
                            ${item.roll_weights && item.roll_weights.length > 0 ? item.roll_weights.map(r => {
                                var photoHtml = '';
                                var moveHtml = '';
                                if (r.img) {
                                    photoHtml = `<img src="${escapeHTML(r.img)}" style="width:36px; height:36px; border-radius:4px; object-fit:cover; border:1px solid #0f766e; cursor:pointer;" onclick="event.stopPropagation(); openImagePreviewModal('${escapeHTML(r.img)}')" />`;
                                    if (isGD) {
                                        moveHtml = `<button class="qkv-btn-icon" style="padding:2px 6px;" onclick="event.stopPropagation(); _qkvOnChangeSingleRollLocation(${r.id}, '${escapeHTML(item.material_name)}', '${escapeHTML(item.color_name)}', ${item.id}, ${item.material_id}, ${r.w}, '${escapeHTML(r.code || '')}')" title="Di chuyển vị trí">🚚</button>`;
                                    }
                                } else {
                                    photoHtml = `<button id="camera-btn-${r.id}" class="btn btn-xs btn-outline-primary" style="padding:2px 6px; font-size:10px;" onclick="event.stopPropagation(); triggerRollCamera(${r.id})">📷 Chụp</button>`;
                                    moveHtml = `<span style="font-size:11px; color:#64748b; font-style:italic;">Chờ chụp ảnh</span>`;
                                }
                                return `
                                    <div class="roll-row-item" style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px solid #e2e8f0;">
                                        <div style="flex:1; min-width:0;">
                                            <div style="font-size:12px; font-weight:700; color:#334155;">Cây ${r.w}kg</div>
                                            <div style="font-size:10px; color:#64748b; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.code || 'không mã'}</div>
                                        </div>
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            ${photoHtml}
                                            ${moveHtml}
                                        </div>
                                    </div>
                                `;
                            }).join('') : `<div style="font-size:11px; color:#94a3b8; font-style:italic; text-align:center;">Không có dữ liệu cây vải</div>`}
                        </div>
                    </div>
                `;
            });

            itemsHtml += `
                    </div>
                </div>
            `;
        });
    }
    
    var isCollapsed = false;
    if (searchKey) {
        isCollapsed = !isCardHighlighted;
    } else {
        isCollapsed = _qkvCollapsedShelves[group.name] === true; // defaults to false (always expanded!)
    }

    if (isCollapsed) {
        cardClass += ' collapsed';
    }
    if (isCardHighlighted) {
        cardClass += ' highlighted';
    }
    
    var icon = isUnassigned ? '⚠️' : '📍';
    var descHtml = group.description ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">${escapeHTML(group.description)}</div>` : '';
    
    var totalRolls = group.items.reduce(function(sum, item) { return sum + (Number(item.so_cuc) || 0); }, 0);
    var countBadge = group.items.length > 0 ? `<span class="qkv-card-count">${group.items.length} mặt hàng / ${totalRolls} cây</span>` : '';
    if (searchKey && matchCount > 0) {
        countBadge = `<span class="qkv-card-count" style="background:#fef3c7;color:#d97706;">Tìm thấy ${matchCount}</span>`;
    }

    var qrButton = (!isUnassigned && isGD) ? `<button class="qkv-btn-icon" style="font-size:12px; margin-left: 6px;" onclick="event.stopPropagation(); _qkvShowLocationQRCode('${escapeJS(group.name)}')" title="Xem mã QR của kệ này">📷 QR</button>` : '';
    
    var searchBoxHtml = '';
    if (group.items.length > 0) {
        searchBoxHtml = `
            <div class="qkv-card-search-container" style="margin-bottom: 8px;" onclick="event.stopPropagation();">
                <input type="text" placeholder="Tìm chất liệu, màu..." class="qkv-card-search-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px; outline: none; background: #fff;" oninput="_qkvFilterCardItems(this)">
            </div>
        `;
    }

    return `
        <div class="${cardClass}">
            <div class="qkv-card-header ${headerClass}" style="cursor:pointer;" onclick="${!isUnassigned ? `_qkvShowShelfDetailModal('${escapeJS(group.name)}')` : `_qkvToggleShelfCollapse(this, '${escapeJS(group.name)}')`}">
                <div style="min-width:0;flex:1;">
                    <div class="qkv-card-title">
                        <span>${icon} ${escapeHTML(group.name)}</span>
                        ${qrButton}
                    </div>
                    ${descHtml}
                </div>
                ${countBadge}
            </div>
            <div class="qkv-card-body">
                ${searchBoxHtml}
                ${itemsHtml}
            </div>
        </div>
    `;
}

function _qkvToggleMaterialGroup(headerEl) {
    var body = headerEl.nextElementSibling;
    var arrow = headerEl.querySelector('.qkv-group-arrow');
    if (!body || !arrow) return;
    if (body.style.display === 'none') {
        body.style.display = 'block';
        arrow.textContent = '▼';
    } else {
        body.style.display = 'none';
        arrow.textContent = '▶';
    }
}

function _qkvToggleColorRolls(rowEl) {
    var frame = rowEl.closest('.qkv-material-color-frame');
    if (!frame) return;
    var container = frame.querySelector('.roll-list-container');
    var arrow = frame.querySelector('.qkv-color-arrow');
    if (!container || !arrow) return;
    if (container.style.display === 'none') {
        container.style.display = 'flex';
        arrow.textContent = '▼';
    } else {
        container.style.display = 'none';
        arrow.textContent = '▶';
    }
}

function _qkvFilterCardItems(input) {
    var val = (input.value || '').toLowerCase().trim();
    var cardBody = input.closest('.qkv-card-body');
    if (!cardBody) return;
    
    var groups = cardBody.querySelectorAll('.qkv-material-group');
    groups.forEach(function(group) {
        var groupBody = group.querySelector('.qkv-material-group-body');
        var groupHeader = group.querySelector('.qkv-material-group-header');
        var arrow = group.querySelector('.qkv-group-arrow');
        var items = group.querySelectorAll('.qkv-material-color-frame');
        
        var anyVisible = false;
        items.forEach(function(item) {
            var text = (item.textContent || '').toLowerCase();
            if (text.includes(val)) {
                item.style.setProperty('display', 'block', 'important');
                anyVisible = true;
                
                // If filtering is active, auto-expand color rolls if they match search exactly
                var container = item.querySelector('.roll-list-container');
                var colorArrow = item.querySelector('.qkv-color-arrow');
                if (val.length > 0 && container && colorArrow) {
                    container.style.display = 'flex';
                    colorArrow.textContent = '▼';
                }
            } else {
                item.style.setProperty('display', 'none', 'important');
            }
        });
        
        if (anyVisible) {
            group.style.setProperty('display', 'block', 'important');
            if (val.length > 0 && groupBody && arrow) {
                groupBody.style.display = 'block';
                arrow.textContent = '▼';
            }
        } else {
            group.style.setProperty('display', 'none', 'important');
        }
    });
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
    var isRestrictedEl = document.getElementById('qkvNewLocIsRestricted');
    
    var name = nameEl.value.trim();
    var desc = descEl.value.trim();
    var isRestricted = isRestrictedEl ? (isRestrictedEl.value === 'true') : false;
    
    if (!name) return;
    
    try {
        var res = await apiCall('/api/khovai/locations', 'POST', {
            warehouse_id: _qkv.selectedWid,
            name: name,
            description: desc,
            is_restricted: isRestricted
        });
        
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        
        showToast(`Tạo vị trí "${name}" thành công!`, 'success');
        nameEl.value = '';
        descEl.value = '';
        if (isRestrictedEl) isRestrictedEl.value = 'false';
        
        await _qkvLoadData();
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi lưu vị trí mới', 'error');
    }
}

// 9. Edit Location modal
function _qkvEditLocation(id, name, desc, isRestricted, restrictedMaterialId) {
    var statusText = '';
    if (isRestricted) {
        statusText = `<div style="font-size:11px;color:#e11d48;margin-top:6px;font-weight:600;">🔒 Chỉ các chất liệu được xếp dưới đây mới được phép di chuyển vào kệ này.</div>`;
    }

    // Find materials assigned to this shelf
    var assignedMats = (_qkv.materials || []).filter(function(m) {
        return m.location && m.location.trim().toLowerCase() === name.trim().toLowerCase();
    });

    var matsHtml = '';
    if (assignedMats.length > 0) {
        matsHtml = `
            <div style="margin-top:15px; border-top: 1px solid var(--gray-200); padding-top:12px;">
                <label class="form-label" style="font-weight:700;font-size:12px;margin-bottom:8px;display:block;color:var(--navy);">📦 Chất liệu hiện có trong kệ:</label>
                <div style="display:flex; flex-direction:column; gap:8px;">
        `;
        assignedMats.forEach(function(m) {
            matsHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(212,168,67,0.06); border: 1px solid rgba(212,168,67,0.2); padding:6px 12px; border-radius:6px;">
                    <span style="font-size:13px; font-weight:600; color:var(--navy);">${escapeHTML(m.name)}</span>
                    <button class="btn btn-danger" style="padding: 2px 8px; font-size:11px; height:auto; line-height:1.2;" onclick="_qkvRemoveMaterialFromLocation(${m.id}, ${id})">❌ Gỡ khỏi kệ</button>
                </div>
            `;
        });
        matsHtml += `
                </div>
            </div>
        `;
    } else {
        matsHtml = `
            <div style="margin-top:15px; border-top: 1px solid var(--gray-200); padding-top:12px; color: #94a3b8; font-size:12px; text-align:center; font-style:italic;">
                Chưa có chất liệu nào xếp trong kệ này.
            </div>
        `;
    }

    openModal(
        '✏️ Sửa Vị Trí / Kệ',
        `
            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Tên Vị Trí</label>
                <input type="text" id="qkvEditName" class="form-control" value="${escapeHTML(name)}" required />
            </div>
            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Mô tả / Ghi chú</label>
                <input type="text" id="qkvEditDesc" class="form-control" value="${escapeHTML(desc)}" />
            </div>
            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Giới hạn chất liệu</label>
                <select id="qkvEditIsRestricted" class="form-control" style="height:38px; padding:4px 12px; line-height:30px;">
                    <option value="false" ${!isRestricted ? 'selected' : ''}>Đa năng (Chất liệu nào cũng được)</option>
                    <option value="true" ${isRestricted ? 'selected' : ''}>Duy nhất (Chỉ 1 số chất liệu nhất định)</option>
                </select>
                ${statusText}
            </div>
            ${matsHtml}
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
            <button class="btn btn-primary" onclick="_qkvSaveLocation(${id})">💾 Lưu lại</button>
        `
    );
}

// 9b. Remove material from location
async function _qkvRemoveMaterialFromLocation(matId, locId) {
    if (!confirm('Bạn có chắc muốn gỡ chất liệu này khỏi kệ?')) return;
    
    try {
        var res = await apiCall(`/api/khovai/materials/${matId}`, 'PUT', {
            location: null
        });
        
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        
        showToast('Gỡ chất liệu khỏi kệ thành công!', 'success');
        
        await _qkvLoadData();
        
        var loc = (_qkv.locations || []).find(l => l.id == locId);
        if (loc) {
            closeModal();
            _qkvEditLocation(loc.id, loc.name, loc.description || '', loc.is_restricted, loc.restricted_material_id);
        } else {
            closeModal();
        }
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi gỡ chất liệu khỏi kệ', 'error');
    }
}

// 10. Save edited location to database
async function _qkvSaveLocation(id) {
    var name = document.getElementById('qkvEditName').value.trim();
    var desc = document.getElementById('qkvEditDesc').value.trim();
    var isRestrictedEl = document.getElementById('qkvEditIsRestricted');
    var isRestricted = isRestrictedEl ? (isRestrictedEl.value === 'true') : false;
    
    if (!name) {
        showToast('Tên vị trí không được để trống', 'error');
        return;
    }
    
    try {
        var res = await apiCall(`/api/khovai/locations/${id}`, 'PUT', {
            name: name,
            description: desc,
            is_restricted: isRestricted
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

// 10b. Assign a material to a shelf
async function _qkvOnAssignMaterial(e) {
    e.preventDefault();
    var matId = document.getElementById('qkvAssignMatSelect').value;
    var locName = document.getElementById('qkvAssignLocSelect').value;
    if (!matId) { showToast('Vui lòng chọn chất liệu!', 'error'); return; }
    if (!locName) { showToast('Vui lòng chọn kệ!', 'error'); return; }

    try {
        var res = await apiCall(`/api/khovai/materials/${matId}`, 'PUT', {
            location: locName
        });
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        showToast('Xếp chất liệu vào kệ thành công!', 'success');
        await _qkvLoadData();
    } catch(err) {
        console.error(err);
        showToast('Lỗi khi xếp chất liệu', 'error');
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

function _qkvOnChangeItemLocationByIndex(index) {
    var item = _qkv.activeItems[index];
    if (!item) return;
    _qkvOnChangeItemLocation(
        item.id,
        item.material_id,
        item.material_name,
        item.color_name,
        item.location || '',
        JSON.stringify(item.roll_weights || [])
    );
}

// 13. Move item position modal
function _qkvOnChangeItemLocation(id, materialId, matName, colorName, currentLoc, rollsJson) {
    var rolls = [];
    try { rolls = JSON.parse(rollsJson || '[]'); } catch(e) {}

    _qkv.activeMoveMaterialId = materialId;

    openModal(
        '🚚 Di chuyển vị trí vải',
        `
            <div style="font-size:13px;line-height:1.6;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <div>🧵 Chất liệu: <strong>${escapeHTML(matName)}</strong></div>
                <div>🎨 Màu vải: <strong style="color:#0f766e;">${escapeHTML(colorName)}</strong></div>
                <div>📍 Vị trí hiện tại: <strong>${currentLoc ? escapeHTML(currentLoc) : 'Chưa phân vị trí'}</strong></div>
            </div>
            
            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Di chuyển cây vải được chọn dưới đây:</label>
                ${rolls.length > 0 ? `
                <div id="qkvMoveRollsContainer" style="max-height:150px; overflow-y:auto; border:1px solid var(--gray-300); border-radius:6px; padding:8px; background:#fff; display:flex; flex-direction:column; gap:6px;">
                    ${rolls.map(r => `
                        <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; font-weight:500;">
                            <input type="checkbox" name="qkvMoveRollCheckbox" value="${r.id}" checked />
                            <span>Cây <strong>${r.w}kg</strong> (${r.code || 'không mã'})${r.loc ? ' - Kệ: ' + escapeHTML(r.loc) : ''}</span>
                        </label>
                    `).join('')}
                </div>
                ` : `
                <div style="color:var(--gray-500);font-size:13px;font-style:italic;">Màu này hiện chưa có cây vải nào để di chuyển vị trí.</div>
                `}
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Xếp vào kệ</label>
                <select id="qkvMoveSelect" class="form-control" style="width:100%;height:38px;padding:4px 12px;line-height:30px;">
                    <!-- Filled by js -->
                </select>
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" onclick="_qkvSaveItemLocation(${id}, ${materialId})" ${rolls.length === 0 ? 'disabled' : ''}>🚚 Lưu vị trí mới</button>
        `
    );
    
    _qkvUpdateLocationDropdown();
}

function _qkvUpdateLocationDropdown() {
    var select = document.getElementById('qkvMoveSelect');
    if (!select) return;
    
    var activeMat = (_qkv.materials || []).find(m => Number(m.id) === Number(_qkv.activeMoveMaterialId));
    var activeMatLocs = [];
    if (activeMat && activeMat.location) {
        activeMatLocs = activeMat.location.split(',').map(s => s.trim().toLowerCase());
    }

    var availableLocs = (_qkv.locations || []).filter(function(loc) {
        if (loc.is_restricted) {
            // Find all materials assigned to this location name (case-insensitive, trimmed comparison)
            var assignedMatIds = (_qkv.materials || [])
                .filter(function(m) {
                    return m.location && m.location.trim().toLowerCase() === loc.name.trim().toLowerCase();
                })
                .map(function(m) { return Number(m.id); });
            
            if (!assignedMatIds.includes(Number(_qkv.activeMoveMaterialId)) && 
                (!loc.restricted_material_id || Number(loc.restricted_material_id) !== Number(_qkv.activeMoveMaterialId))) {
                return false;
            }
        }
        return true;
    });

    var priorityLocs = [];
    var otherLocs = [];
    availableLocs.forEach(function(loc) {
        var isPri = activeMatLocs.includes(loc.name.trim().toLowerCase()) || 
                    (loc.restricted_material_id && Number(loc.restricted_material_id) === Number(_qkv.activeMoveMaterialId));
        if (isPri) {
            priorityLocs.push(loc);
        } else {
            otherLocs.push(loc);
        }
    });

    var sortedLocs = priorityLocs.concat(otherLocs);
    
    var html = '';
    html += `<option value="">-- Chưa phân vị trí --</option>`;
    sortedLocs.forEach(function(loc) {
        var descText = loc.description ? ` (${loc.description})` : '';
        html += `<option value="${escapeHTML(loc.name)}">${escapeHTML(loc.name)}${escapeHTML(descText)}</option>`;
    });
    select.innerHTML = html;
    
    if (priorityLocs.length > 0) {
        select.value = priorityLocs[0].name;
    } else {
        select.value = '';
    }
}

// 14. Save new location mapping to material/color/roll
async function _qkvSaveItemLocation(colorId, materialId) {
    var newLoc = document.getElementById('qkvMoveSelect').value;
    if (!newLoc) {
        showToast('Vui lòng chọn kệ để xếp vải!', 'error');
        return;
    }
    
    try {
        var checkboxes = document.querySelectorAll('input[name="qkvMoveRollCheckbox"]:checked');
        if (checkboxes.length === 0) {
            showToast('Vui lòng chọn ít nhất một cây vải!', 'error');
            return;
        }
        var rollIds = Array.from(checkboxes).map(cb => Number(cb.value));
        var targetLoc = newLoc || null;
        var res = await apiCall(`/api/khovai/rolls/batch`, 'PUT', {
            roll_ids: rollIds,
            location: targetLoc
        });
        
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
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    if (!isGD) {
        showToast('Bạn không có quyền thực hiện chức năng này!', 'error');
        return;
    }
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
    
    if (!window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        showToast('⚠️ Trình duyệt yêu cầu kết nối bảo mật HTTPS để mở camera! Vui lòng đổi sang địa chỉ https://', 'error');
        _qkvStopQRScan();
        return;
    }

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
        var errMsg = err ? (err.message || err.toString()) : '';
        if (errMsg.indexOf('NotAllowedError') >= 0 || errMsg.indexOf('Permission denied') >= 0) {
            showToast('🚫 Bạn đã chặn quyền camera. Vui lòng cấp lại quyền camera trong cài đặt trình duyệt!', 'error');
        } else {
            showToast('❌ Lỗi mở camera: ' + errMsg + '. Hãy chắc chắn bạn đã cấp quyền!', 'error');
        }
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
    
    // Check if target shelf is restricted
    var targetLoc = (_qkv.locations || []).find(function(l) {
        return l.name.trim().toLowerCase() === shelfName.trim().toLowerCase();
    });

    function isMaterialAllowed(item) {
        if (!targetLoc || !targetLoc.is_restricted) return true;
        
        var assignedMatIds = (_qkv.materials || [])
            .filter(function(m) {
                return m.location && m.location.trim().toLowerCase() === targetLoc.name.trim().toLowerCase();
            })
            .map(function(m) { return Number(m.id); });
        
        if (assignedMatIds.includes(Number(item.material_id)) || 
            (targetLoc.restricted_material_id && Number(targetLoc.restricted_material_id) === Number(item.material_id))) {
            return true;
        }
        return false;
    }

    function buildImportItemHtml(item, isAllowed) {
        var currentLocText = item.location ? `(Ở kệ: ${item.location})` : '(Chưa xếp vị trí)';
        var opacityStyle = isAllowed ? '' : 'opacity:0.35; filter:grayscale(0.5); cursor:not-allowed;';
        var clickHandler = isAllowed
            ? `onclick="_qkvOnQuickSelectClick(${item.id}, ${item.material_id}, '${escapeJS(item.color_name)}', '${escapeJS(item.material_name)}', '${escapeJS(shelfName)}')"`
            : `onclick="showToast('Kệ này giới hạn chất liệu khác, không thể xếp loại vải này vào!', 'warning')"` ;

        return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid #f1f5f9; background:#fff; border-radius:8px; margin-bottom:6px; border:1px solid #e2e8f0; ${opacityStyle}" ${clickHandler} onmouseover="if(${isAllowed}) this.style.borderColor='#0d9488'" onmouseout="if(${isAllowed}) this.style.borderColor='#e2e8f0'">
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
    }

    var leItems = (_qkv.unassignedLe || []).filter(function(item) {
        if (searchVal) {
            return (item.material_name || '').toLowerCase().includes(searchVal)
                || (item.color_name || '').toLowerCase().includes(searchVal);
        }
        return true;
    });

    var nguyenItems = (_qkv.unassignedNguyen || []).filter(function(item) {
        if (searchVal) {
            return (item.material_name || '').toLowerCase().includes(searchVal)
                || (item.color_name || '').toLowerCase().includes(searchVal);
        }
        return true;
    });

    if (leItems.length === 0 && nguyenItems.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:11px; font-weight:500;">Không có cây vải chưa phân vị trí phù hợp</div>';
        return;
    }

    var html = '';

    // 1. Render Lẻ items
    if (leItems.length > 0) {
        html += `
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#ec4899; background:rgba(236,72,153,0.06); padding:4px 8px; border-radius:4px; margin:8px 0 6px 0; border:1px solid rgba(236,72,153,0.15); display:flex; align-items:center; justify-content:space-between;">
                <span>⚠️ Chưa Phân Vị Trí Cây Lẻ</span>
                <span style="font-size:9px; background:#ec4899; color:white; padding:1px 5px; border-radius:10px;">${leItems.length}</span>
            </div>
        `;
        leItems.forEach(function(item) {
            html += buildImportItemHtml(item, isMaterialAllowed(item));
        });
    }

    // 2. Render Nguyên items
    if (nguyenItems.length > 0) {
        html += `
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#d97706; background:rgba(217,119,6,0.06); padding:4px 8px; border-radius:4px; margin:12px 0 6px 0; border:1px solid rgba(217,119,6,0.15); display:flex; align-items:center; justify-content:space-between;">
                <span>⚠️ Chưa Phân Vị Trí Cây Nguyên</span>
                <span style="font-size:9px; background:#d97706; color:white; padding:1px 5px; border-radius:10px;">${nguyenItems.length}</span>
            </div>
        `;
        nguyenItems.forEach(function(item) {
            html += buildImportItemHtml(item, isMaterialAllowed(item));
        });
    }

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

// ================== SINGLE ROLL MOVE & CAMERA HANDLERS ==================
function _qkvOnChangeSingleRollLocation(rollId, matName, colorName, colorId, materialId, rollWeight, rollCode) {
    _qkv.activeMoveMaterialId = materialId;

    openModal(
        '🚚 Di chuyển vị trí cây vải',
        `
            <div style="font-size:13px;line-height:1.6;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <div>🧵 Chất liệu: <strong>${escapeHTML(matName)}</strong></div>
                <div>🎨 Màu vải: <strong style="color:#0f766e;">${escapeHTML(colorName)}</strong></div>
                <div>📍 Cây vải cần chuyển: <strong>Cây ${rollWeight}kg (${rollCode})</strong></div>
            </div>
            
            <div class="form-group" style="margin-bottom:16px; display:none;">
                <input type="checkbox" name="qkvMoveRollCheckbox" value="${rollId}" checked style="width:14px; height:14px;" onclick="return false;" />
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-weight:700;font-size:12px;">Xếp vào kệ</label>
                <select id="qkvMoveSelect" class="form-control" style="width:100%;height:38px;padding:4px 12px;line-height:30px;">
                    <!-- Filled by js -->
                </select>
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" onclick="_qkvSaveItemLocation(${colorId}, ${materialId})">Lưu vị trí mới</button>
        `
    );
    
    _qkvUpdateLocationDropdown();
}

var activeUploadRollId = null;

function triggerRollCamera(rollId) {
    activeUploadRollId = rollId;
    var input = document.getElementById('qkvGlobalCameraInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'qkvGlobalCameraInput';
        input.accept = 'image/*';
        if (window.innerWidth < 768) {
            input.setAttribute('capture', 'environment');
        }
        input.style.display = 'none';
        input.addEventListener('change', handleCameraFileSelected);
        document.body.appendChild(input);
    }
    input.value = '';
    input.click();
}

async function handleCameraFileSelected(event) {
    var file = event.target.files[0];
    if (!file) return;

    var btn = document.getElementById('camera-btn-' + activeUploadRollId);
    var originalBtnHtml = '';
    if (btn) {
        originalBtnHtml = btn.innerHTML;
        btn.innerHTML = '⏳ ...';
        btn.disabled = true;
    }

    try {
        var resizedBase64 = await resizeImageFile(file, 800, 0.7);
        
        var res = await apiCall(`/api/khovai/rolls/${activeUploadRollId}/upload-image`, 'POST', {
            image_data: resizedBase64
        });
        
        if (res.error) {
            showToast('Lỗi upload: ' + res.error, 'error');
            if (btn) {
                btn.innerHTML = originalBtnHtml;
                btn.disabled = false;
            }
        } else {
            showToast('Đã chụp ảnh thành công!', 'success');
            await _qkvLoadData();
        }
    } catch (e) {
        console.error(e);
        showToast('Lỗi xử lý ảnh: ' + e.message, 'error');
        if (btn) {
            btn.innerHTML = originalBtnHtml;
            btn.disabled = false;
        }
    }
}

function resizeImageFile(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var w = img.width;
                var h = img.height;
                
                if (w > h) {
                    if (w > maxSide) {
                        h = Math.round(h * maxSide / w);
                        w = maxSide;
                    }
                } else {
                    if (h > maxSide) {
                        w = Math.round(w * maxSide / h);
                        h = maxSide;
                    }
                }
                
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                
                var base64 = canvas.toDataURL('image/jpeg', quality);
                resolve(base64);
            };
            img.onerror = function(err) { reject(err); };
            img.src = e.target.result;
        };
        reader.onerror = function(err) { reject(err); };
        reader.readAsDataURL(file);
    });
}

function openImagePreviewModal(imgUrl) {
    var modal = document.getElementById('qkvImagePreviewModal');
    if (!modal) {
        // Create dynamically if not exists in DOM yet
        modal = document.createElement('div');
        modal.id = 'qkvImagePreviewModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; flex-direction:column; justify-content:center; align-items:center; padding:16px;';
        modal.onclick = closeImagePreviewModal;
        
        var img = document.createElement('img');
        img.id = 'qkvImagePreviewContent';
        img.style.cssText = 'max-width:100%; max-height:80%; border-radius:8px; object-fit:contain; box-shadow:0 10px 25px rgba(0,0,0,0.5);';
        
        var text = document.createElement('div');
        text.style.cssText = 'color:white; margin-top:16px; font-size:14px; font-weight:500;';
        text.innerText = 'Chạm hoặc click bất kỳ đâu để đóng';
        
        modal.appendChild(img);
        modal.appendChild(text);
        document.body.appendChild(modal);
    }
    document.getElementById('qkvImagePreviewContent').src = imgUrl;
    modal.style.display = 'flex';
}

function closeImagePreviewModal() {
    var modal = document.getElementById('qkvImagePreviewModal');
    if (modal) modal.style.display = 'none';
}

var _qkvModalState = {
    shelfName: '',
    activeMaterial: '',
    searchQuery: ''
};

function _qkvShowShelfDetailModal(shelfName) {
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    
    // Find shelf location details
    var loc = _qkv.locations.find(l => l.name === shelfName);
    var descText = loc && loc.description ? loc.description : 'Không có mô tả';
    var restrictText = loc && loc.is_restricted ? '🔒 Chỉ các chất liệu nhất định' : '🔓 Đa năng (Chất liệu nào cũng được)';

    // Group items inside this shelf
    var group = _qkv.groups && _qkv.groups[shelfName] ? _qkv.groups[shelfName] : { items: [] };
    var shelfItems = group.items;

    // Compute totals
    var totalWeight = shelfItems.reduce((sum, item) => sum + Number(item.cuoi_ky || 0), 0);
    var totalRolls = shelfItems.reduce((sum, item) => sum + Number(item.so_cuc || 0), 0);

    // Initialize state
    _qkvModalState.shelfName = shelfName;
    _qkvModalState.searchQuery = '';
    
    // Default to first material
    var matNames = [];
    shelfItems.forEach(function(item) {
        if (!matNames.includes(item.material_name)) {
            matNames.push(item.material_name);
        }
    });
    _qkvModalState.activeMaterial = matNames[0] || '';

    var bodyHTML = `
        <div style="font-family:'Inter',sans-serif; color:#1e293b; display: flex; flex-direction: column; gap: 16px;">
            <!-- Shelf Info Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:12px 16px; flex-wrap:wrap; gap:12px;">
                <div>
                    <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">Thông tin kệ</div>
                    <div style="font-size:14px; font-weight:700; color:#0f766e; margin-top:2px;">📍 Kệ: ${escapeHTML(shelfName)} (${escapeHTML(restrictText)})</div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${escapeHTML(descText)}</div>
                </div>
                <div style="text-align:right; font-size:13px; font-weight:800; color:#334155;">
                    <span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:8px; display:inline-block; margin-right:6px;">${matNames.length} chất liệu</span>
                    <span style="background:#ccfbf1; color:#0f766e; padding:4px 10px; border-radius:8px; display:inline-block;">${_qkvFmt(totalWeight)} kg (${totalRolls} cây)</span>
                </div>
            </div>

            <!-- Search box inside detail modal -->
            <div style="position:relative;">
                <input type="text" id="qkvModalSearch" placeholder="Tìm chất liệu, màu hoặc mã cây vải..." oninput="_qkvOnModalSearch(this.value)" style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:10px; font-size:13px; outline:none; transition:border-color 0.2s;" />
            </div>

            <!-- Two-Column Layout -->
            <div style="display:flex; gap:20px; max-height: calc(85vh - 260px); min-height: 380px; overflow: hidden; align-items: stretch;">
                <!-- Left Panel: Materials Tab List -->
                <div id="qkvModalLeftCol" style="width:30%; min-width:200px; border-right:1.5px solid #e2e8f0; padding-right:16px; display:flex; flex-direction:column; gap:8px; overflow-y:auto;">
                </div>
                
                <!-- Right Panel: Colors & Rolls Grid -->
                <div id="qkvModalRightCol" style="width:70%; flex:1; padding-left:4px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
                </div>
            </div>
        </div>
    `;

    openModal(
        `🔍 Chi Tiết Kệ - ${escapeHTML(shelfName)}`,
        bodyHTML,
        `
            <button class="btn btn-secondary" onclick="closeModal()">Đóng chi tiết</button>
            ${isGD ? `<button class="btn btn-primary" onclick="_qkvShowLocationQRCode('${escapeJS(shelfName)}')" style="background:#0f766e; border-color:#0f766e;">📷 Xem QR</button>` : ''}
        `
    );

    // Expand width of modal for detailed shelf view
    var container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '950px';
        container.style.width = '95%';
    }

    // Initial render of tabs and items
    _qkvUpdateModalView();
}

function _qkvUpdateModalView() {
    var shelfName = _qkvModalState.shelfName;
    var query = (_qkvModalState.searchQuery || '').toLowerCase().trim();
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';

    var group = _qkv.groups && _qkv.groups[shelfName] ? _qkv.groups[shelfName] : { items: [] };
    var shelfItems = group.items;

    if (shelfItems.length === 0) {
        document.getElementById('qkvModalLeftCol').innerHTML = '';
        document.getElementById('qkvModalRightCol').innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b; width:100%;">
                <div style="font-size:48px; margin-bottom:12px;">📦</div>
                <div style="font-size:16px; font-weight:700;">Kệ Trống</div>
            </div>
        `;
        return;
    }

    // Group items by material
    var materialGroups = {};
    shelfItems.forEach(function(item) {
        var matName = item.material_name;
        
        // Filter rolls matching search key if query is not empty
        var matchedRolls = item.roll_weights || [];
        if (query.length > 0) {
            matchedRolls = (item.roll_weights || []).filter(function(r) {
                var rollText = `${r.w} kg ${r.code || ''}`.toLowerCase();
                return rollText.includes(query) || item.color_name.toLowerCase().includes(query) || matName.toLowerCase().includes(query);
            });
        }

        // If query is present and no rolls match, and color/material name doesn't match, skip
        var matOrColorMatch = matName.toLowerCase().includes(query) || item.color_name.toLowerCase().includes(query);
        if (query.length > 0 && matchedRolls.length === 0 && !matOrColorMatch) {
            return;
        }

        // Use original rolls if it matched on name but has no rolls (empty color)
        var finalRolls = matchedRolls;
        if (query.length > 0 && finalRolls.length === 0 && matOrColorMatch) {
            finalRolls = item.roll_weights || [];
        }

        if (!materialGroups[matName]) {
            materialGroups[matName] = {
                material_name: matName,
                unit: item.unit,
                items: []
            };
        }
        
        var subItem = Object.assign({}, item);
        subItem.roll_weights = finalRolls;
        subItem.so_cuc = finalRolls.length;
        subItem.cuoi_ky = finalRolls.reduce(function(sum, r) { return sum + Number(r.w); }, 0);
        materialGroups[matName].items.push(subItem);
    });

    var matNames = Object.keys(materialGroups);
    if (matNames.length === 0) {
        document.getElementById('qkvModalLeftCol').innerHTML = `
            <div style="font-size:12px; color:#94a3b8; text-align:center; padding:20px; width:100%;">Không có kết quả</div>
        `;
        document.getElementById('qkvModalRightCol').innerHTML = '';
        return;
    }

    // Auto switch active material if the current active one is filtered out
    if (!materialGroups[_qkvModalState.activeMaterial]) {
        _qkvModalState.activeMaterial = matNames[0];
    }

    // Render Left Panel (Tabs)
    var leftHtml = '';
    matNames.forEach(function(matName) {
        var mg = materialGroups[matName];
        var totalWeight = mg.items.reduce((sum, item) => sum + Number(item.cuoi_ky || 0), 0);
        var totalRolls = mg.items.reduce((sum, item) => sum + Number(item.so_cuc || 0), 0);
        
        var isActive = matName === _qkvModalState.activeMaterial;
        var activeStyle = isActive 
            ? 'background:#e0f2fe; border-color:#0284c7; box-shadow:0 4px 12px rgba(2, 132, 199, 0.08); font-weight:800;' 
            : 'background:#f8fafc; border-color:#cbd5e1;';

        leftHtml += `
            <div class="qkv-modal-mat-tab" onclick="_qkvSelectModalMaterial('${escapeJS(matName)}')" style="padding:12px 14px; border-radius:8px; border:1.5px solid; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; gap:4px; ${activeStyle}">
                <div style="font-size:13px; color:#1e293b; word-break:break-word;">🧵 ${escapeHTML(matName)}</div>
                <div style="font-size:11px; font-weight:700; color:#64748b; margin-top:2px;">
                    ${_qkvFmt(totalWeight)} ${escapeHTML(mg.unit || 'kg')} (${totalRolls} cây)
                </div>
            </div>
        `;
    });
    document.getElementById('qkvModalLeftCol').innerHTML = leftHtml;

    // Render Right Panel (Detail of active material)
    var rightHtml = '';
    var activeGroup = materialGroups[_qkvModalState.activeMaterial];
    if (activeGroup) {
        var matWeight = activeGroup.items.reduce((sum, item) => sum + Number(item.cuoi_ky || 0), 0);
        var matRolls = activeGroup.items.reduce((sum, item) => sum + Number(item.so_cuc || 0), 0);

        rightHtml += `
            <div style="background:#f1f5f9; padding:12px 16px; border-radius:10px; font-weight:800; font-size:15px; color:#0f766e; display:flex; justify-content:space-between; align-items:center; border:1px solid #cbd5e1; position:sticky; top:0; z-index:5;">
                <span>🧵 ${escapeHTML(_qkvModalState.activeMaterial)}</span>
                <span style="font-size:12px; color:#475569; font-weight:700;">Tổng: ${_qkvFmt(matWeight)} ${escapeHTML(activeGroup.unit || 'kg')} (${matRolls} cây)</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:16px;">
        `;

        activeGroup.items.forEach(function(item) {
            rightHtml += `
                <div style="border:1px solid #e2e8f0; border-radius:10px; background:#ffffff; padding:14px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1.5px dashed #e2e8f0; padding-bottom:8px;">
                        <span style="font-weight:800; color:white; background:#e65100; padding:4px 10px; border-radius:6px; font-size:11px; letter-spacing:0.5px;">Màu: ${escapeHTML(item.color_name)}</span>
                        <span style="font-size:12px; font-weight:800; color:#334155;">${_qkvFmt(item.cuoi_ky)} ${escapeHTML(item.unit || 'kg')} (${item.so_cuc} cây)</span>
                    </div>
                    
                    <!-- Rolls Grid -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
            `;

            if (item.roll_weights && item.roll_weights.length > 0) {
                item.roll_weights.forEach(function(r) {
                    var photoHtml = '';
                    var moveHtml = '';
                    if (r.img) {
                        photoHtml = `<img src="${escapeHTML(r.img)}" style="width:48px; height:48px; border-radius:6px; object-fit:cover; border:1.5px solid #0f766e; cursor:pointer;" onclick="event.stopPropagation(); openImagePreviewModal('${escapeHTML(r.img)}')" />`;
                        if (isGD) {
                            moveHtml = `<button class="btn btn-xs btn-outline-secondary" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); _qkvOnChangeSingleRollLocation(${r.id}, '${escapeHTML(item.material_name)}', '${escapeHTML(item.color_name)}', ${item.id}, ${item.material_id}, ${r.w}, '${escapeHTML(r.code || '')}')" title="Di chuyển vị trí">🚚 Chuyển</button>`;
                        }
                    } else {
                        photoHtml = `<button id="camera-btn-${r.id}" class="btn btn-xs btn-outline-primary" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); triggerRollCamera(${r.id})">📷 Chụp ảnh</button>`;
                        moveHtml = `<span style="font-size:11px; color:#64748b; font-style:italic;">Chờ chụp</span>`;
                    }

                    rightHtml += `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px; gap:8px;">
                            <div style="min-width:0; flex:1;">
                                <div style="font-size:13px; font-weight:800; color:#0f766e;">${r.w} kg</div>
                                <div style="font-size:10px; color:#64748b; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Mã: ${escapeHTML(r.code || 'không mã')}</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                ${photoHtml}
                                ${moveHtml}
                            </div>
                        </div>
                    `;
                });
            } else {
                rightHtml += `<div style="grid-column: 1 / -1; font-size:11px; color:#94a3b8; font-style:italic;">Không có cây vải phù hợp</div>`;
            }

            rightHtml += `
                    </div>
                </div>
            `;
        });

        rightHtml += `
            </div>
        `;
    }
    document.getElementById('qkvModalRightCol').innerHTML = rightHtml;
}

function _qkvSelectModalMaterial(matName) {
    _qkvModalState.activeMaterial = matName;
    _qkvUpdateModalView();
}

function _qkvOnModalSearch(val) {
    _qkvModalState.searchQuery = val;
    _qkvUpdateModalView();
}

