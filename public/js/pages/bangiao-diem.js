// ========== BÀN GIAO CV ĐIỂM — Task Point Templates ==========
const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
let _tpTasks = [];
let _tpTarget = { type: 'team', id: null };
let _tpAllDepts = [];
let _tpActiveDeptIds = [];
let _tpUsers = [];
let _tpIsReadonly = false;

async function renderBanGiaoDiemPage(container) {
    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser.role);
    _tpIsReadonly = !isManager;

    // Load departments
    try {
        const d = await apiCall('/api/task-points/departments');
        _tpAllDepts = d.departments || [];
        _tpActiveDeptIds = d.active_dept_ids || [];
    } catch(e) { _tpAllDepts = []; _tpActiveDeptIds = []; }

    const activeDepts = _tpAllDepts.filter(d => _tpActiveDeptIds.includes(d.id));

    container.innerHTML = `
    <div style="max-width:1500px;margin:0 auto;padding:16px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#122546;font-weight:700;">🏪 Bàn Giao CV Điểm</h2>
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
                ${_tpAllDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
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

    try {
        const d = await apiCall(`/api/task-points?target_type=${_tpTarget.type}&target_id=${_tpTarget.id}`);
        _tpTasks = d.tasks || [];
    } catch(e) { _tpTasks = []; }

    _tpRenderGrid();
}

function _tpRenderGrid() {
    const wrap = document.getElementById('tpGridWrap');
    if (!wrap) return;

    // Group tasks by day
    const byDay = {};
    for (let d = 1; d <= 6; d++) byDay[d] = [];
    _tpTasks.forEach(t => { if (byDay[t.day_of_week]) byDay[t.day_of_week].push(t); });

    // Collect all unique time slots and sort
    const allSlots = new Set();
    _tpTasks.forEach(t => allSlots.add(t.time_start + '|' + t.time_end));
    const sortedSlots = [...allSlots].sort((a, b) => a.localeCompare(b));

    // Calculate totals per day
    const dayTotals = {};
    for (let d = 1; d <= 6; d++) dayTotals[d] = byDay[d].reduce((s, t) => s + (t.points || 0), 0);

    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header
    html += `<thead><tr>`;
    html += `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:105px;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;">Khung giờ</th>`;
    for (let d = 1; d <= 6; d++) {
        const total = dayTotals[d];
        const pct = Math.min(total, 100);
        const barColor = total === 100 ? '#16a34a' : total > 100 ? '#dc2626' : '#d97706';
        html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:160px;background:#f8fafc;">
            <div style="font-weight:700;color:#122546;font-size:13px;">${DAY_NAMES[d]}</div>
            <div style="margin-top:6px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .3s;"></div>
            </div>
            <div style="font-size:10px;margin-top:3px;color:${barColor};font-weight:600;">${total}/100đ</div>
        </th>`;
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
            for (let d = 1; d <= 6; d++) {
                const task = byDay[d].find(t => t.time_start + '|' + t.time_end === slot);
                if (task) {
                    html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                        <div style="background:#f0f7ff;border:1px solid #dbeafe;border-radius:8px;padding:12px 14px;text-align:center;">
                            <div style="font-weight:700;color:#122546;font-size:14px;margin-bottom:8px;">${task.task_name}</div>
                            <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;">
                                <span style="background:#122546;color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${task.points}đ</span>
                                <span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:6px;font-size:10px;">≥ ${task.min_quantity} lần</span>
                                ${task.guide_url ? `<a href="${task.guide_url}" target="_blank" style="font-size:10px;color:#2563eb;text-decoration:none;background:#eff6ff;padding:2px 8px;border-radius:6px;">📘 Hướng dẫn</a>` : ''}
                            </div>
                            <div style="font-size:10px;color:#9ca3af;margin-top:6px;">🕐 ${tStart} — ${tEnd}</div>
                            ${!_tpIsReadonly ? `<div style="margin-top:8px;display:flex;justify-content:center;gap:6px;">
                                <button onclick="_tpEditTask(${task.id})" style="padding:3px 10px;font-size:11px;border:1px solid #d1d5db;border-radius:5px;background:white;color:#374151;cursor:pointer;font-weight:500;">✏️ Sửa</button>
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

    // Footer — Add buttons
    if (!_tpIsReadonly) {
        html += `<tfoot><tr>`;
        html += `<td style="padding:8px 14px;background:#fafbfc;font-weight:600;font-size:11px;color:#9ca3af;border-top:2px solid #e5e7eb;">THÊM</td>`;
        for (let d = 1; d <= 6; d++) {
            html += `<td style="padding:8px;text-align:center;background:#fafbfc;border-top:2px solid #e5e7eb;">
                <button onclick="_tpAddTask(${d})" style="padding:5px 14px;font-size:12px;border:1px dashed #93c5fd;border-radius:6px;background:rgba(37,99,235,0.04);color:#2563eb;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#eff6ff';this.style.borderColor='#2563eb'" onmouseout="this.style.background='rgba(37,99,235,0.04)';this.style.borderColor='#93c5fd'">＋ Thêm</button>
            </td>`;
        }
        html += `</tr></tfoot>`;
    }

    html += `</table>`;
    wrap.innerHTML = html;
}

function _tpAddTask(dayOfWeek) {
    _tpShowTaskModal(null, dayOfWeek);
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

function _tpShowTaskModal(task, dayOfWeek) {
    const isEdit = !!task;
    const title = isEdit ? '✏️ Sửa công việc' : `＋ Thêm công việc — ${DAY_NAMES[dayOfWeek]}`;

    // Days checkboxes for multi-day add
    const daysHtml = !isEdit ? `
    <div style="margin-top:12px;">
        <label style="font-weight:600;font-size:13px;color:#374151;">Áp dụng cho ngày:</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${[1,2,3,4,5,6].map(d => `
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
            <input id="tpFTask" type="text" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.task_name : ''}" placeholder="VD: Gọi điện Telesale" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Điểm <span style="color:#dc2626;">*</span></label>
                <input id="tpFPoints" type="number" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.points : ''}" placeholder="20" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">SL tối thiểu <span style="color:#dc2626;">*</span></label>
                <input id="tpFMinQty" type="number" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.min_quantity : '1'}" placeholder="15" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
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
            <input id="tpFGuide" type="url" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? (task.guide_url || '') : ''}" placeholder="https://docs.google.com/..." onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
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

    if (!task_name || !time_start || !time_end) { showToast('Vui lòng điền đầy đủ!', 'error'); return; }

    try {
        if (editId) {
            // Update
            await apiCall(`/api/task-points/${editId}`, 'PUT', {
                task_name, points, min_quantity, time_start, time_end, guide_url, day_of_week: defaultDay, sort_order: 0
            });
            showToast('✅ Đã cập nhật');
        } else {
            // Create — for each checked day
            const checkedDays = [...document.querySelectorAll('.tpDayCb:checked')].map(cb => Number(cb.value));
            if (checkedDays.length === 0) { showToast('Chọn ít nhất 1 ngày!', 'error'); return; }

            for (const day of checkedDays) {
                await apiCall('/api/task-points', 'POST', {
                    target_type: _tpTarget.type, target_id: _tpTarget.id,
                    day_of_week: day, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order: 0
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
