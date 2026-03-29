// ========== LỊCH KHÓA BIỂU CÔNG VIỆC ==========
const _KB_COLORS = [
    { bg:'#eff6ff', border:'#bfdbfe', badge:'#1d4ed8', text:'#1e3a5f', tag:'#dbeafe' },
    { bg:'#ecfdf5', border:'#a7f3d0', badge:'#059669', text:'#064e3b', tag:'#d1fae5' },
    { bg:'#fffbeb', border:'#fde68a', badge:'#d97706', text:'#78350f', tag:'#fef3c7' },
    { bg:'#f5f3ff', border:'#c4b5fd', badge:'#7c3aed', text:'#4c1d95', tag:'#ede9fe' },
    { bg:'#fff1f2', border:'#fecdd3', badge:'#e11d48', text:'#881337', tag:'#ffe4e6' },
    { bg:'#f0fdfa', border:'#99f6e4', badge:'#0d9488', text:'#134e4a', tag:'#ccfbf1' },
    { bg:'#fff7ed', border:'#fed7aa', badge:'#ea580c', text:'#7c2d12', tag:'#ffedd5' },
    { bg:'#eef2ff', border:'#a5b4fc', badge:'#4f46e5', text:'#312e81', tag:'#e0e7ff' },
    { bg:'#fdf2f8', border:'#f9a8d4', badge:'#db2777', text:'#831843', tag:'#fce7f3' },
    { bg:'#ecfeff', border:'#a5f3fc', badge:'#0891b2', text:'#164e63', tag:'#cffafe' },
];
let _kbTasks = [], _kbReports = {}, _kbSummary = {}, _kbHolidayMap = {};
let _kbMonthlySummary = 0; // total approved points this month
let _kbMonthlyHolidays = []; // holidays in the month
let _kbWeekStart = null;
let _kbViewUserId = null; // null = self
let _kbColorMap = {};
const _KB_DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

function _kbParseJSON(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch(e) { return []; }
}

function _kbGetColor(name) {
    if (!_kbColorMap[name]) {
        const idx = Object.keys(_kbColorMap).length % _KB_COLORS.length;
        _kbColorMap[name] = _KB_COLORS[idx];
    }
    return _kbColorMap[name];
}

// View report detail modal
function _kbViewReport(el) {
    const data = JSON.parse(el.getAttribute('data-report').replace(/&quot;/g, '"'));
    const statusMap = {
        approved: { label: '✅ Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
        pending: { label: '⏳ Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
        rejected: { label: '❌ Bị từ chối', color: '#dc2626', bg: '#fecaca' }
    };
    const s = statusMap[data.status] || statusMap.pending;

    let detailHtml = `
        <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:20px;font-weight:800;color:#1e293b;">${data.task_name}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">📅 ${data.report_date}</div>
        </div>
        <div style="background:${s.bg};border-radius:10px;padding:12px;text-align:center;margin-bottom:14px;">
            <span style="font-size:16px;font-weight:800;color:${s.color};">${s.label}</span>
            ${data.points_earned ? `<span style="margin-left:8px;font-size:14px;font-weight:700;color:${s.color};">+${data.points_earned}đ</span>` : ''}
        </div>`;

    if (data.quantity) {
        detailHtml += `<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#64748b;">📊 Số lượng</span>
            <span style="font-size:14px;font-weight:700;color:#1e293b;">${data.quantity}</span>
        </div>`;
    }
    if (data.content) {
        detailHtml += `<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:8px;">
            <div style="font-size:11px;color:#64748b;margin-bottom:4px;">📝 Nội dung</div>
            <div style="font-size:13px;color:#1e293b;">${data.content}</div>
        </div>`;
    }
    if (data.report_value) {
        detailHtml += `<div style="padding:8px 12px;background:#eff6ff;border-radius:8px;margin-bottom:8px;">
            <a href="${data.report_value}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:600;">🔗 Xem link báo cáo →</a>
        </div>`;
    }
    if (data.report_image) {
        detailHtml += `<div style="text-align:center;margin-top:8px;">
            <img src="${data.report_image}" style="max-width:100%;max-height:300px;border-radius:10px;border:1px solid #e5e7eb;cursor:pointer;" onclick="window.open('${data.report_image}','_blank')">
        </div>`;
    }

    // Remove old modal
    let modal = document.getElementById('kbReportViewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbReportViewModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;';
    modal.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;width:420px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);position:relative;">
        <button onclick="document.getElementById('kbReportViewModal').remove()" style="position:absolute;top:12px;right:14px;border:none;background:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">✕</button>
        ${detailHtml}
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

function _kbFmtDate(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }
function _kbDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

async function renderLichKhoaBieuPage(container) {
    _kbWeekStart = null;
    _kbViewUserId = null;
    _kbColorMap = {};

    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser.role);

    let membersHtml = '';
    if (isManager) {
        try {
            const m = await apiCall('/api/schedule/team-members');
            const members = m.members || [];
            // Group by dept
            const byDept = {};
            members.forEach(u => {
                const dn = u.dept_name || 'Không phòng ban';
                if (!byDept[dn]) byDept[dn] = [];
                byDept[dn].push(u);
            });

            membersHtml = `
            <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;width:200px;min-width:200px;overflow-y:auto;max-height:calc(100vh - 140px);">
                <div style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:700;font-size:11px;color:#6b7280;text-transform:uppercase;background:#f8fafc;border-radius:10px 10px 0 0;">NHÂN VIÊN</div>
                <div id="kbMemberList">
                    <div class="kb-member-item kb-active" data-uid="" onclick="_kbSelectMember(null)" style="padding:10px 14px;font-size:13px;color:#122546;cursor:pointer;border-bottom:1px solid #f9fafb;border-left:3px solid #2563eb;background:#eff6ff;font-weight:600;">
                        👤 Lịch của tôi
                    </div>
                    ${Object.entries(byDept).map(([dept, users]) => `
                        <div style="padding:6px 14px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #f3f4f6;">${dept}</div>
                        ${users.map(u => `
                            <div class="kb-member-item" data-uid="${u.id}" onclick="_kbSelectMember(${u.id})" style="padding:8px 14px;font-size:12px;color:#374151;cursor:pointer;border-bottom:1px solid #f9fafb;transition:all .15s;border-left:3px solid transparent;"
                                onmouseover="if(!this.classList.contains('kb-active'))this.style.background='#f9fafb'"
                                onmouseout="if(!this.classList.contains('kb-active'))this.style.background='white'">
                                ${u.full_name} <span style="color:#9ca3af;font-size:10px;">(${u.role})</span>
                            </div>
                        `).join('')}
                    `).join('')}
                </div>
            </div>`;
        } catch(e) {}
    }

    container.innerHTML = `
    <div style="max-width:1500px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">📋 Lịch Khóa Biểu Công Việc</h2>
            <div id="kbViewingLabel" style="font-size:13px;color:#6b7280;"></div>
        </div>
        <div style="display:flex;gap:16px;">
            ${membersHtml}
            <div style="flex:1;">
                <div id="kbStatsBar" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;"></div>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">⚠️</span>
                    <span style="font-size:12px;color:#92400e;font-weight:500;">Mỗi ngày tối đa <strong>100 điểm</strong>. Nếu tổng điểm CV trong ngày vượt 100đ, hệ thống chỉ tính tối đa 100đ cho ngày đó.</span>
                </div>
                <div id="kbGridWrap" style="background:white;border:1px solid #e5e7eb;border-radius:10px;overflow-x:auto;">
                    <div style="text-align:center;padding:40px;color:#9ca3af;">Đang tải...</div>
                </div>
            </div>
        </div>
    </div>`;

    _kbLoadSchedule();
}

function _kbSelectMember(userId) {
    _kbViewUserId = userId;
    _kbWeekStart = null;
    _kbColorMap = {};
    // Highlight
    document.querySelectorAll('.kb-member-item').forEach(el => {
        const isActive = (el.dataset.uid === '' && userId === null) || (el.dataset.uid == userId);
        el.classList.toggle('kb-active', isActive);
        el.style.background = isActive ? '#eff6ff' : 'white';
        el.style.color = isActive ? '#122546' : '#374151';
        el.style.fontWeight = isActive ? '600' : '400';
        el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid transparent';
    });
    _kbLoadSchedule();
}

async function _kbLoadSchedule() {
    // Init week
    if (!_kbWeekStart) {
        const now = new Date();
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        _kbWeekStart = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
    }

    const monStr = _kbDateStr(_kbWeekStart);
    const sun = new Date(_kbWeekStart); sun.setDate(_kbWeekStart.getDate() + 6);
    const sunStr = _kbDateStr(sun);

    // Load tasks (snapshot-aware)
    try {
        const uid = _kbViewUserId || currentUser.id;
        const d = await apiCall(`/api/schedule/week-tasks?user_id=${uid}&week_start=${monStr}`);
        _kbTasks = d.tasks || [];
    } catch(e) { _kbTasks = []; }

    // Load reports
    try {
        const uid = _kbViewUserId || currentUser.id;
        const r = await apiCall(`/api/schedule/reports?user_id=${uid}&from=${monStr}&to=${sunStr}`);
        _kbReports = {};
        (r.reports || []).forEach(rep => {
            const key = `${rep.template_id}_${rep.report_date.slice(0,10)}`;
            _kbReports[key] = rep;
        });
    } catch(e) { _kbReports = {}; }

    // Load summary
    try {
        const uid = _kbViewUserId || currentUser.id;
        const s = await apiCall(`/api/schedule/summary?user_id=${uid}&from=${monStr}&to=${sunStr}`);
        _kbSummary = {};
        (s.summary || []).forEach(row => { _kbSummary[row.report_date.slice(0,10)] = row; });
    } catch(e) { _kbSummary = {}; }

    // Load holidays
    try {
        const h = await apiCall(`/api/holidays/week?date=${monStr}`);
        _kbHolidayMap = h.holidays || {};
    } catch(e) { _kbHolidayMap = {}; }

    // Load monthly summary + holidays
    const viewMonth = _kbWeekStart.getMonth();
    const viewYear = _kbWeekStart.getFullYear();
    const monthStart = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01`;
    const lastDay = new Date(viewYear, viewMonth+1, 0).getDate();
    const monthEnd = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    try {
        const uid = _kbViewUserId || currentUser.id;
        const ms = await apiCall(`/api/schedule/summary?user_id=${uid}&from=${monthStart}&to=${monthEnd}`);
        _kbMonthlySummary = (ms.summary || []).reduce((s, r) => s + (r.total_points || 0), 0);
    } catch(e) { _kbMonthlySummary = 0; }
    try {
        const mh = await apiCall(`/api/holidays?year=${viewYear}`);
        _kbMonthlyHolidays = (mh.holidays || []).filter(h => {
            const d = new Date(h.holiday_date);
            return d.getMonth() === viewMonth;
        });
    } catch(e) { _kbMonthlyHolidays = []; }

    // Update label
    const lbl = document.getElementById('kbViewingLabel');
    if (lbl) {
        if (_kbViewUserId) {
            const el = document.querySelector(`.kb-member-item[data-uid="${_kbViewUserId}"]`);
            const name = el ? el.textContent.trim().split('(')[0].trim() : 'NV';
            lbl.innerHTML = `<span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:6px;font-weight:600;">👤 Đang xem: ${name}</span>`;
        } else {
            lbl.innerHTML = `<span style="background:#ecfdf5;color:#059669;padding:3px 10px;border-radius:6px;font-weight:600;">📋 Lịch của tôi</span>`;
        }
    }

    _kbRenderStats();
    _kbRenderGrid();
}

function _kbChangeWeek(offset) {
    if (!_kbWeekStart) return;
    const d = new Date(_kbWeekStart);
    d.setDate(d.getDate() + offset * 7);
    _kbWeekStart = d;
    _kbLoadSchedule();
}

// ===== STAT CARDS =====
function _kbRenderStats() {
    const bar = document.getElementById('kbStatsBar');
    if (!bar) return;

    const now = new Date();
    const viewMonth = _kbWeekStart.getMonth();
    const viewYear = _kbWeekStart.getFullYear();
    const lastDay = new Date(viewYear, viewMonth+1, 0).getDate();

    // Count working days (Mon-Sat) minus holidays
    let workingDays = 0;
    const holidayDates = new Set(_kbMonthlyHolidays.map(h => h.holiday_date.slice(0,10)));
    for (let day = 1; day <= lastDay; day++) {
        const d = new Date(viewYear, viewMonth, day);
        const dow = d.getDay(); // 0=Sun, 1=Mon...6=Sat
        if (dow >= 1 && dow <= 6) { // Mon-Sat
            const ds = _kbDateStr(d);
            if (!holidayDates.has(ds)) workingDays++;
        }
    }

    // Today's points (capped at 100)
    const todayStr = _kbDateStr(now);
    const todayEarnedRaw = _kbSummary[todayStr]?.total_points || 0;
    const todayEarned = Math.min(todayEarnedRaw, 100);

    // Week points (Mon-Sun, each day capped at 100)
    let weekEarned = 0;
    const sunDate = new Date(_kbWeekStart); sunDate.setDate(_kbWeekStart.getDate() + 6);
    for (let d = 1; d <= 7; d++) {
        const colDate = new Date(_kbWeekStart); colDate.setDate(_kbWeekStart.getDate() + d - 1);
        const ds = _kbDateStr(colDate);
        if (_kbSummary[ds]) weekEarned += Math.min(_kbSummary[ds].total_points || 0, 100);
    }

    // Month max = days in month × 100
    const monthMax = lastDay * 100;
    const weekMax = 700;
    const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    const card = (icon, label, value, sub, color) => `
        <div style="background:white;border:2px solid ${color};border-radius:10px;padding:14px 16px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">${icon} ${label}</div>
            <div style="font-size:26px;font-weight:800;color:${color};line-height:1;">${value}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${sub}</div>
        </div>`;

    bar.innerHTML = 
        card('📅', 'SỐ NGÀY CÔNG NHẬT', workingDays, `${monthNames[viewMonth]} — T2→T7 trừ lễ`, '#122546') +
        card('⭐', 'ĐIỂM NGÀY', `${todayEarned}/100`, `Hôm nay ${_kbFmtDate(now)}`, '#dc2626') +
        card('📊', 'ĐIỂM TUẦN', `${weekEarned}/${weekMax}`, `T2→CN (${_kbFmtDate(_kbWeekStart)}—${_kbFmtDate(sunDate)})`, '#d97706') +
        card('🏆', 'ĐIỂM TỔNG THÁNG', `${_kbMonthlySummary}/${monthMax}`, `${monthNames[viewMonth]} ${viewYear}`, '#16a34a');
}

function _kbRenderGrid() {
    const wrap = document.getElementById('kbGridWrap');
    if (!wrap) return;

    // Colors
    _kbColorMap = {};
    const uniqueNames = [...new Set(_kbTasks.map(t => t.task_name))];
    uniqueNames.forEach(n => _kbGetColor(n));

    // Group by column (1=Mon..7=Sun) using _date or day_of_week
    const byDay = {};
    for (let d = 1; d <= 7; d++) byDay[d] = [];
    const monDate0 = new Date(_kbWeekStart);
    _kbTasks.forEach(t => {
        let col = t.day_of_week;
        if (t._date) {
            // Calculate column from date
            const td = new Date(t._date + 'T00:00:00');
            const diff = Math.round((td - monDate0) / 86400000);
            col = diff + 1; // 1-based
        }
        if (col >= 1 && col <= 7 && byDay[col]) byDay[col].push(t);
    });

    // Slots
    const allSlots = new Set();
    _kbTasks.forEach(t => allSlots.add(t.time_start + '|' + t.time_end));
    const sortedSlots = [...allSlots].sort();

    // Week dates
    const monDate = new Date(_kbWeekStart);
    const sunDate2 = new Date(monDate); sunDate2.setDate(monDate.getDate() + 6);

    // Calculate earned points per day
    const earnedPerDay = {};
    const totalPerDay = {};
    for (let d = 1; d <= 7; d++) {
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateStr = _kbDateStr(colDate);
        let earned = 0;
        if (_kbSummary[dateStr]) earned = _kbSummary[dateStr].total_points || 0;
        earnedPerDay[d] = _kbHolidayMap[d] ? 0 : earned;
        totalPerDay[d] = _kbHolidayMap[d] ? 0 : (byDay[d]||[]).reduce((s,t) => s + (t.points||0), 0);
    }

    const isSelf = !_kbViewUserId || Number(_kbViewUserId) === currentUser.id;
    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser.role);
    const canReport = isSelf; // Can report own tasks (via 'Lịch của tôi' or own name in sidebar)
    const canApprove = isManager && !isSelf;
    const todayStr = _kbDateStr(new Date()); // For date comparison

    // Week nav
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;border-radius:10px 10px 0 0;">
        <button onclick="_kbChangeWeek(-1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">◀ Tuần trước</button>
        <div style="font-weight:700;color:#122546;font-size:14px;">📅 ${_kbFmtDate(monDate)} — ${_kbFmtDate(sunDate2)}/${monDate.getFullYear()}</div>
        <button onclick="_kbChangeWeek(1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">Tuần sau ▶</button>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header
    html += `<thead><tr>`;
    html += `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:100px;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;">Khung giờ</th>`;
    for (let d = 1; d <= 7; d++) {
        const isH = !!_kbHolidayMap[d];
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateLabel = _kbFmtDate(colDate);
        if (isH) {
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:150px;background:#fef2f2;">
                <div style="font-weight:700;color:#dc2626;font-size:13px;">${_KB_DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:4px;font-size:11px;color:#dc2626;">🏖️ ${_kbHolidayMap[d]}</div>
            </th>`;
        } else {
            const earned = earnedPerDay[d];
            const total = totalPerDay[d];
            const cappedEarned = Math.min(earned, 100);
            const cappedTotal = Math.min(total, 100);
            const pct = cappedTotal > 0 ? Math.min(Math.round(cappedEarned/cappedTotal*100),100) : 0;
            const barColor = cappedEarned >= cappedTotal && cappedTotal > 0 ? '#16a34a' : cappedEarned > 0 ? '#d97706' : '#e5e7eb';
            const overCap = total > 100;
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:150px;background:#f8fafc;">
                <div style="font-weight:700;color:#122546;font-size:13px;">${_KB_DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:6px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .3s;"></div>
                </div>
                <div style="font-size:10px;margin-top:3px;color:${barColor};font-weight:600;">${cappedEarned}/${cappedTotal}đ${overCap ? ' <span style="color:#dc2626;" title="Tổng CV = ' + total + 'đ, chỉ tính tối đa 100đ">(max 100)</span>' : ''}</div>
            </th>`;
        }
    }
    html += `</tr></thead>`;

    // Body
    html += `<tbody>`;
    if (sortedSlots.length === 0) {
        html += `<tr><td colspan="8" style="padding:40px;text-align:center;color:#9ca3af;font-size:14px;">Chưa có lịch công việc. Hãy setup tại <b>Bàn Giao CV Điểm</b> trước.</td></tr>`;
    } else {
        sortedSlots.forEach((slot, idx) => {
            const [tStart, tEnd] = slot.split('|');
            const isLast = idx === sortedSlots.length - 1;
            const borderB = isLast ? 'none' : '1px solid #f3f4f6';
            html += `<tr>`;
            html += `<td style="padding:10px 14px;border-bottom:${borderB};background:#fafbfc;vertical-align:top;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);border-radius:10px;padding:10px 14px;text-align:center;box-shadow:0 2px 8px rgba(18,37,70,0.15);min-width:70px;">
                    <div style="font-weight:800;color:#fff;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${tStart}</div>
                    <div style="margin:4px auto;width:20px;height:1px;background:rgba(255,255,255,0.3);"></div>
                    <div style="font-weight:800;color:#FFC107;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${tEnd}</div>
                </div>
            </td>`;
            for (let d = 1; d <= 7; d++) {
                if (_kbHolidayMap[d]) {
                    html += `<td style="padding:8px;border-bottom:${borderB};background:#fef2f2;text-align:center;"><div style="color:#fca5a5;font-size:18px;">🏖️</div></td>`;
                    continue;
                }
                const task = byDay[d].find(t => t.time_start + '|' + t.time_end === slot);
                if (!task) {
                    html += `<td style="padding:8px;border-bottom:${borderB};text-align:center;color:#d1d5db;font-size:20px;">—</td>`;
                    continue;
                }

                const c = _kbGetColor(task.task_name);
                const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
                const dateStr = _kbDateStr(colDate);
                const reportTemplateId = task._source === 'snapshot' ? task.template_id : task.id;
                const reportKey = `${reportTemplateId}_${dateStr}`;
                const report = _kbReports[reportKey];

                let statusBadge = '';
                let actionBtn = ''; // inline with guide button row
                if (report) {
                    // HAS REPORT — make it clickable to view details
                    const rData = JSON.stringify({
                        task_name: task.task_name, status: report.status, points_earned: report.points_earned,
                        quantity: report.quantity, report_value: report.report_value || '', report_image: report.report_image || '',
                        report_date: dateStr, content: report.content || ''
                    }).replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    if (report.status === 'approved') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#dcfce7;color:#16a34a;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #86efac;transition:all .15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">✅ +${report.points_earned}đ</span>`;
                    } else if (report.status === 'pending') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #fde68a;">⏳ Chờ duyệt</span>`;
                        if (canApprove) {
                            statusBadge = `<div style="margin-top:4px;display:flex;gap:4px;justify-content:center;">
                                <button onclick="_kbApprove(${report.id},'approve')" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#16a34a;color:white;cursor:pointer;">✅ Duyệt</button>
                                <button onclick="_kbApprove(${report.id},'reject')" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#dc2626;color:white;cursor:pointer;">❌ Từ chối</button>
                            </div>`;
                        }
                    } else if (report.status === 'rejected') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">❌ Từ chối</span>`;
                    }
                } else if (canReport) {
                    if (dateStr === todayStr) {
                        actionBtn = `<button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}')" style="padding:3px 10px;font-size:10px;border:1px dashed ${c.badge};border-radius:4px;background:${c.tag};color:${c.badge};cursor:pointer;font-weight:600;line-height:1;display:inline-flex;align-items:center;">📝 Báo cáo</button>`;
                    } else if (dateStr < todayStr) {
                        actionBtn = `<span style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">🚫 Bỏ lỡ</span>`;
                    } else {
                        actionBtn = `<span style="background:#f3f4f6;color:#9ca3af;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #e5e7eb;">🔒 Sắp tới</span>`;
                    }
                } else {
                    if (dateStr < todayStr) {
                        actionBtn = `<span style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">🚫 Bỏ lỡ</span>`;
                    } else if (dateStr === todayStr) {
                        actionBtn = `<span style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:4px;font-size:10px;line-height:1;display:inline-flex;align-items:center;">⏳ Chưa nộp</span>`;
                    } else {
                        actionBtn = `<span style="background:#f3f4f6;color:#9ca3af;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #e5e7eb;">🔒 Sắp tới</span>`;
                    }
                }

                const inputReqs = _kbParseJSON(task.input_requirements);
                const outputReqs = _kbParseJSON(task.output_requirements);
                const reqsHtml = (inputReqs.length || outputReqs.length) ? `
                    <div style="text-align:left;margin-top:6px;padding-top:5px;border-top:1px dashed ${c.border};font-size:10px;">
                        ${inputReqs.length ? `<div style="color:#2563eb;font-weight:600;margin-bottom:2px;">📥 Đầu vào:</div>
                            ${inputReqs.map((r,i) => `<div style="color:#374151;padding-left:8px;">${i+1}. ${r}</div>`).join('')}` : ''}
                        ${outputReqs.length ? `<div style="color:#059669;font-weight:600;margin-top:3px;margin-bottom:2px;">📤 Đầu ra:</div>
                            ${outputReqs.map((r,i) => `<div style="color:#374151;padding-left:8px;">${i+1}. ${r}</div>`).join('')}` : ''}
                    </div>` : '';

                html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                    <div style="background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;padding:10px 12px;text-align:center;">
                        <div style="font-weight:700;color:${c.text};font-size:13px;margin-bottom:4px;">${task.task_name}</div>
                        <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
                            <span style="background:${c.badge};color:white;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;">${task.points}đ</span>
                        </div>
                        <div style="font-size:9px;color:#9ca3af;margin-top:3px;">🕐 ${tStart} — ${tEnd}</div>
                        ${reqsHtml}
                        <div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:6px;">
                            ${task.guide_url ? `<a href="${task.guide_url}" target="_blank" style="font-size:10px;color:${c.badge};text-decoration:none;background:${c.tag};padding:3px 6px;border-radius:4px;line-height:1;display:inline-flex;align-items:center;">📘 Hướng dẫn</a>` : ''}
                            ${actionBtn}
                        </div>
                        ${statusBadge}
                    </div>
                </td>`;
            }
            html += `</tr>`;
        });
    }
    html += `</tbody></table>`;

    wrap.innerHTML = html;
}

// Report modal — full redesign
let _kbPastedFile = null;

function _kbShowReportModal(templateId, reportDate) {
    const task = _kbTasks.find(t => {
        const tid = t._source === 'snapshot' ? t.template_id : t.id;
        return tid === templateId;
    });
    const taskName = task ? task.task_name : 'Công việc';
    const taskPoints = task ? task.points : 0;
    const needsApproval = task ? task.requires_approval : false;
    const minQty = task ? (task.min_quantity || 1) : 1;
    _kbPastedFile = null;

    const approvalWarn = needsApproval ? `
        <div style="padding:10px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">🔒</span>
            <div style="font-size:12px;color:#78350f;font-weight:600;">Công việc này cần Quản lý/TP duyệt mới được tính điểm</div>
        </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'kbReportModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(520px,92vw);max-height:90vh;overflow-y:auto;border:1px solid #e5e7eb;box-shadow:0 25px 60px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:18px 22px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:17px;color:white;font-weight:700;">📝 Báo cáo công việc</h3>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">Nộp kết quả hoàn thành</div>
            </div>
            <button onclick="document.getElementById('kbReportModal').remove()" style="background:rgba(255,255,255,0.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:20px 22px;">
            ${approvalWarn}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📋 Tên công việc</div>
                    <div style="font-size:14px;font-weight:700;color:#122546;">${taskName}</div>
                </div>
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📅 Ngày báo cáo</div>
                    <div style="font-size:14px;font-weight:700;color:#122546;">${reportDate.split('-').reverse().join('/')}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <div style="padding:10px 12px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
                    <div style="font-size:10px;color:#059669;text-transform:uppercase;font-weight:600;margin-bottom:4px;">⭐ Điểm thưởng</div>
                    <div style="font-size:18px;font-weight:800;color:#059669;">${taskPoints}đ</div>
                </div>
                <div>
                    <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">📊 Số lượng hoàn thành <span style="color:#dc2626;">*</span></label>
                    <input id="kbRptQty" type="number" min="0" value="${minQty}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;font-weight:700;color:#122546;box-sizing:border-box;text-align:center;">
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">📄 Nội dung hoàn thành</label>
                <textarea id="kbRptContent" rows="2" placeholder="Mô tả công việc đã làm..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">🔗 Link báo cáo kết quả</label>
                <input id="kbRptLink" type="url" placeholder="https://docs.google.com/... hoặc link TikTok..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:6px;">🖼️ Hình ảnh báo cáo <span style="font-weight:400;color:#9ca3af;">(Ctrl+V để dán ảnh)</span></label>
                <div id="kbPasteZone" tabindex="0" style="border:2px dashed #d1d5db;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#fafbfc;transition:all .2s;min-height:60px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                    <div style="font-size:28px;margin-bottom:6px;opacity:.5;">📋</div>
                    <div style="font-size:12px;color:#9ca3af;">Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>
                </div>
                <div id="kbPastePreview" style="display:none;margin-top:8px;position:relative;">
                    <img id="kbPasteImg" style="max-width:100%;max-height:150px;border-radius:6px;border:1px solid #e5e7eb;">
                    <button onclick="_kbRemovePaste()" style="position:absolute;top:4px;right:4px;background:#dc2626;color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:14px;cursor:pointer;">×</button>
                </div>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:14px;background:#f9fafb;padding:8px 10px;border-radius:6px;border:1px solid #f3f4f6;">
                💡 <b>Lưu ý:</b> Bắt buộc phải có ít nhất <b>link</b> hoặc <b>hình ảnh</b> để nộp báo cáo.
            </div>
            <input type="hidden" id="kbRptTemplateId" value="${templateId}">
            <input type="hidden" id="kbRptDate" value="${reportDate}">
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #f3f4f6;">
                <button onclick="document.getElementById('kbReportModal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_kbSubmitReport()" style="padding:9px 24px;border-radius:8px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(22,163,74,0.3);">📤 Nộp báo cáo</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    // Paste listener on zone
    const zone = document.getElementById('kbPasteZone');
    zone.addEventListener('paste', _kbHandlePaste);
    setTimeout(() => zone.focus(), 100);
}

function _kbHandlePaste(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            _kbPastedFile = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('kbPasteImg').src = ev.target.result;
                document.getElementById('kbPastePreview').style.display = 'block';
                const z = document.getElementById('kbPasteZone');
                z.innerHTML = '<div style="font-size:14px;color:#16a34a;font-weight:600;">✅ Đã dán ảnh thành công!</div>';
                z.style.borderColor = '#16a34a';
                z.style.background = '#f0fdf4';
            };
            reader.readAsDataURL(_kbPastedFile);
            break;
        }
    }
}

function _kbRemovePaste() {
    _kbPastedFile = null;
    document.getElementById('kbPastePreview').style.display = 'none';
    const z = document.getElementById('kbPasteZone');
    z.innerHTML = '<div style="font-size:28px;margin-bottom:6px;opacity:.5;">📋</div><div style="font-size:12px;color:#9ca3af;">Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>';
    z.style.borderColor = '#d1d5db';
    z.style.background = '#fafbfc';
}

async function _kbSubmitReport() {
    const templateId = document.getElementById('kbRptTemplateId')?.value;
    const reportDate = document.getElementById('kbRptDate')?.value;
    const link = document.getElementById('kbRptLink')?.value?.trim();
    const qty = document.getElementById('kbRptQty')?.value || '0';
    const content = document.getElementById('kbRptContent')?.value?.trim();

    if (!link && !_kbPastedFile) {
        showToast('Phải có ít nhất link hoặc hình ảnh!', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('template_id', templateId);
        formData.append('report_date', reportDate);
        formData.append('quantity', qty);
        if (content) formData.append('content', content);
        if (link) formData.append('report_value', link);
        if (_kbPastedFile) formData.append('report_image', _kbPastedFile, 'paste.png');

        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        const resp = await fetch('/api/schedule/report', {
            method: 'POST',
            body: formData,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await resp.json();
        if (data.success) {
            showToast(`✅ Đã nộp báo cáo! ${data.status === 'pending' ? '⏳ Chờ duyệt' : '+' + data.points_earned + 'đ'}`);
            document.getElementById('kbReportModal')?.remove();
            _kbLoadSchedule();
        } else {
            showToast('Lỗi: ' + (data.error || 'Unknown'), 'error');
        }
    } catch(e) { showToast('Lỗi gửi báo cáo!', 'error'); }
}

async function _kbApprove(reportId, action) {
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action });
        showToast(action === 'approve' ? '✅ Đã duyệt!' : '❌ Đã từ chối!');
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi!', 'error'); }
}
