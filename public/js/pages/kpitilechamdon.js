/* ===== KPI TỈ LỆ CHẬM ĐƠN & ĐƠN LỖI — DESKTOP PAGE ===== */

(function () {
    var _kpiDelayState = {
        year: new Date().getFullYear(),
        segment: 'all', // 'all', 'dongphuc', 'tempet'
        data: null,
        loading: false,
        lines: {
            late: true,     // Mặc định BẬT đường tỉ lệ Trễ Hẹn % (🔴)
            on_time: false, // Mặc định TẮT đường tỉ lệ Đúng Hẹn % (🔵)
            early: false,   // Mặc định TẮT đường tỉ lệ Gửi Sớm % (🟢)
            errors: true    // Mặc định BẬT đường Tổng Đơn Lỗi (⚠️)
        }
    };

    var _resizeHandler = null;

    async function renderKpitilechamdonPage(container) {
        if (!container) {
            container = document.querySelector('.kpi-delay-wrap')?.parentElement || document.getElementById('contentArea') || document.getElementById('ceoMain') || document.getElementById('mainContent');
        }
        if (!container) return;

        // Dynamic Realtime System Year Range
        const now = typeof vnNow === 'function' ? vnNow() : new Date();
        const realCurrentYear = now.getFullYear();

        // Generate Year List dynamically: from max(realCurrentYear, selectedYear) down to 2024
        const topYear = Math.max(realCurrentYear, _kpiDelayState.year);
        const yearList = [];
        for (let y = topYear; y >= 2024; y--) {
            yearList.push(y);
        }
        if (!yearList.includes(_kpiDelayState.year)) {
            yearList.push(_kpiDelayState.year);
            yearList.sort((a, b) => b - a);
        }

        const yearOptionsHtml = yearList.map(y => `<option value="${y}" ${y === _kpiDelayState.year ? 'selected' : ''}>Năm ${y}</option>`).join('');

        // Render Page Layout Container
        container.innerHTML = `
        <div class="kpi-delay-wrap" style="font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; padding: 4px; color: #0f172a;">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
                
                .kpi-delay-wrap * { box-sizing: border-box; }
                .kpi-delay-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; background: #ffffff; padding: 18px 22px; border-radius: 18px; border: 1.5px solid #cbd5e1; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03); }
                .kpi-delay-title { margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 12px; letter-spacing: -0.3px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .kpi-delay-title span { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border-radius: 12px; font-size: 22px; box-shadow: 0 4px 14px rgba(239,68,68,0.3); }
                .kpi-delay-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                
                /* Segment Tabs */
                .kpi-segment-tabs { display: flex; background: #f1f5f9; padding: 4px; border-radius: 12px; border: 1.5px solid #cbd5e1; }
                .kpi-seg-btn {
                    border: none;
                    background: transparent;
                    padding: 9px 18px;
                    border-radius: 99px;
                    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                    letter-spacing: -0.2px;
                }
                .kpi-seg-btn.active {
                    background: #ffffff;
                    color: #0f172a;
                    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.12);
                    font-weight: 900;
                }
                .kpi-seg-btn:hover:not(.active) { color: #0f172a; }

                .kpi-year-select { padding: 9px 16px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 900; color: #0f172a; background: #fff; cursor: pointer; outline: none; transition: all 0.2s; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .kpi-year-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }

                .btn-save-kpi { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; border: none; padding: 10px 20px; border-radius: 11px; font-weight: 900; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(79,70,229,0.3); transition: all 0.2s; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .btn-save-kpi:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.4); }

                /* Card Standard Base */
                .kpi-card { background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 18px; padding: 22px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.04); margin-bottom: 20px; width: 100%; }
                .kpi-card-title { font-size: 15.5px; font-weight: 900; color: #0f172a; margin: 0 0 16px 0; display: flex; justify-content: space-between; align-items: center; letter-spacing: -0.2px; flex-wrap: wrap; gap: 10px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }

                /* Top Layout: Donut on Left, Quarter Table on Right */
                .kpi-top-row { display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: stretch; }
                @media (max-width: 992px) { .kpi-top-row { grid-template-columns: 1fr; } }

                /* Donut Chart Framed Box */
                .kpi-donut-frame {
                    background: #f8fafc;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 14px;
                    padding: 16px 14px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
                }
                .kpi-donut-canvas-wrap { position: relative; width: 155px; height: 155px; }
                .kpi-donut-legend { display: flex; justify-content: center; gap: 10px; font-size: 11.5px; font-weight: 800; margin-top: 12px; flex-wrap: wrap; }
                .kpi-legend-item { display: flex; align-items: center; gap: 4px; }
                .kpi-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

                /* Chart Framed Box */
                .kpi-chart-frame {
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 16px;
                    padding: 16px 12px 12px 12px;
                    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
                    position: relative;
                }

                /* Table Responsive */
                .kpi-table-responsive { width: 100%; overflow-x: auto; border-radius: 14px; border: 1.5px solid #1e293b; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.2); }
                .kpi-quarter-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                
                /* Static Dark Navy Header with Vertical 3D Glossy Reflection */
                .kpi-quarter-table th {
                    background: linear-gradient(180deg, #283a62 0%, #172554 48%, #0f172a 100%);
                    color: #ffffff;
                    padding: 10px 6px;
                    text-align: center;
                    border-bottom: 2px solid #0f172a;
                    white-space: nowrap;
                    font-weight: 900;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
                }

                /* Column "Tổng số đơn" - Static Glossy Dark Orange matching Image 1 */
                .kpi-quarter-table th.th-tong {
                    background: linear-gradient(180deg, #d97706 0%, #b45309 48%, #853205 100%) !important;
                    color: #ffffff !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.2) !important;
                }

                .kpi-quarter-table td { padding: 8px 5px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 700; vertical-align: middle; white-space: nowrap; color: #1e293b; }
                .kpi-quarter-table tbody tr:hover { background: #f8fafc; }

                /* Soft Cream Yellow Summary Row for Full Year */
                .kpi-quarter-table tr.row-total { background: #fef3c7 !important; font-weight: 900; color: #92400e !important; border-top: 2px solid #fde68a; }
                .kpi-quarter-table tr.row-total td { color: #92400e; border-bottom: none; font-size: 12px; }

                /* Compact Badge Pills */
                .badge-status {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3px 10px;
                    border-radius: 8px;
                    font-size: 10.5px;
                    font-weight: 900;
                    text-transform: uppercase;
                    white-space: nowrap;
                    letter-spacing: -0.1px;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }
                .badge-success { background: #dcfce7; color: #15803d; border: 1.5px solid #bbf7d0; box-shadow: 0 2px 6px rgba(21, 128, 61, 0.08); }
                .badge-warning { background: #fef3c7; color: #b45309; border: 1.5px solid #fde68a; box-shadow: 0 2px 6px rgba(180, 83, 9, 0.08); }
                .badge-danger { background: #fee2e2; color: #b91c1c; border: 1.5px solid #fca5a5; box-shadow: 0 2px 6px rgba(185, 28, 28, 0.08); }
                .badge-dark-danger { background: #7f1d1d; color: #ffffff; border: 1.5px solid #991b1b; box-shadow: 0 2px 6px rgba(127, 29, 29, 0.2); }
                .badge-future { background: #f1f5f9; color: #64748b; border: 1.5px solid #cbd5e1; }

                /* Monthly Cards Section */
                .kpi-monthly-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 18px; }
                @media (max-width: 1280px) { .kpi-monthly-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (max-width: 900px) { .kpi-monthly-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 600px) { .kpi-monthly-grid { grid-template-columns: 1fr; } }

                .m-card {
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 16px;
                    padding: 16px;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.03);
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }
                .m-card:hover {
                    border-color: #6366f1;
                    transform: translateY(-3px);
                    box-shadow: 0 10px 28px rgba(99, 102, 241, 0.12);
                }

                @keyframes _kpiGlowPulse {
                    0% { border-color: #f59e0b; box-shadow: 0 0 0 3.5px rgba(245, 158, 11, 0.35), 0 8px 24px rgba(245, 158, 11, 0.18); }
                    50% { border-color: #fbbf24; box-shadow: 0 0 0 5.5px rgba(251, 191, 36, 0.55), 0 10px 30px rgba(251, 191, 36, 0.28); }
                    100% { border-color: #f59e0b; box-shadow: 0 0 0 3.5px rgba(245, 158, 11, 0.35), 0 8px 24px rgba(245, 158, 11, 0.18); }
                }
                .m-card.is-current-month {
                    border: 2px solid #f59e0b !important;
                    background: linear-gradient(180deg, #fffdf5 0%, #ffffff 100%) !important;
                    animation: _kpiGlowPulse 2s infinite ease-in-out !important;
                    z-index: 2;
                }

                .m-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 8px; }
                .m-card-title { font-size: 14.5px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                
                .m-progress-bar { height: 9px; width: 100%; background: #f1f5f9; border-radius: 5px; overflow: hidden; display: flex; margin: 8px 0 12px 0; border: 1px solid #e2e8f0; }
                .m-progress-seg { height: 100%; transition: width 0.3s ease; }

                .m-stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 6px; }
                .m-stat-label { color: #64748b; font-weight: 600; }
                .m-stat-val { font-weight: 800; color: #0f172a; }

                .m-kpi-input-wrap { margin-top: 10px; padding-top: 10px; border-top: 1.5px dashed #cbd5e1; display: flex; flex-direction: column; gap: 6px; }
                .m-kpi-input-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .m-kpi-label { font-size: 11.5px; font-weight: 800; color: #475569; }
                .m-kpi-input { width: 64px; padding: 4px 6px; border: 1.5px solid #cbd5e1; border-radius: 99px; font-size: 12.5px; font-weight: 900; color: #4338ca; text-align: center; outline: none; background: #ffffff; transition: all 0.2s; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .m-kpi-input:focus { border-color: #6366f1; background: #faf5ff; box-shadow: 0 0 0 3.5px rgba(99,102,241,0.18); }
                .m-kpi-input.saved-flash { border-color: #10b981 !important; box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.35) !important; background: #f0fdf4 !important; }
            </style>

            <!-- Top Header -->
            <div class="kpi-delay-header">
                <h1 class="kpi-delay-title">
                    <span>⏱️</span> KPI Tỉ Lệ Chậm Đơn & Thống Kê Đơn Lỗi
                </h1>
                <div class="kpi-delay-actions">
                    <!-- Segment Tabs -->
                    <div class="kpi-segment-tabs">
                        <button class="kpi-seg-btn ${_kpiDelayState.segment === 'all' ? 'active' : ''}" onclick="window._kpiDelaySwitchSegment('all')">🌐 Tất Cả (Cả 2 Lĩnh Vực)</button>
                        <button class="kpi-seg-btn ${_kpiDelayState.segment === 'dongphuc' ? 'active' : ''}" onclick="window._kpiDelaySwitchSegment('dongphuc')">👕 Lĩnh Vực Đồng Phục</button>
                        <button class="kpi-seg-btn ${_kpiDelayState.segment === 'tempet' ? 'active' : ''}" onclick="window._kpiDelaySwitchSegment('tempet')">🏷️ Lĩnh Vực TEM / PET</button>
                    </div>

                    <!-- Year Picker -->
                    <select class="kpi-year-select" id="kpiYearSelect" onchange="window._kpiDelaySwitchYear(this.value)">
                        ${yearOptionsHtml}
                    </select>

                    <!-- Save KPI Target Button -->
                    <button class="btn-save-kpi" onclick="window._kpiDelaySaveTargets()">
                        💾 Lưu KPI Mục Tiêu
                    </button>
                </div>
            </div>

            <!-- Content Container -->
            <div id="kpiDelayBodyArea">
                <div style="text-align:center; padding: 50px; color: #94a3b8; font-weight: 700;">
                    ⏳ Đang tải dữ liệu Tra Soát & Thống Kê KPI...
                </div>
            </div>

            <!-- Modal Cấu Hình KPI & Cam Kết -->
            <div id="kpiTargetModalOverlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
                <div style="background:#ffffff; width:100%; max-width:620px; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; max-height:90vh;">
                    <!-- Modal Header -->
                    <div style="background:linear-gradient(135deg,#1e293b,#0f172a); color:#ffffff; padding:16px 20px; display:flex; align-items:center; justify-content:space-between;">
                        <div id="kpiModalTitle" style="font-size:15px; font-weight:900; letter-spacing:.2px;">⚙️ Cấu Hình KPI & Cam Kết Quản Lý Xưởng</div>
                        <button onclick="window.closeKpiTargetModal()" style="background:none; border:none; color:#94a3b8; font-size:20px; font-weight:900; cursor:pointer; line-height:1;">✕</button>
                    </div>

                    <!-- Modal Body -->
                    <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
                        <!-- Target Inputs Row -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
                            <div>
                                <label style="font-size:12px; font-weight:800; color:#334155; display:block; margin-bottom:4px;">🎯 KPI Trễ Tối Đa (%):</label>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <input type="number" step="0.1" id="kpiModalDelayPct" style="width:100%; padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; font-weight:900; color:#4338ca;">
                                    <span style="font-weight:900; color:#64748b;">%</span>
                                </div>
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:800; color:#334155; display:block; margin-bottom:4px;">⚠️ KPI Lỗi Tối Đa (đơn):</label>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <input type="number" step="1" id="kpiModalTotalErr" style="width:100%; padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; font-weight:900; color:#b45309;">
                                    <span style="font-weight:900; color:#64748b;">đơn</span>
                                </div>
                            </div>
                        </div>

                        <!-- Evaluation Rule Selection (Bắt Buộc Tích Chọn) -->
                        <div style="background:#fffbeb; border:1.5px solid #fde68a; padding:14px; border-radius:10px;">
                            <label style="font-size:12.5px; font-weight:900; color:#92400e; display:block; margin-bottom:8px;">⚖️ Quy Tắc Đánh Giá Đạt KPI (Bắt buộc chọn):</label>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#78350f;">
                                    <input type="radio" name="kpiEvalRule" value="ALL" checked style="accent-color:#d97706; transform:scale(1.15);">
                                    <span>🟢 <b>Bắt buộc ĐẠT CẢ 2</b> (Phải &le; Trễ <b>VÀ</b> &le; Lỗi mới ĐẠT KPI. Thiếu 1 trong 2 tính KHÔNG ĐẠT)</span>
                                </label>
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#78350f;">
                                    <input type="radio" name="kpiEvalRule" value="ANY" style="accent-color:#d97706; transform:scale(1.15);">
                                    <span>🟡 <b>Chỉ cần ĐẠT 1 TRONG 2</b> (Chỉ cần &le; Trễ <b>HOẶC</b> &le; Lỗi là ĐẠT KPI)</span>
                                </label>
                            </div>
                        </div>

                        <!-- Reward Input -->
                        <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; padding:14px; border-radius:10px;">
                            <label style="font-size:12.5px; font-weight:900; color:#166534; display:block; margin-bottom:6px;">🎁 Phần Thưởng Cho Quản Lý Xưởng Khi Đạt KPI:</label>
                            <input type="text" id="kpiModalReward" placeholder="Ví dụ: Thưởng 3.000.000đ cho Quản Lý Xưởng..." style="width:100%; padding:9px 12px; border:1.5px solid #86efac; border-radius:8px; font-size:13px; font-weight:700; color:#14532d; outline:none;">
                        </div>

                        <!-- Commitments Section -->
                        <div style="background:#f8fafc; border:1.5px solid #e2e8f0; padding:14px; border-radius:10px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
                                <label style="font-size:12.5px; font-weight:900; color:#0f172a;">📋 Các Điều Quản Lý Xưởng Cam Kết Thực Hiện:</label>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button type="button" onclick="window.toggleCommitmentSuggestions()" style="padding:5px 10px; background:#fef3c7; color:#b45309; border:1px solid #fde68a; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;" title="Xem danh sách các câu gợi ý cam kết cài đặt sẵn">💡 Xem Gợi Ý Cam Kết</button>
                                    <button type="button" onclick="window.addCommitmentRow('')" style="padding:5px 10px; background:#4f46e5; color:#ffffff; border:none; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">➕ Thêm Cam Kết</button>
                                </div>
                            </div>

                            <!-- Suggestion Panel Box -->
                            <div id="kpiCommitmentSuggestionsPanel" style="display:none; background:#fffbeb; border:1.5px dashed #f59e0b; border-radius:10px; padding:12px; margin-bottom:12px;">
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                                    <span style="font-size:12px; font-weight:900; color:#92400e;">💡 Danh Sách Câu Gợi Ý Cam Kết Mẫu:</span>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <button type="button" onclick="window.addNewPresetSuggestion()" style="padding:3px 8px; background:#dcfce7; color:#15803d; border:1px solid #86efac; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer;" title="Thêm câu gợi ý mẫu mới vào danh sách">+ Thêm Gợi Ý Mới</button>
                                        <button type="button" onclick="window.resetPresetSuggestionsDefault()" style="padding:3px 8px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;" title="Khôi phục danh sách gợi ý mặc định">🔄 Mặc Định</button>
                                        <button type="button" onclick="window.toggleCommitmentSuggestions(false)" style="background:none; border:none; color:#92400e; font-size:14px; font-weight:900; cursor:pointer;">✕</button>
                                    </div>
                                </div>
                                <div id="kpiPresetSuggestionsList" style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto; padding-right:4px;"></div>
                            </div>

                            <div id="kpiModalCommitmentsList"></div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="background:#f1f5f9; padding:12px 20px; display:flex; align-items:center; justify-content:flex-end; gap:10px; border-top:1px solid #e2e8f0;">
                        <button onclick="window.closeKpiTargetModal()" style="padding:8px 16px; background:#ffffff; border:1.5px solid #cbd5e1; color:#475569; font-weight:800; border-radius:8px; cursor:pointer;">Hủy</button>
                        <button id="btnSaveKpiModal" onclick="window.saveKpiTargetModal()" style="padding:8px 20px; background:linear-gradient(135deg,#4f46e5,#4338ca); color:#ffffff; border:none; font-weight:900; border-radius:8px; cursor:pointer; box-shadow:0 4px 12px rgba(79,70,229,0.3);">💾 Lưu KPI & Cam Kết</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        await loadKpiDelayData();
    }

    async function loadKpiDelayData() {
        console.log('[KPI Delay] loadKpiDelayData starting... year:', _kpiDelayState.year, 'segment:', _kpiDelayState.segment);
        const bodyArea = document.getElementById('kpiDelayBodyArea');
        if (!bodyArea) {
            console.error('[KPI Delay] ERROR: kpiDelayBodyArea element NOT found in DOM!');
            return;
        }

        try {
            console.log('[KPI Delay] Fetching API...');
            const res = await fetch(`/api/kpi-delay/stats?year=${_kpiDelayState.year}&segment=${_kpiDelayState.segment}`);
            console.log('[KPI Delay] HTTP Status:', res.status);
            const data = await res.json();
            console.log('[KPI Delay] Data received:', data);

            if (!data.ok) {
                bodyArea.innerHTML = `<div style="color:#ef4444; font-weight:800; text-align:center; padding:40px;">❌ Lỗi: ${data.error || 'Không thể tải dữ liệu'}</div>`;
                return;
            }

            _kpiDelayState.data = data;
            console.log('[KPI Delay] Rendering dashboard...');
            renderKpiDelayDashboard(data);
            console.log('[KPI Delay] Dashboard render finished!');
        } catch (e) {
            console.error('[KPI Delay] loadKpiDelayData error:', e);
            bodyArea.innerHTML = `<div style="color:#ef4444; font-weight:800; text-align:center; padding:40px;">❌ Lỗi kết nối máy chủ: ${e.message}</div>`;
        }
    }

    function getCombinedKpiBadgeHtml(isFuture, totalOrders, delayPct, targetPct, totalErrors, targetErr, evalRule = 'ALL') {
        if (isFuture && totalOrders === 0) {
            return `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
        }
        const isPassDelay = delayPct <= targetPct;
        const isPassErr = targetErr > 0 ? (totalErrors <= targetErr) : true;

        if (evalRule === 'ANY' && targetErr > 0) {
            if (isPassDelay || isPassErr) {
                return `<span class="badge-status badge-success">🔥 ĐẠT KPI (1 TRONG 2)</span>`;
            } else {
                return `<span class="badge-status badge-dark-danger">🔴 KHÔNG ĐẠT KPI</span>`;
            }
        }

        if (targetErr > 0) {
            if (isPassDelay && isPassErr) {
                return `<span class="badge-status badge-success">🔥 ĐẠT KPI TỔNG THỂ</span>`;
            } else if (isPassDelay && !isPassErr) {
                return `<span class="badge-status badge-warning">⚠️ KHÔNG ĐẠT KPI LỖI</span>`;
            } else if (!isPassDelay && isPassErr) {
                return `<span class="badge-status badge-danger">🚨 CHẬM TIẾN ĐỘ</span>`;
            } else {
                return `<span class="badge-status badge-dark-danger">🔴 KHÔNG ĐẠT KPI</span>`;
            }
        } else {
            if (isPassDelay) {
                return `<span class="badge-status badge-success">🔥 ĐẠT KPI</span>`;
            } else {
                return `<span class="badge-status badge-danger">🚨 KHÔNG ĐẠT</span>`;
            }
        }
    }

    function renderKpiDelayDashboard(data) {
        const bodyArea = document.getElementById('kpiDelayBodyArea');
        if (!bodyArea) return;

        const { months, quarters, fullYear, targets } = data;

        const now = typeof vnNow === 'function' ? vnNow() : new Date();
        const realCurrentMonth = now.getMonth() + 1;
        const realCurrentYear = now.getFullYear();

        const quarterMonths = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };

        // Build Quarter Rows
        const quarterRowsHtml = quarters.map(q => {
            const tKey = `quarter_${q.quarter}`;
            const targetPct = targets[tKey] ? targets[tKey].target_max_delay_pct : 5.0;
            const targetErr = targets[tKey] ? (targets[tKey].target_max_total_errors || 0) : 0;

            const [startM] = quarterMonths[q.quarter];
            const isFutureQ = (data.year > realCurrentYear) || (data.year === realCurrentYear && startM > realCurrentMonth);
            const isFutureOrZeroQ = isFutureQ && q.total === 0;

            let badgeDelayHtml = '';
            let badgeErrHtml = '';

            if (isFutureOrZeroQ) {
                badgeDelayHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                badgeErrHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
            } else {
                const isPassDelay = q.delay_pct <= targetPct;
                badgeDelayHtml = `<span class="badge-status ${isPassDelay ? 'badge-success' : 'badge-danger'}">${isPassDelay ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;

                if (targetErr > 0) {
                    const isPassErr = (q.total_errors || 0) <= targetErr;
                    badgeErrHtml = `<span class="badge-status ${isPassErr ? 'badge-success' : 'badge-danger'}">${isPassErr ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                } else {
                    badgeErrHtml = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                }
            }

            return `
            <tr>
                <td style="text-align:left; font-weight:800; color:#0f172a;">${q.name}</td>
                <td style="font-weight:900; color:#b45309; background:#fffbeb; border-radius:6px;">${q.total || 0}</td>
                <td style="color:#059669; font-weight:800;">${q.early || 0}</td>
                <td style="color:#4338ca; font-weight:800;">${q.on_time || 0}</td>
                <td style="color:#dc2626; font-weight:800;">${q.late || 0}</td>
                <td style="font-weight:900; color:${(q.delay_pct || 0) > 0 ? '#b91c1c' : '#15803d'}">${q.delay_pct || 0}%</td>
                <td style="color:#3730a3; font-weight:900;">
                    <input type="number" step="0.1" class="kpi-q-input" data-period="quarter" data-val="${q.quarter}" value="${targetPct}" onchange="window._kpiDelayAutoSaveSingle(this)" oninput="window._kpiDelayUpdateBadgeRealtime(this)" style="width:44px; text-align:center; border:1.5px solid #cbd5e1; border-radius:6px; font-weight:900; padding:2px 2px; color:#3730a3; background:#ffffff;">%
                </td>
                <td id="qBadgeWrap_${q.quarter}">
                    ${badgeDelayHtml}
                </td>
                <!-- Error Columns -->
                <td style="color:#7c3aed; font-weight:800; background:#f3e8ff;">${q.internal_errors || 0} <span style="font-size:10px; color:#6b21a8;">(${q.internal_error_qty || 0} sp)</span></td>
                <td style="color:#dc2626; font-weight:800; background:#fee2e2;">${q.customer_errors || 0} <span style="font-size:10px; color:#991b1b;">(${q.customer_error_qty || 0} sp)</span></td>
                <td style="color:#b45309; font-weight:900; background:#fffbeb;">${q.total_errors || 0} <span style="font-size:10px; color:#92400e;">(${q.total_error_qty || 0} sp)</span></td>
                <td>
                    <input type="number" step="1" class="kpi-q-err-input" data-period="quarter" data-val="${q.quarter}" value="${targetErr}" onchange="window._kpiDelayAutoSaveSingle(this)" oninput="window._kpiDelayUpdateBadgeRealtime(this)" style="width:44px; text-align:center; border:1.5px solid #f59e0b; border-radius:6px; font-weight:900; padding:2px 2px; color:#b45309; background:#ffffff;">
                </td>
                <td id="qBadgeErrWrap_${q.quarter}">
                    ${badgeErrHtml}
                </td>
                <td>
                    <button onclick="window.openKpiTargetModal('quarter', ${q.quarter}, '${q.name}/${data.year}')" style="font-size:10px; font-weight:800; color:#4f46e5; background:#eff6ff; border:1px solid #c7d2fe; padding:3px 6px; border-radius:6px; cursor:pointer;" title="Cấu hình KPI, Phần thưởng & Điều cam kết">⚙️ Cấu Hình</button>
                </td>
            </tr>
            `;
        }).join('');

        // Full Year Row
        const yTargetKey = `year_0`;
        const yTargetPct = targets[yTargetKey] ? targets[yTargetKey].target_max_delay_pct : 5.0;
        const yTargetErr = targets[yTargetKey] ? (targets[yTargetKey].target_max_total_errors || 0) : 0;

        const isFutureYear = (data.year > realCurrentYear) && fullYear.total === 0;
        let yBadgeHtml = '';
        let yBadgeErrHtml = '';

        if (isFutureYear) {
            yBadgeHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
            yBadgeErrHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
        } else {
            const isYPass = fullYear.delay_pct <= yTargetPct;
            yBadgeHtml = `<span class="badge-status ${isYPass ? 'badge-success' : 'badge-danger'}">${isYPass ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;

            if (yTargetErr > 0) {
                const isPassErr = (fullYear.total_errors || 0) <= yTargetErr;
                yBadgeErrHtml = `<span class="badge-status ${isPassErr ? 'badge-success' : 'badge-danger'}">${isPassErr ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
            } else {
                yBadgeErrHtml = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
            }
        }

        const fullYearRowHtml = `
        <tr class="row-total">
            <td style="text-align:left; font-weight:900; color:#92400e;">Cả Năm ${fullYear.year}</td>
            <td style="font-weight:900; font-size:12.5px; color:#b45309;">${fullYear.total || 0}</td>
            <td style="color:#059669; font-weight:900;">${fullYear.early || 0}</td>
            <td style="color:#4338ca; font-weight:900;">${fullYear.on_time || 0}</td>
            <td style="color:#b91c1c; font-weight:900;">${fullYear.late || 0}</td>
            <td style="font-size:12.5px; font-weight:900; color:${(fullYear.delay_pct || 0) > 0 ? '#b91c1c' : '#15803d'}">${fullYear.delay_pct || 0}%</td>
            <td>
                <input type="number" step="0.1" class="kpi-q-input" data-period="year" data-val="0" value="${yTargetPct}" onchange="window._kpiDelayAutoSaveSingle(this)" oninput="window._kpiDelayUpdateBadgeRealtime(this)" style="width:44px; text-align:center; border:1.5px solid #f59e0b; border-radius:6px; font-weight:900; padding:2px 2px; background:#ffffff; color:#92400e;">%
            </td>
            <td id="yBadgeWrap_0">
                ${yBadgeHtml}
            </td>
            <!-- Full Year Error Columns -->
            <td style="color:#7c3aed; font-weight:900;">${fullYear.internal_errors || 0} <span style="font-size:10px; opacity:0.8;">(${fullYear.internal_error_qty || 0} sp)</span></td>
            <td style="color:#dc2626; font-weight:900;">${fullYear.customer_errors || 0} <span style="font-size:10px; opacity:0.8;">(${fullYear.customer_error_qty || 0} sp)</span></td>
            <td style="color:#b45309; font-weight:900;">${fullYear.total_errors || 0} <span style="font-size:10px; opacity:0.8;">(${fullYear.total_error_qty || 0} sp)</span></td>
            <td>
                <input type="number" step="1" class="kpi-q-err-input" data-period="year" data-val="0" value="${yTargetErr}" onchange="window._kpiDelayAutoSaveSingle(this)" oninput="window._kpiDelayUpdateBadgeRealtime(this)" style="width:44px; text-align:center; border:1.5px solid #f59e0b; border-radius:6px; font-weight:900; padding:2px 2px; background:#ffffff; color:#92400e;">
            </td>
            <td id="yBadgeErrWrap_0">
                ${yBadgeErrHtml}
            </td>
            <td>
                <button onclick="window.openKpiTargetModal('year', 0, 'Cả Năm ${fullYear.year}')" style="font-size:10px; font-weight:800; color:#4f46e5; background:#eff6ff; border:1px solid #c7d2fe; padding:3px 6px; border-radius:6px; cursor:pointer;" title="Cấu hình KPI, Phần thưởng & Điều cam kết">⚙️ Cấu Hình</button>
            </td>
        </tr>
        `;

        // Monthly Cards Html
        const monthlyCardsHtml = months.map(m => {
            const mKey = `month_${m.month}`;
            const targetPct = targets[mKey] ? targets[mKey].target_max_delay_pct : 5.0;
            const targetErr = targets[mKey] ? (targets[mKey].target_max_total_errors || 0) : 0;
            const evalRule = targets[mKey] ? (targets[mKey].eval_rule || 'ALL') : 'ALL';
            const rewardText = targets[mKey] ? (targets[mKey].reward_text || '') : '';
            const commitments = targets[mKey] ? (targets[mKey].commitments || []) : [];

            const isCurrentMonth = (data.year === realCurrentYear) && (m.month === realCurrentMonth);
            const isFutureMonth = (data.year > realCurrentYear) || (data.year === realCurrentYear && m.month > realCurrentMonth);

            const mBadgeHtml = getCombinedKpiBadgeHtml(isFutureMonth, m.total || 0, m.delay_pct || 0, targetPct, m.total_errors || 0, targetErr, evalRule);

            return `
            <div class="m-card ${isCurrentMonth ? 'is-current-month' : ''}" id="mCard_${m.month}">
                <div class="m-card-header">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <div class="m-card-title">Tháng ${m.month}/${fullYear.year}</div>
                        ${isCurrentMonth ? '<span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:#ffffff; font-size:9.5px; font-weight:900; padding:2px 6px; border-radius:6px; box-shadow:0 2px 6px rgba(245,158,11,0.3); letter-spacing:.3px;">⭐ HIỆN TẠI</span>' : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <button onclick="window.openKpiTargetModal('month', ${m.month}, 'Tháng ${m.month}/${fullYear.year}')" style="font-size:10px; font-weight:900; color:#4f46e5; background:#eff6ff; border:1px solid #c7d2fe; padding:3px 8px; border-radius:6px; cursor:pointer; transition:all 0.2s;" title="Cấu hình KPI, Quy tắc đánh giá, Phần thưởng & Điều cam kết">⚙️ Cấu Hình KPI</button>
                        <div id="mBadgeWrap_${m.month}">
                            ${mBadgeHtml}
                        </div>
                    </div>
                </div>

                <div class="m-progress-bar">
                    <div class="m-progress-seg" style="width: ${m.early_pct || 0}%; background: #10b981;" title="Gửi Sớm ${m.early_pct || 0}%"></div>
                    <div class="m-progress-seg" style="width: ${m.on_time_pct || 0}%; background: #6366f1;" title="Đúng Hẹn ${m.on_time_pct || 0}%"></div>
                    <div class="m-progress-seg" style="width: ${m.delay_pct || 0}%; background: #ef4444;" title="Trễ Hẹn ${m.delay_pct || 0}%"></div>
                </div>

                <div class="m-stat-row">
                    <span class="m-stat-label">📦 Tổng số đơn:</span>
                    <span class="m-stat-val" style="color:#b45309; background:#fffbeb; padding:1px 8px; border-radius:6px; border:1px solid #fef3c7">${m.total || 0} đơn</span>
                </div>
                <div class="m-stat-row">
                    <span class="m-stat-label">🟢 Gửi Sớm:</span>
                    <span class="m-stat-val" style="color:#059669">${m.early || 0} đơn (${m.early_pct || 0}%)</span>
                </div>
                <div class="m-stat-row">
                    <span class="m-stat-label">🟡 Đúng Hẹn:</span>
                    <span class="m-stat-val" style="color:#4338ca">${m.on_time || 0} đơn (${m.on_time_pct || 0}%)</span>
                </div>
                <div class="m-stat-row">
                    <span class="m-stat-label">🔴 Trễ Hẹn:</span>
                    <span class="m-stat-val" style="color:#dc2626">${m.late || 0} đơn (${m.delay_pct || 0}%)</span>
                </div>

                <!-- Error Stat Summary Section -->
                <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1;">
                    <div class="m-stat-row">
                        <span class="m-stat-label">🟣 Lỗi Nội Bộ:</span>
                        <span class="m-stat-val" style="color:#7c3aed">${m.internal_errors || 0} đơn <span style="font-size:10px; font-weight:600; color:#6b21a8;">(${m.internal_error_qty || 0} sp)</span></span>
                    </div>
                    <div class="m-stat-row">
                        <span class="m-stat-label">🔴 Lỗi Khách Hàng:</span>
                        <span class="m-stat-val" style="color:#dc2626">${m.customer_errors || 0} đơn <span style="font-size:10px; font-weight:600; color:#991b1b;">(${m.customer_error_qty || 0} sp)</span></span>
                    </div>
                    <div class="m-stat-row">
                        <span class="m-stat-label">⚠️ Tổng Đơn Lỗi:</span>
                        <span class="m-stat-val" style="color:#b45309; background:#fff7ed; padding:1px 6px; border-radius:4px; border:1px solid #fed7aa">${m.total_errors || 0} đơn <span style="font-size:10px; font-weight:600;">(${m.total_error_qty || 0} sp)</span></span>
                    </div>
                </div>

                <div class="m-kpi-input-wrap">
                    <div class="m-kpi-input-row">
                        <span class="m-kpi-label">🎯 KPI Trễ Tối Đa:</span>
                        <div>
                            <input type="number" step="0.1" class="m-kpi-input kpi-m-input" data-period="month" data-val="${m.month}" value="${targetPct}" onchange="window._kpiDelayAutoSaveSingle(this)" oninput="window._kpiDelayUpdateBadgeRealtime(this)">
                            <span style="font-size:12px; font-weight:800; color:#475569">%</span>
                        </div>
                    </div>
                    <div class="m-kpi-input-row">
                        <span class="m-kpi-label">⚠️ KPI Lỗi Tối Đa:</span>
                        <div>
                            <input type="number" step="1" class="m-kpi-input kpi-m-err-input" data-period="month" data-val="${m.month}" value="${targetErr}" onchange="window._kpiDelayAutoSaveSingle(this)" oninput="window._kpiDelayUpdateBadgeRealtime(this)" style="color:#b45309; border-color:#f59e0b;">
                            <span style="font-size:12px; font-weight:800; color:#475569">đơn</span>
                        </div>
                    </div>
                </div>

                <!-- Rule Badge & Reward Section -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; gap:4px; flex-wrap:wrap;">
                    <span style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px; border:1px solid #e2e8f0;">
                        ${evalRule === 'ANY' ? '⚖️ Quy tắc: Đạt 1 Trong 2' : '⚖️ Quy tắc: Đạt Cả 2'}
                    </span>
                    ${rewardText ? `<span style="font-size:10px; font-weight:900; color:#166534; background:#dcfce7; border:1px solid #86efac; padding:2px 6px; border-radius:4px;">🎁 ${rewardText}</span>` : ''}
                </div>

                <!-- Commitments Box Section -->
                <div style="margin-top:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:11px; font-weight:900; color:#1e293b;">📋 Cam Kết Quản Lý Xưởng (${commitments.length})</span>
                        <button onclick="window.openKpiTargetModal('month', ${m.month}, 'Tháng ${m.month}/${fullYear.year}')" style="font-size:10px; font-weight:800; color:#4338ca; background:none; border:none; cursor:pointer; text-decoration:underline;">Sửa Cam Kết</button>
                    </div>
                    ${commitments.length > 0 ? `
                        <ul style="margin:0; padding-left:16px; font-size:11px; font-weight:600; color:#334155; line-height:1.4;">
                            ${commitments.map(c => `<li style="margin-bottom:2px;">${c}</li>`).join('')}
                        </ul>
                    ` : `<div style="font-size:10.5px; font-style:italic; color:#94a3b8;">Chưa lập điều cam kết. Bấm <b>⚙️ Cấu Hình KPI</b> để thêm.</div>`}
                </div>
            </div>
            `;
        }).join('');

        bodyArea.innerHTML = `
        <!-- Card 1: Donut & Quarter Summary Table (Full Row Top Card) -->
        <div class="kpi-card">
            <div class="kpi-card-title">
                <span>📊 Tổng Quan Tiến Độ & Thống Kê Đơn Lỗi Phân Kỳ (${data.year})</span>
                <span style="font-size:11px; font-weight:700; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:6px;">Dữ liệu tự động từ Tra Soát & Quản Lý Đơn Lỗi</span>
            </div>
            <div class="kpi-top-row">
                <!-- Framed Donut Box -->
                <div class="kpi-donut-frame">
                    <div style="font-size:12.5px; font-weight:900; color:#1e293b; margin-bottom:10px; text-align:center;">🎯 Cơ Cấu Đơn Hàng Cả Năm</div>
                    <div class="kpi-donut-canvas-wrap">
                        <canvas id="kpiDonutCanvas" width="155" height="155"></canvas>
                    </div>
                    <div class="kpi-donut-legend">
                        <div class="kpi-legend-item"><span class="kpi-dot" style="background:#10b981"></span>Sớm ${fullYear.early_pct}%</div>
                        <div class="kpi-legend-item"><span class="kpi-dot" style="background:#6366f1"></span>Đúng ${fullYear.on_time_pct}%</div>
                        <div class="kpi-legend-item"><span class="kpi-dot" style="background:#ef4444"></span>Trễ ${fullYear.delay_pct}%</div>
                    </div>
                </div>

                <!-- Quarter Table -->
                <div class="kpi-table-responsive">
                    <table class="kpi-quarter-table">
                        <thead>
                            <tr>
                                <th style="text-align:left; color:#ffffff;">Kỳ</th>
                                <th class="th-tong">Tổng số đơn</th>
                                <th style="color:#34d399;">Gửi Sớm</th>
                                <th style="color:#38bdf8;">Đúng Hẹn</th>
                                <th style="color:#f87171;">Trễ Hẹn</th>
                                <th style="color:#fca5a5;">% Trễ Hẹn</th>
                                <th style="color:#c7d2fe;">KPI Trễ</th>
                                <th style="color:#ffffff;">ĐG Trễ</th>
                                <th style="color:#c084fc;">Lỗi Nội Bộ</th>
                                <th style="color:#fca5a5;">Lỗi Khách</th>
                                <th style="color:#fde047;">Tổng Lỗi</th>
                                <th style="color:#fde047;">KPI Lỗi</th>
                                <th style="color:#ffffff;">ĐG Lỗi</th>
                                <th style="color:#ffffff;">⚙️ Cấu Hình</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${quarterRowsHtml}
                            ${fullYearRowHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Card 2: Full-Width 12-Month Bar & Trend Line Chart with Interactive Line Toggles -->
        <div class="kpi-card" style="display:flex; flex-direction:column;">
            <div class="kpi-card-title">
                <span>📈 Biểu Đồ Tiến Độ & Tỉ Lệ Chậm / Đơn Lỗi 12 Tháng (${data.year})</span>
                <div style="font-size:12px; font-weight:700; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <span style="color:#10b981; font-weight:800;">■ Sớm</span>
                    <span style="color:#6366f1; font-weight:800;">■ Đúng</span>
                    <span style="color:#ef4444; font-weight:800;">■ Trễ</span>
                    <span style="color:#cbd5e1; font-weight:400; margin:0 2px;">|</span>
                    <span style="color:#475569; font-weight:800;">Hiển thị Đường Line (% / Đơn):</span>

                    <!-- Interactive Toggle Labels -->
                    <label style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; background:${_kpiDelayState.lines.late ? '#fee2e2' : '#f1f5f9'}; color:${_kpiDelayState.lines.late ? '#dc2626' : '#64748b'}; padding:4px 9px; border-radius:7px; border:1.5px solid ${_kpiDelayState.lines.late ? '#fca5a5' : '#cbd5e1'}; font-weight:800; user-select:none; transition:all 0.2s;">
                        <input type="checkbox" ${_kpiDelayState.lines.late ? 'checked' : ''} onchange="window._kpiDelayToggleLine('late', this.checked)" style="cursor:pointer; accent-color:#dc2626;">
                        ━ 🔴 Trễ (%)
                    </label>

                    <label style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; background:${_kpiDelayState.lines.on_time ? '#e0e7ff' : '#f1f5f9'}; color:${_kpiDelayState.lines.on_time ? '#4338ca' : '#64748b'}; padding:4px 9px; border-radius:7px; border:1.5px solid ${_kpiDelayState.lines.on_time ? '#c7d2fe' : '#cbd5e1'}; font-weight:800; user-select:none; transition:all 0.2s;">
                        <input type="checkbox" ${_kpiDelayState.lines.on_time ? 'checked' : ''} onchange="window._kpiDelayToggleLine('on_time', this.checked)" style="cursor:pointer; accent-color:#4338ca;">
                        ━ 🔵 Đúng (%)
                    </label>

                    <label style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; background:${_kpiDelayState.lines.early ? '#dcfce7' : '#f1f5f9'}; color:${_kpiDelayState.lines.early ? '#15803d' : '#64748b'}; padding:4px 9px; border-radius:7px; border:1.5px solid ${_kpiDelayState.lines.early ? '#bbf7d0' : '#cbd5e1'}; font-weight:800; user-select:none; transition:all 0.2s;">
                        <input type="checkbox" ${_kpiDelayState.lines.early ? 'checked' : ''} onchange="window._kpiDelayToggleLine('early', this.checked)" style="cursor:pointer; accent-color:#15803d;">
                        ━ 🟢 Sớm (%)
                    </label>

                    <label style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; background:${_kpiDelayState.lines.errors ? '#fff7ed' : '#f1f5f9'}; color:${_kpiDelayState.lines.errors ? '#c2410c' : '#64748b'}; padding:4px 9px; border-radius:7px; border:1.5px solid ${_kpiDelayState.lines.errors ? '#fdba74' : '#cbd5e1'}; font-weight:800; user-select:none; transition:all 0.2s;">
                        <input type="checkbox" ${_kpiDelayState.lines.errors ? 'checked' : ''} onchange="window._kpiDelayToggleLine('errors', this.checked)" style="cursor:pointer; accent-color:#c2410c;">
                        ━ ⚠️ Tổng Lỗi (đơn)
                    </label>
                </div>
            </div>

            <!-- Framed Chart Canvas Box -->
            <div class="kpi-chart-frame">
                <canvas id="kpiMonthlyBarCanvas" height="350" style="width:100%; display:block;"></canvas>
            </div>
        </div>

        <!-- Card 3: 12 Monthly Detail & KPI Input Cards -->
        <div class="kpi-card kpi-monthly-section">
            <div class="kpi-card-title">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>🗓️ Chi Tiết Dữ Liệu Tra Soát & Chỉ Số KPI 12 Tháng</span>
                </div>
                <span style="font-size:11.5px; font-weight:700; color:#4338ca; background:#faf5ff; border:1px solid #e9d5ff; padding:4px 10px; border-radius:8px;">⚡ Tự động lưu tức thì khi nhập chỉ số KPI mới</span>
            </div>
            <div class="kpi-monthly-grid">
                ${monthlyCardsHtml}
            </div>
        </div>
        `;

        // Render Canvases
        drawDonutChart(fullYear);
        drawMonthlyBarChart(months, targets, realCurrentMonth, realCurrentYear, data.year);

        // Bind Window Resize Event to keep canvas crisp & full-width
        if (_resizeHandler) window.removeEventListener('resize', _resizeHandler);
        _resizeHandler = function () {
            drawMonthlyBarChart(months, targets, realCurrentMonth, realCurrentYear, data.year);
        };
        window.addEventListener('resize', _resizeHandler);
    }

    function drawDonutChart(fullYear) {
        const canvas = document.getElementById('kpiDonutCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = 77.5, cy = 77.5, r = 56, lw = 20;

        const data = [fullYear.early, fullYear.on_time, fullYear.late];
        const colors = ['#10b981', '#6366f1', '#ef4444'];
        const total = data.reduce((a, b) => a + b, 0) || 1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let startAngle = -Math.PI / 2;
        data.forEach((v, i) => {
            const sweep = (v / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
            ctx.lineWidth = lw;
            ctx.strokeStyle = colors[i];
            ctx.stroke();
            startAngle += sweep;
        });

        // Center Text
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 22px "Plus Jakarta Sans", "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fullYear.total, cx, cy - 6);

        ctx.font = '700 11px "Plus Jakarta Sans", "Inter", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('đơn hàng', cx, cy + 14);
    }

    // Helper for Rounded Rectangles on Canvas
    function drawRoundedRect(ctx, x, y, width, height, radius) {
        if (height <= 0) return;
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    function drawMonthlyBarChart(months, targets, curRealMonth, curRealYear, viewYear) {
        const canvas = document.getElementById('kpiMonthlyBarCanvas');
        if (!canvas) return;

        const parentWidth = canvas.parentElement ? canvas.parentElement.getBoundingClientRect().width : 1100;
        canvas.width = parentWidth || 1100;
        canvas.height = 350;

        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const padL = 45, padR = 50, padT = 36, padB = 40;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        ctx.clearRect(0, 0, W, H);

        const maxOrders = Math.max(...months.map(m => m.total), 10);
        const yMax = Math.ceil(maxOrders * 1.25);

        // Draw Y Grid Lines & Left Labels
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 11px "Plus Jakarta Sans", "Inter", sans-serif';
        ctx.textAlign = 'right';

        const ySteps = 4;
        for (let i = 0; i <= ySteps; i++) {
            const val = Math.round((yMax / ySteps) * i);
            const y = padT + chartH - (i / ySteps) * chartH;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
            ctx.fillText(val, padL - 10, y + 4);
        }

        const colGap = chartW / 12;
        const barW = Math.min(colGap - 14, 40);

        const pointsLate = [];
        const pointsOnTime = [];
        const pointsEarly = [];
        const pointsErrors = [];

        const maxErrVal = Math.max(...months.map(m => m.total_errors), 5);

        months.forEach((m, idx) => {
            const cx = padL + colGap * idx + colGap / 2;
            const x = cx - barW / 2;
            const isCur = viewYear === curRealYear && m.month === curRealMonth;

            if (m.total > 0) {
                const hEarly = (m.early / yMax) * chartH;
                const yEarly = padT + chartH - hEarly;

                const hOnTime = (m.on_time / yMax) * chartH;
                const yOnTime = yEarly - hOnTime;

                const hLate = (m.late / yMax) * chartH;
                const yLate = yOnTime - hLate;

                const hTotal = hEarly + hOnTime + hLate;
                const yTop = padT + chartH - hTotal;

                if (hEarly > 0) {
                    ctx.fillStyle = '#10b981';
                    drawRoundedRect(ctx, x, yEarly, barW, hEarly, (hOnTime === 0 && hLate === 0) ? 5 : 2);
                }
                if (hOnTime > 0) {
                    ctx.fillStyle = '#6366f1';
                    drawRoundedRect(ctx, x, yOnTime, barW, hOnTime, (hLate === 0) ? 5 : 2);
                }
                if (hLate > 0) {
                    ctx.fillStyle = '#ef4444';
                    drawRoundedRect(ctx, x, yLate, barW, hLate, 5);
                }

                ctx.fillStyle = '#0f172a';
                ctx.font = '900 12px "Plus Jakarta Sans", "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(m.total, cx, yTop - 8);
            }

            ctx.fillStyle = isCur ? '#d97706' : '#475569';
            ctx.font = isCur ? '900 13px "Plus Jakarta Sans", "Inter", sans-serif' : '700 12px "Plus Jakarta Sans", "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`T${m.month}${isCur ? ' ⭐' : ''}`, cx, H - 12);

            const yLatePct = padT + chartH - (m.delay_pct / 100) * chartH;
            pointsLate.push({ x: cx, y: yLatePct, pct: m.delay_pct, isCur });

            const yOnTimePct = padT + chartH - (m.on_time_pct / 100) * chartH;
            pointsOnTime.push({ x: cx, y: yOnTimePct, pct: m.on_time_pct, isCur });

            const yEarlyPct = padT + chartH - (m.early_pct / 100) * chartH;
            pointsEarly.push({ x: cx, y: yEarlyPct, pct: m.early_pct, isCur });

            const yErrVal = padT + chartH - (m.total_errors / (maxErrVal * 1.25)) * chartH;
            pointsErrors.push({ x: cx, y: yErrVal, val: m.total_errors, isCur });
        });

        // Draw Right Y-Axis Labels (%)
        ctx.fillStyle = '#ef4444';
        ctx.font = '700 11px "Plus Jakarta Sans", "Inter", sans-serif';
        ctx.textAlign = 'left';
        for (let i = 0; i <= 4; i++) {
            const val = i * 25;
            const y = padT + chartH - (i / 4) * chartH;
            ctx.fillText(val + '%', W - padR + 8, y + 4);
        }

        // Helper Function to Render Trend Lines
        function renderSingleTrendLine(pts, lineColor, dotBorderColor, pillBg, pillBorder, pillTextColor, isValMode) {
            if (!pts || pts.length === 0) return;

            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2.8;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 0; i < pts.length - 1; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();

            pts.forEach(p => {
                const displayVal = isValMode ? p.val : p.pct;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
                ctx.fillStyle = p.isCur ? '#f59e0b' : '#ffffff';
                ctx.fill();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = dotBorderColor;
                ctx.stroke();

                if (displayVal > 0) {
                    const txt = isValMode ? (displayVal + ' lỗi') : (displayVal + '%');
                    ctx.font = '800 10.5px "Plus Jakarta Sans", "Inter", sans-serif';
                    const txtW = ctx.measureText(txt).width;

                    const pillX = p.x - txtW / 2 - 5;
                    const pillY = p.y - 19;
                    const pillW = txtW + 10;
                    const pillH = 15;

                    ctx.fillStyle = p.isCur ? '#fffbeb' : pillBg;
                    ctx.strokeStyle = p.isCur ? '#f59e0b' : pillBorder;
                    ctx.lineWidth = 1;

                    ctx.beginPath();
                    if (typeof ctx.roundRect === 'function') {
                        ctx.roundRect(pillX, pillY, pillW, pillH, 4);
                    } else {
                        ctx.rect(pillX, pillY, pillW, pillH);
                    }
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = pillTextColor;
                    ctx.textAlign = 'center';
                    ctx.fillText(txt, p.x, pillY + 11);
                }
            });
        }

        if (_kpiDelayState.lines.early) {
            renderSingleTrendLine(pointsEarly, '#059669', '#059669', 'rgba(240, 253, 244, 0.95)', '#86efac', '#15803d', false);
        }

        if (_kpiDelayState.lines.on_time) {
            renderSingleTrendLine(pointsOnTime, '#4338ca', '#4338ca', 'rgba(238, 242, 255, 0.95)', '#a5b4fc', '#3730a3', false);
        }

        if (_kpiDelayState.lines.late) {
            renderSingleTrendLine(pointsLate, '#dc2626', '#dc2626', 'rgba(254, 242, 242, 0.95)', '#fca5a5', '#b91c1c', false);
        }

        if (_kpiDelayState.lines.errors) {
            renderSingleTrendLine(pointsErrors, '#ea580c', '#c2410c', 'rgba(255, 247, 237, 0.95)', '#fdba74', '#9a3412', true);
        }
    }

    // Toggle Line Controller
    window._kpiDelayToggleLine = function (type, checked) {
        _kpiDelayState.lines[type] = !!checked;
        if (_kpiDelayState.data) {
            renderKpiDelayDashboard(_kpiDelayState.data);
        }
    };

    // ========== GLOBAL ACTIONS & CONTROLLERS ==========
    window._kpiDelaySwitchSegment = function (seg) {
        if (_kpiDelayState.segment === seg) return;
        _kpiDelayState.segment = seg;
        const container = document.querySelector('.kpi-delay-wrap')?.parentElement || document.getElementById('contentArea') || document.getElementById('ceoMain') || document.getElementById('mainContent');
        renderKpitilechamdonPage(container);
    };

    window._kpiDelaySwitchYear = function (y) {
        _kpiDelayState.year = parseInt(y, 10);
        const container = document.querySelector('.kpi-delay-wrap')?.parentElement || document.getElementById('contentArea') || document.getElementById('ceoMain') || document.getElementById('mainContent');
        renderKpitilechamdonPage(container);
    };

    window._kpiDelayUpdateBadgeRealtime = function (inputEl) {
        if (!inputEl || !_kpiDelayState.data) return;
        const now = typeof vnNow === 'function' ? vnNow() : new Date();
        const realCurrentMonth = now.getMonth() + 1;
        const realCurrentYear = now.getFullYear();

        const pType = inputEl.dataset.period;
        const pVal = parseInt(inputEl.dataset.val, 10);

        if (pType === 'quarter') {
            const qData = _kpiDelayState.data.quarters.find(q => q.quarter === pVal);
            if (qData) {
                const qIptDelay = document.querySelector(`.kpi-q-input[data-period="quarter"][data-val="${pVal}"]`);
                const qIptErr = document.querySelector(`.kpi-q-err-input[data-period="quarter"][data-val="${pVal}"]`);
                const targetPct = qIptDelay ? (parseFloat(qIptDelay.value) || 0) : 5.0;
                const targetErr = qIptErr ? (parseInt(qIptErr.value, 10) || 0) : 0;

                const quarterMonths = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };
                const [startM] = quarterMonths[pVal];
                const isFutureQ = (_kpiDelayState.year > realCurrentYear) || (_kpiDelayState.year === realCurrentYear && startM > realCurrentMonth);

                const wrap = document.getElementById(`qBadgeWrap_${pVal}`);
                if (wrap) {
                    if (isFutureQ && qData.total === 0) {
                        wrap.innerHTML = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                    } else {
                        const isPass = qData.delay_pct <= targetPct;
                        wrap.innerHTML = `<span class="badge-status ${isPass ? 'badge-success' : 'badge-danger'}">${isPass ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                    }
                }

                const wrapErr = document.getElementById(`qBadgeErrWrap_${pVal}`);
                if (wrapErr) {
                    if (isFutureQ && qData.total === 0) {
                        wrapErr.innerHTML = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                    } else if (targetErr > 0) {
                        const isPassErr = qData.total_errors <= targetErr;
                        wrapErr.innerHTML = `<span class="badge-status ${isPassErr ? 'badge-success' : 'badge-danger'}">${isPassErr ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                    } else {
                        wrapErr.innerHTML = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                    }
                }
            }
        } else if (pType === 'year') {
            const yData = _kpiDelayState.data.fullYear;
            if (yData) {
                const yIptDelay = document.querySelector(`.kpi-q-input[data-period="year"][data-val="0"]`);
                const yIptErr = document.querySelector(`.kpi-q-err-input[data-period="year"][data-val="0"]`);
                const targetPct = yIptDelay ? (parseFloat(yIptDelay.value) || 0) : 5.0;
                const targetErr = yIptErr ? (parseInt(yIptErr.value, 10) || 0) : 0;

                const isFutureYear = (_kpiDelayState.year > realCurrentYear) && yData.total === 0;

                const wrap = document.getElementById(`yBadgeWrap_0`);
                if (wrap) {
                    if (isFutureYear) {
                        wrap.innerHTML = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                    } else {
                        const isPass = yData.delay_pct <= targetPct;
                        wrap.innerHTML = `<span class="badge-status ${isPass ? 'badge-success' : 'badge-danger'}">${isPass ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                    }
                }

                const wrapErr = document.getElementById(`yBadgeErrWrap_0`);
                if (wrapErr) {
                    if (isFutureYear) {
                        wrapErr.innerHTML = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                    } else if (targetErr > 0) {
                        const isPassErr = yData.total_errors <= targetErr;
                        wrapErr.innerHTML = `<span class="badge-status ${isPassErr ? 'badge-success' : 'badge-danger'}">${isPassErr ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                    } else {
                        wrapErr.innerHTML = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                    }
                }
            }
        } else if (pType === 'month') {
            const mData = _kpiDelayState.data.months.find(m => m.month === pVal);
            if (mData) {
                const mIptDelay = document.querySelector(`.kpi-m-input[data-period="month"][data-val="${pVal}"]`);
                const mIptErr = document.querySelector(`.kpi-m-err-input[data-period="month"][data-val="${pVal}"]`);
                const targetPct = mIptDelay ? (parseFloat(mIptDelay.value) || 0) : 5.0;
                const targetErr = mIptErr ? (parseInt(mIptErr.value, 10) || 0) : 0;

                const isFutureMonth = (_kpiDelayState.year > realCurrentYear) || (_kpiDelayState.year === realCurrentYear && pVal > realCurrentMonth);

                const wrap = document.getElementById(`mBadgeWrap_${pVal}`);
                if (wrap) {
                    wrap.innerHTML = getCombinedKpiBadgeHtml(isFutureMonth, mData.total || 0, mData.delay_pct || 0, targetPct, mData.total_errors || 0, targetErr);
                }
            }
        }
    };

    window._kpiDelayAutoSaveSingle = async function (inputEl) {
        if (!inputEl) return;
        inputEl.classList.add('saved-flash');
        setTimeout(() => inputEl.classList.remove('saved-flash'), 1200);
        await window._kpiDelaySaveTargets(true);
    };

    window._kpiDelaySaveTargets = async function (isSilent = false) {
        const year = _kpiDelayState.year;
        const segment = _kpiDelayState.segment;

        const targetsMap = {};

        // Collect quarterly & yearly inputs
        document.querySelectorAll('.kpi-q-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            if (!targetsMap[key]) targetsMap[key] = { period_type: pType, period_value: pVal };
            targetsMap[key].target_max_delay_pct = parseFloat(ipt.value) || 0;
        });

        document.querySelectorAll('.kpi-q-err-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            if (!targetsMap[key]) targetsMap[key] = { period_type: pType, period_value: pVal };
            targetsMap[key].target_max_total_errors = parseInt(ipt.value, 10) || 0;
        });

        // Collect monthly inputs
        document.querySelectorAll('.kpi-m-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            if (!targetsMap[key]) targetsMap[key] = { period_type: pType, period_value: pVal };
            targetsMap[key].target_max_delay_pct = parseFloat(ipt.value) || 0;
        });

        document.querySelectorAll('.kpi-m-err-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            if (!targetsMap[key]) targetsMap[key] = { period_type: pType, period_value: pVal };
            targetsMap[key].target_max_total_errors = parseInt(ipt.value, 10) || 0;
        });

        const targets = Object.values(targetsMap);

        try {
            const res = await fetch('/api/kpi-delay/targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, segment, targets })
            });
            const data = await res.json();

            if (data.ok) {
                if (!isSilent) {
                    if (typeof showToast === 'function') {
                        showToast('✅ Đã lưu KPI Mục Tiêu Tỉ Lệ Chậm Đơn & Chỉ Tiêu Lỗi thành công!', 'success');
                    } else {
                        alert('✅ Đã lưu KPI Mục Tiêu Tỉ Lệ Chậm Đơn & Chỉ Tiêu Lỗi thành công!');
                    }
                }
            } else {
                if (!isSilent) alert('❌ Lỗi lưu KPI: ' + (data.error || 'Không xác định'));
            }
        } catch (e) {
            console.error('_kpiDelaySaveTargets error:', e);
            if (!isSilent) alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    // ========== GLOBAL MODAL CONTROLLERS ==========
    var _editingModalTarget = { period_type: 'month', period_value: 1, title: '' };

    window.openKpiTargetModal = function(periodType, periodValue, titleLabel) {
        _editingModalTarget = { period_type: periodType, period_value: periodValue, title: titleLabel };
        const key = `${periodType}_${periodValue}`;
        const targetObj = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};

        const titleEl = document.getElementById('kpiModalTitle');
        if (titleEl) titleEl.innerText = `⚙️ Cấu Hình KPI & Cam Kết Quản Lý Xưởng — ${titleLabel}`;

        const delayIpt = document.getElementById('kpiModalDelayPct');
        if (delayIpt) delayIpt.value = targetObj.target_max_delay_pct !== undefined ? targetObj.target_max_delay_pct : 5.0;

        const errIpt = document.getElementById('kpiModalTotalErr');
        if (errIpt) errIpt.value = targetObj.target_max_total_errors !== undefined ? targetObj.target_max_total_errors : 0;

        const evalRule = targetObj.eval_rule || 'ALL';
        const radio = document.querySelector(`input[name="kpiEvalRule"][value="${evalRule}"]`);
        if (radio) radio.checked = true;

        const rewardIpt = document.getElementById('kpiModalReward');
        if (rewardIpt) rewardIpt.value = targetObj.reward_text || '';

        // Render commitments list
        const commitments = Array.isArray(targetObj.commitments) ? targetObj.commitments : [];
        const container = document.getElementById('kpiModalCommitmentsList');
        if (container) {
            container.innerHTML = '';
            if (commitments.length === 0) {
                window.addCommitmentRow('');
            } else {
                commitments.forEach(c => window.addCommitmentRow(c));
            }
        }

        const overlay = document.getElementById('kpiTargetModalOverlay');
        if (overlay) overlay.style.display = 'flex';
    };

    // Preset Commitment Suggestions with LocalStorage Persistence & CRUD
    var DEFAULT_PRESET_COMMITMENTS = [
        "Kiểm tra kĩ 100% sản phẩm (chất vải, đường may, in thêu) trước khi đóng gói",
        "Tăng ca may tối Thứ 5 và Thứ 6 để đảm bảo giao hàng đúng tiến độ các đơn hàng gấp",
        "Rà soát lại kế hoạch chuẩn bị nguyên phụ liệu (vải, cúc, chỉ) trước 3 ngày sản xuất",
        "Họp giao ca 10 phút đầu giờ hàng ngày để quán xuyệt tiến độ và khắc phục ngay đơn bị chậm",
        "Phân công 1 nhân sự QC chuyên trách kiểm lỗi tại công đoạn may ráp",
        "Báo cáo ngay cho Ban Giám Đốc khi có nguy cơ trễ đơn quá 24h để có giải pháp hỗ trợ",
        "Tối ưu hoá quy trình cắt và rải vải để tránh lãng phí và sản xuất bị nghẽn cổ chai",
        "Đào tạo lại tay nghề may cho công nhân có tỷ lệ may lỗi cao trong tháng"
    ];

    function getStoredPresetCommitments() {
        try {
            const stored = localStorage.getItem('kpi_preset_commitments');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [...DEFAULT_PRESET_COMMITMENTS];
    }

    function saveStoredPresetCommitments(list) {
        try {
            localStorage.setItem('kpi_preset_commitments', JSON.stringify(list));
        } catch (e) {}
    }

    window.toggleCommitmentSuggestions = function(forceState) {
        const panel = document.getElementById('kpiCommitmentSuggestionsPanel');
        if (!panel) return;
        const isShow = forceState !== undefined ? forceState : (panel.style.display === 'none');
        panel.style.display = isShow ? 'block' : 'none';
        if (isShow) {
            window.renderPresetSuggestions();
        }
    };

    window.renderPresetSuggestions = function() {
        const listEl = document.getElementById('kpiPresetSuggestionsList');
        if (!listEl) return;
        const presets = getStoredPresetCommitments();

        listEl.innerHTML = presets.map((s, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; background:#ffffff; padding:6px 10px; border-radius:6px; border:1px solid #fde68a;">
                <span style="font-size:12px; font-weight:700; color:#78350f; flex:1;">📌 ${s}</span>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button type="button" onclick="window.selectPresetSuggestion(\`${s.replace(/`/g, '\\`')}\`)" style="font-size:11px; font-weight:800; color:#b45309; background:#fffbeb; padding:2px 8px; border-radius:4px; border:1px solid #fde68a; cursor:pointer;" title="Chèn câu này vào danh sách cam kết">+ Chọn</button>
                    <button type="button" onclick="window.editPresetSuggestion(${idx})" style="font-size:11px; padding:2px 6px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:4px; font-weight:800; cursor:pointer;" title="Chỉnh sửa câu gợi ý này">✏️ Sửa</button>
                    <button type="button" onclick="window.deletePresetSuggestion(${idx})" style="font-size:11px; padding:2px 6px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:4px; font-weight:800; cursor:pointer;" title="Xoá câu gợi ý này">🗑️ Xoá</button>
                </div>
            </div>
        `).join('');
    };

    window.addNewPresetSuggestion = function() {
        const val = prompt('Nhập câu gợi ý cam kết mẫu mới muốn cài đặt sẵn vào hệ thống:');
        if (!val || !val.trim()) return;
        const presets = getStoredPresetCommitments();
        presets.push(val.trim());
        saveStoredPresetCommitments(presets);
        window.renderPresetSuggestions();
        if (typeof showToast === 'function') showToast('✅ Đã thêm câu gợi ý mẫu mới!', 'success');
    };

    window.editPresetSuggestion = function(index) {
        const presets = getStoredPresetCommitments();
        if (!presets[index]) return;
        const newVal = prompt('Chỉnh sửa nội dung câu gợi ý mẫu:', presets[index]);
        if (newVal === null || !newVal.trim()) return;
        presets[index] = newVal.trim();
        saveStoredPresetCommitments(presets);
        window.renderPresetSuggestions();
        if (typeof showToast === 'function') showToast('✅ Đã cập nhật câu gợi ý mẫu!', 'success');
    };

    window.deletePresetSuggestion = function(index) {
        if (!confirm('Anh/Chị có chắc chắn muốn xoá câu gợi ý mẫu này không?')) return;
        const presets = getStoredPresetCommitments();
        presets.splice(index, 1);
        saveStoredPresetCommitments(presets);
        window.renderPresetSuggestions();
        if (typeof showToast === 'function') showToast('🗑️ Đã xoá câu gợi ý mẫu!', 'info');
    };

    window.resetPresetSuggestionsDefault = function() {
        if (!confirm('Khôi phục lại danh sách các câu gợi ý mẫu mặc định của hệ thống?')) return;
        localStorage.removeItem('kpi_preset_commitments');
        window.renderPresetSuggestions();
        if (typeof showToast === 'function') showToast('🔄 Đã khôi phục danh sách gợi ý mặc định!', 'success');
    };

    window.selectPresetSuggestion = function(text) {
        const container = document.getElementById('kpiModalCommitmentsList');
        let emptyIpt = null;
        if (container) {
            const ipts = container.querySelectorAll('.commitment-item-ipt');
            for (const ipt of ipts) {
                if (!ipt.value.trim()) {
                    emptyIpt = ipt;
                    break;
                }
            }
        }
        if (emptyIpt) {
            emptyIpt.value = text;
        } else {
            window.addCommitmentRow(text);
        }
        if (typeof showToast === 'function') {
            showToast('💡 Đã chèn câu gợi ý cam kết!', 'info');
        }
    };

    window.closeKpiTargetModal = function() {
        const overlay = document.getElementById('kpiTargetModalOverlay');
        if (overlay) overlay.style.display = 'none';
    };

    window.addCommitmentRow = function(valueText = '') {
        const container = document.getElementById('kpiModalCommitmentsList');
        if (!container) return;
        const index = container.children.length + 1;
        const row = document.createElement('div');
        row.className = 'commitment-input-row';
        row.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px;';
        row.innerHTML = `
            <span style="font-size:12px; font-weight:800; color:#64748b; width:24px;">#${index}</span>
            <input type="text" class="commitment-item-ipt" value="${(valueText || '').replace(/"/g, '&quot;')}" placeholder="Ví dụ: Kiểm tra 100% áo trước khi đóng gói..." style="flex:1; padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:600; color:#0f172a; outline:none;">
            <button type="button" onclick="this.parentElement.remove(); window.renumberCommitmentRows();" style="padding:6px 10px; background:#fee2e2; color:#dc2626; border:none; border-radius:6px; font-weight:800; cursor:pointer;" title="Xoá dòng cam kết này">🗑️</button>
        `;
        container.appendChild(row);
    };

    window.renumberCommitmentRows = function() {
        const container = document.getElementById('kpiModalCommitmentsList');
        if (!container) return;
        Array.from(container.children).forEach((row, i) => {
            const span = row.querySelector('span');
            if (span) span.innerText = `#${i + 1}`;
        });
    };

    window.saveKpiTargetModal = async function() {
        const delayPct = parseFloat(document.getElementById('kpiModalDelayPct')?.value) || 0;
        const totalErr = parseInt(document.getElementById('kpiModalTotalErr')?.value, 10) || 0;
        const evalRule = document.querySelector('input[name="kpiEvalRule"]:checked')?.value || 'ALL';
        const rewardText = (document.getElementById('kpiModalReward')?.value || '').trim();

        const commitmentInputs = document.querySelectorAll('.commitment-item-ipt');
        const commitments = [];
        commitmentInputs.forEach(ipt => {
            const val = ipt.value.trim();
            if (val) commitments.push(val);
        });

        const targetPayload = {
            period_type: _editingModalTarget.period_type,
            period_value: _editingModalTarget.period_value,
            target_max_delay_pct: delayPct,
            target_max_total_errors: totalErr,
            eval_rule: evalRule,
            reward_text: rewardText,
            commitments: commitments
        };

        const btnSave = document.getElementById('btnSaveKpiModal');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerText = '⏳ Đang Lưu...';
        }

        try {
            const res = await fetch('/api/kpi-delay/targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: _kpiDelayState.year,
                    segment: _kpiDelayState.segment,
                    targets: [targetPayload]
                })
            });
            const data = await res.json();
            if (data.ok) {
                window.closeKpiTargetModal();
                await loadKpiDelayData();
                if (typeof showToast === 'function') {
                    showToast('✅ Đã lưu KPI, Phần thưởng & Cam kết thành công!', 'success');
                }
            } else {
                alert('❌ Lỗi: ' + (data.error || 'Không thể lưu KPI'));
            }
        } catch (e) {
            console.error('saveKpiTargetModal error:', e);
            alert('❌ Lỗi kết nối máy chủ!');
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = '💾 Lưu KPI & Cam Kết';
            }
        }
    };

    window.renderKpitilechamdonPage = renderKpitilechamdonPage;
})();

