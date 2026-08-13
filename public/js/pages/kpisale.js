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
var _mcSalePerms = []; // meeting permissions from DB

function formatVND(val) {
    if (!val || isNaN(val)) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
}
window.formatVND = formatVND;

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
            .kpi-lb-row{display:grid;grid-template-columns:36px 1fr 65px 85px 65px 75px 50px 75px 85px;padding:14px 16px;border-bottom:1px solid #f8fafc;align-items:center;gap:6px;transition:background .2s}
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
            .kpi-mc-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
            .kpi-mc-modal{background:#fff;border-radius:20px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.25);animation:kpiMcSlideUp .3s ease}
            @keyframes kpiMcSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
            .kpi-mc-modal-head{padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
            .kpi-mc-modal-head h3{font-size:16px;font-weight:800;color:#1e293b;margin:0}
            .kpi-mc-modal-body{padding:20px 24px}
            .kpi-mc-modal-foot{padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px}
            .kpi-mc-input{width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;transition:border .2s;outline:none;font-family:inherit;box-sizing:border-box}
            .kpi-mc-input:focus{border-color:#6366f1}
            .kpi-mc-remove{width:24px;height:24px;border-radius:50%;border:none;background:#fee2e2;color:#dc2626;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
            .kpi-mc-item{padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;background:#fafafa}
            .kpi-mc-item-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
            .kpi-mc-item-stt{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}
            .kpi-mc-team{padding:16px 24px;border-bottom:1px solid #f1f5f9;background:linear-gradient(135deg,#f5f3ff,#ede9fe,#f5f3ff);border-left:4px solid #8b5cf6;margin:8px 12px;border-radius:12px;box-shadow:0 2px 8px rgba(139,92,246,.08)}
            .kpi-mc-team-name{font-size:14px;font-weight:800;color:#4c1d95;margin-bottom:10px;display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(90deg,#ede9fe,#ddd6fe);border-radius:8px}
            .kpi-mc-emp{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:10px;margin:3px 0;transition:all .2s;background:#fff;border-bottom:1px solid #f1f5f9}
            .kpi-mc-emp-odd{background:#f8fafc}
            .kpi-mc-emp:hover{background:#eef2ff;box-shadow:0 2px 8px rgba(99,102,241,.1);transform:translateX(2px)}
            .kpi-mc-emp-name{font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .kpi-mc-emp-role{font-size:11px;color:#7c3aed;margin-left:8px;font-weight:600}
            .kpi-mc-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;text-transform:uppercase}
            .kpi-mc-emp-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}
            .kpi-mc-badge{font-size:13px;padding:5px 14px;border-radius:20px;font-weight:700;white-space:nowrap;min-width:120px;text-align:center}
            .kpi-mc-badge-done{background:#dcfce7;color:#166534}
            .kpi-mc-badge-pending{background:#fef3c7;color:#92400e}
            .kpi-mc-badge-none{background:#f1f5f9;color:#6b7280}
            .kpi-mc-badge-team{font-size:14px;padding:6px 16px;font-weight:800;min-width:130px;background:linear-gradient(135deg,#7c3aed,#a855f7,#c084fc,#a855f7,#7c3aed);background-size:300% 100%;color:#fff;border-radius:22px;box-shadow:0 2px 10px rgba(124,58,237,.35);animation:kpiTeamShimmer 3s ease-in-out infinite;text-shadow:0 1px 2px rgba(0,0,0,.15)}
            @keyframes kpiTeamShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

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

            <!-- Reward Container -->
            <div id="kpiSaleRewardContainer" style="display:none"></div>

            <!-- TREND CHART SECTION -->
            <div id="kpiSaleStaffTrendSection"></div>

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
            <div class="kpi-modal" style="width:1350px;max-width:96vw;padding:20px 24px">
                <div class="kpi-modal-hdr" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px;border-bottom:1.5px solid #cbd5e1;padding-bottom:12px">
                    <div class="kpi-modal-title" style="font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px">
                        🎯 Đặt KPI & Thưởng Phòng Sale — <span id="kpiSaleTargetModalPeriod" style="color:#2563eb"></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px">
                        <input type="text" id="kpiSaleModalSearchInput" placeholder="🔍 Tìm tên / mã NV..." oninput="kpiSaleFilterTargetModalSearch(this.value)" style="padding:6px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;width:200px;font-weight:600;outline:none">
                        <button class="kpi-modal-close" onclick="kpiSaleCloseTargetModal()" style="font-size:18px;background:none;border:none;cursor:pointer;color:#64748b">✕</button>
                    </div>
                </div>
                <div id="kpiSaleTargetFormBody"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;border-top:1.5px solid #cbd5e1;padding-top:12px">
                    <span style="font-size:11.5px;color:#64748b;font-weight:600">💡 Target Mốc 2 (120%) được tự động tính = Mốc 1 x 120%</span>
                    <div style="display:flex;gap:10px">
                        <button type="button" style="padding:8px 18px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;color:#475569;cursor:pointer" onclick="kpiSaleCloseTargetModal()">Hủy</button>
                        <button type="button" class="kpi-save-btn" onclick="kpiSaleSaveTargets()" style="padding:8px 20px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(37,99,235,0.3)">💾 Lưu Tất Cả KPI & Thưởng</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Order Details Modal -->
        <div class="kpi-modal-overlay" id="kpiSaleOrdersModal">
            <div class="kpi-modal" style="width:1300px">
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
            apiCall('/api/meeting-commitments/employees?source=kpisale&dept_id=4'),
            apiCall(`/api/meeting-commitments/monthly?month=${kpiMo}&year=${kpiYear}&source=kpisale`),
            apiCall(`/api/reports/customer-retention/advanced?period=month&date=${_kpiSale.month}&dept_id=4`),
            apiCall(`/api/reports/customer-retention?period=month&date=${_kpiSale.month}&dept_id=4`),
            apiCall('/api/meeting-commitments/permissions')
        ]);

        const res = results[0];
        _kpiSale.data = res;
        renderKpiSaleUI(res);
        renderKpiSaleDailyTable(res);

        // Meeting commitments setup
        _mcSaleTeams = results[1].teams || [];
        _mcSaleSessions = results[2].sessions || [];
        _mcSaleAllCommitments = results[2].allCommitments || [];
        _mcSalePerms = (results[5] && results[5].permissions) ? results[5].permissions : [];
        try { _mcSaleYearlyData = await apiCall('/api/meeting-commitments/yearly-summary?year=' + kpiYear + '&source=kpisale'); } catch(e) {}
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

    // Render Reward Banner if rewards/conditions exist
    const rewardEl = document.getElementById('kpiSaleRewardContainer');
    if (rewardEl) {
        const rewardTeams = [];
        let empsWithRewardCount = 0;
        (teams || []).forEach(t => {
            const list = (t.employees || []).filter(e => e.target_bonus_m1 || e.target_bonus_m120 || e.target_bonus_conditions || e.target > 0);
            const hasTeamBonus = t.target_bonus_m1 || t.target_bonus_m120 || t.target_bonus_conditions;
            if (list.length > 0 || hasTeamBonus) {
                rewardTeams.push({
                    dept_id: t.dept_id,
                    dept_name: t.dept_name,
                    target_1: t.target_1,
                    target_120: t.target_120,
                    actual: t.actual,
                    target_bonus_m1: t.target_bonus_m1,
                    target_bonus_m120: t.target_bonus_m120,
                    target_bonus_conditions: t.target_bonus_conditions,
                    employees: (t.employees || [])
                });
                empsWithRewardCount += (t.employees || []).length;
            }
        });

        if (rewardTeams.length > 0) {
            let filterTabsHtml = `
                <button type="button" class="kpi-reward-tab-btn active" data-team-id="all" onclick="kpiSaleFilterRewardTeam('all', this)" style="padding:3px 12px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid #2563eb;background:#2563eb;color:white;cursor:pointer;transition:all 0.15s ease">
                    Tất Cả (${empsWithRewardCount})
                </button>
            `;

            rewardTeams.forEach(rt => {
                filterTabsHtml += `
                    <button type="button" class="kpi-reward-tab-btn" data-team-id="${rt.dept_id}" onclick="kpiSaleFilterRewardTeam('${rt.dept_id}', this)" style="padding:3px 12px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid #cbd5e1;background:white;color:#334155;cursor:pointer;transition:all 0.15s ease">
                        👥 ${rt.dept_name} (${rt.employees.length})
                    </button>
                `;
            });

            let rewardRows = '';
            let globalStt = 1;

            rewardTeams.forEach(rt => {
                const teamT1 = rt.target_1 || 0;
                const teamT120 = rt.target_120 || Math.round(teamT1 * 1.2);
                const teamAct = rt.actual || 0;

                const isTeamReach1 = teamT1 > 0 && teamAct >= teamT1;
                const isTeamReach120 = teamT120 > 0 && teamAct >= teamT120;

                const teamBonusM1Str = kpiSaleFmtCurrencyStr(rt.target_bonus_m1);
                const teamBonusM120Str = kpiSaleFmtCurrencyStr(rt.target_bonus_m120);

                const teamBonus1Text = rt.target_bonus_m1 
                    ? `<span style="font-weight:800;color:${isTeamReach1 ? '#15803d' : '#1e293b'}">${teamBonusM1Str} ${isTeamReach1 ? '<b style="color:#15803d">✅ (Đã Đạt)</b>' : '<b style="color:#d97706">⌛ (Chưa Đạt)</b>'}</span>` 
                    : '<span style="color:#94a3b8">—</span>';

                const teamBonus120Text = rt.target_bonus_m120 
                    ? `<span style="font-weight:800;color:${isTeamReach120 ? '#15803d' : '#1e293b'}">${teamBonusM120Str} ${isTeamReach120 ? '<b style="color:#15803d">🎉 (Đã Đạt)</b>' : '<b style="color:#d97706">⌛ (Chưa Đạt)</b>'}</span>` 
                    : '<span style="color:#94a3b8">—</span>';

                let teamStatusBadgeHtml = '';
                if (isTeamReach120) {
                    teamStatusBadgeHtml = `<span style="background:#dcfce7;color:#15803d;border:1.5px solid #4ade80;padding:2px 8px;border-radius:9999px;font-weight:800;font-size:10.5px;display:inline-block">🎉 Đạt Mốc 120%</span>`;
                } else if (isTeamReach1) {
                    teamStatusBadgeHtml = `<span style="background:#dcfce7;color:#166534;border:1.5px solid #86efac;padding:2px 8px;border-radius:9999px;font-weight:800;font-size:10.5px;display:inline-block">✅ Đạt Mốc 100%</span>`;
                } else {
                    teamStatusBadgeHtml = `<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:2px 8px;border-radius:9999px;font-weight:800;font-size:10.5px;display:inline-block">❌ Chưa Đạt</span>`;
                }

                // Team Group Sub-Header Row
                rewardRows += `
                    <tr class="kpi-reward-team-group" data-team-id="${rt.dept_id}" style="background:linear-gradient(90deg,#dbeafe,#eff6ff);border-top:3px solid #2563eb;border-bottom:1.5px solid #bfdbfe">
                        <td style="padding:8px 8px;text-align:center;font-weight:900;color:#1e3a8a;font-size:13px">👥</td>
                        <td style="padding:8px 10px;font-weight:900;color:#1e3a8a;font-size:12.5px">
                            <div>TEAM: <span style="color:#1e3a8a;font-size:13px;font-weight:900">${escapeHtml(rt.dept_name)}</span></div>
                            <div style="font-size:10px;color:#1d4ed8;font-weight:700">(${rt.employees.length} Nhân Sự — Cả Tập Thể)</div>
                        </td>
                        <td style="padding:8px 8px;text-align:right;font-weight:800;color:#b45309;background:#fef3c7;font-size:12px">
                            ${formatVND(teamAct)}
                        </td>
                        <td style="padding:8px 8px;text-align:right;font-weight:800;color:#1d4ed8;background:${isTeamReach1 ? '#e6f4ea' : '#eff6ff'};font-size:12px">
                            ${teamT1 > 0 ? (Number(teamT1).toLocaleString('vi-VN') + 'đ') : '—'}
                        </td>
                        <td style="padding:8px 8px;font-size:11.5px;background:#f0fdf4">
                            ${teamBonus1Text}
                        </td>
                        <td style="padding:8px 8px;text-align:right;font-weight:800;color:#6b21a8;background:${isTeamReach120 ? '#dcfce7' : '#f3e8ff'};font-size:12px">
                            ${(teamT1 > 0 && teamT120 > 0) ? (Number(teamT120).toLocaleString('vi-VN') + 'đ') : '—'}
                        </td>
                        <td style="padding:8px 8px;font-size:11.5px;background:#fff1f2">
                            ${teamBonus120Text}
                        </td>
                        <td style="padding:7px 10px;font-weight:600;color:#334155;font-size:11.5px">
                            ${escapeHtml(rt.target_bonus_conditions || '—')}
                        </td>
                        <td style="padding:8px 8px;text-align:center">
                            ${teamStatusBadgeHtml}
                        </td>
                    </tr>
                `;

                rt.employees.forEach(e => {
                    const roleLabel = ['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(e.role) || e.username === 'truongphongsale' ? 'Trưởng Phòng' : 'Nhân Viên';
                    
                    const t1 = e.target || 0;
                    const t120 = Math.round(t1 * 1.2);
                    const act = e.actual || 0;
                    
                    const t1Str = t1 > 0 ? (Number(t1).toLocaleString('vi-VN') + 'đ') : '0đ';
                    const t120Str = t1 > 0 ? (t120.toLocaleString('vi-VN') + 'đ') : '0đ';
                    const actStr = formatVND(act);

                    const isReach1 = t1 > 0 && act >= t1;
                    const isReach120 = t120 > 0 && act >= t120;

                    let statusBadgeHtml = '';
                    if (isReach120) {
                        statusBadgeHtml = `<span style="background:#dcfce7;color:#15803d;border:1.5px solid #4ade80;padding:3px 10px;border-radius:9999px;font-weight:800;font-size:11px;display:inline-block">🎉 Đạt Mốc 120%</span>`;
                    } else if (isReach1) {
                        statusBadgeHtml = `<span style="background:#dcfce7;color:#166534;border:1.5px solid #86efac;padding:3px 10px;border-radius:9999px;font-weight:800;font-size:11px;display:inline-block">✅ Đạt Mốc 100%</span>`;
                    } else {
                        statusBadgeHtml = `<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:3px 10px;border-radius:9999px;font-weight:800;font-size:11px;display:inline-block">❌ Chưa Đạt</span>`;
                    }

                    const actStyle = "background:#fffbe6;color:#b45309;font-weight:800;border-left:1px solid #fef08a;border-right:1px solid #fef08a";
                    const m1Style = isReach1 ? "background:#e6f4ea;color:#137333;font-weight:800" : "color:#1d4ed8;font-weight:800";
                    const m120Style = isReach120 ? "background:#dcfce7;color:#15803d;font-weight:800" : "color:#6b21a8;font-weight:800";

                    const bonus1Text = e.target_bonus_m1 
                        ? `<span style="font-weight:700;color:${isReach1 ? '#15803d' : '#475569'}">${e.target_bonus_m1} ${isReach1 ? '<b style="color:#15803d">✅ (Đã Đạt)</b>' : '<b style="color:#d97706">⌛ (Chưa Đạt)</b>'}</span>` 
                        : '<span style="color:#94a3b8">—</span>';
                    
                    const bonus120Text = e.target_bonus_m120 
                        ? `<span style="font-weight:700;color:${isReach120 ? '#15803d' : '#475569'}">${e.target_bonus_m120} ${isReach120 ? '<b style="color:#15803d">🎉 (Đã Đạt)</b>' : '<b style="color:#d97706">⌛ (Chưa Đạt)</b>'}</span>` 
                        : '<span style="color:#94a3b8">—</span>';

                    const bgRow = globalStt % 2 === 0 ? '#f8fafc' : '#ffffff';

                    rewardRows += `
                        <tr class="kpi-reward-emp-row team-row-${rt.dept_id}" data-search-text="${escapeHtml((e.full_name + ' ' + (e.username || '')).toLowerCase())}" style="background:${bgRow};border-bottom:1px solid #e2e8f0;transition:background 0.15s ease" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${bgRow}'">
                            <td style="padding:8px 10px;text-align:center;font-weight:700;color:#64748b">${globalStt++}</td>
                            <td style="padding:8px 12px;font-weight:700;color:#1e1b4b">
                                <div style="display:flex;align-items:center;gap:6px;padding-left:10px">
                                    <span style="color:#94a3b8;font-weight:700">└─</span>
                                    <span>👤 ${escapeHtml(e.full_name)}</span>
                                    <span style="font-size:10px;color:#4338ca;background:#e0e7ff;padding:1px 7px;border-radius:9999px;font-weight:700;margin-left:2px">(${roleLabel})</span>
                                </div>
                            </td>
                            <td style="padding:8px 12px;text-align:right;${actStyle}">💰 ${actStr}</td>
                            <td style="padding:8px 12px;text-align:right;${m1Style}">${t1Str}</td>
                            <td style="padding:8px 12px;font-size:11.5px">${bonus1Text}</td>
                            <td style="padding:8px 12px;text-align:right;${m120Style}">${t120Str}</td>
                            <td style="padding:8px 12px;font-size:11.5px">${bonus120Text}</td>
                            <td style="padding:8px 12px;font-size:11.5px;color:#334155">${escapeHtml(e.target_bonus_conditions || '—')}</td>
                            <td style="padding:8px 10px;text-align:center">${statusBadgeHtml}</td>
                        </tr>
                    `;
                });
            });

            let empOptionsHtml = `<div onclick="kpiSaleSelectRewardEmployee('', '')" style="padding:7px 12px;font-size:11.5px;font-weight:800;color:#2563eb;cursor:pointer;border-bottom:1px solid #e2e8f0;background:#eff6ff" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">🌐 Tất Cả Nhân Sự (${empsWithRewardCount})</div>`;

            rewardTeams.forEach(rt => {
                (rt.employees || []).forEach(e => {
                    empOptionsHtml += `
                        <div onclick="kpiSaleSelectRewardEmployee('${e.user_id}', '${escapeHtml((e.full_name || '').replace(/'/g, "\\'"))}')" class="kpi-sale-emp-option-item" data-search-text="${escapeHtml((e.full_name + ' ' + (e.username || '')).toLowerCase())}" style="padding:7px 12px;font-size:11.5px;color:#1e293b;cursor:pointer;border-bottom:1px dashed #f1f5f9;display:flex;align-items:center;justify-content:space-between;transition:background 0.15s ease" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                            <div><b>👤 ${escapeHtml(e.full_name)}</b> <span style="color:#64748b;font-size:10.5px">(${escapeHtml(rt.dept_name)})</span></div>
                            <span style="color:#2563eb;font-size:10.5px;font-weight:700">Chọn</span>
                        </div>
                    `;
                });
            });

            rewardEl.innerHTML = `
                <div style="background:white;border:1.5px solid #cbd5e1;border-radius:12px;margin-bottom:20px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04)">
                    <div style="background:linear-gradient(135deg,#f0fdf4,#e0f2fe);color:#0f172a;padding:10px 18px;font-weight:800;font-size:13.5px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-bottom:1.5px solid #cbd5e1">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                            <span style="color:#166534">🏆 CHÍNH SÁCH PHẦN THƯỞNG & TIÊU CHÍ XÉT KPI PHÒNG SALE — THÁNG ${month.month}/${month.year}</span>
                            <div style="position:relative;display:inline-flex;align-items:center;gap:6px">
                                <span onclick="kpiSaleToggleRewardSearchDropdown()" title="Click để mở danh sách chọn nhân sự" style="font-size:11px;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;padding:3px 10px;border-radius:9999px;font-weight:700;cursor:pointer;transition:all 0.15s ease;display:inline-flex;align-items:center;gap:4px" onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='#dbeafe'">👥 ${empsWithRewardCount} Nhân Sự ▾</span>
                                <div style="position:relative;display:inline-flex;align-items:center">
                                    <input type="text" id="kpiSaleRewardSearchInput" onfocus="kpiSaleToggleRewardSearchDropdown(true)" oninput="kpiSaleFilterRewardSearch(this.value)" placeholder="🔍 Tìm tên / chọn nhân sự..." style="padding:4px 26px 4px 10px;border-radius:9999px;font-size:11px;font-weight:600;border:1.5px solid #cbd5e1;background:white;color:#0f172a;outline:none;width:170px;transition:all 0.15s ease" onblur="setTimeout(() => kpiSaleToggleRewardSearchDropdown(false), 250)">
                                    <span id="kpiSaleRewardSearchClear" onclick="document.getElementById('kpiSaleRewardSearchInput').value='';kpiSaleFilterRewardSearch('');this.style.display='none'" style="position:absolute;right:8px;cursor:pointer;color:#94a3b8;font-size:12px;font-weight:800;display:none">✕</span>
                                </div>
                                <div id="kpiSaleRewardEmpDropdown" style="position:absolute;top:calc(100% + 6px);left:0;width:250px;max-height:220px;overflow-y:auto;background:white;border:1.5px solid #93c5fd;border-radius:10px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.15);z-index:9999;display:none">
                                    ${empOptionsHtml}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap" id="kpiSaleRewardTeamTabs">
                            ${filterTabsHtml}
                        </div>
                    </div>
                    <div style="max-height:280px;overflow-y:auto">
                        <table style="width:100%;border-collapse:collapse;font-size:12px">
                            <thead style="position:sticky;top:0;border-bottom:2px solid #cbd5e1;z-index:2">
                                <tr>
                                    <th style="padding:10px 10px;text-align:center;width:40px;background:#f8fafc!important;color:#475569!important;font-weight:800">STT</th>
                                    <th style="padding:10px 12px;text-align:left;min-width:150px;background:#f8fafc!important;color:#0f172a!important;font-weight:800">👤 Nhân Viên</th>
                                    <th style="padding:10px 12px;text-align:right;min-width:125px;background:#fef3c7!important;color:#b45309!important;font-weight:800;border-left:1px solid #fde68a;border-right:1px solid #fde68a">💰 DT Thực Tế</th>
                                    <th style="padding:10px 12px;text-align:right;min-width:130px;background:#eff6ff!important;color:#1d4ed8!important;font-weight:800">🎯 KPI Mốc 1</th>
                                    <th style="padding:10px 12px;text-align:left;min-width:150px;background:#f0fdf4!important;color:#15803d!important;font-weight:800">🎁 Thưởng Mốc 1</th>
                                    <th style="padding:10px 12px;text-align:right;min-width:130px;background:#f3e8ff!important;color:#6b21a8!important;font-weight:800">🚀 KPI Mốc 2</th>
                                    <th style="padding:10px 12px;text-align:left;min-width:150px;background:#fff1f2!important;color:#b91c1c!important;font-weight:800">🏆 Thưởng Mốc 2</th>
                                    <th style="padding:10px 12px;text-align:left;min-width:160px;background:#f8fafc!important;color:#334155!important;font-weight:800">📝 Tiêu Chí Xét</th>
                                    <th style="padding:10px 10px;text-align:center;min-width:120px;background:#f8fafc!important;color:#0f172a!important;font-weight:800">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rewardRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            rewardEl.style.display = 'block';
        } else {
            rewardEl.style.display = 'none';
        }
    }
    kpiSaleInitStaffTrendSection();

function kpiSaleToggleRewardSearchDropdown(show) {
    const dropdown = document.getElementById('kpiSaleRewardEmpDropdown');
    if (!dropdown) return;
    if (show === undefined) {
        dropdown.style.display = (dropdown.style.display === 'none' || !dropdown.style.display) ? 'block' : 'none';
    } else {
        dropdown.style.display = show ? 'block' : 'none';
    }
}
window.kpiSaleToggleRewardSearchDropdown = kpiSaleToggleRewardSearchDropdown;

function kpiSaleSelectRewardEmployee(userId, name) {
    const inp = document.getElementById('kpiSaleRewardSearchInput');
    if (inp) inp.value = name || '';
    kpiSaleFilterRewardSearch(name || '');
    kpiSaleToggleRewardSearchDropdown(false);
}
window.kpiSaleSelectRewardEmployee = kpiSaleSelectRewardEmployee;

function kpiSaleFilterRewardSearch(keyword) {
    const clearBtn = document.getElementById('kpiSaleRewardSearchClear');
    if (clearBtn) clearBtn.style.display = keyword ? 'inline' : 'none';

    const text = (keyword || '').toLowerCase().trim();
    const teamGroups = document.querySelectorAll('.kpi-reward-team-group');
    const empRows = document.querySelectorAll('.kpi-reward-emp-row');
    const dropdownItems = document.querySelectorAll('.kpi-sale-emp-option-item');

    // Filter dropdown options live
    dropdownItems.forEach(item => {
        const itemText = item.getAttribute('data-search-text') || item.textContent.toLowerCase();
        if (!text || itemText.includes(text)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    if (!text) {
        const activeTab = document.querySelector('.kpi-reward-tab-btn.active');
        const activeTeamId = activeTab ? activeTab.getAttribute('data-team-id') : 'all';
        kpiSaleFilterRewardTeam(activeTeamId, activeTab);
        return;
    }

    const matchingTeamIds = new Set();
    empRows.forEach(row => {
        const searchText = row.getAttribute('data-search-text') || row.textContent.toLowerCase();
        if (searchText.includes(text)) {
            row.style.display = '';
            const classes = row.className.split(' ');
            classes.forEach(c => {
                if (c.startsWith('team-row-')) {
                    matchingTeamIds.add(c.replace('team-row-', ''));
                }
            });
        } else {
            row.style.display = 'none';
        }
    });

    teamGroups.forEach(group => {
        const deptId = group.getAttribute('data-team-id');
        group.style.display = matchingTeamIds.has(deptId) ? '' : 'none';
    });
}
window.kpiSaleFilterRewardSearch = kpiSaleFilterRewardSearch;

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

function kpiSaleFilterRewardSearch(keyword) {
    const clearBtn = document.getElementById('kpiSaleRewardSearchClear');
    if (clearBtn) clearBtn.style.display = keyword ? 'inline' : 'none';

    const text = (keyword || '').toLowerCase().trim();
    const teamGroups = document.querySelectorAll('.kpi-reward-team-group');
    const empRows = document.querySelectorAll('.kpi-reward-emp-row');

    if (!text) {
        const activeTab = document.querySelector('.kpi-reward-tab-btn.active');
        const activeTeamId = activeTab ? activeTab.getAttribute('data-team-id') : 'all';
        kpiSaleFilterRewardTeam(activeTeamId, activeTab);
        return;
    }

    const matchingTeamIds = new Set();
    empRows.forEach(row => {
        const searchText = row.getAttribute('data-search-text') || row.textContent.toLowerCase();
        if (searchText.includes(text)) {
            row.style.display = '';
            const classes = row.className.split(' ');
            classes.forEach(c => {
                if (c.startsWith('team-row-')) {
                    matchingTeamIds.add(c.replace('team-row-', ''));
                }
            });
        } else {
            row.style.display = 'none';
        }
    });

    teamGroups.forEach(group => {
        const deptId = group.getAttribute('data-team-id');
        group.style.display = matchingTeamIds.has(deptId) ? '' : 'none';
    });
}
window.kpiSaleFilterRewardSearch = kpiSaleFilterRewardSearch;

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
            const dayDateStr = `${month.year}-${String(month.month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            html += `<td class="day-cell ${val > 0 ? 'has-val' : 'zero-val'} ${isToday ? 'kpi-today-hdr' : ''}" style="${val > 0 ? 'cursor:pointer' : ''}" ${val > 0 ? `onclick="event.stopPropagation(); kpiSaleShowTeamOrders(${team.dept_id}, '${team.dept_name.replace(/'/g, "\\'")}', '${dayDateStr}')"` : ''}>${val > 0 ? compactVND(val) : '—'}</td>`;
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
                const dayDateStr = `${month.year}-${String(month.month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
                html += `<td class="day-cell ${val > 0 ? 'has-val' : 'zero-val'} ${isToday ? 'kpi-today-hdr' : ''}" style="${val > 0 ? 'cursor:pointer' : ''}" ${val > 0 ? `onclick="event.stopPropagation(); kpiSaleShowOrders(${emp.user_id}, '${emp.full_name.replace(/'/g, "\\'")}', '${dayDateStr}')"` : ''}>${val > 0 ? compactVND(val) : '—'}</td>`;
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
            var showFn = 'kpiSaleShowRetentionDetail(' + (emp.user_id || emp.id) + ',\'' + fnEsc + '\')';

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
function _kpiSaleFmtDisplayEnd(pInfo) {
    if (!pInfo) return '';
    if (pInfo.display_end) return pInfo.display_end;
    var end = pInfo.end || pInfo.start || '';
    if (end && end.endsWith('-01') && end !== pInfo.start) {
        var d = new Date(end + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    return end;
}

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
        var pEndStr = _kpiSaleFmtDisplayEnd(periodInfo);
        h += '<div style="padding:4px 24px;font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff">📌 Dữ liệu: ' + periodInfo.start + ' → ' + pEndStr + ' (' + (periodInfo.label || '') + ')</div>';
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
    h += '<div>#</div><div>Nhân viên</div><div style="text-align:right">Đơn hàng</div><div style="text-align:right">Doanh số</div><div style="text-align:right;color:#059669" title="Số đơn ĐP ÷ KH ĐP được giao">📊 CĐ ĐP %</div><div style="text-align:right;color:#7c3aed" title="Số đơn PET/TEM ÷ KH PET/TEM được giao">📊 CĐ PET/TEM %</div><div style="text-align:right">TK Aff</div><div style="text-align:right;color:#d97706">KH cũ ĐP %</div><div style="text-align:right;color:#7c3aed">KH cũ PET/TEM %</div>';
    h += '</div>';

    if (!lb || lb.length === 0) {
        h += '<div style="padding:30px;text-align:center;color:#94a3b8">📭 Chưa có xếp hạng nhân viên trong kỳ này</div>';
    } else {
        for (var i = 0; i < lb.length; i++) {
            var emp = lb[i];
            var rank = i < 3 ? medals[i] : (i + 1);
            var conv = convMap[emp.user_id] || convMap[String(emp.user_id)] || convMap[emp.id] || convMap[String(emp.id)] || {};
            var compDp = conv.completed_dp != null ? conv.completed_dp : (emp.orders_dp || 0);
            var assDp = conv.assigned_dp != null ? conv.assigned_dp : 0;
            var rateDpVal = conv.rate_dp != null ? conv.rate_dp : (assDp > 0 ? Math.round(1000 * compDp / assDp) / 10 : (compDp > 0 ? compDp * 100 : 0));

            var compPetTem = conv.completed_pettem != null ? conv.completed_pettem : (emp.orders_pettem || 0);
            var assPetTem = conv.assigned_pettem != null ? conv.assigned_pettem : 0;
            var ratePetTemVal = conv.rate_pettem != null ? conv.rate_pettem : (assPetTem > 0 ? Math.round(1000 * compPetTem / assPetTem) / 10 : (compPetTem > 0 ? compPetTem * 100 : 0));
            var cRateDp = rateDpVal != null ? rateDpVal + '%' : '0%';
            var cColorDp = (rateDpVal || 0) >= 70 ? '#10b981' : (rateDpVal || 0) >= 40 ? '#f59e0b' : '#ef4444';
            var cRatePetTem = ratePetTemVal != null ? ratePetTemVal + '%' : '0%';
            var cColorPetTem = (ratePetTemVal || 0) >= 70 ? '#10b981' : (ratePetTemVal || 0) >= 40 ? '#f59e0b' : '#ef4444';
            var prev = emp.prev || {};

            var dpTooltipConv = 'Bấm để xem chi tiết: ' + (conv.assigned_dp > 0 ? (conv.completed_dp + '/' + conv.assigned_dp + ' KH ĐP được giao') : 'Chưa có KH ĐP được giao');
            var petTooltipConv = 'Bấm để xem chi tiết: ' + (conv.assigned_pettem > 0 ? (conv.completed_pettem + '/' + conv.assigned_pettem + ' KH PET/TEM được giao') : 'Chưa có KH PET/TEM được giao');

            var safeEmpName = (emp.name || emp.full_name || '').replace(/'/g, "\\'");

            h += '<div class="kpi-lb-row" style="cursor:pointer" onclick="kpiSaleShowOrders(' + (emp.user_id || emp.id) + ',\'' + safeEmpName + '\')">';
            h += '<div class="kpi-lb-rank">' + rank + '</div>';
            var empIcon = (['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(emp.role) || emp.username === 'truongphongsale' || emp.user_id === 77) ? '⭐' : '👤';
            h += '<div><div class="kpi-lb-name">' + empIcon + ' ' + (emp.name || emp.full_name || '?') + '</div><div class="kpi-lb-team">' + (emp.team || 'PHÒNG SALE') + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#4338ca">' + (emp.total_orders || 0) + ' đơn<div>' + kpiSaleTrend(emp.total_orders || 0, prev.total_orders || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#059669">' + kpiSaleCompactVND(emp.revenue || 0) + '<div>' + kpiSaleTrend(emp.revenue || 0, prev.revenue || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:' + cColorDp + ';font-size:12px;cursor:pointer;text-decoration:underline dotted" title="' + dpTooltipConv + '" onclick="event.stopPropagation();kpiSaleShowCdDetail(' + (emp.user_id || emp.id) + ',\'' + safeEmpName + '\',\'dp\')">' + cRateDp + '<div>' + kpiSaleTrend(conv.rate_dp || 0, prev.conversion_rate_dp || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:' + cColorPetTem + ';font-size:12px;cursor:pointer;text-decoration:underline dotted" title="' + petTooltipConv + '" onclick="event.stopPropagation();kpiSaleShowCdDetail(' + (emp.user_id || emp.id) + ',\'' + safeEmpName + '\',\'pettem\')">' + cRatePetTem + '<div>' + kpiSaleTrend(conv.rate_pettem || 0, prev.conversion_rate_pettem || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#7c3aed">' + (emp.affiliate_new || 0) + '<div>' + kpiSaleTrend(emp.affiliate_new || 0, prev.affiliate_new || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#d97706">' + (emp.rate_dp != null ? emp.rate_dp + '%' : '—') + '<div>' + kpiSaleTrend(emp.rate_dp || 0, prev.rate_dp || 0) + '</div></div>';
            h += '<div class="kpi-lb-val" style="color:#7c3aed">' + (emp.rate_pettem != null ? emp.rate_pettem + '%' : '—') + '<div>' + kpiSaleTrend(emp.rate_pettem || 0, prev.rate_pettem || 0) + '</div></div>';
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
        var tcEndStr = _kpiSaleFmtDisplayEnd(tcPeriodInfo);
        h += '<div style="padding:4px 24px;font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff">📌 Dữ liệu: ' + tcPeriodInfo.start + ' → ' + tcEndStr + ' (' + (tcPeriodInfo.label || '') + ')</div>';
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

function _mcSaleHasPerm(permType) {
    var user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
    if (!user) return false;
    if (user.role === 'giam_doc') return true; // GĐ luôn có quyền
    var perm = _mcSalePerms.find(function(p) { return p.source === 'kpisale' && p.permission_type === permType; });
    if (!perm) return false;
    return perm.allowed_roles.split(',').indexOf(user.role) >= 0;
}

// SECTION 5: ▶ 📝 Cam Kết Cuộc Họp : KPI P.Sale
function renderKpiSaleMeetingCommit(el) {
    const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : {};
    const canCreate = _mcSaleHasPerm('create_session');
    const canSetupPersonal = _mcSaleHasPerm('setup_personal');
    const canSetupTeam = _mcSaleHasPerm('setup_team');
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
                    ${canCreate ? `
                        <button type="button" class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleCreateSession()">➕ Tạo Cuộc Họp</button>
                    ` : ''}
                    ${canSetupPersonal ? `
                        <button type="button" class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSetupTemplates('kpisale','Cá Nhân')" title="Mẫu cá nhân">⚙️ Mẫu Cá Nhân</button>
                    ` : ''}
                    ${canSetupTeam ? `
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
        // Helper: format % with 1 decimal
        function mcSFmtPct(v) { var r = Math.round(v * 10) / 10; return r.toString().replace('.', ','); }
        var isGD = user.role === 'giam_doc' || user.role === 'admin';

        // ===== MONTHLY SUMMARY CARDS =====
        h += '<div style="margin-bottom:16px;padding:16px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border-radius:14px;border:1px solid #e0e7ff;border-left:5px solid #6366f1">';
        h += '<div style="display:flex;align-items:center;gap:8px">';
        h += '<span style="font-size:15px;font-weight:900;color:#1e293b">📊 Tổng Kết Cam Kết Tháng ' + selMonth + '/' + selYear + '</span>';
        h += '<span style="font-size:11px;font-weight:500;color:#6366f1;background:#eef2ff;padding:2px 8px;border-radius:8px">' + _mcSaleSessions.length + ' cuộc họp</span>';
        h += '</div>';
        h += '<div style="margin-top:14px">';
        // Build per-person aggregates
        var personMap = {};
        for (var ai = 0; ai < _mcSaleAllCommitments.length; ai++) {
            var ac = _mcSaleAllCommitments[ai];
            if (ac.team_dept_id) continue;
            if (!personMap[ac.user_id]) {
                personMap[ac.user_id] = { name: ac.user_name, role: ac.user_role, total: 0, done: 0, sessionPcts: {} };
            }
            personMap[ac.user_id].total++;
            if (ac.is_completed) personMap[ac.user_id].done++;
            if (!personMap[ac.user_id].sessionPcts[ac.session_id]) {
                personMap[ac.user_id].sessionPcts[ac.session_id] = { sum: 0, count: 0 };
            }
            personMap[ac.user_id].sessionPcts[ac.session_id].sum += (ac.completion_pct || 0);
            personMap[ac.user_id].sessionPcts[ac.session_id].count++;
        }
        var personArr = Object.keys(personMap).map(function(uid) {
            var p = personMap[uid];
            var sessKeys = Object.keys(p.sessionPcts);
            if (sessKeys.length > 0) {
                var sessAvgSum = 0;
                for (var sk = 0; sk < sessKeys.length; sk++) {
                    var sp = p.sessionPcts[sessKeys[sk]];
                    sessAvgSum += (sp.sum / sp.count);
                }
                p.avgPct = Math.round((sessAvgSum / sessKeys.length) * 10) / 10;
            } else { p.avgPct = 0; }
            p.sessionCount = sessKeys.length;
            p.uid = parseInt(uid);
            return p;
        }).sort(function(a, b) { return b.avgPct - a.avgPct; });

        h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';
        for (var pi = 0; pi < personArr.length; pi++) {
            var p = personArr[pi];
            var pPctDisplay = mcSFmtPct(p.avgPct);
            var pColor = p.avgPct >= 80 ? '#059669' : (p.avgPct >= 50 ? '#d97706' : '#dc2626');
            var pBg = p.avgPct >= 80 ? '#dcfce7' : (p.avgPct >= 50 ? '#fef3c7' : '#fee2e2');
            var pGrad = p.avgPct >= 80 ? 'linear-gradient(90deg,#22c55e,#10b981)' : (p.avgPct >= 50 ? 'linear-gradient(90deg,#f59e0b,#eab308)' : 'linear-gradient(90deg,#ef4444,#f87171)');
            var roleIcon = (p.role === 'quan_ly' || p.role === 'quan_ly_cap_cao') ? '👔' : (p.role === 'truong_phong' ? '🏷️' : '👤');
            var roleText = (p.role === 'quan_ly' || p.role === 'quan_ly_cap_cao') ? 'Quản Lý' : (p.role === 'truong_phong' ? 'Trưởng Phòng' : 'Nhân Viên');

            h += '<div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid ' + pBg + ';transition:transform .2s,box-shadow .2s" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.08)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
            h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
            h += '<div style="display:flex;align-items:center;gap:6px">';
            h += '<span style="font-size:16px">' + roleIcon + '</span>';
            h += '<div><div style="font-size:13px;font-weight:700;color:#1e293b">' + p.name + '</div>';
            h += '<div style="font-size:10px;color:#94a3b8;font-weight:500">' + roleText + '</div></div>';
            h += '</div>';
            h += '<div style="font-size:18px;font-weight:900;color:' + pColor + '">' + pPctDisplay + '%</div>';
            h += '</div>';
            h += '<div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:6px">';
            h += '<div style="height:100%;width:' + p.avgPct + '%;background:' + pGrad + ';border-radius:3px;transition:width .5s ease"></div>';
            h += '</div>';
            h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;font-weight:600">';
            h += '<span>Hoàn thành: ' + p.done + '/' + p.total + '</span>';
            h += '<span>' + p.sessionCount + ' cuộc họp</span>';
            h += '</div></div>';
        }
        h += '</div>';
        h += '</div></div>'; // close monthly summary

        // ===== TEAM SUMMARY CARDS (team-own commits only, per-session averaging) =====
        if (_mcSaleTeams && _mcSaleTeams.length > 0) {
            var teamSummaryArr = [];
            for (var tsi = 0; tsi < _mcSaleTeams.length; tsi++) {
                var tteam = _mcSaleTeams[tsi];
                if (!tteam.members || tteam.members.length === 0) continue;
                var teamOwnAll = _mcSaleAllCommitments.filter(function(c) { return c.team_dept_id === tteam.id; });
                var tTotal = teamOwnAll.length;
                var tDone = teamOwnAll.filter(function(c) { return c.is_completed; }).length;

                var tSessionMap = {};
                for (var tci = 0; tci < teamOwnAll.length; tci++) {
                    var tc = teamOwnAll[tci];
                    if (!tSessionMap[tc.session_id]) tSessionMap[tc.session_id] = { sum: 0, count: 0 };
                    tSessionMap[tc.session_id].sum += (tc.completion_pct || 0);
                    tSessionMap[tc.session_id].count++;
                }
                var tSessKeys = Object.keys(tSessionMap);
                var tAvgPct = 0;
                if (tSessKeys.length > 0) {
                    var tSessSum = 0;
                    for (var tsk = 0; tsk < tSessKeys.length; tsk++) {
                        var tsm = tSessionMap[tSessKeys[tsk]];
                        tSessSum += (tsm.sum / tsm.count);
                    }
                    tAvgPct = Math.round((tSessSum / tSessKeys.length) * 10) / 10;
                }
                teamSummaryArr.push({ team: tteam, total: tTotal, done: tDone, avgPct: tAvgPct, sessCount: tSessKeys.length });
            }
            teamSummaryArr.sort(function(a, b) { return b.avgPct - a.avgPct; });

            h += '<div style="margin-top:16px">';
            h += '<div style="font-size:13px;font-weight:800;color:#6d28d9;margin-bottom:10px;display:flex;align-items:center;gap:6px">🏠 Tổng Kết Theo Team <span style="font-size:12px;font-weight:500;color:#8b5cf6">Tháng ' + selMonth + '/' + selYear + '</span></div>';
            h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';
            for (var tsi2 = 0; tsi2 < teamSummaryArr.length; tsi2++) {
                var ts2 = teamSummaryArr[tsi2];
                var tPctDisplay = mcSFmtPct(ts2.avgPct);
                var tColor = ts2.avgPct >= 80 ? '#059669' : (ts2.avgPct >= 50 ? '#d97706' : '#dc2626');
                var tGrad = ts2.avgPct >= 80 ? 'linear-gradient(90deg,#22c55e,#10b981)' : (ts2.avgPct >= 50 ? 'linear-gradient(90deg,#f59e0b,#eab308)' : 'linear-gradient(90deg,#ef4444,#f87171)');

                h += '<div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:10px;padding:12px 14px;border:1px solid #c4b5fd;border-left:4px solid #8b5cf6;transition:transform .2s,box-shadow .2s" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(139,92,246,.15)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
                h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
                h += '<div style="display:flex;align-items:center;gap:6px">';
                h += '<span style="font-size:16px">🏠</span>';
                h += '<div><div style="font-size:13px;font-weight:800;color:#4c1d95">' + ts2.team.name + '</div>';
                h += '<div style="font-size:10px;color:#7c3aed;font-weight:500">' + ts2.team.members.length + ' thành viên</div></div>';
                h += '</div>';
                h += '<div style="font-size:18px;font-weight:900;color:' + tColor + '">' + tPctDisplay + '%</div>';
                h += '</div>';
                h += '<div style="height:6px;background:#ddd6fe;border-radius:3px;overflow:hidden;margin-bottom:6px">';
                h += '<div style="height:100%;width:' + ts2.avgPct + '%;background:' + tGrad + ';border-radius:3px;transition:width .5s ease"></div>';
                h += '</div>';
                h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#6d28d9;font-weight:600">';
                h += '<span>Hoàn thành: ' + ts2.done + '/' + ts2.total + '</span>';
                h += '<span>' + ts2.sessCount + ' cuộc họp</span>';
                h += '</div></div>';
            }
            h += '</div></div>';
        }

        // ===== YEARLY SUMMARY (collapsible, gold theme) =====
        h += mcSaleRenderYearlySummary();

        // ===== SESSION ACCORDION =====
        var _mcSalePalette = [
            { bg:'#f5f3ff', border:'#c4b5fd', headerBg:'linear-gradient(135deg,#ede9fe,#ddd6fe)', accent:'#7c3aed', text:'#4c1d95', teamBg:'linear-gradient(135deg,#f5f3ff,#ede9fe,#f5f3ff)', teamBorder:'#8b5cf6', teamNameBg:'linear-gradient(90deg,#ede9fe,#ddd6fe)', teamNameColor:'#4c1d95', newestBg:'#4338ca', icon:'#7c3aed' },
            { bg:'#ecfdf5', border:'#6ee7b7', headerBg:'linear-gradient(135deg,#d1fae5,#a7f3d0)', accent:'#059669', text:'#065f46', teamBg:'linear-gradient(135deg,#ecfdf5,#d1fae5,#ecfdf5)', teamBorder:'#10b981', teamNameBg:'linear-gradient(90deg,#d1fae5,#a7f3d0)', teamNameColor:'#065f46', newestBg:'#059669', icon:'#10b981' },
            { bg:'#fffbeb', border:'#fcd34d', headerBg:'linear-gradient(135deg,#fef3c7,#fde68a)', accent:'#d97706', text:'#78350f', teamBg:'linear-gradient(135deg,#fffbeb,#fef3c7,#fffbeb)', teamBorder:'#f59e0b', teamNameBg:'linear-gradient(90deg,#fef3c7,#fde68a)', teamNameColor:'#78350f', newestBg:'#d97706', icon:'#f59e0b' },
            { bg:'#fff1f2', border:'#fda4af', headerBg:'linear-gradient(135deg,#ffe4e6,#fecdd3)', accent:'#e11d48', text:'#881337', teamBg:'linear-gradient(135deg,#fff1f2,#ffe4e6,#fff1f2)', teamBorder:'#fb7185', teamNameBg:'linear-gradient(90deg,#ffe4e6,#fecdd3)', teamNameColor:'#881337', newestBg:'#e11d48', icon:'#fb7185' }
        ];

        for (var si = 0; si < _mcSaleSessions.length; si++) {
            var sess = _mcSaleSessions[si];
            var stt = si + 1;
            var isNewest = (si === _mcSaleSessions.length - 1);
            var dateParts = sess.meeting_date.split('T')[0].split('-');
            var sessDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
            var sessCommits = _mcSaleAllCommitments.filter(function(c) { return c.session_id === sess.id; });
            var totalDone = sessCommits.filter(function(c) { return c.is_completed; }).length;
            var pal = _mcSalePalette[si % _mcSalePalette.length];

            h += '<div style="margin-bottom:12px;border:2px solid ' + pal.border + ';border-radius:12px;overflow:hidden;background:' + pal.bg + ';border-left:5px solid ' + pal.accent + '">';

            // Session header
            h += '<div onclick="mcSaleToggleSession(' + sess.id + ')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;background:' + pal.headerBg + ';border-bottom:1px solid ' + pal.border + '">';
            h += '<div style="display:flex;align-items:center;gap:10px">';
            h += '<span id="mcSaleSessIcon_' + sess.id + '" style="font-size:14px;transition:transform .3s;color:' + pal.icon + '">▶</span>';
            h += '<span style="font-size:14px;font-weight:800;color:' + pal.text + '">📋 Cuộc Họp Thứ ' + stt + '</span>';
            h += '<span style="font-size:12px;font-weight:500;color:' + pal.text + ';opacity:.7">— ' + sess.title + ' (' + sessDateStr + ')</span>';
            h += '</div>';
            h += '<div style="display:flex;align-items:center;gap:8px">';
            if (sessCommits.length > 0) {
                var pctAll = (Math.round(sessCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / sessCommits.length * 10) / 10).toString().replace('.', ',');
                h += '<span class="kpi-mc-badge ' + (totalDone === sessCommits.length ? 'kpi-mc-badge-done' : 'kpi-mc-badge-pending') + '">' + totalDone + '/' + sessCommits.length + ' — ' + pctAll + '%</span>';
            }
            if (isNewest) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:' + pal.newestBg + ';color:#fff;font-weight:700">Mới nhất</span>';
            h += '</div></div>';

            // Session body (expandable)
            h += '<div id="mcSaleSessBody_' + sess.id + '" style="display:none">';

            // Render teams for this session
            for (var ti = 0; ti < _mcSaleTeams.length; ti++) {
                var team = _mcSaleTeams[ti];
                if (!team.members || team.members.length === 0) continue;
                var teamCommits = sessCommits.filter(function(c) {
                    var memberIds = team.members.map(function(m) { return m.id; });
                    return memberIds.indexOf(c.user_id) >= 0 && !c.team_dept_id;
                });
                var teamOwnCommits = sessCommits.filter(function(c) { return c.team_dept_id === team.id; });
                var teamDone = teamOwnCommits.filter(function(c) { return c.is_completed; }).length;
                var teamPct = teamOwnCommits.length > 0 ? (Math.round(teamOwnCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / teamOwnCommits.length * 10) / 10).toString().replace('.', ',') : '0';

                h += '<div class="kpi-mc-team" style="background:' + pal.teamBg + ';border-left:4px solid ' + pal.teamBorder + ';border-color:' + pal.teamBorder + '">';
                h += '<div class="kpi-mc-team-name" style="justify-content:space-between;background:' + pal.teamNameBg + ';color:' + pal.teamNameColor + '">';
                h += '<span>🏠 ' + team.name + ' <span style="font-size:11px;color:' + pal.teamNameColor + ';opacity:.6;font-weight:500">(' + team.members.length + ' người)</span></span>';
                h += '<div style="display:flex;align-items:center;gap:6px">';
                if (teamOwnCommits.length > 0) {
                    h += '<span class="kpi-mc-badge kpi-mc-badge-team">' + teamDone + '/' + teamOwnCommits.length + ' — ' + teamPct + '%</span>';
                }
                if (isGD) {
                    if (teamOwnCommits.length > 0) {
                        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleReviewTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\\\'") + '\')">✅ Review</button>';
                        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleEditTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\\\'") + '\')">✏️</button>';
                    } else {
                        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleEditTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\\\'") + '\')">📝 Ghi Team</button>';
                    }
                }
                h += '</div></div>';

                // Members
                var sortedMembers = team.members.slice().sort(function(a, b) {
                    var pr = function(r) { return r === 'giam_doc' ? 0 : r === 'quan_ly_cap_cao' ? 1 : r === 'quan_ly' ? 2 : r === 'truong_phong' ? 3 : 10; };
                    return pr(a.role) - pr(b.role);
                });

                for (var mi = 0; mi < sortedMembers.length; mi++) {
                    var emp = sortedMembers[mi];
                    var empCommits = sessCommits.filter(function(c) { return c.user_id === emp.id && !c.team_dept_id; });
                    var totalItems = empCommits.length;
                    var doneItems = empCommits.filter(function(c) { return c.is_completed; }).length;
                    var avgPct = totalItems > 0 ? (Math.round(empCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / totalItems * 10) / 10).toString().replace('.', ',') : '0';

                    var roleLabel = '';
                    if (emp.role === 'quan_ly' || emp.role === 'quan_ly_cap_cao') roleLabel = 'Quản Lý';
                    else if (emp.role === 'truong_phong') roleLabel = 'Trưởng Phòng';

                    var empRowClass = 'kpi-mc-emp' + (mi % 2 === 1 ? ' kpi-mc-emp-odd' : '');
                    var avatarColors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
                    var avatarBg = avatarColors[(emp.full_name || '').charCodeAt(0) % avatarColors.length];
                    var avatarChar = (emp.full_name || '?').charAt(0);

                    h += '<div class="' + empRowClass + '">';
                    h += '<div style="display:flex;align-items:center;gap:10px;min-width:0">';
                    h += '<div class="kpi-mc-avatar" style="background:' + avatarBg + '">' + avatarChar + '</div>';
                    h += '<div style="min-width:0"><span class="kpi-mc-emp-name">' + emp.full_name + '</span>';
                    if (roleLabel) h += '<span class="kpi-mc-emp-role">' + roleLabel + '</span>';
                    h += '</div></div>';
                    h += '<div class="kpi-mc-emp-actions">';

                    var isSelf = user && user.id === emp.id;

                    if (totalItems > 0) {
                        if (doneItems === totalItems) {
                            h += '<span class="kpi-mc-badge kpi-mc-badge-done">✅ ' + doneItems + '/' + totalItems + ' — 100%</span>';
                        } else {
                            h += '<span class="kpi-mc-badge kpi-mc-badge-pending">⏳ ' + doneItems + '/' + totalItems + ' — ' + avgPct + '%</span>';
                        }
                        if (isGD) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\\\'") + '\')">✅ Review</button>';
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleEditUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\\\'") + '\')">✏️</button>';
                        } else if (isSelf) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\\\'") + '\')">📝 Đánh giá</button>';
                        }
                    } else {
                        h += '<span class="kpi-mc-badge kpi-mc-badge-none">Chưa có cam kết</span>';
                        if (isGD || isSelf) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSwitchSession(' + sess.id + ');mcSaleEditUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\\\'") + '\')">📝 Ghi</button>';
                        }
                    }
                    h += '</div></div>';
                }
                h += '</div>';
            }
            h += '</div></div>';
        }
    }


    h += `</div></div>`;
    el.innerHTML = h;

    // Auto-expand newest session
    if (_mcSaleSessions.length > 0) {
        var newestSess = _mcSaleSessions[_mcSaleSessions.length - 1];
        var newestBody = document.getElementById('mcSaleSessBody_' + newestSess.id);
        var newestIcon = document.getElementById('mcSaleSessIcon_' + newestSess.id);
        if (newestBody) { newestBody.style.display = ''; if (newestIcon) newestIcon.textContent = '▼'; }
    }
}

window._mcSaleToggleSection = function() {
    _mcSaleCollapsed = !_mcSaleCollapsed;
    const body = document.getElementById('mcSaleSectionBody');
    const icon = document.getElementById('mcSaleCollapseIcon');
    if (body) body.style.display = _mcSaleCollapsed ? 'none' : 'block';
    if (icon) icon.textContent = _mcSaleCollapsed ? '▶' : '▼';
};

// ===== YEARLY SUMMARY: KPI P.Sale =====
var _mcSaleYearlyCollapsed = true;
window.mcSaleToggleYearly = function() {
    _mcSaleYearlyCollapsed = !_mcSaleYearlyCollapsed;
    var body = document.getElementById('mcSaleYearlyBody');
    var icon = document.getElementById('mcSaleYearlyIcon');
    if (body) body.style.display = _mcSaleYearlyCollapsed ? 'none' : '';
    if (icon) {
        icon.textContent = _mcSaleYearlyCollapsed ? '▶' : '▼';
        icon.style.transform = _mcSaleYearlyCollapsed ? '' : 'rotate(0deg)';
    }
};

function mcSaleRenderYearlySummary() {
    if (!_mcSaleYearlyData || !_mcSaleYearlyData.sessions || _mcSaleYearlyData.sessions.length === 0) return '';
    var yd = _mcSaleYearlyData;
    var yearSessions = yd.sessions;
    var yearCommits = yd.allCommitments;
    if (!yearCommits || yearCommits.length === 0) return '';

    function fmtPct(v) { var r = Math.round(v * 10) / 10; return r.toString().replace('.', ','); }

    // Build session → month_num map
    var sessMonthMap = {};
    for (var si = 0; si < yearSessions.length; si++) {
        sessMonthMap[yearSessions[si].id] = yearSessions[si].month_num;
    }

    // ===== INDIVIDUALS =====
    var personYr = {};
    for (var ci = 0; ci < yearCommits.length; ci++) {
        var c = yearCommits[ci];
        if (c.team_dept_id) continue;
        var uid = c.user_id;
        var monthNum = sessMonthMap[c.session_id];
        if (!personYr[uid]) personYr[uid] = { name: c.user_name, role: c.user_role, months: {} };
        if (!personYr[uid].months[monthNum]) personYr[uid].months[monthNum] = {};
        if (!personYr[uid].months[monthNum][c.session_id]) personYr[uid].months[monthNum][c.session_id] = { sum: 0, count: 0 };
        personYr[uid].months[monthNum][c.session_id].sum += (c.completion_pct || 0);
        personYr[uid].months[monthNum][c.session_id].count++;
    }

    var personYrArr = Object.keys(personYr).map(function(uid) {
        var p = personYr[uid];
        var monthKeys = Object.keys(p.months);
        var monthAvgs = [];
        for (var mi = 0; mi < monthKeys.length; mi++) {
            var sessions = p.months[monthKeys[mi]];
            var sessKeys = Object.keys(sessions);
            var sessAvgSum = 0;
            for (var sk = 0; sk < sessKeys.length; sk++) {
                var sp = sessions[sessKeys[sk]];
                sessAvgSum += (sp.sum / sp.count);
            }
            monthAvgs.push(sessAvgSum / sessKeys.length);
        }
        var yearPct = monthAvgs.length > 0 ? monthAvgs.reduce(function(a, b) { return a + b; }, 0) / monthAvgs.length : 0;
        yearPct = Math.round(yearPct * 10) / 10;
        return { uid: parseInt(uid), name: p.name, role: p.role, yearPct: yearPct, monthCount: monthAvgs.length };
    }).sort(function(a, b) { return b.yearPct - a.yearPct; });

    // ===== TEAMS =====
    var teamYr = {};
    for (var ci2 = 0; ci2 < yearCommits.length; ci2++) {
        var c2 = yearCommits[ci2];
        if (!c2.team_dept_id) continue;
        var tid = c2.team_dept_id;
        var mNum = sessMonthMap[c2.session_id];
        if (!teamYr[tid]) teamYr[tid] = { months: {} };
        if (!teamYr[tid].months[mNum]) teamYr[tid].months[mNum] = {};
        if (!teamYr[tid].months[mNum][c2.session_id]) teamYr[tid].months[mNum][c2.session_id] = { sum: 0, count: 0 };
        teamYr[tid].months[mNum][c2.session_id].sum += (c2.completion_pct || 0);
        teamYr[tid].months[mNum][c2.session_id].count++;
    }

    var teamYrArr = [];
    if (_mcSaleTeams && _mcSaleTeams.length > 0) {
        for (var ti = 0; ti < _mcSaleTeams.length; ti++) {
            var team = _mcSaleTeams[ti];
            if (!team.members || team.members.length === 0) continue;
            var td = teamYr[team.id];
            if (!td) { teamYrArr.push({ name: team.name, members: team.members.length, yearPct: 0, monthCount: 0 }); continue; }
            var tMonthKeys = Object.keys(td.months);
            var tMonthAvgs = [];
            for (var tmi = 0; tmi < tMonthKeys.length; tmi++) {
                var tSessions = td.months[tMonthKeys[tmi]];
                var tSessKeys = Object.keys(tSessions);
                var tSessSum = 0;
                for (var tsk = 0; tsk < tSessKeys.length; tsk++) {
                    var tsp = tSessions[tSessKeys[tsk]];
                    tSessSum += (tsp.sum / tsp.count);
                }
                tMonthAvgs.push(tSessSum / tSessKeys.length);
            }
            var tYearPct = tMonthAvgs.length > 0 ? tMonthAvgs.reduce(function(a, b) { return a + b; }, 0) / tMonthAvgs.length : 0;
            tYearPct = Math.round(tYearPct * 10) / 10;
            teamYrArr.push({ name: team.name, members: team.members.length, yearPct: tYearPct, monthCount: tMonthAvgs.length });
        }
        teamYrArr.sort(function(a, b) { return b.yearPct - a.yearPct; });
    }

    // Render
    var h = '';
    h += '<div style="margin-top:16px;padding:16px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:14px;border:1px solid #f59e0b;border-left:5px solid #d97706">';

    // Header (collapsible)
    h += '<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="mcSaleToggleYearly()">';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span id="mcSaleYearlyIcon" style="font-size:14px;transition:transform .3s;color:#d97706">' + (_mcSaleYearlyCollapsed ? '▶' : '▼') + '</span>';
    h += '<span style="font-size:15px;font-weight:900;color:#92400e">🏆 Tổng Kết Năm ' + yd.year + '</span>';
    h += '<span style="font-size:11px;font-weight:500;color:#b45309;background:#fde68a;padding:2px 8px;border-radius:8px">' + personYrArr.length + ' cá nhân · ' + teamYrArr.length + ' team</span>';
    h += '</div>';
    h += '<span style="font-size:11px;color:#92400e;font-weight:600">Tháng 1 → 12</span>';
    h += '</div>';

    // Body (collapsible)
    h += '<div id="mcSaleYearlyBody" style="' + (_mcSaleYearlyCollapsed ? 'display:none' : '') + ';margin-top:14px">';

    // --- Individuals ---
    h += '<div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:8px;display:flex;align-items:center;gap:6px">👤 Cá Nhân — Trung Bình Năm</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:16px">';
    for (var pi = 0; pi < personYrArr.length; pi++) {
        var p = personYrArr[pi];
        var pDisp = fmtPct(p.yearPct);
        var pColor = p.yearPct >= 80 ? '#059669' : (p.yearPct >= 50 ? '#d97706' : '#dc2626');
        var pGrad = p.yearPct >= 80 ? 'linear-gradient(90deg,#22c55e,#10b981)' : (p.yearPct >= 50 ? 'linear-gradient(90deg,#f59e0b,#eab308)' : 'linear-gradient(90deg,#ef4444,#f87171)');
        var roleIcon = (p.role === 'quan_ly' || p.role === 'quan_ly_cap_cao') ? '👔' : (p.role === 'truong_phong' ? '🏷️' : '👤');
        var roleText = (p.role === 'quan_ly' || p.role === 'quan_ly_cap_cao') ? 'Quản Lý' : (p.role === 'truong_phong' ? 'Trưởng Phòng' : 'Nhân Viên');

        h += '<div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #fde68a;transition:transform .2s,box-shadow .2s" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(217,119,6,.12)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
        h += '<div style="display:flex;align-items:center;gap:6px">';
        h += '<span style="font-size:16px">' + roleIcon + '</span>';
        h += '<div><div style="font-size:13px;font-weight:700;color:#1e293b">' + p.name + '</div>';
        h += '<div style="font-size:10px;color:#94a3b8;font-weight:500">' + roleText + '</div></div>';
        h += '</div>';
        h += '<div style="font-size:18px;font-weight:900;color:' + pColor + '">' + pDisp + '%</div>';
        h += '</div>';
        h += '<div style="height:6px;background:#fef3c7;border-radius:3px;overflow:hidden;margin-bottom:6px">';
        h += '<div style="height:100%;width:' + Math.min(p.yearPct, 100) + '%;background:' + pGrad + ';border-radius:3px;transition:width .5s ease"></div>';
        h += '</div>';
        h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#92400e;font-weight:600">';
        h += '<span>TB ' + p.monthCount + ' tháng</span>';
        h += '<span>Năm ' + yd.year + '</span>';
        h += '</div></div>';
    }
    h += '</div>';

    // --- Teams ---
    if (teamYrArr.length > 0) {
        h += '<div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:8px;display:flex;align-items:center;gap:6px">🏠 Team — Trung Bình Năm</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';
        for (var tii = 0; tii < teamYrArr.length; tii++) {
            var t = teamYrArr[tii];
            var tDisp = fmtPct(t.yearPct);
            var tColor = t.yearPct >= 80 ? '#059669' : (t.yearPct >= 50 ? '#d97706' : '#dc2626');
            var tGrad = t.yearPct >= 80 ? 'linear-gradient(90deg,#22c55e,#10b981)' : (t.yearPct >= 50 ? 'linear-gradient(90deg,#f59e0b,#eab308)' : 'linear-gradient(90deg,#ef4444,#f87171)');

            h += '<div style="background:linear-gradient(135deg,#fffbeb,#fff7ed);border-radius:10px;padding:12px 14px;border:1px solid #f59e0b;border-left:4px solid #d97706;transition:transform .2s,box-shadow .2s" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(217,119,6,.15)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
            h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
            h += '<div style="display:flex;align-items:center;gap:6px">';
            h += '<span style="font-size:16px">🏠</span>';
            h += '<div><div style="font-size:13px;font-weight:800;color:#78350f">' + t.name + '</div>';
            h += '<div style="font-size:10px;color:#b45309;font-weight:500">' + t.members + ' thành viên</div></div>';
            h += '</div>';
            h += '<div style="font-size:18px;font-weight:900;color:' + tColor + '">' + tDisp + '%</div>';
            h += '</div>';
            h += '<div style="height:6px;background:#fde68a;border-radius:3px;overflow:hidden;margin-bottom:6px">';
            h += '<div style="height:100%;width:' + Math.min(t.yearPct, 100) + '%;background:' + tGrad + ';border-radius:3px;transition:width .5s ease"></div>';
            h += '</div>';
            h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#92400e;font-weight:600">';
            h += '<span>TB ' + t.monthCount + ' tháng</span>';
            h += '<span>Năm ' + yd.year + '</span>';
            h += '</div></div>';
        }
        h += '</div>';
    }

    h += '</div></div>';
    return h;
}

async function _mcSaleUpdateAutoTitle(dateStr) {
    const titleEl = document.getElementById('mcSaleSessionTitle');
    if (!titleEl) return;
    let d = new Date();
    if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    
    let count = 0;
    try {
        const res = await apiCall(`/api/meeting-commitments/sessions?month=${month}&year=${year}&source=kpisale`);
        count = (res && res.sessions) ? res.sessions.length : 0;
    } catch(e) {}
    
    const sessionNo = count + 1;
    titleEl.value = `Cuộc Họp Số ${sessionNo} - Phòng Sale - Tháng ${month}/${year}`;
}

window.mcSaleCreateSession = async function() {
    if (!_mcSaleHasPerm('create_session')) {
        showToast('Bạn không có quyền thao tác cuộc họp P.Sale', 'error');
        return;
    }
    const today = new Date().toISOString().split('T')[0];
    const [selYear, selMonth] = _kpiSale.month.split('-').map(Number);

    let sessions = [];
    try {
        const res = await apiCall(`/api/meeting-commitments/sessions?month=${selMonth}&year=${selYear}`);
        const rawSessions = (res && res.sessions) ? res.sessions : [];
        sessions = rawSessions.filter(s => {
            const sDate = s.start_date ? s.start_date.split('T')[0] : (s.meeting_date ? s.meeting_date.split('T')[0] : '');
            let eDate = s.end_date ? s.end_date.split('T')[0] : '';
            if (!eDate && sDate) {
                const d = new Date(sDate);
                d.setDate(d.getDate() + 7);
                eDate = d.toISOString().split('T')[0];
            }
            return (!sDate || today >= sDate) && (!eDate || today <= eDate);
        });
    } catch(e) {}

    const overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    let bodyHtml = '';

    if (sessions.length === 0) {
        bodyHtml = `
            <div style="padding:20px;text-align:center;color:#6b7280">
                <div style="font-size:36px;margin-bottom:8px">🔒</div>
                <div style="font-size:14px;font-weight:700;color:#1e293b">Không có cuộc họp nào đang mở trong Tháng ${selMonth}/${selYear}</div>
                <div style="font-size:12px;color:#64748b;margin-top:6px">Các cuộc họp đã quá thời gian đóng (hoặc chưa được tạo). Vui lòng tạo/gia hạn tại mục <b>Cam Kết Cuộc Họp</b>.</div>
            </div>
        `;
    } else {
        bodyHtml += '<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Chọn Cuộc Họp Trong Tháng (Đang Mở)</label>';
        bodyHtml += '<select class="kpi-mc-input" id="mcSaleSessionSelect" onchange="_mcSaleOnSelectSession(this)" style="font-weight:700">';
        for (let i = 0; i < sessions.length; i++) {
            const s = sessions[i];
            bodyHtml += `<option value="${s.id}" data-title="${s.title}" data-date="${s.meeting_date ? s.meeting_date.split('T')[0] : today}">${s.title}</option>`;
        }
        bodyHtml += '</select></div>';

        const initialTitle = sessions[0].title;
        const initialDate = sessions[0].meeting_date ? sessions[0].meeting_date.split('T')[0] : today;

        bodyHtml += '<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Tiêu đề cuộc họp (Khóa cố định)</label>';
        bodyHtml += `<input class="kpi-mc-input" id="mcSaleSessionTitle" value="${initialTitle}" readonly style="background:#f1f5f9;cursor:not-allowed;font-weight:700;color:#1e293b"></div>`;

        bodyHtml += '<div><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Ngày họp</label>';
        bodyHtml += `<input class="kpi-mc-input" type="date" id="mcSaleSessionDate" value="${initialDate}" readonly style="background:#f1f5f9;cursor:not-allowed"></div>`;
    }

    overlay.innerHTML = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>📋 Chọn Cuộc Họp P.Sale</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body">' + bodyHtml + '</div>'
        + '<div class="kpi-mc-modal-foot">'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
        + (sessions.length > 0 ? '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSaveSession()">Xác Nhận</button>' : '')
        + '</div></div>';

    document.body.appendChild(overlay);
};

window._mcSaleOnSelectSession = function(sel) {
    const opt = sel.options[sel.selectedIndex];
    const title = opt ? opt.getAttribute('data-title') : '';
    const date = opt ? opt.getAttribute('data-date') : '';
    const titleEl = document.getElementById('mcSaleSessionTitle');
    const dateEl = document.getElementById('mcSaleSessionDate');
    if (titleEl && title) titleEl.value = title;
    if (dateEl && date) dateEl.value = date;
};

window.mcSaleSaveSession = async function() {
    const selEl = document.getElementById('mcSaleSessionSelect');
    if (!selEl) return;
    const sessionId = selEl.value;
    try {
        await apiCall('/api/meeting-commitments/sessions/' + sessionId + '/departments', 'POST', { department_id: 4 });
    } catch(e) {}
    showToast('✅ Đã chọn cuộc họp thành công!', 'success');
    var overlay = document.querySelector('.kpi-mc-modal-overlay');
    if (overlay) overlay.remove();
    loadKpiSaleData();
};

// Session toggle/switch/edit/review functions for P.Sale
window.mcSaleToggleSession = function(sessionId) {
    var body = document.getElementById('mcSaleSessBody_' + sessionId);
    var icon = document.getElementById('mcSaleSessIcon_' + sessionId);
    if (!body) return;
    var isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    if (icon) icon.textContent = isHidden ? '\u25BC' : '\u25B6';
};

window.mcSaleSwitchSession = function(sessionId) {
    var sess = _mcSaleSessions.find(function(s) { return s.id === sessionId; });
    if (sess) {
        _mcSaleSession = sess;
        _mcSaleCommitments = _mcSaleAllCommitments.filter(function(c) { return c.session_id === sessionId; });
    }
};

// Helper: parse content into question/answer
function mcSaleParseContent(content) {
    if (!content) return { question: '', answer: '' };
    var lines = content.split('\n');
    var q = '', a = '';
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith('❓')) q = line.substring(1).trim();
        else if (line.startsWith('Q:')) q = line.substring(2).trim();
        else if (line.startsWith('✅')) a = line.substring(1).trim();
        else if (line.startsWith('A:')) a = line.substring(2).trim();
        else if (q && !a) a = line;
    }
    if (!q && !a) return { question: content, answer: '' };
    return { question: q, answer: a };
}

window.mcSaleEditUser = async function(userId, userName) {
    if (!_mcSaleSession) return alert('Chưa chọn cuộc họp');
    var existing = _mcSaleCommitments.filter(function(c) { return c.user_id === userId && !c.team_dept_id; });
    var items = [];

    var tplList = [];
    try {
        var tplRes = await apiCall('/api/meeting-commitments/templates?page_key=kpisale');
        tplList = tplRes.templates || [];
    } catch(e) {}

    if (existing.length > 0) {
        items = existing.map(function(c, idx) {
            var parsed = mcSaleParseContent(c.content);
            var matchedTpl = tplList[idx];
            var isTpl = !!(matchedTpl && (parsed.question === matchedTpl.question_content || !parsed.question));
            var hasRev = (c.target_revenue > 0) || !!(matchedTpl && matchedTpl.has_revenue_target);
            return {
                question: parsed.question || (matchedTpl ? matchedTpl.question_content : ''),
                answer: parsed.answer,
                content: c.content,
                target_revenue: c.target_revenue,
                hasRevenue: hasRev,
                isTemplate: isTpl
            };
        });
    } else {
        if (tplList.length > 0) {
            items = tplList.map(function(t) {
                return { question: t.question_content, answer: '', target_revenue: 0, isTemplate: true, hasRevenue: !!t.has_revenue_target };
            });
        } else {
            items = [{ question: '', answer: '', target_revenue: 0, isTemplate: false }];
        }
    }

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var sessionInfo = '';
    if (_mcSaleSession) {
        var dateParts = _mcSaleSession.meeting_date.split('T')[0].split('-');
        var sdStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
        sessionInfo = ' <span style="font-size:13px;font-weight:500;color:#92400e;display:block;margin-top:2px">— PHÒNG SALE - THÁNG ' + dateParts[1] + '/' + dateParts[0] + ' (' + sdStr + ')</span>';
    }

    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>📝 Cam Kết — ' + userName + sessionInfo + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body"><div id="mcSaleItemsList">';

    for (var i = 0; i < items.length; i++) {
        h += mcSaleRenderItemEdit(i + 1, items[i]);
    }

    h += '</div>'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleAddItem()" style="width:100%;margin-top:10px">➕ Thêm cam kết</button>'
        + '</div>'
        + '<div class="kpi-mc-modal-foot">'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
        + '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSaveUser(' + userId + ')">💾 Lưu Cam Kết</button>'
        + '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

function mcSaleRenderItemEdit(stt, item) {
    var isTemplate = item.isTemplate;
    var hasRevenue = item.hasRevenue;
    var question = item.question || item.content || '';
    var answer = item.answer || '';
    var revenue = item.target_revenue || 0;
    var reqStar = '<span style="color:#ef4444;font-weight:900;margin-left:2px">*</span>';

    var dataType = isTemplate ? 'tpl' : 'self';
    var h = '<div class="kpi-mc-item" data-mc-item data-type="' + dataType + '">';
    h += '<div class="kpi-mc-item-head">';
    h += '<div class="kpi-mc-item-stt">' + stt + '</div>';
    h += '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Cam kết #' + stt + '</div>';
    if (!isTemplate) {
        h += '<button class="kpi-mc-remove" onclick="this.closest(\'[data-mc-item]\').remove();mcSaleReindex()">✕</button>';
    }
    h += '</div>';

    if (isTemplate) {
        h += '<div style="padding:10px 14px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:8px;margin-bottom:10px;border-left:3px solid #4338ca">';
        h += '<div style="font-size:11px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📋 CÂU HỎI</div>';
        h += '<div style="font-size:13px;font-weight:600;color:#1e293b;line-height:1.5" class="mc-question">' + question + '</div>';
        h += '</div>';
        h += '<div style="margin-bottom:8px">';
        h += '<div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✍️ CÂU TRẢ LỜI / CAM KẾT' + reqStar + '</div>';
        h += '<textarea class="kpi-mc-input mc-answer mc-required" rows="2" placeholder="Nhập câu trả lời, cam kết cụ thể..." style="resize:vertical;border-color:#d1fae5">' + answer + '</textarea>';
        h += '</div>';
        if (hasRevenue) {
            h += '<div style="display:flex;align-items:center;gap:8px">';
            h += '<span style="font-size:11px;font-weight:700;color:#b45309;white-space:nowrap">💰 Mục tiêu:' + reqStar + '</span>';
            h += '<input class="kpi-mc-input mc-revenue mc-required-num" type="number" placeholder="VD: 50000000" value="' + revenue + '" style="flex:1;border-color:#fde68a">';
            h += '</div>';
        }
    } else {
        h += '<div style="margin-bottom:10px">';
        h += '<div style="font-size:11px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📋 CÂU HỎI / NỘI DUNG' + reqStar + '</div>';
        h += '<textarea class="kpi-mc-input mc-question-edit mc-required" rows="2" placeholder="VD: Mục tiêu bạn đặt ra cho giai đoạn tới?" style="resize:vertical;border-color:#c7d2fe">' + question + '</textarea>';
        h += '</div>';
        h += '<div style="margin-bottom:8px">';
        h += '<div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✍️ CÂU TRẢ LỜI / CAM KẾT' + reqStar + '</div>';
        h += '<textarea class="kpi-mc-input mc-answer mc-required" rows="2" placeholder="Nhập câu trả lời, cam kết cụ thể..." style="resize:vertical;border-color:#d1fae5">' + answer + '</textarea>';
        h += '</div>';
        var showTarget = revenue > 0;
        h += '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#b45309;cursor:pointer;margin-bottom:6px">';
        h += '<input type="checkbox" class="mc-has-target-chk" onchange="mcSaleToggleTarget(this)" ' + (showTarget ? 'checked' : '') + '> 💰 Có mục tiêu';
        h += '</label>';
        h += '<div class="mc-target-wrap" style="display:' + (showTarget ? 'flex' : 'none') + ';align-items:center;gap:8px">';
        h += '<span style="font-size:11px;font-weight:700;color:#b45309;white-space:nowrap">💰 Mục tiêu:</span>';
        h += '<input class="kpi-mc-input mc-revenue" type="number" placeholder="VD: 50000000" value="' + revenue + '" style="flex:1;border-color:#fde68a">';
        h += '</div>';
    }

    h += '</div>';
    return h;
}

window.mcSaleToggleTarget = function(chk) {
    var wrap = chk.closest('[data-mc-item]').querySelector('.mc-target-wrap');
    if (wrap) {
        wrap.style.display = chk.checked ? 'flex' : 'none';
        if (!chk.checked) {
            var revInput = wrap.querySelector('.mc-revenue');
            if (revInput) revInput.value = 0;
        }
    }
};

window.mcSaleAddItem = function() {
    var list = document.getElementById('mcSaleItemsList');
    if (!list) return;
    var count = list.querySelectorAll('[data-mc-item]').length;
    list.insertAdjacentHTML('beforeend', mcSaleRenderItemEdit(count + 1, { isTemplate: false, question: '', answer: '', target_revenue: 0 }));
};

window.mcSaleReindex = function() {
    var items = document.querySelectorAll('#mcSaleItemsList [data-mc-item]');
    for (var i = 0; i < items.length; i++) {
        var stt = items[i].querySelector('.kpi-mc-item-stt');
        if (stt) stt.textContent = i + 1;
    }
};

window.mcSaleSaveUser = async function(userId) {
    // Validate required fields
    var requiredEls = document.querySelectorAll('#mcSaleItemsList .mc-required');
    var hasError = false;
    for (var r = 0; r < requiredEls.length; r++) {
        var field = requiredEls[r];
        field.style.borderColor = '';
        if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
            field.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
            hasError = true;
        } else {
            field.style.boxShadow = '';
        }
    }
    // Validate required number fields (must be > 0)
    var requiredNums = document.querySelectorAll('#mcSaleItemsList .mc-required-num');
    for (var n = 0; n < requiredNums.length; n++) {
        var numField = requiredNums[n];
        numField.style.borderColor = '';
        var numVal = parseFloat(numField.value) || 0;
        if (numVal <= 0) {
            numField.style.borderColor = '#ef4444';
            numField.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
            hasError = true;
        } else {
            numField.style.boxShadow = '';
        }
    }
    if (hasError) {
        return alert('⚠️ Vui lòng điền đầy đủ các trường bắt buộc (*)');
    }

    var itemEls = document.querySelectorAll('#mcSaleItemsList [data-mc-item]');
    var commitments = [];
    for (var i = 0; i < itemEls.length; i++) {
        var el = itemEls[i];
        var dataType = el.getAttribute('data-type');
        var question = '', answer = '', revenue = 0;

        if (dataType === 'tpl') {
            question = el.querySelector('.mc-question') ? el.querySelector('.mc-question').textContent : '';
            answer = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
            var revEl = el.querySelector('.mc-revenue');
            revenue = revEl ? parseFloat(revEl.value) || 0 : 0;
        } else {
            var qEdit = el.querySelector('.mc-question-edit');
            question = qEdit ? qEdit.value.trim() : '';
            answer = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
            var revEl2 = el.querySelector('.mc-revenue');
            revenue = revEl2 ? parseFloat(revEl2.value) || 0 : 0;
        }

        if (question || answer) {
            commitments.push({
                content: '❓ ' + question + '\n✅ ' + answer,
                target_revenue: revenue
            });
        }
    }
    if (commitments.length === 0) return alert('Vui lòng nhập ít nhất 1 cam kết');
    try {
        await apiCall('/api/meeting-commitments', 'POST', {
            session_id: _mcSaleSession.id,
            user_id: userId,
            items: commitments
        });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        loadKpiSaleData();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window.mcSaleReviewUser = async function(userId, userName, readOnly) {
    if (!_mcSaleSession) return alert('Chưa chọn cuộc họp');
    var userCommits = _mcSaleCommitments.filter(function(c) { return c.user_id === userId && !c.team_dept_id; });
    if (userCommits.length === 0) return alert('Chưa có cam kết nào');

    var tplList = [];
    try {
        var tplRes = await apiCall('/api/meeting-commitments/templates?page_key=kpisale');
        tplList = tplRes.templates || [];
    } catch(e) {}

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var modalTitle = readOnly ? '👁️ Xem Đánh Giá — ' + userName : '✅ Review — ' + userName;
    var h = '<div class="kpi-mc-modal" style="width:700px">'
        + '<div class="kpi-mc-modal-head"><h3>' + modalTitle + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body" id="mcSaleReviewBody">';

    for (var i = 0; i < userCommits.length; i++) {
        var c = userCommits[i];
        var parsed = mcSaleParseContent(c.content);
        var qText = parsed.question || c.content;
        var aText = parsed.answer || '';

        var matchedTpl = tplList.find(function(t) { return t.question_content === qText; }) || tplList[i];
        var hasTarget = (c.target_revenue > 0) || !!(matchedTpl && matchedTpl.has_revenue_target);

        var contentHtml = '';
        contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:8px;border-left:3px solid #4338ca;margin-bottom:8px">';
        contentHtml += '<div style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">📋 CÂU HỎI</div>';
        contentHtml += '<div style="font-size:13px;font-weight:600;color:#1e293b">' + qText + '</div>';
        contentHtml += '</div>';

        contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:8px;border-left:3px solid #059669;margin-bottom:8px">';
        contentHtml += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">✍️ CÂU TRẢ LỜI</div>';
        contentHtml += '<div style="font-size:13px;color:#1e293b;white-space:pre-line">' + (aText || '<em style="color:#9ca3af">(Chưa nhập)</em>') + '</div>';
        contentHtml += '</div>';

        if (hasTarget) {
            contentHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:10px">';
            contentHtml += '<span style="font-size:13px;font-weight:700;color:#b45309">🎯 Mục tiêu:</span>';
            contentHtml += '<span style="font-size:16px;font-weight:800;color:#d97706">' + Number(c.target_revenue || 0).toLocaleString('vi-VN') + '</span>';
            contentHtml += '</div>';
        }

        h += '<div class="kpi-mc-item" data-review-id="' + c.id + '" data-has-target="' + (hasTarget ? '1' : '0') + '" data-target="' + (c.target_revenue || 0) + '">'
            + '<div class="kpi-mc-item-head"><div class="kpi-mc-item-stt">' + (i + 1) + '</div>'
            + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Cam kết #' + (i + 1) + '</div></div>'
            + contentHtml;

        if (hasTarget) {
            var currentPct = c.completion_pct || 0;
            var currentActual = (c.target_revenue > 0) && currentPct > 0 ? Math.round(c.target_revenue * currentPct / 100) : '';
            var currentActualStr = currentActual ? Number(currentActual).toLocaleString('vi-VN') : '';
            h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#7c3aed;white-space:nowrap">📊 Đã đạt:</span>';
            h += '<input class="kpi-mc-input rv-actual" type="text" inputmode="numeric" placeholder="Nhập số liệu hoàn thành..." value="' + currentActualStr + '" style="flex:1;border-color:#c4b5fd;font-weight:700" oninput="mcSaleCalcPct(this)"' + (readOnly ? ' disabled' : '') + '>';
            h += '<span class="rv-pct-display" style="font-size:14px;font-weight:800;color:#4338ca;min-width:50px;text-align:right">' + currentPct + '%</span>';
            h += '</div>';
            h += '<input type="hidden" class="rv-pct" value="' + currentPct + '">';
        } else {
            h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">📊 Tiến độ:</span>';
            h += '<div style="flex:1"><input type="range" class="rv-pct" min="0" max="100" value="' + (c.completion_pct || 0) + '" style="width:100%" oninput="this.nextElementSibling.textContent=this.value+\'%\'"' + (readOnly ? ' disabled' : '') + '><span style="font-size:12px;font-weight:700;color:#4338ca">' + (c.completion_pct || 0) + '%</span></div>';
            h += '</div>';
        }

        h += '<div style="margin-top:10px;padding:8px 12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:8px;border-left:3px solid #059669">';
        h += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✍️ Trao Đổi Kết Quả</div>';
        h += '<input class="kpi-mc-input rv-note" placeholder="Nhập nội dung trao đổi kết quả..." value="' + (c.review_note || '') + '" style="background:#fff;border-color:#a7f3d0;font-size:12px;font-weight:600;color:#064e3b"' + (readOnly ? ' disabled' : '') + '>';
        h += '</div>';
        h += '</div>';
    }

    h += '</div><div class="kpi-mc-modal-foot">';
    if (readOnly) {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Đóng</button>';
    } else {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSaveReview()">💾 Lưu Review</button>';
    }
    h += '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window.mcSaleCalcPct = function(input) {
    var item = input.closest('[data-review-id]');
    if (!item) return;
    var target = parseFloat(item.getAttribute('data-target')) || 0;

    var rawDigits = (input.value || '').toString().replace(/\D/g, '');
    if (rawDigits) {
        var formatted = Number(rawDigits).toLocaleString('vi-VN');
        if (input.value !== formatted) {
            input.value = formatted;
        }
    } else {
        input.value = '';
    }

    var actual = parseFloat(rawDigits) || 0;
    var pct = target > 0 ? Math.min(Math.round(100 * actual / target), 999) : 0;
    var hiddenPct = item.querySelector('.rv-pct');
    if (hiddenPct) hiddenPct.value = pct;
    var display = item.querySelector('.rv-pct-display');
    if (display) {
        display.textContent = pct + '%';
        if (pct >= 100) display.style.color = '#059669';
        else if (pct >= 50) display.style.color = '#f59e0b';
        else display.style.color = '#ef4444';
    }
};

window.mcSaleReviewUserModalPostRender = function(readOnly) {
    if (!readOnly) {
        setTimeout(function() {
            var sliders = document.querySelectorAll('.mcSaleRevPct');
            sliders.forEach(function(s) {
                s.oninput = function() { s.nextElementSibling.textContent = s.value + '%'; };
            });
        }, 100);
    }
};

window.mcSaleSaveReview = async function() {
    var items = document.querySelectorAll('#mcSaleReviewBody [data-review-id]');
    var reviews = [];
    var hasError = false;
    var zeroPctError = false;

    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        el.style.border = '';
        el.style.boxShadow = '';
        var actualInput = el.querySelector('.rv-actual');
        var pctInput = el.querySelector('.rv-pct');
        var pct = pctInput ? (parseInt(pctInput.value) || 0) : 0;

        if (actualInput) {
            actualInput.style.borderColor = '';
            actualInput.style.boxShadow = '';
            if (!actualInput.value.trim()) {
                actualInput.style.borderColor = '#ef4444';
                actualInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
                el.style.border = '2px solid #ef4444';
                el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
                hasError = true;
            }
        } else {
            if (pct <= 0) {
                zeroPctError = true;
                el.style.border = '2px solid #ef4444';
                el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
            }
        }
    }

    if (hasError) {
        return alert('⚠️ Vui lòng nhập đầy đủ số liệu "Đã đạt" cho tất cả các cam kết có mục tiêu!');
    }
    if (zeroPctError) {
        return alert('⚠️ Vui lòng điều chỉnh thanh tiến độ (không được để 0%) cho tất cả các cam kết!');
    }

    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var pctInput = el.querySelector('.rv-pct');
        var pct = pctInput ? (parseInt(pctInput.value) || 0) : 0;
        var noteEl = el.querySelector('.rv-note');
        var note = noteEl ? noteEl.value.trim() : '';
        reviews.push({
            id: parseInt(el.getAttribute('data-review-id')),
            completion_pct: pct,
            is_completed: pct >= 100,
            review_note: note
        });
    }
    try {
        await apiCall('/api/meeting-commitments/batch-review', 'PUT', { reviews: reviews });
        var modalOverlay = document.querySelector('.kpi-mc-modal-overlay');
        if (modalOverlay) modalOverlay.remove();
        loadKpiSaleData();
        if (window.showToast) showToast('✅ Đã lưu Review cam kết thành công!', 'success');
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window.mcSaleEditTeam = async function(deptId, teamName) {
    if (!_mcSaleSession) return alert('Chưa chọn cuộc họp');
    var existing = _mcSaleCommitments.filter(function(c) { return c.team_dept_id === deptId; });
    var items = [];

    var tplList = [];
    try {
        var tplRes = await apiCall('/api/meeting-commitments/templates?page_key=kpisale_team');
        tplList = tplRes.templates || [];
    } catch(e) {}

    if (existing.length > 0) {
        items = existing.map(function(c, idx) {
            var parsed = mcSaleParseContent(c.content);
            var matchedTpl = tplList[idx];
            var isTpl = !!(matchedTpl && (parsed.question === matchedTpl.question_content || !parsed.question));
            var hasRev = (c.target_revenue > 0) || !!(matchedTpl && matchedTpl.has_revenue_target);
            return {
                question: parsed.question || (matchedTpl ? matchedTpl.question_content : ''),
                answer: parsed.answer,
                content: c.content,
                target_revenue: c.target_revenue,
                hasRevenue: hasRev,
                isTemplate: isTpl
            };
        });
    } else {
        if (tplList.length > 0) {
            items = tplList.map(function(t) {
                return { question: t.question_content, answer: '', target_revenue: 0, isTemplate: true, hasRevenue: !!t.has_revenue_target };
            });
        } else {
            items = [{ question: '', answer: '', target_revenue: 0, isTemplate: false }];
        }
    }

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var sessionInfo = '';
    if (_mcSaleSession) {
        var dateParts = _mcSaleSession.meeting_date.split('T')[0].split('-');
        var sdStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
        sessionInfo = ' <span style="font-size:13px;font-weight:500;color:#92400e;display:block;margin-top:2px">— PHÒNG SALE - THÁNG ' + dateParts[1] + '/' + dateParts[0] + ' (' + sdStr + ')</span>';
    }

    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>📝 Cam Kết Team — ' + teamName + sessionInfo + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body"><div id="mcSaleTeamItemsList">';

    for (var i = 0; i < items.length; i++) {
        h += mcSaleRenderItemEdit(i + 1, items[i]);
    }

    h += '</div>'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSaleAddTeamItem()" style="width:100%;margin-top:10px">➕ Thêm cam kết team</button>'
        + '</div>'
        + '<div class="kpi-mc-modal-foot">'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
        + '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSaveTeam(' + deptId + ')">💾 Lưu Cam Kết Team</button>'
        + '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window.mcSaleAddTeamItem = function() {
    var list = document.getElementById('mcSaleTeamItemsList');
    if (!list) return;
    var count = list.querySelectorAll('[data-mc-item]').length;
    list.insertAdjacentHTML('beforeend', mcSaleRenderItemEdit(count + 1, { isTemplate: false, question: '', answer: '', target_revenue: 0 }));
};

window.mcSaleSaveTeam = async function(deptId) {
    // Validate required fields
    var requiredEls = document.querySelectorAll('#mcSaleTeamItemsList .mc-required');
    var hasError = false;
    for (var r = 0; r < requiredEls.length; r++) {
        var field = requiredEls[r];
        field.style.borderColor = '';
        if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
            field.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
            hasError = true;
        } else {
            field.style.boxShadow = '';
        }
    }
    // Validate required number fields (must be > 0)
    var requiredNums = document.querySelectorAll('#mcSaleTeamItemsList .mc-required-num');
    for (var n = 0; n < requiredNums.length; n++) {
        var numField = requiredNums[n];
        numField.style.borderColor = '';
        var numVal = parseFloat(numField.value) || 0;
        if (numVal <= 0) {
            numField.style.borderColor = '#ef4444';
            numField.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
            hasError = true;
        } else {
            numField.style.boxShadow = '';
        }
    }
    if (hasError) {
        return alert('⚠️ Vui lòng điền đầy đủ các trường bắt buộc (*)');
    }

    var itemEls = document.querySelectorAll('#mcSaleTeamItemsList [data-mc-item]');
    var commitments = [];
    for (var i = 0; i < itemEls.length; i++) {
        var el = itemEls[i];
        var dataType = el.getAttribute('data-type');
        var question = '', answer = '', revenue = 0;

        if (dataType === 'tpl') {
            question = el.querySelector('.mc-question') ? el.querySelector('.mc-question').textContent : '';
            answer = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
            var revEl = el.querySelector('.mc-revenue');
            revenue = revEl ? parseFloat(revEl.value) || 0 : 0;
        } else {
            var qEdit = el.querySelector('.mc-question-edit');
            question = qEdit ? qEdit.value.trim() : '';
            answer = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
            var revEl2 = el.querySelector('.mc-revenue');
            revenue = revEl2 ? parseFloat(revEl2.value) || 0 : 0;
        }

        if (question || answer) {
            commitments.push({
                content: '❓ ' + question + '\n✅ ' + answer,
                target_revenue: revenue
            });
        }
    }
    if (commitments.length === 0) return alert('Vui lòng nhập ít nhất 1 cam kết');
    try {
        await apiCall('/api/meeting-commitments', 'POST', {
            session_id: _mcSaleSession.id,
            department_id: deptId,
            items: commitments
        });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        loadKpiSaleData();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window.mcSaleReviewTeam = async function(deptId, teamName, readOnly) {
    if (!_mcSaleSession) return alert('Chưa chọn cuộc họp');
    var teamCommits = _mcSaleCommitments.filter(function(c) { return c.team_dept_id === deptId; });
    if (teamCommits.length === 0) return alert('Chưa có cam kết team nào');

    var tplList = [];
    try {
        var tplRes = await apiCall('/api/meeting-commitments/templates?page_key=kpisale_team');
        tplList = tplRes.templates || [];
    } catch(e) {}

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var modalTitle = readOnly ? '👁️ Xem Cam Kết Team — ' + teamName : '✅ Review Team — ' + teamName;
    var h = '<div class="kpi-mc-modal" style="width:700px">'
        + '<div class="kpi-mc-modal-head"><h3>' + modalTitle + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body" id="mcSaleTeamReviewBody">';

    for (var i = 0; i < teamCommits.length; i++) {
        var c = teamCommits[i];
        var parsed = mcSaleParseContent(c.content);
        var qText = parsed.question || c.content;
        var aText = parsed.answer || '';

        var matchedTpl = tplList.find(function(t) { return t.question_content === qText; }) || tplList[i];
        var hasTarget = (c.target_revenue > 0) || !!(matchedTpl && matchedTpl.has_revenue_target);

        var contentHtml = '';
        contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:8px;border-left:3px solid #4338ca;margin-bottom:8px">';
        contentHtml += '<div style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">📋 CÂU HỎI</div>';
        contentHtml += '<div style="font-size:13px;font-weight:600;color:#1e293b">' + qText + '</div>';
        contentHtml += '</div>';

        contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:8px;border-left:3px solid #059669;margin-bottom:8px">';
        contentHtml += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">✍️ CÂU TRẢ LỜI</div>';
        contentHtml += '<div style="font-size:13px;color:#1e293b;white-space:pre-line">' + (aText || '<em style="color:#9ca3af">(Chưa nhập)</em>') + '</div>';
        contentHtml += '</div>';

        if (hasTarget) {
            contentHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:10px">';
            contentHtml += '<span style="font-size:13px;font-weight:700;color:#b45309">🎯 Mục tiêu:</span>';
            contentHtml += '<span style="font-size:16px;font-weight:800;color:#d97706">' + Number(c.target_revenue || 0).toLocaleString('vi-VN') + '</span>';
            contentHtml += '</div>';
        }

        h += '<div class="kpi-mc-item" data-review-id="' + c.id + '" data-has-target="' + (hasTarget ? '1' : '0') + '" data-target="' + (c.target_revenue || 0) + '">'
            + '<div class="kpi-mc-item-head"><div class="kpi-mc-item-stt">' + (i + 1) + '</div>'
            + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Cam kết #' + (i + 1) + '</div></div>'
            + contentHtml;

        if (hasTarget) {
            var currentPct = c.completion_pct || 0;
            var currentActual = (c.target_revenue > 0) && currentPct > 0 ? Math.round(c.target_revenue * currentPct / 100) : '';
            var currentActualStr = currentActual ? Number(currentActual).toLocaleString('vi-VN') : '';
            h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#7c3aed;white-space:nowrap">📊 Đã đạt:</span>';
            h += '<input class="kpi-mc-input rv-actual" type="text" inputmode="numeric" placeholder="Nhập số liệu hoàn thành..." value="' + currentActualStr + '" style="flex:1;border-color:#c4b5fd;font-weight:700" oninput="mcSaleCalcPct(this)"' + (readOnly ? ' disabled' : '') + '>';
            h += '<span class="rv-pct-display" style="font-size:14px;font-weight:800;color:#4338ca;min-width:50px;text-align:right">' + currentPct + '%</span>';
            h += '</div>';
            h += '<input type="hidden" class="rv-pct" value="' + currentPct + '">';
        } else {
            h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">📊 Tiến độ:</span>';
            h += '<div style="flex:1"><input type="range" class="rv-pct" min="0" max="100" value="' + (c.completion_pct || 0) + '" style="width:100%" oninput="this.nextElementSibling.textContent=this.value+\'%\'"' + (readOnly ? ' disabled' : '') + '><span style="font-size:12px;font-weight:700;color:#4338ca">' + (c.completion_pct || 0) + '%</span></div>';
            h += '</div>';
        }

        h += '<div style="margin-top:10px;padding:8px 12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:8px;border-left:3px solid #059669">';
        h += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✍️ Trao Đổi Kết Quả</div>';
        h += '<input class="kpi-mc-input rv-note" placeholder="Nhập nội dung trao đổi kết quả..." value="' + (c.review_note || '') + '" style="background:#fff;border-color:#a7f3d0;font-size:12px;font-weight:600;color:#064e3b"' + (readOnly ? ' disabled' : '') + '>';
        h += '</div>';
        h += '</div>';
    }

    h += '</div><div class="kpi-mc-modal-foot">';
    if (readOnly) {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Đóng</button>';
    } else {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaleSaveTeamReview()">💾 Lưu Review</button>';
    }
    h += '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window.mcSaleSaveTeamReview = async function() {
    var items = document.querySelectorAll('#mcSaleTeamReviewBody [data-review-id]');
    var reviews = [];
    var hasError = false;
    var zeroPctError = false;

    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        el.style.border = '';
        el.style.boxShadow = '';
        var actualInput = el.querySelector('.rv-actual');
        var pctInput = el.querySelector('.rv-pct');
        var pct = pctInput ? (parseInt(pctInput.value) || 0) : 0;

        if (actualInput) {
            actualInput.style.borderColor = '';
            actualInput.style.boxShadow = '';
            if (!actualInput.value.trim()) {
                actualInput.style.borderColor = '#ef4444';
                actualInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
                el.style.border = '2px solid #ef4444';
                el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
                hasError = true;
            }
        } else {
            if (pct <= 0) {
                zeroPctError = true;
                el.style.border = '2px solid #ef4444';
                el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
            }
        }
    }

    if (hasError) {
        return alert('⚠️ Vui lòng nhập đầy đủ số liệu "Đã đạt" cho tất cả các cam kết team có mục tiêu!');
    }
    if (zeroPctError) {
        return alert('⚠️ Vui lòng điều chỉnh thanh tiến độ (không được để 0%) cho tất cả các cam kết team!');
    }

    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var pctInput = el.querySelector('.rv-pct');
        var pct = pctInput ? (parseInt(pctInput.value) || 0) : 0;
        var noteEl = el.querySelector('.rv-note');
        var note = noteEl ? noteEl.value.trim() : '';
        reviews.push({
            id: parseInt(el.getAttribute('data-review-id')),
            completion_pct: pct,
            is_completed: pct >= 100,
            review_note: note
        });
    }
    try {
        await apiCall('/api/meeting-commitments/batch-review', 'PUT', { reviews: reviews });
        var modalOverlay = document.querySelector('.kpi-mc-modal-overlay');
        if (modalOverlay) modalOverlay.remove();
        loadKpiSaleData();
        if (window.showToast) showToast('✅ Đã lưu Review cam kết team thành công!', 'success');
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// Template setup functions — define if not already loaded from kpikdoanh.js
if (!window.mcSetupTemplates) {
    function mcRenderTplItemSale(stt, content, hasRevenue) {
        return '<div class="kpi-mc-item" data-tpl-item>'
            + '<div class="kpi-mc-item-head">'
            + '<div class="kpi-mc-item-stt">' + stt + '</div>'
            + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Câu hỏi #' + stt + '</div>'
            + '<button class="kpi-mc-remove" onclick="this.closest(\'[data-tpl-item]\').remove();mcReindexTpl()">✕</button>'
            + '</div>'
            + '<textarea class="kpi-mc-input tpl-content" rows="2" placeholder="VD: Mục tiêu giai đoạn tiếp theo?" style="margin-bottom:8px;resize:vertical">' + (content || '') + '</textarea>'
            + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;cursor:pointer"><input type="checkbox" class="tpl-has-rev"' + (hasRevenue ? ' checked' : '') + '> Có ô nhập mục tiêu</label>'
            + '</div>';
    }

    window.mcSetupTemplates = async function(pageKey, label) {
        pageKey = pageKey || 'kpisale';
        label = label || 'Cá Nhân';
        window._mcTplPageKey = pageKey;
        var overlay = document.createElement('div');
        overlay.className = 'kpi-mc-modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
        var templates = [];
        try {
            var res = await apiCall('/api/meeting-commitments/templates?page=' + pageKey);
            templates = res.templates || [];
        } catch(e) {}
        var srcLabel = pageKey.indexOf('kpisale') >= 0 ? 'KPI P.Sale' : 'KPI P.Kinh Doanh';
        var h = '<div class="kpi-mc-modal" style="max-width:600px">'
            + '<div class="kpi-mc-modal-head"><h3>⚙️ Câu Hỏi Mẫu ' + label + ' — ' + srcLabel + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
            + '<div class="kpi-mc-modal-body">'
            + '<div style="margin-bottom:12px;padding:10px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#166534">💡 Các câu hỏi mẫu sẽ tự động điền vào form khi bấm "📝 Ghi" cho nhân viên chưa có cam kết.</div>'
            + '<div id="mcTplList">';
        if (templates.length === 0) {
            h += mcRenderTplItemSale(1, '', false);
        } else {
            for (var i = 0; i < templates.length; i++) {
                h += mcRenderTplItemSale(i + 1, templates[i].question_content, templates[i].has_revenue_target);
            }
        }
        h += '</div>'
            + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcAddTplItem()" style="width:100%;margin-top:10px">➕ Thêm câu hỏi</button>'
            + '</div>'
            + '<div class="kpi-mc-modal-foot">'
            + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
            + '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveTemplates()">💾 Lưu Câu Hỏi Mẫu</button>'
            + '</div></div>';
        overlay.innerHTML = h;
        document.body.appendChild(overlay);
    };

    window.mcAddTplItem = function() {
        var list = document.getElementById('mcTplList');
        if (!list) return;
        var count = list.querySelectorAll('[data-tpl-item]').length;
        list.insertAdjacentHTML('beforeend', mcRenderTplItemSale(count + 1, '', false));
    };

    window.mcReindexTpl = function() {
        var items = document.querySelectorAll('[data-tpl-item]');
        for (var i = 0; i < items.length; i++) {
            items[i].querySelector('.kpi-mc-item-stt').textContent = (i + 1);
        }
    };

    window.mcSaveTemplates = async function() {
        var items = document.querySelectorAll('[data-tpl-item]');
        var data = [];
        for (var i = 0; i < items.length; i++) {
            var content = items[i].querySelector('.tpl-content').value.trim();
            var hasRev = items[i].querySelector('.tpl-has-rev').checked;
            if (content) data.push({ question_content: content, has_revenue_target: hasRev });
        }
        try {
            await apiCall('/api/meeting-commitments/templates', 'PUT', { page_key: window._mcTplPageKey || 'kpisale', items: data });
            document.querySelector('.kpi-mc-modal-overlay').remove();
            alert('✅ Đã lưu ' + data.length + ' câu hỏi mẫu!');
        } catch(e) { alert('Lỗi: ' + (e.message || '')); }
    };
}

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
function kpiSaleFmtCurrencyStr(str) {
    if (!str && str !== 0) return '';
    const clean = String(str).trim();
    if (!clean) return '';
    const digits = clean.replace(/\D/g, '');
    if (!digits) return clean;
    return Number(digits).toLocaleString('vi-VN') + 'đ';
}

function kpiSaleOnMoneyInput(input, userId, isMoc1 = false) {
    if (!input) return;
    let raw = input.value.replace(/\D/g, '');
    if (!raw) {
        input.value = '';
    } else {
        input.value = Number(raw).toLocaleString('vi-VN') + 'đ';
    }
    if (isMoc1) {
        kpiSaleCalcMoc120(userId, raw);
    }
}
window.kpiSaleFmtCurrencyStr = kpiSaleFmtCurrencyStr;
window.kpiSaleOnMoneyInput = kpiSaleOnMoneyInput;

function kpiSaleApplyTeamSumTarget(teamId) {
    if (!teamId) return;
    const empInputs = document.querySelectorAll(`.modal-team-row-${teamId} .kpi-sale-target-input`);
    let total = 0;
    empInputs.forEach(inp => {
        const val = parseFloat(inp.value.replace(/\D/g, '')) || 0;
        total += val;
    });
    const teamInput = document.getElementById(`kpiSaleTeamTargetM1_${teamId}`);
    if (teamInput) {
        teamInput.value = total > 0 ? (total.toLocaleString('vi-VN') + 'đ') : '0đ';
        kpiSaleCalcMoc120('dept_' + teamId, total);
        if (typeof showToast === 'function') {
            showToast(`⚡ Đã áp dụng Tổng Target Nhân Viên (${total.toLocaleString('vi-VN')}đ) cho Team!`, 'info');
        }
    }
}
window.kpiSaleApplyTeamSumTarget = kpiSaleApplyTeamSumTarget;

function kpiSaleCalcMoc120(userId, rawVal) {
    const el = document.getElementById('kpiSaleTargetM2_' + userId);
    if (!el) return;
    const num = parseFloat(rawVal) || 0;
    const m120 = Math.round(num * 1.2);
    el.value = num > 0 ? (m120.toLocaleString('vi-VN') + 'đ') : '';
}
window.kpiSaleCalcMoc120 = kpiSaleCalcMoc120;

function kpiSaleOpenTargetModal() {
    const modal = document.getElementById('kpiSaleTargetModal');
    const periodSpan = document.getElementById('kpiSaleTargetModalPeriod');
    const formBody = document.getElementById('kpiSaleTargetFormBody');
    if (!modal || !_kpiSale.data) return;

    const [year, mo] = _kpiSale.month.split('-');
    if (periodSpan) periodSpan.textContent = `Tháng ${mo}/${year}`;

    // Reset search input
    const searchInp = document.getElementById('kpiSaleModalSearchInput');
    if (searchInp) searchInp.value = '';

    const teams = _kpiSale.data.teams || [];
    let totalEmps = 0;
    teams.forEach(t => totalEmps += (t.employees || []).length);

    // Build Team Filter Tabs
    let filterTabsHtml = `
        <button type="button" class="kpi-target-modal-tab-btn active" data-team-id="all" onclick="kpiSaleFilterTargetModalTeam('all', this)" style="padding:4px 12px;border-radius:9999px;font-size:11.5px;font-weight:700;border:1px solid #2563eb;background:#2563eb;color:white;cursor:pointer;transition:all 0.15s ease">
            Tất Cả (${totalEmps})
        </button>
    `;

    teams.forEach(team => {
        const empCount = (team.employees || []).length;
        filterTabsHtml += `
            <button type="button" class="kpi-target-modal-tab-btn" data-team-id="${team.dept_id}" onclick="kpiSaleFilterTargetModalTeam('${team.dept_id}', this)" style="padding:4px 12px;border-radius:9999px;font-size:11.5px;font-weight:700;border:1px solid #cbd5e1;background:white;color:#334155;cursor:pointer;transition:all 0.15s ease">
                👥 ${escapeHtml(team.dept_name)} (${empCount})
            </button>
        `;
    });

    let tableRows = '';
    let globalStt = 1;

    teams.forEach(team => {
        const emps = team.employees || [];
        if (emps.length === 0) return;

        const teamT1 = team.target_1 || 0;
        const teamT1Str = teamT1 > 0 ? (Number(teamT1).toLocaleString('vi-VN') + 'đ') : '';
        const teamT120Str = teamT1 > 0 ? (Math.round(teamT1 * 1.2).toLocaleString('vi-VN') + 'đ') : '';
        const teamBonusM1Str = kpiSaleFmtCurrencyStr(team.target_bonus_m1);
        const teamBonusM120Str = kpiSaleFmtCurrencyStr(team.target_bonus_m120);

        // Team Sub-Header Row with Inputs
        tableRows += `
            <tr class="kpi-target-modal-team-group" data-team-id="${team.dept_id}" style="background:linear-gradient(90deg,#dbeafe,#eff6ff);border-top:3px solid #2563eb;border-bottom:1.5px solid #bfdbfe">
                <td style="padding:7px 8px;text-align:center;font-weight:900;color:#1e3a8a;width:35px">👥</td>
                <td style="padding:7px 10px;font-weight:900;color:#1e3a8a;min-width:140px;font-size:12.5px">
                    <div>TEAM: ${escapeHtml(team.dept_name)}</div>
                    <div style="font-size:10.5px;color:#1d4ed8;font-weight:700">🏆 THƯỞNG TẬP THỂ</div>
                </td>
                <td style="padding:7px 6px;width:160px">
                    <div style="display:flex;align-items:center;gap:4px">
                        <button type="button" onclick="kpiSaleApplyTeamSumTarget('${team.dept_id}')" title="⚡ Click để tự động tính = Tổng Target NV trong Team" style="padding:4px 6px;font-size:12px;font-weight:800;color:#1d4ed8;background:#dbeafe;border:1.5px solid #93c5fd;border-radius:8px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s ease" onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='#dbeafe'">
                            ⚡
                        </button>
                        <input type="text" id="kpiSaleTeamTargetM1_${team.dept_id}" class="kpi-input kpi-sale-team-target-input" data-dept-id="${team.dept_id}" value="${teamT1Str}" oninput="kpiSaleOnMoneyInput(this, 'dept_${team.dept_id}', true)" placeholder="" style="font-weight:800;color:#1d4ed8;text-align:right;padding:6px 6px;font-size:12px;flex:1;min-width:0;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:8px;outline:none">
                    </div>
                </td>
                <td style="padding:7px 6px;width:145px">
                    <input type="text" id="kpiSaleTargetM2_dept_${team.dept_id}" class="kpi-input" readonly disabled value="${teamT120Str}" style="font-weight:800;color:#6b21a8;background:#f3e8ff;border:1.5px solid #ddd6fe;border-radius:8px;text-align:right;cursor:not-allowed;padding:6px 6px;font-size:12px;width:100%">
                </td>
                <td style="padding:7px 6px;width:140px">
                    <input type="text" class="kpi-input kpi-sale-team-bonus-m1-input" data-dept-id="${team.dept_id}" value="${escapeHtml(teamBonusM1Str)}" oninput="kpiSaleOnMoneyInput(this, 'dept_${team.dept_id}')" placeholder="" style="font-weight:800;color:#15803d;text-align:right;padding:6px 6px;font-size:12px;width:100%;background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;outline:none">
                </td>
                <td style="padding:7px 6px;width:140px">
                    <input type="text" class="kpi-input kpi-sale-team-bonus-m120-input" data-dept-id="${team.dept_id}" value="${escapeHtml(teamBonusM120Str)}" oninput="kpiSaleOnMoneyInput(this, 'dept_${team.dept_id}')" placeholder="" style="font-weight:800;color:#b91c1c;text-align:right;padding:6px 6px;font-size:12px;width:100%;background:#fff1f2;border:1.5px solid #fca5a5;border-radius:8px;outline:none">
                </td>
                <td style="padding:7px 8px;min-width:150px">
                    <input type="text" class="kpi-input kpi-sale-team-bonus-cond-input" data-dept-id="${team.dept_id}" value="${escapeHtml(team.target_bonus_conditions || '')}" placeholder="" style="font-size:12px;color:#1e293b;font-weight:600;padding:6px 8px;width:100%;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:8px;outline:none">
                </td>
            </tr>
        `;

        emps.forEach(emp => {
            const roleLabel = ['truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(emp.role) || emp.username === 'truongphongsale' ? 'Trưởng Phòng' : 'Nhân Viên';
            const m1Val = emp.target ? (Number(emp.target).toLocaleString('vi-VN') + 'đ') : '';
            const m120Val = emp.target ? (Math.round(emp.target * 1.2).toLocaleString('vi-VN') + 'đ') : '';
            const bonusM1Val = kpiSaleFmtCurrencyStr(emp.target_bonus_m1);
            const bonusM120Val = kpiSaleFmtCurrencyStr(emp.target_bonus_m120);
            const bgRow = globalStt % 2 === 0 ? '#f8fafc' : '#ffffff';

            tableRows += `
                <tr class="kpi-target-modal-emp-row modal-team-row-${team.dept_id}" data-search-text="${escapeHtml((emp.full_name + ' ' + (emp.username || '')).toLowerCase())}" style="background:${bgRow};border-bottom:1px solid #e2e8f0">
                    <td style="padding:7px 8px;text-align:center;font-weight:700;color:#64748b;width:35px">${globalStt++}</td>
                    <td style="padding:7px 10px;font-weight:800;color:#1e1b4b;min-width:140px">
                        <div style="display:flex;align-items:center;gap:6px;padding-left:10px">
                            <span style="color:#94a3b8;font-weight:700">└─</span>
                            <div>
                                <div>👤 ${escapeHtml(emp.full_name)}</div>
                                <div style="font-size:10.5px;color:#4338ca;margin-top:1px">
                                    <span style="background:#e0e7ff;padding:1px 7px;border-radius:9999px;font-weight:700">(${roleLabel})</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td style="padding:7px 6px;width:160px">
                        <input type="text" class="kpi-input kpi-sale-target-input" data-user-id="${emp.user_id}" value="${m1Val}" oninput="kpiSaleOnMoneyInput(this, ${emp.user_id}, true)" placeholder="" style="font-weight:800;color:#2563eb;text-align:right;padding:6px 6px;font-size:12px;width:100%;border:1.5px solid #cbd5e1;border-radius:8px;outline:none">
                    </td>
                    <td style="padding:7px 6px;width:145px">
                        <input type="text" id="kpiSaleTargetM2_${emp.user_id}" class="kpi-input" readonly disabled value="${m120Val}" style="font-weight:800;color:#7c3aed;background:#f3e8ff;border:1.5px solid #ddd6fe;border-radius:8px;text-align:right;cursor:not-allowed;padding:6px 6px;font-size:12px;width:100%">
                    </td>
                    <td style="padding:7px 6px;width:140px">
                        <input type="text" class="kpi-input kpi-sale-bonus-m1-input" data-user-id="${emp.user_id}" value="${escapeHtml(bonusM1Val)}" oninput="kpiSaleOnMoneyInput(this, ${emp.user_id})" placeholder="" style="font-weight:800;color:#15803d;text-align:right;padding:6px 6px;font-size:12px;width:100%;border:1.5px solid #cbd5e1;border-radius:8px;outline:none">
                    </td>
                    <td style="padding:7px 6px;width:140px">
                        <input type="text" class="kpi-input kpi-sale-bonus-m120-input" data-user-id="${emp.user_id}" value="${escapeHtml(bonusM120Val)}" oninput="kpiSaleOnMoneyInput(this, ${emp.user_id})" placeholder="" style="font-weight:800;color:#b91c1c;text-align:right;padding:6px 6px;font-size:12px;width:100%;border:1.5px solid #cbd5e1;border-radius:8px;outline:none">
                    </td>
                    <td style="padding:7px 8px;min-width:150px">
                        <input type="text" class="kpi-input kpi-sale-bonus-cond-input" data-user-id="${emp.user_id}" value="${escapeHtml(emp.target_bonus_conditions || '')}" placeholder="" style="font-size:12px;color:#334155;padding:6px 6px;width:100%;border:1.5px solid #cbd5e1;border-radius:8px;outline:none">
                    </td>
                </tr>
            `;
        });
    });

    let html = `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            ${filterTabsHtml}
        </div>
        <div style="max-height:58vh;overflow-y:auto;overflow-x:hidden;border:1.5px solid #cbd5e1;border-radius:10px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.02)">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead style="position:sticky;top:0;z-index:3;border-bottom:2px solid #cbd5e1">
                    <tr>
                        <th style="padding:9px 8px;text-align:center;width:35px;background:#f8fafc!important;color:#475569!important;font-weight:800">STT</th>
                        <th style="padding:9px 10px;text-align:left;min-width:140px;background:#f8fafc!important;color:#0f172a!important;font-weight:800">👤 Nhân Viên</th>
                        <th style="padding:9px 8px;text-align:center;width:130px;background:#eff6ff!important;color:#1d4ed8!important;font-weight:800">🎯 Target Mốc 1 (100%)</th>
                        <th style="padding:9px 8px;text-align:center;width:130px;background:#f3e8ff!important;color:#6b21a8!important;font-weight:800">🚀 Target Mốc 2 (120%)</th>
                        <th style="padding:9px 8px;text-align:center;width:130px;background:#f0fdf4!important;color:#15803d!important;font-weight:800">🎁 Thưởng Mốc 1 (100%)</th>
                        <th style="padding:9px 8px;text-align:center;width:130px;background:#fff1f2!important;color:#b91c1c!important;font-weight:800">🏆 Thưởng Mốc 2 (120%)</th>
                        <th style="padding:9px 10px;text-align:left;min-width:150px;background:#f8fafc!important;color:#334155!important;font-weight:800">📝 Tiêu Chí Xét Thưởng</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;

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
        const val = parseFloat(inp.value.replace(/\D/g, '')) || 0;
        const bonusM1El = document.querySelector(`.kpi-sale-bonus-m1-input[data-user-id="${userId}"]`);
        const bonusM120El = document.querySelector(`.kpi-sale-bonus-m120-input[data-user-id="${userId}"]`);
        const bonusCondEl = document.querySelector(`.kpi-sale-bonus-cond-input[data-user-id="${userId}"]`);

        if (userId) {
            targets.push({
                user_id: userId,
                target_value: val,
                target_bonus_m1: bonusM1El ? bonusM1El.value.trim() : '',
                target_bonus_m120: bonusM120El ? bonusM120El.value.trim() : '',
                target_bonus_conditions: bonusCondEl ? bonusCondEl.value.trim() : ''
            });
        }
    });

    const teamInputs = document.querySelectorAll('.kpi-sale-team-target-input');
    teamInputs.forEach(inp => {
        const deptId = parseInt(inp.getAttribute('data-dept-id'));
        const val = parseFloat(inp.value.replace(/\D/g, '')) || 0;
        const bonusM1El = document.querySelector(`.kpi-sale-team-bonus-m1-input[data-dept-id="${deptId}"]`);
        const bonusM120El = document.querySelector(`.kpi-sale-team-bonus-m120-input[data-dept-id="${deptId}"]`);
        const bonusCondEl = document.querySelector(`.kpi-sale-team-bonus-cond-input[data-dept-id="${deptId}"]`);

        if (deptId) {
            targets.push({
                target_type: 'dept',
                dept_id: deptId,
                target_value: val,
                target_bonus_m1: bonusM1El ? bonusM1El.value.trim() : '',
                target_bonus_m120: bonusM120El ? bonusM120El.value.trim() : '',
                target_bonus_conditions: bonusCondEl ? bonusCondEl.value.trim() : ''
            });
        }
    });

    if (!_kpiSale.data || !_kpiSale.data.month) return;
    const periodValue = _kpiSale.data.month.label;

    try {
        const res = await apiCall('/api/kpi-targets/kpi-sale', 'POST', {
            targets,
            period_value: periodValue
        });

        if (res.success) {
            showToast('✅ Đã lưu KPI & Thưởng Phòng Sale thành công!', 'success');
            kpiSaleCloseTargetModal();
            loadKpiSaleData();
        }
    } catch(err) {
        showToast('❌ Lỗi khi lưu KPI Phòng Sale: ' + err.message, 'error');
    }
}

// Order Details Modal
let _kpiSaleModalOrders = [];
let _kpiSaleModalFilterLv = 'all';
let _kpiSaleModalFilterCust = 'all';

function _kpiSaleEnsureOrdersModal() {
    let modal = document.getElementById('kpiSaleOrdersModal');
    if (modal) {
        modal.remove(); // Re-create to ensure latest styled layout
    }
    modal = document.createElement('div');
    modal.className = 'kpi-modal-overlay';
    modal.id = 'kpiSaleOrdersModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.6);z-index:99999!important;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px';
    modal.innerHTML = `
        <div class="kpi-modal" style="background:#fff;border-radius:20px;width:1300px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.4);display:flex;flex-direction:column;padding:24px;color:#1e293b">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px">
                <h3 style="font-size:16px;font-weight:800;color:#1e293b;margin:0;display:flex;align-items:center;gap:8px">📦 Chi Tiết Đơn Hàng — <span id="kpiSaleOrdersModalTitle"></span></h3>
                <button type="button" onclick="kpiSaleCloseOrdersModal()" style="background:#f1f5f9;border:none;color:#64748b;font-size:18px;font-weight:800;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:all .2s;flex-shrink:0">✕</button>
            </div>
            <div id="kpiSaleOrdersModalSummary" style="background:#f8fafc;padding:10px 14px;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700;flex-wrap:wrap"></div>
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
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) kpiSaleCloseOrdersModal();
    });
    return modal;
}

window.kpiSaleFilterModalLv = function(lvType) {
    _kpiSaleModalFilterLv = lvType;
    kpiSaleApplyModalFilters();
};

window.kpiSaleFilterModalCust = function(custType) {
    _kpiSaleModalFilterCust = custType;
    kpiSaleApplyModalFilters();
};

function _kpiSaleCleanPhone(phone) {
    if (!phone || phone.startsWith('pancake_')) return '—';
    return phone;
}

function kpiSaleApplyModalFilters() {
    const tbody = document.getElementById('kpiSaleOrdersModalBody');
    if (!tbody || !_kpiSaleModalOrders) return;

    document.querySelectorAll('#kpiSaleOrdersModalSummary .kpi-lv-btn').forEach(btn => {
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

    let lvOrders = _kpiSaleModalOrders;
    if (_kpiSaleModalFilterLv === 'dp') {
        lvOrders = _kpiSaleModalOrders.filter(o => !o.is_pet_tem);
    } else if (_kpiSaleModalFilterLv === 'pettem') {
        lvOrders = _kpiSaleModalOrders.filter(o => o.is_pet_tem);
    }

    const countMoi = lvOrders.filter(o => o.customer_type === 'moi').length;
    const countCu = lvOrders.filter(o => o.customer_type === 'cu').length;

    const btnMoi = document.querySelector('#kpiSaleOrdersModalSummary .kpi-cust-btn[data-cust="moi"]');
    const btnCu = document.querySelector('#kpiSaleOrdersModalSummary .kpi-cust-btn[data-cust="cu"]');
    if (btnMoi) btnMoi.innerHTML = `🟢 Khách Mới (<strong style="color:#16a34a">${countMoi}</strong>)`;
    if (btnCu) btnCu.innerHTML = `🟧 Khách Cũ (<strong style="color:#b45309">${countCu}</strong>)`;

    document.querySelectorAll('#kpiSaleOrdersModalSummary .kpi-cust-btn').forEach(btn => {
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
            <button type="button" class="kpi-lv-btn" data-lv="all" onclick="kpiSaleFilterModalLv('all')" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#1e293b">Tất cả lĩnh vực (<strong style="color:#2563eb">${s.total || 0}</strong>)</button>
            <button type="button" class="kpi-lv-btn" data-lv="dp" onclick="kpiSaleFilterModalLv('dp')" style="padding:4px 12px;border-radius:8px;border:1px solid #fed7aa;background:#fff7ed;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#c2410c">👔 LV Đồng Phục (<strong style="color:#c2410c">${s.total_lv_dp || 0}</strong>)</button>
            <button type="button" class="kpi-lv-btn" data-lv="pettem" onclick="kpiSaleFilterModalLv('pettem')" style="padding:4px 12px;border-radius:8px;border:1px solid #fbcfe8;background:#fdf2f8;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#be185d">🏷️ LV PET/TEM (<strong style="color:#be185d">${s.total_lv_pettem || 0}</strong>)</button>
        </div>

        <!-- Hàng 2: Chọn Loại Khách Hàng -->
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:115px;display:flex;align-items:center;gap:4px">
                👥 <strong>Loại Khách:</strong>
            </span>
            <button type="button" class="kpi-cust-btn" data-cust="all" onclick="kpiSaleFilterModalCust('all')" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#1e293b">Tất cả khách</button>
            <button type="button" class="kpi-cust-btn" data-cust="moi" onclick="kpiSaleFilterModalCust('moi')" style="padding:4px 12px;border-radius:8px;border:1px solid #bbf7d0;background:#f0fdf4;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#16a34a">🟢 Khách Mới (<strong style="color:#16a34a">${s.new_orders || 0}</strong>)</button>
            <button type="button" class="kpi-cust-btn" data-cust="cu" onclick="kpiSaleFilterModalCust('cu')" style="padding:4px 12px;border-radius:8px;border:1px solid #fde68a;background:#fffbeb;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#b45309">🟧 Khách Cũ (<strong style="color:#b45309">${s.old_orders || 0}</strong>)</button>

            <span style="margin-left:auto;font-size:13px;font-weight:800">Tổng doanh số: <strong id="kpiSaleModalTotalRevenue" style="color:#dc2626">${formatVND(s.total_revenue || 0)}</strong></span>
        </div>
    </div>
    `;
}

async function kpiSaleShowOrders(userId, userName, dateStr) {
    const modal = _kpiSaleEnsureOrdersModal();
    const title = document.getElementById('kpiSaleOrdersModalTitle');
    const summary = document.getElementById('kpiSaleOrdersModalSummary');
    const tbody = document.getElementById('kpiSaleOrdersModalBody');

    const dateLabel = dateStr ? `Ngày ${dateStr}` : `Tháng ${_kpiSale.month}`;
    if (title) title.textContent = `NV ${userName} — ${dateLabel}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">⏳ Đang lấy chi tiết đơn hàng...</td></tr>';
    modal.style.display = 'flex';

    try {
        let url = `/api/kpi-sale/employee-orders?user_id=${userId}`;
        if (dateStr) {
            url += `&startDate=${dateStr}&endDate=${dateStr}`;
        } else {
            url += `&month=${_kpiSale.month}`;
        }
        const res = await apiCall(url);
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

async function kpiSaleShowTeamOrders(deptId, deptName, dateStr) {
    const modal = _kpiSaleEnsureOrdersModal();
    const title = document.getElementById('kpiSaleOrdersModalTitle');
    const summary = document.getElementById('kpiSaleOrdersModalSummary');
    const tbody = document.getElementById('kpiSaleOrdersModalBody');

    const dateLabel = dateStr ? `Ngày ${dateStr}` : `Tháng ${_kpiSale.month}`;
    if (title) title.textContent = `Team ${deptName} — ${dateLabel}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">⏳ Đang lấy chi tiết đơn hàng của Team...</td></tr>';
    modal.style.display = 'flex';

    try {
        let url = `/api/kpi-sale/team-orders?dept_id=${deptId}`;
        if (dateStr) {
            url += `&startDate=${dateStr}&endDate=${dateStr}`;
        } else {
            url += `&month=${_kpiSale.month}`;
        }
        const res = await apiCall(url);
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

window.kpiSaleShowOrders = kpiSaleShowOrders;
window.kpiSaleShowTeamOrders = kpiSaleShowTeamOrders;

function kpiSaleCloseOrdersModal() {
    const modal = document.getElementById('kpiSaleOrdersModal');
    if (modal) modal.style.display = 'none';
}

// ========== NEW RETENTION DETAIL MODAL FOR KPI SALE (BẢNG 2) ==========
let _saleRetentionDetailData = null;
let _saleRetentionFilterLv = 'all';
let _saleRetentionTabGroup = 'returning';

window.kpiSaleShowRetentionDetail = async function(userId, empName) {
    const modal = _kpiSaleEnsureRetentionModal();
    const title = document.getElementById('kpiSaleRetentionModalTitle');
    const container = document.getElementById('kpiSaleRetentionModalContent');

    const monthStr = (window._kpiSale && window._kpiSale.month) || (window._kpi && window._kpi.month) || '2026-07';
    if (title) title.textContent = `📊 Thống Kê Phân Loại Khách Hàng — NV ${empName} — Tháng ${monthStr}`;
    if (container) container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-weight:700">⏳ Đang tải dữ liệu phân loại khách hàng...</div>';
    modal.style.display = 'flex';

    try {
        const apiUrl = `/api/kpi-sale/employee-retention-detail?user_id=${userId}&month=${monthStr}`;
        const res = await apiCall(apiUrl);
        _saleRetentionDetailData = res;
        _saleRetentionFilterLv = 'all';
        _saleRetentionTabGroup = 'returning';
        
        kpiSaleRenderRetentionModalUI();
    } catch(err) {
        if (container) container.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;font-weight:700">❌ Lỗi: ${err.message}</div>`;
    }
};

function _kpiSaleEnsureRetentionModal() {
    let modal = document.getElementById('kpiSaleRetentionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiSaleRetentionModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:20px;width:100%;max-width:1050px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;font-family:inherit">
                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc">
                    <h3 id="kpiSaleRetentionModalTitle" style="margin:0;font-size:16px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px">
                        📊 Thống Kê Phân Loại Khách Hàng
                    </h3>
                    <button type="button" onclick="kpiSaleCloseRetentionModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b;padding:4px;border-radius:50%;line-height:1">✕</button>
                </div>
                <!-- Content -->
                <div id="kpiSaleRetentionModalContent" style="padding:20px 24px;overflow-y:auto;flex:1"></div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) kpiSaleCloseRetentionModal();
        });
    }
    return modal;
}

window.kpiSaleCloseRetentionModal = function() {
    const modal = document.getElementById('kpiSaleRetentionModal');
    if (modal) modal.style.display = 'none';
};

function kpiSaleRenderRetentionModalUI() {
    const container = document.getElementById('kpiSaleRetentionModalContent');
    if (!container || !_saleRetentionDetailData) return;

    const data = _saleRetentionDetailData;
    const filterLv = _saleRetentionFilterLv;

    const filterByArea = (list) => {
        if (filterLv === 'all') return list;
        return list.filter(c => c.business_area === filterLv);
    };

    const priorList = filterByArea(data.prior_old_customers || []);
    const returningList = filterByArea(data.returning_old_customers || []);
    const newList = filterByArea(data.new_customers || []);

    const priorTotalRev = priorList.reduce((s, c) => s + (c.month_revenue || 0), 0);
    const returningTotalRev = returningList.reduce((s, c) => s + (c.month_revenue || 0), 0);
    const newTotalRev = newList.reduce((s, c) => s + (c.month_revenue || 0), 0);

    let html = `
    <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Hàng 1: Chọn Lĩnh Vực -->
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:100px;display:flex;align-items:center;gap:4px">
                🏢 <strong>Lĩnh Vực:</strong>
            </span>
            <button type="button" onclick="kpiSaleFilterRetentionLv('all')" style="padding:6px 14px;border-radius:10px;border:1px solid ${filterLv==='all'?'#2563eb':'#cbd5e1'};background:${filterLv==='all'?'#eff6ff':'#fff'};cursor:pointer;font-weight:800;font-size:12px;font-family:inherit;color:${filterLv==='all'?'#1d4ed8':'#475569'}">Tất cả lĩnh vực</button>
            <button type="button" onclick="kpiSaleFilterRetentionLv('dp')" style="padding:6px 14px;border-radius:10px;border:1px solid ${filterLv==='dp'?'#c2410c':'#fed7aa'};background:${filterLv==='dp'?'#fff7ed':'#fff'};cursor:pointer;font-weight:800;font-size:12px;font-family:inherit;color:${filterLv==='dp'?'#c2410c':'#475569'}">👔 LV Đồng Phục</button>
            <button type="button" onclick="kpiSaleFilterRetentionLv('pettem')" style="padding:6px 14px;border-radius:10px;border:1px solid ${filterLv==='pettem'?'#be185d':'#fbcfe8'};background:${filterLv==='pettem'?'#fdf2f8':'#fff'};cursor:pointer;font-weight:800;font-size:12px;font-family:inherit;color:${filterLv==='pettem'?'#be185d':'#475569'}">🏷️ LV PET/TEM</button>
        </div>

        <!-- Hàng 2: 3 Cards Thống Kê Tổng Quan -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px">
            <!-- Card 1: KH Cũ Trước Tháng -->
            <div onclick="kpiSaleSelectRetentionTab('prior_old')" style="padding:14px 18px;border-radius:14px;background:${_saleRetentionTabGroup==='prior_old'?'#eff6ff':'#f8fafc'};border:2px solid ${_saleRetentionTabGroup==='prior_old'?'#3b82f6':'#cbd5e1'};cursor:pointer;transition:all 0.2s">
                <div style="display:flex;align-items:center;justify-content:space-between">
                    <span style="font-size:13px;font-weight:800;color:#334155">👥 Tệp KH Cũ Tích Lũy</span>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;background:#e2e8f0;color:#475569">Tệp Tích Lũy</span>
                </div>
                <div style="font-size:24px;font-weight:900;color:#1e293b;margin-top:6px">${priorList.length} <span style="font-size:13px;font-weight:700;color:#64748b">Khách hàng</span></div>
                <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:4px">Doanh số tháng: <strong style="color:#0284c7">${formatVND(priorTotalRev)}</strong></div>
            </div>

            <!-- Card 2: KH Cũ Chốt Trong Tháng -->
            <div onclick="kpiSaleSelectRetentionTab('returning')" style="padding:14px 18px;border-radius:14px;background:${_saleRetentionTabGroup==='returning'?'#fffbeb':'#fff7ed'};border:2px solid ${_saleRetentionTabGroup==='returning'?'#f59e0b':'#fde68a'};cursor:pointer;transition:all 0.2s">
                <div style="display:flex;align-items:center;justify-content:space-between">
                    <span style="font-size:13px;font-weight:800;color:#b45309">🔄 KH Cũ Chốt Trong Tháng</span>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;background:#fef3c7;color:#b45309">KH Quay Lại</span>
                </div>
                <div style="font-size:24px;font-weight:900;color:#d97706;margin-top:6px">${returningList.length} <span style="font-size:13px;font-weight:700;color:#b45309">Khách hàng</span></div>
                <div style="font-size:12px;font-weight:700;color:#b45309;margin-top:4px">Doanh số quay lại: <strong style="color:#dc2626">${formatVND(returningTotalRev)}</strong></div>
            </div>

            <!-- Card 3: KH Mới Chốt Trong Tháng -->
            <div onclick="kpiSaleSelectRetentionTab('new')" style="padding:14px 18px;border-radius:14px;background:${_saleRetentionTabGroup==='new'?'#f0fdf4':'#f8fafc'};border:2px solid ${_saleRetentionTabGroup==='new'?'#22c55e':'#bbf7d0'};cursor:pointer;transition:all 0.2s">
                <div style="display:flex;align-items:center;justify-content:space-between">
                    <span style="font-size:13px;font-weight:800;color:#15803d">🟢 KH Mới Chốt Trong Tháng</span>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;background:#dcfce7;color:#15803d">Khách Mới</span>
                </div>
                <div style="font-size:24px;font-weight:900;color:#16a34a;margin-top:6px">${newList.length} <span style="font-size:13px;font-weight:700;color:#15803d">Khách hàng</span></div>
                <div style="font-size:12px;font-weight:700;color:#15803d;margin-top:4px">Doanh số mới: <strong style="color:#16a34a">${formatVND(newTotalRev)}</strong></div>
            </div>
        </div>

        <!-- Hàng 3: Danh sách Chi Tiết Khách Hàng -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
            <h4 style="margin:0;font-size:14px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:6px">
                📋 Danh Sách: ${
                    _saleRetentionTabGroup === 'returning' ? '🔄 Khách Hàng Cũ Chốt Đơn Trong Tháng' :
                    _saleRetentionTabGroup === 'prior_old' ? '👥 Tất Cả Khách Hàng Cũ Trước Tháng' :
                    '🟢 Khách Hàng Mới Chốt Đơn Trong Tháng'
                }
            </h4>
        </div>

        <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:12px">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                    <tr style="background:#f1f5f9;color:#334155;font-weight:800">
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:center;width:40px">STT</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:left">Tên Khách Hàng</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:left">Số Điện Thoại</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:center">Lĩnh Vực</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:center">Đơn Đầu Tiên</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:center">Số Đơn Tháng Này</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:right">Doanh Số Tháng Này</th>
                        <th style="padding:10px;border-bottom:1px solid #cbd5e1;text-align:center">Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let targetList = [];
    if (_saleRetentionTabGroup === 'returning') targetList = returningList;
    else if (_saleRetentionTabGroup === 'prior_old') targetList = priorList;
    else if (_saleRetentionTabGroup === 'new') targetList = newList;

    targetList.sort((a, b) => {
        const revA = Number(a.month_revenue) || 0;
        const revB = Number(b.month_revenue) || 0;
        if (revB !== revA) {
            return revB - revA;
        }
        const dateA = a.first_order_date ? new Date(a.first_order_date).getTime() : Infinity;
        const dateB = b.first_order_date ? new Date(b.first_order_date).getTime() : Infinity;
        return dateA - dateB;
    });

    const PAGE_SIZE = 50;
    const totalItems = targetList.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    if (typeof _saleRetentionPage === 'undefined' || !_saleRetentionPage || _saleRetentionPage < 1) _saleRetentionPage = 1;
    if (_saleRetentionPage > totalPages) _saleRetentionPage = totalPages;

    const startIndex = (_saleRetentionPage - 1) * PAGE_SIZE;
    const pageItems = targetList.slice(startIndex, startIndex + PAGE_SIZE);

    if (targetList.length === 0) {
        html += `<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-weight:700">Không có khách hàng nào trong nhóm này</td></tr>`;
    } else {
        pageItems.forEach((c, idx) => {
            const rowIdx = startIndex + idx + 1;
            const firstDateStr = c.first_order_date ? new Date(c.first_order_date).toLocaleDateString('vi-VN') : '—';
            const areaBadge = c.business_area === 'pettem' ?
                '<span style="padding:2px 8px;border-radius:6px;background:#fdf2f8;color:#be185d;font-weight:800">🏷️ PET/TEM</span>' :
                '<span style="padding:2px 8px;border-radius:6px;background:#fff7ed;color:#c2410c;font-weight:800">👔 Đồng Phục</span>';

            const statusBadge = _saleRetentionTabGroup === 'new' ?
                '<span style="padding:2px 8px;border-radius:6px;background:#f0fdf4;color:#16a34a;font-weight:800">🟢 Khách Mới</span>' :
                (c.month_orders_cnt > 0 ?
                    '<span style="padding:2px 8px;border-radius:6px;background:#fffbeb;color:#b45309;font-weight:800">🟧 Khách Cũ Quay Lại</span>' :
                    '<span style="padding:2px 8px;border-radius:6px;background:#f1f5f9;color:#64748b;font-weight:700">⚪ Khách Cũ Chưa Mua</span>');

            html += `
                <tr style="border-bottom:1px solid #f1f5f9;background:${idx%2===0?'#ffffff':'#f8fafc'}">
                    <td style="padding:10px;text-align:center;color:#64748b;font-weight:700">${rowIdx}</td>
                    <td style="padding:10px;font-weight:800;color:#1e293b">${c.customer_name || 'Khách hàng'}</td>
                    <td style="padding:10px;font-weight:700;color:#475569">${c.customer_phone || '—'}</td>
                    <td style="padding:10px;text-align:center">${areaBadge}</td>
                    <td style="padding:10px;text-align:center;color:#64748b">${firstDateStr}</td>
                    <td style="padding:10px;text-align:center;font-weight:800;color:#0284c7">${c.month_orders_cnt} đơn</td>
                    <td style="padding:10px;text-align:right;font-weight:900;color:#dc2626">${formatVND(c.month_revenue)}</td>
                    <td style="padding:10px;text-align:center">${statusBadge}</td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    if (totalItems > 0) {
        const endItem = Math.min(startIndex + PAGE_SIZE, totalItems);
        let paginationBtnsHtml = '';

        if (totalPages > 1) {
            const prevDisabled = _saleRetentionPage === 1 ? 'disabled' : '';
            const prevStyle = _saleRetentionPage === 1 ? 'opacity:0.5;cursor:not-allowed;' : 'cursor:pointer;';
            paginationBtnsHtml += `<button type="button" onclick="kpiSaleChangeRetentionPage(${_saleRetentionPage - 1})" ${prevDisabled} style="padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-weight:700;font-size:12px;color:#334155;${prevStyle}">‹ Trước</button>`;

            for (let p = 1; p <= totalPages; p++) {
                const isActive = p === _saleRetentionPage;
                const btnStyle = isActive 
                    ? 'background:#2563eb;color:#fff;border:1px solid #2563eb;font-weight:800;' 
                    : 'background:#fff;color:#334155;border:1px solid #cbd5e1;font-weight:700;cursor:pointer;';
                paginationBtnsHtml += `<button type="button" onclick="kpiSaleChangeRetentionPage(${p})" style="padding:6px 12px;border-radius:8px;font-size:12px;${btnStyle}">${p}</button>`;
            }

            const nextDisabled = _saleRetentionPage === totalPages ? 'disabled' : '';
            const nextStyle = _saleRetentionPage === totalPages ? 'opacity:0.5;cursor:not-allowed;' : 'cursor:pointer;';
            paginationBtnsHtml += `<button type="button" onclick="kpiSaleChangeRetentionPage(${_saleRetentionPage + 1})" ${nextDisabled} style="padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-weight:700;font-size:12px;color:#334155;${nextStyle}">Sau ›</button>`;
        }

        html += `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding:8px 4px;font-size:12px;font-weight:700;color:#64748b;flex-wrap:wrap;gap:10px">
            <div>Hiển thị <strong style="color:#1e293b">${startIndex + 1} - ${endItem}</strong> trên tổng số <strong style="color:#2563eb">${totalItems}</strong> khách hàng</div>
            <div style="display:flex;align-items:center;gap:6px;margin-left:auto">${paginationBtnsHtml}</div>
        </div>
        `;
    }

    html += `</div>`;

    container.innerHTML = html;
}

var _saleRetentionPage = 1;

window.kpiSaleFilterRetentionLv = function(lv) {
    _saleRetentionFilterLv = lv;
    _saleRetentionPage = 1;
    kpiSaleRenderRetentionModalUI();
};

window.kpiSaleSelectRetentionTab = function(group) {
    _saleRetentionTabGroup = group;
    _saleRetentionPage = 1;
    kpiSaleRenderRetentionModalUI();
};

window.kpiSaleChangeRetentionPage = function(page) {
    _saleRetentionPage = page;
    kpiSaleRenderRetentionModalUI();
    const modalContent = document.getElementById('kpiSaleRetentionModalContent');
    if (modalContent) modalContent.scrollTop = 300;
};

window.kpiSaleFilterRewardTeam = function(teamId, btnEl) {
    document.querySelectorAll('.kpi-reward-tab-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#334155';
        btn.style.borderColor = '#cbd5e1';
        btn.classList.remove('active');
    });
    if (btnEl) {
        btnEl.style.background = '#2563eb';
        btnEl.style.color = 'white';
        btnEl.style.borderColor = '#2563eb';
        btnEl.classList.add('active');
    }

    const teamHeaders = document.querySelectorAll('.kpi-reward-team-group');
    const empRows = document.querySelectorAll('.kpi-reward-emp-row');

    if (teamId === 'all') {
        teamHeaders.forEach(el => el.style.display = '');
        empRows.forEach(el => el.style.display = '');
    } else {
        teamHeaders.forEach(el => {
            el.style.display = el.getAttribute('data-team-id') == teamId ? '' : 'none';
        });
        empRows.forEach(el => {
            el.style.display = el.classList.contains('team-row-' + teamId) ? '' : 'none';
        });
    }
};

window.kpiSaleFilterTargetModalTeam = function(teamId, btnEl) {
    document.querySelectorAll('.kpi-target-modal-tab-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#334155';
        btn.style.borderColor = '#cbd5e1';
        btn.classList.remove('active');
    });
    if (btnEl) {
        btnEl.style.background = '#2563eb';
        btnEl.style.color = 'white';
        btnEl.style.borderColor = '#2563eb';
        btnEl.classList.add('active');
    }

    const searchInp = document.getElementById('kpiSaleModalSearchInput');
    const query = searchInp ? searchInp.value.trim().toLowerCase() : '';

    const teamHeaders = document.querySelectorAll('.kpi-target-modal-team-group');
    const empRows = document.querySelectorAll('.kpi-target-modal-emp-row');

    if (teamId === 'all') {
        teamHeaders.forEach(el => el.style.display = query ? 'none' : '');
        empRows.forEach(el => {
            const txt = el.getAttribute('data-search-text') || '';
            el.style.display = (!query || txt.includes(query)) ? '' : 'none';
        });
    } else {
        teamHeaders.forEach(el => {
            el.style.display = (!query && el.getAttribute('data-team-id') == teamId) ? '' : 'none';
        });
        empRows.forEach(el => {
            const txt = el.getAttribute('data-search-text') || '';
            const matchTeam = el.classList.contains('modal-team-row-' + teamId);
            const matchSearch = !query || txt.includes(query);
            el.style.display = (matchTeam && matchSearch) ? '' : 'none';
        });
    }
};

window.kpiSaleFilterTargetModalSearch = function(query) {
    const activeTab = document.querySelector('.kpi-target-modal-tab-btn[style*="background: rgb(37, 99, 235)"]') 
        || document.querySelector('.kpi-target-modal-tab-btn.active');
    const teamId = activeTab ? activeTab.getAttribute('data-team-id') : 'all';
    window.kpiSaleFilterTargetModalTeam(teamId, activeTab);
};

// ========== SALE STAFF TREND CHART ==========
if (!window._kpiSaleTrendState) {
    window._kpiSaleTrendState = {
        staff_id: 'all',
        granularity: 'day',
        biz_area: 'dp',
        year: (new Date()).getFullYear(),
        selectedMetrics: new Set(['revenue', 'orders']),
        yearlyCache: {}
    };
}

function _kpiSaleEnsureChartJs() {
    return new Promise(resolve => {
        if (typeof Chart !== 'undefined') { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
    });
}

function kpiSaleInitStaffTrendSection() {
    const container = document.getElementById('kpiSaleStaffTrendSection');
    if (!container) return;

    const data = _kpiSale.data;
    if (!data) return;

    if (!document.getElementById('chartKpiSaleStaffTrend')) {
        const p = (_kpiSale.month || '').split('-').map(Number);
        const curYr = p[0] || (new Date()).getFullYear();
        const curMo = p[1] || ((new Date()).getMonth() + 1);

        container.innerHTML = `
            <div style="background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.05);border:1px solid #e2e8f0;padding:20px;margin-bottom:24px">
                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
                    <div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px">
                            📈 BIỂU ĐỒ XU HƯỚNG HIỆU SUẤT SALE
                            <span id="kpiSaleStaffTrendModeBadge" style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;background:#e0e7ff;color:#3730a3">Theo Ngày (Tháng ${curMo}/${curYr})</span>
                        </div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px">Thống kê Doanh Số, Số Đơn, Tỷ Lệ % Hoàn Thành KPI & Khách Hàng Cũ qua từng mốc thời gian</div>
                    </div>
                    
                    <!-- Filters -->
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                        <select id="kpiSaleBizSelect" onchange="kpiSaleChangeStaffTrendFilter()" style="padding:6px 12px;border-radius:8px;border:1px solid #3b82f6;font-size:12px;font-weight:700;color:#1e3a8a;outline:none;background:#eff6ff">
                            <option value="dp" selected>👕 Lĩnh Vực Đồng Phục (Ưu Tiên)</option>
                            <option value="pettem">🏷️ Lĩnh Vực Tem PET</option>
                            <option value="all">🌐 Tất Cả Lĩnh Vực</option>
                        </select>

                        <select id="kpiSaleStaffSelect" onchange="kpiSaleChangeStaffTrendFilter()" style="padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#1e293b;outline:none;background:#f8fafc">
                            <option value="all">🏢 Tất Cả Nhân Viên Sale (Tổng P.Sale)</option>
                        </select>

                        <select id="kpiSaleGranularitySelect" onchange="kpiSaleChangeStaffTrendFilter()" style="padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#1e293b;outline:none;background:#f8fafc">
                            <option value="day">📅 Xem Theo Ngày (Trong Tháng)</option>
                            <option value="month">📆 Xem Theo Tháng (Trong Năm)</option>
                        </select>

                        <select id="kpiSaleYearSelect" onchange="kpiSaleChangeStaffTrendFilter()" style="display:none;padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#1e293b;outline:none;background:#f8fafc"></select>
                    </div>
                </div>

                <!-- Metric Toggles -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
                    <span style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase">📊 CHỈ SỐ THEO DÕI (NHÁY ĐÚP ĐỂ XEM BẢNG PHÂN TÍCH):</span>
                    <button id="btnKpiSaleRev" onclick="kpiSaleToggleTrendMetric('revenue')" ondblclick="kpiSaleOpenMetricDetailModal('revenue')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid #2563eb;background:#2563eb;color:#fff;transition:all .2s">Doanh Thu ✖</button>
                    <button id="btnKpiSaleOrders" onclick="kpiSaleToggleTrendMetric('orders')" ondblclick="kpiSaleOpenMetricDetailModal('orders')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid #16a34a;background:#16a34a;color:#fff;transition:all .2s">Số Đơn ✖</button>
                    <button id="btnKpiSaleBoth" onclick="kpiSaleToggleTrendMetric('both')" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid #9333ea;background:linear-gradient(135deg,#9333ea,#7e22ce);color:#fff;transition:all .2s">✨ Cả Hai ✖</button>
                    <button id="btnKpiSaleRate" onclick="kpiSaleToggleTrendMetric('rate')" ondblclick="kpiSaleOpenMetricDetailModal('rate')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#475569;transition:all .2s">🎯 % Hoàn Thành KPI</button>
                    <button id="btnKpiSaleRet" onclick="kpiSaleToggleTrendMetric('ret')" ondblclick="kpiSaleOpenMetricDetailModal('ret')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#475569;transition:all .2s">🔄 KH Cũ Quay Lại</button>
                </div>

                <!-- Summary Cards -->
                <div id="kpiSaleStaffTrendSummaryCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px"></div>

                <!-- Canvas -->
                <div style="position:relative;height:320px;width:100%">
                    <canvas id="chartKpiSaleStaffTrend"></canvas>
                </div>
            </div>
        `;
    }

    // Populate Sale Staff Selector Options
    const staffSelect = document.getElementById('kpiSaleStaffSelect');
    if (staffSelect && data && data.teams) {
        const curVal = staffSelect.value || 'all';
        let optionsHtml = '<option value="all">🏢 Tất Cả Nhân Viên Sale (Tổng P.Sale)</option>';
        const addedUserIds = new Set();
        data.teams.forEach(t => {
            (t.employees || []).forEach(emp => {
                if (!addedUserIds.has(emp.user_id)) {
                    addedUserIds.add(emp.user_id);
                    optionsHtml += `<option value="${emp.user_id}">👤 ${emp.full_name} (${emp.username || emp.role})</option>`;
                }
            });
        });
        staffSelect.innerHTML = optionsHtml;
        staffSelect.value = addedUserIds.has(parseInt(curVal)) ? curVal : 'all';
    }

    // Populate Year Selector Options
    const yearSelect = document.getElementById('kpiSaleYearSelect');
    if (yearSelect && !yearSelect.hasChildNodes()) {
        const curY = (new Date()).getFullYear();
        let yHtml = '';
        for (let y = curY; y >= curY - 2; y--) {
            yHtml += `<option value="${y}">Năm ${y}</option>`;
        }
        yearSelect.innerHTML = yHtml;
        yearSelect.value = curY;
    }

    kpiSaleRenderStaffTrendChart();
}

function kpiSaleToggleTrendMetric(metric) {
    const st = window._kpiSaleTrendState.selectedMetrics;
    if (metric === 'both') {
        if (st.has('revenue') && st.has('orders')) {
            st.delete('revenue');
            st.delete('orders');
        } else {
            st.add('revenue');
            st.add('orders');
        }
    } else {
        if (st.has(metric)) st.delete(metric);
        else st.add(metric);
    }
    if (st.size === 0) st.add('revenue');

    _updateKpiSaleTrendButtonsUI();
    kpiSaleRenderStaffTrendChart();
}

function _updateKpiSaleTrendButtonsUI() {
    const st = window._kpiSaleTrendState.selectedMetrics;
    const btnRev = document.getElementById('btnKpiSaleRev');
    const btnOrd = document.getElementById('btnKpiSaleOrders');
    const btnBoth = document.getElementById('btnKpiSaleBoth');
    const btnRate = document.getElementById('btnKpiSaleRate');
    const btnRet = document.getElementById('btnKpiSaleRet');

    if (btnRev) {
        if (st.has('revenue')) {
            btnRev.style.background = '#2563eb'; btnRev.style.color = '#fff'; btnRev.style.borderColor = '#2563eb'; btnRev.innerText = 'Doanh Thu ✖';
        } else {
            btnRev.style.background = '#fff'; btnRev.style.color = '#475569'; btnRev.style.borderColor = '#cbd5e1'; btnRev.innerText = 'Doanh Thu';
        }
    }
    if (btnOrd) {
        if (st.has('orders')) {
            btnOrd.style.background = '#16a34a'; btnOrd.style.color = '#fff'; btnOrd.style.borderColor = '#16a34a'; btnOrd.innerText = 'Số Đơn ✖';
        } else {
            btnOrd.style.background = '#fff'; btnOrd.style.color = '#475569'; btnOrd.style.borderColor = '#cbd5e1'; btnOrd.innerText = 'Số Đơn';
        }
    }
    if (btnBoth) {
        if (st.has('revenue') && st.has('orders')) {
            btnBoth.style.background = 'linear-gradient(135deg,#9333ea,#7e22ce)'; btnBoth.style.color = '#fff'; btnBoth.style.borderColor = '#9333ea'; btnBoth.innerText = '✨ Cả Hai ✖';
        } else {
            btnBoth.style.background = '#fff'; btnBoth.style.color = '#475569'; btnBoth.style.borderColor = '#cbd5e1'; btnBoth.innerText = '✨ Cả Hai';
        }
    }
    if (btnRate) {
        if (st.has('rate')) {
            btnRate.style.background = '#ea580c'; btnRate.style.color = '#fff'; btnRate.style.borderColor = '#ea580c'; btnRate.innerText = '🎯 % Hoàn Thành KPI ✖';
        } else {
            btnRate.style.background = '#fff'; btnRate.style.color = '#475569'; btnRate.style.borderColor = '#cbd5e1'; btnRate.innerText = '🎯 % Hoàn Thành KPI';
        }
    }
    if (btnRet) {
        if (st.has('ret')) {
            btnRet.style.background = '#9333ea'; btnRet.style.color = '#fff'; btnRet.style.borderColor = '#9333ea'; btnRet.innerText = '🔄 KH Cũ Quay Lại ✖';
        } else {
            btnRet.style.background = '#fff'; btnRet.style.color = '#475569'; btnRet.style.borderColor = '#cbd5e1'; btnRet.innerText = '🔄 KH Cũ Quay Lại';
        }
    }
}

function kpiSaleChangeStaffTrendFilter() {
    const bizSel = document.getElementById('kpiSaleBizSelect');
    const staffSel = document.getElementById('kpiSaleStaffSelect');
    const granSel = document.getElementById('kpiSaleGranularitySelect');
    const yearSel = document.getElementById('kpiSaleYearSelect');

    if (bizSel) window._kpiSaleTrendState.biz_area = bizSel.value || 'dp';
    if (staffSel) window._kpiSaleTrendState.staff_id = staffSel.value;
    if (granSel) window._kpiSaleTrendState.granularity = granSel.value;
    if (yearSel) window._kpiSaleTrendState.year = parseInt(yearSel.value) || (new Date()).getFullYear();

    window._kpiSaleTrendState.yearlyCache = {};

    if (yearSel) {
        yearSel.style.display = window._kpiSaleTrendState.granularity === 'month' ? 'inline-block' : 'none';
    }

    const badge = document.getElementById('kpiSaleStaffTrendModeBadge');
    if (badge) {
        const bizLabel = window._kpiSaleTrendState.biz_area === 'dp' 
            ? 'Đồng Phục' 
            : (window._kpiSaleTrendState.biz_area === 'pettem' ? 'Tem PET' : 'Tất Cả LV');

        if (window._kpiSaleTrendState.granularity === 'month') {
            badge.innerText = `Theo Tháng (${bizLabel} - Năm ${window._kpiSaleTrendState.year})`;
        } else {
            const p = (_kpiSale.month || '').split('-').map(Number);
            badge.innerText = `Theo Ngày (${bizLabel} - Tháng ${p[1]}/${p[0]})`;
        }
    }

    kpiSaleRenderStaffTrendChart();
}

async function kpiSaleRenderStaffTrendChart() {
    await _kpiSaleEnsureChartJs();
    const canvas = document.getElementById('chartKpiSaleStaffTrend');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const st = window._kpiSaleTrendState;
    const isDaily = st.granularity === 'day';
    const staffId = st.staff_id;
    const bizArea = st.biz_area || 'dp';

    let labels = [];
    let revArr = [];
    let ordArr = [];
    let rateArr = [];
    let retArr = [];

    if (isDaily) {
        // Daily breakdown from current loaded month
        const data = _kpiSale.data;
        if (!data || !data.summary) return;

        const daysInMonth = data.month?.days_in_month || 31;
        const mo = data.month?.month || 8;

        for (let d = 1; d <= daysInMonth; d++) {
            labels.push(`${String(d).padStart(2,'0')}/${String(mo).padStart(2,'0')}`);
        }

        if (staffId === 'all') {
            const bizData = (data.summary.daily_by_biz && data.summary.daily_by_biz[bizArea])
                ? data.summary.daily_by_biz[bizArea]
                : { daily: data.summary.daily, daily_orders: data.summary.daily_orders, daily_ret_cust: data.summary.daily_ret_cust };

            revArr = bizData.daily || new Array(daysInMonth).fill(0);
            ordArr = bizData.daily_orders || new Array(daysInMonth).fill(0);
            retArr = bizData.daily_ret_cust || new Array(daysInMonth).fill(0);
            const target = data.summary.target_1 || 1;
            let cumRev = 0;
            rateArr = revArr.map(r => {
                cumRev += r;
                return target > 0 ? Math.round(1000 * cumRev / target) / 10 : 0;
            });
        } else {
            let foundEmp = null;
            (data.teams || []).forEach(t => {
                const e = (t.employees || []).find(x => x.user_id == staffId);
                if (e) foundEmp = e;
            });

            if (foundEmp) {
                const bizData = (foundEmp.daily_by_biz && foundEmp.daily_by_biz[bizArea])
                    ? foundEmp.daily_by_biz[bizArea]
                    : { daily: foundEmp.daily, daily_orders: foundEmp.daily_orders, daily_ret_cust: foundEmp.daily_ret_cust };

                revArr = bizData.daily || new Array(daysInMonth).fill(0);
                ordArr = bizData.daily_orders || new Array(daysInMonth).fill(0);
                retArr = bizData.daily_ret_cust || new Array(daysInMonth).fill(0);
                const target = foundEmp.target || 1;
                let cumRev = 0;
                rateArr = revArr.map(r => {
                    cumRev += r;
                    return target > 0 ? Math.round(1000 * cumRev / target) / 10 : 0;
                });
            } else {
                revArr = new Array(daysInMonth).fill(0);
                ordArr = new Array(daysInMonth).fill(0);
                rateArr = new Array(daysInMonth).fill(0);
                retArr = new Array(daysInMonth).fill(0);
            }
        }
    } else {
        // Yearly breakdown by Month (12 months)
        labels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const year = st.year;
        if (!st.yearlyCache[year]) {
            try {
                st.yearlyCache[year] = await apiCall('/api/reports/kpi-sale/yearly-trend?year=' + year);
            } catch(e) {
                st.yearlyCache[year] = null;
            }
        }
        const yData = st.yearlyCache[year];
        if (yData && yData.by_staff) {
            const sObj = yData.by_staff[staffId] || yData.by_staff['all'] || {};
            const areaObj = sObj[bizArea] || sObj.all || sObj;

            revArr = areaObj.monthly_rev || new Array(12).fill(0);
            ordArr = areaObj.monthly_orders || new Array(12).fill(0);
            rateArr = areaObj.monthly_rate || new Array(12).fill(0);
            retArr = areaObj.monthly_ret_cust || new Array(12).fill(0);
        } else {
            revArr = new Array(12).fill(0);
            ordArr = new Array(12).fill(0);
            rateArr = new Array(12).fill(0);
            retArr = new Array(12).fill(0);
        }
    }

    // Render Highlights Summary Cards
    const cardEl = document.getElementById('kpiSaleStaffTrendSummaryCards');
    if (cardEl) {
        const maxRev = Math.max(0, ...revArr);
        const maxRevIdx = revArr.indexOf(maxRev);
        const maxRevLabel = maxRevIdx >= 0 ? labels[maxRevIdx] : '-';

        const maxOrd = Math.max(0, ...ordArr);
        const maxOrdIdx = ordArr.indexOf(maxOrd);
        const maxOrdLabel = maxOrdIdx >= 0 ? labels[maxOrdIdx] : '-';

        const totalRev = revArr.reduce((a, b) => a + b, 0);
        const totalOrd = ordArr.reduce((a, b) => a + b, 0);
        const maxRate = Math.max(0, ...rateArr);

        cardEl.innerHTML = `
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#1e40af;text-transform:uppercase">🏆 Đỉnh Doanh Thu (Peak)</div>
                <div style="font-size:18px;font-weight:900;color:#1e3a8a;margin-top:2px">${formatVND(maxRev)}</div>
                <div style="font-size:11px;color:#3b82f6;font-weight:700">Mốc: ${maxRevLabel}</div>
            </div>
            <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#166534;text-transform:uppercase">📦 Kỷ Lục Đơn Hàng (Max)</div>
                <div style="font-size:18px;font-weight:900;color:#14532d;margin-top:2px">${maxOrd} đơn</div>
                <div style="font-size:11px;color:#22c55e;font-weight:700">Mốc: ${maxOrdLabel}</div>
            </div>
            <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#9a3412;text-transform:uppercase">🎯 % HT KPI Cao Nhất</div>
                <div style="font-size:18px;font-weight:900;color:#7c2d12;margin-top:2px">${maxRate}%</div>
                <div style="font-size:11px;color:#ea580c;font-weight:700">${isDaily ? 'Cộng dồn' : 'Trong năm'}</div>
            </div>
            <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #cbd5e1;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#334155;text-transform:uppercase">💰 Tổng Cộng Trong Kỳ</div>
                <div style="font-size:18px;font-weight:900;color:#0f172a;margin-top:2px">${formatVND(totalRev)}</div>
                <div style="font-size:11px;color:#64748b;font-weight:700">Tổng: ${totalOrd} đơn</div>
            </div>
        `;
    }

    // Build Chart.js datasets & scales
    const selected = st.selectedMetrics;
    const datasets = [];
    const scalesConfig = {};

    let hasCurrency = false;
    let hasOrders = false;
    let hasPct = false;

    if (selected.has('revenue')) {
        hasCurrency = true;
        datasets.push({
            label: 'Doanh Thu (VNĐ)',
            data: revArr,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            yAxisID: 'yRev',
            fill: selected.size === 1,
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('orders')) {
        hasOrders = true;
        datasets.push({
            label: 'Số Đơn Hàng',
            data: ordArr,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            yAxisID: 'yOrd',
            fill: selected.size === 1,
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('rate')) {
        hasPct = true;
        datasets.push({
            label: 'Tỷ Lệ % Hoàn Thành KPI (%)',
            data: rateArr,
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234, 88, 12, 0.08)',
            yAxisID: 'yPct',
            fill: selected.size === 1,
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('ret')) {
        hasOrders = true;
        datasets.push({
            label: 'KH Cũ Quay Lại (KH)',
            data: retArr,
            borderColor: '#9333ea',
            backgroundColor: 'rgba(147, 51, 234, 0.08)',
            yAxisID: 'yOrd',
            fill: selected.size === 1,
            tension: 0.3,
            borderWidth: 2.5
        });
    }

    if (hasCurrency) {
        scalesConfig.yRev = {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v)) + 'đ' }
        };
    }
    if (hasOrders) {
        scalesConfig.yOrd = {
            type: 'linear',
            display: true,
            position: hasCurrency ? 'right' : 'left',
            grid: { drawOnChartArea: !hasCurrency },
            ticks: { precision: 0, callback: v => v + ' đơn' }
        };
    }
    if (hasPct) {
        scalesConfig.yPct = {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: !(hasCurrency || hasOrders) },
            ticks: { callback: v => v + '%' }
        };
    }

    if (window._chartKpiSaleStaffTrend) {
        window._chartKpiSaleStaffTrend.destroy();
    }

    window._chartKpiSaleStaffTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: datasets.length > 1, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                const val = context.parsed.y;
                                const yId = context.dataset.yAxisID;
                                if (yId === 'yRev') {
                                    label += formatVND(val);
                                } else if (yId === 'yPct') {
                                    label += val + '%';
                                } else if (yId === 'yOrd') {
                                    label += val + ' đơn';
                                } else {
                                    label += val;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: scalesConfig
        }
    });

    canvas.ondblclick = (evt) => {
        if (window._chartKpiSaleStaffTrend) {
            const points = window._chartKpiSaleStaffTrend.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
                const dsIndex = points[0].datasetIndex;
                const dataset = window._chartKpiSaleStaffTrend.data.datasets[dsIndex];
                if (dataset) {
                    const keyMap = {
                        'Doanh Thu (VND)': 'revenue',
                        'Số Đơn Hàng': 'orders',
                        'Tỷ Lệ % Hoàn Thành KPI (%)': 'rate',
                        'KH Cũ Quay Lại (KH)': 'ret'
                    };
                    const metricKey = keyMap[dataset.label] || 'revenue';
                    kpiSaleOpenMetricDetailModal(metricKey);
                }
            }
        }
    };
}

function kpiSaleOpenMetricDetailModal(metricKey) {
    const st = window._kpiSaleTrendState || {};
    const isDaily = st.granularity === 'day';
    const staffId = st.staff_id || 'all';
    const bizArea = st.biz_area || 'dp';
    const data = _kpiSale.data;
    if (!data) return;

    const p = (_kpiSale.month || '').split('-').map(Number);
    const yr = p[0] || (new Date()).getFullYear();
    const mo = p[1] || ((new Date()).getMonth() + 1);

    const metricConfigs = {
        revenue: { name: '💰 DOANH THU', fullLabel: 'Doanh Thu Phát Sinh', unit: 'đ', isCurrency: true, isPct: false, isLowerBetter: false, color: '#2563eb', bg: '#dbeafe' },
        orders: { name: '📦 SỐ ĐƠN HÀNG', fullLabel: 'Số Lượng Đơn Hàng', unit: 'đơn', isCurrency: false, isPct: false, isLowerBetter: false, color: '#16a34a', bg: '#dcfce7' },
        rate: { name: '🎯 % HOÀN THÀNH KPI', fullLabel: 'Tỷ Lệ Hoàn Thành KPI Doanh Số', unit: '%', isCurrency: false, isPct: true, isLowerBetter: false, color: '#ea580c', bg: '#ffedd5' },
        ret: { name: '🔄 KHÁCH HÀNG CỦ QUAY LẠI', fullLabel: 'Số Đơn Từ Khách Hàng Cũ', unit: 'đơn', isCurrency: false, isPct: false, isLowerBetter: false, color: '#7c3aed', bg: '#f3e8ff' }
    };

    const cfg = metricConfigs[metricKey] || metricConfigs['revenue'];

    let labels = [];
    let revArr = [], ordersArr = [], rateArr = [], retArr = [];

    if (isDaily) {
        const daysInMonth = data.month?.days_in_month || 31;
        const vnDays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(yr, mo - 1, d);
            const dayName = vnDays[dt.getDay()];
            labels.push(`${dayName} - ${String(d).padStart(2,'0')}/${String(mo).padStart(2,'0')}`);
        }

        let targetObj = null;
        let targetKpi = 1;
        if (staffId === 'all') {
            targetObj = data.summary || {};
            targetKpi = data.summary?.target_1 || 1;
        } else {
            (data.teams || []).forEach(t => {
                const e = (t.employees || []).find(emp => emp.user_id == staffId);
                if (e) targetObj = e;
            });
            targetKpi = targetObj?.target || 1;
        }

        if (targetObj) {
            const bizData = (targetObj.daily_by_biz && targetObj.daily_by_biz[bizArea])
                ? targetObj.daily_by_biz[bizArea]
                : { daily: targetObj.daily, daily_orders: targetObj.daily_orders, daily_ret_cust: targetObj.daily_ret_cust };

            revArr = bizData.daily || new Array(daysInMonth).fill(0);
            ordersArr = bizData.daily_orders || new Array(daysInMonth).fill(0);
            retArr = bizData.daily_ret_cust || new Array(daysInMonth).fill(0);
            let cumRev = 0;
            rateArr = revArr.map(r => {
                cumRev += r;
                return targetKpi > 0 ? Math.round(1000 * cumRev / targetKpi) / 10 : 0;
            });
        } else {
            revArr = new Array(daysInMonth).fill(0);
            ordersArr = new Array(daysInMonth).fill(0);
            retArr = new Array(daysInMonth).fill(0);
            rateArr = new Array(daysInMonth).fill(0);
        }
    } else {
        labels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const yearVal = st.year || yr;
        const yData = st.yearlyCache ? st.yearlyCache[yearVal] : null;
        if (yData && yData.by_staff) {
            const sObj = yData.by_staff[staffId] || yData.by_staff['all'] || {};
            const areaObj = sObj[bizArea] || sObj.all || sObj;

            revArr = areaObj.monthly_rev || new Array(12).fill(0);
            ordersArr = areaObj.monthly_orders || new Array(12).fill(0);
            rateArr = areaObj.monthly_rate || new Array(12).fill(0);
            retArr = areaObj.monthly_ret_cust || areaObj.monthly_ret || new Array(12).fill(0);
        } else {
            revArr = new Array(12).fill(0);
            ordersArr = new Array(12).fill(0);
            rateArr = new Array(12).fill(0);
            retArr = new Array(12).fill(0);
        }
    }

    let metricValMap = {
        revenue: revArr,
        orders: ordersArr,
        rate: rateArr,
        ret: retArr
    };

    const targetArr = metricValMap[metricKey] || revArr;

    let bestIdx = 0, worstIdx = 0;
    let bestVal = 0, worstVal = 0;

    const validItems = targetArr.map((v, i) => ({ val: v, i }));
    validItems.sort((a, b) => b.val - a.val);
    bestIdx = validItems[0].i;
    bestVal = validItems[0].val;

    const activeItems = validItems.filter(item => revArr[item.i] > 0 || ordersArr[item.i] > 0 || item.val > 0);
    if (activeItems.length > 0) {
        worstIdx = activeItems[activeItems.length - 1].i;
        worstVal = activeItems[activeItems.length - 1].val;
    } else {
        worstIdx = validItems[validItems.length - 1].i;
        worstVal = validItems[validItems.length - 1].val;
    }

    const formatMetric = (val) => {
        if (cfg.isCurrency) return formatVND(val);
        if (cfg.isPct) return val + '%';
        return val + ' ' + cfg.unit;
    };

    let staffLabel = '🏢 Tất Cả Nhân Viên Sale (Tổng P.Sale)';
    const staffSel = document.getElementById('kpiSaleStaffSelect');
    if (staffSel && staffSel.selectedIndex >= 0) {
        staffLabel = staffSel.options[staffSel.selectedIndex].text;
    }

    const bizText = bizArea === 'dp' ? '👕 Lĩnh Vực Đồng Phục' : (bizArea === 'pettem' ? '🏷️ Tem PET' : '🌐 Tất Cả Lĩnh Vực');
    const timeLabel = isDaily ? `Theo Ngày (Trong Tháng ${mo}/${yr})` : `Theo Tháng (Trong Năm ${st.year || yr})`;

    let rowsHtml = '';
    labels.forEach((lbl, idx) => {
        const val = targetArr[idx];
        const r = revArr[idx];
        const o = ordersArr[idx];
        const rt = rateArr[idx];
        const ret = retArr[idx];

        let badgeHtml = '';
        if (idx === bestIdx && val > 0) {
            badgeHtml = '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:12px;font-weight:800;font-size:11px">🟢 HIỆU QUẢ NHẤT</span>';
        } else if (idx === worstIdx && (r > 0 || o > 0 || val > 0)) {
            badgeHtml = '<span style="background:#fee2e2;color:#b91c1c;padding:3px 10px;border-radius:12px;font-weight:800;font-size:11px">🔴 KÉM HIỆU QUẢ</span>';
        } else if (r > 0 || o > 0) {
            badgeHtml = '<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:12px;font-weight:700;font-size:11px">🟡 TRUNG BÌNH</span>';
        } else {
            badgeHtml = '<span style="background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px">⚪ CHƯA PHÁT SINH</span>';
        }

        const rowBg = idx === bestIdx ? '#f0fdf4' : (idx === worstIdx ? '#fff1f2' : (idx % 2 === 0 ? '#fff' : '#f8fafc'));

        rowsHtml += `
            <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0;transition:all 0.15s">
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
                <td style="padding:10px 12px;font-weight:800;color:#1e1b4b">${lbl}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:900;color:${cfg.color};font-size:14px">${formatMetric(val)}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#2563eb">${formatVND(r)}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#16a34a">${o} đơn</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#ea580c">${rt}%</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#7c3aed">${ret} đơn</td>
                <td style="padding:10px 12px;text-align:center">${badgeHtml}</td>
            </tr>
        `;
    });

    const existing = document.getElementById('kpiSaleMetricDetailModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kpiSaleMetricDetailModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';

    modal.innerHTML = `
        <div style="background:#fff;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:960px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;animation:kpiModalPop 0.25s ease-out">
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:20px 24px;color:#fff;display:flex;align-items:center;justify-content:space-between">
                <div>
                    <h3 style="margin:0;font-size:18px;font-weight:900;display:flex;align-items:center;gap:10px">
                        <span>📊 THỐNG KÊ CHI TIẾT & PHÂN TÍCH HIỆU SUẤT SALE</span>
                        <span style="background:${cfg.bg};color:${cfg.color};font-size:12px;padding:3px 12px;border-radius:16px;font-weight:800">${cfg.name}</span>
                    </h3>
                    <div style="font-size:12px;color:#c7d2fe;margin-top:4px">
                        ${bizText} | 📌 ${staffLabel} | 📅 ${timeLabel}
                    </div>
                </div>
                <button onclick="document.getElementById('kpiSaleMetricDetailModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;font-weight:800;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s">✕</button>
            </div>

            <!-- Modal Content Body -->
            <div style="padding:20px 24px;overflow-y:auto;flex:1">
                <!-- Smart Analysis Cards -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px">
                    <!-- Best Card -->
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:14px;padding:16px">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase">🌟 Mốc Hiệu Quả Nhất</span>
                            <span style="background:#22c55e;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px">${labels[bestIdx] || '-'}</span>
                        </div>
                        <div style="font-size:22px;font-weight:900;color:#14532d;margin-top:6px">${formatMetric(bestVal || 0)}</div>
                        <div style="font-size:12px;color:#15803d;margin-top:4px;font-weight:600">
                            Doanh số: <b>${formatVND(revArr[bestIdx] || 0)}</b> | <b>${ordersArr[bestIdx] || 0} đơn</b> | KPI: <b>${rateArr[bestIdx] || 0}%</b>
                        </div>
                    </div>

                    <!-- Worst Card -->
                    <div style="background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1.5px solid #fca5a5;border-radius:14px;padding:16px">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span style="font-size:11px;font-weight:800;color:#9f1239;text-transform:uppercase">⚠️ Mốc Kém Hiệu Quả Nhất</span>
                            <span style="background:#f43f5e;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px">${labels[worstIdx] || '-'}</span>
                        </div>
                        <div style="font-size:22px;font-weight:900;color:#881337;margin-top:6px">${formatMetric(worstVal || 0)}</div>
                        <div style="font-size:12px;color:#be123c;margin-top:4px;font-weight:600">
                            Doanh số: <b>${formatVND(revArr[worstIdx] || 0)}</b> | <b>${ordersArr[worstIdx] || 0} đơn</b> | KPI: <b>${rateArr[worstIdx] || 0}%</b>
                        </div>
                    </div>
                </div>

                <!-- Detailed Table -->
                <div style="border:1.5px solid #cbd5e1;border-radius:14px;overflow:hidden">
                    <div style="background:#f8fafc;padding:12px 16px;font-size:13px;font-weight:800;color:#1e1b4b;border-bottom:1.5px solid #cbd5e1;display:flex;align-items:center;justify-content:space-between">
                        <span>📌 BẢNG THỐNG KÊ CHI TIẾT THEO MỐC THỜI GIAN (${labels.length} mốc)</span>
                        <span style="font-size:11px;color:#64748b">Cột màu rực rỡ thể hiện giá trị chỉ số đang xem</span>
                    </div>
                    <div style="max-height:360px;overflow-y:auto">
                        <table style="width:100%;border-collapse:collapse;font-size:12px">
                            <thead style="position:sticky;top:0;background:#f1f5f9;z-index:2;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
                                <tr>
                                    <th style="padding:10px;text-align:center;width:40px">STT</th>
                                    <th style="padding:10px;text-align:left">Mốc Thời Gian</th>
                                    <th style="padding:10px;text-align:right;background:${cfg.bg};color:${cfg.color};font-weight:900">${cfg.name}</th>
                                    <th style="padding:10px;text-align:right">Doanh Số</th>
                                    <th style="padding:10px;text-align:right">Số Đơn Hàng</th>
                                    <th style="padding:10px;text-align:right">% HT KPI</th>
                                    <th style="padding:10px;text-align:right">Đơn Khách Cũ</th>
                                    <th style="padding:10px;text-align:center">Đánh Giá Hiệu Quả</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:12px;color:#64748b;font-weight:600">
                    💡 Mẹo: Nháy đúp vào bất kỳ nút chỉ số nào để mở bảng phân tích chi tiết.
                </div>
                <button onclick="document.getElementById('kpiSaleMetricDetailModal').remove()" style="padding:8px 20px;border-radius:10px;background:#1e1b4b;color:#fff;border:none;font-weight:700;font-size:12px;cursor:pointer">Đóng Cửa Sổ</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

if (typeof window !== 'undefined') {
    window.kpiSaleOpenMetricDetailModal = kpiSaleOpenMetricDetailModal;
}

// ===== CĐ DETAIL MODAL (BAR CONVERSION RATE BREAKDOWN) =====
window.kpiShowCdDetailModal = function(userId, empName, type, advData) {
    var isSalePage = (window.location.pathname || '').includes('kpisale');
    var data = advData || (isSalePage ? (window._kpiSaleAdvData || window._kpiAdvData) : (window._kpiAdvData || window._kpiSaleAdvData)) || {};
    var convMap = (data && data.conversionMap) || {};
    var conv = convMap[userId] || convMap[userId + ''] || convMap[Number(userId)] || {};

    var allEmp = (data && (data.allEmployees || (data.leaderboard && (data.leaderboard.by_revenue || data.leaderboard.by_orders)))) || [];
    var emp = allEmp.find(function(e) { return Number(e.user_id || e.id) === Number(userId); }) || {};

    var typeName = type === 'pettem' ? 'PET / TEM' : 'Đồng Phục';
    var assigned = type === 'pettem' ? (conv.assigned_pettem != null ? conv.assigned_pettem : 0) : (conv.assigned_dp != null ? conv.assigned_dp : 0);
    var completed = type === 'pettem' 
        ? (conv.completed_pettem != null ? conv.completed_pettem : (emp.orders_pettem || 0)) 
        : (conv.completed_dp != null ? conv.completed_dp : (emp.orders_dp || 0));

    var rate = type === 'pettem' 
        ? (conv.rate_pettem != null ? conv.rate_pettem : (assigned > 0 ? Math.round(1000 * completed / assigned) / 10 : (completed > 0 ? completed * 100 : 0))) 
        : (conv.rate_dp != null ? conv.rate_dp : (assigned > 0 ? Math.round(1000 * completed / assigned) / 10 : (completed > 0 ? completed * 100 : 0)));

    var explanationText = '';
    if (assigned > 0 && completed > assigned) {
        explanationText = 'Tỷ lệ CĐ mảng ' + typeName + ' đạt <strong>' + rate + '%</strong> (vượt 100%) vì nhân viên đã chốt được <strong>' + completed + ' đơn hàng</strong>, trong khi số khách hàng mới mảng ' + typeName + ' được giao trong kỳ là <strong>' + assigned + ' KH</strong>. Điều này phát sinh khi khách hàng được giao chốt từ 2 đơn trở lên, hoặc có đơn phát sinh từ tập khách hàng được phân công từ trước.';
    } else if (assigned > 0) {
        explanationText = 'Trong kỳ lọc này, nhân viên được phân công <strong>' + assigned + ' KH mới</strong> mảng ' + typeName + ' và đã chốt thành công <strong>' + completed + ' đơn hàng</strong>, đạt tỷ lệ chuyển đổi <strong>' + rate + '%</strong>.';
    } else if (completed > 0) {
        explanationText = 'Nhân viên chưa được phân công khách hàng mới mảng ' + typeName + ' nào trong kỳ lọc này (0 KH được giao), nhưng vẫn chốt thành công <strong>' + completed + ' đơn hàng</strong> mảng ' + typeName + ' từ danh sách khách hàng gán trước đó.';
    } else {
        explanationText = 'Trong kỳ lọc này, nhân viên chưa được giao khách hàng mới và chưa chốt đơn hàng nào thuộc mảng ' + typeName + ' (0%).';
    }

    var oldModal = document.getElementById('kpiCdDetailModal');
    if (oldModal) oldModal.remove();

    var h = '<div id="kpiCdDetailModal" onclick="if(event.target===this)closeKpiCdDetailModal()" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px">';
    h += '<div style="background:#fff;border-radius:20px;max-width:760px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);overflow:hidden">';
    
    // Header
    h += '<div style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center">';
    h += '<div>';
    h += '<div style="font-size:18px;font-weight:800;display:flex;align-items:center;gap:8px">📊 Chi Tiết Tỷ Lệ Chuyển Đổi (CĐ)</div>';
    h += '<div style="font-size:13px;opacity:.95;margin-top:4px">👤 ' + empName + ' — Mảng <strong>' + typeName + '</strong></div>';
    h += '</div>';
    h += '<button onclick="closeKpiCdDetailModal()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;line-height:1">✕</button>';
    h += '</div>';

    // Body
    h += '<div style="padding:24px;max-height:80vh;overflow-y:auto">';

    // Formula Box
    h += '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;padding:14px;text-align:center;margin-bottom:20px">';
    h += '<div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">📐 CÔNG THỨC TÍNH CĐ ' + typeName + '</div>';
    h += '<div style="font-size:14px;font-weight:800;color:#1e293b">Tỷ lệ CĐ % = (Số đơn chốt ÷ Số KH được giao) × 100%</div>';
    h += '</div>';

    // Stat Cards
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">';
    h += '<div style="background:#eef2ff;border-radius:14px;padding:14px;border:1px solid #c7d2fe;text-align:center">';
    h += '<div style="font-size:12px;color:#4338ca;font-weight:700;margin-bottom:4px">📦 Số đơn chốt (' + typeName + ')</div>';
    h += '<div id="kpiCdStatCompleted" style="font-size:24px;font-weight:900;color:#3730a3">' + completed + ' đơn</div>';
    h += '</div>';
    h += '<div style="background:#f0fdf4;border-radius:14px;padding:14px;border:1px solid #bbf7d0;text-align:center">';
    h += '<div style="font-size:12px;color:#166534;font-weight:700;margin-bottom:4px">👥 KH được giao (' + typeName + ')</div>';
    h += '<div id="kpiCdStatAssigned" style="font-size:24px;font-weight:900;color:#15803d">' + assigned + ' KH</div>';
    h += '</div>';
    h += '</div>';

    // Result Highlight
    h += '<div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:16px;padding:18px;text-align:center;margin-bottom:20px;box-shadow:0 4px 12px rgba(16,185,129,.1)">';
    h += '<div style="font-size:11px;font-weight:800;color:#047857;letter-spacing:0.5px">KẾT QUẢ TỶ LỆ CHUYỂN ĐỔI</div>';
    h += '<div id="kpiCdStatRate" style="font-size:32px;font-weight:900;color:#065f46;margin:6px 0">' + rate + '%</div>';
    h += '<div id="kpiCdStatFormula" style="font-size:13px;color:#047857;font-weight:700">Phép tính: (' + completed + ' đơn ÷ ' + (assigned > 0 ? assigned : 0) + ' KH) × 100% = <strong>' + rate + '%</strong></div>';
    h += '</div>';

    // Explanation Note
    h += '<div style="background:#fffbebf0;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:0 12px 12px 0;font-size:13px;color:#92400e;line-height:1.6;margin-bottom:24px">';
    h += '📌 <strong>Lý do ra kết quả:</strong> ' + explanationText;
    h += '</div>';

    // === TABS & TABLES FOR DETAILED LISTS ===
    h += '<div style="border-top:1px solid #e2e8f0;padding-top:20px">';
    h += '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">';
    h += '<button id="kpiCdTabOrdersBtn" onclick="switchKpiCdTab(\'orders\')" style="padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#4338ca;color:#fff;border:none;box-shadow:0 2px 6px rgba(67,56,202,.2)">📦 Danh sách Đơn chốt (<span id="kpiCdOrdersCnt">' + completed + '</span>)</button>';
    h += '<button id="kpiCdTabCustBtn" onclick="switchKpiCdTab(\'cust\')" style="padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1">👥 Danh sách KH được giao (<span id="kpiCdCustCnt">' + assigned + '</span>)</button>';
    h += '</div>';

    h += '<div id="kpiCdOrdersTab" style="display:block">';
    h += '<div id="kpiCdOrdersList" style="max-height:260px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px">';
    h += '<div style="padding:24px;text-align:center;color:#64748b;font-weight:600">⏳ Đang tải danh sách đơn hàng chốt...</div>';
    h += '</div>';
    h += '</div>';

    h += '<div id="kpiCdCustTab" style="display:none">';
    h += '<div id="kpiCdCustList" style="max-height:260px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px">';
    h += '<div style="padding:24px;text-align:center;color:#64748b;font-weight:600">⏳ Đang tải danh sách khách hàng được giao...</div>';
    h += '</div>';
    h += '</div>';
    h += '</div>';

    h += '</div>'; // close body

    // Footer
    h += '<div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end">';
    h += '<button onclick="closeKpiCdDetailModal()" style="padding:8px 22px;border-radius:10px;background:#475569;color:#fff;border:none;font-weight:700;cursor:pointer;font-size:13px">Đóng</button>';
    h += '</div>';

    h += '</div>';
    h += '</div>';

    document.body.insertAdjacentHTML('beforeend', h);

    // Fetch detail lists using exact period range from loaded data
    var pStart = (data && data.period && data.period.start) || '';
    var pEnd = (data && data.period && data.period.end) || '';

    var detailUrl = '/api/kpi-sale/conversion-details?user_id=' + userId + '&type=' + type;
    if (pStart && pEnd) {
        detailUrl += '&startDate=' + encodeURIComponent(pStart) + '&endDate=' + encodeURIComponent(pEnd);
    } else {
        var filter = window._kpiSaleLbFilter || window._kpiLbFilter || 'month';
        var monthVal = (window._kpiSale && window._kpiSale.month) || (window._kpi && window._kpi.month) || window._kpiSaleLbMonth || window._kpiLbMonth || '';
        detailUrl += '&period=' + filter;
        if (monthVal) detailUrl += '&date=' + monthVal;
    }

    function loadCdDetails(attempt) {
        attempt = attempt || 1;
        apiCall(detailUrl).then(function(res) {
            if (!res || !res.success) return;
            if (typeof renderKpiCdDetailsTables === 'function') renderKpiCdDetailsTables(res);
        }).catch(function(err) {
            if (attempt < 3) {
                setTimeout(function() { loadCdDetails(attempt + 1); }, 500);
            } else {
                var ordEl = document.getElementById('kpiCdOrdersList');
                if (ordEl) {
                    ordEl.innerHTML = '<div style="padding:20px;text-align:center"><div style="color:#ef4444;font-weight:600;margin-bottom:10px">⚠️ Không tải được dữ liệu chi tiết</div><button onclick="window.kpiReloadCdDetails()" style="padding:6px 16px;border-radius:8px;background:#4338ca;color:#fff;border:none;font-weight:700;cursor:pointer;font-size:12px">🔄 Thử lại</button></div>';
                }
            }
        });
    }
    window.kpiReloadCdDetails = function() { loadCdDetails(1); };
    loadCdDetails(1);
};

window.renderKpiCdDetailsTables = function(res) {
    var orders = res.orders || [];
    var customers = res.customers || [];

    var ordCntEl = document.getElementById('kpiCdOrdersCnt');
    if (ordCntEl) ordCntEl.textContent = orders.length;
    var custCntEl = document.getElementById('kpiCdCustCnt');
    if (custCntEl) custCntEl.textContent = customers.length;

    // Render Orders Table
    var ordListEl = document.getElementById('kpiCdOrdersList');
    if (ordListEl) {
        if (orders.length === 0) {
            ordListEl.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">📭 Không phát sinh đơn hàng nào thuộc mảng này trong kỳ</div>';
        } else {
            var h = '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            h += '<thead><tr style="background:#f8fafc;color:#475569;border-bottom:1px solid #e2e8f0"><th style="padding:10px 12px;text-align:left">#</th><th style="padding:10px 12px;text-align:left">Mã đơn hàng</th><th style="padding:10px 12px;text-align:left">Tên khách hàng</th><th style="padding:10px 12px;text-align:left">SĐT</th><th style="padding:10px 12px;text-align:left">Ngày chốt</th><th style="padding:10px 12px;text-align:left">Hạng mục</th><th style="padding:10px 12px;text-align:right">Doanh số</th></tr></thead><tbody>';
            for (var i = 0; i < orders.length; i++) {
                var o = orders[i];
                var dt = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '—';
                var revFmt = typeof kpiSaleCompactVND === 'function' ? kpiSaleCompactVND(o.revenue) : (o.revenue.toLocaleString() + 'đ');
                var oPhone = (o.phone && !o.phone.startsWith('pancake_')) ? o.phone : '—';
                h += '<tr style="border-bottom:1px solid #f1f5f9">';
                h += '<td style="padding:10px 12px;color:#94a3b8">' + (i + 1) + '</td>';
                h += '<td style="padding:10px 12px;font-weight:700;color:#4338ca">' + (o.order_code || '—') + '</td>';
                h += '<td style="padding:10px 12px;font-weight:700;color:#1e293b">' + (o.customer_name || 'Khách hàng') + '</td>';
                h += '<td style="padding:10px 12px;color:#64748b">' + oPhone + '</td>';
                h += '<td style="padding:10px 12px;color:#64748b">' + dt + '</td>';
                h += '<td style="padding:10px 12px;color:#6366f1;font-weight:600">' + (o.category_name || '—') + '</td>';
                h += '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#059669">' + revFmt + '</td>';
                h += '</tr>';
            }
            h += '</tbody></table>';
            ordListEl.innerHTML = h;
        }
    }

    // Render Customers Table
    var custListEl = document.getElementById('kpiCdCustList');
    if (custListEl) {
        if (customers.length === 0) {
            custListEl.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">📭 Không có khách hàng mới được giao mảng này trong kỳ</div>';
        } else {
            var h2 = '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            h2 += '<thead><tr style="background:#f8fafc;color:#475569;border-bottom:1px solid #e2e8f0"><th style="padding:10px 12px;text-align:left">#</th><th style="padding:10px 12px;text-align:left">Mã KH</th><th style="padding:10px 12px;text-align:left">Tên khách hàng</th><th style="padding:10px 12px;text-align:left">Số điện thoại</th><th style="padding:10px 12px;text-align:left">Ngày giao</th></tr></thead><tbody>';
            for (var j = 0; j < customers.length; j++) {
                var c = customers[j];
                var cDt = c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : '—';
                var codeFmt = (typeof getCustomerCode === 'function') ? getCustomerCode(c) : '';
                if (!codeFmt || codeFmt.indexOf('NaN') !== -1 || codeFmt.startsWith('0-0-')) {
                    var dObj = new Date(c.effective_date || c.created_at || c.handover_date);
                    if (!isNaN(dObj.getTime())) {
                        codeFmt = (c.daily_order_number || 0) + '-' + dObj.getDate() + '-' + (dObj.getMonth() + 1) + '-Y' + String(dObj.getFullYear()).slice(-2);
                    } else {
                        codeFmt = c.customer_uid || ('KH-' + c.id);
                    }
                }
                var cPhone = (c.phone && !c.phone.startsWith('pancake_')) ? c.phone : '—';
                h2 += '<tr style="border-bottom:1px solid #f1f5f9">';
                h2 += '<td style="padding:10px 12px;color:#94a3b8">' + (j + 1) + '</td>';
                h2 += '<td style="padding:10px 12px;font-weight:700;color:#e65100">' + codeFmt + '</td>';
                h2 += '<td style="padding:10px 12px;font-weight:700;color:#1e293b">' + (c.customer_name || 'Khách mới') + '</td>';
                h2 += '<td style="padding:10px 12px;font-weight:700;color:' + (cPhone === '—' ? '#94a3b8' : '#059669') + '">' + cPhone + '</td>';
                h2 += '<td style="padding:10px 12px;color:#64748b">' + cDt + '</td>';
                h2 += '</tr>';
            }
            h2 += '</tbody></table>';
            custListEl.innerHTML = h2;
        }
    }
};

window.switchKpiCdTab = function(tab) {
    var ordTab = document.getElementById('kpiCdOrdersTab');
    var custTab = document.getElementById('kpiCdCustTab');
    var ordBtn = document.getElementById('kpiCdTabOrdersBtn');
    var custBtn = document.getElementById('kpiCdTabCustBtn');

    if (tab === 'orders') {
        if (ordTab) ordTab.style.display = 'block';
        if (custTab) custTab.style.display = 'none';
        if (ordBtn) { ordBtn.style.background = '#4338ca'; ordBtn.style.color = '#fff'; ordBtn.style.border = 'none'; }
        if (custBtn) { custBtn.style.background = '#f1f5f9'; custBtn.style.color = '#475569'; custBtn.style.border = '1px solid #cbd5e1'; }
    } else {
        if (ordTab) ordTab.style.display = 'none';
        if (custTab) custTab.style.display = 'block';
        if (ordBtn) { ordBtn.style.background = '#f1f5f9'; ordBtn.style.color = '#475569'; ordBtn.style.border = '1px solid #cbd5e1'; }
        if (custBtn) { custBtn.style.background = '#4338ca'; custBtn.style.color = '#fff'; custBtn.style.border = 'none'; }
    }
};

window.closeKpiCdDetailModal = function() {
    var m = document.getElementById('kpiCdDetailModal');
    if (m) m.remove();
};

window.kpiSaleShowCdDetail = function(userId, empName, type) {
    window.kpiShowCdDetailModal(userId, empName, type, window._kpiSaleAdvData);
};

window.kpiShowCdDetail = function(userId, empName, type) {
    window.kpiShowCdDetailModal(userId, empName, type, window._kpiAdvData);
};



