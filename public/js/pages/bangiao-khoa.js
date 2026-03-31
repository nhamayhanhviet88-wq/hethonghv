// ========== BÀN GIAO CV KHÓA ==========
const _LK_RECURRENCE_LABELS = {
    weekly: '📅 Lặp theo tuần',
    monthly: '📅 Lặp theo tháng',
    once: '1️⃣ Không lặp',
    administrative: '🏢 Hành chính (T2-T7)',
    daily: '🔄 Hằng ngày (T2-CN)'
};
const _LK_DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

let _lkSelectedUserId = null;
let _lkSelectedDeptId = null;
let _lkTreeData = null;

async function renderBanGiaoKhoaPage(container) {
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(currentUser.role);

    container.innerHTML = `
    <div style="display:flex;height:calc(100vh - 60px);overflow:hidden;">
        <!-- LEFT: ORG TREE -->
        <div id="lkTreePanel" style="width:280px;min-width:280px;background:white;border-right:2px solid #e2e8f0;overflow-y:auto;padding:12px;">
            <div style="font-weight:800;font-size:14px;color:#122546;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                🏢 Cơ cấu tổ chức
            </div>
            <div id="lkTreeContainer" style="font-size:13px;">
                <div style="text-align:center;color:#9ca3af;padding:20px;font-size:12px;">⏳ Đang tải...</div>
            </div>
        </div>

        <!-- RIGHT: TASK LIST -->
        <div id="lkTaskPanel" style="flex:1;overflow-y:auto;padding:16px;background:#f8fafc;">
            <div style="text-align:center;padding:60px;color:#9ca3af;">
                <div style="font-size:48px;margin-bottom:12px;">👈</div>
                <div style="font-size:14px;font-weight:600;">Chọn phòng ban hoặc nhân viên bên trái</div>
                <div style="font-size:12px;margin-top:4px;">để xem và quản lý công việc khóa</div>
            </div>
        </div>
    </div>`;

    await _lkLoadTree();
}

// ===== ORG TREE =====
async function _lkLoadTree() {
    const treeEl = document.getElementById('lkTreeContainer');
    if (!treeEl) return;

    try {
        const data = await apiCall('/api/lock-tasks/tree');
        _lkTreeData = data;
        const { departments, users, statusMap } = data;

        // Build tree
        const roots = departments.filter(d => !d.parent_id);
        let html = '';

        roots.forEach(root => {
            html += _lkRenderDeptNode(root, departments, users, statusMap, 0);
        });

        treeEl.innerHTML = html || '<div style="color:#9ca3af;text-align:center;padding:20px;">Không có dữ liệu</div>';
    } catch(e) {
        treeEl.innerHTML = `<div style="color:#dc2626;padding:10px;">Lỗi: ${e.message}</div>`;
    }
}

function _lkRenderDeptNode(dept, allDepts, allUsers, statusMap, level) {
    const children = allDepts.filter(d => d.parent_id === dept.id);
    const deptUsers = allUsers.filter(u => u.department_id === dept.id);
    const indent = level * 16;
    const colors = ['#1e3a5f', '#2563eb', '#7c3aed', '#059669'];
    const bgColors = ['linear-gradient(135deg,#1e3a5f,#2563eb)', 'linear-gradient(135deg,#3b82f6,#60a5fa)', '#f1f5f9', '#f8fafc'];

    let html = '';

    if (level === 0) {
        // Root = system header
        html += `<div style="margin-bottom:8px;">
            <div onclick="_lkSelectDept(${dept.id})" style="background:${bgColors[0]};color:white;padding:8px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;margin-bottom:2px;display:flex;align-items:center;justify-content:space-between;">
                <span>🏢 ${dept.name}</span>
            </div>`;
    } else if (level === 1) {
        html += `<div style="margin-left:${indent}px;margin-bottom:4px;">
            <div onclick="_lkSelectDept(${dept.id})" style="padding:6px 10px;border-radius:6px;font-weight:600;font-size:12px;color:#334155;cursor:pointer;background:#f1f5f9;margin-bottom:1px;display:flex;align-items:center;gap:4px;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                <span style="color:#6b7280;">┣</span> ${dept.name}
            </div>`;
    } else {
        html += `<div style="margin-left:${indent}px;margin-bottom:2px;">
            <div onclick="_lkSelectDept(${dept.id})" style="padding:5px 8px;border-radius:4px;font-size:11px;color:#64748b;cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <span style="color:#9ca3af;">┗</span> ${dept.name}
            </div>`;
    }

    // Users in this dept
    deptUsers.forEach(u => {
        const st = statusMap[u.id];
        let statusBadge = '';
        if (st && st.total > 0) {
            if (st.done >= st.total) {
                statusBadge = `<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">✅ ${st.done}/${st.total}</span>`;
            } else {
                statusBadge = `<span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔴 ${st.done}/${st.total}</span>`;
            }
        }
        html += `<div onclick="_lkSelectUser(${u.id},'${(u.full_name||'').replace(/'/g,"\\'")}', event)" data-user-id="${u.id}" style="margin-left:${indent + 16}px;padding:5px 8px;border-radius:4px;font-size:11px;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:4px;" onmouseover="this.style.background='#eff6ff'" onmouseout="if(!this.classList.contains('lk-selected'))this.style.background='transparent'" class="lk-user-item">
            <span>👤 ${u.full_name}</span>
            ${statusBadge}
        </div>`;
    });

    // Recurse children
    children.forEach(child => {
        html += _lkRenderDeptNode(child, allDepts, allUsers, statusMap, level + 1);
    });

    html += '</div>';
    return html;
}

function _lkSelectDept(deptId) {
    _lkSelectedDeptId = deptId;
    _lkSelectedUserId = null;
    // Remove selected styles
    document.querySelectorAll('.lk-user-item').forEach(el => {
        el.classList.remove('lk-selected');
        el.style.background = 'transparent';
    });
    _lkLoadDeptTasks(deptId);
}

async function _lkSelectUser(userId, userName, event) {
    if (event) event.stopPropagation();
    _lkSelectedUserId = userId;
    _lkSelectedDeptId = null;
    // Highlight selected
    document.querySelectorAll('.lk-user-item').forEach(el => {
        el.classList.remove('lk-selected');
        el.style.background = 'transparent';
    });
    const el = document.querySelector(`[data-user-id="${userId}"]`);
    if (el) { el.classList.add('lk-selected'); el.style.background = '#dbeafe'; }
    _lkLoadUserTasks(userId, userName);
}

// ===== DEPT TASKS =====
async function _lkLoadDeptTasks(deptId) {
    const panel = document.getElementById('lkTaskPanel');
    if (!panel) return;
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(currentUser.role);

    panel.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/lock-tasks/dept/${deptId}`);
        const tasks = data.tasks || [];
        const dept = _lkTreeData?.departments?.find(d => d.id === deptId);
        const deptName = dept?.name || 'Phòng ban';

        let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
                <h3 style="margin:0;font-size:18px;color:#122546;font-weight:800;">🏢 ${deptName}</h3>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;">${tasks.length} công việc khóa</div>
            </div>
            ${isManager ? `<button onclick="_lkShowCreateModal(${deptId})" style="padding:8px 18px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(220,38,38,0.3);">🔐 Thêm CV Khóa</button>` : ''}
        </div>`;

        if (tasks.length === 0) {
            html += `<div style="text-align:center;padding:60px;background:white;border-radius:12px;border:2px solid #e2e8f0;">
                <div style="font-size:40px;margin-bottom:8px;">📋</div>
                <div style="color:#9ca3af;font-size:13px;">Chưa có công việc khóa nào</div>
            </div>`;
        } else {
            html += _lkRenderTaskTable(tasks, true);
        }

        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = `<div style="color:#dc2626;padding:20px;">Lỗi: ${e.message}</div>`;
    }
}

// ===== USER TASKS =====
async function _lkLoadUserTasks(userId, userName) {
    const panel = document.getElementById('lkTaskPanel');
    if (!panel) return;
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(currentUser.role);
    const isSelf = userId === currentUser.id;

    panel.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/lock-tasks/user/${userId}`);
        const tasks = data.tasks || [];

        let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
                <h3 style="margin:0;font-size:18px;color:#122546;font-weight:800;">👤 ${userName || 'Nhân viên'}</h3>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;">${tasks.length} CV khóa hôm nay</div>
            </div>
        </div>`;

        if (tasks.length === 0) {
            html += `<div style="text-align:center;padding:60px;background:white;border-radius:12px;border:2px solid #e2e8f0;">
                <div style="font-size:40px;margin-bottom:8px;">✅</div>
                <div style="color:#059669;font-size:13px;font-weight:600;">Không có công việc khóa nào</div>
            </div>`;
        } else {
            tasks.forEach(t => {
                const recLabel = _LK_RECURRENCE_LABELS[t.recurrence_type] || t.recurrence_type;
                const recDetail = t.recurrence_type === 'weekly' ? ` (${_LK_DAY_NAMES[Number(t.recurrence_value)] || t.recurrence_value})` :
                                  t.recurrence_type === 'monthly' ? ` (ngày ${t.recurrence_value})` :
                                  t.recurrence_type === 'once' ? ` (${t.recurrence_value})` : '';
                const status = t.completion_status;

                let statusBadge = '';
                let actionBtn = '';
                if (status === 'approved') {
                    statusBadge = '<span style="background:#dcfce7;color:#059669;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">✅ Đã duyệt</span>';
                } else if (status === 'pending') {
                    statusBadge = '<span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">⏳ Chờ duyệt</span>';
                    if (isManager && !isSelf) {
                        actionBtn = `<div style="display:flex;gap:4px;margin-top:6px;">
                            <button onclick="_lkReview(${t.completion_id},'approve')" style="padding:4px 12px;font-size:11px;border:none;border-radius:4px;background:#059669;color:white;cursor:pointer;font-weight:600;">✅ Duyệt</button>
                            <button onclick="_lkReview(${t.completion_id},'reject')" style="padding:4px 12px;font-size:11px;border:none;border-radius:4px;background:#dc2626;color:white;cursor:pointer;font-weight:600;">❌ Từ chối</button>
                        </div>`;
                    }
                } else if (status === 'rejected') {
                    statusBadge = `<span style="background:#fef2f2;color:#dc2626;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">❌ Từ chối${t.reject_reason ? ': ' + t.reject_reason : ''}</span>`;
                    if (isSelf) {
                        actionBtn = `<button onclick="_lkUploadProof(${t.id})" style="padding:4px 12px;font-size:11px;border:1px solid #dc2626;border-radius:4px;background:white;color:#dc2626;cursor:pointer;font-weight:600;margin-top:6px;">📤 Nộp lại</button>`;
                    }
                } else {
                    statusBadge = '<span style="background:#fef2f2;color:#dc2626;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">🔴 Chưa nộp</span>';
                    if (isSelf) {
                        actionBtn = `<button onclick="_lkUploadProof(${t.id})" style="padding:6px 16px;font-size:12px;border:none;border-radius:6px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;cursor:pointer;font-weight:700;margin-top:6px;">📤 Nộp bài</button>`;
                    }
                }

                html += `
                <div style="background:white;border:2px solid ${status === 'approved' ? '#a7f3d0' : status === 'pending' ? '#fde68a' : '#fecaca'};border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                        <div style="flex:1;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                <span style="font-size:15px;font-weight:800;color:#1e293b;">${t.task_name}</span>
                                <span style="background:#dc2626;color:white;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔒 KHÓA</span>
                                ${t.requires_approval ? '<span style="background:#7c3aed;color:white;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">QL DUYỆT</span>' : ''}
                            </div>
                            <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${recLabel}${recDetail} • Phạt: ${(t.penalty_amount || 50000).toLocaleString()}đ</div>
                            ${t.task_content ? `<div style="font-size:12px;color:#475569;margin-bottom:4px;">${t.task_content}</div>` : ''}
                            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                                ${t.guide_link ? `<a href="${t.guide_link}" target="_blank" style="font-size:10px;background:#eff6ff;color:#2563eb;padding:2px 8px;border-radius:4px;text-decoration:none;font-weight:600;">📖 Hướng dẫn</a>` : ''}
                                ${t.input_requirements ? `<span style="font-size:10px;background:#f0fdf4;color:#059669;padding:2px 8px;border-radius:4px;font-weight:600;">📥 ${t.input_requirements}</span>` : ''}
                                ${t.output_requirements ? `<span style="font-size:10px;background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;">📤 ${t.output_requirements}</span>` : ''}
                            </div>
                            ${t.proof_url ? `<div style="margin-top:6px;"><a href="${t.proof_url}" target="_blank" style="font-size:10px;color:#6b7280;text-decoration:underline;">📎 Xem file đã nộp</a></div>` : ''}
                            ${actionBtn}
                        </div>
                        <div style="flex-shrink:0;">
                            ${statusBadge}
                            ${isManager && !isSelf ? `<div style="margin-top:6px;text-align:right;"><button onclick="_lkEditTask(${t.id})" style="padding:2px 8px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;background:white;color:#6b7280;cursor:pointer;">✏️</button> <button onclick="_lkDeleteTask(${t.id})" style="padding:2px 8px;font-size:10px;border:1px solid #fecaca;border-radius:4px;background:white;color:#dc2626;cursor:pointer;">🗑️</button></div>` : ''}
                        </div>
                    </div>
                </div>`;
            });
        }

        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = `<div style="color:#dc2626;padding:20px;">Lỗi: ${e.message}</div>`;
    }
}

// ===== TASK TABLE (DEPT VIEW) =====
function _lkRenderTaskTable(tasks, showAssignees) {
    let html = `<div style="background:white;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:linear-gradient(135deg,#991b1b,#dc2626);">
                    <th style="padding:10px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Công việc</th>
                    <th style="padding:10px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Lặp lại</th>
                    <th style="padding:10px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">QL Duyệt</th>
                    <th style="padding:10px 12px;text-align:right;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Phạt</th>
                    ${showAssignees ? '<th style="padding:10px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">NV</th>' : ''}
                    <th style="padding:10px 12px;width:60px;"></th>
                </tr>
            </thead>
            <tbody>`;

    tasks.forEach((t, i) => {
        const recLabel = _LK_RECURRENCE_LABELS[t.recurrence_type] || t.recurrence_type;
        const recDetail = t.recurrence_type === 'weekly' ? ` (${_LK_DAY_NAMES[Number(t.recurrence_value)] || ''})` :
                          t.recurrence_type === 'monthly' ? ` (ngày ${t.recurrence_value})` : '';
        const userNames = (t.assigned_users || []).map(u => u.name).join(', ');

        html += `<tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafbfc;' : ''}">
            <td style="padding:10px 12px;">
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${t.task_name}</div>
                ${t.guide_link ? `<a href="${t.guide_link}" target="_blank" style="font-size:10px;color:#2563eb;">📖 Hướng dẫn</a>` : ''}
            </td>
            <td style="padding:10px 12px;font-size:11px;color:#6b7280;">${recLabel}${recDetail}</td>
            <td style="padding:10px 12px;text-align:center;font-size:11px;">${t.requires_approval ? '✅' : '—'}</td>
            <td style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;color:#dc2626;">${(t.penalty_amount || 50000).toLocaleString()}đ</td>
            ${showAssignees ? `<td style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;" title="${userNames}">${t.assigned_count || 0} NV</td>` : ''}
            <td style="padding:10px 12px;text-align:center;">
                <button onclick="_lkEditTask(${t.id})" style="padding:2px 6px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;background:white;color:#6b7280;cursor:pointer;">✏️</button>
                <button onclick="_lkDeleteTask(${t.id})" style="padding:2px 6px;font-size:10px;border:1px solid #fecaca;border-radius:4px;background:white;color:#dc2626;cursor:pointer;">🗑️</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    return html;
}

// ===== CREATE/EDIT MODAL =====
async function _lkShowCreateModal(deptId, editTask) {
    document.getElementById('lkTaskModal')?.remove();

    // Load dept users for assignment
    let deptUsers = [];
    try {
        const d = await apiCall(`/api/lock-tasks/dept-users/${deptId}`);
        deptUsers = d.users || [];
    } catch(e) {}

    const isEdit = !!editTask;
    const t = editTask || {};
    const assignedIds = (t.assigned_users || []).map(u => u.id);

    const modal = document.createElement('div');
    modal.id = 'lkTaskModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:620px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);">
        <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:18px 24px;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between;">
            <span style="color:white;font-weight:800;font-size:16px;">🔐 ${isEdit ? 'Sửa' : 'Thêm'} Công Việc Khóa</span>
            <button onclick="document.getElementById('lkTaskModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:14px;">
                <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Tên công việc *</label>
                <input id="lkf_name" type="text" value="${t.task_name || ''}" placeholder="VD: Báo cáo doanh thu" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Nội dung công việc</label>
                <textarea id="lkf_content" rows="2" placeholder="Mô tả chi tiết..." style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;">${t.task_content || ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Link hướng dẫn</label>
                    <input id="lkf_guide" type="url" value="${t.guide_link || ''}" placeholder="https://..." style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Mức phạt (VNĐ)</label>
                    <input id="lkf_penalty" type="number" value="${t.penalty_amount || 50000}" min="0" step="10000" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Yêu cầu đầu vào</label>
                    <input id="lkf_input" type="text" value="${t.input_requirements || ''}" placeholder="VD: File Excel" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Yêu cầu đầu ra</label>
                    <input id="lkf_output" type="text" value="${t.output_requirements || ''}" placeholder="VD: Ảnh chụp màn hình" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Loại lặp lại *</label>
                    <select id="lkf_recurrence" onchange="_lkRecurrenceChanged()" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        <option value="administrative" ${t.recurrence_type === 'administrative' ? 'selected' : ''}>🏢 Hành chính (T2-T7)</option>
                        <option value="daily" ${t.recurrence_type === 'daily' ? 'selected' : ''}>🔄 Hằng ngày (T2-CN)</option>
                        <option value="weekly" ${t.recurrence_type === 'weekly' ? 'selected' : ''}>📅 Lặp theo tuần</option>
                        <option value="monthly" ${t.recurrence_type === 'monthly' ? 'selected' : ''}>📅 Lặp theo tháng</option>
                        <option value="once" ${t.recurrence_type === 'once' ? 'selected' : ''}>1️⃣ Không lặp (1 lần)</option>
                    </select>
                </div>
                <div id="lkf_recurrence_value_wrap">
                    ${_lkRecurrenceValueHTML(t.recurrence_type || 'administrative', t.recurrence_value)}
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input id="lkf_approval" type="checkbox" ${t.requires_approval ? 'checked' : ''} style="width:16px;height:16px;">
                    <span style="font-size:12px;font-weight:600;color:#374151;">QL phải duyệt (Nếu tích, sau khi NV nộp → QL phải duyệt/từ chối)</span>
                </label>
            </div>
            <!-- ASSIGN USERS -->
            <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <label style="font-size:11px;font-weight:700;color:#374151;">Gán cho nhân viên *</label>
                    <label style="font-size:10px;color:#6b7280;cursor:pointer;"><input type="checkbox" id="lkf_selectAll" onchange="_lkToggleAll(this.checked)" ${deptUsers.length === assignedIds.length && deptUsers.length > 0 ? 'checked' : ''}> Chọn tất cả</label>
                </div>
                <div id="lkf_userList" style="max-height:150px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    ${deptUsers.map(u => `
                        <label style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;color:#374151;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                            <input type="checkbox" class="lkf-user-cb" value="${u.id}" ${assignedIds.includes(u.id) ? 'checked' : ''} style="width:14px;height:14px;">
                            ${u.full_name} <span style="color:#9ca3af;font-size:10px;">(${u.dept_name || ''})</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid #e2e8f0;">
                <button onclick="document.getElementById('lkTaskModal')?.remove()" style="padding:8px 20px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;">Hủy</button>
                <button onclick="_lkSaveTask(${isEdit ? t.id : 'null'}, ${deptId})" style="padding:8px 24px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-weight:700;">💾 ${isEdit ? 'Cập nhật' : 'Tạo công việc'}</button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    _lkRecurrenceChanged();
}

function _lkRecurrenceValueHTML(type, value) {
    if (type === 'weekly') {
        return `<div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Thứ mấy?</label>
            <select id="lkf_recval" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                <option value="1" ${value==='1'?'selected':''}>Thứ 2</option>
                <option value="2" ${value==='2'?'selected':''}>Thứ 3</option>
                <option value="3" ${value==='3'?'selected':''}>Thứ 4</option>
                <option value="4" ${value==='4'?'selected':''}>Thứ 5</option>
                <option value="5" ${value==='5'?'selected':''}>Thứ 6</option>
                <option value="6" ${value==='6'?'selected':''}>Thứ 7</option>
                <option value="0" ${value==='0'?'selected':''}>Chủ nhật</option>
            </select>
        </div>`;
    } else if (type === 'monthly') {
        return `<div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Ngày mấy?</label>
            <input id="lkf_recval" type="number" value="${value || '1'}" min="1" max="31" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>`;
    } else if (type === 'once') {
        return `<div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Ngày cụ thể</label>
            <input id="lkf_recval" type="date" value="${value || ''}" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>`;
    }
    return '<div style="padding-top:20px;font-size:11px;color:#9ca3af;">Không cần cấu hình thêm</div>';
}

function _lkRecurrenceChanged() {
    const type = document.getElementById('lkf_recurrence')?.value;
    const wrap = document.getElementById('lkf_recurrence_value_wrap');
    if (wrap) wrap.innerHTML = _lkRecurrenceValueHTML(type, '');
}

function _lkToggleAll(checked) {
    document.querySelectorAll('.lkf-user-cb').forEach(cb => cb.checked = checked);
}

async function _lkSaveTask(taskId, deptId) {
    const name = document.getElementById('lkf_name')?.value?.trim();
    if (!name) { alert('Nhập tên công việc!'); return; }

    const userIds = [];
    document.querySelectorAll('.lkf-user-cb:checked').forEach(cb => userIds.push(Number(cb.value)));
    if (userIds.length === 0) { alert('Chọn ít nhất 1 nhân viên!'); return; }

    const payload = {
        task_name: name,
        task_content: document.getElementById('lkf_content')?.value?.trim() || '',
        guide_link: document.getElementById('lkf_guide')?.value?.trim() || '',
        input_requirements: document.getElementById('lkf_input')?.value?.trim() || '',
        output_requirements: document.getElementById('lkf_output')?.value?.trim() || '',
        recurrence_type: document.getElementById('lkf_recurrence')?.value || 'administrative',
        recurrence_value: document.getElementById('lkf_recval')?.value || '',
        requires_approval: document.getElementById('lkf_approval')?.checked || false,
        penalty_amount: Number(document.getElementById('lkf_penalty')?.value) || 50000,
        department_id: deptId,
        user_ids: userIds
    };

    try {
        if (taskId) {
            await apiCall(`/api/lock-tasks/${taskId}`, 'PUT', payload);
            showToast('✅ Đã cập nhật');
        } else {
            await apiCall('/api/lock-tasks', 'POST', payload);
            showToast('✅ Đã tạo công việc khóa');
        }
        document.getElementById('lkTaskModal')?.remove();
        if (_lkSelectedUserId) {
            _lkSelectUser(_lkSelectedUserId, '', null);
        } else {
            _lkLoadDeptTasks(deptId);
        }
        _lkLoadTree();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

async function _lkEditTask(taskId) {
    try {
        // Get task details with assigned users
        const tasks = await apiCall(`/api/lock-tasks/dept/${_lkSelectedDeptId || 0}`);
        const task = (tasks.tasks || []).find(t => t.id === taskId);
        if (task) {
            _lkShowCreateModal(task.department_id, task);
        }
    } catch(e) { alert('Lỗi'); }
}

async function _lkDeleteTask(taskId) {
    if (!confirm('Xóa công việc này?')) return;
    try {
        await apiCall(`/api/lock-tasks/${taskId}`, 'DELETE');
        showToast('✅ Đã xóa');
        if (_lkSelectedUserId) {
            _lkSelectUser(_lkSelectedUserId, '', null);
        } else if (_lkSelectedDeptId) {
            _lkLoadDeptTasks(_lkSelectedDeptId);
        }
        _lkLoadTree();
    } catch(e) { alert('Lỗi'); }
}

// ===== UPLOAD PROOF =====
function _lkUploadProof(taskId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = document.cookie.split('token=')[1]?.split(';')[0];
            const res = await fetch(`/api/lock-tasks/${taskId}/submit`, {
                method: 'POST',
                headers: { 'Cookie': `token=${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Đã nộp bài!');
                if (_lkSelectedUserId) _lkSelectUser(_lkSelectedUserId, '', null);
                _lkLoadTree();
            } else {
                alert(data.error || 'Lỗi');
            }
        } catch(e) {
            alert('Lỗi upload: ' + e.message);
        }
    };
    input.click();
}

// ===== REVIEW =====
async function _lkReview(completionId, action) {
    let reason = '';
    if (action === 'reject') {
        reason = prompt('Lý do từ chối:');
        if (reason === null) return;
    }

    try {
        await apiCall(`/api/lock-tasks/${completionId}/review`, 'POST', { action, reject_reason: reason });
        showToast(action === 'approve' ? '✅ Đã duyệt' : '❌ Đã từ chối');
        if (_lkSelectedUserId) _lkSelectUser(_lkSelectedUserId, '', null);
        _lkLoadTree();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}
