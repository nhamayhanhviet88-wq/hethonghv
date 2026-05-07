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
            .kpi-mc-btn{padding:8px 16px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}
            .kpi-mc-btn-primary{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;box-shadow:0 2px 8px rgba(79,70,229,.3)}
            .kpi-mc-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(79,70,229,.4)}
            .kpi-mc-btn-ghost{background:rgba(99,102,241,.08);color:#4338ca}
            .kpi-mc-btn-ghost:hover{background:rgba(99,102,241,.15)}
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
    // Fire ALL APIs in parallel for maximum speed
    kpiLoadAll();
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

async function kpiLoadAll() {
    var lbl = document.getElementById('kpiMonthLabel');
    var content = document.getElementById('kpiContent');
    if (lbl) { var p=_kpi.month.split('-').map(Number); lbl.textContent = 'Tháng ' + p[1] + '/' + p[0]; }
    if (content) content.innerHTML = '<div style="text-align:center;padding:60px;color:#9ca3af">⏳ Đang tải...</div>';

    var kpiMonthParts = _kpi.month.split('-').map(Number);
    var kpiYear = kpiMonthParts[0], kpiMo = kpiMonthParts[1];
    try {
        var results = await Promise.all([
            apiCall('/api/reports/kpi-kdoanh?month=' + _kpi.month),
            apiCall('/api/reports/customer-retention?period=month&date=' + _kpi.month),
            apiCall('/api/reports/customer-retention/advanced?period=month&date=' + _kpi.month),
            apiCall('/api/meeting-commitments/employees'),
            apiCall('/api/meeting-commitments/monthly?month=' + kpiMo + '&year=' + kpiYear)
        ]);

        _kpi.data = results[0];
        kpiRenderSummary(results[0]);
        kpiRenderContent(results[0]);

        var lbEl = document.getElementById('kpiLeaderboard');
        var tcEl = document.getElementById('kpiTeamCompare');
        if (lbEl && tcEl) { kpiRenderLeaderboard(lbEl, results[2]); kpiRenderTeamCompare(tcEl, results[1], results[2]); }

        _mcTeams = results[3].teams || [];
        _mcSessions = results[4].sessions || [];
        _mcAllCommitments = results[4].allCommitments || [];
        // Load yearly data
        try { _mcYearlyData = await apiCall('/api/meeting-commitments/yearly-summary?year=' + kpiYear); } catch(e) { _mcYearlyData = null; }
        if (_mcSessions.length > 0) {
            _mcSession = _mcSessions[_mcSessions.length - 1];
            _mcCommitments = _mcAllCommitments.filter(function(c) { return c.session_id === _mcSession.id; });
        } else { _mcSession = null; _mcCommitments = []; }
        var mcEl = document.getElementById('kpiMeetingCommit');
        if (mcEl) kpiRenderMeetingCommit(mcEl);
    } catch(e) {
        console.error('KPI load error:', e);
        if (content) content.innerHTML = '<div style="text-align:center;padding:60px;color:#ef4444">❌ Lỗi: ' + (e.message||'') + '</div>';
    }
}

async function kpiLoadData() {
    var lbl = document.getElementById('kpiMonthLabel');
    var content = document.getElementById('kpiContent');
    if (lbl) { var p=_kpi.month.split('-').map(Number); lbl.textContent = 'Tháng ' + p[1] + '/' + p[0]; }
    if (content) content.innerHTML = '<div style="text-align:center;padding:60px;color:#9ca3af">⏳ Đang tải...</div>';

    var kpiParts2 = _kpi.month.split('-').map(Number);
    var kpiY2 = kpiParts2[0], kpiM2 = kpiParts2[1];
    try {
        var results = await Promise.all([
            apiCall('/api/reports/kpi-kdoanh?month=' + _kpi.month),
            apiCall('/api/reports/customer-retention?period=month&date=' + _kpi.month),
            apiCall('/api/reports/customer-retention/advanced?period=month&date=' + _kpi.month),
            apiCall('/api/meeting-commitments/employees'),
            apiCall('/api/meeting-commitments/monthly?month=' + kpiM2 + '&year=' + kpiY2)
        ]);
        _kpi.data = results[0];
        kpiRenderSummary(results[0]);
        kpiRenderContent(results[0]);
        var lbEl = document.getElementById('kpiLeaderboard');
        var tcEl = document.getElementById('kpiTeamCompare');
        if (lbEl && tcEl) { kpiRenderLeaderboard(lbEl, results[2]); kpiRenderTeamCompare(tcEl, results[1], results[2]); }

        // Reload meeting commitments for the selected month
        _mcTeams = results[3].teams || [];
        _mcSessions = results[4].sessions || [];
        _mcAllCommitments = results[4].allCommitments || [];
        try { _mcYearlyData = await apiCall('/api/meeting-commitments/yearly-summary?year=' + kpiY2); } catch(e) { _mcYearlyData = null; }
        if (_mcSessions.length > 0) {
            _mcSession = _mcSessions[_mcSessions.length - 1];
            _mcCommitments = _mcAllCommitments.filter(function(c) { return c.session_id === _mcSession.id; });
        } else { _mcSession = null; _mcCommitments = []; }
        var mcEl = document.getElementById('kpiMeetingCommit');
        if (mcEl) kpiRenderMeetingCommit(mcEl);
    } catch(e) {
        if(content) content.innerHTML = '<div style="text-align:center;padding:60px;color:#ef4444">❌ Lỗi: ' + (e.message||'') + '</div>';
    }
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

// === Leaderboard filter state ===
var _kpiLbFilter = 'this_month'; // default: tháng này
var _kpiLbCustomStart = '';
var _kpiLbCustomEnd = '';
var _kpiLbMonth = ''; // for CHỌN THÁNG picker

function kpiLbBuildUrl() {
    var base = '/api/reports/customer-retention/advanced';
    var now = new Date();
    var fmtD = function(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    if (_kpiLbFilter === 'today') {
        return base + '?period=day&date=' + fmtD(now);
    } else if (_kpiLbFilter === 'yesterday') {
        var yd = new Date(now); yd.setDate(yd.getDate() - 1);
        return base + '?period=day&date=' + fmtD(yd);
    } else if (_kpiLbFilter === '7days') {
        var s7 = new Date(now); s7.setDate(s7.getDate() - 6);
        return base + '?period=custom&startDate=' + fmtD(s7) + '&endDate=' + fmtD(now);
    } else if (_kpiLbFilter === 'this_month') {
        var tm = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
        return base + '?period=month&date=' + tm;
    } else if (_kpiLbFilter === 'last_month') {
        var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var lmStr = lm.getFullYear() + '-' + String(lm.getMonth()+1).padStart(2,'0');
        return base + '?period=month&date=' + lmStr;
    } else if (_kpiLbFilter === 'all') {
        return base + '?period=year&date=' + now.getFullYear();
    } else if (_kpiLbFilter === 'stage1' || _kpiLbFilter === 'stage2' || _kpiLbFilter === 'stage3') {
        var refMonth = _kpiLbMonth || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
        var parts = refMonth.split('-').map(Number);
        var y = parts[0], m = parts[1];
        var dim = new Date(y, m, 0).getDate();
        var sd, ed;
        if (_kpiLbFilter === 'stage1') { sd = '01'; ed = '10'; }
        else if (_kpiLbFilter === 'stage2') { sd = '11'; ed = '20'; }
        else { sd = '21'; ed = String(dim); }
        var startDate = y + '-' + String(m).padStart(2,'0') + '-' + sd;
        var endDate = y + '-' + String(m).padStart(2,'0') + '-' + ed;
        return base + '?period=custom&startDate=' + startDate + '&endDate=' + endDate;
    } else if (_kpiLbFilter === 'pick_month' && _kpiLbMonth) {
        return base + '?period=month&date=' + _kpiLbMonth;
    } else if (_kpiLbFilter === 'custom' && _kpiLbCustomStart && _kpiLbCustomEnd) {
        return base + '?period=custom&startDate=' + _kpiLbCustomStart + '&endDate=' + _kpiLbCustomEnd;
    }
    var fallback = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    return base + '?period=month&date=' + fallback;
}

window.kpiLbSetFilter = async function(filter) {
    _kpiLbFilter = filter;
    // For "Tùy chọn" (custom) — show date pickers, don't fetch yet
    if (filter === 'custom') {
        var lbEl = document.getElementById('kpiLeaderboard');
        if (lbEl && window._kpiAdvData) kpiRenderLeaderboard(lbEl, window._kpiAdvData);
        return;
    }
    await kpiLbRefetch();
};

window.kpiLbApplyCustom = async function() {
    var sd = document.getElementById('kpiLbStartDate');
    var ed = document.getElementById('kpiLbEndDate');
    if (!sd || !ed || !sd.value || !ed.value) { alert('Vui lòng chọn ngày bắt đầu và kết thúc'); return; }
    _kpiLbCustomStart = sd.value;
    _kpiLbCustomEnd = ed.value;
    _kpiLbFilter = 'custom';
    await kpiLbRefetch();
};

window.kpiLbPickMonth = async function(val) {
    if (!val) return;
    _kpiLbMonth = val;
    _kpiLbFilter = 'pick_month';
    await kpiLbRefetch();
};

async function kpiLbRefetch() {
    var lbEl = document.getElementById('kpiLeaderboard');
    var tcEl = document.getElementById('kpiTeamCompare');
    if (!lbEl) return;
    // Show loading
    lbEl.innerHTML = '<div class="kpi-lb-section"><div class="kpi-lb-header">🏆 Bảng Xếp Hạng Nhân Viên</div><div style="padding:40px;text-align:center;color:#9ca3af">⏳ Đang tải...</div></div>';
    try {
        var url = kpiLbBuildUrl();
        // Also fetch main retention for team compare
        var retUrl = '/api/reports/customer-retention?period=month&date=' + _kpi.month;
        var results = await Promise.all([apiCall(url), apiCall(retUrl)]);
        var advData = results[0];
        var mainData = results[1];
        kpiRenderLeaderboard(lbEl, advData);
        if (tcEl) kpiRenderTeamCompare(tcEl, mainData, advData);
    } catch(e) {
        console.error('LB refetch error:', e);
        lbEl.innerHTML = '<div class="kpi-lb-section"><div style="padding:20px;color:#ef4444;text-align:center">⚠️ Lỗi: ' + (e.message||'') + '</div></div>';
    }
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

    // Filter presets — row 1: quick time filters
    var filterRow1 = [
        { key: 'today', icon: '📅', label: 'Hôm nay' },
        { key: 'yesterday', icon: '📅', label: 'Hôm qua' },
        { key: '7days', icon: '📅', label: '7 ngày' },
        { key: 'this_month', icon: '📅', label: 'Tháng này' },
        { key: 'last_month', icon: '📅', label: 'Tháng trước' },
        { key: 'all', icon: '📅', label: 'Tất cả' },
        { key: 'custom', icon: '📅', label: 'Tùy chọn' }
    ];
    // Filter presets — row 2: stages
    var filterRow2 = [
        { key: 'stage1', icon: '🔥', label: 'GĐ 1 (1-10)' },
        { key: 'stage2', icon: '⚡', label: 'GĐ 2 (11-20)' },
        { key: 'stage3', icon: '🎯', label: 'GĐ 3 (21-31)' }
    ];

    var h = '<div class="kpi-lb-section">';
    h += '<div class="kpi-lb-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="kpiToggleLb()">';
    h += '<span>🏆 Bảng Xếp Hạng Nhân Viên</span>';
    h += '<span style="font-size:18px;transition:transform .3s;transform:rotate(' + (_kpiLbCollapsed ? '-90deg' : '0') + ')">' + (_kpiLbCollapsed ? '▶' : '▼') + '</span>';
    h += '</div>';
    // Show active period info
    var periodInfo = data && data.period;
    if (periodInfo && periodInfo.start) {
        h += '<div style="padding:4px 24px;font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff">📌 Dữ liệu: ' + periodInfo.start + ' → ' + periodInfo.end + ' (' + (periodInfo.label || '') + ')</div>';
    }

    // Collapsible content wrapper
    h += '<div id="kpiLbBody" style="' + (_kpiLbCollapsed ? 'display:none' : '') + '">';

    // === FILTER BAR ROW 1 ===
    h += '<div class="kpi-lb-filter-bar" style="display:flex;align-items:center;gap:6px;padding:10px 24px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-wrap:wrap">';
    h += '<span style="font-size:12px;font-weight:700;color:#475569;margin-right:4px">📊</span>';
    for (var fi = 0; fi < filterRow1.length; fi++) {
        var fp = filterRow1[fi];
        var isActive = _kpiLbFilter === fp.key;
        var btnStyle = isActive
            ? 'background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;box-shadow:0 2px 8px rgba(67,56,202,.3)'
            : 'background:#fff;color:#374151;border:1px solid #d1d5db';
        h += '<button onclick="kpiLbSetFilter(\'' + fp.key + '\')" style="' + btnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += fp.icon + ' ' + fp.label + '</button>';
    }
    h += '</div>';

    // === FILTER BAR ROW 2: Stages + Month Picker ===
    h += '<div style="display:flex;align-items:center;gap:6px;padding:8px 24px;background:#fefce8;border-bottom:1px solid #fde68a;flex-wrap:wrap">';
    for (var si = 0; si < filterRow2.length; si++) {
        var sp = filterRow2[si];
        var isStageActive = _kpiLbFilter === sp.key;
        var sBtnStyle = isStageActive
            ? 'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;box-shadow:0 2px 8px rgba(217,119,6,.3)'
            : 'background:#fff;color:#78350f;border:1px solid #fcd34d';
        h += '<button onclick="kpiLbSetFilter(\'' + sp.key + '\')" style="' + sBtnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += sp.icon + ' ' + sp.label + '</button>';
    }
    // Separator
    h += '<span style="width:1px;height:24px;background:#d1d5db;margin:0 6px"></span>';
    // Month picker
    var isMonthPickActive = _kpiLbFilter === 'pick_month';
    h += '<span style="font-size:12px;font-weight:700;color:#78350f">📆 CHỌN THÁNG</span>';
    h += '<input type="month" id="kpiLbMonthPicker" value="' + (_kpiLbMonth || '') + '" onchange="kpiLbPickMonth(this.value)" style="padding:5px 10px;border:1px solid ' + (isMonthPickActive ? '#4338ca' : '#d1d5db') + ';border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:' + (isMonthPickActive ? '#eef2ff' : '#fff') + '">';
    h += '</div>';

    // Custom date pickers (shown only when custom is active)
    if (_kpiLbFilter === 'custom') {
        h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 24px;background:#eef2ff;border-bottom:1px solid #c7d2fe;flex-wrap:wrap">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Từ:</span>';
        h += '<input type="date" id="kpiLbStartDate" value="' + (_kpiLbCustomStart || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Đến:</span>';
        h += '<input type="date" id="kpiLbEndDate" value="' + (_kpiLbCustomEnd || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<button onclick="kpiLbApplyCustom()" style="padding:6px 16px;border-radius:8px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">🔍 Áp dụng</button>';
        h += '</div>';
    }

    // === SORT TABS ===
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
    h += '</div>';
    h += '</div>'; // close kpiLbBody
    h += '</div>'; // close kpi-lb-section
    el.innerHTML = h;
}

// === Collapse state ===
var _kpiLbCollapsed = false;
var _kpiTcCollapsed = false;

window.kpiToggleLb = function() {
    _kpiLbCollapsed = !_kpiLbCollapsed;
    var body = document.getElementById('kpiLbBody');
    if (body) body.style.display = _kpiLbCollapsed ? 'none' : '';
    // Update arrow
    var el = document.getElementById('kpiLeaderboard');
    if (el) {
        var hdr = el.querySelector('.kpi-lb-header span:last-child');
        if (hdr) { hdr.style.transform = 'rotate(' + (_kpiLbCollapsed ? '-90deg' : '0') + ')'; hdr.textContent = _kpiLbCollapsed ? '▶' : '▼'; }
    }
};

window.kpiToggleTc = function() {
    _kpiTcCollapsed = !_kpiTcCollapsed;
    var body = document.getElementById('kpiTcBody');
    if (body) body.style.display = _kpiTcCollapsed ? 'none' : '';
    var el = document.getElementById('kpiTeamCompare');
    if (el) {
        var hdr = el.querySelector('.kpi-lb-header span:last-child');
        if (hdr) { hdr.style.transform = 'rotate(' + (_kpiTcCollapsed ? '-90deg' : '0') + ')'; hdr.textContent = _kpiTcCollapsed ? '▶' : '▼'; }
    }
};

var _tcSort = 'revenue';
window._tcAdvData = null;
window._tcMainData = null;

// === Team Compare filter state (independent from BXH) ===
var _kpiTcFilter = 'this_month';
var _kpiTcCustomStart = '';
var _kpiTcCustomEnd = '';
var _kpiTcMonth = '';

function kpiTcBuildUrl() {
    var base = '/api/reports/customer-retention/advanced';
    var now = new Date();
    var fmtD = function(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    if (_kpiTcFilter === 'today') {
        return base + '?period=day&date=' + fmtD(now);
    } else if (_kpiTcFilter === 'yesterday') {
        var yd = new Date(now); yd.setDate(yd.getDate() - 1);
        return base + '?period=day&date=' + fmtD(yd);
    } else if (_kpiTcFilter === '7days') {
        var s7 = new Date(now); s7.setDate(s7.getDate() - 6);
        return base + '?period=custom&startDate=' + fmtD(s7) + '&endDate=' + fmtD(now);
    } else if (_kpiTcFilter === 'this_month') {
        var tm = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
        return base + '?period=month&date=' + tm;
    } else if (_kpiTcFilter === 'last_month') {
        var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var lmStr = lm.getFullYear() + '-' + String(lm.getMonth()+1).padStart(2,'0');
        return base + '?period=month&date=' + lmStr;
    } else if (_kpiTcFilter === 'all') {
        return base + '?period=year&date=' + now.getFullYear();
    } else if (_kpiTcFilter === 'stage1' || _kpiTcFilter === 'stage2' || _kpiTcFilter === 'stage3') {
        var refMonth = _kpiTcMonth || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
        var parts = refMonth.split('-').map(Number);
        var y = parts[0], m = parts[1];
        var dim = new Date(y, m, 0).getDate();
        var sd, ed;
        if (_kpiTcFilter === 'stage1') { sd = '01'; ed = '10'; }
        else if (_kpiTcFilter === 'stage2') { sd = '11'; ed = '20'; }
        else { sd = '21'; ed = String(dim); }
        return base + '?period=custom&startDate=' + y + '-' + String(m).padStart(2,'0') + '-' + sd + '&endDate=' + y + '-' + String(m).padStart(2,'0') + '-' + ed;
    } else if (_kpiTcFilter === 'pick_month' && _kpiTcMonth) {
        return base + '?period=month&date=' + _kpiTcMonth;
    } else if (_kpiTcFilter === 'custom' && _kpiTcCustomStart && _kpiTcCustomEnd) {
        return base + '?period=custom&startDate=' + _kpiTcCustomStart + '&endDate=' + _kpiTcCustomEnd;
    }
    var fallback = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    return base + '?period=month&date=' + fallback;
}

window.kpiTcSetFilter = async function(filter) {
    _kpiTcFilter = filter;
    if (filter === 'custom') {
        var tcEl = document.getElementById('kpiTeamCompare');
        if (tcEl && window._tcAdvData) kpiRenderTeamCompare(tcEl, window._tcMainData, window._tcAdvData);
        return;
    }
    await kpiTcRefetch();
};

window.kpiTcApplyCustom = async function() {
    var sd = document.getElementById('kpiTcStartDate');
    var ed = document.getElementById('kpiTcEndDate');
    if (!sd || !ed || !sd.value || !ed.value) { alert('Vui lòng chọn ngày bắt đầu và kết thúc'); return; }
    _kpiTcCustomStart = sd.value;
    _kpiTcCustomEnd = ed.value;
    _kpiTcFilter = 'custom';
    await kpiTcRefetch();
};

window.kpiTcPickMonth = async function(val) {
    if (!val) return;
    _kpiTcMonth = val;
    _kpiTcFilter = 'pick_month';
    await kpiTcRefetch();
};

async function kpiTcRefetch() {
    var tcEl = document.getElementById('kpiTeamCompare');
    if (!tcEl) return;
    tcEl.innerHTML = '<div class="kpi-lb-section"><div class="kpi-lb-header">📊 So Sánh Team</div><div style="padding:40px;text-align:center;color:#9ca3af">⏳ Đang tải...</div></div>';
    try {
        var url = kpiTcBuildUrl();
        var retUrl = '/api/reports/customer-retention?period=month&date=' + _kpi.month;
        var results = await Promise.all([apiCall(url), apiCall(retUrl)]);
        var advData = results[0];
        var mainData = results[1];
        kpiRenderTeamCompare(tcEl, mainData, advData);
    } catch(e) {
        console.error('TC refetch error:', e);
        tcEl.innerHTML = '<div class="kpi-lb-section"><div style="padding:20px;color:#ef4444;text-align:center">⚠️ Lỗi: ' + (e.message||'') + '</div></div>';
    }
}

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

    // Filter presets — row 1
    var tcFilterRow1 = [
        { key: 'today', icon: '📅', label: 'Hôm nay' },
        { key: 'yesterday', icon: '📅', label: 'Hôm qua' },
        { key: '7days', icon: '📅', label: '7 ngày' },
        { key: 'this_month', icon: '📅', label: 'Tháng này' },
        { key: 'last_month', icon: '📅', label: 'Tháng trước' },
        { key: 'all', icon: '📅', label: 'Tất cả' },
        { key: 'custom', icon: '📅', label: 'Tùy chọn' }
    ];
    // Filter presets — row 2: stages
    var tcFilterRow2 = [
        { key: 'stage1', icon: '🔥', label: 'GĐ 1 (1-10)' },
        { key: 'stage2', icon: '⚡', label: 'GĐ 2 (11-20)' },
        { key: 'stage3', icon: '🎯', label: 'GĐ 3 (21-31)' }
    ];

    var h = '<div class="kpi-lb-section">';
    h += '<div class="kpi-lb-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="kpiToggleTc()">';
    h += '<span>📊 So Sánh Team</span>';
    h += '<span style="font-size:18px;transition:transform .3s;transform:rotate(' + (_kpiTcCollapsed ? '-90deg' : '0') + ')">' + (_kpiTcCollapsed ? '▶' : '▼') + '</span>';
    h += '</div>';

    // Show active period info
    var tcPeriodInfo = advData && advData.period;
    if (tcPeriodInfo && tcPeriodInfo.start) {
        h += '<div style="padding:4px 24px;font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff">📌 Dữ liệu: ' + tcPeriodInfo.start + ' → ' + tcPeriodInfo.end + ' (' + (tcPeriodInfo.label || '') + ')</div>';
    }

    // Collapsible content wrapper
    h += '<div id="kpiTcBody" style="' + (_kpiTcCollapsed ? 'display:none' : '') + '">';

    // === FILTER BAR ROW 1 ===
    h += '<div class="kpi-lb-filter-bar" style="display:flex;align-items:center;gap:6px;padding:10px 24px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-wrap:wrap">';
    h += '<span style="font-size:12px;font-weight:700;color:#475569;margin-right:4px">📊</span>';
    for (var fi = 0; fi < tcFilterRow1.length; fi++) {
        var fp = tcFilterRow1[fi];
        var isActive = _kpiTcFilter === fp.key;
        var btnStyle = isActive
            ? 'background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;box-shadow:0 2px 8px rgba(67,56,202,.3)'
            : 'background:#fff;color:#374151;border:1px solid #d1d5db';
        h += '<button onclick="kpiTcSetFilter(\'' + fp.key + '\')" style="' + btnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += fp.icon + ' ' + fp.label + '</button>';
    }
    h += '</div>';

    // === FILTER BAR ROW 2: Stages + Month Picker ===
    h += '<div style="display:flex;align-items:center;gap:6px;padding:8px 24px;background:#fefce8;border-bottom:1px solid #fde68a;flex-wrap:wrap">';
    for (var si = 0; si < tcFilterRow2.length; si++) {
        var sp = tcFilterRow2[si];
        var isStageActive = _kpiTcFilter === sp.key;
        var sBtnStyle = isStageActive
            ? 'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;box-shadow:0 2px 8px rgba(217,119,6,.3)'
            : 'background:#fff;color:#78350f;border:1px solid #fcd34d';
        h += '<button onclick="kpiTcSetFilter(\'' + sp.key + '\')" style="' + sBtnStyle + ';padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap">';
        h += sp.icon + ' ' + sp.label + '</button>';
    }
    h += '<span style="width:1px;height:24px;background:#d1d5db;margin:0 6px"></span>';
    var isTcMonthActive = _kpiTcFilter === 'pick_month';
    h += '<span style="font-size:12px;font-weight:700;color:#78350f">📆 CHỌN THÁNG</span>';
    h += '<input type="month" id="kpiTcMonthPicker" value="' + (_kpiTcMonth || '') + '" onchange="kpiTcPickMonth(this.value)" style="padding:5px 10px;border:1px solid ' + (isTcMonthActive ? '#4338ca' : '#d1d5db') + ';border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:' + (isTcMonthActive ? '#eef2ff' : '#fff') + '">';
    h += '</div>';

    // Custom date pickers
    if (_kpiTcFilter === 'custom') {
        h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 24px;background:#eef2ff;border-bottom:1px solid #c7d2fe;flex-wrap:wrap">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Từ:</span>';
        h += '<input type="date" id="kpiTcStartDate" value="' + (_kpiTcCustomStart || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<span style="font-size:12px;font-weight:600;color:#4338ca">Đến:</span>';
        h += '<input type="date" id="kpiTcEndDate" value="' + (_kpiTcCustomEnd || '') + '" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;font-size:12px">';
        h += '<button onclick="kpiTcApplyCustom()" style="padding:6px 16px;border-radius:8px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">🔍 Áp dụng</button>';
        h += '</div>';
    }

    // === SORT TABS ===
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
    h += '</div>';
    h += '</div>'; // close kpiTcBody
    h += '</div>'; // close kpi-lb-section
    el.innerHTML = h;
}


// ===== MEETING COMMITMENTS EMBED =====
var _mcSession = null;       // kept for edit/review compatibility (currently active session)
var _mcSessions = [];        // all sessions in current month
var _mcAllCommitments = [];  // all commitments across all monthly sessions
var _mcCommitments = [];     // commitments for active session (backward compat)
var _mcTeams = [];
var _mcCollapsed = false;    // main section collapsed
var _mcYearlyData = null;    // yearly summary data
var _mcMonthlyCollapsed = false; // monthly summary collapsed (default open)

async function kpiLoadMeetingCommit() {
    var el = document.getElementById('kpiMeetingCommit');
    if (!el) return;
    try {
        var empData = await apiCall('/api/meeting-commitments/employees');
        _mcTeams = empData.teams || [];
        var mcParts = _kpi.month.split('-').map(Number);
        var mcYear = mcParts[0], mcMo = mcParts[1];
        var monthlyData = await apiCall('/api/meeting-commitments/monthly?month=' + mcMo + '&year=' + mcYear);
        _mcSessions = monthlyData.sessions || [];
        _mcAllCommitments = monthlyData.allCommitments || [];
        // Load yearly data
        try { _mcYearlyData = await apiCall('/api/meeting-commitments/yearly-summary?year=' + mcYear); } catch(e) { _mcYearlyData = null; }
        // Set active session to latest (last in array since sorted ASC)
        if (_mcSessions.length > 0) {
            _mcSession = _mcSessions[_mcSessions.length - 1];
            _mcCommitments = _mcAllCommitments.filter(function(c) { return c.session_id === _mcSession.id; });
        } else {
            _mcSession = null;
            _mcCommitments = [];
        }
        kpiRenderMeetingCommit(el);
    } catch(e) {
        console.error('Meeting commit error:', e);
        el.innerHTML = '<div style="padding:20px;color:#ef4444;text-align:center">Lỗi tải cam kết: ' + (e.message||'') + '</div>';
    }
}

function kpiRenderMeetingCommit(el) {
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var h = '<div class="kpi-mc-section">';

    // Header with title + collapse toggle
    h += '<div class="kpi-mc-header">';
    h += '<div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="mcToggleSection()">';
    h += '<span id="mcCollapseIcon" style="font-size:16px;transition:transform .3s">' + (_mcCollapsed ? '▶' : '▼') + '</span>';
    h += '📝 Cam Kết Cuộc Họp : KPI P.Kinh Doanh';
    var now = new Date();
    var monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    h += ' <span style="font-size:13px;font-weight:500;color:#6366f1;margin-left:4px">— ' + monthNames[now.getMonth() + 1] + '/' + now.getFullYear() + ' (' + _mcSessions.length + ' cuộc họp)</span>';
    h += '</div>';
    h += '<div style="display:flex;gap:8px">';
    if (isGD) {
        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcCreateSession()">➕ Tạo Cuộc Họp</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSetupTemplates(\'kpikdoanh\',\'Cá Nhân\')" title="Câu hỏi mẫu cá nhân">⚙️ Mẫu Cá Nhân</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSetupTemplates(\'kpikdoanh_team\',\'Team\')" title="Câu hỏi mẫu team">⚙️ Mẫu Team</button>';
    }
    h += '<a href="/camketcuochop" class="kpi-mc-btn kpi-mc-btn-ghost" style="text-decoration:none">📋 Xem Lịch Sử</a>';
    h += '</div></div>';

    // Collapsible body
    h += '<div id="mcSectionBody" style="' + (_mcCollapsed ? 'display:none' : '') + '">';

    if (_mcSessions.length === 0) {
        h += '<div style="padding:40px;text-align:center;color:#6b7280"><div style="font-size:40px;margin-bottom:12px">📭</div>';
        h += '<div style="font-size:14px;font-weight:600">Chưa có cuộc họp nào trong tháng này</div>';
        h += '<div style="font-size:12px;color:#9ca3af;margin-top:4px">Bấm "➕ Tạo Cuộc Họp" để bắt đầu</div></div>';
    } else {
        // Helper: format % with 1 decimal, Vietnamese comma
        function mcFmtPct(v) { var r = Math.round(v * 10) / 10; return r.toString().replace('.', ','); }
        // ===== MONTHLY SUMMARY CARDS (collapsible) =====
        var mNow = new Date();
        h += '<div style="margin-bottom:16px;padding:16px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border-radius:14px;border:1px solid #e0e7ff;border-left:5px solid #6366f1">';
        // Collapsible header
        h += '<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="mcToggleMonthly()">';
        h += '<div style="display:flex;align-items:center;gap:8px">';
        h += '<span id="mcMonthlyIcon" style="font-size:14px;transition:transform .3s;color:#6366f1">' + (_mcMonthlyCollapsed ? '▶' : '▼') + '</span>';
        h += '<span style="font-size:15px;font-weight:900;color:#1e293b">📊 Tổng Kết Cam Kết Tháng ' + (mNow.getMonth()+1) + '/' + mNow.getFullYear() + '</span>';
        h += '<span style="font-size:11px;font-weight:500;color:#6366f1;background:#eef2ff;padding:2px 8px;border-radius:8px">' + _mcSessions.length + ' cuộc họp</span>';
        h += '</div>';
        h += '</div>';
        // Collapsible body
        h += '<div id="mcMonthlyBody" style="' + (_mcMonthlyCollapsed ? 'display:none' : '') + ';margin-top:14px">';
        // Build per-person aggregates (per-session averaging)
        var personMap = {};
        for (var ai = 0; ai < _mcAllCommitments.length; ai++) {
            var ac = _mcAllCommitments[ai];
            if (ac.team_dept_id) continue; // Skip team-own commits for individual summary
            if (!personMap[ac.user_id]) {
                personMap[ac.user_id] = { name: ac.user_name, role: ac.user_role, total: 0, done: 0, sessionPcts: {} };
            }
            personMap[ac.user_id].total++;
            if (ac.is_completed) personMap[ac.user_id].done++;
            // Group by session_id
            if (!personMap[ac.user_id].sessionPcts[ac.session_id]) {
                personMap[ac.user_id].sessionPcts[ac.session_id] = { sum: 0, count: 0 };
            }
            personMap[ac.user_id].sessionPcts[ac.session_id].sum += (ac.completion_pct || 0);
            personMap[ac.user_id].sessionPcts[ac.session_id].count++;
        }
        var personArr = Object.keys(personMap).map(function(uid) {
            var p = personMap[uid];
            // Average of per-session averages
            var sessKeys = Object.keys(p.sessionPcts);
            if (sessKeys.length > 0) {
                var sessAvgSum = 0;
                for (var sk = 0; sk < sessKeys.length; sk++) {
                    var sp = p.sessionPcts[sessKeys[sk]];
                    sessAvgSum += (sp.sum / sp.count);
                }
                p.avgPct = Math.round((sessAvgSum / sessKeys.length) * 10) / 10;
            } else {
                p.avgPct = 0;
            }
            p.sessionCount = sessKeys.length;
            return p;
        }).sort(function(a, b) { return b.avgPct - a.avgPct; });

        h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';
        for (var pi = 0; pi < personArr.length; pi++) {
            var p = personArr[pi];
            var pPctDisplay = mcFmtPct(p.avgPct);
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
            // Progress bar
            h += '<div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:6px">';
            h += '<div style="height:100%;width:' + p.avgPct + '%;background:' + pGrad + ';border-radius:3px;transition:width .5s ease"></div>';
            h += '</div>';
            h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;font-weight:600">';
            h += '<span>Hoàn thành: ' + p.done + '/' + p.total + '</span>';
            h += '<span>' + p.sessionCount + ' cuộc họp</span>';
            h += '</div></div>';
        }
        h += '</div>';

        // ===== TEAM SUMMARY CARDS (team-own commits only, per-session averaging) =====
        if (_mcTeams && _mcTeams.length > 0) {
            // Pre-calculate team data and sort by avgPct desc
            var teamSummaryArr = [];
            for (var tsi = 0; tsi < _mcTeams.length; tsi++) {
                var tteam = _mcTeams[tsi];
                if (!tteam.members || tteam.members.length === 0) continue;
                // ONLY team-own commits (team_dept_id === team.id)
                var teamOwnAll = _mcAllCommitments.filter(function(c) { return c.team_dept_id === tteam.id; });
                var tTotal = teamOwnAll.length;
                var tDone = teamOwnAll.filter(function(c) { return c.is_completed; }).length;

                // Per-session averaging
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
                        var ts = tSessionMap[tSessKeys[tsk]];
                        tSessSum += (ts.sum / ts.count);
                    }
                    tAvgPct = Math.round((tSessSum / tSessKeys.length) * 10) / 10;
                }
                teamSummaryArr.push({ team: tteam, total: tTotal, done: tDone, avgPct: tAvgPct, sessCount: tSessKeys.length });
            }
            // Sort teams by highest % first
            teamSummaryArr.sort(function(a, b) { return b.avgPct - a.avgPct; });

            h += '<div style="margin-top:16px">';
            h += '<div style="font-size:13px;font-weight:800;color:#6d28d9;margin-bottom:10px;display:flex;align-items:center;gap:6px">🏠 Tổng Kết Theo Team <span style="font-size:12px;font-weight:500;color:#8b5cf6">Tháng ' + (mNow.getMonth()+1) + '/' + mNow.getFullYear() + '</span></div>';
            h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';
            for (var tsi2 = 0; tsi2 < teamSummaryArr.length; tsi2++) {
                var ts2 = teamSummaryArr[tsi2];
                var tPctDisplay = mcFmtPct(ts2.avgPct);
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
                // Progress bar
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

        h += '</div>'; // close mcMonthlyBody
        h += '</div>'; // close monthly container

        // ===== YEARLY SUMMARY (collapsible, gold theme) =====
        h += mcRenderYearlySummary();
        // Render each session as accordion (newest last = expanded)
        // Color palette for distinct session themes — each meeting gets its own color
        var _mcSessionPalette = [
            { bg:'#f5f3ff', border:'#c4b5fd', headerBg:'linear-gradient(135deg,#ede9fe,#ddd6fe)', accent:'#7c3aed', text:'#4c1d95', teamBg:'linear-gradient(135deg,#f5f3ff,#ede9fe,#f5f3ff)', teamBorder:'#8b5cf6', teamNameBg:'linear-gradient(90deg,#ede9fe,#ddd6fe)', teamNameColor:'#4c1d95', newestBg:'#4338ca', icon:'#7c3aed' },
            { bg:'#ecfdf5', border:'#6ee7b7', headerBg:'linear-gradient(135deg,#d1fae5,#a7f3d0)', accent:'#059669', text:'#065f46', teamBg:'linear-gradient(135deg,#ecfdf5,#d1fae5,#ecfdf5)', teamBorder:'#10b981', teamNameBg:'linear-gradient(90deg,#d1fae5,#a7f3d0)', teamNameColor:'#065f46', newestBg:'#059669', icon:'#10b981' },
            { bg:'#fffbeb', border:'#fcd34d', headerBg:'linear-gradient(135deg,#fef3c7,#fde68a)', accent:'#d97706', text:'#78350f', teamBg:'linear-gradient(135deg,#fffbeb,#fef3c7,#fffbeb)', teamBorder:'#f59e0b', teamNameBg:'linear-gradient(90deg,#fef3c7,#fde68a)', teamNameColor:'#78350f', newestBg:'#d97706', icon:'#f59e0b' },
            { bg:'#fff1f2', border:'#fda4af', headerBg:'linear-gradient(135deg,#ffe4e6,#fecdd3)', accent:'#e11d48', text:'#881337', teamBg:'linear-gradient(135deg,#fff1f2,#ffe4e6,#fff1f2)', teamBorder:'#fb7185', teamNameBg:'linear-gradient(90deg,#ffe4e6,#fecdd3)', teamNameColor:'#881337', newestBg:'#e11d48', icon:'#fb7185' },
            { bg:'#f0fdfa', border:'#5eead4', headerBg:'linear-gradient(135deg,#ccfbf1,#99f6e4)', accent:'#0d9488', text:'#134e4a', teamBg:'linear-gradient(135deg,#f0fdfa,#ccfbf1,#f0fdfa)', teamBorder:'#14b8a6', teamNameBg:'linear-gradient(90deg,#ccfbf1,#99f6e4)', teamNameColor:'#134e4a', newestBg:'#0d9488', icon:'#14b8a6' },
            { bg:'#faf5ff', border:'#d8b4fe', headerBg:'linear-gradient(135deg,#f3e8ff,#e9d5ff)', accent:'#9333ea', text:'#581c87', teamBg:'linear-gradient(135deg,#faf5ff,#f3e8ff,#faf5ff)', teamBorder:'#a855f7', teamNameBg:'linear-gradient(90deg,#f3e8ff,#e9d5ff)', teamNameColor:'#581c87', newestBg:'#9333ea', icon:'#a855f7' },
            { bg:'#fff7ed', border:'#fdba74', headerBg:'linear-gradient(135deg,#ffedd5,#fed7aa)', accent:'#ea580c', text:'#7c2d12', teamBg:'linear-gradient(135deg,#fff7ed,#ffedd5,#fff7ed)', teamBorder:'#f97316', teamNameBg:'linear-gradient(90deg,#ffedd5,#fed7aa)', teamNameColor:'#7c2d12', newestBg:'#ea580c', icon:'#f97316' },
            { bg:'#ecfeff', border:'#67e8f9', headerBg:'linear-gradient(135deg,#cffafe,#a5f3fc)', accent:'#0891b2', text:'#164e63', teamBg:'linear-gradient(135deg,#ecfeff,#cffafe,#ecfeff)', teamBorder:'#06b6d4', teamNameBg:'linear-gradient(90deg,#cffafe,#a5f3fc)', teamNameColor:'#164e63', newestBg:'#0891b2', icon:'#06b6d4' }
        ];
        for (var si = 0; si < _mcSessions.length; si++) {
            var sess = _mcSessions[si];
            var stt = si + 1;
            var isNewest = (si === _mcSessions.length - 1);
            var sessDate = new Date(sess.meeting_date);
            var sessCommits = _mcAllCommitments.filter(function(c) { return c.session_id === sess.id; });
            var totalDone = sessCommits.filter(function(c) { return c.is_completed; }).length;

            // Pick a unique color theme for this session
            var pal = _mcSessionPalette[si % _mcSessionPalette.length];

            h += '<div class="kpi-mc-session-block" style="margin-bottom:12px;border:2px solid ' + pal.border + ';border-radius:12px;overflow:hidden;background:' + pal.bg + ';border-left:5px solid ' + pal.accent + '">';

            // Session header (clickable)
            h += '<div class="kpi-mc-session-head" onclick="mcToggleSession(' + sess.id + ')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;background:' + pal.headerBg + ';border-bottom:1px solid ' + pal.border + '">';
            h += '<div style="display:flex;align-items:center;gap:10px">';
            h += '<span id="mcSessIcon_' + sess.id + '" style="font-size:14px;transition:transform .3s;color:' + pal.icon + '">▶</span>';
            h += '<span style="font-size:14px;font-weight:800;color:' + pal.text + '">📋 Cuộc Họp Thứ ' + stt + '</span>';
            h += '<span style="font-size:12px;font-weight:500;color:' + pal.text + ';opacity:.7">— ' + sess.title + ' (' + sessDate.toLocaleDateString('vi-VN') + ')</span>';
            h += '</div>';
            h += '<div style="display:flex;align-items:center;gap:8px">';
            if (sessCommits.length > 0) {
                var pctAll = Math.round(sessCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / sessCommits.length);
                h += '<span class="kpi-mc-badge ' + (totalDone === sessCommits.length ? 'kpi-mc-badge-done' : 'kpi-mc-badge-pending') + '">' + totalDone + '/' + sessCommits.length + ' — ' + pctAll + '%</span>';
            }
            if (isNewest) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:' + pal.newestBg + ';color:#fff;font-weight:700">Mới nhất</span>';
            h += '</div></div>';

            // Session body (expandable)
            h += '<div id="mcSessBody_' + sess.id + '" style="display:none">';

            // Render teams for this session
            var myRole = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
            for (var ti = 0; ti < _mcTeams.length; ti++) {
                var team = _mcTeams[ti];
                if (!team.members || team.members.length === 0) continue;
                var teamCommits = sessCommits.filter(function(c) {
                    var memberIds = team.members.map(function(m) { return m.id; });
                    return memberIds.indexOf(c.user_id) >= 0 && !c.team_dept_id;
                });
                // Team-level commits (department_id set) — used for team badge
                var teamOwnCommits = sessCommits.filter(function(c) { return c.team_dept_id === team.id; });
                var teamDone = teamOwnCommits.filter(function(c) { return c.is_completed; }).length;
                var teamPct = teamOwnCommits.length > 0 ? Math.round(teamOwnCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / teamOwnCommits.length) : 0;
                var teamBadgeClass = teamDone === teamOwnCommits.length && teamOwnCommits.length > 0 ? 'kpi-mc-badge-done' : 'kpi-mc-badge-pending';

                h += '<div class="kpi-mc-team" style="background:' + pal.teamBg + ';border-left:4px solid ' + pal.teamBorder + ';border-color:' + pal.teamBorder + '">';
                h += '<div class="kpi-mc-team-name" style="justify-content:space-between;background:' + pal.teamNameBg + ';color:' + pal.teamNameColor + '">';
                h += '<span>🏠 ' + team.name + ' <span style="font-size:11px;color:' + pal.teamNameColor + ';opacity:.6;font-weight:500">(' + team.members.length + ' người)</span></span>';
                h += '<div style="display:flex;align-items:center;gap:6px">';
                if (teamOwnCommits.length > 0) {
                    h += '<span class="kpi-mc-badge kpi-mc-badge-team">' + teamDone + '/' + teamOwnCommits.length + ' — ' + teamPct + '%</span>';
                }
                if (isGD || myRole === 'quan_ly' || myRole === 'quan_ly_cap_cao') {
                    if (teamOwnCommits.length > 0) {
                        var teamReviewed = teamOwnCommits.some(function(c) { return !!c.reviewed_by; });
                        if (isGD) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\'") + '\')">✅ Review</button>';
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcEditTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\'") + '\')">✏️</button>';
                        } else if (!teamReviewed) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\'") + '\')">✅ Review</button>';
                        } else {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\'") + '\',true)">👁️ Xem</button>';
                        }
                    } else {
                        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSwitchSession(' + sess.id + ');mcEditTeam(' + team.id + ',\'' + team.name.replace(/'/g, "\\'") + '\')">📝 Ghi Team</button>';
                    }
                }
                h += '</div></div>';

                for (var mi = 0; mi < team.members.length; mi++) {
                    var emp = team.members[mi];
                    var empCommits = sessCommits.filter(function(c) { return c.user_id === emp.id; });
                    var totalItems = empCommits.length;
                    var doneItems = empCommits.filter(function(c) { return c.is_completed; }).length;
                    var avgPct = totalItems > 0 ? Math.round(empCommits.reduce(function(s, c) { return s + (c.completion_pct || 0); }, 0) / totalItems) : 0;

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

                    var isSelf = typeof currentUser !== 'undefined' && currentUser && currentUser.id === emp.id;
                    var myRole = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
                    var empRole = emp.role || 'nhan_vien';

                    var canEdit = false;
                    var canView = false;
                    if (isGD) {
                        canEdit = true;
                    } else if ((myRole === 'quan_ly' || myRole === 'quan_ly_cap_cao') && (empRole === 'truong_phong' || empRole === 'nhan_vien' || empRole === 'thu_viec')) {
                        canEdit = true;
                    } else if (myRole === 'truong_phong' && (empRole === 'nhan_vien' || empRole === 'thu_viec')) {
                        canView = true;
                    } else if (myRole === 'nhan_vien' && (empRole === 'nhan_vien' || empRole === 'thu_viec')) {
                        canView = true;
                    }

                    if (totalItems > 0) {
                        if (doneItems === totalItems) {
                            h += '<span class="kpi-mc-badge kpi-mc-badge-done">✅ ' + doneItems + '/' + totalItems + ' — 100%</span>';
                        } else {
                            h += '<span class="kpi-mc-badge kpi-mc-badge-pending">⏳ ' + doneItems + '/' + totalItems + ' — ' + avgPct + '%</span>';
                        }
                        var anyReviewed = empCommits.some(function(c) { return !!c.reviewed_by; });

                        if (isGD) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">✅ Review</button>';
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcEditUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">✏️</button>';
                        } else if (canEdit && !isSelf) {
                            if (!anyReviewed) {
                                h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">✅ Review</button>';
                            } else {
                                h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\',true)">👁️ Xem</button>';
                            }
                        } else if (isSelf && !anyReviewed) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">📝 Đánh giá</button>';
                        } else if (isSelf && anyReviewed) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\',true)">👁️ Xem</button>';
                        } else if (canView && !isSelf) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcSwitchSession(' + sess.id + ');mcReviewUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\',true)">👁️ Xem</button>';
                        }
                    } else {
                        h += '<span class="kpi-mc-badge kpi-mc-badge-none">Chưa có cam kết</span>';
                        if (isGD || canEdit || isSelf) {
                            h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSwitchSession(' + sess.id + ');mcEditUser(' + emp.id + ',\'' + emp.full_name.replace(/'/g, "\\'") + '\')">📝 Ghi</button>';
                        }
                    }
                    h += '</div></div>';
                }
                h += '</div>';
            }
            h += '</div></div>';
        }
    }

    h += '</div></div>';
    el.innerHTML = h;
}

// Toggle main section collapse
window.mcToggleSection = function() {
    _mcCollapsed = !_mcCollapsed;
    var body = document.getElementById('mcSectionBody');
    var icon = document.getElementById('mcCollapseIcon');
    if (body) body.style.display = _mcCollapsed ? 'none' : '';
    if (icon) icon.textContent = _mcCollapsed ? '▶' : '▼';
};

// Toggle monthly summary collapse
window.mcToggleMonthly = function() {
    _mcMonthlyCollapsed = !_mcMonthlyCollapsed;
    var body = document.getElementById('mcMonthlyBody');
    var icon = document.getElementById('mcMonthlyIcon');
    if (body) body.style.display = _mcMonthlyCollapsed ? 'none' : '';
    if (icon) icon.textContent = _mcMonthlyCollapsed ? '▶' : '▼';
};

// ===== YEARLY SUMMARY RENDER =====
var _mcYearlyCollapsed = true; // collapsed by default
window.mcToggleYearly = function() {
    _mcYearlyCollapsed = !_mcYearlyCollapsed;
    var body = document.getElementById('mcYearlyBody');
    var icon = document.getElementById('mcYearlyIcon');
    if (body) body.style.display = _mcYearlyCollapsed ? 'none' : '';
    if (icon) {
        icon.textContent = _mcYearlyCollapsed ? '▶' : '▼';
        icon.style.transform = _mcYearlyCollapsed ? '' : 'rotate(0deg)';
    }
};

function mcRenderYearlySummary() {
    if (!_mcYearlyData || !_mcYearlyData.sessions || _mcYearlyData.sessions.length === 0) return '';
    var yd = _mcYearlyData;
    var yearSessions = yd.sessions;
    var yearCommits = yd.allCommitments;
    if (yearCommits.length === 0) return '';

    // Helper
    function fmtPct(v) { var r = Math.round(v * 10) / 10; return r.toString().replace('.', ','); }

    // Build session → month_num map
    var sessMonthMap = {};
    for (var si = 0; si < yearSessions.length; si++) {
        sessMonthMap[yearSessions[si].id] = yearSessions[si].month_num;
    }

    // ===== INDIVIDUALS =====
    // Group: person → month → session → pcts
    var personYr = {};
    for (var ci = 0; ci < yearCommits.length; ci++) {
        var c = yearCommits[ci];
        if (c.team_dept_id) continue; // skip team-own
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
        return { name: p.name, role: p.role, yearPct: yearPct, monthCount: monthAvgs.length };
    }).sort(function(a, b) { return b.yearPct - a.yearPct; });

    // ===== TEAMS =====
    var teamYr = {};
    for (var ci2 = 0; ci2 < yearCommits.length; ci2++) {
        var c2 = yearCommits[ci2];
        if (!c2.team_dept_id) continue; // only team-own
        var tid = c2.team_dept_id;
        var mNum = sessMonthMap[c2.session_id];
        if (!teamYr[tid]) teamYr[tid] = { months: {} };
        if (!teamYr[tid].months[mNum]) teamYr[tid].months[mNum] = {};
        if (!teamYr[tid].months[mNum][c2.session_id]) teamYr[tid].months[mNum][c2.session_id] = { sum: 0, count: 0 };
        teamYr[tid].months[mNum][c2.session_id].sum += (c2.completion_pct || 0);
        teamYr[tid].months[mNum][c2.session_id].count++;
    }

    var teamYrArr = [];
    if (_mcTeams && _mcTeams.length > 0) {
        for (var ti = 0; ti < _mcTeams.length; ti++) {
            var team = _mcTeams[ti];
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
    h += '<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="mcToggleYearly()">';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span id="mcYearlyIcon" style="font-size:14px;transition:transform .3s;color:#d97706">' + (_mcYearlyCollapsed ? '▶' : '▼') + '</span>';
    h += '<span style="font-size:15px;font-weight:900;color:#92400e">🏆 Tổng Kết Năm ' + yd.year + '</span>';
    h += '<span style="font-size:11px;font-weight:500;color:#b45309;background:#fde68a;padding:2px 8px;border-radius:8px">' + personYrArr.length + ' cá nhân · ' + teamYrArr.length + ' team</span>';
    h += '</div>';
    h += '<span style="font-size:11px;color:#92400e;font-weight:600">Tháng 1 → 12</span>';
    h += '</div>';

    // Body (collapsible)
    h += '<div id="mcYearlyBody" style="' + (_mcYearlyCollapsed ? 'display:none' : '') + ';margin-top:14px">';

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

// Toggle individual session accordion
window.mcToggleSession = function(sessionId) {
    var body = document.getElementById('mcSessBody_' + sessionId);
    var icon = document.getElementById('mcSessIcon_' + sessionId);
    if (!body) return;
    var isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    if (icon) icon.textContent = isHidden ? '▼' : '▶';
};

// Switch active session context (for review/edit buttons)
window.mcSwitchSession = function(sessionId) {
    var sess = _mcSessions.find(function(s) { return s.id === sessionId; });
    if (sess) {
        _mcSession = sess;
        _mcCommitments = _mcAllCommitments.filter(function(c) { return c.session_id === sessionId; });
    }
};

// ===== TEAM EDIT =====
window.mcEditTeam = async function(deptId, teamName) {
    var existing = _mcCommitments.filter(function(c) { return c.team_dept_id === deptId; });
    var items;
    if (existing.length > 0) {
        items = existing.map(function(c) {
            var parsed = mcParseContent(c.content);
            return { question: parsed.question, answer: parsed.answer, content: c.content, target_revenue: c.target_revenue, hasRevenue: c.target_revenue > 0, isSelfAdd: true };
        });
    } else {
        // Try to load team templates
        try {
            var tplData = await apiCall('/api/meeting-commitments/templates?page=kpikdoanh_team');
            if (tplData.templates && tplData.templates.length > 0) {
                items = tplData.templates.map(function(t) {
                    return { content: t.question_content, target_revenue: 0, isTemplate: true, hasRevenue: t.has_revenue_target };
                });
            } else {
                items = [{ question: '', answer: '', target_revenue: 0, isSelfAdd: true }];
            }
        } catch(e) {
            items = [{ question: '', answer: '', target_revenue: 0, isSelfAdd: true }];
        }
    }

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    var h = '<div class="kpi-mc-modal">';
    h += '<div class="kpi-mc-modal-head"><div>🏠 Cam Kết Team: ' + teamName + '</div>';
    h += '<button class="kpi-mc-remove" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">✕</button></div>';
    h += '<div class="kpi-mc-modal-body"><div id="mcTeamItemsList">';
    for (var i = 0; i < items.length; i++) {
        h += mcRenderItemEdit(i + 1, items[i]);
    }
    h += '</div>';
    h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="mcAddItem(\'mcTeamItemsList\')" style="width:100%;margin-top:10px">➕ Thêm cam kết</button>';
    h += '</div>';
    h += '<div class="kpi-mc-modal-foot">';
    h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>';
    h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveTeamCommitments(' + deptId + ')">💾 Lưu Cam Kết Team</button>';
    h += '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

// Save team commitments
window.mcSaveTeamCommitments = async function(deptId) {
    var itemEls = document.querySelectorAll('#mcTeamItemsList [data-mc-item]');
    var items = [];
    for (var i = 0; i < itemEls.length; i++) {
        var el = itemEls[i];
        var qEdit = el.querySelector('.mc-question-edit');
        var q = qEdit ? qEdit.value.trim() : '';
        var a = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
        var content = q ? ('❓ ' + q + '\n✅ ' + a) : a;
        var revEl = el.querySelector('.mc-revenue');
        var revenue = revEl ? parseFloat(revEl.value) || 0 : 0;
        if (content) items.push({ content: content, target_revenue: revenue });
    }
    if (items.length === 0) return alert('Cần ít nhất 1 cam kết');
    try {
        await apiCall('/api/meeting-commitments', 'POST', { session_id: _mcSession.id, department_id: deptId, items: items });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        kpiLoadMeetingCommit();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// ===== TEAM REVIEW =====
window.mcReviewTeam = function(deptId, teamName, readOnly) {
    var teamCommits = _mcCommitments.filter(function(c) { return c.team_dept_id === deptId; });
    if (teamCommits.length === 0) return alert('Team chưa có cam kết');

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var modalTitle = readOnly ? '👁️ Xem Đánh Giá Team — ' + teamName : '✅ Review Team — ' + teamName;
    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>' + modalTitle + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body">';

    for (var i = 0; i < teamCommits.length; i++) {
        var c = teamCommits[i];
        var hasTarget = c.target_revenue > 0;

        // Parse content
        var contentHtml = '';
        if (c.content.indexOf('❓') >= 0 && c.content.indexOf('✅') >= 0) {
            var parsed = mcParseContent(c.content);
            contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:8px;border-left:3px solid #4338ca;margin-bottom:8px">';
            contentHtml += '<div style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">📋 Câu hỏi</div>';
            contentHtml += '<div style="font-size:13px;font-weight:600;color:#1e293b">' + parsed.question + '</div>';
            contentHtml += '</div>';
            contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:8px;border-left:3px solid #059669;margin-bottom:8px">';
            contentHtml += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">✍️ Câu trả lời</div>';
            contentHtml += '<div style="font-size:13px;color:#1e293b;white-space:pre-line">' + parsed.answer + '</div>';
            contentHtml += '</div>';
        } else {
            contentHtml += '<div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:8px;white-space:pre-line">' + c.content + '</div>';
        }

        // Target display
        if (hasTarget) {
            contentHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:10px">';
            contentHtml += '<span style="font-size:13px;font-weight:700;color:#b45309">🎯 Mục tiêu:</span>';
            contentHtml += '<span style="font-size:16px;font-weight:800;color:#d97706">' + Number(c.target_revenue).toLocaleString('vi-VN') + '</span>';
            contentHtml += '</div>';
        }

        h += '<div class="kpi-mc-item" data-review-id="' + c.id + '" data-has-target="' + (hasTarget ? '1' : '0') + '" data-target="' + (c.target_revenue || 0) + '">'
            + '<div class="kpi-mc-item-head"><div class="kpi-mc-item-stt">' + (i + 1) + '</div>'
            + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Cam kết #' + (i + 1) + '</div></div>'
            + contentHtml;

        if (hasTarget) {
            var currentPct = c.completion_pct || 0;
            var currentActual = hasTarget && currentPct > 0 ? Math.round(c.target_revenue * currentPct / 100) : '';
            h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#7c3aed;white-space:nowrap">📊 Đã đạt:</span>';
            h += '<input class="kpi-mc-input rv-actual" type="number" placeholder="Nhập số liệu hoàn thành..." value="' + currentActual + '" style="flex:1;border-color:#c4b5fd;font-weight:700" oninput="mcCalcPct(this)"' + (readOnly ? ' disabled' : '') + '>';
            h += '<span class="rv-pct-display" style="font-size:14px;font-weight:800;color:#4338ca;min-width:50px;text-align:right">' + currentPct + '%</span>';
            h += '</div>';
            h += '<input type="hidden" class="rv-pct" value="' + currentPct + '">';
        } else {
            h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">📊 Tiến độ:</span>';
            h += '<div style="flex:1"><input type="range" class="rv-pct" min="0" max="100" value="' + (c.completion_pct || 0) + '" style="width:100%" oninput="this.nextElementSibling.textContent=this.value+\'%\'"' + (readOnly ? ' disabled' : '') + '><span style="font-size:12px;font-weight:700;color:#4338ca">' + (c.completion_pct || 0) + '%</span></div>';
            h += '</div>';
        }

        h += '<input class="kpi-mc-input rv-note" placeholder="Ghi chú review..." value="' + (c.review_note || '') + '" style="margin-top:4px"' + (readOnly ? ' disabled' : '') + '>';
        h += '</div>';
    }

    h += '</div><div class="kpi-mc-modal-foot">';
    if (readOnly) {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Đóng</button>';
    } else {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveReview()">💾 Lưu Review</button>';
    }
    h += '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

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

// Parse combined content (❓ question \n ✅ answer) into { question, answer }
function mcParseContent(content) {
    if (!content) return { question: '', answer: '' };
    if (content.indexOf('❓') >= 0 && content.indexOf('✅') >= 0) {
        var parts = content.split('\n');
        var questionLines = [];
        var answerLines = [];
        var mode = '';
        for (var p = 0; p < parts.length; p++) {
            var line = parts[p].trim();
            if (line.indexOf('❓') === 0) {
                mode = 'q';
                questionLines.push(line.substring(2).trim());
            } else if (line.indexOf('✅') === 0) {
                mode = 'a';
                answerLines.push(line.substring(2).trim());
            } else if (mode === 'q') {
                questionLines.push(line);
            } else if (mode === 'a') {
                answerLines.push(line);
            }
        }
        return { question: questionLines.join('\n'), answer: answerLines.join('\n') };
    }
    return { question: content, answer: '' };
}

// Edit/Add commitments for a user — auto-fill from templates if no existing commitments
window.mcEditUser = async function(userId, userName) {
    var existing = _mcCommitments.filter(function(c) { return c.user_id === userId; });
    var items;

    if (existing.length > 0) {
        items = existing.map(function(c) {
            var parsed = mcParseContent(c.content);
            return { question: parsed.question, answer: parsed.answer, content: c.content, target_revenue: c.target_revenue, hasRevenue: c.target_revenue > 0 };
        });
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


    var sessionInfo = '';
    if (_mcSession) {
        var sd = new Date(_mcSession.meeting_date);
        sessionInfo = ' <span style="font-size:13px;font-weight:500;color:#92400e;display:block;margin-top:2px">— ' + _mcSession.title + ' (' + sd.toLocaleDateString('vi-VN') + ')</span>';
    }

    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>📝 Cam Kết — ' + userName + sessionInfo + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body"><div id="mcItemsList">';

    for (var i = 0; i < items.length; i++) {
        h += mcRenderItemEdit(i + 1, items[i]);
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

function mcRenderItemEdit(stt, item) {
    var isTemplate = item.isTemplate;
    var isSelfAdd = item.isSelfAdd;
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
        h += '<button class="kpi-mc-remove" onclick="this.closest(\'[data-mc-item]\').remove();mcReindex()">✕</button>';
    }
    h += '</div>';

    if (isTemplate) {
        h += '<div style="padding:10px 14px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:8px;margin-bottom:10px;border-left:3px solid #4338ca">';
        h += '<div style="font-size:11px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📋 Câu hỏi</div>';
        h += '<div style="font-size:13px;font-weight:600;color:#1e293b;line-height:1.5" class="mc-question">' + question + '</div>';
        h += '</div>';
        h += '<div style="margin-bottom:8px">';
        h += '<div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✍️ Câu trả lời / Cam kết' + reqStar + '</div>';
        h += '<textarea class="kpi-mc-input mc-answer mc-required" rows="2" placeholder="Nhập câu trả lời, cam kết cụ thể..." style="resize:vertical;border-color:#d1fae5">' + answer + '</textarea>';
        h += '</div>';
        if (hasRevenue) {
            h += '<div style="display:flex;align-items:center;gap:8px">';
            h += '<span style="font-size:11px;font-weight:700;color:#b45309;white-space:nowrap">💰 Mục tiêu:' + reqStar + '</span>';
            h += '<input class="kpi-mc-input mc-revenue mc-required-num" type="number" placeholder="VD: 50000000" value="' + revenue + '" style="flex:1;border-color:#fde68a">';
            h += '</div>';
        }
    } else {
        // Self-add: editable question (required) + answer (required) + optional target
        h += '<div style="margin-bottom:10px">';
        h += '<div style="font-size:11px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📋 Câu hỏi / Nội dung' + reqStar + '</div>';
        h += '<textarea class="kpi-mc-input mc-question-edit mc-required" rows="2" placeholder="VD: Mục tiêu bạn đặt ra cho giai đoạn tới?" style="resize:vertical;border-color:#c7d2fe">' + question + '</textarea>';
        h += '</div>';
        h += '<div style="margin-bottom:8px">';
        h += '<div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">✍️ Câu trả lời / Cam kết' + reqStar + '</div>';
        h += '<textarea class="kpi-mc-input mc-answer mc-required" rows="2" placeholder="Nhập câu trả lời, cam kết cụ thể..." style="resize:vertical;border-color:#d1fae5">' + answer + '</textarea>';
        h += '</div>';
        // Checkbox toggle for target
        var showTarget = revenue > 0;
        h += '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#b45309;cursor:pointer;margin-bottom:6px">';
        h += '<input type="checkbox" class="mc-has-target-chk" onchange="mcToggleTarget(this)" ' + (showTarget ? 'checked' : '') + '> 💰 Có mục tiêu';
        h += '</label>';
        h += '<div class="mc-target-wrap" style="display:' + (showTarget ? 'flex' : 'none') + ';align-items:center;gap:8px">';
        h += '<span style="font-size:11px;font-weight:700;color:#b45309;white-space:nowrap">💰 Mục tiêu:</span>';
        h += '<input class="kpi-mc-input mc-revenue" type="number" placeholder="VD: 50000000" value="' + revenue + '" style="flex:1;border-color:#fde68a">';
        h += '</div>';
    }

    h += '</div>';
    return h;
}

window.mcToggleTarget = function(chk) {
    var wrap = chk.closest('[data-mc-item]').querySelector('.mc-target-wrap');
    if (wrap) {
        wrap.style.display = chk.checked ? 'flex' : 'none';
        if (!chk.checked) {
            var revInput = wrap.querySelector('.mc-revenue');
            if (revInput) revInput.value = 0;
        }
    }
};

window.mcAddItem = function(containerId) {
    var list = document.getElementById(containerId || 'mcItemsList');
    var count = list.querySelectorAll('[data-mc-item]').length;
    list.insertAdjacentHTML('beforeend', mcRenderItemEdit(count + 1, { isSelfAdd: true, content: '', answer: '', target_revenue: 0 }));
};

window.mcReindex = function() {
    var items = document.querySelectorAll('#mcItemsList [data-mc-item]');
    for (var i = 0; i < items.length; i++) {
        var stt = items[i].querySelector('.kpi-mc-item-stt');
        if (stt) stt.textContent = i + 1;
    }
};

window.mcSaveCommitments = async function(userId) {
    // Validate required fields
    var requiredEls = document.querySelectorAll('#mcItemsList .mc-required');
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
    var requiredNums = document.querySelectorAll('#mcItemsList .mc-required-num');
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

    var itemEls = document.querySelectorAll('#mcItemsList [data-mc-item]');
    var items = [];
    for (var i = 0; i < itemEls.length; i++) {
        var el = itemEls[i];
        var dataType = el.getAttribute('data-type');
        var content, revenue;

        if (dataType === 'tpl') {
            var question = el.querySelector('.mc-question') ? el.querySelector('.mc-question').textContent : '';
            var answer = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
            content = '❓ ' + question + '\n✅ ' + answer;
            var revEl = el.querySelector('.mc-revenue');
            revenue = revEl ? parseFloat(revEl.value) || 0 : 0;
        } else {
            var qEdit = el.querySelector('.mc-question-edit');
            var q2 = qEdit ? qEdit.value.trim() : '';
            var a2 = el.querySelector('.mc-answer') ? el.querySelector('.mc-answer').value.trim() : '';
            content = q2 ? ('❓ ' + q2 + '\n✅ ' + a2) : a2;
            var revEl2 = el.querySelector('.mc-revenue');
            revenue = revEl2 ? parseFloat(revEl2.value) || 0 : 0;
        }

        if (content) items.push({ content: content, target_revenue: revenue });
    }
    if (items.length === 0) return alert('Cần ít nhất 1 cam kết');
    try {
        await apiCall('/api/meeting-commitments', 'POST', { session_id: _mcSession.id, user_id: userId, items: items });
        document.querySelector('.kpi-mc-modal-overlay').remove();
        kpiLoadMeetingCommit();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// Review commitments for a user (readOnly=true → view only, no editing)
window.mcReviewUser = async function(userId, userName, readOnly) {
    var userCommits = _mcCommitments.filter(function(c) { return c.user_id === userId; });
    if (userCommits.length === 0) return alert('Chưa có cam kết');

    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var modalTitle = readOnly ? '👁️ Xem Đánh Giá — ' + userName : '✅ Review — ' + userName;
    var h = '<div class="kpi-mc-modal">'
        + '<div class="kpi-mc-modal-head"><h3>' + modalTitle + '</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
        + '<div class="kpi-mc-modal-body">';

    for (var i = 0; i < userCommits.length; i++) {
        var c = userCommits[i];
        var hasTarget = c.target_revenue > 0;

        // Parse content: split ❓ question and ✅ answer (multi-line safe)
        var contentHtml = '';
        if (c.content.indexOf('❓') >= 0 && c.content.indexOf('✅') >= 0) {
            var parsed = mcParseContent(c.content);
            var questionLine = parsed.question;
            var answerLine = parsed.answer;
            contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:8px;border-left:3px solid #4338ca;margin-bottom:8px">';
            contentHtml += '<div style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">📋 Câu hỏi</div>';
            contentHtml += '<div style="font-size:13px;font-weight:600;color:#1e293b">' + questionLine + '</div>';
            contentHtml += '</div>';
            contentHtml += '<div style="padding:8px 12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:8px;border-left:3px solid #059669;margin-bottom:8px">';
            contentHtml += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">✍️ Câu trả lời</div>';
            contentHtml += '<div style="font-size:13px;color:#1e293b;white-space:pre-line">' + answerLine + '</div>';
            contentHtml += '</div>';
        } else {
            contentHtml += '<div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:8px;white-space:pre-line">' + c.content + '</div>';
        }

        // Target display
        if (hasTarget) {
            contentHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:10px">';
            contentHtml += '<span style="font-size:13px;font-weight:700;color:#b45309">🎯 Mục tiêu:</span>';
            contentHtml += '<span style="font-size:16px;font-weight:800;color:#d97706">' + Number(c.target_revenue).toLocaleString('vi-VN') + '</span>';
            contentHtml += '</div>';
        }

        h += '<div class="kpi-mc-item" data-review-id="' + c.id + '" data-has-target="' + (hasTarget ? '1' : '0') + '" data-target="' + (c.target_revenue || 0) + '">'
            + '<div class="kpi-mc-item-head"><div class="kpi-mc-item-stt">' + c.stt + '</div>'
            + '<div style="flex:1;font-weight:700;font-size:13px;color:#1e293b">Cam kết #' + c.stt + '</div></div>'
            + contentHtml;

        if (hasTarget) {
            var currentPct = c.completion_pct || 0;
            var currentActual = hasTarget && currentPct > 0 ? Math.round(c.target_revenue * currentPct / 100) : '';
            h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#7c3aed;white-space:nowrap">📊 Đã đạt:</span>';
            h += '<input class="kpi-mc-input rv-actual" type="number" placeholder="Nhập số liệu hoàn thành..." value="' + currentActual + '" style="flex:1;border-color:#c4b5fd;font-weight:700" oninput="mcCalcPct(this)"' + (readOnly ? ' disabled' : '') + '>';
            h += '<span class="rv-pct-display" style="font-size:14px;font-weight:800;color:#4338ca;min-width:50px;text-align:right">' + currentPct + '%</span>';
            h += '</div>';
            h += '<input type="hidden" class="rv-pct" value="' + currentPct + '">';
        } else {
            h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">';
            h += '<span style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">📊 Tiến độ:</span>';
            h += '<div style="flex:1"><input type="range" class="rv-pct" min="0" max="100" value="' + (c.completion_pct || 0) + '" style="width:100%" oninput="this.nextElementSibling.textContent=this.value+\'%\'"' + (readOnly ? ' disabled' : '') + '><span style="font-size:12px;font-weight:700;color:#4338ca">' + (c.completion_pct || 0) + '%</span></div>';
            h += '</div>';
        }

        h += '<input class="kpi-mc-input rv-note" placeholder="Ghi chú review..." value="' + (c.review_note || '') + '" style="margin-top:4px"' + (readOnly ? ' disabled' : '') + '>';
        h += '</div>';
    }

    h += '</div><div class="kpi-mc-modal-foot">';
    if (readOnly) {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Đóng</button>';
    } else {
        h += '<button class="kpi-mc-btn kpi-mc-btn-ghost" onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()">Hủy</button>';
        h += '<button class="kpi-mc-btn kpi-mc-btn-primary" onclick="mcSaveReview()">💾 Lưu Review</button>';
    }
    h += '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

// Auto-calculate completion % from actual vs target
window.mcCalcPct = function(input) {
    var item = input.closest('[data-review-id]');
    var target = parseFloat(item.getAttribute('data-target')) || 0;
    var actual = parseFloat(input.value) || 0;
    var pct = target > 0 ? Math.min(Math.round(100 * actual / target), 999) : 0;
    item.querySelector('.rv-pct').value = pct;
    item.querySelector('.rv-pct-display').textContent = pct + '%';
    // Color coding
    var display = item.querySelector('.rv-pct-display');
    if (pct >= 100) display.style.color = '#059669';
    else if (pct >= 50) display.style.color = '#f59e0b';
    else display.style.color = '#ef4444';
};

window.mcSaveReview = async function() {
    var items = document.querySelectorAll('[data-review-id]');
    var reviews = [];
    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var pct = parseInt(el.querySelector('.rv-pct').value) || 0;
        var hasTarget = el.getAttribute('data-has-target') === '1';
        reviews.push({
            id: parseInt(el.getAttribute('data-review-id')),
            is_completed: pct >= 100,
            completion_pct: pct,
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
window.mcSetupTemplates = async function(pageKey, label) {
    pageKey = pageKey || 'kpikdoanh';
    label = label || 'Cá Nhân';
    window._mcTplPageKey = pageKey;
    var overlay = document.createElement('div');
    overlay.className = 'kpi-mc-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    // Load existing templates
    var templates = [];
    try {
        var res = await apiCall('/api/meeting-commitments/templates?page=' + pageKey);
        templates = res.templates || [];
    } catch(e) {}

    var h = '<div class="kpi-mc-modal" style="max-width:600px">'
        + '<div class="kpi-mc-modal-head"><h3>⚙️ Câu Hỏi Mẫu ' + label + ' — KPI P.Kinh Doanh</h3><button onclick="this.closest(\'.kpi-mc-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'
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
        + '<textarea class="kpi-mc-input tpl-content" rows="2" placeholder="VD: Mục tiêu giai đoạn tiếp theo?" style="margin-bottom:8px;resize:vertical">' + (content || '') + '</textarea>'
        + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;cursor:pointer"><input type="checkbox" class="tpl-has-rev"' + (hasRevenue ? ' checked' : '') + '> Có ô nhập mục tiêu</label>'
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
        await apiCall('/api/meeting-commitments/templates', 'PUT', { page_key: window._mcTplPageKey || 'kpikdoanh', items: data });
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
        // Build API URL based on current BXH filter
        var apiUrl = '/api/kpi-kdoanh/employee-orders?user_id=' + userId;
        var periodInfo = window._kpiAdvData && window._kpiAdvData.period;

        if (periodInfo && periodInfo.start && periodInfo.end) {
            // Use the actual queried date range from the advanced API
            // periodInfo.end already has +1 day applied, so subtract 1 for endDate
            var endD = new Date(periodInfo.end + 'T00:00:00');
            endD.setDate(endD.getDate() - 1);
            var endStr = endD.getFullYear() + '-' + String(endD.getMonth()+1).padStart(2,'0') + '-' + String(endD.getDate()).padStart(2,'0');
            apiUrl += '&startDate=' + periodInfo.start + '&endDate=' + endStr;
        } else {
            apiUrl += '&month=' + _kpi.month;
        }

        var data = await apiCall(apiUrl);
        _odOrders = data.orders || [];
        var summary = data.summary || {};
        var body = document.getElementById('odBody');
        if (!body) return;

        var monthLabel = data.periodLabel || ('T' + _kpi.month.split('-')[1] + '/' + _kpi.month.split('-')[0]);

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
