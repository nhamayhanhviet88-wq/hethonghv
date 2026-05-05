// ========== DASHBOARD P.KINH DOANH — Khách Mới vs Khách Cũ Quay Lại ==========
// Page: /dashboardkdoanh
// Auto-detected by convention: renderDashboardkdoanhPage(container)

var _cr = {
    period: 'month',
    dateStr: '',
    data: null,
    expandedMgr: new Set(),
    expandedTeam: new Set()
};

async function renderDashboardkdoanhPage(container) {
    // Build current month default
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    if (!_cr.dateStr) _cr.dateStr = `${yr}-${String(mo).padStart(2, '0')}`;

    container.innerHTML = `
        <style>
            .cr-wrap { max-width: 1200px; margin: 0 auto; }
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
            .cr-trend-up { color: #34d399; background: rgba(52,211,153,0.15); }
            .cr-trend-down { color: #f87171; background: rgba(248,113,113,0.15); }
            .cr-trend-flat { color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.1); }

            .cr-group { background: white; border-radius: 14px; border: 1px solid #e5e7eb; margin-bottom: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
            .cr-group-header { padding: 16px 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: background 0.2s; }
            .cr-group-header:hover { background: #f8fafc; }
            .cr-mgr-header { background: linear-gradient(135deg, #fefce8, #fef9c3); border-bottom: 2px solid #fbbf24; }
            .cr-mgr-name { font-size: 15px; font-weight: 800; color: #92400e; display: flex; align-items: center; gap: 8px; }
            .cr-mgr-stats { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
            .cr-stat-pill { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
            .cr-arrow { font-size: 12px; color: #9ca3af; transition: transform 0.3s; }
            .cr-arrow.open { transform: rotate(90deg); }

            .cr-team { border-top: 1px solid #f3f4f6; }
            .cr-team-header { padding: 12px 20px 12px 44px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #f8fafc; transition: background 0.2s; }
            .cr-team-header:hover { background: #eef2ff; }
            .cr-team-name { font-size: 13px; font-weight: 700; color: #1e40af; display: flex; align-items: center; gap: 6px; }
            .cr-team-leader { font-size: 11px; color: #6b7280; font-weight: 500; }

            .cr-emp { padding: 10px 20px 10px 68px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid #f9fafb; transition: background 0.15s; }
            .cr-emp:hover { background: #fefce8; }
            .cr-emp-name { font-size: 13px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 6px; min-width: 140px; }
            .cr-emp-stats { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; flex: 1; justify-content: flex-end; }

            .cr-progress-wrap { width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
            .cr-progress-bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

            .cr-role-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
            .cr-role-tp { background: #dbeafe; color: #1d4ed8; }
            .cr-role-nv { background: #f3f4f6; color: #6b7280; }
            .cr-role-tv { background: #fef3c7; color: #92400e; }

            .cr-top-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 800; color: #ca8a04; background: linear-gradient(135deg, #fef9c3, #fef3c7); padding: 2px 8px; border-radius: 12px; border: 1px solid #fbbf24; animation: crShimmer 2s ease-in-out infinite; }
            @keyframes crShimmer { 0%, 100% { box-shadow: 0 0 4px rgba(251,191,36,0.3); } 50% { box-shadow: 0 0 12px rgba(251,191,36,0.6); } }

            @media (max-width: 768px) {
                .cr-cards { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .cr-card { padding: 16px 12px; }
                .cr-card-value { font-size: 28px; }
                .cr-mgr-stats, .cr-emp-stats { gap: 6px; }
                .cr-stat-pill { font-size: 10px; padding: 3px 7px; }
                .cr-emp { padding-left: 44px; }
                .cr-team-header { padding-left: 28px; }
                .cr-emp-name { min-width: auto; }
                .cr-header { flex-direction: column; align-items: stretch; }
            }
        </style>
        <div class="cr-wrap" id="crWrap">
            <div class="cr-header">
                <div class="cr-period-tabs">
                    <button class="cr-tab ${_cr.period === 'month' ? 'active' : ''}" onclick="crSwitchPeriod('month')">Tháng</button>
                    <button class="cr-tab ${_cr.period === 'quarter' ? 'active' : ''}" onclick="crSwitchPeriod('quarter')">Quý</button>
                    <button class="cr-tab ${_cr.period === 'year' ? 'active' : ''}" onclick="crSwitchPeriod('year')">Năm</button>
                </div>
                <div class="cr-nav">
                    <button class="cr-nav-btn" onclick="crNavPrev()" title="Kỳ trước">‹</button>
                    <div class="cr-period-label" id="crPeriodLabel">...</div>
                    <button class="cr-nav-btn" onclick="crNavNext()" title="Kỳ sau">›</button>
                </div>
            </div>
            <div class="cr-cards" id="crCards">
                <div class="cr-card total"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                <div class="cr-card new"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                <div class="cr-card returning"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
                <div class="cr-card rate"><div class="cr-card-value">...</div><div class="cr-card-label">Đang tải</div></div>
            </div>
            <div id="crGroups"><div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải dữ liệu...</div></div>
        </div>
    `;

    await crLoadData();
}

function crSwitchPeriod(period) {
    _cr.period = period;
    // Reset dateStr to current period
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    if (period === 'month') {
        _cr.dateStr = `${yr}-${String(mo).padStart(2, '0')}`;
    } else if (period === 'quarter') {
        const q = Math.ceil(mo / 3);
        _cr.dateStr = `${yr}-Q${q}`;
    } else {
        _cr.dateStr = `${yr}`;
    }
    // Re-render tabs
    document.querySelectorAll('.cr-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.cr-tab[onclick="crSwitchPeriod('${period}')"]`).classList.add('active');
    crLoadData();
}

function crNavPrev() {
    if (_cr.period === 'month') {
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
    if (_cr.period === 'month') {
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
    const groupsEl = document.getElementById('crGroups');
    if (groupsEl) groupsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải dữ liệu...</div>';

    try {
        const data = await apiCall(`/api/reports/customer-retention?period=${_cr.period}&date=${_cr.dateStr}`);
        _cr.data = data;
        crRenderCards(data);
        crRenderGroups(data);
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
            <div class="cr-card-label">Khách Mới</div>
            ${crTrendHTML(t.new)}
        </div>
        <div class="cr-card returning">
            <div class="cr-card-value">${c.returning || 0}</div>
            <div class="cr-card-label">Khách Cũ Quay Lại</div>
            ${crTrendHTML(t.returning)}
        </div>
        <div class="cr-card rate">
            <div class="cr-card-value">${c.rate || 0}%</div>
            <div class="cr-card-label">Tỷ Lệ KH Cũ Quay Lại</div>
            ${crTrendHTML(t.rate, '%')}
        </div>
    `;
}

function crRenderGroups(data) {
    const el = document.getElementById('crGroups');
    if (!data.groups || data.groups.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">📭 Chưa có dữ liệu trong kỳ này</div>';
        return;
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

    let html = '';
    data.groups.forEach((group, gi) => {
        const mgrExpanded = _cr.expandedMgr.has(gi);
        const mc = group.current || {};

        html += `<div class="cr-group">`;
        html += `<div class="cr-group-header cr-mgr-header" onclick="crToggleMgr(${gi})">
            <div class="cr-mgr-name">
                <span class="cr-arrow ${mgrExpanded ? 'open' : ''}">▶</span>
                👔 ${group.name || 'Chưa phân Quản Lý'}
            </div>
            <div class="cr-mgr-stats">
                <span class="cr-stat-pill" style="background:#1e1b4b;color:white;">${mc.total || 0} đơn</span>
                <span class="cr-stat-pill" style="background:#047857;color:white;">${mc.new || 0} mới</span>
                <span class="cr-stat-pill" style="background:#c2410c;color:white;">${mc.returning || 0} cũ</span>
                <span class="cr-stat-pill" style="background:#7c3aed;color:white;">${mc.rate || 0}%</span>
                ${crTrendMini(group.trend?.rate)}
            </div>
        </div>`;

        if (mgrExpanded && group.teams) {
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
                        <div class="cr-mgr-stats">
                            <span class="cr-stat-pill" style="background:#e0e7ff;color:#3730a3;">${tc.total || 0}</span>
                            <span class="cr-stat-pill" style="background:#d1fae5;color:#065f46;">${tc.new || 0} mới</span>
                            <span class="cr-stat-pill" style="background:#ffedd5;color:#9a3412;">${tc.returning || 0} cũ</span>
                            <span class="cr-stat-pill" style="background:#ede9fe;color:#5b21b6;">${tc.rate || 0}%</span>
                            ${crTrendMini(team.trend?.rate)}
                        </div>
                    </div>`;

                if (teamExpanded && team.employees) {
                    team.employees.forEach(emp => {
                        const ec = emp.current || {};
                        const et = { rate: Math.round(10 * ((ec.rate || 0) - (emp.previous?.rate || 0))) / 10 };
                        const isTop = emp.user_id === topEmpId && topRate > 0;
                        const roleBadge = emp.role === 'truong_phong' ? '<span class="cr-role-badge cr-role-tp">TP</span>' :
                            emp.role === 'thu_viec' ? '<span class="cr-role-badge cr-role-tv">TV</span>' :
                            '<span class="cr-role-badge cr-role-nv">NV</span>';

                        html += `<div class="cr-emp" ${isTop ? 'style="background:linear-gradient(90deg,#fffbeb,#fef3c7);border-left:3px solid #f59e0b;"' : ''}>
                            <div class="cr-emp-name">
                                ${isTop ? '<span class="cr-top-badge">✨ TOP</span>' : ''}
                                ${roleBadge}
                                ${emp.name}
                            </div>
                            <div class="cr-emp-stats">
                                <span style="font-size:12px;font-weight:700;color:#1e1b4b;">${ec.total || 0}</span>
                                <span style="font-size:11px;color:#059669;">${ec.new || 0} mới</span>
                                <span style="font-size:11px;color:#c2410c;">${ec.returning || 0} cũ</span>
                                <div class="cr-progress-wrap">
                                    <div class="cr-progress-bar" style="width:${Math.min(ec.rate || 0, 100)}%;background:${crProgressColor(ec.rate || 0)};"></div>
                                </div>
                                <span style="font-size:12px;font-weight:800;color:#7c3aed;">${ec.rate || 0}%</span>
                                ${crTrendMini(et.rate)}
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
