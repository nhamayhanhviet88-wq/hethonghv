/**
 * Nút Nổi & Popup Kiểm Tra Trạng Thái Kết Nối Tài Khoản Ads
 * Component dùng chung cho toàn bộ hệ thống HV
 */
(function() {
    if (window.HVAdsConnWidgetInitialized) return;
    window.HVAdsConnWidgetInitialized = true;

    var state = {
        isOpen: false,
        viewMode: 'platforms', // 'platforms' | 'accounts'
        selectedPlatform: null,
        accounts: [],
        loading: false
    };

    var PLATFORM_CONFIG = {
        facebook: { name: 'Facebook Ads', icon: '📘', color: '#1877f2' },
        tiktok: { name: 'TikTok Ads', icon: '🎵', color: '#000000' },
        google: { name: 'Google Ads', icon: '🌐', color: '#ea4335' }
    };

    async function initAdsConnWidget() {
        injectStyles();
        createFloatingWidget();
        await fetchAccounts();
        // Periodically refresh accounts connection status every 60 seconds
        setInterval(fetchAccounts, 60000);
    }

    function injectStyles() {
        if (document.getElementById('hvAdsConnStyles')) return;
        var style = document.createElement('style');
        style.id = 'hvAdsConnStyles';
        style.textContent = `
            /* Floating Ads Connection Widget Button */
            .hv-ads-conn-float-btn {
                position: fixed;
                bottom: 80px;
                right: 24px;
                z-index: 99989;
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 40%, #0d9488 75%, #059669 100%);
                color: #ffffff;
                border: none;
                border-radius: 30px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.55);
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s, box-shadow 0.2s;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                letter-spacing: 0.2px;
            }
            .hv-ads-conn-float-btn:hover {
                transform: translateY(-3px) scale(1.03);
                box-shadow: 0 15px 30px -5px rgba(2, 132, 199, 0.65);
            }
            .hv-ads-conn-pulse {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .hv-ads-conn-pulse.green {
                background: #22c55e;
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.8);
                animation: hvAdsPulseGreen 1.6s infinite;
            }
            .hv-ads-conn-pulse.red {
                background: #ef4444;
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8);
                animation: hvAdsPulseRed 1.6s infinite;
            }
            @keyframes hvAdsPulseGreen {
                0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.8); }
                70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
                100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
            }
            @keyframes hvAdsPulseRed {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }

            /* Floating Window Modal */
            .hv-ads-conn-window {
                position: fixed;
                bottom: 135px;
                right: 24px;
                z-index: 99992;
                width: 380px;
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 160px);
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.35);
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: hvAdsConnSlideUp 0.25s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            @keyframes hvAdsConnSlideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.96); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .hv-ads-conn-header {
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0d9488 100%);
                color: #ffffff;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .hv-ads-conn-hdr-btn {
                background: rgba(255,255,255,0.15);
                color: #fff;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: background 0.2s;
            }
            .hv-ads-conn-hdr-btn:hover { background: rgba(255,255,255,0.3); }

            .hv-ads-conn-body {
                padding: 18px;
                overflow-y: auto;
                background: #f8fafc;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .hv-ads-platform-card {
                background: #ffffff;
                border-radius: 14px;
                border: 1.5px solid #e2e8f0;
                padding: 14px 16px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            }
            .hv-ads-platform-card:hover {
                border-color: #3b82f6;
                transform: translateY(-2px);
                box-shadow: 0 6px 15px rgba(59, 130, 246, 0.12);
            }

            .hv-ads-account-card {
                background: #ffffff;
                border-radius: 14px;
                border: 1.5px solid #e2e8f0;
                padding: 14px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            }

            @media (max-width: 768px) {
                .hv-ads-conn-float-btn {
                    bottom: 116px;
                    right: 14px;
                    padding: 10px 16px;
                    font-size: 12.5px;
                    box-shadow: 0 8px 20px rgba(2, 132, 199, 0.45);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                }
                .hv-ads-conn-float-btn.hv-mobile-hidden {
                    transform: translateX(calc(100% + 20px));
                    opacity: 0;
                    pointer-events: none;
                }
                .hv-ads-conn-window {
                    bottom: 168px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                    max-width: calc(100vw - 20px);
                    max-height: calc(100vh - 180px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    async function fetchAccounts() {
        state.loading = true;
        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ads-accounts', {
                headers: { 'Authorization': token ? ('Bearer ' + token) : '' },
                credentials: 'include'
            });
            if (res.ok) {
                var data = await res.json();
                state.accounts = data.accounts || [];
            }
        } catch (e) {
            console.error('[AdsConnWidget] fetch error:', e);
        } finally {
            state.loading = false;
            updateWidgetUI();
            if (state.isOpen) renderWindowContent();
        }
    }

    function getGroupedPlatforms() {
        var groups = {};

        state.accounts.forEach(function(acc) {
            var pKey = (acc.platform || 'facebook').toLowerCase();
            if (!groups[pKey]) {
                var cfg = PLATFORM_CONFIG[pKey] || {
                    name: (acc.custom_platform_name || acc.platform || 'Khác'),
                    icon: '📊',
                    color: '#6366f1'
                };
                groups[pKey] = {
                    key: pKey,
                    name: cfg.name,
                    icon: cfg.icon,
                    color: cfg.color,
                    accounts: [],
                    hasError: false
                };
            }
            groups[pKey].accounts.push(acc);
            var st = acc.connection_status || 'unconfigured';
            if (st !== 'connected') {
                groups[pKey].hasError = true;
            }
        });

        // Convert to array
        var platformList = Object.keys(groups).map(function(k) { return groups[k]; });

        // Filter out platforms that have ZERO accounts created (Requirement Rule 1)
        return platformList.filter(function(p) {
            return p.accounts && p.accounts.length > 0;
        });
    }

    function isGiamDocUser() {
        var u = window._currentUser || window.currentUser;
        if (!u) {
            try {
                u = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
            } catch(e){}
        }
        if (!u || (!u.role && !u.id)) return false;
        var r = (u.role || '').toLowerCase();
        return r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!u.is_admin;
    }

    function checkOverallHasError(platforms) {
        if (!platforms || platforms.length === 0) return false;
        return platforms.some(function(p) { return p.hasError; });
    }

    function updateWidgetUI() {
        var btn = document.getElementById('hvAdsConnFloatBtn');
        if (!isGiamDocUser()) {
            if (btn) btn.style.display = 'none';
            var win = document.getElementById('hvAdsConnWindow');
            if (win) win.remove();
            return;
        }

        if (!btn) {
            createFloatingWidget();
            btn = document.getElementById('hvAdsConnFloatBtn');
        }
        if (!btn) return;

        btn.style.display = 'flex';
        var platforms = getGroupedPlatforms();
        var hasError = checkOverallHasError(platforms);

        btn.innerHTML = `
            <div class="hv-ads-conn-pulse ${hasError ? 'red' : 'green'}"></div>
            <span>Kết Nối TK Ads</span>
        `;
    }

    function createFloatingWidget() {
        if (document.getElementById('hvAdsConnFloatBtn')) return;
        if (!isGiamDocUser()) return;

        var btn = document.createElement('button');
        btn.className = 'hv-ads-conn-float-btn';
        btn.id = 'hvAdsConnFloatBtn';
        btn.title = 'Bấm để xem danh sách & kiểm tra trạng thái kết nối tài khoản quảng cáo';
        btn.innerHTML = `
            <div class="hv-ads-conn-pulse green"></div>
            <span>Kết Nối TK Ads</span>
        `;
        btn.onclick = toggleWindow;
        document.body.appendChild(btn);
    }

    function toggleWindow() {
        var win = document.getElementById('hvAdsConnWindow');
        if (win) {
            win.remove();
            state.isOpen = false;
        } else {
            state.viewMode = 'platforms';
            state.selectedPlatform = null;
            renderWindow();
            state.isOpen = true;
            fetchAccounts();
        }
    }

    function renderWindow() {
        var win = document.createElement('div');
        win.className = 'hv-ads-conn-window';
        win.id = 'hvAdsConnWindow';

        renderWindowContent(win);

        document.body.appendChild(win);
    }

    function renderWindowContent(winEl) {
        var win = winEl || document.getElementById('hvAdsConnWindow');
        if (!win) return;

        var platforms = getGroupedPlatforms();

        // Header
        var headerHtml = '';
        if (state.viewMode === 'accounts' && state.selectedPlatform) {
            var selectedGroup = platforms.find(function(p) { return p.key === state.selectedPlatform; });
            var pName = selectedGroup ? selectedGroup.name : 'Chi Tiết Mạng Xã Hội';
            var pIcon = selectedGroup ? selectedGroup.icon : '📡';
            headerHtml = `
                <div class="hv-ads-conn-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="hvAdsBackBtn" class="hv-ads-conn-hdr-btn" title="Quay lại danh sách Mạng Xã Hội">←</button>
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: white; display: flex; align-items: center; gap: 6px;">
                            ${pIcon} ${pName}
                        </h3>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button id="hvAdsRefreshBtn" class="hv-ads-conn-hdr-btn" title="Làm mới">🔄</button>
                        <button id="hvAdsCloseBtn" class="hv-ads-conn-hdr-btn" title="Đóng">✕</button>
                    </div>
                </div>
            `;
        } else {
            headerHtml = `
                <div class="hv-ads-conn-header">
                    <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: white; display: flex; align-items: center; gap: 6px;">
                        🔌 Kết Nối TK Ads
                    </h3>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button id="hvAdsRefreshBtn" class="hv-ads-conn-hdr-btn" title="Làm mới">🔄</button>
                        <button id="hvAdsCloseBtn" class="hv-ads-conn-hdr-btn" title="Đóng">✕</button>
                    </div>
                </div>
            `;
        }

        // Body
        var bodyHtml = '';

        if (state.loading && (!state.accounts || state.accounts.length === 0)) {
            bodyHtml = `
                <div style="text-align: center; padding: 40px 20px; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 8px;">⏳</div>
                    <div style="font-size: 13px; font-weight: 600;">Đang kiểm tra kết nối API...</div>
                </div>
            `;
        } else if (state.viewMode === 'platforms') {
            if (platforms.length === 0) {
                bodyHtml = `
                    <div style="text-align: center; padding: 30px 16px; background: white; border-radius: 14px; border: 1.5px dashed #cbd5e1; color: #64748b;">
                        <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">Chưa có tài khoản ads nào!</div>
                        <div style="font-size: 12px; margin-top: 4px;">Vui lòng thêm tài khoản quảng cáo tại trang <strong>Cài Đặt Tài Khoản Ads</strong>.</div>
                        <a href="/caidattaikhoanads" target="_blank" style="
                            display: inline-block; margin-top: 12px; padding: 8px 16px; border-radius: 10px;
                            background: #2563eb; color: white; text-decoration: none; font-size: 12px; font-weight: 800;
                        ">⚙️ Đi Đến Cài Đặt ↗</a>
                    </div>
                `;
            } else {
                bodyHtml = `
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 2px;">
                        Mạng xã hội đã kết nối tài khoản QC:
                    </div>
                ` + platforms.map(function(p) {
                    var statusBadge = p.hasError
                        ? `<span style="background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                            🔴 Có TK Mất Kết Nối
                           </span>`
                        : `<span style="background: #dcfce7; color: #059669; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                            🟢 Kết Nối Tốt
                           </span>`;

                    return `
                        <div class="hv-ads-platform-card" data-platform="${p.key}">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 24px;">${p.icon}</span>
                                <div>
                                    <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${p.name}</div>
                                    <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
                                        <strong>${p.accounts.length}</strong> tài khoản quảng cáo
                                    </div>
                                </div>
                            </div>
                            <div>${statusBadge}</div>
                        </div>
                    `;
                }).join('');
            }
        } else if (state.viewMode === 'accounts' && state.selectedPlatform) {
            var platformGroup = platforms.find(function(p) { return p.key === state.selectedPlatform; });
            var accountsList = platformGroup ? platformGroup.accounts : [];

            if (accountsList.length === 0) {
                bodyHtml = `
                    <div style="text-align: center; padding: 30px; color: #64748b;">
                        Chưa có tài khoản nào thuộc Mạng Xã Hội này.
                    </div>
                `;
            } else {
                bodyHtml = `
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 2px;">
                        Danh sách tài khoản quảng cáo:
                    </div>
                ` + accountsList.map(function(acc) {
                    var st = acc.connection_status || 'unconfigured';
                    var isConnected = st === 'connected';
                    var statusBadge = isConnected
                        ? `<span style="background: #dcfce7; color: #059669; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                            🟢 Kết Nối Tốt
                           </span>`
                        : `<span style="background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                            🔴 MẤT KẾT NỐI
                           </span>`;

                    var rawAccId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
                    var displayId = rawAccId ? ('act_' + rawAccId) : 'chưa cài ID';

                    return `
                        <div class="hv-ads-account-card" style="border-left: 4px solid ${isConnected ? '#22c55e' : '#ef4444'};">
                            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                                <div>
                                    <div style="font-size: 14px; font-weight: 800; color: #0f172a;">📘 ${acc.account_name}</div>
                                    <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">${displayId}</div>
                                </div>
                                <div>${statusBadge}</div>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; padding-top: 8px; border-top: 1px dashed #f1f5f9;">
                                <div style="font-size: 11px; color: #64748b;">
                                    NV Phụ Trách: <strong>${acc.assigned_staff_name || 'Chưa phân công'}</strong>
                                </div>
                                <a href="/caidattaikhoanads" target="_blank" style="
                                    font-size: 11px; font-weight: 800; color: #2563eb; text-decoration: none;
                                    background: #eff6ff; padding: 4px 8px; border-radius: 6px; border: 1px solid #bfdbfe;
                                ">⚙️ Khôi Phục ↗</a>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        win.innerHTML = headerHtml + '<div class="hv-ads-conn-body">' + bodyHtml + '</div>';

        // Bind events
        var closeBtn = win.querySelector('#hvAdsCloseBtn');
        if (closeBtn) closeBtn.onclick = toggleWindow;

        var refreshBtn = win.querySelector('#hvAdsRefreshBtn');
        if (refreshBtn) refreshBtn.onclick = function() { fetchAccounts(); };

        var backBtn = win.querySelector('#hvAdsBackBtn');
        if (backBtn) {
            backBtn.onclick = function() {
                state.viewMode = 'platforms';
                state.selectedPlatform = null;
                renderWindowContent();
            };
        }

        // Platform Card Click Event
        win.querySelectorAll('.hv-ads-platform-card').forEach(function(card) {
            card.onclick = function() {
                var pKey = this.dataset.platform;
                state.viewMode = 'accounts';
                state.selectedPlatform = pKey;
                renderWindowContent();
            };
        });
    }

    // Smart Auto Slide-Hide on Scroll for Mobile
    var lastScrollY = window.scrollY || 0;
    var scrollHideTimer = null;

    window.addEventListener('scroll', function() {
        if (window.innerWidth > 768) return;
        var curY = window.scrollY || 0;
        var aiBtn = document.getElementById('hvAiFloatBtn');
        var adsBtn = document.getElementById('hvAdsConnFloatBtn');

        if (curY > 40 && curY > lastScrollY) {
            // Scrolling down -> Slide out right to clear view
            if (aiBtn) aiBtn.classList.add('hv-mobile-hidden');
            if (adsBtn) adsBtn.classList.add('hv-mobile-hidden');
        } else if (curY < lastScrollY) {
            // Scrolling up -> Slide back in
            if (aiBtn) aiBtn.classList.remove('hv-mobile-hidden');
            if (adsBtn) adsBtn.classList.remove('hv-mobile-hidden');
        }
        lastScrollY = curY;

        clearTimeout(scrollHideTimer);
        scrollHideTimer = setTimeout(function() {
            if (aiBtn) aiBtn.classList.remove('hv-mobile-hidden');
            if (adsBtn) adsBtn.classList.remove('hv-mobile-hidden');
        }, 1200);
    }, { passive: true });

    // Expose init function globally
    window.initAdsConnWidget = initAdsConnWidget;

    // Auto-init on DOMContentLoaded or immediate if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdsConnWidget);
    } else {
        initAdsConnWidget();
    }
})();
