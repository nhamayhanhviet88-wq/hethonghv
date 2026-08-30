/* ===== KPI TỈ LỆ CHẬM ĐƠN & ĐƠN LỖI — DESKTOP PAGE ===== */

(function () {
    var _kpiDelayState = {
        year: new Date().getFullYear(),
        segment: 'all', // 'all', 'dongphuc', 'tempet'
        data: null,
        loading: false,
        userRole: 'unknown', // Role from API: 'giam_doc', 'quan_ly', etc.
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
                
                /* === 2-Tier Grouped Header === */
                .kpi-quarter-table th {
                    background: linear-gradient(180deg, #283a62 0%, #172554 48%, #0f172a 100%);
                    color: #ffffff;
                    padding: 8px 6px;
                    text-align: center;
                    border-bottom: 2px solid #0f172a;
                    white-space: nowrap;
                    font-weight: 900;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
                }

                /* Group Header Row (Tier 1) */
                .kpi-quarter-table .th-group-delivery {
                    background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 48%, #1e3a8a 100%) !important;
                    font-size: 11.5px; letter-spacing: 0.3px;
                    border-bottom: 2px solid #1e3a8a;
                    border-left: 2px solid #0f172a; border-right: 2px solid #0f172a;
                }
                .kpi-quarter-table .th-group-errors {
                    background: linear-gradient(180deg, #d97706 0%, #b45309 48%, #92400e 100%) !important;
                    font-size: 11.5px; letter-spacing: 0.3px;
                    border-bottom: 2px solid #92400e;
                    border-left: 2px solid #0f172a; border-right: 2px solid #0f172a;
                }
                .kpi-quarter-table .th-group-orders {
                    background: linear-gradient(180deg, #059669 0%, #047857 48%, #065f46 100%) !important;
                    font-size: 11.5px; letter-spacing: 0.3px;
                    border-bottom: 2px solid #065f46;
                    border-left: 2px solid #0f172a; border-right: 2px solid #0f172a;
                }

                /* Sub-header cells under each group (Tier 2) */
                .kpi-quarter-table .th-sub-delivery {
                    background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%) !important;
                    font-size: 11px; padding: 6px 5px;
                    border-bottom: 2px solid #1e3a8a;
                }
                .kpi-quarter-table .th-sub-errors {
                    background: linear-gradient(180deg, #f59e0b 0%, #d97706 60%, #b45309 100%) !important;
                    font-size: 11px; padding: 6px 5px;
                    border-bottom: 2px solid #92400e;
                }
                .kpi-quarter-table .th-sub-orders {
                    background: linear-gradient(180deg, #10b981 0%, #059669 60%, #047857 100%) !important;
                    font-size: 11px; padding: 6px 5px;
                    border-bottom: 2px solid #065f46;
                }

                /* Column "Tổng số đơn" - Static Glossy Dark Orange matching Image 1 */
                .kpi-quarter-table th.th-tong {
                    background: linear-gradient(180deg, #d97706 0%, #b45309 48%, #853205 100%) !important;
                    color: #ffffff !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.2) !important;
                }

                .kpi-quarter-table td { padding: 8px 5px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 700; vertical-align: middle; white-space: nowrap; color: #1e293b; }
                .kpi-quarter-table tbody tr:hover td { filter: brightness(0.97); }

                /* Column group tints for data cells */
                .kpi-quarter-table td.td-delivery { background: rgba(219, 234, 254, 0.25); }
                .kpi-quarter-table td.td-errors { background: rgba(254, 243, 199, 0.3); }
                .kpi-quarter-table td.td-orders { background: rgba(209, 250, 229, 0.3); }
                .kpi-quarter-table td.td-delivery-border-l { border-left: 2px solid #bfdbfe; }
                .kpi-quarter-table td.td-errors-border-l { border-left: 2px solid #fde68a; }
                .kpi-quarter-table td.td-orders-border-l { border-left: 2px solid #a7f3d0; }
                .kpi-quarter-table td.td-errors-border-r { border-right: 2px solid #fde68a; }
                .kpi-quarter-table td.td-orders-border-r { border-right: 2px solid #a7f3d0; }

                /* Soft Cream Yellow Summary Row for Full Year */
                .kpi-quarter-table tr.row-total { background: #fef3c7 !important; font-weight: 900; color: #92400e !important; border-top: 2px solid #fde68a; }
                .kpi-quarter-table tr.row-total td { color: #92400e; border-bottom: none; font-size: 12px; }
                .kpi-quarter-table tr.row-total td.td-delivery { background: rgba(219, 234, 254, 0.15); }
                .kpi-quarter-table tr.row-total td.td-errors { background: rgba(254, 243, 199, 0.2); }
                .kpi-quarter-table tr.row-total td.td-orders { background: rgba(209, 250, 229, 0.2); }

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

                /* Monthly Cards Section - 3 months per row (4 rows for 12 months) */
                .kpi-monthly-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 18px; }
                @media (max-width: 992px) { .kpi-monthly-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 640px) { .kpi-monthly-grid { grid-template-columns: 1fr; } }

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

                @keyframes _kpiBorderGradientRun {
                    0% {
                        border-color: #f59e0b;
                        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.45), 0 4px 22px rgba(245, 158, 11, 0.25);
                    }
                    25% {
                        border-color: #ec4899;
                        box-shadow: 0 0 0 3.5px rgba(236, 72, 153, 0.45), 0 4px 24px rgba(236, 72, 153, 0.3);
                    }
                    50% {
                        border-color: #6366f1;
                        box-shadow: 0 0 0 3.5px rgba(99, 102, 241, 0.45), 0 4px 24px rgba(99, 102, 241, 0.3);
                    }
                    75% {
                        border-color: #10b981;
                        box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.45), 0 4px 24px rgba(16, 185, 129, 0.3);
                    }
                    100% {
                        border-color: #f59e0b;
                        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.45), 0 4px 22px rgba(245, 158, 11, 0.25);
                    }
                }
                .m-card.is-current-month {
                    border: 2.5px solid #f59e0b !important;
                    background: linear-gradient(180deg, #fffdf5 0%, #ffffff 100%) !important;
                    animation: _kpiBorderGradientRun 3s infinite linear !important;
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

                /* Global Font Uniformity matching Title */
                #kpiTargetModalOverlay,
                #kpiTargetModalOverlay button,
                #kpiTargetModalOverlay input,
                #kpiTargetModalOverlay select,
                #kpiTargetModalOverlay textarea,
                #kpiTargetModalOverlay label,
                #kpiTargetModalOverlay span,
                .kpi-quarter-table button {
                    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif !important;
                }
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
                    <button class="btn-save-kpi" onclick="window.openKpiTargetModal('year', 0, 'Cả Năm ' + (_kpiDelayState.year || ''))">
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
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
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
                            <div>
                                <label style="font-size:12px; font-weight:800; color:#334155; display:block; margin-bottom:4px;">📦 KPI Tổng Đơn Tối Thiểu:</label>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <input type="number" step="1" min="0" id="kpiModalMinOrders" style="width:100%; padding:8px 12px; border:1.5px solid #059669; border-radius:8px; font-size:14px; font-weight:900; color:#065f46;">
                                    <span style="font-weight:900; color:#64748b;">đơn</span>
                                </div>
                            </div>
                        </div>

                        <!-- Historical Benchmarks Suggestion Box (Gợi Ý Chỉ Số Thực Tế Các Năm Trước) -->
                        <div id="kpiModalHistoricalBox" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px 14px; margin-bottom:12px; display:none;"></div>

                        <!-- Evaluation Rule Selection (Bắt Buộc Tích Chọn) -->
                        <div style="background:#fffbeb; border:1.5px solid #fde68a; padding:14px; border-radius:10px;">
                            <label style="font-size:12.5px; font-weight:900; color:#92400e; display:block; margin-bottom:8px;">⚖️ Quy Tắc Đánh Giá Đạt KPI (Bắt buộc chọn):</label>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#78350f;">
                                    <input type="radio" name="kpiEvalRule" value="ALL" checked style="accent-color:#d97706; transform:scale(1.15);">
                                    <span>🟢 <b>Bắt buộc ĐẠT TẤT CẢ</b></span>
                                </label>
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#78350f;">
                                    <input type="radio" name="kpiEvalRule" value="ANY" style="accent-color:#d97706; transform:scale(1.15);">
                                    <span>🟡 <b>Chỉ cần ĐẠT 1 TRONG CÁC TIÊU CHÍ</b></span>
                                </label>
                            </div>
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

                        <!-- Company Support Section -->
                        <div style="background:#f8fafc; border:1.5px solid #e2e8f0; padding:14px; border-radius:10px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
                                <label style="font-size:12.5px; font-weight:900; color:#0f172a;">🤝 Nội Dung Quản Lý Xưởng Cần Công Ty Hỗ Trợ:</label>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button type="button" onclick="window.toggleSupportSuggestions()" style="padding:5px 10px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;" title="Xem danh sách các câu gợi ý công ty hỗ trợ cài đặt sẵn">💡 Xem Gợi Ý Hỗ Trợ</button>
                                    <button type="button" onclick="window.addSupportRow('')" style="padding:5px 10px; background:#0284c7; color:#ffffff; border:none; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">➕ Thêm Hỗ Trợ</button>
                                </div>
                            </div>

                            <!-- Suggestion Panel Box for Support -->
                            <div id="kpiSupportSuggestionsPanel" style="display:none; background:#f0f9ff; border:1.5px dashed #0284c7; border-radius:10px; padding:12px; margin-bottom:12px;">
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                                    <span style="font-size:12px; font-weight:900; color:#0369a1;">💡 Danh Sách Câu Gợi Ý Hỗ Trợ Mẫu:</span>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <button type="button" onclick="window.addNewSupportPresetSuggestion()" style="padding:3px 8px; background:#dcfce7; color:#15803d; border:1px solid #86efac; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer;" title="Thêm gợi ý mẫu mới vào danh sách">+ Thêm Gợi Ý Mới</button>
                                        <button type="button" onclick="window.resetSupportPresetSuggestionsDefault()" style="padding:3px 8px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;" title="Khôi phục danh sách gợi ý mặc định">🔄 Mặc Định</button>
                                        <button type="button" onclick="window.toggleSupportSuggestions(false)" style="background:none; border:none; color:#0369a1; font-size:14px; font-weight:900; cursor:pointer;">✕</button>
                                    </div>
                                </div>
                                <div id="kpiSupportPresetSuggestionsList" style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto; padding-right:4px;"></div>
                            </div>

                            <div id="kpiModalSupportsList"></div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="background:#f1f5f9; padding:12px 20px; display:flex; align-items:center; justify-content:flex-end; gap:10px; border-top:1px solid #e2e8f0;">
                        <button onclick="window.closeKpiTargetModal()" style="padding:8px 16px; background:#ffffff; border:1.5px solid #cbd5e1; color:#475569; font-weight:800; border-radius:8px; cursor:pointer;">Hủy</button>
                        <button id="btnSaveKpiModal" onclick="window.saveKpiTargetModal()" style="padding:8px 20px; background:linear-gradient(135deg,#4f46e5,#4338ca); color:#ffffff; border:none; font-weight:900; border-radius:8px; cursor:pointer; box-shadow:0 4px 12px rgba(79,70,229,0.3);">💾 Lưu KPI & Cam Kết</button>
                    </div>
                </div>
            </div>

            <!-- Modal Đánh Giá Cam Kết Quản Lý Xưởng (Chỉ Giám Đốc) -->
            <div id="kpiEvalModalOverlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
                <div style="background:#ffffff; width:100%; max-width:680px; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; max-height:90vh;">
                    <!-- Modal Header -->
                    <div style="background:linear-gradient(135deg,#312e81,#4338ca); color:#ffffff; padding:16px 20px; display:flex; align-items:center; justify-content:space-between;">
                        <div id="kpiEvalModalTitle" style="font-size:15px; font-weight:900; letter-spacing:.2px;">📊 Đánh Giá Cam Kết Quản Lý Xưởng</div>
                        <button onclick="window.closeKpiEvalModal()" style="background:none; border:none; color:#c7d2fe; font-size:20px; font-weight:900; cursor:pointer; line-height:1;">✕</button>
                    </div>

                    <!-- Modal Body -->
                    <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
                        <div id="kpiEvalModalHeaderInfo" style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px 14px; border-radius:10px;"></div>
                        <div>
                            <div style="font-size:13px; font-weight:900; color:#0f172a; margin-bottom:8px;">📋 Đánh Giá Từng Cam Kết :</div>
                            <div id="kpiEvalItemsList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <!-- Company Support Info Box in Eval Modal -->
                        <div id="kpiEvalSupportBox" style="background:linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%); border:1.5px solid #bae6fd; border-radius:12px; padding:12px 14px; box-shadow:0 2px 8px rgba(2,132,199,0.04);">
                            <div style="font-size:12.5px; font-weight:900; color:#0369a1; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                                <span>🤝 Nội Dung Quản Lý Xưởng Cần Công Ty Hỗ Trợ:</span>
                                <span id="kpiEvalSupportCountBadge" style="background:#e0f2fe; color:#0369a1; font-size:10px; padding:1px 6px; border-radius:99px; font-weight:900;">0</span>
                            </div>
                            <div id="kpiEvalSupportItemsList" style="display:flex; flex-direction:column; gap:6px;"></div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="background:#f1f5f9; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:10px;">
                        <div id="kpiEvalProgressSummary" style="font-size:12.5px; font-weight:900; color:#4338ca;"></div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button onclick="window.closeKpiEvalModal()" style="padding:8px 14px; background:#ffffff; border:1.5px solid #cbd5e1; color:#475569; font-weight:800; border-radius:8px; cursor:pointer;">Hủy</button>
                            <button id="btnSaveKpiEval" onclick="window.saveKpiEvalModal()" style="padding:8px 20px; background:linear-gradient(135deg,#4f46e5,#4338ca); color:#ffffff; border:none; font-weight:900; border-radius:8px; cursor:pointer; box-shadow:0 4px 12px rgba(79,70,229,0.25);">💾 Lưu Đánh Giá</button>
                        </div>
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
            if (data.userRole) _kpiDelayState.userRole = data.userRole;
            else if (typeof currentUser !== 'undefined' && currentUser) _kpiDelayState.userRole = currentUser.role || 'unknown';
            console.log('[KPI Delay] Rendering dashboard... userRole:', _kpiDelayState.userRole);
            renderKpiDelayDashboard(data);
            console.log('[KPI Delay] Dashboard render finished!');
        } catch (e) {
            console.error('[KPI Delay] loadKpiDelayData error:', e);
            bodyArea.innerHTML = `<div style="color:#ef4444; font-weight:800; text-align:center; padding:40px;">❌ Lỗi kết nối máy chủ: ${e.message}</div>`;
        }
    }

    function getCombinedKpiBadgeHtml(isFuture, totalOrders, delayPct, targetPct, totalErrors, targetErr, evalRule = 'ALL', targetMinOrders = 0) {
        if (isFuture && totalOrders === 0) {
            return `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
        }
        const isPassDelay = delayPct <= targetPct;
        const isPassErr = targetErr > 0 ? (totalErrors <= targetErr) : true;
        const isPassOrders = targetMinOrders > 0 ? (totalOrders >= targetMinOrders) : true;

        const hasMultiCriteria = targetErr > 0 || targetMinOrders > 0;

        if (evalRule === 'ANY' && hasMultiCriteria) {
            if (isPassDelay || (targetErr > 0 && isPassErr) || (targetMinOrders > 0 && isPassOrders)) {
                return `<span class="badge-status badge-success">🔥 ĐẠT KPI</span>`;
            } else {
                return `<span class="badge-status badge-dark-danger">🔴 KHÔNG ĐẠT KPI</span>`;
            }
        }

        if (hasMultiCriteria) {
            const allPass = isPassDelay && isPassErr && isPassOrders;
            if (allPass) {
                return `<span class="badge-status badge-success">🔥 ĐẠT KPI TỔNG THỂ</span>`;
            } else {
                const failParts = [];
                if (!isPassDelay) failParts.push('TRỄ');
                if (targetErr > 0 && !isPassErr) failParts.push('LỖI');
                if (targetMinOrders > 0 && !isPassOrders) failParts.push('TỔNG ĐƠN');
                return `<span class="badge-status badge-danger">🚨 KHÔNG ĐẠT: ${failParts.join(', ')}</span>`;
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

        const isDirector = (_kpiDelayState.userRole === 'giam_doc' || (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc'));
        const canCreateKpi = isDirector || ['quan_ly', 'quan_ly_cap_cao'].includes(_kpiDelayState.userRole) || (typeof currentUser !== 'undefined' && currentUser && ['quan_ly', 'quan_ly_cap_cao'].includes(currentUser.role));

        function getRewardBadgeHtml(rewardText, isFuture, isPass) {
            if (!rewardText) return '';
            if (isFuture) {
                return `<div style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Mức thưởng nếu đạt KPI: ${rewardText}">🎁 Thưởng nếu đạt: ${rewardText}</div>`;
            }
            if (isPass) {
                return `<div style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Đạt KPI - Được thưởng: ${rewardText}">✅ Được thưởng: ${rewardText}</div>`;
            }
            return `<div style="font-size:10px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Không đạt KPI - Không được thưởng ${rewardText}">❌ Mất thưởng (${rewardText})</div>`;
        }

        // Build Quarter Rows
        const quarterRowsHtml = quarters.map(q => {
            const tKey = `quarter_${q.quarter}`;
            const targetObj = targets[tKey];
            const targetPct = targetObj ? targetObj.target_max_delay_pct : 5.0;
            const targetErr = targetObj ? (targetObj.target_max_total_errors || 0) : 0;
            const targetMinOrders = targetObj ? (targetObj.target_min_total_orders || 0) : 0;
            const evalRule = targetObj ? (targetObj.eval_rule || 'ALL') : 'ALL';
            const qRewardText = formatRewardText(targetObj ? (targetObj.reward_text || '') : '');

            const [startM] = quarterMonths[q.quarter];
            const isFutureQ = (data.year > realCurrentYear) || (data.year === realCurrentYear && startM > realCurrentMonth);
            const isFutureOrZeroQ = isFutureQ && q.total === 0;

            const isPassDelay = q.delay_pct <= targetPct;
            const isPassErr = targetErr > 0 ? ((q.total_errors || 0) <= targetErr) : true;
            const isPassOrders = targetMinOrders > 0 ? ((q.total || 0) >= targetMinOrders) : true;

            const hasMultiCriteria = targetErr > 0 || targetMinOrders > 0;
            let qOverallPass = false;
            if (evalRule === 'ANY' && hasMultiCriteria) {
                qOverallPass = isPassDelay || (targetErr > 0 && isPassErr) || (targetMinOrders > 0 && isPassOrders);
            } else if (hasMultiCriteria) {
                qOverallPass = isPassDelay && isPassErr && isPassOrders;
            } else {
                qOverallPass = isPassDelay;
            }

            let badgeDelayHtml = '';
            let badgeErrHtml = '';
            let badgeOrdersHtml = '';

            if (isFutureOrZeroQ) {
                badgeDelayHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                badgeErrHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                badgeOrdersHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
            } else {
                badgeDelayHtml = `<span class="badge-status ${isPassDelay ? 'badge-success' : 'badge-danger'}">${isPassDelay ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;

                if (targetErr > 0) {
                    badgeErrHtml = `<span class="badge-status ${isPassErr ? 'badge-success' : 'badge-danger'}">${isPassErr ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                } else {
                    badgeErrHtml = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                }

                if (targetMinOrders > 0) {
                    badgeOrdersHtml = `<span class="badge-status ${isPassOrders ? 'badge-success' : 'badge-danger'}">${isPassOrders ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                } else {
                    badgeOrdersHtml = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                }
            }

            const rewardBadgeHtml = getRewardBadgeHtml(qRewardText, isFutureOrZeroQ, qOverallPass);

            return `
            <tr>
                <td style="text-align:left; font-weight:800; color:#0f172a;">
                    <div>${q.name}</div>
                </td>
                <td class="td-delivery td-delivery-border-l" style="font-weight:900; color:#b45309;">${q.total || 0}</td>
                <td class="td-delivery" style="color:#059669; font-weight:800;">${q.early || 0}</td>
                <td class="td-delivery" style="color:#4338ca; font-weight:800;">${q.on_time || 0}</td>
                <td class="td-delivery" style="color:#dc2626; font-weight:800;">${q.late || 0}</td>
                <td class="td-delivery" style="font-weight:900; color:${(q.delay_pct || 0) > 0 ? '#b91c1c' : '#15803d'}">${q.delay_pct || 0}%</td>
                <td class="td-delivery" style="color:#3730a3; font-weight:900;">
                    ${targetPct}%
                </td>
                <td class="td-delivery" id="qBadgeWrap_${q.quarter}">
                    ${badgeDelayHtml}
                </td>
                <td class="td-errors td-errors-border-l" style="color:#b45309; font-weight:900;">${q.total_errors || 0} đơn</td>
                <td class="td-errors" style="color:#b45309; font-weight:900;">
                    ${targetErr}
                </td>
                <td class="td-errors td-errors-border-r" id="qBadgeErrWrap_${q.quarter}">
                    ${badgeErrHtml}
                </td>
                <td class="td-orders td-orders-border-l" style="color:#065f46; font-weight:900;">
                    ${targetMinOrders}
                </td>
                <td class="td-orders td-orders-border-r" id="qBadgeOrdersWrap_${q.quarter}">
                    ${badgeOrdersHtml}
                </td>
                <td>
                    ${isDirector ? `
                        <button onclick="window.openKpiTargetModal('quarter', ${q.quarter}, '${q.name}/${data.year}')" style="font-size:10px; font-weight:800; color:#4f46e5; background:#eff6ff; border:1px solid #c7d2fe; padding:3px 6px; border-radius:6px; cursor:pointer;" title="Cấu hình KPI, Phần thưởng & Điều cam kết">⚙️ Cấu Hình</button>
                    ` : '<span style="color:#94a3b8; font-size:11px; font-weight:700;">—</span>'}
                </td>
            </tr>
            `;
        }).join('');

        // Full Year Row
        const yTargetKey = `year_0`;
        const yTargetObj = targets[yTargetKey];
        const yTargetPct = yTargetObj ? yTargetObj.target_max_delay_pct : 5.0;
        const yTargetErr = yTargetObj ? (yTargetObj.target_max_total_errors || 0) : 0;
        const yTargetMinOrders = yTargetObj ? (yTargetObj.target_min_total_orders || 0) : 0;
        const yEvalRule = yTargetObj ? (yTargetObj.eval_rule || 'ALL') : 'ALL';
        const yRewardText = formatRewardText(yTargetObj ? (yTargetObj.reward_text || '') : '');

        const isFutureYear = (data.year > realCurrentYear) && fullYear.total === 0;

        const isYPassDelay = fullYear.delay_pct <= yTargetPct;
        const isYPassErr = yTargetErr > 0 ? ((fullYear.total_errors || 0) <= yTargetErr) : true;
        const isYPassOrders = yTargetMinOrders > 0 ? ((fullYear.total || 0) >= yTargetMinOrders) : true;

        const yHasMultiCriteria = yTargetErr > 0 || yTargetMinOrders > 0;
        let yOverallPass = false;
        if (yEvalRule === 'ANY' && yHasMultiCriteria) {
            yOverallPass = isYPassDelay || (yTargetErr > 0 && isYPassErr) || (yTargetMinOrders > 0 && isYPassOrders);
        } else if (yHasMultiCriteria) {
            yOverallPass = isYPassDelay && isYPassErr && isYPassOrders;
        } else {
            yOverallPass = isYPassDelay;
        }

        let yBadgeHtml = '';
        let yBadgeErrHtml = '';
        let yBadgeOrdersHtml = '';

        if (isFutureYear) {
            yBadgeHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
            yBadgeErrHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
            yBadgeOrdersHtml = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
        } else {
            yBadgeHtml = `<span class="badge-status ${isYPassDelay ? 'badge-success' : 'badge-danger'}">${isYPassDelay ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;

            if (yTargetErr > 0) {
                yBadgeErrHtml = `<span class="badge-status ${isYPassErr ? 'badge-success' : 'badge-danger'}">${isYPassErr ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
            } else {
                yBadgeErrHtml = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
            }

            if (yTargetMinOrders > 0) {
                yBadgeOrdersHtml = `<span class="badge-status ${isYPassOrders ? 'badge-success' : 'badge-danger'}">${isYPassOrders ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
            } else {
                yBadgeOrdersHtml = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
            }
        }

        const yRewardBadgeHtml = getRewardBadgeHtml(yRewardText, isFutureYear, yOverallPass);

        const fullYearRowHtml = `
        <tr class="row-total">
            <td style="text-align:left; font-weight:900; color:#92400e;">
                <div>Cả Năm ${fullYear.year}</div>
            </td>
            <td class="td-delivery td-delivery-border-l" style="font-weight:900; font-size:12.5px; color:#b45309;">${fullYear.total || 0}</td>
            <td class="td-delivery" style="color:#059669; font-weight:900;">${fullYear.early || 0}</td>
            <td class="td-delivery" style="color:#4338ca; font-weight:900;">${fullYear.on_time || 0}</td>
            <td class="td-delivery" style="color:#b91c1c; font-weight:900;">${fullYear.late || 0}</td>
            <td class="td-delivery" style="font-size:12.5px; font-weight:900; color:${(fullYear.delay_pct || 0) > 0 ? '#b91c1c' : '#15803d'}">${fullYear.delay_pct || 0}%</td>
            <td class="td-delivery" style="color:#92400e; font-weight:900;">
                ${yTargetPct}%
            </td>
            <td class="td-delivery" id="yBadgeWrap_0">
                ${yBadgeHtml}
            </td>
            <td class="td-errors td-errors-border-l" style="color:#b45309; font-weight:900;">${fullYear.total_errors || 0} đơn</td>
            <td class="td-errors" style="color:#92400e; font-weight:900;">
                ${yTargetErr}
            </td>
            <td class="td-errors td-errors-border-r" id="yBadgeErrWrap_0">
                ${yBadgeErrHtml}
            </td>
            <td class="td-orders td-orders-border-l" style="color:#065f46; font-weight:900;">
                ${yTargetMinOrders}
            </td>
            <td class="td-orders td-orders-border-r" id="yBadgeOrdersWrap_0">
                ${yBadgeOrdersHtml}
            </td>
            <td>
                ${isDirector ? `
                    <button onclick="window.openKpiTargetModal('year', 0, 'Cả Năm ${fullYear.year}')" style="font-size:10px; font-weight:800; color:#4f46e5; background:#eff6ff; border:1px solid #c7d2fe; padding:3px 6px; border-radius:6px; cursor:pointer;" title="Cấu hình KPI, Phần thưởng & Điều cam kết">⚙️ Cấu Hình</button>
                ` : '<span style="color:#94a3b8; font-size:11px; font-weight:700;">—</span>'}
            </td>
        </tr>
        `;

        // Monthly Cards Html
        const monthlyCardsHtml = months.map(m => {
            const mKey = `month_${m.month}`;
            const targetObj = targets[mKey];
            const targetPct = targetObj ? targetObj.target_max_delay_pct : 5.0;
            const targetErr = targetObj ? (targetObj.target_max_total_errors || 0) : 0;
            const targetMinOrders = targetObj ? (targetObj.target_min_total_orders || 0) : 0;
            const evalRule = targetObj ? (targetObj.eval_rule || 'ALL') : 'ALL';
            const rewardText = targetObj ? formatRewardText(targetObj.reward_text || '') : '';
            const commitments = targetObj ? (targetObj.commitments || []) : [];
            const companySupports = targetObj ? (targetObj.company_supports || []) : [];
            const companySupportEvals = targetObj ? (targetObj.company_support_evals || []) : [];
            const status = targetObj ? (targetObj.status || 'active') : 'not_created';
            const commitmentEvals = targetObj ? (targetObj.commitment_evals || []) : [];
            const completionPct = targetObj ? (targetObj.commitment_completion_pct || 0) : 0;

            const isCurrentMonth = m.month === realCurrentMonth && data.year === realCurrentYear;
            const isFutureMonth = (data.year > realCurrentYear) || (data.year === realCurrentYear && m.month > realCurrentMonth);

            // Check sequential unlocking (Prev month MUST be evaluated e.g. prevEvals.length > 0)
            let isUnlocked = true;
            if (m.month > 1) {
                const prevKey = `month_${m.month - 1}`;
                const prevTarget = targets[prevKey];
                const prevEvals = prevTarget ? (prevTarget.commitment_evals || []) : [];
                if (!prevTarget || prevEvals.length === 0) {
                    isUnlocked = false;
                }
            }

            // === 1. State: not_created (Chưa Tạo KPI) ===
            if (status === 'not_created') {
                if (!isUnlocked) {
                    return `
                    <div class="m-card ${isCurrentMonth ? 'is-current-month' : ''}" style="opacity:0.75; border:2px dashed #cbd5e1 !important; background:#f8fafc !important;">
                        <div class="m-card-header">
                            <div class="m-card-title" style="color:#64748b;">Tháng ${m.month}/${fullYear.year}</div>
                            <span class="badge-status badge-future" style="background:#f1f5f9; color:#64748b; border-color:#cbd5e1;">🔒 CẦN ĐÁNH GIÁ THÁNG ${m.month - 1}</span>
                        </div>
                        <div style="padding:20px 10px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <div style="font-size:24px; margin-bottom:6px;">🔒</div>
                            <div style="font-weight:800; color:#64748b; margin-bottom:4px;">🔒 Chưa Mở Khóa Tháng ${m.month}</div>
                            <div style="font-size:11.5px; font-weight:600; color:#94a3b8;">Cần hoàn thành Đánh Giá Cam Kết Tháng ${m.month - 1} trước.</div>
                        </div>
                    </div>
                    `;
                }

                return `
                <div class="m-card ${isCurrentMonth ? 'is-current-month' : ''}" style="opacity:0.85; border:2px dashed #cbd5e1 !important; background:#f8fafc !important;">
                    <div class="m-card-header">
                        <div class="m-card-title" style="color:#64748b;">Tháng ${m.month}/${fullYear.year}</div>
                        <span class="badge-status badge-future" style="background:#f1f5f9; color:#64748b; border-color:#cbd5e1;">🔒 CHƯA TẠO KPI</span>
                    </div>
                    <div style="padding:20px 10px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <div style="font-size:24px; margin-bottom:6px;">🔒</div>
                        <div style="font-weight:800; color:#3730a3; margin-bottom:6px;">✨ Đã mở khoá tạo KPI Tháng ${m.month}!</div>
                        <div style="font-size:11.5px; font-weight:600; color:#64748b; margin-bottom:14px;">Thiết lập chỉ tiêu Trễ, Chỉ tiêu Lỗi & các cam kết của Quản Lý Xưởng.</div>
                        ${canCreateKpi ? `
                            <button onclick="window.openKpiTargetModal('month', ${m.month}, 'Tháng ${m.month}/${fullYear.year}')" style="padding:8px 16px; background:linear-gradient(135deg,#4f46e5,#6366f1); color:#fff; border:none; font-weight:900; border-radius:8px; cursor:pointer; font-size:12.5px; box-shadow:0 4px 12px rgba(79,70,229,0.3);">
                                🆕 Tạo KPI Tháng ${m.month}
                            </button>
                        ` : `
                            <div style="font-size:11px; font-weight:700; color:#94a3b8;">(Cần tài khoản Quản Lý / Giám Đốc để tạo KPI)</div>
                        `}
                    </div>
                </div>
                `;
            }

            // === 2. Combined Badge & Reward check ===
            const hasConfiguredKpi = commitments.length > 0 || targetPct > 0 || targetErr > 0 || targetMinOrders > 0;
            const isPassDelay = (m.delay_pct || 0) <= targetPct;
            const isPassErr = targetErr > 0 ? ((m.total_errors || 0) <= targetErr) : true;
            const isPassOrders = targetMinOrders > 0 ? ((m.total || 0) >= targetMinOrders) : true;
            let isOverallAchieved = false;
            if (hasConfiguredKpi) {
                if (evalRule === 'ANY') {
                    isOverallAchieved = isPassDelay || (targetErr > 0 && isPassErr) || (targetMinOrders > 0 && isPassOrders);
                } else {
                    isOverallAchieved = isPassDelay && isPassErr && isPassOrders;
                }
            }

            const mBadgeHtml = hasConfiguredKpi
                ? getCombinedKpiBadgeHtml(isFutureMonth, m.total || 0, m.delay_pct || 0, targetPct, m.total_errors || 0, targetErr, evalRule, targetMinOrders)
                : `<span class="badge-status badge-future" style="background:#f1f5f9; color:#64748b; border-color:#cbd5e1;">⚙️ CHƯA CẤU HÌNH KPI</span>`;

            // Card Header Badge Status & Border
            let statusBadgeHtml = '';
            let cardBorderStyle = '';
            if (isCurrentMonth) {
                statusBadgeHtml = '<span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:#ffffff; font-size:9.5px; font-weight:900; padding:2px 6px; border-radius:6px; box-shadow:0 2px 6px rgba(245,158,11,0.3); letter-spacing:.3px;">⭐ HIỆN TẠI</span>';
            } else {
                statusBadgeHtml = `<span class="badge-status badge-warning" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">📝 THÁNG ${m.month}</span>`;
            }

            return `
            <div class="m-card ${isCurrentMonth ? 'is-current-month' : ''}" id="mCard_${m.month}" style="${cardBorderStyle}">
                <div class="m-card-header">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <div class="m-card-title">Tháng ${m.month}/${fullYear.year}</div>
                        ${statusBadgeHtml}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${(isUnlocked && status !== 'completed' && isDirector) ? `
                            <button onclick="window.openKpiTargetModal('month', ${m.month}, 'Tháng ${m.month}/${fullYear.year}')" style="font-size:10px; font-weight:900; color:#4f46e5; background:#eff6ff; border:1px solid #c7d2fe; padding:3px 8px; border-radius:6px; cursor:pointer;" title="Cấu hình KPI, Quy tắc đánh giá, Phần thưởng & Điều cam kết">⚙️ Cấu Hình KPI</button>
                        ` : ''}
                        ${(isDirector && commitmentEvals.length > 0) ? `
                            <button onclick="window.openKpiEvalModal('month', ${m.month}, 'Tháng ${m.month}/${fullYear.year}')" style="font-size:10px; font-weight:900; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; padding:3px 8px; border-radius:6px; cursor:pointer; box-shadow:0 1px 4px rgba(5,150,105,0.15);" title="Giám đốc chỉnh sửa kết quả đánh giá cam kết">✏️ Sửa Đánh Giá</button>
                        ` : ''}
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
                    <div class="m-stat-row" style="display:flex; align-items:center; justify-content:space-between;">
                        <span class="m-stat-label" style="display:flex; align-items:center; gap:4px; font-weight:800; color:#9a3412;">
                            ⚠️ Tổng Đơn Lỗi:
                        </span>
                        ${isDirector ? `
                            <div style="display:flex; align-items:center; gap:4px;">
                                <input type="number" min="0" step="1" class="kpi-actual-error-ipt" data-period="month" data-val="${m.month}" value="${(m.total_errors !== null && m.total_errors !== undefined) ? m.total_errors : ''}" placeholder="Nhập số lỗi..." ${(!isUnlocked || status === 'completed' || commitmentEvals.length > 0) ? 'disabled' : ''} onchange="window._kpiDelaySaveActualErrors(this)" oninput="window._kpiDelayUpdateBadgeRealtimeForError(this)" style="width:85px; padding:3px 8px; border:1.5px solid ${(m.total_errors !== null && m.total_errors !== undefined) ? '#fdba74' : '#fca5a5'}; border-radius:6px; font-size:12px; font-weight:900; color:#9a3412; outline:none; text-align:center; background:${!isUnlocked ? '#f1f5f9' : ((m.total_errors !== null && m.total_errors !== undefined) ? '#ffffff' : '#fff5f5')}; box-shadow:0 1px 3px rgba(154,52,18,0.08);" title="${!isUnlocked ? 'Tháng này chưa mở khoá điền đơn lỗi (cần hoàn thành đánh giá tháng trước)' : 'Giám đốc nhập số đơn lỗi thực tế trong tháng (bắt buộc trước khi đánh giá)'}">
                                <span style="font-size:11.5px; font-weight:900; color:#9a3412;">đơn</span>
                            </div>
                        ` : `
                            <span class="m-stat-val" style="color:#b45309; background:#fff7ed; padding:2px 8px; border-radius:6px; border:1px solid #fed7aa; font-weight:900;">${(m.total_errors !== null && m.total_errors !== undefined) ? (m.total_errors + ' đơn') : '⏳ Chưa điền'}</span>
                        `}
                    </div>
                </div>

                <!-- KPI Targets Read-only Display (Configured via ⚙️ Cấu Hình KPI) -->
                <div class="m-kpi-input-wrap">
                    <div class="m-kpi-input-row">
                        <span class="m-kpi-label">🎯 KPI Trễ Tối Đa:</span>
                        <span class="m-stat-val" style="color:#4338ca; background:#e0e7ff; padding:2px 10px; border-radius:6px; border:1px solid #c7d2fe; font-weight:900;">${targetPct}%</span>
                    </div>
                    <div class="m-kpi-input-row">
                        <span class="m-kpi-label">⚠️ KPI Lỗi Tối Đa:</span>
                        <span class="m-stat-val" style="color:#b45309; background:#fff7ed; padding:2px 10px; border-radius:6px; border:1px solid #fed7aa; font-weight:900;">${targetErr} đơn</span>
                    </div>
                    <div class="m-kpi-input-row">
                        <span class="m-kpi-label">📦 KPI Tổng Đơn Tối Thiểu:</span>
                        <span class="m-stat-val" style="color:#065f46; background:#ecfdf5; padding:2px 10px; border-radius:6px; border:1px solid #a7f3d0; font-weight:900;">${targetMinOrders} đơn</span>
                    </div>
                </div>

                <!-- Rule Badge Section -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; gap:4px; flex-wrap:wrap;">
                    <span style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px; border:1px solid #e2e8f0;">
                        ${evalRule === 'ANY' ? '⚖️ Quy tắc: Đạt 1 Trong Các Tiêu Chí' : '⚖️ Quy tắc: Đạt Tất Cả'}
                    </span>
                </div>

                <!-- Commitments Box Section -->
                <div style="margin-top:10px; background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%); border:1.5px solid #e2e8f0; border-radius:12px; padding:10px 12px; box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="font-size:11.5px; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:6px;">
                            📋 Cam Kết Quản Lý Xưởng <span style="background:#e0e7ff; color:#4338ca; font-size:10px; padding:1px 6px; border-radius:99px; font-weight:900;">${commitments.length}</span>
                        </span>
                    </div>

                    ${commitments.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${commitments.map((c, idx) => {
                                const ev = commitmentEvals[idx];
                                let badgeTag = '<span style="font-size:10px; font-weight:800; color:#94a3b8; background:#f1f5f9; padding:2px 7px; border-radius:99px; border:1px solid #cbd5e1; white-space:nowrap;">⏳ Chưa đánh giá</span>';
                                let noteBlock = '';
                                let rowStyle = 'border-left:4px solid #cbd5e1; background:#ffffff; border:1px solid #e2e8f0; border-left-color:#cbd5e1;';

                                if (ev) {
                                    if (ev.passed) {
                                        badgeTag = `<span style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:99px; border:1px solid #86efac; white-space:nowrap; box-shadow:0 1px 2px rgba(21,128,61,0.1);">✅ ĐẠT</span>`;
                                        if (ev.note) {
                                            noteBlock = `
                                            <div style="margin-top:4px; padding:5px 8px; background:#f0fdf4; border-radius:6px; border:1px solid #bbf7d0; font-size:10.5px; font-weight:700; color:#166534; display:flex; align-items:flex-start; gap:4px; line-height:1.35; word-break:break-word;">
                                                <span style="flex-shrink:0;">💬</span> <span><b>Ghi chú:</b> ${ev.note}</span>
                                            </div>
                                            `;
                                        }
                                        rowStyle = 'border-left:4px solid #22c55e; background:#ffffff; border:1px solid #dcfce7; border-left-color:#22c55e;';
                                    } else {
                                        badgeTag = `<span style="font-size:10px; font-weight:900; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:99px; border:1px solid #fca5a5; white-space:nowrap; box-shadow:0 1px 2px rgba(185,28,28,0.1);">❌ CHƯA ĐẠT</span>`;
                                        if (ev.note) {
                                            noteBlock = `
                                            <div style="margin-top:4px; padding:5px 8px; background:#fef2f2; border-radius:6px; border:1px solid #fecaca; font-size:10.5px; font-weight:700; color:#991b1b; display:flex; align-items:flex-start; gap:4px; line-height:1.35; word-break:break-word;">
                                                <span style="flex-shrink:0;">💬</span> <span><b>Ghi chú:</b> ${ev.note}</span>
                                            </div>
                                            `;
                                        }
                                        rowStyle = 'border-left:4px solid #ef4444; background:#ffffff; border:1px solid #fee2e2; border-left-color:#ef4444;';
                                    }
                                }

                                return `
                                <div style="display:flex; flex-direction:column; gap:4px; padding:8px 10px; border-radius:8px; ${rowStyle} font-size:11.5px; line-height:1.4; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                                    <!-- Header Row: Number + Commitment Text + Status Pill -->
                                    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
                                        <div style="font-weight:800; color:#0f172a; flex:1; word-break:break-word;">
                                            <span style="color:#64748b; font-weight:900;">${idx + 1}.</span> ${c}
                                        </div>
                                        <div style="flex-shrink:0;">${badgeTag}</div>
                                    </div>

                                    <!-- Sub-Block: Note Drawer -->
                                    ${noteBlock}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `<div style="font-size:10.5px; font-style:italic; color:#94a3b8; text-align:center; padding:6px 0;">Chưa lập điều cam kết.</div>`}
                </div>

                <!-- Company Supports Box Section -->
                <div style="margin-top:8px; background:linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%); border:1.5px solid #bae6fd; border-radius:12px; padding:10px 12px; box-shadow:0 2px 8px rgba(2,132,199,0.03);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e0f2fe; padding-bottom:6px;">
                        <span style="font-size:11.5px; font-weight:900; color:#0369a1; display:flex; align-items:center; gap:6px;">
                            🤝 QLX Cần Công Ty Hỗ Trợ <span style="background:#e0f2fe; color:#0369a1; font-size:10px; padding:1px 6px; border-radius:99px; font-weight:900;">${companySupports.length}</span>
                        </span>
                    </div>

                    ${companySupports.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${companySupports.map((s, idx) => {
                                const ev = companySupportEvals[idx];
                                let badgeTag = '<span style="font-size:10px; font-weight:800; color:#94a3b8; background:#f1f5f9; padding:2px 7px; border-radius:99px; border:1px solid #cbd5e1; white-space:nowrap;">⏳ Chưa đánh giá</span>';
                                let noteBlock = '';
                                let rowStyle = 'border-left:4px solid #cbd5e1; background:#ffffff; border:1px solid #bae6fd; border-left-color:#cbd5e1;';

                                if (ev) {
                                    if (ev.passed) {
                                        badgeTag = `<span style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:99px; border:1px solid #86efac; white-space:nowrap; box-shadow:0 1px 2px rgba(21,128,61,0.1);">✅ ĐÃ HỖ TRỢ</span>`;
                                        if (ev.note) {
                                            noteBlock = `
                                            <div style="margin-top:4px; padding:5px 8px; background:#f0fdf4; border-radius:6px; border:1px solid #bbf7d0; font-size:10.5px; font-weight:700; color:#166534; display:flex; align-items:flex-start; gap:4px; line-height:1.35; word-break:break-word;">
                                                <span style="flex-shrink:0;">💬</span> <span><b>Ghi chú:</b> ${ev.note}</span>
                                            </div>
                                            `;
                                        }
                                        rowStyle = 'border-left:4px solid #22c55e; background:#ffffff; border:1px solid #dcfce7; border-left-color:#22c55e;';
                                    } else {
                                        badgeTag = `<span style="font-size:10px; font-weight:900; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:99px; border:1px solid #fca5a5; white-space:nowrap; box-shadow:0 1px 2px rgba(185,28,28,0.1);">❌ CHƯA HỖ TRỢ</span>`;
                                        if (ev.note) {
                                            noteBlock = `
                                            <div style="margin-top:4px; padding:5px 8px; background:#fef2f2; border-radius:6px; border:1px solid #fecaca; font-size:10.5px; font-weight:700; color:#991b1b; display:flex; align-items:flex-start; gap:4px; line-height:1.35; word-break:break-word;">
                                                <span style="flex-shrink:0;">💬</span> <span><b>Ghi chú:</b> ${ev.note}</span>
                                            </div>
                                            `;
                                        }
                                        rowStyle = 'border-left:4px solid #ef4444; background:#ffffff; border:1px solid #fee2e2; border-left-color:#ef4444;';
                                    }
                                }

                                return `
                                <div style="display:flex; flex-direction:column; gap:4px; padding:8px 10px; border-radius:8px; ${rowStyle} font-size:11.5px; line-height:1.4; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                                    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
                                        <div style="font-weight:800; color:#0f172a; flex:1; word-break:break-word;">
                                            <span style="color:#0284c7; font-weight:900;">${idx + 1}.</span> ${s}
                                        </div>
                                        <div style="flex-shrink:0;">${badgeTag}</div>
                                    </div>
                                    ${noteBlock}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `<div style="font-size:10.5px; font-style:italic; color:#94a3b8; text-align:center; padding:4px 0;">Chưa ghi nhận nội dung hỗ trợ.</div>`}
                </div>

                <!-- Card Summary: Left = Automatic KPI Result & Reward, Right = Commitment Progress -->
                <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <!-- Card Left: Kết Quả KPI & Thưởng -->
                    ${hasConfiguredKpi ? `
                        <div style="background:${isOverallAchieved ? 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)' : 'linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)'}; border:1.5px solid ${isOverallAchieved ? '#86efac' : '#fca5a5'}; border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; gap:3px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                            <div style="font-size:10.5px; font-weight:800; color:${isOverallAchieved ? '#166534' : '#991b1b'}; display:flex; align-items:center; justify-content:space-between;">
                                <span>${isOverallAchieved ? '🏆 Kết Quả KPI' : '❌ Kết Quả KPI'}</span>
                            </div>
                            <div style="font-size:13.5px; font-weight:900; color:${isOverallAchieved ? '#15803d' : '#b91c1c'};">
                                ${isOverallAchieved ? '🎉 ĐẠT KPI THÁNG' : '❌ KHÔNG ĐẠT KPI'}
                            </div>
                        </div>
                    ` : `
                        <div style="background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; gap:3px;">
                            <div style="font-size:10.5px; font-weight:800; color:#64748b;">⏳ Kết Quả KPI</div>
                            <div style="font-size:13.5px; font-weight:900; color:#64748b;">⚙️ CHƯA CẤU HÌNH KPI</div>
                        </div>
                    `}

                    <!-- Card Right: Tiến Độ Cam Kết -->
                    <div style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%); border:1.5px solid #ddd6fe; border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; gap:3px; box-shadow:0 2px 6px rgba(124,58,237,0.05);">
                        <div style="font-size:10.5px; font-weight:800; color:#6d28d9; display:flex; align-items:center; justify-content:space-between;">
                            <span>📊 Tiến Độ Cam Kết</span>
                            <span style="font-size:10px; font-weight:900; color:#5b21b6; background:#ffffff; padding:1px 6px; border-radius:99px; border:1px solid #c4b5fd;">${commitmentEvals.filter(e => e.passed).length}/${commitments.length} điều đạt</span>
                        </div>
                        <div style="font-size:15.5px; font-weight:900; color:#4c1d95; display:flex; align-items:baseline; gap:4px;">
                            ${completionPct}% <span style="font-size:10px; font-weight:700; color:#6d28d9;">hoàn thành</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons Footer -->
                ${(isDirector && commitments.length > 0) ? `
                    <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                        ${commitmentEvals.length > 0 ? `
                            <div style="width:100%; padding:10px 12px; background:linear-gradient(135deg,#059669,#047857); color:#ffffff; border-radius:8px; font-size:12px; font-weight:900; text-align:center; box-shadow:0 2px 8px rgba(5,150,105,0.25); cursor:default; user-select:none;">
                                ✅ ĐÃ ĐÁNH GIÁ
                            </div>
                        ` : `
                            <button onclick="window.openKpiEvalModal('month', ${m.month}, 'Tháng ${m.month}/${fullYear.year}')" style="width:100%; padding:8px 12px; background:linear-gradient(135deg,#4f46e5,#4338ca); color:#ffffff; border:none; border-radius:8px; font-size:11.5px; font-weight:900; cursor:pointer; box-shadow:0 2px 8px rgba(79,70,229,0.25);">
                                📊 Đánh Giá Cam Kết Quản Lý Xưởng
                            </button>
                        `}
                    </div>
                ` : ''}
            </div>
            `;
        }).join('');

        bodyArea.innerHTML = `
        <!-- Card 1: Donut & Quarter Summary Table (Full Row Top Card) -->
        <div class="kpi-card">
            <div class="kpi-card-title">
                <span>📊 Tổng Quan Tiến Độ & Thống Kê Đơn Lỗi Phân Kỳ (${data.year})</span>
                <span style="font-size:11px; font-weight:700; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:6px;">Dữ liệu tự động Tra Soát Chậm Đơn & Tổng Lỗi Đánh Giá</span>
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
                                <th rowspan="2" style="text-align:left; color:#ffffff; vertical-align:middle;">Kỳ</th>
                                <th colspan="7" class="th-group-delivery">📦 TIẾN ĐỘ GIAO HÀNG</th>
                                <th colspan="3" class="th-group-errors">🔍 THỐNG KÊ LỖI ĐƠN</th>
                                <th colspan="2" class="th-group-orders">📊 TỔNG ĐƠN HÀNG</th>
                                <th rowspan="2" style="color:#ffffff; vertical-align:middle;">⚙️ Cấu Hình</th>
                            </tr>
                            <tr>
                                <th class="th-sub-delivery" style="color:#ffffff;">📦 Tổng Đơn</th>
                                <th class="th-sub-delivery" style="color:#ffffff;">🟢 Gửi Sớm</th>
                                <th class="th-sub-delivery" style="color:#ffffff;">⏰ Đúng Hẹn</th>
                                <th class="th-sub-delivery" style="color:#ffffff;">🚨 Trễ Hẹn</th>
                                <th class="th-sub-delivery" style="color:#ffffff;">📊 % Trễ</th>
                                <th class="th-sub-delivery" style="color:#ffffff;">🎯 KPI Trễ</th>
                                <th class="th-sub-delivery" style="color:#ffffff;">🏆 Kết Quả</th>
                                <th class="th-sub-errors" style="color:#ffffff;">⚠️ Tổng Lỗi</th>
                                <th class="th-sub-errors" style="color:#ffffff;">🎯 KPI Lỗi</th>
                                <th class="th-sub-errors" style="color:#ffffff;">🏆 Kết Quả</th>
                                <th class="th-sub-orders" style="color:#ffffff;">🎯 KPI Đơn</th>
                                <th class="th-sub-orders" style="color:#ffffff;">🏆 Kết Quả</th>
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
                const qIptOrders = document.querySelector(`.kpi-q-orders-input[data-period="quarter"][data-val="${pVal}"]`);
                const targetPct = qIptDelay ? (parseFloat(qIptDelay.value) || 0) : 5.0;
                const targetErr = qIptErr ? (parseInt(qIptErr.value, 10) || 0) : 0;
                const targetMinOrders = qIptOrders ? (parseInt(qIptOrders.value, 10) || 0) : 0;

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

                const wrapOrders = document.getElementById(`qBadgeOrdersWrap_${pVal}`);
                if (wrapOrders) {
                    if (isFutureQ && qData.total === 0) {
                        wrapOrders.innerHTML = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                    } else if (targetMinOrders > 0) {
                        const isPassOrders = (qData.total || 0) >= targetMinOrders;
                        wrapOrders.innerHTML = `<span class="badge-status ${isPassOrders ? 'badge-success' : 'badge-danger'}">${isPassOrders ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                    } else {
                        wrapOrders.innerHTML = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                    }
                }
            }
        } else if (pType === 'year') {
            const yData = _kpiDelayState.data.fullYear;
            if (yData) {
                const yIptDelay = document.querySelector(`.kpi-q-input[data-period="year"][data-val="0"]`);
                const yIptErr = document.querySelector(`.kpi-q-err-input[data-period="year"][data-val="0"]`);
                const yIptOrders = document.querySelector(`.kpi-q-orders-input[data-period="year"][data-val="0"]`);
                const targetPct = yIptDelay ? (parseFloat(yIptDelay.value) || 0) : 5.0;
                const targetErr = yIptErr ? (parseInt(yIptErr.value, 10) || 0) : 0;
                const targetMinOrders = yIptOrders ? (parseInt(yIptOrders.value, 10) || 0) : 0;

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

                const wrapOrders = document.getElementById(`yBadgeOrdersWrap_0`);
                if (wrapOrders) {
                    if (isFutureYear) {
                        wrapOrders.innerHTML = `<span class="badge-status badge-future">⏳ Chưa Tới</span>`;
                    } else if (targetMinOrders > 0) {
                        const isPassOrders = (yData.total || 0) >= targetMinOrders;
                        wrapOrders.innerHTML = `<span class="badge-status ${isPassOrders ? 'badge-success' : 'badge-danger'}">${isPassOrders ? '🔥 Đạt' : '🚨 Không Đạt'}</span>`;
                    } else {
                        wrapOrders.innerHTML = `<span style="font-size:11px; font-weight:700; color:#64748b;">—</span>`;
                    }
                }
            }
        } else if (pType === 'month') {
            const mData = _kpiDelayState.data.months.find(m => m.month === pVal);
            if (mData) {
                const key = `month_${pVal}`;
                const targetObj = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};
                const targetPct = targetObj.target_max_delay_pct !== undefined ? targetObj.target_max_delay_pct : 5.0;
                const targetErr = targetObj.target_max_total_errors !== undefined ? targetObj.target_max_total_errors : 0;
                const targetMinOrders = targetObj.target_min_total_orders !== undefined ? targetObj.target_min_total_orders : 0;
                const evalRule = targetObj.eval_rule || 'ALL';

                const isFutureMonth = (_kpiDelayState.year > realCurrentYear) || (_kpiDelayState.year === realCurrentYear && pVal > realCurrentMonth);

                const wrap = document.getElementById(`mBadgeWrap_${pVal}`);
                if (wrap) {
                    wrap.innerHTML = getCombinedKpiBadgeHtml(isFutureMonth, mData.total || 0, mData.delay_pct || 0, targetPct, mData.total_errors || 0, targetErr, evalRule, targetMinOrders);
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

        document.querySelectorAll('.kpi-q-orders-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            if (!targetsMap[key]) targetsMap[key] = { period_type: pType, period_value: pVal };
            targetsMap[key].target_min_total_orders = parseInt(ipt.value, 10) || 0;
        });

        // Collect monthly inputs
        document.querySelectorAll('.kpi-m-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            const existingTarget = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};
            if (!targetsMap[key]) {
                targetsMap[key] = {
                    period_type: pType,
                    period_value: pVal,
                    commitments: existingTarget.commitments || [],
                    company_supports: existingTarget.company_supports || []
                };
            }
            targetsMap[key].target_max_delay_pct = parseFloat(ipt.value) || 0;
        });

        document.querySelectorAll('.kpi-m-err-input').forEach(ipt => {
            const pType = ipt.dataset.period;
            const pVal = parseInt(ipt.dataset.val, 10);
            const key = `${pType}_${pVal}`;
            const existingTarget = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};
            if (!targetsMap[key]) {
                targetsMap[key] = {
                    period_type: pType,
                    period_value: pVal,
                    commitments: existingTarget.commitments || [],
                    company_supports: existingTarget.company_supports || []
                };
            }
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

    window._kpiDelaySaveActualErrors = async function(ipt) {
        if (!ipt) return;
        const pType = ipt.dataset.period || 'month';
        const pVal = parseInt(ipt.dataset.val, 10);
        const rawVal = ipt.value.trim();
        if (rawVal === '') return;
        const val = parseInt(rawVal, 10);
        if (isNaN(val)) return;

        if (pType === 'month' && pVal > 1) {
            const targetsMap = (_kpiDelayState.data && _kpiDelayState.data.targets) || {};
            const prevKey = `month_${pVal - 1}`;
            const prevTarget = targetsMap[prevKey];
            const prevEvals = prevTarget ? (prevTarget.commitment_evals || []) : [];
            const isPrevDone = prevTarget && (prevTarget.status === 'completed' || prevTarget.status === 'evaluating' || prevEvals.length > 0);
            if (!isPrevDone) {
                alert(`⚠️ Tháng ${pVal - 1} chưa được đánh giá xong!\nBạn không thể nhập số đơn lỗi cho Tháng ${pVal}.`);
                ipt.value = '';
                return;
            }
        }

        try {
            const res = await fetch('/api/kpi-delay/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: _kpiDelayState.year,
                    segment: _kpiDelayState.segment,
                    period_type: pType,
                    period_value: pVal,
                    actual_total_errors: val
                })
            });
            const data = await res.json();
            if (data.ok) {
                await loadKpiDelayData();
                if (typeof showToast === 'function') {
                    showToast(`✅ Đã tự động lưu Số Đơn Lỗi Thực Tế Tháng ${pVal}: ${val} đơn`, 'success');
                }
            } else {
                alert('❌ Lỗi lưu số đơn lỗi: ' + (data.error || 'Không thể lưu'));
            }
        } catch (e) {
            console.error('_kpiDelaySaveActualErrors error:', e);
        }
    };

    window._kpiDelayUpdateBadgeRealtimeForError = function(ipt) {
        if (!ipt) return;
        const monthVal = parseInt(ipt.dataset.val, 10);
        const newErrVal = parseInt(ipt.value, 10) || 0;

        const mData = (_kpiDelayState.data && _kpiDelayState.data.months) ? _kpiDelayState.data.months.find(m => m.month === monthVal) : null;
        if (!mData) return;

        mData.total_errors = newErrVal;

        const key = `month_${monthVal}`;
        const targetObj = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};
        const targetPct = targetObj.target_max_delay_pct !== undefined ? targetObj.target_max_delay_pct : 5.0;
        const targetErr = targetObj.target_max_total_errors !== undefined ? targetObj.target_max_total_errors : 0;
        const evalRule = targetObj.eval_rule || 'ALL';

        const badgeWrap = document.getElementById(`mBadgeWrap_${monthVal}`);
        if (badgeWrap) {
            const targetMinOrders = targetObj.target_min_total_orders !== undefined ? targetObj.target_min_total_orders : 0;
            badgeWrap.innerHTML = getCombinedKpiBadgeHtml(false, mData.total || 0, mData.delay_pct || 0, targetPct, newErrVal, targetErr, evalRule, targetMinOrders);
        }
    };

    function formatRewardText(val) {
        if (!val) return '';
        const str = String(val).trim();
        if (!str) return '';
        const cleanedNoDots = str.replace(/\./g, '');
        if (/^\d+$/.test(cleanedNoDots)) {
            return Number(cleanedNoDots).toLocaleString('vi-VN');
        }
        if (/^\d+\s*[đVNĐvnd]+$/i.test(cleanedNoDots)) {
            const num = cleanedNoDots.replace(/[^\d]/g, '');
            return Number(num).toLocaleString('vi-VN') + 'đ';
        }
        return str.replace(/(\d+)/g, function(numStr) {
            if (numStr.length >= 4) {
                return Number(numStr).toLocaleString('vi-VN');
            }
            return numStr;
        });
    }

    window._formatRewardInput = function(ipt) {
        if (!ipt) return;
        const val = ipt.value;
        if (!val) return;
        const cleanedNoDots = val.replace(/\./g, '');
        if (/^\d+$/.test(cleanedNoDots)) {
            ipt.value = Number(cleanedNoDots).toLocaleString('vi-VN');
        } else if (/^\d+\s*[đVNĐvnd]+$/i.test(cleanedNoDots)) {
            const digits = cleanedNoDots.replace(/[^\d]/g, '');
            ipt.value = Number(digits).toLocaleString('vi-VN') + 'đ';
        }
    };

    // ========== GLOBAL MODAL CONTROLLERS ==========
    var _editingModalTarget = { period_type: 'month', period_value: 1, title: '' };

    window.openKpiTargetModal = function(periodType, periodValue, titleLabel) {
        const isDirector = (_kpiDelayState.userRole === 'giam_doc' || (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc'));
        if (!isDirector) {
            alert('⚠️ Chỉ Giám Đốc mới có quyền cấu hình KPI!');
            return;
        }
        if (periodType === 'month' && periodValue > 1) {
            const targetsMap = (_kpiDelayState.data && _kpiDelayState.data.targets) || {};
            const prevKey = `month_${periodValue - 1}`;
            const prevTarget = targetsMap[prevKey];
            const prevEvals = prevTarget ? (prevTarget.commitment_evals || []) : [];
            const isPrevDone = prevTarget && (prevTarget.status === 'completed' || prevTarget.status === 'evaluating' || prevEvals.length > 0);
            if (!isPrevDone) {
                alert(`⚠️ Tháng ${periodValue - 1} chưa được đánh giá xong!\nVui lòng hoàn thành đánh giá Tháng ${periodValue - 1} trước khi cấu hình KPI Tháng ${periodValue}.`);
                return;
            }
        }

        _editingModalTarget = { period_type: periodType, period_value: periodValue, title: titleLabel };
        const key = `${periodType}_${periodValue}`;
        const targetObj = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};

        const titleEl = document.getElementById('kpiModalTitle');
        if (titleEl) titleEl.innerText = `⚙️ Cấu Hình KPI & Cam Kết Quản Lý Xưởng — ${titleLabel}`;

        const delayIpt = document.getElementById('kpiModalDelayPct');
        if (delayIpt) delayIpt.value = targetObj.target_max_delay_pct !== undefined ? targetObj.target_max_delay_pct : 5.0;

        const errIpt = document.getElementById('kpiModalTotalErr');
        if (errIpt) errIpt.value = targetObj.target_max_total_errors !== undefined ? targetObj.target_max_total_errors : 0;

        const minOrdersIpt = document.getElementById('kpiModalMinOrders');
        if (minOrdersIpt) minOrdersIpt.value = targetObj.target_min_total_orders !== undefined ? targetObj.target_min_total_orders : 0;

        const evalRule = targetObj.eval_rule || 'ALL';
        const radio = document.querySelector(`input[name="kpiEvalRule"][value="${evalRule}"]`);
        if (radio) radio.checked = true;

        const rewardIpt = document.getElementById('kpiModalReward');
        if (rewardIpt) rewardIpt.value = formatRewardText(targetObj.reward_text || '');

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

        // Render company supports list
        const companySupports = Array.isArray(targetObj.company_supports) ? targetObj.company_supports : [];
        const supportContainer = document.getElementById('kpiModalSupportsList');
        if (supportContainer) {
            supportContainer.innerHTML = '';
            if (companySupports.length === 0) {
                window.addSupportRow('');
            } else {
                companySupports.forEach(s => window.addSupportRow(s));
            }
        }

        const overlay = document.getElementById('kpiTargetModalOverlay');
        if (overlay) overlay.style.display = 'flex';

        // Load historical benchmarks asynchronously for past 3 years
        window.loadKpiHistoricalBenchmarks(periodType, periodValue);
    };

    // ========== HISTORICAL BENCHMARKS CONTROLLER ==========
    window.loadKpiHistoricalBenchmarks = async function(periodType, periodValue) {
        const box = document.getElementById('kpiModalHistoricalBox');
        if (!box) return;

        const currentYear = _kpiDelayState.year || new Date().getFullYear();
        const pastYears = [currentYear - 1, currentYear - 2, currentYear - 3];

        box.style.display = 'block';
        box.innerHTML = `
            <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                <span>💡 ${periodType === 'quarter' ? 'Gợi Ý Chỉ Số 4 Quý Của 3 Năm Gần Nhất:' : 'Gợi Ý Chỉ Số Thực Tế Các Năm Trước (' + pastYears.join(', ') + '):'}</span>
            </div>
            <div style="font-size:12px; font-weight:700; color:#15803d; padding:10px; text-align:center; background:#ffffff; border-radius:8px; border:1px dashed #86efac;">
                ⏳ Đang truy xuất chỉ số thực tế lịch sử...
            </div>
        `;

        try {
            const res = await fetch(`/api/kpi-delay/historical-benchmarks?year=${currentYear}&segment=${_kpiDelayState.segment}&period_type=${periodType}&period_value=${periodValue}`);
            const data = await res.json();

            if (!data.ok || !Array.isArray(data.benchmarks)) {
                box.innerHTML = `<div style="font-size:12px; font-weight:700; color:#dc2626; padding:8px; text-align:center;">⚠️ Không thể nạp dữ liệu lịch sử</div>`;
                return;
            }

            if (periodType === 'quarter') {
                const targetQ = parseInt(periodValue, 10);
                const tableRowsHtml = data.benchmarks.map(b => {
                    const qColsHtml = [1, 2, 3, 4].map(q => {
                        const qInfo = b.quarters?.[q] || { total: 0, delay_pct: 0, total_errors: 0 };
                        const isCurQ = q === targetQ;

                        if (isCurQ) {
                            return `
                            <td style="padding:4px 6px; text-align:center; background:#e0f2fe; border:1.5px solid #0284c7; border-radius:6px;">
                                <div style="font-size:11.5px; font-weight:900; color:#0369a1;">⭐ Q${q}: <b>${qInfo.total}</b> đơn</div>
                                <div style="font-size:10.5px; font-weight:800; color:${qInfo.delay_pct > 0 ? '#dc2626' : '#059669'};">${qInfo.delay_pct}% trễ | ${qInfo.total_errors} lỗi</div>
                            </td>
                            `;
                        } else {
                            return `
                            <td style="padding:4px 6px; text-align:center; background:#ffffff;">
                                <div style="font-size:11.5px; font-weight:700; color:#334155;">Q${q}: <b>${qInfo.total}</b> đơn</div>
                                <div style="font-size:10.5px; font-weight:600; color:#64748b;">${qInfo.delay_pct}% trễ | ${qInfo.total_errors} lỗi</div>
                            </td>
                            `;
                        }
                    }).join('');

                    const curQInfo = b.quarters?.[targetQ] || { total: 0, delay_pct: 0, total_errors: 0 };

                    return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:4px 8px; font-weight:900; color:#166534; white-space:nowrap; background:#f8fafc;">📅 Năm ${b.year}</td>
                        ${qColsHtml}
                        <td style="padding:4px 6px; text-align:center; background:#f8fafc;">
                            <button type="button" onclick="window.applyHistoricalBenchmark(${curQInfo.delay_pct}, ${curQInfo.total_errors}, ${curQInfo.total})" style="padding:3px 8px; background:linear-gradient(135deg,#0284c7,#0369a1); color:#ffffff; border:none; border-radius:6px; font-size:11px; font-weight:900; cursor:pointer; box-shadow:0 2px 4px rgba(2,132,199,0.2);" title="Áp dụng chỉ số Quý ${targetQ} năm ${b.year} vào 3 ô cấu hình phía trên">
                                📌 Áp dụng Q${targetQ}
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');

                box.innerHTML = `
                    <div style="font-size:12px; font-weight:900; color:#166534; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                        <span>💡 Gợi Ý Chỉ Số Thực Tế 4 Quý Của 3 Năm Gần Nhất (Hiển Thị Đủ 3 Chỉ Số KPI):</span>
                        <span style="font-size:10.5px; font-weight:800; color:#0369a1; background:#e0f2fe; border:1px solid #bae6fd; padding:1px 6px; border-radius:6px;">Quý đang chọn: Q${targetQ}</span>
                    </div>
                    <div style="overflow-x:auto; background:#ffffff; border:1px solid #bbf7d0; border-radius:8px; padding:2px;">
                        <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                            <thead>
                                <tr style="background:#f0fdf4; color:#166534; font-size:11px; font-weight:800; border-bottom:1px solid #bbf7d0;">
                                    <th style="padding:4px 8px; text-align:left; width:75px;">Năm</th>
                                    <th style="padding:4px 6px; text-align:center;">Quý 1</th>
                                    <th style="padding:4px 6px; text-align:center;">Quý 2</th>
                                    <th style="padding:4px 6px; text-align:center;">Quý 3</th>
                                    <th style="padding:4px 6px; text-align:center;">Quý 4</th>
                                    <th style="padding:4px 6px; text-align:center; width:110px;">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                const tableRowsHtml = data.benchmarks.map(b => {
                    return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:6px 8px; font-weight:900; color:#166534; white-space:nowrap; background:#f8fafc;">📅 Năm ${b.year}</td>
                        <td style="padding:6px 10px; text-align:center; font-weight:800; color:#0f172a;">📦 <b>${b.total}</b> đơn</td>
                        <td style="padding:6px 10px; text-align:center; font-weight:800; color:${b.delay_pct > 0 ? '#dc2626' : '#059669'};">🚨 <b>${b.delay_pct}%</b> trễ <span style="font-size:10.5px; font-weight:600; color:#64748b;">(${b.late} đơn trễ)</span></td>
                        <td style="padding:6px 10px; text-align:center; font-weight:800; color:#b45309;">⚠️ <b>${b.total_errors}</b> lỗi</td>
                        <td style="padding:6px 8px; text-align:center; background:#f8fafc;">
                            <button type="button" onclick="window.applyHistoricalBenchmark(${b.delay_pct}, ${b.total_errors}, ${b.total})" style="padding:3px 10px; background:linear-gradient(135deg,#166534,#15803d); color:#ffffff; border:none; border-radius:6px; font-size:11px; font-weight:900; cursor:pointer; box-shadow:0 2px 4px rgba(21,128,61,0.2);" title="Tự động điền 3 chỉ số thực tế năm ${b.year} vào các ô phía trên">
                                📌 Áp Dụng Nhanh
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');

                const pTitle = periodType === 'month' ? `Tháng ${periodValue}` : 'Cả Năm';

                box.innerHTML = `
                    <div style="font-size:12px; font-weight:900; color:#166534; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                        <span>💡 Gợi Ý Chỉ Số Thực Tế ${pTitle} Của 3 Năm Gần Nhất (3 Chỉ Số KPI):</span>
                        <span style="font-size:10.5px; font-weight:800; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:1px 6px; border-radius:6px;">Năm ${pastYears.join(', ')}</span>
                    </div>
                    <div style="overflow-x:auto; background:#ffffff; border:1px solid #bbf7d0; border-radius:8px; padding:2px;">
                        <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                            <thead>
                                <tr style="background:#f0fdf4; color:#166534; font-size:11px; font-weight:800; border-bottom:1px solid #bbf7d0;">
                                    <th style="padding:4px 8px; text-align:left; width:80px;">Năm</th>
                                    <th style="padding:4px 10px; text-align:center;">📦 Số Đơn Thực Tế</th>
                                    <th style="padding:4px 10px; text-align:center;">🚨 Tỉ Lệ Trễ %</th>
                                    <th style="padding:4px 10px; text-align:center;">⚠️ Số Đơn Lỗi</th>
                                    <th style="padding:4px 8px; text-align:center; width:120px;">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } catch (e) {
            console.error('loadKpiHistoricalBenchmarks error:', e);
            box.innerHTML = `<div style="font-size:12px; font-weight:700; color:#dc2626; padding:8px; text-align:center;">⚠️ Lỗi kết nối truy xuất lịch sử</div>`;
        }
    };

    window.applyHistoricalBenchmark = function(delayPct, totalErrors, minOrders) {
        const delayIpt = document.getElementById('kpiModalDelayPct');
        if (delayIpt && delayPct !== undefined) delayIpt.value = delayPct;

        const errIpt = document.getElementById('kpiModalTotalErr');
        if (errIpt && totalErrors !== undefined) errIpt.value = totalErrors;

        const minOrdersIpt = document.getElementById('kpiModalMinOrders');
        if (minOrdersIpt && minOrders !== undefined) minOrdersIpt.value = minOrders;

        if (typeof showToast === 'function') {
            showToast(`📌 Đã áp dụng gợi ý: KPI Trễ ${delayPct}%, KPI Lỗi ${totalErrors} đơn, KPI Đơn ${minOrders} đơn!`, 'info');
        }
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
        const minOrders = parseInt(document.getElementById('kpiModalMinOrders')?.value, 10) || 0;
        const evalRule = document.querySelector('input[name="kpiEvalRule"]:checked')?.value || 'ALL';
        let rewardText = '';
        if (document.getElementById('kpiModalReward')) {
            rewardText = formatRewardText((document.getElementById('kpiModalReward')?.value || '').trim());
        }

        const commitmentInputs = document.querySelectorAll('.commitment-item-ipt');
        const commitments = [];
        commitmentInputs.forEach(ipt => {
            const val = ipt.value.trim();
            if (val) commitments.push(val);
        });

        const supportInputs = document.querySelectorAll('.support-item-ipt');
        const companySupports = [];
        supportInputs.forEach(ipt => {
            const val = ipt.value.trim();
            if (val) companySupports.push(val);
        });

        const targetPayload = {
            period_type: _editingModalTarget.period_type,
            period_value: _editingModalTarget.period_value,
            target_max_delay_pct: delayPct,
            target_max_total_errors: totalErr,
            target_min_total_orders: minOrders,
            eval_rule: evalRule,
            reward_text: rewardText,
            commitments: commitments,
            company_supports: companySupports
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
                    showToast('✅ Đã lưu KPI, Cam kết & Nội dung Hỗ trợ thành công!', 'success');
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

    // Preset Support Suggestions with LocalStorage Persistence & CRUD
    var DEFAULT_PRESET_SUPPORTS = [
        "Bàn giao vật tư, nguyên phụ liệu (vải, cúc, chỉ) đúng tiến độ kế hoạch sản xuất",
        "Phê duyệt ngân sách tăng ca và phụ cấp ca đêm kịp thời cho công nhân",
        "Đầu tư bổ sung máy may chuyên dụng và thiết bị bảo hộ lao động cho xưởng",
        "Hỗ trợ tuyển dụng bổ sung nhân sự thợ may tay nghề cao khi đơn hàng tăng vọt",
        "Bảo trì, sửa chữa định kỳ toàn bộ hệ thống máy móc thiết bị may hàng tháng",
        "Phòng Kinh Doanh chốt mẫu và file thiết kế in/thêu đúng hạn trước 48h khi vào may"
    ];

    function getStoredPresetSupports() {
        try {
            const stored = localStorage.getItem('kpi_preset_supports');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [...DEFAULT_PRESET_SUPPORTS];
    }

    function saveStoredPresetSupports(list) {
        try {
            localStorage.setItem('kpi_preset_supports', JSON.stringify(list));
        } catch (e) {}
    }

    window.toggleSupportSuggestions = function(forceState) {
        const panel = document.getElementById('kpiSupportSuggestionsPanel');
        if (!panel) return;
        const isShow = forceState !== undefined ? forceState : (panel.style.display === 'none');
        panel.style.display = isShow ? 'block' : 'none';
        if (isShow) {
            window.renderSupportPresetSuggestions();
        }
    };

    window.renderSupportPresetSuggestions = function() {
        const listEl = document.getElementById('kpiSupportPresetSuggestionsList');
        if (!listEl) return;
        const presets = getStoredPresetSupports();

        listEl.innerHTML = presets.map((s, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; background:#ffffff; padding:6px 10px; border-radius:6px; border:1px solid #bae6fd;">
                <span style="font-size:12px; font-weight:700; color:#0369a1; flex:1;">📌 ${s}</span>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button type="button" onclick="window.selectSupportPresetSuggestion(\`${s.replace(/`/g, '\\`')}\`)" style="font-size:11px; font-weight:800; color:#0284c7; background:#f0f9ff; padding:2px 8px; border-radius:4px; border:1px solid #bae6fd; cursor:pointer;" title="Chèn câu này vào danh sách hỗ trợ">+ Chọn</button>
                    <button type="button" onclick="window.editSupportPresetSuggestion(${idx})" style="font-size:11px; padding:2px 6px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:4px; font-weight:800; cursor:pointer;" title="Chỉnh sửa câu gợi ý này">✏️ Sửa</button>
                    <button type="button" onclick="window.deleteSupportPresetSuggestion(${idx})" style="font-size:11px; padding:2px 6px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:4px; font-weight:800; cursor:pointer;" title="Xoá câu gợi ý này">🗑️ Xoá</button>
                </div>
            </div>
        `).join('');
    };

    window.addNewSupportPresetSuggestion = function() {
        const val = prompt('Nhập câu gợi ý công ty hỗ trợ mẫu mới muốn cài đặt sẵn vào hệ thống:');
        if (!val || !val.trim()) return;
        const presets = getStoredPresetSupports();
        presets.push(val.trim());
        saveStoredPresetSupports(presets);
        window.renderSupportPresetSuggestions();
        if (typeof showToast === 'function') showToast('✅ Đã thêm câu gợi ý hỗ trợ mới!', 'success');
    };

    window.editSupportPresetSuggestion = function(index) {
        const presets = getStoredPresetSupports();
        if (!presets[index]) return;
        const newVal = prompt('Chỉnh sửa nội dung câu gợi ý hỗ trợ mẫu:', presets[index]);
        if (newVal === null || !newVal.trim()) return;
        presets[index] = newVal.trim();
        saveStoredPresetSupports(presets);
        window.renderSupportPresetSuggestions();
        if (typeof showToast === 'function') showToast('✅ Đã cập nhật câu gợi ý hỗ trợ!', 'success');
    };

    window.deleteSupportPresetSuggestion = function(index) {
        if (!confirm('Anh/Chị có chắc chắn muốn xoá câu gợi ý hỗ trợ mẫu này không?')) return;
        const presets = getStoredPresetSupports();
        presets.splice(index, 1);
        saveStoredPresetSupports(presets);
        window.renderSupportPresetSuggestions();
        if (typeof showToast === 'function') showToast('🗑️ Đã xoá câu gợi ý hỗ trợ mẫu!', 'info');
    };

    window.resetSupportPresetSuggestionsDefault = function() {
        if (!confirm('Khôi phục lại danh sách gợi ý hỗ trợ mặc định của hệ thống?')) return;
        localStorage.removeItem('kpi_preset_supports');
        window.renderSupportPresetSuggestions();
        if (typeof showToast === 'function') showToast('🔄 Đã khôi phục danh sách gợi ý hỗ trợ mặc định!', 'success');
    };

    window.selectSupportPresetSuggestion = function(text) {
        const container = document.getElementById('kpiModalSupportsList');
        let emptyIpt = null;
        if (container) {
            const ipts = container.querySelectorAll('.support-item-ipt');
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
            window.addSupportRow(text);
        }
        if (typeof showToast === 'function') {
            showToast('💡 Đã chèn gợi ý hỗ trợ!', 'info');
        }
    };

    window.addSupportRow = function(valueText = '') {
        const container = document.getElementById('kpiModalSupportsList');
        if (!container) return;
        const index = container.children.length + 1;
        const row = document.createElement('div');
        row.className = 'support-input-row';
        row.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px;';
        row.innerHTML = `
            <span style="font-size:12px; font-weight:800; color:#64748b; width:24px;">#${index}</span>
            <input type="text" class="support-item-ipt" value="${(valueText || '').replace(/"/g, '&quot;')}" placeholder="Ví dụ: Bàn giao vật tư vải cúc chỉ đúng tiến độ..." style="flex:1; padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:600; color:#0f172a; outline:none;">
            <button type="button" onclick="this.parentElement.remove(); window.renumberSupportRows();" style="padding:6px 10px; background:#fee2e2; color:#dc2626; border:none; border-radius:6px; font-weight:800; cursor:pointer;" title="Xoá dòng hỗ trợ này">🗑️</button>
        `;
        container.appendChild(row);
    };

    window.renumberSupportRows = function() {
        const container = document.getElementById('kpiModalSupportsList');
        if (!container) return;
        Array.from(container.children).forEach((row, i) => {
            const span = row.querySelector('span');
            if (span) span.innerText = `#${i + 1}`;
        });
    };

    // ========== EVALUATION MODAL CONTROLLERS (GIÁM ĐỐC) ==========
    var _evaluatingModalTarget = { period_type: 'month', period_value: 1, title: '' };

    window.openKpiEvalModal = function(periodType, periodValue, titleLabel) {
        // Validation: Must fill in "⚠️ Tổng Đơn Lỗi" before evaluating
        const errorInput = document.querySelector(`.kpi-actual-error-ipt[data-period="${periodType}"][data-val="${periodValue}"]`);
        const errVal = errorInput ? errorInput.value.trim() : '';

        if (errVal === '' || errVal === null || errVal === undefined) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Vui lòng nhập số đơn vào "⚠️ Tổng Đơn Lỗi" trước khi Đánh Giá Cam Kết Quản Lý Xưởng!', 'error');
            } else {
                alert('⚠️ Vui lòng nhập số đơn vào "⚠️ Tổng Đơn Lỗi" trước khi Đánh Giá Cam Kết Quản Lý Xưởng!');
            }
            if (errorInput) {
                errorInput.focus();
                errorInput.style.borderColor = '#ef4444';
                errorInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.35)';
                errorInput.style.background = '#fef2f2';
                errorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        _evaluatingModalTarget = { period_type: periodType, period_value: periodValue, title: titleLabel };
        const key = `${periodType}_${periodValue}`;
        const targetObj = (_kpiDelayState.data && _kpiDelayState.data.targets && _kpiDelayState.data.targets[key]) || {};
        const commitments = Array.isArray(targetObj.commitments) ? targetObj.commitments : [];
        const existingEvals = Array.isArray(targetObj.commitment_evals) ? targetObj.commitment_evals : [];

        if (commitments.length === 0) {
            alert('⚠️ Tháng này chưa có điều cam kết nào để đánh giá! Vui lòng bấm "⚙️ Cấu Hình KPI" để thêm các điều cam kết trước.');
            return;
        }

        const titleEl = document.getElementById('kpiEvalModalTitle');
        if (titleEl) titleEl.innerText = `📊 Đánh Giá Cam Kết Quản Lý Xưởng — ${titleLabel}`;

        const infoEl = document.getElementById('kpiEvalModalHeaderInfo');
        if (infoEl) {
            const mData = (_kpiDelayState.data && _kpiDelayState.data.months) ? (_kpiDelayState.data.months.find(m => m.month === periodValue) || {}) : {};
            infoEl.innerHTML = `
                <div style="font-size:12.5px; font-weight:800; color:#1e293b; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <span>📦 Tổng đơn: <b>${mData.total || 0}</b> | 🔴 Trễ: <b>${mData.delay_pct || 0}%</b> (Target &le; ${targetObj.target_max_delay_pct || 5.0}%)</span>
                    <span>⚠️ Target KPI Lỗi &le; <b>${targetObj.target_max_total_errors || 0} đơn</b></span>
                </div>
            `;
        }

        const listEl = document.getElementById('kpiEvalItemsList');
        if (listEl) {
            listEl.innerHTML = commitments.map((cText, idx) => {
                const existing = existingEvals[idx];
                const hasValue = existing && (existing.passed === true || existing.passed === false);
                const isPassed = hasValue ? existing.passed === true : null;
                const isFailed = hasValue ? existing.passed === false : null;
                const noteVal = (existing && existing.note) ? existing.note : '';

                return `
                <div class="kpi-eval-item-row" data-index="${idx}" style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="font-size:12.5px; font-weight:800; color:#0f172a;">
                        📌 <span class="eval-commitment-text">${cText}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                        <!-- Pass / Fail Toggle -->
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isPassed ? '#dcfce7' : '#ffffff'}; color:${isPassed ? '#15803d' : '#64748b'}; border:1.5px solid ${isPassed ? '#86efac' : '#cbd5e1'};">
                                <input type="radio" name="eval_passed_${idx}" value="true" ${isPassed === true ? 'checked' : ''} onchange="window.onEvalRadioChange(this)" style="accent-color:#16a34a;"> ✅ ĐẠT
                            </label>
                            <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isFailed ? '#fee2e2' : '#ffffff'}; color:${isFailed ? '#dc2626' : '#64748b'}; border:1.5px solid ${isFailed ? '#fca5a5' : '#cbd5e1'};">
                                <input type="radio" name="eval_passed_${idx}" value="false" ${isFailed === true ? 'checked' : ''} onchange="window.onEvalRadioChange(this)" style="accent-color:#dc2626;"> ❌ CHƯA ĐẠT
                            </label>
                        </div>

                        <!-- Note input -->
                        <input type="text" class="eval-note-ipt" value="${noteVal.replace(/"/g, '&quot;')}" placeholder="Ghi chú đánh giá ngắn (tuỳ chọn)..." style="flex:1; min-width:200px; padding:6px 10px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600; outline:none;">
                    </div>
                </div>
                `;
            }).join('');
        }

        window.updateEvalSummary();

        // Populate Company Supports list in Eval Modal
        const companySupports = Array.isArray(targetObj.company_supports) ? targetObj.company_supports : [];
        const existingSupportEvals = Array.isArray(targetObj.company_support_evals) ? targetObj.company_support_evals : [];

        const supportListEl = document.getElementById('kpiEvalSupportItemsList');
        const countBadge = document.getElementById('kpiEvalSupportCountBadge');
        if (countBadge) countBadge.innerText = companySupports.length;

        if (supportListEl) {
            if (companySupports.length > 0) {
                supportListEl.innerHTML = companySupports.map((sText, idx) => {
                    const existing = existingSupportEvals[idx];
                    const hasValue = existing && (existing.passed === true || existing.passed === false);
                    const isPassed = hasValue ? existing.passed === true : null;
                    const isFailed = hasValue ? existing.passed === false : null;
                    const noteVal = (existing && existing.note) ? existing.note : '';

                    return `
                    <div class="kpi-eval-support-item-row" data-index="${idx}" style="background:#ffffff; border:1.5px solid #bae6fd; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                        <div style="font-size:12.5px; font-weight:800; color:#0f172a;">
                            📌 <span class="eval-support-text">${sText}</span>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                            <!-- Pass / Fail Toggle -->
                            <div style="display:flex; align-items:center; gap:8px;">
                                <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isPassed ? '#dcfce7' : '#ffffff'}; color:${isPassed ? '#15803d' : '#64748b'}; border:1.5px solid ${isPassed ? '#86efac' : '#cbd5e1'};">
                                    <input type="radio" name="eval_support_passed_${idx}" value="true" ${isPassed === true ? 'checked' : ''} onchange="window.onEvalRadioChange(this)" style="accent-color:#16a34a;"> ✅ ĐÃ HỖ TRỢ
                                </label>
                                <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isFailed ? '#fee2e2' : '#ffffff'}; color:${isFailed ? '#dc2626' : '#64748b'}; border:1.5px solid ${isFailed ? '#fca5a5' : '#cbd5e1'};">
                                    <input type="radio" name="eval_support_passed_${idx}" value="false" ${isFailed === true ? 'checked' : ''} onchange="window.onEvalRadioChange(this)" style="accent-color:#dc2626;"> ❌ CHƯA HỖ TRỢ
                                </label>
                            </div>

                            <!-- Note input -->
                            <input type="text" class="eval-support-note-ipt" value="${noteVal.replace(/"/g, '&quot;')}" placeholder="Ghi chú phản hồi / lý do (tuỳ chọn)..." style="flex:1; min-width:200px; padding:6px 10px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600; outline:none;">
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                supportListEl.innerHTML = `<div style="font-size:11.5px; font-style:italic; color:#94a3b8; text-align:center; padding:4px 0;">Chưa ghi nhận nội dung công ty hỗ trợ.</div>`;
            }
        }

        const overlay = document.getElementById('kpiEvalModalOverlay');
        if (overlay) overlay.style.display = 'flex';
    };

    window.closeKpiEvalModal = function() {
        const overlay = document.getElementById('kpiEvalModalOverlay');
        if (overlay) overlay.style.display = 'none';
    };

    window.onEvalRadioChange = function(inputEl) {
        if (!inputEl) return;
        const row = inputEl.closest('.kpi-eval-item-row') || inputEl.closest('.kpi-eval-support-item-row');
        if (row) {
            row.style.borderColor = row.classList.contains('kpi-eval-support-item-row') ? '#bae6fd' : '#cbd5e1';
            row.style.background = row.classList.contains('kpi-eval-support-item-row') ? '#ffffff' : '#f8fafc';

            const labels = row.querySelectorAll('label');
            labels.forEach(lbl => {
                const rad = lbl.querySelector('input[type="radio"]');
                if (rad && rad.checked) {
                    if (rad.value === 'true') {
                        lbl.style.background = '#dcfce7';
                        lbl.style.color = '#15803d';
                        lbl.style.borderColor = '#86efac';
                    } else {
                        lbl.style.background = '#fee2e2';
                        lbl.style.color = '#dc2626';
                        lbl.style.borderColor = '#fca5a5';
                    }
                } else {
                    lbl.style.background = '#ffffff';
                    lbl.style.color = '#64748b';
                    lbl.style.borderColor = '#cbd5e1';
                }
            });
        }
        window.updateEvalSummary();
    };

    window.updateEvalSummary = function() {
        const rows = document.querySelectorAll('.kpi-eval-item-row');
        let total = rows.length;
        let selectedCount = 0;
        let passed = 0;
        rows.forEach(r => {
            const idx = r.dataset.index;
            const checked = r.querySelector(`input[name="eval_passed_${idx}"]:checked`);
            if (checked) {
                selectedCount++;
                if (checked.value === 'true') passed++;
            }
        });
        const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        const sumEl = document.getElementById('kpiEvalProgressSummary');
        if (sumEl) {
            sumEl.innerText = `📊 Tỉ lệ hoàn thành: ${passed}/${total} điều cam kết (${pct}%) ${selectedCount < total ? ' — ⚠️ Chưa chọn đủ (' + (total - selectedCount) + ' mục)' : ''}`;
        }
    };

    window.saveKpiEvalModal = async function() {
        const rows = document.querySelectorAll('.kpi-eval-item-row');
        const commitment_evals = [];
        let missingCommitmentRow = null;

        for (const r of rows) {
            const idx = r.dataset.index;
            const text = r.querySelector('.eval-commitment-text')?.innerText || '';
            const checked = r.querySelector(`input[name="eval_passed_${idx}"]:checked`);
            if (!checked) {
                missingCommitmentRow = r;
                break;
            }
            const isPassed = checked.value === 'true';
            const note = (r.querySelector('.eval-note-ipt')?.value || '').trim();

            commitment_evals.push({
                text: text,
                passed: isPassed,
                note: note
            });
        }

        if (missingCommitmentRow) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Vui lòng đánh giá ĐẠT hoặc CHƯA ĐẠT cho tất cả các điều Cam Kết Quản Lý Xưởng!', 'error');
            } else {
                alert('⚠️ Vui lòng đánh giá ĐẠT hoặc CHƯA ĐẠT cho tất cả các điều Cam Kết Quản Lý Xưởng!');
            }
            missingCommitmentRow.style.borderColor = '#ef4444';
            missingCommitmentRow.style.background = '#fef2f2';
            missingCommitmentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const supportRows = document.querySelectorAll('.kpi-eval-support-item-row');
        const company_support_evals = [];
        let missingSupportRow = null;

        for (const r of supportRows) {
            const idx = r.dataset.index;
            const text = r.querySelector('.eval-support-text')?.innerText || '';
            const checked = r.querySelector(`input[name="eval_support_passed_${idx}"]:checked`);
            if (!checked) {
                missingSupportRow = r;
                break;
            }
            const isPassed = checked.value === 'true';
            const note = (r.querySelector('.eval-support-note-ipt')?.value || '').trim();

            company_support_evals.push({
                text: text,
                passed: isPassed,
                note: note
            });
        }

        if (missingSupportRow) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Vui lòng chọn ĐÃ HỖ TRỢ hoặc CHƯA HỖ TRỢ cho tất cả các mục Công Ty Hỗ Trợ!', 'error');
            } else {
                alert('⚠️ Vui lòng chọn ĐÃ HỖ TRỢ hoặc CHƯA HỖ TRỢ cho tất cả các mục Công Ty Hỗ Trợ!');
            }
            missingSupportRow.style.borderColor = '#ef4444';
            missingSupportRow.style.background = '#fef2f2';
            missingSupportRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const actualErrIpt = document.getElementById('eval_actual_total_errors') || document.querySelector(`.kpi-actual-error-ipt[data-val="${_evaluatingModalTarget.period_value}"]`);
        const actual_total_errors = actualErrIpt ? (parseInt(actualErrIpt.value, 10) || 0) : undefined;

        const btnSave = document.getElementById('btnSaveKpiEval');
        if (btnSave) btnSave.disabled = true;

        try {
            // Save evaluations
            const res = await fetch('/api/kpi-delay/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: _kpiDelayState.year,
                    segment: _kpiDelayState.segment,
                    period_type: _evaluatingModalTarget.period_type,
                    period_value: _evaluatingModalTarget.period_value,
                    commitment_evals: commitment_evals,
                    company_support_evals: company_support_evals,
                    actual_total_errors: actual_total_errors
                })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ Lỗi lưu đánh giá: ' + (data.error || 'Không xác định'));
                return;
            }

            window.closeKpiEvalModal();
            await loadKpiDelayData();
            if (typeof showToast === 'function') showToast('✅ Đã lưu đánh giá cam kết thành công!', 'success');
        } catch (e) {
            console.error('saveKpiEvalModal error:', e);
            alert('❌ Lỗi kết nối máy chủ!');
        } finally {
            if (btnSave) btnSave.disabled = false;
        }
    };

    window.completeKpiMonth = async function(periodType, periodValue) {
        if (!confirm(`Anh/Chị có chắc chắn muốn HOÀN THÀNH KPI Tháng ${periodValue} không?\n(Thao tác này sẽ khoá chỉ số Tháng ${periodValue} và mở khoá tạo KPI Tháng ${periodValue + 1})`)) return;

        try {
            const res = await fetch('/api/kpi-delay/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: _kpiDelayState.year,
                    segment: _kpiDelayState.segment,
                    period_type: periodType,
                    period_value: periodValue
                })
            });
            const data = await res.json();
            if (data.ok) {
                await loadKpiDelayData();
                if (typeof showToast === 'function') showToast(data.message, 'success');
            } else {
                alert('❌ Lỗi: ' + (data.error || 'Không thể hoàn thành KPI'));
            }
        } catch (e) {
            console.error('completeKpiMonth error:', e);
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    window.reopenKpiMonth = async function(periodType, periodValue) {
        if (!confirm(`Anh/Chị Giám Đốc có chắc chắn muốn MỞ LẠI KPI Tháng ${periodValue} để điều chỉnh không?`)) return;

        try {
            const res = await fetch('/api/kpi-delay/reopen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: _kpiDelayState.year,
                    segment: _kpiDelayState.segment,
                    period_type: periodType,
                    period_value: periodValue
                })
            });
            const data = await res.json();
            if (data.ok) {
                await loadKpiDelayData();
                if (typeof showToast === 'function') showToast(data.message, 'info');
            } else {
                alert('❌ Lỗi: ' + (data.error || 'Không thể mở lại KPI'));
            }
        } catch (e) {
            console.error('reopenKpiMonth error:', e);
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    window.renderKpitilechamdonPage = renderKpitilechamdonPage;
})();

