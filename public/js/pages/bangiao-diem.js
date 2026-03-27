// ========== BÀN GIAO CV ĐIỂM — Task Point Templates ==========
const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
let _tpTasks = [];
let _tpTarget = { type: 'team', id: null };
let _tpDepts = [];
let _tpUsers = [];
let _tpIsReadonly = false;

async function renderBanGiaoDiemPage(container) {
    const isManager = ['giam_doc','quan_ly','truong_phong','trinh'].includes(currentUser.role);
    _tpIsReadonly = !isManager;

    // Load departments
    try {
        const d = await apiCall('/api/task-points/departments');
        _tpDepts = d.departments || [];
    } catch(e) { _tpDepts = []; }

    container.innerHTML = `
    <div style="max-width:1400px;margin:0 auto;padding:16px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:var(--text-primary);">🏪 Bàn Giao CV Điểm</h2>

        <!-- Target Selector -->
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:14px 18px;background:var(--card-bg);border-radius:10px;border:1px solid var(--border-color);">
            <label style="font-weight:600;font-size:13px;color:var(--text-secondary);">Áp dụng cho:</label>
            <select id="tpTargetType" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;" ${_tpIsReadonly ? 'disabled' : ''}>
                <option value="team">🏢 Team / Phòng ban</option>
                <option value="individual">👤 Cá nhân</option>
            </select>
            <select id="tpDeptSelect" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;">
                <option value="">-- Chọn phòng ban --</option>
                ${_tpDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
            <select id="tpUserSelect" style="display:none;padding:6px 10px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;">
                <option value="">-- Chọn nhân viên --</option>
            </select>
            ${isManager ? `<button onclick="_tpCopyToIndividual()" id="tpCopyBtn" style="display:none;padding:6px 12px;border-radius:6px;border:none;background:var(--primary);color:white;font-size:12px;cursor:pointer;font-weight:600;">📋 Copy từ Team</button>` : ''}
        </div>

        <!-- Grid -->
        <div id="tpGridWrap" style="overflow-x:auto;background:var(--card-bg);border-radius:10px;border:1px solid var(--border-color);">
            <div style="padding:40px;text-align:center;color:var(--text-secondary);font-size:14px;">
                👆 Chọn phòng ban hoặc nhân viên để xem lịch công việc
            </div>
        </div>
    </div>`;

    // Event listeners
    document.getElementById('tpTargetType').addEventListener('change', function() {
        const isIndividual = this.value === 'individual';
        document.getElementById('tpUserSelect').style.display = isIndividual ? '' : 'none';
        const copyBtn = document.getElementById('tpCopyBtn');
        if (copyBtn) copyBtn.style.display = isIndividual ? '' : 'none';
        if (!isIndividual) _tpLoadTasks();
    });

    document.getElementById('tpDeptSelect').addEventListener('change', async function() {
        const deptId = this.value;
        if (!deptId) return;
        // Load users for this dept
        try {
            const u = await apiCall(`/api/task-points/users?department_id=${deptId}`);
            _tpUsers = u.users || [];
        } catch(e) { _tpUsers = []; }
        const userSel = document.getElementById('tpUserSelect');
        userSel.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + _tpUsers.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');

        const targetType = document.getElementById('tpTargetType').value;
        if (targetType === 'team') _tpLoadTasks();
    });

    document.getElementById('tpUserSelect').addEventListener('change', function() {
        if (this.value) _tpLoadTasks();
    });
}

async function _tpLoadTasks() {
    const targetType = document.getElementById('tpTargetType').value;
    const deptId = document.getElementById('tpDeptSelect').value;
    const userId = document.getElementById('tpUserSelect')?.value;

    if (targetType === 'team' && deptId) {
        _tpTarget = { type: 'team', id: Number(deptId) };
    } else if (targetType === 'individual' && userId) {
        _tpTarget = { type: 'individual', id: Number(userId) };
    } else return;

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
    _tpTasks.forEach(t => allSlots.add(t.time_start + '-' + t.time_end));
    const sortedSlots = [...allSlots].sort((a, b) => a.localeCompare(b));

    // Calculate totals per day
    const dayTotals = {};
    for (let d = 1; d <= 6; d++) dayTotals[d] = byDay[d].reduce((s, t) => s + (t.points || 0), 0);

    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header
    html += `<thead><tr style="background:var(--bg-secondary);">`;
    html += `<th style="padding:10px 12px;text-align:left;border:1px solid var(--border-color);min-width:100px;font-weight:700;color:var(--text-secondary);font-size:11px;text-transform:uppercase;">Khung giờ</th>`;
    for (let d = 1; d <= 6; d++) {
        const total = dayTotals[d];
        const color = total === 100 ? '#22c55e' : total > 100 ? '#ef4444' : '#f59e0b';
        const icon = total === 100 ? '✅' : total > 100 ? '🔴' : '⚠️';
        html += `<th style="padding:10px 12px;text-align:center;border:1px solid var(--border-color);min-width:160px;">
            <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${DAY_NAMES[d]}</div>
            <div style="font-size:11px;margin-top:4px;color:${color};font-weight:600;">${icon} ${total}/100đ</div>
        </th>`;
    }
    html += `</tr></thead>`;

    // Body — one row per time slot
    html += `<tbody>`;
    if (sortedSlots.length === 0) {
        html += `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-secondary);border:1px solid var(--border-color);">
            Chưa có công việc nào.${!_tpIsReadonly ? ' Ấn <b>+ Thêm</b> để bắt đầu.' : ''}
        </td></tr>`;
    } else {
        sortedSlots.forEach(slot => {
            const [tStart, tEnd] = slot.split('-');
            html += `<tr>`;
            html += `<td style="padding:8px 12px;border:1px solid var(--border-color);background:var(--bg-secondary);font-weight:600;color:var(--text-primary);white-space:nowrap;vertical-align:top;">
                ${tStart}<br><span style="color:var(--text-secondary);font-weight:400;font-size:11px;">→ ${tEnd}</span>
            </td>`;
            for (let d = 1; d <= 6; d++) {
                const task = byDay[d].find(t => t.time_start + '-' + t.time_end === slot);
                if (task) {
                    html += `<td style="padding:6px 10px;border:1px solid var(--border-color);vertical-align:top;">
                        <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">${task.task_name}</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                            <span style="background:var(--primary);color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">${task.points}đ</span>
                            <span style="font-size:11px;color:var(--text-secondary);">TT ${task.min_quantity}</span>
                            ${task.guide_url ? `<a href="${task.guide_url}" target="_blank" style="font-size:11px;color:var(--info);text-decoration:none;" title="Hướng dẫn">📘 HD</a>` : ''}
                        </div>
                        ${!_tpIsReadonly ? `<div style="margin-top:6px;display:flex;gap:4px;">
                            <button onclick="_tpEditTask(${task.id})" style="padding:2px 8px;font-size:10px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;">✏️</button>
                            <button onclick="_tpDeleteTask(${task.id})" style="padding:2px 8px;font-size:10px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-secondary);color:#ef4444;cursor:pointer;">🗑️</button>
                        </div>` : ''}
                    </td>`;
                } else {
                    html += `<td style="padding:6px 10px;border:1px solid var(--border-color);vertical-align:top;text-align:center;color:var(--text-secondary);font-size:11px;">—</td>`;
                }
            }
            html += `</tr>`;
        });
    }
    html += `</tbody>`;

    // Footer — Add buttons
    if (!_tpIsReadonly) {
        html += `<tfoot><tr style="background:var(--bg-secondary);">`;
        html += `<td style="padding:8px 12px;border:1px solid var(--border-color);font-weight:600;font-size:12px;color:var(--text-secondary);">Thêm CV</td>`;
        for (let d = 1; d <= 6; d++) {
            html += `<td style="padding:8px;border:1px solid var(--border-color);text-align:center;">
                <button onclick="_tpAddTask(${d})" style="padding:4px 12px;font-size:12px;border:1px dashed var(--primary);border-radius:6px;background:transparent;color:var(--primary);cursor:pointer;font-weight:600;">+ Thêm</button>
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
    const title = isEdit ? 'Sửa công việc' : `Thêm công việc — ${DAY_NAMES[dayOfWeek]}`;

    // Days checkboxes for multi-day add
    const daysHtml = !isEdit ? `
    <div class="form-group" style="margin-top:8px;">
        <label style="font-weight:600;font-size:13px;">Áp dụng cho ngày:</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
            ${[1,2,3,4,5,6].map(d => `
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
                    <input type="checkbox" class="tpDayCb" value="${d}" ${d === dayOfWeek ? 'checked' : ''} style="cursor:pointer;">
                    ${DAY_NAMES[d]}
                </label>
            `).join('')}
        </div>
    </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'tpModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:var(--card-bg);border-radius:12px;padding:24px;width:min(440px,90vw);max-height:90vh;overflow-y:auto;border:1px solid var(--border-color);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:16px;color:var(--text-primary);">${title}</h3>
            <button onclick="document.getElementById('tpModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">×</button>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:13px;">Tên công việc *</label>
            <input id="tpFTask" type="text" class="form-control" value="${task ? task.task_name : ''}" placeholder="VD: Gọi điện Telesale" style="margin-top:4px;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
                <label style="font-weight:600;font-size:13px;">Điểm *</label>
                <input id="tpFPoints" type="number" class="form-control" value="${task ? task.points : ''}" placeholder="20" style="margin-top:4px;">
            </div>
            <div class="form-group">
                <label style="font-weight:600;font-size:13px;">SL tối thiểu *</label>
                <input id="tpFMinQty" type="number" class="form-control" value="${task ? task.min_quantity : '1'}" placeholder="15" style="margin-top:4px;">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
                <label style="font-weight:600;font-size:13px;">Giờ bắt đầu *</label>
                <input id="tpFStart" type="time" class="form-control" value="${task ? task.time_start : ''}" style="margin-top:4px;">
            </div>
            <div class="form-group">
                <label style="font-weight:600;font-size:13px;">Giờ kết thúc *</label>
                <input id="tpFEnd" type="time" class="form-control" value="${task ? task.time_end : ''}" style="margin-top:4px;">
            </div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:13px;">Link hướng dẫn CV</label>
            <input id="tpFGuide" type="url" class="form-control" value="${task ? (task.guide_url || '') : ''}" placeholder="https://docs.google.com/..." style="margin-top:4px;">
        </div>
        ${daysHtml}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button onclick="document.getElementById('tpModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_tpSaveTask(${isEdit ? task.id : 'null'}, ${dayOfWeek})" style="padding:8px 20px;border-radius:6px;border:none;background:var(--primary);color:white;cursor:pointer;font-size:13px;font-weight:600;">💾 Lưu</button>
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
