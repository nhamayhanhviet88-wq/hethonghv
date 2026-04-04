// ========== GỌI ĐIỆN TELESALE ==========

let _gd_selectedUserId = null;
let _gd_selectedUserName = '';
let _gd_date = new Date().toISOString().split('T')[0];
let _gd_calls = [];
let _gd_stats = null;
let _gd_sources = [];
let _gd_answerStatuses = [];
let _gd_activeSourceFilter = null; // null = show all
let _gd_isManager = false;
let _gd_expandedDepts = new Set();
let _gd_allUsers = [];
let _gd_allDepts = [];

async function renderGoiDienPage(container) {
    _gd_isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);

    container.innerHTML = `
        <div style="display:flex;height:calc(100vh - 120px);gap:0;">
            <!-- Sidebar -->
            <div id="gdSidebar" style="width:280px;min-width:280px;background:#f9fafb;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:12px;border-bottom:1px solid #e5e7eb;">
                    <h4 style="margin:0 0 8px;color:#122546;font-size:13px;">📞 Gọi Điện Telesale</h4>
                    <input type="text" id="gdSearchUser" placeholder="🔍 Tìm NV..." style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;" oninput="_gd_filterSidebar(this.value)">
                </div>
                <div id="gdSidebarTree" style="flex:1;overflow:auto;padding:8px;"></div>
            </div>

            <!-- Content -->
            <div id="gdContent" style="flex:1;overflow:auto;padding:16px;">
                <div style="text-align:center;padding:60px;color:#6b7280;">
                    <div style="font-size:60px;margin-bottom:16px;">👈</div>
                    <h3>Chọn nhân viên bên trái để xem data gọi điện</h3>
                </div>
            </div>
        </div>
    `;

    // Load initial data
    const [srcRes, statusRes, usersRes, deptsRes, membersRes] = await Promise.all([
        apiCall('/api/telesale/sources'),
        apiCall('/api/telesale/answer-statuses'),
        apiCall('/api/users'),
        apiCall('/api/teams'),
        apiCall('/api/telesale/active-members')
    ]);
    _gd_sources = srcRes.sources || [];
    _gd_answerStatuses = statusRes.statuses || [];
    _gd_allUsers = (usersRes.users || usersRes || []).filter(u => u.status === 'active');
    _gd_allDepts = deptsRes.departments || deptsRes || [];

    const memberIds = new Set((membersRes.members || []).filter(m => m.is_active).map(m => m.user_id));

    // If not manager, only show self
    if (!_gd_isManager) {
        _gd_selectedUserId = currentUser.id;
        _gd_selectedUserName = currentUser.full_name || currentUser.username;
        _gd_renderSidebar(memberIds);
        await _gd_loadCallsForUser(_gd_selectedUserId);
    } else {
        _gd_renderSidebar(memberIds);
        // Auto-select first NV
        if (memberIds.size > 0) {
            const first = _gd_allUsers.find(u => memberIds.has(u.id));
            if (first) {
                _gd_selectedUserId = first.id;
                _gd_selectedUserName = first.full_name || first.username;
                await _gd_loadCallsForUser(first.id);
            }
        }
    }
}

function _gd_renderSidebar(memberIds) {
    const tree = document.getElementById('gdSidebarTree');
    if (!tree) return;

    // Build org tree: System → Department → Team → Users
    const topDepts = _gd_allDepts.filter(d => !d.parent_id);
    const childDepts = _gd_allDepts.filter(d => d.parent_id);

    let html = '';
    for (const dept of topDepts) {
        const deptUsers = _gd_allUsers.filter(u => u.department_id === dept.id && memberIds.has(u.id));
        const subDepts = childDepts.filter(d => d.parent_id === dept.id);
        const subDeptUsers = subDepts.flatMap(sd => _gd_allUsers.filter(u => u.department_id === sd.id && memberIds.has(u.id)));
        const totalUsers = deptUsers.length + subDeptUsers.length;
        if (totalUsers === 0 && subDepts.length === 0) continue;

        const expanded = _gd_expandedDepts.has(dept.id);
        html += `
            <div class="gd-dept-item" data-search="${dept.name.toLowerCase()}">
                <div onclick="_gd_toggleDept(${dept.id})" style="display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:pointer;border-radius:6px;font-size:12px;font-weight:700;color:#122546;${expanded?'background:#e0e7ff;':''}">
                    <span style="font-size:10px;">${expanded ? '▼' : '▶'}</span>
                    <span>🏢 ${dept.name}</span>
                    <span style="background:#dbeafe;color:#2563eb;padding:1px 6px;border-radius:10px;font-size:10px;margin-left:auto;">${totalUsers}</span>
                </div>
                ${expanded ? `<div style="padding-left:16px;">
                    ${deptUsers.map(u => _gd_userItem(u)).join('')}
                    ${subDepts.map(sd => {
                        const sdUsers = _gd_allUsers.filter(u => u.department_id === sd.id && memberIds.has(u.id));
                        if (sdUsers.length === 0) return '';
                        const sdExpanded = _gd_expandedDepts.has(sd.id);
                        return `
                            <div class="gd-dept-item" data-search="${sd.name.toLowerCase()}">
                                <div onclick="_gd_toggleDept(${sd.id})" style="display:flex;align-items:center;gap:6px;padding:4px 8px;cursor:pointer;border-radius:6px;font-size:11px;font-weight:600;color:#374151;${sdExpanded?'background:#ecfdf5;':''}">
                                    <span style="font-size:9px;">${sdExpanded ? '▼' : '▶'}</span>
                                    <span>👥 ${sd.name}</span>
                                    <span style="background:#d1fae5;color:#065f46;padding:1px 5px;border-radius:10px;font-size:9px;margin-left:auto;">${sdUsers.length}</span>
                                </div>
                                ${sdExpanded ? `<div style="padding-left:14px;">${sdUsers.map(u => _gd_userItem(u)).join('')}</div>` : ''}
                            </div>`;
                    }).join('')}
                </div>` : ''}
            </div>`;
    }

    // Users without department
    const noDeptUsers = _gd_allUsers.filter(u => !u.department_id && memberIds.has(u.id));
    if (noDeptUsers.length > 0) {
        html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
            <div style="font-size:11px;color:#9ca3af;padding:4px 8px;font-weight:600;">📋 Chưa phân phòng</div>
            ${noDeptUsers.map(u => _gd_userItem(u)).join('')}
        </div>`;
    }

    tree.innerHTML = html || '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;">Chưa có NV nào trong Telesale</div>';
}

function _gd_userItem(u) {
    const active = u.id === _gd_selectedUserId;
    return `<div onclick="_gd_selectUser(${u.id},'${(u.full_name||u.username).replace(/'/g,"\\'")}')" data-search="${(u.full_name||'').toLowerCase()} ${u.username.toLowerCase()}"
        style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;border-radius:8px;margin:2px 0;
        ${active ? 'background:linear-gradient(135deg,#122546,#1e3a5f);color:white;' : 'color:#374151;'}
        transition:all 0.15s;">
        <div style="width:28px;height:28px;border-radius:50%;background:${active?'rgba(255,255,255,0.2)':'#e0e7ff'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${active?'white':'#3730a3'};">
            ${(u.full_name || u.username).charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}</div>
            <div style="font-size:10px;opacity:0.7;">${u.username}</div>
        </div>
    </div>`;
}

function _gd_toggleDept(deptId) {
    if (_gd_expandedDepts.has(deptId)) _gd_expandedDepts.delete(deptId);
    else _gd_expandedDepts.add(deptId);
    // Re-extract memberIds
    apiCall('/api/telesale/active-members').then(res => {
        const memberIds = new Set((res.members || []).filter(m => m.is_active).map(m => m.user_id));
        _gd_renderSidebar(memberIds);
    });
}

async function _gd_selectUser(userId, userName) {
    _gd_selectedUserId = userId;
    _gd_selectedUserName = userName;
    // Re-render sidebar to highlight
    const memRes = await apiCall('/api/telesale/active-members');
    const memberIds = new Set((memRes.members || []).filter(m => m.is_active).map(m => m.user_id));
    _gd_renderSidebar(memberIds);
    await _gd_loadCallsForUser(userId);
}

function _gd_filterSidebar(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#gdSidebarTree [data-search]').forEach(el => {
        const text = el.dataset.search || '';
        el.style.display = text.includes(q) ? '' : 'none';
    });
}

async function _gd_loadCallsForUser(userId) {
    const el = document.getElementById('gdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">⏳ Đang tải...</div>';

    const [callsRes, statsRes, callbacksRes] = await Promise.all([
        apiCall(`/api/telesale/user-calls/${userId}?date=${_gd_date}`),
        apiCall(`/api/telesale/daily-stats/${userId}?date=${_gd_date}`),
        apiCall(`/api/telesale/callbacks?date=${_gd_date}&user_id=${userId}`)
    ]);
    _gd_calls = callsRes.calls || [];
    _gd_stats = statsRes.stats || { total: 0, pending: 0, answered: 0, no_answer: 0, busy: 0, invalid: 0 };
    const callbacks = callbacksRes.callbacks || [];

    // Filter by source
    const filteredCalls = _gd_activeSourceFilter
        ? _gd_calls.filter(c => c.source_name === _gd_activeSourceFilter)
        : _gd_calls;

    // Count answered
    const totalAnswered = parseInt(_gd_stats.answered || 0);

    // Find telesale task target from task schedule (we estimate from stats)
    const targetCalls = 100; // default
    const totalPoints = 50; // default
    const earnedPoints = Math.round(Math.min(totalAnswered, targetCalls) / targetCalls * totalPoints);
    const progressPct = Math.min(100, Math.round(totalAnswered / targetCalls * 100));

    // Unique source names from calls
    const sourcesInCalls = [...new Set(_gd_calls.map(c => c.source_name).filter(Boolean))];

    el.innerHTML = `
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <div>
                <h3 style="margin:0;color:#122546;">${_gd_selectedUserName}</h3>
                <div style="font-size:12px;color:#6b7280;">📅 ${_gd_formatDate(_gd_date)}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button onclick="_gd_changeDate(-1)" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:12px;">◀</button>
                <input type="date" value="${_gd_date}" onchange="_gd_date=this.value;_gd_loadCallsForUser(${userId});" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">
                <button onclick="_gd_changeDate(1)" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:12px;">▶</button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">
            <div style="padding:10px;background:#f0f4f8;border-radius:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#122546;">${_gd_stats.total}</div>
                <div style="font-size:10px;color:#6b7280;">Tổng SĐT</div>
            </div>
            <div style="padding:10px;background:#fef3c7;border-radius:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#d97706;">${_gd_stats.pending}</div>
                <div style="font-size:10px;color:#92400e;">⏸️ Chưa gọi</div>
            </div>
            <div style="padding:10px;background:#dcfce7;border-radius:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#16a34a;">${totalAnswered}</div>
                <div style="font-size:10px;color:#065f46;">✅ Bắt máy</div>
            </div>
            <div style="padding:10px;background:#fef2f2;border-radius:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#dc2626;">${parseInt(_gd_stats.no_answer||0) + parseInt(_gd_stats.busy||0)}</div>
                <div style="font-size:10px;color:#991b1b;">📵 Không nghe/Bận</div>
            </div>
            <div style="padding:10px;background:#fce7f3;border-radius:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#db2777;">${_gd_stats.invalid}</div>
                <div style="font-size:10px;color:#9d174d;">❌ Không tồn tại</div>
            </div>
        </div>

        <!-- Progress Bar -->
        <div style="margin-bottom:16px;padding:12px;background:linear-gradient(135deg,#f0f9ff,#ecfdf5);border:1px solid #a7f3d0;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:12px;font-weight:700;color:#065f46;">📊 CV Điểm: ${totalAnswered}/${targetCalls} bắt máy → ${earnedPoints}/${totalPoints} điểm</span>
                <span style="font-size:11px;font-weight:700;color:#2563eb;">${progressPct}%</span>
            </div>
            <div style="background:#e5e7eb;border-radius:10px;height:8px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#059669,#10b981);height:100%;width:${progressPct}%;border-radius:10px;transition:width 0.3s;"></div>
            </div>
        </div>

        <!-- Source Filter Tabs -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;">
            <button onclick="_gd_activeSourceFilter=null;_gd_loadCallsForUser(${userId});" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;
                ${!_gd_activeSourceFilter?'background:#122546;color:white;border:none;font-weight:700;':'background:white;border:1px solid #d1d5db;color:#374151;'}">
                Tất cả (${_gd_calls.length})
            </button>
            ${sourcesInCalls.map(s => {
                const cnt = _gd_calls.filter(c => c.source_name === s).length;
                const active = _gd_activeSourceFilter === s;
                return `<button onclick="_gd_activeSourceFilter='${s}';_gd_loadCallsForUser(${userId});" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;
                    ${active?'background:#122546;color:white;border:none;font-weight:700;':'background:white;border:1px solid #d1d5db;color:#374151;'}">
                    ${s} (${cnt})
                </button>`;
            }).join('')}
        </div>

        ${callbacks.length > 0 ? `
        <!-- Callbacks Due Today -->
        <div style="margin-bottom:16px;padding:12px;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;">
            <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;">🔔 Hẹn Gọi Lại Hôm Nay (${callbacks.length})</div>
            ${callbacks.map(cb => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;">
                <span style="font-weight:700;color:#d97706;">${cb.phone}</span>
                <span style="color:#374151;">${cb.customer_name || ''}</span>
                <span style="color:#6b7280;font-size:10px;">${cb.source_icon||''} ${cb.source_name||''}</span>
                ${cb.callback_time ? `<span style="background:#fef3c7;padding:1px 6px;border-radius:4px;font-size:10px;">⏰ ${cb.callback_time}</span>` : ''}
            </div>`).join('')}
        </div>` : ''}

        <!-- Calls List -->
        <div id="gdCallsList">
            ${filteredCalls.length === 0 ? '<div style="padding:30px;text-align:center;color:#9ca3af;">Chưa có SĐT nào được phân cho ngày này</div>' : ''}
            ${filteredCalls.map(call => _gd_renderCallCard(call)).join('')}
        </div>
    `;
}

function _gd_renderCallCard(call) {
    const statusColors = {
        pending: { bg: '#fefce8', border: '#fde68a', icon: '⏸️', label: 'Chưa gọi' },
        answered: { bg: '#dcfce7', border: '#86efac', icon: '✅', label: 'Bắt máy' },
        no_answer: { bg: '#fef2f2', border: '#fecaca', icon: '📵', label: 'Không nghe' },
        busy: { bg: '#fff7ed', border: '#fed7aa', icon: '📞', label: 'Máy bận' },
        invalid: { bg: '#fdf2f8', border: '#fbcfe8', icon: '❌', label: 'Không tồn tại' },
    };
    const st = statusColors[call.call_status] || statusColors.pending;

    return `
    <div style="border:2px solid ${st.border};border-radius:12px;margin-bottom:8px;overflow:hidden;background:white;">
        <!-- Card Header -->
        <div style="padding:12px;background:${st.bg};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-size:24px;">${st.icon}</div>
                <div>
                    <div style="font-size:14px;font-weight:800;color:#122546;">${call.customer_name || 'Chưa có tên'}</div>
                    <div style="font-size:16px;font-weight:700;color:#2563eb;font-family:monospace;">${call.phone}</div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${st.bg};border:1px solid ${st.border};color:#374151;">${st.icon} ${st.label}</span>
                <span style="font-size:10px;color:#6b7280;">${call.source_icon||''} ${call.source_name||''}</span>
            </div>
        </div>

        <!-- Card Info -->
        <div style="padding:8px 12px;font-size:11px;color:#6b7280;display:flex;gap:16px;flex-wrap:wrap;border-bottom:1px solid #f3f4f6;">
            ${call.company_name ? `<span>🏢 ${call.company_name}</span>` : ''}
            ${call.group_name ? `<span>👥 ${call.group_name}</span>` : ''}
            ${call.address ? `<span>📍 ${call.address}</span>` : ''}
        </div>

        <!-- Action Buttons (only if pending) -->
        ${call.call_status === 'pending' ? `
        <div style="padding:10px 12px;display:flex;gap:6px;flex-wrap:wrap;">
            <button onclick="_gd_markCall(${call.id},'answered')" style="padding:6px 12px;background:#059669;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">✅ Bắt máy</button>
            <button onclick="_gd_markCall(${call.id},'no_answer')" style="padding:6px 12px;background:#dc2626;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">📵 Không nghe</button>
            <button onclick="_gd_markCall(${call.id},'busy')" style="padding:6px 12px;background:#d97706;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">📞 Bận</button>
            <button onclick="_gd_markCall(${call.id},'invalid')" style="padding:6px 12px;background:#6b7280;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">❌ Không tồn tại</button>
        </div>` : ''}

        <!-- Answered: show answer status panel -->
        ${call.call_status === 'answered' && !call.answer_status_id ? `
        <div style="padding:12px;background:#f0fdf4;border-top:1px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:8px;">📋 Chọn tình trạng khi bắt máy:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                ${_gd_answerStatuses.map(as => `
                <button onclick="_gd_selectAnswerStatus(${call.id},${as.id},'${as.action_type}',${as.default_followup_days})"
                    style="padding:6px 10px;background:white;border:1px solid #d1d5db;border-radius:8px;font-size:11px;cursor:pointer;font-weight:600;">
                    ${as.icon} ${as.name}
                </button>`).join('')}
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:11px;">📝 Ghi chú</label>
                <textarea id="gdNotes_${call.id}" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;" rows="2" placeholder="Ghi chú cuộc gọi..."></textarea>
            </div>
        </div>` : ''}

        <!-- Show answer result if already set -->
        ${call.answer_status_id ? `
        <div style="padding:8px 12px;background:#f0fdf4;border-top:1px solid #bbf7d0;font-size:12px;">
            <span style="font-weight:700;color:#065f46;">${call.answer_status_icon || '📋'} ${call.answer_status_name || ''}</span>
            ${call.notes ? `<span style="color:#6b7280;margin-left:8px;">— ${call.notes}</span>` : ''}
            ${call.callback_date ? `<span style="background:#fef3c7;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:8px;">📅 Hẹn: ${call.callback_date}</span>` : ''}
        </div>` : ''}
    </div>`;
}

async function _gd_markCall(assignmentId, callStatus) {
    if (callStatus === 'answered') {
        // Just update status, don't set answer_status yet
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: 'answered' });
        if (res.success) { showToast('✅ Đã ghi nhận bắt máy'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    } else {
        // Direct status update for non-answer statuses
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: callStatus });
        if (res.success) { showToast(`Đã cập nhật: ${callStatus}`); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    }
}

async function _gd_selectAnswerStatus(assignmentId, answerStatusId, actionType, defaultFollowupDays) {
    const notes = document.getElementById(`gdNotes_${assignmentId}`)?.value || '';
    const call = _gd_calls.find(c => c.id === assignmentId);

    if (actionType === 'transfer') {
        // Open Chuyển Số form
        _gd_openChuyenSoForm(assignmentId, answerStatusId, notes, call);
    } else if (actionType === 'followup') {
        // Show date picker for follow-up
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + (defaultFollowupDays || 3));
        const dateStr = defaultDate.toISOString().split('T')[0];

        openModal('📅 Hẹn Gọi Lại', `
            <div class="form-group"><label>📅 Ngày hẹn</label><input type="date" id="gdCallbackDate" class="form-control" value="${dateStr}"></div>
            <div class="form-group"><label>⏰ Giờ hẹn (tuỳ chọn)</label><input type="time" id="gdCallbackTime" class="form-control"></div>
        `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
            <button class="btn btn-success" onclick="_gd_submitFollowup(${assignmentId},${answerStatusId})">💾 Lưu</button>`);
    } else {
        // Cold or None — just save
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', {
            call_status: 'answered', answer_status_id: answerStatusId, notes
        });
        if (res.success) { showToast('✅ Đã lưu'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    }
}

async function _gd_submitFollowup(assignmentId, answerStatusId) {
    const notes = document.getElementById(`gdNotes_${assignmentId}`)?.value || '';
    const callbackDate = document.getElementById('gdCallbackDate')?.value;
    const callbackTime = document.getElementById('gdCallbackTime')?.value;
    if (!callbackDate) return showToast('Chọn ngày hẹn', 'error');
    const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', {
        call_status: 'answered', answer_status_id: answerStatusId, notes,
        callback_date: callbackDate, callback_time: callbackTime || null
    });
    if (res.success) { showToast('✅ Đã hẹn gọi lại'); closeModal(); await _gd_loadCallsForUser(_gd_selectedUserId); }
    else showToast(res.error, 'error');
}

function _gd_openChuyenSoForm(assignmentId, answerStatusId, notes, call) {
    // Find CRM mapping from source
    const source = _gd_sources.find(s => s.name === call.source_name);
    const crmType = source?.crm_type || '';
    const crmLabel = crmType ? (CRM_TYPE_OPTIONS_TS || [{ value: crmType, label: crmType }]).find(o => o.value === crmType)?.label || crmType : 'Chọn CRM';

    // Build CRM options
    const crmOptions = [
        { value: 'nhu_cau', label: 'Chăm Sóc KH Nhu Cầu' },
        { value: 'hoa_hong_crm', label: 'CRM Giáo Viên/Học Sinh/Sinh Viên' },
        { value: 'nuoi_duong', label: 'CRM Nhân Sự/Kế Toán/P.Mua Hàng' },
        { value: 'sinh_vien', label: 'CRM Thể Thao/Thời Trang Local' },
        { value: 'koc_tiktok', label: 'CRM KOL Tiktok/Mẹ Bỉm Sữa' },
        { value: 'qua_tang', label: 'CRM Quà Tặng/Sự Kiện/Du Lịch' },
        { value: 'affiliate', label: 'CRM Affiliate Giới Thiệu' },
        { value: 'nguoi_than', label: 'CRM Người Thân/Bạn Bè' },
    ];
    const crmOptHtml = crmOptions.map(o => `<option value="${o.value}" ${o.value===crmType?'selected':''}>${o.label}</option>`).join('');

    openModal('📞 Chuyển Số — Hệ Thống CRM', `
        <div style="margin-bottom:12px;padding:10px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;">
            🔒 <strong>Nguồn Khách: GỌI ĐIỆN</strong> — Các trường SĐT, Tên KH không được chỉnh sửa
        </div>
        <div class="form-group"><label>📞 SĐT</label><input type="text" class="form-control" value="${call.phone}" readonly style="background:#f3f4f6;font-weight:700;"></div>
        <div class="form-group"><label>👤 Tên KH</label><input type="text" class="form-control" value="${call.customer_name || ''}" readonly style="background:#f3f4f6;"></div>
        <div class="form-group"><label>🏢 Tên Công Ty</label><input type="text" class="form-control" value="${call.company_name || ''}" readonly style="background:#f3f4f6;"></div>
        <div class="form-group"><label>📋 CRM Đích</label>
            <select id="gdChuyenSoCRM" class="form-control" ${crmType?'disabled':''}>${crmOptHtml}</select>
            ${crmType? `<small style="color:#059669;">✅ Tự động map: ${crmLabel}</small>` : '<small style="color:#d97706;">⚠️ Nguồn chưa map CRM, vui lòng chọn</small>'}
        </div>
        <div class="form-group"><label>📝 Ghi chú</label><textarea id="gdChuyenSoNotes" class="form-control" rows="3">${notes}</textarea></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="_gd_submitChuyenSo(${assignmentId},${answerStatusId},'${call.phone}','${(call.customer_name||'').replace(/'/g,"\\'")}','${(call.company_name||'').replace(/'/g,"\\'")}')">📞 Chuyển Số</button>`);
}

async function _gd_submitChuyenSo(assignmentId, answerStatusId, phone, customerName, companyName) {
    const crmType = document.getElementById('gdChuyenSoCRM')?.value;
    const notes = document.getElementById('gdChuyenSoNotes')?.value || '';

    if (!crmType) return showToast('Chọn CRM đích', 'error');

    // 1. Create customer in CRM
    const custRes = await apiCall('/api/customers', 'POST', {
        phone, name: customerName, company: companyName,
        source: 'GỌI ĐIỆN', crm_type: crmType, notes,
        assigned_to: currentUser.id
    });

    // 2. Update assignment with answer status + transferred customer
    const updateBody = {
        call_status: 'answered', answer_status_id: answerStatusId, notes,
        transferred_customer_id: custRes.customer?.id || custRes.lastInsertRowid || null
    };
    const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', updateBody);

    if (res.success) {
        showToast('✅ Chuyển số thành công! KH đã tạo trong CRM');
        closeModal();
        await _gd_loadCallsForUser(_gd_selectedUserId);
    } else showToast(res.error, 'error');
}

function _gd_changeDate(delta) {
    const d = new Date(_gd_date);
    d.setDate(d.getDate() + delta);
    _gd_date = d.toISOString().split('T')[0];
    _gd_loadCallsForUser(_gd_selectedUserId);
}

function _gd_formatDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}
