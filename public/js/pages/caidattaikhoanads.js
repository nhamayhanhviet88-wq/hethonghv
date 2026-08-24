// ========== CÀI ĐẶT TÀI KHOẢN ADS — FRONTEND (STAFF ASSIGNMENT & CUSTOM PLATFORMS HUB) ==========

window._cdaCopyText = function(elementId, labelName) {
    const el = document.getElementById(elementId);
    if (!el || !el.value || !el.value.trim()) {
        alert(`⚠️ Chưa có nội dung ${labelName} để copy!`);
        return;
    }
    const val = el.value.trim();
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(val).then(() => {
            alert(`✅ Đã copy ${labelName} vào bộ nhớ tạm!`);
        }).catch(() => {
            _cdaFallbackCopy(el, labelName);
        });
    } else {
        _cdaFallbackCopy(el, labelName);
    }
};

function _cdaFallbackCopy(el, labelName) {
    try {
        el.focus();
        el.select();
        document.execCommand('copy');
        alert(`✅ Đã copy ${labelName} vào bộ nhớ tạm!`);
    } catch(e) {
        alert(`❌ Không thể copy tự động: ${e.message}`);
    }
}

window._cdaCopyAdAccountId = function() {
    const el = document.getElementById('cda-f-adid');
    if (!el || !el.value || !el.value.trim()) {
        alert('⚠️ Chưa có Mã Account ID để copy!');
        return;
    }
    const rawVal = el.value.trim();
    const numericId = rawVal.replace(/^act_/i, '').replace(/^act/i, '').trim();

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(numericId).then(() => {
            alert(`✅ Đã copy số ID (${numericId}) vào bộ nhớ tạm!`);
        }).catch(() => {
            _cdaFallbackCopyVal(numericId, 'Số ID');
        });
    } else {
        _cdaFallbackCopyVal(numericId, 'Số ID');
    }
};

function _cdaFallbackCopyVal(val, labelName) {
    try {
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = val;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        alert(`✅ Đã copy ${labelName} (${val}) vào bộ nhớ tạm!`);
    } catch(e) {
        alert(`❌ Không thể copy tự động: ${e.message}`);
    }
}

window._cdaOpenLink = function(elementId, labelName) {
    const el = document.getElementById(elementId);
    if (!el || !el.value || !el.value.trim()) {
        alert(`⚠️ Chưa có đường link ${labelName} để mở!`);
        return;
    }
    let url = el.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    window.open(url, '_blank');
};

window._formatDateVN = function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
};

function _fmtNumber(val) {
    if (val === null || val === undefined || val === '') return '0';
    return Number(val).toLocaleString('vi-VN');
}

function _cleanNumber(val, defaultVal = 0) {
    if (val === null || val === undefined || val === '') return defaultVal;
    const str = String(val).replace(/\./g, '').replace(/,/g, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? defaultVal : num;
}

window.renderCaidattaikhoanadsPage = function(container) {
    // State
    let _accounts = [];
    let _guides = [];
    let _staffList = [];
    let _customPlatforms = [];
    let _summary = { total: 0, connected: 0, error: 0, unconfigured: 0 };
    let _selectedPlatform = 'all';
    let _selectedStaffFilter = 'all';
    let _guidePlatform = 'all';
    let _searchQuery = '';
    let _isGD = false;

    // Check user role
    try {
        const u = window.__currentUser || window._currentUser;
        if (u) {
            const r = (u.role || '').toLowerCase();
            _isGD = r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!u.is_admin;
        }
    } catch(e) {}

    container.innerHTML = `
        <style>
            @keyframes cdaPulseRed {
                0% { transform: scale(1); box-shadow: 0 0 0px rgba(239,68,68,0.4); }
                50% { transform: scale(1.02); box-shadow: 0 0 15px rgba(239,68,68,0.85); background: #ffe4e6; }
                100% { transform: scale(1); box-shadow: 0 0 0px rgba(239,68,68,0.4); }
            }
        </style>
        <div id="caidatads-root" style="padding: 24px; max-width: 1600px; margin: 0 auto; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
            
            <!-- Header -->
            <div id="cda-header" style="
                background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
                border-radius: 20px;
                padding: 32px;
                color: white;
                margin-bottom: 24px;
                box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.4);
                position: relative;
                overflow: hidden;
            ">
                <div style="position: absolute; right: -20px; top: -20px; font-size: 140px; opacity: 0.05; pointer-events: none;">⚙️</div>
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
                    <span style="
                        background: rgba(255,255,255,0.12);
                        backdrop-filter: blur(10px);
                        padding: 6px 14px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    ">⚙️ TRUNG TÂM QUẢN LÝ QUẢNG CÁO</span>

                    <!-- Top Action Buttons -->
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${_isGD ? `
                        <button id="cda-btn-manage-zalo" style="
                            background: rgba(255,255,255,0.2); color: white; border: 1.5px solid rgba(255,255,255,0.35);
                            padding: 9px 16px; border-radius: 12px; font-size: 12px; font-weight: 800;
                            cursor: pointer; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(8px);
                            transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            📱 Cài Đặt Zalo Thông Báo
                        </button>
                        <button id="cda-btn-manage-platforms" style="
                            background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25);
                            padding: 9px 16px; border-radius: 12px; font-size: 12px; font-weight: 700;
                            cursor: pointer; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(8px);
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                            🌐 Cài Đặt Mạng Xã Hội
                        </button>
                        ` : ''}
                        <button id="cda-btn-toggle-guides" style="
                            background: linear-gradient(135deg, #f59e0b, #d97706);
                            color: white; border: none; padding: 9px 18px; border-radius: 12px;
                            font-size: 12px; font-weight: 800; cursor: pointer; display: flex;
                            align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(245,158,11,0.35);
                            transition: all 0.2s;
                        " onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
                            🎬 Hướng Dẫn Cài Đặt ( <span id="cda-guides-count">0</span> video )
                        </button>
                    </div>
                </div>
                <h2 style="margin: 12px 0 8px; font-size: 28px; font-weight: 800;">
                    ⚙️ Cài Đặt Tài Khoản Ads
                </h2>
                <p style="margin: 0; opacity: 0.85; font-size: 15px; line-height: 1.6; max-width: 900px;">
                    Nơi tập trung quản lý toàn bộ tài khoản quảng cáo Facebook, TikTok, Google Ads và các mạng xã hội. Phân quyền nhân viên phụ trách và tự động giám sát kết nối Token API theo thời gian thực.
                </p>
            </div>

            <!-- Health Summary Cards -->
            <div id="cda-summary" style="
                display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px; margin-bottom: 24px;
            ">
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px;">📊 TỔNG TÀI KHOẢN</div>
                    <div id="cda-sum-total" style="font-size: 28px; font-weight: 900; color: #0f172a;">0</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Tài khoản trong hệ thống</div>
                </div>

                <div style="background: #ecfdf5; border-radius: 16px; padding: 20px; border: 1.5px solid #a7f3d0; box-shadow: 0 4px 6px -1px rgba(16,185,129,0.05);">
                    <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 6px;">🟢 ĐANG KẾT NỐI</div>
                    <div id="cda-sum-connected" style="font-size: 28px; font-weight: 900; color: #059669;">0</div>
                    <div style="font-size: 12px; color: #10b981; margin-top: 4px;">API & Token đang hoạt động tốt</div>
                </div>

                <div id="cda-error-card" style="background: #fef2f2; border-radius: 16px; padding: 20px; border: 1.5px solid #fca5a5; box-shadow: 0 4px 6px -1px rgba(220,38,38,0.05); transition: all 0.2s;">
                    <div style="font-size: 12px; font-weight: 700; color: #b91c1c; margin-bottom: 6px;">🔴 MẤT KẾT NỐI</div>
                    <div id="cda-sum-error" style="font-size: 28px; font-weight: 900; color: #dc2626;">0</div>
                    <div style="font-size: 12px; color: #ef4444; margin-top: 4px;">Cần sửa Token / Quyền hạn ngay!</div>
                </div>

                <div style="background: #fffbeb; border-radius: 16px; padding: 20px; border: 1.5px solid #fde68a; box-shadow: 0 4px 6px -1px rgba(245,158,11,0.05);">
                    <div style="font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 6px;">🟡 CHƯA CẤU HÌNH</div>
                    <div id="cda-sum-unconfigured" style="font-size: 28px; font-weight: 900; color: #d97706;">0</div>
                    <div style="font-size: 12px; color: #f59e0b; margin-top: 4px;">Thiếu ID hoặc Access Token</div>
                </div>
            </div>

            <!-- Main Toolbar & Platform Tabs -->
            <div style="
                background: white; border-radius: 18px; border: 1px solid #e2e8f0;
                padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            ">
                <!-- Top Actions Bar -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
                    <!-- Dynamic Platform Tabs (Ảnh 2 & 5) -->
                    <div id="cda-platform-tabs" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                        <!-- Rendered by JS -->
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button id="cda-btn-test-all" style="
                            padding: 10px 18px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                            background: #f8fafc; color: #334155; font-size: 13px; font-weight: 700;
                            cursor: pointer; display: flex; align-items: center; gap: 6px;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
                            ⚡ Kiểm Tra Toàn Bộ Kết Nối
                        </button>
                        ${_isGD ? `
                        <button id="cda-btn-add-account" style="
                            padding: 10px 20px; border-radius: 12px; border: none;
                            background: linear-gradient(135deg, #1877f2, #2563eb);
                            color: white; font-size: 13px; font-weight: 700;
                            cursor: pointer; display: flex; align-items: center; gap: 6px;
                            transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                            ➕ Thêm Tài Khoản Quảng Cáo Mới
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Search & Staff Filter Bar (Ảnh 2) -->
                <div style="display: flex; gap: 12px; flex-wrap: wrap; width: 100%;">
                    <!-- Staff Filter Dropdown -->
                    <div style="min-width: 220px;">
                        <select id="cda-staff-filter-select" style="
                            width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #3b82f6;
                            font-size: 13px; font-weight: 700; color: #1e3a8a; background: #eff6ff; outline: none;
                        ">
                            <option value="all">👥 Tất Cả Nhân Viên Phụ Trách</option>
                        </select>
                    </div>

                    <!-- Search Input -->
                    <div style="flex: 1; min-width: 280px;">
                        <input id="cda-search-input" type="text" placeholder="🔍 Tìm kiếm tài khoản theo tên, mã Ad Account ID, Dev Name, Nhân viên..." style="
                            width: 100%; padding: 11px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0;
                            font-size: 14px; outline: none; background: #f8fafc; box-sizing: border-box;
                        ">
                    </div>
                </div>
            </div>

            <!-- Accounts Cards Container -->
            <div id="cda-accounts-container" style="
                display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                gap: 20px; margin-bottom: 30px;
            ">
                <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: #94a3b8;">
                    <div style="font-size: 40px; margin-bottom: 12px;">⏳</div>
                    Đang tải danh sách tài khoản...
                </div>
            </div>

        </div>
    `;

    // ========== INIT DATA & LISTENERS ==========
    _initData();

    async function _initData() {
        await Promise.all([
            _loadStaffList(),
            _loadCustomPlatforms(),
            _loadGuides()
        ]);
        _renderPlatformTabs();
        _renderStaffFilterSelect();
        _loadAccounts();
        _bindEvents();
    }

    function _bindEvents() {
        // Manage Zalo Settings Button
        const manageZaloBtn = document.getElementById('cda-btn-manage-zalo');
        if (manageZaloBtn) manageZaloBtn.addEventListener('click', _showZaloSettingsModal);

        // Manage Platforms Button
        const managePlatBtn = document.getElementById('cda-btn-manage-platforms');
        if (managePlatBtn) managePlatBtn.addEventListener('click', _showCustomPlatformsManagerModal);

        // Toggle Video Guides Popup Modal
        const toggleGuidesBtn = document.getElementById('cda-btn-toggle-guides');
        if (toggleGuidesBtn) toggleGuidesBtn.addEventListener('click', _showGuidesPopupModal);

        // Staff Filter Dropdown Change
        const staffFilterSel = document.getElementById('cda-staff-filter-select');
        if (staffFilterSel) {
            staffFilterSel.addEventListener('change', (e) => {
                _selectedStaffFilter = e.target.value;
                _renderAccountsList();
            });
        }

        // Search Input
        const searchInp = document.getElementById('cda-search-input');
        if (searchInp) {
            let debounce;
            searchInp.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    _searchQuery = searchInp.value.trim().toLowerCase();
                    _renderAccountsList();
                }, 300);
            });
        }

        // Add Account Button
        const addBtn = document.getElementById('cda-btn-add-account');
        if (addBtn) addBtn.addEventListener('click', () => _showAccountModal(null));

        // Test All Connections Button
        const testAllBtn = document.getElementById('cda-btn-test-all');
        if (testAllBtn) testAllBtn.addEventListener('click', _handleTestAllConnections);
    }

    // ========== DATA LOADERS ==========
    async function _loadStaffList() {
        try {
            const res = await fetch('/api/ads-staff', { credentials: 'include' });
            const data = await res.json();
            if (data.ok) _staffList = data.staff || [];
        } catch(e) { console.error('[loadStaffList]', e); }
    }

    async function _loadCustomPlatforms() {
        try {
            const res = await fetch('/api/ads-platforms', { credentials: 'include' });
            const data = await res.json();
            if (data.ok) _customPlatforms = data.platforms || [];
        } catch(e) { console.error('[loadCustomPlatforms]', e); }
    }

    async function _loadGuides() {
        try {
            const res = await fetch('/api/ads-account-guides', { credentials: 'include' });
            const data = await res.json();
            if (data.ok) {
                _guides = data.guides || [];
                const countEl = document.getElementById('cda-guides-count');
                if (countEl) countEl.textContent = _guides.length;
            }
        } catch(e) { console.error('[loadGuides]', e); }
    }

    // ========== RENDER DYNAMIC UI COMPONENTS ==========
    function _renderPlatformTabs() {
        const tabsBox = document.getElementById('cda-platform-tabs');
        if (!tabsBox) return;

        let html = `
            <button class="cda-tab-btn ${_selectedPlatform === 'all' ? 'active' : ''}" data-plat="all" style="
                padding: 9px 16px; border-radius: 12px; border: 1.5px solid ${_selectedPlatform === 'all' ? '#3b82f6' : '#e2e8f0'};
                background: ${_selectedPlatform === 'all' ? '#3b82f6' : '#f8fafc'};
                color: ${_selectedPlatform === 'all' ? 'white' : '#475569'}; font-weight: 700; font-size: 13px;
                cursor: pointer; transition: all 0.2s;
            ">📋 Tất Cả Mạng Xã Hội</button>

            <button class="cda-tab-btn ${_selectedPlatform === 'facebook' ? 'active' : ''}" data-plat="facebook" style="
                padding: 9px 16px; border-radius: 12px; border: 1.5px solid ${_selectedPlatform === 'facebook' ? '#3b82f6' : '#e2e8f0'};
                background: ${_selectedPlatform === 'facebook' ? '#3b82f6' : '#f8fafc'};
                color: ${_selectedPlatform === 'facebook' ? 'white' : '#475569'}; font-weight: 700; font-size: 13px;
                cursor: pointer; transition: all 0.2s;
            ">📘 Facebook</button>

            <button class="cda-tab-btn ${_selectedPlatform === 'tiktok' ? 'active' : ''}" data-plat="tiktok" style="
                padding: 9px 16px; border-radius: 12px; border: 1.5px solid ${_selectedPlatform === 'tiktok' ? '#3b82f6' : '#e2e8f0'};
                background: ${_selectedPlatform === 'tiktok' ? '#3b82f6' : '#f8fafc'};
                color: ${_selectedPlatform === 'tiktok' ? 'white' : '#475569'}; font-weight: 700; font-size: 13px;
                cursor: pointer; transition: all 0.2s;
            ">🎵 TikTok</button>

            <button class="cda-tab-btn ${_selectedPlatform === 'google' ? 'active' : ''}" data-plat="google" style="
                padding: 9px 16px; border-radius: 12px; border: 1.5px solid ${_selectedPlatform === 'google' ? '#3b82f6' : '#e2e8f0'};
                background: ${_selectedPlatform === 'google' ? '#3b82f6' : '#f8fafc'};
                color: ${_selectedPlatform === 'google' ? 'white' : '#475569'}; font-weight: 700; font-size: 13px;
                cursor: pointer; transition: all 0.2s;
            ">🌐 Google Ads</button>
        `;

        // Render dynamic custom platforms created by Director
        _customPlatforms.forEach(cp => {
            const isAct = _selectedPlatform === cp.platform_key;
            html += `
                <button class="cda-tab-btn ${isAct ? 'active' : ''}" data-plat="${_escapeHtml(cp.platform_key)}" style="
                    padding: 9px 16px; border-radius: 12px; border: 1.5px solid ${isAct ? '#3b82f6' : '#e2e8f0'};
                    background: ${isAct ? '#3b82f6' : '#f8fafc'};
                    color: ${isAct ? 'white' : '#475569'}; font-weight: 700; font-size: 13px;
                    cursor: pointer; transition: all 0.2s;
                ">${_escapeHtml(cp.icon || '🌐')} ${_escapeHtml(cp.platform_name)}</button>
            `;
        });

        tabsBox.innerHTML = html;

        // Re-bind tab clicks
        tabsBox.querySelectorAll('.cda-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _selectedPlatform = btn.dataset.plat;
                _renderPlatformTabs();
                _renderAccountsList();
            });
        });
    }

    function _renderStaffFilterSelect() {
        const sel = document.getElementById('cda-staff-filter-select');
        if (!sel) return;

        let optionsHTML = `<option value="all" ${_selectedStaffFilter === 'all' ? 'selected' : ''}>👥 Tất Cả Nhân Viên Phụ Trách</option>`;
        _staffList.forEach(s => {
            optionsHTML += `<option value="${_escapeHtml(s.staff_name)}" ${_selectedStaffFilter === s.staff_name ? 'selected' : ''}>👤 ${_escapeHtml(s.staff_name)}</option>`;
        });
        sel.innerHTML = optionsHTML;
    }

    // ========== ACCOUNTS LIST RENDERING ==========
    async function _loadAccounts() {
        try {
            const res = await fetch('/api/ads-accounts', { credentials: 'include' });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            _accounts = data.accounts || [];
            _summary = data.summary || { total: 0, connected: 0, error: 0, unconfigured: 0 };
            _updateSummaryUI();
            _renderAccountsList();
        } catch (e) {
            console.error('[cda loadAccounts]', e);
            const container = document.getElementById('cda-accounts-container');
            if (container) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 16px; padding: 40px; text-align: center; color: #dc2626;">
                        ❌ Lỗi khi tải danh sách tài khoản: ${e.message}
                    </div>
                `;
            }
        }
    }

    function _updateSummaryUI() {
        const totalEl = document.getElementById('cda-sum-total');
        const connEl = document.getElementById('cda-sum-connected');
        const errEl = document.getElementById('cda-sum-error');
        const unconfEl = document.getElementById('cda-sum-unconfigured');
        const errCard = document.getElementById('cda-error-card');

        if (totalEl) totalEl.textContent = _summary.total || 0;
        if (connEl) connEl.textContent = _summary.connected || 0;
        if (errEl) errEl.textContent = _summary.error || 0;
        if (unconfEl) unconfEl.textContent = _summary.unconfigured || 0;

        if (errCard) {
            if ((_summary.error || 0) > 0) {
                errCard.style.background = '#fef2f2';
                errCard.style.borderColor = '#ef4444';
                errCard.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)';
            } else {
                errCard.style.background = '#fef2f2';
                errCard.style.borderColor = '#fca5a5';
                errCard.style.boxShadow = '0 4px 6px -1px rgba(220,38,38,0.05)';
            }
        }
    }

    function _renderAccountsList() {
        const container = document.getElementById('cda-accounts-container');
        if (!container) return;

        let filtered = _accounts.filter(a => {
            // Platform filter
            if (_selectedPlatform !== 'all') {
                if (a.platform !== _selectedPlatform) return false;
            }

            // Staff filter
            if (_selectedStaffFilter !== 'all') {
                if (a.assigned_staff_name !== _selectedStaffFilter) return false;
            }

            // Search query
            if (_searchQuery) {
                const name = (a.account_name || '').toLowerCase();
                const adId = (a.fb_ad_account_id || '').toLowerCase();
                const dev = (a.fb_dev_account_name || '').toLowerCase();
                const staff = (a.assigned_staff_name || '').toLowerCase();
                if (!name.includes(_searchQuery) && !adId.includes(_searchQuery) && !dev.includes(_searchQuery) && !staff.includes(_searchQuery)) {
                    return false;
                }
            }

            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; background: white; border-radius: 16px; border: 1.5px solid #e2e8f0; padding: 60px 20px; text-align: center; color: #64748b;">
                    <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Không tìm thấy tài khoản quảng cáo nào</div>
                    <div style="font-size: 13px; max-width: 450px; margin: 0 auto 18px;">
                        ${_selectedPlatform !== 'all' ? `Không có tài khoản thuộc nền tảng ${_selectedPlatform.toUpperCase()}.` : ''}
                        ${_selectedStaffFilter !== 'all' ? ` Không có tài khoản do ${_escapeHtml(_selectedStaffFilter)} phụ trách.` : ''}
                    </div>
                    ${_isGD ? `
                    <button onclick="document.getElementById('cda-btn-add-account')?.click()" style="
                        padding: 10px 20px; border-radius: 10px; border: none; background: #1877f2;
                        color: white; font-weight: 700; cursor: pointer; font-size: 13px;
                    ">➕ Thêm Tài Khoản Ngay</button>
                    ` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(acc => _buildAccountCardHTML(acc)).join('');
    }

    function _buildAccountCardHTML(acc) {
        const plat = (acc.platform || 'facebook').toLowerCase();
        let platBadge = '📘 Facebook';
        let platBg = '#eff6ff';
        let platColor = '#1d4ed8';

        if (plat === 'tiktok') {
            platBadge = '🎵 TikTok';
            platBg = '#f1f5f9';
            platColor = '#0f172a';
        } else if (plat === 'google') {
            platBadge = '🌐 Google Ads';
            platBg = '#fef3c7';
            platColor = '#b45309';
        } else {
            const foundCustom = _customPlatforms.find(cp => cp.platform_key === plat);
            if (foundCustom) {
                platBadge = `${foundCustom.icon || '🌐'} ${foundCustom.platform_name}`;
                platBg = '#f3e8ff';
                platColor = '#6b21a8';
            }
        }

        const st = acc.connection_status || 'unconfigured';
        let healthBadgeHTML = '';
        let borderStyle = 'border: 1.5px solid #e2e8f0;';

        let tokenWarnHTML = '';
        let tokenExpiryInfoInBox = '';
        if (acc.token_expires_at) {
            const expDate = new Date(acc.token_expires_at);
            const now = new Date();
            expDate.setHours(0,0,0,0);
            now.setHours(0,0,0,0);
            const diffTime = expDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const formattedExp = _formatDateVN(acc.token_expires_at);

            if (diffDays <= 0) {
                borderStyle = 'border: 2px solid #ef4444; box-shadow: 0 4px 14px rgba(239,68,68,0.25);';
                tokenWarnHTML = `
                    <div style="
                        background: #fef2f2; border: 2px solid #ef4444; color: #dc2626;
                        padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 12px;
                        margin-bottom: 12px; text-align: center; line-height: 1.4;
                        animation: cdaPulseRed 1.2s infinite ease-in-out;
                    ">
                        🚨 ⚠️ ACCESS TOKEN ĐÃ HẾT HẠN HÔM NAY (${formattedExp})! HÃY GIA HẠN NGAY!
                    </div>
                `;
            } else if (diffDays <= 7) {
                borderStyle = 'border: 2px solid #f43f5e; box-shadow: 0 4px 14px rgba(244,63,94,0.25);';
                tokenWarnHTML = `
                    <div style="
                        background: #fff1f2; border: 2px solid #f43f5e; color: #be123c;
                        padding: 10px 14px; border-radius: 12px; font-weight: 800; font-size: 12px;
                        margin-bottom: 12px; text-align: center; line-height: 1.4;
                        animation: cdaPulseRed 1.2s infinite ease-in-out;
                    ">
                        🚨 ⚠️ TOKEN SẮP HẾT HẠN! Còn ${diffDays} ngày nữa (Hết hạn ${formattedExp}) - Hãy gia hạn ngay!
                    </div>
                `;
            } else {
                tokenExpiryInfoInBox = `
                    <div style="display: flex; justify-content: space-between; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                        <span style="color: #64748b;">Hạn Token:</span>
                        <strong style="color: #0f172a;">📅 ${formattedExp} (còn ${diffDays} ngày)</strong>
                    </div>
                `;
            }
        }

        if (st === 'connected') {
            healthBadgeHTML = `
                <span style="
                    background: #dcfce7; color: #15803d; border: 1px solid #86efac;
                    padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
                    display: inline-flex; align-items: center; gap: 5px;
                " title="API & Access Token đang kết nối ổn định">
                    🟢 Đang kết nối
                </span>
            `;
        } else if (st === 'error') {
            borderStyle = 'border: 2px solid #fca5a5; box-shadow: 0 4px 12px rgba(239,68,68,0.1);';
            healthBadgeHTML = `
                <span style="
                    background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;
                    padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800;
                    display: inline-flex; align-items: center; gap: 5px;
                " title="${_escapeHtml(acc.connection_error || 'Phát hiện lỗi kết nối!')}">
                    🔴 Mất kết nối (Lỗi Token)
                </span>
            `;
        } else {
            healthBadgeHTML = `
                <span style="
                    background: #fef3c7; color: #b45309; border: 1px solid #fde68a;
                    padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
                    display: inline-flex; align-items: center; gap: 5px;
                ">
                    🟡 Chưa cấu hình Token
                </span>
            `;
        }

        return `
            <div class="cda-account-card" style="
                background: white; border-radius: 18px; ${borderStyle}
                padding: 20px; display: flex; flex-direction: column; justify-space-between;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s;
            ">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px;">
                    <div>
                        <span style="
                            background: ${platBg}; color: ${platColor}; font-size: 11px; font-weight: 800;
                            padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;
                            display: inline-block; margin-bottom: 6px;
                        ">${platBadge}</span>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                            ${_escapeHtml(acc.account_name)}
                        </h3>
                    </div>
                    <div>${healthBadgeHTML}</div>
                </div>

                ${tokenWarnHTML}

                ${st === 'error' ? `
                <div style="
                    background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px;
                    padding: 10px 12px; margin-bottom: 12px; font-size: 12px; color: #991b1b;
                    line-height: 1.4; font-weight: 500;
                ">
                    <strong style="display:block; margin-bottom: 2px;">⚠️ Lý Do Mất Kết Nối:</strong>
                    ${_escapeHtml(acc.connection_error || 'Access Token không hợp lệ hoặc đã hết hạn!')}
                </div>
                ` : ''}

                <div style="
                    background: #f8fafc; border-radius: 12px; padding: 12px 14px;
                    font-size: 12px; color: #475569; margin-bottom: 14px; display: grid; gap: 6px;
                ">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                        <span style="color: #64748b;">Nhân Viên Phụ Trách:</span>
                        <strong style="color: #2563eb; font-size: 13px;">👤 ${_escapeHtml(acc.assigned_staff_name || 'Chưa gán')}</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                        <span style="color: #64748b;">Mã Ad Account ID:</span>
                        <strong style="font-family: monospace; color: #0f172a;">${_escapeHtml(acc.fb_ad_account_id || 'Chưa cài')}</strong>
                    </div>

                    ${acc.fb_dev_account_name ? `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                        <span style="color: #64748b;">FB Developer:</span>
                        ${acc.fb_dev_account_link ? `
                        <a href="${_escapeHtml(acc.fb_dev_account_link)}" target="_blank" style="font-weight: 700; color: #2563eb; text-decoration: underline; display: inline-flex; align-items: center; gap: 3px;" title="Bấm để mở trang Facebook cá nhân của Developer ↗">
                            👤 ${_escapeHtml(acc.fb_dev_account_name)} ↗
                        </a>
                        ` : `
                        <span style="font-weight: 600; color: #1e293b;">${_escapeHtml(acc.fb_dev_account_name)}</span>
                        `}
                    </div>
                    ` : ''}

                    ${tokenExpiryInfoInBox}
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
                    ${acc.fb_ad_account_link ? `
                        <a href="${_escapeHtml(acc.fb_ad_account_link)}" target="_blank" style="
                            padding: 5px 10px; border-radius: 8px; background: #eff6ff; color: #1d4ed8;
                            font-size: 11px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
                        ">🔗 Quản Lý Ads Manager ↗</a>
                    ` : ''}

                    ${acc.fb_dev_account_link ? `
                        <a href="${_escapeHtml(acc.fb_dev_account_link)}" target="_blank" style="
                            padding: 5px 10px; border-radius: 8px; background: #f0fdf4; color: #166534;
                            font-size: 11px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
                        ">👤 Trang FB Developer ↗</a>
                    ` : ''}

                    ${acc.fb_dev_portal_link ? `
                        <a href="${_escapeHtml(acc.fb_dev_portal_link)}" target="_blank" style="
                            padding: 5px 10px; border-radius: 8px; background: #f3e8ff; color: #6b21a8;
                            font-size: 11px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
                        ">🛠️ Developer Apps ↗</a>
                    ` : ''}
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 14px; gap: 8px;">
                    <button onclick="window._cdaTestSingleConnection(${acc.id})" style="
                        padding: 8px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                        background: #f8fafc; color: #334155; font-size: 12px; font-weight: 700;
                        cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;
                    " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
                        ⚡ Test Kết Nối
                    </button>

                    <div style="display: flex; gap: 6px;">
                        ${_isGD ? `
                        <button onclick="window._cdaOpenEditModal(${acc.id})" style="
                            padding: 8px 14px; border-radius: 10px; border: 1.5px solid #0284c7;
                            background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700;
                            cursor: pointer; transition: all 0.2s;
                        ">⚙️ Cấu Hình</button>

                        <button onclick="window._cdaDeleteAccount(${acc.id}, '${_escapeJsString(acc.account_name)}')" style="
                            padding: 8px 12px; border-radius: 10px; border: 1.5px solid #fca5a5;
                            background: #fef2f2; color: #dc2626; font-size: 12px; font-weight: 700;
                            cursor: pointer; transition: all 0.2s;
                        ">🗑️ Xóa</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // ========== STAFF FROM MARKETING DEPARTMENT (AUTOMATICALLY SYNCED FROM ORG STRUCTURE) ==========
    async function _loadStaffList() {
        try {
            const res = await fetch('/api/ads-staff', { credentials: 'include' });
            const data = await res.json();
            if (data.ok) {
                _staffList = data.staff || [];
            }
        } catch(e) {
            console.error('Lỗi load staff list:', e);
        }
    }

    // ========== MODAL: CUSTOM PLATFORMS MANAGEMENT (TẠO/SỬA/XÓA MẠNG XÃ HỘI) ==========
    function _showCustomPlatformsManagerModal() {
        const existingModal = document.getElementById('cda-platforms-manager-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'cda-platforms-manager-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px);
            z-index: 10005; display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease; padding: 20px;
        `;

        overlay.innerHTML = `
            <div style="
                background: white; border-radius: 24px; width: 100%; max-width: 620px;
                max-height: 88vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
                display: flex; flex-direction: column;
            ">
                <div style="padding: 22px 28px; border-bottom: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 10;">
                    <div>
                        <h3 style="margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #6b21a8; display: flex; align-items: center; gap: 8px;">
                            🌐 Cài Đặt Mạng Xã Hội Quảng Cáo
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: #64748b;">Tự định nghĩa thêm các mạng xã hội mới (Zalo Ads, Shopee Ads...).</p>
                    </div>
                    <button id="cda-pm-close" style="width: 36px; height: 36px; border-radius: 10px; border: none; background: #f1f5f9; cursor: pointer; font-size: 18px;">✕</button>
                </div>

                <div style="padding: 24px; flex: 1;">
                    <!-- Add Custom Platform Form -->
                    <div style="background: #f3e8ff; border: 1.5px solid #d8b4fe; border-radius: 16px; padding: 18px; margin-bottom: 24px;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #6b21a8; margin-bottom: 8px;">➕ Thêm Mạng Xã Hội Mới</label>
                        <div style="display: flex; gap: 10px;">
                            <input id="cda-pm-new-icon" type="text" value="🌐" style="
                                width: 50px; text-align: center; padding: 11px 8px; border-radius: 12px; border: 1.5px solid #c084fc;
                                font-size: 16px; outline: none; background: white;
                            ">
                            <input id="cda-pm-new-name" type="text" placeholder="VD: Zalo Ads" style="
                                flex: 1; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #c084fc;
                                font-size: 14px; outline: none; background: white;
                            ">
                            <button id="cda-pm-btn-add" style="
                                padding: 11px 20px; border-radius: 12px; border: none;
                                background: #7e22ce; color: white; font-weight: 800; font-size: 13px;
                                cursor: pointer; white-space: nowrap; box-shadow: 0 4px 10px rgba(126,34,206,0.25);
                            ">Thêm MXH</button>
                        </div>
                    </div>

                    <!-- Platform List Table -->
                    <h4 style="margin: 0 0 12px; font-size: 15px; font-weight: 800; color: #0f172a;">📋 Các Mạng Xã Hội Tự Định Nghĩa (${_customPlatforms.length})</h4>
                    <div id="cda-pm-plat-list" style="display: grid; gap: 10px;">
                        <!-- Rendered by JS -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#cda-pm-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        const addBtn = overlay.querySelector('#cda-pm-btn-add');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const nameInp = overlay.querySelector('#cda-pm-new-name');
                const iconInp = overlay.querySelector('#cda-pm-new-icon');

                const name = nameInp.value.trim();
                const icon = iconInp.value.trim() || '🌐';
                if (!name) { alert('Vui lòng nhập tên mạng xã hội!'); return; }

                addBtn.disabled = true;
                addBtn.textContent = '⏳ Đang thêm...';

                try {
                    const res = await fetch('/api/ads-platforms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ platform_name: name, icon })
                    });
                    const data = await res.json();
                    if (!data.ok) throw new Error(data.error);

                    nameInp.value = '';
                    alert('✅ Đã thêm Mạng Xã Hội mới thành công!');
                    await _loadCustomPlatforms();
                    _renderPlatformTabs();
                    _renderPlatformsListInsideModal(overlay);
                } catch(e) {
                    alert(`❌ Lỗi: ${e.message}`);
                } finally {
                    addBtn.disabled = false;
                    addBtn.textContent = 'Thêm MXH';
                }
            });
        }

        _renderPlatformsListInsideModal(overlay);
    }

    function _renderPlatformsListInsideModal(modalOverlay) {
        const listDiv = modalOverlay.querySelector('#cda-pm-plat-list');
        if (!listDiv) return;

        if (_customPlatforms.length === 0) {
            listDiv.innerHTML = `
                <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; color: #94a3b8; font-size: 13px;">
                    Chưa tạo mạng xã hội riêng nào. Hãy nhập tên ở ô trên để tạo thêm!
                </div>
            `;
            return;
        }

        listDiv.innerHTML = _customPlatforms.map(p => `
            <div style="
                background: white; border: 1.5px solid #e2e8f0; border-radius: 14px;
                padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 22px;">${_escapeHtml(p.icon || '🌐')}</span>
                    <div>
                        <div style="font-weight: 800; font-size: 15px; color: #0f172a;">${_escapeHtml(p.platform_name)}</div>
                        <div style="font-size: 11px; color: #94a3b8;">Key: ${_escapeHtml(p.platform_key)}</div>
                    </div>
                </div>

                <div style="display: flex; gap: 6px;">
                    <button onclick="window._cdaEditPlatform(${p.id}, '${_escapeJsString(p.platform_name)}')" style="
                        padding: 6px 12px; border-radius: 8px; border: 1px solid #0284c7;
                        background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700; cursor: pointer;
                    ">✏️ Sửa Tên</button>
                    <button onclick="window._cdaDeletePlatform(${p.id}, '${_escapeJsString(p.platform_name)}')" style="
                        padding: 6px 10px; border-radius: 8px; border: 1px solid #fca5a5;
                        background: #fef2f2; color: #dc2626; font-size: 12px; font-weight: 700; cursor: pointer;
                    ">🗑️ Xóa</button>
                </div>
            </div>
        `).join('');
    }

    window._cdaEditPlatform = async function(platId, currentName) {
        const newName = prompt(`✏️ Nhập tên mới cho Mạng Xã Hội "${currentName}":`, currentName);
        if (newName == null || !newName.trim() || newName.trim() === currentName) return;

        try {
            const res = await fetch(`/api/ads-platforms/${platId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ platform_name: newName.trim() })
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert('✅ Đã cập nhật tên mạng xã hội!');
            await _loadCustomPlatforms();
            _renderPlatformTabs();
            await _loadAccounts();

            const modalOverlay = document.getElementById('cda-platforms-manager-modal');
            if (modalOverlay) _renderPlatformsListInsideModal(modalOverlay);
        } catch(e) {
            alert(`❌ Lỗi khi sửa: ${e.message}`);
        }
    };

    window._cdaDeletePlatform = async function(platId, name) {
        if (!confirm(`⚠️ Bạn có chắc muốn xóa mạng xã hội "${name}"?`)) return;

        try {
            const res = await fetch(`/api/ads-platforms/${platId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert('✅ Đã xóa mạng xã hội thành công!');
            await _loadCustomPlatforms();
            _renderPlatformTabs();

            const modalOverlay = document.getElementById('cda-platforms-manager-modal');
            if (modalOverlay) _renderPlatformsListInsideModal(modalOverlay);
        } catch(e) {
            alert(`❌ Lỗi khi xóa: ${e.message}`);
        }
    };

    // ========== VIDEO GUIDES POPUP MODAL (TABLE LAYOUT) ==========
    let _popupGuidePlatform = 'all';

    function _showGuidesPopupModal() {
        const existingModal = document.getElementById('cda-guides-popup-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'cda-guides-popup-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px);
            z-index: 10002; display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease; padding: 20px;
        `;

        overlay.innerHTML = `
            <div style="
                background: white; border-radius: 24px; width: 100%; max-width: 1050px;
                max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
                display: flex; flex-direction: column;
            ">
                <!-- Modal Header -->
                <div style="padding: 22px 28px; border-bottom: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 10;">
                    <div>
                        <h3 style="margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #92400e; display: flex; align-items: center; gap: 8px;">
                            🎬 Hướng Dẫn Cài Đặt Ads
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: #64748b;">Xem lại các video bài giảng & ghi chú từng bước cài đặt tài khoản quảng cáo.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${_isGD ? `
                        <button id="cda-pmodal-btn-add" style="
                            padding: 9px 18px; border-radius: 12px; border: none;
                            background: linear-gradient(135deg, #d97706, #b45309);
                            color: white; font-weight: 800; font-size: 13px; cursor: pointer;
                            display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(180,83,9,0.3);
                        ">➕ Thêm Video Hướng Dẫn Mới</button>
                        ` : ''}
                        <button id="cda-pmodal-close" style="
                            width: 36px; height: 36px; border-radius: 10px; border: none;
                            background: #f1f5f9; cursor: pointer; font-size: 18px; color: #64748b;
                            display: flex; align-items: center; justify-content: center;
                        ">✕</button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div style="padding: 24px; flex: 1;">
                    <!-- Platform Filter Tabs inside Popup -->
                    <div id="cda-pmodal-tabs" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 14px;">
                        <!-- Built by JS -->
                    </div>

                    <!-- Guides Table Container -->
                    <div id="cda-pmodal-guides-grid"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#cda-pmodal-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        const addGuideBtn = overlay.querySelector('#cda-pmodal-btn-add');
        if (addGuideBtn) {
            addGuideBtn.addEventListener('click', () => _showGuideModal(null, () => _renderGuidesInsideModal(overlay)));
        }

        _renderPlatformTabsInsidePopup(overlay);
        _renderGuidesInsideModal(overlay);
    }

    function _renderPlatformTabsInsidePopup(modalOverlay) {
        const tabsContainer = modalOverlay.querySelector('#cda-pmodal-tabs');
        if (!tabsContainer) return;

        const defaultTabs = [
            { key: 'all', icon: '📋', name: 'Tất Cả Hướng Dẫn' },
            { key: 'facebook', icon: '📘', name: 'Meta Facebook' },
            { key: 'tiktok', icon: '🎵', name: 'TikTok Ads' },
            { key: 'google', icon: '🌐', name: 'Google Ads' },
            { key: 'general', icon: '🎥', name: 'Hướng Dẫn Chung' }
        ];

        const customTabs = (_customPlatforms || []).map(cp => ({
            key: cp.slug,
            icon: cp.icon || '🌐',
            name: cp.name
        }));

        const allTabs = [...defaultTabs, ...customTabs];

        tabsContainer.innerHTML = allTabs.map(t => {
            const isActive = _popupGuidePlatform === t.key;
            return `
                <button onclick="window._cdaSwitchPopupGuideTab('${t.key}')" style="
                    padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;
                    border: ${isActive ? 'none' : '1px solid #e2e8f0'};
                    background: ${isActive ? 'linear-gradient(135deg, #d97706, #b45309)' : 'white'};
                    color: ${isActive ? 'white' : '#475569'};
                    box-shadow: ${isActive ? '0 4px 10px rgba(217,119,6,0.3)' : 'none'};
                ">
                    <span>${t.icon}</span> ${t.name}
                </button>
            `;
        }).join('');
    }

    window._cdaSwitchPopupGuideTab = function(tabKey) {
        _popupGuidePlatform = tabKey;
        const modalOverlay = document.getElementById('cda-guides-popup-modal');
        if (modalOverlay) {
            _renderPlatformTabsInsidePopup(modalOverlay);
            _renderGuidesInsideModal(modalOverlay);
        }
    };

    function _renderGuidesInsideModal(modalOverlay) {
        const container = modalOverlay.querySelector('#cda-pmodal-guides-grid');
        if (!container) return;

        let filtered = _guides.filter(g => {
            if (_popupGuidePlatform !== 'all') {
                if ((g.platform || '').toLowerCase() !== _popupGuidePlatform && g.platform !== 'general') return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="background: #fffbeb; border-radius: 16px; border: 1.5px dashed #fcd34d; padding: 50px 20px; text-align: center; color: #92400e;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
                    <div style="font-size: 16px; font-weight: 800; margin-bottom: 6px;">Chưa có bài hướng dẫn nào</div>
                    <div style="font-size: 13px; color: #b45309; max-width: 420px; margin: 0 auto 16px;">
                        Hãy bấm nút <strong>"➕ Thêm Video Hướng Dẫn Mới"</strong> để điền link video và nội dung các bước nhé!
                    </div>
                    ${_isGD ? `
                    <button onclick="document.getElementById('cda-pmodal-btn-add')?.click()" style="padding: 10px 20px; border-radius: 10px; border: none; background: #d97706; color: white; font-weight: 800; cursor: pointer; font-size: 13px; box-shadow: 0 4px 10px rgba(217,119,6,0.3);">➕ Thêm Video Hướng Dẫn Mới</button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const tableRowsHTML = filtered.map((g, idx) => {
            const plat = (g.platform || 'general').toLowerCase();
            let platBadge = '🎥 Hướng Dẫn Chung';
            let platBg = '#fef3c7';
            let platColor = '#b45309';

            if (plat === 'facebook') {
                platBadge = '📘 Meta Facebook';
                platBg = '#eff6ff';
                platColor = '#1d4ed8';
            } else if (plat === 'tiktok') {
                platBadge = '🎵 TikTok Ads';
                platBg = '#f1f5f9';
                platColor = '#0f172a';
            } else if (plat === 'google') {
                platBadge = '🌐 Google Ads';
                platBg = '#fef3c7';
                platColor = '#b45309';
            } else {
                const cp = (_customPlatforms || []).find(c => c.slug === plat);
                if (cp) {
                    platBadge = `${cp.icon || '🌐'} ${cp.name}`;
                    platBg = '#f0fdf4';
                    platColor = '#15803d';
                }
            }

            const videoUrl = g.video_url || '';
            const docUrl = g.doc_url || '';

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 16px 14px; text-align: center; font-weight: 800; color: #64748b; font-size: 14px; vertical-align: top;">
                        ${idx + 1}
                    </td>

                    <td style="padding: 16px 14px; vertical-align: top;">
                        <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.4;">
                            ${_escapeHtml(g.title)}
                        </h4>
                        ${g.description ? `
                        <div style="background: #f8fafc; border-radius: 10px; padding: 12px 14px; border: 1px solid #e2e8f0; font-size: 12.5px; color: #334155; line-height: 1.5; white-space: pre-wrap; max-height: 250px; overflow-y: auto;">
                            <strong style="color: #64748b; font-size: 11px; display: block; margin-bottom: 4px;">📝 NỘI DUNG MÔ TẢ / BƯỚC THỰC HIỆN:</strong>
${_escapeHtml(g.description)}
                        </div>
                        ` : ''}
                    </td>

                    <td style="padding: 16px 14px; text-align: center; vertical-align: top;">
                        <span style="background: ${platBg}; color: ${platColor}; font-size: 11.5px; font-weight: 800; padding: 5px 10px; border-radius: 8px; display: inline-block; white-space: nowrap;">
                            ${platBadge}
                        </span>
                    </td>

                    <td style="padding: 16px 14px; text-align: center; vertical-align: top;">
                        <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                            ${videoUrl ? `
                            <a href="${_escapeHtml(videoUrl)}" target="_blank" style="
                                width: 100%; max-width: 190px; padding: 8px 12px; border-radius: 10px; background: #0f172a; color: white;
                                font-weight: 800; font-size: 12px; text-decoration: none; display: inline-flex;
                                align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(15,23,42,0.2); transition: transform 0.15s;
                            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">▶️ Xem Video ↗</a>
                            ` : ''}

                            ${docUrl ? `
                            <a href="${_escapeHtml(docUrl)}" target="_blank" style="
                                width: 100%; max-width: 190px; padding: 8px 12px; border-radius: 10px; background: #eff6ff; color: #1d4ed8;
                                font-weight: 800; font-size: 12px; text-decoration: none; border: 1px solid #bfdbfe;
                                display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: transform 0.15s;
                            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">📄 Xem Tài Liệu ↗</a>
                            ` : ''}
                        </div>
                    </td>

                    <td style="padding: 16px 14px; text-align: center; vertical-align: top;">
                        ${_isGD ? `
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button onclick="window._cdaOpenEditGuide(${g.id})" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #0284c7; font-size: 12px; font-weight: 700; cursor: pointer;">✏️ Sửa</button>
                            <button onclick="window._cdaDeleteGuide(${g.id}, '${_escapeJsString(g.title)}')" style="padding: 6px 8px; border-radius: 8px; border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626; font-size: 12px; font-weight: 700; cursor: pointer;">🗑️</button>
                        </div>
                        ` : '<span style="color:#94a3b8; font-size:12px;">--</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div style="overflow-x: auto; border-radius: 16px; border: 1.5px solid #e2e8f0; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-family: inherit;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white;">
                            <th style="padding: 14px 14px; width: 55px; text-align: center; font-weight: 800; font-size: 12px; border-top-left-radius: 14px;">STT</th>
                            <th style="padding: 14px 14px; font-weight: 800; font-size: 12px; text-align: left;">TÊN BÀI HƯỚNG DẪN & NỘI DUNG MÔ TẢ</th>
                            <th style="padding: 14px 14px; width: 130px; text-align: center; font-weight: 800; font-size: 12px;">NỀN TẢNG</th>
                            <th style="padding: 14px 14px; width: 210px; text-align: center; font-weight: 800; font-size: 12px;">BÀI HỌC & TÀI LIỆU</th>
                            <th style="padding: 14px 14px; width: 110px; text-align: center; font-weight: 800; font-size: 12px; border-top-right-radius: 14px;">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>
            </div>
        `;
    }

    window._cdaOpenEditGuide = function(guideId) {
        _showGuideModal(guideId, () => {
            const popupModal = document.getElementById('cda-guides-popup-modal');
            if (popupModal) _renderGuidesInsideModal(popupModal);
        });
    };

    window._cdaDeleteGuide = async function(guideId, title) {
        if (!confirm(`⚠️ Bạn có chắc muốn xóa video hướng dẫn "${title}"?`)) return;

        try {
            const res = await fetch(`/api/ads-account-guides/${guideId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert('✅ Đã xóa video hướng dẫn thành công!');
            await _loadGuides();
            const popupModal = document.getElementById('cda-guides-popup-modal');
            if (popupModal) _renderGuidesInsideModal(popupModal);
        } catch(e) {
            alert(`❌ Lỗi khi xóa: ${e.message}`);
        }
    };

    async function _showGuideModal(guideId, onDoneCallback) {
        let guide = null;
        if (guideId) {
            guide = _guides.find(g => String(g.id) === String(guideId));
        }

        const isEdit = !!guide;
        const titleText = isEdit ? '✏️ Sửa Video Hướng Dẫn' : '➕ Thêm Video Hướng Dẫn Mới';

        const existingModal = document.getElementById('cda-guide-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'cda-guide-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(6px);
            z-index: 10010; display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease; padding: 16px;
        `;

        overlay.innerHTML = `
            <div style="
                background: white; border-radius: 20px; width: 100%; max-width: 580px;
                max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
            ">
                <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #92400e;">${titleText}</h3>
                    <button id="cda-gmodal-close" style="width: 32px; height: 32px; border-radius: 8px; border: none; background: #f1f5f9; cursor: pointer; font-size: 16px;">✕</button>
                </div>

                <div style="padding: 20px 24px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px;">Tiêu Đề Video Hướng Dẫn *</label>
                        <input id="cda-g-title" type="text" value="${_escapeHtml(guide?.title || '')}" placeholder="VD: Hướng dẫn lấy Token Meta 60 ngày không lo die"
                            style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:14px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px;">Nền Tảng Áp Dụng *</label>
                        <select id="cda-g-platform" style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:14px; font-weight:600;">
                            <option value="facebook" ${(guide?.platform || 'facebook') === 'facebook' ? 'selected' : ''}>📘 Meta Facebook</option>
                            <option value="tiktok" ${guide?.platform === 'tiktok' ? 'selected' : ''}>🎵 TikTok Ads</option>
                            <option value="google" ${guide?.platform === 'google' ? 'selected' : ''}>🌐 Google Ads</option>
                            <option value="general" ${guide?.platform === 'general' ? 'selected' : ''}>🎥 Hướng Dẫn Chung</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px;">Link Video (YouTube, Google Drive, MP4, Web) *</label>
                        <input id="cda-g-url" type="text" value="${_escapeHtml(guide?.video_url || '')}" placeholder="https://www.youtube.com/watch?v=... hoặc Link Drive"
                            style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:13px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px;">Link Tài Liệu Đính Kèm (Google Docs, Drive, PDF, Web...)</label>
                        <input id="cda-g-docurl" type="text" value="${_escapeHtml(guide?.doc_url || '')}" placeholder="https://docs.google.com/document/d/... hoặc Link Drive"
                            style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:13px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px;">Nội Dung Mô Tả / Ghi Chú Các Bước</label>
                        <textarea id="cda-g-desc" rows="8" placeholder="Nhập các bước thực hiện chi tiết 1, 2, 3... để sau này dễ xem lại" style="width:100%; min-height: 180px; padding:12px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:13px; outline:none; resize:vertical; box-sizing:border-box; line-height:1.5;">${_escapeHtml(guide?.description || '')}</textarea>
                    </div>
                </div>

                <div style="padding: 16px 24px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0;">
                    <button id="cda-gmodal-cancel" style="padding: 9px 18px; border-radius: 10px; border: 1.5px solid #cbd5e1; background: white; color: #475569; font-weight: 700; cursor: pointer;">Hủy</button>
                    <button id="cda-gmodal-save" style="padding: 9px 20px; border-radius: 10px; border: none; background: #d97706; color: white; font-weight: 800; cursor: pointer;">💾 ${isEdit ? 'Lưu Video' : 'Thêm Video'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#cda-gmodal-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#cda-gmodal-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('#cda-gmodal-save').addEventListener('click', async () => {
            const title = overlay.querySelector('#cda-g-title').value.trim();
            const video_url = overlay.querySelector('#cda-g-url').value.trim();
            const doc_url = overlay.querySelector('#cda-g-docurl').value.trim();
            const platform = overlay.querySelector('#cda-g-platform').value;
            const description = overlay.querySelector('#cda-g-desc').value.trim();

            if (!title) { alert('Vui lòng nhập tiêu đề video!'); return; }
            if (!video_url) { alert('Vui lòng nhập link video!'); return; }

            const saveBtn = overlay.querySelector('#cda-gmodal-save');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Đang lưu...';

            try {
                const url = isEdit ? `/api/ads-account-guides/${guideId}` : '/api/ads-account-guides';
                const method = isEdit ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, video_url, doc_url, platform, description })
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);

                overlay.remove();
                alert(`✅ ${data.message || 'Thành công!'}`);
                await _loadGuides();
                if (onDoneCallback) onDoneCallback();
            } catch(e) {
                alert(`❌ Lỗi: ${e.message}`);
                saveBtn.disabled = false;
                saveBtn.textContent = `💾 ${isEdit ? 'Lưu Video' : 'Thêm Video'}`;
            }
        });
    }

    // ========== TEST CONNECTION ACTIONS ==========
    window._cdaTestSingleConnection = async function(accountId) {
        try {
            const res = await fetch(`/api/ads-accounts/${accountId}/test-connection`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            const testRes = data.test_result || {};
            if (testRes.status === 'connected') {
                alert(`✅ ${testRes.message}`);
            } else {
                alert(`⚠️ ${testRes.message}`);
            }
            _loadAccounts();
        } catch(e) {
            alert(`❌ Lỗi kiểm tra kết nối: ${e.message}`);
        }
    };

    async function _handleTestAllConnections() {
        const btn = document.getElementById('cda-btn-test-all');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Đang kiểm tra toàn bộ...';
        }

        try {
            const res = await fetch('/api/ads-accounts/test-all', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert(data.message || 'Đã kiểm tra xong!');
            _loadAccounts();
        } catch(e) {
            alert(`❌ Lỗi kiểm tra toàn bộ kết nối: ${e.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '⚡ Kiểm Tra Toàn Bộ Kết Nối';
            }
        }
    }

    window._cdaOpenEditModal = function(accountId) {
        _showAccountModal(accountId);
    };

    window._cdaDeleteAccount = async function(accountId, name) {
        if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa tài khoản quảng cáo "${name}"?\nTất cả dữ liệu báo cáo thuộc tài khoản này cũng sẽ bị xóa!`)) return;

        try {
            const res = await fetch(`/api/ads-accounts/${accountId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert('✅ Đã xóa tài khoản thành công!');
            _loadAccounts();
        } catch(e) {
            alert(`❌ Lỗi khi xóa: ${e.message}`);
        }
    };

    // ========== CREATE / EDIT ACCOUNT MODAL (FULL REQUIREMENT SPECIFICATION) ==========
    async function _showAccountModal(accountId) {
        let account = null;
        if (accountId) {
            try {
                const res = await fetch(`/api/ads-accounts/${accountId}`, { credentials: 'include' });
                const data = await res.json();
                if (data.ok) account = data.account;
            } catch(e) { console.error(e); }
        }

        const isEdit = !!account;
        const title = isEdit ? '⚙️ Cấu Hình Tài Khoản Quảng Cáo' : '➕ Thêm Tài Khoản Quảng Cáo Mới';

        // Prepare Staff Select Options (Required - Marketing Department Staff)
        let staffOptionsHTML = `<option value="">-- Chọn Nhân Viên Phụ Trách (Bắt buộc) --</option>`;
        _staffList.forEach(s => {
            const name = s.staff_name || s.name;
            const dept = s.department_name ? ` (${s.department_name})` : '';
            const isSel = account?.assigned_staff_name === name ? 'selected' : '';
            staffOptionsHTML += `<option value="${_escapeHtml(name)}" ${isSel}>👤 ${_escapeHtml(name)}${_escapeHtml(dept)}</option>`;
        });

        // Prepare Platform Select Options (NO "Mạng Xã Hội Khác", includes Facebook, TikTok, Google + custom platforms)
        let platOptionsHTML = `
            <option value="facebook" ${(account?.platform || 'facebook') === 'facebook' ? 'selected' : ''}>📘 Meta Facebook Ads</option>
            <option value="tiktok" ${account?.platform === 'tiktok' ? 'selected' : ''}>🎵 TikTok Ads</option>
            <option value="google" ${account?.platform === 'google' ? 'selected' : ''}>🌐 Google Ads</option>
        `;

        _customPlatforms.forEach(cp => {
            const isSel = account?.platform === cp.platform_key ? 'selected' : '';
            platOptionsHTML += `<option value="${_escapeHtml(cp.platform_key)}" ${isSel}>${_escapeHtml(cp.icon || '🌐')} ${_escapeHtml(cp.platform_name)}</option>`;
        });

        const existingModal = document.getElementById('cda-account-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'cda-account-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(5px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease; padding: 16px;
        `;

        overlay.innerHTML = `
            <div style="
                background: white; border-radius: 24px; width: 100%; max-width: 650px;
                max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
                display: flex; flex-direction: column;
            ">
                <div style="padding: 22px 28px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 10;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">⚙️</span>
                        <h3 style="margin: 0; font-size: 19px; font-weight: 800; color: #0f172a;">${title}</h3>
                    </div>
                    <button id="cda-modal-close" style="
                        width: 36px; height: 36px; border-radius: 10px; border: none;
                        background: #f1f5f9; cursor: pointer; font-size: 18px; color: #64748b;
                        display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                    ">✕</button>
                </div>

                <div style="padding: 24px 28px; flex: 1;">
                    <div style="margin-bottom: 20px;">
                        <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:8px;">
                            Nền Tảng Quảng Cáo (Mạng Xã Hội) *
                        </label>
                        <select id="cda-f-platform" style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; font-weight:600; background:#f8fafc; outline:none;">
                            ${platOptionsHTML}
                        </select>
                    </div>

                    <!-- Trường Nhân Viên Phụ Trách (Đồng Bộ Từ Phòng Marketing - Cơ Cấu Tổ Chức) -->
                    <div style="margin-bottom: 20px; background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 14px 16px; border-radius: 14px;">
                        <label style="display:block; font-size:13px; font-weight:800; color:#1e40af; margin-bottom:6px;">
                            👤 Nhân Viên Phụ Trách * (Bắt buộc chọn)
                        </label>
                        <select id="cda-f-staff" style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #93c5fd; font-size:14px; font-weight:700; color:#1e3a8a; background:white; outline:none;">
                            ${staffOptionsHTML}
                        </select>
                        <div style="font-size:11px; color:#3b82f6; margin-top:4px;">
                            Bắt buộc chọn nhân viên phòng Marketing (đồng bộ từ Cơ Cấu Tổ Chức) quản lý tài khoản này. Có thể chỉnh sửa chọn nhân viên khác bất kỳ lúc nào.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Tên Tài Khoản Quảng Cáo Meta *
                            </label>
                            <button type="button" onclick="window._cdaCopyText('cda-f-name', 'Tên Tài Khoản')" style="
                                padding: 3px 10px; border-radius: 8px; border: 1px solid #cbd5e1;
                                background: #f8fafc; color: #475569; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
                            ">📋 Copy Tên</button>
                        </div>
                        <input id="cda-f-name" type="text" value="${_escapeHtml(account?.account_name || '')}" placeholder="VD: TUẦN HÀN 004"
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; font-weight:600; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Mã Tài Khoản Quảng Cáo Meta (Ad Account ID) *
                            </label>
                            <button type="button" onclick="window._cdaCopyAdAccountId()" style="
                                padding: 3px 10px; border-radius: 8px; border: 1px solid #cbd5e1;
                                background: #f8fafc; color: #475569; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
                            ">📋 Copy ID</button>
                        </div>
                        <input id="cda-f-adid" type="text" value="${_escapeHtml(account?.fb_ad_account_id || '')}" placeholder="act_721397883965307"
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; font-family:monospace; outline:none; box-sizing:border-box;">
                        <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Nhập ID tài khoản quảng cáo Meta (bắt đầu bằng act_). Hệ thống tự động làm sạch ID nếu Anh dán linh hoạt.</div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Link Trực Tiếp Tài Khoản Quảng Cáo Meta *
                            </label>
                            <button type="button" onclick="window._cdaOpenLink('cda-f-adlink', 'Ads Manager')" style="
                                padding: 3px 10px; border-radius: 8px; border: 1px solid #93c5fd;
                                background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 800; cursor: pointer;
                            ">🔗 Mở Link Ngay ↗</button>
                        </div>
                        <input id="cda-f-adlink" type="text" value="${_escapeHtml(account?.fb_ad_account_link || '')}" placeholder="https://adsmanager.facebook.com/..."
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Tên Tài Khoản FB Developer *
                            </label>
                            <button type="button" onclick="window._cdaCopyText('cda-f-devname', 'Tên Developer')" style="
                                padding: 3px 10px; border-radius: 8px; border: 1px solid #cbd5e1;
                                background: #f8fafc; color: #475569; font-size: 11px; font-weight: 700; cursor: pointer;
                            ">📋 Copy Tên</button>
                        </div>
                        <input id="cda-f-devname" type="text" value="${_escapeHtml(account?.fb_dev_account_name || '')}" placeholder="Thanh Hà"
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Link Facebook Tài Khoản *
                            </label>
                            <button type="button" onclick="window._cdaOpenLink('cda-f-devfb', 'Facebook')" style="
                                padding: 3px 10px; border-radius: 8px; border: 1px solid #93c5fd;
                                background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 800; cursor: pointer;
                            ">🔗 Mở Link Ngay ↗</button>
                        </div>
                        <input id="cda-f-devfb" type="text" value="${_escapeHtml(account?.fb_dev_account_link || '')}" placeholder="https://www.facebook.com/profile.php?id=..."
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Link Meta Developer *
                            </label>
                            <button type="button" onclick="window._cdaOpenLink('cda-f-devportal', 'Meta Developer')" style="
                                padding: 3px 10px; border-radius: 8px; border: 1px solid #93c5fd;
                                background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 800; cursor: pointer;
                            ">🔗 Mở Link Ngay ↗</button>
                        </div>
                        <input id="cda-f-devportal" type="text" value="${_escapeHtml(account?.fb_dev_portal_link || '')}" placeholder="https://developers.facebook.com/apps/..."
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; outline:none; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                            <label style="font-size:13px; font-weight:700; color:#1e293b;">
                                Access Token Meta (Trình khám phá API Đồ thị) *
                            </label>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <button type="button" onclick="window._cdaCopyText('cda-f-token', 'Access Token')" style="
                                    padding: 4px 10px; border-radius: 8px; border: 1px solid #cbd5e1;
                                    background: #f8fafc; color: #475569; font-size: 11px; font-weight: 700; cursor: pointer;
                                ">📋 Copy Token</button>
                                <button type="button" id="cda-btn-test-token-modal" style="
                                    padding: 4px 10px; border-radius: 8px; border: 1px solid #cbd5e1;
                                    background: #f8fafc; color: #0284c7; font-size: 11px; font-weight: 700; cursor: pointer;
                                ">⚡ Test Token Ngay</button>
                            </div>
                        </div>
                        <textarea id="cda-f-token" rows="3" placeholder="Dán Access Token Meta (EAAV3Dneq...)" style="
                            width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e2e8f0;
                            font-size:12px; outline:none; resize:vertical; font-family:monospace; box-sizing:border-box;
                        ">${_escapeHtml(account?.fb_access_token || '')}</textarea>
                        <div id="cda-token-test-result" style="margin-top: 6px;"></div>
                    </div>

                    <div style="margin-bottom: 20px; background: #fff1f2; border: 1.5px solid #fecdd3; padding: 14px 16px; border-radius: 14px;">
                        <label style="display:block; font-size:13px; font-weight:800; color:#9f1239; margin-bottom:6px;">
                            📅 Ngày Hết Hạn Access Token Meta * (Bắt buộc chọn)
                        </label>
                        <input id="cda-f-token-expires" type="date" value="${account?.token_expires_at ? String(account.token_expires_at).substring(0, 10) : ''}"
                            style="width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #fda4af; font-size:14px; font-weight:700; color:#881337; background:white; outline:none; box-sizing:border-box;">
                        <div style="font-size:11px; color:#be123c; margin-top:4px;">
                            Nhập ngày hết hạn của Token. Hệ thống sẽ tự động hiển thị cảnh báo <strong>ĐỎ RỰC NHẤP NHÁY</strong> trên thẻ trước 7 ngày để Anh kịp gia hạn.
                        </div>
                    </div>

                    <!-- Khối 📊 Tiêu Chí & Ngưỡng Đánh Giá (Liên kết trực tiếp với Thống Kê Camp & Chiến Dịch Test Ads) -->
                    <div style="background: #fafbfc; padding: 20px; border-radius: 16px; border: 1.5px solid #e2e8f0; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 16px; font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                            📊 Tiêu Chí & Ngưỡng Đánh Giá
                        </h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div>
                                <label style="display:block;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:6px;">Tiêu chí hiệu quả *</label>
                                <select id="cda-f-metric" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:600;background:white;outline:none;">
                                    <option value="cpa" ${(account?.effectiveness_metric || 'cpa') === 'cpa' ? 'selected' : ''}>CPA (Chi phí / Tin nhắn)</option>
                                    <option value="ctr" ${account?.effectiveness_metric === 'ctr' ? 'selected' : ''}>CTR (Tỷ lệ click)</option>
                                    <option value="cpm" ${account?.effectiveness_metric === 'cpm' ? 'selected' : ''}>CPM (Chi phí / 1000 hiển thị)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:6px;">Ngưỡng hiệu quả (đ) * (Bắt buộc)</label>
                                <input id="cda-f-threshold" type="text"
                                    value="${_fmtNumber(account?.effectiveness_threshold || 75000)}"
                                    placeholder="75.000"
                                    style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"
                                    oninput="let raw = this.value.replace(/[^0-9]/g, ''); this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';">
                            </div>
                        </div>

                        <div style="padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                            <label style="display:block;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:6px;">
                                Không tính số lần chạy không ra tin nhắn < (đ) * (Bắt buộc)
                            </label>
                            <input id="cda-f-ignore-no-msg-thresh" type="text"
                                value="${_fmtNumber(account?.ignore_no_msg_spend_threshold || 70000)}"
                                placeholder="70.000"
                                style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"
                                oninput="let raw = this.value.replace(/[^0-9]/g, ''); this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';">
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 5px;">
                                💡 Các ngày chạy dở có Chi tiêu < số tiền này VÀ không ra tin nhắn sẽ không bị tính là 1 lần chạy.
                            </div>
                        </div>
                    </div>
                </div>

                <div style="padding: 18px 28px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; background: white; border-radius: 0 0 24px 24px;">
                    <button id="cda-modal-cancel" style="
                        padding: 11px 22px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                        background: white; color: #475569; font-size: 13px; font-weight: 700;
                        cursor: pointer;
                    ">Hủy</button>
                    <button id="cda-modal-save" style="
                        padding: 11px 24px; border-radius: 12px; border: none;
                        background: linear-gradient(135deg, #1877f2, #2563eb);
                        color: white; font-size: 13px; font-weight: 800;
                        cursor: pointer; display: flex; align-items: center; gap: 8px;
                        box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                    ">💾 ${isEdit ? 'Lưu Cấu Hình' : 'Tạo Tài Khoản QC'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const testTokenBtn = overlay.querySelector('#cda-btn-test-token-modal');
        const testResultDiv = overlay.querySelector('#cda-token-test-result');

        if (testTokenBtn) {
            testTokenBtn.addEventListener('click', async () => {
                const adId = overlay.querySelector('#cda-f-adid').value.trim();
                const token = overlay.querySelector('#cda-f-token').value.trim();

                if (!adId) {
                    alert('Vui lòng nhập Mã Tài Khoản QC (Ad Account ID)!');
                    return;
                }
                if (!token && !isEdit) {
                    alert('Vui lòng nhập Access Token Meta!');
                    return;
                }

                testTokenBtn.disabled = true;
                testTokenBtn.textContent = '⏳ Đang thử...';
                testResultDiv.innerHTML = '<span style="color:#64748b; font-size:12px;">Đang kiểm tra kết nối API Facebook...</span>';

                try {
                    const cleanId = _cleanAdAccountId(adId);

                    if (!cleanId) {
                        testResultDiv.innerHTML = '<span style="color:#dc2626; font-size:12px; font-weight:700;">🔴 Mã tài khoản quảng cáo Meta không hợp lệ (cần chứa các chữ số ID).</span>';
                        return;
                    }

                    if (accountId && !token) {
                        const res = await fetch(`/api/ads-accounts/${accountId}/test-connection`, { method: 'POST', credentials: 'include' });
                        const data = await res.json();
                        const tr = data.test_result || {};
                        if (tr.status === 'connected') {
                            testResultDiv.innerHTML = `<span style="color:#059669; font-size:12px; font-weight:700;">${tr.message}</span>`;
                        } else {
                            testResultDiv.innerHTML = `<span style="color:#dc2626; font-size:12px; font-weight:700;">${tr.message}</span>`;
                        }
                    } else {
                        const url = `https://graph.facebook.com/v20.0/${cleanId}?fields=name,account_status,currency&access_token=${encodeURIComponent(token)}`;
                        const resp = await fetch(url);
                        const json = await resp.json();
                        if (json.id) {
                            testResultDiv.innerHTML = `<span style="color:#059669; font-size:12px; font-weight:700;">🟢 Kết nối thành công! Tài khoản: "${json.name}" (${json.currency || 'VND'})</span>`;
                        } else {
                            testResultDiv.innerHTML = `<span style="color:#dc2626; font-size:12px; font-weight:700;">🔴 Lỗi API: ${json.error?.message || 'Không thể xác thực Token!'}</span>`;
                        }
                    }
                } catch(e) {
                    testResultDiv.innerHTML = `<span style="color:#dc2626; font-size:12px; font-weight:700;">🔴 Lỗi mạng: ${e.message}</span>`;
                } finally {
                    testTokenBtn.disabled = false;
                    testTokenBtn.textContent = '⚡ Test Token Ngay';
                }
            });
        }

        overlay.querySelector('#cda-modal-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#cda-modal-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('#cda-modal-save').addEventListener('click', async () => {
            const platform = overlay.querySelector('#cda-f-platform').value;
            const assigned_staff_name = overlay.querySelector('#cda-f-staff').value;
            const account_name = overlay.querySelector('#cda-f-name').value.trim();
            const fb_ad_account_id = overlay.querySelector('#cda-f-adid').value.trim();
            const fb_ad_account_link = overlay.querySelector('#cda-f-adlink').value.trim();
            const fb_dev_account_name = overlay.querySelector('#cda-f-devname').value.trim();
            const fb_dev_account_link = overlay.querySelector('#cda-f-devfb').value.trim();
            const fb_dev_portal_link = overlay.querySelector('#cda-f-devportal').value.trim();
            const fb_access_token = overlay.querySelector('#cda-f-token').value.trim();
            const token_expires_at = overlay.querySelector('#cda-f-token-expires').value;
            const effectiveness_metric = overlay.querySelector('#cda-f-metric').value;
            const effectiveness_threshold_raw = overlay.querySelector('#cda-f-threshold').value;
            const ignore_no_msg_spend_threshold_raw = overlay.querySelector('#cda-f-ignore-no-msg-thresh').value;

            if (!assigned_staff_name) {
                alert('⚠️ Vui lòng chọn Nhân Viên Phụ Trách bắt buộc!');
                overlay.querySelector('#cda-f-staff').focus();
                return;
            }
            if (!account_name) {
                alert('⚠️ Vui lòng nhập Tên Tài Khoản Quảng Cáo Meta (Bắt buộc)!');
                overlay.querySelector('#cda-f-name').focus();
                return;
            }
            if (!fb_ad_account_id) {
                alert('⚠️ Vui lòng nhập Mã Tài Khoản Quảng Cáo Meta (Ad Account ID) (Bắt buộc)!');
                overlay.querySelector('#cda-f-adid').focus();
                return;
            }
            if (!fb_ad_account_link) {
                alert('⚠️ Vui lòng nhập Link Trực Tiếp Tài Khoản Quảng Cáo Meta (Bắt buộc)!');
                overlay.querySelector('#cda-f-adlink').focus();
                return;
            }
            if (!fb_dev_account_name) {
                alert('⚠️ Vui lòng nhập Tên Tài Khoản FB Developer (Bắt buộc)!');
                overlay.querySelector('#cda-f-devname').focus();
                return;
            }
            if (!fb_dev_account_link) {
                alert('⚠️ Vui lòng nhập Link Facebook Tài Khoản (Bắt buộc)!');
                overlay.querySelector('#cda-f-devfb').focus();
                return;
            }
            if (!fb_dev_portal_link) {
                alert('⚠️ Vui lòng nhập Link Meta Developer (Bắt buộc)!');
                overlay.querySelector('#cda-f-devportal').focus();
                return;
            }
            if (!fb_access_token && !isEdit) {
                alert('⚠️ Vui lòng nhập Access Token Meta (Bắt buộc)!');
                overlay.querySelector('#cda-f-token').focus();
                return;
            }
            if (!token_expires_at) {
                alert('⚠️ Vui lòng chọn Ngày Hết Hạn Access Token Meta (Bắt buộc)!');
                overlay.querySelector('#cda-f-token-expires').focus();
                return;
            }
            if (!effectiveness_threshold_raw || !effectiveness_threshold_raw.trim()) {
                alert('⚠️ Vui lòng nhập Ngưỡng hiệu quả (đ) (Bắt buộc)!');
                overlay.querySelector('#cda-f-threshold').focus();
                return;
            }
            if (!ignore_no_msg_spend_threshold_raw || !ignore_no_msg_spend_threshold_raw.trim()) {
                alert('⚠️ Vui lòng nhập Không tính số lần chạy không ra tin nhắn < (đ) (Bắt buộc)!');
                overlay.querySelector('#cda-f-ignore-no-msg-thresh').focus();
                return;
            }

            const body = {
                platform,
                assigned_staff_name,
                account_name,
                fb_ad_account_id,
                fb_ad_account_link,
                fb_dev_account_name,
                fb_dev_account_link,
                fb_dev_portal_link,
                token_expires_at,
                effectiveness_metric,
                effectiveness_threshold: _cleanNumber(effectiveness_threshold_raw, 75000),
                ignore_no_msg_spend_threshold: _cleanNumber(ignore_no_msg_spend_threshold_raw, 70000)
            };
            if (fb_access_token) body.fb_access_token = fb_access_token;

            const tokenVal = overlay.querySelector('#cda-f-token').value.trim();
            if (tokenVal) body.fb_access_token = tokenVal;
            else if (!isEdit) {
                alert('Vui lòng nhập Access Token Meta!');
                return;
            }

            if (!body.account_name || !body.account_name.trim()) {
                alert('Vui lòng nhập Tên Tài Khoản Quảng Cáo!');
                return;
            }

            const saveBtn = overlay.querySelector('#cda-modal-save');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Đang lưu kết nối...';

            try {
                const url = isEdit ? `/api/ads-accounts/${accountId}` : '/api/ads-accounts';
                const method = isEdit ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);

                overlay.remove();
                alert(`✅ ${isEdit ? 'Đã lưu cấu hình tài khoản QC!' : 'Đã tạo và kiểm tra kết nối tài khoản QC thành công!'}`);

                _loadAccounts();
            } catch(e) {
                alert(`❌ Lỗi: ${e.message}`);
                saveBtn.disabled = false;
                saveBtn.textContent = `💾 ${isEdit ? 'Lưu Cấu Hình' : 'Tạo Tài Khoản QC'}`;
            }
        });
    }

    // ========== CENTRAL ZALO SETTINGS MODAL ==========
    async function _showZaloSettingsModal() {
        let settings = {};
        try {
            const res = await fetch('/api/caidatads/zalo-settings', { credentials: 'include' });
            const data = await res.json();
            if (data.ok && data.settings) {
                settings = data.settings;
            }
        } catch (e) {
            console.error('[load zalo settings error]', e);
        }

        const isEnabled = settings.zalo_enabled === 'true';
        const token = settings.zalo_access_token || '';
        const userId = settings.zalo_user_id || '';
        const webhookUrl = settings.zalo_webhook_url || '';

        const overlay = document.createElement('div');
        overlay.id = 'cda-zalo-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 100000; padding: 20px; box-sizing: border-box;
        `;

        overlay.innerHTML = `
            <div style="
                background: white; width: 100%; max-width: 620px; border-radius: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;
                font-family: inherit;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                    padding: 24px 28px; color: white; display: flex; align-items: center; justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 28px; background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 14px;">📱</span>
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 800;">Cấu Hình Gửi Thông Báo Zalo</h3>
                            <div style="font-size: 13px; opacity: 0.9; margin-top: 2px;">Cài đặt dùng chung toàn bộ hệ thống (Centralized System)</div>
                        </div>
                    </div>
                    <button id="cda-zalo-close" style="
                        background: rgba(255,255,255,0.2); border: none; color: white;
                        font-size: 20px; font-weight: bold; width: 36px; height: 36px; border-radius: 50%;
                        cursor: pointer; display: flex; align-items: center; justify-content: center;
                    ">&times;</button>
                </div>

                <!-- Body -->
                <div style="padding: 24px 28px; max-height: 75vh; overflow-y: auto;">
                    <!-- Note box -->
                    <div style="
                        background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 16px;
                        padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #0369a1; line-height: 1.5;
                    ">
                        💡 <strong>Lưu ý:</strong> Mọi trang/menu trong hệ thống (Giới Hạn Chi Tiêu, Thống Kê Ads, Báo Cáo...) khi cần gửi thông báo Zalo sẽ tự động dùng 🔑 <strong>Zalo AccessToken</strong> và 👤 <strong>Zalo UserId / Chat ID</strong> được cài đặt tại đây.
                    </div>

                    <!-- Enable Switch -->
                    <div style="
                        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;
                        padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">⚡ Trạng Thái Gửi Thông Báo Zalo</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Bật/Tắt gửi tin nhắn Zalo tự động cho hệ thống</div>
                        </div>
                        <label style="position: relative; display: inline-block; width: 50px; height: 26px; cursor: pointer;">
                            <input type="checkbox" id="cda-zalo-enabled" ${isEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span style="
                                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                                background-color: ${isEnabled ? '#10b981' : '#cbd5e1'}; transition: .3s; border-radius: 34px;
                            " id="cda-zalo-slider">
                                <span style="
                                    position: absolute; content: ''; height: 20px; width: 20px; left: 3px; bottom: 3px;
                                    background-color: white; transition: .3s; border-radius: 50%;
                                    transform: ${isEnabled ? 'translateX(24px)' : 'none'};
                                " id="cda-zalo-knob"></span>
                            </span>
                        </label>
                    </div>

                    <!-- Input 1: AccessToken -->
                    <div style="margin-bottom: 18px;">
                        <label style="display: block; font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                            🔑 Zalo AccessToken <span style="font-weight: 400; color: #64748b; font-size: 11px;">(Khuyên dùng — Gửi Zalo trực tiếp không qua n8n)</span>
                        </label>
                        <input type="text" id="cda-zalo-token" value="${_escapeHtml(token)}" placeholder="Nhập Zalo AccessToken..." style="
                            width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                            font-size: 13px; font-family: monospace; outline: none; box-sizing: border-box;
                        ">
                    </div>

                    <!-- Input 2: User ID -->
                    <div style="margin-bottom: 18px;">
                        <label style="display: block; font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                            👤 Zalo UserId / Chat ID Người Nhận
                        </label>
                        <input type="text" id="cda-zalo-user-id" value="${_escapeHtml(userId)}" placeholder="Nhập Zalo UserId / Chat ID người nhận..." style="
                            width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                            font-size: 13px; outline: none; box-sizing: border-box;
                        ">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">ID tài khoản Zalo nhận tin nhắn thông báo của Bạn.</div>
                    </div>

                    <!-- Input 3: Webhook URL -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                            🔗 Zalo Webhook URL <span style="font-weight: 400; color: #64748b; font-size: 11px;">(Tùy chọn phụ — Nếu muốn gửi sang n8n Webhook)</span>
                        </label>
                        <input type="text" id="cda-zalo-webhook" value="${_escapeHtml(webhookUrl)}" placeholder="https://dongphuchv.tino.page/webhook/..." style="
                            width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                            font-size: 13px; outline: none; box-sizing: border-box;
                        ">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Để trống nếu đã điền Zalo AccessToken ở trên.</div>
                    </div>

                    <div id="cda-zalo-test-result" style="display: none; margin-bottom: 16px; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600;"></div>
                </div>

                <!-- Footer Actions -->
                <div style="
                    padding: 18px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0;
                    display: flex; align-items: center; justify-content: space-between; gap: 12px;
                ">
                    <button id="cda-zalo-btn-test" style="
                        padding: 10px 18px; border-radius: 12px; border: 1.5px solid #0284c7;
                        background: #f0f9ff; color: #0284c7; font-size: 13px; font-weight: 800;
                        cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
                    " onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#f0f9ff'">
                        🧪 Test Gửi Tin Nhắn Zalo
                    </button>

                    <div style="display: flex; gap: 10px;">
                        <button id="cda-zalo-btn-cancel" style="
                            padding: 10px 18px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                            background: white; color: #475569; font-size: 13px; font-weight: 700; cursor: pointer;
                        ">Hủy</button>
                        <button id="cda-zalo-btn-save" style="
                            padding: 10px 22px; border-radius: 12px; border: none;
                            background: linear-gradient(135deg, #10b981, #059669);
                            color: white; font-size: 13px; font-weight: 800; cursor: pointer;
                            box-shadow: 0 4px 12px rgba(16,185,129,0.3); transition: all 0.2s;
                        ">💾 Lưu Cấu Hình Zalo</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Toggle Switch behavior
        const chk = overlay.querySelector('#cda-zalo-enabled');
        const slider = overlay.querySelector('#cda-zalo-slider');
        const knob = overlay.querySelector('#cda-zalo-knob');
        chk.addEventListener('change', () => {
            if (chk.checked) {
                slider.style.backgroundColor = '#10b981';
                knob.style.transform = 'translateX(24px)';
            } else {
                slider.style.backgroundColor = '#cbd5e1';
                knob.style.transform = 'none';
            }
        });

        // Close handlers
        const closeBtn = overlay.querySelector('#cda-zalo-close');
        const cancelBtn = overlay.querySelector('#cda-zalo-btn-cancel');
        const closeFunc = () => overlay.remove();
        closeBtn.addEventListener('click', closeFunc);
        cancelBtn.addEventListener('click', closeFunc);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFunc(); });

        // Test handler
        const testBtn = overlay.querySelector('#cda-zalo-btn-test');
        const testResultDiv = overlay.querySelector('#cda-zalo-test-result');
        testBtn.addEventListener('click', async () => {
            const tokenVal = overlay.querySelector('#cda-zalo-token').value.trim();
            const userIdVal = overlay.querySelector('#cda-zalo-user-id').value.trim();
            const webhookVal = overlay.querySelector('#cda-zalo-webhook').value.trim();

            testBtn.disabled = true;
            testBtn.textContent = '⏳ Đang thử nghiệm...';
            testResultDiv.style.display = 'none';

            try {
                const res = await fetch('/api/caidatads/zalo-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        zalo_access_token: tokenVal,
                        zalo_user_id: userIdVal,
                        zalo_webhook_url: webhookVal
                    })
                });
                const data = await res.json();
                testResultDiv.style.display = 'block';
                if (data.ok) {
                    testResultDiv.style.background = '#ecfdf5';
                    testResultDiv.style.color = '#047857';
                    testResultDiv.style.border = '1px solid #a7f3d0';
                    testResultDiv.innerHTML = data.message;
                } else {
                    testResultDiv.style.background = '#fef2f2';
                    testResultDiv.style.color = '#b91c1c';
                    testResultDiv.style.border = '1px solid #fca5a5';
                    testResultDiv.innerHTML = data.error || 'Test thất bại!';
                }
            } catch (err) {
                testResultDiv.style.display = 'block';
                testResultDiv.style.background = '#fef2f2';
                testResultDiv.style.color = '#b91c1c';
                testResultDiv.style.border = '1px solid #fca5a5';
                testResultDiv.innerHTML = `🔴 Lỗi kết nối: ${err.message}`;
            } finally {
                testBtn.disabled = false;
                testBtn.innerHTML = '🧪 Test Gửi Tin Nhắn Zalo';
            }
        });

        // Save handler
        const saveBtn = overlay.querySelector('#cda-zalo-btn-save');
        saveBtn.addEventListener('click', async () => {
            const tokenVal = overlay.querySelector('#cda-zalo-token').value.trim();
            const userIdVal = overlay.querySelector('#cda-zalo-user-id').value.trim();
            const webhookVal = overlay.querySelector('#cda-zalo-webhook').value.trim();
            const enabledVal = overlay.querySelector('#cda-zalo-enabled').checked ? 'true' : 'false';

            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Đang lưu...';

            try {
                const res = await fetch('/api/caidatads/zalo-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        settings: {
                            zalo_enabled: enabledVal,
                            zalo_access_token: tokenVal,
                            zalo_user_id: userIdVal,
                            zalo_webhook_url: webhookVal
                        }
                    })
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error || 'Lỗi không xác định');

                alert('✅ Đã lưu cấu hình Gửi Thông Báo Zalo trung tâm thành công!');
                overlay.remove();
            } catch (err) {
                alert(`❌ Lỗi lưu cấu hình: ${err.message}`);
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Lưu Cấu Hình Zalo';
            }
        });
    }

    // Helpers
    function _cleanAdAccountId(rawId) {
        if (!rawId) return '';
        let str = String(rawId).trim();
        str = str.replace(/^(act[=_])+/gi, '');
        str = str.replace(/[^0-9]/g, '');
        return str ? 'act_' + str : '';
    }
    function _escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function _escapeJsString(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'");
    }
};

