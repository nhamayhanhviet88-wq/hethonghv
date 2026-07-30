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
            .kpi-lb-tabs{display:flex;gap:0;margin:0 24px;border-bottom:2px solid #f1f5f9}
            .kpi-lb-tab{padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;background:none;border:none;color:#6b7280;border-bottom:3px solid transparent;transition:all .2s}
            .kpi-lb-tab.active{color:#4338ca;border-bottom-color:#4338ca}
            .kpi-lb-tab:hover{color:#4338ca}
            .kpi-lb-row{display:grid;grid-template-columns:36px 1fr 70px 85px 55px 55px 75px 85px;padding:14px 16px;border-bottom:1px solid #f8fafc;align-items:center;gap:6px;transition:background .2s}
            .kpi-lb-row:hover{background:#fefce8}
            .kpi-lb-rank{font-size:20px;font-weight:900;text-align:center}
            .kpi-lb-name{font-weight:700;color:#1e1b4b}
            .kpi-lb-team{font-size:11px;color:#6b7280;margin-top:2px}
            .kpi-lb-val{text-align:right;font-weight:800;font-size:14px}
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

            <!-- NEW SECTION: 🔄 TỶ LỆ KHÁCH HÀNG CŨ QUAY LẠI THEO NHÂN SỰ & TEAM -->
            <div id="kpiSaleRetentionSection"></div>

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
                                <th>NV Sale</th>
                                <th>Loại khách</th>
                                <th>Nguồn</th>
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
            apiCall(`/api/reports/customer-retention/advanced?period=month&date=${_kpiSale.month}&dept_id=4`),
            apiCall(`/api/reports/customer-retention?period=month&date=${_kpiSale.month}&dept_id=4`)
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
            <tr class="team-row" style="cursor:pointer" onclick="kpiSaleShowTeamOrders(${team.dept_id}, '${team.dept_name.replace(/'/g, "\\'")}')">
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
            const empStages = emp.stages || (function() {
                const daysInMonth = month.days_in_month || 30;
                const s1Days = 10, s2Days = 10, s3Days = daysInMonth - 20;
                let s1Actual = 0, s2Actual = 0, s3Actual = 0;
                const dailyArr = emp.daily || [];
                for (let i = 0; i < daysInMonth; i++) {
                    if (i < 10) s1Actual += dailyArr[i] || 0;
                    else if (i < 20) s2Actual += dailyArr[i] || 0;
                    else s3Actual += dailyArr[i] || 0;
                }
                const s1Target = emp.target > 0 ? Math.round(emp.target * s1Days / daysInMonth) : 0;
                const s2Target = emp.target > 0 ? Math.round(emp.target * s2Days / daysInMonth) : 0;
                const s3Target = emp.target > 0 ? emp.target - s1Target - s2Target : 0;
                return {
                    stage1: { target: s1Target, actual: s1Actual, avg_per_day: s1Days > 0 ? Math.round(s1Actual / s1Days) : 0, missing: s1Target - s1Actual },
                    stage2: { target: s2Target, actual: s2Actual, avg_per_day: s2Days > 0 ? Math.round(s2Actual / s2Days) : 0, missing: s2Target - s2Actual },
                    stage3: { target: s3Target, actual: s3Actual, avg_per_day: s3Days > 0 ? Math.round(s3Actual / s3Days) : 0, missing: s3Target - s3Actual }
                };
            })();

            html += `
                <tr style="cursor:pointer" onclick="kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}')">
                    <td></td>
                    <td class="name" style="padding-left:24px;cursor:pointer;color:#2563eb" onclick="kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}')">
                        ${['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(emp.role) || emp.username === 'truongphongsale' ? '⭐' : '👤'} ${emp.full_name}
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
                    <!-- GĐ1 -->
                    <td>${formatVND(empStages.stage1.target)}</td>
                    <td>${formatVND(empStages.stage1.actual)}</td>
                    <td>${formatVND(empStages.stage1.avg_per_day)}</td>
                    <td class="${empStages.stage1.missing <= 0 ? 'pos' : 'neg'}">${empStages.stage1.missing <= 0 ? 'Đạt' : formatVND(empStages.stage1.missing)}</td>
                    <!-- GĐ2 -->
                    <td>${formatVND(empStages.stage2.target)}</td>
                    <td>${formatVND(empStages.stage2.actual)}</td>
                    <td>${formatVND(empStages.stage2.avg_per_day)}</td>
                    <td class="${empStages.stage2.missing <= 0 ? 'pos' : 'neg'}">${empStages.stage2.missing <= 0 ? 'Đạt' : formatVND(empStages.stage2.missing)}</td>
                    <!-- GĐ3 -->
                    <td>${formatVND(empStages.stage3.target)}</td>
                    <td>${formatVND(empStages.stage3.actual)}</td>
                    <td>${formatVND(empStages.stage3.avg_per_day)}</td>
                    <td class="${empStages.stage3.missing <= 0 ? 'pos' : 'neg'}">${empStages.stage3.missing <= 0 ? 'Đạt' : formatVND(empStages.stage3.missing)}</td>
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
            <tr class="team-row" style="cursor:pointer" onclick="kpiSaleShowTeamOrders(${team.dept_id}, '${team.dept_name.replace(/'/g, "\\'")}')">
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
                <tr style="cursor:pointer" onclick="kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}')">
                    <td style="text-align:center">${empIdx++}</td>
                    <td style="font-weight:700;color:#64748b">${emp.username || '—'}</td>
                    <td class="name" style="cursor:pointer;color:#2563eb" onclick="kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}')">
                        ${['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(emp.role) || emp.username === 'truongphongsale' ? '⭐' : '👤'} ${emp.full_name}
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

    const retEl = document.getElementById('kpiSaleRetentionSection');
    if (retEl) {
        retEl.innerHTML = renderRetentionTableSection(data);
    }
}

// BẢNG THỐNG KÊ TỶ LỆ KHÁCH HÀNG CŨ QUAY LẠI THEO NHÂN SỰ & TEAM
function renderRetentionTableSection(data) {
    if (!data || !data.teams) return '';

    var h = '<div style="margin-top:20px;border:2px solid #fed7aa;border-radius:16px;overflow:hidden;background:#fff8f1">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:linear-gradient(135deg,#c2410c,#ea580c)">';
    h += '<div style="display:flex;align-items:center;gap:10px">';
    h += '<span style="font-size:16px;font-weight:900;letter-spacing:0.5px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.3)">🔄 TỶ LỆ KHÁCH HÀNG CŨ QUAY LẠI THEO NHÂN SỰ & TEAM</span>';
    h += '</div>';
    h += '<span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.9)">Đã đóng băng mẫu số đầu kỳ & lọc giao tử số</span>';
    h += '</div>';

    h += '<div style="padding:16px 20px;overflow-x:auto">';
    h += '<table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);border:1px solid #fed7aa">';
    h += '<thead>';
    h += '<tr style="background:#7c2d12;color:#fff">';
    h += '<th rowspan="2" style="padding:10px 8px;border:1px solid #9a3412;width:40px">STT</th>';
    h += '<th rowspan="2" style="padding:10px;border:1px solid #9a3412;text-align:left">Mã NV</th>';
    h += '<th rowspan="2" style="padding:10px;border:1px solid #9a3412;text-align:left">Thành Viên / Team</th>';
    h += '<th colspan="3" style="padding:10px;border:1px solid #9a3412;background:#9a3412;color:#ffedd5;text-align:center;font-size:13px">👔 LĨNH VỰC ĐỒNG PHỤC</th>';
    h += '<th colspan="3" style="padding:10px;border:1px solid #9a3412;background:#831843;color:#fce7f3;text-align:center;font-size:13px">🏷️ LĨNH VỰC PET / TEM</th>';
    h += '</tr>';
    h += '<tr style="background:#9a3412;color:#fff">';
    h += '<th style="padding:8px;border:1px solid #7c2d12;text-align:center">KH Cũ Đầu Kỳ</th>';
    h += '<th style="padding:8px;border:1px solid #7c2d12;text-align:center">KH Quay Lại</th>';
    h += '<th style="padding:8px;border:1px solid #7c2d12;text-align:center">Tỷ Lệ %</th>';
    h += '<th style="padding:8px;border:1px solid #831843;text-align:center;background:#9d174d">KH Cũ Đầu Kỳ</th>';
    h += '<th style="padding:8px;border:1px solid #831843;text-align:center;background:#9d174d">KH Quay Lại</th>';
    h += '<th style="padding:8px;border:1px solid #831843;text-align:center;background:#9d174d">Tỷ Lệ %</th>';
    h += '</tr>';
    h += '</thead>';
    h += '<tbody>';

    data.teams.forEach(function(team, ti) {
        var teamHeaderBg = '#ffedd5';
        var teamName = team.dept_name || ('Team ' + (ti + 1));
        var teamEmps = team.employees || [];

        h += '<tr style="background:' + teamHeaderBg + ';font-weight:800;color:#9a3412">';
        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center">' + (ti + 1) + '</td>';
        h += '<td style="padding:10px;border:1px solid #fed7aa" colspan="2">🏢 ' + teamName.toUpperCase() + ' (' + teamEmps.length + ' nhân sự)</td>';

        var tDpText = team.rate_dp != null ? (team.rate_dp + '%') : '—';
        var tPetText = team.rate_pettem != null ? (team.rate_pettem + '%') : '—';

        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center;color:#c2410c;font-size:13px">' + (team.old_dp_total || 0) + '</td>';
        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center;color:#047857;font-size:13px">' + (team.ret_dp_cust || 0) + '</td>';
        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center;color:#b45309;font-size:14px;font-weight:900">' + tDpText + '</td>';

        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center;color:#be185d;font-size:13px">' + (team.old_pettem_total || 0) + '</td>';
        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center;color:#047857;font-size:13px">' + (team.ret_pettem_cust || 0) + '</td>';
        h += '<td style="padding:10px;border:1px solid #fed7aa;text-align:center;color:#9d174d;font-size:14px;font-weight:900">' + tPetText + '</td>';
        h += '</tr>';

        teamEmps.forEach(function(emp, ei) {
            var isLeader = ['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(emp.role) || emp.username === 'truongphongsale';
            var empIcon = isLeader ? '⭐' : '👤';
            var rowBg = ei % 2 === 0 ? '#ffffff' : '#fffbf7';

            var eDpText = emp.rate_dp != null ? (emp.rate_dp + '%') : '—';
            var eDpTooltip = emp.old_dp_total > 0 ? (emp.ret_dp_cust + '/' + emp.old_dp_total + ' KH cũ quay lại') : 'Chưa có tập KH cũ đầu kỳ';

            var ePetText = emp.rate_pettem != null ? (emp.rate_pettem + '%') : '—';
            var ePetTooltip = emp.old_pettem_total > 0 ? (emp.ret_pettem_cust + '/' + emp.old_pettem_total + ' KH cũ quay lại') : 'Chưa có tập KH cũ đầu kỳ';

            var fnEsc = (emp.full_name || emp.name || '').replace(/'/g, "\\'");
            var showFn = 'kpiSaleShowOrders' in window ? ('kpiSaleShowOrders(' + (emp.user_id || emp.id) + ',\'' + fnEsc + '\')') : ('kpiShowOrders(' + (emp.user_id || emp.id) + ',\'' + fnEsc + '\')');

            h += '<tr style="background:' + rowBg + ';cursor:pointer" onclick="' + showFn + '">';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;color:#94a3b8">' + (ti + 1) + '.' + (ei + 1) + '</td>';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;font-weight:700;color:#64748b">' + (emp.username || emp.user_id) + '</td>';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;font-weight:700;color:#1e293b">' + empIcon + ' ' + (emp.full_name || emp.name) + '</td>';

            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;font-weight:700;color:#475569">' + (emp.old_dp_total || 0) + '</td>';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;font-weight:800;color:#059669">' + (emp.ret_dp_cust || 0) + '</td>';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;font-weight:900;color:#c2410c" title="' + eDpTooltip + '">' + eDpText + '</td>';

            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;font-weight:700;color:#475569">' + (emp.old_pettem_total || 0) + '</td>';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;font-weight:800;color:#059669">' + (emp.ret_pettem_cust || 0) + '</td>';
            h += '<td style="padding:8px 10px;border:1px solid #fed7aa;text-align:center;font-weight:900;color:#be185d" title="' + ePetTooltip + '">' + ePetText + '</td>';
            h += '</tr>';
        });
    });

    var s = data.summary || {};
    var sDpText = s.rate_dp != null ? (s.rate_dp + '%') : '—';
    var sPetText = s.rate_pettem != null ? (s.rate_pettem + '%') : '—';

    h += '<tr style="background:#7c2d12;color:#fff;font-weight:900;font-size:13px">';
    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center" colspan="3">Σ TỔNG CỘNG TOÀN PHÒNG</td>';
    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center;color:#ffedd5">' + (s.old_dp_total || 0) + '</td>';
    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center;color:#34d399">' + (s.ret_dp_cust || 0) + '</td>';
    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center;color:#fbbf24;font-size:14px">' + sDpText + '</td>';

    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center;color:#fce7f3">' + (s.old_pettem_total || 0) + '</td>';
    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center;color:#34d399">' + (s.ret_pettem_cust || 0) + '</td>';
    h += '<td style="padding:12px 10px;border:1px solid #9a3412;text-align:center;color:#f472b6;font-size:14px">' + sPetText + '</td>';
    h += '</tr>';

    h += '</tbody></table>';
    h += '</div></div>';
    return h;
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
    var data = _kpiSaleAchData;
    var mo = _kpiSaleAchFilterMonth || currentMo || data.current_month;
    var year = data.year;

    function fmtMoney(v) {
        return compactVND(v);
    }
    function rateColor(rate) {
        if (rate >= 100) return '#059669';
        if (rate >= 80) return '#d97706';
        return '#dc2626';
    }
    function rateBg(rate) {
        if (rate >= 100) return '#dcfce7';
        if (rate >= 80) return '#fef3c7';
        return '#fee2e2';
    }
    function diffBadge(missing, rate) {
        if (missing <= 0) return '<span style="color:#059669;font-weight:800;font-size:12px">+' + fmtMoney(Math.abs(missing)) + '</span>';
        return '<span style="color:#dc2626;font-weight:800;font-size:12px">-' + fmtMoney(missing) + '</span>';
    }
    function pctBadge(rate) {
        var c = rateColor(rate);
        var bg = rateBg(rate);
        return '<span style="display:inline-block;padding:3px 10px;border-radius:8px;font-weight:900;font-size:13px;background:' + bg + ';color:' + c + '">' + rate + '%</span>';
    }
    function exceededBadge(rate) {
        if (rate >= 100) {
            var over = Math.round((rate - 100) * 10) / 10;
            return '<span style="color:#059669;font-weight:800;font-size:12px">+' + over + '%</span>';
        }
        var under = Math.round((100 - rate) * 10) / 10;
        return '<span style="color:#dc2626;font-weight:800;font-size:12px">-' + under + '%</span>';
    }
    function roleIcon(role, username) {
        if (['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(role) || username === 'truongphongsale') return '⭐';
        return '👤';
    }
    function roleName(role) {
        if (role === 'quan_ly' || role === 'quan_ly_cap_cao') return 'Quản Lý';
        if (role === 'truong_phong') return 'Trưởng Phòng';
        return 'Nhân Viên';
    }

    var h = '<div style="margin-top:20px;border:2px solid #e0e7ff;border-radius:16px;overflow:hidden;background:#fafbff">';
    // Header
    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:linear-gradient(135deg,#4338ca,#6366f1);cursor:pointer" onclick="_kpiSaleAchToggle()">';
    h += '<div style="display:flex;align-items:center;gap:10px">';
    h += '<span id="kpiSaleAchIcon" style="font-size:14px;transition:transform .3s;color:#fff;font-weight:900">' + (_kpiSaleAchCollapsed ? '▶' : '▼') + '</span>';
    h += '<span style="font-size:16px;font-weight:900;letter-spacing:0.5px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.3)">📊 THEO DÕI KPI CÁ NHÂN & TEAM</span>';
    h += '<span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.9)">— Năm ' + year + '</span>';
    h += '</div>';
    // Tabs
    h += '<div style="display:flex;gap:4px" onclick="event.stopPropagation()">';
    h += '<button type="button" onclick="_kpiSaleAchSwitchTab(\'month\')" style="padding:6px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;' + (_kpiSaleAchTab === 'month' ? 'background:white;color:#4338ca' : 'background:rgba(255,255,255,0.2);color:white') + '">📅 Tháng ' + mo + '</button>';
    h += '<button type="button" onclick="_kpiSaleAchSwitchTab(\'year\')" style="padding:6px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;' + (_kpiSaleAchTab === 'year' ? 'background:white;color:#4338ca' : 'background:rgba(255,255,255,0.2);color:white') + '">📆 Cả Năm</button>';
    h += '</div></div>';

    // Body
    h += '<div id="kpiSaleAchBody" style="' + (_kpiSaleAchCollapsed ? 'display:none' : '') + ';padding:16px 20px">';

    if (_kpiSaleAchTab === 'month') {
        // Month picker
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap">';
        h += '<span style="font-size:12px;font-weight:700;color:#6366f1;margin-right:4px">📅 Chọn tháng:</span>';
        for (var mi = 1; mi <= 12; mi++) {
            var isActive = mi === Number(mo);
            h += '<button type="button" onclick="_kpiSaleAchPickMonth(' + mi + ')" style="padding:6px 12px;border-radius:8px;border:' + (isActive ? '2px solid #4338ca' : '1px solid #e2e8f0') + ';cursor:pointer;font-size:12px;font-weight:' + (isActive ? '800' : '600') + ';background:' + (isActive ? 'linear-gradient(135deg,#4338ca,#6366f1)' : '#fff') + ';color:' + (isActive ? '#fff' : '#475569') + ';transition:all .2s;box-shadow:' + (isActive ? '0 2px 8px rgba(67,56,202,0.3)' : 'none') + '">T' + mi + '</button>';
        }
        h += '</div>';

        // Monthly Individual Table
        h += '<div style="margin-bottom:20px">';
        h += '<div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px">👤 CÁ NHÂN — Tháng ' + mo + '/' + year + '</div>';
        h += '<div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0">';
        h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        h += '<thead><tr style="background:#312e81">';
        h += '<th style="padding:10px 12px;text-align:left;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">STT</th>';
        h += '<th style="padding:10px 12px;text-align:left;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Nhân viên</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">KPI Target</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Đã Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Còn Thiếu / Vượt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">% Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Vượt Mốc</th>';
        h += '</tr></thead><tbody>';

        var sortedUsers = data.users.slice().sort(function(a, b) {
            var rateA = a.months[mo] ? a.months[mo].rate : 0;
            var rateB = b.months[mo] ? b.months[mo].rate : 0;
            return rateB - rateA;
        });
        for (var i = 0; i < sortedUsers.length; i++) {
            var u = sortedUsers[i];
            var md = u.months[mo] || { target:0, actual:0, rate:0, missing:0 };
            var rowBg = md.rate >= 100 ? '#f0fdf4' : (i % 2 === 0 ? 'white' : '#fafbff');
            var medalI = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            h += '<tr style="background:' + rowBg + ';cursor:pointer" onclick="kpiSaleShowOrders(' + (u.user_id || u.id) + ',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')">';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:' + (i < 3 ? '18px' : '12px') + ';color:#94a3b8">' + (medalI || (i+1)) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9"><div style="display:flex;align-items:center;gap:6px">' + roleIcon(u.role, u.username) + ' <span style="font-weight:700;color:#1e293b">' + u.full_name + '</span><span style="font-size:10px;color:#94a3b8">(' + roleName(u.role) + ')</span></div></td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#475569">' + fmtMoney(md.target) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800;color:' + rateColor(md.rate) + '">' + fmtMoney(md.actual) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">' + diffBadge(md.missing, md.rate) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">' + pctBadge(md.rate) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">' + exceededBadge(md.rate) + '</td>';
            h += '</tr>';
        }
        h += '</tbody></table></div></div>';

        // Monthly Team Table
        h += '<div>';
        h += '<div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px">🏢 TEAM — Tháng ' + mo + '/' + year + '</div>';
        h += '<div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0">';
        h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        h += '<thead><tr style="background:#92400e">';
        h += '<th style="padding:10px 12px;text-align:left;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Team</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Thành viên</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #b45309">KPI Target</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Đã Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Còn Thiếu / Vượt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">% Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Vượt Mốc</th>';
        h += '</tr></thead><tbody>';
        var sortedTeams = data.teams.slice().sort(function(a, b) {
            var rA = a.months[mo] ? a.months[mo].rate : 0;
            var rB = b.months[mo] ? b.months[mo].rate : 0;
            return rB - rA;
        });
        for (var ti = 0; ti < sortedTeams.length; ti++) {
            var t = sortedTeams[ti];
            var td = t.months[mo] || { target:0, actual:0, rate:0, missing:0 };
            var trBg = td.rate >= 100 ? '#f0fdf4' : (ti % 2 === 0 ? '#fffbeb' : 'white');
            var medalT = ti === 0 ? '🥇' : ti === 1 ? '🥈' : ti === 2 ? '🥉' : '🏢';
            h += '<tr style="background:' + trBg + ';cursor:pointer" onclick="kpiSaleShowTeamOrders(' + t.dept_id + ',\'' + (t.dept_name || '').replace(/'/g, "\\'") + '\')">';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;font-weight:800;color:#1e293b">' + medalT + ' ' + t.dept_name + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center;font-weight:700;color:#6b7280">' + t.member_count + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:right;font-weight:700;color:#475569">' + fmtMoney(td.target) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:right;font-weight:800;color:' + rateColor(td.rate) + '">' + fmtMoney(td.actual) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:right">' + diffBadge(td.missing, td.rate) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center">' + pctBadge(td.rate) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center">' + exceededBadge(td.rate) + '</td>';
            h += '</tr>';
        }
        h += '</tbody></table></div></div>';

    } else {
        // Yearly Individual Table
        h += '<div style="margin-bottom:20px">';
        h += '<div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px">👤 CÁ NHÂN — Năm ' + year + '</div>';
        h += '<div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0">';
        h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        h += '<thead><tr style="background:#312e81">';
        h += '<th style="padding:10px 12px;text-align:left;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">STT</th>';
        h += '<th style="padding:10px 12px;text-align:left;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Nhân viên</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Tổng KPI</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Tổng Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Tổng Thiếu / Vượt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">% Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Vượt Mốc</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #4338ca">Tỉ Lệ Đạt</th>';
        h += '</tr></thead><tbody>';
        var sortedYearly = data.users.slice().sort(function(a, b) { return b.yearly.rate - a.yearly.rate; });
        for (var yi = 0; yi < sortedYearly.length; yi++) {
            var uy = sortedYearly[yi];
            var yy = uy.yearly;
            var rowBgY = yy.rate >= 100 ? '#f0fdf4' : (yi % 2 === 0 ? 'white' : '#fafbff');
            var ratioColor = yy.months_achieved === yy.months_total && yy.months_total > 0 ? '#059669' : '#dc2626';
            var medalYI = yi === 0 ? '🥇' : yi === 1 ? '🥈' : yi === 2 ? '🥉' : '';
            h += '<tr style="background:' + rowBgY + ';cursor:pointer" onclick="kpiSaleShowOrders(' + (uy.user_id || uy.id) + ',\'' + (uy.full_name || '').replace(/'/g, "\\'") + '\')">';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:' + (yi < 3 ? '18px' : '12px') + ';color:#94a3b8">' + (medalYI || (yi+1)) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9"><div style="display:flex;align-items:center;gap:6px">' + roleIcon(uy.role, uy.username) + ' <span style="font-weight:700;color:#1e293b">' + uy.full_name + '</span></div></td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#475569">' + fmtMoney(yy.target) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800;color:' + rateColor(yy.rate) + '">' + fmtMoney(yy.actual) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">' + diffBadge(yy.missing, yy.rate) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">' + pctBadge(yy.rate) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">' + exceededBadge(yy.rate) + '</td>';
            h += '<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center"><span style="display:inline-block;padding:4px 12px;border-radius:10px;font-weight:900;font-size:13px;background:' + (yy.months_achieved === yy.months_total && yy.months_total > 0 ? '#dcfce7' : '#fee2e2') + ';color:' + ratioColor + '">' + yy.months_achieved + '/' + yy.months_total + '</span></td>';
            h += '</tr>';
        }
        h += '</tbody></table></div></div>';

        // Yearly Team Table
        h += '<div>';
        h += '<div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px">🏢 TEAM — Năm ' + year + '</div>';
        h += '<div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0">';
        h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        h += '<thead><tr style="background:#92400e">';
        h += '<th style="padding:10px 12px;text-align:left;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Team</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Thành viên</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Tổng KPI</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Tổng Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:right;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Tổng Thiếu / Vượt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">% Đạt</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Vượt Mốc</th>';
        h += '<th style="padding:10px 12px;text-align:center;font-weight:800;color:#fff;border-bottom:2px solid #b45309">Tỉ Lệ Đạt</th>';
        h += '</tr></thead><tbody>';
        var sortedTeamsY = data.teams.slice().sort(function(a, b) { return b.yearly.rate - a.yearly.rate; });
        for (var tyi = 0; tyi < sortedTeamsY.length; tyi++) {
            var tt = sortedTeamsY[tyi];
            var tyy = tt.yearly;
            var trBgY = tyy.rate >= 100 ? '#f0fdf4' : (tyi % 2 === 0 ? '#fffbeb' : 'white');
            var tRatioColor = tyy.months_achieved === tyy.months_total && tyy.months_total > 0 ? '#059669' : '#dc2626';
            var medalTY = tyi === 0 ? '🥇' : tyi === 1 ? '🥈' : tyi === 2 ? '🥉' : '🏢';
            h += '<tr style="background:' + trBgY + ';cursor:pointer" onclick="kpiSaleShowTeamOrders(' + tt.dept_id + ',\'' + (tt.dept_name || '').replace(/'/g, "\\'") + '\')">';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;font-weight:800;color:#1e293b">' + medalTY + ' ' + tt.dept_name + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center;font-weight:700;color:#6b7280">' + tt.member_count + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:right;font-weight:700;color:#475569">' + fmtMoney(tyy.target) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:right;font-weight:800;color:' + rateColor(tyy.rate) + '">' + fmtMoney(tyy.actual) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:right">' + diffBadge(tyy.missing, tyy.rate) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center">' + pctBadge(tyy.rate) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center">' + exceededBadge(tyy.rate) + '</td>';
            h += '<td style="padding:12px;border-bottom:1px solid #fef3c7;text-align:center"><span style="display:inline-block;padding:4px 12px;border-radius:10px;font-weight:900;font-size:13px;background:' + (tyy.months_achieved === tyy.months_total && tyy.months_total > 0 ? '#dcfce7' : '#fee2e2') + ';color:' + tRatioColor + '">' + tyy.months_achieved + '/' + tyy.months_total + '</span></td>';
            h += '</tr>';
        }
        h += '</tbody></table></div></div>';
    }

    h += '</div></div>';
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

// SECTION 3: 🏆 Bảng Xếp Hạng Nhân Viên (PHÒNG SALE)
var _kpiSaleLbSort = 'revenue';
var _kpiSaleLbFilter = 'this_month';
var _kpiSaleLbCustomStart = '';
var _kpiSaleLbCustomEnd = '';
var _kpiSaleLbMonth = '';
var _kpiSaleLbCollapsed = false;
var _kpiSaleAdvData = null;

window._kpiSaleToggleLb = function() {
    _kpiSaleLbCollapsed = !_kpiSaleLbCollapsed;
    var body = document.getElementById('kpiSaleLbBody');
    var icon = document.getElementById('kpiSaleLbIcon');
    if (body) body.style.display = _kpiSaleLbCollapsed ? 'none' : 'block';
    if (icon) {
        icon.style.transform = 'rotate(' + (_kpiSaleLbCollapsed ? '-90deg' : '0') + ')';
        icon.textContent = _kpiSaleLbCollapsed ? '▶' : '▼';
    }
};

function kpiSaleLbBuildUrl() {
    var base = '/api/reports/customer-retention/advanced?dept_id=4';
    var now = typeof vnNow === 'function' ? vnNow() : new Date();
    var fmtD = function(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    if (_kpiSaleLbFilter === 'today') {
        return base + '&period=day&date=' + fmtD(now);
    } else if (_kpiSaleLbFilter === 'yesterday') {
        var yd = new Date(now.getTime()); yd.setDate(yd.getDate() - 1);
        return base + '&period=day&date=' + fmtD(yd);
    } else if (_kpiSaleLbFilter === '7days') {
        var s7 = new Date(now.getTime()); s7.setDate(s7.getDate() - 6);
        return base + '&period=custom&startDate=' + fmtD(s7) + '&endDate=' + fmtD(now);
    } else if (_kpiSaleLbFilter === 'this_month') {
        var tm = _kpiSale.month || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
        return base + '&period=month&date=' + tm;
    } else if (_kpiSaleLbFilter === 'last_month') {
        var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var lmStr = lm.getFullYear() + '-' + String(lm.getMonth()+1).padStart(2,'0');
        return base + '&period=month&date=' + lmStr;
    } else if (_kpiSaleLbFilter === 'all') {
        return base + '&period=year&date=' + now.getFullYear();
    } else if (_kpiSaleLbFilter === 'stage1' || _kpiSaleLbFilter === 'stage2' || _kpiSaleLbFilter === 'stage3') {
        var refMonth = _kpiSaleLbMonth || _kpiSale.month || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
        var parts = refMonth.split('-').map(Number);
        var y = parts[0], m = parts[1];
        var dim = new Date(y, m, 0).getDate();
        var sd, ed;
        if (_kpiSaleLbFilter === 'stage1') { sd = '01'; ed = '10'; }
        else if (_kpiSaleLbFilter === 'stage2') { sd = '11'; ed = '20'; }
        else { sd = '21'; ed = String(dim); }
        return base + '&period=custom&startDate=' + y + '-' + String(m).padStart(2,'0') + '-' + sd + '&endDate=' + y + '-' + String(m).padStart(2,'0') + '-' + ed;
    } else if (_kpiSaleLbFilter === 'pick_month' && _kpiSaleLbMonth) {
        return base + '&period=month&date=' + _kpiSaleLbMonth;
    } else if (_kpiSaleLbFilter === 'custom' && _kpiSaleLbCustomStart && _kpiSaleLbCustomEnd) {
        return base + '&period=custom&startDate=' + _kpiSaleLbCustomStart + '&endDate=' + _kpiSaleLbCustomEnd;
    }
    var fallback = _kpiSale.month || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
    return base + '&period=month&date=' + fallback;
}

window.kpiSaleLbSetFilter = async function(filter) {
    _kpiSaleLbFilter = filter;
    if (filter === 'custom') {
        var container = document.getElementById('kpiSaleLeaderboard');
        if (container && window._kpiSaleAdvData) renderKpiSaleLeaderboard(window._kpiSaleAdvData);
        return;
    }
    await kpiSaleLbRefetch();
};

window.kpiSaleLbApplyCustom = async function() {
    var sd = document.getElementById('kpiSaleLbStartDate');
    var ed = document.getElementById('kpiSaleLbEndDate');
    if (!sd || !ed || !sd.value || !ed.value) { alert('Vui lòng chọn ngày bắt đầu và kết thúc'); return; }
    _kpiSaleLbCustomStart = sd.value;
    _kpiSaleLbCustomEnd = ed.value;
    _kpiSaleLbFilter = 'custom';
    await kpiSaleLbRefetch();
};

window.kpiSaleLbPickMonth = async function(val) {
    if (!val) return;
    _kpiSaleLbMonth = val;
    _kpiSaleLbFilter = 'pick_month';
    await kpiSaleLbRefetch();
};

async function kpiSaleLbRefetch() {
    var container = document.getElementById('kpiSaleLeaderboard');
    if (!container) return;
    container.innerHTML = '<div class="kpi-lb-section"><div class="kpi-lb-header">🏆 Bảng Xếp Hạng Nhân Viên (PHÒNG SALE)</div><div style="padding:40px;text-align:center;color:#9ca3af">⏳ Đang tải...</div></div>';
    try {
        var url = kpiSaleLbBuildUrl();
        var advData = await apiCall(url);
        renderKpiSaleLeaderboard(advData);
    } catch(e) {
        console.error('Sale LB refetch error:', e);
        container.innerHTML = '<div class="kpi-lb-section"><div style="padding:20px;color:#ef4444;text-align:center">⚠️ Lỗi: ' + (e.message||'') + '</div></div>';
    }
}

window.kpiSaleLbSort = function(metric) {
    _kpiSaleLbSort = metric;
    var container = document.getElementById('kpiSaleLeaderboard');
    if (container && window._kpiSaleAdvData) renderKpiSaleLeaderboard(window._kpiSaleAdvData);
};

function renderKpiSaleLeaderboard(data) {
    var el = document.getElementById('kpiSaleLeaderboard');
    if (!el) return;

    window._kpiSaleAdvData = data;
    var lbObj = data && data.leaderboard;
    var allEmp = data && data.allEmployees;
    var convMap = (data && data.conversionMap) || {};

    var lb;
    if (lbObj) {
        if (_kpiSaleLbSort === 'orders') lb = lbObj.by_orders || allEmp || [];
        else if (_kpiSaleLbSort === 'affiliate') lb = lbObj.by_affiliate || allEmp || [];
        else if (_kpiSaleLbSort === 'retention') lb = lbObj.by_retention || allEmp || [];
        else lb = lbObj.by_revenue || allEmp || [];
    } else {
        lb = Array.isArray(allEmp) ? [].concat(allEmp) : (Array.isArray(data) ? data : []);
    }

    var medals = ['🥇','🥈','🥉'];

    var tabs = [
        { key: 'revenue', icon: '💰', label: 'Doanh Số' },
        { key: 'orders', icon: '📦', label: 'Đơn Hàng' },
        { key: 'affiliate', icon: '🤝', label: 'TK Affiliate' },
        { key: 'retention', icon: '🔁', label: 'KH Cũ Quay Lại' }
    ];

    var filterRow1 = [
        { key: 'today', icon: '📅', label: 'Hôm nay' },
        { key: 'yesterday', icon: '📅', label: 'Hôm qua' },
        { key: '7days', icon: '📅', label: '7 ngày' },
        { key: 'this_month', icon: '📅', label: 'Tháng này' },
        { key: 'last_month', icon: '📅', label: 'Tháng trước' },
        { key: 'all', icon: '📅', label: 'Tất cả' },
        { key: 'custom', icon: '📅', label: 'Tùy chọn' }
    ];

    var filterRow2 = [
        { key: 'stage1', icon: '🔥', label: 'GĐ 1 (1-10)' },
        { key: 'stage2', icon: '⚡', label: 'GĐ 2 (11-20)' },
        { key: 'stage3', icon: '🎯', label: 'GĐ 3 (21-31)' }
    ];

    var h = '<div class="kpi-lb-section">';
    h += '<div class="kpi-lb-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="_kpiSaleToggleLb()">';
    h += '<span>🏆 Bảng Xếp Hạng Nhân Viên (PHÒNG SALE)</span>';
    h += '<span id="kpiSaleLbIcon" style="font-size:18px;transition:transform .3s;transform:rotate(' + (_kpiSaleLbCollapsed ? '-90deg' : '0') + ')">' + (_kpiSaleLbCollapsed ? '▶' : '▼') + '</span>';
    h += '</div>';

    var periodInfo = data && data.period;
    if (periodInfo && periodInfo.start) {
        h += '<div style="padding:4px 24px;font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff">📌 Dữ liệu: ' + periodInfo.start + ' → ' + periodInfo.end + ' (' + (periodInfo.label || '') + ')</div>';
    }

    h += '<div id="kpiSaleLbBody" style="' + (_kpiSaleLbCollapsed ? 'display:none' : '') + '">';

    // FILTER BAR ROW 1
    h += '<div class="kpi-lb-filter-bar" style="display:flex;align-items:center;gap:6px;padding:10px 24px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-wrap:wrap">';
    h += '<span style="font-size:12px;font-weight:700;color:#475569;margin-right:4px">📊</span>';
    for (var fi = 0; fi < filterRow1.length; fi++) {
        var fp = filterRow1[fi];
        var isActive = _kpiSaleLbFilter === fp.key;
        var btnStyle = isActive
            ? 'background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;box-shadow:0 2px 8px rgba(67,56,202,.3)'
            : 'background:#fff;color:#374151;border:1px solid #d1d5db';
        h += '<button onclick="kpiSaleLbSetFilter(\'' + fp.key + '\')" style="' + btnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += fp.icon + ' ' + fp.label + '</button>';
    }
    h += '</div>';

    // FILTER BAR ROW 2: Stages + Month Picker
    h += '<div style="display:flex;align-items:center;gap:6px;padding:8px 24px;background:#fefce8;border-bottom:1px solid #fde68a;flex-wrap:wrap">';
    for (var si = 0; si < filterRow2.length; si++) {
        var sp = filterRow2[si];
        var isStageActive = _kpiSaleLbFilter === sp.key;
        var sBtnStyle = isStageActive
            ? 'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;box-shadow:0 2px 8px rgba(217,119,6,.3)'
            : 'background:#fff;color:#78350f;border:1px solid #fcd34d';
        h += '<button onclick="kpiSaleLbSetFilter(\'' + sp.key + '\')" style="' + sBtnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += sp.icon + ' ' + sp.label + '</button>';
    }
    h += '<span style="width:1px;height:24px;background:#d1d5db;margin:0 6px"></span>';
    var isLbMonthActive = _kpiSaleLbFilter === 'pick_month';
    h += '<span style="font-size:12px;font-weight:700;color:#78350f">📆 CHỌN THÁNG</span>';
    h += '<input type="month" id="kpiSaleLbMonthPicker" value="' + (_kpiSaleLbMonth || '') + '" onchange="kpiSaleLbPickMonth(this.value)" style="padding:5px 10px;border:1px solid ' + (isLbMonthActive ? '#4338ca' : '#d1d5db') + ';border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:' + (isLbMonthActive ? '#eef2ff' : '#fff') + '">';
    h += '</div>';

    // Custom date pickers
    if (_kpiSaleLbFilter === 'custom') {
        h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 24px;background:#eef2ff;border-bottom:1px solid #c7d2fe;flex-wrap:wrap">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Từ:</span>';
        h += '<input type="date" id="kpiSaleLbStartDate" value="' + (_kpiSaleLbCustomStart || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Đến:</span>';
        h += '<input type="date" id="kpiSaleLbEndDate" value="' + (_kpiSaleLbCustomEnd || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<button onclick="kpiSaleLbApplyCustom()" style="padding:6px 16px;border-radius:8px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">🔍 Áp dụng</button>';
        h += '</div>';
    }

    // SORT TABS
    h += '<div class="kpi-lb-tabs">';
    for (var ti = 0; ti < tabs.length; ti++) {
        var t = tabs[ti];
        h += '<button class="kpi-lb-tab ' + (_kpiSaleLbSort === t.key ? 'active' : '') + '" onclick="kpiSaleLbSort(\'' + t.key + '\')">' + t.icon + ' ' + t.label + '</button>';
    }
    h += '</div>';

    // TABLE HEADERS
    h += '<div>';
    h += '<div class="kpi-lb-row" style="background:#f8fafc;font-weight:700;font-size:12px;color:#475569">';
    h += '<div>#</div><div>Nhân viên</div><div style="text-align:right">Đơn hàng</div><div style="text-align:right">Doanh số</div><div style="text-align:right">📊 CĐ</div><div style="text-align:right">TK Aff</div><div style="text-align:right;color:#d97706">KH cũ ĐP %</div><div style="text-align:right;color:#7c3aed">KH cũ PET/TEM %</div>';
    h += '</div>';

    if (!lb || lb.length === 0) {
        h += '<div style="padding:30px;text-align:center;color:#94a3b8">📭 Chưa có xếp hạng nhân viên trong kỳ này</div>';
    } else {
        for (var i = 0; i < lb.length; i++) {
            var emp = lb[i];
            var rank = i < 3 ? medals[i] : (i + 1);
            var conv = convMap[emp.user_id] || {};
            var cRate = conv.rate != null ? conv.rate + '%' : '—';
            var cColor = conv.rate >= 70 ? '#10b981' : conv.rate >= 40 ? '#f59e0b' : '#ef4444';
            var prev = emp.prev || {};
            h += '<div class="kpi-lb-row" style="cursor:pointer" onclick="kpiSaleShowOrders(' + (emp.user_id || emp.id) + ',\'' + (emp.name || emp.full_name || '').replace(/'/g, "\\'") + '\')">';
            h += '<div class="kpi-lb-rank">' + rank + '</div>';
            var empIcon = (['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(emp.role) || emp.username === 'truongphongsale' || emp.user_id === 77) ? '⭐' : '👤';
            h += '<div><div class="kpi-lb-name">' + empIcon + ' ' + (emp.name || emp.full_name || '?') + '</div><div class="kpi-lb-team">' + (emp.team || 'PHÒNG SALE') + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#4338ca">' + (emp.total_orders || 0) + ' đơn<div>' + kpiSaleTrend(emp.total_orders || 0, prev.total_orders || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#059669">' + kpiSaleCompactVND(emp.revenue || 0) + '<div>' + kpiSaleTrend(emp.revenue || 0, prev.revenue || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:' + cColor + ';font-size:12px">' + cRate + '<div>' + kpiSaleTrend(conv.rate || 0, prev.conversion_rate || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#7c3aed">' + (emp.affiliate_new || 0) + '<div>' + kpiSaleTrend(emp.affiliate_new || 0, prev.affiliate_new || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#d97706">' + (emp.rate_dp || 0) + '%<div>' + kpiSaleTrend(emp.rate_dp || 0, prev.rate_dp || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#7c3aed">' + (emp.rate_pettem || 0) + '%<div>' + kpiSaleTrend(emp.rate_pettem || 0, prev.rate_pettem || 0) + '</div></div>';
            h += '</div>';
        }
    }
    h += '</div>';
    h += '</div>'; // close kpiSaleLbBody
    h += '</div>'; // close kpi-lb-section
    el.innerHTML = h;
}

// SECTION 4: 📊 So Sánh Team (PHÒNG SALE)
var _kpiSaleTcSort = 'revenue';
var _kpiSaleTcAdvData = null;
var _kpiSaleTcMainData = null;
var _kpiSaleTcFilter = 'this_month';
var _kpiSaleTcCustomStart = '';
var _kpiSaleTcCustomEnd = '';
var _kpiSaleTcMonth = '';
var _kpiSaleTcCollapsed = false;

window._kpiSaleToggleTc = function() {
    _kpiSaleTcCollapsed = !_kpiSaleTcCollapsed;
    var body = document.getElementById('kpiSaleTcBody');
    var icon = document.getElementById('kpiSaleTcIcon');
    if (body) body.style.display = _kpiSaleTcCollapsed ? 'none' : 'block';
    if (icon) {
        icon.style.transform = 'rotate(' + (_kpiSaleTcCollapsed ? '-90deg' : '0') + ')';
        icon.textContent = _kpiSaleTcCollapsed ? '▶' : '▼';
    }
};

function kpiSaleTcBuildUrl() {
    var base = '/api/reports/customer-retention/advanced?dept_id=4';
    var now = typeof vnNow === 'function' ? vnNow() : new Date();
    var fmtD = function(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    if (_kpiSaleTcFilter === 'today') {
        return base + '&period=day&date=' + fmtD(now);
    } else if (_kpiSaleTcFilter === 'yesterday') {
        var yd = new Date(now.getTime()); yd.setDate(yd.getDate() - 1);
        return base + '&period=day&date=' + fmtD(yd);
    } else if (_kpiSaleTcFilter === '7days') {
        var s7 = new Date(now.getTime()); s7.setDate(s7.getDate() - 6);
        return base + '&period=custom&startDate=' + fmtD(s7) + '&endDate=' + fmtD(now);
    } else if (_kpiSaleTcFilter === 'this_month') {
        var tm = _kpiSale.month || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
        return base + '&period=month&date=' + tm;
    } else if (_kpiSaleTcFilter === 'last_month') {
        var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var lmStr = lm.getFullYear() + '-' + String(lm.getMonth()+1).padStart(2,'0');
        return base + '&period=month&date=' + lmStr;
    } else if (_kpiSaleTcFilter === 'all') {
        return base + '&period=year&date=' + now.getFullYear();
    } else if (_kpiSaleTcFilter === 'stage1' || _kpiSaleTcFilter === 'stage2' || _kpiSaleTcFilter === 'stage3') {
        var refMonth = _kpiSaleTcMonth || _kpiSale.month || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
        var parts = refMonth.split('-').map(Number);
        var y = parts[0], m = parts[1];
        var dim = new Date(y, m, 0).getDate();
        var sd, ed;
        if (_kpiSaleTcFilter === 'stage1') { sd = '01'; ed = '10'; }
        else if (_kpiSaleTcFilter === 'stage2') { sd = '11'; ed = '20'; }
        else { sd = '21'; ed = String(dim); }
        return base + '&period=custom&startDate=' + y + '-' + String(m).padStart(2,'0') + '-' + sd + '&endDate=' + y + '-' + String(m).padStart(2,'0') + '-' + ed;
    } else if (_kpiSaleTcFilter === 'pick_month' && _kpiSaleTcMonth) {
        return base + '&period=month&date=' + _kpiSaleTcMonth;
    } else if (_kpiSaleTcFilter === 'custom' && _kpiSaleTcCustomStart && _kpiSaleTcCustomEnd) {
        return base + '&period=custom&startDate=' + _kpiSaleTcCustomStart + '&endDate=' + _kpiSaleTcCustomEnd;
    }
    var fallback = _kpiSale.month || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
    return base + '&period=month&date=' + fallback;
}

window.kpiSaleTcSetFilter = async function(filter) {
    _kpiSaleTcFilter = filter;
    if (filter === 'custom') {
        var container = document.getElementById('kpiSaleTeamCompare');
        if (container && window._kpiSaleTcAdvData) renderKpiSaleTeamCompare(window._kpiSaleTcMainData, window._kpiSaleTcAdvData);
        return;
    }
    await kpiSaleTcRefetch();
};

window.kpiSaleTcApplyCustom = async function() {
    var sd = document.getElementById('kpiSaleTcStartDate');
    var ed = document.getElementById('kpiSaleTcEndDate');
    if (!sd || !ed || !sd.value || !ed.value) { alert('Vui lòng chọn ngày bắt đầu và kết thúc'); return; }
    _kpiSaleTcCustomStart = sd.value;
    _kpiSaleTcCustomEnd = ed.value;
    _kpiSaleTcFilter = 'custom';
    await kpiSaleTcRefetch();
};

window.kpiSaleTcPickMonth = async function(val) {
    if (!val) return;
    _kpiSaleTcMonth = val;
    _kpiSaleTcFilter = 'pick_month';
    await kpiSaleTcRefetch();
};

async function kpiSaleTcRefetch() {
    var container = document.getElementById('kpiSaleTeamCompare');
    if (!container) return;
    container.innerHTML = '<div class="kpi-lb-section"><div class="kpi-lb-header">📊 So Sánh Team (PHÒNG SALE)</div><div style="padding:40px;text-align:center;color:#9ca3af">⏳ Đang tải...</div></div>';
    try {
        var url = kpiSaleTcBuildUrl();
        var retUrl = '/api/reports/customer-retention?period=month&date=' + _kpiSale.month + '&dept_id=4';
        var results = await Promise.all([apiCall(url), apiCall(retUrl)]);
        renderKpiSaleTeamCompare(results[1], results[0]);
    } catch(e) {
        console.error('Sale TC refetch error:', e);
        container.innerHTML = '<div class="kpi-lb-section"><div style="padding:20px;color:#ef4444;text-align:center">⚠️ Lỗi: ' + (e.message||'') + '</div></div>';
    }
}

window.kpiSaleTcSort = function(metric) {
    _kpiSaleTcSort = metric;
    var container = document.getElementById('kpiSaleTeamCompare');
    if (container && window._kpiSaleTcAdvData) renderKpiSaleTeamCompare(window._kpiSaleTcMainData, window._kpiSaleTcAdvData);
};

function kpiSaleTrend(cur, prev) {
    if (prev == null || prev === 0) return cur > 0 ? '<span style="color:#fff;font-size:10px;font-weight:700;background:#10b981;padding:1px 6px;border-radius:4px">Mới</span>' : '';
    var diff = cur - prev;
    if (diff === 0) return '<span style="color:#94a3b8;font-size:10px">→0%</span>';
    var pct = Math.round(100 * diff / prev);
    if (diff > 0) return '<span style="color:#10b981;font-size:10px;font-weight:700">▲+' + pct + '%</span>';
    return '<span style="color:#ef4444;font-size:10px;font-weight:700">▼' + pct + '%</span>';
}

function kpiSaleCompactVND(n) {
    if (!n) return '0';
    if (typeof compactVND === 'function') return compactVND(n);
    if (typeof formatVND === 'function') return formatVND(n);
    return Number(n).toLocaleString('vi-VN') + 'đ';
}

function renderKpiSaleTeamCompare(mainData, advData) {
    const container = document.getElementById('kpiSaleTeamCompare');
    if (!container) return;

    window._kpiSaleTcAdvData = advData;
    window._kpiSaleTcMainData = mainData;

    let teams = (advData && advData.teamComparison) ? advData.teamComparison : [];

    // Filter to Sale teams if possible, or fallback to all teams if empty
    if (_kpiSale.data && _kpiSale.data.teams && _kpiSale.data.teams.length > 0) {
        const saleDeptIds = _kpiSale.data.teams.map(t => t.dept_id || t.id).filter(Boolean);
        const saleDeptNames = _kpiSale.data.teams.map(t => (t.dept_name || t.name || '').toLowerCase()).filter(Boolean);

        const filtered = teams.filter(t => {
            if (saleDeptIds.includes(t.id)) return true;
            if (saleDeptNames.some(n => (t.name || '').toLowerCase().includes(n) || n.includes((t.name || '').toLowerCase()))) return true;
            if (t.parent_id === 4 || t.id === 4 || (t.name && t.name.toLowerCase().includes('sale'))) return true;
            return false;
        });
        if (filtered.length > 0) teams = filtered;
    }

    if (!teams || teams.length === 0) {
        container.innerHTML = '<div class="kpi-lb-section"><div class="kpi-lb-header">📊 So Sánh Team (PHÒNG SALE)</div><div style="padding:20px;text-align:center;color:#94a3b8">📭 Chưa có dữ liệu so sánh team</div></div>';
        return;
    }

    // Sort teams by selected metric
    var sorted = [].concat(teams);
    if (_kpiSaleTcSort === 'revenue') sorted.sort((a,b) => (b.revenue||0) - (a.revenue||0));
    else if (_kpiSaleTcSort === 'orders') sorted.sort((a,b) => (b.total_orders||0) - (a.total_orders||0));
    else if (_kpiSaleTcSort === 'affiliate') sorted.sort((a,b) => (b.affiliate_new||0) - (a.affiliate_new||0));
    else if (_kpiSaleTcSort === 'retention') sorted.sort((a,b) => (b.rate||0) - (a.rate||0));

    var tabs = [
        {key:'revenue',icon:'💰',label:'Doanh Số'},
        {key:'orders',icon:'📦',label:'Đơn Hàng'},
        {key:'affiliate',icon:'🤝',label:'TK Affiliate'},
        {key:'retention',icon:'🔁',label:'KH Cũ Quay Lại'}
    ];

    var tcFilterRow1 = [
        { key: 'today', icon: '📅', label: 'Hôm nay' },
        { key: 'yesterday', icon: '📅', label: 'Hôm qua' },
        { key: '7days', icon: '📅', label: '7 ngày' },
        { key: 'this_month', icon: '📅', label: 'Tháng này' },
        { key: 'last_month', icon: '📅', label: 'Tháng trước' },
        { key: 'all', icon: '📅', label: 'Tất cả' },
        { key: 'custom', icon: '📅', label: 'Tùy chọn' }
    ];

    var tcFilterRow2 = [
        { key: 'stage1', icon: '🔥', label: 'GĐ 1 (1-10)' },
        { key: 'stage2', icon: '⚡', label: 'GĐ 2 (11-20)' },
        { key: 'stage3', icon: '🎯', label: 'GĐ 3 (21-31)' }
    ];

    var h = '<div class="kpi-lb-section">';
    h += '<div class="kpi-lb-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="_kpiSaleToggleTc()">';
    h += '<span>📊 So Sánh Team (PHÒNG SALE)</span>';
    h += '<span id="kpiSaleTcIcon" style="font-size:18px;transition:transform .3s;transform:rotate(' + (_kpiSaleTcCollapsed ? '-90deg' : '0') + ')">' + (_kpiSaleTcCollapsed ? '▶' : '▼') + '</span>';
    h += '</div>';

    var tcPeriodInfo = advData && advData.period;
    if (tcPeriodInfo && tcPeriodInfo.start) {
        h += '<div style="padding:4px 24px;font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff">📌 Dữ liệu: ' + tcPeriodInfo.start + ' → ' + tcPeriodInfo.end + ' (' + (tcPeriodInfo.label || '') + ')</div>';
    }

    h += '<div id="kpiSaleTcBody" style="' + (_kpiSaleTcCollapsed ? 'display:none' : '') + '">';

    // FILTER BAR ROW 1
    h += '<div class="kpi-lb-filter-bar" style="display:flex;align-items:center;gap:6px;padding:10px 24px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-wrap:wrap">';
    h += '<span style="font-size:12px;font-weight:700;color:#475569;margin-right:4px">📊</span>';
    for (var fi = 0; fi < tcFilterRow1.length; fi++) {
        var fp = tcFilterRow1[fi];
        var isActive = _kpiSaleTcFilter === fp.key;
        var btnStyle = isActive
            ? 'background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;box-shadow:0 2px 8px rgba(67,56,202,.3)'
            : 'background:#fff;color:#374151;border:1px solid #d1d5db';
        h += '<button onclick="kpiSaleTcSetFilter(\'' + fp.key + '\')" style="' + btnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += fp.icon + ' ' + fp.label + '</button>';
    }
    h += '</div>';

    // FILTER BAR ROW 2: Stages + Month Picker
    h += '<div style="display:flex;align-items:center;gap:6px;padding:8px 24px;background:#fefce8;border-bottom:1px solid #fde68a;flex-wrap:wrap">';
    for (var si = 0; si < tcFilterRow2.length; si++) {
        var sp = tcFilterRow2[si];
        var isStageActive = _kpiSaleTcFilter === sp.key;
        var sBtnStyle = isStageActive
            ? 'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;box-shadow:0 2px 8px rgba(217,119,6,.3)'
            : 'background:#fff;color:#78350f;border:1px solid #fcd34d';
        h += '<button onclick="kpiSaleTcSetFilter(\'' + sp.key + '\')" style="' + sBtnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += sp.icon + ' ' + sp.label + '</button>';
    }
    h += '<span style="width:1px;height:24px;background:#d1d5db;margin:0 6px"></span>';
    var isTcMonthActive = _kpiSaleTcFilter === 'pick_month';
    h += '<span style="font-size:12px;font-weight:700;color:#78350f">📆 CHỌN THÁNG</span>';
    h += '<input type="month" id="kpiSaleTcMonthPicker" value="' + (_kpiSaleTcMonth || '') + '" onchange="kpiSaleTcPickMonth(this.value)" style="padding:5px 10px;border:1px solid ' + (isTcMonthActive ? '#4338ca' : '#d1d5db') + ';border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:' + (isTcMonthActive ? '#eef2ff' : '#fff') + '">';
    h += '</div>';

    // Custom date pickers
    if (_kpiSaleTcFilter === 'custom') {
        h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 24px;background:#eef2ff;border-bottom:1px solid #c7d2fe;flex-wrap:wrap">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Từ:</span>';
        h += '<input type="date" id="kpiSaleTcStartDate" value="' + (_kpiSaleTcCustomStart || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Đến:</span>';
        h += '<input type="date" id="kpiSaleTcEndDate" value="' + (_kpiSaleTcCustomEnd || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<button onclick="kpiSaleTcApplyCustom()" style="padding:6px 16px;border-radius:8px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">🔍 Áp dụng</button>';
        h += '</div>';
    }

    // SORT TABS
    h += '<div class="kpi-lb-tabs">';
    for (var ti = 0; ti < tabs.length; ti++) {
        var t = tabs[ti];
        h += '<button class="kpi-lb-tab ' + (_kpiSaleTcSort === t.key ? 'active' : '') + '" onclick="kpiSaleTcSort(\'' + t.key + '\')">' + t.icon + ' ' + t.label + '</button>';
    }
    h += '</div>';
    h += '<div class="kpi-tc-grid">';

    for (var i = 0; i < sorted.length; i++) {
        var team = sorted[i];
        var prev = team.prev || {};
        var hb = team.total_orders > 0;
        h += '<div class="kpi-tc-card" style="cursor:pointer' + (hb ? ';border-color:#f59e0b;border-width:2px' : '') + '" onclick="kpiSaleShowTeamOrders(' + (team.team_id || team.id || team.dept_id) + ',\'' + (team.name || team.dept_name || '').replace(/'/g, "\\'") + '\')">';
        h += '<div class="kpi-tc-name">🏠 ' + team.name + ' <span style="font-size:12px;font-weight:500;color:#6b7280">(' + (team.employee_count || 0) + ' NV)</span></div>';
        h += '<div class="kpi-tc-stats">';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#3b82f6">' + kpiSaleCompactVND(team.revenue || 0) + '</div><div class="kpi-tc-stat-label">💰 Doanh Số</div><div style="margin-top:4px">' + kpiSaleTrend(team.revenue || 0, prev.revenue || 0) + '</div></div>';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#4338ca">' + (team.total_orders || 0) + '</div><div class="kpi-tc-stat-label">📦 Tổng Đơn</div><div style="margin-top:4px">' + kpiSaleTrend(team.total_orders || 0, prev.total_orders || 0) + '</div></div>';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#7c3aed">' + (team.rate || 0) + '%</div><div class="kpi-tc-stat-label">🔁 TỈ LỆ KH CỦ</div><div style="margin-top:4px">' + kpiSaleTrend(team.rate || 0, prev.rate || 0) + '</div></div>';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#059669">' + (team.affiliate_new || 0) + '</div><div class="kpi-tc-stat-label">🤝 TẠO TK AFF</div><div style="margin-top:4px">' + kpiSaleTrend(team.affiliate_new || 0, prev.affiliate_new || 0) + '</div></div>';
        h += '</div></div>';
    }
    h += '</div>';
    h += '</div>'; // close kpiSaleTcBody
    h += '</div>'; // close kpi-lb-section
    container.innerHTML = h;
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
var _kpiSaleModalOrders = [];
var _kpiSaleModalFilter = 'all';

function _kpiSaleCleanPhone(phone) {
    if (!phone || phone.startsWith('pancake_')) return '—';
    return phone;
}

window.kpiSaleFilterModalOrders = function(filterType) {
    _kpiSaleModalFilter = filterType;
    const tbody = document.getElementById('kpiSaleOrdersModalBody');
    if (!tbody || !_kpiSaleModalOrders) return;

let _kpiSaleModalFilterLv = 'all';
let _kpiSaleModalFilterCust = 'all';

window.kpiSaleFilterModalLv = function(lvType) {
    _kpiSaleModalFilterLv = lvType;
    kpiSaleApplyModalFilters();
};

window.kpiSaleFilterModalCust = function(custType) {
    _kpiSaleModalFilterCust = custType;
    kpiSaleApplyModalFilters();
};

function kpiSaleApplyModalFilters() {
    const tbody = document.getElementById('kpiSaleOrdersModalBody');
    if (!tbody || !_kpiSaleModalOrders) return;

    document.querySelectorAll('.kpi-sale-lv-btn').forEach(btn => {
        if (btn.getAttribute('data-lv') === _kpiSaleModalFilterLv) {
            btn.style.outline = '2px solid #2563eb';
            btn.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
            btn.style.fontWeight = '800';
            btn.style.opacity = '1';
        } else {
            btn.style.outline = 'none';
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
            btn.style.opacity = '0.75';
        }
    });

    // Compute orders for selected Lĩnh Vực
    let lvOrders = _kpiSaleModalOrders;
    if (_kpiSaleModalFilterLv === 'dp') {
        lvOrders = _kpiSaleModalOrders.filter(o => !o.is_pet_tem);
    } else if (_kpiSaleModalFilterLv === 'pettem') {
        lvOrders = _kpiSaleModalOrders.filter(o => o.is_pet_tem);
    }

    // Dynamically update Row 2 button counts based on current Lĩnh Vực!
    const countMoi = lvOrders.filter(o => o.customer_type === 'moi').length;
    const countCu = lvOrders.filter(o => o.customer_type === 'cu').length;

    const btnMoi = document.querySelector('.kpi-sale-cust-btn[data-cust="moi"]');
    const btnCu = document.querySelector('.kpi-sale-cust-btn[data-cust="cu"]');
    if (btnMoi) btnMoi.innerHTML = `🟢 Khách Mới (<strong style="color:#16a34a">${countMoi}</strong>)`;
    if (btnCu) btnCu.innerHTML = `🟧 Khách Cũ (<strong style="color:#b45309">${countCu}</strong>)`;

    document.querySelectorAll('.kpi-sale-cust-btn').forEach(btn => {
        if (btn.getAttribute('data-cust') === _kpiSaleModalFilterCust) {
            btn.style.outline = '2px solid #2563eb';
            btn.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
            btn.style.fontWeight = '800';
            btn.style.opacity = '1';
        } else {
            btn.style.outline = 'none';
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
            btn.style.opacity = '0.75';
        }
    });

    let filtered = lvOrders;
    if (_kpiSaleModalFilterCust === 'moi') {
        filtered = filtered.filter(o => o.customer_type === 'moi');
    } else if (_kpiSaleModalFilterCust === 'cu') {
        filtered = filtered.filter(o => o.customer_type === 'cu');
    }

    const currentRevenue = filtered.reduce((acc, o) => acc + (Number(o.revenue) || 0), 0);
    const revEl = document.getElementById('kpiSaleModalTotalRevenue');
    if (revEl) revEl.textContent = formatVND(currentRevenue);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;font-weight:600">📭 Không có đơn hàng nào khớp bộ lọc đã chọn</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((o, idx) => {
        let badgeHtml = o.customer_type === 'moi'
            ? '<span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:800;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0">🟢 Khách Mới</span>'
            : '<span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:800;background:#fef3c7;color:#b45309;border:1px solid #fde68a">🟧 Khách Cũ</span>';

        return `
        <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td style="font-weight:700;color:#2563eb">${o.order_code || '—'}</td>
            <td>${o.customer_name || '—'}</td>
            <td>${_kpiSaleCleanPhone(o.customer_phone)}</td>
            <td style="font-weight:800;color:#1e1b4b">${o.sale_name || '—'}</td>
            <td style="text-align:center">${badgeHtml}</td>
            <td style="font-weight:600;color:#7c3aed">${o.source_name || '—'}</td>
            <td style="font-weight:800;color:#059669">${formatVND(o.revenue || 0)}</td>
            <td style="text-align:center">${o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—'}</td>
        </tr>
    `}).join('');
}

function kpiSaleBuildModalSummaryHtml(s) {
    return `
    <div style="display:flex;flex-direction:column;gap:8px;width:100%">
        <!-- Hàng 1: Chọn Lĩnh Vực -->
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:115px;display:flex;align-items:center;gap:4px">
                🏢 <strong>Lĩnh Vực:</strong>
            </span>
            <button type="button" class="kpi-sale-lv-btn" data-lv="all" onclick="kpiSaleFilterModalLv('all')" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;color:#1e293b">Tất cả lĩnh vực (<strong style="color:#2563eb">${s.total || 0}</strong>)</button>
            <button type="button" class="kpi-sale-lv-btn" data-lv="dp" onclick="kpiSaleFilterModalLv('dp')" style="padding:4px 12px;border-radius:8px;border:1px solid #fed7aa;background:#fff7ed;cursor:pointer;font-weight:700;color:#c2410c">👔 LV Đồng Phục (<strong style="color:#c2410c">${s.total_lv_dp || 0}</strong>)</button>
            <button type="button" class="kpi-sale-lv-btn" data-lv="pettem" onclick="kpiSaleFilterModalLv('pettem')" style="padding:4px 12px;border-radius:8px;border:1px solid #fbcfe8;background:#fdf2f8;cursor:pointer;font-weight:700;color:#be185d">🏷️ LV PET/TEM (<strong style="color:#be185d">${s.total_lv_pettem || 0}</strong>)</button>
        </div>

        <!-- Hàng 2: Chọn Loại Khách Hàng (Tự động nhảy số theo Lĩnh Vực) -->
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:115px;display:flex;align-items:center;gap:4px">
                👥 <strong>Loại Khách:</strong>
            </span>
            <button type="button" class="kpi-sale-cust-btn" data-cust="all" onclick="kpiSaleFilterModalCust('all')" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;color:#1e293b">Tất cả khách</button>
            <button type="button" class="kpi-sale-cust-btn" data-cust="moi" onclick="kpiSaleFilterModalCust('moi')" style="padding:4px 12px;border-radius:8px;border:1px solid #bbf7d0;background:#f0fdf4;cursor:pointer;font-weight:700;color:#16a34a">🟢 Khách Mới (<strong style="color:#16a34a">${s.new_orders || 0}</strong>)</button>
            <button type="button" class="kpi-sale-cust-btn" data-cust="cu" onclick="kpiSaleFilterModalCust('cu')" style="padding:4px 12px;border-radius:8px;border:1px solid #fde68a;background:#fffbeb;cursor:pointer;font-weight:700;color:#b45309">🟧 Khách Cũ (<strong style="color:#b45309">${s.old_orders || 0}</strong>)</button>

            <span style="margin-left:auto;font-size:13px;font-weight:800">Tổng doanh số: <strong id="kpiSaleModalTotalRevenue" style="color:#dc2626">${formatVND(s.total_revenue || 0)}</strong></span>
        </div>
    </div>
    `;
}

async function kpiSaleShowOrders(userId, userName) {
    const modal = _kpiSaleEnsureOrdersModal();
    const title = document.getElementById('kpiSaleOrdersModalTitle');
    const summary = document.getElementById('kpiSaleOrdersModalSummary');
    const tbody = document.getElementById('kpiSaleOrdersModalBody');

    if (title) title.textContent = `NV ${userName} — Tháng ${_kpiSale.month}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">⏳ Đang lấy chi tiết đơn hàng...</td></tr>';
    modal.style.display = 'flex';

    try {
        const res = await apiCall(`/api/kpi-sale/employee-orders?user_id=${userId}&month=${_kpiSale.month}`);
        _kpiSaleModalOrders = res.orders || [];
        _kpiSaleModalFilterLv = 'all';
        _kpiSaleModalFilterCust = 'all';

        if (summary) {
            summary.innerHTML = kpiSaleBuildModalSummaryHtml(res.summary || {});
        }

        kpiSaleApplyModalFilters();
    } catch(err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#ef4444">❌ Lỗi: ${err.message}</td></tr>`;
    }
}

async function kpiSaleShowTeamOrders(deptId, deptName) {
    const modal = _kpiSaleEnsureOrdersModal();
    const title = document.getElementById('kpiSaleOrdersModalTitle');
    const summary = document.getElementById('kpiSaleOrdersModalSummary');
    const tbody = document.getElementById('kpiSaleOrdersModalBody');

    if (title) title.textContent = `Team ${deptName} — Tháng ${_kpiSale.month}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">⏳ Đang lấy chi tiết đơn hàng của Team...</td></tr>';
    modal.style.display = 'flex';

    try {
        const res = await apiCall(`/api/kpi-sale/team-orders?dept_id=${deptId}&month=${_kpiSale.month}`);
        _kpiSaleModalOrders = res.orders || [];
        _kpiSaleModalFilterLv = 'all';
        _kpiSaleModalFilterCust = 'all';

        if (summary) {
            summary.innerHTML = kpiSaleBuildModalSummaryHtml(res.summary || {});
        }

        kpiSaleApplyModalFilters();
    } catch(err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#ef4444">❌ Lỗi: ${err.message}</td></tr>`;
    }
}

        kpiSaleFilterModalOrders('all');
    } catch(err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#ef4444">❌ Lỗi: ${err.message}</td></tr>`;
    }
}

window.kpiSaleShowOrders = kpiSaleShowOrders;
window.kpiSaleShowTeamOrders = kpiSaleShowTeamOrders;

function kpiSaleCloseOrdersModal() {
    const modal = document.getElementById('kpiSaleOrdersModal');
    if (modal) modal.style.display = 'none';
}
