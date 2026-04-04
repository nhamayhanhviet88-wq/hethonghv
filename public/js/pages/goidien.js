// ========== GỌI ĐIỆN TELESALE — PREMIUM UI ==========

let _gd_selectedUserId = null;
let _gd_selectedUserName = '';
let _gd_date = new Date().toISOString().split('T')[0];
let _gd_calls = [];
let _gd_stats = null;
let _gd_sources = [];
let _gd_answerStatuses = [];
let _gd_activeSourceFilter = null;
let _gd_isManager = false;
let _gd_allUsers = [];
let _gd_allDepts = [];
let _gd_memberIds = new Set();
let _gd_sidebarDeptFilter = '';

async function renderGoiDienPage(container) {
    _gd_isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);
    container.innerHTML = `
        <div style="display:flex;height:calc(100vh - 120px);gap:0;">
            <div id="gdSidebar" style="width:280px;min-width:280px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-right:1.5px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:14px;border-bottom:1.5px solid #e2e8f0;">
                    <h4 style="margin:0 0 10px;color:#122546;font-size:14px;font-weight:800;">📞 Gọi Điện Telesale</h4>
                    <select id="gdDeptFilter" class="ts-select" style="width:100%;margin-bottom:8px;padding:8px 10px;" onchange="_gd_sidebarDeptFilter=this.value;_gd_renderSidebar()">
                        <option value="">📁 Tất cả phòng ban</option>
                    </select>
                </div>
                <div id="gdSidebarList" class="ts-scroll" style="flex:1;overflow:auto;padding:8px;"></div>
            </div>
            <div id="gdContent" style="flex:1;overflow:auto;padding:20px;">
                <div class="ts-empty">
                    <span class="ts-empty-icon">👈</span>
                    <div class="ts-empty-title">Chọn nhân viên bên trái</div>
                    <div class="ts-empty-desc">Chọn NV để xem danh sách SĐT gọi điện hôm nay</div>
                </div>
            </div>
        </div>`;

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
    _gd_memberIds = new Set((membersRes.members || []).filter(m => m.is_active).map(m => m.user_id));

    // Populate dept filter
    const deptSelect = document.getElementById('gdDeptFilter');
    if (deptSelect) {
        const deptsWithMembers = _gd_allDepts.filter(d => _gd_allUsers.some(u => u.department_id === d.id && _gd_memberIds.has(u.id)));
        deptsWithMembers.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id; opt.textContent = d.name;
            deptSelect.appendChild(opt);
        });
    }

    if (!_gd_isManager) {
        _gd_selectedUserId = currentUser.id;
        _gd_selectedUserName = currentUser.full_name || currentUser.username;
    }
    _gd_renderSidebar();
    if (_gd_selectedUserId) await _gd_loadCallsForUser(_gd_selectedUserId);
    else { // auto-select first
        const first = _gd_allUsers.find(u => _gd_memberIds.has(u.id));
        if (first) { _gd_selectedUserId = first.id; _gd_selectedUserName = first.full_name || first.username; await _gd_loadCallsForUser(first.id); }
    }
}

function _gd_avatarColor(n) { let h=0; for(let i=0;i<(n||'').length;i++) h=n.charCodeAt(i)+((h<<5)-h); return ['#3b82f6','#059669','#f59e0b','#8b5cf6','#06b6d4','#f43f5e','#ec4899','#6366f1'][Math.abs(h)%8]; }
function _gd_initials(n) { if(!n) return '?'; const p=n.trim().split(/\s+/); return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():n.substring(0,2).toUpperCase(); }

function _gd_renderSidebar() {
    const list = document.getElementById('gdSidebarList');
    if (!list) return;
    const filtered = _gd_allUsers.filter(u => {
        if (!_gd_memberIds.has(u.id)) return false;
        if (_gd_sidebarDeptFilter && String(u.department_id) !== _gd_sidebarDeptFilter) return false;
        return true;
    });

    const deptMap = {}; _gd_allDepts.forEach(d => { deptMap[d.id] = d.name; });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="ts-empty" style="padding:20px;"><span class="ts-empty-icon" style="font-size:28px;">📭</span><div class="ts-empty-title" style="font-size:12px;">Không có NV nào</div></div>`;
        return;
    }

    list.innerHTML = filtered.map(u => {
        const active = u.id === _gd_selectedUserId;
        const c = _gd_avatarColor(u.full_name || u.username);
        const dName = deptMap[u.department_id] || '';
        return `<div onclick="_gd_selectUser(${u.id},'${(u.full_name||u.username).replace(/'/g,"\\\\'")}')"
            style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:12px;margin-bottom:4px;transition:all 0.15s;
            ${active ? 'background:linear-gradient(135deg,#122546,#1e3a5f);color:white;box-shadow:0 4px 12px rgba(18,37,70,0.3);' : 'background:white;border:1.5px solid #e5e7eb;color:#374151;'}">
            <span class="ts-avatar" style="background:${active?'rgba(255,255,255,0.2)':c};width:36px;height:36px;font-size:13px;">${_gd_initials(u.full_name || u.username)}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}</div>
                <div style="font-size:10px;opacity:0.7;">${dName}</div>
            </div>
        </div>`;
    }).join('');
}

async function _gd_selectUser(userId, userName) {
    _gd_selectedUserId = userId; _gd_selectedUserName = userName;
    _gd_renderSidebar();
    await _gd_loadCallsForUser(userId);
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
    _gd_stats = statsRes.stats || { total:0, pending:0, answered:0, no_answer:0, busy:0, invalid:0 };
    const callbacks = callbacksRes.callbacks || [];
    const filteredCalls = _gd_activeSourceFilter ? _gd_calls.filter(c => c.source_name === _gd_activeSourceFilter) : _gd_calls;
    const totalAnswered = parseInt(_gd_stats.answered || 0);
    const targetCalls = 100; const totalPoints = 50;
    const earnedPoints = Math.round(Math.min(totalAnswered, targetCalls) / targetCalls * totalPoints);
    const progressPct = Math.min(100, Math.round(totalAnswered / targetCalls * 100));
    const sourcesInCalls = [...new Set(_gd_calls.map(c => c.source_name).filter(Boolean))];

    const miniCards = [
        { icon:'📊', val:_gd_stats.total, label:'Tổng SĐT', grad:'linear-gradient(135deg,#3b82f6,#6366f1)' },
        { icon:'⏸️', val:_gd_stats.pending, label:'Chưa gọi', grad:'linear-gradient(135deg,#f59e0b,#f97316)' },
        { icon:'✅', val:totalAnswered, label:'Bắt máy', grad:'linear-gradient(135deg,#059669,#14b8a6)' },
        { icon:'📵', val:parseInt(_gd_stats.no_answer||0)+parseInt(_gd_stats.busy||0), label:'Không nghe', grad:'linear-gradient(135deg,#f43f5e,#ef4444)' },
        { icon:'❌', val:_gd_stats.invalid, label:'K.tồn tại', grad:'linear-gradient(135deg,#6b7280,#9ca3af)' },
    ];

    el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <div>
                <h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">${_gd_selectedUserName}</h3>
                <div style="font-size:12px;color:#6b7280;">📅 ${_gd_formatDate(_gd_date)}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
                <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_gd_changeDate(-1)">◀</button>
                <input type="date" value="${_gd_date}" onchange="_gd_date=this.value;_gd_loadCallsForUser(${userId});" class="ts-select" style="padding:6px 10px;">
                <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_gd_changeDate(1)">▶</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;">
            ${miniCards.map(c => `<div class="ts-stat-card" style="background:${c.grad};color:white;padding:12px 10px;">
                <span class="ts-stat-icon" style="font-size:22px;">${c.icon}</span>
                <div class="ts-stat-val" style="font-size:20px;">${c.val}</div>
                <div class="ts-stat-label">${c.label}</div>
            </div>`).join('')}
        </div>
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#f0f9ff,#ecfdf5);border:1.5px solid #a7f3d0;border-radius:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#065f46;">📊 CV Điểm: ${totalAnswered}/${targetCalls} bắt máy → ${earnedPoints}/${totalPoints} điểm</span>
                <span style="font-size:12px;font-weight:800;color:${progressPct>=100?'#059669':'#2563eb'};">${progressPct}%</span>
            </div>
            <div style="background:#e5e7eb;border-radius:10px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#059669,#10b981,#34d399);height:100%;width:${progressPct}%;border-radius:10px;transition:width 0.5s ease;"></div>
            </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
            <button class="ts-source-pill${!_gd_activeSourceFilter?' active':''}" onclick="_gd_activeSourceFilter=null;_gd_loadCallsForUser(${userId});">
                Tất cả <span class="ts-pill-count">${_gd_calls.length}</span>
            </button>
            ${sourcesInCalls.map(s => {
                const cnt = _gd_calls.filter(c => c.source_name === s).length;
                return `<button class="ts-source-pill${_gd_activeSourceFilter===s?' active':''}" onclick="_gd_activeSourceFilter='${s}';_gd_loadCallsForUser(${userId});">
                    ${s} <span class="ts-pill-count">${cnt}</span>
                </button>`;
            }).join('')}
        </div>
        ${callbacks.length > 0 ? `
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:14px;">
            <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">🔔 Hẹn Gọi Lại Hôm Nay (${callbacks.length})</div>
            ${callbacks.map(cb => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;">
                <span style="font-weight:700;color:#d97706;font-family:monospace;">${cb.phone}</span>
                <span style="color:#374151;font-weight:600;">${cb.customer_name||''}</span>
                <span style="font-size:10px;color:#6b7280;">${cb.source_icon||''} ${cb.source_name||''}</span>
                ${cb.callback_time?`<span class="ts-badge" style="background:#fef3c7;color:#92400e;font-size:9px;">⏰ ${cb.callback_time}</span>`:''}</div>`).join('')}
        </div>` : ''}
        <div id="gdCallsList">
            ${filteredCalls.length === 0 ? `<div class="ts-empty"><span class="ts-empty-icon">📭</span><div class="ts-empty-title">Chưa có SĐT nào</div><div class="ts-empty-desc">Chưa có data được phân cho ngày này</div></div>` : ''}
            ${filteredCalls.map(call => _gd_renderCallCard(call)).join('')}
        </div>`;
}

function _gd_renderCallCard(call) {
    const st = {
        pending: { bg:'linear-gradient(135deg,#fffbeb,#fefce8)', border:'#fde68a', icon:'⏸️', label:'Chưa gọi', leftBorder:'#f59e0b' },
        answered: { bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#86efac', icon:'✅', label:'Bắt máy', leftBorder:'#059669' },
        no_answer: { bg:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'#fecaca', icon:'📵', label:'Không nghe', leftBorder:'#ef4444' },
        busy: { bg:'linear-gradient(135deg,#fff7ed,#ffedd5)', border:'#fed7aa', icon:'📞', label:'Máy bận', leftBorder:'#f97316' },
        invalid: { bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)', border:'#fbcfe8', icon:'❌', label:'K.tồn tại', leftBorder:'#ec4899' },
    }[call.call_status] || { bg:'#fefce8', border:'#fde68a', icon:'⏸️', label:'Chưa gọi', leftBorder:'#f59e0b' };

    return `
    <div style="border:1.5px solid ${st.border};border-left:4px solid ${st.leftBorder};border-radius:14px;margin-bottom:10px;overflow:hidden;background:white;transition:box-shadow 0.2s,transform 0.2s;"
        onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)';this.style.transform='translateY(-1px)'"
        onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
        <div style="padding:14px 16px;background:${st.bg};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:28px;">${st.icon}</div>
                <div>
                    <div style="font-size:14px;font-weight:800;color:#122546;">${call.customer_name || 'Chưa có tên'}</div>
                    <div style="font-size:16px;font-weight:700;color:#2563eb;font-family:'SF Mono',monospace;letter-spacing:0.5px;">${call.phone}</div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <span class="ts-badge" style="background:white;border:1.5px solid ${st.border};color:#374151;">${st.icon} ${st.label}</span>
                <span style="font-size:10px;color:#6b7280;">${call.source_icon||''} ${call.source_name||''}</span>
            </div>
        </div>
        <div style="padding:8px 16px;font-size:11px;color:#6b7280;display:flex;gap:16px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">
            ${call.company_name ? `<span>🏢 ${call.company_name}</span>` : ''}
            ${call.group_name ? `<span>👥 ${call.group_name}</span>` : ''}
            ${call.address ? `<span>📍 ${call.address}</span>` : ''}
        </div>
        ${call.call_status === 'pending' ? `
        <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="ts-btn ts-btn-green" onclick="_gd_markCall(${call.id},'answered')">✅ Bắt máy</button>
            <button class="ts-btn ts-btn-red" onclick="_gd_markCall(${call.id},'no_answer')">📵 Không nghe</button>
            <button class="ts-btn" style="background:linear-gradient(135deg,#f59e0b,#f97316);color:white;" onclick="_gd_markCall(${call.id},'busy')">📞 Bận</button>
            <button class="ts-btn ts-btn-ghost" onclick="_gd_markCall(${call.id},'invalid')">❌ K.tồn tại</button>
        </div>` : ''}
        ${call.call_status === 'answered' && !call.answer_status_id ? `
        <div style="padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:10px;">📋 Chọn tình trạng bắt máy:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                ${_gd_answerStatuses.map(as => `
                <button class="ts-btn ts-btn-ghost" onclick="_gd_selectAnswerStatus(${call.id},${as.id},'${as.action_type}',${as.default_followup_days})">${as.icon} ${as.name}</button>`).join('')}
            </div>
            <label style="font-size:11px;font-weight:600;color:#374151;">📝 Ghi chú</label>
            <textarea id="gdNotes_${call.id}" class="ts-search" style="width:100%;margin-top:4px;padding:8px;min-height:50px;resize:vertical;" placeholder="Ghi chú cuộc gọi..."></textarea>
        </div>` : ''}
        ${call.answer_status_id ? `
        <div style="padding:10px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="ts-badge" style="background:#dcfce7;color:#065f46;">${call.answer_status_icon||'📋'} ${call.answer_status_name||''}</span>
            ${call.notes ? `<span style="color:#6b7280;">— ${call.notes}</span>` : ''}
            ${call.callback_date ? `<span class="ts-badge" style="background:#fef3c7;color:#92400e;">📅 Hẹn: ${call.callback_date}</span>` : ''}
        </div>` : ''}
    </div>`;
}

// ========== CALL ACTIONS (unchanged logic) ==========
async function _gd_markCall(assignmentId, callStatus) {
    if (callStatus === 'answered') {
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: 'answered' });
        if (res.success) { showToast('✅ Đã ghi nhận bắt máy'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    } else {
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: callStatus });
        if (res.success) { showToast(`Đã cập nhật: ${callStatus}`); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    }
}

async function _gd_selectAnswerStatus(assignmentId, answerStatusId, actionType, defaultFollowupDays) {
    const notes = document.getElementById(`gdNotes_${assignmentId}`)?.value || '';
    const call = _gd_calls.find(c => c.id === assignmentId);
    if (actionType === 'transfer') { _gd_openChuyenSoForm(assignmentId, answerStatusId, notes, call); }
    else if (actionType === 'followup') {
        const defaultDate = new Date(); defaultDate.setDate(defaultDate.getDate() + (defaultFollowupDays || 3));
        openModal('📅 Hẹn Gọi Lại', `
            <div class="form-group"><label>📅 Ngày hẹn</label><input type="date" id="gdCallbackDate" class="form-control" value="${defaultDate.toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>⏰ Giờ hẹn</label><input type="time" id="gdCallbackTime" class="form-control"></div>
        `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
            <button class="ts-btn ts-btn-green" onclick="_gd_submitFollowup(${assignmentId},${answerStatusId})">💾 Lưu</button>`);
    } else {
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status:'answered', answer_status_id:answerStatusId, notes });
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
        call_status:'answered', answer_status_id:answerStatusId, notes,
        callback_date:callbackDate, callback_time:callbackTime||null
    });
    if (res.success) { showToast('✅ Đã hẹn gọi lại'); closeModal(); await _gd_loadCallsForUser(_gd_selectedUserId); }
    else showToast(res.error, 'error');
}

function _gd_openChuyenSoForm(assignmentId, answerStatusId, notes, call) {
    const source = _gd_sources.find(s => s.name === call.source_name);
    const crmType = source?.crm_type || '';
    const crmOptions = [
        {value:'nhu_cau',label:'Chăm Sóc KH Nhu Cầu'},{value:'hoa_hong_crm',label:'CRM Giáo Viên/Học Sinh/Sinh Viên'},
        {value:'nuoi_duong',label:'CRM Nhân Sự/Kế Toán/P.Mua Hàng'},{value:'sinh_vien',label:'CRM Thể Thao/Thời Trang Local'},
        {value:'koc_tiktok',label:'CRM KOL Tiktok/Mẹ Bỉm Sữa'},{value:'qua_tang',label:'CRM Quà Tặng/Sự Kiện/Du Lịch'},
        {value:'affiliate',label:'CRM Affiliate Giới Thiệu'},{value:'nguoi_than',label:'CRM Người Thân/Bạn Bè'},
    ];
    openModal('📞 Chuyển Số — CRM', `
        <div style="margin-bottom:12px;padding:10px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:12px;font-size:12px;color:#92400e;">
            🔒 <strong>Nguồn Khách: GỌI ĐIỆN</strong> — SĐT, Tên KH không được chỉnh sửa
        </div>
        <div class="form-group"><label>📞 SĐT</label><input type="text" class="form-control" value="${call.phone}" readonly style="background:#f3f4f6;font-weight:700;"></div>
        <div class="form-group"><label>👤 Tên KH</label><input type="text" class="form-control" value="${call.customer_name||''}" readonly style="background:#f3f4f6;"></div>
        <div class="form-group"><label>🏢 Công Ty</label><input type="text" class="form-control" value="${call.company_name||''}" readonly style="background:#f3f4f6;"></div>
        <div class="form-group"><label>📋 CRM Đích</label>
            <select id="gdChuyenSoCRM" class="form-control" ${crmType?'disabled':''}>${crmOptions.map(o=>`<option value="${o.value}" ${o.value===crmType?'selected':''}>${o.label}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>📝 Ghi chú</label><textarea id="gdChuyenSoNotes" class="form-control" rows="3">${notes}</textarea></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="ts-btn ts-btn-green" onclick="_gd_submitChuyenSo(${assignmentId},${answerStatusId},'${call.phone}','${(call.customer_name||'').replace(/'/g,"\\\\'")}','${(call.company_name||'').replace(/'/g,"\\\\'")}')">📞 Chuyển Số</button>`);
}

async function _gd_submitChuyenSo(assignmentId, answerStatusId, phone, customerName, companyName) {
    const crmType = document.getElementById('gdChuyenSoCRM')?.value;
    const notes = document.getElementById('gdChuyenSoNotes')?.value || '';
    if (!crmType) return showToast('Chọn CRM đích', 'error');
    const custRes = await apiCall('/api/customers', 'POST', { phone, name:customerName, company:companyName, source:'GỌI ĐIỆN', crm_type:crmType, notes, assigned_to:currentUser.id });
    const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', {
        call_status:'answered', answer_status_id:answerStatusId, notes,
        transferred_customer_id: custRes.customer?.id || custRes.lastInsertRowid || null
    });
    if (res.success) { showToast('✅ Chuyển số thành công!'); closeModal(); await _gd_loadCallsForUser(_gd_selectedUserId); }
    else showToast(res.error, 'error');
}

function _gd_changeDate(delta) {
    const d = new Date(_gd_date); d.setDate(d.getDate()+delta);
    _gd_date = d.toISOString().split('T')[0];
    _gd_loadCallsForUser(_gd_selectedUserId);
}

function _gd_formatDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
    return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}
