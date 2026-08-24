// ============================================================================
// ⏰ 3. HẸN GIỜ BẬT CAMP CHỈ ĐỊNH — FRONTEND PAGE RENDERER
// ============================================================================

(function() {
    let _selectedAccountId = 'all';
    let _accounts = [];
    let _campaigns = [];
    let _schedules = [];
    let _logs = [];
    let _holidaysMap = {}; // 'YYYY-MM-DD' => holiday_name
    let _searchTimer = null;

    async function _loadHgbcHolidays() {
        try {
            const res = await fetch('/api/holidays', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const list = data.holidays || [];
                _holidaysMap = {};
                list.forEach(h => {
                    const dateStr = String(h.holiday_date || '').slice(0, 10);
                    if (dateStr) _holidaysMap[dateStr] = h.holiday_name || 'Ngày Lễ';
                });
            }
        } catch(e) { console.error('[Hgbc Load Holidays Error]', e); }
    }

    window.renderHengiobatcampPage = async function(container) {
        if (!container) return;

        // Current Vietnam Date & Month info
        const now = new Date();
        const todayVnStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentQuarter = Math.ceil(currentMonth / 3); // 1-4

        // Default Date Range: 1st of month to today
        const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

        container.innerHTML = `
            <style>
                @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

                .hgbc-wrapper {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                /* HEADER BANNER */
                .hgbc-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 75%, #4338ca 100%);
                    color: #ffffff;
                    padding: 32px;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px -12px rgba(49, 46, 129, 0.5);
                    margin-bottom: 24px;
                    position: relative;
                    overflow: hidden;
                }
                .hgbc-header::before {
                    content: '';
                    position: absolute;
                    top: -60px; right: -60px;
                    width: 220px; height: 220px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 50%;
                }
                .hgbc-header::after {
                    content: '';
                    position: absolute;
                    bottom: -40px; left: -40px;
                    width: 160px; height: 160px;
                    background: rgba(255,255,255,0.04);
                    border-radius: 50%;
                }
                .hgbc-header-inner {
                    position: relative;
                    z-index: 1;
                }
                .hgbc-header-badges {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .hgbc-badge-fb {
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.25);
                    backdrop-filter: blur(12px);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }
                .hgbc-badge-tz {
                    background: rgba(99,102,241,0.3);
                    border: 1px solid rgba(255,255,255,0.15);
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #c7d2fe;
                }
                .hgbc-title {
                    font-size: 28px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.35);
                    margin: 0;
                }
                .hgbc-subtitle {
                    margin: 8px 0 0;
                    color: #e0e7ff;
                    font-size: 14px;
                    font-weight: 500;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.3);
                }

                /* ACC CARDS SECTION */
                .hgbc-acc-section {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
                .hgbc-acc-sec-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .hgbc-acc-sec-title {
                    margin: 0;
                    font-size: 17px;
                    font-weight: 800;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .hgbc-acc-sec-subtitle {
                    font-size: 12px;
                    color: #64748b;
                    margin-top: 2px;
                }
                .hgbc-count-badge {
                    background: #eef2ff;
                    color: #4338ca;
                    font-weight: 800;
                    font-size: 12px;
                    padding: 3px 10px;
                    border-radius: 20px;
                    border: 1px solid #c7d2fe;
                }
                .hgbc-acc-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 14px;
                    margin-top: 14px;
                }

                /* PANELS */
                .hgbc-panel {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
                .hgbc-panel-title {
                    font-size: 17px;
                    font-weight: 800;
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
                    font-family: inherit;
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
                    font-family: inherit;
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
                    font-family: inherit;
                }
                .hgbc-btn-primary {
                    background: linear-gradient(135deg, #4338ca, #6366f1);
                    color: #ffffff;
                    font-weight: 800;
                    box-shadow: 0 4px 15px rgba(67,56,202,0.35);
                }
                .hgbc-btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(67,56,202,0.45);
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
                .hgbc-btn-ghost {
                    background: #e2e8f0;
                    color: #1e293b;
                    font-weight: 700;
                }
                .hgbc-btn-ghost:hover {
                    background: #cbd5e1;
                }

                /* TABLE STYLES */
                .hgbc-table-container {
                    overflow-x: auto;
                    border-radius: 12px;
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
                    padding: 12px 14px;
                    border-bottom: 1.5px solid #cbd5e1;
                    white-space: nowrap;
                }
                .hgbc-table td {
                    padding: 12px 14px;
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

                /* MOBILE RESPONSIVE */
                @media (max-width: 768px), body.is-mobile-page {
                    .hgbc-wrapper {
                        padding: 8px 6px 160px 6px !important;
                    }
                    .hgbc-header {
                        padding: 16px 14px !important;
                        border-radius: 16px !important;
                        margin-bottom: 12px !important;
                    }
                    .hgbc-title {
                        font-size: 19px !important;
                    }
                    .hgbc-subtitle {
                        display: none !important;
                    }
                    .hgbc-acc-section, .hgbc-panel {
                        padding: 12px 10px !important;
                        border-radius: 16px !important;
                        margin-bottom: 12px !important;
                    }
                    .hgbc-acc-grid {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                    }
                    .hgbc-table {
                        min-width: 700px !important;
                    }
                }
            </style>

            <div class="hgbc-wrapper">
                <!-- HEADER BANNER -->
                <div class="hgbc-header">
                    <div class="hgbc-header-inner">
                        <div class="hgbc-header-badges">
                            <span class="hgbc-badge-fb">Facebook Ads</span>
                            <span class="hgbc-badge-tz">🕐 Múi Giờ: Việt Nam (UTC+7)</span>
                        </div>
                        <h1 class="hgbc-title">⏰ 3. Hẹn Giờ Bật Camp Chỉ Định</h1>
                        <p class="hgbc-subtitle">Quản lý & tự động BẬT các chiến dịch Facebook Ads chỉ định theo khung giờ & ngày tùy chọn</p>
                    </div>
                </div>

                <!-- CARDS TÀI KHOẢN QC -->
                <div class="hgbc-acc-section">
                    <div class="hgbc-acc-sec-header">
                        <span style="font-size: 22px;">📡</span>
                        <div>
                            <h3 class="hgbc-acc-sec-title">
                                Danh Sách Tài Khoản Facebook Ads
                                <span id="hgbc-acc-count-badge" class="hgbc-count-badge">... TK</span>
                            </h3>
                            <div class="hgbc-acc-sec-subtitle">Bấm vào thẻ tài khoản bên dưới để chọn cấu hình cho tài khoản đó.</div>
                        </div>
                    </div>
                    <div id="hgbc-acc-grid" class="hgbc-acc-grid">
                        <div style="padding: 20px; text-align: center; color: #64748b;">🔄 Đang tải tài khoản QC...</div>
                    </div>
                </div>

                <!-- TẠO LỊCH HẸN GIỜ MỚI -->
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

                            <!-- KHUNG GIỜ BẬT (24h Custom Selector giống Ảnh 2) -->
                            <div class="hgbc-form-group">
                                <label>Khung Giờ BẬT (HH:mm) *</label>
                                <div style="display: flex; align-items: center; gap: 6px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 5px 10px; width: fit-content;">
                                    <span style="font-size: 15px; color: #64748b;">⏰</span>
                                    <select id="hgbc-form-hour" class="hgbc-select" style="padding: 4px 6px; font-weight: 800; font-size: 14px; font-family: monospace; border: 1px solid #cbd5e1; border-radius: 6px;">
                                        ${Array.from({length: 24}, (_, i) => {
                                            const h = String(i).padStart(2, '0');
                                            const sel = h === '03' ? 'selected' : '';
                                            return `<option value="${h}" ${sel}>${h}</option>`;
                                        }).join('')}
                                    </select>
                                    <span style="font-weight: 900; font-size: 16px; color: #334155;">:</span>
                                    <select id="hgbc-form-minute" class="hgbc-select" style="padding: 4px 6px; font-weight: 800; font-size: 14px; font-family: monospace; border: 1px solid #cbd5e1; border-radius: 6px;">
                                        ${Array.from({length: 60}, (_, i) => {
                                            const m = String(i).padStart(2, '0');
                                            const sel = m === '00' ? 'selected' : '';
                                            return `<option value="${m}" ${sel}>${m}</option>`;
                                        }).join('')}
                                    </select>
                                    <span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 11px; font-weight: 800; padding: 3px 7px; border-radius: 6px; margin-left: 2px;">24h</span>
                                </div>
                            </div>
                        </div>

                        <!-- CHẾ ĐỘ HẸN GIỜ: 1 Lần / Lặp lại -->
                        <div class="hgbc-form-group" style="margin-top: 16px;">
                            <label>Chế Độ Hẹn Giờ *</label>
                            <div style="display: flex; gap: 6px; margin-top: 4px;">
                                <button type="button" id="hgbc-mode-one_time" onclick="window._toggleScheduleMode('one_time')" class="hgbc-day-btn selected" style="padding: 8px 16px; font-size: 13px;">
                                    1️⃣ Chỉ Bật 1 Lần
                                </button>
                                <button type="button" id="hgbc-mode-recurring" onclick="window._toggleScheduleMode('recurring')" class="hgbc-day-btn" style="padding: 8px 16px; font-size: 13px;">
                                    🔄 Lặp Lại Hàng Tuần
                                </button>
                            </div>
                        </div>

                        <!-- NGÀY BẬT CỤ THỂ (1 Lần - Hiển thị mặc định) -->
                        <div id="hgbc-onetime-section" class="hgbc-form-group" style="margin-top: 14px;">
                            <label>Ngày Bật Cụ Thể *</label>
                            <input type="date" id="hgbc-form-onetime-date" class="hgbc-input" style="max-width: 260px;" value="${todayVnStr}" min="${todayVnStr}" onchange="window._onHgbcDateChange(this.value)" />
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">💡 Chỉ cho chọn ngày HÔM NAY hoặc TƯƠNG LAI (Chặn chọn Ngày Lễ theo Setup Ngày Lễ). Bật 1 lần rồi tự động TẮT & XÓA khỏi danh sách cấu hình.</div>
                        </div>

                        <!-- NGÀY ÁP DỤNG (Lặp lại - Ẩn mặc định) -->
                        <div id="hgbc-recurring-section" class="hgbc-form-group" style="margin-top: 14px; display: none;">
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
                            <button type="submit" id="hgbc-submit-btn" class="hgbc-btn hgbc-btn-primary">
                                ⚡ Kích Hoạt Hẹn Giờ
                            </button>
                        </div>
                    </form>
                </div>

                <!-- DANH SÁCH LỊCH HẸN GIỜ -->
                <div class="hgbc-panel">
                    <div class="hgbc-panel-title" style="justify-content: space-between;">
                        <span>📋 Danh Sách Lịch Hẹn Giờ Đang Cấu Hình</span>
                        <button class="hgbc-btn hgbc-btn-sm hgbc-btn-ghost" onclick="window._loadHgbcSchedules()">🔄 Tải lại</button>
                    </div>
                    <div class="hgbc-table-container">
                        <table class="hgbc-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tài Khoản QC</th>
                                    <th>Chiến Dịch Chỉ Định</th>
                                    <th>Giờ Bật</th>
                                    <th>Ngày Áp Dụng / Ngày Bật</th>
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

                <!-- LOGS LỊCH SỬ KÈM BỘ LỌC CHUẨN ĐẸP GIỐNG THỐNG KÊ CAMP (ẢNH 5) -->
                <div class="hgbc-panel">
                    <div class="hgbc-panel-title" style="justify-content: space-between;">
                        <span>📜 Nhật Ký Thực Thi Hẹn Giờ Bật Camp</span>
                        <button class="hgbc-btn hgbc-btn-sm hgbc-btn-ghost" onclick="window._loadHgbcLogs()">🔄 Tải lại Nhật Ký</button>
                    </div>

                    <!-- BỘ LỌC ĐA NĂNG (Tháng, Quý, Ngày & Search) -->
                    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <!-- Filter Mode Selector -->
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <label style="font-weight: 700; font-size: 13px; color: #1e293b; white-space: nowrap;">📅 Lọc theo:</label>
                                <select id="hgbc-filter-mode" onchange="window._onHgbcFilterModeChange(this.value)" style="
                                    padding: 8px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; background: #ffffff; color: #1d4ed8; outline: none; cursor: pointer;
                                ">
                                    <option value="month" selected>📅 Theo Tháng</option>
                                    <option value="quarter">📊 Theo Quý</option>
                                    <option value="date_range">📆 Theo Ngày (Bảng Lịch)</option>
                                </select>
                            </div>

                            <!-- Month Mode Controls -->
                            <div id="hgbc-filter-month-wrap" style="display: flex; align-items: center; gap: 8px;">
                                <select id="hgbc-filter-month" onchange="window._loadHgbcLogs()" style="padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 600; background: white; cursor: pointer;">
                                    ${Array.from({length: 12}, (_, i) => `<option value="${i+1}" ${i+1 === currentMonth ? 'selected' : ''}>Tháng ${i+1}</option>`).join('')}
                                </select>
                                <select id="hgbc-filter-year" onchange="window._loadHgbcLogs()" style="padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 600; background: white; cursor: pointer;">
                                    <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>Năm 2025</option>
                                    <option value="2026" ${currentYear === 2026 ? 'selected' : ''}>Năm 2026</option>
                                    <option value="2027" ${currentYear === 2027 ? 'selected' : ''}>Năm 2027</option>
                                </select>
                            </div>

                            <!-- Quarter Mode Controls -->
                            <div id="hgbc-filter-quarter-wrap" style="display: none; align-items: center; gap: 8px;">
                                <select id="hgbc-filter-quarter" onchange="window._loadHgbcLogs()" style="padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 700; background: white; cursor: pointer; color: #0f172a;">
                                    <option value="1" ${currentQuarter === 1 ? 'selected' : ''}>Quý 1 (Tháng 1 - Tháng 3)</option>
                                    <option value="2" ${currentQuarter === 2 ? 'selected' : ''}>Quý 2 (Tháng 4 - Tháng 6)</option>
                                    <option value="3" ${currentQuarter === 3 ? 'selected' : ''}>Quý 3 (Tháng 7 - Tháng 9)</option>
                                    <option value="4" ${currentQuarter === 4 ? 'selected' : ''}>Quý 4 (Tháng 10 - Tháng 12)</option>
                                </select>
                                <select id="hgbc-filter-qyear" onchange="window._loadHgbcLogs()" style="padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 600; background: white; cursor: pointer;">
                                    <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>Năm 2025</option>
                                    <option value="2026" ${currentYear === 2026 ? 'selected' : ''}>Năm 2026</option>
                                    <option value="2027" ${currentYear === 2027 ? 'selected' : ''}>Năm 2027</option>
                                </select>
                            </div>

                            <!-- Date Range Calendar Mode Controls -->
                            <div id="hgbc-filter-daterange-wrap" style="display: none; align-items: center; gap: 8px;">
                                <input type="date" id="hgbc-filter-fromdate" value="${firstDayOfMonth}" onchange="window._loadHgbcLogs()" style="padding: 7px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px;" />
                                <span style="font-size: 12px; color: #64748b; font-weight: 600;">đến</span>
                                <input type="date" id="hgbc-filter-todate" value="${todayVnStr}" onchange="window._loadHgbcLogs()" style="padding: 7px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px;" />
                            </div>
                        </div>

                        <!-- Ô Tìm kiếm tên camp, ID camp -->
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; max-width: 380px; min-width: 240px;">
                            <div style="position: relative; width: 100%;">
                                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 14px;">🔍</span>
                                <input type="text" id="hgbc-filter-search" oninput="window._onHgbcSearchInput()" placeholder="Tìm tên camp, ID camp, Post ID..." style="width: 100%; padding: 8px 12px 8px 32px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 13px; outline: none; background: white; transition: border 0.15s;" />
                            </div>
                        </div>
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
        await _loadHgbcHolidays();
        await window._loadHgbcAccounts();
        await window._loadHgbcSchedules();
        await window._loadHgbcLogs();
    };

    // Helper: Fetch Accounts & Render Cards (Giống ảnh 2 - tatbatfbads style)
    window._loadHgbcAccounts = async function() {
        try {
            const res = await fetch('/api/hengiobatcamp/accounts', { credentials: 'include' });
            const data = await res.json();
            _accounts = data.accounts || [];

            const countBadge = document.getElementById('hgbc-acc-count-badge');
            if (countBadge) countBadge.textContent = `${_accounts.length} TK`;

            // Populate Form Select
            const formAccSelect = document.getElementById('hgbc-form-acc-select');
            if (formAccSelect) {
                formAccSelect.innerHTML = `<option value="">-- Chọn Tài Khoản --</option>` +
                    _accounts.map(a => `<option value="${a.id}">${a.account_name} (${a.fb_ad_account_id || 'Chưa link ID'})</option>`).join('');
            }

            // Render Account Grid Cards (matching tatbatfbads style)
            _renderHgbcAccountCards();
        } catch (e) {
            console.error('[Hgbc Load Accounts Error]', e);
        }
    };

    function _renderHgbcAccountCards() {
        const grid = document.getElementById('hgbc-acc-grid');
        if (!grid) return;

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

        // "Tất Cả Tài Khoản" card
        let cardsHtml = `
            <div onclick="window._selectHgbcAccount('all')" style="
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

        // Individual account cards
        cardsHtml += _accounts.map(acc => {
            const isSelected = String(_selectedAccountId) === String(acc.id);
            const rawId = (acc.fb_ad_account_id || '').replace(/^act_/, '');
            const displayId = rawId ? `act_${rawId}` : 'chưa cài';
            const adsManagerUrl = acc.fb_ad_account_link || (rawId ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawId}` : '');
            const staffName = acc.assigned_staff_name || 'Giám Đốc';

            // Count schedules for this account
            const accSchedules = _schedules.filter(s => s.account_id === acc.id);
            const activeCount = accSchedules.filter(s => s.is_active !== false).length;

            return `
                <div onclick="window._selectHgbcAccount(${acc.id})" style="
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
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                            <span style="color: #64748b; font-size: 11px;">⏰ Lịch Hẹn Active:</span>
                            <span style="font-size: 11px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 2px 6px; border-radius: 6px;">
                                ${activeCount} lịch hẹn
                            </span>
                        </div>
                    </div>
                    <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                        <span style="font-size: 11px; font-weight: 700; color: ${isSelected ? '#4338ca' : '#94a3b8'};">
                            ${isSelected ? '✔ ĐANG CẤU HÌNH' : 'Bấm để chọn'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        grid.innerHTML = cardsHtml;
    }

    // Helper: Select Account Card
    window._selectHgbcAccount = function(accId) {
        _selectedAccountId = accId;
        _renderHgbcAccountCards();

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

    // Helper: Toggle schedule mode (recurring vs one_time)
    let _scheduleMode = 'one_time';
    window._toggleScheduleMode = function(mode) {
        _scheduleMode = mode;
        const recurringBtn = document.getElementById('hgbc-mode-recurring');
        const oneTimeBtn = document.getElementById('hgbc-mode-one_time');
        const recurringSection = document.getElementById('hgbc-recurring-section');
        const oneTimeSection = document.getElementById('hgbc-onetime-section');
        const submitBtn = document.getElementById('hgbc-submit-btn');

        // Múi giờ Việt Nam hiện tại (UTC+7)
        const now = new Date();
        const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD

        if (mode === 'one_time') {
            oneTimeBtn.classList.add('selected');
            recurringBtn.classList.remove('selected');
            if (recurringSection) recurringSection.style.display = 'none';
            if (oneTimeSection) oneTimeSection.style.display = '';
            if (submitBtn) submitBtn.innerHTML = '⚡ Kích Hoạt Hẹn Giờ';

            const dateInput = document.getElementById('hgbc-form-onetime-date');
            if (dateInput) {
                dateInput.min = vnDateStr; // Đặt ngày tối thiểu là ngày hôm nay
                if (!dateInput.value || dateInput.value < vnDateStr) {
                    dateInput.value = vnDateStr;
                }
                // Check if default value is a holiday
                if (_holidaysMap[dateInput.value]) {
                    window._onHgbcDateChange(dateInput.value);
                }
            }
        } else {
            recurringBtn.classList.add('selected');
            oneTimeBtn.classList.remove('selected');
            if (recurringSection) recurringSection.style.display = '';
            if (oneTimeSection) oneTimeSection.style.display = 'none';
            if (submitBtn) submitBtn.innerHTML = '➕ Lưu Lịch Hẹn Giờ Bật';
        }
    };

    // Helper: Date Change Validation
    window._onHgbcDateChange = function(val) {
        if (!val) return;
        const now = new Date();
        const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        // 1. Kiểm tra ngày quá khứ
        if (val < vnDateStr) {
            alert(`⚠️ Không thể chọn ngày trong quá khứ (${val})!\nVui lòng chọn từ ngày hôm nay (${vnDateStr}) trở đi.`);
            document.getElementById('hgbc-form-onetime-date').value = vnDateStr;
            return;
        }

        // 2. Kiểm tra Ngày Lễ (theo trang Setup Ngày Lễ)
        if (_holidaysMap[val]) {
            alert(`⚠️ Ngày ${val} là Ngày Lễ ("${_holidaysMap[val]}") theo trang Setup Ngày Lễ!\nVui lòng chọn ngày làm việc khác.`);
            document.getElementById('hgbc-form-onetime-date').value = '';
            return;
        }
    };

    // Helper: Save Schedule
    window._handleSaveHgbcSchedule = async function(e) {
        e.preventDefault();

        const accId = document.getElementById('hgbc-form-acc-select')?.value;
        const campSelect = document.getElementById('hgbc-form-camp-select');
        const campId = campSelect?.value;
        const selectedOption = campSelect?.options[campSelect.selectedIndex];
        const campName = selectedOption ? decodeURIComponent(selectedOption.getAttribute('data-name') || campId) : campId;
        
        // 24h Time Selector values
        const hour = document.getElementById('hgbc-form-hour')?.value || '03';
        const minute = document.getElementById('hgbc-form-minute')?.value || '00';
        const enableTime = `${hour}:${minute}`;

        if (!accId || !campId || !enableTime) {
            alert('Vui lòng điền đầy đủ Tài Khoản, Chiến Dịch và Khung Giờ Bật!');
            return;
        }

        // Standard VN Time Validation
        const now = new Date();
        const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
        const vnTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 5); // HH:mm

        const payload = {
            account_id: accId,
            campaign_id: campId,
            campaign_name: campName,
            enable_time: enableTime,
            schedule_type: _scheduleMode
        };

        if (_scheduleMode === 'one_time') {
            const otDate = document.getElementById('hgbc-form-onetime-date')?.value;
            if (!otDate) {
                alert('Vui lòng chọn Ngày Bật Cụ Thể cho lịch hẹn 1 lần!');
                return;
            }
            if (otDate < vnDateStr) {
                alert(`⚠️ Ngày bật (${otDate}) đã ở trong quá khứ! Vui lòng chọn từ ngày hôm nay (${vnDateStr}) trở đi.`);
                return;
            }
            if (_holidaysMap[otDate]) {
                alert(`⚠️ Ngày ${otDate} là Ngày Lễ ("${_holidaysMap[otDate]}") theo trang Setup Ngày Lễ!\nKhông thể đặt lịch hẹn BẬT camp vào ngày nghỉ lễ.`);
                return;
            }
            // Nếu chọn HÔM NAY -> Giờ hẹn phải > giờ VN hiện tại
            if (otDate === vnDateStr && enableTime <= vnTimeStr) {
                alert(`⚠️ Khung giờ BẬT (${enableTime}) phải lớn hơn thời gian hiện tại của giờ Việt Nam (${vnTimeStr} VN) cho ngày hôm nay!`);
                return;
            }
            payload.one_time_date = otDate;
            payload.days = [];
        } else {
            const dayBtns = document.querySelectorAll('#hgbc-days-selector .hgbc-day-btn.selected');
            const days = Array.from(dayBtns).map(b => b.getAttribute('data-day'));
            if (days.length === 0) {
                alert('Vui lòng chọn ít nhất 1 Ngày áp dụng!');
                return;
            }
            payload.days = days;
        }

        try {
            const res = await fetch('/api/hengiobatcamp/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ ' + data.message);
                window._loadHgbcSchedules();
                window._loadHgbcLogs();
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

            // Re-render account cards to update schedule counts
            _renderHgbcAccountCards();

            if (_schedules.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Chưa có lịch hẹn giờ bật chiến dịch nào.</td></tr>`;
                return;
            }

            const dayNames = { '1':'T2', '2':'T3', '3':'T4', '4':'T5', '5':'T6', '6':'T7', '0':'CN' };

            let html = '';
            _schedules.forEach((s, idx) => {
                const isOneTime = s.schedule_type === 'one_time';
                let daysList = '';
                if (isOneTime) {
                    const formattedDate = s.one_time_date ? String(s.one_time_date).slice(0, 10) : 'N/A';
                    daysList = `<span style="display:inline-block; padding:3px 10px; border-radius:8px; font-size:11.5px; font-weight:700; background:#fef3c7; color:#b45309; border:1px solid #fde68a;">1️⃣ 1 Lần (${formattedDate})</span>`;
                } else {
                    daysList = (s.days || '').split(',').filter(Boolean).map(d => {
                        const label = dayNames[d.trim()] || d;
                        const isWeekend = d.trim() === '0';
                        const bg = isWeekend ? '#fef3c7' : '#e0f2fe';
                        const color = isWeekend ? '#b45309' : '#0369a1';
                        const border = isWeekend ? '#fde68a' : '#bae6fd';
                        return `<span style="display:inline-block; padding:2px 7px; border-radius:6px; font-size:11px; font-weight:700; background:${bg}; color:${color}; border:1px solid ${border};">${label}</span>`;
                    }).join(' ');
                }
                const formattedTime = (s.enable_time || '').slice(0, 5); // 18:10 thay vì 18:10:00
                const lastExec = s.last_executed_at ? new Date(s.last_executed_at).toLocaleString('vi-VN') : '—';
                const isActive = s.is_active !== false;

                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='transparent'">
                        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                        <td><strong style="font-size: 13px; color: #0f172a;">${s.account_name || 'TK #' + s.account_id}</strong></td>
                        <td>
                            <div style="font-weight: 800; font-size: 13px; color: #1e293b;">${s.campaign_name}</div>
                            <div style="font-size: 11px; color: #64748b; font-family: monospace;">ID: ${s.campaign_id}</div>
                        </td>
                        <td style="text-align: center; white-space: nowrap;">
                            <span style="
                                display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                                background: #312e81; color: #ffffff; padding: 5px 14px; border-radius: 20px;
                                font-weight: 800; font-size: 13px; font-family: monospace; white-space: nowrap;
                                box-shadow: 0 2px 6px rgba(49, 46, 129, 0.25);
                            ">⏰ ${formattedTime}</span>
                        </td>
                        <td><div style="display: flex; gap: 3px; flex-wrap: wrap;">${daysList}</div></td>
                        <td><span style="font-size: 12px; color: #475569;">${lastExec}</span></td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button onclick="event.stopPropagation(); window._toggleHgbcSchedule(${s.id})" style="
                                display: inline-flex; align-items: center; justify-content: center; gap: 4px;
                                background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#15803d' : '#b91c1c'};
                                border: 1px solid ${isActive ? '#86efac' : '#fca5a5'}; padding: 5px 14px; border-radius: 20px;
                                font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; white-space: nowrap;
                            ">${isActive ? '✅ Đang BẬT' : '⏸️ Đã TẮT'}</button>
                        </td>
                        <td style="white-space: nowrap;">
                            <div style="display:flex; gap:6px;">
                                <button class="hgbc-btn hgbc-btn-sm hgbc-btn-success" onclick="window._executeNowHgbcSchedule(${s.id})" title="Kích hoạt BẬT ngay lập tức">
                                    ⚡ Bật Ngay
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
                // Re-load Schedules (will auto remove 1-time schedule) and Logs
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

    // Helper: Search Input Debounce
    window._onHgbcSearchInput = function() {
        if (_searchTimer) clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
            window._loadHgbcLogs();
        }, 300);
    };

    // Helper: Filter Mode Change (Month / Quarter / Date Range)
    window._onHgbcFilterModeChange = function(mode) {
        const monthWrap = document.getElementById('hgbc-filter-month-wrap');
        const quarterWrap = document.getElementById('hgbc-filter-quarter-wrap');
        const daterangeWrap = document.getElementById('hgbc-filter-daterange-wrap');

        if (monthWrap) monthWrap.style.display = mode === 'month' ? 'flex' : 'none';
        if (quarterWrap) quarterWrap.style.display = mode === 'quarter' ? 'flex' : 'none';
        if (daterangeWrap) daterangeWrap.style.display = mode === 'date_range' ? 'flex' : 'none';

        window._loadHgbcLogs();
    };

    // Helper: Load Logs with Filter Support
    window._loadHgbcLogs = async function() {
        const tbody = document.getElementById('hgbc-logs-tbody');
        if (!tbody) return;

        const filterMode = document.getElementById('hgbc-filter-mode')?.value || 'month';
        const search = document.getElementById('hgbc-filter-search')?.value || '';

        let url = `/api/hengiobatcamp/logs?account_id=${_selectedAccountId}&filter_type=${filterMode}&search=${encodeURIComponent(search)}`;

        if (filterMode === 'month') {
            const m = document.getElementById('hgbc-filter-month')?.value;
            const y = document.getElementById('hgbc-filter-year')?.value;
            if (m && y) url += `&month=${m}&year=${y}`;
        } else if (filterMode === 'quarter') {
            const q = document.getElementById('hgbc-filter-quarter')?.value;
            const y = document.getElementById('hgbc-filter-qyear')?.value;
            if (q && y) url += `&quarter=${q}&year=${y}`;
        } else if (filterMode === 'date_range') {
            const fromDate = document.getElementById('hgbc-filter-fromdate')?.value;
            const toDate = document.getElementById('hgbc-filter-todate')?.value;
            if (fromDate && toDate) url += `&from_date=${fromDate}&to_date=${toDate}`;
        }

        try {
            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            _logs = data.logs || [];

            if (_logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">Chưa có nhật ký thực thi nào khớp với bộ lọc.</td></tr>`;
                return;
            }

            let html = '';
            _logs.forEach(l => {
                const timeStr = new Date(l.executed_at).toLocaleString('vi-VN');
                const isSuccess = l.status === 'success';

                html += `
                    <tr>
                        <td><span style="font-size: 12px; font-weight: 600; color: #475569;">${timeStr}</span></td>
                        <td><strong>${l.account_name || 'TK #' + l.account_id}</strong></td>
                        <td>
                            <div style="font-weight: 700; color: #1e293b;">${l.campaign_name || 'N/A'}</div>
                            <div style="font-size: 11px; color: #64748b; font-family: monospace;">ID: ${l.campaign_id || '—'}</div>
                        </td>
                        <td>
                            <span class="hgbc-status-badge ${isSuccess ? 'hgbc-status-success' : 'hgbc-status-failed'}">
                                ${isSuccess ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}
                            </span>
                        </td>
                        <td><span style="font-size: 12.5px; color: #334155;">${l.reason || '—'}</span></td>
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
