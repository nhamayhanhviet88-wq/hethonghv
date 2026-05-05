// ========== DASHBOARD P.KINH DOANH — Khách Mới vs Khách Cũ Quay Lại ==========
// Page: /dashboardkdoanh
// Auto-detected by convention: renderDashboardkdoanhPage(container)

var _cr = {
    period: 'month',
    dateStr: '',
    data: null,
    expandedMgr: new Set([0]),
    expandedTeam: new Set(),
    _autoExpanded: false
};

async function renderDashboardkdoanhPage(container) {
    // Build current month default
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    if (!_cr.dateStr) _cr.dateStr = `${yr}-${String(mo).padStart(2, '0')}`;

    container.innerHTML = `
        <style>
            .cr-wrap { max-width: 1200px; margin: 0 auto; font-family: inherit; }
            .cr-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
            .cr-period-tabs { display: flex; gap: 0; border-radius: 10px; overflow: hidden; border: 1.5px solid #4338ca; }
            .cr-tab { padding: 8px 22px; font-size: 13px; font-weight: 700; cursor: pointer; background: white; color: #4338ca; border: none; transition: all 0.25s; }
            .cr-tab.active { background: linear-gradient(135deg, #4338ca, #6366f1); color: white; }
            .cr-tab:hover:not(.active) { background: #eef2ff; }
            .cr-nav { display: flex; align-items: center; gap: 8px; }
            .cr-nav-btn { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid #c7d2fe; background: white; color: #4338ca; font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
            .cr-nav-btn:hover { background: #4338ca; color: white; border-color: #4338ca; }
            .cr-period-label { font-size: 16px; font-weight: 800; color: var(--navy); min-width: 100px; text-align: center; }

            .cr-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
            .cr-card { border-radius: 14px; padding: 24px 20px; text-align: center; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; }
            .cr-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
            .cr-card-value { font-size: 36px; font-weight: 900; line-height: 1; }
            .cr-card-label { font-size: 12px; font-weight: 600; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
            .cr-card-trend { font-size: 12px; font-weight: 700; margin-top: 6px; display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 20px; }
            .cr-card.total { background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; }
            .cr-card.new { background: linear-gradient(135deg, #064e3b, #047857); color: white; }
            .cr-card.returning { background: linear-gradient(135deg, #7c2d12, #c2410c); color: white; }
            .cr-card.rate { background: linear-gradient(135deg, #4c1d95, #7c3aed); color: white; }
            .cr-card.revenue { background: linear-gradient(135deg, #0c4a6e, #0284c7); color: white; }
            .cr-card.aov { background: linear-gradient(135deg, #134e4a, #0d9488); color: white; }
            .cr-card.conversion { background: linear-gradient(135deg, #78350f, #d97706); color: white; }
            .cr-trend-up { color: #34d399; background: rgba(52,211,153,0.15); }
            .cr-trend-down { color: #f87171; background: rgba(248,113,113,0.15); }
            .cr-trend-flat { color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.1); }
            .cr-period-label { cursor: pointer; position: relative; }
            .cr-period-label:hover { color: #4338ca; }
            #crMonthPicker { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }

            /* === MAIN TABS === */
            .cr-main-tabs { display: flex; gap: 0; margin-bottom: 24px; border-radius: 14px; overflow: hidden; border: 2px solid #312e81; background: white; }
            .cr-main-tab { flex: 1; padding: 14px 12px; font-size: 13px; font-weight: 800; cursor: pointer; background: white; color: #312e81; border: none; transition: all 0.3s; text-align: center; letter-spacing: 0.3px; }
            .cr-main-tab.active { background: linear-gradient(135deg, #312e81, #4338ca); color: white; }
            .cr-main-tab:hover:not(.active) { background: #eef2ff; }
            .cr-main-tab-content { display: none; animation: crTabFadeIn 0.4s ease; }
            .cr-main-tab-content.active { display: block; }
            @keyframes crTabFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

            /* === ALERT BANNER === */
            .cr-alerts { margin-bottom: 20px; }
            .cr-alert-item { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: 10px; margin-bottom: 8px; font-size: 13px; font-weight: 600; animation: crSlideIn 0.3s ease; }
            .cr-alert-warning { background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }
            .cr-alert-danger { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
            @keyframes crSlideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }

            /* === LEADERBOARD === */
            .cr-lb-section { background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); margin-bottom: 24px; }
            .cr-lb-header { padding: 18px 24px; font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f1f5f9; }
            .cr-lb-tabs { display: flex; gap: 0; margin: 0 24px; border-bottom: 2px solid #f1f5f9; }
            .cr-lb-tab { padding: 12px 20px; font-size: 13px; font-weight: 700; cursor: pointer; background: none; border: none; color: #6b7280; border-bottom: 3px solid transparent; transition: all 0.2s; }
            .cr-lb-tab.active { color: #4338ca; border-bottom-color: #4338ca; }
            .cr-lb-tab:hover { color: #4338ca; }
            .cr-lb-body { padding: 0; }
            .cr-lb-row { display: grid; grid-template-columns: 50px 1fr 100px 80px 80px 80px; padding: 14px 24px; border-bottom: 1px solid #f8fafc; align-items: center; transition: background 0.2s; }
            .cr-lb-row:hover { background: #fefce8; }
            .cr-lb-rank { font-size: 20px; font-weight: 900; text-align: center; }
            .cr-lb-name { font-weight: 700; color: #1e1b4b; }
            .cr-lb-team { font-size: 11px; color: #6b7280; margin-top: 2px; }
            .cr-lb-val { text-align: right; font-weight: 800; font-size: 14px; }

            /* === TEAM COMPARISON === */
            .cr-tc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 20px 24px; }
            .cr-tc-card { border-radius: 14px; padding: 20px; background: linear-gradient(135deg, #f8fafc, #eef2ff); border: 1px solid #e0e7ff; transition: transform 0.2s, box-shadow 0.2s; }
            .cr-tc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(67,56,202,0.12); }
            .cr-tc-name { font-size: 15px; font-weight: 800; color: #1e40af; margin-bottom: 12px; }
            .cr-tc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .cr-tc-stat { text-align: center; padding: 8px; border-radius: 8px; background: white; }
            .cr-tc-stat-val { font-size: 20px; font-weight: 900; color: #1e1b4b; }
            .cr-tc-stat-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-top: 2px; }

            /* === TAB 3 TABLES === */
            .cr-data-section { background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); margin-bottom: 24px; }
            .cr-data-header { padding: 18px 24px; font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f1f5f9; }
            .cr-data-table { width: 100%; border-collapse: collapse; }
            .cr-data-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
            .cr-data-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .cr-data-table tr:hover { background: #fefce8; }
            .cr-data-mini-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 20px 24px; }
            .cr-data-mini { text-align: center; padding: 20px; border-radius: 12px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; }
            .cr-data-mini-val { font-size: 28px; font-weight: 900; color: #0c4a6e; }
            .cr-data-mini-label { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px; text-transform: uppercase; }

            .cr-group { background: white; border-radius: 14px; border: 1px solid #e5e7eb; margin-bottom: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
            .cr-group-header { padding: 16px 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: background 0.2s; }
            .cr-group-header:hover { background: #f8fafc; }
            .cr-mgr-header { background: linear-gradient(135deg, #fefce8, #fef9c3); border-bottom: 2px solid #fbbf24; }
            .cr-mgr-name { font-size: 15px; font-weight: 800; color: #92400e; display: flex; align-items: center; gap: 8px; }
            .cr-stat-grid { display: grid; grid-template-columns: 50px 60px 50px 70px 50px 55px 70px 55px; gap: 5px; align-items: center; justify-items: center; }
            .cr-stat-cell { font-size: 11px; font-weight: 700; white-space: nowrap; text-align: center; }
            .cr-stat-pill { font-size: 11px; font-weight: 700; padding: 4px 0; border-radius: 20px; white-space: nowrap; text-align: center; width: 100%; display: block; }
            .cr-arrow { font-size: 12px; color: #9ca3af; transition: transform 0.3s; }
            .cr-arrow.open { transform: rotate(90deg); }

            .cr-team { border-top: 1px solid #f3f4f6; }
            .cr-team-header { padding: 12px 20px 12px 44px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #f8fafc; transition: background 0.2s; }
            .cr-team-header:hover { background: #eef2ff; }
            .cr-team-name { font-size: 13px; font-weight: 700; color: #1e40af; display: flex; align-items: center; gap: 6px; }
            .cr-team-leader { font-size: 11px; color: #6b7280; font-weight: 500; }

            .cr-emp { padding: 10px 20px 10px 68px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid #f9fafb; transition: background 0.15s; }
            .cr-emp:hover { background: #fefce8; }
            .cr-emp-name { font-size: 13px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
            .cr-emp-stats { display: grid; grid-template-columns: 50px 60px 50px 70px 50px 55px 70px 55px; gap: 5px; align-items: center; justify-items: center; flex-shrink: 0; }

            .cr-progress-wrap { width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
            .cr-progress-bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

            .cr-role-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
            .cr-role-tp { background: #dbeafe; color: #1d4ed8; }
            .cr-role-nv { background: #f3f4f6; color: #6b7280; }
            .cr-role-tv { background: #fef3c7; color: #92400e; }

            .cr-top-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 800; color: #ca8a04; background: linear-gradient(135deg, #fef9c3, #fef3c7); padding: 2px 8px; border-radius: 12px; border: 1px solid #fbbf24; animation: crShimmer 2s ease-in-out infinite; }
            @keyframes crShimmer { 0%, 100% { box-shadow: 0 0 4px rgba(251,191,36,0.3); } 50% { box-shadow: 0 0 12px rgba(251,191,36,0.6); } }

            .cr-emp { cursor: pointer; }
            .cr-detail-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; animation: crFadeIn 0.2s; }
            @keyframes crFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .cr-detail-modal { background: white; border-radius: 16px; width: 90%; max-width: 750px; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
            .cr-detail-header { padding: 20px 24px; background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; display: flex; justify-content: space-between; align-items: center; }
            .cr-detail-header h3 { margin: 0; font-size: 16px; font-weight: 800; }
            .cr-detail-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
            .cr-detail-close:hover { background: rgba(255,255,255,0.4); }
            .cr-detail-summary { display: flex; gap: 12px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
            .cr-detail-badge { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
            .cr-detail-badge:hover { opacity: 0.85; }
            .cr-detail-badge.active { border-color: #1e1b4b; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
            .cr-detail-body { overflow-y: auto; flex: 1; }
            .cr-detail-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .cr-detail-table th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-weight: 700; color: #475569; position: sticky; top: 0; z-index: 1; border-bottom: 2px solid #e2e8f0; }
            .cr-detail-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            .cr-detail-table tr:hover { background: #fefce8; }
            .cr-type-new { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #d1fae5; color: #065f46; }
            .cr-type-ret { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #ffedd5; color: #9a3412; }

            /* === CHART SECTION === */
            .cr-chart-section { background: white; border-radius: 16px; border: 1px solid #e5e7eb; margin-top: 32px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
            .cr-chart-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 20px 24px; background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; }
            .cr-chart-header h3 { margin: 0; font-size: 16px; font-weight: 800; }
            .cr-chart-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
            .cr-chart-select { padding: 7px 14px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.12); color: white; font-size: 13px; font-weight: 600; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; min-width: 140px; }
            .cr-chart-select option { color: #1e1b4b; background: white; }
            .cr-chart-year-nav { display: flex; align-items: center; gap: 6px; }
            .cr-chart-year-btn { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; font-size: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
            .cr-chart-year-btn:hover { background: rgba(255,255,255,0.3); }
            .cr-chart-year-label { font-size: 15px; font-weight: 800; min-width: 50px; text-align: center; }
            .cr-chart-body { padding: 24px; position: relative; }
            .cr-chart-canvas-wrap { position: relative; height: 350px; }
            .cr-chart-legend { display: flex; gap: 20px; justify-content: center; padding: 16px 24px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }
            .cr-chart-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; padding: 4px 10px; border-radius: 8px; transition: all 0.2s; user-select: none; }
            .cr-chart-legend-item:hover { background: #f1f5f9; }
            .cr-chart-legend-item.disabled { opacity: 0.35; text-decoration: line-through; }
            .cr-chart-legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
            .cr-chart-period-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.12); border-radius: 8px; padding: 2px; }
            .cr-chart-period-tab { padding: 5px 12px; border-radius: 6px; border: none; background: transparent; color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
            .cr-chart-period-tab.active { background: rgba(255,255,255,0.25); color: white; }
            .cr-chart-period-tab:hover { color: white; }
            .cr-chart-select optgroup { font-weight: 800; color: #312e81; font-size: 13px; }
            .cr-chart-select option { font-weight: 600; padding-left: 12px; }

            @media (max-width: 768px) {
                .cr-cards { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .cr-card { padding: 16px 12px; }
                .cr-card-value { font-size: 28px; }
                .cr-stat-grid, .cr-emp-stats { grid-template-columns: 35px 50px 40px 55px 40px 45px 60px 45px; gap: 3px; }
                .cr-stat-pill { font-size: 9px; padding: 3px 0; }
                .cr-stat-cell { font-size: 10px; }
                .cr-emp { padding-left: 44px; }
                .cr-team-header { padding-left: 28px; }
                .cr-emp-name { min-width: auto; }
                .cr-header { flex-direction: column; align-items: stretch; }
                .cr-chart-canvas-wrap { height: 280px; }
                .cr-chart-header { padding: 16px; }
                .cr-chart-filters { width: 100%; }
                .cr-chart-select { flex: 1; min-width: 100px; }
            }
        </style>
        <div class="cr-wrap" id="crWrap">
            <div class="cr-header">
                <div class="cr-period-tabs">
                    <button class="cr-tab ${_cr.period === 'day' ? 'active' : ''}" onclick="crSwitchPeriod('day')">Hôm nay</button>
                    <button class="cr-tab ${_cr.period === 'week' ? 'active' : ''}" onclick="crSwitchPeriod('week')">Tuần</button>
                    <button class="cr-tab ${_cr.period === 'month' ? 'active' : ''}" onclick="crSwitchPeriod('month')">Tháng</button>
                    <button class="cr-tab ${_cr.period === 'quarter' ? 'active' : ''}" onclick="crSwitchPeriod('quarter')">Quý</button>
                    <button class="cr-tab ${_cr.period === 'year' ? 'active' : ''}" onclick="crSwitchPeriod('year')">Năm</button>
                </div>
                <div class="cr-nav">
                    <button class="cr-nav-btn" onclick="crNavPrev()" title="Kỳ trước">‹</button>
                    <div class="cr-period-label" id="crPeriodLabel" onclick="crOpenDatePicker()" title="Nhấn để chọn ngày/tháng">...</div>
                    <input type="month" id="crMonthPicker" onchange="crPickMonth(this.value)">
                    <button class="cr-nav-btn" onclick="crNavNext()" title="Kỳ sau">›</button>
                </div>
            </div>

            <!-- MAIN TABS -->
            <div class="cr-main-tabs">
                <button class="cr-main-tab active" onclick="crSwitchMainTab(0,this)">📊 Tổng Quan</button>
                <button class="cr-main-tab" onclick="crSwitchMainTab(1,this)">🏆 Xếp Hạng & KPI</button>
                <button class="cr-main-tab" onclick="crSwitchMainTab(2,this)">📋 Chi Tiết & Phân Tích</button>
            </div>

            <!-- TAB 0: Tổng Quan -->
            <div class="cr-main-tab-content active" id="crTabOverview">
                <div id="crAlertBanner"></div>
                <div class="cr-cards" id="crCards">
                    <div class="cr-card total"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                    <div class="cr-card new"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                    <div class="cr-card returning"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                    <div class="cr-card rate"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                </div>
                <div id="crGroups"><div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải dữ liệu...</div></div>

                <!-- CHART SECTION -->
                <div class="cr-chart-section" id="crChartSection">
                    <div class="cr-chart-header">
                        <h3>📊 Biểu Đồ Đơn Hàng</h3>
                        <div class="cr-chart-filters">
                            <div class="cr-chart-period-tabs">
                                <button class="cr-chart-period-tab active" onclick="crChartSwitchPeriod('month',this)">Tháng</button>
                                <button class="cr-chart-period-tab" onclick="crChartSwitchPeriod('quarter',this)">Quý</button>
                                <button class="cr-chart-period-tab" onclick="crChartSwitchPeriod('year',this)">Năm</button>
                            </div>
                            <select class="cr-chart-select" id="crChartTarget" onchange="crChartLoad()">
                                <option value="all">🏢 Tổng P.Kinh Doanh</option>
                            </select>
                            <div class="cr-chart-year-nav">
                                <button class="cr-chart-year-btn" onclick="crChartNavYear(-1)">‹</button>
                                <span class="cr-chart-year-label" id="crChartYearLabel">${new Date().getFullYear()}</span>
                                <button class="cr-chart-year-btn" onclick="crChartNavYear(1)">›</button>
                            </div>
                        </div>
                    </div>
                    <div class="cr-chart-body">
                        <div class="cr-chart-canvas-wrap">
                            <canvas id="crChartCanvas"></canvas>
                        </div>
                    </div>
                    <div class="cr-chart-legend" id="crChartLegend">
                        <div class="cr-chart-legend-item" data-idx="0" onclick="crToggleLegend(0,this)"><div class="cr-chart-legend-dot" style="background:#059669;"></div> Đơn KH Mới</div>
                        <div class="cr-chart-legend-item" data-idx="1" onclick="crToggleLegend(1,this)"><div class="cr-chart-legend-dot" style="background:#c2410c;"></div> Đơn KH Cũ Quay Lại</div>
                        <div class="cr-chart-legend-item" data-idx="2" onclick="crToggleLegend(2,this)"><div class="cr-chart-legend-dot" style="background:#7c3aed;border-radius:50%;"></div> Tỷ Lệ KH Cũ (%)</div>
                        <div class="cr-chart-legend-item" data-idx="3" onclick="crToggleLegend(3,this)"><div class="cr-chart-legend-dot" style="background:#0284c7;border-radius:50%;"></div> Doanh Số (triệu)</div>
                    </div>
                </div>
            </div>

            <!-- TAB 1: Xếp Hạng & KPI -->
            <div class="cr-main-tab-content" id="crTabRanking">
                <div id="crLeaderboard"><div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Chọn tab để tải dữ liệu...</div></div>
                <div id="crTeamComparison"></div>
            </div>

            <!-- TAB 2: Chi Tiết & Phân Tích -->
            <div class="cr-main-tab-content" id="crTabDetail">
                <div id="crDetailContent"><div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Chọn tab để tải dữ liệu...</div></div>
            </div>
        </div>
    `;

    await crLoadData();

    // Load Chart.js dynamically then init chart
    if (typeof Chart === 'undefined') {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
        s.onload = () => crChartInit();
        document.head.appendChild(s);
    } else {
        crChartInit();
    }
}

function crSwitchPeriod(period) {
    _cr.period = period;
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    const d = now.getDate();
    if (period === 'day') {
        _cr.dateStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    } else if (period === 'week') {
        const day = now.getDay() || 7;
        const monday = new Date(now); monday.setDate(now.getDate() - day + 1);
        const wy = monday.getFullYear(), wm = monday.getMonth()+1;
        const jan1 = new Date(wy, 0, 1);
        const wn = Math.ceil(((monday - jan1) / 86400000 + jan1.getDay() + 1) / 7);
        _cr.dateStr = `${wy}-W${wn}`;
    } else if (period === 'month') {
        _cr.dateStr = `${yr}-${String(mo).padStart(2, '0')}`;
    } else if (period === 'quarter') {
        const q = Math.ceil(mo / 3);
        _cr.dateStr = `${yr}-Q${q}`;
    } else {
        _cr.dateStr = `${yr}`;
    }
    document.querySelectorAll('.cr-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.cr-tab[onclick="crSwitchPeriod('${period}')"]`).classList.add('active');
    crLoadData();
}

function crOpenDatePicker() {
    const picker = document.getElementById('crMonthPicker');
    if (picker) {
        picker.style.pointerEvents = 'auto';
        picker.showPicker ? picker.showPicker() : picker.click();
    }
}

function crPickMonth(val) {
    if (!val) return;
    _cr.period = 'month';
    _cr.dateStr = val;
    document.querySelectorAll('.cr-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.cr-tab[onclick="crSwitchPeriod(\'month\')"]').classList.add('active');
    crLoadData();
}

function crNavPrev() {
    if (_cr.period === 'day') {
        const d = new Date(_cr.dateStr + 'T00:00:00'); d.setDate(d.getDate() - 1);
        _cr.dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } else if (_cr.period === 'week') {
        const [y, w] = _cr.dateStr.split('-W').map(Number);
        _cr.dateStr = w <= 1 ? `${y-1}-W52` : `${y}-W${w-1}`;
    } else if (_cr.period === 'month') {
        const [y, m] = _cr.dateStr.split('-').map(Number);
        const pm = m === 1 ? 12 : m - 1;
        const py = m === 1 ? y - 1 : y;
        _cr.dateStr = `${py}-${String(pm).padStart(2, '0')}`;
    } else if (_cr.period === 'quarter') {
        const [y, q] = [parseInt(_cr.dateStr.split('-Q')[0]), parseInt(_cr.dateStr.split('-Q')[1])];
        const pq = q === 1 ? 4 : q - 1;
        const py = q === 1 ? y - 1 : y;
        _cr.dateStr = `${py}-Q${pq}`;
    } else {
        _cr.dateStr = `${parseInt(_cr.dateStr) - 1}`;
    }
    crLoadData();
}

function crNavNext() {
    if (_cr.period === 'day') {
        const d = new Date(_cr.dateStr + 'T00:00:00'); d.setDate(d.getDate() + 1);
        _cr.dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } else if (_cr.period === 'week') {
        const [y, w] = _cr.dateStr.split('-W').map(Number);
        _cr.dateStr = w >= 52 ? `${y+1}-W1` : `${y}-W${w+1}`;
    } else if (_cr.period === 'month') {
        const [y, m] = _cr.dateStr.split('-').map(Number);
        const nm = m === 12 ? 1 : m + 1;
        const ny = m === 12 ? y + 1 : y;
        _cr.dateStr = `${ny}-${String(nm).padStart(2, '0')}`;
    } else if (_cr.period === 'quarter') {
        const [y, q] = [parseInt(_cr.dateStr.split('-Q')[0]), parseInt(_cr.dateStr.split('-Q')[1])];
        const nq = q === 4 ? 1 : q + 1;
        const ny = q === 4 ? y + 1 : y;
        _cr.dateStr = `${ny}-Q${nq}`;
    } else {
        _cr.dateStr = `${parseInt(_cr.dateStr) + 1}`;
    }
    crLoadData();
}

async function crLoadData() {
    _crAdvLoaded = false; // Reset so Tab 2/3 reload with new period
    const groupsEl = document.getElementById('crGroups');
    if (groupsEl) groupsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải dữ liệu...</div>';

    try {
        const data = await apiCall(`/api/reports/customer-retention?period=${_cr.period}&date=${_cr.dateStr}`);
        if (data.error) {
            console.error('API error:', data.error);
            if (groupsEl) groupsEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">❌ ${data.error}</div>`;
            return;
        }
        if (!data.summary) {
            console.error('API returned unexpected data:', data);
            if (groupsEl) groupsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">❌ Dữ liệu không hợp lệ. Vui lòng thử lại.</div>';
            return;
        }
        _cr.data = data;
        crRenderCards(data);
        crRenderGroups(data);

        // Auto-reload Tab 2/3 if currently active
        const activeTab = document.querySelector('.cr-main-tab-content.active');
        if (activeTab && (activeTab.id === 'crTabRanking' || activeTab.id === 'crTabDetail')) {
            crLoadAdvanced();
        }
    } catch (err) {
        console.error('Customer retention error:', err);
        if (groupsEl) groupsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">❌ Lỗi tải dữ liệu</div>';
    }
}

function crTrendHTML(value, suffix = '') {
    if (value === undefined || value === null) return '<span class="cr-card-trend cr-trend-flat">— Chưa có</span>';
    if (value > 0) return `<span class="cr-card-trend cr-trend-up">▲ +${value}${suffix}</span>`;
    if (value < 0) return `<span class="cr-card-trend cr-trend-down">▼ ${value}${suffix}</span>`;
    return `<span class="cr-card-trend cr-trend-flat">— 0${suffix}</span>`;
}

function crTrendMini(value) {
    if (value === undefined || value === null || value === 0) return '<span style="color:#9ca3af;font-size:11px;">—</span>';
    if (value > 0) return `<span style="color:#10b981;font-size:11px;font-weight:700;">▲+${value}%</span>`;
    return `<span style="color:#ef4444;font-size:11px;font-weight:700;">▼${value}%</span>`;
}

function crProgressColor(rate) {
    if (rate >= 30) return 'linear-gradient(90deg, #059669, #10b981)';
    if (rate >= 15) return 'linear-gradient(90deg, #d97706, #fbbf24)';
    return 'linear-gradient(90deg, #dc2626, #f87171)';
}

function crFormatVND(num) {
    if (!num) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + ' tr';
    if (num >= 1e3) return Math.round(num / 1e3) + 'k';
    return num.toLocaleString('vi-VN');
}

function crRenderCards(data) {
    const s = data.summary;
    const c = s.current || {};
    const t = s.trend || {};

    document.getElementById('crPeriodLabel').textContent = data.period.label;

    document.getElementById('crCards').innerHTML = `
        <div class="cr-card total">
            <div class="cr-card-value">${c.total || 0}</div>
            <div class="cr-card-label">Tổng Đơn Hoàn Thành</div>
            ${crTrendHTML(t.total)}
        </div>
        <div class="cr-card new">
            <div class="cr-card-value">${c.new || 0}</div>
            <div class="cr-card-label">Số Đơn KH Mới</div>
            ${crTrendHTML(t.new)}
        </div>
        <div class="cr-card returning">
            <div class="cr-card-value">${c.returning || 0}</div>
            <div class="cr-card-label">Số Đơn KH Cũ Quay Lại</div>
            ${crTrendHTML(t.returning)}
        </div>
        <div class="cr-card rate">
            <div class="cr-card-value">${c.rate || 0}%</div>
            <div class="cr-card-label">Tỷ Lệ Đơn KH Cũ Quay Lại</div>
            ${crTrendHTML(t.rate, '%')}
        </div>
        <div class="cr-card revenue">
            <div class="cr-card-value">${crFormatVND(c.revenue || 0)}</div>
            <div class="cr-card-label">💰 Tổng Doanh Số</div>
            ${crTrendHTML(t.revenue_pct, '%')}
        </div>
    `;
}

function crRenderGroups(data) {
    const el = document.getElementById('crGroups');
    if (!data.groups || data.groups.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">📭 Chưa có dữ liệu trong kỳ này</div>';
        return;
    }

    const convMap = data.conversionMap || {};
    const kpiMap = data.kpiMap || {};
    const isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');

    // Auto-expand all groups and teams on first load
    if (!_cr._autoExpanded) {
        _cr._autoExpanded = true;
        data.groups.forEach((g, gi) => {
            _cr.expandedMgr.add(gi);
            (g.teams || []).forEach((t, ti) => {
                _cr.expandedTeam.add(gi + '-' + ti);
            });
        });
    }

    // Find top employee (highest returning rate with at least 1 order)
    let topEmpId = null, topRate = -1;
    data.groups.forEach(g => {
        (g.teams || []).forEach(t => {
            (t.employees || []).forEach(e => {
                if (e.current.total > 0 && e.current.rate > topRate) {
                    topRate = e.current.rate;
                    topEmpId = e.user_id;
                }
            });
        });
    });

    function kpiBar(uid, metric, actual) {
        const v = kpiMap['user_' + uid + '_' + metric];
        if (!v || v <= 0) return '';
        const pct = Math.min(Math.round(actual / v * 100), 150);
        const c = pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
        return '<div style="display:flex;align-items:center;gap:3px;margin-top:2px;"><div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;min-width:36px;"><div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + c + ';border-radius:2px;"></div></div><span style="font-size:9px;font-weight:700;color:' + c + ';">' + pct + '%' + (pct>=100?'\uD83C\uDFC6':'') + '</span></div>';
    }

    function convBadge(uid) {
        const c = convMap[uid]; if (!c) return '';
        const cl = c.rate >= 70 ? '#10b981' : c.rate >= 40 ? '#f59e0b' : '#ef4444';
        const bg = c.rate >= 70 ? '#d1fae5' : c.rate >= 40 ? '#fef3c7' : '#fee2e2';
        return '<span style="background:' + bg + ';color:' + cl + ';padding:2px 6px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;" title="Chuy\u1ec3n \u0111\u1ed5i: ' + c.completed + '/' + c.assigned + ' KH">\uD83D\uDD04 ' + c.rate + '%</span>';
    }

    let html = '';
    data.groups.forEach((group, gi) => {
        const mgrExpanded = _cr.expandedMgr.has(gi);
        const mc = group.current || {};

        html += `<div class="cr-group">`;
        html += `<div class="cr-group-header cr-mgr-header" onclick="crToggleMgr(${gi})">
            <div class="cr-mgr-name">
                <span class="cr-arrow ${mgrExpanded ? 'open' : ''}">▶</span>
                🏢 ${group.dept_name || group.name || 'Chưa phân Quản Lý'}
            </div>
            <div class="cr-stat-grid">
                <span class="cr-stat-pill" style="background:#1e1b4b;color:white;">${mc.total || 0}</span>
                <span class="cr-stat-pill" style="background:#047857;color:white;">${mc.new || 0} đ.mới</span>
                <span class="cr-stat-pill" style="background:#c2410c;color:white;">${mc.returning || 0} đ.cũ</span>
                <span class="cr-stat-pill" style="background:#7c3aed;color:white;">${mc.rate || 0}%</span>
                <span></span>
                <span class="cr-stat-cell">${crTrendMini(group.trend?.rate)}</span>
                <span class="cr-stat-pill" style="background:#0369a1;color:white;font-size:10px;">${crFormatVND(mc.revenue || 0)}</span>
                <span class="cr-stat-cell">${crTrendMini(group.trend?.revenue_pct)}</span>
            </div>
        </div>`;

        if (mgrExpanded && group.teams) {
            // Show manager's personal stats if they have data
            if (group.personal) {
                const pc = group.personal.current || {};

                var mgrEscName = (group.name || '').replace(/'/g, "\'");
                html += '<div class="cr-emp" onclick="crShowDetail(' + group.user_id + ',\'' + mgrEscName + '\')"  style="background:#f3f4f6;border-left:3px solid #9ca3af;margin:4px 8px;border-radius:10px;">'
                    + '<div class="cr-emp-name">'
                    + '<span class="cr-role-badge" style="background:#6b7280;color:white;">QL</span> '
                    + (group.name || '') + ' <span style="font-size:11px;color:#6b7280;">(c\u00e1 nh\u00e2n)</span> '
                    + convBadge(group.user_id)
                    + '</div>'
                    + '<div class="cr-emp-stats">'
                    + '<span class="cr-stat-cell" style="font-weight:800;color:#1e1b4b;">' + (pc.total || 0) + '</span>'
                    + '<span class="cr-stat-cell" style="color:#059669;">' + (pc.new || 0) + ' \u0111.m\u1edbi</span>'
                    + '<span class="cr-stat-cell" style="color:#c2410c;">' + (pc.returning || 0) + ' \u0111.c\u0169</span>'
                    + '<div class="cr-progress-wrap"><div class="cr-progress-bar" style="width:' + Math.min(pc.rate || 0, 100) + '%;background:' + crProgressColor(pc.rate || 0) + ';"></div></div>'
                    + '<span class="cr-stat-cell" style="font-weight:800;color:#7c3aed;">' + (pc.rate || 0) + '%</span>'
                    + '<span class="cr-stat-cell">' + crTrendMini(group.personal.trend?.rate) + '</span>'
                    + '<span class="cr-stat-cell" style="font-weight:700;color:#0369a1;font-size:10px;">' + crFormatVND(pc.revenue || 0) + '</span>'
                    + '<span class="cr-stat-cell">' + crTrendMini(group.personal.trend?.revenue_pct) + '</span>'
                    + '</div>'
                    + '</div>';
            }

            group.teams.forEach((team, ti) => {
                const teamKey = `${gi}-${ti}`;
                const teamExpanded = _cr.expandedTeam.has(teamKey);
                const tc = team.current || {};

                html += `<div class="cr-team">
                    <div class="cr-team-header" onclick="crToggleTeam('${teamKey}')">
                        <div>
                            <span class="cr-arrow ${teamExpanded ? 'open' : ''}" style="margin-right:4px;">▶</span>
                            <span class="cr-team-name" style="display:inline;">🏠 ${team.name}</span>
                            ${team.leader_name ? `<span class="cr-team-leader"> — TP: ${team.leader_name}</span>` : ''}
                        </div>
                        <div class="cr-stat-grid">
                            <span class="cr-stat-pill" style="background:#e0e7ff;color:#3730a3;">${tc.total || 0}</span>
                            <span class="cr-stat-pill" style="background:#d1fae5;color:#065f46;">${tc.new || 0} đ.mới</span>
                            <span class="cr-stat-pill" style="background:#ffedd5;color:#9a3412;">${tc.returning || 0} đ.cũ</span>
                            <span class="cr-stat-pill" style="background:#ede9fe;color:#5b21b6;">${tc.rate || 0}%</span>
                            <span></span>
                            <span class="cr-stat-cell">${crTrendMini(team.trend?.rate)}</span>
                            <span class="cr-stat-pill" style="background:#e0f2fe;color:#0c4a6e;font-size:10px;">${crFormatVND(tc.revenue || 0)}</span>
                            <span class="cr-stat-cell">${crTrendMini(team.trend?.revenue_pct)}</span>
                        </div>
                    </div>`;

                if (teamExpanded && team.employees) {
                    team.employees.forEach(emp => {
                        const ec = emp.current || {};
                        const isTop = emp.user_id === topEmpId && topRate > 0;
                        const roleBadge = emp.role === 'truong_phong' ? '<span class="cr-role-badge cr-role-tp">TP</span>' :
                            emp.role === 'thu_viec' ? '<span class="cr-role-badge cr-role-tv">TV</span>' :
                            '<span class="cr-role-badge cr-role-nv">NV</span>';

                        html += `<div class="cr-emp" onclick="crShowDetail(${emp.user_id}, '${emp.name.replace(/'/g, "\\'")}')" ${isTop ? 'style="background:linear-gradient(90deg,#fffbeb,#fef3c7);border-left:3px solid #f59e0b;"' : ''}>
                            <div class="cr-emp-name">
                                ${isTop ? '<span class="cr-top-badge">\u2728 TOP</span>' : ''}
                                ${roleBadge}
                                ${emp.name}
                                ${convBadge(emp.user_id)}
                            </div>
                            <div class="cr-emp-stats">
                                <span class="cr-stat-cell" style="font-weight:800;color:#1e1b4b;">${ec.total || 0}</span>
                                <span class="cr-stat-cell" style="color:#059669;">${ec.new || 0} \u0111.m\u1edbi</span>
                                <span class="cr-stat-cell" style="color:#c2410c;">${ec.returning || 0} \u0111.c\u0169</span>
                                <div class="cr-progress-wrap">
                                    <div class="cr-progress-bar" style="width:${Math.min(ec.rate || 0, 100)}%;background:${crProgressColor(ec.rate || 0)};"></div>
                                </div>
                                <span class="cr-stat-cell" style="font-weight:800;color:#7c3aed;">${ec.rate || 0}%</span>
                                <span class="cr-stat-cell">${crTrendMini(emp.trend?.rate)}</span>
                                <span class="cr-stat-cell" style="font-weight:700;color:#0369a1;font-size:10px;">${crFormatVND(ec.revenue || 0)}</span>
                                <span class="cr-stat-cell">${crTrendMini(emp.trend?.revenue_pct)}</span>
                            </div>
                        </div>`;
                    });
                }

                html += `</div>`;
            });
        }

        html += `</div>`;
    });

    el.innerHTML = html;
}

// KPI Setting Modal — only for Director
function crOpenKPI(userId, empName) {
    const periodType = _cr.period;
    const periodValue = _cr.data?.period?.label || _crAdvData?.period?.label || '';
    const kpiMap = Object.assign({}, _cr.data?.kpiMap || {}, _crAdvData?.kpiMap || {});

    const getKPI = (metric) => {
        const v = kpiMap['user_' + userId + '_' + metric];
        return v || '';
    };

    // Remove existing modal if any
    const existing = document.getElementById('crKpiModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'crKpiModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="font-size:16px;font-weight:800;color:#1e1b4b;">\uD83C\uDFAF \u0110\u1eb7t KPI — ${empName}</h3>
                <button onclick="document.getElementById('crKpiModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">&times;</button>
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">K\u1ef3: <strong>${periodValue}</strong> (${periodType === 'month' ? 'Th\u00e1ng' : periodType === 'quarter' ? 'Qu\u00fd' : 'N\u0103m'})</div>
            <div style="display:grid;gap:12px;">
                <div>
                    <label style="font-size:12px;font-weight:600;color:#374151;">Doanh s\u1ed1 m\u1ee5c ti\u00eau (VN\u0110)</label>
                    <input type="number" id="kpi_revenue" value="${getKPI('revenue')}" placeholder="VD: 500000000 = 500 tri\u1ec7u" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:600;color:#374151;">S\u1ed1 \u0111\u01a1n m\u1ee5c ti\u00eau</label>
                    <input type="number" id="kpi_orders" value="${getKPI('orders')}" placeholder="VD: 20" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:600;color:#374151;">T\u1ec9 l\u1ec7 chuy\u1ec3n \u0111\u1ed5i m\u1ee5c ti\u00eau (%)</label>
                    <input type="number" id="kpi_conversion" value="${getKPI('conversion_rate')}" placeholder="VD: 70" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:600;color:#374151;">T\u1ec9 l\u1ec7 KH c\u0169 quay l\u1ea1i m\u1ee5c ti\u00eau (%)</label>
                    <input type="number" id="kpi_retention" value="${getKPI('retention_rate')}" placeholder="VD: 50" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;">
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;">
                <button onclick="crSaveKPI(${userId})" style="flex:1;padding:12px;background:linear-gradient(135deg,#4338ca,#6366f1);color:white;border:none;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">L\u01b0u KPI</button>
                <button onclick="document.getElementById('crKpiModal').remove()" style="padding:12px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;">H\u1ee7y</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function crSaveKPI(userId) {
    const targets = [];
    const periodType = _cr.period;
    const periodValue = _cr.data?.period?.label || '';

    const metrics = [
        { id: 'kpi_revenue', metric: 'revenue' },
        { id: 'kpi_orders', metric: 'orders' },
        { id: 'kpi_conversion', metric: 'conversion_rate' },
        { id: 'kpi_retention', metric: 'retention_rate' }
    ];

    for (const m of metrics) {
        const el = document.getElementById(m.id);
        if (el && el.value && parseFloat(el.value) > 0) {
            targets.push({
                target_type: 'user',
                target_id: userId,
                metric: m.metric,
                period_type: periodType,
                period_value: periodValue,
                target_value: parseFloat(el.value)
            });
        }
    }

    if (targets.length === 0) {
        alert('Vui l\u00f2ng nh\u1eadp \u00edt nh\u1ea5t 1 ch\u1ec9 ti\u00eau');
        return;
    }

    try {
        const res = await apiCall('/api/kpi-targets/batch', 'POST', { targets });
        if (res.success) {
            document.getElementById('crKpiModal').remove();
            alert('\u2705 \u0110\u00e3 l\u01b0u KPI th\u00e0nh c\u00f4ng! (' + res.created + ' m\u1edbi, ' + res.updated + ' c\u1eadp nh\u1eadt)');
            crLoadData(); // Reload Tab 1 data
            _crAdvLoaded = false; crLoadAdvanced(); // Reload Tab 2 data
        } else {
            alert('\u274c L\u1ed7i: ' + (res.error || 'Kh\u00f4ng r\u00f5'));
        }
    } catch(err) {
        alert('\u274c L\u1ed7i k\u1ebft n\u1ed1i: ' + err.message);
    }
}

function crToggleMgr(index) {
    if (_cr.expandedMgr.has(index)) {
        _cr.expandedMgr.delete(index);
    } else {
        _cr.expandedMgr.add(index);
    }
    if (_cr.data) crRenderGroups(_cr.data);
}

function crToggleTeam(key) {
    if (_cr.expandedTeam.has(key)) {
        _cr.expandedTeam.delete(key);
    } else {
        _cr.expandedTeam.add(key);
    }
    if (_cr.data) crRenderGroups(_cr.data);
}

// ===== Employee Detail Modal =====
async function crShowDetail(userId, empName) {
    // Create overlay
    let overlay = document.getElementById('crDetailOverlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'crDetailOverlay';
    overlay.className = 'cr-detail-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="cr-detail-modal">
            <div class="cr-detail-header">
                <h3>📋 Chi tiết đơn — ${empName}</h3>
                <button class="cr-detail-close" onclick="document.getElementById('crDetailOverlay').remove()">✕</button>
            </div>
            <div class="cr-detail-summary" id="crDetailSummary">
                <span style="color:#9ca3af;font-size:13px;">⏳ Đang tải...</span>
            </div>
            <div class="cr-detail-body" id="crDetailBody">
                <div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải dữ liệu...</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    try {
        const data = await apiCall(`/api/reports/customer-retention/detail?user_id=${userId}&period=${_cr.period}&date=${_cr.dateStr}`);
        if (data.error) {
            document.getElementById('crDetailBody').innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">❌ ${data.error}</div>`;
            return;
        }

        window._crDetailOrders = data.orders || [];
        window._crDetailFilter = 'all';

        // Render summary badges
        document.getElementById('crDetailSummary').innerHTML = `
            <span class="cr-detail-badge active" id="crFilterAll" style="background:#1e1b4b;color:white;" onclick="crFilterOrders('all')">Tất cả (${data.total})</span>
            <span class="cr-detail-badge" id="crFilterNew" style="background:#d1fae5;color:#065f46;" onclick="crFilterOrders('new')">Đ.Mới (${data.new_count})</span>
            <span class="cr-detail-badge" id="crFilterRet" style="background:#ffedd5;color:#9a3412;" onclick="crFilterOrders('returning')">Đ.Cũ (${data.returning_count})</span>
            <span style="margin-left:auto;font-size:12px;color:#6b7280;font-weight:600;">📅 ${data.period?.label || ''}</span>
        `;

        crRenderDetailTable(data.orders);
    } catch (err) {
        console.error('Detail error:', err);
        document.getElementById('crDetailBody').innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">❌ Lỗi tải dữ liệu</div>';
    }
}

function crFilterOrders(filter) {
    window._crDetailFilter = filter;
    // Update active badge
    ['All','New','Ret'].forEach(k => {
        const el = document.getElementById('crFilter' + k);
        if (el) el.classList.remove('active');
    });
    const activeId = filter === 'all' ? 'crFilterAll' : filter === 'new' ? 'crFilterNew' : 'crFilterRet';
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');

    const orders = window._crDetailOrders || [];
    const filtered = filter === 'all' ? orders : orders.filter(o => o.type === filter);
    crRenderDetailTable(filtered);
}

function crRenderDetailTable(orders) {
    const body = document.getElementById('crDetailBody');
    if (!orders || orders.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">📭 Không có đơn nào</div>';
        return;
    }

    let html = `<table class="cr-detail-table">
        <thead><tr>
            <th style="width:40px;">#</th>
            <th>Loại</th>
            <th>Mã Đơn</th>
            <th>Khách Hàng</th>
            <th>SĐT</th>
            <th>Ngày HT</th>
            <th style="width:40px;">Lần</th>
        </tr></thead><tbody>`;

    orders.forEach((o, i) => {
        const typeLabel = o.type === 'new'
            ? '<span class="cr-type-new">🆕 Mới</span>'
            : '<span class="cr-type-ret">🔄 Cũ</span>';
        const dateStr = o.date ? new Date(o.date).toLocaleDateString('vi-VN') : '-';
        html += `<tr>
            <td style="color:#9ca3af;font-weight:600;">${i + 1}</td>
            <td>${typeLabel}</td>
            <td style="font-size:12px;color:#4338ca;font-weight:700;">${o.order_code || '-'}</td>
            <td style="font-weight:600;">${o.customer_name || '-'}</td>
            <td style="font-family:monospace;font-size:12px;">${o.phone || '-'}</td>
            <td style="font-size:12px;">${dateStr}</td>
            <td style="text-align:center;font-weight:700;color:${o.order_number === 1 ? '#059669' : '#c2410c'};">${o.order_number}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;
}

// ===== CHART SECTION =====
var _crChart = { instance: null, year: new Date().getFullYear(), optionsLoaded: false, chartPeriod: 'month' };

async function crChartInit() {
    _crChart.year = new Date().getFullYear();
    _crChart.chartPeriod = 'month';
    document.getElementById('crChartYearLabel').textContent = _crChart.year;
    await crChartLoad();
}

function crChartNavYear(delta) {
    _crChart.year += delta;
    document.getElementById('crChartYearLabel').textContent = _crChart.year;
    crChartLoad();
}

function crChartSwitchPeriod(p, btn) {
    _crChart.chartPeriod = p;
    document.querySelectorAll('.cr-chart-period-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    crChartLoad();
}

function crToggleLegend(idx, el) {
    if (!_crChart.instance) return;
    const meta = _crChart.instance.getDatasetMeta(idx);
    meta.hidden = !meta.hidden;
    el.classList.toggle('disabled', meta.hidden);
    _crChart.instance.update();
}

async function crChartLoad() {
    const sel = document.getElementById('crChartTarget');
    const val = sel.value;
    let type = 'all', target_id = '';

    if (val.startsWith('team_')) {
        type = 'team';
        target_id = val.replace('team_', '');
    } else if (val.startsWith('emp_')) {
        type = 'employee';
        target_id = val.replace('emp_', '');
    }

    try {
        const data = await apiCall(`/api/reports/customer-retention/chart?year=${_crChart.year}&type=${type}&target_id=${target_id}&chart_period=${_crChart.chartPeriod}`);

        // Populate dropdown on first load (with nested team > employees)
        if (!_crChart.optionsLoaded && data.options) {
            _crChart.optionsLoaded = true;
            let html = '<option value="all">🏢 Tổng P.Kinh Doanh</option>';
            if (data.options.teams) {
                data.options.teams.forEach(t => {
                    html += `<optgroup label="👥 ${t.name}">`;
                    html += `<option value="team_${t.id}">📊 Tổng ${t.name}</option>`;
                    if (t.employees) {
                        t.employees.forEach(e => {
                            html += `<option value="emp_${e.id}">&nbsp;&nbsp;👤 ${e.name}</option>`;
                        });
                    }
                    html += '</optgroup>';
                });
            }
            sel.innerHTML = html;
            sel.value = val;
        }

        // Reset legend toggle state
        document.querySelectorAll('.cr-chart-legend-item').forEach(el => el.classList.remove('disabled'));

        crChartRender(data.data || data.months || []);
    } catch (err) {
        console.error('Chart error:', err);
    }
}

function crChartRender(months) {
    const canvas = document.getElementById('crChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy previous chart
    if (_crChart.instance) {
        _crChart.instance.destroy();
        _crChart.instance = null;
    }

    const labels = months.map(m => m.label);
    const newData = months.map(m => m.new);
    const retData = months.map(m => m.returning);
    const rateData = months.map(m => m.rate);

    // Gradient fills
    const greenGrad = ctx.createLinearGradient(0, 0, 0, 350);
    greenGrad.addColorStop(0, 'rgba(5, 150, 105, 0.85)');
    greenGrad.addColorStop(1, 'rgba(5, 150, 105, 0.35)');

    const orangeGrad = ctx.createLinearGradient(0, 0, 0, 350);
    orangeGrad.addColorStop(0, 'rgba(194, 65, 12, 0.85)');
    orangeGrad.addColorStop(1, 'rgba(194, 65, 12, 0.35)');

    const revenueData = months.map(m => Math.round((m.revenue || 0) / 1e6 * 10) / 10);

    _crChart.instance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: '\u0110\u01a1n KH M\u1edbi',
                    data: newData,
                    backgroundColor: greenGrad,
                    borderColor: '#059669',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 3
                },
                {
                    label: '\u0110\u01a1n KH C\u0169 Quay L\u1ea1i',
                    data: retData,
                    backgroundColor: orangeGrad,
                    borderColor: '#c2410c',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 4
                },
                {
                    label: 'T\u1ef7 L\u1ec7 KH C\u0169 (%)',
                    data: rateData,
                    type: 'line',
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#7c3aed',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1',
                    order: 1
                },
                {
                    label: 'Doanh S\u1ed1 (tri\u1ec7u)',
                    data: revenueData,
                    type: 'line',
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    borderWidth: 2.5,
                    borderDash: [6, 3],
                    pointRadius: 4,
                    pointBackgroundColor: '#0284c7',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y2',
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 27, 75, 0.95)',
                    titleFont: { size: 14, weight: '800' },
                    bodyFont: { size: 13 },
                    padding: 14,
                    cornerRadius: 12,
                    displayColors: true,
                    boxWidth: 12,
                    boxHeight: 12,
                    boxPadding: 4,
                    callbacks: {
                        title: function(items) {
                            const m = months[items[0].dataIndex];
                            return `${m.label}/${_crChart.year} \u2014 T\u1ed5ng: ${m.total} \u0111\u01a1n`;
                        },
                        label: function(item) {
                            if (item.datasetIndex === 2) return ` T\u1ef7 l\u1ec7 KH c\u0169: ${item.raw}%`;
                            if (item.datasetIndex === 3) return ` Doanh s\u1ed1: ${item.raw} tri\u1ec7u VN\u0110`;
                            return ` ${item.dataset.label}: ${item.raw} \u0111\u01a1n`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12, weight: '700' }, color: '#64748b' }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: {
                        font: { size: 11, weight: '600' },
                        color: '#64748b',
                        stepSize: 1,
                        callback: v => Number.isInteger(v) ? v : ''
                    },
                    title: { display: true, text: 'S\u1ed1 \u0111\u01a1n', font: { size: 12, weight: '700' }, color: '#475569' }
                },
                y1: {
                    beginAtZero: true,
                    max: 100,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { size: 11, weight: '600' },
                        color: '#7c3aed',
                        callback: v => v + '%'
                    },
                    title: { display: true, text: 'T\u1ef7 l\u1ec7 %', font: { size: 12, weight: '700' }, color: '#7c3aed' }
                },
                y2: {
                    beginAtZero: true,
                    display: false
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

// ===== MAIN TAB SWITCHING =====
var _crAdvData = null;
var _crAdvLoaded = false;

function crSwitchMainTab(idx, btn) {
    document.querySelectorAll('.cr-main-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.cr-main-tab-content').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const tabs = ['crTabOverview', 'crTabRanking', 'crTabDetail'];
    const el = document.getElementById(tabs[idx]);
    if (el) { el.classList.add('active'); el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; }

    if ((idx === 1 || idx === 2) && !_crAdvLoaded) {
        crLoadAdvanced();
    }
}

async function crLoadAdvanced() {
    try {
        _crAdvData = await apiCall(`/api/reports/customer-retention/advanced?period=${_cr.period}&date=${_cr.dateStr}`);
        _crAdvLoaded = true;
        crRenderAlerts(_crAdvData.alerts || []);
        crRenderLeaderboard(_crAdvData);
        crRenderTeamComparison(_crAdvData.teamComparison || []);
        crRenderDetail(_crAdvData);
    } catch (err) {
        console.error('Advanced data error:', err);
    }
}

// ===== ALERTS =====
function crRenderAlerts(alerts) {
    const el = document.getElementById('crAlertBanner');
    if (!alerts.length) { el.innerHTML = ''; return; }
    const top5 = alerts.slice(0, 5);
    el.innerHTML = '<div class="cr-alerts">' + top5.map(a => {
        const icon = a.severity === 'danger' ? '🚨' : '⚠️';
        const cls = a.severity === 'danger' ? 'cr-alert-danger' : 'cr-alert-warning';
        return `<div class="cr-alert-item ${cls}">${icon} <strong>${a.name}</strong> <span style="opacity:0.7">(${a.team})</span> — ${a.message}</div>`;
    }).join('') + '</div>';
}

// ===== LEADERBOARD =====
var _crLbType = 'by_revenue';

function crRenderLeaderboard(data) {
    const lb = data.leaderboard || {};
    const el = document.getElementById('crLeaderboard');
    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    const convMap = data.conversionMap || {};
    const kpiMap = data.kpiMap || {};
    const isGD = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');

    function kpiB(uid, metric, actual) {
        const v = kpiMap['user_' + uid + '_' + metric];
        if (!v || v <= 0) return '';
        const pct = Math.min(Math.round(actual / v * 100), 150);
        const c = pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
        return '<div style="display:flex;align-items:center;gap:3px;"><div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + c + ';border-radius:2px;"></div></div><span style="font-size:9px;font-weight:700;color:' + c + ';">' + pct + '%' + (pct>=100?'\uD83C\uDFC6':'') + '</span></div>';
    }

    function renderRows(list) {
        if (!list || !list.length) return '<div style="padding:24px;text-align:center;color:#9ca3af;">Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u</div>';
        return list.map(function(item, i) {
            var rank = i < 3 ? '<span style="font-size:24px;">' + medals[i] + '</span>' : '<span style="color:#6b7280;">' + (i + 1) + '</span>';
            var cv = convMap[item.user_id];
            var cvRate = cv ? cv.rate : 0;
            var cvColor = cvRate >= 70 ? '#10b981' : cvRate >= 40 ? '#f59e0b' : '#ef4444';
            var cvBg = cvRate >= 70 ? '#d1fae5' : cvRate >= 40 ? '#fef3c7' : '#fee2e2';
            var kR = kpiB(item.user_id, 'revenue', item.revenue);
            var kO = kpiB(item.user_id, 'orders', item.total_orders);
            var kC = kpiB(item.user_id, 'conversion_rate', cvRate);
            var kRt = kpiB(item.user_id, 'retention_rate', item.rate);
            var hasKpi = kR || kO || kC || kRt;
            var kpiBtn = isGD ? ' <span onclick="crOpenKPI(' + item.user_id + ',\'' + item.name.replace(/'/g, "\\'") + '\')" style="cursor:pointer;font-size:12px;" title="\u0110\u1eb7t KPI">\uD83C\uDFAF</span>' : '';
            var row = '<div class="cr-lb-row" ' + (i < 3 ? 'style="background:linear-gradient(90deg,' + ['#fefce8','#f8fafc','#fff7ed'][i] + ',white);"' : '') + '>';
            row += '<div class="cr-lb-rank">' + rank + '</div>';
            row += '<div><div class="cr-lb-name">' + item.name + kpiBtn + '</div><div class="cr-lb-team">' + item.team + '</div></div>';
            row += '<div class="cr-lb-val" style="color:#0369a1;">' + crFormatVND(item.revenue) + '</div>';
            row += '<div class="cr-lb-val" style="color:#1e1b4b;">' + item.total_orders + ' \u0111\u01a1n</div>';
            row += '<div class="cr-lb-val"><span style="background:' + cvBg + ';color:' + cvColor + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">' + cvRate + '%</span></div>';
            row += '<div class="cr-lb-val" style="color:#7c3aed;">' + item.rate + '%</div>';
            row += '</div>';
            if (hasKpi) {
                row += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px 10px;padding:4px 16px 10px 52px;background:#fafbfd;border-bottom:1px solid #f1f5f9;">';
                row += kR ? '<div><span style="font-size:8px;color:#9ca3af;">\uD83C\uDFAF DS</span>' + kR + '</div>' : '<div></div>';
                row += kO ? '<div><span style="font-size:8px;color:#9ca3af;">\uD83C\uDFAF \u0110\u01a1n</span>' + kO + '</div>' : '<div></div>';
                row += kC ? '<div><span style="font-size:8px;color:#9ca3af;">\uD83C\uDFAF C\u0110</span>' + kC + '</div>' : '<div></div>';
                row += kRt ? '<div><span style="font-size:8px;color:#9ca3af;">\uD83C\uDFAF KHC</span>' + kRt + '</div>' : '<div></div>';
                row += '</div>';
            }
            return row;
        }).join('');
    }

    el.innerHTML = '<div class="cr-lb-section">'
        + '<div class="cr-lb-header">\uD83C\uDFC6 B\u1ea3ng X\u1ebfp H\u1ea1ng Nh\u00e2n Vi\u00ean</div>'
        + '<div class="cr-lb-tabs">'
        + '<button class="cr-lb-tab ' + (_crLbType === 'by_revenue' ? 'active' : '') + '" onclick="crSwitchLb(\'by_revenue\',this)">\uD83D\uDCB0 Doanh S\u1ed1</button>'
        + '<button class="cr-lb-tab ' + (_crLbType === 'by_orders' ? 'active' : '') + '" onclick="crSwitchLb(\'by_orders\',this)">\uD83D\uDCE6 S\u1ed1 \u0110\u01a1n</button>'
        + '<button class="cr-lb-tab ' + (_crLbType === 'by_retention' ? 'active' : '') + '" onclick="crSwitchLb(\'by_retention\',this)">\uD83D\uDD04 KH C\u0169 Quay L\u1ea1i</button>'
        + '</div>'
        + '<div class="cr-lb-body" id="crLbBody">'
        + '<div class="cr-lb-row" style="background:#f8fafc;font-weight:700;font-size:12px;color:#475569;">'
        + '<div style="text-align:center;">#</div><div>Nh\u00e2n vi\u00ean</div><div style="text-align:right;">Doanh s\u1ed1</div><div style="text-align:right;">\u0110\u01a1n h\u00e0ng</div><div style="text-align:right;">\uD83D\uDD04 C\u0110</div><div style="text-align:right;">KH c\u0169 %</div>'
        + '</div>'
        + renderRows(lb[_crLbType])
        + '</div></div>';
}

function crSwitchLb(type, btn) {
    _crLbType = type;
    document.querySelectorAll('.cr-lb-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (_crAdvData) crRenderLeaderboard(_crAdvData);
}

// ===== TEAM COMPARISON =====
function crRenderTeamComparison(teams) {
    const el = document.getElementById('crTeamComparison');
    if (!teams.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
        <div class="cr-lb-section">
            <div class="cr-lb-header">🏅 So Sánh Team</div>
            <div class="cr-tc-grid">
                ${teams.map(t => `
                    <div class="cr-tc-card">
                        <div class="cr-tc-name">🏠 ${t.name} <span style="font-size:11px;color:#6b7280;font-weight:500;">(${t.employee_count} NV)</span></div>
                        <div class="cr-tc-stats">
                            <div class="cr-tc-stat"><div class="cr-tc-stat-val" style="color:#0369a1;">${crFormatVND(t.revenue)}</div><div class="cr-tc-stat-label">Doanh số</div></div>
                            <div class="cr-tc-stat"><div class="cr-tc-stat-val" style="color:#1e1b4b;">${t.total_orders}</div><div class="cr-tc-stat-label">Tổng đơn</div></div>
                            <div class="cr-tc-stat"><div class="cr-tc-stat-val" style="color:#059669;">${t.returning}</div><div class="cr-tc-stat-label">Đơn KH cũ</div></div>
                            <div class="cr-tc-stat"><div class="cr-tc-stat-val" style="color:#7c3aed;">${t.rate}%</div><div class="cr-tc-stat-label">Tỷ lệ KH cũ</div></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

// ===== TAB 3: DETAIL =====
function crRenderDetail(data) {
    const el = document.getElementById('crDetailContent');
    const conv = data.conversion || {};
    const proc = data.processing || {};
    const cancel = data.cancel || [];
    const topCust = data.topCustomers || [];

    // Summary mini cards
    let html = `<div class="cr-data-mini-cards">
        <div class="cr-data-mini">
            <div class="cr-data-mini-val">${conv.assigned || 0}</div>
            <div class="cr-data-mini-label">📥 KH được giao</div>
        </div>
        <div class="cr-data-mini">
            <div class="cr-data-mini-val">${conv.completed || 0}</div>
            <div class="cr-data-mini-label">✅ Đơn hoàn thành</div>
        </div>
        <div class="cr-data-mini" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#6ee7b7;">
            <div class="cr-data-mini-val" style="color:#065f46;">${conv.rate || 0}%</div>
            <div class="cr-data-mini-label">🎯 Tỷ lệ chuyển đổi</div>
        </div>
        <div class="cr-data-mini" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#a78bfa;">
            <div class="cr-data-mini-val" style="color:#5b21b6;">${proc.avg_days || 0} ngày</div>
            <div class="cr-data-mini-label">⏱️ TG xử lý trung bình</div>
        </div>
    </div>`;

    // Cancel rate table
    const cancelSorted = [...cancel].sort((a, b) => b.rate - a.rate);
    html += `<div class="cr-data-section">
        <div class="cr-data-header">❌ Tỷ Lệ Hủy Đơn Theo Nhân Viên</div>
        <div style="overflow-x:auto;"><table class="cr-data-table">
            <thead><tr><th>Nhân viên</th><th>Team</th><th style="text-align:center;">Tổng đơn</th><th style="text-align:center;">Hủy</th><th style="text-align:center;">Tỷ lệ</th></tr></thead>
            <tbody>${cancelSorted.length ? cancelSorted.map(r => {
                const color = r.rate >= 30 ? '#ef4444' : r.rate >= 15 ? '#f59e0b' : '#059669';
                return `<tr><td style="font-weight:700;">${r.name}</td><td style="color:#6b7280;">${r.team}</td><td style="text-align:center;">${r.total}</td><td style="text-align:center;color:#ef4444;font-weight:700;">${r.cancelled}</td><td style="text-align:center;"><span style="font-weight:800;color:${color};">${r.rate}%</span></td></tr>`;
            }).join('') : '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">Chưa có dữ liệu</td></tr>'}
            </tbody>
        </table></div>
    </div>`;

    // Top Customers
    html += `<div class="cr-data-section">
        <div class="cr-data-header">👑 Top Khách Hàng Chi Tiêu Nhiều Nhất</div>
        <div style="overflow-x:auto;"><table class="cr-data-table">
            <thead><tr><th>#</th><th>Khách hàng</th><th>SĐT</th><th style="text-align:center;">Số đơn</th><th style="text-align:right;">Doanh số</th><th>NV phụ trách</th></tr></thead>
            <tbody>${topCust.length ? topCust.map((r, i) => {
                const medal = i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1);
                return `<tr><td style="text-align:center;font-size:16px;">${medal}</td><td style="font-weight:700;">${r.name || 'KH'}</td><td>${r.phone || '-'}</td><td style="text-align:center;font-weight:700;">${r.orders}</td><td style="text-align:right;font-weight:800;color:#0369a1;">${crFormatVND(r.revenue)}</td><td style="color:#6b7280;">${r.employee}</td></tr>`;
            }).join('') : '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Chưa có dữ liệu</td></tr>'}
            </tbody>
        </table></div>
    </div>`;

    el.innerHTML = html;
}
