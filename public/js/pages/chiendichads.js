// ========== CHIẾN DỊCH VIDEO/ẢNH ADS PAGE ==========

function _cdAdsGetAuthHeaders() {
    const headers = {};
    const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
    if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

function _cdAdsIsSuperUser() {
    const u = window._currentUser || window.currentUser;
    if (!u) return false;
    return u.role === 'giam_doc' || u.role === 'admin' || !!u.is_admin;
}

function _cdAdsIsManager() {
    const u = window._currentUser || window.currentUser;
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'quan_ly' || r === 'quan_ly_cap_cao' || r === 'quan_ly_xuong';
}

function _cdAdsIsTruongPhong() {
    const u = window._currentUser || window.currentUser;
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'truong_phong' || r === 'leader' || r === 'truong_nhom';
}

async function _cdAdsApi(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: _cdAdsGetAuthHeaders(),
        credentials: 'include'
    };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return await res.json();
}

var _cdAdsState = window._cdAdsState || {
    campaigns: [],
    channels: [],
    myItems: [],
    filterStatus: 'all',
    filterChannel: 'all',
    filterSearch: '',
    currentPage: 1,
    pageSize: 20
};
window._cdAdsState = _cdAdsState;

// ========== MAIN RENDER ==========

async function renderChiendichadsPage(container) {
    if (!container || !(container instanceof HTMLElement)) {
        container = document.getElementById('mainContent') || document.getElementById('app') || document.querySelector('.main-content') || document.body;
    }
    if (!container) return;

    const isGD = _cdAdsIsSuperUser();
    const isQL = _cdAdsIsManager();
    const isTP = _cdAdsIsTruongPhong();
    const showUserFilter = isGD || isQL || isTP;

    container.innerHTML = `
        <div style="padding: 24px 32px; width: 100%; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); border-radius: 20px; padding: 32px 40px; color: white; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center;">
                <div style="position: absolute; right: 260px; bottom: -30px; font-size: 160px; opacity: 0.12; user-select: none;">🚀</div>
                <div style="z-index: 1;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                        <span>📢 Bộ Phận Marketing Ads</span>
                    </div>
                    <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🚀 Chiến Dịch Video / Ảnh Ads</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9; max-width: 650px; line-height: 1.5;">
                        Quản lý và theo dõi danh sách các Chiến Dịch Quảng Cáo Video & Hình Ảnh (Chi phí, hiệu quả, trạng thái chạy).
                    </p>
                </div>
                <div style="z-index: 1; display: flex; gap: 12px; align-items: center;">
                    <button onclick="_cdAdsOpenCreateModal()" style="background: #10b981; color: white; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 18px;">➕</span> Tạo Chiến Dịch Mới
                    </button>
                </div>
            </div>

            <!-- Cảnh báo chưa báo cáo -->
            <div id="cdAdsUnreportedWarning" style="display: none;"></div>

            <!-- Filter Toolbar -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #0f172a;">
                        <span>🔍</span> TÌM KIẾM & LỌC CHIẾN DỊCH ADS
                    </div>
                    <div id="cdAdsResultCount" style="font-size: 12px; font-weight: 800; color: #4338ca; background: #eef2ff; padding: 6px 14px; border-radius: 20px; border: 1px solid #c7d2fe;">
                        Hiển thị 0 chiến dịch
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr ${showUserFilter ? '1fr' : ''} auto; gap: 12px; align-items: center;">
                    <div style="position: relative;">
                        <input type="text" id="cdAdsSearchInput" onkeyup="_cdAdsApplyFilters()" placeholder="🔍 Tìm tên chiến dịch, Post ID, ID Camp..." style="width: 100%; padding: 10px 14px 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; background: #fafafa; outline: none; box-sizing: border-box;" onfocus="this.style.borderColor='#4338ca';this.style.background='white'" onblur="this.style.borderColor='#cbd5e1'">
                    </div>
                    <select id="cdAdsFilterChannel" onchange="_cdAdsApplyFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                        <option value="all">📺 Tất cả kênh</option>
                    </select>
                    <select id="cdAdsFilterStatus" onchange="_cdAdsApplyFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                        <option value="all">📊 Tất cả trạng thái</option>
                        <option value="chay_test">🔵 Chạy Test</option>
                        <option value="mau_win">✅ Mẫu Win</option>
                        <option value="mau_lose">❌ Mẫu Lose</option>
                    </select>
                    ${showUserFilter ? `
                    <select id="cdAdsFilterUser" onchange="_cdAdsApplyFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                        <option value="all">👤 Tất cả nhân viên</option>
                    </select>
                    ` : ''}
                    <button onclick="_cdAdsResetFilters()" style="padding: 10px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; white-space: nowrap;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">🔄 Đặt Lại</button>
                </div>
            </div>

            <!-- Stats Summary -->
            <div id="cdAdsStatsSummary" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;"></div>

            <!-- Main Table -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04);">
                <div id="cdAdsTableContainer" style="overflow-x: auto;">
                    <div style="text-align: center; padding: 60px; color: #64748b; font-size: 15px;">⏳ Đang tải dữ liệu chiến dịch...</div>
                </div>
            </div>
        </div>

        <!-- MODAL: Tạo Chiến Dịch Mới -->
        <div id="cdAdsCreateModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 24px;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 720px; max-height: 90vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #1e1b4b, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">🚀</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">Tạo Chiến Dịch Ads Mới</h3>
                            <div style="font-size: 12px; opacity: 0.85;">Chọn mẫu → Chọn kênh → Chọn tài khoản QC → Chọn chiến dịch Camp</div>
                        </div>
                    </div>
                    <button onclick="_cdAdsCloseCreateModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>
                <div style="padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;">
                    <!-- Bước 1: Chọn mẫu -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">📦 Bước 1: Chọn Mẫu Từ Kho Ads <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsCreateItemSelect" onchange="_cdAdsOnItemSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #6366f1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #eef2ff; color: #3730a3;">
                            <option value="">-- Chọn mẫu Video/Ảnh Ads --</option>
                        </select>
                        <div id="cdAdsCreateItemPreview" style="display: none; margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; gap: 12px; align-items: center;"></div>
                    </div>
                    <!-- Bước 2: Chọn kênh -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">📺 Bước 2: Chọn Kênh Quảng Cáo (Từ Cài Đặt Tài Khoản Ads) <span style="color:#dc2626">*</span></label>
                        <div id="cdAdsCreateChannelList" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
                    </div>
                    <!-- Bước 3: Chọn Tài Khoản Quảng Cáo -->
                    <div id="cdAdsStep3Box" style="display: none;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">💳 Bước 3: Chọn Tài Khoản Quảng Cáo <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsCreateAdAccountSelect" onchange="_cdAdsOnAdAccountSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #0284c7; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f0f9ff; color: #0369a1;">
                            <option value="">-- Chọn Tài Khoản QC đã liên kết --</option>
                        </select>
                    </div>
                    <!-- Bước 4: Chọn Chiến Dịch Camp từ Tài Khoản QC -->
                    <div id="cdAdsStep4Box" style="display: none;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">🎯 Bước 4: Chọn Chiến Dịch Camp Từ Tài Khoản QC <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsCreateCampaignSelect" onchange="_cdAdsOnCampaignSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #16a34a; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f0fdf4; color: #15803d;">
                            <option value="">-- Chọn Chiến Dịch --</option>
                        </select>
                    </div>
                    <!-- Post ID + ID Camp -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🆔 Post ID <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động liên kết)</span></label>
                            <input type="text" id="cdAdsCreatePostId" readonly placeholder="Tự động liên kết..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🏷️ ID Camp <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động liên kết)</span></label>
                            <input type="text" id="cdAdsCreateCampId" readonly placeholder="Tự động liên kết..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed; box-sizing: border-box;">
                        </div>
                    </div>
                    <!-- Tên chiến dịch (tự động) -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">📌 Tên Chiến Dịch <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động liên kết mẫu + kênh/TK + camp)</span></label>
                        <input type="text" id="cdAdsCreateCampaignName" readonly placeholder="Tự động liên kết..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed; box-sizing: border-box;">
                    </div>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;">
                    <button onclick="_cdAdsCloseCreateModal()" style="padding: 10px 20px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 700; color: #475569; cursor: pointer;">Hủy</button>
                    <button onclick="_cdAdsSubmitCreate()" style="padding: 10px 24px; background: linear-gradient(135deg, #4338ca, #6366f1); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(67,56,202,0.3);">🚀 Tạo Chiến Dịch</button>
                </div>
            </div>
        </div>

        <!-- MODAL: Xem Chi Tiết -->
        <div id="cdAdsDetailModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 24px; overflow-y: auto;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 900px; max-height: 90vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #0f172a, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">📋</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;" id="cdAdsDetailTitle">Chi Tiết Chiến Dịch</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Lịch sử báo cáo hàng ngày</div>
                        </div>
                    </div>
                    <button onclick="_cdAdsCloseDetailModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>
                <div id="cdAdsDetailBody" style="padding: 24px; overflow-y: auto; flex: 1;">
                    <div style="text-align: center; color: #64748b; padding: 40px;">⏳ Đang tải...</div>
                </div>
            </div>
        </div>
    `;

    // Init default date for report modal
    const today = new Date().toISOString().split('T')[0];
    const rptDateInput = document.getElementById('cdAdsReportDate');
    if (rptDateInput) rptDateInput.value = today;

    // Load data
    await _cdAdsLoadAll();
}

// ========== DATA LOADING ==========

async function _cdAdsLoadAll() {
    await Promise.all([
        _cdAdsLoadChannels(),
        _cdAdsLoadCampaigns(),
        _cdAdsCheckUnreported()
    ]);
}

async function _cdAdsLoadChannels() {
    try {
        const data = await _cdAdsApi('/api/ads-campaigns/linked-platforms');
        _cdAdsState.channels = data.platforms || [];
        // Update filter dropdown
        const sel = document.getElementById('cdAdsFilterChannel');
        if (sel) {
            sel.innerHTML = '<option value="all">📺 Tất cả kênh</option>' +
                _cdAdsState.channels.map(ch => `<option value="${ch.id}">${ch.icon || '📺'} ${ch.name}</option>`).join('');
        }
    } catch(e) { console.error('[cdAds loadChannels]', e); }
}

async function _cdAdsLoadCampaigns() {
    try {
        const params = new URLSearchParams();
        const search = document.getElementById('cdAdsSearchInput')?.value || '';
        const status = document.getElementById('cdAdsFilterStatus')?.value || 'all';
        const channel = document.getElementById('cdAdsFilterChannel')?.value || 'all';

        if (search) params.set('search', search);
        if (status !== 'all') params.set('status', status);
        if (channel !== 'all') params.set('channel_id', channel);

        const data = await _cdAdsApi(`/api/ads-campaigns?${params.toString()}`);
        _cdAdsState.campaigns = data.campaigns || [];

        _cdAdsRenderStats();
        _cdAdsRenderTable();
        _cdAdsPopulateUserFilter();
    } catch(e) {
        console.error('[cdAds loadCampaigns]', e);
    }
}

async function _cdAdsCheckUnreported() {
    const box = document.getElementById('cdAdsUnreportedWarning');
    if (box) box.style.display = 'none';
}

// ========== RENDER STATS ==========

function _cdAdsRenderStats() {
    const box = document.getElementById('cdAdsStatsSummary');
    if (!box) return;
    const all = _cdAdsState.campaigns;
    const testing = all.filter(c => c.status === 'chay_test').length;
    const win = all.filter(c => c.status === 'mau_win').length;
    const lose = all.filter(c => c.status === 'mau_lose').length;

    const cards = [
        { label: 'Tổng Chiến Dịch', value: all.length, icon: '📊', bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', color: '#4338ca', borderColor: '#c7d2fe' },
        { label: 'Đang Chạy Test', value: testing, icon: '🔵', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', borderColor: '#93c5fd' },
        { label: 'Mẫu Win', value: win, icon: '✅', bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', color: '#16a34a', borderColor: '#86efac' },
        { label: 'Mẫu Lose', value: lose, icon: '❌', bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', color: '#dc2626', borderColor: '#fca5a5' }
    ];

    box.innerHTML = cards.map(c => `
        <div style="background: ${c.bg}; border: 1.5px solid ${c.borderColor}; border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 28px;">${c.icon}</span>
            <div>
                <div style="font-size: 24px; font-weight: 800; color: ${c.color};">${c.value}</div>
                <div style="font-size: 12px; font-weight: 700; color: ${c.color}; opacity: 0.8;">${c.label}</div>
            </div>
        </div>
    `).join('');
}

// ========== RENDER TABLE ==========

function _cdAdsRenderTable() {
    const container = document.getElementById('cdAdsTableContainer');
    if (!container) return;

    let filtered = [..._cdAdsState.campaigns];

    // Client-side user filter
    const userFilter = document.getElementById('cdAdsFilterUser')?.value || 'all';
    if (userFilter !== 'all') {
        filtered = filtered.filter(c => String(c.created_by) === String(userFilter));
    }

    // Update count
    const countEl = document.getElementById('cdAdsResultCount');
    if (countEl) countEl.textContent = `Hiển thị ${filtered.length} chiến dịch`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #64748b;">
                <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                <div style="font-size: 16px; font-weight: 800; color: #334155; margin-bottom: 6px;">Chưa có chiến dịch nào</div>
                <div style="font-size: 13px;">Nhấn "➕ Tạo Chiến Dịch Mới" để bắt đầu</div>
            </div>
        `;
        return;
    }

    const isGD = _cdAdsIsSuperUser();
    const curUser = window._currentUser || window.currentUser || {};

    const statusBadge = (s) => {
        if (s === 'chay_test') return '<span style="background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">🔵 Chạy Test</span>';
        if (s === 'mau_win') return '<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">✅ Mẫu Win</span>';
        if (s === 'mau_lose') return '<span style="background:#fee2e2;color:#b91c1c;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">❌ Mẫu Lose</span>';
        return s;
    };

    const fmtNum = (n) => {
        if (!n && n !== 0) return '-';
        return Number(n).toLocaleString('vi-VN');
    };

    const fmtMoney = (n) => {
        if (!n && n !== 0) return '-';
        return Number(n).toLocaleString('vi-VN') + 'đ';
    };

    let rows = filtered.map((c, idx) => {
        const isCreator = Number(c.created_by) === Number(curUser.id);
        const canEdit = isGD || isCreator;
        const thumbStyle = c.thumbnail_url 
            ? `background-image:url('${c.thumbnail_url}');background-size:cover;background-position:center;` 
            : 'background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px;';
        const thumbContent = c.thumbnail_url ? '' : (c.media_type === 'video' ? '🎥' : '🖼️');

        return `<tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#fafbff'" onmouseout="this.style.background='white'" onclick="if(!event.target.closest('button') && !event.target.closest('a') && !event.target.closest('.no-row-click')) _cdAdsViewDetail(${c.id})">
            <td style="padding:10px 12px;font-size:12px;font-weight:800;color:#64748b;text-align:center;">${idx + 1}</td>
            <td class="no-row-click" onclick="event.stopPropagation(); _cdAdsGoToKhoAdsItem(${c.kho_ads_item_id || 'null'})" style="padding:10px 8px;cursor:pointer;" title="Xem mẫu tại Kho Video/Ảnh Ads">
                <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;${thumbStyle}">${thumbContent}</div>
            </td>
            <td class="no-row-click" onclick="event.stopPropagation(); _cdAdsGoToKhoAdsItem(${c.kho_ads_item_id || 'null'})" style="padding:10px 8px;cursor:pointer;" title="Xem mẫu tại Kho Video/Ảnh Ads">
                <div style="font-size:13px;font-weight:800;color:#0f172a;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(c.campaign_name || '').replace(/"/g, '&quot;')}">${c.campaign_name || '-'}</div>
                <div style="font-size:11px;color:#64748b;font-weight:600;">${c.linh_vuc || ''} ${c.media_type === 'video' ? '🎥' : '🖼️'}</div>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="background:${c.channel_color || '#6366f1'}22;color:${c.channel_color || '#6366f1'};padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">${c.channel_icon || '📺'} ${c.channel_name || '-'}</span>
                ${c.ad_account_name ? `<div style="font-size:10.5px;font-weight:700;color:#0284c7;margin-top:3px;">💳 ${c.ad_account_name}</div>` : ''}
            </td>
            ${c.post_id ? `
                <td class="no-row-click" onclick="event.stopPropagation(); window.open('https://fb.com/${c.post_id}', '_blank')" style="padding:10px 8px;font-size:12px;font-weight:700;color:#2563eb;text-decoration:underline;text-align:center;max-width:90px;overflow:hidden;text-overflow:ellipsis;cursor:pointer;" title="Mở Facebook: https://fb.com/${c.post_id}">${c.post_id}</td>
            ` : `
                <td style="padding:10px 8px;font-size:12px;font-weight:600;color:#94a3b8;text-align:center;">-</td>
            `}
            <td style="padding:10px 8px;font-size:12px;font-weight:600;color:#334155;text-align:center;max-width:80px;overflow:hidden;text-overflow:ellipsis;" title="${c.camp_id || ''}">${c.camp_id || '-'}</td>
            <td style="padding:10px 8px;text-align:center;">${statusBadge(c.status)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#0f172a;text-align:right;">${fmtMoney(c.total_spend)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(c.total_messages)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:${Number(c.avg_cpa) > 0 && Number(c.avg_cpa) <= 75000 ? '#16a34a' : '#334155'};text-align:right;">${fmtMoney(c.avg_cpa)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(c.avg_cpc)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${c.avg_ctr ? Number(c.avg_ctr).toFixed(2) + '%' : '-'}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(c.avg_cpm)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(c.total_run_count)}</td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="background:#f3e8ff;color:#7e22ce;padding:3px 8px;border-radius:10px;font-size:11.5px;font-weight:800;">${fmtNum(c.run_count_gt70k)}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:10px;font-size:11.5px;font-weight:800;">${fmtNum(c.total_effective_count)}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <div style="font-size:12px;font-weight:700;color:#334155;">${c.created_by_name || '-'}</div>
                <div style="font-size:10px;color:#94a3b8;font-weight:600;">${c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '-'}</div>
            </td>
            <td style="padding:10px 8px;text-align:center;" onclick="event.stopPropagation()">
                <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                    <button onclick="event.stopPropagation(); _cdAdsViewDetail(${c.id})" title="Xem chi tiết" style="padding:5px 8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;cursor:pointer;color:#4338ca;font-weight:700;">📋</button>
                    ${canEdit ? `
                        <button onclick="event.stopPropagation(); _cdAdsChangeStatus(${c.id})" title="Đánh dấu Win/Lose" style="padding:5px 8px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:12px;cursor:pointer;color:#a16207;font-weight:700;">🏆</button>
                        <button onclick="event.stopPropagation(); _cdAdsDeleteCampaign(${c.id})" title="Xóa" style="padding:5px 8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;font-size:12px;cursor:pointer;color:#dc2626;font-weight:700;">🗑️</button>
                    ` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; min-width: 1500px;">
            <thead>
                <tr style="background: linear-gradient(135deg, #0f172a, #1e1b4b); border-bottom: 2px solid #334155;">
                    <th style="padding:12px 12px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">STT</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">ẢNH</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:left;white-space:nowrap;letter-spacing:0.5px;">TÊN CHIẾN DỊCH</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">KÊNH</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">POST ID</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">ID CAMP</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">TRẠNG THÁI</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;">NGÂN SÁCH</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">TIN NHẮN</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;">CPA</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;">CPC</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">CTR</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;">CPM</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">SỐ LẦN CHẠY</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">SL CHẠY >70K</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">HIỆU QUẢ</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">NGƯỜI TẠO</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">HÀNH ĐỘNG</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function _cdAdsPopulateUserFilter() {
    const sel = document.getElementById('cdAdsFilterUser');
    if (!sel) return;
    const userMap = {};
    _cdAdsState.campaigns.forEach(c => {
        if (c.created_by && c.created_by_name) {
            userMap[c.created_by] = c.created_by_name;
        }
    });
    const current = sel.value;
    sel.innerHTML = '<option value="all">👤 Tất cả nhân viên</option>' +
        Object.entries(userMap).map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
    sel.value = current;
}

// ========== FILTERS ==========

function _cdAdsApplyFilters() {
    _cdAdsLoadCampaigns();
}

function _cdAdsResetFilters() {
    const search = document.getElementById('cdAdsSearchInput');
    const status = document.getElementById('cdAdsFilterStatus');
    const channel = document.getElementById('cdAdsFilterChannel');
    const user = document.getElementById('cdAdsFilterUser');
    if (search) search.value = '';
    if (status) status.value = 'all';
    if (channel) channel.value = 'all';
    if (user) user.value = 'all';
    _cdAdsLoadCampaigns();
}

// ========== CHANNEL MODAL ==========

function _cdAdsOpenChannelModal() {
    // Deprecated modal
}

function _cdAdsCloseChannelModal() {
    // Deprecated modal
}

// ========== CREATE CAMPAIGN MODAL (4 BƯỚC LIÊN KẾT TÀI KHOẢN ADS & META GRAPH API) ==========

async function _cdAdsOpenCreateModal() {
    document.getElementById('cdAdsCreateModal').style.display = 'flex';
    // Load items từ kho ads
    try {
        const data = await _cdAdsApi('/api/ads-campaigns/my-items');
        _cdAdsState.myItems = data.items || [];
        const sel = document.getElementById('cdAdsCreateItemSelect');
        if (sel) {
            sel.innerHTML = '<option value="">-- Chọn mẫu Video/Ảnh Ads --</option>' +
                _cdAdsState.myItems.map(i => `<option value="${i.id}">${i.title} (${i.linh_vuc || ''} • ${i.media_type === 'video' ? '🎥 Video' : '🖼️ Ảnh'})</option>`).join('');
        }
    } catch(e) { console.error(e); }

    // Load channel buttons từ Cài Đặt Tài Khoản Ads
    _cdAdsRenderCreateChannels();

    // Reset form states
    window._cdAdsSelectedPlatform = null;
    window._cdAdsSelectedAdAccount = null;
    window._cdAdsSelectedCampaign = null;
    window._cdAdsCurrentAccountCampaigns = [];

    const postIdInput = document.getElementById('cdAdsCreatePostId');
    const campIdInput = document.getElementById('cdAdsCreateCampId');
    const campNameInput = document.getElementById('cdAdsCreateCampaignName');
    if (postIdInput) postIdInput.value = '';
    if (campIdInput) campIdInput.value = '';
    if (campNameInput) campNameInput.value = '';

    const step3Box = document.getElementById('cdAdsStep3Box');
    const step4Box = document.getElementById('cdAdsStep4Box');
    if (step3Box) step3Box.style.display = 'none';
    if (step4Box) step4Box.style.display = 'none';
}

function _cdAdsCloseCreateModal() {
    document.getElementById('cdAdsCreateModal').style.display = 'none';
}

function _cdAdsRenderCreateChannels() {
    const box = document.getElementById('cdAdsCreateChannelList');
    if (!box) return;
    box.innerHTML = _cdAdsState.channels.map(ch => `
        <button onclick="_cdAdsSelectChannel('${ch.id}', this)" data-channel-id="${ch.id}" style="padding:10px 18px;border:2px solid #e2e8f0;border-radius:12px;background:white;cursor:pointer;font-size:14px;font-weight:700;color:#334155;display:flex;align-items:center;gap:8px;transition:all 0.2s;">
            <span style="font-size:18px;">${ch.icon || '📺'}</span>
            <span>${ch.name}</span>
        </button>
    `).join('');
}

async function _cdAdsSelectChannel(platformId, btn) {
    window._cdAdsSelectedPlatform = platformId;
    window._cdAdsSelectedAdAccount = null;
    window._cdAdsSelectedCampaign = null;
    window._cdAdsCurrentAccountCampaigns = [];

    // Highlight selected button
    const allBtns = document.querySelectorAll('#cdAdsCreateChannelList button');
    allBtns.forEach(b => {
        b.style.borderColor = '#e2e8f0';
        b.style.background = 'white';
        b.style.color = '#334155';
    });
    if (btn) {
        btn.style.borderColor = '#4338ca';
        btn.style.background = '#eef2ff';
        btn.style.color = '#4338ca';
    }

    // Load ad accounts for this platform
    await _cdAdsLoadAccountsForPlatform(platformId);
}

async function _cdAdsLoadAccountsForPlatform(platformId) {
    const step3Box = document.getElementById('cdAdsStep3Box');
    const accSelect = document.getElementById('cdAdsCreateAdAccountSelect');
    const step4Box = document.getElementById('cdAdsStep4Box');

    if (step4Box) step4Box.style.display = 'none';
    const campIdInput = document.getElementById('cdAdsCreateCampId');
    if (campIdInput) campIdInput.value = '';

    if (!step3Box || !accSelect) return;
    step3Box.style.display = 'block';
    accSelect.innerHTML = '<option value="">⏳ Đang tải tài khoản QC từ Cài Đặt Tài Khoản Ads... </option>';

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/accounts-by-platform?platform=${encodeURIComponent(platformId)}`);
        const accounts = res.accounts || [];
        window._cdAdsPlatformAccounts = accounts;

        if (accounts.length === 0) {
            accSelect.innerHTML = `<option value="">⚠️ Chưa có tài khoản QC nào cho kênh "${platformId.toUpperCase()}" ở Cài Đặt Tài Khoản Ads</option>`;
        } else {
            accSelect.innerHTML = '<option value="">-- Chọn Tài Khoản QC đã liên kết --</option>' +
                accounts.map(acc => `<option value="${acc.id}">${acc.account_name} (${acc.fb_ad_account_id || acc.platform}) ${acc.assigned_staff_name ? '• NV: ' + acc.assigned_staff_name : ''}</option>`).join('');
        }
    } catch(e) {
        accSelect.innerHTML = '<option value="">🔴 Lỗi tải danh sách tài khoản QC</option>';
    }

    _cdAdsUpdateCampaignName();
}

async function _cdAdsOnAdAccountSelect() {
    const accId = document.getElementById('cdAdsCreateAdAccountSelect')?.value;
    window._cdAdsSelectedAdAccount = accId || null;
    window._cdAdsSelectedCampaign = null;
    window._cdAdsCurrentAccountCampaigns = [];

    const step4Box = document.getElementById('cdAdsStep4Box');
    const campSelect = document.getElementById('cdAdsCreateCampaignSelect');
    const campIdInput = document.getElementById('cdAdsCreateCampId');
    if (campIdInput) campIdInput.value = '';

    if (!accId) {
        if (step4Box) step4Box.style.display = 'none';
        _cdAdsUpdateCampaignName();
        return;
    }

    if (step4Box) step4Box.style.display = 'block';
    if (campSelect) campSelect.innerHTML = '<option value="">⏳ Đang tải danh sách chiến dịch Camp từ Facebook API...</option>';

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/ad-account-campaigns?account_id=${accId}`);
        if (res.error) {
            alert(res.error);
            if (campSelect) campSelect.innerHTML = `<option value="">🔴 ${res.error}</option>`;
            _cdAdsUpdateCampaignName();
            return;
        }

        const campaigns = res.campaigns || [];
        window._cdAdsCurrentAccountCampaigns = campaigns;

        if (campSelect) {
            if (campaigns.length === 0) {
                campSelect.innerHTML = '<option value="">⚠️ Không có chiến dịch nào trong tài khoản QC này</option>';
            } else {
                campSelect.innerHTML = `<option value="">-- Chọn Chiến Dịch (${campaigns.length} chiến dịch) --</option>` +
                    campaigns.map(c => `<option value="${c.id}">[${c.effective_status || c.status || 'OFF'}] ${c.name} (ID: ${c.id})</option>`).join('');
            }
        }
    } catch(e) {
        if (campSelect) campSelect.innerHTML = '<option value="">🔴 Lỗi kết nối lấy danh sách chiến dịch</option>';
    }

    _cdAdsUpdateCampaignName();
}

function _cdAdsOnCampaignSelect() {
    const campId = document.getElementById('cdAdsCreateCampaignSelect')?.value;
    const campInput = document.getElementById('cdAdsCreateCampId');
    const postInput = document.getElementById('cdAdsCreatePostId');

    if (campId) {
        if (campInput) campInput.value = campId;
        const campObj = (window._cdAdsCurrentAccountCampaigns || []).find(c => String(c.id) === String(campId));
        window._cdAdsSelectedCampaign = campObj || null;
        if (postInput) {
            postInput.value = (campObj && campObj.post_id) ? campObj.post_id : campId;
        }
    } else {
        window._cdAdsSelectedCampaign = null;
        if (campInput) campInput.value = '';
        if (postInput) postInput.value = '';
    }

    _cdAdsUpdateCampaignName();
}

function _cdAdsOnItemSelect() {
    const sel = document.getElementById('cdAdsCreateItemSelect');
    const itemId = sel?.value;
    const preview = document.getElementById('cdAdsCreateItemPreview');

    if (itemId && preview) {
        const item = _cdAdsState.myItems.find(i => String(i.id) === String(itemId));
        if (item) {
            preview.style.display = 'flex';
            preview.innerHTML = `
                <div style="width:60px;height:60px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;flex-shrink:0;${item.thumbnail_url ? `background-image:url('${item.thumbnail_url}');background-size:cover;background-position:center;` : 'background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:24px;'}">
                    ${item.thumbnail_url ? '' : (item.media_type === 'video' ? '🎥' : '🖼️')}
                </div>
                <div>
                    <div style="font-size:13px;font-weight:800;color:#0f172a;">${item.title}</div>
                    <div style="font-size:11px;color:#64748b;font-weight:600;">${item.linh_vuc || ''} • ${item.media_type === 'video' ? '🎥 Video Ads' : '🖼️ Ảnh Ads'} • Tạo bởi: ${item.created_by_name || ''}</div>
                </div>
            `;
        }
    } else if (preview) {
        preview.style.display = 'none';
    }
    _cdAdsUpdateCampaignName();
}

function _cdAdsUpdateCampaignName() {
    const itemId = document.getElementById('cdAdsCreateItemSelect')?.value;
    const platformId = window._cdAdsSelectedPlatform;
    const accId = window._cdAdsSelectedAdAccount;
    const campObj = window._cdAdsSelectedCampaign;
    const nameInput = document.getElementById('cdAdsCreateCampaignName');
    if (!nameInput) return;

    const item = _cdAdsState.myItems.find(i => String(i.id) === String(itemId));
    const channel = _cdAdsState.channels.find(ch => String(ch.id) === String(platformId));
    const accObj = (window._cdAdsPlatformAccounts || []).find(a => String(a.id) === String(accId));

    let parts = [];
    if (item) parts.push(item.title);
    if (accObj) parts.push(accObj.account_name);
    else if (channel) parts.push(channel.name);

    if (campObj && campObj.name) parts.push(campObj.name);

    nameInput.value = parts.join(' - ');
}

async function _cdAdsSubmitCreate() {
    const itemId = document.getElementById('cdAdsCreateItemSelect')?.value;
    const platformId = window._cdAdsSelectedPlatform;
    const accId = window._cdAdsSelectedAdAccount;
    const campId = document.getElementById('cdAdsCreateCampId')?.value;
    const postId = document.getElementById('cdAdsCreatePostId')?.value;
    const campaignName = document.getElementById('cdAdsCreateCampaignName')?.value;

    if (!itemId) return alert('Vui lòng chọn mẫu từ Kho Ads (Bước 1)!');
    if (!platformId) return alert('Vui lòng chọn kênh quảng cáo (Bước 2)!');
    if (!accId) return alert('Vui lòng chọn tài khoản quảng cáo (Bước 3)!');
    if (!campId) return alert('Vui lòng chọn hoặc nhập ID Camp (Bước 4)!');

    const channelObj = _cdAdsState.channels.find(ch => String(ch.id) === String(platformId));

    try {
        const res = await _cdAdsApi('/api/ads-campaigns', 'POST', {
            kho_ads_item_id: Number(itemId),
            ad_account_id: Number(accId),
            channel_name: channelObj ? channelObj.name : platformId,
            post_id: postId,
            camp_id: campId,
            campaign_name: campaignName
        });
        if (res.error) return alert(res.error);
        _cdAdsCloseCreateModal();
        await _cdAdsLoadAll();
        alert('🎉 Liên kết mẫu & chiến dịch camp thành công!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== REPORT MODAL ==========

function _cdAdsOpenReportModal(campaignId, campaignName) {
    document.getElementById('cdAdsReportModal').style.display = 'flex';
    document.getElementById('cdAdsReportCampaignId').value = campaignId;
    document.getElementById('cdAdsReportModalSub').textContent = campaignName || '';
    // Set default date to today
    document.getElementById('cdAdsReportDate').value = new Date().toISOString().split('T')[0];
    // Clear fields
    ['cdAdsRptNganSach', 'cdAdsRptTinNhan', 'cdAdsRptCpa', 'cdAdsRptCtr', 'cdAdsRptCpm', 'cdAdsRptSoLanChay', 'cdAdsRptHieuQua'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Load existing report for today if any
    _cdAdsLoadExistingReport(campaignId);
}

async function _cdAdsLoadExistingReport(campaignId) {
    try {
        const data = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/reports`);
        const reports = data.reports || [];
        const today = new Date().toISOString().split('T')[0];
        const todayReport = reports.find(r => r.report_date && r.report_date.startsWith(today));
        if (todayReport) {
            document.getElementById('cdAdsRptNganSach').value = todayReport.tong_ngan_sach || '';
            document.getElementById('cdAdsRptTinNhan').value = todayReport.tin_nhan || '';
            document.getElementById('cdAdsRptCpa').value = todayReport.cpa || '';
            document.getElementById('cdAdsRptCtr').value = todayReport.ctr || '';
            document.getElementById('cdAdsRptCpm').value = todayReport.cpm || '';
            document.getElementById('cdAdsRptSoLanChay').value = todayReport.so_lan_chay || '';
            document.getElementById('cdAdsRptHieuQua').value = todayReport.so_lan_hieu_qua || '';
        }
    } catch(e) { /* ignore */ }
}

function _cdAdsCloseReportModal() {
    document.getElementById('cdAdsReportModal').style.display = 'none';
}

async function _cdAdsSubmitReport() {
    const campaignId = document.getElementById('cdAdsReportCampaignId')?.value;
    if (!campaignId) return;

    const body = {
        report_date: document.getElementById('cdAdsReportDate')?.value,
        tong_ngan_sach: document.getElementById('cdAdsRptNganSach')?.value || 0,
        tin_nhan: document.getElementById('cdAdsRptTinNhan')?.value || 0,
        cpa: document.getElementById('cdAdsRptCpa')?.value || 0,
        ctr: document.getElementById('cdAdsRptCtr')?.value || 0,
        cpm: document.getElementById('cdAdsRptCpm')?.value || 0,
        so_lan_chay: document.getElementById('cdAdsRptSoLanChay')?.value || 0,
        so_lan_hieu_qua: document.getElementById('cdAdsRptHieuQua')?.value || 0
    };

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/reports`, 'POST', body);
        if (res.error) return alert(res.error);
        _cdAdsCloseReportModal();
        await _cdAdsLoadAll();
        alert('✅ Đã lưu báo cáo thành công!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== CHANGE STATUS ==========

async function _cdAdsChangeStatus(campaignId) {
    const choice = prompt('Nhập trạng thái mới:\n1 = Mẫu Win ✅\n2 = Mẫu Lose ❌\n3 = Quay lại Chạy Test 🔵');
    if (!choice) return;

    let status;
    if (choice === '1') status = 'mau_win';
    else if (choice === '2') status = 'mau_lose';
    else if (choice === '3') status = 'chay_test';
    else return alert('Lựa chọn không hợp lệ!');

    if (!confirm(`Xác nhận đổi trạng thái sang "${status === 'mau_win' ? '✅ Mẫu Win' : status === 'mau_lose' ? '❌ Mẫu Lose' : '🔵 Chạy Test'}"?`)) return;

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/status`, 'PUT', { status });
        if (res.error) return alert(res.error);
        await _cdAdsLoadAll();
        alert('✅ Đã cập nhật trạng thái!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== VIEW DETAIL ==========

async function _cdAdsViewDetail(campaignId) {
    document.getElementById('cdAdsDetailModal').style.display = 'flex';
    const body = document.getElementById('cdAdsDetailBody');
    body.innerHTML = '<div style="text-align:center;color:#64748b;padding:40px;">⏳ Đang tải...</div>';

    try {
        const camp = _cdAdsState.campaigns.find(c => c.id === campaignId);
        const data = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/reports`);
        const reports = data.reports || [];

        if (camp) {
            document.getElementById('cdAdsDetailTitle').textContent = camp.campaign_name || 'Chi Tiết Chiến Dịch';
        }

        const statusBadge = (s) => {
            if (s === 'chay_test') return '<span style="background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;">🔵 Chạy Test</span>';
            if (s === 'mau_win') return '<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;">✅ Mẫu Win</span>';
            if (s === 'mau_lose') return '<span style="background:#fee2e2;color:#b91c1c;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;">❌ Mẫu Lose</span>';
            return s;
        };

        const fmtNum = (n) => n ? Number(n).toLocaleString('vi-VN') : '0';
        const fmtMoney = (n) => n ? Number(n).toLocaleString('vi-VN') + 'đ' : '0đ';

        // Summary section
        let html = '';
        if (camp) {
            html += `
                <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
                    ${camp.thumbnail_url ? `<div style="width:100px;height:100px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;flex-shrink:0;background-image:url('${camp.thumbnail_url}');background-size:cover;background-position:center;"></div>` : ''}
                    <div style="flex:1;min-width:200px;">
                        <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:6px;">${camp.campaign_name || '-'}</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                            <span style="background:${camp.channel_color || '#6366f1'}22;color:${camp.channel_color || '#6366f1'};padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${camp.channel_icon || '📺'} ${camp.channel_name || ''}</span>
                            ${statusBadge(camp.status)}
                        </div>
                        <div style="font-size:12px;color:#64748b;font-weight:600;">
                            Post ID: <strong>${camp.post_id || '-'}</strong> &nbsp;|&nbsp; Camp ID: <strong>${camp.camp_id || '-'}</strong>
                            &nbsp;|&nbsp; Người tạo: <strong>${camp.created_by_name || '-'}</strong>
                            &nbsp;|&nbsp; Ngày tạo: <strong>${camp.created_at ? new Date(camp.created_at).toLocaleDateString('vi-VN') : '-'}</strong>
                        </div>
                        ${camp.drive_url ? `<div style="margin-top:6px;"><a href="${camp.drive_url}" target="_blank" style="font-size:12px;color:#2563eb;font-weight:700;text-decoration:none;">🔗 Mở Google Drive ↗</a></div>` : ''}
                    </div>
                </div>
            `;

            // Totals
            html += `
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;">
                    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#4338ca;">${fmtMoney(camp.total_spend)}</div>
                        <div style="font-size:10px;font-weight:700;color:#6366f1;">Tổng Ngân Sách</div>
                    </div>
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#16a34a;">${fmtNum(camp.total_messages)}</div>
                        <div style="font-size:10px;font-weight:700;color:#22c55e;">Tổng Tin Nhắn</div>
                    </div>
                    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#2563eb;">${fmtNum(camp.total_run_count)}</div>
                        <div style="font-size:10px;font-weight:700;color:#3b82f6;">Tổng Lần Chạy</div>
                    </div>
                    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#7e22ce;">${fmtNum(camp.run_count_gt70k)}</div>
                        <div style="font-size:10px;font-weight:700;color:#9333ea;">Lần Chạy >70K</div>
                    </div>
                    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#a16207;">${fmtNum(camp.total_effective_count)}</div>
                        <div style="font-size:10px;font-weight:700;color:#ca8a04;">Tổng Hiệu Quả</div>
                    </div>
                </div>
            `;
        }

        // Reports table
        html += `
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px;">📅 Nhật Ký Đồng Bộ Theo Ngày (${reports.length} bản ghi)</div>
        `;

        if (reports.length === 0) {
            html += '<div style="text-align:center;padding:30px;color:#9ca3af;font-size:13px;">Chưa có dữ liệu đồng bộ</div>';
        } else {
            html += `
                <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;">
                    <table style="width:100%;border-collapse:collapse;min-width:750px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a, #1e1b4b);">
                                <th style="padding:10px 12px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;">NGÀY</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;">NGÂN SÁCH</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;">TIN NHẮN</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;">CPA</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;">CPC</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;">CTR</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;">CPM</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;">SỐ LẦN CHẠY</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;">HIỆU QUẢ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(r => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${r.report_date ? new Date(r.report_date).toLocaleDateString('vi-VN') : '-'}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#0f172a;text-align:right;">${fmtMoney(r.tong_ngan_sach)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(r.tin_nhan)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:${Number(r.cpa) > 0 && Number(r.cpa) <= 75000 ? '#16a34a' : '#334155'};text-align:right;">${fmtMoney(r.cpa)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(r.cpc)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${r.ctr ? Number(r.ctr).toFixed(2) + '%' : '0%'}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(r.cpm)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(r.so_lan_chay)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;text-align:center;">${r.so_lan_hieu_qua ? '<span style="color:#16a34a;">✅ Đạt</span>' : '<span style="color:#94a3b8;">-</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = '<div style="color:red;padding:20px;">Lỗi tải chi tiết: ' + e.message + '</div>';
    }
}

function _cdAdsCloseDetailModal() {
    document.getElementById('cdAdsDetailModal').style.display = 'none';
}

// ========== DELETE CAMPAIGN ==========

async function _cdAdsDeleteCampaign(campaignId) {
    if (!confirm('Bạn có chắc muốn xóa chiến dịch này? Toàn bộ báo cáo hàng ngày sẽ bị xóa theo!')) return;
    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}`, 'DELETE');
        if (res.error) return alert(res.error);
        await _cdAdsLoadAll();
        alert('✅ Đã xóa chiến dịch!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

function _cdAdsEnsureKhoAdsModalInDOM() {
    if (document.getElementById('modalCreateKhoAdsItem')) return;

    const div = document.createElement('div');
    div.id = 'cdAdsKhoModalContainer';
    div.innerHTML = `
        <div id="modalCreateKhoAdsItem" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 20px; overflow-y: auto;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 1100px; max-height: 92vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #0f172a, #4338ca); padding: 18px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;" id="lblKhoAdsModalIcon">📋</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;" id="lblKhoAdsModalTitle">Chi Tiết & Quản Lý Tư Liệu Ads Công Việc</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Đăng tài nguyên Video/Ảnh chạy Quảng Cáo</div>
                        </div>
                    </div>
                    <button onclick="closeModalCreateKhoAdsItem()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>

                <div style="padding: 16px 24px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🔗 Liên Kết Với Công Việc (PHÒNG MARKETING) <span style="color:#dc2626">*</span></label>
                        <select id="selKhoAdsTaskId" onchange="onKhoAdsTaskSelectChange()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #6366f1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #eef2ff; color: #3730a3;">
                            <option value="">-- Vui lòng chọn Công Việc liên kết --</option>
                        </select>
                    </div>

                    <div id="boxKhoAdsTargetInfo" style="display: none; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 10px 16px; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 800; color: #3730a3;" id="lblKhoAdsTargetQtyText">
                                🔢 SỐ LƯỢNG CẦN SẢN XUẤT: <strong>1</strong> sản phẩm / video / ảnh
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <div style="font-size: 12px; font-weight: 800; color: #059669; background: #d1fae5; padding: 4px 12px; border-radius: 20px;" id="lblKhoAdsProgressCounter">
                                    📊 Tiến độ hoàn thành: 0 / 1
                                </div>
                                <div id="boxKhoAdsApprovalStatus" style="display: flex; align-items: center; gap: 8px;"></div>
                            </div>
                        </div>

                        <div id="boxKhoAdsSubItemTabs" style="display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px dashed #a5b4fc; padding-top: 8px;">
                        </div>
                    </div>
                </div>

                <div id="boxKhoAdsMainFormBody" style="padding: 20px 24px; display: none; grid-template-columns: 360px 1fr; gap: 24px; overflow-y: auto; flex: 1;">
                    <div style="display: flex; flex-direction: column; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; height: 100%;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a;">🖼️ Hình Ảnh / Thumbnail <span style="color:#dc2626">*</span></label>
                        <div id="boxKhoAdsThumbPreview" style="width: 100%; flex: 1; min-height: 360px; border: 2px dashed #a5b4fc; border-radius: 12px; background: #eef2ff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden; position: relative; padding: 10px; transition: border-color 0.2s;">
                            <div style="font-size: 36px; margin-bottom: 8px;">🖼️</div>
                            <div style="font-size: 13px; font-weight: 800; color: #4338ca; margin-bottom: 4px;">Dán ảnh qua Ctrl + V</div>
                            <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">(Bắt buộc dán ảnh cho từng tư liệu)</div>
                        </div>
                        <input type="hidden" id="iptKhoAdsThumbnailUrl">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">📌 Tên Video/Ảnh Ads <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động)</span></label>
                            <input type="text" id="iptKhoAdsTitle" readonly placeholder="Tự động sinh ra..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🏢 Lĩnh Vực Ads <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động)</span></label>
                                <select id="selKhoAdsLinhVuc" disabled style="width: 100%; padding: 11px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed;">
                                    <option value="">-- Lĩnh Vực Tự Động --</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🎬 Loại Tư Liệu <span style="color:#dc2626">*</span></label>
                                <select id="selKhoAdsMediaType" onchange="onKhoAdsSubItemInput('media_type', this.value)" style="width: 100%; padding: 11px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; outline: none; background: white;">
                                    <option value="video">🎥 Video Ads</option>
                                    <option value="image">🖼️ Ảnh Ads</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">📝 Content Ads <span style="color:#dc2626">*</span></label>
                                <button id="btnCopyKhoAdsContent" onclick="copyKhoAdsContentText()" style="padding: 5px 12px; background: #eef2ff; color: #4338ca; border: 1.5px solid #c7d2fe; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>📋</span> <span>Copy Content</span>
                                </button>
                            </div>
                            <textarea id="txtKhoAdsDescription" oninput="onKhoAdsSubItemInput('description', this.value)" rows="10" placeholder="Mô tả Content Ads..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 12px; font-size: 13.5px; outline: none; font-family: inherit; resize: vertical; min-height: 260px;"></textarea>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">🔗 Link Google Drive <span style="color:#dc2626">*</span></label>
                                <button id="btnOpenKhoAdsDriveUrl" onclick="openKhoAdsDriveUrlTab()" style="padding: 5px 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>🔗</span> <span>Mở Link Drive ↗</span>
                                </button>
                            </div>
                            <input type="url" id="iptKhoAdsDriveUrl" oninput="onKhoAdsSubItemInput('drive_url', this.value)" placeholder="https://drive.google.com/drive..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none;">
                        </div>
                    </div>
                </div>

                <div id="boxKhoAdsFooterActions" style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: none; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button id="btnKhoAdsPrevTab" onclick="navKhoAdsSubItemTab(-1)" style="padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 12.5px; cursor: pointer;">⬅️ Tư liệu trước</button>
                        <button id="btnKhoAdsNextTab" onclick="navKhoAdsSubItemTab(1)" style="padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 12.5px; cursor: pointer;">Tư liệu tiếp ➡️</button>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button id="btnKhoAdsCloseModal" onclick="closeModalCreateKhoAdsItem()" style="padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 13px; cursor: pointer;">Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

async function _cdAdsGoToKhoAdsItem(khoAdsItemId) {
    if (!khoAdsItemId || khoAdsItemId === 'null') {
        return alert('⚠️ Chiến dịch này chưa được liên kết với Mẫu Kho Ads!');
    }

    // Load khoads.js script if functions not available yet
    if (typeof openKhoAdsTaskDetailModal !== 'function') {
        if (typeof _loadScript === 'function') {
            await _loadScript('/js/pages/khoads.js');
        }
    }

    _cdAdsEnsureKhoAdsModalInDOM();

    window._khoAdsData = window._khoAdsData || {
        activeMainTab: 'tasks',
        tasks: [],
        items: [],
        linhVucList: [],
        editingId: null
    };

    try {
        const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
        const headers = {};
        if (token && token !== 'null') headers['Authorization'] = 'Bearer ' + token;

        // Fetch tasks if empty
        if (!_khoAdsData.tasks || _khoAdsData.tasks.length === 0) {
            const res = await fetch('/api/kho-ads/tasks-grouped', { headers }).then(r => r.json());
            if (res && res.ok) _khoAdsData.tasks = res.tasks || [];
        }

        // Find target task matching khoAdsItemId
        let targetTask = null;
        for (const t of (_khoAdsData.tasks || [])) {
            if (t.items && t.items.some(i => Number(i.id) === Number(khoAdsItemId))) {
                targetTask = t;
                break;
            }
        }

        if (targetTask && typeof openKhoAdsTaskDetailModal === 'function') {
            openKhoAdsTaskDetailModal(targetTask.id, Number(khoAdsItemId));
        } else if (typeof openKhoAdsItemDetailFromPersonal === 'function') {
            openKhoAdsItemDetailFromPersonal(Number(khoAdsItemId));
        } else {
            alert('⚠️ Không tìm thấy chi tiết Mẫu Ads!');
        }
    } catch(e) {
        console.error('[cdAdsGoToKhoAdsItem error]', e);
        alert('⚠️ Lỗi tải dữ liệu Mẫu Ads: ' + e.message);
    }
}

window.renderChiendichadsPage = renderChiendichadsPage;
window._cdAdsGoToKhoAdsItem = _cdAdsGoToKhoAdsItem;
