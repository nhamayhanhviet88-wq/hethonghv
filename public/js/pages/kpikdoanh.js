// ========== KPI P.KINH DOANH ==========
// Page: /kpikdoanh — renderKpikdoanhPage(container)

var _kpi = { month: '', data: null };

async function renderKpikdoanhPage(container) {
    if (!_kpi.month) {
        const now = new Date();
        _kpi.month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
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
            #kpiMonthInput{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
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
            .kpi-stage1{background:#dbeafe!important}
            .kpi-stage2{background:#fce7f3!important}
            .kpi-stage3{background:#dcfce7!important}

            /* === TODAY HIGHLIGHT: fiery sparkling effect (header only) === */
            @keyframes kpiFireGlow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
            th.kpi-today-hdr{background:linear-gradient(135deg,#dc2626,#f97316,#eab308,#f97316,#dc2626)!important;background-size:300% 300%!important;animation:kpiFireGlow 2s ease-in-out infinite!important;color:#fff!important;font-weight:900!important;font-size:11px!important;text-shadow:0 0 6px rgba(255,255,255,.8),0 0 12px #fbbf24!important;position:relative}

            .kpi-stage-fire{background:linear-gradient(135deg,#dc2626,#ea580c,#f59e0b,#ea580c,#dc2626)!important;background-size:400% 400%!important;animation:kpiFireGlow 2.5s ease-in-out infinite!important;font-size:12px!important;text-shadow:0 0 8px rgba(255,255,255,.9),0 0 16px #fbbf24!important;position:relative;overflow:hidden}
            .kpi-stage-fire::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);animation:kpiShimmer 2s ease-in-out infinite}
            @keyframes kpiShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

            /* Column group borders for Bảng 1 — only on td (header has colored backgrounds already)
               1=STT, 2=Cơ sở, 3-4=MỤC TIÊU, 5=DTTT, 6-7=Tỷ lệ HT, 8-9=Còn thiếu, 10-13=GĐ1, 14-17=GĐ2, 18-21=GĐ3 */
            .kpi-ov td:nth-child(3){border-left:2.5px solid #3b82f6}
            .kpi-ov td:nth-child(4){border-right:2.5px solid #3b82f6}
            .kpi-ov td:nth-child(5){border-left:2.5px solid #f59e0b;border-right:2.5px solid #f59e0b;background:#fffbeb}
            .kpi-ov td:nth-child(6){border-left:2.5px solid #8b5cf6}
            .kpi-ov td:nth-child(7){border-right:2.5px solid #8b5cf6}
            .kpi-ov td:nth-child(8){border-left:2.5px solid #ef4444}
            .kpi-ov td:nth-child(9){border-right:2.5px solid #ef4444}
            .kpi-ov td:nth-child(10){border-left:2.5px solid #2563eb}
            .kpi-ov td:nth-child(13){border-right:2.5px solid #2563eb}
            .kpi-ov td:nth-child(14){border-left:2.5px solid #db2777}
            .kpi-ov td:nth-child(17){border-right:2.5px solid #db2777}
            .kpi-ov td:nth-child(18){border-left:2.5px solid #16a34a}
            .kpi-ov td:nth-child(21){border-right:2.5px solid #16a34a}
            /* Light tint backgrounds for stage groups */
            .kpi-ov td:nth-child(n+10):nth-child(-n+13){background:#eff6ff}
            .kpi-ov td:nth-child(n+14):nth-child(-n+17){background:#fdf2f8}
            .kpi-ov td:nth-child(n+18):nth-child(-n+21){background:#f0fdf4}
            .kpi-ov tr.total-row td:nth-child(n+10):nth-child(-n+13){background:#dbeafe}
            .kpi-ov tr.total-row td:nth-child(n+14):nth-child(-n+17){background:#fce7f3}
            .kpi-ov tr.total-row td:nth-child(n+18):nth-child(-n+21){background:#dcfce7}

            @media(max-width:768px){.kpi-summary{flex-direction:column}.kpi-sum-box{min-width:auto}.kpi-topbar{flex-direction:column;align-items:stretch}}

            /* === LEADERBOARD & TEAM COMPARISON (embedded) === */
            .kpi-lb-section{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);margin-top:28px}
            .kpi-lb-header{padding:18px 24px;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px;border-bottom:2px solid rgba(99,102,241,.15);color:#1e1b4b;background:linear-gradient(90deg,#eef2ff,#e0e7ff,#c7d2fe,#f5f3ff,#c7d2fe,#e0e7ff,#eef2ff);background-size:200% 100%;animation:kpiShimmer 4s ease-in-out infinite}
            @keyframes kpiShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
            .kpi-lb-tabs{display:flex;gap:0;margin:0 24px;border-bottom:2px solid #f1f5f9}
            .kpi-lb-tab{padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;background:none;border:none;color:#6b7280;border-bottom:3px solid transparent;transition:all .2s}
            .kpi-lb-tab.active{color:#4338ca;border-bottom-color:#4338ca}
            .kpi-lb-tab:hover{color:#4338ca}
            .kpi-lb-row{display:grid;grid-template-columns:50px 1fr 80px 90px 70px 80px 70px;padding:14px 24px;border-bottom:1px solid #f8fafc;align-items:center;gap:8px;transition:background .2s}
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

            /* === MEETING COMMITMENTS === */
            .kpi-mc-section{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);margin-top:28px}
            .kpi-mc-header{padding:18px 24px;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:2px solid rgba(234,179,8,.2);color:#78350f;background:linear-gradient(90deg,#fefce8,#fef9c3,#fef08a,#fef9c3,#fefce8);background-size:200% 100%;animation:kpiShimmer 4s ease-in-out infinite}
            .kpi-mc-btn{padding:8px 16px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s}
            .kpi-mc-btn-primary{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;box-shadow:0 2px 8px rgba(79,70,229,.3)}
            .kpi-mc-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(79,70,229,.4)}
            .kpi-mc-btn-ghost{background:rgba(99,102,241,.08);color:#4338ca}
            .kpi-mc-btn-ghost:hover{background:rgba(99,102,241,.15)}
            .kpi-mc-team{padding:16px 24px;border-bottom:1px solid #f1f5f9}
            .kpi-mc-team-name{font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(90deg,#f8fafc,#f1f5f9);border-radius:8px}
            .kpi-mc-emp{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-radius:10px;margin:4px 0;transition:background .2s}
            .kpi-mc-emp:hover{background:#f8fafc}
            .kpi-mc-emp-name{font-size:13px;font-weight:600;color:#334155}
            .kpi-mc-emp-role{font-size:11px;color:#94a3b8;margin-left:8px}
            .kpi-mc-emp-actions{display:flex;gap:6px;align-items:center}
            .kpi-mc-badge{font-size:10px;padding:3px 8px;border-radius:20px;font-weight:700}
            .kpi-mc-badge-done{background:#dcfce7;color:#166534}
            .kpi-mc-badge-pending{background:#fef3c7;color:#92400e}
            .kpi-mc-badge-none{background:#f1f5f9;color:#6b7280}
            .kpi-mc-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
            .kpi-mc-modal{background:#fff;border-radius:20px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.25);animation:kpiMcSlideUp .3s ease}
            @keyframes kpiMcSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
            .kpi-mc-modal-head{padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
            .kpi-mc-modal-head h3{font-size:16px;font-weight:800;color:#1e293b;margin:0}
            .kpi-mc-modal-body{padding:20px 24px}
            .kpi-mc-modal-foot{padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px}
            .kpi-mc-input{width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;transition:border .2s;outline:none;font-family:inherit}
            .kpi-mc-input:focus{border-color:#6366f1}
            .kpi-mc-item{padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;background:#fafafa}
            .kpi-mc-item-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
            .kpi-mc-item-stt{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}
            .kpi-mc-remove{width:24px;height:24px;border-radius:50%;border:none;background:#fee2e2;color:#dc2626;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}

            /* === ORDER DETAIL MODAL === */
            .kpi-od-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.6);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
            .kpi-od-modal{background:#1e293b;border-radius:20px;width:750px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.4);animation:kpiMcSlideUp .3s ease;display:flex;flex-direction:column}
            .kpi-od-head{padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1)}
            .kpi-od-head h3{font-size:16px;font-weight:800;color:#fff;margin:0}
            .kpi-od-close{background:rgba(255,255,255,.1);border:none;color:#94a3b8;font-size:18px;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}
            .kpi-od-close:hover{background:rgba(255,255,255,.2);color:#fff}
            .kpi-od-tabs{display:flex;gap:8px;padding:14px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
            .kpi-od-tab{padding:6px 16px;border-radius:20px;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
            .kpi-od-tab-all{background:#3b82f6;color:#fff}
            .kpi-od-tab-new{background:rgba(16,185,129,.15);color:#10b981}
            .kpi-od-tab-old{background:rgba(168,85,247,.15);color:#a855f7}
            .kpi-od-tab.active-all{background:#3b82f6;color:#fff}
            .kpi-od-tab.active-new{background:#10b981;color:#fff}
            .kpi-od-tab.active-old{background:#a855f7;color:#fff}
            .kpi-od-tab:not([class*='active']){opacity:.6}.kpi-od-tab:hover{opacity:1}
            .kpi-od-month{margin-left:auto;font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px}
            .kpi-od-body{overflow-y:auto;flex:1;padding:0}
            .kpi-od-table{width:100%;border-collapse:collapse;font-size:12px}
            .kpi-od-table th{padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:#1e293b;z-index:1}
            .kpi-od-table td{padding:10px 12px;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,.04)}
            .kpi-od-table tr:hover td{background:rgba(255,255,255,.03)}
            .kpi-od-type{padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;display:inline-block}
            .kpi-od-type-moi{background:rgba(16,185,129,.15);color:#34d399}
            .kpi-od-type-cu{background:rgba(168,85,247,.15);color:#c084fc}
            .kpi-od-code{color:#60a5fa;font-weight:700}
            .kpi-od-revenue{color:#fbbf24;font-weight:800}
            .kpi-od-empty{padding:40px;text-align:center;color:#64748b;font-size:13px}
            @media(max-width:768px){.kpi-od-modal{width:100%;max-width:100%;max-height:100%;border-radius:0}}
        </style>
        <div class="kpi-wrap" id="kpiWrap">
            <div class="kpi-topbar">
                <div class="kpi-nav">
                    <button class="kpi-nav-btn" onclick="kpiNavMonth(-1)">‹</button>
                    <div class="kpi-month-label" id="kpiMonthLabel" onclick="kpiOpenPicker()" title="Chọn tháng">...</div>
                    <input type="month" id="kpiMonthInput" onchange="kpiPickMonth(this.value)">
                    <button class="kpi-nav-btn" onclick="kpiNavMonth(1)">›</button>
                </div>
                ${(typeof currentUser!=='undefined'&&currentUser&&currentUser.role==='giam_doc')?'<button class="kpi-set-btn" onclick="kpiOpenSetTargets()">🎯 Đặt KPI Tháng</button>':''}
            </div>
            <div id="kpiSummary"></div>
            <div id="kpiContent"><div style="text-align:center;padding:60px;color:#9ca3af">⏳ Đang tải dữ liệu...</div></div>
            <div id="kpiLeaderboard"></div>
            <div id="kpiTeamCompare"></div>
            <div id="kpiMeetingCommit"></div>
        </div>
    `;
    await kpiLoadData();
    kpiLoadDashboard();
    kpiLoadMeetingCommit();
}

function kpiNavMonth(dir) {
    const [y, m] = _kpi.month.split('-').map(Number);
    let nm = m + dir, ny = y;
    if (nm < 1) { nm = 12; ny--; } else if (nm > 12) { nm = 1; ny++; }
    _kpi.month = `${ny}-${String(nm).padStart(2,'0')}`;
    kpiLoadData();
}
function kpiOpenPicker() { const p = document.getElementById('kpiMonthInput'); if(p){p.style.pointerEvents='auto';p.showPicker?p.showPicker():p.click();} }
function kpiPickMonth(v) { if(!v)return; _kpi.month=v; kpiLoadData(); }

function kpiFmt(n) {
    if (n == null || isNaN(n)) return '-';
    if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(1).replace(/\.0$/,'') + ' tỷ';
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + ' tr';
    return n.toLocaleString('vi-VN');
}
function kpiFmtFull(n) { return n != null ? n.toLocaleString('vi-VN') : '-'; }
// Format "còn thiếu" with +/- sign: positive missing = còn thiếu (-), negative = đã vượt (+)
function kpiSignFmt(n) {
    if (n == null || isNaN(n) || n === 0) return '0';
    const abs = Math.abs(n);
    let str;
    if (abs >= 1e9) str = (abs/1e9).toFixed(1).replace(/\.0$/,'') + ' tỷ';
    else if (abs >= 1e6) str = (abs/1e6).toFixed(1).replace(/\.0$/,'') + ' tr';
    else str = abs.toLocaleString('vi-VN');
    return n > 0 ? '-' + str : '+' + str; // missing > 0 = còn thiếu (-)  |  missing < 0 = đã vượt (+)
}
function kpiSignFmtFull(n) {
    if (n == null || isNaN(n) || n === 0) return '0';
    const abs = Math.abs(n);
    const str = abs.toLocaleString('vi-VN');
    return n > 0 ? '-' + str : '+' + str;
}

async function kpiLoadData() {
    const lbl = document.getElementById('kpiMonthLabel');
    const content = document.getElementById('kpiContent');
    if (lbl) { const [y,m]=_kpi.month.split('-').map(Number); lbl.textContent = `Tháng ${m}/${y}`; }
    if (content) content.innerHTML = '<div style="text-align:center;padding:60px;color:#9ca3af">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/reports/kpi-kdoanh?month=${_kpi.month}`);
        _kpi.data = data;
        kpiRenderSummary(data);
        kpiRenderContent(data);
    } catch(e) {
        if(content) content.innerHTML = `<div style="text-align:center;padding:60px;color:#ef4444">❌ Lỗi: ${e.message}</div>`;
    }
    kpiLoadDashboard();
}

function kpiRenderSummary(data) {
    const el = document.getElementById('kpiSummary');
    if (!el || !data.summary) return;
    const s = data.summary, m = data.month;

    // Build status labels for Mốc 1
    const m1Exceeded = s.missing_1 <= 0;
    const m1StatusLbl = m1Exceeded ? 'ĐÃ VƯỢT' : 'CÒN THIẾU';
    const m1StatusCls = m1Exceeded ? 'color:#16a34a' : 'color:#dc2626';
    const m1StatusVal = m1Exceeded ? '+' + kpiFmt(Math.abs(s.missing_1)) : '-' + kpiFmt(s.missing_1);

    // Build status labels for Mốc 120%
    const m120Exceeded = s.missing_120 <= 0;
    const m120StatusLbl = m120Exceeded ? 'ĐÃ VƯỢT' : 'CÒN THIẾU';
    const m120StatusCls = m120Exceeded ? 'color:#16a34a' : 'color:#dc2626';
    const m120StatusVal = m120Exceeded ? '+' + kpiFmt(Math.abs(s.missing_120)) : '-' + kpiFmt(s.missing_120);

    el.innerHTML = `
        <div class="kpi-summary">
            <div class="kpi-sum-box days">
                <div class="kpi-sum-val" style="color:#475569">${m.days_left}</div>
                <div class="kpi-sum-lbl">NGÀY CÒN LẠI</div>
            </div>
            <div class="kpi-sum-box actual">
                <div class="kpi-sum-val" style="color:#92400e">${kpiFmt(s.actual)}</div>
                <div class="kpi-sum-lbl">THỰC THU</div>
            </div>
            <div class="kpi-sum-box m1">
                <div class="kpi-sum-val" style="color:#166534">${kpiFmtFull(s.target_1)} đ</div>
                <div class="kpi-sum-lbl">KPI MỐC 1</div>
                <div class="kpi-sum-detail">
                    <div class="kpi-sum-detail-row">
                        <span class="kpi-sum-detail-label" style="color:#166534">ĐÃ ĐẠT:</span>
                        <span class="kpi-sum-detail-val" style="color:#166534">${s.rate_1}%</span>
                    </div>
                    <div class="kpi-sum-detail-row">
                        <span class="kpi-sum-detail-label" style="${m1StatusCls}">${m1StatusLbl}:</span>
                        <span class="kpi-sum-detail-val" style="${m1StatusCls}">${m1StatusVal}</span>
                    </div>
                </div>
            </div>
            <div class="kpi-sum-box m120">
                <div class="kpi-sum-val" style="color:#991b1b">${kpiFmtFull(s.target_120)} đ</div>
                <div class="kpi-sum-lbl">KPI MỐC 120%</div>
                <div class="kpi-sum-detail">
                    <div class="kpi-sum-detail-row">
                        <span class="kpi-sum-detail-label" style="color:#991b1b">ĐÃ ĐẠT:</span>
                        <span class="kpi-sum-detail-val" style="color:#991b1b">${s.rate_120}%</span>
                    </div>
                    <div class="kpi-sum-detail-row">
                        <span class="kpi-sum-detail-label" style="${m120StatusCls}">${m120StatusLbl}:</span>
                        <span class="kpi-sum-detail-val" style="${m120StatusCls}">${m120StatusVal}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function kpiRenderContent(data) {
    const el = document.getElementById('kpiContent');
    if (!el || !data.teams) return;
    const dim = data.month.days_in_month;
    let html = '';

    // Determine today and current stage
    const now = new Date();
    const [selY, selM] = _kpi.month.split('-').map(Number);
    const isCurrentMonth = (now.getFullYear() === selY && (now.getMonth()+1) === selM);
    const todayDay = isCurrentMonth ? now.getDate() : -1;
    const currentStage = todayDay >= 1 && todayDay <= 10 ? 1 : todayDay >= 11 && todayDay <= 20 ? 2 : todayDay >= 21 ? 3 : 0;

    // ===== SECTION 1: Team Summary =====
    html += '<div class="kpi-section-title">📊 TỔNG QUAN KPI THEO TEAM</div>';
    html += '<div class="kpi-tbl-wrap"><table class="kpi-tbl kpi-ov">';
    // Header — highlight current stage with fire effect
    const s1Cls = currentStage===1 ? 'kpi-stage-hdr kpi-stage-fire' : 'kpi-stage-hdr';
    const s2Cls = currentStage===2 ? 'kpi-stage-hdr kpi-stage-fire' : 'kpi-stage-hdr';
    const s3Cls = currentStage===3 ? 'kpi-stage-hdr kpi-stage-fire' : 'kpi-stage-hdr';
    const s1Style = currentStage===1 ? '' : 'style="background:#1d4ed8!important"';
    const s2Style = currentStage===2 ? '' : 'style="background:#be185d!important"';
    const s3Style = currentStage===3 ? '' : 'style="background:#15803d!important"';
    html += '<thead><tr><th rowspan="2">STT</th><th rowspan="2">Cơ sở</th><th colspan="2">MỤC TIÊU</th><th rowspan="2">DT Thực tế</th><th colspan="2">Tỷ lệ HT</th><th colspan="2">Còn thiếu</th>';
    html += `<th colspan="4" class="${s1Cls}" ${s1Style}>🔥 GIAI ĐOẠN 1 (1-10)${currentStage===1?' ⬅ HIỆN TẠI':''}</th>`;
    html += `<th colspan="4" class="${s2Cls}" ${s2Style}>${currentStage===2?'🔥 ':''}GIAI ĐOẠN 2 (11-20)${currentStage===2?' ⬅ HIỆN TẠI':''}</th>`;
    html += `<th colspan="4" class="${s3Cls}" ${s3Style}>${currentStage===3?'🔥 ':''}GIAI ĐOẠN 3 (21-${dim})${currentStage===3?' ⬅ HIỆN TẠI':''}</th>`;
    html += '</tr><tr>';
    html += '<th class="sub">Mốc 1</th><th class="sub">Mốc 120%</th>';
    html += '<th class="sub">Mốc 1</th><th class="sub">Mốc 120%</th>';
    html += '<th class="sub">Mốc 1</th><th class="sub">Mốc 120%</th>';
    // Stage sub-headers x3
    for (let i = 0; i < 3; i++) {
        html += '<th class="sub">Target</th><th class="sub">TT</th><th class="sub">TB/ngày</th><th class="sub">Còn thiếu</th>';
    }
    html += '</tr></thead><tbody>';

    data.teams.forEach((t, idx) => {
        html += `<tr>
            <td>${idx+1}</td><td class="name">${t.dept_name}</td>
            <td>${kpiFmtFull(t.target_1)}</td><td>${kpiFmtFull(t.target_120)}</td>
            <td style="font-weight:700">${kpiFmtFull(t.actual)}</td>
            <td class="pct-cell ${t.rate_1>=100?'pos':'neg'}">${t.rate_1}%</td>
            <td class="pct-cell ${t.rate_120>=100?'pos':'neg'}">${t.rate_120}%</td>
            <td class="${t.missing_1<=0?'pos':'neg'}">${kpiSignFmtFull(t.missing_1)}</td>
            <td class="${t.missing_120<=0?'pos':'neg'}">${kpiSignFmtFull(t.missing_120)}</td>`;
        ['stage1','stage2','stage3'].forEach(sk => {
            const st = t.stages[sk];
            html += `<td>${kpiFmtFull(st.target)}</td><td>${kpiFmtFull(st.actual)}</td><td>${kpiFmtFull(st.avg_per_day)}</td><td class="${st.missing<=0?'pos':'neg'}">${kpiSignFmtFull(st.missing)}</td>`;
        });
        html += '</tr>';
    });

    // TỔNG row
    const s = data.summary;
    html += `<tr class="total-row"><td></td><td class="name">TỔNG</td>
        <td>${kpiFmtFull(s.target_1)}</td><td>${kpiFmtFull(s.target_120)}</td>
        <td>${kpiFmtFull(s.actual)}</td>
        <td class="pct-cell ${s.rate_1>=100?'pos':'neg'}">${s.rate_1}%</td>
        <td class="pct-cell ${s.rate_120>=100?'pos':'neg'}">${s.rate_120}%</td>
        <td class="${s.missing_1<=0?'pos':'neg'}">${kpiSignFmtFull(s.missing_1)}</td>
        <td class="${s.missing_120<=0?'pos':'neg'}">${kpiSignFmtFull(s.missing_120)}</td>`;
    ['stage1','stage2','stage3'].forEach(sk => {
        const st = s.stages[sk];
        html += `<td>${kpiFmtFull(st.target)}</td><td>${kpiFmtFull(st.actual)}</td><td>${kpiFmtFull(st.avg_per_day)}</td><td class="${st.missing<=0?'pos':'neg'}">${kpiSignFmtFull(st.missing)}</td>`;
    });
    html += '</tr></tbody></table></div>';

    // ===== SECTION 2: Doanh Thu Theo Ngày (Team) =====
    html += '<div class="kpi-section-title">📅 DOANH THU THEO NGÀY</div>';
    html += '<div class="kpi-tbl-wrap"><table class="kpi-tbl"><thead><tr><th>STT</th><th>Cơ sở</th>';
    for (let d = 1; d <= dim; d++) {
        const isTdy = (d === todayDay);
        html += `<th class="sub${isTdy?' kpi-today-hdr':''}">${d}/${data.month.month}${isTdy?' 📍':''}</th>`;
    }
    html += '</tr></thead><tbody>';

    data.teams.forEach((t, idx) => {
        html += `<tr><td>${idx+1}</td><td class="name">${t.dept_name}</td>`;
        t.daily.forEach(v => {
            html += `<td class="day-cell ${v>0?'has-val':'zero-val'}">${v>0?kpiFmt(v):'-'}</td>`;
        });
        html += '</tr>';
    });
    // TỔNG
    html += `<tr class="total-row"><td></td><td class="name">TỔNG</td>`;
    s.daily.forEach(v => {
        html += `<td class="day-cell ${v>0?'has-val':'zero-val'}" style="font-weight:900">${v>0?kpiFmt(v):'-'}</td>`;
    });
    html += '</tr></tbody></table></div>';

    // ===== SECTION 3: Doanh Thu Và Target Nhân Sự =====
    html += '<div class="kpi-section-title">👥 DOANH THU VÀ TARGET NHÂN SỰ</div>';
    html += '<div class="kpi-tbl-wrap"><table class="kpi-tbl"><thead><tr>';
    html += '<th>STT</th><th>Mã NV</th><th>TVV</th><th>Target</th><th>DTTT</th><th>Tỷ lệ HT</th><th>Còn thiếu</th>';
    for (let d = 1; d <= dim; d++) {
        const isTdy = (d === todayDay);
        html += `<th class="sub${isTdy?' kpi-today-hdr':''}">${d}/${data.month.month}${isTdy?' 📍':''}</th>`;
    }
    html += '</tr></thead><tbody>';

    data.teams.forEach(team => {
        // Team total row — on top
        html += `<tr class="team-row"><td></td><td></td><td class="name">${team.dept_name}</td>`;
        html += `<td>${kpiFmtFull(team.target_1)}</td>`;
        html += `<td>${kpiFmtFull(team.actual)}</td>`;
        html += `<td class="pct-cell ${team.rate_1>=100?'pos':'neg'}">${team.rate_1}%</td>`;
        html += `<td class="${team.missing_1<=0?'pos':'neg'}">${kpiSignFmtFull(team.missing_1)}</td>`;
        team.daily.forEach(v => {
            html += `<td class="day-cell ${v>0?'has-val':'zero-val'}" style="font-weight:800">${v>0?kpiFmt(v):'-'}</td>`;
        });
        html += '</tr>';
        // Employee rows — below
        team.employees.forEach((emp, ei) => {
            const roleIcon = emp.role === 'quan_ly' || emp.role === 'quan_ly_cap_cao' ? '👑 ' : emp.role === 'truong_phong' ? '⭐ ' : '';
            html += `<tr style="cursor:pointer" onclick="kpiShowEmpOrders(${emp.user_id},'${emp.full_name.replace(/'/g, "\\'")}')">`
            + `<td>${ei+1}</td><td>${emp.username||''}</td><td class="name">${roleIcon}${emp.full_name}</td>`;
            html += `<td>${kpiFmtFull(emp.target)}</td>`;
            html += `<td style="font-weight:700">${kpiFmtFull(emp.actual)}</td>`;
            html += `<td class="pct-cell ${emp.rate>=100?'pos':'neg'}">${emp.rate}%</td>`;
            html += `<td class="${emp.missing<=0?'pos':'neg'}">${kpiSignFmtFull(emp.missing)}</td>`;
            emp.daily.forEach(v => {
                html += `<td class="day-cell ${v>0?'has-val':'zero-val'}">${v>0?kpiFmt(v):'-'}</td>`;
            });
            html += '</tr>';
        });
        // Empty separator row
        html += '<tr><td colspan="99" style="height:8px;background:#f8fafc;border:none"></td></tr>';
    });

    html += '</tbody></table></div>';
    el.innerHTML = html;
}

// ===== Set KPI Modal =====
function kpiOpenSetTargets() {
    if (!_kpi.data || !_kpi.data.teams) return;
    const old = document.getElementById('kpiSetModal'); if (old) old.remove();
    const [y,m] = _kpi.month.split('-').map(Number);
    const periodLabel = `T${m}/${y}`;

    let rows = '';
    _kpi.data.teams.forEach(team => {
        rows += `<tr style="background:#fef9c3"><td colspan="4" style="font-weight:800;color:#92400e;padding:10px 12px">🏠 ${team.dept_name}</td></tr>`;
        team.employees.forEach(emp => {
            rows += `<tr>
                <td style="padding:8px 12px;font-weight:600">${emp.full_name}</td>
                <td style="padding:8px 12px;color:#6b7280;font-size:12px">${emp.username||''}</td>
                <td style="padding:8px 12px;color:#6b7280;font-size:12px">${kpiFmt(emp.actual)}</td>
                <td style="padding:8px 4px"><input type="number" data-uid="${emp.user_id}" value="${emp.target||''}" placeholder="VD: 250000000" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;text-align:right"></td>
            </tr>`;
        });
    });

    const modal = document.createElement('div');
    modal.id = 'kpiSetModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:90%;max-width:600px;max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);display:flex;flex-direction:column">
            <div style="padding:20px 24px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;display:flex;justify-content:space-between;align-items:center">
                <h3 style="margin:0;font-size:16px;font-weight:800">🎯 Đặt KPI Doanh Số — ${periodLabel}</h3>
                <button onclick="document.getElementById('kpiSetModal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">✕</button>
            </div>
            <div style="overflow-y:auto;flex:1;padding:0">
                <table style="width:100%;border-collapse:collapse">
                    <thead><tr style="background:#f8fafc">
                        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#475569">Nhân viên</th>
                        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#475569">Mã</th>
                        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569">DT Hiện tại</th>
                        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#475569">Target Mốc 1 (đ)</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end">
                <button onclick="document.getElementById('kpiSetModal').remove()" style="padding:10px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-weight:600;cursor:pointer">Hủy</button>
                <button onclick="kpiSaveTargets('${periodLabel}')" style="padding:10px 28px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">💾 Lưu KPI</button>
            </div>
        </div>
    `;
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

async function kpiSaveTargets(periodLabel) {
    const inputs = document.querySelectorAll('#kpiSetModal input[data-uid]');
    const targets = [];
    inputs.forEach(inp => {
        const uid = parseInt(inp.dataset.uid);
        const val = parseFloat(inp.value);
        if (uid && val > 0) targets.push({ user_id: uid, target_value: val });
    });
    if (targets.length === 0) { alert('Vui lòng nhập ít nhất 1 chỉ tiêu'); return; }

    try {
        const res = await apiCall('/api/kpi-targets/kpi-kdoanh', 'POST', { targets, period_value: periodLabel });
        if (res.success) {
            document.getElementById('kpiSetModal').remove();
            alert(`✅ Đã lưu KPI! (${res.created} mới, ${res.updated} cập nhật)`);
            kpiLoadData();
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Không rõ'));
        }
    } catch(e) { alert('❌ Lỗi: ' + e.message); }
}

// ===== Embedded Dashboard: Leaderboard + Team Comparison =====
var _kpiDashSort = 'revenue'; // default sort
function kpiDashFmtVND(n) {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' tr';
    if (n >= 1e3) return Math.round(n / 1e3) + 'k';
    return n.toLocaleString('vi-VN');
}

async function kpiLoadDashboard() {
    const lbEl = document.getElementById('kpiLeaderboard');
    const tcEl = document.getElementById('kpiTeamCompare');
    if (!lbEl || !tcEl) return;

    try {
        const retUrl = '/api/reports/customer-retention?period=month' + '&date=' + _kpi.month;
        const advUrl = '/api/reports/customer-retention/advanced?period=month' + '&date=' + _kpi.month;
        const [mainData, advData] = await Promise.all([
            apiCall(retUrl),
            apiCall(advUrl)
        ]);

        kpiRenderLeaderboard(lbEl, advData);
        kpiRenderTeamCompare(tcEl, mainData, advData);
    } catch(e) {
        console.error('Dashboard embed error:', e.message || e);
        if (lbEl) lbEl.innerHTML = '<div style="padding:20px;color:#ef4444;text-align:center">⚠️ Lỗi tải BXH: ' + (e.message || '') + '</div>';
    }
}

function kpiTrend(cur, prev) {
    if (prev == null || prev === 0) return cur > 0 ? '<span style="color:#fff;font-size:10px;font-weight:700;background:#10b981;padding:1px 6px;border-radius:4px">Mới</span>' : '';
    var diff = cur - prev;
    if (diff === 0) return '<span style="color:#94a3b8;font-size:10px">→0%</span>';
    var pct = Math.round(100 * diff / prev);
    if (diff > 0) return '<span style="color:#10b981;font-size:10px;font-weight:700">▲+' + pct + '%</span>';
    return '<span style="color:#ef4444;font-size:10px;font-weight:700">▼' + pct + '%</span>';
}

function kpiRenderLeaderboard(el, data) {
    var lbObj = data && data.leaderboard;
    var allEmp = data && data.allEmployees;
    var convMap = (data && data.conversionMap) || {};
    if (!lbObj && (!allEmp || allEmp.length === 0)) { el.innerHTML = ''; return; }

    var medals = ['🥇','🥈','🥉'];
    window.kpiDashSortLB = function(metric) {
        _kpiDashSort = metric;
        var lbEl2 = document.getElementById('kpiLeaderboard');
        if (lbEl2 && window._kpiAdvData) kpiRenderLeaderboard(lbEl2, window._kpiAdvData);
    };
    window._kpiAdvData = data;

    var lb;
    if (lbObj) {
        if (_kpiDashSort === 'orders') lb = lbObj.by_orders || allEmp || [];
        else if (_kpiDashSort === 'affiliate') lb = lbObj.by_affiliate || allEmp || [];
        else if (_kpiDashSort === 'retention') lb = lbObj.by_retention || allEmp || [];
        else lb = lbObj.by_revenue || allEmp || [];
    } else {
        lb = Array.isArray(allEmp) ? [].concat(allEmp) : [];
    }

    var tabs = [
        { key: 'revenue', icon: '💰', label: 'Doanh Số' },
        { key: 'orders', icon: '📦', label: 'Đơn Hàng' },
        { key: 'affiliate', icon: '🤝', label: 'TK Affiliate' },
        { key: 'retention', icon: '🔁', label: 'KH Cũ Quay Lại' }
    ];

    var h = '<div class="kpi-lb-section">';
    h += '<div class="kpi-lb-header">🏆 Bảng Xếp Hạng Nhân Viên</div>';
    h += '<div class="kpi-lb-tabs">';
    for (var ti = 0; ti < tabs.length; ti++) {
        var t = tabs[ti];
        h += '<button class="kpi-lb-tab ' + (_kpiDashSort === t.key ? 'active' : '') + '" onclick="kpiDashSortLB(\'' + t.key + '\')">' + t.icon + ' ' + t.label + '</button>';
    }
    h += '</div><div>';
    h += '<div class="kpi-lb-row" style="background:#f8fafc;font-weight:700;font-size:12px;color:#475569">';
    h += '<div>#</div><div>Nhân viên</div><div style="text-align:right">Đơn hàng</div><div style="text-align:right">Doanh số</div><div style="text-align:right">📊 CĐ</div><div style="text-align:right">TK Aff</div><div style="text-align:right">KH cũ %</div>';
    h += '</div>';

    for (var i = 0; i < lb.length; i++) {
        var emp = lb[i];
        var rank = i < 3 ? medals[i] : (i + 1);
        var conv = convMap[emp.user_id] || {};
        var cRate = conv.rate != null ? conv.rate + '%' : '—';
        var cColor = conv.rate >= 70 ? '#10b981' : conv.rate >= 40 ? '#f59e0b' : '#ef4444';
        var prev = emp.prev || {};
        h += '<div class="kpi-lb-row" style="cursor:pointer" onclick="kpiShowEmpOrders(' + emp.user_id + ',\'' + emp.name.replace(/'/g, "\\'") + '\')">';
        h += '<div class="kpi-lb-rank">' + rank + '</div>';
        h += '<div><div class="kpi-lb-name">' + emp.name + '</div><div class="kpi-lb-team">' + (emp.team || '') + '</div></div>';
        h += '<div class="kpi-lb-val" style="color:#4338ca">' + emp.total_orders + ' đơn<div>' + kpiTrend(emp.total_orders, prev.total_orders) + '</div></div>';
        h += '<div class="kpi-lb-val" style="color:#059669">' + kpiDashFmtVND(emp.revenue) + '<div>' + kpiTrend(emp.revenue, prev.revenue) + '</div></div>';
        h += '<div class="kpi-lb-val" style="color:' + cColor + ';font-size:12px">' + cRate + '<div>' + kpiTrend(conv.rate || 0, prev.conversion_rate || 0) + '</div></div>';
        h += '<div class="kpi-lb-val" style="color:#7c3aed">' + (emp.affiliate_new || 0) + '<div>' + kpiTrend(emp.affiliate_new || 0, prev.affiliate_new || 0) + '</div></div>';
        h += '<div class="kpi-lb-val" style="color:#c2410c">' + (emp.rate || 0) + '%<div>' + kpiTrend(emp.rate || 0, prev.rate || 0) + '</div></div>';
        h += '</div>';
    }
    h += '</div></div>';
    el.innerHTML = h;
}

var _tcSort = 'revenue';
window._tcAdvData = null;
window._tcMainData = null;

window.kpiTcSort = function(metric) {
    _tcSort = metric;
    var el = document.getElementById('kpiTeamCompare');
    if (el && window._tcAdvData) kpiRenderTeamCompare(el, window._tcMainData, window._tcAdvData);
};

function kpiRenderTeamCompare(el, data, advData) {
    var teams = advData && advData.teamComparison;
    if (!teams || teams.length === 0) { el.innerHTML = ''; return; }
    window._tcAdvData = advData;
    window._tcMainData = data;

    // Sort teams by selected metric
    var sorted = [].concat(teams);
    if (_tcSort === 'revenue') sorted.sort(function(a,b){return (b.revenue||0)-(a.revenue||0);});
    else if (_tcSort === 'orders') sorted.sort(function(a,b){return (b.total_orders||0)-(a.total_orders||0);});
    else if (_tcSort === 'affiliate') sorted.sort(function(a,b){return (b.affiliate_new||0)-(a.affiliate_new||0);});
    else if (_tcSort === 'retention') sorted.sort(function(a,b){return (b.rate||0)-(a.rate||0);});

    var tabs = [
        {key:'revenue',icon:'💰',label:'Doanh Số'},
        {key:'orders',icon:'📦',label:'Đơn Hàng'},
        {key:'affiliate',icon:'🤝',label:'TK Affiliate'},
        {key:'retention',icon:'🔁',label:'KH Cũ Quay Lại'}
    ];

    var h = '<div class="kpi-lb-section">';
    h += '<div class="kpi-lb-header">📊 So Sánh Team</div>';
    h += '<div class="kpi-lb-tabs">';
    for (var ti = 0; ti < tabs.length; ti++) {
        var t = tabs[ti];
        h += '<button class="kpi-lb-tab ' + (_tcSort === t.key ? 'active' : '') + '" onclick="kpiTcSort(\'' + t.key + '\')">' + t.icon + ' ' + t.label + '</button>';
    }
    h += '</div>';
    h += '<div class="kpi-tc-grid">';

    for (var i = 0; i < sorted.length; i++) {
        var team = sorted[i];
        var prev = team.prev || {};
        var hb = team.total_orders > 0;
        h += '<div class="kpi-tc-card"' + (hb ? ' style="border-color:#f59e0b;border-width:2px"' : '') + '>';
        h += '<div class="kpi-tc-name">🏠 ' + team.name + ' <span style="font-size:12px;font-weight:500;color:#6b7280">(' + (team.employee_count || 0) + ' NV)</span></div>';
        h += '<div class="kpi-tc-stats">';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#3b82f6">' + kpiDashFmtVND(team.revenue || 0) + '</div><div class="kpi-tc-stat-label">💰 Doanh Số</div><div style="margin-top:4px">' + kpiTrend(team.revenue || 0, prev.revenue || 0) + '</div></div>';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#4338ca">' + (team.total_orders || 0) + '</div><div class="kpi-tc-stat-label">📦 Tổng Đơn</div><div style="margin-top:4px">' + kpiTrend(team.total_orders || 0, prev.total_orders || 0) + '</div></div>';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#7c3aed">' + (team.rate || 0) + '%</div><div class="kpi-tc-stat-label">🔁 TỈ LỆ KH CŨ</div><div style="margin-top:4px">' + kpiTrend(team.rate || 0, prev.rate || 0) + '</div></div>';
        h += '<div class="kpi-tc-stat"><div class="kpi-tc-stat-val" style="color:#059669">' + (team.affiliate_new || 0) + '</div><div class="kpi-tc-stat-label">🤝 TẠO TK AFF</div><div style="margin-top:4px">' + kpiTrend(team.affiliate_new || 0, prev.affiliate_new || 0) + '</div></div>';
        h += '</div></div>';
    }
    h += '</div></div>';
    el.innerHTML = h;
}


// ===== MEETING COMMITMENTS EMBED =====
var _mcSession = null;
var _mcCommitments = [];
var _mcTeams = [];

async function kpiLoadMeetingCommit() {
    var el = document.getElementById('kpiMeetingCommit');
    if (!el) return;
    try {
        var empData = await apiCall('/api/meeting-commitments/employees');
        _mcTeams = empData.teams || [];
        var latestData = await apiCall('/api/meeting-commitments/latest');
        _mcSession = latestData.session;
        _mcCommitments = latestData.commitments || [];
        kpiRenderMeetingCommit(el);
    } catch(e) {
        console.error('Meeting commit error:', e);
        el.innerHTML = '<div style="padding:20px;color:#ef4444;text-align:center">Lỗi tải cam kết: ' + (e.message||'') + '</div>';
    }
}

function kpiRenderMeetingCommit(el) {
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var h = '<div class="kpi-mc-section">';
    h += '<div class="kpi-mc-header"><div>📝 Cam Kết Cuộc Họp';
    if (_mcSession) {
        var d = new Date(_mcSession.meeting_date);
        h += ' <span style="font-size:13px;font-weight:500;color:#92400e;margin-left:8px">— ' + _mcSession.title + ' (' + d.toLocaleDateString('vi-VN') + ')</span>';
    }
    h += '</div><div style="display:flex;gap:8px">';
    if (isGD) {
        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcCreateSession()">➕ Tạo Cuộc Họp</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSetupTemplates()" title="Setup câu hỏi cam kết mẫu">⚙️ Câu Hỏi Mẫu</button>';
    }
    h += '<a href="/camketcuochop" class="kpi-mc-btn kpi-mc-btn-ghost" style="text-decoration:none">📋 Xem Lịch Sử</a>';
    h += '</div></div>';

    if (!_mcSession) {
        h += '<div style="padding:40px;text-align:center;color:#6b7280"><div style="font-size:40px;margin-bottom:12px">📭</div>';
        h += '<div style="font-size:14px;font-weight:600">Chưa có cuộc họp nào</div>';
        h += '<div style="font-size:12px;color:#9ca3af;margin-top:4px">Bấm "➕ Tạo Cuộc Họp" để bắt đầu</div></div>';
        h += '</div>';
        el.innerHTML = h;
        return;
    }

    for (var ti = 0; ti < _mcTeams.length; ti++) {
        var team = _mcTeams[ti];
        if (!team.members || team.members.length === 0) continue;
        h += '<div class="kpi-mc-team">';
        h += '<div class="kpi-mc-team-name">🏠 ' + team.name + ' <span style="font-size:11px;color:#94a3b8;font-weight:500">(' + team.members.length + ' người)</span></div>';

        for (var mi = 0; mi < team.members.length; mi++) {
            var emp = team.members[mi];
            var empCommits = _mcCommitments.filter(function(c) { return c.user_id === emp.id; });
            var totalItems = empCommits.length;
            var doneItems = empCommits.filter(function(c) { return c.is_completed; }).length;
            var avgPct = totalItems > 0 ? Math.round(empCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / totalItems) : 0;

            var roleLabel = '';
            if (emp.role === 'quan_ly' || emp.role === 'quan_ly_cap_cao') roleLabel = 'Quản Lý';
            else if (emp.role === 'truong_phong') roleLabel = 'Trưởng Phòng';

            h += '<div class="kpi-mc-emp">';
            h += '<div><span class="kpi-mc-emp-name">' + emp.full_name + '</span>';
            if (roleLabel) h += '<span class="kpi-mc-emp-role">(' + roleLabel + ')</span>';
            h += '</div>';
            h += '<div class="kpi-mc-emp-actions">';

            if (totalItems > 0) {
                if (doneItems === totalItems) {
                    h += '<span class="kpi-mc-badge kpi-mc-badge-done">✅ ' + doneItems + '/' + totalItems + ' — 100%</span>';
                } else {
                    h += '<span class="kpi-mc-badge kpi-mc-badge-pending">⏳ ' + doneItems + '/' + totalItems + ' — ' + avgPct + '%</span>';
                }
                if (isGD) {
                    h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">✅ Review</button>';
                    h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcEditUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">✏️</button>';
                }
            } else {
                h += '<span class="kpi-mc-badge kpi-mc-badge-none">Chưa có cam kết</span>';
                if (isGD) {
                    h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcEditUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">📝 Ghi</button>';
                }
            }
            h += '</div></div>';
        }
        h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
}

// Create session popup
window.mcCreateSession = function() {
    var today = new Date().toISOString().split('T')[0];
    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>➕ Tạo Cuộc Họp Mới</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body">'
        + '<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Tiêu đề cuộc họp</label>'
        + '<input class="kpi-mc-input" id="mcSessionTitle" placeholder="VD: Họp tuần 1 - Tháng 5/2026"></div>'
        + '<div><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Ngày họp</label>'
        + '<input class="kpi-mc-input" type="date" id="mcSessionDate" value="' + today + '"></div>'
        + '</div>'
        + '<div class="kpi-mc-modal-foot">'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
        + '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveSession()">Tạo Cuộc Họp</button>'
        + '</div></div>';
    document.body.appendChild(overlay);
};

window.mcSaveSession = async function() {
    var title = document.getElementById('mcSessionTitle').value.trim();
    var date = document.getElementById('mcSessionDate').value;
    if (!title) return alert('Vui lòng nhập tiêu đề');
    if (!date) return alert('Vui lòng chọn ngày');
    try {
        await apiCall('/api/meeting-commitments/sessions', 'POST', { title: title, meeting_date: date });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        kpiLoadMeetingCommit();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// Edit/Add commitments for a user — auto-fill from templates if no existing commitments
window.mcEditUser = async function(userId, userName) {
    var existing = _mcCommitments.filter(function(c) { return c.user_id === userId; });
    var items;

    if (existing.length > 0) {
        items = existing.map(function(c) { return { content: c.content, target_revenue: c.target_revenue }; });
    } else {
        // Try to load templates for this page
        try {
            var tplData = await apiCall('/api/meeting-commitments/templates?page=kpikdoanh');
            if (tplData.templates && tplData.templates.length > 0) {
                items = tplData.templates.map(function(t) {
                    return { content: t.question_content, target_revenue: 0, isTemplate: true, hasRevenue: t.has_revenue_target };
                });
            } else {
                items = [{ content: '', target_revenue: 0 }];
            }
        } catch(e) {
            items = [{ content: '', target_revenue: 0 }];
        }
    }

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>📝 Cam Kết — ' + userName + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body"><div id="mcItemsList">';

    for (var i = 0; i < items.length; i++) {
        h += mcRenderItemEdit(i + 1, items[i].content, items[i].target_revenue, items[i].isTemplate);
    }

    h += '</div>'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcAddItem()" style="width:100%;margin-top:10px">➕ Thêm cam kết</button>'
        + '</div>'
        + '<div class="kpi-mc-modal-foot">'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
        + '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveCommitments(' + userId + ')">💾 Lưu Cam Kết</button>'
        + '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

function mcRenderItemEdit(stt, content, revenue, isTemplate) {
    var tplBadge = isTemplate ? '<span style="font-size:10px;background:#dbeafe;color:#2563eb;padding:1px 6px;border-radius:4px;margin-left:6px">Mẫu</span>' : '';
    return '<div class="kpi-mc-item" data-mc-item>'
        + '<div class="kpi-mc-item-head">'
        + '<div class="kpi-mc-item-stt">' + stt + '</div>'
        + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Cam kết #' + stt + tplBadge + '</div>'
        + '<button class="kpi-mc-remove" onclick="this.closest(\'[data-mc-item]\').remove();mcReindex()">✕</button>'
        + '</div>'
        + '<textarea class="kpi-mc-input mc-content" rows="2" placeholder="Nội dung cam kết..." style="margin-bottom:8px;resize:vertical">' + (content || '') + '</textarea>'
        + '<input class="kpi-mc-input mc-revenue" type="number" placeholder="Mục tiêu doanh số (VD: 50000000)" value="' + (revenue || 0) + '">'
        + '</div>';
}

window.mcAddItem = function() {
    var list = document.getElementById('mcItemsList');
    var count = list.querySelectorAll('[data-mc-item]').length;
    list.insertAdjacentHTML('beforeend', mcRenderItemEdit(count + 1, '', 0));
};

window.mcReindex = function() {
    var items = document.querySelectorAll('#mcItemsList [data-mc-item]');
    for (var i = 0; i < items.length; i++) {
        var stt = items[i].querySelector('.kpi-mc-item-stt');
        if (stt) stt.textContent = i + 1;
        var head = items[i].querySelector('.kpi-mc-item-head div:nth-child(2)');
        if (head) head.textContent = 'Cam kết #' + (i + 1);
    }
};

window.mcSaveCommitments = async function(userId) {
    var itemEls = document.querySelectorAll('#mcItemsList [data-mc-item]');
    var items = [];
    for (var i = 0; i < itemEls.length; i++) {
        var content = itemEls[i].querySelector('.mc-content').value.trim();
        var revenue = parseFloat(itemEls[i].querySelector('.mc-revenue').value) || 0;
        if (content) items.push({ content: content, target_revenue: revenue });
    }
    if (items.length === 0) return alert('Cần ít nhất 1 cam kết');
    try {
        await apiCall('/api/meeting-commitments', 'POST', { session_id: _mcSession.id, user_id: userId, items: items });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        kpiLoadMeetingCommit();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// Review commitments for a user
window.mcReviewUser = async function(userId, userName) {
    var userCommits = _mcCommitments.filter(function(c) { return c.user_id === userId; });
    if (userCommits.length === 0) return alert('Chưa có cam kết');

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>✅ Review — ' + userName + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body">';

    for (var i = 0; i < userCommits.length; i++) {
        var c = userCommits[i];
        var rev = c.target_revenue > 0 ? ' — Mục tiêu: ' + kpiDashFmtVND(c.target_revenue) : '';
        h += '<div class="kpi-mc-item" data-review-id="' + c.id + '">'
            + '<div class="kpi-mc-item-head"><div class="kpi-mc-item-stt">' + c.stt + '</div>'
            + '<div style="flex:1;font-size:13px"><div style="font-weight:700;color:#1e293b">' + c.content + '</div>'
            + '<div style="font-size:11px;color:#6b7280;margin-top:2px">' + rev + '</div></div></div>'
            + '<div style="display:flex;gap:10px;align-items:center;margin-top:8px">'
            + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;color:#374151"><input type="checkbox" class="rv-done" ' + (c.is_completed ? 'checked' : '') + '> Hoàn thành</label>'
            + '<div style="flex:1"><input type="range" class="rv-pct" min="0" max="100" value="' + (c.completion_pct || 0) + '" style="width:100%" oninput="this.nextElementSibling.textContent=this.value+\'%\'"><span style="font-size:11px;font-weight:700;color:#4338ca">' + (c.completion_pct || 0) + '%</span></div>'
            + '</div>'
            + '<input class="kpi-mc-input rv-note" placeholder="Ghi chú review..." value="' + (c.review_note || '') + '" style="margin-top:8px">'
            + '</div>';
    }

    h += '</div><div class="kpi-mc-modal-foot">'
        + '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>'
        + '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveReview()">💾 Lưu Review</button>'
        + '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window.mcSaveReview = async function() {
    var items = document.querySelectorAll('[data-review-id]');
    var reviews = [];
    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        reviews.push({
            id: parseInt(el.getAttribute('data-review-id')),
            is_completed: el.querySelector('.rv-done').checked,
            completion_pct: parseInt(el.querySelector('.rv-pct').value) || 0,
            review_note: el.querySelector('.rv-note').value
        });
    }
    try {
        await apiCall('/api/meeting-commitments/batch-review', 'PUT', { reviews: reviews });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        kpiLoadMeetingCommit();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// ===== TEMPLATE SETUP MODAL (GĐ only) =====
window.mcSetupTemplates = async function() {
    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    // Load existing templates
    var templates = [];
    try {
        var res = await apiCall('/api/meeting-commitments/templates?page=kpikdoanh');
        templates = res.templates || [];
    } catch(e) {}

    var h = '<div class="kpi-mc-modal" style="max-width:600px">'
        + '<div class="kpi-mc-modal-head"><h3>⚙️ Setup Câu Hỏi Cam Kết — KPI P.Kinh Doanh</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body">'
        + '<div style="margin-bottom:12px;padding:10px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#166534">💡 Các câu hỏi mẫu sẽ tự động điền vào form khi bấm "📝 Ghi" cho nhân viên chưa có cam kết.</div>'
        + '<div id="mcTplList">';

    if (templates.length === 0) {
        h += mcRenderTplItem(1, '', false);
    } else {
        for (var i = 0; i < templates.length; i++) {
            h += mcRenderTplItem(i + 1, templates[i].question_content, templates[i].has_revenue_target);
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

function mcRenderTplItem(stt, content, hasRevenue) {
    return '<div class="kpi-mc-item" data-tpl-item>'
        + '<div class="kpi-mc-item-head">'
        + '<div class="kpi-mc-item-stt">' + stt + '</div>'
        + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Câu hỏi #' + stt + '</div>'
        + '<button class="kpi-mc-remove" onclick="this.closest(\'[data-tpl-item]\').remove();mcReindexTpl()">✕</button>'
        + '</div>'
        + '<textarea class="kpi-mc-input tpl-content" rows="2" placeholder="VD: Mục tiêu doanh số giai đoạn tiếp theo?" style="margin-bottom:8px;resize:vertical">' + (content || '') + '</textarea>'
        + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;cursor:pointer"><input type="checkbox" class="tpl-has-rev"' + (hasRevenue ? ' checked' : '') + '> Có ô nhập mục tiêu doanh số</label>'
        + '</div>';
}

window.mcAddTplItem = function() {
    var list = document.getElementById('mcTplList');
    if (!list) return;
    var count = list.querySelectorAll('[data-tpl-item]').length;
    list.insertAdjacentHTML('beforeend', mcRenderTplItem(count + 1, '', false));
};

window.mcReindexTpl = function() {
    var items = document.querySelectorAll('[data-tpl-item]');
    for (var i = 0; i < items.length; i++) {
        items[i].querySelector('.kpi-mc-item-stt').textContent = (i + 1);
        items[i].querySelector('[style*="flex:1"]').childNodes[0].textContent = 'Câu hỏi #' + (i + 1);
    }
};

window.mcSaveTemplates = async function() {
    var items = document.querySelectorAll('[data-tpl-item]');
    var data = [];
    for (var i = 0; i < items.length; i++) {
        var content = items[i].querySelector('.tpl-content').value.trim();
        var hasRev = items[i].querySelector('.tpl-has-rev').checked;
        if (content) {
            data.push({ question_content: content, has_revenue_target: hasRev });
        }
    }
    try {
        await apiCall('/api/meeting-commitments/templates', 'PUT', { page_key: 'kpikdoanh', items: data });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        alert('✅ Đã lưu ' + data.length + ' câu hỏi mẫu!');
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// ===== ORDER DETAIL POPUP =====
var _odOrders = [];
var _odFilter = 'all';

window.kpiShowEmpOrders = async function(userId, userName) {
    _odFilter = 'all';
    var overlay = document.createElement('div');
    overlay.className = 'kpi-od-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="kpi-od-modal">'
        + '<div class="kpi-od-head"><h3>📊 Chi tiết đơn — ' + userName + '</h3>'
        + '<button class="kpi-od-close" onclick="this.closest(\'.kpi-od-overlay\').remove()">✕</button></div>'
        + '<div class="kpi-od-body" id="odBody"><div style="padding:40px;text-align:center;color:#64748b">⏳ Đang tải...</div></div>'
        + '</div>';
    document.body.appendChild(overlay);

    try {
        var data = await apiCall('/api/kpi-kdoanh/employee-orders?user_id=' + userId + '&month=' + _kpi.month);
        _odOrders = data.orders || [];
        var summary = data.summary || {};
        var body = document.getElementById('odBody');
        if (!body) return;

        var [y, m] = _kpi.month.split('-').map(Number);
        var monthLabel = 'T' + m + '/' + y;

        var h = '<div class="kpi-od-tabs" id="odTabs">'
            + '<button class="kpi-od-tab kpi-od-tab-all active-all" data-f="all" onclick="odSetFilter(\'all\')">Tất cả (' + summary.total + ')</button>'
            + '<button class="kpi-od-tab kpi-od-tab-new" data-f="moi" onclick="odSetFilter(\'moi\')">Đ.Mới (' + summary.new_orders + ')</button>'
            + '<button class="kpi-od-tab kpi-od-tab-old" data-f="cu" onclick="odSetFilter(\'cu\')">Đ.Cũ (' + summary.old_orders + ')</button>'
            + '<div class="kpi-od-month">📅 ' + monthLabel + '</div>'
            + '</div>';
        h += '<div id="odTableWrap"></div>';
        body.innerHTML = h;
        odRenderTable();
    } catch(e) {
        var body = document.getElementById('odBody');
        if (body) body.innerHTML = '<div class="kpi-od-empty">⚠️ Lỗi: ' + (e.message || '') + '</div>';
    }
};

window.odSetFilter = function(f) {
    _odFilter = f;
    _odPage = 1;
    var tabs = document.querySelectorAll('#odTabs .kpi-od-tab');
    for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var df = t.getAttribute('data-f');
        t.className = 'kpi-od-tab';
        if (df === 'all') t.classList.add('kpi-od-tab-all');
        else if (df === 'moi') t.classList.add('kpi-od-tab-new');
        else t.classList.add('kpi-od-tab-old');
        if (df === f) {
            if (f === 'all') t.classList.add('active-all');
            else if (f === 'moi') t.classList.add('active-new');
            else t.classList.add('active-old');
        }
    }
    odRenderTable();
};

var _odPage = 1;
var _odPerPage = 25;

function odRenderTable() {
    var wrap = document.getElementById('odTableWrap');
    if (!wrap) return;
    var filtered = _odFilter === 'all' ? _odOrders : _odOrders.filter(function(o) { return o.customer_type === _odFilter; });

    if (filtered.length === 0) {
        wrap.innerHTML = '<div class="kpi-od-empty">Không có đơn hàng</div>';
        return;
    }

    var totalPages = Math.ceil(filtered.length / _odPerPage);
    if (_odPage > totalPages) _odPage = totalPages;
    if (_odPage < 1) _odPage = 1;
    var start = (_odPage - 1) * _odPerPage;
    var end = Math.min(start + _odPerPage, filtered.length);
    var pageItems = filtered.slice(start, end);

    var h = '<table class="kpi-od-table"><thead><tr>'
        + '<th>#</th><th>Loại</th><th>Mã Đơn</th><th>Khách Hàng</th><th>SĐT</th><th style="text-align:right">Doanh số</th><th>Ngày HT</th><th style="text-align:center">Lần</th>'
        + '</tr></thead><tbody>';

    for (var i = 0; i < pageItems.length; i++) {
        var o = pageItems[i];
        var dt = new Date(o.created_at);
        var dateStr = dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
        var typeClass = o.customer_type === 'moi' ? 'kpi-od-type-moi' : 'kpi-od-type-cu';
        var typeLabel = o.customer_type === 'moi' ? '🆕 Mới' : '🔄 Cũ';
        var rev = parseFloat(o.revenue || 0);
        var revStr = rev >= 1e6 ? (rev / 1e6).toFixed(1).replace(/\.0$/, '') + ' tr' : rev.toLocaleString('vi-VN');

        h += '<tr><td>' + (start + i + 1) + '</td>'
            + '<td><span class="kpi-od-type ' + typeClass + '">' + typeLabel + '</span></td>'
            + '<td class="kpi-od-code">' + (o.order_code || '—') + '</td>'
            + '<td>' + (o.customer_name || '') + '</td>'
            + '<td style="color:#94a3b8;font-size:11px">' + (o.customer_phone || '') + '</td>'
            + '<td class="kpi-od-revenue" style="text-align:right">' + revStr + '</td>'
            + '<td style="font-size:11px">' + dateStr + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#60a5fa">' + (o.order_count || 1) + '</td>'
            + '</tr>';
    }
    h += '</tbody></table>';

    // Pagination
    if (totalPages > 1) {
        h += '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;border-top:1px solid rgba(255,255,255,.06)">';
        h += '<button onclick="odGoPage(' + (_odPage - 1) + ')" ' + (_odPage <= 1 ? 'disabled' : '') + ' style="padding:6px 14px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;background:' + (_odPage <= 1 ? 'rgba(255,255,255,.05);color:#475569' : 'rgba(99,102,241,.15);color:#818cf8') + '">‹ Trước</button>';
        // Page numbers
        for (var p = 1; p <= totalPages; p++) {
            if (totalPages <= 7 || p <= 2 || p >= totalPages - 1 || Math.abs(p - _odPage) <= 1) {
                h += '<button onclick="odGoPage(' + p + ')" style="width:32px;height:32px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;'
                    + (p === _odPage ? 'background:#6366f1;color:#fff;box-shadow:0 2px 8px rgba(99,102,241,.4)' : 'background:rgba(255,255,255,.05);color:#94a3b8') + '">' + p + '</button>';
            } else if (p === 3 && _odPage > 4) {
                h += '<span style="color:#475569;font-size:12px">…</span>';
            } else if (p === totalPages - 2 && _odPage < totalPages - 3) {
                h += '<span style="color:#475569;font-size:12px">…</span>';
            }
        }
        h += '<button onclick="odGoPage(' + (_odPage + 1) + ')" ' + (_odPage >= totalPages ? 'disabled' : '') + ' style="padding:6px 14px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;background:' + (_odPage >= totalPages ? 'rgba(255,255,255,.05);color:#475569' : 'rgba(99,102,241,.15);color:#818cf8') + '">Sau ›</button>';
        h += '<span style="font-size:11px;color:#64748b;margin-left:8px">' + filtered.length + ' đơn</span>';
        h += '</div>';
    }

    wrap.innerHTML = h;
}

window.odGoPage = function(p) {
    _odPage = p;
    odRenderTable();
    // Scroll table to top
    var wrap = document.getElementById('odTableWrap');
    if (wrap) wrap.scrollTop = 0;
};
