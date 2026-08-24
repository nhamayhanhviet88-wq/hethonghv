// ========== 2. TẮT / BẬT FB ADS — FRONTEND PAGE RENDERER ==========

window.renderTatbatfbadsPage = function(container) {
    if (!container) return;

    // ===== STATE =====
    let _accounts = [];
    let _selectedAccountId = 'all';
    let _configs = [];
    let _logs = [];
    let _disableConfigs = [];
    let _disableLogs = [];
    let _isGD = false;
    let _activeTab = 'enable_full'; // 'enable_full', 'enable_daily', 'enable_logs', 'disable_full', 'disable_no_msg', 'disable_logs'

    try {
        const u = window.__currentUser || window._currentUser;
        if (u) {
            const r = (u.role || '').toLowerCase();
            _isGD = r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!u.is_admin;
        }
    } catch(e) {}

    function _fmtMoney(val) {
        const n = parseFloat(val) || 0;
        return new Intl.NumberFormat('vi-VN').format(Math.round(n));
    }

    function _fmtMoneyFull(val) {
        return _fmtMoney(val) + ' đ';
    }

    function _fmtCPAValue(cpa, totalActions) {
        if (totalActions === 0 || !cpa || Number(cpa) >= 999000) {
            return `<span style="color: #64748b; font-weight: 700;" title="Không ra tin nhắn">—</span>`;
        }
        return _fmtMoneyFull(cpa);
    }

    const DAY_LABELS = { '0': 'CN', '1': 'T2', '2': 'T3', '3': 'T4', '4': 'T5', '5': 'T6', '6': 'T7' };
    const DAY_FULL_LABELS = { '0': 'Chủ Nhật', '1': 'Thứ 2', '2': 'Thứ 3', '3': 'Thứ 4', '4': 'Thứ 5', '5': 'Thứ 6', '6': 'Thứ 7' };

    function _formatDaysBadges(daysStr) {
        const days = (daysStr || '').split(',').map(d => d.trim()).filter(Boolean);
        return `<div style="display:flex; gap:3px; flex-wrap:wrap; max-width:140px; align-items:center;">` + days.map(d => {
            const label = DAY_LABELS[d] || d;
            const isWeekend = d === '0';
            const bg = isWeekend ? '#fef3c7' : '#e0f2fe';
            const color = isWeekend ? '#b45309' : '#0369a1';
            const border = isWeekend ? '#fde68a' : '#bae6fd';
            return `<span style="display:inline-block; padding:2px 7px; border-radius:6px; font-size:11px; font-weight:700; background:${bg}; color:${color}; border:1px solid ${border};">${label}</span>`;
        }).join('') + `</div>`;
    }

    function _formatTimeSlot(t) {
        if (!t) return '--:--';
        return String(t).slice(0, 5);
    }

    function _formatTbfaDateTime(dateInput) {
        if (!dateInput) return '—';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '—';

        const daysArr = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayOfWeek = daysArr[d.getDay()];

        const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 5);
        const parts = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).split('/');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');

        return `${dayOfWeek} - ${timeStr} ${day}/${month}`;
    }

    function _showToast(msg, type) {
        const old = document.getElementById('tbfa-toast');
        if (old) old.remove();
        const bgMap = { success: 'linear-gradient(135deg, #059669, #10b981)', error: 'linear-gradient(135deg, #dc2626, #ef4444)', info: 'linear-gradient(135deg, #2563eb, #3b82f6)' };
        const div = document.createElement('div');
        div.id = 'tbfa-toast';
        div.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;padding:14px 24px;border-radius:14px;background:${bgMap[type] || bgMap.info};color:white;font-weight:700;font-size:14px;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:slideIn 0.3s ease-out;max-width:480px;`;
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }

    // ===== MAIN LAYOUT =====
    container.innerHTML = `
        <style>
            @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            .tbfa-day-cb { margin-right: 3px; transform: scale(1.15); cursor: pointer; }
            .tbfa-day-label { cursor: pointer; font-weight: 600; font-size: 12px; margin-right: 10px; user-select: none; }
            .tbfa-tab-btn { padding: 9px 16px; border: 1.5px solid #cbd5e1; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit; letter-spacing: -0.2px; box-shadow: 0 2px 5px rgba(0,0,0,0.04); }
            .tbfa-tab-btn.active-enable { background: linear-gradient(135deg, #3730a3, #4338ca); color: #ffffff; border-color: #312e81; box-shadow: 0 4px 12px rgba(67,56,202,0.35); }
            .tbfa-tab-btn.active-disable { background: linear-gradient(135deg, #9f1239, #be123c); color: #ffffff; border-color: #881337; box-shadow: 0 4px 12px rgba(190,18,60,0.35); }
            .tbfa-tab-btn.inactive { background: #ffffff; color: #1e293b; border: 1.5px solid #cbd5e1; }
            .tbfa-tab-btn.inactive:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }

            /* ===== MOBILE RESPONSIVE STYLING ===== */
            @media (max-width: 768px), body.is-mobile-page {
                #tbfa-root {
                    padding: 8px 6px 160px 6px !important;
                }
                .tbfa-banner {
                    padding: 16px 14px !important;
                    border-radius: 16px !important;
                    margin-bottom: 12px !important;
                }
                .tbfa-banner h1 {
                    font-size: 19px !important;
                }
                .tbfa-banner-subtitle {
                    display: none !important;
                }
                .tbfa-account-section {
                    padding: 12px 10px !important;
                    border-radius: 16px !important;
                    margin-bottom: 12px !important;
                }
                #tbfa-account-cards-grid {
                    grid-template-columns: 1fr !important;
                    gap: 8px !important;
                }
                #tbfa-controls {
                    padding: 10px 8px !important;
                    border-radius: 16px !important;
                    margin-bottom: 12px !important;
                }
                .tbfa-tab-nav-wrapper {
                    width: 100% !important;
                    flex-direction: column !important;
                    gap: 6px !important;
                }
                .tbfa-tab-group {
                    display: flex !important;
                    overflow-x: auto !important;
                    white-space: nowrap !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: none !important;
                    padding: 4px !important;
                    gap: 6px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    border-radius: 12px !important;
                }
                .tbfa-tab-group::-webkit-scrollbar {
                    display: none !important;
                }
                .tbfa-tab-btn {
                    padding: 7px 12px !important;
                    font-size: 12px !important;
                    flex-shrink: 0 !important;
                    border-radius: 10px !important;
                }
                #tbfa-content > div {
                    padding: 14px 10px !important;
                    border-radius: 16px !important;
                }
                #tbfa-content table {
                    min-width: 780px !important;
                }
                #tbfa-content th {
                    white-space: nowrap !important;
                    padding: 12px 10px !important;
                }
            }
        </style>
        <div id="tbfa-root" style="padding: 24px; max-width: 1400px; margin: 0 auto;">
            <!-- Header Banner -->
            <div class="tbfa-banner" style="
                background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 75%, #4338ca 100%);
                border-radius: 20px; padding: 32px; color: white; margin-bottom: 24px;
                box-shadow: 0 20px 40px -12px rgba(49, 46, 129, 0.5); position: relative; overflow: hidden;
            ">
                <div style="position: absolute; top: -60px; right: -60px; width: 220px; height: 220px; background: rgba(255,255,255,0.06); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -40px; left: -40px; width: 160px; height: 160px; background: rgba(255,255,255,0.04); border-radius: 50%;"></div>

                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; position: relative; z-index: 1;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="
                                background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.25);
                                backdrop-filter: blur(12px); padding: 6px 14px; border-radius: 20px;
                                font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 1px 3px rgba(0,0,0,0.3);
                            ">Facebook Ads</span>
                            <span style="
                                background: rgba(99,102,241,0.3); border: 1px solid rgba(255,255,255,0.15);
                                padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; color: #c7d2fe;
                            ">🕐 Múi Giờ: Việt Nam (UTC+7)</span>
                        </div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.35);">
                            🔌 2. Tắt / Bật FB Ads
                        </h1>
                        <p class="tbfa-banner-subtitle" style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500; text-shadow: 0 1px 4px rgba(0,0,0,0.3);">
                            Quản lý & tự động BẬT / TẮT chiến dịch Facebook Ads (Tùy chọn nhóm thứ & mốc giờ cố định)
                        </p>
                    </div>
                    ${_isGD ? `
                    <a href="/caidattaikhoanads" target="_blank" style="
                        font-family: inherit; padding: 12px 22px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.35);
                        background: rgba(255,255,255,0.18); backdrop-filter: blur(12px); color: white; font-size: 14px; font-weight: 800;
                        text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    " onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">
                        <span>⚙️</span> Cài Đặt Tài Khoản Ads ↗
                    </a>
                    ` : ''}
                </div>
            </div>

            <!-- Account Cards Section -->
            <div id="tbfa-account-section" class="tbfa-account-section" style="
                background: white; border-radius: 20px; border: 1px solid #e2e8f0;
                padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">📡</span>
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                Danh Sách Tài Khoản Facebook Ads
                                <span id="tbfa-account-count-badge" style="background: #eef2ff; color: #4338ca; font-weight: 800; font-size: 12px; padding: 3px 10px; border-radius: 20px; border: 1px solid #c7d2fe;">0 TK</span>
                            </h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Bấm vào thẻ tài khoản bên dưới để chọn cấu hình cho tài khoản đó.</div>
                        </div>
                    </div>
                </div>
                <div id="tbfa-account-cards-grid" style="
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 14px;
                "></div>
            </div>

            <!-- Tabs Bar Header -->
            <div id="tbfa-controls" style="
                background: white; border-radius: 16px; padding: 16px 24px; margin-bottom: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">📱</span>
                        <span id="tbfa-selected-account-name" style="font-weight: 700; font-size: 14px; color: #0f172a;"></span>
                    </div>

                    <!-- Navigation Tabs Grouped into BẬT & TẮT -->
                    <div class="tbfa-tab-nav-wrapper" style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                        <!-- Group BẬT CHIẾN DỊCH -->
                        <div class="tbfa-tab-group" style="display: flex; gap: 4px; background: #eef2ff; padding: 4px; border-radius: 12px; border: 1px solid #c7d2fe;">
                            <button onclick="window._tbfaSwitchTab('enable_full')" id="tab-btn-enable_full" class="tbfa-tab-btn active-enable">
                                ⚡ 1. BẬT Full (Maximum)
                            </button>
                            <button onclick="window._tbfaSwitchTab('enable_daily')" id="tab-btn-enable_daily" class="tbfa-tab-btn inactive">
                                🔄 2. BẬT Trong Ngày
                            </button>
                            <button onclick="window._tbfaSwitchTab('enable_logs')" id="tab-btn-enable_logs" class="tbfa-tab-btn inactive">
                                📑 Lịch Sử Bật
                            </button>
                        </div>

                        <!-- Group TẮT CHIẾN DỊCH -->
                        <div class="tbfa-tab-group" style="display: flex; gap: 4px; background: #fef2f2; padding: 4px; border-radius: 12px; border: 1px solid #fca5a5;">
                            <button onclick="window._tbfaSwitchTab('disable_full')" id="tab-btn-disable_full" class="tbfa-tab-btn inactive">
                                ⛔ 3. TẮT Full (Mốc Giờ)
                            </button>
                            <button onclick="window._tbfaSwitchTab('disable_no_msg')" id="tab-btn-disable_no_msg" class="tbfa-tab-btn inactive">
                                🚫 4. TẮT Không Mess
                            </button>
                            <button onclick="window._tbfaSwitchTab('disable_daily')" id="tab-btn-disable_daily" class="tbfa-tab-btn inactive">
                                🔄 5. TẮT Trong Ngày
                            </button>
                            <button onclick="window._tbfaSwitchTab('disable_logs')" id="tab-btn-disable_logs" class="tbfa-tab-btn inactive">
                                📜 Lịch Sử Tắt
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Dynamic Tab Content -->
            <div id="tbfa-content"></div>
        </div>
    `;

    // ===== TAB SWITCHING =====
    window._tbfaSwitchTab = function(tabName) {
        _activeTab = tabName;

        const allTabs = ['enable_full', 'enable_daily', 'enable_logs', 'disable_full', 'disable_no_msg', 'disable_daily', 'disable_logs'];
        allTabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            if (btn) {
                if (t === tabName) {
                    const isEnable = t.startsWith('enable');
                    btn.className = `tbfa-tab-btn ${isEnable ? 'active-enable' : 'active-disable'}`;
                } else {
                    btn.className = 'tbfa-tab-btn inactive';
                }
            }
        });

        _renderContent();
    };

    window._tbfaSelectAccount = async function(accId) {
        _selectedAccountId = accId === 'all' ? 'all' : parseInt(accId);
        _renderAccountCards();
        _updateControlsHeader();
        await _loadConfigs();
        await _loadLogs();
        await _loadDisableConfigs();
        await _loadDisableLogs();
        _renderContent();
    };

    function _updateControlsHeader() {
        const nameEl = document.getElementById('tbfa-selected-account-name');
        if (_selectedAccountId === 'all') {
            if (nameEl) nameEl.textContent = `📋 Tất Cả Tài Khoản (${_accounts.length} TK)`;
        } else {
            const acc = _accounts.find(a => a.id === _selectedAccountId);
            if (nameEl && acc) {
                const rawId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
                nameEl.textContent = `📘 ${acc.account_name} (act_${rawId})`;
            }
        }
    }

    // ===== LOAD DATA =====
    async function _loadAccounts() {
        try {
            const res = await fetch('/api/tatbatfbads/accounts', { credentials: 'include' });
            const data = await res.json();
            _accounts = data.accounts || [];
            _selectedAccountId = 'all';
            await _loadConfigs();
            await _loadLogs();
            await _loadDisableConfigs();
            await _loadDisableLogs();
            _renderAccountCards();
            _updateControlsHeader();
            _renderContent();
        } catch (e) { console.error('[TBFA] Load accounts error:', e); }
    }

    async function _loadConfigs() {
        try {
            const res = await fetch(`/api/tatbatfbads/enable-configs?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _configs = data.configs || [];
        } catch (e) { console.error('[TBFA] Load configs error:', e); }
    }

    async function _loadLogs() {
        try {
            const res = await fetch(`/api/tatbatfbads/enable-logs?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _logs = data.logs || [];
        } catch (e) { console.error('[TBFA] Load logs error:', e); }
    }

    async function _loadDisableConfigs() {
        try {
            const res = await fetch(`/api/tatbatfbads/disable-configs?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _disableConfigs = data.configs || [];
        } catch (e) { console.error('[TBFA] Load disable configs error:', e); }
    }

    async function _loadDisableLogs() {
        try {
            const res = await fetch(`/api/tatbatfbads/disable-logs?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _disableLogs = data.logs || [];
        } catch (e) { console.error('[TBFA] Load disable logs error:', e); }
    }

    // ===== RENDER ACCOUNT CARDS =====
    function _renderAccountCards() {
        const grid = document.getElementById('tbfa-account-cards-grid');
        const badge = document.getElementById('tbfa-account-count-badge');
        if (!grid) return;
        if (badge) badge.textContent = `${_accounts.length} TK`;

        if (_accounts.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 24px; text-align: center; background: #f8fafc; border-radius: 14px; border: 1.5px dashed #cbd5e1; color: #64748b;">
                    <div style="font-size: 28px; margin-bottom: 6px;">📭</div>
                    <div style="font-size: 14px; font-weight: 700; color: #1e293b;">Chưa có tài khoản quảng cáo nào!</div>
                    <div style="font-size: 12px; margin-top: 4px;">Vui lòng thêm tài khoản ở trang <strong>"Cài Đặt Tài Khoản Ads"</strong>.</div>
                </div>
            `;
            return;
        }

        const isAllSelected = _selectedAccountId === 'all';
        let cardsHtml = `
            <div onclick="window._tbfaSelectAccount('all')" style="
                padding: 14px 16px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
                border: 2px solid ${isAllSelected ? '#4338ca' : '#e2e8f0'};
                background: ${isAllSelected ? '#eef2ff' : '#ffffff'};
                box-shadow: ${isAllSelected ? '0 4px 12px rgba(67,56,202,0.15)' : 'none'};
                display: flex; flex-direction: column; justify-content: space-between;
            " onmouseover="if(!${isAllSelected}) this.style.borderColor='#a5b4fc'" onmouseout="if(!${isAllSelected}) this.style.borderColor='#e2e8f0'">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 800; font-size: 14px; color: ${isAllSelected ? '#3730a3' : '#1e293b'};">📋 Tất Cả Tài Khoản</span>
                        ${isAllSelected ? '<span style="background: #4338ca; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">ĐANG XEM</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Tổng hợp <strong>${_accounts.length}</strong> tài khoản QC</div>
                </div>
                <div style="margin-top: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: ${isAllSelected ? '#4338ca' : '#94a3b8'};">
                        ${isAllSelected ? '✔ ĐANG XEM TỔNG HỢP' : 'Bấm để xem tất cả'}
                    </span>
                </div>
            </div>
        `;

        cardsHtml += _accounts.map(acc => {
            const isSelected = acc.id === _selectedAccountId;
            const rawId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
            const displayId = rawId ? `act_${rawId}` : 'chưa cài';
            const adsManagerUrl = rawId ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawId}` : '';
            const staffName = acc.staff_name || acc.assigned_name || 'Giám Đốc';

            const accConfigs = _configs.filter(c => c.account_id === acc.id);
            const accDisableConfigs = _disableConfigs.filter(c => c.account_id === acc.id);

            const fullCount = accConfigs.filter(c => c.is_active !== false && (c.config_type || 'full') === 'full').length;
            const dailyCount = accConfigs.filter(c => c.is_active !== false && c.config_type === 'daily').length;
            const disableFullCount = accDisableConfigs.filter(c => c.is_active !== false && (c.disable_type || 'full') === 'full').length;
            const disableNoMsgCount = accDisableConfigs.filter(c => c.is_active !== false && c.disable_type === 'no_message').length;
            const disableDailyCount = accDisableConfigs.filter(c => c.is_active !== false && c.disable_type === 'daily').length;

            const isPaused = acc.daily_enable_paused_until && new Date(acc.daily_enable_paused_until) > new Date();
            let pauseHtml = '';
            if (isPaused) {
                const pauseTarget = new Date(acc.daily_enable_paused_until);
                const timeStr = pauseTarget.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                const dateStr = pauseTarget.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                pauseHtml = `
                    <div style="margin-top: 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: #c2410c;">
                        <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 800;">
                            <span>⏸️ BẬT Ngày: TẠM DỪNG</span>
                            <button onclick="event.stopPropagation(); window._tbfaResumeDailyEnable(${acc.id})" style="background: #0284c7; color: white; border: none; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">▶️ Bật Ngay</button>
                        </div>
                        <div style="font-size: 10px; color: #9a3412; margin-top: 2px;">Tự khôi phục: <strong>${timeStr} (${dateStr})</strong></div>
                    </div>
                `;
            }

            return `
                <div onclick="window._tbfaSelectAccount('${acc.id}')" style="
                    padding: 14px 16px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
                    border: 2px solid ${isSelected ? '#4338ca' : '#e2e8f0'};
                    background: ${isSelected ? '#eef2ff' : '#ffffff'};
                    box-shadow: ${isSelected ? '0 4px 12px rgba(67,56,202,0.15)' : 'none'};
                    display: flex; flex-direction: column; justify-content: space-between;
                " onmouseover="if(!${isSelected}) this.style.borderColor='#a5b4fc'" onmouseout="if(!${isSelected}) this.style.borderColor='#e2e8f0'">
                    <div>
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                            <div style="font-weight: 800; font-size: 14px; color: ${isSelected ? '#3730a3' : '#0f172a'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📘 ${acc.account_name}</div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
                            <div style="font-family: monospace; font-size: 11px; color: #64748b;">${displayId}</div>
                            ${adsManagerUrl ? `
                            <a href="${adsManagerUrl}" target="_blank" onclick="event.stopPropagation();" style="
                                color: #0369a1; font-weight: 700; text-decoration: none; font-size: 11px;
                                background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 6px;
                                display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s;
                            " title="Mở trang Quản Lý Ads Manager Meta">
                                🔗 Mở Link Ads ↗
                            </a>
                            ` : ''}
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #334155; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b;">👤 NV Phụ Trách:</span>
                            <strong style="color: #1e1b4b; background: #e0e7ff; padding: 1px 8px; border-radius: 6px; font-size: 11px;">${staffName}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b;">Loại Tài Khoản:</span>
                            ${acc.account_type === 'test' ? `
                                <span style="background: #f3e8ff; color: #7e22ce; font-weight: 800; padding: 1px 7px; border-radius: 6px; font-size: 11px;">🧪 Chạy Test</span>
                            ` : `
                                <span style="background: #eff6ff; color: #1d4ed8; font-weight: 800; padding: 1px 7px; border-radius: 6px; font-size: 11px;">🚀 Chạy Chính</span>
                            `}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b;">Lĩnh Vực Ads:</span>
                            <strong style="color: #0f172a; font-weight: 800; font-size: 11px;">🏷️ ${(acc.linh_vuc_name || 'Chưa chọn').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                            <span style="color: #64748b; font-size: 11px;">⚡ Bật Active:</span>
                            <span style="font-size: 11px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 2px 6px; border-radius: 6px;">
                                Full: ${fullCount} | Ngày: ${dailyCount}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                            <span style="color: #64748b; font-size: 11px;">⛔ Tắt Active:</span>
                            <span style="font-size: 11px; font-weight: 700; color: #b91c1c; background: #fef2f2; padding: 2px 6px; border-radius: 6px;">
                                Full: ${disableFullCount} | Mess: ${disableNoMsgCount} | Ngày: ${disableDailyCount}
                            </span>
                        </div>
                    </div>
                    ${pauseHtml}
                    <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                        <span style="font-size: 11px; font-weight: 700; color: ${isSelected ? '#4338ca' : '#94a3b8'};">
                            ${isSelected ? '✔ ĐANG CẤU HÌNH' : 'Bấm để chọn'}
                        </span>
                        <button onclick="event.stopPropagation(); window._tbfaShowEmergencyDisableModal(${acc.id})" style="
                            background: linear-gradient(135deg, #991b1b, #be123c); color: white; border: none;
                            padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;
                            box-shadow: 0 2px 6px rgba(190,18,60,0.3); font-family: inherit; transition: all 0.2s;
                        " title="Tắt tất cả chiến dịch ngay lập tức + Hẹn giờ tạm dừng BẬT Trong Ngày">🚨 TẮT KHẨN CẤP</button>
                    </div>
                </div>
            `;
        }).join('');

        grid.innerHTML = cardsHtml;
    }

    // ===== RENDER CONTENT =====
    function _renderContent() {
        const el = document.getElementById('tbfa-content');
        if (!el) return;
        switch (_activeTab) {
            case 'enable_full': _renderEnableFullTab(el); break;
            case 'enable_daily': _renderEnableDailyTab(el); break;
            case 'enable_logs': _renderEnableLogsTab(el); break;
            case 'disable_full': _renderDisableFullTab(el); break;
            case 'disable_no_msg': _renderDisableNoMsgTab(el); break;
            case 'disable_daily': _renderDisableDailyTab(el); break;
            case 'disable_logs': _renderDisableLogsTab(el); break;
        }
    }

    // ===== TAB 1: BẬT FULL CHIẾN DỊCH (Maximum) =====
    function _renderEnableFullTab(el) {
        const isAll = _selectedAccountId === 'all';
        const filteredConfigs = (isAll ? _configs : _configs.filter(c => String(c.account_id) === String(_selectedAccountId)))
            .filter(c => (c.config_type || 'full') === 'full');

        let addBtnHtml = '';
        if (!isAll) {
            addBtnHtml = `
                <button onclick="window._tbfaShowConfigModal(null, ${_selectedAccountId}, 'full')" style="
                    font-family: inherit; padding: 12px 22px; border-radius: 12px; border: none;
                    background: linear-gradient(135deg, #4338ca, #6366f1);
                    color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.25);
                    box-shadow: 0 4px 15px rgba(67,56,202,0.35); transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                    <span>➕</span> Thêm Cấu Hình BẬT FULL
                </button>
            `;
        }

        if (filteredConfigs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">⚡ 1. BẬT Full Chiến Dịch (Tối Đa Thời Gian)</h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động bật chiến dịch đủ điều kiện dựa trên dữ liệu lịch sử toàn thời gian (date_preset = maximum) vào 1 mốc giờ cố định.</div>
                        </div>
                        ${addBtnHtml}
                    </div>
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">⚡</div>
                        <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có cấu hình BẬT FULL nào${isAll ? '' : ' cho tài khoản này'}</p>
                        <p style="font-size: 13px; color: #94a3b8;">Bấm "➕ Thêm Cấu Hình BẬT FULL" để tạo mốc hẹn giờ tự động bật toàn bộ chiến dịch hiệu quả.</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = filteredConfigs.map((cfg, i) => {
            const isActive = cfg.is_active !== false;
            const lastExec = _formatTbfaDateTime(cfg.last_executed_at);

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${cfg.config_name || 'Cấu hình BẬT Full'}</div>
                        ${isAll ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📘 ${cfg.account_name || ''}</div>` : ''}
                    </td>
                    <td style="padding: 14px 12px;">${_formatDaysBadges(cfg.days)}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: #312e81; color: white; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 13px; font-family: monospace;">${_formatTimeSlot(cfg.trigger_time)}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: right; font-weight: 700; color: #059669; font-size: 13px;">< ${_fmtMoneyFull(cfg.cpa_threshold)}</td>
                    <td style="padding: 14px 12px; text-align: right; font-size: 12px; color: #334155;">
                        ${_fmtMoney(cfg.spend_min)} → ${_fmtMoney(cfg.spend_max)} đ
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <button onclick="event.stopPropagation(); window._tbfaToggleConfig(${cfg.id}, ${!isActive})" style="
                            background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#15803d' : '#b91c1c'};
                            border: 1px solid ${isActive ? '#86efac' : '#fca5a5'}; padding: 4px 14px; border-radius: 20px;
                            font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                        ">${isActive ? '✅ Đang BẬT' : '⏸️ Đã TẮT'}</button>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 11px; color: #64748b;">${lastExec}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button onclick="window._tbfaShowConfigModal(${cfg.id}, ${cfg.account_id}, 'full')" title="Sửa" style="
                                background: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">✏️</button>
                            <button onclick="window._tbfaExecuteConfig(${cfg.id})" title="Chạy thử ngay" style="
                                background: #fef3c7; border: 1px solid #fde68a; color: #b45309; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">▶️</button>
                            <button onclick="window._tbfaDeleteConfig(${cfg.id})" title="Xóa" style="
                                background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">
                            ⚡ 1. BẬT Full Chiến Dịch (Tối Đa Thời Gian)
                            <span style="background: #eef2ff; color: #4338ca; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredConfigs.length} cấu hình</span>
                        </h3>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động bật chiến dịch PAUSED có CPA lịch sử (maximum) < Ngưỡng cài đặt.</div>
                    </div>
                    ${addBtnHtml}
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 3px solid #4338ca;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 40px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tên Cấu Hình</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Ngày Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Giờ Bật</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: right;">Ngưỡng CPA (Max)</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: right;">Chi Tiêu</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Trạng Thái</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Lần Chạy Cuối</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== TAB 2: BẬT CHIẾN DỊCH TRONG NGÀY =====
    function _renderEnableDailyTab(el) {
        const isAll = _selectedAccountId === 'all';
        const filteredConfigs = (isAll ? _configs : _configs.filter(c => String(c.account_id) === String(_selectedAccountId)))
            .filter(c => c.config_type === 'daily');

        let addBtnHtml = '';
        if (!isAll) {
            addBtnHtml = `
                <button onclick="window._tbfaShowConfigModal(null, ${_selectedAccountId}, 'daily')" style="
                    font-family: inherit; padding: 12px 22px; border-radius: 12px; border: none;
                    background: linear-gradient(135deg, #059669, #10b981);
                    color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.25);
                    box-shadow: 0 4px 15px rgba(16,185,129,0.35); transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                    <span>➕</span> Thêm Cấu Hình BẬT TRONG NGÀY
                </button>
            `;
        }

        if (filteredConfigs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">🔄 2. BẬT Chiến Dịch Trong Ngày (Theo Khung Giờ)</h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động quét liên tục mỗi X phút/lần trong khung giờ cài đặt (VD 8h-18h). Nếu CPA trong ngày < Ngưỡng thì BẬT lại chiến dịch.</div>
                        </div>
                        ${addBtnHtml}
                    </div>
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">🔄</div>
                        <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có cấu hình BẬT TRONG NGÀY nào${isAll ? '' : ' cho tài khoản này'}</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = filteredConfigs.map((cfg, i) => {
            const isActive = cfg.is_active !== false;
            const lastExec = _formatTbfaDateTime(cfg.last_executed_at);
            const intervalText = `${cfg.interval_minutes || 3} phút/lần`;
            const windowText = `${_formatTimeSlot(cfg.start_time || '08:00')} - ${_formatTimeSlot(cfg.end_time || '18:00')}`;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #047857;">${cfg.config_name || 'Cấu hình BẬT Ngày'}</div>
                        ${isAll ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📘 ${cfg.account_name || ''}</div>` : ''}
                    </td>
                    <td style="padding: 14px 12px;">${_formatDaysBadges(cfg.days)}</td>
                    <td style="padding: 14px 12px; text-align: center; white-space: nowrap;">
                        <span style="background: #064e3b; color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; font-family: monospace; display: inline-block;">${windowText}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; white-space: nowrap;">
                        <span style="background: #059669; color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; display: inline-block;">⚡ ${intervalText}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #059669; font-size: 13px; white-space: nowrap;">< ${_fmtMoneyFull(cfg.cpa_threshold)}</td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 12px; color: #334155; white-space: nowrap;">
                        ${_fmtMoney(cfg.spend_min)} → ${_fmtMoney(cfg.spend_max)} đ
                    </td>
                    <td style="padding: 14px 12px; text-align: center; white-space: nowrap;">
                        <button onclick="event.stopPropagation(); window._tbfaToggleConfig(${cfg.id}, ${!isActive})" style="
                            background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#15803d' : '#b91c1c'};
                            border: 1px solid ${isActive ? '#86efac' : '#fca5a5'}; padding: 4px 14px; border-radius: 20px;
                            font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;
                        ">${isActive ? '✅ Đang BẬT' : '⏸️ Đã TẮT'}</button>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 11px; color: #64748b; white-space: nowrap;">${lastExec}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button onclick="window._tbfaShowConfigModal(${cfg.id}, ${cfg.account_id}, 'daily')" title="Sửa" style="
                                background: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">✏️</button>
                            <button onclick="window._tbfaExecuteConfig(${cfg.id})" title="Chạy thử ngay" style="
                                background: #fef3c7; border: 1px solid #fde68a; color: #b45309; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">▶️</button>
                            <button onclick="window._tbfaDeleteConfig(${cfg.id})" title="Xóa" style="
                                background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">
                            🔄 2. BẬT Chiến Dịch Trong Ngày (Theo Khung Giờ)
                            <span style="background: #ecfdf5; color: #047857; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredConfigs.length} cấu hình</span>
                        </h3>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động quét liên tục mỗi X phút/lần trong khung giờ chỉ định. Bật các chiến dịch PAUSED có CPA trong ngày (today) < Ngưỡng.</div>
                    </div>
                    ${addBtnHtml}
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%); border-bottom: 3px solid #059669;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 40px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tên Cấu Hình</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Ngày Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Khung Giờ</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Chu Kỳ Quét</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">CPA Trong Ngày</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Chi Tiêu Ngày</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Trạng Thái</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Lần Chạy Cuối</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== TAB 3: LỊCH SỬ BẬT =====
    function _renderEnableLogsTab(el) {
        const filteredLogs = _selectedAccountId === 'all' ? _logs : _logs.filter(l => String(l.account_id) === String(_selectedAccountId));

        if (filteredLogs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 40px 24px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="font-size: 48px; margin-bottom: 12px;">📋</div>
                    <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có lịch sử BẬT chiến dịch nào</p>
                </div>
            `;
            return;
        }

        const rows = filteredLogs.map((log, i) => {
            const execTime = _formatTbfaDateTime(log.executed_at);
            const count = log.enabled_count || (log.details ? log.details.length : 1);
            const configName = log.config_name || (log.config_type === 'daily' ? 'Bật Trong Ngày' : 'Bật Full Chiến Dịch');
            const typeBadge = log.config_type === 'daily' ?
                '<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">🔄 BẬT TRONG NGÀY</span>' :
                '<span style="background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">⚡ BẬT FULL</span>';

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px; font-weight: 800; color: #0f172a; font-family: monospace; font-size: 13px;">${execTime}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #1e1b4b;">📘 ${log.account_name || 'Tài Khoản Ads'}</div>
                    </td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 4px;">${configName}</div>
                        ${typeBadge}
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 13px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                            🔥 ${count} chiến dịch
                        </span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">✅ Thành công</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <button onclick="window._tbfaShowBatchDetailModal('${log.batch_id}')" style="
                            background: linear-gradient(135deg, #3730a3, #4338ca); color: #ffffff;
                            border: 1px solid #312e81; padding: 7px 16px; border-radius: 10px;
                            font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s;
                            box-shadow: 0 2px 8px rgba(67,56,202,0.3); font-family: inherit;
                        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">👁️ Xem Chi Tiết</button>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">
                            📋 Lịch Sử BẬT Chiến Dịch (Tổng Hợp Theo Đợt Chạy)
                            <span style="background: #eef2ff; color: #4338ca; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredLogs.length} đợt chạy</span>
                        </h3>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 3px solid #4338ca;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 45px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Thời Gian Bật</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tài Khoản Ads</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Cấu Hình Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Tổng Chiến Dịch Bật</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Kết Quả</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== TAB 4: TẮT FULL CHIẾN DỊCH (Mốc Giờ) =====
    function _renderDisableFullTab(el) {
        const isAll = _selectedAccountId === 'all';
        const filteredConfigs = (isAll ? _disableConfigs : _disableConfigs.filter(c => String(c.account_id) === String(_selectedAccountId)))
            .filter(c => (c.disable_type || 'full') === 'full');

        let addBtnHtml = '';
        if (!isAll) {
            addBtnHtml = `
                <button onclick="window._tbfaShowDisableConfigModal(null, ${_selectedAccountId}, 'full')" style="
                    font-family: inherit; padding: 12px 22px; border-radius: 12px; border: none;
                    background: linear-gradient(135deg, #dc2626, #ef4444);
                    color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.25);
                    box-shadow: 0 4px 15px rgba(220,38,38,0.35); transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                    <span>➕</span> Thêm Cấu Hình TẮT FULL
                </button>
            `;
        }

        if (filteredConfigs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #991b1b;">⛔ 3. TẮT Full Chiến Dịch (Mốc Giờ Cố Định)</h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động chuyển tất cả chiến dịch đang ACTIVE về PAUSED vào đúng mốc giờ cài đặt (VD 23h30 hoặc 16h30).</div>
                        </div>
                        ${addBtnHtml}
                    </div>
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">⛔</div>
                        <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có cấu hình TẮT FULL nào${isAll ? '' : ' cho tài khoản này'}</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = filteredConfigs.map((cfg, i) => {
            const isActive = cfg.is_active !== false;
            const lastExec = _formatTbfaDateTime(cfg.last_executed_at);

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#fff1f2'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #991b1b;">${cfg.config_name || 'Cấu hình Tắt Full'}</div>
                        ${isAll ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📘 ${cfg.account_name || ''}</div>` : ''}
                    </td>
                    <td style="padding: 14px 12px;">${_formatDaysBadges(cfg.days)}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: #881337; color: white; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 13px; font-family: monospace;">${_formatTimeSlot(cfg.trigger_time)}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">⛔ TẮT TẤT CẢ ACTIVE</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <button onclick="event.stopPropagation(); window._tbfaToggleDisableConfig(${cfg.id}, ${!isActive})" style="
                            background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#15803d' : '#b91c1c'};
                            border: 1px solid ${isActive ? '#86efac' : '#fca5a5'}; padding: 4px 14px; border-radius: 20px;
                            font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                        ">${isActive ? '✅ Đang BẬT' : '⏸️ Đã TẮT'}</button>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 11px; color: #64748b;">${lastExec}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button onclick="window._tbfaShowDisableConfigModal(${cfg.id}, ${cfg.account_id}, 'full')" title="Sửa" style="
                                background: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">✏️</button>
                            <button onclick="window._tbfaExecuteDisableConfig(${cfg.id})" title="Chạy TẮT ngay" style="
                                background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">▶️</button>
                            <button onclick="window._tbfaDeleteDisableConfig(${cfg.id})" title="Xóa" style="
                                background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #991b1b;">
                            ⛔ 3. TẮT Full Chiến Dịch (Mốc Giờ Cố Định)
                            <span style="background: #fef2f2; color: #991b1b; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredConfigs.length} cấu hình</span>
                        </h3>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động chuyển toàn bộ chiến dịch đang ACTIVE về PAUSED vào đúng mốc giờ cài đặt (VD 23h30 hoặc 16h30).</div>
                    </div>
                    ${addBtnHtml}
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #450a0a 0%, #991b1b 100%); border-bottom: 3px solid #dc2626;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 40px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tên Cấu Hình</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Ngày Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Giờ Tắt</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Loại Tắt</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Trạng Thái</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Lần Chạy Cuối</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== TAB 5: TẮT KHÔNG RA TIN NHẮN =====
    function _renderDisableNoMsgTab(el) {
        const isAll = _selectedAccountId === 'all';
        const filteredConfigs = (isAll ? _disableConfigs : _disableConfigs.filter(c => String(c.account_id) === String(_selectedAccountId)))
            .filter(c => c.disable_type === 'no_message');

        let addBtnHtml = '';
        if (!isAll) {
            addBtnHtml = `
                <button onclick="window._tbfaShowDisableConfigModal(null, ${_selectedAccountId}, 'no_message')" style="
                    font-family: inherit; padding: 12px 22px; border-radius: 12px; border: none;
                    background: linear-gradient(135deg, #c2410c, #ea580c);
                    color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.25);
                    box-shadow: 0 4px 15px rgba(234,88,12,0.35); transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                    <span>➕</span> Thêm Cấu Hình TẮT KHÔNG MESS
                </button>
            `;
        }

        if (filteredConfigs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #c2410c;">🚫 4. TẮT Chiến Dịch Không Ra Tin Nhắn / CPA Cao</h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động TẮT chiến dịch tiêu tiền trong ngày (today) mà 0 ra tin nhắn hoặc CPA vượt ngưỡng cài đặt vào mốc giờ cố định (VD 18h00).</div>
                        </div>
                        ${addBtnHtml}
                    </div>
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">🚫</div>
                        <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có cấu hình TẮT KHÔNG MESS nào${isAll ? '' : ' cho tài khoản này'}</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = filteredConfigs.map((cfg, i) => {
            const isActive = cfg.is_active !== false;
            const lastExec = _formatTbfaDateTime(cfg.last_executed_at);

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#fff7ed'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #c2410c;">${cfg.config_name || 'Cấu hình Tắt Không Ra TN'}</div>
                        ${isAll ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📘 ${cfg.account_name || ''}</div>` : ''}
                    </td>
                    <td style="padding: 14px 12px;">${_formatDaysBadges(cfg.days)}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: #9a3412; color: white; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 13px; font-family: monospace;">${_formatTimeSlot(cfg.trigger_time)}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: right; font-weight: 700; color: #dc2626; font-size: 13px;">> ${_fmtMoneyFull(cfg.cpa_threshold)}</td>
                    <td style="padding: 14px 12px; text-align: right; font-size: 12px; color: #334155;">
                        ${_fmtMoney(cfg.spend_min)} → ${_fmtMoney(cfg.spend_max)} đ
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <button onclick="event.stopPropagation(); window._tbfaToggleDisableConfig(${cfg.id}, ${!isActive})" style="
                            background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#15803d' : '#b91c1c'};
                            border: 1px solid ${isActive ? '#86efac' : '#fca5a5'}; padding: 4px 14px; border-radius: 20px;
                            font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                        ">${isActive ? '✅ Đang BẬT' : '⏸️ Đã TẮT'}</button>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 11px; color: #64748b;">${lastExec}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button onclick="window._tbfaShowDisableConfigModal(${cfg.id}, ${cfg.account_id}, 'no_message')" title="Sửa" style="
                                background: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">✏️</button>
                            <button onclick="window._tbfaExecuteDisableConfig(${cfg.id})" title="Chạy TẮT ngay" style="
                                background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">▶️</button>
                            <button onclick="window._tbfaDeleteDisableConfig(${cfg.id})" title="Xóa" style="
                                background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #c2410c;">
                            🚫 4. TẮT Chiến Dịch Không Ra Tin Nhắn / CPA Cao
                            <span style="background: #fff7ed; color: #c2410c; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredConfigs.length} cấu hình</span>
                        </h3>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động TẮT các chiến dịch tiêu tiền trong ngày (today) mà 0 ra tin nhắn hoặc CPA vượt ngưỡng cài đặt.</div>
                    </div>
                    ${addBtnHtml}
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #7c2d12 0%, #c2410c 100%); border-bottom: 3px solid #ea580c;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 40px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tên Cấu Hình</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Ngày Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Giờ Tắt</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: right;">Ngưỡng CPA (Max)</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: right;">Chi Tiêu Max</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Trạng Thái</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Lần Chạy Cuối</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== TAB 5: TẮT TRONG NGÀY (Quét Theo Chu Kỳ Phút) =====
    function _renderDisableDailyTab(el) {
        const isAll = _selectedAccountId === 'all';
        const filteredConfigs = (isAll ? _disableConfigs : _disableConfigs.filter(c => String(c.account_id) === String(_selectedAccountId)))
            .filter(c => c.disable_type === 'daily');

        let addBtnHtml = '';
        if (!isAll) {
            addBtnHtml = `
                <button onclick="window._tbfaShowDisableConfigModal(null, ${_selectedAccountId}, 'daily')" style="
                    font-family: inherit; padding: 12px 22px; border-radius: 12px; border: none;
                    background: linear-gradient(135deg, #be123c, #e11d48);
                    color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.25);
                    box-shadow: 0 4px 15px rgba(225,29,72,0.35); transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                    <span>➕</span> Thêm Cấu Hình TẮT TRONG NGÀY
                </button>
            `;
        }

        if (filteredConfigs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #be123c;">🔄 5. TẮT Chiến Dịch Trong Ngày (Quét Theo Chu Kỳ Phút)</h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động quét liên tục mỗi X phút (2p, 3p, 5p...). Cứ có chiến dịch nào CPA cao hơn ngưỡng cài đặt sẽ tự động TẮT ngay.</div>
                        </div>
                        ${addBtnHtml}
                    </div>
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">🔄</div>
                        <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có cấu hình TẮT TRONG NGÀY nào${isAll ? '' : ' cho tài khoản này'}</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = filteredConfigs.map((cfg, i) => {
            const isActive = cfg.is_active !== false;
            const lastExec = _formatTbfaDateTime(cfg.last_executed_at);
            const intervalText = `${cfg.interval_minutes || 3} phút/lần`;
            const windowText = `${_formatTimeSlot(cfg.start_time || '00:00')} - ${_formatTimeSlot(cfg.end_time || '23:59')}`;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #be123c;">${cfg.config_name || 'Tắt Camp CPA Cao Trong Ngày'}</div>
                        ${isAll ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📘 ${cfg.account_name || ''}</div>` : ''}
                    </td>
                    <td style="padding: 14px 12px;">${_formatDaysBadges(cfg.days)}</td>
                    <td style="padding: 14px 12px; text-align: center; white-space: nowrap;">
                        <span style="background: #1e1b4b; color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; font-family: monospace; display: inline-block;">${windowText}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; white-space: nowrap;">
                        <span style="background: #be123c; color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; display: inline-block;">⚡ ${intervalText}</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #dc2626; font-size: 13px; white-space: nowrap;">> ${_fmtMoneyFull(cfg.cpa_threshold)}</td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 12px; color: #334155; white-space: nowrap;">
                        ${_fmtMoney(cfg.spend_min)} → ${_fmtMoney(cfg.spend_max)} đ
                    </td>
                    <td style="padding: 14px 12px; text-align: center; white-space: nowrap;">
                        <button onclick="event.stopPropagation(); window._tbfaToggleDisableConfig(${cfg.id}, ${!isActive})" style="
                            background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#15803d' : '#b91c1c'};
                            border: 1px solid ${isActive ? '#86efac' : '#fca5a5'}; padding: 4px 14px; border-radius: 20px;
                            font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;
                        ">${isActive ? '✅ Đang BẬT' : '⏸️ Đã TẮT'}</button>
                    </td>
                    <td style="padding: 14px 12px; text-align: center; font-size: 11px; color: #64748b; white-space: nowrap;">${lastExec}</td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button onclick="window._tbfaShowDisableConfigModal(${cfg.id}, ${cfg.account_id}, 'daily')" title="Sửa" style="
                                background: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">✏️</button>
                            <button onclick="window._tbfaExecuteDisableConfig(${cfg.id})" title="Chạy TẮT thủ công ngay" style="
                                background: #fef3c7; border: 1px solid #fde68a; color: #b45309; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">▶️</button>
                            <button onclick="window._tbfaDeleteDisableConfig(${cfg.id})" title="Xóa" style="
                                background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: 5px 10px;
                                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                            ">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #be123c;">
                            🔄 5. TẮT Chiến Dịch Trong Ngày (Quét Theo Chu Kỳ Phút)
                            <span style="background: #fff1f2; color: #be123c; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredConfigs.length} cấu hình</span>
                        </h3>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tự động quét liên tục mỗi X phút (2p, 3p, 5p...). Cứ có chiến dịch nào CPA cao hơn ngưỡng cài đặt sẽ tự động TẮT ngay.</div>
                    </div>
                    ${addBtnHtml}
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 3px solid #be123c;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 40px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tên Cấu Hình</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Ngày Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Khung Giờ Quét</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Chu Kỳ Quét</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Ngưỡng CPA Tắt</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Chi Tiêu (Min → Max)</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Trạng Thái</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Lần Chạy Cuối</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== TAB 6: LỊCH SỬ TẮT =====
    function _renderDisableLogsTab(el) {
        const filteredLogs = _selectedAccountId === 'all' ? _disableLogs : _disableLogs.filter(l => String(l.account_id) === String(_selectedAccountId));

        if (filteredLogs.length === 0) {
            el.innerHTML = `
                <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 40px 24px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="font-size: 48px; margin-bottom: 12px;">📜</div>
                    <p style="font-size: 15px; font-weight: 600; color: #64748b;">Chưa có lịch sử TẮT chiến dịch nào</p>
                </div>
            `;
            return;
        }

        const rows = filteredLogs.map((log, i) => {
            const execTime = _formatTbfaDateTime(log.created_at);
            const count = log.disabled_count || 0;
            const configName = log.config_name || (log.disable_type === 'no_message' ? 'Tắt Camp Không Tin Nhắn' : (log.disable_type === 'daily' ? 'Tắt Chiến Dịch Trong Ngày' : 'Tắt Full Chiến Dịch'));
            let typeBadge = '';
            if (log.disable_type === 'no_message') {
                typeBadge = '<span style="background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">🚫 TẮT KHÔNG RA TN</span>';
            } else if (log.disable_type === 'daily') {
                typeBadge = '<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">🔄 TẮT TRONG NGÀY</span>';
            } else {
                typeBadge = '<span style="background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">⛔ TẮT FULL</span>';
            }

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 12px; color: #64748b; font-weight: 600; text-align: center;">${i + 1}</td>
                    <td style="padding: 14px 12px; font-weight: 800; color: #0f172a; font-family: monospace; font-size: 13px;">${execTime}</td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 800; font-size: 13px; color: #881337;">📘 ${log.account_name || 'Tài Khoản Ads'}</div>
                    </td>
                    <td style="padding: 14px 12px;">
                        <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 4px;">${configName}</div>
                        ${typeBadge}
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 13px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
                            ⛔ ${count} chiến dịch
                        </span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <span style="background: #fef2f2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">✅ Đã Tắt</span>
                    </td>
                    <td style="padding: 14px 12px; text-align: center;">
                        <button onclick="window._tbfaShowDisableBatchDetailModal('${log.batch_id}')" style="
                            background: linear-gradient(135deg, #9f1239, #be123c); color: #ffffff;
                            border: 1px solid #881337; padding: 7px 16px; border-radius: 10px;
                            font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s;
                            box-shadow: 0 2px 8px rgba(190,18,60,0.3); font-family: inherit;
                        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">👁️ Xem Chi Tiết</button>
                    </td>
                </tr>
            `;
        }).join('');

        el.innerHTML = `
            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #991b1b;">
                            📜 Lịch Sử TẮT Chiến Dịch (Tổng Hợp Theo Đợt Chạy)
                            <span style="background: #fef2f2; color: #991b1b; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 800; margin-left: 6px;">${filteredLogs.length} đợt chạy</span>
                        </h3>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #450a0a 0%, #991b1b 100%); border-bottom: 3px solid #dc2626;">
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 45px;">STT</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Thời Gian Tắt</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Tài Khoản Ads</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: left;">Cấu Hình Áp Dụng</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Tổng Chiến Dịch Tắt</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center;">Kết Quả</th>
                                <th style="padding: 14px 12px; font-weight: 800; color: #ffffff; font-size: 12px; text-transform: uppercase; text-align: center; width: 130px;">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== MODAL CHI TIẾT ĐỢT BẬT =====
    window._tbfaShowBatchDetailModal = function(batchId) {
        const batch = _logs.find(l => String(l.batch_id) === String(batchId));
        if (!batch) return;

        const execTime = batch.executed_at ? new Date(batch.executed_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
        const detailRows = details.map((d, i) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px; text-align: center; color: #64748b; font-size: 12px;">${i + 1}</td>
            <td style="padding: 10px;">
                <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${(d.campaign_name || 'Chiến dịch').replace(/</g, '&lt;')}</div>
                <div style="font-family: monospace; font-size: 11px; color: #94a3b8;">${d.campaign_id || ''}</div>
            </td>
            <td style="padding: 10px; text-align: right; font-weight: 700; color: #059669; font-size: 12px; white-space: nowrap;">${_fmtCPAValue(d.cpa_value, d.total_actions)}</td>
            <td style="padding: 10px; text-align: right; color: #334155; font-size: 12px; white-space: nowrap;">${d.spend_value ? _fmtMoneyFull(d.spend_value) : '—'}</td>
            <td style="padding: 10px; text-align: center; font-weight: 800; color: #4338ca; font-size: 12px; white-space: nowrap;">${d.total_actions || 0}</td>
            <td style="padding: 10px; font-size: 11px; color: #64748b;">${(d.reason || '—').replace(/</g, '&lt;')}</td>
        </tr>
    `).join('');

        const modalHtml = `
            <div id="tbfa-batch-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15,23,42,0.65); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 20px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 900px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0;
                    overflow: hidden; max-height: 90vh; display: flex; flex-direction: column;
                ">
                    <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 18px 24px; color: white; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800;">🔥 Chi Tiết Đợt BẬT Chiến Dịch (${details.length} chiến dịch)</h3>
                            <div style="font-size: 12px; color: #c7d2fe; margin-top: 2px;">🕒 Thời gian: ${execTime} | 📘 ${batch.account_name || ''}</div>
                        </div>
                        <button onclick="document.getElementById('tbfa-batch-modal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>

                    <div style="padding: 20px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #0f172a; border-bottom: 3px solid #1e293b;">
                                    <th style="padding: 12px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">STT</th>
                                    <th style="padding: 12px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">Tên Chiến Dịch</th>
                                    <th style="padding: 12px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; white-space: nowrap;">CPA</th>
                                    <th style="padding: 12px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; white-space: nowrap;">Chi Tiêu</th>
                                    <th style="padding: 12px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; white-space: nowrap;">Tin Nhắn</th>
                                    <th style="padding: 12px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">Ghi Chú</th>
                                </tr>
                            </thead>
                            <tbody>${detailRows}</tbody>
                        </table>
                    </div>

                    <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                        <button onclick="document.getElementById('tbfa-batch-modal').remove()" style="
                            padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1;
                            background: white; color: #334155; font-weight: 700; cursor: pointer;
                        ">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    // ===== MODAL CHI TIẾT ĐỢT TẮT =====
    window._tbfaShowDisableBatchDetailModal = function(batchId) {
        const batch = _disableLogs.find(l => String(l.batch_id) === String(batchId));
        if (!batch) return;

        const execTime = batch.created_at ? new Date(batch.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
        const details = typeof batch.campaign_details === 'string' ? JSON.parse(batch.campaign_details) : (batch.campaign_details || []);

        const detailRows = details.map((d, i) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px; text-align: center; color: #64748b; font-size: 12px;">${i + 1}</td>
                <td style="padding: 10px;">
                    <div style="font-weight: 700; font-size: 13px; color: #991b1b;">${(d.campaign_name || 'Chiến dịch').replace(/</g, '&lt;')}</div>
                    <div style="font-family: monospace; font-size: 11px; color: #94a3b8;">${d.campaign_id || ''}</div>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 700; color: #dc2626; font-size: 12px; white-space: nowrap;">${_fmtCPAValue(d.cpa_value, d.total_actions)}</td>
                <td style="padding: 10px; text-align: right; color: #334155; font-size: 12px; white-space: nowrap;">${d.spend_value ? _fmtMoneyFull(d.spend_value) : '—'}</td>
                <td style="padding: 10px; text-align: center; font-weight: 800; color: #b91c1c; font-size: 12px; white-space: nowrap;">${d.total_actions || 0}</td>
                <td style="padding: 10px; font-size: 11px; color: #64748b;">${(d.reason || '—').replace(/</g, '&lt;')}</td>
            </tr>
        `).join('');

        const modalHtml = `
            <div id="tbfa-disable-batch-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15,23,42,0.65); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 20px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 900px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0;
                    overflow: hidden; max-height: 90vh; display: flex; flex-direction: column;
                ">
                    <div style="background: linear-gradient(135deg, #450a0a, #991b1b); padding: 18px 24px; color: white; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800;">⛔ Chi Tiết Đợt TẮT Chiến Dịch (${details.length} chiến dịch)</h3>
                            <div style="font-size: 12px; color: #fca5a5; margin-top: 2px;">🕒 Thời gian: ${execTime} | 📘 ${batch.account_name || ''}</div>
                        </div>
                        <button onclick="document.getElementById('tbfa-disable-batch-modal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>

                    <div style="padding: 20px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #0f172a; border-bottom: 3px solid #1e293b;">
                                    <th style="padding: 12px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">STT</th>
                                    <th style="padding: 12px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">Tên Chiến Dịch</th>
                                    <th style="padding: 12px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; white-space: nowrap;">CPA</th>
                                    <th style="padding: 12px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; white-space: nowrap;">Chi Tiêu</th>
                                    <th style="padding: 12px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; white-space: nowrap;">Tin Nhắn</th>
                                    <th style="padding: 12px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">Ghi Chú</th>
                                </tr>
                            </thead>
                            <tbody>${detailRows}</tbody>
                        </table>
                    </div>

                    <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                        <button onclick="document.getElementById('tbfa-disable-batch-modal').remove()" style="
                            padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1;
                            background: white; color: #334155; font-weight: 700; cursor: pointer;
                        ">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    // ===== HELPER PARSE MONEY INPUT =====
    function _parseVNDInput(str) {
        if (typeof str === 'number') return Math.round(str);
        if (!str) return 0;
        let s = String(str).trim();
        if (!s) return 0;

        // PostgreSQL DECIMAL format e.g. "89000.00" or "60000000.00"
        if (/^\d+\.\d{1,2}$/.test(s)) {
            return Math.round(parseFloat(s)) || 0;
        }

        // Formatted VND string e.g. "89.000" or "60.000.000"
        const clean = s.replace(/\./g, '').replace(/,/g, '').replace(/[^\d]/g, '');
        return parseInt(clean, 10) || 0;
    }

    window._tbfaFormatVNDInput = function(el) {
        const val = _parseVNDInput(el.value);
        if (val === 0 && el.value.trim() === '') return;
        el.value = _fmtMoney(val);
    };

    // ===== MODAL THÊM / SỬA CẤU HÌNH BẬT =====
    window._tbfaShowConfigModal = function(configId, accountId, defaultType) {
        const acc = _accounts.find(a => a.id === accountId);
        const accName = acc ? acc.account_name : 'Tài Khoản Ads';
        const existing = configId ? _configs.find(c => c.id === configId) : null;
        const cfgType = existing ? (existing.config_type || 'full') : (defaultType || 'full');

        const old = document.getElementById('tbfa-config-modal');
        if (old) old.remove();

        const vals = existing ? { ...existing } : {
            config_name: cfgType === 'daily' ? 'Bật Trong Ngày T2-T6 (<75k)' : 'Bật Full T2-T7 (<89k)',
            config_type: cfgType,
            days: '1,2,3,4,5,6',
            trigger_time: '03:00',
            start_time: '08:00',
            end_time: '18:00',
            interval_minutes: 3,
            date_preset: cfgType === 'daily' ? 'today' : 'maximum',
            cpa_threshold: cfgType === 'daily' ? 75000 : 89000,
            spend_min: 1,
            spend_max: cfgType === 'daily' ? 2000000 : 60000000,
            action_type: 'onsite_conversion.messaging_conversation_started_7d',
            is_active: true
        };

        const daysArr = (vals.days || '').split(',').map(d => d.trim());
        const triggerTime = _formatTimeSlot(vals.trigger_time) || '03:00';
        const startTime = _formatTimeSlot(vals.start_time) || '08:00';
        const endTime = _formatTimeSlot(vals.end_time) || '18:00';

        const dayCheckboxes = ['1','2','3','4','5','6','0'].map(d => {
            const checked = daysArr.includes(d) ? 'checked' : '';
            const label = DAY_FULL_LABELS[d];
            return `<label class="tbfa-day-label"><input type="checkbox" class="tbfa-day-cb" name="tbfa_day" value="${d}" ${checked} /> ${label}</label>`;
        }).join('');

        const modalHtml = `
            <div id="tbfa-config-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15,23,42,0.65); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 20px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 640px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0;
                    overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;
                ">
                    <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 20px 24px; color: white; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">
                                ${existing ? '✏️ Sửa Cấu Hình BẬT' : '➕ Thêm Cấu Hình BẬT Mới'}
                            </h3>
                            <div style="font-size: 13px; color: #c7d2fe; margin-top: 4px;">📘 ${accName}</div>
                        </div>
                        <button onclick="document.getElementById('tbfa-config-modal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>

                    <div style="padding: 24px; overflow-y: auto;">
                        <div style="margin-bottom: 18px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px;">
                            <label style="font-weight: 800; font-size: 13px; color: #0f172a; display: block; margin-bottom: 8px;">📌 Chọn Loại Cấu Hình BẬT:</label>
                            <div style="display: flex; gap: 12px;">
                                <label style="flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; border: 2px solid ${vals.config_type === 'full' ? '#4338ca' : '#cbd5e1'}; background: ${vals.config_type === 'full' ? '#eef2ff' : 'white'}; cursor: pointer;">
                                    <input type="radio" name="tbfa_cfg_type" value="full" ${vals.config_type === 'full' ? 'checked' : ''} onchange="window._tbfaSwitchModalType('full')" />
                                    <div>
                                        <div style="font-weight: 800; font-size: 13px; color: #3730a3;">⚡ 1. BẬT Full Chiến Dịch</div>
                                        <div style="font-size: 11px; color: #64748b;">CPA lịch sử (maximum) • Hẹn 1 mốc giờ</div>
                                    </div>
                                </label>
                                <label style="flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; border: 2px solid ${vals.config_type === 'daily' ? '#059669' : '#cbd5e1'}; background: ${vals.config_type === 'daily' ? '#ecfdf5' : 'white'}; cursor: pointer;">
                                    <input type="radio" name="tbfa_cfg_type" value="daily" ${vals.config_type === 'daily' ? 'checked' : ''} onchange="window._tbfaSwitchModalType('daily')" />
                                    <div>
                                        <div style="font-weight: 800; font-size: 13px; color: #047857;">🔄 2. BẬT Trong Ngày</div>
                                        <div style="font-size: 11px; color: #64748b;">CPA trong ngày (today) • Quét X phút/lần</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">📝 Tên Cấu Hình</label>
                            <input type="text" id="tbfa-cfg-name" value="${(vals.config_name || '').replace(/"/g, '&quot;')}" placeholder="VD: Bật Trong Ngày (8h-18h) CPA<75k" style="
                                width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                font-size: 14px; font-weight: 600; color: #0f172a; outline: none; box-sizing: border-box;
                            " />
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">📅 Ngày Áp Dụng</label>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                                ${dayCheckboxes}
                            </div>
                        </div>

                        <div id="tbfa-modal-time-full" style="display: ${vals.config_type === 'full' ? 'block' : 'none'}; margin-bottom: 16px;">
                            <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">🕐 Giờ Bật (VN - UTC+7)</label>
                            <input type="time" id="tbfa-cfg-time" value="${triggerTime}" style="
                                width: 50%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                            " />
                        </div>

                        <div id="tbfa-modal-time-daily" style="display: ${vals.config_type === 'daily' ? 'block' : 'none'}; margin-bottom: 16px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="font-weight: 700; font-size: 12px; color: #334155; display: block; margin-bottom: 6px;">🟢 Từ Giờ (VN)</label>
                                    <input type="time" id="tbfa-cfg-start" value="${startTime}" style="
                                        width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                        font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                    " />
                                </div>
                                <div>
                                    <label style="font-weight: 700; font-size: 12px; color: #334155; display: block; margin-bottom: 6px;">🔴 Đến Giờ (VN)</label>
                                    <input type="time" id="tbfa-cfg-end" value="${endTime}" style="
                                        width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                        font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                    " />
                                </div>
                                <div>
                                    <label style="font-weight: 700; font-size: 12px; color: #334155; display: block; margin-bottom: 6px;">⏱️ Chu Kỳ Quét</label>
                                    <select id="tbfa-cfg-interval" style="
                                        width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                        font-size: 13px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box; background: white;
                                    ">
                                        <option value="1" ${vals.interval_minutes == 1 ? 'selected' : ''}>1 phút / lần</option>
                                        <option value="2" ${vals.interval_minutes == 2 ? 'selected' : ''}>2 phút / lần</option>
                                        <option value="3" ${vals.interval_minutes == 3 ? 'selected' : ''}>3 phút / lần</option>
                                        <option value="4" ${vals.interval_minutes == 4 ? 'selected' : ''}>4 phút / lần</option>
                                        <option value="5" ${vals.interval_minutes == 5 ? 'selected' : ''}>5 phút / lần</option>
                                        <option value="10" ${vals.interval_minutes == 10 ? 'selected' : ''}>10 phút / lần</option>
                                        <option value="15" ${vals.interval_minutes == 15 ? 'selected' : ''}>15 phút / lần</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">💰 Ngưỡng CPA (đ)</label>
                                <input type="text" id="tbfa-cfg-cpa" value="${_fmtMoney(_parseVNDInput(vals.cpa_threshold))}" oninput="window._tbfaFormatVNDInput(this)" placeholder="89.000" style="
                                    width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                " />
                            </div>
                            <div>
                                <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">📈 Chi Tiêu Max (đ)</label>
                                <input type="text" id="tbfa-cfg-spend-max" value="${_fmtMoney(_parseVNDInput(vals.spend_max))}" oninput="window._tbfaFormatVNDInput(this)" placeholder="60.000.000" style="
                                    width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                " />
                            </div>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                        <button onclick="document.getElementById('tbfa-config-modal').remove()" style="
                            padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1;
                            background: white; color: #475569; font-weight: 700; cursor: pointer;
                        ">Hủy</button>
                        <button onclick="window._tbfaSaveConfig(${existing ? existing.id : 'null'}, ${accountId})" style="
                            padding: 10px 24px; border-radius: 10px; border: none;
                            background: linear-gradient(135deg, #4338ca, #6366f1);
                            color: white; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(67,56,202,0.3);
                        ">💾 Lưu Cấu Hình BẬT</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window._tbfaSwitchModalType = function(type) {
        const fullDiv = document.getElementById('tbfa-modal-time-full');
        const dailyDiv = document.getElementById('tbfa-modal-time-daily');
        if (fullDiv) fullDiv.style.display = type === 'full' ? 'block' : 'none';
        if (dailyDiv) dailyDiv.style.display = type === 'daily' ? 'block' : 'none';
    };

    window._tbfaSaveConfig = async function(configId, accountId) {
        const typeEl = document.querySelector('input[name="tbfa_cfg_type"]:checked');
        const cfgType = typeEl ? typeEl.value : 'full';
        const nameVal = (document.getElementById('tbfa-cfg-name').value || '').trim();

        const selectedDays = Array.from(document.querySelectorAll('input[name="tbfa_day"]:checked')).map(cb => cb.value);
        if (selectedDays.length === 0) {
            alert('Vui lòng chọn ít nhất 1 ngày áp dụng!');
            return;
        }

        const triggerTime = document.getElementById('tbfa-cfg-time').value || '03:00';
        const startTime = document.getElementById('tbfa-cfg-start').value || '08:00';
        const endTime = document.getElementById('tbfa-cfg-end').value || '18:00';
        const intervalMins = parseInt(document.getElementById('tbfa-cfg-interval').value) || 3;

        const cpaVal = _parseVNDInput(document.getElementById('tbfa-cfg-cpa').value);
        const spendMaxVal = _parseVNDInput(document.getElementById('tbfa-cfg-spend-max').value);

        const bodyData = {
            id: configId,
            account_id: accountId,
            config_name: nameVal || (cfgType === 'daily' ? 'Bật Trong Ngày' : 'Bật Full Chiến Dịch'),
            config_type: cfgType,
            days: selectedDays.join(','),
            trigger_time: triggerTime,
            start_time: startTime,
            end_time: endTime,
            interval_minutes: intervalMins,
            date_preset: cfgType === 'daily' ? 'today' : 'maximum',
            cpa_threshold: cpaVal,
            spend_min: 1,
            spend_max: spendMaxVal,
            is_active: true
        };

        try {
            const res = await fetch('/api/tatbatfbads/enable-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();
            if (data.success) {
                _showToast(data.message || 'Đã lưu cấu hình BẬT', 'success');
                const modal = document.getElementById('tbfa-config-modal');
                if (modal) modal.remove();
                await _loadConfigs();
                _renderAccountCards();
                _renderContent();
            } else {
                alert(data.error || 'Lỗi lưu cấu hình');
            }
        } catch (e) {
            console.error('[TBFA Save Config Error]', e);
            alert('Lỗi kết nối máy chủ');
        }
    };

    // ===== MODAL THÊM / SỬA CẤU HÌNH TẮT =====
    window._tbfaShowDisableConfigModal = function(configId, accountId, defaultDisableType) {
        const acc = _accounts.find(a => a.id === accountId);
        const accName = acc ? acc.account_name : 'Tài Khoản Ads';
        const existing = configId ? _disableConfigs.find(c => c.id === configId) : null;
        const dType = existing ? (existing.disable_type || 'full') : (defaultDisableType || 'full');

        const old = document.getElementById('tbfa-disable-config-modal');
        if (old) old.remove();

        const vals = existing ? { ...existing } : {
            config_name: dType === 'daily' ? 'Tắt Camp CPA > 75k (Quét 3p/lần)' : (dType === 'no_message' ? 'Tắt Camp Không Mess (18h00)' : 'Tắt Full Chiến Dịch (23h30)'),
            disable_type: dType,
            days: '1,2,3,4,5,6,0',
            trigger_time: dType === 'no_message' ? '18:00' : '23:30',
            start_time: '00:00',
            end_time: '23:59',
            interval_minutes: 3,
            cpa_threshold: 75000,
            spend_min: dType === 'daily' ? 65000 : 1,
            spend_max: 2000000,
            is_active: true
        };

        const daysArr = (vals.days || '').split(',').map(d => d.trim());
        const triggerTime = _formatTimeSlot(vals.trigger_time) || '23:30';
        const startTime = _formatTimeSlot(vals.start_time) || '00:00';
        const endTime = _formatTimeSlot(vals.end_time) || '23:59';
        const intervalMin = parseInt(vals.interval_minutes) || 3;

        const dayCheckboxes = ['1','2','3','4','5','6','0'].map(d => {
            const checked = daysArr.includes(d) ? 'checked' : '';
            const label = DAY_FULL_LABELS[d];
            return `<label class="tbfa-day-label"><input type="checkbox" class="tbfa-day-cb" name="tbfa_disable_day" value="${d}" ${checked} /> ${label}</label>`;
        }).join('');

        const modalHtml = `
            <div id="tbfa-disable-config-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15,23,42,0.65); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 20px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 680px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0;
                    overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;
                ">
                    <div style="background: linear-gradient(135deg, #450a0a, #991b1b); padding: 20px 24px; color: white; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">
                                ${existing ? '✏️ Sửa Cấu Hình TẮT' : '⛔ Thêm Cấu Hình TẮT Mới'}
                            </h3>
                            <div style="font-size: 13px; color: #fca5a5; margin-top: 4px;">📘 ${accName}</div>
                        </div>
                        <button onclick="document.getElementById('tbfa-disable-config-modal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>

                    <div style="padding: 24px; overflow-y: auto;">
                        <div style="margin-bottom: 18px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 12px; padding: 14px;">
                            <label style="font-weight: 800; font-size: 13px; color: #9a3412; display: block; margin-bottom: 8px;">📌 Chọn Loại Cấu Hình TẮT:</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                <label style="display: flex; align-items: flex-start; gap: 6px; padding: 10px; border-radius: 10px; border: 2px solid ${vals.disable_type === 'full' ? '#dc2626' : '#cbd5e1'}; background: ${vals.disable_type === 'full' ? '#fef2f2' : 'white'}; cursor: pointer;">
                                    <input type="radio" name="tbfa_disable_cfg_type" value="full" ${vals.disable_type === 'full' ? 'checked' : ''} onchange="window._tbfaSwitchDisableModalType('full')" style="margin-top: 3px;" />
                                    <div>
                                        <div style="font-weight: 800; font-size: 12px; color: #991b1b;">⛔ 3. TẮT Full</div>
                                        <div style="font-size: 10px; color: #64748b; line-height: 1.3;">Tắt HẾT camp Active vào 1 mốc giờ</div>
                                    </div>
                                </label>
                                <label style="display: flex; align-items: flex-start; gap: 6px; padding: 10px; border-radius: 10px; border: 2px solid ${vals.disable_type === 'no_message' ? '#ea580c' : '#cbd5e1'}; background: ${vals.disable_type === 'no_message' ? '#fff7ed' : 'white'}; cursor: pointer;">
                                    <input type="radio" name="tbfa_disable_cfg_type" value="no_message" ${vals.disable_type === 'no_message' ? 'checked' : ''} onchange="window._tbfaSwitchDisableModalType('no_message')" style="margin-top: 3px;" />
                                    <div>
                                        <div style="font-weight: 800; font-size: 12px; color: #c2410c;">🚫 4. TẮT Không Mess</div>
                                        <div style="font-size: 10px; color: #64748b; line-height: 1.3;">0 mess / CPA cao vào 1 mốc giờ</div>
                                    </div>
                                </label>
                                <label style="display: flex; align-items: flex-start; gap: 6px; padding: 10px; border-radius: 10px; border: 2px solid ${vals.disable_type === 'daily' ? '#be123c' : '#cbd5e1'}; background: ${vals.disable_type === 'daily' ? '#fff1f2' : 'white'}; cursor: pointer;">
                                    <input type="radio" name="tbfa_disable_cfg_type" value="daily" ${vals.disable_type === 'daily' ? 'checked' : ''} onchange="window._tbfaSwitchDisableModalType('daily')" style="margin-top: 3px;" />
                                    <div>
                                        <div style="font-weight: 800; font-size: 12px; color: #be123c;">🔄 5. TẮT Trong Ngày</div>
                                        <div style="font-size: 10px; color: #64748b; line-height: 1.3;">Quét liên tục theo chu kỳ phút (2p, 3p...)</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">📝 Tên Cấu Hình</label>
                            <input type="text" id="tbfa-disable-cfg-name" value="${(vals.config_name || '').replace(/"/g, '&quot;')}" placeholder="VD: Tắt Camp CPA > 75k (Quét 3p/lần)" style="
                                width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                font-size: 14px; font-weight: 600; color: #0f172a; outline: none; box-sizing: border-box;
                            " />
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">📅 Nhóm Ngày Áp Dụng</label>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                                ${dayCheckboxes}
                            </div>
                        </div>

                        <!-- Cài đặt giờ tắt cố định (cho Full & Không Mess) -->
                        <div id="tbfa-disable-fixed-time-container" style="display: ${vals.disable_type !== 'daily' ? 'block' : 'none'}; margin-bottom: 16px;">
                            <label style="font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px;">🕐 Giờ Tắt Cố Định (VN - UTC+7)</label>
                            <input type="time" id="tbfa-disable-cfg-time" value="${triggerTime}" style="
                                width: 50%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                            " />
                        </div>

                        <!-- Cài đặt khung giờ & chu kỳ phút (cho TẮT Trong Ngày) -->
                        <div id="tbfa-disable-daily-settings-container" style="display: ${vals.disable_type === 'daily' ? 'block' : 'none'}; margin-bottom: 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="font-weight: 700; font-size: 12px; color: #881337; display: block; margin-bottom: 6px;">🟢 Từ Giờ (VN)</label>
                                    <input type="time" id="tbfa-disable-cfg-start" value="${startTime}" style="
                                        width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #fca5a5;
                                        font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box; background: white;
                                    " />
                                </div>
                                <div>
                                    <label style="font-weight: 700; font-size: 12px; color: #881337; display: block; margin-bottom: 6px;">🔴 Đến Giờ (VN)</label>
                                    <input type="time" id="tbfa-disable-cfg-end" value="${endTime}" style="
                                        width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #fca5a5;
                                        font-size: 14px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box; background: white;
                                    " />
                                </div>
                                <div>
                                    <label style="font-weight: 700; font-size: 12px; color: #881337; display: block; margin-bottom: 6px;">⏱️ Chu Kỳ Quét</label>
                                    <select id="tbfa-disable-cfg-interval" style="
                                        width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #fca5a5;
                                        font-size: 13px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box; background: white;
                                    ">
                                        <option value="1" ${intervalMin === 1 ? 'selected' : ''}>1 phút / lần</option>
                                        <option value="2" ${intervalMin === 2 ? 'selected' : ''}>2 phút / lần</option>
                                        <option value="3" ${intervalMin === 3 ? 'selected' : ''}>3 phút / lần</option>
                                        <option value="4" ${intervalMin === 4 ? 'selected' : ''}>4 phút / lần</option>
                                        <option value="5" ${intervalMin === 5 ? 'selected' : ''}>5 phút / lần</option>
                                        <option value="10" ${intervalMin === 10 ? 'selected' : ''}>10 phút / lần</option>
                                        <option value="15" ${intervalMin === 15 ? 'selected' : ''}>15 phút / lần</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Cài đặt Ngưỡng CPA & Chi Tiêu -->
                        <div id="tbfa-disable-modal-thresholds" style="display: ${vals.disable_type !== 'full' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label style="font-weight: 700; font-size: 12px; color: #334155; display: block; margin-bottom: 6px;">💰 Ngưỡng CPA Tắt (đ)</label>
                                <input type="text" id="tbfa-disable-cfg-cpa" value="${_fmtMoney(_parseVNDInput(vals.cpa_threshold))}" oninput="window._tbfaFormatVNDInput(this)" placeholder="75.000" style="
                                    width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                " />
                            </div>
                            <div>
                                <label style="font-weight: 700; font-size: 12px; color: #334155; display: block; margin-bottom: 6px;">📉 Chi Tiêu Min (đ)</label>
                                <input type="text" id="tbfa-disable-cfg-spend-min" value="${_fmtMoney(_parseVNDInput(vals.spend_min))}" oninput="window._tbfaFormatVNDInput(this)" placeholder="65.000" style="
                                    width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                " />
                            </div>
                            <div>
                                <label style="font-weight: 700; font-size: 12px; color: #334155; display: block; margin-bottom: 6px;">📈 Chi Tiêu Max (đ)</label>
                                <input type="text" id="tbfa-disable-cfg-spend-max" value="${_fmtMoney(_parseVNDInput(vals.spend_max))}" oninput="window._tbfaFormatVNDInput(this)" placeholder="2.000.000" style="
                                    width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; color: #0f172a; outline: none; box-sizing: border-box;
                                " />
                            </div>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                        <button onclick="document.getElementById('tbfa-disable-config-modal').remove()" style="
                            padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1;
                            background: white; color: #475569; font-weight: 700; cursor: pointer;
                        ">Hủy</button>
                        <button onclick="window._tbfaSaveDisableConfig(${existing ? existing.id : 'null'}, ${accountId})" style="
                            padding: 10px 24px; border-radius: 10px; border: none;
                            background: linear-gradient(135deg, #dc2626, #ef4444);
                            color: white; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(220,38,38,0.3);
                        ">💾 Lưu Cấu Hình TẮT</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window._tbfaSwitchDisableModalType = function(type) {
        const fixedTimeContainer = document.getElementById('tbfa-disable-fixed-time-container');
        const dailySettingsContainer = document.getElementById('tbfa-disable-daily-settings-container');
        const threshDiv = document.getElementById('tbfa-disable-modal-thresholds');

        if (fixedTimeContainer) fixedTimeContainer.style.display = type !== 'daily' ? 'block' : 'none';
        if (dailySettingsContainer) dailySettingsContainer.style.display = type === 'daily' ? 'block' : 'none';
        if (threshDiv) threshDiv.style.display = type !== 'full' ? 'grid' : 'none';
    };

    window._tbfaSaveDisableConfig = async function(configId, accountId) {
        const typeEl = document.querySelector('input[name="tbfa_disable_cfg_type"]:checked');
        const dType = typeEl ? typeEl.value : 'full';
        const nameVal = (document.getElementById('tbfa-disable-cfg-name').value || '').trim();

        const selectedDays = Array.from(document.querySelectorAll('input[name="tbfa_disable_day"]:checked')).map(cb => cb.value);
        if (selectedDays.length === 0) {
            alert('Vui lòng chọn ít nhất 1 ngày áp dụng!');
            return;
        }

        const triggerTime = document.getElementById('tbfa-disable-cfg-time')?.value || '23:30';
        const startTime = document.getElementById('tbfa-disable-cfg-start')?.value || '00:00';
        const endTime = document.getElementById('tbfa-disable-cfg-end')?.value || '23:59';
        const intervalMin = parseInt(document.getElementById('tbfa-disable-cfg-interval')?.value) || 3;

        const cpaVal = _parseVNDInput(document.getElementById('tbfa-disable-cfg-cpa')?.value || 75000);
        const spendMinVal = _parseVNDInput(document.getElementById('tbfa-disable-cfg-spend-min')?.value || 65000);
        const spendMaxVal = _parseVNDInput(document.getElementById('tbfa-disable-cfg-spend-max')?.value || 2000000);

        const bodyData = {
            id: configId,
            account_id: accountId,
            config_name: nameVal || (dType === 'daily' ? 'Tắt Camp CPA > 75k (Quét 3p/lần)' : (dType === 'no_message' ? 'Tắt Camp Không Mess' : 'Tắt Full Chiến Dịch')),
            disable_type: dType,
            days: selectedDays.join(','),
            trigger_time: triggerTime,
            start_time: startTime,
            end_time: endTime,
            interval_minutes: intervalMin,
            cpa_threshold: cpaVal,
            spend_min: spendMinVal,
            spend_max: spendMaxVal,
            is_active: true
        };

        try {
            const res = await fetch('/api/tatbatfbads/disable-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();
            if (data.success) {
                _showToast(data.message || 'Đã lưu cấu hình TẮT', 'success');
                const modal = document.getElementById('tbfa-disable-config-modal');
                if (modal) modal.remove();
                await _loadDisableConfigs();
                _renderAccountCards();
                _renderContent();
            } else {
                alert(data.error || 'Lỗi lưu cấu hình TẮT');
            }
        } catch (e) {
            console.error('[TBFA Save Disable Config Error]', e);
            alert('Lỗi kết nối máy chủ');
        }
    };

    // ===== ACTIONS FOR BẬT =====
    window._tbfaToggleConfig = async function(id, isActive) {
        try {
            const res = await fetch(`/api/tatbatfbads/enable-configs/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: isActive })
            });
            const data = await res.json();
            if (data.success) {
                _showToast(data.message, 'info');
                await _loadConfigs();
                _renderAccountCards();
                _renderContent();
            } else { alert(data.error); }
        } catch (e) { alert('Lỗi hệ thống'); }
    };

    window._tbfaDeleteConfig = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa cấu hình BẬT này?')) return;
        try {
            const res = await fetch(`/api/tatbatfbads/enable-configs/${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                _showToast('Đã xóa cấu hình BẬT', 'success');
                await _loadConfigs();
                _renderAccountCards();
                _renderContent();
            } else { alert(data.error); }
        } catch (e) { alert('Lỗi hệ thống'); }
    };

    window._tbfaExecuteConfig = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn CHẠY BẬT NGAY BÂY GIỜ cho cấu hình này?')) return;
        _showToast('⏳ Đang thực thi BẬT chiến dịch...', 'info');
        try {
            const res = await fetch('/api/tatbatfbads/execute-enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ config_id: id })
            });
            const data = await res.json();
            if (data.success) {
                _showToast(`✅ Đã BẬT ${data.enabled} chiến dịch!`, 'success');
                await _loadConfigs();
                await _loadLogs();
                _renderContent();
            } else { alert(data.error || 'Thực thi thất bại'); }
        } catch (e) { alert('Lỗi hệ thống khi kích hoạt BẬT'); }
    };

    // ===== ACTIONS FOR TẮT =====
    window._tbfaToggleDisableConfig = async function(id, isActive) {
        try {
            const res = await fetch(`/api/tatbatfbads/disable-configs/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: isActive })
            });
            const data = await res.json();
            if (data.success) {
                _showToast(data.message, 'info');
                await _loadDisableConfigs();
                _renderAccountCards();
                _renderContent();
            } else { alert(data.error); }
        } catch (e) { alert('Lỗi hệ thống'); }
    };

    window._tbfaDeleteDisableConfig = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa cấu hình TẮT này?')) return;
        try {
            const res = await fetch(`/api/tatbatfbads/disable-configs/${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                _showToast('Đã xóa cấu hình TẮT', 'success');
                await _loadDisableConfigs();
                _renderAccountCards();
                _renderContent();
            } else { alert(data.error); }
        } catch (e) { alert('Lỗi hệ thống'); }
    };

    window._tbfaExecuteDisableConfig = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn CHẠY TẮT NGAY BÂY GIỜ cho cấu hình này?')) return;
        _showToast('⏳ Đang thực thi TẮT chiến dịch...', 'info');
        try {
            const res = await fetch('/api/tatbatfbads/execute-disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ config_id: id })
            });
            const data = await res.json();
            if (data.success) {
                _showToast(`⛔ Đã TẮT ${data.disabled} chiến dịch!`, 'success');
                await _loadDisableConfigs();
                await _loadDisableLogs();
                _renderContent();
            } else { alert(data.error || 'Thực thi thất bại'); }
        } catch (e) { alert('Lỗi hệ thống khi kích hoạt TẮT'); }
    };

    // ===== ACTIONS FOR TẮT KHẨN CẤP & HẸN GIỜ TẠM DỪNG =====
    window._tbfaShowEmergencyDisableModal = function(accId) {
        const acc = _accounts.find(a => a.id === parseInt(accId));
        if (!acc) return;

        const old = document.getElementById('tbfa-emergency-modal');
        if (old) old.remove();

        const modalHtml = `
            <div id="tbfa-emergency-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15,23,42,0.75); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 16px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 520px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); border: 1px solid #e2e8f0;
                    overflow: hidden; display: flex; flex-direction: column; animation: slideIn 0.25s ease-out;
                ">
                    <div style="background: linear-gradient(135deg, #881337, #be123c); padding: 18px 24px; color: white; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; display: flex; align-items: center; gap: 8px;">🚨 Tắt Khẩn Cấp & Hẹn Giờ Bật Lại</h3>
                            <div style="font-size: 12px; color: #fecdd3; margin-top: 3px;">Tài khoản: <strong>${acc.account_name}</strong></div>
                        </div>
                        <button onclick="document.getElementById('tbfa-emergency-modal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px;">✕</button>
                    </div>

                    <div style="padding: 24px; font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 16px;">
                        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 12px 16px; color: #991b1b; line-height: 1.5;">
                            <strong>⚠️ Hành động này sẽ thực hiện ngay:</strong>
                            <ul style="margin: 6px 0 0 18px; padding: 0; font-size: 12px;">
                                <li>TẮT (PAUSED) toàn bộ chiến dịch đang ACTIVE của tài khoản trên Facebook Ads.</li>
                                <li>TẠM DỪNG tính năng <strong>🔄 2. BẬT Trong Ngày</strong> để máy quét không tự bật lại camp.</li>
                                <li>TỰ ĐỘNG KHÔI PHỤC tính năng BẬT Trong Ngày sau khoảng thời gian bạn hẹn dưới đây.</li>
                            </ul>
                        </div>

                        <div>
                            <label style="font-weight: 800; color: #0f172a; display: block; margin-bottom: 8px;">
                                🕒 Hẹn giờ tạm dừng BẬT Trong Ngày (Tự động bật lại sau):
                            </label>
                            <select id="tbfa-emergency-hours" style="
                                width: 100%; padding: 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                font-size: 14px; font-weight: 700; color: #0f172a; background: #f8fafc; outline: none;
                            ">
                                <option value="1">⏱️ 1 Tiếng nữa (Tự bật lại sau 1 giờ)</option>
                                <option value="2">⏱️ 2 Tiếng nữa</option>
                                <option value="3">⏱️ 3 Tiếng nữa</option>
                                <option value="4" selected>⏱️ 4 Tiếng nữa (Khuyên dùng)</option>
                                <option value="5">⏱️ 5 Tiếng nữa</option>
                                <option value="6">⏱️ 6 Tiếng nữa</option>
                                <option value="8">⏱️ 8 Tiếng nữa</option>
                                <option value="12">⏱️ 12 Tiếng nữa</option>
                                <option value="until_07am">🌙 Đến 07:00 Sáng Mai (Tự bật lại 07h00 sáng)</option>
                            </select>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                        <button onclick="document.getElementById('tbfa-emergency-modal').remove()" style="
                            padding: 10px 18px; border-radius: 10px; border: 1px solid #cbd5e1;
                            background: white; color: #475569; font-weight: 700; cursor: pointer;
                        ">Hủy Bỏ</button>
                        <button id="tbfa-btn-confirm-emergency" onclick="window._tbfaConfirmEmergencyDisable(${acc.id})" style="
                            padding: 10px 22px; border-radius: 10px; border: none;
                            background: linear-gradient(135deg, #991b1b, #be123c); color: white;
                            font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(190,18,60,0.35);
                        ">🚨 XÁC NHẬN TẮT KHẨN CẤP</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window._tbfaConfirmEmergencyDisable = async function(accId) {
        const hoursSelect = document.getElementById('tbfa-emergency-hours');
        if (!hoursSelect) return;
        const val = hoursSelect.value;
        const mode = val === 'until_07am' ? 'until_07am' : 'hours';
        const hours = val === 'until_07am' ? 0 : parseFloat(val);

        const btn = document.getElementById('tbfa-btn-confirm-emergency');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Đang tắt khẩn cấp...';
        }

        try {
            const res = await fetch('/api/tatbatfbads/emergency-disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ account_id: accId, hours, mode })
            });
            const data = await res.json();
            if (data.success) {
                _showToast(data.message || 'Đã TẮT KHẨN CẤP thành công!', 'success');
                const modal = document.getElementById('tbfa-emergency-modal');
                if (modal) modal.remove();
                await _loadAccounts();
                _renderAccountCards();
            } else {
                alert(data.error || 'Lỗi khi tắt khẩn cấp');
                if (btn) { btn.disabled = false; btn.textContent = '🚨 XÁC NHẬN TẮT KHẨN CẤP'; }
            }
        } catch(e) {
            console.error(e);
            alert('Lỗi hệ thống kết nối');
            if (btn) { btn.disabled = false; btn.textContent = '🚨 XÁC NHẬN TẮT KHẨN CẤP'; }
        }
    };

    window._tbfaResumeDailyEnable = async function(accId) {
        try {
            const res = await fetch('/api/tatbatfbads/resume-daily-enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ account_id: accId })
            });
            const data = await res.json();
            if (data.success) {
                _showToast(data.message || 'Đã KHÔI PHỤC tính năng BẬT Trong Ngày!', 'success');
                await _loadAccounts();
                _renderAccountCards();
            } else { alert(data.error || 'Lỗi khôi phục'); }
        } catch(e) { alert('Lỗi hệ thống'); }
    };

    // ===== INIT =====
    _loadAccounts();
};
