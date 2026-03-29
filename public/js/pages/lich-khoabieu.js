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

// Auto-linkify URLs in text
function _kbLinkify(text) {
    if (!text) return '';
    return String(text).replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;" onclick="event.stopPropagation()">$1</a>');
}

function _kbGetColor(name) {
    if (!_kbColorMap[name]) {
        // Deterministic hash — same name always gets same color (synced with bangiao-diem)
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
        const idx = Math.abs(hash) % _KB_COLORS.length;
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
        rejected: { label: '❌ Bị từ chối', color: '#dc2626', bg: '#fecaca' },
        expired: { label: '🚫 Hết hạn làm lại', color: '#6b7280', bg: '#f3f4f6' }
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

    // Show reject reason
    if (data.reject_reason) {
        detailHtml += `<div style="padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;">
            <div style="font-size:11px;color:#dc2626;font-weight:700;margin-bottom:4px;">💬 Lý do từ chối:</div>
            <div style="font-size:13px;color:#7f1d1d;">${data.reject_reason}</div>
        </div>`;
    }

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
            // Fetch members AND departments in parallel
            const [m, dData] = await Promise.all([
                apiCall('/api/schedule/team-members'),
                apiCall('/api/task-points/departments')
            ]);
            const members = m.members || [];
            const allDepts = (dData.departments || []).filter(d => !d.name.startsWith('HỆ THỐNG'));
            const activeDeptIds = new Set(dData.active_dept_ids || []);

            // Tree-walk sort: parents by display_order, children after parent
            const activeDepts = allDepts.filter(d => activeDeptIds.has(d.id));
            activeDepts.forEach(d => {
                if (d.parent_id) {
                    const parent = allDepts.find(p => p.id === d.parent_id);
                    if (parent && !activeDeptIds.has(parent.id)) {
                        activeDeptIds.add(parent.id);
                        activeDepts.push(parent);
                    }
                }
            });
            const parents = activeDepts.filter(d => !d.parent_id || !activeDepts.some(p => p.id === d.parent_id))
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            const sortedDepts = [];
            parents.forEach(p => {
                sortedDepts.push(p);
                const children = activeDepts.filter(c => c.parent_id === p.id)
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                sortedDepts.push(...children);
            });

            // Group members by dept name for lookup
            const byDept = {};
            members.forEach(u => {
                const dn = u.dept_name || 'Không phòng ban';
                if (!byDept[dn]) byDept[dn] = [];
                byDept[dn].push(u);
            });

            // Role priority: higher number = shown first
            const _kbRolePriority = { giam_doc: 5, quan_ly: 4, truong_phong: 3, trinh: 2, nhan_vien: 1 };
            const _kbRoleLabel = { giam_doc: '⭐ Giám đốc', quan_ly: '⭐ Quản lý', truong_phong: '⭐ Trưởng phòng', trinh: 'Trình', nhan_vien: 'Nhân viên' };
            const _kbIsLeader = (role) => ['giam_doc','quan_ly','truong_phong'].includes(role);

            // Build HTML with tree-walk order + STT
            let deptListHtml = '';
            let parentStt = 0, childStt = 0;
            sortedDepts.forEach(dept => {
                const isChild = activeDepts.some(p => p.id === dept.parent_id && activeDeptIds.has(p.id));
                const deptMembers = (byDept[dept.name] || [])
                    .sort((a, b) => (_kbRolePriority[b.role] || 0) - (_kbRolePriority[a.role] || 0));
                let sttLabel = '';
                if (!isChild) {
                    parentStt++;
                    childStt = 0;
                    sttLabel = `<span style="color:rgba(255,255,255,0.8);font-size:12px;font-weight:900;margin-right:4px;">${parentStt}.</span>`;
                } else {
                    childStt++;
                    sttLabel = `<span style="color:#94a3b8;font-size:10px;font-weight:700;margin-right:3px;">${childStt}.</span>`;
                }
                deptListHtml += `<div class="kb-dept-header" data-dept="${dept.name}" style="padding:${isChild ? '7px 14px 7px 28px' : '10px 14px'};font-size:${isChild ? '11px' : '13px'};font-weight:900;color:${isChild ? '#475569' : '#fff'};text-transform:uppercase;background:${isChild ? 'linear-gradient(135deg,#f1f5f9,#e8eef5)' : 'linear-gradient(135deg,#1e3a5f,#2563eb)'};border-bottom:${isChild ? '1px solid #e2e8f0' : '2px solid #1e40af'};${isChild ? 'border-left:3px solid #93c5fd;' : 'margin-top:4px;box-shadow:0 2px 8px rgba(37,99,235,0.25);border-radius:6px;'}letter-spacing:${isChild ? '0.3px' : '0.5px'};display:flex;align-items:center;gap:6px;transition:all .2s;cursor:default;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${sttLabel}${isChild ? '<span style="color:#94a3b8;">└</span> ' : '<span style="font-size:14px;">🏢</span> '}<span style="flex:1;">${dept.name}</span></div>`;
                deptMembers.forEach(u => {
                    const isLead = _kbIsLeader(u.role);
                    const roleTag = _kbRoleLabel[u.role] || u.role;
                    const starStyle = isLead ? 'color:#d97706;font-weight:700;' : 'color:#94a3b8;';
                    deptListHtml += `
                        <div class="kb-member-item" data-uid="${u.id}" data-name="${u.full_name}" data-dept="${dept.name}" onclick="_kbSelectMember(${u.id})" style="padding:9px 14px ${isChild ? '9px 32px' : '9px 18px'};font-size:13px;color:#1e293b;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:all .15s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;"
                            onmouseover="if(!this.classList.contains('kb-active'))this.style.background='#f8fafc'"
                            onmouseout="if(!this.classList.contains('kb-active'))this.style.background='white'">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:${isLead ? '700' : '500'};font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name}</div>
                                <div style="font-size:10px;${starStyle}margin-top:1px;">${roleTag}</div>
                            </div>
                        </div>`;
                });
            });

            membersHtml = `
            <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;width:230px;min-width:230px;overflow-y:auto;max-height:calc(100vh - 140px);box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px 12px 0 0;">
                    <input type="text" id="kbMemberSearch" placeholder="🔍 Tìm nhân viên..." 
                           oninput="_kbFilterMembers()" 
                           style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;color:#1e293b;background:white;outline:none;" 
                           onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,0.1)'" 
                           onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'" />
                </div>
                <div id="kbMemberList">
                    <div class="kb-member-item kb-active" data-uid="" data-name="Lịch của tôi" onclick="_kbSelectMember(null)" style="padding:12px 16px;font-size:14px;color:#122546;cursor:pointer;border-bottom:1px solid #e2e8f0;border-left:3px solid #2563eb;background:#eff6ff;font-weight:700;display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;">📋</span> Lịch của tôi
                    </div>
                    ${deptListHtml}
                </div>
            </div>`;
        } catch(e) {}
    }

    const isGD = currentUser.role === 'giam_doc';
    const hasApprovalScope = isManager; // Will be refined after loading approvers

    container.innerHTML = `
    <div style="max-width:1500px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">📋 Lịch Khóa Biểu Công Việc</h2>
                ${isGD ? `<button onclick="_kbShowSetupTab()" id="kbSetupBtn" style="padding:6px 14px;font-size:12px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">⚙️ Setup Người Duyệt</button>` : ''}
            </div>
            <div id="kbViewingLabel" style="font-size:13px;color:#6b7280;"></div>
        </div>
        <div id="kbSetupPanel" style="display:none;margin-bottom:16px;"></div>
        <div id="kbApprovalPanel" style="margin-bottom:14px;"></div>
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
    if (hasApprovalScope) _kbLoadApprovalPanel();
    _kbCheckRejectedPopup();
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

    // Load ALL data in ONE request via consolidated dashboard API
    try {
        const uid = _kbViewUserId || currentUser.id;
        const viewMonth = _kbWeekStart.getMonth();
        const viewYear = _kbWeekStart.getFullYear();

        const data = await apiCall(`/api/schedule/dashboard?user_id=${uid}&week_start=${monStr}`);

        _kbTasks = data.tasks || [];

        _kbReports = {};
        (data.reports || []).forEach(rep => {
            const key = `${rep.template_id}_${rep.report_date.slice(0,10)}`;
            _kbReports[key] = rep;
            // Also index by task_name for fallback matching (when snapshot has null template_id)
            if (rep.task_name) {
                const nameKey = `name_${rep.task_name}_${rep.report_date.slice(0,10)}`;
                _kbReports[nameKey] = rep;
            }
        });

        _kbSummary = {};
        (data.weekly_summary || []).forEach(row => { _kbSummary[row.report_date.slice(0,10)] = row; });

        _kbHolidayMap = data.holidays_week || {};

        _kbMonthlySummary = (data.monthly_summary || []).reduce((s, r) => s + Number(r.total_points || 0), 0);

        _kbMonthlyHolidays = (data.holidays_year || []).filter(hol => {
            const dd = new Date(hol.holiday_date);
            return dd.getMonth() === viewMonth;
        });
    } catch(e) {
        _kbTasks = []; _kbReports = {}; _kbSummary = {};
        _kbHolidayMap = {}; _kbMonthlySummary = 0; _kbMonthlyHolidays = [];
    }

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
    const todayEarnedRaw = Number(_kbSummary[todayStr]?.total_points || 0);
    const todayEarned = Math.min(todayEarnedRaw, 100);

    // Week points (Mon-Sun, each day capped at 100)
    let weekEarned = 0;
    const sunDate = new Date(_kbWeekStart); sunDate.setDate(_kbWeekStart.getDate() + 6);
    for (let d = 1; d <= 7; d++) {
        const colDate = new Date(_kbWeekStart); colDate.setDate(_kbWeekStart.getDate() + d - 1);
        const ds = _kbDateStr(colDate);
        if (_kbSummary[ds]) weekEarned += Math.min(Number(_kbSummary[ds].total_points || 0), 100);
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

    // Inject approval badge pulse animation (once)
    if (!document.getElementById('_kbPulseStyle')) {
        const s = document.createElement('style');
        s.id = '_kbPulseStyle';
        s.textContent = '@keyframes _kbPulse { 0%,100%{transform:scale(1);box-shadow:0 2px 6px rgba(217,119,6,0.4)} 50%{transform:scale(1.08);box-shadow:0 3px 10px rgba(217,119,6,0.6)} }';
        document.head.appendChild(s);
    }

    // Colors (hash-based — deterministic)
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
        if (_kbSummary[dateStr]) earned = Number(_kbSummary[dateStr].total_points || 0);
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
                // Fallback: if template_id is null OR no match, try matching by task_name
                let report = _kbReports[reportKey];
                if (!report && task.task_name) {
                    const nameKey = `name_${task.task_name}_${dateStr}`;
                    report = _kbReports[nameKey];
                }

                let statusBadge = '';
                let actionBtn = ''; // inline with guide button row
                if (report) {
                    // HAS REPORT — make it clickable to view details
                    const rData = JSON.stringify({
                        task_name: task.task_name, status: report.status, points_earned: report.points_earned,
                        quantity: report.quantity, report_value: report.report_value || '', report_image: report.report_image || '',
                        report_date: dateStr, content: report.content || '', reject_reason: report.reject_reason || '',
                        redo_count: report.redo_count || 0, redo_deadline: report.redo_deadline || ''
                    }).replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    if (report.status === 'approved') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#dcfce7;color:#16a34a;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #86efac;transition:all .15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">✅ +${report.points_earned}đ</span>`;
                    } else if (report.status === 'pending') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #fde68a;">⏳ ${report.redo_count > 0 ? 'Chờ duyệt lại' : 'Chờ duyệt'}</span>`;
                    } else if (report.status === 'rejected') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">❌ Bị từ chối</span>`;
                        // Show redo button for self
                        if (isSelf && report.redo_deadline && new Date(report.redo_deadline) > new Date()) {
                            statusBadge = `<div style="margin-top:4px;"><button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\\'")}', ${report.id})" style="padding:2px 8px;font-size:10px;border:1px dashed #d97706;border-radius:4px;background:#fef3c7;color:#d97706;cursor:pointer;font-weight:600;">📝 Nộp lại</button></div>`;
                        }
                    } else if (report.status === 'expired') {
                        actionBtn = `<span style="background:#f3f4f6;color:#6b7280;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;line-height:1;display:inline-flex;align-items:center;border:1px solid #e5e7eb;">🚫 Hết hạn (0đ)</span>`;
                    }
                } else if (canReport) {
                    if (dateStr === todayStr) {
                        actionBtn = `<button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\'")}')" style="padding:3px 10px;font-size:10px;border:1px dashed ${c.badge};border-radius:4px;background:${c.tag};color:${c.badge};cursor:pointer;font-weight:600;line-height:1;display:inline-flex;align-items:center;">📝 Báo cáo</button>`;
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

                const reqsHtml = '';

                html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                    <div style="background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;padding:10px 12px;text-align:center;position:relative;">
                        ${task.requires_approval ? '<span style="position:absolute;top:-7px;right:-7px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(217,119,6,0.4);animation:_kbPulse 2s infinite;border:1px solid #fbbf24;">🔒 CẦN DUYỆT</span>' : ''}
                        <div onclick="_kbShowTaskDetail(${task._source === 'snapshot' ? task.template_id : task.id})" style="font-weight:700;color:${c.text};font-size:13px;margin-bottom:4px;cursor:pointer;transition:all .15s;" onmouseover="this.style.textDecoration='underline';this.style.opacity='0.8'" onmouseout="this.style.textDecoration='none';this.style.opacity='1'">${task.task_name}</div>
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

// Premium task detail modal (same design as Bàn Giao CV Điểm)
async function _kbShowTaskDetail(templateId) {
    let task = _kbTasks.find(t => {
        const tid = t._source === 'snapshot' ? t.template_id : t.id;
        return tid === templateId;
    });
    // If not in local cache (e.g. viewing from approval panel), fetch from API
    if (!task) {
        try {
            const data = await apiCall(`/api/task-points/template/${templateId}`);
            task = data.template;
        } catch(e) {}
    }
    if (!task) { showToast('Không tìm thấy công việc', 'error'); return; }
    const c = _kbGetColor(task.task_name);
    const inputReqs = _kbParseJSON(task.input_requirements);
    const outputReqs = _kbParseJSON(task.output_requirements);
    const isFixed = !task.week_only;

    document.getElementById('kbDetailModal')?.remove();

    const reqList = (items, icon, color, label) => {
        if (!items || items.length === 0) return '';
        return `
            <div style="margin-bottom:14px;">
                <div style="font-weight:700;font-size:12px;color:${color};margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:14px;">${icon}</span> ${label}
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;border:1px solid #e5e7eb;">
                    ${items.map((r, i) => `
                        <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;${i < items.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
                            <span style="background:${color};color:white;min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${i + 1}</span>
                            <span style="font-size:13px;color:#374151;line-height:1.5;padding-top:1px;">${_kbLinkify(r)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    };

    const m = document.createElement('div');
    m.id = 'kbDetailModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:kbFadeIn .2s ease;';
    m.onclick = (e) => { if (e.target === m) m.remove(); };
    m.innerHTML = `
    <style>
        @keyframes kbFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes kbSlideUp { from { transform:translateY(20px);opacity:0; } to { transform:translateY(0);opacity:1; } }
    </style>
    <div style="background:white;border-radius:16px;width:min(480px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.2);animation:kbSlideUp .25s ease;">
        <div style="background:linear-gradient(135deg, ${c.badge}, ${c.badge}dd);padding:24px 28px;border-radius:16px 16px 0 0;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.1);"></div>
            <div style="position:absolute;bottom:-30px;left:30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
            <button onclick="document.getElementById('kbDetailModal').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
            <div style="font-size:22px;font-weight:800;color:white;margin-bottom:6px;text-shadow:0 1px 3px rgba(0,0,0,0.15);">${task.task_name}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">${isFixed ? '📌 Cố định' : '📅 1 tuần'}</span>
                <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">${_KB_DAY_NAMES[task.day_of_week]}</span>
                ${task.requires_approval ? '<span style="background:rgba(255,200,0,0.3);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">🔒 Cần duyệt</span>' : ''}
            </div>
        </div>
        <div style="padding:24px 28px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
                <div style="text-align:center;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Điểm</div>
                    <div style="font-size:24px;font-weight:800;color:${c.badge};">${task.points}<span style="font-size:12px;">đ</span></div>
                </div>
                <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">SL Tối Thiểu</div>
                    <div style="font-size:24px;font-weight:800;color:#16a34a;">≥${task.min_quantity || 1}<span style="font-size:12px;"> lần</span></div>
                </div>
                <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Khung Giờ</div>
                    <div style="font-size:14px;font-weight:800;color:#334155;margin-top:2px;">${task.time_start}</div>
                    <div style="font-size:9px;color:#9ca3af;">→ ${task.time_end}</div>
                </div>
            </div>
            ${task.guide_url ? `
            <div style="margin-bottom:18px;">
                <a href="${task.guide_url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg, #eff6ff, #dbeafe);border:1px solid #93c5fd;border-radius:10px;text-decoration:none;color:#1d4ed8;transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(37,99,235,0.15)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
                    <span style="font-size:20px;">📘</span>
                    <div>
                        <div style="font-weight:700;font-size:13px;">Xem hướng dẫn công việc</div>
                        <div style="font-size:11px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:350px;">${task.guide_url}</div>
                    </div>
                    <span style="margin-left:auto;font-size:14px;">→</span>
                </a>
            </div>` : ''}
            ${reqList(inputReqs, '📥', '#2563eb', 'Yêu cầu đầu vào')}
            ${reqList(outputReqs, '📤', '#059669', 'Yêu cầu đầu ra')}
            ${!inputReqs.length && !outputReqs.length ? `
            <div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px;background:#f9fafb;border-radius:8px;border:1px dashed #e5e7eb;">
                Chưa có yêu cầu đầu vào/ra
            </div>` : ''}
        </div>
    </div>`;
    document.body.appendChild(m);
}

// Report modal — full redesign
let _kbPastedFile = null;

function _kbShowReportModal(templateId, reportDate, fallbackName, redoReportId) {
    let task = _kbTasks.find(t => {
        const tid = t._source === 'snapshot' ? t.template_id : t.id;
        return tid === templateId;
    });
    // Fallback: if templateId is null/0, find by task_name + date
    if (!task && fallbackName) {
        task = _kbTasks.find(t => t.task_name === fallbackName && t._date === reportDate);
    }
    // If task found from snapshot with null template_id, resolve the real template_id
    if (task && task._source === 'snapshot' && !task.template_id && task.task_name) {
        // Find the template by task_name in all tasks (look for template version)
        const tmpl = _kbTasks.find(t => t._source !== 'snapshot' && t.task_name === task.task_name);
        if (tmpl) templateId = tmpl.id;
    }
    const taskName = task ? task.task_name : 'Công việc';
    const taskPoints = task ? task.points : 0;
    const needsApproval = task ? task.requires_approval : false;
    const minQty = task ? (task.min_quantity || 1) : 1;
    const guideUrl = task ? (task.guide_url || '') : '';
    const inputReqs = task ? _kbParseJSON(task.input_requirements) : [];
    const outputReqs = task ? _kbParseJSON(task.output_requirements) : [];
    _kbPastedFile = null;

    const isRedo = !!redoReportId;
    const approvalWarn = needsApproval ? `
        <div style="padding:10px 12px;background:${isRedo ? '#fef2f2' : '#fef3c7'};border:1px solid ${isRedo ? '#fecaca' : '#fde68a'};border-radius:8px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">${isRedo ? '🔄' : '🔒'}</span>
            <div style="font-size:12px;color:${isRedo ? '#991b1b' : '#78350f'};font-weight:600;">${isRedo ? 'Nộp lại công việc bị từ chối — sửa và nộp lại để duyệt' : 'Công việc này cần Quản lý/TP duyệt mới được tính điểm'}</div>
        </div>` : '';

    // Build requirements HTML (compact)
    const reqHtml = (items, icon, color, label) => {
        if (!items.length) return '';
        return `<div style="margin-top:8px;">
            <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:4px;">${icon} ${label}</div>
            ${items.map((r, i) => `<div style="font-size:11px;color:#374151;padding:2px 0 2px 12px;border-left:2px solid ${color}20;">${i+1}. ${_kbLinkify(r)}</div>`).join('')}
        </div>`;
    };

    const hasTaskInfo = guideUrl || inputReqs.length || outputReqs.length;
    const taskInfoSection = hasTaskInfo ? `
        <div style="margin-bottom:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="padding:12px 14px;background:#f8fafc;">
                ${guideUrl ? `<a href="${guideUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;text-decoration:none;color:#1d4ed8;margin-bottom:8px;transition:all .15s;font-size:12px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <span style="font-size:16px;">📘</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;">Hướng dẫn công việc</div>
                        <div style="font-size:10px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${guideUrl}</div>
                    </div>
                    <span>→</span>
                </a>` : ''}
                ${reqHtml(inputReqs, '📥', '#2563eb', 'Yêu cầu đầu vào')}
                ${reqHtml(outputReqs, '📤', '#059669', 'Yêu cầu đầu ra')}
            </div>
        </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'kbReportModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(520px,92vw);max-height:90vh;overflow-y:auto;border:1px solid #e5e7eb;box-shadow:0 25px 60px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,${isRedo ? '#991b1b,#dc2626' : '#122546,#1e3a5f'});padding:18px 22px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:17px;color:white;font-weight:700;">${isRedo ? '🔄 Nộp lại công việc' : '📝 Báo cáo công việc'}</h3>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">${isRedo ? 'Sửa và nộp lại để được duyệt' : 'Nộp kết quả hoàn thành'}</div>
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
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
                <div style="padding:10px 12px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;text-align:center;">
                    <div style="font-size:10px;color:#059669;text-transform:uppercase;font-weight:600;margin-bottom:4px;">⭐ Điểm</div>
                    <div style="font-size:18px;font-weight:800;color:#059669;">${taskPoints}đ</div>
                </div>
                <div style="padding:10px 12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;text-align:center;">
                    <div style="font-size:10px;color:#2563eb;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📊 Tối thiểu</div>
                    <div style="font-size:18px;font-weight:800;color:#2563eb;">≥${minQty}</div>
                </div>
                <div>
                    <label style="font-weight:600;font-size:11px;color:#374151;display:block;margin-bottom:4px;">SL hoàn thành <span style="color:#dc2626;">*</span></label>
                    <input id="kbRptQty" type="number" min="0" value="${minQty}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;font-weight:700;color:#122546;box-sizing:border-box;text-align:center;">
                </div>
            </div>
            ${taskInfoSection}
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
            <input type="hidden" id="kbRptRedoId" value="${redoReportId || ''}">
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #f3f4f6;">
                <button onclick="document.getElementById('kbReportModal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_kbSubmitReport()" style="padding:9px 24px;border-radius:8px;border:none;background:linear-gradient(135deg,${isRedo ? '#dc2626,#991b1b' : '#16a34a,#15803d'});color:white;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(22,163,74,0.3);">${isRedo ? '🔄 Nộp lại' : '📤 Nộp báo cáo'}</button>
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
    const redoId = document.getElementById('kbRptRedoId')?.value;

    if (!link && !_kbPastedFile) {
        showToast('Phải có ít nhất link hoặc hình ảnh!', 'error');
        return;
    }

    try {
        // Check if this is a redo submission
        if (redoId) {
            let imageUrl = '';
            if (_kbPastedFile) {
                // Upload image first
                const imgForm = new FormData();
                imgForm.append('report_image', _kbPastedFile, 'paste.png');
                const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
                const imgResp = await fetch('/api/schedule/upload-image', {
                    method: 'POST', body: imgForm,
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const imgData = await imgResp.json();
                imageUrl = imgData.url || '';
            }

            const redoData = {
                report_value: link || '',
                report_image: imageUrl || '',
                quantity: Number(qty),
                content: content || ''
            };
            const result = await apiCall(`/api/schedule/report/${redoId}/redo`, 'PUT', redoData);
            if (result.success) {
                showToast('🔄 Đã nộp lại! ⏳ Chờ duyệt');
                document.getElementById('kbReportModal')?.remove();
                _kbLoadSchedule();
                if (typeof _kbLoadApprovalPanel === 'function') _kbLoadApprovalPanel();
            }
            return;
        }

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
    } catch(e) { showToast('Lỗi gửi báo cáo: ' + (e.message || ''), 'error'); }
}

async function _kbApprove(reportId, action) {
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action });
        showToast(action === 'approve' ? '✅ Đã duyệt!' : '❌ Đã từ chối!');
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

function _kbFilterMembers() {
    const q = (document.getElementById('kbMemberSearch')?.value || '').toLowerCase().trim();
    const list = document.getElementById('kbMemberList');
    if (!list) return;
    const members = list.querySelectorAll('.kb-member-item');
    const deptHeaders = list.querySelectorAll('.kb-dept-header');
    
    // Track which depts have visible members
    const visibleDepts = new Set();
    
    members.forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        const dept = el.dataset.dept || '';
        const uid = el.dataset.uid;
        if (!q || uid === '' || name.includes(q)) {
            el.style.display = '';
            if (dept) visibleDepts.add(dept);
        } else {
            el.style.display = 'none';
        }
    });
    
    // Show/hide dept headers based on whether they have visible members
    deptHeaders.forEach(h => {
        const dept = h.dataset.dept || '';
        if (!q || visibleDepts.has(dept)) {
            h.style.display = '';
        } else {
            h.style.display = 'none';
        }
    });
}

// ========== SETUP NGƯỜI DUYỆT (GĐ only) ==========
let _kbSetupVisible = false;
async function _kbShowSetupTab() {
    const panel = document.getElementById('kbSetupPanel');
    if (!panel) return;
    _kbSetupVisible = !_kbSetupVisible;
    const btn = document.getElementById('kbSetupBtn');
    if (!_kbSetupVisible) {
        panel.style.display = 'none';
        if (btn) { btn.style.background = 'white'; btn.style.color = '#64748b'; }
        return;
    }
    if (btn) { btn.style.background = '#2563eb'; btn.style.color = 'white'; }
    panel.style.display = 'block';
    panel.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">Đang tải...</div>';

    try {
        const [approverData, deptData, configData, usersData] = await Promise.all([
            apiCall('/api/schedule/approvers'),
            apiCall('/api/task-points/departments'),
            apiCall('/api/schedule/config'),
            apiCall('/api/users/dropdown')
        ]);

        const approvers = approverData.approvers || [];
        const allDepts = (deptData.departments || []);
        const redoMax = configData.task_redo_max || 1;
        const allUsers = (usersData.users || []).filter(u => u.role !== 'tkaffiliate' && u.status !== 'resigned');

        // Build tree
        const systems = allDepts.filter(d => !d.parent_id);
        let html = `<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;color:#1e293b;font-weight:700;">⚙️ Setup Người Duyệt Công Việc</h3>
                <div style="display:flex;align-items:center;gap:12px;">
                    <label style="font-size:12px;color:#64748b;font-weight:600;">Số lần làm lại tối đa:</label>
                    <input type="number" id="kbRedoMaxInput" value="${redoMax}" min="0" max="10" style="width:60px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;text-align:center;" />
                    <button onclick="_kbSaveRedoMax()" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#2563eb;color:white;cursor:pointer;font-weight:600;">Lưu</button>
                </div>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">ℹ️ Giám Đốc tự động duyệt tất cả, không cần gán. Gán người duyệt cho phòng CHA → tự động duyệt luôn team CON.</div>`;

        systems.forEach(sys => {
            const children = allDepts.filter(d => d.parent_id === sys.id);
            const sysApprovers = approvers.filter(a => a.department_id === sys.id);
            html += `<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:10px 14px;font-weight:800;font-size:13px;letter-spacing:.3px;display:flex;align-items:center;justify-content:space-between;">
                    <span>🏢 ${sys.name}</span>
                    <select onchange="_kbAddApprover(this.value, ${sys.id}); this.value='';" style="padding:3px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;color:white;background:rgba(255,255,255,0.15);cursor:pointer;">
                        <option value="" style="color:#333;">+ Gán duyệt toàn hệ thống</option>
                        ${allUsers.filter(u => !sysApprovers.some(a => a.user_id === u.id)).map(u => `<option value="${u.id}" style="color:#333;">${u.full_name} (${u.role})</option>`).join('')}
                    </select>
                </div>
                ${sysApprovers.length > 0 ? `<div style="padding:6px 14px;background:#eff6ff;border-bottom:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">
                    <span style="font-size:10px;color:#64748b;font-weight:600;">Duyệt toàn hệ thống:</span>
                    ${sysApprovers.map(a => `<span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;border:1px solid #93c5fd;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#1d4ed8;">👤 ${a.user_name} <button onclick="_kbRemoveApprover(${a.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:12px;padding:0;line-height:1;">×</button></span>`).join('')}
                </div>` : ''}`;

            children.forEach(dept => {
                const deptApprovers = approvers.filter(a => a.department_id === dept.id);
                const subTeams = allDepts.filter(d => d.parent_id === dept.id);

                html += `<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-weight:700;font-size:13px;color:#1e293b;">📦 ${dept.name}</span>
                        <select onchange="_kbAddApprover(this.value, ${dept.id}); this.value='';" style="padding:3px 8px;font-size:11px;border:1px solid #e2e8f0;border-radius:6px;color:#64748b;">
                            <option value="">+ Thêm người duyệt</option>
                            ${allUsers.filter(u => !deptApprovers.some(a => a.user_id === u.id)).map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${deptApprovers.length === 0 ? '<span style="font-size:11px;color:#d1d5db;font-style:italic;">Chưa gán</span>' : ''}
                        ${deptApprovers.map(a => `<span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;color:#1d4ed8;">👤 ${a.user_name} <button onclick="_kbRemoveApprover(${a.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:12px;padding:0;line-height:1;">×</button></span>`).join('')}
                    </div>`;

                // Sub-teams
                subTeams.forEach(team => {
                    const teamApprovers = approvers.filter(a => a.department_id === team.id);
                    html += `<div style="margin-top:6px;padding-left:16px;border-left:2px solid #e2e8f0;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                            <span style="font-size:12px;color:#475569;font-weight:600;">└ ${team.name}</span>
                            <select onchange="_kbAddApprover(this.value, ${team.id}); this.value='';" style="padding:2px 6px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;color:#64748b;">
                                <option value="">+ Thêm</option>
                                ${allUsers.filter(u => !teamApprovers.some(a => a.user_id === u.id)).map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${teamApprovers.length === 0 ? '<span style="font-size:10px;color:#d1d5db;font-style:italic;">Kế thừa từ phòng cha</span>' : ''}
                            ${teamApprovers.map(a => `<span style="display:inline-flex;align-items:center;gap:3px;background:#ecfdf5;border:1px solid #a7f3d0;padding:2px 6px;border-radius:5px;font-size:10px;font-weight:600;color:#059669;">👤 ${a.user_name} <button onclick="_kbRemoveApprover(${a.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:11px;padding:0;line-height:1;">×</button></span>`).join('')}
                        </div>
                    </div>`;
                });

                html += `</div>`;
            });
            html += `</div>`;
        });

        html += `</div>`;
        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = `<div style="color:#dc2626;padding:12px;">Lỗi: ${e.message}</div>`;
    }
}

async function _kbAddApprover(userId, deptId) {
    if (!userId) return;
    try {
        await apiCall('/api/schedule/approvers', 'POST', { user_id: Number(userId), department_id: deptId });
        _kbShowSetupTab(); _kbSetupVisible = false; _kbShowSetupTab(); // refresh
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _kbRemoveApprover(id) {
    if (!confirm('Xóa phân quyền duyệt này?')) return;
    try {
        await apiCall(`/api/schedule/approvers/${id}`, 'DELETE');
        _kbShowSetupTab(); _kbSetupVisible = false; _kbShowSetupTab();
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _kbSaveRedoMax() {
    const v = Number(document.getElementById('kbRedoMaxInput')?.value) || 1;
    try {
        await apiCall('/api/schedule/config', 'POST', { task_redo_max: v });
        alert('Đã lưu: Tối đa ' + v + ' lần làm lại');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== APPROVAL PANEL (pending reports) ==========
async function _kbLoadApprovalPanel() {
    const panel = document.getElementById('kbApprovalPanel');
    if (!panel) return;

    try {
        const data = await apiCall('/api/schedule/pending-approvals');
        const pending = data.pending || [];

        // Update sidebar badge
        _kbUpdateSidebarBadge(pending.length);

        if (pending.length === 0) {
            panel.innerHTML = '';
            return;
        }

        let rows = '';
        pending.forEach(r => {
            const isRedo = r.redo_count > 0;
            const dateFormatted = r.report_date.split('-').reverse().join('/');
            const rData = JSON.stringify({
                task_name: r.task_name, status: r.status || 'pending', points_earned: r.points_earned || 0,
                quantity: r.quantity || '', report_value: r.report_value || '', report_image: r.report_image || '',
                report_date: r.report_date || '', content: r.content || '', reject_reason: r.reject_reason || '',
                redo_count: r.redo_count || 0, redo_deadline: r.redo_deadline || ''
            }).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            rows += `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;">${r.user_name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;"><span onclick="_kbShowTaskDetail(${r.template_id})" style="color:#2563eb;cursor:pointer;font-weight:700;text-decoration:underline;text-decoration-style:dashed;text-underline-offset:2px;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'">${r.task_name}</span> ${isRedo ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔄 Nộp lại</span>' : ''}</td>
                <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${dateFormatted}</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1d4ed8;">${r.template_points}đ</td>
                <td style="padding:8px 12px;font-size:11px;">
                    ${r.report_value ? `<a href="${r.report_value}" target="_blank" style="color:#2563eb;text-decoration:none;">🔗 Link</a>` : ''}
                    ${r.report_image ? `<a href="${r.report_image}" target="_blank" style="color:#2563eb;text-decoration:none;margin-left:4px;">🖼️ Ảnh</a>` : ''}
                    ${r.content ? `<span style="color:#6b7280;margin-left:4px;" title="${r.content.replace(/"/g, '&quot;')}">📝</span>` : ''}
                </td>
                <td style="padding:8px 12px;text-align:center;">
                    <button onclick="_kbApproveReport(${r.id})" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-weight:700;margin-right:4px;">✅ Duyệt</button>
                    <button onclick="_kbRejectReport(${r.id}, '${r.task_name.replace(/'/g, "\\'")}', '${r.user_name.replace(/'/g, "\\'")}')" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">❌ Từ chối</button>
                </td>
            </tr>`;
        });

        panel.innerHTML = `
        <div style="background:white;border:2px solid #fde68a;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(217,119,6,0.1);">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:white;font-weight:800;font-size:14px;">📋 CÔNG VIỆC CHỜ DUYỆT</span>
                <span style="background:rgba(255,255,255,0.3);color:white;padding:2px 10px;border-radius:10px;font-size:13px;font-weight:800;">${pending.length}</span>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#1e3a5f;">
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Nhân viên</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Công việc</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Ngày</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Điểm</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Báo cáo</th>
                            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    } catch(e) {
        panel.innerHTML = '';
    }
}

async function _kbApproveReport(reportId) {
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action: 'approve' });
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không có quyền')); }
}

function _kbRejectReport(reportId, taskName, userName) {
    let modal = document.getElementById('kbRejectModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbRejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <h3 style="margin:0 0 16px 0;font-size:16px;color:#dc2626;">❌ Từ chối báo cáo</h3>
        <div style="margin-bottom:12px;">
            <div style="font-size:13px;color:#374151;"><strong>${userName}</strong> — ${taskName}</div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Lý do từ chối *</label>
            <textarea id="kbRejectReason" rows="3" style="width:100%;padding:8px 12px;border:1px solid #fecaca;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Nhập lý do từ chối..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('kbRejectModal').remove()" style="padding:8px 16px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;">Hủy</button>
            <button onclick="_kbConfirmReject(${reportId})" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">Xác nhận từ chối</button>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('kbRejectReason')?.focus(), 100);
}

async function _kbConfirmReject(reportId) {
    const reason = document.getElementById('kbRejectReason')?.value?.trim();
    if (!reason) { alert('Phải nhập lý do từ chối'); return; }
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action: 'reject', reject_reason: reason });
        document.getElementById('kbRejectModal')?.remove();
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không thể từ chối')); }
}

// ========== REJECTED POPUP (for employees) ==========
async function _kbCheckRejectedPopup() {
    try {
        const data = await apiCall('/api/schedule/my-rejected');
        const rejected = data.rejected || [];
        if (rejected.length === 0) return;

        let items = '';
        rejected.forEach((r, i) => {
            const dateF = r.report_date.split('-').reverse().join('/');
            const deadlineDate = new Date(r.redo_deadline);
            const deadlineStr = `${String(deadlineDate.getDate()).padStart(2,'0')}/${String(deadlineDate.getMonth()+1).padStart(2,'0')}`;
            items += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;color:#dc2626;margin-bottom:4px;">${i+1}. ${r.task_name} (${dateF})</div>
                <div style="font-size:12px;color:#7f1d1d;margin-bottom:4px;">💬 Lý do: "${r.reject_reason}"</div>
                <div style="font-size:11px;color:#d97706;font-weight:600;">⏰ Hạn nộp lại: 23:59 ngày ${deadlineStr}</div>
            </div>`;
        });

        let modal = document.createElement('div');
        modal.id = 'kbRejectedPopup';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:24px;width:450px;max-width:92vw;max-height:80vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);border-top:4px solid #dc2626;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
                <div style="font-size:18px;font-weight:800;color:#dc2626;">BẠN CÓ CÔNG VIỆC BỊ TỪ CHỐI!</div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px;">Hãy sửa và nộp lại trước hạn để không mất điểm</div>
            </div>
            ${items}
            <div style="text-align:center;margin-top:16px;">
                <button onclick="document.getElementById('kbRejectedPopup').remove()" style="padding:10px 28px;font-size:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;cursor:pointer;font-weight:700;box-shadow:0 4px 12px rgba(37,99,235,0.3);">Đã hiểu ✓</button>
            </div>
        </div>`;
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    } catch(e) {}
}

// ========== SIDEBAR BADGE ==========
function _kbUpdateSidebarBadge(count) {
    // Find the sidebar menu item for "Lịch Khóa Biểu Công Việc"
    const menuItems = document.querySelectorAll('.sidebar-menu-item, [data-page]');
    menuItems.forEach(el => {
        if (el.textContent.includes('Lịch Khóa Biểu') && !el.textContent.includes('Badge')) {
            let badge = el.querySelector('.kb-pending-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'kb-pending-badge';
                    badge.style.cssText = 'background:#dc2626;color:white;font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:6px;line-height:1.3;display:inline-block;animation:_kbPulse 2s infinite;';
                    el.appendChild(badge);
                }
                badge.textContent = count;
            } else if (badge) {
                badge.remove();
            }
        }
    });
}

// Load badge on page init for managers
async function _kbInitBadge() {
    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser?.role);
    if (!isManager) return;
    try {
        const data = await apiCall('/api/schedule/pending-count');
        _kbUpdateSidebarBadge(data.count || 0);
    } catch(e) {}
}

// Auto-init badge
if (typeof currentUser !== 'undefined' && currentUser) {
    setTimeout(_kbInitBadge, 1000);
}
