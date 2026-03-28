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
let _kbWeekStart = null;
let _kbViewUserId = null; // null = self
let _kbColorMap = {};
const _KB_DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function _kbGetColor(name) {
    if (!_kbColorMap[name]) {
        const idx = Object.keys(_kbColorMap).length % _KB_COLORS.length;
        _kbColorMap[name] = _KB_COLORS[idx];
    }
    return _kbColorMap[name];
}

function _kbFmtDate(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }
function _kbDateStr(d) { return d.toISOString().slice(0,10); }

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
            <div id="kbGridWrap" style="flex:1;background:white;border:1px solid #e5e7eb;border-radius:10px;overflow-x:auto;">
                <div style="text-align:center;padding:40px;color:#9ca3af;">Đang tải...</div>
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
    const sat = new Date(_kbWeekStart); sat.setDate(_kbWeekStart.getDate() + 5);
    const satStr = _kbDateStr(sat);

    // Load tasks
    try {
        if (_kbViewUserId) {
            const d = await apiCall(`/api/schedule/user-tasks?user_id=${_kbViewUserId}`);
            _kbTasks = d.tasks || [];
        } else {
            const d = await apiCall('/api/schedule/my-tasks');
            _kbTasks = d.tasks || [];
        }
    } catch(e) { _kbTasks = []; }

    // Load reports
    try {
        const uid = _kbViewUserId || currentUser.id;
        const r = await apiCall(`/api/schedule/reports?user_id=${uid}&from=${monStr}&to=${satStr}`);
        _kbReports = {};
        (r.reports || []).forEach(rep => {
            const key = `${rep.template_id}_${rep.report_date.slice(0,10)}`;
            _kbReports[key] = rep;
        });
    } catch(e) { _kbReports = {}; }

    // Load summary
    try {
        const uid = _kbViewUserId || currentUser.id;
        const s = await apiCall(`/api/schedule/summary?user_id=${uid}&from=${monStr}&to=${satStr}`);
        _kbSummary = {};
        (s.summary || []).forEach(row => { _kbSummary[row.report_date.slice(0,10)] = row; });
    } catch(e) { _kbSummary = {}; }

    // Load holidays
    try {
        const h = await apiCall(`/api/holidays/week?date=${monStr}`);
        _kbHolidayMap = h.holidays || {};
    } catch(e) { _kbHolidayMap = {}; }

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

    _kbRenderGrid();
}

function _kbChangeWeek(offset) {
    if (!_kbWeekStart) return;
    const d = new Date(_kbWeekStart);
    d.setDate(d.getDate() + offset * 7);
    _kbWeekStart = d;
    _kbLoadSchedule();
}

function _kbRenderGrid() {
    const wrap = document.getElementById('kbGridWrap');
    if (!wrap) return;

    // Colors
    _kbColorMap = {};
    const uniqueNames = [...new Set(_kbTasks.map(t => t.task_name))];
    uniqueNames.forEach(n => _kbGetColor(n));

    // Group by day
    const byDay = {};
    for (let d = 1; d <= 6; d++) byDay[d] = [];
    _kbTasks.forEach(t => { if (byDay[t.day_of_week]) byDay[t.day_of_week].push(t); });

    // Slots
    const allSlots = new Set();
    _kbTasks.forEach(t => allSlots.add(t.time_start + '|' + t.time_end));
    const sortedSlots = [...allSlots].sort();

    // Week dates
    const monDate = new Date(_kbWeekStart);
    const satDate = new Date(monDate); satDate.setDate(monDate.getDate() + 5);

    // Calculate earned points per day
    const earnedPerDay = {};
    const totalPerDay = {};
    for (let d = 1; d <= 6; d++) {
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateStr = _kbDateStr(colDate);
        let earned = 0;
        if (_kbSummary[dateStr]) earned = _kbSummary[dateStr].total_points || 0;
        earnedPerDay[d] = _kbHolidayMap[d] ? 0 : earned;
        totalPerDay[d] = _kbHolidayMap[d] ? 0 : byDay[d].reduce((s,t) => s + (t.points||0), 0);
    }

    const isSelf = !_kbViewUserId;
    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser.role);
    const canReport = isSelf; // NV only reports own tasks
    const canApprove = isManager && !isSelf;

    // Week nav
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;border-radius:10px 10px 0 0;">
        <button onclick="_kbChangeWeek(-1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">◀ Tuần trước</button>
        <div style="font-weight:700;color:#122546;font-size:14px;">📅 ${_kbFmtDate(monDate)} — ${_kbFmtDate(satDate)}/${monDate.getFullYear()}</div>
        <button onclick="_kbChangeWeek(1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">Tuần sau ▶</button>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header
    html += `<thead><tr>`;
    html += `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:100px;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;">Khung giờ</th>`;
    for (let d = 1; d <= 6; d++) {
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
            const pct = total > 0 ? Math.min(Math.round(earned/total*100),100) : 0;
            const barColor = earned >= total && total > 0 ? '#16a34a' : earned > 0 ? '#d97706' : '#e5e7eb';
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:150px;background:#f8fafc;">
                <div style="font-weight:700;color:#122546;font-size:13px;">${_KB_DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:6px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .3s;"></div>
                </div>
                <div style="font-size:10px;margin-top:3px;color:${barColor};font-weight:600;">${earned}/${total}đ</div>
            </th>`;
        }
    }
    html += `</tr></thead>`;

    // Body
    html += `<tbody>`;
    if (sortedSlots.length === 0) {
        html += `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9ca3af;font-size:14px;">Chưa có lịch công việc. Hãy setup tại <b>Bàn Giao CV Điểm</b> trước.</td></tr>`;
    } else {
        sortedSlots.forEach((slot, idx) => {
            const [tStart, tEnd] = slot.split('|');
            const isLast = idx === sortedSlots.length - 1;
            const borderB = isLast ? 'none' : '1px solid #f3f4f6';
            html += `<tr>`;
            html += `<td style="padding:10px 14px;border-bottom:${borderB};background:#fafbfc;vertical-align:top;">
                <div style="font-weight:700;color:#122546;font-size:14px;">${tStart}</div>
                <div style="color:#9ca3af;font-size:11px;margin-top:1px;">→ ${tEnd}</div>
            </td>`;
            for (let d = 1; d <= 6; d++) {
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
                const reportKey = `${task.id}_${dateStr}`;
                const report = _kbReports[reportKey];

                let statusBadge = '';
                let reportBtn = '';
                if (report) {
                    if (report.status === 'approved') {
                        statusBadge = `<div style="margin-top:6px;"><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">✅ Đã nộp +${report.points_earned}đ</span></div>`;
                    } else if (report.status === 'pending') {
                        statusBadge = `<div style="margin-top:6px;"><span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">⏳ Chờ duyệt</span></div>`;
                        if (canApprove) {
                            statusBadge += `<div style="margin-top:4px;display:flex;gap:4px;justify-content:center;">
                                <button onclick="_kbApprove(${report.id},'approve')" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#16a34a;color:white;cursor:pointer;">✅ Duyệt</button>
                                <button onclick="_kbApprove(${report.id},'reject')" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#dc2626;color:white;cursor:pointer;">❌ Từ chối</button>
                            </div>`;
                        }
                    } else if (report.status === 'rejected') {
                        statusBadge = `<div style="margin-top:6px;"><span style="background:#fecaca;color:#dc2626;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">❌ Bị từ chối</span></div>`;
                    }
                    // View report
                    if (report.report_type === 'image') {
                        statusBadge += `<div style="margin-top:4px;"><a href="${report.report_value}" target="_blank" style="font-size:10px;color:#2563eb;">🖼️ Xem ảnh</a></div>`;
                    } else {
                        statusBadge += `<div style="margin-top:4px;"><a href="${report.report_value}" target="_blank" style="font-size:10px;color:#2563eb;">🔗 Xem link</a></div>`;
                    }
                } else if (canReport) {
                    reportBtn = `<button onclick="_kbShowReportModal(${task.id},'${dateStr}')" style="margin-top:6px;padding:3px 10px;font-size:11px;border:1px dashed ${c.badge};border-radius:5px;background:${c.tag};color:${c.badge};cursor:pointer;font-weight:600;">📝 Báo cáo</button>`;
                } else {
                    statusBadge = `<div style="margin-top:6px;"><span style="background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:6px;font-size:10px;">❌ Chưa nộp</span></div>`;
                }

                html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                    <div style="background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;padding:10px 12px;text-align:center;">
                        <div style="font-weight:700;color:${c.text};font-size:13px;margin-bottom:4px;">${task.task_name}</div>
                        <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
                            <span style="background:${c.badge};color:white;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;">${task.points}đ</span>
                            ${task.requires_approval ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;">🔒 Duyệt</span>' : ''}
                        </div>
                        <div style="font-size:9px;color:#9ca3af;margin-top:3px;">🕐 ${tStart} — ${tEnd}</div>
                        <div style="display:flex;gap:4px;justify-content:center;margin-top:4px;">
                            ${task.guide_url ? `<a href="${task.guide_url}" target="_blank" style="font-size:10px;color:${c.badge};text-decoration:none;background:${c.tag};padding:2px 6px;border-radius:4px;">📘 Hướng dẫn</a>` : ''}
                            ${reportBtn}
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

// Report modal
function _kbShowReportModal(templateId, reportDate) {
    const modal = document.createElement('div');
    modal.id = 'kbReportModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;width:min(440px,90vw);border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:16px;color:#122546;">📝 Báo cáo công việc</h3>
            <button onclick="document.getElementById('kbReportModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Loại báo cáo</label>
            <div style="display:flex;gap:8px;margin-top:6px;">
                <button id="kbTypeLink" onclick="_kbSwitchType('link')" style="flex:1;padding:8px;border:2px solid #2563eb;border-radius:6px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:600;font-size:13px;">🔗 Link</button>
                <button id="kbTypeImage" onclick="_kbSwitchType('image')" style="flex:1;padding:8px;border:2px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-weight:600;font-size:13px;">🖼️ Hình ảnh</button>
            </div>
        </div>
        <div id="kbInputLink" style="margin-bottom:14px;">
            <label style="font-size:12px;color:#6b7280;">URL báo cáo</label>
            <input id="kbReportLink" type="url" placeholder="https://..." style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;margin-top:4px;">
        </div>
        <div id="kbInputImage" style="margin-bottom:14px;display:none;">
            <label style="font-size:12px;color:#6b7280;">Chọn hình ảnh</label>
            <input id="kbReportFile" type="file" accept="image/*" style="width:100%;padding:8px;border:1px dashed #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;margin-top:4px;background:#f9fafb;">
        </div>
        <input type="hidden" id="kbReportTemplateId" value="${templateId}">
        <input type="hidden" id="kbReportDate" value="${reportDate}">
        <input type="hidden" id="kbReportType" value="link">
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button onclick="document.getElementById('kbReportModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_kbSubmitReport()" style="padding:8px 20px;border-radius:6px;border:none;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600;">📤 Nộp báo cáo</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

function _kbSwitchType(type) {
    document.getElementById('kbReportType').value = type;
    document.getElementById('kbInputLink').style.display = type === 'link' ? 'block' : 'none';
    document.getElementById('kbInputImage').style.display = type === 'image' ? 'block' : 'none';
    document.getElementById('kbTypeLink').style.borderColor = type === 'link' ? '#2563eb' : '#d1d5db';
    document.getElementById('kbTypeLink').style.background = type === 'link' ? '#eff6ff' : 'white';
    document.getElementById('kbTypeLink').style.color = type === 'link' ? '#2563eb' : '#374151';
    document.getElementById('kbTypeImage').style.borderColor = type === 'image' ? '#2563eb' : '#d1d5db';
    document.getElementById('kbTypeImage').style.background = type === 'image' ? '#eff6ff' : 'white';
    document.getElementById('kbTypeImage').style.color = type === 'image' ? '#2563eb' : '#374151';
}

async function _kbSubmitReport() {
    const templateId = document.getElementById('kbReportTemplateId')?.value;
    const reportDate = document.getElementById('kbReportDate')?.value;
    const reportType = document.getElementById('kbReportType')?.value;

    if (reportType === 'link') {
        const link = document.getElementById('kbReportLink')?.value?.trim();
        if (!link) { showToast('Nhập link báo cáo!', 'error'); return; }
        try {
            await apiCall('/api/schedule/report', 'POST', { template_id: Number(templateId), report_date: reportDate, report_value: link });
            showToast('✅ Đã nộp báo cáo!');
            document.getElementById('kbReportModal')?.remove();
            _kbLoadSchedule();
        } catch(e) { showToast('Lỗi!', 'error'); }
    } else {
        const file = document.getElementById('kbReportFile')?.files?.[0];
        if (!file) { showToast('Chọn hình ảnh!', 'error'); return; }
        const formData = new FormData();
        formData.append('template_id', templateId);
        formData.append('report_date', reportDate);
        formData.append('file', file);
        try {
            const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
            const resp = await fetch('/api/schedule/report', {
                method: 'POST',
                body: formData,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await resp.json();
            if (data.success) {
                showToast('✅ Đã nộp báo cáo!');
                document.getElementById('kbReportModal')?.remove();
                _kbLoadSchedule();
            } else {
                showToast('Lỗi: ' + (data.error || 'Unknown'), 'error');
            }
        } catch(e) { showToast('Lỗi upload!', 'error'); }
    }
}

async function _kbApprove(reportId, action) {
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action });
        showToast(action === 'approve' ? '✅ Đã duyệt!' : '❌ Đã từ chối!');
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi!', 'error'); }
}
