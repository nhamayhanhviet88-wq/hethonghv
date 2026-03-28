// ========== BÀN GIAO CV ĐIỂM — Task Point Templates ==========
const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
let _tpTasks = [];
let _tpTarget = { type: 'team', id: null };
let _tpAllDepts = [];
let _tpActiveDeptIds = [];
let _tpUsers = [];
let _tpIsReadonly = false;
let _tpCurrentWeekStart = null; // Monday of current view week
let _tpHolidayMap = {}; // { dayOfWeek: holidayName }
const _tpColorPalette = [
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
let _tpTaskColorMap = {};

async function renderBanGiaoDiemPage(container) {
    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser.role);
    _tpIsReadonly = !isManager;
    _tpCurrentWeekStart = null; // Always reset to current week on page load

    // Load departments
    try {
        const d = await apiCall('/api/task-points/departments');
        const raw = d.departments || [];
        _tpAllDepts = raw.filter(d => !d.name.startsWith('HỆ THỐNG'));
        _tpActiveDeptIds = d.active_dept_ids || [];
    } catch(e) { _tpAllDepts = []; _tpActiveDeptIds = []; }

    const activeDepts = _tpAllDepts.filter(d => _tpActiveDeptIds.includes(d.id));

    container.innerHTML = `
    <div style="max-width:1500px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">🏪 Bàn Giao CV Điểm</h2>
            ${isManager ? `<div style="display:flex;gap:8px;">
                <button onclick="_tpShowTaskLibrary()" style="padding:7px 16px;border-radius:8px;border:1px solid #2563eb;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">📦 Kho Công Việc</button>
                <button onclick="_tpShowHolidayManager()" style="padding:7px 16px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">📅 Quản lý ngày nghỉ</button>
            </div>` : ''}
        </div>
        <input type="hidden" id="tpTargetType" value="team">
        <select id="tpUserSelect" style="display:none;"><option value=""></option></select>
        <select id="tpDeptSelect" style="display:none;"><option value=""></option></select>

        <div style="display:flex;gap:16px;align-items:flex-start;">
            <!-- LEFT: Dept list -->
            <div style="min-width:200px;max-width:220px;background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.06);flex-shrink:0;">
                <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Phòng ban</div>
                <div id="tpDeptList" style="max-height:calc(100vh - 200px);overflow-y:auto;">
                    ${activeDepts.map((d, i) => `
                        <div class="tp-dept-item" data-id="${d.id}" onclick="_tpSelectDept(${d.id})" style="padding:10px 14px;font-size:13px;color:#374151;cursor:pointer;border-bottom:1px solid #f9fafb;transition:all .15s;${i === 0 ? 'background:#eff6ff;color:#122546;font-weight:600;border-left:3px solid #2563eb;' : 'border-left:3px solid transparent;'}" onmouseover="if(!this.classList.contains('tp-active'))this.style.background='#f9fafb'" onmouseout="if(!this.classList.contains('tp-active'))this.style.background='white'">
                            ${d.name}
                        </div>
                    `).join('')}
                </div>
                ${isManager ? `<div style="padding:8px 10px;border-top:1px solid #f3f4f6;">
                    <button onclick="_tpShowCreateDeptModal()" id="tpCreateBtn" style="width:100%;padding:7px;border-radius:6px;border:1px dashed #16a34a;background:rgba(22,163,74,0.04);color:#16a34a;font-size:12px;cursor:pointer;font-weight:600;">＋ Tạo mới</button>
                </div>` : ''}
            </div>

            <!-- RIGHT: Grid -->
            <div style="flex:1;min-width:0;">
                <div id="tpGridWrap" style="overflow-x:auto;background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="padding:50px;text-align:center;color:#9ca3af;font-size:14px;">
                        <div style="font-size:40px;margin-bottom:12px;">📋</div>
                        ${activeDepts.length > 0 ? 'Chọn phòng ban bên trái để xem lịch' : 'Chưa có phòng ban nào. Ấn <b>＋ Tạo mới</b> để bắt đầu.'}
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Auto-select first dept
    if (activeDepts.length > 0) {
        _tpTarget = { type: 'team', id: activeDepts[0].id };
        _tpLoadTasks();
    }
}

// Show modal to create template for dept or individual
function _tpShowCreateDeptModal() {
    const modal = document.createElement('div');
    modal.id = 'tpCreateDeptModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;width:min(420px,90vw);border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:16px;color:#122546;">＋ Tạo lịch công việc</h3>
            <button onclick="document.getElementById('tpCreateDeptModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Phòng ban / Team <span style="color:#dc2626;">*</span></label>
            <select id="tpNewDeptSelect" onchange="_tpLoadCreateUsers()" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                ${_tpAllDepts.filter(d => !_tpActiveDeptIds.includes(d.id)).map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
        </div>
        <div style="margin-bottom:6px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Nhân viên <span style="color:#9ca3af;font-weight:400;">(không chọn = lịch team)</span></label>
            <select id="tpNewUserSelect" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                <option value="">— Toàn bộ Team —</option>
            </select>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px;">💡 Để trống = lịch chung cho cả team. Chọn NV = lịch riêng cho người đó.</div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button onclick="document.getElementById('tpCreateDeptModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_tpActivateDept()" style="padding:8px 20px;border-radius:6px;border:none;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600;">✅ Tạo</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    // Auto-load users for first dept
    _tpLoadCreateUsers();
}

async function _tpLoadCreateUsers() {
    const deptId = document.getElementById('tpNewDeptSelect')?.value;
    const userSel = document.getElementById('tpNewUserSelect');
    if (!deptId || !userSel) return;
    try {
        const u = await apiCall(`/api/task-points/users?department_id=${deptId}`);
        const users = u.users || [];
        userSel.innerHTML = '<option value="">— Toàn bộ Team —</option>' + users.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
    } catch(e) {
        userSel.innerHTML = '<option value="">— Toàn bộ Team —</option>';
    }
}

function _tpActivateDept() {
    const deptSel = document.getElementById('tpNewDeptSelect');
    const userSel = document.getElementById('tpNewUserSelect');
    if (!deptSel) return;
    const deptId = Number(deptSel.value);
    const deptName = deptSel.options[deptSel.selectedIndex]?.text;
    const userId = userSel?.value ? Number(userSel.value) : null;
    const userName = userId ? userSel.options[userSel.selectedIndex]?.text : null;
    document.getElementById('tpCreateDeptModal')?.remove();

    const targetType = userId ? 'individual' : 'team';
    const targetId = userId || deptId;
    const itemKey = `${targetType}-${targetId}`;
    const label = userId ? `👤 ${userName}` : deptName;

    // Check duplicate
    const existing = document.querySelector(`.tp-dept-item[data-key="${itemKey}"]`);
    if (existing) {
        _tpSelectItem(targetType, targetId);
        showToast('Đã có lịch này rồi!', 'info');
        return;
    }

    // Add to left sidebar
    if (targetType === 'team') _tpActiveDeptIds.push(deptId);
    const list = document.getElementById('tpDeptList');
    if (list) {
        const div = document.createElement('div');
        div.className = 'tp-dept-item';
        div.dataset.key = itemKey;
        div.dataset.type = targetType;
        div.dataset.id = targetId;
        div.onclick = () => _tpSelectItem(targetType, targetId);
        div.style.cssText = `padding:10px 14px;font-size:13px;color:#374151;cursor:pointer;border-bottom:1px solid #f9fafb;transition:all .15s;border-left:3px solid transparent;${userId ? 'padding-left:22px;' : ''}`;
        div.innerHTML = label;
        div.onmouseover = function(){ if(!this.classList.contains('tp-active')) this.style.background='#f9fafb'; };
        div.onmouseout = function(){ if(!this.classList.contains('tp-active')) this.style.background='white'; };
        list.appendChild(div);
    }
    _tpSelectItem(targetType, targetId);
    showToast(`✅ Đã tạo lịch cho ${userId ? userName : deptName}`);
}

function _tpSelectDept(deptId) { _tpSelectItem('team', deptId); }

function _tpSelectItem(targetType, targetId) {
    const itemKey = `${targetType}-${targetId}`;
    document.querySelectorAll('.tp-dept-item').forEach(el => {
        const isActive = el.dataset.key === itemKey || (!el.dataset.key && el.dataset.id == targetId && targetType === 'team');
        el.classList.toggle('tp-active', isActive);
        el.style.background = isActive ? '#eff6ff' : 'white';
        el.style.color = isActive ? '#122546' : '#374151';
        el.style.fontWeight = isActive ? '600' : '400';
        el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid transparent';
    });
    _tpTarget = { type: targetType, id: targetId };
    _tpLoadTasks();
}

async function _tpLoadTasks() {
    if (!_tpTarget.id) return;

    // Init week to current week if not set
    if (!_tpCurrentWeekStart) {
        const now = new Date();
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        _tpCurrentWeekStart = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
    }

    try {
        const d = await apiCall(`/api/task-points?target_type=${_tpTarget.type}&target_id=${_tpTarget.id}`);
        _tpTasks = d.tasks || [];
    } catch(e) { _tpTasks = []; }

    // Load holidays for this week
    try {
        const dateStr = _tpCurrentWeekStart.toISOString().slice(0, 10);
        const h = await apiCall(`/api/holidays/week?date=${dateStr}`);
        _tpHolidayMap = h.holidays || {};
    } catch(e) { _tpHolidayMap = {}; }

    _tpRenderGrid();
}

function _tpGetTaskColor(taskName) {
    if (!_tpTaskColorMap[taskName]) {
        const idx = Object.keys(_tpTaskColorMap).length % _tpColorPalette.length;
        _tpTaskColorMap[taskName] = _tpColorPalette[idx];
    }
    return _tpTaskColorMap[taskName];
}

function _tpChangeWeek(offset) {
    if (!_tpCurrentWeekStart) return;
    const d = new Date(_tpCurrentWeekStart);
    d.setDate(d.getDate() + offset * 7);
    _tpCurrentWeekStart = d;
    _tpLoadTasks();
}

function _tpFormatDate(date) {
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
}

function _tpRenderGrid() {
    const wrap = document.getElementById('tpGridWrap');
    if (!wrap) return;

    // Build color map from unique task names (reset each render)
    _tpTaskColorMap = {};
    const uniqueNames = [...new Set(_tpTasks.map(t => t.task_name))];
    uniqueNames.forEach(name => _tpGetTaskColor(name));

    // Group tasks by day
    const byDay = {};
    for (let d = 1; d <= 7; d++) byDay[d] = [];
    _tpTasks.forEach(t => { if (byDay[t.day_of_week]) byDay[t.day_of_week].push(t); });

    // Collect all unique time slots and sort
    const allSlots = new Set();
    _tpTasks.forEach(t => allSlots.add(t.time_start + '|' + t.time_end));
    const sortedSlots = [...allSlots].sort((a, b) => a.localeCompare(b));

    // Calculate totals per day (skip holidays)
    const dayTotals = {};
    for (let d = 1; d <= 7; d++) dayTotals[d] = _tpHolidayMap[d] ? 0 : (byDay[d] || []).reduce((s, t) => s + (t.points || 0), 0);

    // Week navigation
    const monDate = _tpCurrentWeekStart ? new Date(_tpCurrentWeekStart) : new Date();
    const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6);

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;border-radius:10px 10px 0 0;">
        <button onclick="_tpChangeWeek(-1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">◀ Tuần trước</button>
        <div style="font-weight:700;color:#122546;font-size:14px;">📅 ${_tpFormatDate(monDate)} — ${_tpFormatDate(sunDate)}/${monDate.getFullYear()}</div>
        <button onclick="_tpChangeWeek(1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">Tuần sau ▶</button>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header with dates
    html += `<thead><tr>`;
    html += `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:105px;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;">Khung giờ</th>`;
    for (let d = 1; d <= 7; d++) {
        const isHoliday = !!_tpHolidayMap[d];
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateLabel = _tpFormatDate(colDate);
        if (isHoliday) {
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:160px;background:#fef2f2;">
                <div style="font-weight:700;color:#dc2626;font-size:13px;">${DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:4px;font-size:11px;color:#dc2626;">🏖️ ${_tpHolidayMap[d]}</div>
            </th>`;
        } else {
            const total = dayTotals[d];
            const pct = Math.min(total, 100);
            const barColor = total === 100 ? '#16a34a' : total > 100 ? '#dc2626' : '#d97706';
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:160px;background:#f8fafc;">
                <div style="font-weight:700;color:#122546;font-size:13px;">${DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:6px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .3s;"></div>
                </div>
                <div style="font-size:10px;margin-top:3px;color:${barColor};font-weight:600;">${total}/100đ</div>
            </th>`;
        }
    }
    html += `</tr></thead>`;

    // Body — one row per time slot
    html += `<tbody>`;
    if (sortedSlots.length === 0) {
        html += `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9ca3af;border-bottom:1px solid #f3f4f6;">
            Chưa có công việc nào.${!_tpIsReadonly ? ' Ấn <b>+ Thêm</b> để bắt đầu.' : ''}
        </td></tr>`;
    } else {
        sortedSlots.forEach((slot, idx) => {
            const [tStart, tEnd] = slot.split('|');
            const isLast = idx === sortedSlots.length - 1;
            const borderB = isLast ? 'none' : '1px solid #f3f4f6';
            html += `<tr>`;
            // Time column
            html += `<td style="padding:10px 14px;border-bottom:${borderB};background:#fafbfc;vertical-align:top;">
                <div style="font-weight:700;color:#122546;font-size:14px;">${tStart}</div>
                <div style="color:#9ca3af;font-size:11px;margin-top:1px;">→ ${tEnd}</div>
            </td>`;
            for (let d = 1; d <= 7; d++) {
                if (_tpHolidayMap[d]) {
                    // Holiday column — greyed out
                    html += `<td style="padding:8px 10px;border-bottom:${borderB};background:#fef2f2;vertical-align:middle;text-align:center;">
                        <div style="color:#fca5a5;font-size:18px;">🏖️</div>
                    </td>`;
                    continue;
                }
                const task = byDay[d].find(t => t.time_start + '|' + t.time_end === slot);
                if (task) {
                    const c = _tpGetTaskColor(task.task_name);
                    html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                        <div style="background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;padding:12px 14px;text-align:center;">
                            <div style="font-weight:700;color:${c.text};font-size:14px;margin-bottom:8px;">${task.task_name}</div>
                            <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;">
                                <span style="background:${c.badge};color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${task.points}đ</span>
                                <span style="background:${c.tag};color:${c.text};padding:2px 8px;border-radius:6px;font-size:10px;">≥ ${task.min_quantity} lần</span>
                                ${task.guide_url ? `<a href="${task.guide_url}" target="_blank" style="font-size:10px;color:${c.badge};text-decoration:none;background:${c.tag};padding:2px 8px;border-radius:6px;">📘 Hướng dẫn</a>` : ''}
                            </div>
                            <div style="font-size:10px;color:#9ca3af;margin-top:6px;">🕐 ${tStart} — ${tEnd}</div>
                            ${!_tpIsReadonly ? `<div style="margin-top:8px;display:flex;justify-content:center;gap:6px;">
                                <button onclick="_tpEditTask(${task.id})" style="padding:3px 10px;font-size:11px;border:1px solid ${c.border};border-radius:5px;background:white;color:${c.text};cursor:pointer;font-weight:500;">✏️ Sửa</button>
                                <button onclick="_tpDeleteTask(${task.id})" style="padding:3px 10px;font-size:11px;border:1px solid #fecaca;border-radius:5px;background:#fff5f5;color:#dc2626;cursor:pointer;font-weight:500;">🗑️ Xóa</button>
                            </div>` : ''}
                        </div>
                    </td>`;
                } else {
                    html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:middle;text-align:center;color:#d1d5db;font-size:20px;">—</td>`;
                }
            }
            html += `</tr>`;
        });
    }
    html += `</tbody>`;

    // Footer — Add buttons (skip holidays)
    if (!_tpIsReadonly) {
        html += `<tfoot><tr>`;
        html += `<td style="padding:8px 14px;background:#fafbfc;font-weight:600;font-size:11px;color:#9ca3af;border-top:2px solid #e5e7eb;">THÊM</td>`;
        for (let d = 1; d <= 7; d++) {
            if (_tpHolidayMap[d]) {
                html += `<td style="padding:8px;text-align:center;background:#fef2f2;border-top:2px solid #e5e7eb;"></td>`;
            } else {
                html += `<td style="padding:8px;text-align:center;background:#fafbfc;border-top:2px solid #e5e7eb;">
                <button onclick="_tpAddTask(${d})" style="padding:5px 14px;font-size:12px;border:1px dashed #93c5fd;border-radius:6px;background:rgba(37,99,235,0.04);color:#2563eb;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#eff6ff';this.style.borderColor='#2563eb'" onmouseout="this.style.background='rgba(37,99,235,0.04)';this.style.borderColor='#93c5fd'">＋ Thêm</button>
            </td>`;
            }
        }
        html += `</tr></tfoot>`;
    }

    html += `</table>`;
    wrap.innerHTML = html;
}

function _tpAddTask(dayOfWeek) {
    _tpShowPickFromLibrary(dayOfWeek);
}

function _tpEditTask(taskId) {
    const task = _tpTasks.find(t => t.id === taskId);
    if (!task) return;
    _tpShowTaskModal(task, task.day_of_week);
}

async function _tpDeleteTask(taskId) {
    if (!confirm('Xóa công việc này?')) return;
    try {
        await apiCall(`/api/task-points/${taskId}`, 'DELETE');
        showToast('✅ Đã xóa');
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

function _tpShowTaskModal(task, dayOfWeek, prefill) {
    const isEdit = !!task;
    const pf = prefill || {}; // pre-fill from library
    const title = isEdit ? '✏️ Sửa công việc' : `＋ Thêm công việc — ${DAY_NAMES[dayOfWeek]}`;

    // Days checkboxes for multi-day add
    const daysHtml = !isEdit ? `
    <div style="margin-top:12px;">
        <label style="font-weight:600;font-size:13px;color:#374151;">Áp dụng cho ngày:</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${[1,2,3,4,5,6,7].map(d => `
                <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;color:#374151;padding:4px 8px;border:1px solid ${d === dayOfWeek ? '#2563eb' : '#e5e7eb'};border-radius:6px;background:${d === dayOfWeek ? '#eff6ff' : 'white'};">
                    <input type="checkbox" class="tpDayCb" value="${d}" ${d === dayOfWeek ? 'checked' : ''} style="cursor:pointer;accent-color:#2563eb;">
                    ${DAY_NAMES[d]}
                </label>
            `).join('')}
        </div>
    </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'tpModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;width:min(460px,90vw);max-height:90vh;overflow-y:auto;border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
            <h3 style="margin:0;font-size:16px;color:#122546;font-weight:700;">${title}</h3>
            <button onclick="document.getElementById('tpModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">×</button>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Tên công việc <span style="color:#dc2626;">*</span></label>
            <input id="tpFTask" type="text" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.task_name : (pf.task_name || '')}" placeholder="VD: Gọi điện Telesale" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Điểm <span style="color:#dc2626;">*</span></label>
                <input id="tpFPoints" type="number" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.points : (pf.points || '')}" placeholder="20" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">SL tối thiểu <span style="color:#dc2626;">*</span></label>
                <input id="tpFMinQty" type="number" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.min_quantity : (pf.min_quantity || '1')}" placeholder="15" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Giờ bắt đầu <span style="color:#dc2626;">*</span></label>
                <input id="tpFStart" type="time" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.time_start : ''}" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Giờ kết thúc <span style="color:#dc2626;">*</span></label>
                <input id="tpFEnd" type="time" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.time_end : ''}" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
        </div>
        <div style="margin-bottom:8px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Link hướng dẫn CV</label>
            <input id="tpFGuide" type="url" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? (task.guide_url || '') : (pf.guide_url || '')}" placeholder="https://docs.google.com/..." onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div style="margin-bottom:8px;padding:10px 12px;background:#fef3c7;border-radius:8px;border:1px solid #fde68a;display:flex;align-items:center;gap:8px;">
            <input id="tpFApproval" type="checkbox" ${(task && task.requires_approval) || pf.requires_approval ? 'checked' : ''} style="width:16px;height:16px;accent-color:#d97706;cursor:pointer;">
            <label for="tpFApproval" style="font-size:13px;color:#78350f;cursor:pointer;font-weight:600;">🔒 Cần duyệt <span style="font-weight:400;font-size:11px;color:#92400e;">(Quản lý/TP phải duyệt mới tính điểm)</span></label>
        </div>
        ${daysHtml}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:12px;border-top:1px solid #f3f4f6;">
            <button onclick="document.getElementById('tpModal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;font-weight:500;">Hủy</button>
            <button onclick="_tpSaveTask(${isEdit ? task.id : 'null'}, ${dayOfWeek})" style="padding:9px 22px;border-radius:8px;border:none;background:#122546;color:white;cursor:pointer;font-size:13px;font-weight:600;">💾 Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function _tpSaveTask(editId, defaultDay) {
    const task_name = document.getElementById('tpFTask').value.trim();
    const points = Number(document.getElementById('tpFPoints').value) || 0;
    const min_quantity = Number(document.getElementById('tpFMinQty').value) || 1;
    const time_start = document.getElementById('tpFStart').value;
    const time_end = document.getElementById('tpFEnd').value;
    const guide_url = document.getElementById('tpFGuide').value.trim();
    const requires_approval = document.getElementById('tpFApproval')?.checked || false;

    if (!task_name || !time_start || !time_end) { showToast('Vui lòng điền đầy đủ!', 'error'); return; }

    try {
        if (editId) {
            // Update
            await apiCall(`/api/task-points/${editId}`, 'PUT', {
                task_name, points, min_quantity, time_start, time_end, guide_url, day_of_week: defaultDay, sort_order: 0, requires_approval
            });
            showToast('✅ Đã cập nhật');
        } else {
            // Create — for each checked day
            const checkedDays = [...document.querySelectorAll('.tpDayCb:checked')].map(cb => Number(cb.value));
            if (checkedDays.length === 0) { showToast('Chọn ít nhất 1 ngày!', 'error'); return; }

            for (const day of checkedDays) {
                await apiCall('/api/task-points', 'POST', {
                    target_type: _tpTarget.type, target_id: _tpTarget.id,
                    day_of_week: day, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order: 0, requires_approval
                });
            }
            showToast(`✅ Đã thêm ${checkedDays.length} công việc`);
        }
        document.getElementById('tpModal')?.remove();
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi: ' + (e.message || 'Unknown'), 'error'); }
}

async function _tpCopyToIndividual() {
    const deptId = document.getElementById('tpDeptSelect').value;
    const userId = document.getElementById('tpUserSelect').value;
    if (!deptId || !userId) { showToast('Chọn phòng ban và nhân viên!', 'error'); return; }
    if (!confirm('Copy toàn bộ lịch công việc từ Team sang nhân viên này?\nLịch cũ của nhân viên sẽ bị xóa.')) return;

    try {
        const r = await apiCall('/api/task-points/copy-to-individual', 'POST', { team_id: Number(deptId), user_id: Number(userId) });
        showToast(`✅ Đã copy ${r.copied} công việc`);
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

// ===== HOLIDAY MANAGER =====
async function _tpShowHolidayManager() {
    const year = new Date().getFullYear();
    const modal = document.createElement('div');
    modal.id = 'tpHolidayModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;width:min(520px,92vw);max-height:85vh;display:flex;flex-direction:column;border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #f3f4f6;">
            <h3 style="margin:0;font-size:16px;color:#122546;font-weight:700;">📅 Quản lý ngày nghỉ lễ</h3>
            <button onclick="document.getElementById('tpHolidayModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">×</button>
        </div>
        <div style="padding:14px 20px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:10px;">
            <label style="font-weight:600;font-size:13px;color:#6b7280;">Năm:</label>
            <select id="tpHolidayYear" onchange="_tpLoadHolidayList()" style="padding:5px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;">
                ${[year-1, year, year+1].map(y => `<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}
            </select>
        </div>
        <div id="tpHolidayList" style="flex:1;overflow-y:auto;padding:12px 20px;min-height:150px;">
            <div style="text-align:center;color:#9ca3af;padding:30px;">Đang tải...</div>
        </div>
        <div style="padding:14px 20px;border-top:1px solid #f3f4f6;">
            <div style="font-weight:600;font-size:13px;color:#374151;margin-bottom:8px;">＋ Thêm ngày nghỉ mới</div>
            <div style="display:flex;gap:8px;align-items:flex-end;">
                <div style="flex:1;">
                    <label style="font-size:11px;color:#6b7280;">Từ ngày</label>
                    <input id="tpHNewDate" type="date" style="width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                </div>
                <div style="flex:1;">
                    <label style="font-size:11px;color:#6b7280;">Đến ngày <span style="color:#9ca3af;">(bỏ trống = 1 ngày)</span></label>
                    <input id="tpHNewDateEnd" type="date" style="width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                </div>
                <div style="flex:1.5;">
                    <label style="font-size:11px;color:#6b7280;">Tên ngày lễ</label>
                    <input id="tpHNewName" type="text" placeholder="VD: Giỗ Tổ Hùng Vương" style="width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                </div>
                <button onclick="_tpAddHoliday()" style="padding:7px 16px;border-radius:6px;border:none;background:#16a34a;color:white;font-size:13px;cursor:pointer;font-weight:600;white-space:nowrap;">＋ Thêm</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    _tpLoadHolidayList();
}

async function _tpLoadHolidayList() {
    const year = document.getElementById('tpHolidayYear')?.value || new Date().getFullYear();
    const listEl = document.getElementById('tpHolidayList');
    if (!listEl) return;

    let holidays = [];
    try {
        const d = await apiCall(`/api/holidays?year=${year}`);
        holidays = d.holidays || [];
    } catch(e) {}

    if (holidays.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:30px;font-size:13px;">Chưa có ngày nghỉ nào cho năm ' + year + '</div>';
        return;
    }

    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
    html += `<thead><tr>
        <th style="text-align:left;padding:6px 8px;color:#6b7280;font-size:11px;border-bottom:1px solid #e5e7eb;font-weight:600;">NGÀY</th>
        <th style="text-align:left;padding:6px 8px;color:#6b7280;font-size:11px;border-bottom:1px solid #e5e7eb;font-weight:600;">TÊN NGÀY LỄ</th>
        <th style="width:50px;border-bottom:1px solid #e5e7eb;"></th>
    </tr></thead><tbody>`;
    holidays.forEach(h => {
        const d = new Date(h.holiday_date);
        const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];
        const dayName = dayNames[d.getDay()];
        html += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px;color:#122546;font-weight:600;">${dateStr} <span style="color:#9ca3af;font-weight:400;">(${dayName})</span></td>
            <td style="padding:8px;color:#374151;">${h.holiday_name}</td>
            <td style="padding:8px;text-align:center;">
                <button onclick="_tpDeleteHoliday(${h.id})" style="padding:2px 8px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    listEl.innerHTML = html;
}

async function _tpAddHoliday() {
    const dateVal = document.getElementById('tpHNewDate')?.value;
    const dateEndVal = document.getElementById('tpHNewDateEnd')?.value;
    const nameVal = document.getElementById('tpHNewName')?.value?.trim();
    if (!dateVal || !nameVal) { showToast('Nhập đầy đủ ngày và tên!', 'error'); return; }

    // Build list of dates
    const dates = [];
    const start = new Date(dateVal);
    const end = dateEndVal ? new Date(dateEndVal) : new Date(dateVal);
    if (end < start) { showToast('Đến ngày phải sau Từ ngày!', 'error'); return; }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
    }

    let ok = 0;
    try {
        for (const dt of dates) {
            try {
                await apiCall('/api/holidays', 'POST', { holiday_date: dt, holiday_name: nameVal });
                ok++;
            } catch(e) {} // skip duplicates
        }
        showToast(`✅ Đã thêm ${ok} ngày nghỉ`);
        document.getElementById('tpHNewDate').value = '';
        document.getElementById('tpHNewDateEnd').value = '';
        document.getElementById('tpHNewName').value = '';
        _tpLoadHolidayList();
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

async function _tpDeleteHoliday(id) {
    if (!confirm('Xóa ngày nghỉ này?')) return;
    try {
        await apiCall(`/api/holidays/${id}`, 'DELETE');
        showToast('✅ Đã xóa');
        _tpLoadHolidayList();
        _tpLoadTasks(); // Refresh grid
    } catch(e) { showToast('Lỗi!', 'error'); }
}

// ===== KHO CÔNG VIỆC (TASK LIBRARY) =====
let _tpLibraryTasks = [];
let _tpLibFilterDeptId = '';

async function _tpShowTaskLibrary() {
    _tpLibFilterDeptId = '';
    // Pre-load all library tasks to get counts
    try {
        const d = await apiCall('/api/task-library');
        _tpLibraryTasks = d.tasks || [];
    } catch(e) { _tpLibraryTasks = []; }

    // Count per dept
    const deptCounts = {};
    _tpLibraryTasks.forEach(t => {
        const did = t.department_id || 0;
        deptCounts[did] = (deptCounts[did] || 0) + 1;
    });

    const deptTabsHtml = _tpAllDepts.filter(d => (deptCounts[d.id] || 0) > 0).map(d => {
        const cnt = deptCounts[d.id];
        return `<button class="tpLibDeptTab" data-id="${d.id}" onclick="_tpSelectLibDept('${d.id}')" style="padding:6px 14px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:all .15s;">${d.name} <span style="background:#e5e7eb;color:#374151;padding:0 7px;border-radius:10px;font-size:11px;font-weight:700;min-width:18px;text-align:center;">${cnt}</span></button>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'tpLibModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(720px,92vw);max-height:90vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid #e5e7eb;box-shadow:0 25px 60px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:17px;color:white;font-weight:700;">📦 Kho Công Việc</h3>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">Quản lý tất cả công việc để tái sử dụng · ${_tpLibraryTasks.length} CV</div>
            </div>
            <button onclick="document.getElementById('tpLibModal').remove()" style="background:rgba(255,255,255,0.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:12px 22px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;overflow-x:auto;">
            <button class="tpLibDeptTab" data-id="" onclick="_tpSelectLibDept('')" style="padding:6px 14px;border-radius:20px;border:2px solid #2563eb;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px;white-space:nowrap;">Tất cả <span style="background:#2563eb;color:white;padding:0 7px;border-radius:10px;font-size:11px;font-weight:700;min-width:18px;text-align:center;">${_tpLibraryTasks.length}</span></button>
            ${deptTabsHtml}
            <div style="flex:1;"></div>
            <button onclick="_tpShowLibAddModal()" style="padding:6px 16px;border-radius:20px;border:none;background:#16a34a;color:white;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;">＋ Thêm CV mới</button>
        </div>
        <div id="tpLibList" style="flex:1;overflow-y:auto;padding:12px 22px;"></div>
    </div>`;
    document.body.appendChild(modal);
    _tpRenderLibList();
}

function _tpSelectLibDept(deptId) {
    _tpLibFilterDeptId = deptId;
    // Update tab styles
    document.querySelectorAll('.tpLibDeptTab').forEach(btn => {
        const id = btn.dataset.id;
        const active = id === String(deptId);
        btn.style.border = active ? '2px solid #2563eb' : '1px solid #e5e7eb';
        btn.style.background = active ? '#eff6ff' : 'white';
        btn.style.color = active ? '#2563eb' : '#374151';
        btn.style.fontWeight = active ? '700' : '600';
        // Update count badge
        const badge = btn.querySelector('span');
        if (badge) {
            badge.style.background = active ? '#2563eb' : '#e5e7eb';
            badge.style.color = active ? 'white' : '#374151';
        }
    });
    _tpRenderLibList();
}

async function _tpLoadLibrary() {
    try {
        const url = _tpLibFilterDeptId ? `/api/task-library?department_id=${_tpLibFilterDeptId}` : '/api/task-library';
        const d = await apiCall(url);
        _tpLibraryTasks = d.tasks || [];
    } catch(e) { _tpLibraryTasks = []; }
    _tpRenderLibList();
}

function _tpRenderLibList() {
    const wrap = document.getElementById('tpLibList');
    if (!wrap) return;

    let filtered = _tpLibraryTasks;
    if (_tpLibFilterDeptId) filtered = filtered.filter(t => t.department_id === Number(_tpLibFilterDeptId));

    if (filtered.length === 0) {
        wrap.innerHTML = '<div style="padding:30px;text-align:center;color:#9ca3af;font-size:14px;">📦 Chưa có công việc nào trong kho.<br>Ấn <b>＋ Thêm CV mới</b> để bắt đầu.</div>';
        return;
    }

    // Group by department
    const byDept = {};
    filtered.forEach(t => {
        const key = t.dept_name || 'Chưa gán phòng';
        if (!byDept[key]) byDept[key] = [];
        byDept[key].push(t);
    });

    let html = '';
    Object.keys(byDept).sort().forEach(deptName => {
        html += `<div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f3f4f6;">🏢 ${deptName} (${byDept[deptName].length})</div>`;
        byDept[deptName].forEach(t => {
            const c = _tpGetTaskColor(t.task_name);
            html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;margin-bottom:6px;">
                <div style="flex:1;">
                    <div style="font-weight:700;color:${c.text};font-size:14px;">${t.task_name}</div>
                    <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                        <span style="background:${c.badge};color:white;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;">${t.points}đ</span>
                        <span style="background:${c.tag};color:${c.text};padding:1px 6px;border-radius:4px;font-size:10px;">≥ ${t.min_quantity} lần</span>
                        ${t.requires_approval ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:10px;">🔒 Duyệt</span>' : ''}
                        ${t.guide_url ? '<span style="font-size:10px;color:#2563eb;">📘 Có HD</span>' : ''}
                    </div>
                </div>
                <div style="display:flex;gap:4px;">
                    <button onclick="_tpEditLibTask(${t.id})" style="padding:4px 10px;border:1px solid ${c.border};border-radius:5px;background:white;color:${c.text};font-size:11px;cursor:pointer;">✏️</button>
                    <button onclick="_tpDeleteLibTask(${t.id})" style="padding:4px 10px;border:1px solid #fecaca;border-radius:5px;background:#fff5f5;color:#dc2626;font-size:11px;cursor:pointer;">🗑️</button>
                </div>
            </div>`;
        });
        html += `</div>`;
    });
    wrap.innerHTML = html;
}

function _tpShowLibAddModal(editTask) {
    const isEdit = !!editTask;
    const m = document.createElement('div');
    m.id = 'tpLibAddModal';
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000;';
    m.innerHTML = `
    <div style="background:white;border-radius:12px;padding:22px;width:min(440px,90vw);border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <h3 style="margin:0 0 16px;font-size:16px;color:#122546;">${isEdit ? '✏️ Sửa công việc' : '＋ Thêm công việc vào kho'}</h3>
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:12px;color:#374151;">Phòng ban <span style="color:#dc2626;">*</span></label>
            <select id="tpLibDept" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
                <option value="">-- Chọn phòng --</option>
                ${_tpAllDepts.map(d => `<option value="${d.id}" ${editTask && editTask.department_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:12px;color:#374151;">Tên công việc <span style="color:#dc2626;">*</span></label>
            <input id="tpLibName" type="text" value="${editTask ? editTask.task_name : ''}" placeholder="VD: Gọi điện Telesale" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
                <label style="font-weight:600;font-size:12px;color:#374151;">Điểm</label>
                <input id="tpLibPoints" type="number" value="${editTask ? editTask.points : 20}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
            </div>
            <div>
                <label style="font-weight:600;font-size:12px;color:#374151;">SL tối thiểu</label>
                <input id="tpLibMinQty" type="number" value="${editTask ? editTask.min_quantity : 1}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
            </div>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:12px;color:#374151;">Link hướng dẫn</label>
            <input id="tpLibGuide" type="url" value="${editTask ? (editTask.guide_url || '') : ''}" placeholder="https://..." style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:16px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;cursor:pointer;">
                <input type="checkbox" id="tpLibApproval" ${editTask && editTask.requires_approval ? 'checked' : ''} style="accent-color:#d97706;">
                🔒 Cần quản lý duyệt
            </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button onclick="document.getElementById('tpLibAddModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_tpSaveLibTask(${isEdit ? editTask.id : 'null'})" style="padding:8px 20px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600;">💾 Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _tpSaveLibTask(editId) {
    const dept = document.getElementById('tpLibDept')?.value;
    const name = document.getElementById('tpLibName')?.value?.trim();
    const points = document.getElementById('tpLibPoints')?.value;
    const minQty = document.getElementById('tpLibMinQty')?.value;
    const guide = document.getElementById('tpLibGuide')?.value?.trim();
    const approval = document.getElementById('tpLibApproval')?.checked;

    if (!name) { showToast('Nhập tên công việc!', 'error'); return; }
    if (!dept) { showToast('Chọn phòng ban!', 'error'); return; }

    const body = { task_name: name, points: Number(points) || 0, min_quantity: Number(minQty) || 1, guide_url: guide || null, requires_approval: approval, department_id: Number(dept) };

    try {
        if (editId) {
            await apiCall(`/api/task-library/${editId}`, 'PUT', body);
            showToast('✅ Đã cập nhật');
        } else {
            await apiCall('/api/task-library', 'POST', body);
            showToast('✅ Đã thêm vào kho');
        }
        document.getElementById('tpLibAddModal')?.remove();
        await _tpLoadLibrary();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

function _tpEditLibTask(id) {
    const task = _tpLibraryTasks.find(t => t.id === id);
    if (!task) return;
    _tpShowLibAddModal(task);
}

async function _tpDeleteLibTask(id) {
    if (!confirm('Xóa công việc này khỏi kho?')) return;
    try {
        await apiCall(`/api/task-library/${id}`, 'DELETE');
        showToast('✅ Đã xóa');
        await _tpLoadLibrary();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

// ===== THÊM TỪ KHO VÀO GRID =====
async function _tpShowPickFromLibrary(dayOfWeek) {
    // Load library for current dept
    const deptId = _tpTarget.type === 'team' ? _tpTarget.id : null;
    let tasks = [];
    try {
        const url = deptId ? `/api/task-library?department_id=${deptId}` : '/api/task-library';
        const d = await apiCall(url);
        tasks = d.tasks || [];
    } catch(e) { tasks = []; }

    if (tasks.length === 0) {
        showToast('Kho công việc trống! Hãy thêm CV vào Kho trước.', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'tpPickModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;';

    const tasksHtml = tasks.map(t => {
        const c = _tpGetTaskColor(t.task_name);
        return `<div onclick="_tpPickLibTask(${t.id},${dayOfWeek})" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;margin-bottom:6px;cursor:pointer;transition:all .15s;" onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform='none'">
            <div style="flex:1;">
                <div style="font-weight:700;color:${c.text};font-size:14px;">${t.task_name}</div>
                <div style="font-size:10px;color:#6b7280;margin-top:2px;">${t.points}đ · ≥${t.min_quantity} lần ${t.requires_approval ? '· 🔒Duyệt' : ''}</div>
            </div>
            <span style="color:${c.badge};font-size:18px;">→</span>
        </div>`;
    }).join('');

    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(460px,90vw);max-height:80vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:16px;color:#122546;">📦 Chọn CV từ Kho — ${DAY_NAMES[dayOfWeek]}</h3>
                <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Click để thêm vào lịch</div>
            </div>
            <button onclick="document.getElementById('tpPickModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:12px 20px;">${tasksHtml}</div>
        <div style="padding:10px 20px;border-top:1px solid #f3f4f6;text-align:center;">
            <button onclick="document.getElementById('tpPickModal').remove();_tpShowTaskModal(null,${dayOfWeek})" style="padding:6px 14px;border:1px dashed #6b7280;border-radius:6px;background:white;color:#6b7280;cursor:pointer;font-size:12px;">✏️ Hoặc tạo thủ công</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function _tpPickLibTask(libId, dayOfWeek) {
    const t = _tpLibraryTasks.length > 0 ? _tpLibraryTasks.find(x => x.id === libId) : null;
    if (!t) {
        // Fetch from API
        try {
            const d = await apiCall('/api/task-library');
            const found = (d.tasks || []).find(x => x.id === libId);
            if (found) return _tpPickLibTaskDo(found, dayOfWeek);
        } catch(e) {}
        showToast('Không tìm thấy CV!', 'error');
        return;
    }
    _tpPickLibTaskDo(t, dayOfWeek);
}

function _tpPickLibTaskDo(libTask, dayOfWeek) {
    document.getElementById('tpPickModal')?.remove();
    // Pre-fill the task modal with library data
    const task = {
        task_name: libTask.task_name,
        points: libTask.points,
        min_quantity: libTask.min_quantity,
        guide_url: libTask.guide_url,
        requires_approval: libTask.requires_approval
    };
    _tpShowTaskModal(null, dayOfWeek, task);
}
