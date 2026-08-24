// ========== GIỚI HẠN CHI TIÊU FACEBOOK ADS — FRONTEND ==========

window.renderGioihanchitieuPage = function(container) {
    // State
    let _accounts = [];
    let _selectedAccountId = 'all'; // Default to 'all' to show all accounts on load
    let _configs = []; // { day_type, time_slot, spend_limit, is_active }
    let _initialConfigsMap = new Map();
    let _logs = [];
    let _isGD = false;
    let _settings = {};
    let _activeTab = 'config'; // 'config', 'logs', 'settings'

    // Check role
    try {
        const u = window.__currentUser || window._currentUser;
        if (u) {
            const r = (u.role || '').toLowerCase();
            _isGD = r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!u.is_admin;
        }
    } catch(e) {}

    // Format VND
    function _fmtMoney(val) {
        const n = parseFloat(val) || 0;
        return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';
    }

    // ========== RENDER MAIN LAYOUT ==========
    container.innerHTML = `
        <div id="ghct-root" style="padding: 24px; max-width: 1400px; margin: 0 auto;">
            <!-- Header -->
            <div id="ghct-header" style="
                background: linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%);
                border-radius: 20px;
                padding: 32px;
                color: white;
                margin-bottom: 24px;
                box-shadow: 0 20px 40px -12px rgba(2, 132, 199, 0.4);
                position: relative;
                overflow: hidden;
            ">
                <div style="position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -40px; left: -40px; width: 150px; height: 150px; background: rgba(255,255,255,0.03); border-radius: 50%;"></div>
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; position: relative; z-index: 1;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="
                                background: rgba(255,255,255,0.15);
                                backdrop-filter: blur(10px);
                                padding: 6px 14px;
                                border-radius: 20px;
                                font-size: 11px;
                                font-weight: 600;
                                letter-spacing: 1px;
                                text-transform: uppercase;
                            ">Facebook Ads</span>
                        </div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                            💰 Giới Hạn Chi Tiêu
                        </h1>
                        <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">
                            Quản lý & tự động giới hạn chi tiêu Facebook Ads theo khung giờ
                        </p>
                    </div>
                    ${_isGD ? `
                    <a href="/caidattaikhoanads" target="_blank" style="
                        font-family: inherit; padding: 12px 22px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.3);
                        background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
                        color: white; font-size: 14px; font-weight: 800; text-decoration: none;
                        display: inline-flex; align-items: center; gap: 8px;
                        transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    " onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                        <span>⚙️</span> Cài Đặt Tài Khoản Ads ↗
                    </a>
                    ` : ''}
                </div>
            </div>

            <!-- Account Cards Section -->
            <div id="ghct-account-section" style="
                background: white; border-radius: 20px; border: 1px solid #e2e8f0;
                padding: 24px; margin-bottom: 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">📡</span>
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                Danh Sách Tài Khoản Facebook Ads
                                <span id="ghct-account-count-badge" style="background: #eff6ff; color: #2563eb; font-weight: 800; font-size: 12px; padding: 3px 10px; border-radius: 20px; border: 1px solid #bfdbfe;">0 TK</span>
                            </h3>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Bấm vào thẻ tài khoản bên dưới để cấu hình giới hạn chi tiêu cho tài khoản đó.</div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${_isGD ? `
                        <button onclick="window._ghctSwitchTab('settings')" style="
                            font-family: inherit; padding: 11px 22px; border-radius: 12px; border: none;
                            background: linear-gradient(135deg, #1877f2, #2563eb);
                            color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px;
                            cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
                            transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                            <span>🔔</span> Cài Đặt
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Account Cards Grid -->
                <div id="ghct-account-cards-grid" style="
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 14px; margin-top: 14px;
                "></div>
            </div>

            <!-- Tabs Bar -->
            <div id="ghct-controls" style="
                background: white;
                border-radius: 16px;
                padding: 16px 24px;
                margin-bottom: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                border: 1px solid #e2e8f0;
            ">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">📱</span>
                        <span id="ghct-selected-account-name" style="font-weight: 700; font-size: 14px; color: #0f172a;"></span>
                    </div>

                    <!-- Tabs -->
                    <div id="ghct-tabs" style="display: flex; gap: 6px; align-items: center; margin-left: auto; background: #f1f5f9; border-radius: 12px; padding: 4px; flex-wrap: wrap;">
                        <button onclick="window._ghctSwitchTab('config')" class="ghct-tab active" data-tab="config" style="
                            padding: 8px 16px; border: none; border-radius: 10px;
                            font-size: 13px; font-weight: 600; cursor: pointer;
                            background: #0284c7; color: white;
                            transition: all 0.2s;
                        ">⚙️ Cấu Hình</button>
                        <button onclick="window._ghctSwitchTab('logs')" class="ghct-tab" data-tab="logs" style="
                            padding: 8px 16px; border: none; border-radius: 10px;
                            font-size: 13px; font-weight: 600; cursor: pointer;
                            background: transparent; color: #64748b;
                            transition: all 0.2s;
                        ">📋 Lịch Sử</button>
                    </div>
                </div>
            </div>

            <!-- Tab Content -->
            <div id="ghct-content">
                <div style="text-align: center; padding: 60px; color: #94a3b8;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                    <p style="font-size: 16px;">Đang tải dữ liệu...</p>
                </div>
            </div>
        </div>
    `;

    // ========== TAB SWITCHING ==========
    window._ghctSwitchTab = function(tab) {
        _activeTab = tab;
        // Update tab styles
        document.querySelectorAll('.ghct-tab').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.style.background = '#0284c7';
                btn.style.color = 'white';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#64748b';
            }
        });
        _renderContent();
    };

    // ========== TOGGLE STATUS HELPER & MODAL ==========
    function _getAccountStatusBtnInfo(acc) {
        const isSpendEnabled = acc.spend_limit_enabled !== false;
        let autoAt = null;
        if (acc.auto_reenable_at) {
            try { autoAt = new Date(acc.auto_reenable_at); } catch(e){}
        }
        const isFutureTimer = !isSpendEnabled && autoAt && autoAt.getTime() > Date.now();

        if (isSpendEnabled) {
            return {
                isSpendEnabled: true,
                isTimer: false,
                cardBtnText: '⚡ BẬT (Đang chạy)',
                cardBtnBg: 'linear-gradient(135deg, #059669, #10b981)',
                tableBadgeText: '⚡ Đang Bật',
                tableBadgeStyle: 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;',
                tooltip: 'Nhấp để DỪNG tự động giới hạn chi tiêu'
            };
        } else if (isFutureTimer) {
            const timeStr = autoAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
            const dateStr = autoAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
            return {
                isSpendEnabled: false,
                isTimer: true,
                cardBtnText: `⏱️ DỪNG (Bật lại ${timeStr})`,
                cardBtnBg: 'linear-gradient(135deg, #d97706, #f59e0b)',
                tableBadgeText: `⏱️ Đã Dừng (Bật lại ${timeStr})`,
                tableBadgeStyle: 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;',
                tooltip: `Hẹn giờ tự động BẬT lại lúc ${timeStr} ngày ${dateStr}`
            };
        } else {
            return {
                isSpendEnabled: false,
                isTimer: false,
                cardBtnText: '⏸️ DỪNG (Thủ công)',
                cardBtnBg: 'linear-gradient(135deg, #dc2626, #ef4444)',
                tableBadgeText: '⏸️ Đã Dừng (Thủ công)',
                tableBadgeStyle: 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;',
                tooltip: 'Đã tắt thủ công. Nhấp để BẬT tự động giới hạn chi tiêu'
            };
        }
    }

    function _showDisableModal(acc) {
        const old = document.getElementById('ghct-disable-modal');
        if (old) old.remove();

        const modalHtml = `
            <div id="ghct-disable-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 20px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 520px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #e2e8f0;
                    overflow: hidden; display: flex; flex-direction: column;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #1e293b, #0f172a);
                        padding: 20px 24px; color: white; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <span>⏸️</span> Tắt Tự Động Giới Hạn Chi Tiêu
                            </h3>
                            <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                                Tài khoản: <strong style="color: #38bdf8;">📘 ${acc.account_name || 'Quảng Cáo'}</strong>
                            </div>
                        </div>
                        <button onclick="document.getElementById('ghct-disable-modal').remove()" style="
                            background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px;
                            border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
                        ">✕</button>
                    </div>

                    <!-- Body -->
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 16px; font-size: 14px; color: #334155; font-weight: 600;">
                            Vui lòng chọn phương thức tắt cho tài khoản này:
                        </p>

                        <!-- Option 1 Card -->
                        <div id="ghct-card-manual" onclick="window._ghctSelectDisableOption('manual')" style="
                            display: flex; align-items: flex-start; gap: 14px; padding: 16px; border-radius: 14px;
                            border: 2px solid #0284c7; background: #f0f9ff; cursor: pointer; margin-bottom: 14px;
                            transition: all 0.2s;
                        ">
                            <input type="radio" id="ghct-radio-manual" name="ghct_disable_mode" value="manual" checked style="margin-top: 3px; transform: scale(1.2); cursor: pointer;" />
                            <div>
                                <div style="font-weight: 800; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                                    ⏹️ Lựa Chọn 1: Tắt không tự động bật lại
                                </div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4;">
                                    Tắt tự động giới hạn chi tiêu hoàn toàn. Bạn sẽ bật lại thủ công bằng tay khi muốn.
                                </div>
                            </div>
                        </div>

                        <!-- Option 2 Card -->
                        <div id="ghct-card-timer" onclick="window._ghctSelectDisableOption('auto_timer')" style="
                            display: flex; align-items: flex-start; gap: 14px; padding: 16px; border-radius: 14px;
                            border: 2px solid #e2e8f0; background: #ffffff; cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <input type="radio" id="ghct-radio-timer" name="ghct_disable_mode" value="auto_timer" style="margin-top: 3px; transform: scale(1.2); cursor: pointer;" />
                            <div style="flex: 1;">
                                <div style="font-weight: 800; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                                    ⏱️ Lựa Chọn 2: Tắt tạm thời & Tự động BẬT lại sau số tiếng
                                </div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4;">
                                    Tắt ngay và hẹn giờ hệ thống tự động BẬT lại sau số tiếng bạn nhập.
                                </div>

                                <!-- Input Container -->
                                <div id="ghct-timer-input-container" style="display: none; margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #cbd5e1;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 13px; font-weight: 700; color: #334155;">Nhập số tiếng:</span>
                                        <input type="number" id="ghct-timer-hours" value="2" min="0.5" step="0.5" oninput="window._ghctUpdateTimerPreview()" onclick="event.stopPropagation();" style="
                                            width: 80px; padding: 6px 10px; border-radius: 8px; border: 1.5px solid #0284c7;
                                            font-weight: 800; font-size: 14px; text-align: center; color: #0f172a; outline: none;
                                        " />
                                        <span style="font-size: 13px; font-weight: 700; color: #475569;">tiếng (giờ)</span>
                                    </div>
                                    <div id="ghct-timer-preview" style="font-size: 12px; font-weight: 700; color: #0284c7; margin-top: 8px; background: #e0f2fe; padding: 6px 10px; border-radius: 6px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="
                        padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;
                        display: flex; align-items: center; justify-content: flex-end; gap: 12px;
                    ">
                        <button onclick="document.getElementById('ghct-disable-modal').remove()" style="
                            padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1;
                            background: white; color: #475569; font-weight: 700; font-size: 13px; cursor: pointer;
                        ">❌ Hủy Bỏ</button>

                        <button onclick="window._ghctSubmitDisableModal('${acc.id}')" style="
                            padding: 10px 22px; border-radius: 10px; border: none;
                            background: linear-gradient(135deg, #dc2626, #ef4444);
                            color: white; font-weight: 800; font-size: 13px; cursor: pointer;
                            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                        ">✅ Xác Nhận Tắt</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        window._ghctUpdateTimerPreview();
    }

    window._ghctSelectDisableOption = function(mode) {
        const manualCard = document.getElementById('ghct-card-manual');
        const timerCard = document.getElementById('ghct-card-timer');
        const container = document.getElementById('ghct-timer-input-container');

        if (mode === 'manual') {
            if (manualCard) { manualCard.style.borderColor = '#0284c7'; manualCard.style.background = '#f0f9ff'; }
            if (timerCard) { timerCard.style.borderColor = '#e2e8f0'; timerCard.style.background = '#ffffff'; }
            if (container) container.style.display = 'none';
            const radio = document.getElementById('ghct-radio-manual');
            if (radio) radio.checked = true;
        } else {
            if (manualCard) { manualCard.style.borderColor = '#e2e8f0'; manualCard.style.background = '#ffffff'; }
            if (timerCard) { timerCard.style.borderColor = '#0284c7'; timerCard.style.background = '#f0f9ff'; }
            if (container) container.style.display = 'block';
            const radio = document.getElementById('ghct-radio-timer');
            if (radio) radio.checked = true;
            window._ghctUpdateTimerPreview();
        }
    };

    window._ghctUpdateTimerPreview = function() {
        const input = document.getElementById('ghct-timer-hours');
        const preview = document.getElementById('ghct-timer-preview');
        if (!input || !preview) return;

        let h = parseFloat(input.value) || 0;
        if (h < 0.1) h = 0.5;

        const targetTime = new Date(Date.now() + h * 60 * 60 * 1000);
        const timeStr = targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
        const dateStr = targetTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

        preview.innerHTML = `💡 Tự động <strong>BẬT lại vào lúc ${timeStr} ngày ${dateStr}</strong> (sau ${h} tiếng).`;
    };

    window._ghctSubmitDisableModal = async function(accountId) {
        const selectedMode = document.querySelector('input[name="ghct_disable_mode"]:checked')?.value || 'manual';
        let hours = 0;
        if (selectedMode === 'auto_timer') {
            const input = document.getElementById('ghct-timer-hours');
            hours = parseFloat(input?.value) || 2;
            if (hours <= 0) {
                alert('Vui lòng nhập số tiếng hợp lệ (> 0)');
                return;
            }
        }

        const modal = document.getElementById('ghct-disable-modal');
        if (modal) modal.remove();

        try {
            const res = await fetch('/api/gioihanchitieu/toggle-account-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    account_id: accountId,
                    enabled: false,
                    mode: selectedMode,
                    hours: hours
                })
            });
            const data = await res.json();
            if (data.success) {
                _showToast('✅ ' + data.message, 'success');
                await _loadAccounts();
            } else {
                _showToast('❌ ' + (data.error || 'Thao tác thất bại'), 'error');
            }
        } catch (e) {
            _showToast('❌ Lỗi: ' + e.message, 'error');
        }
    };

    // ========== TOGGLE SPEND STATUS ==========
    window._ghctToggleSpendStatus = async function(accountId, enableStatus) {
        const acc = _accounts.find(a => String(a.id) === String(accountId));

        if (enableStatus === false) {
            // Turning OFF -> show popup modal options
            if (acc) {
                _showDisableModal(acc);
            } else {
                _showDisableModal({ id: accountId, account_name: 'Tài Khoản' });
            }
            return;
        }

        // Turning ON -> call API directly
        try {
            const res = await fetch('/api/gioihanchitieu/toggle-account-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ account_id: accountId, enabled: true })
            });
            const data = await res.json();
            if (data.success) {
                _showToast('✅ ' + data.message, 'success');
                await _loadAccounts();
            } else {
                _showToast('❌ ' + (data.error || 'Thao tác thất bại'), 'error');
            }
        } catch (e) {
            _showToast('❌ Lỗi: ' + e.message, 'error');
        }
    };

    // ========== ACCOUNT SELECT ==========
    window._ghctSelectAccount = async function(accountId) {
        if (accountId === 'all' || !accountId) {
            _selectedAccountId = 'all';
        } else {
            _selectedAccountId = parseInt(accountId);
        }
        await _loadConfig();
        await _loadLogs();
        _renderAccountCards();
        _updateControlsHeader();
        _renderContent();
    };

    function _updateControlsHeader() {
        const controlsEl = document.getElementById('ghct-controls');
        const nameEl = document.getElementById('ghct-selected-account-name');
        if (controlsEl) controlsEl.style.display = '';

        if (_selectedAccountId === 'all') {
            if (nameEl) nameEl.textContent = `📋 Tất Cả Tài Khoản Facebook Ads (${_accounts.length} TK)`;
        } else {
            const acc = _accounts.find(a => a.id === _selectedAccountId);
            if (nameEl && acc) {
                const rawAccId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
                nameEl.textContent = acc.account_name + ' (act_' + rawAccId + ')';
            }
        }
    }

    // ========== LOAD DATA ==========
    async function _loadAccounts() {
        try {
            const res = await fetch('/api/gioihanchitieu/accounts', { credentials: 'include' });
            const data = await res.json();
            _accounts = data.accounts || [];
            _selectedAccountId = 'all'; // Default to all accounts on load
            await _loadConfig();
            await _loadLogs();
            _renderAccountCards();
            _updateControlsHeader();
            _renderContent();
        } catch (e) {
            console.error('[GHCT] Load accounts error:', e);
        }
    }

    // ========== RENDER ACCOUNT CARDS ==========
    function _renderAccountCards() {
        const grid = document.getElementById('ghct-account-cards-grid');
        const badge = document.getElementById('ghct-account-count-badge');
        if (!grid) return;

        if (badge) badge.textContent = `${_accounts.length} TK`;

        if (_accounts.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 24px; text-align: center; background: #f8fafc; border-radius: 14px; border: 1.5px dashed #cbd5e1; color: #64748b;">
                    <div style="font-size: 28px; margin-bottom: 6px;">📭</div>
                    <div style="font-size: 14px; font-weight: 700; color: #1e293b;">Chưa có tài khoản quảng cáo nào!</div>
                    <div style="font-size: 12px; margin-top: 4px;">Vui lòng thêm tài khoản ở trang <strong>"Cài Đặt Tài Khoản Ads"</strong> để bắt đầu.</div>
                </div>
            `;
            return;
        }

        const isAllSelected = _selectedAccountId === 'all';

        let cardsHtml = `
            <div onclick="window._ghctSelectAccount('all')" style="
                padding: 14px 16px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
                border: 2px solid ${isAllSelected ? '#0284c7' : '#e2e8f0'};
                background: ${isAllSelected ? '#f0f9ff' : '#ffffff'};
                box-shadow: ${isAllSelected ? '0 4px 12px rgba(2,132,199,0.15)' : 'none'};
                display: flex; flex-direction: column; justify-content: space-between;
            " onmouseover="if(!${isAllSelected}) this.style.borderColor='#7dd3fc'" onmouseout="if(!${isAllSelected}) this.style.borderColor='#e2e8f0'">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 800; font-size: 14px; color: ${isAllSelected ? '#0369a1' : '#1e293b'};">
                            📋 Tất Cả Tài Khoản
                        </span>
                        ${isAllSelected ? '<span style="background: #0284c7; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">ĐANG THEO DÕI</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                        Tổng hợp chỉ số của <strong>${_accounts.length}</strong> tài khoản QC
                    </div>
                </div>
                <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; font-weight: 700; color: ${isAllSelected ? '#0284c7' : '#94a3b8'};">
                        ${isAllSelected ? '✔ ĐANG XEM TỔNG HỢP' : 'Bấm để xem tất cả'}
                    </span>
                </div>
            </div>
        `;

        cardsHtml += _accounts.map(acc => {
            const isSelected = acc.id === _selectedAccountId;
            const hasAccess = acc._has_access !== false;
            // Fix: avoid act_act_ double prefix
            const rawId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
            const displayId = rawId ? `act_${rawId}` : 'chưa cài';
            const adsManagerUrl = rawId ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawId}` : '';

            // Connection status badge
            const connSt = acc.connection_status || 'unconfigured';
            let statusBadge = '';
            if (isSelected) {
                statusBadge = '<span style="background: #0284c7; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">ĐANG CHỌN</span>';
            } else if (connSt === 'error') {
                statusBadge = '<span style="color:#dc2626;font-weight:800;font-size:11px;background:#fee2e2;padding:2px 8px;border-radius:10px;">🔴 Mất kết nối</span>';
            } else if (connSt === 'unconfigured') {
                statusBadge = '<span style="color:#d97706;font-weight:700;font-size:11px;background:#fef3c7;padding:2px 8px;border-radius:10px;">🟡 Chưa kết nối</span>';
            } else {
                statusBadge = '<span style="color:#059669;font-weight:700;font-size:11px;background:#dcfce7;padding:2px 8px;border-radius:10px;">🟢 Kết Nối Tốt</span>';
            }

            const staffName = acc.assigned_staff_name || 'Chưa phân công';
            const stInfo = _getAccountStatusBtnInfo(acc);
            const toggleBtn = hasAccess ? `
                <button onclick="event.stopPropagation(); window._ghctToggleSpendStatus('${acc.id}', ${!stInfo.isSpendEnabled})" style="
                    background: ${stInfo.cardBtnBg};
                    color: white; border: none; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700;
                    cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.2s;
                " title="${stInfo.tooltip}">
                    ${stInfo.cardBtnText}
                </button>
            ` : `<span style="font-size: 11px; font-weight: 700;" title="${stInfo.tooltip}">${stInfo.cardBtnText}</span>`;

            return `
                <div onclick="${hasAccess ? `window._ghctSelectAccount('${acc.id}')` : ''}" style="
                    padding: 14px 16px; border-radius: 14px; cursor: ${hasAccess ? 'pointer' : 'not-allowed'}; transition: all 0.2s;
                    border: 2px solid ${isSelected ? '#0284c7' : '#e2e8f0'};
                    background: ${isSelected ? '#f0f9ff' : (hasAccess ? '#ffffff' : '#f8fafc')};
                    box-shadow: ${isSelected ? '0 4px 12px rgba(2,132,199,0.15)' : 'none'};
                    display: flex; flex-direction: column; justify-content: space-between;
                    opacity: ${hasAccess ? '1' : '0.6'};
                " onmouseover="if(${hasAccess} && !${isSelected}) this.style.borderColor='#7dd3fc'" onmouseout="if(${hasAccess} && !${isSelected}) this.style.borderColor='#e2e8f0'">
                    <div>
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                            <div style="font-weight: 800; font-size: 14px; color: ${isSelected ? '#0369a1' : '#0f172a'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                📘 ${acc.account_name}
                            </div>
                            <div style="flex-shrink:0;">${statusBadge}</div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
                            <div style="font-family: monospace; font-size: 11px; color: #64748b;">
                                ${displayId}
                            </div>
                            ${adsManagerUrl ? `
                            <a href="${adsManagerUrl}" target="_blank" onclick="event.stopPropagation();" style="
                                color: #0369a1; font-weight: 700; text-decoration: none; font-size: 11px;
                                background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 6px;
                                display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s;
                            " onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'" title="Mở trang Quản Lý Ads Manager Meta">
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
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                            <span style="color: #64748b; font-size: 11px;">⚙️ Tự Động Chi Tiêu:</span>
                            ${toggleBtn}
                        </div>
                    </div>

                    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; color: ${isSelected ? '#0284c7' : '#94a3b8'};">
                            ${isSelected ? '✔ ĐANG CẤU HÌNH' : (hasAccess ? 'Bấm để cấu hình giới hạn' : '🔒 Không có quyền')}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        grid.innerHTML = cardsHtml;
    }

    async function _loadConfig() {
        if (!_selectedAccountId) return;
        try {
            const res = await fetch(`/api/gioihanchitieu/config?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _configs = data.configs || [];
            _initialConfigsMap.clear();

            const dayTypeCount = { weekday: 0, sunday: 0 };
            _configs.forEach(c => {
                const dayType = c.day_type || 'weekday';
                const idx = dayTypeCount[dayType] || 0;
                dayTypeCount[dayType] = idx + 1;

                const trueBaseLimit = (c.is_one_time_override && c.original_spend_limit != null)
                    ? parseFloat(c.original_spend_limit)
                    : (parseFloat(c.spend_limit) || 0);

                const slotInfo = {
                    id: c.id,
                    day_type: dayType,
                    time_slot: (c.time_slot || '').substring(0, 5),
                    spend_limit: parseFloat(c.spend_limit) || 0,
                    base_limit: trueBaseLimit,
                    is_one_time_override: c.is_one_time_override === true
                };

                if (c.id) {
                    _initialConfigsMap.set(`id_${c.id}`, slotInfo);
                }
                _initialConfigsMap.set(`idx_${dayType}_${idx}`, slotInfo);
                _initialConfigsMap.set(`time_${dayType}_${(c.time_slot || '').substring(0, 5)}`, slotInfo);
            });
        } catch (e) {
            console.error('[GHCT] Load config error:', e);
        }
    }

    async function _loadLogs() {
        if (!_selectedAccountId) return;
        try {
            const res = await fetch(`/api/gioihanchitieu/logs?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _logs = data.logs || [];
        } catch (e) {
            console.error('[GHCT] Load logs error:', e);
        }
    }

    async function _loadSettings() {
        try {
            const res = await fetch('/api/gioihanchitieu/settings', { credentials: 'include' });
            const data = await res.json();
            _settings = data.settings || {};
        } catch (e) {
            console.error('[GHCT] Load settings error:', e);
        }
    }

    // [ĐÃ XÓA] _loadPermissions — phân quyền giờ dựa vào assigned_staff_name
    // từ trang Cài Đặt Tài Khoản Ads

    // ========== RENDER CONTENT ==========
    function _renderContent() {
        const el = document.getElementById('ghct-content');
        if (!el) return;

        if (!_selectedAccountId && _activeTab !== 'settings') {
            el.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #94a3b8;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📱</div>
                    <p style="font-size: 16px;">Vui lòng chọn tài khoản Ads để bắt đầu</p>
                </div>
            `;
            return;
        }

        switch (_activeTab) {
            case 'config': _renderConfigTab(el); break;
            case 'logs': _renderLogsTab(el); break;
            case 'settings': _renderSettingsTab(el); break;
        }
    }

    // ========== ALL ACCOUNTS OVERVIEW ==========
    function _renderAllAccountsOverview(el) {
        if (_accounts.length === 0) {
            el.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #94a3b8;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <p style="font-size: 16px;">Chưa có tài khoản quảng cáo nào</p>
                </div>
            `;
            return;
        }

        const rows = _accounts.map((acc, i) => {
            const hasAccess = acc._has_access !== false;
            const rawId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
            const displayId = rawId ? `act_${rawId}` : 'chưa cài';
            const staffName = acc.assigned_staff_name || 'Chưa phân công';
            const accConfigs = _configs.filter(c => String(c.account_id) === String(acc.id));
            const activeSlotsCount = accConfigs.filter(c => c.is_active !== false).length;
            const stInfo = _getAccountStatusBtnInfo(acc);

            const connSt = acc.connection_status || 'unconfigured';
            let statusBadge = '<span style="color:#059669;font-weight:700;font-size:11px;background:#dcfce7;padding:3px 10px;border-radius:10px;">🟢 Kết Nối Tốt</span>';
            if (connSt === 'error') {
                statusBadge = '<span style="color:#dc2626;font-weight:800;font-size:11px;background:#fee2e2;padding:3px 10px;border-radius:10px;">🔴 Mất kết nối</span>';
            } else if (connSt === 'unconfigured') {
                statusBadge = '<span style="color:#d97706;font-weight:700;font-size:11px;background:#fef3c7;padding:3px 10px;border-radius:10px;">🟡 Chưa kết nối</span>';
            }

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                    <td style="padding: 14px 16px; color: #64748b; font-weight: 600;">${i + 1}</td>
                    <td style="padding: 14px 16px;">
                        <div style="font-weight: 800; font-size: 14px; color: #0f172a;">📘 ${acc.account_name}</div>
                        <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">${displayId}</div>
                    </td>
                    <td style="padding: 14px 16px;">
                        <span style="color: #1e1b4b; background: #e0e7ff; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">👤 ${staffName}</span>
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 14px 16px; text-align: center;">
                        ${hasAccess ? `
                        <button onclick="window._ghctToggleSpendStatus('${acc.id}', ${!stInfo.isSpendEnabled})" style="
                            ${stInfo.tableBadgeStyle}
                            padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer;
                            transition: all 0.2s;
                        " title="${stInfo.tooltip}">
                            ${stInfo.tableBadgeText}
                        </button>
                        ` : `
                        <span style="font-size: 11px; font-weight: 700; ${stInfo.tableBadgeStyle} padding: 4px 10px; border-radius: 20px;" title="${stInfo.tooltip}">
                            ${stInfo.tableBadgeText}
                        </span>
                        `}
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                        <span style="font-size: 12px; font-weight: 700; color: ${activeSlotsCount > 0 ? '#0284c7' : '#94a3b8'}; background: ${activeSlotsCount > 0 ? '#e0f2fe' : '#f1f5f9'}; padding: 3px 10px; border-radius: 12px;">
                            ${activeSlotsCount > 0 ? `⚡ ${activeSlotsCount} khung giờ active` : 'Chưa cài khung giờ'}
                        </span>
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                        ${hasAccess ? `
                        <button onclick="window._ghctSelectAccount('${acc.id}')" style="
                            padding: 8px 16px; border: none; border-radius: 10px;
                            background: #0284c7; color: white; font-size: 12px; font-weight: 700; cursor: pointer;
                            transition: all 0.2s; box-shadow: 0 2px 6px rgba(2,132,199,0.2);
                        ">⚙️ Cấu Hình Cụ Thể ↗</button>
                        ` : `
                        <span style="color: #94a3b8; font-size: 12px;">🔒 Không có quyền</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');

        const mobileCards = _accounts.map((acc, i) => {
            const hasAccess = acc._has_access !== false;
            const rawId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
            const displayId = rawId ? `act_${rawId}` : 'chưa cài';
            const staffName = acc.assigned_staff_name || 'Chưa phân công';
            const accConfigs = _configs.filter(c => String(c.account_id) === String(acc.id));
            const activeSlotsCount = accConfigs.filter(c => c.is_active !== false).length;
            const stInfo = _getAccountStatusBtnInfo(acc);

            const connSt = acc.connection_status || 'unconfigured';
            let statusBadge = '<span style="color:#059669;font-weight:700;font-size:11px;background:#dcfce7;padding:3px 8px;border-radius:10px;">🟢 Kết Nối Tốt</span>';
            if (connSt === 'error') {
                statusBadge = '<span style="color:#dc2626;font-weight:800;font-size:11px;background:#fee2e2;padding:3px 8px;border-radius:10px;">🔴 Mất kết nối</span>';
            } else if (connSt === 'unconfigured') {
                statusBadge = '<span style="color:#d97706;font-weight:700;font-size:11px;background:#fef3c7;padding:3px 8px;border-radius:10px;">🟡 Chưa kết nối</span>';
            }

            return `
                <div style="
                    background: white; border-radius: 14px; border: 1px solid #e2e8f0;
                    padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                        <div>
                            <div style="font-weight: 800; font-size: 14px; color: #0284c7;">📘 ${acc.account_name}</div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">${displayId}</div>
                        </div>
                        ${statusBadge}
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                        <div>
                            <span style="color: #64748b;">NV Phụ Trách:</span>
                            <span style="font-weight: 700; color: #1e1b4b; margin-left: 4px;">👤 ${staffName}</span>
                        </div>
                        <div>
                            <span style="font-size: 11px; font-weight: 700; color: ${activeSlotsCount > 0 ? '#0284c7' : '#94a3b8'}; background: ${activeSlotsCount > 0 ? '#e0f2fe' : '#f1f5f9'}; padding: 3px 8px; border-radius: 10px;">
                                ${activeSlotsCount > 0 ? `⚡ ${activeSlotsCount} khung giờ` : 'Chưa cài'}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #f1f5f9;">
                        <span style="color: #64748b;">Tự Động Chi Tiêu:</span>
                        ${hasAccess ? `
                        <button onclick="event.stopPropagation(); window._ghctToggleSpendStatus('${acc.id}', ${!stInfo.isSpendEnabled})" style="
                            ${stInfo.tableBadgeStyle}
                            padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer;
                        " title="${stInfo.tooltip}">
                            ${stInfo.tableBadgeText}
                        </button>
                        ` : `
                        <span style="font-size: 11px; font-weight: 700; ${stInfo.tableBadgeStyle} padding: 4px 10px; border-radius: 20px;" title="${stInfo.tooltip}">
                            ${stInfo.tableBadgeText}
                        </span>
                        `}
                    </div>
                    ${hasAccess ? `
                    <button onclick="window._ghctSelectAccount('${acc.id}')" style="
                        width: 100%; margin-top: 12px; padding: 10px; border: none; border-radius: 10px;
                        background: #0284c7; color: white; font-size: 13px; font-weight: 700; cursor: pointer;
                        text-align: center; box-shadow: 0 2px 6px rgba(2,132,199,0.2);
                    ">⚙️ Cấu Hình Cụ Thể ↗</button>
                    ` : `
                    <div style="text-align: center; margin-top: 10px; color: #94a3b8; font-size: 12px;">🔒 Không có quyền</div>
                    `}
                </div>
            `;
        }).join('');

        el.innerHTML = `
            <div style="
                background: white; border-radius: 16px; border: 1px solid #e2e8f0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06); overflow: hidden;
            ">
                <div style="
                    background: linear-gradient(135deg, #0c4a6e, #0284c7);
                    padding: 18px 24px; color: white; display: flex; align-items: center; justify-content: space-between;
                ">
                    <div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 800;">📋 Tổng Quan Giới Hạn Chi Tiêu — Tất Cả Tài Khoản Quảng Cáo</h3>
                        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85;">Danh sách toàn bộ ${_accounts.length} tài khoản quảng cáo và trạng thái cài đặt giới hạn chi tiêu</p>
                    </div>
                </div>

                <div class="ghct-desktop-view" style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a, #1e293b); border-bottom: 2px solid #334155;">
                                <th style="padding: 12px 16px; text-align: left; color: #ffffff !important; font-weight: 700;">#</th>
                                <th style="padding: 12px 16px; text-align: left; color: #ffffff !important; font-weight: 700;">Tài Khoản Ads</th>
                                <th style="padding: 12px 16px; text-align: left; color: #ffffff !important; font-weight: 700;">NV Phụ Trách</th>
                                <th style="padding: 12px 16px; text-align: center; color: #ffffff !important; font-weight: 700;">Trạng Thái Kết Nối</th>
                                <th style="padding: 12px 16px; text-align: center; color: #ffffff !important; font-weight: 700;">Tự Động Chi Tiêu</th>
                                <th style="padding: 12px 16px; text-align: center; color: #ffffff !important; font-weight: 700;">Cấu Hình Khung Giờ</th>
                                <th style="padding: 12px 16px; text-align: center; color: #ffffff !important; font-weight: 700;">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
                <div class="ghct-mobile-view" style="padding: 10px;">
                    ${mobileCards}
                </div>
            </div>
        `;
    }

    // ========== CONFIG TAB ==========
    function _renderConfigTab(el) {
        if (_selectedAccountId === 'all') {
            _renderAllAccountsOverview(el);
            return;
        }

        const weekdayConfigs = _configs.filter(c => c.day_type === 'weekday');
        const sundayConfigs = _configs.filter(c => c.day_type === 'sunday');

        el.innerHTML = `
            <div class="ghct-config-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- WEEKDAY Config -->
                <div style="
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                    overflow: hidden;
                ">
                    <div style="
                        background: linear-gradient(135deg, #1e40af, #3b82f6);
                        padding: 16px 20px;
                        color: white;
                        display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">📅 Thứ 2 → Thứ 7</h3>
                            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">Cấu hình khung giờ ngày thường</p>
                        </div>
                        <button onclick="window._ghctAddSlot('weekday')" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: white;
                            padding: 8px 14px;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 600;
                            transition: all 0.2s;
                        ">➕ Thêm Khung Giờ</button>
                    </div>
                    <div id="ghct-weekday-slots" style="padding: 16px;">
                        ${_renderSlots(weekdayConfigs, 'weekday')}
                    </div>
                </div>

                <!-- SUNDAY Config -->
                <div style="
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                    overflow: hidden;
                ">
                    <div style="
                        background: linear-gradient(135deg, #7c2d12, #ea580c);
                        padding: 16px 20px;
                        color: white;
                        display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">🌙 Chủ Nhật</h3>
                            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">Cấu hình khung giờ Chủ Nhật</p>
                        </div>
                        <button onclick="window._ghctAddSlot('sunday')" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: white;
                            padding: 8px 14px;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 600;
                            transition: all 0.2s;
                        ">➕ Thêm Khung Giờ</button>
                    </div>
                    <div id="ghct-sunday-slots" style="padding: 16px;">
                        ${_renderSlots(sundayConfigs, 'sunday')}
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="ghct-action-btns" style="
                margin-top: 20px;
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            ">
                <button onclick="window._ghctSaveConfig()" style="
                    background: linear-gradient(135deg, #059669, #10b981);
                    color: white;
                    border: none;
                    padding: 14px 32px;
                    border-radius: 14px;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 8px 20px -4px rgba(5, 150, 105, 0.4);
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">💾 Lưu Cấu Hình</button>
                <button onclick="window._ghctTestNow()" style="
                    background: linear-gradient(135deg, #7c3aed, #a855f7);
                    color: white;
                    border: none;
                    padding: 14px 32px;
                    border-radius: 14px;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.4);
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">🧪 Test Ngay</button>
            </div>

            <!-- Current Schedule Visual -->
            <div style="
                margin-top: 24px;
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                padding: 20px;
            ">
                <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #1e293b;">
                    📊 Biểu Đồ Lịch Giới Hạn Chi Tiêu
                </h3>
                <div id="ghct-schedule-chart" style="display: flex; gap: 24px; flex-wrap: wrap;">
                    ${_renderScheduleChart(weekdayConfigs, sundayConfigs)}
                </div>
            </div>
        `;
    }

    // ========== RENDER SLOTS ==========
    function _renderSlots(configs, dayType) {
        if (configs.length === 0) {
            return `<div style="text-align: center; padding: 24px; color: #94a3b8;">
                <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
                <p style="font-size: 13px;">Chưa có khung giờ nào. Nhấn "➕ Thêm Khung Giờ" để bắt đầu.</p>
            </div>`;
        }

        return configs.map((c, i) => {
            const rawTime = (c.time_slot || '00:00').substring(0, 5);
            const timeParts = rawTime.split(':');
            const hourVal = (timeParts[0] || '00').padStart(2, '0');
            const minuteVal = (timeParts[1] || '00').padStart(2, '0');
            const limitVal = parseFloat(c.spend_limit) || 0;
            const isActive = c.is_active !== false;
            const isOverride = c.is_one_time_override === true && c.original_spend_limit != null;
            const fmtApplied = new Intl.NumberFormat('vi-VN').format(limitVal);
            const fmtOrig = isOverride ? new Intl.NumberFormat('vi-VN').format(c.original_spend_limit) : '';

            const overrideBadgeHtml = isOverride ? `
                <div style="
                    width: 100%; margin-top: 8px; padding: 8px 12px; border-radius: 10px;
                    background: #fffbeb; border: 1px solid #fde68a; font-size: 12px;
                    color: #92400e; display: flex; align-items: center; justify-content: space-between;
                    gap: 8px; flex-wrap: wrap; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
                " title="Số tiền này là tạm thời hôm nay. Hệ thống sẽ tự động khôi phục về ${fmtOrig} đ sau khi thực thi thành công">
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
                        <span style="font-size: 14px;">⏳</span>
                        <span>Cấu hình tạm thời hôm nay: <strong style="color: #b45309;">${fmtApplied} đ</strong></span>
                    </div>
                    <div style="
                        background: #fef3c7; border: 1px solid #fcd34d; padding: 3px 10px;
                        border-radius: 8px; font-size: 11px; font-weight: 800; color: #78350f;
                    ">
                        Khôi phục về mức gốc: ${fmtOrig} đ
                    </div>
                </div>
            ` : '';

            return `
                <div class="ghct-slot-row" style="
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                    padding: 12px 16px;
                    margin-bottom: 8px;
                    background: ${isActive ? '#f0fdf4' : '#fef2f2'};
                    border: 1px solid ${isActive ? '#bbf7d0' : '#fecaca'};
                    border-radius: 12px;
                    transition: all 0.2s;
                    animation: ghct-fadeIn 0.3s ease ${i * 0.05}s both;
                " data-daytype="${dayType}" data-index="${i}">
                    <!-- Số thứ tự -->
                    <div style="
                        width: 28px; height: 28px;
                        background: ${isActive ? '#059669' : '#ef4444'};
                        color: white;
                        border-radius: 8px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 12px; font-weight: 700;
                        flex-shrink: 0;
                    ">${i + 1}</div>

                    <!-- Time Input 24h Việt Nam (Tự điền giờ & phút, không dùng SA/CH) -->
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0; background: white; border: 2px solid #e2e8f0; border-radius: 10px; padding: 6px 10px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);">
                        <span style="font-size: 14px;">🕐</span>
                        <input type="text" maxlength="2" inputmode="numeric" pattern="[0-9]*" value="${hourVal}" 
                            onfocus="this.select()"
                            onblur="window._ghctFormat24hInput(this, 'hour'); window._ghctUpdateSlotTime24('${dayType}', ${i}, 'hour', this.value)"
                            oninput="window._ghctUpdateSlotTime24('${dayType}', ${i}, 'hour', this.value)"
                            style="
                                width: 28px;
                                text-align: center;
                                border: none;
                                font-size: 14px;
                                font-weight: 800;
                                color: #0f172a;
                                background: transparent;
                                outline: none;
                                padding: 0;
                            " title="Nhập giờ (00 - 23h)" placeholder="00" />
                        <span style="font-weight: 800; color: #64748b; font-size: 14px;">:</span>
                        <input type="text" maxlength="2" inputmode="numeric" pattern="[0-9]*" value="${minuteVal}" 
                            onfocus="this.select()"
                            onblur="window._ghctFormat24hInput(this, 'minute'); window._ghctUpdateSlotTime24('${dayType}', ${i}, 'minute', this.value)"
                            oninput="window._ghctUpdateSlotTime24('${dayType}', ${i}, 'minute', this.value)"
                            style="
                                width: 28px;
                                text-align: center;
                                border: none;
                                font-size: 14px;
                                font-weight: 800;
                                color: #0f172a;
                                background: transparent;
                                outline: none;
                                padding: 0;
                            " title="Nhập phút (00 - 59p)" placeholder="00" />
                        <span style="font-size: 10px; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 6px; margin-left: 2px;">24h</span>
                    </div>

                    <!-- Arrow -->
                    <span style="color: #94a3b8; font-size: 16px;">→</span>

                    <!-- Money -->
                    <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 16px;">💵</span>
                        <input type="text" value="${new Intl.NumberFormat('vi-VN').format(limitVal)}" 
                            oninput="window._ghctFormatMoneyInput(this)"
                            onchange="window._ghctUpdateSlot('${dayType}', ${i}, 'money', this.value)" 
                            style="
                                padding: 8px 12px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 14px;
                                font-weight: 700;
                                color: #059669;
                                background: white;
                                outline: none;
                                flex: 1;
                                min-width: 120px;
                        " />
                        <span style="color: #64748b; font-size: 13px; font-weight: 500;">đ</span>
                    </div>

                    <!-- Toggle Active -->
                    <label style="
                        position: relative;
                        display: inline-block;
                        width: 44px;
                        height: 24px;
                        flex-shrink: 0;
                        cursor: pointer;
                    ">
                        <input type="checkbox" ${isActive ? 'checked' : ''} 
                            onchange="window._ghctUpdateSlot('${dayType}', ${i}, 'active', this.checked)"
                            style="opacity: 0; width: 0; height: 0;" />
                        <span style="
                            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                            background-color: ${isActive ? '#059669' : '#cbd5e1'};
                            transition: 0.3s;
                            border-radius: 24px;
                        ">
                            <span style="
                                position: absolute;
                                content: '';
                                height: 18px; width: 18px;
                                left: ${isActive ? '22px' : '3px'};
                                bottom: 3px;
                                background-color: white;
                                transition: 0.3s;
                                border-radius: 50%;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            "></span>
                        </span>
                    </label>

                    <!-- Delete -->
                    <button onclick="window._ghctRemoveSlot('${dayType}', ${i})" style="
                        width: 32px; height: 32px;
                        border-radius: 8px;
                        border: none;
                        background: #fee2e2;
                        color: #ef4444;
                        cursor: pointer;
                        font-size: 14px;
                        flex-shrink: 0;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    " title="Xóa khung giờ">🗑️</button>

                    ${overrideBadgeHtml}
                </div>
            `;
        }).join('');
    }

    // ========== SCHEDULE CHART ==========
    function _renderScheduleChart(weekdayConfigs, sundayConfigs) {
        function renderTimeline(configs, label, color) {
            if (configs.length === 0) return `<div style="flex: 1; min-width: 280px; text-align: center; color: #94a3b8; padding: 16px;">Chưa có dữ liệu</div>`;

            const maxLimit = Math.max(...configs.map(c => parseFloat(c.spend_limit) || 0), 1);

            return `
                <div style="flex: 1; min-width: 280px;">
                    <h4 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${color};">${label}</h4>
                    ${configs.map(c => {
                        const limit = parseFloat(c.spend_limit) || 0;
                        const pct = (limit / maxLimit) * 100;
                        const timeVal = (c.time_slot || '').substring(0, 5);
                        return `
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span style="font-size: 12px; font-weight: 600; color: #64748b; width: 40px; text-align: right;">${timeVal}</span>
                                <div style="flex: 1; background: #f1f5f9; border-radius: 8px; height: 28px; overflow: hidden; position: relative;">
                                    <div style="
                                        width: ${pct}%;
                                        height: 100%;
                                        background: linear-gradient(90deg, ${color}, ${color}99);
                                        border-radius: 8px;
                                        transition: width 0.8s ease;
                                        display: flex;
                                        align-items: center;
                                        justify-content: flex-end;
                                        padding-right: 8px;
                                    ">
                                        <span style="font-size: 11px; font-weight: 700; color: white; white-space: nowrap;">
                                            ${_fmtMoney(limit)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        return renderTimeline(weekdayConfigs, '📅 Thứ 2 → Thứ 7', '#3b82f6') +
               renderTimeline(sundayConfigs, '🌙 Chủ Nhật', '#ea580c');
    }

    // ========== SLOT ACTIONS ==========
    window._ghctAddSlot = function(dayType) {
        _configs.push({
            day_type: dayType,
            time_slot: '00:00:00',
            spend_limit: 0,
            is_active: true
        });
        _renderContent();
    };

    window._ghctRemoveSlot = function(dayType, index) {
        const filtered = _configs.filter(c => c.day_type === dayType);
        const target = filtered[index];
        if (target) {
            const globalIdx = _configs.indexOf(target);
            if (globalIdx >= 0) {
                _configs.splice(globalIdx, 1);
            }
        }
        _renderContent();
    };

    window._ghctUpdateSlot = function(dayType, index, field, value) {
        const filtered = _configs.filter(c => c.day_type === dayType);
        const target = filtered[index];
        if (!target) return;

        if (field === 'time') {
            target.time_slot = value + ':00';
        } else if (field === 'money') {
            const cleaned = value.replace(/[^\d]/g, '');
            target.spend_limit = parseInt(cleaned) || 0;
        } else if (field === 'active') {
            target.is_active = value;
        }
    };

    window._ghctUpdateSlotTime24 = function(dayType, index, type, value) {
        const filtered = _configs.filter(c => c.day_type === dayType);
        const target = filtered[index];
        if (!target) return;

        const cleaned = value.replace(/[^\d]/g, '');
        let rawTime = (target.time_slot || '00:00').substring(0, 5);
        let [h, m] = rawTime.split(':');
        h = (h || '00').padStart(2, '0');
        m = (m || '00').padStart(2, '0');

        if (type === 'hour') {
            let hNum = parseInt(cleaned, 10);
            if (isNaN(hNum)) hNum = 0;
            if (hNum > 23) hNum = 23;
            h = String(hNum).padStart(2, '0');
        } else if (type === 'minute') {
            let mNum = parseInt(cleaned, 10);
            if (isNaN(mNum)) mNum = 0;
            if (mNum > 59) mNum = 59;
            m = String(mNum).padStart(2, '0');
        }

        target.time_slot = `${h}:${m}:00`;
    };

    window._ghctFormat24hInput = function(input, type) {
        const cleaned = input.value.replace(/[^\d]/g, '');
        let num = parseInt(cleaned, 10);
        if (isNaN(num)) num = 0;
        const max = type === 'hour' ? 23 : 59;
        if (num > max) num = max;
        if (num < 0) num = 0;
        input.value = String(num).padStart(2, '0');
    };

    window._ghctFormatMoneyInput = function(input) {
        const raw = input.value.replace(/[^\d]/g, '');
        if (raw) {
            input.value = new Intl.NumberFormat('vi-VN').format(parseInt(raw));
        }
    };

    // ========== SAVE MODE SELECTION MODAL ==========
    function _showSaveModeModal(hasChanges, onConfirm) {
        const old = document.getElementById('ghct-save-mode-modal');
        if (old) old.remove();

        const modalHtml = `
            <div id="ghct-save-mode-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; padding: 20px; box-sizing: border-box;
            ">
                <div style="
                    background: white; border-radius: 20px; width: 100%; max-width: 560px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3); border: 1px solid #e2e8f0;
                    overflow: hidden; display: flex; flex-direction: column;
                    animation: ghct-fadeIn 0.2s ease-out;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #0c4a6e, #0284c7);
                        padding: 20px 24px; color: white; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <span>⚙️</span> Chọn Chế Độ Lưu Giới Hạn Chi Tiêu
                            </h3>
                            <div style="font-size: 13px; color: #e0f2fe; margin-top: 4px;">
                                Vui lòng chọn cách hệ thống thực thi số tiền giới hạn chi tiêu
                            </div>
                        </div>
                        <button onclick="document.getElementById('ghct-save-mode-modal').remove()" style="
                            background: rgba(255,255,255,0.15); border: none; color: white;
                            width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px;
                            display: flex; align-items: center; justify-content: center;
                        ">✕</button>
                    </div>

                    <!-- Body Options -->
                    <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc;">

                        <!-- Option 1: Permanent -->
                        <div onclick="window._ghctSelectSaveOption('permanent')" id="ghct-opt-permanent" style="
                            padding: 18px; border-radius: 16px; border: 2.5px solid #0284c7; background: #f0f9ff;
                            cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(2,132,199,0.08);
                        ">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="radio" name="ghct_save_option" id="ghct-radio-permanent" value="permanent" checked style="width: 20px; height: 20px; cursor: pointer; accent-color: #0284c7;" />
                                <label for="ghct-radio-permanent" style="font-weight: 800; font-size: 15px; color: #0369a1; cursor: pointer;">
                                    📌 Lựa Chọn 1: Thay Đổi Hẳn (Vĩnh Viễn)
                                </label>
                            </div>
                            <p style="margin: 10px 0 0 32px; font-size: 13px; color: #334155; line-height: 1.5;">
                                Cập nhật số tiền mới cố định cho tất cả các ngày về sau. Mọi đợt chạy giới hạn chi tiêu từ nay sẽ áp dụng số tiền mới này.
                            </p>
                        </div>

                        <!-- Option 2: Temporary One-time -->
                        <div onclick="window._ghctSelectSaveOption('one_time')" id="ghct-opt-one_time" style="
                            padding: 18px; border-radius: 16px; border: 2.5px solid #e2e8f0; background: #ffffff;
                            cursor: pointer; transition: all 0.2s;
                        ">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="radio" name="ghct_save_option" id="ghct-radio-one_time" value="one_time" style="width: 20px; height: 20px; cursor: pointer; accent-color: #d97706;" />
                                <label for="ghct-radio-one_time" style="font-weight: 800; font-size: 15px; color: #b45309; cursor: pointer;">
                                    ⏳ Lựa Chọn 2: Thay Đổi Tạm Thời Hôm Nay (Tự Động Khôi Phục Về Mức Gốc)
                                </label>
                            </div>
                            <p style="margin: 10px 0 0 32px; font-size: 13px; color: #334155; line-height: 1.5;">
                                Áp dụng số tiền mới cho mốc giờ hôm nay. Ngay sau khi lệnh thực thi thành công lên Facebook Ads ở mốc giờ đó, hệ thống sẽ <strong>TỰ ĐỘNG KHÔI PHỤC</strong> số tiền về lại mức ban đầu để ngày mai tiếp tục chạy mức cũ.
                            </p>
                        </div>

                    </div>

                    <!-- Footer Buttons -->
                    <div style="
                        padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0;
                        display: flex; gap: 12px; justify-content: flex-end; align-items: center;
                    ">
                        <button onclick="document.getElementById('ghct-save-mode-modal').remove()" style="
                            padding: 11px 20px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                            background: white; color: #475569; font-size: 13px; font-weight: 700; cursor: pointer;
                        ">Hủy Bỏ</button>
                        <button onclick="window._ghctConfirmSaveMode()" style="
                            padding: 11px 24px; border-radius: 12px; border: none;
                            background: linear-gradient(135deg, #059669, #10b981); color: white;
                            font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 14px rgba(5,150,105,0.3);
                        ">💾 Xác Nhận Lưu Cấu Hình</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        window._ghctSelectSaveOption = function(opt) {
            document.getElementById('ghct-radio-permanent').checked = (opt === 'permanent');
            document.getElementById('ghct-radio-one_time').checked = (opt === 'one_time');

            const elPerm = document.getElementById('ghct-opt-permanent');
            const elOne = document.getElementById('ghct-opt-one_time');

            if (opt === 'permanent') {
                elPerm.style.borderColor = '#0284c7';
                elPerm.style.background = '#f0f9ff';
                elPerm.style.boxShadow = '0 4px 12px rgba(2,132,199,0.08)';
                elOne.style.borderColor = '#e2e8f0';
                elOne.style.background = '#ffffff';
                elOne.style.boxShadow = 'none';
            } else {
                elOne.style.borderColor = '#d97706';
                elOne.style.background = '#fffbeb';
                elOne.style.boxShadow = '0 4px 12px rgba(217,119,6,0.1)';
                elPerm.style.borderColor = '#e2e8f0';
                elPerm.style.background = '#ffffff';
                elPerm.style.boxShadow = 'none';
            }
        };

        window._ghctConfirmSaveMode = function() {
            const isOneTime = document.getElementById('ghct-radio-one_time').checked;
            const mode = isOneTime ? 'one_time' : 'permanent';
            document.getElementById('ghct-save-mode-modal').remove();
            onConfirm(mode);
        };
    }

    // ========== SAVE CONFIG ==========
    window._ghctSaveConfig = async function() {
        if (!_selectedAccountId) {
            alert('Vui lòng chọn tài khoản trước!');
            return;
        }

        _showSaveModeModal(true, async function(saveMode) {
            try {
                const dayTypeIdxMap = { weekday: 0, sunday: 0 };
                const preparedConfigs = _configs.map(c => {
                    const dayType = c.day_type || 'weekday';
                    const dayIdx = dayTypeIdxMap[dayType] || 0;
                    dayTypeIdxMap[dayType] = dayIdx + 1;

                    let init = null;
                    if (c.id) {
                        init = _initialConfigsMap.get(`id_${c.id}`);
                    }
                    if (!init) {
                        init = _initialConfigsMap.get(`idx_${dayType}_${dayIdx}`);
                    }
                    if (!init) {
                        init = _initialConfigsMap.get(`time_${dayType}_${(c.time_slot || '00:00:00').substring(0, 5)}`);
                    }

                    const currentLimit = parseFloat(c.spend_limit) || 0;
                    const currentSlotTime = (c.time_slot || '00:00:00').substring(0, 5);

                    let isOverride = false;
                    let origLimit = null;

                    if (saveMode === 'one_time') {
                        if (init) {
                            const baseLimit = init.base_limit;
                            const initSlotTime = init.time_slot;
                            const isMoneyChanged = currentLimit !== baseLimit;
                            const isTimeChanged = currentSlotTime !== initSlotTime;

                            if (isMoneyChanged || isTimeChanged || init.is_one_time_override) {
                                isOverride = true;
                                origLimit = baseLimit;
                            } else {
                                isOverride = false;
                                origLimit = null;
                            }
                        } else {
                            isOverride = false;
                            origLimit = null;
                        }
                    }

                    return {
                        day_type: dayType,
                        time_slot: currentSlotTime,
                        spend_limit: currentLimit,
                        is_active: c.is_active !== false,
                        is_one_time_override: isOverride,
                        original_spend_limit: origLimit
                    };
                });

                const res = await fetch('/api/gioihanchitieu/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        account_id: _selectedAccountId,
                        configs: preparedConfigs
                    })
                });

                const data = await res.json();
                if (data.success) {
                    const modeLabel = saveMode === 'one_time' ? ' (Áp dụng TẠM THỜI HÔM NAY)' : ' (Thay đổi VĨNH VIỄN)';
                    _showToast('✅ ' + data.message + modeLabel, 'success');
                    await _loadConfig();
                    _renderContent();
                } else {
                    _showToast('❌ ' + (data.error || 'Lỗi lưu cấu hình'), 'error');
                }
            } catch (e) {
                _showToast('❌ Lỗi: ' + e.message, 'error');
            }
        });
    };

    // ========== TEST NOW ==========
    window._ghctTestNow = async function() {
        if (!_selectedAccountId) {
            alert('Vui lòng chọn tài khoản trước!');
            return;
        }

        // Find the current applicable time slot
        const now = new Date();
        const dayType = now.getDay() === 0 ? 'sunday' : 'weekday';
        const currentConfigs = _configs.filter(c => c.day_type === dayType && c.is_active);

        if (currentConfigs.length === 0) {
            alert('Không có khung giờ nào đang active cho ' + (dayType === 'sunday' ? 'Chủ Nhật' : 'ngày thường'));
            return;
        }

        // Get the latest applicable slot (largest time <= now)
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        let applicableSlot = currentConfigs[0]; // default to first
        for (const c of currentConfigs) {
            const slotTime = (c.time_slot || '').substring(0, 5);
            if (slotTime <= currentTime) {
                applicableSlot = c;
            }
        }

        const limitVal = parseFloat(applicableSlot.spend_limit) || 0;
        if (!confirm(`🧪 Test gửi spend_cap lên Meta?\n\nMức giới hạn: ${_fmtMoney(limitVal)}\nKhung giờ: ${applicableSlot.time_slot ? String(applicableSlot.time_slot).substring(0, 5) : ''}\nLoại ngày: ${dayType === 'sunday' ? 'Chủ Nhật' : 'Thứ 2-7'}\n\nBấm OK để tiếp tục.`)) return;

        try {
            const res = await fetch('/api/gioihanchitieu/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    account_id: _selectedAccountId,
                    spend_limit: limitVal,
                    slot_id: applicableSlot.id
                })
            });

            const data = await res.json();
            if (data.success) {
                _showToast('✅ ' + (data.message || 'Test thành công!'), 'success');
                await _loadLogs();
                _renderContent();
            } else {
                _showToast('❌ ' + (data.error || 'Test thất bại'), 'error');
            }
        } catch (e) {
            _showToast('❌ Lỗi: ' + e.message, 'error');
        }
    };

    // ========== LOGS TAB ==========
    function _renderLogsTab(el) {
        function getLogStatusBadge(status) {
            if (status === 'success') {
                return `<span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;">✅ Thành Công</span>`;
            }
            if (status === 'auto_revert') {
                return `<span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;">🔄 Khôi Phục</span>`;
            }
            return `<span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;">❌ Lỗi</span>`;
        }

        const mobileLogsCards = _logs.length === 0 ? `
            <div style="padding: 30px; text-align: center; color: #94a3b8;">
                <div style="font-size: 28px; margin-bottom: 6px;">📭</div>
                Chưa có lịch sử thực thi nào
            </div>
        ` : _logs.map((log, i) => {
            const dt = new Date(log.executed_at);
            const timeStr = dt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `
                <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <span style="font-weight: 700; font-size: 13px; color: #1e293b;">${log.account_name || 'TK QC'}</span>
                        ${getLogStatusBadge(log.status)}
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; font-size: 12px;">
                        <span style="color: #64748b;">Mức giới hạn:</span>
                        <span style="font-weight: 700; color: #059669;">${_fmtMoney(log.spend_limit)}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font-size: 11px; color: #94a3b8;">
                        <span>🕒 ${timeStr}</span>
                        <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.response || ''}</span>
                    </div>
                </div>
            `;
        }).join('');

        el.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                overflow: hidden;
            ">
                <div style="
                    background: linear-gradient(135deg, #1e293b, #334155);
                    padding: 16px 20px;
                    color: white;
                    display: flex; align-items: center; justify-content: space-between;
                ">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 700;">📋 Lịch Sử Thực Thi Giới Hạn Chi Tiêu</h3>
                    <button onclick="window._ghctRefreshLogs()" style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 6px 14px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                    ">🔄 Tải Lại</button>
                </div>
                <div class="ghct-desktop-view" style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a, #1e293b); border-bottom: 2px solid #334155;">
                                <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: #ffffff !important;">#</th>
                                <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: #ffffff !important;">Thời Gian</th>
                                <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: #ffffff !important;">Tài Khoản</th>
                                <th style="padding: 12px 16px; text-align: right; font-weight: 700; color: #ffffff !important;">Mức Giới Hạn</th>
                                <th style="padding: 12px 16px; text-align: center; font-weight: 700; color: #ffffff !important;">Trạng Thái</th>
                                <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: #ffffff !important;">Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${_logs.length === 0 ? `
                                <tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                                    <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
                                    Chưa có lịch sử thực thi nào
                                </td></tr>
                            ` : _logs.map((log, i) => {
                                const dt = new Date(log.executed_at);
                                const timeStr = dt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                return `
                                    <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                                        <td style="padding: 10px 16px; color: #64748b;">${i + 1}</td>
                                        <td style="padding: 10px 16px; font-weight: 500; color: #334155;">${timeStr}</td>
                                        <td style="padding: 10px 16px; color: #475569;">${log.account_name || ''}</td>
                                        <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #059669;">${_fmtMoney(log.spend_limit)}</td>
                                        <td style="padding: 10px 16px; text-align: center;">
                                            ${getLogStatusBadge(log.status)}
                                        </td>
                                        <td style="padding: 10px 16px; font-size: 11px; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(log.response || '').replace(/"/g, '&quot;')}">${log.response || ''}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="ghct-mobile-view" style="padding: 10px;">
                    ${mobileLogsCards}
                </div>
            </div>
        `;
    }

    window._ghctRefreshLogs = async function() {
        await _loadLogs();
        _renderContent();
    };

    // ========== SETTINGS TAB ==========
    function _renderSettingsTab(el) {
        const isCronOn = _settings.cron_enabled === 'true';
        const isZaloOn = _settings.zalo_enabled === 'true';

        el.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                overflow: hidden;
                max-width: 720px;
                margin: 0 auto;
            ">
                <div style="
                    background: linear-gradient(135deg, #1e293b, #334155);
                    padding: 18px 24px;
                    color: white;
                ">
                    <h3 style="margin: 0; font-size: 17px; font-weight: 700;">⚙️ Cài Đặt Hệ Thống & Thông Báo Zalo</h3>
                    <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">Cấu hình Cầu dao tổng Cron Job & gửi thông báo Zalo trực tiếp</p>
                </div>
                <div style="padding: 24px;">

                    <!-- SECTION 1: CRON MASTER SWITCH -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="font-size: 18px;">🔌</span>
                                    <span style="font-weight: 700; font-size: 15px; color: #0f172a;">Cầu Dao Tổng — Tiến Trình Chạy Ngầm (Cron Job)</span>
                                </div>
                                <p style="margin: 4px 0 8px; font-size: 13px; color: #475569; line-height: 1.5;">
                                    <strong>BẬT</strong>: Máy chủ CRM tự động quét mỗi 60 giây và đổi hạn mức chi tiêu trên Facebook Ads theo đúng khung giờ.<br/>
                                    <strong>TẮT</strong>: Ngắt toàn bộ tiến trình tự động ngầm trên toàn hệ thống.
                                </p>
                            </div>
                            <button type="button" onclick="window._ghctToggleSetting('cron_enabled')" style="
                                position: relative; display: inline-block; width: 50px; height: 26px; flex-shrink: 0; cursor: pointer;
                                border: none; padding: 0; background-color: ${isCronOn ? '#10b981' : '#cbd5e1'};
                                transition: background-color .3s; border-radius: 26px; outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                            " title="${isCronOn ? 'Bấm để TẮT Cầu dao tổng' : 'Bấm để BẬT Cầu dao tổng'}">
                                <span style="
                                    position: absolute; top: 3px; left: 3px; height: 20px; width: 20px;
                                    background-color: white; transition: transform .3s; border-radius: 50%;
                                    transform: ${isCronOn ? 'translateX(24px)' : 'translateX(0)'};
                                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                "></span>
                            </button>
                        </div>
                        <div style="margin-top: 8px;">
                            ${isCronOn 
                                ? `<span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">🟢 Cầu Dao Tổng Đang BẬT — Hệ thống đang quét tự động</span>`
                                : `<span style="background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">🔴 Cầu Dao Tổng Đã NGẮT — Tạm dừng toàn bộ tự động</span>`
                            }
                        </div>
                    </div>

                    <!-- SECTION 2: ZALO NOTIFICATIONS -->
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="font-size: 18px;">📱</span>
                                    <span style="font-weight: 700; font-size: 15px; color: #0369a1;">Gửi Thông Báo Bật/Dừng Tiền Qua Zalo</span>
                                </div>
                                <p style="margin: 0; font-size: 12px; color: #0284c7;">
                                    Tự động nhắn tin Zalo ngay khi máy chủ cập nhật thành công hạn mức chi tiêu
                                </p>
                            </div>
                            <button type="button" onclick="window._ghctToggleSetting('zalo_enabled')" style="
                                position: relative; display: inline-block; width: 50px; height: 26px; flex-shrink: 0; cursor: pointer;
                                border: none; padding: 0; background-color: ${isZaloOn ? '#0284c7' : '#cbd5e1'};
                                transition: background-color .3s; border-radius: 26px; outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                            " title="${isZaloOn ? 'Bấm để TẮT thông báo Zalo' : 'Bấm để BẬT thông báo Zalo'}">
                                <span style="
                                    position: absolute; top: 3px; left: 3px; height: 20px; width: 20px;
                                    background-color: white; transition: transform .3s; border-radius: 50%;
                                    transform: ${isZaloOn ? 'translateX(24px)' : 'translateX(0)'};
                                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                "></span>
                            </button>
                        </div>

                        <!-- Central Link Badge -->
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #1e40af; display: flex; align-items: center; justify-content: space-between;">
                            <span>📱 <strong>Cấu hình Zalo Trung Tâm:</strong> Mọi tính năng đều tự động lấy Zalo AccessToken & User ID từ <a href="/caidattaikhoanads" target="_blank" style="color: #2563eb; font-weight: 800; text-decoration: underline;">Cài Đặt Tài Khoản Ads ↗</a></span>
                        </div>

                        <!-- Zalo Access Token (Trực tiếp như n8n) -->
                        <div style="margin-bottom: 14px;">
                            <label style="font-weight: 700; font-size: 13px; color: #0f172a; display: block; margin-bottom: 6px;">
                                🔑 Zalo AccessToken <span style="font-weight: 400; color: #64748b; font-size: 11px;">(Khuyên dùng — Gửi Zalo trực tiếp không qua n8n)</span>
                            </label>
                            <input type="text" id="ghct-zalo-access-token" value="${_settings.zalo_access_token || ''}" placeholder="Ví dụ: 1290918538094749801:hHAOzPclMwz..." style="
                                width: 100%;
                                padding: 10px 14px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 13px;
                                font-family: monospace;
                                outline: none;
                                box-sizing: border-box;
                                background: white;
                            " />
                            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Dán token từ n8n vào đây. CRM sẽ tự động bắn tin Zalo không cần bật n8n nữa.</p>
                        </div>

                        <!-- Zalo User ID -->
                        <div style="margin-bottom: 14px;">
                            <label style="font-weight: 700; font-size: 13px; color: #0f172a; display: block; margin-bottom: 6px;">
                                👤 Zalo UserId / Chat ID người nhận
                            </label>
                            <input type="text" id="ghct-zalo-user-id" value="${_settings.zalo_user_id || ''}" placeholder="Ví dụ: 67c6b175de22377c6e33" style="
                                width: 100%;
                                padding: 10px 14px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 13px;
                                font-family: monospace;
                                outline: none;
                                box-sizing: border-box;
                                background: white;
                            " />
                            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">ID tài khoản Zalo của Anh để nhận tin nhắn thông báo.</p>
                        </div>

                        <!-- Zalo Webhook URL (N8N Optional) -->
                        <div style="margin-bottom: 8px;">
                            <label style="font-weight: 700; font-size: 13px; color: #0f172a; display: block; margin-bottom: 6px;">
                                🔗 Zalo Webhook URL <span style="font-weight: 400; color: #64748b; font-size: 11px;">(Tùy chọn phụ — Nếu muốn gửi sang n8n Webhook)</span>
                            </label>
                            <input type="text" id="ghct-zalo-webhook" value="${_settings.zalo_webhook_url || ''}" placeholder="https://dongphuchv.tino.page/webhook/..." style="
                                width: 100%;
                                padding: 10px 14px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 13px;
                                outline: none;
                                box-sizing: border-box;
                                background: white;
                            " />
                            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Để trống nếu đã điền Zalo AccessToken ở trên.</p>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <button onclick="window._ghctSaveSettings()" style="
                        background: linear-gradient(135deg, #059669, #10b981);
                        color: white;
                        border: none;
                        padding: 14px 24px;
                        border-radius: 12px;
                        font-size: 15px;
                        font-weight: 700;
                        cursor: pointer;
                        width: 100%;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
                        transition: all 0.3s;
                    ">💾 Lưu Cấu Hình Hệ Thống</button>
                </div>
            </div>
        `;
    }

    window._ghctToggleSetting = function(key) {
        _settings[key] = _settings[key] === 'true' ? 'false' : 'true';
        const el = document.getElementById('ghct-content');
        if (el) _renderSettingsTab(el);
    };

    window._ghctSaveSettings = async function() {
        const cronEnabled = _settings.cron_enabled === 'true' ? 'true' : 'false';
        const zaloEnabled = _settings.zalo_enabled === 'true' ? 'true' : 'false';
        const zaloAccessToken = document.getElementById('ghct-zalo-access-token')?.value?.trim() || '';
        const zaloUserId = document.getElementById('ghct-zalo-user-id')?.value?.trim() || '';
        const zaloWebhook = document.getElementById('ghct-zalo-webhook')?.value?.trim() || '';

        try {
            const res = await fetch('/api/gioihanchitieu/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    settings: {
                        cron_enabled: cronEnabled,
                        zalo_enabled: zaloEnabled,
                        zalo_access_token: zaloAccessToken,
                        zalo_user_id: zaloUserId,
                        zalo_webhook_url: zaloWebhook
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                _showToast('✅ Đã lưu cài đặt thành công!', 'success');
                _settings.cron_enabled = cronEnabled;
                _settings.zalo_enabled = zaloEnabled;
                _settings.zalo_access_token = zaloAccessToken;
                _settings.zalo_user_id = zaloUserId;
                _settings.zalo_webhook_url = zaloWebhook;
                _renderContent();
            } else {
                _showToast('❌ ' + (data.error || 'Lỗi lưu cài đặt'), 'error');
            }
        } catch (e) {
            _showToast('❌ Lỗi: ' + e.message, 'error');
        }
    };

    // [ĐÃ XÓA] PERMISSIONS TAB — phân quyền giờ dựa vào assigned_staff_name
    // Cấu hình ở trang Cài Đặt Tài Khoản Ads → NV Phụ Trách

    // ========== TOAST ==========
    function _showToast(message, type) {
        const existing = document.getElementById('ghct-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'ghct-toast';
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 99999;
            animation: ghct-slideIn 0.3s ease;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            max-width: 400px;
            ${type === 'success' ? 'background: #059669; color: white;' : 'background: #dc2626; color: white;'}
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ========== STYLES ==========
    if (!document.getElementById('ghct-styles')) {
        const style = document.createElement('style');
        style.id = 'ghct-styles';
        style.textContent = `
            @keyframes ghct-fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes ghct-slideIn {
                from { opacity: 0; transform: translateX(100px); }
                to { opacity: 1; transform: translateX(0); }
            }
            #ghct-root select:focus,
            #ghct-root input:focus {
                border-color: #0284c7 !important;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1) !important;
            }
            #ghct-root button:hover {
                transform: translateY(-1px);
                filter: brightness(1.05);
            }
            .ghct-mobile-view { display: none; }
            .ghct-desktop-view { display: block; }
            .ghct-config-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            @media (max-width: 768px), body.is-mobile-page, .is-mobile-page {
                .ghct-mobile-view { display: block !important; }
                .ghct-desktop-view { display: none !important; }

                #ghct-root {
                    padding: 8px 4px !important;
                    margin: 0 !important;
                }
                #ghct-header {
                    padding: 16px !important;
                    border-radius: 14px !important;
                    margin-bottom: 12px !important;
                }
                #ghct-header h1 {
                    font-size: 20px !important;
                }
                #ghct-header p {
                    font-size: 12px !important;
                }
                #ghct-account-section {
                    padding: 12px !important;
                    border-radius: 14px !important;
                    margin-bottom: 12px !important;
                }
                #ghct-account-cards-grid {
                    grid-template-columns: 1fr !important;
                    gap: 10px !important;
                }
                #ghct-controls {
                    padding: 10px !important;
                    border-radius: 14px !important;
                    margin-bottom: 12px !important;
                }
                #ghct-tabs {
                    width: 100% !important;
                    margin-left: 0 !important;
                    margin-top: 8px !important;
                }
                #ghct-tabs button {
                    flex: 1 !important;
                    text-align: center !important;
                    padding: 8px 4px !important;
                    font-size: 12px !important;
                }
                .ghct-config-grid {
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                }
                .ghct-slot-row {
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                    padding: 10px !important;
                }
                .ghct-action-btns {
                    flex-direction: column !important;
                    gap: 10px !important;
                }
                .ghct-action-btns button {
                    width: 100% !important;
                    justify-content: center !important;
                    padding: 12px !important;
                    font-size: 14px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ========== INIT ==========
    async function _init() {
        if (!window._currentUser && !window.__currentUser) {
            try {
                const meRes = await fetch('/api/auth/me', { credentials: 'include' });
                const meData = await meRes.json();
                if (meData && meData.user) {
                    window._currentUser = meData.user;
                    const r = (meData.user.role || '').toLowerCase();
                    _isGD = r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!meData.user.is_admin;
                }
            } catch(e) {}
        } else {
            const u = window.__currentUser || window._currentUser;
            if (u) {
                const r = (u.role || '').toLowerCase();
                _isGD = r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!u.is_admin;
            }
        }
        await _loadAccounts();
        if (_isGD) {
            await _loadSettings();
        }
    }

    _init();
};
