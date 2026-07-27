// ========== KPI P.SALE ==========
// Page: /kpisale — renderKpisalePage(container)

var _kpiSale = { month: '', data: null };
var _kpiSaleAchData = null;
var _kpiSaleAchTab = 'month';
var _kpiSaleAchFilterMonth = null;
var _kpiSaleAchCollapsed = false;

// Meeting Commitment states for KPI Sale
var _mcSaleTeams = [];
var _mcSaleSessions = [];
var _mcSaleAllCommitments = [];
var _mcSaleSession = null;
var _mcSaleCommitments = [];
var _mcSaleCollapsed = false;
var _mcSaleMonthlyCollapsed = false;
var _mcSaleYearlyData = null;

function formatVND(val) {
    if (!val || isNaN(val)) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
}

function compactVND(val) {
    var n = Math.abs(Number(val));
    var sign = val < 0 ? '-' : '';
    if (n >= 1e9) { var ty=Math.floor(n/1e9); var r=Math.floor((n%1e9)/1e6); return sign+ty+'tỷ'+(r>0?String(r).padStart(3,'0').replace(/0+$/,''):''); }
    if (n >= 1e6) { var tr=Math.floor(n/1e6); var r=Math.floor((n%1e6)/1e3); return sign+tr+'tr'+(r>0?String(r).padStart(3,'0'):''); }
    return sign + n.toLocaleString('vi-VN');
}

function getVnNow() {
    return typeof vnNow === 'function' ? vnNow() : new Date();
}

async function renderKpisalePage(container) {
    if (!_kpiSale.month) {
        const now = getVnNow();
        _kpiSale.month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    }
    container.innerHTML = `
        <style>
            .kpi-wrap{max-width:100%;margin:0 auto;font-family:'Inter',system-ui,sans-serif;font-size:13px}
            .kpi-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
            .kpi-nav{display:flex;align-items:center;gap:8px}
            .kpi-nav-btn{width:34px;height:34px;border-radius:50%;border:1.5px solid #c7d2fe;background:#fff;color:#4338ca;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
            .kpi-nav-btn:hover{background:#4338ca;color:#fff}
            .kpi-month-label{font-size:15px;font-weight:800;color:#1e1b4b;min-width:90px;text-align:center;cursor:pointer}
            .kpi-month-label:hover{color:#4338ca}
            #kpiSaleMonthInput{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
            .kpi-set-btn{padding:10px 24px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 3px 12px rgba(67,56,202,.3);transition:all .2s}
            .kpi-set-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(67,56,202,.4)}

            .kpi-summary{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:stretch}
            .kpi-sum-box{border-radius:12px;padding:16px 20px;text-align:center;min-width:140px;flex:1;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center}
            .kpi-sum-box.days{background:linear-gradient(135deg,#f8fafc,#e2e8f0);border:2px solid #94a3b8}
            .kpi-sum-box.actual{background:linear-gradient(135deg,#fef9c3,#fde68a);border:2px solid #f59e0b}
            .kpi-sum-box.m1{background:linear-gradient(135deg,#dcfce7,#bbf7d0);border:2px solid #22c55e}
            .kpi-sum-box.m120{background:linear-gradient(135deg,#fee2e2,#fecaca);border:2px solid #ef4444}
            .kpi-sum-val{font-size:28px;font-weight:900;line-height:1.2}
            .kpi-sum-lbl{font-size:11px;font-weight:600;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;opacity:.7}
            .kpi-sum-detail{margin-top:12px;text-align:left;padding:0 12px;display:flex;flex-direction:column;gap:6px}
            .kpi-sum-detail-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:14px;font-weight:700}
            .kpi-sum-detail-label{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.3px}
            .kpi-sum-detail-val{font-size:16px;font-weight:900}

            .kpi-section-title{font-size:15px;font-weight:800;color:#1e1b4b;margin:24px 0 10px;padding:8px 16px;background:linear-gradient(90deg,#eef2ff,#e0e7ff);border-left:4px solid #4338ca;border-radius:0 8px 8px 0}

            .kpi-tbl-wrap{overflow-x:auto;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:24px}
            .kpi-tbl{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}
            .kpi-tbl th{background:#1e293b;color:#fff;padding:8px 10px;font-weight:700;text-align:center;position:sticky;top:0;z-index:2;font-size:11px;letter-spacing:.3px}
            .kpi-tbl th.sub{background:#334155;font-size:10px}
            .kpi-tbl td{padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right}
            .kpi-tbl td.name{text-align:left;font-weight:600;color:#1e1b4b;position:sticky;left:0;background:#fff;z-index:1;min-width:120px}
            .kpi-tbl tr.team-row{background:#fef9c3!important}
            .kpi-tbl tr.team-row td{font-weight:800;border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b}
            .kpi-tbl tr.team-row td.name{background:#fef9c3}
            .kpi-tbl tr.total-row{background:#fde68a!important}
            .kpi-tbl tr.total-row td{font-weight:900;border-top:3px solid #d97706;font-size:13px}
            .kpi-tbl tr.total-row td.name{background:#fde68a}
            .kpi-tbl tr:hover{background:#fefce8}
            .kpi-tbl tr.team-row:hover{background:#fef3c7!important}
            .kpi-tbl .pos{color:#16a34a}.kpi-tbl .neg{color:#dc2626}
            .kpi-tbl .zero{color:#9ca3af}
            .kpi-tbl .pct-cell{font-weight:700}
            .kpi-tbl td.day-cell{min-width:70px;font-size:11px}
            .kpi-tbl td.day-cell.has-val{background:#f0fdf4;color:#166534;font-weight:600}
            .kpi-tbl td.day-cell.zero-val{color:#d4d4d8}

            .kpi-stage-hdr{text-align:center!important;background:#0369a1!important;color:#fff;font-weight:800;font-size:11px}

            @keyframes kpiFireGlow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
            th.kpi-today-hdr{background:linear-gradient(135deg,#dc2626,#f97316,#eab308,#f97316,#dc2626)!important;background-size:300% 300%!important;animation:kpiFireGlow 2s ease-in-out infinite!important;color:#fff!important;font-weight:900!important;font-size:11px!important;text-shadow:0 0 6px rgba(255,255,255,.8),0 0 12px #fbbf24!important;position:relative}

            .kpi-ov td:nth-child(3){border-left:2.5px solid #3b82f6}
            .kpi-ov td:nth-child(4){border-right:2.5px solid #3b82f6}
            .kpi-ov td:nth-child(5){border-left:2.5px solid #f59e0b;border-right:2.5px solid #f59e0b;background:#fffbeb}
            .kpi-ov td:nth-child(6){border-left:2.5px solid #8b5cf6}
            .kpi-ov td:nth-child(7){border-right:2.5px solid #8b5cf6}
            .kpi-ov td:nth-child(8){border-left:2.5px solid #ef4444}
            .kpi-ov td:nth-child(9){border-right:2.5px solid #ef4444}
            .kpi-ov td:nth-child(10){border-left:2.5px solid #0284c7}
            .kpi-ov td:nth-child(13){border-right:2.5px solid #0284c7}
            .kpi-ov td:nth-child(14){border-left:2.5px solid #ec4899}
            .kpi-ov td:nth-child(17){border-right:2.5px solid #ec4899}
            .kpi-ov td:nth-child(18){border-left:2.5px solid #16a34a}
            .kpi-ov td:nth-child(21){border-right:2.5px solid #16a34a}

            /* Leaderboard & Team Compare */
            .kpi-lb-section{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);margin-top:28px}
            .kpi-lb-header{padding:18px 24px;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px;border-bottom:2px solid rgba(99,102,241,.15);color:#1e1b4b;background:linear-gradient(90deg,#eef2ff,#e0e7ff,#c7d2fe,#f5f3ff,#c7d2fe,#e0e7ff,#eef2ff);background-size:200% 100%;animation:kpiShimmer 4s ease-in-out infinite}
            @keyframes kpiShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
            .kpi-tc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:20px 24px}
            .kpi-tc-card{border-radius:14px;padding:20px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff;transition:transform .2s,box-shadow .2s}
            .kpi-tc-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(67,56,202,.12)}
            .kpi-tc-name{font-size:15px;font-weight:800;color:#1e40af;margin-bottom:12px}
            .kpi-tc-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
            .kpi-tc-stat{text-align:center;padding:8px;border-radius:8px;background:#fff}
            .kpi-tc-stat-val{font-size:20px;font-weight:900;color:#1e1b4b}
            .kpi-tc-stat-label{font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-top:2px}

            /* Meeting Commitments */
            .kpi-mc-section{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);margin-top:28px}
            .kpi-mc-header{padding:18px 24px;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:2px solid rgba(234,179,8,.2);color:#78350f;background:linear-gradient(90deg,#fefce8,#fef9c3,#fef08a,#fef9c3,#fefce8);background-size:200% 100%;animation:kpiShimmer 4s ease-in-out infinite}
            .kpi-mc-btn{padding:8px 16px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}
            .kpi-mc-btn-primary{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;box-shadow:0 2px 8px rgba(79,70,229,.3)}
            .kpi-mc-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(79,70,229,.4)}
            .kpi-mc-btn-ghost{background:rgba(99,102,241,.08);color:#4338ca}
            .kpi-mc-btn-ghost:hover{background:rgba(99,102,241,.15)}

            .kpi-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:none;align-items:center;justify-content:center}
            .kpi-modal{background:#fff;border-radius:16px;width:680px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.3)}
            .kpi-modal-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e5e7eb;padding-bottom:12px}
            .kpi-modal-title{font-size:16px;font-weight:800;color:#1e1b4b}
            .kpi-modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280}
            .kpi-input{width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;transition:all .2s}
            .kpi-input:focus{border-color:#4338ca;box-shadow:0 0 0 3px rgba(67,56,202,.15)}
            .kpi-save-btn{padding:10px 20px;background:#4338ca;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer}
            .kpi-save-btn:hover{background:#3730a3}

            @media(max-width:768px){
                .kpi-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px}
                .kpi-sum-val{font-size:20px}
                .kpi-sum-lbl{font-size:10px}
                .kpi-set-btn{padding:8px 14px;font-size:12px;width:100%}
                .kpi-topbar{gap:8px}
            }
        </style>

        <div class="kpi-wrap">
            <div class="kpi-topbar">
                <div class="kpi-nav">
                    <button class="kpi-nav-btn" onclick="kpiSaleChangeMonth(-1)" title="Tháng trước">‹</button>
                    <span class="kpi-month-label" id="kpiSaleMonthText" onclick="kpiSalePickMonth()">T7/2026</span>
                    <button class="kpi-nav-btn" onclick="kpiSaleChangeMonth(1)" title="Tháng sau">›</button>
                    <input type="month" id="kpiSaleMonthInput" onchange="kpiSaleOnMonthInput(this.value)">
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <button class="kpi-set-btn" id="kpiSaleSetBtn" onclick="kpiSaleOpenTargetModal()" style="display:none">🎯 Đặt KPI Tháng</button>
                </div>
            </div>

            <!-- Top Summary Cards -->
            <div class="kpi-summary" id="kpiSaleSummaryCards">
                <div class="kpi-sum-box days">
                    <div class="kpi-sum-val" id="kpiSaleDaysLeft">—</div>
                    <div class="kpi-sum-lbl">NGÀY CÒN LẠI</div>
                </div>
                <div class="kpi-sum-box actual">
                    <div class="kpi-sum-val" id="kpiSaleActualRev">—</div>
                    <div class="kpi-sum-lbl">THỰC THU</div>
                </div>
                <div class="kpi-sum-box m1">
                    <div class="kpi-sum-val" id="kpiSaleTarget1">—</div>
                    <div class="kpi-sum-lbl">KPI MỐC 1</div>
                    <div class="kpi-sum-detail" style="width:100%">
                        <div class="kpi-sum-detail-row"><span class="kpi-sum-detail-label">ĐÃ ĐẠT:</span><span class="kpi-sum-detail-val" id="kpiSaleRate1">0%</span></div>
                        <div class="kpi-sum-detail-row"><span class="kpi-sum-detail-label">ĐÃ VƯỢT:</span><span class="kpi-sum-detail-val" id="kpiSaleMissing1">+0</span></div>
                    </div>
                </div>
                <div class="kpi-sum-box m120">
                    <div class="kpi-sum-val" id="kpiSaleTarget120">—</div>
                    <div class="kpi-sum-lbl">KPI MỐC 120%</div>
                    <div class="kpi-sum-detail" style="width:100%">
                        <div class="kpi-sum-detail-row"><span class="kpi-sum-detail-label">ĐÃ ĐẠT:</span><span class="kpi-sum-detail-val" id="kpiSaleRate120">0%</span></div>
                        <div class="kpi-sum-detail-row"><span class="kpi-sum-detail-label">ĐÃ VƯỢT:</span><span class="kpi-sum-detail-val" id="kpiSaleMissing120">+0</span></div>
                    </div>
                </div>
            </div>

            <!-- BẢNG 1: TỔNG QUAN KPI THEO TEAM -->
            <div class="kpi-section-title">📊 TỔNG QUAN KPI THEO TEAM (PHÒNG SALE)</div>
            <div class="kpi-tbl-wrap">
                <table class="kpi-tbl kpi-ov">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:35px">STT</th>
                            <th rowspan="2" style="width:140px">Cơ sở</th>
                            <th colspan="2" style="background:#2563eb">MỤC TIÊU</th>
                            <th rowspan="2" style="background:#d97706;width:90px">DT Thực tế</th>
                            <th colspan="2" style="background:#7c3aed">Tỷ lệ HT</th>
                            <th colspan="2" style="background:#dc2626">Còn thiếu</th>
                            <th colspan="4" class="kpi-stage-hdr" style="background:#0284c7!important">⚡ GIAI ĐOẠN 1 (1-10)</th>
                            <th colspan="4" class="kpi-stage-hdr" style="background:#db2777!important">⚡ GIAI ĐOẠN 2 (11-20)</th>
                            <th colspan="4" class="kpi-stage-hdr" style="background:#16a34a!important" id="kpiSaleStage3HeaderTitle">🔥 GIAI ĐOẠN 3 (21-31) ← HIỆN TẠI</th>
                        </tr>
                        <tr>
                            <th class="sub" style="background:#1d4ed8;width:80px">Mốc 1</th>
                            <th class="sub" style="background:#1e40af;width:80px">Mốc 120%</th>
                            <th class="sub" style="background:#6d28d9;width:55px">Mốc 1</th>
                            <th class="sub" style="background:#5b21b6;width:55px">Mốc 120%</th>
                            <th class="sub" style="background:#b91c1c;width:80px">Mốc 1</th>
                            <th class="sub" style="background:#991b1b;width:80px">Mốc 120%</th>
                            <!-- GĐ1 -->
                            <th class="sub" style="background:#0369a1;width:75px">Target</th>
                            <th class="sub" style="background:#0284c7;width:75px">TT</th>
                            <th class="sub" style="background:#0369a1;width:65px">TB/ngày</th>
                            <th class="sub" style="background:#0284c7;width:75px">Còn thiếu</th>
                            <!-- GĐ2 -->
                            <th class="sub" style="background:#be185d;width:75px">Target</th>
                            <th class="sub" style="background:#db2777;width:75px">TT</th>
                            <th class="sub" style="background:#be185d;width:65px">TB/ngày</th>
                            <th class="sub" style="background:#db2777;width:75px">Còn thiếu</th>
                            <!-- GĐ3 -->
                            <th class="sub" style="background:#15803d;width:75px">Target</th>
                            <th class="sub" style="background:#16a34a;width:75px">TT</th>
                            <th class="sub" style="background:#15803d;width:65px">TB/ngày</th>
                            <th class="sub" style="background:#16a34a;width:75px">Còn thiếu</th>
                        </tr>
                    </thead>
                    <tbody id="kpiSaleOverviewBody">
                        <tr><td colspan="21" style="text-align:center;padding:30px;color:#94a3b8">⏳ Đang tải dữ liệu KPI Sale...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- BẢNG 2: 👥 DOANH THU VÀ TARGET NHÂN SỰ -->
            <div class="kpi-section-title">👥 DOANH THU VÀ TARGET NHÂN SỰ (PHÒNG SALE)</div>
            <div class="kpi-tbl-wrap">
                <table class="kpi-tbl" id="kpiSaleDailyTable">
                    <thead id="kpiSaleDailyHead"></thead>
                    <tbody id="kpiSaleDailyBody">
                        <tr><td colspan="35" style="text-align:center;padding:30px;color:#94a3b8">⏳ Đang tải doanh thu từng ngày...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- SECTION 2: 📊 THEO DÕI KPI CÁ NHÂN & TEAM -->
            <div id="kpiSaleAchievement"></div>

            <!-- SECTION 3: 🏆 Bảng Xếp Hạng Nhân Viên -->
            <div id="kpiSaleLeaderboard"></div>

            <!-- SECTION 4: 📊 So Sánh Team -->
            <div id="kpiSaleTeamCompare"></div>

            <!-- SECTION 5: ▶ 📝 Cam Kết Cuộc Họp : KPI P.Sale -->
            <div id="kpiSaleMeetingCommit"></div>
        </div>

        <!-- Target Modal -->
        <div class="kpi-modal-overlay" id="kpiSaleTargetModal">
            <div class="kpi-modal">
                <div class="kpi-modal-hdr">
                    <div class="kpi-modal-title">🎯 Đặt KPI Doanh Số Phòng Sale — <span id="kpiSaleTargetModalPeriod"></span></div>
                    <button class="kpi-modal-close" onclick="kpiSaleCloseTargetModal()">✕</button>
                </div>
                <div id="kpiSaleTargetFormBody" style="display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow-y:auto;padding-right:4px"></div>
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">
                    <button type="button" style="padding:8px 16px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;font-weight:600;cursor:pointer" onclick="kpiSaleCloseTargetModal()">Hủy</button>
                    <button type="button" class="kpi-save-btn" onclick="kpiSaleSaveTargets()">💾 Lưu KPI Phòng Sale</button>
                </div>
            </div>
        </div>

        <!-- Order Details Modal -->
        <div class="kpi-modal-overlay" id="kpiSaleOrdersModal">
            <div class="kpi-modal" style="width:920px">
                <div class="kpi-modal-hdr">
                    <div class="kpi-modal-title">📦 Chi Tiết Đơn Hàng — <span id="kpiSaleOrdersModalTitle"></span></div>
                    <button class="kpi-modal-close" onclick="kpiSaleCloseOrdersModal()">✕</button>
                </div>
                <div id="kpiSaleOrdersModalSummary" style="background:#f8fafc;padding:10px 14px;border-radius:10px;margin-bottom:12px;display:flex;gap:16px;font-size:12px;font-weight:700"></div>
                <div style="max-height:60vh;overflow-y:auto">
                    <table class="kpi-tbl" style="width:100%">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>SĐT</th>
                                <th>Loại khách</th>
                                <th>Doanh số</th>
                                <th>Ngày chốt</th>
                            </tr>
                        </thead>
                        <tbody id="kpiSaleOrdersModalBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Show set button for Director/Admin
    const user = typeof currentUser !== 'undefined' ? currentUser : (window.currentUser || {});
    const isDirector = user.role === 'giam_doc' || user.role === 'admin' || user.username === 'admin';
    const setBtn = document.getElementById('kpiSaleSetBtn');
    if (setBtn) setBtn.style.display = isDirector ? 'inline-block' : 'none';

    await loadKpiSaleData();
}

async function loadKpiSaleData() {
    try {
        const kpiMonthParts = _kpiSale.month.split('-').map(Number);
        const kpiYear = kpiMonthParts[0], kpiMo = kpiMonthParts[1];

        const results = await Promise.all([
            apiCall(`/api/reports/kpi-sale?month=${_kpiSale.month}`),
            apiCall('/api/meeting-commitments/employees'),
            apiCall(`/api/meeting-commitments/monthly?month=${kpiMo}&year=${kpiYear}`),
            apiCall(`/api/reports/customer-retention/advanced?period=month&date=${_kpiSale.month}`),
            apiCall(`/api/reports/customer-retention?period=month&date=${_kpiSale.month}`)
        ]);

        const res = results[0];
        _kpiSale.data = res;
        renderKpiSaleUI(res);
        renderKpiSaleDailyTable(res);

        // Meeting commitments setup
        _mcSaleTeams = results[1].teams || [];
        _mcSaleSessions = results[2].sessions || [];
        _mcSaleAllCommitments = results[2].allCommitments || [];
        try { _mcSaleYearlyData = await apiCall('/api/meeting-commitments/yearly-summary?year=' + kpiYear); } catch(e) {}
        if (_mcSaleSessions.length > 0) {
            _mcSaleSession = _mcSaleSessions[_mcSaleSessions.length - 1];
            _mcSaleCommitments = _mcSaleAllCommitments.filter(c => c.session_id === _mcSaleSession.id);
        } else {
            _mcSaleSession = null;
            _mcSaleCommitments = [];
        }

        const mcEl = document.getElementById('kpiSaleMeetingCommit');
        if (mcEl) renderKpiSaleMeetingCommit(mcEl);

        // Load Achievement Tracker
        loadKpiSaleAchievement(kpiYear, kpiMo);

        // Render Leaderboard & Team Compare (filtered for Sale employees)
        const advData = results[3];
        const mainData = results[4];
        renderKpiSaleLeaderboard(advData);
        renderKpiSaleTeamCompare(mainData, advData);

    } catch(err) {
        console.error('Error loading KPI Sale data:', err);
        showToast('❌ Lỗi tải dữ liệu KPI Sale: ' + err.message, 'error');
    }
}

function renderKpiSaleUI(data) {
    if (!data || !data.month) return;
    const { month, teams, summary } = data;

    document.getElementById('kpiSaleMonthText').textContent = `T${month.month}/${month.year}`;
    document.getElementById('kpiSaleDaysLeft').textContent = month.days_left;
    document.getElementById('kpiSaleActualRev').textContent = formatVND(summary.actual || 0);

    const t1 = summary.target_1 || 0;
    const t120 = summary.target_120 || 0;
    const act = summary.actual || 0;

    document.getElementById('kpiSaleTarget1').textContent = formatVND(t1);
    document.getElementById('kpiSaleRate1').textContent = (summary.rate_1 || 0) + '%';
    const exc1 = act > t1 ? act - t1 : 0;
    document.getElementById('kpiSaleMissing1').textContent = exc1 > 0 ? '+' + formatVND(exc1) : '0đ';

    document.getElementById('kpiSaleTarget120').textContent = formatVND(t120);
    document.getElementById('kpiSaleRate120').textContent = (summary.rate_120 || 0) + '%';
    const exc120 = act > t120 ? act - t120 : 0;
    document.getElementById('kpiSaleMissing120').textContent = exc120 > 0 ? '+' + formatVND(exc120) : '0đ';

    const todayNum = new Date().getDate();
    const stage3Title = document.getElementById('kpiSaleStage3HeaderTitle');
    if (stage3Title) {
        stage3Title.textContent = `🔥 GIAI ĐOẠN 3 (21-${month.days_in_month}) ${todayNum >= 21 ? '← HIỆN TẠI' : ''}`;
    }

    const tbody = document.getElementById('kpiSaleOverviewBody');
    if (!tbody) return;

    let html = '';
    let stt = 1;

    (teams || []).forEach(team => {
        const { stages } = team;
        html += `
            <tr class="team-row">
                <td style="text-align:center">${stt++}</td>
                <td class="name">👥 ${team.dept_name}</td>
                <td>${formatVND(team.target_1)}</td>
                <td>${formatVND(team.target_120)}</td>
                <td style="color:#d97706">${formatVND(team.actual)}</td>
                <td class="pct-cell ${team.rate_1 >= 100 ? 'pos' : ''}">${team.rate_1}%</td>
                <td class="pct-cell ${team.rate_120 >= 100 ? 'pos' : ''}">${team.rate_120}%</td>
                <td class="${team.missing_1 <= 0 ? 'pos' : 'neg'}">${team.missing_1 <= 0 ? 'Đạt' : formatVND(team.missing_1)}</td>
                <td class="${team.missing_120 <= 0 ? 'pos' : 'neg'}">${team.missing_120 <= 0 ? 'Đạt' : formatVND(team.missing_120)}</td>
                <!-- GĐ1 -->
                <td>${formatVND(stages.stage1.target)}</td>
                <td>${formatVND(stages.stage1.actual)}</td>
                <td>${formatVND(stages.stage1.avg_per_day)}</td>
                <td class="${stages.stage1.missing <= 0 ? 'pos' : 'neg'}">${stages.stage1.missing <= 0 ? 'Đạt' : formatVND(stages.stage1.missing)}</td>
                <!-- GĐ2 -->
                <td>${formatVND(stages.stage2.target)}</td>
                <td>${formatVND(stages.stage2.actual)}</td>
                <td>${formatVND(stages.stage2.avg_per_day)}</td>
                <td class="${stages.stage2.missing <= 0 ? 'pos' : 'neg'}">${stages.stage2.missing <= 0 ? 'Đạt' : formatVND(stages.stage2.missing)}</td>
                <!-- GĐ3 -->
                <td>${formatVND(stages.stage3.target)}</td>
                <td>${formatVND(stages.stage3.actual)}</td>
                <td>${formatVND(stages.stage3.avg_per_day)}</td>
                <td class="${stages.stage3.missing <= 0 ? 'pos' : 'neg'}">${stages.stage3.missing <= 0 ? 'Đạt' : formatVND(stages.stage3.missing)}</td>
            </tr>
        `;

        (team.employees || []).forEach(emp => {
            html += `
                <tr>
                    <td></td>
                    <td class="name" style="padding-left:24px;cursor:pointer;color:#2563eb" onclick="kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}')">
                        👤 ${emp.full_name} ${emp.role === 'truong_phong' ? '⭐' : ''}
                    </td>
                    <td>${formatVND(emp.target)}</td>
                    <td>${formatVND(Math.round(emp.target * 1.2))}</td>
                    <td style="color:#d97706;font-weight:700">${formatVND(emp.actual)}</td>
                    <td class="pct-cell ${emp.rate >= 100 ? 'pos' : ''}">${emp.rate}%</td>
                    <td class="pct-cell ${emp.target > 0 && (emp.actual / (emp.target * 1.2) * 100) >= 100 ? 'pos' : ''}">
                        ${emp.target > 0 ? (emp.actual / (emp.target * 1.2) * 100).toFixed(1) : 0}%
                    </td>
                    <td class="${emp.missing <= 0 ? 'pos' : 'neg'}">${emp.missing <= 0 ? 'Đạt' : formatVND(emp.missing)}</td>
                    <td class="${(Math.round(emp.target * 1.2) - emp.actual) <= 0 ? 'pos' : 'neg'}">
                        ${(Math.round(emp.target * 1.2) - emp.actual) <= 0 ? 'Đạt' : formatVND(Math.round(emp.target * 1.2) - emp.actual)}
                    </td>
                    <td colspan="12" style="text-align:center;color:#94a3b8;font-style:italic">— chi tiết cá nhân ở bảng doanh thu theo ngày —</td>
                </tr>
            `;
        });
    });

    if (summary) {
        const sumStages = summary.stages || {};
        html += `
            <tr class="total-row">
                <td style="text-align:center">★</td>
                <td class="name">🏆 TỔNG CỘNG SALE</td>
                <td>${formatVND(summary.target_1 || 0)}</td>
                <td>${formatVND(summary.target_120 || 0)}</td>
                <td style="color:#b45309">${formatVND(summary.actual || 0)}</td>
                <td class="pct-cell">${summary.rate_1 || 0}%</td>
                <td class="pct-cell">${summary.rate_120 || 0}%</td>
                <td class="${(summary.missing_1 || 0) <= 0 ? 'pos' : 'neg'}">${(summary.missing_1 || 0) <= 0 ? 'Đạt' : formatVND(summary.missing_1 || 0)}</td>
                <td class="${(summary.missing_120 || 0) <= 0 ? 'pos' : 'neg'}">${(summary.missing_120 || 0) <= 0 ? 'Đạt' : formatVND(summary.missing_120 || 0)}</td>
                <!-- GĐ1 -->
                <td>${formatVND(sumStages.stage1?.target || 0)}</td>
                <td>${formatVND(sumStages.stage1?.actual || 0)}</td>
                <td>${formatVND(sumStages.stage1?.avg_per_day || 0)}</td>
                <td class="${(sumStages.stage1?.missing || 0) <= 0 ? 'pos' : 'neg'}">${(sumStages.stage1?.missing || 0) <= 0 ? 'Đạt' : formatVND(sumStages.stage1?.missing || 0)}</td>
                <!-- GĐ2 -->
                <td>${formatVND(sumStages.stage2?.target || 0)}</td>
                <td>${formatVND(sumStages.stage2?.actual || 0)}</td>
                <td>${formatVND(sumStages.stage2?.avg_per_day || 0)}</td>
                <td class="${(sumStages.stage2?.missing || 0) <= 0 ? 'pos' : 'neg'}">${(sumStages.stage2?.missing || 0) <= 0 ? 'Đạt' : formatVND(sumStages.stage2?.missing || 0)}</td>
                <!-- GĐ3 -->
                <td>${formatVND(sumStages.stage3?.target || 0)}</td>
                <td>${formatVND(sumStages.stage3?.actual || 0)}</td>
                <td>${formatVND(sumStages.stage3?.avg_per_day || 0)}</td>
                <td class="${(sumStages.stage3?.missing || 0) <= 0 ? 'pos' : 'neg'}">${(sumStages.stage3?.missing || 0) <= 0 ? 'Đạt' : formatVND(sumStages.stage3?.missing || 0)}</td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
}

// BẢNG 2: 👥 DOANH THU VÀ TARGET NHÂN SỰ (Detailed with STT, Mã NV, TVV, Target, DTTT, Tỷ lệ HT, Còn thiếu, 1/7..31/7)
function renderKpiSaleDailyTable(data) {
    if (!data || !data.month) return;
    const { month, teams, summary } = data;
    const daysInMonth = month.days_in_month;
    const now = new Date();
    const isCurrentMonth = month.year === now.getFullYear() && month.month === (now.getMonth() + 1);
    const todayDay = now.getDate();

    const thead = document.getElementById('kpiSaleDailyHead');
    if (thead) {
        let thHtml = `
            <tr>
                <th style="width:35px">STT</th>
                <th style="width:110px">Mã NV</th>
                <th style="width:140px">TVV</th>
                <th style="width:90px;background:#2563eb">Target</th>
                <th style="width:90px;background:#d97706">DTTT</th>
                <th style="width:65px;background:#7c3aed">Tỷ lệ HT</th>
                <th style="width:90px;background:#dc2626">Còn thiếu</th>
        `;
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = isCurrentMonth && d === todayDay;
            thHtml += `<th class="${isToday ? 'kpi-today-hdr' : ''}">${d}/${month.month}</th>`;
        }
        thHtml += `</tr>`;
        thead.innerHTML = thHtml;
    }

    const tbody = document.getElementById('kpiSaleDailyBody');
    if (!tbody) return;

    let html = '';

    (teams || []).forEach(team => {
        // Team Header Row
        const teamTarget = team.target_1 || 0;
        const teamActual = team.actual || 0;
        const teamRate = team.rate_1 || 0;
        const teamMissing = team.missing_1 || 0;

        html += `
            <tr class="team-row">
                <td></td>
                <td colspan="2" class="name">👥 ${team.dept_name}</td>
                <td>${compactVND(teamTarget)}</td>
                <td style="color:#d97706">${compactVND(teamActual)}</td>
                <td class="pct-cell ${teamRate >= 100 ? 'pos' : ''}">${teamRate}%</td>
                <td class="${teamMissing <= 0 ? 'pos' : 'neg'}">${teamMissing <= 0 ? '0' : compactVND(teamMissing)}</td>
        `;
        (team.daily || []).forEach((val, idx) => {
            const dayNum = idx + 1;
            const isToday = isCurrentMonth && dayNum === todayDay;
            html += `<td class="day-cell ${val > 0 ? 'has-val' : 'zero-val'} ${isToday ? 'kpi-today-hdr' : ''}">${val > 0 ? compactVND(val) : '—'}</td>`;
        });
        html += `</tr>`;

        // Employees Rows
        let empIdx = 1;
        (team.employees || []).forEach(emp => {
            const rate = emp.rate || 0;
            const missing = emp.missing || 0;
            html += `
                <tr>
                    <td style="text-align:center">${empIdx++}</td>
                    <td style="font-weight:700;color:#64748b">${emp.username || '—'}</td>
                    <td class="name" style="cursor:pointer;color:#2563eb" onclick="kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}')">
                        👤 ${emp.full_name}
                    </td>
                    <td>${compactVND(emp.target)}</td>
                    <td style="font-weight:800;color:#059669">${compactVND(emp.actual)}</td>
                    <td class="pct-cell ${rate >= 100 ? 'pos' : ''}">${rate}%</td>
                    <td class="${missing <= 0 ? 'pos' : 'neg'}">${missing <= 0 ? '0' : compactVND(missing)}</td>
            `;
            (emp.daily || []).forEach((val, idx) => {
                const dayNum = idx + 1;
                const isToday = isCurrentMonth && dayNum === todayDay;
                html += `<td class="day-cell ${val > 0 ? 'has-val' : 'zero-val'} ${isToday ? 'kpi-today-hdr' : ''}">${val > 0 ? compactVND(val) : '—'}</td>`;
            });
            html += `</tr>`;
        });
    });

    tbody.innerHTML = html;
}

// SECTION 2: 📊 THEO DÕI KPI CÁ NHÂN & TEAM
async function loadKpiSaleAchievement(year, month) {
    const el = document.getElementById('kpiSaleAchievement');
    if (!el) return;
    try {
        const data = await apiCall(`/api/reports/kpi-sale-achievement?year=${year}`);
        _kpiSaleAchData = data;
        renderKpiSaleAchievementUI(el, month);
    } catch(e) {
        el.innerHTML = '';
    }
}

function renderKpiSaleAchievementUI(el, currentMo) {
    if (!_kpiSaleAchData || !_kpiSaleAchData.users) { el.innerHTML = ''; return; }
    const data = _kpiSaleAchData;
    const mo = _kpiSaleAchFilterMonth || currentMo || data.current_month;
    const year = data.year;

    let h = `
        <div class="kpi-lb-section">
            <div class="kpi-lb-header" style="justify-content:space-between;cursor:pointer" onclick="_kpiSaleAchToggle()">
                <div style="display:flex;align-items:center;gap:10px">
                    <span id="kpiSaleAchIcon" style="font-size:14px;color:#4338ca;font-weight:900">${_kpiSaleAchCollapsed ? '▶' : '▼'}</span>
                    <span>📊 THEO DÕI KPI CÁ NHÂN & TEAM</span>
                    <span style="font-size:12px;font-weight:700;color:#6366f1">— Năm ${year}</span>
                </div>
                <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
                    <button type="button" class="kpi-mc-btn ${_kpiSaleAchTab === 'month' ? 'kpi-mc-btn-primary' : 'kpi-mc-btn-ghost'}" onclick="_kpiSaleAchSwitchTab('month')">📅 Tháng ${mo}</button>
                    <button type="button" class="kpi-mc-btn ${_kpiSaleAchTab === 'year' ? 'kpi-mc-btn-primary' : 'kpi-mc-btn-ghost'}" onclick="_kpiSaleAchSwitchTab('year')">📆 Cả Năm</button>
                </div>
            </div>
            <div id="kpiSaleAchBody" style="${_kpiSaleAchCollapsed ? 'display:none' : ''};padding:20px">
    `;

    if (_kpiSaleAchTab === 'month') {
        h += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap">`;
        h += `<span style="font-size:12px;font-weight:700;color:#6366f1;margin-right:4px">📅 Chọn tháng:</span>`;
        for (let mi = 1; mi <= 12; mi++) {
            const isActive = mi === Number(mo);
            h += `<button type="button" onclick="_kpiSaleAchPickMonth(${mi})" style="padding:6px 12px;border-radius:8px;border:${isActive ? '2px solid #4338ca' : '1px solid #e2e8f0'};cursor:pointer;font-size:12px;font-weight:${isActive ? '800' : '600'};background:${isActive ? 'linear-gradient(135deg,#4338ca,#6366f1)' : '#fff'};color:${isActive ? '#fff' : '#475569'}">T${mi}</button>`;
        }
        h += `</div>`;

        // Render Individual Month Table
        h += `
            <div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px">👤 CÁ NHÂN — Tháng ${mo}/${year}</div>
            <div class="kpi-tbl-wrap" style="margin-bottom:20px">
                <table class="kpi-tbl">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th style="text-align:left">Nhân viên</th>
                            <th>KPI Target</th>
                            <th>Đã Đạt</th>
                            <th>Còn Thiếu / Vượt</th>
                            <th>% Đạt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        (data.users || []).forEach((u, idx) => {
            const m = u.months[mo] || { target: 0, actual: 0, rate: 0, missing: 0 };
            h += `
                <tr>
                    <td style="text-align:center">${idx + 1}</td>
                    <td class="name">👤 ${u.full_name} <span style="font-size:11px;color:#64748b">(${u.role})</span></td>
                    <td>${compactVND(m.target)}</td>
                    <td style="font-weight:800;color:#059669">${compactVND(m.actual)}</td>
                    <td class="${m.missing <= 0 ? 'pos' : 'neg'}">${m.missing <= 0 ? '+' + compactVND(Math.abs(m.missing)) : '-' + compactVND(m.missing)}</td>
                    <td class="pct-cell ${m.rate >= 100 ? 'pos' : ''}">${m.rate}%</td>
                </tr>
            `;
        });
        h += `</tbody></table></div>`;

        // Render Team Month Table
        h += `
            <div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px">🏢 TEAM — Tháng ${mo}/${year}</div>
            <div class="kpi-tbl-wrap">
                <table class="kpi-tbl">
                    <thead>
                        <tr>
                            <th style="text-align:left">Team</th>
                            <th>Thành viên</th>
                            <th>KPI Target</th>
                            <th>Đã Đạt</th>
                            <th>Còn Thiếu / Vượt</th>
                            <th>% Đạt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        (data.teams || []).forEach(t => {
            const tm = t.months[mo] || { target: 0, actual: 0, rate: 0, missing: 0 };
            h += `
                <tr class="team-row">
                    <td class="name">👥 ${t.dept_name}</td>
                    <td style="text-align:center">${t.member_count}</td>
                    <td>${compactVND(tm.target)}</td>
                    <td style="font-weight:800;color:#d97706">${compactVND(tm.actual)}</td>
                    <td class="${tm.missing <= 0 ? 'pos' : 'neg'}">${tm.missing <= 0 ? '+' + compactVND(Math.abs(tm.missing)) : '-' + compactVND(tm.missing)}</td>
                    <td class="pct-cell ${tm.rate >= 100 ? 'pos' : ''}">${tm.rate}%</td>
                </tr>
            `;
        });
        h += `</tbody></table></div>`;
    } else {
        // Cả Năm view
        h += `
            <div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px">📆 TỔNG HỢP CẢ NĂM ${year}</div>
            <div class="kpi-tbl-wrap">
                <table class="kpi-tbl">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th style="text-align:left">Nhân viên</th>
                            <th>Tổng Target</th>
                            <th>Tổng Thực Thu</th>
                            <th>% Đạt Cả Năm</th>
                            <th>Số Tháng Đạt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        (data.users || []).forEach((u, idx) => {
            const y = u.yearly || {};
            h += `
                <tr>
                    <td style="text-align:center">${idx + 1}</td>
                    <td class="name">👤 ${u.full_name}</td>
                    <td>${compactVND(y.target || 0)}</td>
                    <td style="font-weight:800;color:#059669">${compactVND(y.actual || 0)}</td>
                    <td class="pct-cell ${y.rate >= 100 ? 'pos' : ''}">${y.rate || 0}%</td>
                    <td style="text-align:center;font-weight:800">${y.months_achieved || 0}/${y.months_total || 0}</td>
                </tr>
            `;
        });
        h += `</tbody></table></div>`;
    }

    h += `</div></div>`;
    el.innerHTML = h;
}

window._kpiSaleAchToggle = function() {
    _kpiSaleAchCollapsed = !_kpiSaleAchCollapsed;
    const body = document.getElementById('kpiSaleAchBody');
    const icon = document.getElementById('kpiSaleAchIcon');
    if (body) body.style.display = _kpiSaleAchCollapsed ? 'none' : 'block';
    if (icon) icon.textContent = _kpiSaleAchCollapsed ? '▶' : '▼';
};

window._kpiSaleAchSwitchTab = function(tab) {
    _kpiSaleAchTab = tab;
    const el = document.getElementById('kpiSaleAchievement');
    if (el) renderKpiSaleAchievementUI(el);
};

window._kpiSaleAchPickMonth = function(m) {
    _kpiSaleAchFilterMonth = m;
    _kpiSaleAchTab = 'month';
    const el = document.getElementById('kpiSaleAchievement');
    if (el) renderKpiSaleAchievementUI(el);
};

// SECTION 3: 🏆 Bảng Xếp Hạng Nhân Viên
function renderKpiSaleLeaderboard(advData) {
    const container = document.getElementById('kpiSaleLeaderboard');
    if (!container || !advData || !advData.leaderboard) { if (container) container.innerHTML = ''; return; }

    const lb = advData.leaderboard.all_time || advData.leaderboard.this_month || [];
    // Filter leaderboard to Sale employees
    const saleEmps = [];
    (_kpiSale.data?.teams || []).forEach(t => {
        (t.employees || []).forEach(e => saleEmps.push(e.user_id));
    });
    const filteredLb = saleEmps.length > 0 ? lb.filter(item => saleEmps.includes(item.user_id)) : lb;

    let html = `
        <div class="kpi-lb-section">
            <div class="kpi-lb-header">
                🏆 Bảng Xếp Hạng Nhân Viên (PHÒNG SALE)
            </div>
            <div style="padding:16px 24px">
                <div class="kpi-tbl-wrap">
                    <table class="kpi-tbl" style="width:100%">
                        <thead>
                            <tr>
                                <th style="width:50px">#</th>
                                <th style="text-align:left">Nhân viên</th>
                                <th>Tổng Đơn</th>
                                <th>Doanh Số</th>
                                <th>Tỷ Lệ Đạt</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    if (filteredLb.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8">📭 Chưa có xếp hạng trong kỳ này</td></tr>`;
    } else {
        filteredLb.forEach((item, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
            html += `
                <tr>
                    <td style="text-align:center;font-size:16px;font-weight:900">${medal}</td>
                    <td class="name">👤 ${item.full_name || item.name || 'Sale'}</td>
                    <td style="text-align:center;font-weight:700">${item.order_count || item.orders || 0} đơn</td>
                    <td style="font-weight:900;color:#d97706">${formatVND(item.revenue || item.total_revenue || 0)}</td>
                    <td class="pct-cell pos">${item.conversion_rate || 100}%</td>
                </tr>
            `;
        });
    }

    html += `</tbody></table></div></div></div>`;
    container.innerHTML = html;
}

// SECTION 4: 📊 So Sánh Team
function renderKpiSaleTeamCompare(mainData, advData) {
    const container = document.getElementById('kpiSaleTeamCompare');
    if (!container || !_kpiSale.data || !_kpiSale.data.teams) { if (container) container.innerHTML = ''; return; }

    const teams = _kpiSale.data.teams;
    let html = `
        <div class="kpi-lb-section">
            <div class="kpi-lb-header">
                📊 So Sánh Team (PHÒNG SALE)
            </div>
            <div class="kpi-tc-grid">
    `;

    teams.forEach(team => {
        html += `
            <div class="kpi-tc-card">
                <div class="kpi-tc-name">🏠 ${team.dept_name} (${(team.employees || []).length} NV)</div>
                <div class="kpi-tc-stats">
                    <div class="kpi-tc-stat">
                        <div class="kpi-tc-stat-val" style="color:#d97706">${compactVND(team.actual)}</div>
                        <div class="kpi-tc-stat-label">Doanh Số</div>
                    </div>
                    <div class="kpi-tc-stat">
                        <div class="kpi-tc-stat-val" style="color:#2563eb">${team.rate_1}%</div>
                        <div class="kpi-tc-stat-label">Tỷ Lệ Đạt</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

// SECTION 5: ▶ 📝 Cam Kết Cuộc Họp : KPI P.Sale
function renderKpiSaleMeetingCommit(el) {
    const user = window.currentUser || {};
    const isGD = user.role === 'giam_doc' || user.role === 'admin';
    const [selYear, selMonth] = _kpiSale.month.split('-').map(Number);
    const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    let h = `
        <div class="kpi-mc-section">
            <div class="kpi-mc-header">
                <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="_mcSaleToggleSection()">
                    <span id="mcSaleCollapseIcon" style="font-size:16px;transition:transform .3s">${_mcSaleCollapsed ? '▶' : '▼'}</span>
                    <span>📝 Cam Kết Cuộc Họp : KPI P.Sale</span>
                    <span style="font-size:13px;font-weight:500;color:#6366f1">— ${monthNames[selMonth]}/${selYear} (${_mcSaleSessions.length} cuộc họp)</span>
                </div>
                <div style="display:flex;gap:8px">
                    ${isGD ? `
                        <button type="button" class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleCreateSession()">➕ Tạo Cuộc Họp</button>
                        <button type="button" class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSetupTemplates('kpisale','Cá Nhân')" title="Mẫu cá nhân">⚙️ Mẫu Cá Nhân</button>
                        <button type="button" class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSetupTemplates('kpisale_team','Team')" title="Mẫu team">⚙️ Mẫu Team</button>
                    ` : ''}
                    <a href="/camketcuochop" class="kpi-mc-btn kpi-mc-btn-ghost" style="text-decoration:none">📜 Xem Lịch Sử</a>
                </div>
            </div>
            <div id="mcSaleSectionBody" style="${_mcSaleCollapsed ? 'display:none' : ''};padding:20px">
    `;

    if (_mcSaleSessions.length === 0) {
        h += `
            <div style="padding:40px;text-align:center;color:#6b7280">
                <div style="font-size:40px;margin-bottom:12px">📫</div>
                <div style="font-size:14px;font-weight:600">Chưa có cuộc họp nào trong tháng này</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:4px">Bấm "➕ Tạo Cuộc Họp" để bắt đầu</div>
            </div>
        `;
    } else {
        h += `<div style="font-weight:700;color:#1e293b">Đã có ${_mcSaleSessions.length} cuộc họp cam kết được ghi nhận.</div>`;
    }

    h += `</div></div>`;
    el.innerHTML = h;
}

window._mcSaleToggleSection = function() {
    _mcSaleCollapsed = !_mcSaleCollapsed;
    const body = document.getElementById('mcSaleSectionBody');
    const icon = document.getElementById('mcSaleCollapseIcon');
    if (body) body.style.display = _mcSaleCollapsed ? 'none' : 'block';
    if (icon) icon.textContent = _mcSaleCollapsed ? '▶' : '▼';
};

window.mcSaleCreateSession = async function() {
    if (typeof window.mcCreateSession === 'function') {
        window.mcCreateSession();
    } else {
        showToast('⚠️ Vui lòng mở trang Cam Kết Cuộc Họp để khởi tạo cuộc họp mới', 'warning');
    }
};

// Navigation & Actions
function kpiSaleChangeMonth(delta) {
    if (!_kpiSale.month) return;
    let [year, mo] = _kpiSale.month.split('-').map(Number);
    mo += delta;
    if (mo > 12) { mo = 1; year++; }
    else if (mo < 1) { mo = 12; year--; }
    _kpiSale.month = `${year}-${String(mo).padStart(2,'0')}`;
    loadKpiSaleData();
}

function kpiSalePickMonth() {
    const input = document.getElementById('kpiSaleMonthInput');
    if (input) { input.value = _kpiSale.month; input.showPicker ? input.showPicker() : input.click(); }
}

function kpiSaleOnMonthInput(val) {
    if (val && /^\d{4}-\d{2}$/.test(val)) {
        _kpiSale.month = val;
        loadKpiSaleData();
    }
}

// Target Modal
function kpiSaleOpenTargetModal() {
    const modal = document.getElementById('kpiSaleTargetModal');
    const periodSpan = document.getElementById('kpiSaleTargetModalPeriod');
    const formBody = document.getElementById('kpiSaleTargetFormBody');
    if (!modal || !_kpiSale.data) return;

    const [year, mo] = _kpiSale.month.split('-');
    if (periodSpan) periodSpan.textContent = `Tháng ${mo}/${year}`;

    let html = '';
    (_kpiSale.data.teams || []).forEach(team => {
        html += `<div style="font-weight:800;color:#4338ca;margin-top:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">👥 ${team.dept_name}</div>`;
        (team.employees || []).forEach(emp => {
            html += `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                    <span style="font-weight:600;color:#1e1b4b;min-width:160px">👤 ${emp.full_name} (${emp.role})</span>
                    <div style="flex:1;max-width:240px;position:relative">
                        <input type="number" class="kpi-input kpi-sale-target-input" data-user-id="${emp.user_id}" value="${emp.target || ''}" placeholder="Nhập chỉ tiêu doanh số">
                    </div>
                </div>
            `;
        });
    });

    if (formBody) formBody.innerHTML = html;
    modal.style.display = 'flex';
}

function kpiSaleCloseTargetModal() {
    const modal = document.getElementById('kpiSaleTargetModal');
    if (modal) modal.style.display = 'none';
}

async function kpiSaleSaveTargets() {
    const inputs = document.querySelectorAll('.kpi-sale-target-input');
    const targets = [];
    inputs.forEach(inp => {
        const userId = parseInt(inp.getAttribute('data-user-id'));
        const val = parseFloat(inp.value) || 0;
        if (userId) targets.push({ user_id: userId, target_value: val });
    });

    if (!_kpiSale.data || !_kpiSale.data.month) return;
    const periodValue = _kpiSale.data.month.label;

    try {
        const res = await apiCall('/api/kpi-targets/kpi-sale', 'POST', {
            targets,
            period_value: periodValue
        });

        if (res.success) {
            showToast('✅ Đã lưu KPI Phòng Sale thành công!', 'success');
            kpiSaleCloseTargetModal();
            loadKpiSaleData();
        }
    } catch(err) {
        showToast('❌ Lỗi khi lưu KPI Phòng Sale: ' + err.message, 'error');
    }
}

// Order Details Modal
async function kpiSaleShowOrders(userId, userName) {
    const modal = document.getElementById('kpiSaleOrdersModal');
    const title = document.getElementById('kpiSaleOrdersModalTitle');
    const summary = document.getElementById('kpiSaleOrdersModalSummary');
    const tbody = document.getElementById('kpiSaleOrdersModalBody');

    if (!modal) return;

    if (title) title.textContent = `NV ${userName} — Tháng ${_kpiSale.month}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">⏳ Đang lấy chi tiết đơn hàng...</td></tr>';
    modal.style.display = 'flex';

    try {
        const res = await apiCall(`/api/kpi-sale/employee-orders?user_id=${userId}&month=${_kpiSale.month}`);
        if (summary) {
            const s = res.summary || {};
            summary.innerHTML = `
                <span>Tổng đơn: <strong style="color:#2563eb">${s.total || 0}</strong></span>
                <span>Đơn mới: <strong style="color:#16a34a">${s.new_orders || 0}</strong></span>
                <span>Đơn cũ: <strong style="color:#d97706">${s.old_orders || 0}</strong></span>
                <span>Tổng doanh số: <strong style="color:#dc2626">${formatVND(s.total_revenue || 0)}</strong></span>
            `;
        }

        if (tbody) {
            if (!res.orders || res.orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">📭 Không có đơn hàng chốt trong tháng này</td></tr>';
                return;
            }

            tbody.innerHTML = res.orders.map((o, idx) => `
                <tr>
                    <td style="text-align:center">${idx + 1}</td>
                    <td style="font-weight:700;color:#2563eb">${o.order_code || '—'}</td>
                    <td>${o.customer_name || '—'}</td>
                    <td>${o.customer_phone || '—'}</td>
                    <td style="text-align:center"><span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${o.customer_type === 'moi' ? '#dcfce7' : '#fef3c7'};color:${o.customer_type === 'moi' ? '#15803d' : '#b45309'}">${o.customer_type === 'moi' ? 'Khách Mới' : 'Khách Cũ'}</span></td>
                    <td style="font-weight:800;color:#059669">${formatVND(o.revenue || 0)}</td>
                    <td style="text-align:center">${o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                </tr>
            `).join('');
        }
    } catch(err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#ef4444">❌ Lỗi: ${err.message}</td></tr>`;
    }
}

function kpiSaleCloseOrdersModal() {
    const modal = document.getElementById('kpiSaleOrdersModal');
    if (modal) modal.style.display = 'none';
}
