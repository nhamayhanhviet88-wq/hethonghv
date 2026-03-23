// ========== CẤP CỨU SẾP ==========
let _emActiveTab = 'pending'; // for NV tabs
let _emCountdownInterval = null;

// Inject blink animation
if (!document.getElementById('emBlinkStyle')) {
    const st = document.createElement('style');
    st.id = 'emBlinkStyle';
    st.textContent = '@keyframes emBlink{0%,100%{opacity:1}50%{opacity:0.4}}';
    document.head.appendChild(st);
}

function emGetCountdownHTML(e) {
    if (e.status === 'resolved' || !e.created_at) return '';
    const createdAt = new Date(e.created_at).getTime();
    const now = Date.now();
    const elapsed = now - createdAt;
    const limit = 24 * 3600000;
    const remaining = limit - elapsed;
    let text, bg, color, border, extra = '';
    if (remaining > 0) {
        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        text = '⏰ Còn ' + hrs + 'h ' + mins + 'p';
        if (remaining > 8 * 3600000) { bg='#dcfce7'; color='#166534'; border='#4ade80'; }
        else if (remaining > 3 * 3600000) { bg='#fef3c7'; color='#92400e'; border='#fbbf24'; }
        else { bg='#fef2f2'; color='#991b1b'; border='#f87171'; extra='animation:emBlink 1s infinite;'; }
    } else {
        const over = Math.abs(remaining);
        const hrs = Math.floor(over / 3600000);
        const mins = Math.floor((over % 3600000) / 60000);
        text = '❌ Quá hạn ' + hrs + 'h ' + mins + 'p';
        bg='#991b1b'; color='#fff'; border='#dc2626'; extra='animation:emBlink 1s infinite;';
    }
    return '<span class="em-countdown" data-created="' + e.created_at + '" style="display:inline-block;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;background:' + bg + ';color:' + color + ';border:1px solid ' + border + ';' + extra + '">' + text + '</span>';
}

function emIsOverdue(e) {
    if (e.status === 'resolved' || !e.created_at) return false;
    return (Date.now() - new Date(e.created_at).getTime()) > 24 * 3600000;
}

function emStartCountdown() {
    emStopCountdown();
    _emCountdownInterval = setInterval(function() {
        document.querySelectorAll('.em-countdown').forEach(function(el) {
            var created = el.dataset.created;
            if (!created) return;
            var createdAt = new Date(created).getTime();
            var elapsed = Date.now() - createdAt;
            var limit = 24 * 3600000;
            var remaining = limit - elapsed;
            if (remaining > 0) {
                var hrs = Math.floor(remaining / 3600000);
                var mins = Math.floor((remaining % 3600000) / 60000);
                el.textContent = '⏰ Còn ' + hrs + 'h ' + mins + 'p';
                if (remaining > 8 * 3600000) { el.style.background='#dcfce7'; el.style.color='#166534'; el.style.borderColor='#4ade80'; el.style.animation=''; }
                else if (remaining > 3 * 3600000) { el.style.background='#fef3c7'; el.style.color='#92400e'; el.style.borderColor='#fbbf24'; el.style.animation=''; }
                else { el.style.background='#fef2f2'; el.style.color='#991b1b'; el.style.borderColor='#f87171'; el.style.animation='emBlink 1s infinite'; }
            } else {
                var over = Math.abs(remaining);
                var hrs2 = Math.floor(over / 3600000);
                var mins2 = Math.floor((over % 3600000) / 60000);
                el.textContent = '❌ Quá hạn ' + hrs2 + 'h ' + mins2 + 'p';
                el.style.background='#991b1b'; el.style.color='#fff'; el.style.borderColor='#dc2626'; el.style.animation='emBlink 1s infinite';
                var card = el.closest('.card');
                if (card) card.style.background = 'rgba(220,38,38,0.06)';
            }
        });
    }, 60000);
}

function emStopCountdown() {
    if (_emCountdownInterval) { clearInterval(_emCountdownInterval); _emCountdownInterval = null; }
}

function emRenderCard(e, showActions) {
    const statusColor = e.status === 'pending' ? 'var(--danger)' :
                       e.status === 'in_progress' ? 'var(--warning)' : 'var(--success)';
    const statusText = e.status === 'pending' ? '🔴 Chờ xử lý' :
                      e.status === 'in_progress' ? '🟡 Đang xử lý' : '🟢 Đã xử lý';

    const myId = currentUser.id;
    const isHandler = myId === e.handler_id;
    const isHandoverTarget = myId === e.handover_to;
    const handoverPending = e.handover_status === 'pending';
    const isGD = currentUser.role === 'giam_doc';
    const overdue = emIsOverdue(e);

    // Determine action buttons
    let actionBtns = '';
    if (e.status !== 'resolved' && showActions) {
        if (handoverPending && isHandler) {
            actionBtns += `<span style="font-size:11px;color:#6366f1;font-weight:600;">📤 Đã bàn giao → ${e.handover_to_name || '...'}</span>`;
            actionBtns += `<button class="btn btn-sm" onclick="emCancelHandover(${e.id})" style="font-size:11px;background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;">❌ Hủy BG</button>`;
        } else if (handoverPending && isHandoverTarget) {
            actionBtns += `<span style="font-size:11px;color:#f59e0b;font-weight:600;">⏳ Chờ bạn chấp nhận</span>`;
            actionBtns += `<button class="btn btn-sm" onclick="emAcceptHandover(${e.id})" style="font-size:11px;background:var(--success);color:white;">✅ Chấp Nhận</button>`;
            actionBtns += `<button class="btn btn-sm" onclick="emRejectHandover(${e.id})" style="font-size:11px;background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;">❌ Từ Chối</button>`;
        } else if (!handoverPending && (isHandler || isGD)) {
            actionBtns += `<button class="btn btn-sm" onclick="resolveEmergency(${e.id}, ${e.customer_id})" style="font-size:12px;background:var(--gold);color:var(--navy);">📝 Tư Vấn</button>`;
            if (isHandler && ['truong_phong','quan_ly'].includes(currentUser.role)) {
                actionBtns += `<button class="btn btn-sm" onclick="emHandover(${e.id})" style="font-size:11px;background:#eef2ff;color:#4338ca;border:1px solid #a5b4fc;">🔄 Bàn Giao</button>`;
            }
        }
    }

    // Handover info line
    let handoverInfo = '';
    if (handoverPending) {
        const elapsed = e.handover_at ? Math.floor((Date.now() - new Date(e.handover_at).getTime()) / 60000) : 0;
        const remaining = Math.max(0, 30 - elapsed);
        handoverInfo = `<div style="margin-top:6px;padding:6px 12px;background:#fef3c7;border-radius:6px;font-size:11px;color:#92400e;">
            ⏰ Bàn giao cho <strong>${e.handover_to_name}</strong> — còn <strong>${remaining} phút</strong> để chấp nhận
        </div>`;
    } else if (e.handover_status === 'accepted' && e.handover_to_name) {
        handoverInfo = `<div style="margin-top:6px;padding:6px 12px;background:#dcfce7;border-radius:6px;font-size:11px;color:#166534;">
            ✅ Đã bàn giao cho <strong>${e.handover_to_name}</strong>
        </div>`;
    }

    const countdownHTML = (e.status !== 'resolved') ? emGetCountdownHTML(e) : '';
    const cardBg = overdue ? 'background:rgba(220,38,38,0.06);' : '';
    const borderColor = overdue ? '#dc2626' : statusColor;

    return `<div class="card" style="margin-bottom: 12px; border-left: 4px solid ${borderColor};${cardBg}">
        <div class="card-body" style="padding: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <span style="font-weight:700; font-size:15px;">🚨 ${e.customer_name || 'N/A'} — ${e.customer_phone || ''}</span>
                        ${countdownHTML}
                    </div>
                    <div style="color:var(--gray-400); font-size:13px; margin-top:4px;">
                        👤 Gửi bởi: <strong>${e.requested_by_name}</strong>
                        • 🕐 ${formatDateTime(e.created_at)}
                        ${e.handler_name ? `• 📋 Xử lý: <strong>${e.handler_name}</strong>` : ''}
                    </div>
                    <div style="margin-top:8px; padding:10px 14px; background:rgba(239,68,68,0.08); border-radius:8px; font-size:13px; line-height:1.5;">
                        <strong>Tình huống:</strong> ${e.reason}
                    </div>
                    ${e.resolved_note ? `<div style="margin-top:8px; padding:10px 14px; background:rgba(76,175,80,0.1); border-radius:8px; font-size:13px; line-height:1.5;">
                        ✅ <strong>Tư vấn:</strong> ${e.resolved_note} — <em>${e.resolved_by_name}</em>
                    </div>` : ''}
                    ${handoverInfo}
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                    <span style="color:${statusColor}; font-size:13px; font-weight:600;">${statusText}</span>
                    ${actionBtns}
                    <button class="btn btn-sm" onclick="viewEmergencyHistory(${e.customer_id})" style="font-size:11px;">📜 Lịch Sử</button>
                </div>
            </div>
        </div>
    </div>`;
}

// Handover modal — pick target
async function emHandover(emergencyId) {
    const data = await apiCall('/api/emergencies/handlers');
    const handlers = data.handlers || [];
    // TP can handover to QL/GD, QL can handover to GD
    let targets = [];
    if (currentUser.role === 'truong_phong') {
        targets = handlers.filter(h => ['quan_ly','giam_doc'].includes(h.role));
    } else if (currentUser.role === 'quan_ly') {
        targets = handlers.filter(h => h.role === 'giam_doc');
    }
    if (targets.length === 0) {
        showToast('Không tìm thấy người nhận bàn giao', 'error'); return;
    }

    const ROLE_LABELS_HO = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng' };
    const bodyHTML = `
        <div class="form-group">
            <label>Chọn người nhận bàn giao <span style="color:var(--danger)">*</span></label>
            <select id="handoverTarget" class="form-control">
                ${targets.map(t => `<option value="${t.id}">${t.full_name} (${ROLE_LABELS_HO[t.role] || t.role})</option>`).join('')}
            </select>
        </div>
        <div style="padding:10px;background:#fef3c7;border-radius:6px;border:1px solid #fbbf24;font-size:12px;color:#92400e;">
            ⏰ Người nhận có <strong>30 phút</strong> để chấp nhận. Nếu quá hạn, công việc sẽ trở lại cho bạn.
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="emSubmitHandover(${emergencyId})" style="width:auto;">🔄 Bàn Giao</button>
    `;
    openModal('🔄 Bàn Giao Cấp Cứu', bodyHTML, footerHTML);
}

async function emSubmitHandover(emergencyId) {
    const targetId = document.getElementById('handoverTarget')?.value;
    if (!targetId) { showToast('Vui lòng chọn người nhận', 'error'); return; }
    try {
        const data = await apiCall(`/api/emergencies/${emergencyId}/handover`, 'POST', { target_id: Number(targetId) });
        if (data.success) { showToast('✅ ' + data.message); closeModal(); handleRoute(); }
        else { showToast(data.error, 'error'); }
    } catch (err) { showToast('Lỗi kết nối', 'error'); }
}

async function emAcceptHandover(emergencyId) {
    try {
        const data = await apiCall(`/api/emergencies/${emergencyId}/accept-handover`, 'POST');
        if (data.success) { showToast('✅ ' + data.message); handleRoute(); }
        else { showToast(data.error, 'error'); }
    } catch (err) { showToast('Lỗi kết nối', 'error'); }
}

async function emRejectHandover(emergencyId) {
    // Reject = cancel from recipient side — revert to original handler
    try {
        const data = await apiCall(`/api/emergencies/${emergencyId}/cancel-handover`, 'POST');
        if (data.success) { showToast('✅ Đã từ chối bàn giao'); handleRoute(); }
        else { showToast(data.error, 'error'); }
    } catch (err) { showToast('Lỗi kết nối', 'error'); }
}

async function emCancelHandover(emergencyId) {
    try {
        const data = await apiCall(`/api/emergencies/${emergencyId}/cancel-handover`, 'POST');
        if (data.success) { showToast('✅ ' + data.message); handleRoute(); }
        else { showToast(data.error, 'error'); }
    } catch (err) { showToast('Lỗi kết nối', 'error'); }
}

function emRenderDateGrouped(items, showActions) {
    if (items.length === 0) {
        return `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Không có mục nào</div>`;
    }
    // Group by month/year, then by date
    const monthGroups = {};
    items.forEach(e => {
        const dateStr = e.resolved_at || e.created_at || '';
        const dt = new Date(dateStr);
        if (isNaN(dt.getTime())) return;
        const monthKey = `Tháng ${dt.getMonth()+1} / ${dt.getFullYear()}`;
        const dayKey = `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`;
        if (!monthGroups[monthKey]) monthGroups[monthKey] = { sortVal: dt.getFullYear() * 100 + (dt.getMonth()+1), days: {} };
        if (!monthGroups[monthKey].days[dayKey]) monthGroups[monthKey].days[dayKey] = [];
        monthGroups[monthKey].days[dayKey].push(e);
    });

    // Sort months descending
    const sortedMonths = Object.entries(monthGroups).sort((a, b) => b[1].sortVal - a[1].sortVal);

    const now = new Date();
    const currentMonthKey = `Tháng ${now.getMonth()+1} / ${now.getFullYear()}`;

    return sortedMonths.map(([monthKey, { days }]) => {
        const monthTotal = Object.values(days).reduce((s, arr) => s + arr.length, 0);
        const mId = 'emm_' + Math.random().toString(36).slice(2,8);
        const isCurrentMonth = monthKey === currentMonthKey;

        // Sort days descending within month
        const sortedDays = Object.entries(days).sort((a, b) => {
            const [dA, mA, yA] = a[0].split('/').map(Number);
            const [dB, mB, yB] = b[0].split('/').map(Number);
            return (yB * 10000 + mB * 100 + dB) - (yA * 10000 + mA * 100 + dA);
        });

        const daysHTML = sortedDays.map(([dayKey, list]) => {
            const gId = 'emg_' + dayKey.replace(/\//g, '_') + '_' + Math.random().toString(36).slice(2,6);
            const dayOpen = isCurrentMonth;
            return `
            <div style="margin-bottom:8px;margin-left:12px;">
                <div onclick="var p=document.getElementById('${gId}');p.style.display=p.style.display==='none'?'block':'none';this.querySelector('.em-arrow').textContent=p.style.display==='none'?'▶':'▼';"
                    style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:#f0fdf4;border-radius:6px;border-left:3px solid var(--success);cursor:pointer;user-select:none;">
                    <span style="font-size:12px;">📅</span>
                    <span style="font-weight:700;font-size:12px;color:#166534;">${dayKey}</span>
                    <span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600;">${list.length}</span>
                    <span class="em-arrow" style="margin-left:auto;font-size:10px;color:#166534;">${dayOpen ? '▼' : '▶'}</span>
                </div>
                <div id="${gId}" style="display:${dayOpen ? 'block' : 'none'};margin-top:6px;">
                    ${list.map(e => emRenderCard(e, showActions)).join('')}
                </div>
            </div>`;
        }).join('');

        return `
        <div style="margin-bottom:16px;">
            <div onclick="var p=document.getElementById('${mId}');p.style.display=p.style.display==='none'?'block':'none';this.querySelector('.em-arrow').textContent=p.style.display==='none'?'▶':'▼';"
                style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px 14px;background:#122546;border-radius:8px;cursor:pointer;user-select:none;">
                <span style="font-size:14px;">📆</span>
                <span style="font-weight:700;font-size:13px;color:#fad24c;">${monthKey}</span>
                <span style="background:rgba(250,210,76,0.2);color:#fad24c;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;">${monthTotal}</span>
                <span class="em-arrow" style="margin-left:auto;font-size:11px;color:#fad24c;">${isCurrentMonth ? '▼' : '▶'}</span>
            </div>
            <div id="${mId}" style="display:${isCurrentMonth ? 'block' : 'none'};">
                ${daysHTML}
            </div>
        </div>`;
    }).join('');
}

function emRenderSection(title, icon, items, showActions) {
    const count = items.length;
    return `
    <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 16px;background:#f8fafc;border-radius:10px;border-left:4px solid ${icon === '🔴' ? 'var(--danger)' : icon === '🟡' ? 'var(--warning)' : 'var(--success)'};">
            <span style="font-size:18px;">${icon}</span>
            <span style="font-weight:700;font-size:14px;color:#122546;">${title}</span>
            <span style="background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:700;">${count}</span>
        </div>
        ${count === 0
            ? `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Không có mục nào</div>`
            : items.map(e => emRenderCard(e, showActions)).join('')}
    </div>`;
}

function emRenderSectionGrouped(title, icon, items, showActions) {
    const count = items.length;
    return `
    <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 16px;background:#f8fafc;border-radius:10px;border-left:4px solid var(--success);">
            <span style="font-size:18px;">${icon}</span>
            <span style="font-weight:700;font-size:14px;color:#122546;">${title}</span>
            <span style="background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:700;">${count}</span>
        </div>
        ${emRenderDateGrouped(items, showActions)}
    </div>`;
}

async function renderEmergencyPage(container) {
    container.innerHTML = `<div class="card"><div class="card-body" id="emergencyList">
        <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
    </div></div>`;

    const data = await apiCall('/api/emergencies');
    const area = document.getElementById('emergencyList');
    const all = data.emergencies || [];
    const role = currentUser.role;
    const myId = currentUser.id;

    if (all.length === 0) {
        area.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Không có cấp cứu</h3></div>`;
        return;
    }

    const allPending = all.filter(e => e.status !== 'resolved');
    const allResolved = all.filter(e => e.status === 'resolved');

    // Sort pending by created_at ascending = most urgent (least time remaining) first
    const sortByUrgency = (arr) => arr.sort((a, b) => {
        const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aT - bT;
    });
    sortByUrgency(allPending);

    // Tab buttons — red for pending, green for completed
    let html = `
    <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="btn btn-sm" onclick="emSwitchTab('pending')" style="font-size:13px;padding:8px 16px;border-radius:8px;${_emActiveTab === 'pending' ? 'background:#dc2626;color:white;font-weight:700;box-shadow:0 2px 8px rgba(220,38,38,0.3);' : 'background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;'}">🔴 Chờ Xử Lý (${allPending.length})</button>
        <button class="btn btn-sm" onclick="emSwitchTab('resolved')" style="font-size:13px;padding:8px 16px;border-radius:8px;${_emActiveTab === 'resolved' ? 'background:#16a34a;color:white;font-weight:700;box-shadow:0 2px 8px rgba(22,163,74,0.3);' : 'background:#f0fdf4;color:#166534;border:1px solid #86efac;'}">🟢 Hoàn Thành (${allResolved.length})</button>
    </div>`;

    if (role === 'nhan_vien') {
        if (_emActiveTab === 'pending') {
            html += allPending.length === 0
                ? '<div style="text-align:center;padding:30px;color:#9ca3af;">Không có cấp cứu chờ xử lý</div>'
                : allPending.map(e => emRenderCard(e, false)).join('');
        } else {
            html += allResolved.length === 0
                ? '<div style="text-align:center;padding:30px;color:#9ca3af;">Chưa có cấp cứu hoàn thành</div>'
                : emRenderDateGrouped(allResolved, false);
        }

    } else if (role === 'truong_phong' || role === 'quan_ly') {
        const myPending = all.filter(e => e.requested_by === myId && e.status !== 'resolved');
        const myResolved = all.filter(e => e.requested_by === myId && e.status === 'resolved');
        const supportPending = all.filter(e => e.requested_by !== myId && e.status !== 'resolved');
        const supportResolved = all.filter(e => e.requested_by !== myId && e.status === 'resolved');
        sortByUrgency(myPending);
        sortByUrgency(supportPending);

        if (_emActiveTab === 'pending') {
            html += `<h3 style="font-size:16px;color:#122546;margin-bottom:12px;border-bottom:2px solid var(--gold);padding-bottom:8px;">🚨 Cấp Cứu Của Tôi</h3>`;
            html += emRenderSection('Chờ xử lý', '🔴', myPending, true);
            html += `<h3 style="font-size:16px;color:#122546;margin:24px 0 12px;border-bottom:2px solid #6366f1;padding-bottom:8px;">📋 Hỗ Trợ Nhân Viên</h3>`;
            html += emRenderSection('Chờ xử lý', '🔴', supportPending, true);
        } else {
            html += `<h3 style="font-size:16px;color:#122546;margin-bottom:12px;border-bottom:2px solid var(--gold);padding-bottom:8px;">🚨 Cấp Cứu Của Tôi</h3>`;
            html += emRenderSectionGrouped('Đã hoàn thành', '🟢', myResolved, false);
            html += `<h3 style="font-size:16px;color:#122546;margin:24px 0 12px;border-bottom:2px solid #6366f1;padding-bottom:8px;">📋 Hỗ Trợ Nhân Viên</h3>`;
            html += emRenderSectionGrouped('Đã hoàn thành', '🟢', supportResolved, false);
        }

    } else if (role === 'giam_doc') {
        const directPending = all.filter(e => e.handler_id === myId && e.status !== 'resolved');
        const subordinatePending = all.filter(e => e.handler_id !== myId && e.status !== 'resolved');
        const directResolved = all.filter(e => e.resolved_by === myId && e.status === 'resolved');
        const subordinateResolved = all.filter(e => e.status === 'resolved' && e.resolved_by !== myId);
        sortByUrgency(directPending);
        sortByUrgency(subordinatePending);

        if (_emActiveTab === 'pending') {
            html += `<h3 style="font-size:16px;color:#122546;margin-bottom:12px;border-bottom:2px solid var(--danger);padding-bottom:8px;">🔴 Chờ Xử Lý — GĐ Trực Tiếp</h3>`;
            html += emRenderSection('Nhân viên yêu cầu GĐ xử lý', '🔴', directPending, true);
            html += `<h3 style="font-size:16px;color:#122546;margin:24px 0 12px;border-bottom:2px solid var(--warning);padding-bottom:8px;">🟡 Cấp Dưới Đang Xử Lý</h3>`;
            html += emRenderSection('TP/QL đang xử lý cho nhân viên', '🟡', subordinatePending, true);
        } else {
            html += `<h3 style="font-size:16px;color:#122546;margin-bottom:12px;border-bottom:2px solid var(--success);padding-bottom:8px;">🟢 Hoàn Thành — GĐ Đã Xử Lý</h3>`;
            html += emRenderSectionGrouped('GĐ trực tiếp xử lý xong', '🟢', directResolved, false);
            html += `<h3 style="font-size:16px;color:#122546;margin:24px 0 12px;border-bottom:2px solid #6366f1;padding-bottom:8px;">✅ Hoàn Thành — TP/QL Đã Xử Lý</h3>`;
            html += emRenderSectionGrouped('TP/QL đã xử lý cho nhân viên', '✅', subordinateResolved, false);
        }
    }

    area.innerHTML = html;
    if (_emActiveTab === 'pending') emStartCountdown(); else emStopCountdown();
}

function emSwitchTab(tab) {
    _emActiveTab = tab;
    const container = document.getElementById('contentArea');
    if (container) renderEmergencyPage(container);
}

async function viewEmergencyHistory(customerId) {
    if (!customerId) return;
    const data = await apiCall(`/api/customers/${customerId}/consult`);
    const logs = data.logs || [];
    
    const bodyHTML = logs.length === 0 
        ? '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có lịch sử</h3></div>'
        : `<div class="consult-timeline">
            ${logs.map(log => {
                const t = CONSULT_TYPES[log.log_type] || { label: log.log_type, icon: '📋', color: '#666' };
                return `<div class="timeline-item">
                    <div class="timeline-dot" style="background:${t.color};">${t.icon}</div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-type" style="color:${t.color}">${t.label}</span>
                            <span class="timeline-time">${formatDate(log.created_at)} — ${log.logged_by_name || 'N/A'}</span>
                        </div>
                        ${log.content ? `<div class="timeline-text">${log.content}</div>` : ''}
                        ${log.image_path ? `<div class="timeline-image"><img src="${log.image_path}" onclick="window.open('${log.image_path}','_blank')" style="max-width:300px;max-height:200px;border-radius:6px;cursor:pointer;margin-top:6px;"></div>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>`;

    openModal('📜 Lịch Sử Tư Vấn', bodyHTML, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);
}

function resolveEmergency(id, customerId) {
    const bodyHTML = `
        <div class="form-group">
            <label>Nội dung tư vấn chiến lược <span style="color:var(--danger)">*</span></label>
            <textarea id="resolveNote" class="form-control" rows="4" placeholder="Nhập nội dung tư vấn cho nhân viên..."></textarea>
        </div>
        <div class="form-group">
            <label>Hình Ảnh (Ctrl+V để dán)</label>
            <div id="resolveImageArea" class="image-paste-area" tabindex="0">
                <div id="resolveImagePlaceholder">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                <img id="resolveImagePreview" style="display:none;max-width:100%;max-height:200px;border-radius:8px;">
                <button id="resolveImageRemove" class="btn btn-sm" style="display:none;position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:2px 8px;" onclick="removeResolveImage()">✕</button>
            </div>
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="submitResolve(${id}, ${customerId})" style="width:auto;">✅ GỬI TƯ VẤN</button>
    `;
    openModal('📝 Tư Vấn Chiến Lược', bodyHTML, footerHTML);

    window._resolveImageBlob = null;
    setTimeout(() => {
        const area = document.getElementById('resolveImageArea');
        if (area) {
            area.addEventListener('paste', (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        window._resolveImageBlob = blob;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            document.getElementById('resolveImagePreview').src = ev.target.result;
                            document.getElementById('resolveImagePreview').style.display = 'block';
                            document.getElementById('resolveImagePlaceholder').style.display = 'none';
                            document.getElementById('resolveImageRemove').style.display = 'block';
                        };
                        reader.readAsDataURL(blob);
                        break;
                    }
                }
            });
            area.addEventListener('click', () => area.focus());
        }
    }, 100);
}

function removeResolveImage() {
    window._resolveImageBlob = null;
    document.getElementById('resolveImagePreview').style.display = 'none';
    document.getElementById('resolveImagePlaceholder').style.display = 'block';
    document.getElementById('resolveImageRemove').style.display = 'none';
}

async function submitResolve(id, customerId) {
    const note = document.getElementById('resolveNote').value;
    if (!note) { showToast('Vui lòng nhập nội dung tư vấn!', 'error'); return; }

    try {
        // If there's an image, save as consultation log first
        if (customerId && window._resolveImageBlob) {
            const formData = new FormData();
            formData.append('log_type', 'cap_cuu_sep');
            formData.append('content', `✅ Tư vấn Sếp: ${note}`);
            formData.append('image', window._resolveImageBlob, 'screenshot.png');
            await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
        } else if (customerId) {
            // Save consultation log without image
            const formData = new FormData();
            formData.append('log_type', 'cap_cuu_sep');
            formData.append('content', `✅ Tư vấn Sếp: ${note}`);
            await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
        }

        // Mark emergency as resolved
        const data = await apiCall(`/api/emergencies/${id}/resolve`, 'PUT', { note, status: 'resolved' });
        if (data.success) {
            showToast('✅ Đã tư vấn chiến lược thành công!');
            closeModal();
            window._resolveImageBlob = null;
            handleRoute();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối!', 'error');
    }
}

// ========== HỦY KHÁCH HÀNG (danh sách chờ duyệt) ==========
let _cancelFilter = 'all'; // all, pending, approved, rejected

async function renderCancelPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <h3>📋 Hủy Khách Hàng</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm cancel-filter-btn active" data-filter="all" onclick="cancelFilterChange('all')" style="font-size:12px;font-weight:700;">Tất cả</button>
                    <button class="btn btn-sm cancel-filter-btn" data-filter="pending" onclick="cancelFilterChange('pending')" style="font-size:12px;font-weight:700;background:#f59e0b;color:#fff;border:1px solid #d97706;">⏳ Chờ Duyệt</button>
                    <button class="btn btn-sm cancel-filter-btn" data-filter="approved" onclick="cancelFilterChange('approved')" style="font-size:12px;font-weight:700;background:#16a34a;color:#fff;border:1px solid #15803d;">✅ Đã Duyệt</button>
                    <button class="btn btn-sm cancel-filter-btn" data-filter="rejected" onclick="cancelFilterChange('rejected')" style="font-size:12px;font-weight:700;background:#dc2626;color:#fff;border:1px solid #b91c1c;">❌ Từ Chối</button>
                </div>
            </div>
            <div class="card-body" style="overflow-x:auto;" id="cancelList">
                <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
            </div>
        </div>
    `;

    _cancelFilter = 'all';
    // Auto-revert expired cancel requests on page load
    try { await apiCall('/api/cancel/auto-revert-expired', 'POST'); } catch(e) {}
    await cancelLoadList();
}

function cancelFilterChange(filter) {
    _cancelFilter = filter;
    document.querySelectorAll('.cancel-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
        if (btn.dataset.filter === filter) {
            btn.style.outline = '2px solid var(--gold)';
            btn.style.fontWeight = '700';
        } else {
            btn.style.outline = 'none';
            btn.style.fontWeight = '400';
        }
    });
    cancelLoadList();
}

async function cancelLoadList() {
    let url = '/api/customers?cancel_requested=1';
    if (_cancelFilter === 'pending') url += '&cancel_approved=0';
    else if (_cancelFilter === 'approved') url += '&cancel_approved=1';
    else if (_cancelFilter === 'rejected') url += '&cancel_approved=-1';

    const data = await apiCall(url);
    const area = document.getElementById('cancelList');

    if (!data.customers || data.customers.length === 0) {
        area.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Không có yêu cầu hủy nào</h3></div>`;
        return;
    }

    // Split by status
    let pending = data.customers.filter(c => c.cancel_approved === 0);
    const approved = data.customers.filter(c => c.cancel_approved === 1);
    const rejected = data.customers.filter(c => c.cancel_approved === -1);

    // Sort pending by urgency: oldest request first = least remaining time = most urgent
    pending.sort((a, b) => {
        const aT = a.cancel_requested_at ? new Date(a.cancel_requested_at).getTime() : 0;
        const bT = b.cancel_requested_at ? new Date(b.cancel_requested_at).getTime() : 0;
        return aT - bT;
    });

    const now = new Date();
    const currentMonthKey = `Tháng ${now.getMonth() + 1} / ${now.getFullYear()}`;

    // Group items by month
    function groupByMonth(items) {
        const groups = {};
        items.forEach(c => {
            const d = c.cancel_requested_at || c.created_at || '';
            const dt = new Date(d);
            const key = isNaN(dt.getTime()) ? 'Không rõ' : `Tháng ${dt.getMonth() + 1} / ${dt.getFullYear()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        // Sort months descending
        const sorted = Object.keys(groups).sort((a, b) => {
            if (a === 'Không rõ') return 1;
            if (b === 'Không rõ') return -1;
            const [, mA, yA] = a.match(/Tháng (\d+) \/ (\d+)/) || [];
            const [, mB, yB] = b.match(/Tháng (\d+) \/ (\d+)/) || [];
            return (yB * 12 + +mB) - (yA * 12 + +mA);
        });
        return { groups, sorted };
    }

    // Render a customer row
    function renderRow(c) {
        const isPending = c.cancel_approved === 0;
        const isApproved = c.cancel_approved === 1;
        const isRejected = c.cancel_approved === -1;
        const isAutoReverted = isRejected && (c.cancel_reason || '').includes('Tự động từ chối');

        let countdownHTML = '';
        if (isPending && c.cancel_requested_at) {
            const reqAt = new Date(c.cancel_requested_at).getTime();
            const remaining = (reqAt + 24*3600000) - Date.now();
            if (remaining > 0) {
                const hrs = Math.floor(remaining / 3600000);
                const mins = Math.floor((remaining % 3600000) / 60000);
                let cbg, ccol, cborder;
                if (remaining > 8*3600000) { cbg='#dcfce7'; ccol='#166534'; cborder='#4ade80'; }
                else if (remaining > 3*3600000) { cbg='#fef3c7'; ccol='#92400e'; cborder='#fbbf24'; }
                else { cbg='#fef2f2'; ccol='#991b1b'; cborder='#f87171'; }
                countdownHTML = `<span style="padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;background:${cbg};color:${ccol};border:1px solid ${cborder};">⏰ Còn ${hrs}h ${mins}p</span>`;
            } else {
                countdownHTML = '<span style="padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#991b1b;color:#fff;border:1px solid #dc2626;">❌ Quá hạn</span>';
            }
        } else if (isApproved) {
            countdownHTML = '<span style="font-size:11px;color:#166534;font-weight:600;">✅ Đã duyệt</span>';
        } else if (isRejected) {
            countdownHTML = isAutoReverted
                ? '<span style="font-size:11px;color:#dc2626;font-weight:600;">⏰ Hết hạn</span>'
                : '<span style="font-size:11px;color:#991b1b;font-weight:600;">❌ Từ chối</span>';
        }

        const statusBadge = isPending
            ? '<span style="background:#f59e0b;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">⏳ Chờ Duyệt</span>'
            : isApproved
            ? '<span style="background:#16a34a;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">✅ Đã Duyệt</span>'
            : '<span style="background:#dc2626;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">❌ Từ Chối</span>';
        const crmLabels = {nhu_cau:'Nhu Cầu',ctv:'CTV',ctv_hoa_hong:'CTV/HH',nuoi_duong:'Nuôi Dưỡng',sinh_vien:'Sinh Viên',koc_tiktok:'KOC'};

        return `<tr style="${isApproved ? 'background:rgba(220,38,38,0.04);' : isAutoReverted ? 'background:rgba(251,191,36,0.06);' : isRejected ? 'background:rgba(245,158,11,0.04);' : ''}">
            <td><strong style="color:#e67e22;font-size:13px;">${getCustomerCode(c)}</strong></td>
            <td style="font-weight:700;color:#1e293b;">${c.customer_name}</td>
            <td style="font-weight:600;color:#334155;">${c.phone}</td>
            <td><span style="font-size:11px;font-weight:700;color:#4338ca;background:#eef2ff;padding:2px 8px;border-radius:6px;">${crmLabels[c.crm_type] || c.crm_type}</span></td>
            <td style="color:#dc2626;font-weight:600;max-width:200px;white-space:pre-line;font-size:12px;">${(c.cancel_reason || '-').replace(/\\n/g,'\n')}</td>
            <td style="font-weight:600;color:#1e40af;">${c.cancel_requested_by_name || '-'}</td>
            <td style="font-size:12px;font-weight:600;color:#334155;">${formatDateTime(c.cancel_requested_at)}</td>
            <td>${countdownHTML}</td>
            <td>${statusBadge}</td>
            <td>
                ${isPending ? `
                    <button class="btn btn-sm" onclick="approveCancel(${c.id}, true)" style="background:var(--success);color:white;font-size:11px;padding:4px 10px;">✅ Duyệt</button>
                    <button class="btn btn-sm" onclick="approveCancel(${c.id}, false)" style="background:var(--danger);color:white;font-size:11px;padding:4px 10px;">❌ Từ chối</button>
                ` : isAutoReverted ? `
                    <span style="font-size:11px;color:#f59e0b;font-weight:700;">⏰ Đã trả về NV</span>
                ` : `<span style="font-size:13px;font-weight:700;color:#1e40af;">${c.cancel_approved_by_name ? 'Bởi: ' + c.cancel_approved_by_name : ''}</span>`}
            </td>
        </tr>`;
    }

    // Combine all filtered items into one list
    let allItems = [];
    const showPending = _cancelFilter === 'all' || _cancelFilter === 'pending';
    const showApproved = _cancelFilter === 'all' || _cancelFilter === 'approved';
    const showRejected = _cancelFilter === 'all' || _cancelFilter === 'rejected';
    if (showPending) allItems.push(...pending);
    if (showApproved) allItems.push(...approved);
    if (showRejected) allItems.push(...rejected);

    if (allItems.length === 0) {
        area.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Không có dữ liệu</h3></div>`;
        return;
    }

    // Group by month
    const { groups, sorted } = groupByMonth(allItems);

    let html = '';
    for (const monthKey of sorted) {
        const custs = groups[monthKey].sort((a, b) => {
            // Pending first
            if (a.cancel_approved === 0 && b.cancel_approved !== 0) return -1;
            if (a.cancel_approved !== 0 && b.cancel_approved === 0) return 1;
            // Within pending: oldest request first (most urgent)
            if (a.cancel_approved === 0 && b.cancel_approved === 0) {
                const aT = a.cancel_requested_at ? new Date(a.cancel_requested_at).getTime() : 0;
                const bT = b.cancel_requested_at ? new Date(b.cancel_requested_at).getTime() : 0;
                return aT - bT;
            }
            return 0;
        });
        const isCurrentMonth = monthKey === currentMonthKey;
        const monthId = 'cm_' + monthKey.replace(/[^a-zA-Z0-9]/g, '_');
        const isOpen = isCurrentMonth;

        html += `
        <div style="margin-bottom:16px;">
            <div onclick="toggleCancelMonth('${monthId}')" style="font-weight:700;font-size:13px;color:#fad24c;padding:6px 14px;background:#122546;border-radius:8px;border-left:3px solid #fad24c;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;">
                <span>
                    <span id="${monthId}_arrow" style="display:inline-block;width:16px;font-size:11px;">${isOpen ? '▼' : '▶'}</span>
                    📅 ${monthKey}
                </span>
                <span style="background:#fad24c;color:#122546;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${custs.length}</span>
            </div>
            <div id="${monthId}_body" style="display:${isOpen ? 'block' : 'none'};">
                <table class="table"><thead><tr>
                    <th>Mã</th><th>Khách Hàng</th><th>SĐT</th><th>CRM</th><th>Lý Do Hủy</th><th>Yêu Cầu Bởi</th><th>Ngày</th><th>⏰ Thời Hạn</th><th>Trạng Thái</th><th>Thao Tác</th>
                </tr></thead><tbody>
                    ${custs.map(renderRow).join('')}
                </tbody></table>
            </div>
        </div>`;
    }

    area.innerHTML = html;
}

function toggleCancelMonth(monthId) {
    const body = document.getElementById(monthId + '_body');
    const arrow = document.getElementById(monthId + '_arrow');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
}

async function approveCancel(id, approve) {
    const action = approve ? 'DUYỆT HỦY' : 'TỪ CHỐI HỦY';
    const bodyHTML = `
        <div class="form-group">
            <label>Lý Do ${action} <span style="color:var(--danger)">*</span></label>
            <textarea id="cancelManagerReason" class="form-control" rows="3" placeholder="Nhập lý do ${action.toLowerCase()}..."></textarea>
        </div>
        <div style="padding:10px;background:rgba(${approve ? '34,197,94' : '220,38,38'},0.15);border-radius:6px;border:1px solid rgba(${approve ? '34,197,94' : '220,38,38'},0.3);font-size:12px;color:${approve ? '#86efac' : '#fca5a5'};">
            ${approve ? '✅ Khách hàng sẽ chuyển sang trạng thái Duyệt Hủy.' : '❌ Khách hàng sẽ trở về Tư Vấn và phải báo cáo trong hôm nay.'}
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn" onclick="submitCancelAction(${id}, ${approve})" 
            style="width:auto;background:${approve ? 'var(--success)' : 'var(--danger)'};color:white;">
            ${action}
        </button>
    `;
    openModal(`📋 ${action} Khách Hàng`, bodyHTML, footerHTML);
}

async function submitCancelAction(id, approve) {
    const manager_note = document.getElementById('cancelManagerReason')?.value;
    if (!manager_note) { showToast('Vui lòng nhập lý do!', 'error'); return; }

    const data = await apiCall(`/api/customers/${id}/approve-cancel`, 'POST', { approve, manager_note });
    if (data.success) {
        showToast('✅ ' + data.message);
        closeModal();
        cancelLoadList();
    } else {
        showToast(data.error, 'error');
    }
}
