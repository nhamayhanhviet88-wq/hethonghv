// ============================================================================
// ⏰ 3. HẸN GIỜ BẬT CAMP CHỈ ĐỊNH — FRONTEND PAGE RENDERER
// ============================================================================

(function() {
    let _selectedAccountId = 'all';
    let _accounts = [];
    let _campaigns = [];
    let _schedules = [];
    let _logs = [];
    let _isLoadingCampaigns = false;

    window.renderHengiobatcampPage = async function(container) {
        if (!container) return;

        container.innerHTML = `
            <style>
                .hgbc-wrapper {
                    padding: 16px;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                .hgbc-header {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
                    color: #ffffff;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(49, 46, 129, 0.3);
                    margin-bottom: 24px;
                }
                .hgbc-title {
                    font-size: 22px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0 0 6px 0;
                }
                .hgbc-subtitle {
                    font-size: 13px;
                    opacity: 0.88;
                    margin: 0;
                }

                /* ACC CARDS CONTAINER */
                .hgbc-acc-section {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
                }
                .hgbc-acc-sec-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .hgbc-acc-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 14px;
                }
                .hgbc-acc-card {
                    border: 2px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 16px;
                    background: #ffffff;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .hgbc-acc-card:hover {
                    border-color: #818cf8;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px -2px rgba(99, 102, 241, 0.12);
                }
                .hgbc-acc-card.active {
                    border-color: #6366f1;
                    background: #f0f3ff;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                }
                .hgbc-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .hgbc-acc-name {
                    font-size: 15px;
                    font-weight: 700;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .hgbc-acc-id {
                    font-size: 11px;
                    color: #64748b;
                    font-family: monospace;
                }
                .hgbc-link-ads {
                    font-size: 11px;
                    color: #3b82f6;
                    text-decoration: none;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                }
                .hgbc-link-ads:hover { text-decoration: underline; }
                .hgbc-acc-meta {
                    font-size: 12px;
                    color: #475569;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px dashed #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                }
                .hgbc-badge-active {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    background: #dcfce7;
                    color: #15803d;
                }

                /* CONTENT LAYOUT */
                .hgbc-panel {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
                }
                .hgbc-panel-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* FORM STYLES */
                .hgbc-form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                }
                .hgbc-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .hgbc-form-group label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                }
                .hgbc-input, .hgbc-select {
                    padding: 9px 12px;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13.5px;
                    outline: none;
                    transition: border 0.15s;
                }
                .hgbc-input:focus, .hgbc-select:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }
                .hgbc-days-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 4px;
                }
                .hgbc-day-btn {
                    padding: 6px 12px;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    background: #f8fafc;
                    color: #475569;
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.15s;
                }
                .hgbc-day-btn.selected {
                    background: #4f46e5;
                    color: #ffffff;
                    border-color: #4f46e5;
                }

                /* BUTTONS */
                .hgbc-btn {
                    padding: 9px 16px;
                    border-radius: 8px;
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s;
                }
                .hgbc-btn-primary {
                    background: #4f46e5;
                    color: #ffffff;
                }
                .hgbc-btn-primary:hover {
                    background: #4338ca;
                    box-shadow: 0 4px 10px -2px rgba(79, 70, 229, 0.4);
                }
                .hgbc-btn-success {
                    background: #10b981;
                    color: #ffffff;
                }
                .hgbc-btn-success:hover { background: #059669; }
                .hgbc-btn-danger {
                    background: #ef4444;
                    color: #ffffff;
                }
                .hgbc-btn-danger:hover { background: #dc2626; }
                .hgbc-btn-sm {
                    padding: 5px 10px;
                    font-size: 12px;
                }

                /* TABLE STYLES */
                .hgbc-table-container {
                    overflow-x: auto;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                .hgbc-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    text-align: left;
                }
                .hgbc-table th {
                    background: #f1f5f9;
                    color: #334155;
                    font-weight: 700;
                    padding: 10px 14px;
                    border-bottom: 1.5px solid #cbd5e1;
                }
                .hgbc-table td {
                    padding: 10px 14px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #1e293b;
                }
                .hgbc-table tbody tr:hover { background: #f8fafc; }
                .hgbc-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-size: 11.5px;
                    font-weight: 600;
                }
                .hgbc-status-active { background: #dcfce7; color: #15803d; }
                .hgbc-status-paused { background: #fee2e2; color: #b91c1c; }
                .hgbc-status-success { background: #dcfce7; color: #166534; }
                .hgbc-status-failed { background: #fef2f2; color: #991b1b; }
            </style>

            <div class="hgbc-wrapper">
                <!-- HEADER -->
                <div class="hgbc-header">
                    <h1 class="hgbc-title">⏰ 3. Hẹn Giờ Bật Camp Chỉ Định</h1>
                    <p class="hgbc-subtitle">Quản lý & tự động BẬT các chiến dịch Facebook Ads chỉ định theo khung giờ & ngày tùy chọn</p>
                </div>

                <!-- CARDS TÀI KHOẢN QC -->
                <div class="hgbc-acc-section">
                    <div class="hgbc-acc-sec-title">
                        📡 Danh Sách Tài Khoản Facebook Ads <span id="hgbc-acc-count-badge" class="hgbc-badge-active">... TK</span>
                    </div>
                    <div id="hgbc-acc-grid" class="hgbc-acc-grid">
                        <div style="padding: 20px; text-align: center; color: #64748b;">🔄 Đang tải tài khoản QC...</div>
                    </div>
                </div>

                <!-- TẠO LỊCH HẸN GIỜ MÓI -->
                <div class="hgbc-panel">
                    <div class="hgbc-panel-title">
                        ➕ Tạo Lịch Hẹn Giờ Bật Chiến Dịch Mới
                    </div>
                    <form id="hgbc-schedule-form" onsubmit="window._handleSaveHgbcSchedule(event)">
                        <div class="hgbc-form-grid">
                            <!-- TK QC -->
                            <div class="hgbc-form-group">
                                <label>Tài Khoản Facebook Ads *</label>
                                <select id="hgbc-form-acc-select" class="hgbc-select" required onchange="window._onHgbcFormAccChange(this.value)">
                                    <option value="">-- Chọn Tài Khoản --</option>
                                </select>
                            </div>

                            <!-- CHIẾN DỊCH -->
                            <div class="hgbc-form-group">
                                <label>Chọn Chiến Dịch Chỉ Định *</label>
                                <select id="hgbc-form-camp-select" class="hgbc-select" required>
                                    <option value="">-- Vui lòng chọn Tài Khoản trước --</option>
                                </select>
                            </div>

                            <!-- KHUNG GIỜ BẬT -->
                            <div class="hgbc-form-group">
                                <label>Khung Giờ BẬT (HH:mm) *</label>
                                <input type="time" id="hgbc-form-time" class="hgbc-input" value="03:00" required />
                            </div>
                        </div>

                        <!-- NGÀY ÁP DỤNG -->
                        <div class="hgbc-form-group" style="margin-top: 14px;">
                            <label>Ngày Áp Dụng *</label>
                            <div id="hgbc-days-selector" class="hgbc-days-group">
                                <span class="hgbc-day-btn selected" data-day="1" onclick="window._toggleDayBtn(this)">Thứ 2</span>
                                <span class="hgbc-day-btn selected" data-day="2" onclick="window._toggleDayBtn(this)">Thứ 3</span>
                                <span class="hgbc-day-btn selected" data-day="3" onclick="window._toggleDayBtn(this)">Thứ 4</span>
                                <span class="hgbc-day-btn selected" data-day="4" onclick="window._toggleDayBtn(this)">Thứ 5</span>
                                <span class="hgbc-day-btn selected" data-day="5" onclick="window._toggleDayBtn(this)">Thứ 6</span>
                                <span class="hgbc-day-btn selected" data-day="6" onclick="window._toggleDayBtn(this)">Thứ 7</span>
                                <span class="hgbc-day-btn selected" data-day="0" onclick="window._toggleDayBtn(this)">Chủ Nhật</span>
                            </div>
                        </div>

                        <div style="margin-top: 18px;">
                            <button type="submit" class="hgbc-btn hgbc-btn-primary">
                                ➕ Lưu Lịch Hẹn Giờ Bật
                            </button>
                        </div>
                    </form>
                </div>

                <!-- DANH SÁCH LỊCH HẸN GIỜ -->
                <div class="hgbc-panel">
                    <div class="hgbc-panel-title" style="justify-content: space-between;">
                        <span>📋 Danh Sách Lịch Hẹn Giờ Đang Cấu Hình</span>
                        <button class="hgbc-btn hgbc-btn-sm" style="background:#e2e8f0; color:#1e293b;" onclick="window._loadHgbcSchedules()">🔄 Tải lại</button>
                    </div>
                    <div class="hgbc-table-container">
                        <table class="hgbc-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tài Khoản QC</th>
                                    <th>Chiến Dịch Chỉ Định</th>
                                    <th>Giờ Bật</th>
                                    <th>Ngày Áp Dụng</th>
                                    <th>Lần Chạy Cuối</th>
                                    <th>Trạng Thái</th>
                                    <th>Hành Động</th>
                                </tr>
                            </thead>
                            <tbody id="hgbc-schedules-tbody">
                                <tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Đang tải danh sách lịch hẹn...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- LOGS LỊCH SỬ -->
                <div class="hgbc-panel">
                    <div class="hgbc-panel-title" style="justify-content: space-between;">
                        <span>📜 Nhật Ký Thực Thi Hẹn Giờ Bật Camp</span>
                        <button class="hgbc-btn hgbc-btn-sm" style="background:#e2e8f0; color:#1e293b;" onclick="window._loadHgbcLogs()">🔄 Tải lại Nhật Ký</button>
                    </div>
                    <div class="hgbc-table-container">
                        <table class="hgbc-table">
                            <thead>
                                <tr>
                                    <th>Thời Gian</th>
                                    <th>Tài Khoản</th>
                                    <th>Tên Chiến Dịch</th>
                                    <th>Trạng Thái</th>
                                    <th>Chi Tiết / Lý Do</th>
                                </tr>
                            </thead>
                            <tbody id="hgbc-logs-tbody">
                                <tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Đang tải nhật ký...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Initial Data Fetching
        await window._loadHgbcAccounts();
        await window._loadHgbcSchedules();
        await window._loadHgbcLogs();
    };

    // Helper: Fetch Accounts
    window._loadHgbcAccounts = async function() {
        try {
            const res = await fetch('/api/hengiobatcamp/accounts', { credentials: 'include' });
            const data = await res.json();
            _accounts = data.accounts || [];

            const countBadge = document.getElementById('hgbc-acc-count-badge');
            if (countBadge) countBadge.innerText = `${_accounts.length} TK`;

            // Populate Form Select
            const formAccSelect = document.getElementById('hgbc-form-acc-select');
            if (formAccSelect) {
                formAccSelect.innerHTML = `<option value="">-- Chọn Tài Khoản --</option>` +
                    _accounts.map(a => `<option value="${a.id}">${a.account_name} (${a.fb_ad_account_id || 'Chưa link ID'})</option>`).join('');
            }

            // Render Account Grid Cards (Ảnh 2 Style)
            const grid = document.getElementById('hgbc-acc-grid');
            if (!grid) return;

            let html = `
                <div class="hgbc-acc-card ${_selectedAccountId === 'all' ? 'active' : ''}" onclick="window._selectHgbcAccount('all')">
                    <div class="hgbc-card-header">
                        <span class="hgbc-acc-name">📋 Tất Cả Tài Khoản</span>
                        <span class="hgbc-badge-active">ĐANG XEM</span>
                    </div>
                    <div class="hgbc-acc-id">Tổng hợp ${_accounts.length} tài khoản QC</div>
                    <div class="hgbc-acc-meta">
                        <span>Bấm để xem tất cả lịch hẹn</span>
                    </div>
                </div>
            `;

            _accounts.forEach(acc => {
                const isSelected = String(_selectedAccountId) === String(acc.id);
                const adLink = acc.fb_ad_account_link || (acc.fb_ad_account_id ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${acc.fb_ad_account_id.replace('act_','')}` : '#');
                html += `
                    <div class="hgbc-acc-card ${isSelected ? 'active' : ''}" onclick="window._selectHgbcAccount(${acc.id})">
                        <div class="hgbc-card-header">
                            <span class="hgbc-acc-name">📊 ${acc.account_name}</span>
                            ${adLink !== '#' ? `<a href="${adLink}" target="_blank" class="hgbc-link-ads" onclick="event.stopPropagation()">🔗 Mở Link Ads</a>` : ''}
                        </div>
                        <div class="hgbc-acc-id">${acc.fb_ad_account_id || 'Chưa gắn ID'}</div>
                        <div class="hgbc-acc-meta">
                            <span>👤 NV Phụ Trách: <strong>${acc.assigned_staff_name || 'Giám Đốc'}</strong></span>
                        </div>
                    </div>
                `;
            });

            grid.innerHTML = html;
        } catch (e) {
            console.error('[Hgbc Load Accounts Error]', e);
        }
    };

    // Helper: Select Account Card
    window._selectHgbcAccount = function(accId) {
        _selectedAccountId = accId;
        window._loadHgbcAccounts();
        
        // Update form account select if specific
        if (accId !== 'all') {
            const formSelect = document.getElementById('hgbc-form-acc-select');
            if (formSelect) {
                formSelect.value = accId;
                window._onHgbcFormAccChange(accId);
            }
        }
        
        window._loadHgbcSchedules();
        window._loadHgbcLogs();
    };

    // Form Account Change -> Load live campaigns from FB
    window._onHgbcFormAccChange = async function(accId) {
        const campSelect = document.getElementById('hgbc-form-camp-select');
        if (!campSelect) return;

        if (!accId) {
            campSelect.innerHTML = `<option value="">-- Vui lòng chọn Tài Khoản trước --</option>`;
            return;
        }

        campSelect.innerHTML = `<option value="">🔄 Đang tải danh sách chiến dịch từ Facebook...</option>`;
        try {
            const res = await fetch(`/api/hengiobatcamp/fb-campaigns?account_id=${accId}`, { credentials: 'include' });
            const data = await res.json();

            if (data.error) {
                campSelect.innerHTML = `<option value="">❌ Lỗi: ${data.error}</option>`;
                return;
            }

            _campaigns = data.campaigns || [];

            if (_campaigns.length === 0) {
                campSelect.innerHTML = `<option value="">(Tài khoản không có chiến dịch nào)</option>`;
                return;
            }

            campSelect.innerHTML = `<option value="">-- Chọn Chiến Dịch (${_campaigns.length} chiến dịch) --</option>` +
                _campaigns.map(c => {
                    const statusText = c.status === 'ACTIVE' ? '🟢 ACTIVE' : '🔴 PAUSED';
                    return `<option value="${c.id}" data-name="${encodeURIComponent(c.name)}">[${statusText}] ${c.name} (ID: ${c.id})</option>`;
                }).join('');
        } catch (e) {
            console.error('[Hgbc Load FB Campaigns Error]', e);
            campSelect.innerHTML = `<option value="">❌ Không thể kết nối Facebook API</option>`;
        }
    };

    // Helper: Day button toggle
    window._toggleDayBtn = function(btn) {
        btn.classList.toggle('selected');
    };

    // Helper: Save Schedule
    window._handleSaveHgbcSchedule = async function(e) {
        e.preventDefault();

        const accId = document.getElementById('hgbc-form-acc-select')?.value;
        const campSelect = document.getElementById('hgbc-form-camp-select');
        const campId = campSelect?.value;
        const selectedOption = campSelect?.options[campSelect.selectedIndex];
        const campName = selectedOption ? decodeURIComponent(selectedOption.getAttribute('data-name') || campId) : campId;
        const enableTime = document.getElementById('hgbc-form-time')?.value;

        // Days
        const dayBtns = document.querySelectorAll('#hgbc-days-selector .hgbc-day-btn.selected');
        const days = Array.from(dayBtns).map(b => b.getAttribute('data-day'));

        if (!accId || !campId || !enableTime) {
            alert('Vui lòng điền đầy đủ Tài Khoản, Chiến Dịch và Khung Giờ Bật!');
            return;
        }

        if (days.length === 0) {
            alert('Vui lòng chọn ít nhất 1 Ngày áp dụng!');
            return;
        }

        try {
            const res = await fetch('/api/hengiobatcamp/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    account_id: accId,
                    campaign_id: campId,
                    campaign_name: campName,
                    enable_time: enableTime,
                    days: days
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ ' + data.message);
                window._loadHgbcSchedules();
            } else {
                alert('❌ Lỗi: ' + (data.error || 'Không thể lưu lịch hẹn'));
            }
        } catch (err) {
            console.error('[Hgbc Save Schedule Error]', err);
            alert('❌ Lỗi hệ thống: ' + err.message);
        }
    };

    // Helper: Load Schedules Table
    window._loadHgbcSchedules = async function() {
        const tbody = document.getElementById('hgbc-schedules-tbody');
        if (!tbody) return;

        try {
            const res = await fetch(`/api/hengiobatcamp/schedules?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _schedules = data.schedules || [];

            if (_schedules.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Chưa có lịch hẹn giờ bật chiến dịch nào.</td></tr>`;
                return;
            }

            const dayNames = { '1':'T2', '2':'T3', '3':'T4', '4':'T5', '5':'T6', '6':'T7', '0':'CN' };

            let html = '';
            _schedules.forEach((s, idx) => {
                const daysList = (s.days || '').split(',').map(d => dayNames[d.trim()] || d).join(', ');
                const lastExec = s.last_executed_at ? new Date(s.last_executed_at).toLocaleString('vi-VN') : '—';
                const isActive = s.is_active !== false;

                html += `
                    <tr>
                        <td><strong>#${idx + 1}</strong></td>
                        <td><strong>${s.account_name || 'TK #' + s.account_id}</strong></td>
                        <td>
                            <div style="font-weight:700; color:#1e293b;">${s.campaign_name}</div>
                            <div style="font-size:11px; color:#64748b; font-family:monospace;">ID: ${s.campaign_id}</div>
                        </td>
                        <td><span style="font-size:14px; font-weight:800; color:#4f46e5;">⏰ ${s.enable_time}</span></td>
                        <td><span style="font-size:12px; font-weight:600; color:#0f172a;">${daysList}</span></td>
                        <td><span style="font-size:12px; color:#475569;">${lastExec}</span></td>
                        <td>
                            <span class="hgbc-status-badge ${isActive ? 'hgbc-status-active' : 'hgbc-status-paused'}">
                                ${isActive ? '🟢 BẬT HẸN' : '🔴 TẠM DỪNG'}
                            </span>
                        </td>
                        <td>
                            <div style="display:flex; gap:6px;">
                                <button class="hgbc-btn hgbc-btn-sm hgbc-btn-success" onclick="window._executeNowHgbcSchedule(${s.id})" title="Kích hoạt BẬT ngay lập tức">
                                    ⚡ Bật Ngay
                                </button>
                                <button class="hgbc-btn hgbc-btn-sm" style="background:#cbd5e1; color:#1e293b;" onclick="window._toggleHgbcSchedule(${s.id})">
                                    ${isActive ? '⏸️ Dừng' : '▶️ Bật'}
                                </button>
                                <button class="hgbc-btn hgbc-btn-sm hgbc-btn-danger" onclick="window._deleteHgbcSchedule(${s.id})">
                                    🗑️ Xóa
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        } catch (e) {
            console.error('[Hgbc Load Schedules Error]', e);
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#ef4444;">❌ Lỗi tải lịch hẹn: ${e.message}</td></tr>`;
        }
    };

    // Helper: Execute Now
    window._executeNowHgbcSchedule = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn phát lệnh BẬT chiến dịch này trên Facebook ngay lập tức?')) return;
        try {
            const res = await fetch(`/api/hengiobatcamp/schedules/${id}/execute-now`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ ' + data.message + '\nKết quả: ' + (data.result?.reason || 'Thành công'));
                window._loadHgbcSchedules();
                window._loadHgbcLogs();
            } else {
                alert('❌ Lỗi: ' + (data.error || 'Không thể thực thi'));
            }
        } catch (e) {
            alert('❌ Lỗi: ' + e.message);
        }
    };

    // Helper: Toggle Schedule
    window._toggleHgbcSchedule = async function(id) {
        try {
            const res = await fetch(`/api/hengiobatcamp/schedules/${id}/toggle`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                window._loadHgbcSchedules();
            }
        } catch (e) {
            console.error('[Hgbc Toggle Schedule Error]', e);
        }
    };

    // Helper: Delete Schedule
    window._deleteHgbcSchedule = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa lịch hẹn giờ bật chiến dịch này?')) return;
        try {
            const res = await fetch(`/api/hengiobatcamp/schedules/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                window._loadHgbcSchedules();
            } else {
                alert('❌ Lỗi: ' + data.error);
            }
        } catch (e) {
            alert('❌ Lỗi: ' + e.message);
        }
    };

    // Helper: Load Logs
    window._loadHgbcLogs = async function() {
        const tbody = document.getElementById('hgbc-logs-tbody');
        if (!tbody) return;

        try {
            const res = await fetch(`/api/hengiobatcamp/logs?account_id=${_selectedAccountId}`, { credentials: 'include' });
            const data = await res.json();
            _logs = data.logs || [];

            if (_logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Chưa có nhật ký thực thi nào.</td></tr>`;
                return;
            }

            let html = '';
            _logs.forEach(l => {
                const timeStr = new Date(l.executed_at).toLocaleString('vi-VN');
                const isSuccess = l.status === 'success';

                html += `
                    <tr>
                        <td><span style="font-size:12px; font-weight:600; color:#475569;">${timeStr}</span></td>
                        <td><strong>${l.account_name || 'TK #' + l.account_id}</strong></td>
                        <td>
                            <div style="font-weight:700; color:#1e293b;">${l.campaign_name || 'N/A'}</div>
                            <div style="font-size:11px; color:#64748b; font-family:monospace;">ID: ${l.campaign_id || '—'}</div>
                        </td>
                        <td>
                            <span class="hgbc-status-badge ${isSuccess ? 'hgbc-status-success' : 'hgbc-status-failed'}">
                                ${isSuccess ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}
                            </span>
                        </td>
                        <td><span style="font-size:12.5px; color:#334155;">${l.reason || '—'}</span></td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        } catch (e) {
            console.error('[Hgbc Load Logs Error]', e);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">❌ Lỗi tải nhật ký: ${e.message}</td></tr>`;
        }
    };
})();
