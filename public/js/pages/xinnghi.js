// ========== XIN NGHỈ NHÂN VIÊN ==========

let _leaveMonth = '';

async function renderXinNghiPage(container) {
    const canViewStats = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role);
    const now = new Date();
    _leaveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
    <div style="max-width:1400px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h2 style="margin:0;font-size:22px;color:#122546;font-weight:800;">📋 Xin Nghỉ Nhân Viên</h2>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;">
            <!-- LEFT: FORM + HISTORY (mobile-first) -->
            <div style="width:100%;max-width:460px;">
                <!-- FORM XIN NGHỈ -->
                <div style="background:white;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
                    <div style="background:linear-gradient(135deg,#059669,#10b981);padding:16px 20px;">
                        <div style="color:white;font-weight:800;font-size:16px;">📝 GỬI ĐƠN XIN NGHỈ</div>
                        <div style="color:#a7f3d0;font-size:11px;margin-top:2px;">Điền đầy đủ thông tin bên dưới</div>
                    </div>
                    <div style="padding:20px;" id="leaveFormBody">
                        <!-- MODE SELECTOR -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">📅 Chọn loại nghỉ</label>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                                <button type="button" id="leaveModeOneDay" onclick="_leaveSetMode('one')" style="padding:10px 6px;border:2px solid #059669;border-radius:10px;background:#ecfdf5;color:#059669;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;">📅 Nghỉ 1 ngày</button>
                                <button type="button" id="leaveModeMulti" onclick="_leaveSetMode('multi')" style="padding:10px 6px;border:2px solid #e2e8f0;border-radius:10px;background:white;color:#64748b;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;">📅 Nghỉ nhiều ngày</button>
                            </div>
                        </div>

                        <!-- ONE DAY -->
                        <div id="leaveOneDayWrap" style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">📅 Ngày nghỉ <span style="color:#dc2626;">*</span></label>
                            <input type="date" id="leaveDateOne" onchange="_leaveCalcDays()" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;font-family:inherit;">
                        </div>

                        <!-- MULTI DAY (hidden by default) -->
                        <div id="leaveMultiDayWrap" style="display:none;">
                            <div style="margin-bottom:14px;">
                                <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">📅 Từ ngày <span style="color:#dc2626;">*</span></label>
                                <input type="date" id="leaveDateFrom" onchange="_leaveCalcDays()" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;font-family:inherit;">
                            </div>
                            <div style="margin-bottom:14px;">
                                <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">📅 Đến ngày <span style="color:#dc2626;">*</span></label>
                                <input type="date" id="leaveDateTo" onchange="_leaveCalcDays()" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;font-family:inherit;">
                            </div>
                        </div>

                        <div id="leaveSessionWrap" style="display:none;">
                            <div style="margin-bottom:14px;">
                                <label id="leaveFirstSessionLabel" style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">🌅 Buổi nghỉ</label>
                                <div style="display:flex;gap:6px;" id="leaveFirstSession">
                                    <button type="button" onclick="_leavePickSession('first','full')" class="leave-sess-btn active" data-val="full" style="flex:1;padding:8px;border:2px solid #059669;border-radius:8px;background:#ecfdf5;color:#059669;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Cả ngày</button>
                                    <button type="button" onclick="_leavePickSession('first','morning')" class="leave-sess-btn" data-val="morning" style="flex:1;padding:8px;border:2px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Buổi sáng</button>
                                    <button type="button" onclick="_leavePickSession('first','afternoon')" class="leave-sess-btn" data-val="afternoon" style="flex:1;padding:8px;border:2px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Buổi chiều</button>
                                </div>
                            </div>
                            <div style="margin-bottom:14px;display:none;" id="leaveLastSessionWrap">
                                <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">🌇 Buổi nghỉ ngày cuối</label>
                                <div style="display:flex;gap:6px;" id="leaveLastSession">
                                    <button type="button" onclick="_leavePickSession('last','full')" class="leave-sess-btn-last active" data-val="full" style="flex:1;padding:8px;border:2px solid #059669;border-radius:8px;background:#ecfdf5;color:#059669;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Cả ngày</button>
                                    <button type="button" onclick="_leavePickSession('last','morning')" class="leave-sess-btn-last" data-val="morning" style="flex:1;padding:8px;border:2px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Buổi sáng</button>
                                    <button type="button" onclick="_leavePickSession('last','afternoon')" class="leave-sess-btn-last" data-val="afternoon" style="flex:1;padding:8px;border:2px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Buổi chiều</button>
                                </div>
                            </div>
                        </div>

                        <div id="leaveTotalDisplay" style="display:none;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:10px;padding:12px;text-align:center;margin-bottom:14px;">
                            <div style="font-size:11px;color:#3b82f6;font-weight:600;">TỔNG SỐ BUỔI NGHỈ</div>
                            <div id="leaveTotalDays" style="font-size:28px;font-weight:800;color:#1d4ed8;">0</div>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">📝 Lý do xin nghỉ <span style="color:#dc2626;">*</span></label>
                            <textarea id="leaveReason" rows="3" placeholder="Nhập lý do..." style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">🤝 Bàn giao việc cho <span style="color:#dc2626;">*</span></label>
                            <select id="leaveHandover" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;background:white;font-family:inherit;">
                                <option value="">— Chọn người bàn giao —</option>
                            </select>
                        </div>

                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">📷 Ảnh xin phép quản lý <span style="color:#dc2626;">*</span></label>
                            <div id="leaveProofPreview" style="display:none;margin-bottom:8px;text-align:center;"></div>
                            <label style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;border:2px dashed #cbd5e1;border-radius:10px;cursor:pointer;background:#f8fafc;transition:all .15s;" onmouseover="this.style.borderColor='#059669';this.style.background='#ecfdf5'" onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
                                <span style="font-size:24px;">📸</span>
                                <span style="font-size:13px;color:#64748b;font-weight:600;">Chọn ảnh / Chụp ảnh</span>
                                <input type="file" id="leaveProofFile" accept="image/*" capture="environment" onchange="_leavePreviewImage(this)" style="display:none;">
                            </label>
                        </div>

                        <button onclick="_leaveSubmit()" style="width:100%;padding:14px;font-size:15px;border:none;border-radius:12px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:800;box-shadow:0 4px 12px rgba(5,150,105,0.3);transition:all .15s;font-family:inherit;" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='none'">🔔 GỬI ĐƠN XIN NGHỈ</button>
                    </div>
                </div>

                <!-- LỊCH SỬ CỦA TÔI -->
                <div style="background:white;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div style="background:linear-gradient(135deg,#2563eb,#3b82f6);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
                        <span style="color:white;font-weight:800;font-size:14px;">📊 LỊCH SỬ NGHỈ CỦA TÔI</span>
                        <input type="month" id="leaveMyMonth" value="${_leaveMonth}" onchange="_leaveLoadMyHistory()" style="padding:4px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:11px;background:rgba(255,255,255,0.15);color:white;font-weight:600;">
                    </div>
                    <div id="leaveMyHistory" style="padding:14px;">
                        <div style="text-align:center;color:#9ca3af;font-size:12px;padding:16px;">Đang tải...</div>
                    </div>
                </div>
            </div>

            <!-- RIGHT: STATS (GĐ/QL only) -->
            ${canViewStats ? `
            <div style="flex:2;min-width:500px;">
                <div style="background:white;border:2px solid #c4b5fd;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(124,58,237,0.08);">
                    <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                        <span style="color:white;font-weight:800;font-size:14px;">📊 THỐNG KÊ NGHỈ PHÉP PHÒNG BAN</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="month" id="leaveStatsMonth" value="${_leaveMonth}" onchange="_leaveLoadStats()" style="padding:4px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:11px;background:rgba(255,255,255,0.15);color:white;font-weight:600;">
                        </div>
                    </div>
                    <div id="leaveStatsBody" style="padding:16px;">
                        <div style="text-align:center;color:#9ca3af;font-size:12px;padding:20px;">Đang tải...</div>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    </div>`;

    // Load colleagues for handover dropdown
    _leaveLoadColleagues();
    _leaveLoadMyHistory();
    if (canViewStats) _leaveLoadStats();
}

// ===== MODE SELECTOR =====
let _leaveMode = 'one'; // 'one' or 'multi'

function _leaveSetMode(mode) {
    _leaveMode = mode;
    const oneBtn = document.getElementById('leaveModeOneDay');
    const multiBtn = document.getElementById('leaveModeMulti');
    const oneWrap = document.getElementById('leaveOneDayWrap');
    const multiWrap = document.getElementById('leaveMultiDayWrap');

    if (mode === 'one') {
        oneBtn.style.borderColor = '#059669'; oneBtn.style.background = '#ecfdf5'; oneBtn.style.color = '#059669';
        multiBtn.style.borderColor = '#e2e8f0'; multiBtn.style.background = 'white'; multiBtn.style.color = '#64748b';
        oneWrap.style.display = 'block';
        multiWrap.style.display = 'none';
    } else {
        multiBtn.style.borderColor = '#059669'; multiBtn.style.background = '#ecfdf5'; multiBtn.style.color = '#059669';
        oneBtn.style.borderColor = '#e2e8f0'; oneBtn.style.background = 'white'; oneBtn.style.color = '#64748b';
        oneWrap.style.display = 'none';
        multiWrap.style.display = 'block';
    }

    // Reset session
    const sessionWrap = document.getElementById('leaveSessionWrap');
    const totalDisplay = document.getElementById('leaveTotalDisplay');
    if (sessionWrap) sessionWrap.style.display = 'none';
    if (totalDisplay) totalDisplay.style.display = 'none';
    _leaveFirstSession = 'full';
    _leaveLastSession = 'full';
    _leaveCalcDays();
}

// ===== SESSION PICKER =====
let _leaveFirstSession = 'full';
let _leaveLastSession = 'full';

function _leavePickSession(which, val) {
    if (which === 'first') {
        _leaveFirstSession = val;
        document.querySelectorAll('.leave-sess-btn').forEach(b => {
            const isActive = b.dataset.val === val;
            b.style.borderColor = isActive ? '#059669' : '#e2e8f0';
            b.style.background = isActive ? '#ecfdf5' : 'white';
            b.style.color = isActive ? '#059669' : '#64748b';
        });
    } else {
        _leaveLastSession = val;
        document.querySelectorAll('.leave-sess-btn-last').forEach(b => {
            const isActive = b.dataset.val === val;
            b.style.borderColor = isActive ? '#059669' : '#e2e8f0';
            b.style.background = isActive ? '#ecfdf5' : 'white';
            b.style.color = isActive ? '#059669' : '#64748b';
        });
    }
    _leaveCalcDays();
}

function _leaveCalcDays() {
    const sessionWrap = document.getElementById('leaveSessionWrap');
    const lastWrap = document.getElementById('leaveLastSessionWrap');
    const totalDisplay = document.getElementById('leaveTotalDisplay');
    const totalEl = document.getElementById('leaveTotalDays');
    const firstLabel = document.getElementById('leaveFirstSessionLabel');

    let from, to;

    if (_leaveMode === 'one') {
        const dateOne = document.getElementById('leaveDateOne')?.value;
        if (!dateOne) { if (sessionWrap) sessionWrap.style.display = 'none'; if (totalDisplay) totalDisplay.style.display = 'none'; return; }
        from = new Date(dateOne);
        to = new Date(dateOne);
        if (firstLabel) firstLabel.textContent = '🌅 Buổi nghỉ';
    } else {
        const df = document.getElementById('leaveDateFrom')?.value;
        const dt = document.getElementById('leaveDateTo')?.value;
        if (!df || !dt) { if (sessionWrap) sessionWrap.style.display = 'none'; if (totalDisplay) totalDisplay.style.display = 'none'; return; }
        from = new Date(df);
        to = new Date(dt);
        if (from > to) { if (totalDisplay) totalDisplay.style.display = 'none'; return; }
        if (firstLabel) firstLabel.textContent = '🌅 Buổi nghỉ ngày đầu';
    }

    if (sessionWrap) sessionWrap.style.display = 'block';
    const diffDays = Math.round((to - from) / 86400000);

    // Show/hide last day session (only for multi-day)
    if (lastWrap) lastWrap.style.display = diffDays > 0 ? 'block' : 'none';

    let total = 0;
    if (diffDays === 0) {
        total = _leaveFirstSession === 'full' ? 1 : 0.5;
    } else {
        total += _leaveFirstSession === 'full' ? 1 : 0.5;
        total += Math.max(0, diffDays - 1);
        total += _leaveLastSession === 'full' ? 1 : 0.5;
    }

    if (totalDisplay) totalDisplay.style.display = 'block';
    if (totalEl) totalEl.textContent = total;
}

// ===== PREVIEW IMAGE =====
function _leavePreviewImage(input) {
    const preview = document.getElementById('leaveProofPreview');
    if (!preview || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.style.display = 'block';
        preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:10px;border:2px solid #e2e8f0;">`;
    };
    reader.readAsDataURL(input.files[0]);
}

// ===== LOAD COLLEAGUES =====
async function _leaveLoadColleagues() {
    try {
        const data = await apiCall('/api/leave/colleagues');
        const select = document.getElementById('leaveHandover');
        if (!select || !data.colleagues) return;
        data.colleagues.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.full_name;
            select.appendChild(opt);
        });
    } catch(e) {}
}

// ===== SUBMIT =====
async function _leaveSubmit() {
    let dateFrom, dateTo;

    if (_leaveMode === 'one') {
        const dateOne = document.getElementById('leaveDateOne')?.value;
        if (!dateOne) return alert('Vui lòng chọn ngày nghỉ');
        dateFrom = dateOne;
        dateTo = dateOne;
    } else {
        dateFrom = document.getElementById('leaveDateFrom')?.value;
        dateTo = document.getElementById('leaveDateTo')?.value;
        if (!dateFrom || !dateTo) return alert('Vui lòng chọn từ ngày đến ngày');
    }

    const reason = document.getElementById('leaveReason')?.value;
    const handover = document.getElementById('leaveHandover')?.value;
    const proofFile = document.getElementById('leaveProofFile')?.files[0];

    if (!reason?.trim()) return alert('Vui lòng nhập lý do');
    if (!handover) return alert('Vui lòng chọn người bàn giao việc');
    if (!proofFile) return alert('Vui lòng upload ảnh xin phép quản lý');

    const formData = new FormData();
    formData.append('date_from', dateFrom);
    formData.append('date_to', dateTo);
    formData.append('first_day_session', _leaveFirstSession);
    formData.append('last_day_session', _leaveMode === 'one' ? _leaveFirstSession : _leaveLastSession);
    formData.append('reason', reason.trim());
    formData.append('handover_user_id', handover);
    formData.append('proof', proofFile);

    try {
        const res = await fetch('/api/leave/request', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }

        showToast(`✅ ${data.message}`);
        // Auto-switch month to the submitted date's month
        const submitMonth = dateFrom.substring(0, 7); // YYYY-MM
        const myMonthEl = document.getElementById('leaveMyMonth');
        if (myMonthEl) myMonthEl.value = submitMonth;
        const statsMonthEl = document.getElementById('leaveStatsMonth');
        if (statsMonthEl) statsMonthEl.value = submitMonth;

        // Reset form
        if (document.getElementById('leaveDateOne')) document.getElementById('leaveDateOne').value = '';
        if (document.getElementById('leaveDateFrom')) document.getElementById('leaveDateFrom').value = '';
        if (document.getElementById('leaveDateTo')) document.getElementById('leaveDateTo').value = '';
        document.getElementById('leaveReason').value = '';
        document.getElementById('leaveHandover').value = '';
        document.getElementById('leaveProofFile').value = '';
        document.getElementById('leaveProofPreview').style.display = 'none';
        document.getElementById('leaveSessionWrap').style.display = 'none';
        document.getElementById('leaveTotalDisplay').style.display = 'none';
        _leaveFirstSession = 'full';
        _leaveLastSession = 'full';

        _leaveLoadMyHistory();
        if (document.getElementById('leaveStatsBody')) _leaveLoadStats();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ===== MY HISTORY =====
async function _leaveLoadMyHistory() {
    const body = document.getElementById('leaveMyHistory');
    if (!body) return;
    const month = document.getElementById('leaveMyMonth')?.value || _leaveMonth;

    body.innerHTML = '<div style="text-align:center;color:#9ca3af;font-size:12px;padding:16px;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/leave/my-history?month=${month}`);
        const items = data.history || [];
        const total = data.total_days || 0;

        if (items.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:24px;">
                <div style="font-size:32px;margin-bottom:6px;">✅</div>
                <div style="color:#059669;font-weight:600;font-size:13px;">Không có đơn xin nghỉ</div>
            </div>`;
            return;
        }

        let html = items.map(item => {
            const fromF = item.date_from.split('-').reverse().join('/');
            const toF = item.date_to.split('-').reverse().join('/');
            const dateRange = item.date_from === item.date_to ? fromF : `${fromF} → ${toF}`;
            const isCancelled = item.status === 'cancelled';
            const canCancel = !isCancelled && new Date(item.date_from) > new Date();

            let sessionInfo = '';
            if (item.date_from !== item.date_to) {
                const fsLabel = item.first_day_session === 'morning' ? '(sáng)' : item.first_day_session === 'afternoon' ? '(chiều)' : '';
                const lsLabel = item.last_day_session === 'morning' ? '(sáng)' : item.last_day_session === 'afternoon' ? '(chiều)' : '';
                if (fsLabel || lsLabel) sessionInfo = ` — ${fsLabel ? 'Đầu ' + fsLabel : ''} ${lsLabel ? 'Cuối ' + lsLabel : ''}`;
            } else {
                const fsLabel = item.first_day_session === 'morning' ? '(buổi sáng)' : item.first_day_session === 'afternoon' ? '(buổi chiều)' : '(cả ngày)';
                sessionInfo = ` ${fsLabel}`;
            }

            return `
            <div style="padding:12px;border:1px solid ${isCancelled ? '#fecaca' : '#e2e8f0'};border-radius:10px;margin-bottom:8px;${isCancelled ? 'opacity:0.6;background:#fef2f2;' : 'background:#fafbfc;'}">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                    <div style="flex:1;">
                        <div style="font-weight:700;color:#1e293b;font-size:13px;">📅 ${dateRange}${sessionInfo}</div>
                        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
                            <span style="background:${isCancelled ? '#fecaca' : '#dbeafe'};color:${isCancelled ? '#dc2626' : '#2563eb'};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${isCancelled ? '❌ Đã hủy' : parseFloat(item.total_days) + ' buổi'}</span>
                            ${item.handover_name ? `<span style="font-size:11px;color:#6b7280;">🤝 ${item.handover_name}</span>` : ''}
                        </div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">💬 ${item.reason}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                        ${item.proof_image ? `<a href="${item.proof_image}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;">📷</a>` : ''}
                        ${canCancel ? `<button onclick="_leaveCancelRequest(${item.id})" style="padding:3px 8px;font-size:10px;border:1px solid #fca5a5;border-radius:5px;background:#fef2f2;color:#dc2626;cursor:pointer;font-weight:600;">Hủy</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');

        html += `<div style="text-align:right;padding:8px 0;border-top:2px solid #e2e8f0;margin-top:8px;">
            <span style="font-size:13px;font-weight:700;color:#1e293b;">Tổng tháng: </span>
            <span style="font-size:18px;font-weight:800;color:#2563eb;">${total}</span>
            <span style="font-size:12px;color:#6b7280;"> buổi</span>
        </div>`;

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = `<div style="color:#dc2626;text-align:center;padding:16px;">${e.message}</div>`;
    }
}

async function _leaveCancelRequest(id) {
    if (!confirm('Bạn có chắc muốn hủy đơn xin nghỉ này?')) return;
    try {
        const res = await apiCall(`/api/leave/cancel/${id}`, 'POST');
        if (res.error) { alert(res.error); return; }
        showToast('✅ Đã hủy đơn');
        _leaveLoadMyHistory();
        if (document.getElementById('leaveStatsBody')) _leaveLoadStats();
    } catch(e) { alert(e.message); }
}

// ===== STATS (GĐ/QL) =====
async function _leaveLoadStats() {
    const body = document.getElementById('leaveStatsBody');
    if (!body) return;
    const month = document.getElementById('leaveStatsMonth')?.value || _leaveMonth;

    body.innerHTML = '<div style="text-align:center;color:#9ca3af;font-size:12px;padding:20px;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/leave/stats?month=${month}`);
        const stats = data.stats || [];

        if (stats.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:30px;">
                <div style="font-size:36px;margin-bottom:6px;">✅</div>
                <div style="color:#059669;font-weight:700;font-size:14px;">Không có nhân viên nào xin nghỉ</div>
            </div>`;
            return;
        }

        // Group by department → user
        const byDept = {};
        stats.forEach(s => {
            const deptName = s.dept_name || 'Không phòng ban';
            if (!byDept[deptName]) byDept[deptName] = {};
            const userKey = s.user_id;
            if (!byDept[deptName][userKey]) byDept[deptName][userKey] = { name: s.user_name, username: s.username, items: [], total: 0 };
            byDept[deptName][userKey].items.push(s);
            byDept[deptName][userKey].total += parseFloat(s.total_days);
        });

        let html = '';
        let grandTotal = 0;

        Object.keys(byDept).sort().forEach(deptName => {
            const users = byDept[deptName];
            let deptTotal = 0;

            let rows = '';
            Object.keys(users).forEach(uid => {
                const u = users[uid];
                deptTotal += u.total;

                u.items.forEach((item, i) => {
                    const fromF = item.date_from.split('-').reverse().join('/');
                    const toF = item.date_to.split('-').reverse().join('/');
                    const dateRange = item.date_from === item.date_to ? fromF : `${fromF} → ${toF}`;

                    rows += `
                    <tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafbfc;' : ''}">
                        ${i === 0 ? `<td rowspan="${u.items.length}" style="padding:8px 10px;font-size:12px;font-weight:700;color:#1e293b;vertical-align:top;border-right:1px solid #e5e7eb;">${u.name}</td>` : ''}
                        <td style="padding:8px 10px;font-size:12px;color:#374151;">${dateRange}</td>
                        <td style="padding:8px 10px;font-size:12px;font-weight:700;color:#2563eb;text-align:center;">${parseFloat(item.total_days)}</td>
                        <td style="padding:8px 10px;font-size:11px;color:#64748b;max-width:180px;overflow:hidden;text-overflow:ellipsis;" title="${(item.reason||'').replace(/"/g,'&quot;')}">${item.reason}</td>
                        <td style="padding:8px 10px;font-size:11px;color:#6b7280;">${item.handover_name || '—'}</td>
                        <td style="padding:8px 10px;text-align:center;">${item.proof_image ? `<a href="${item.proof_image}" target="_blank" style="font-size:11px;color:#2563eb;">📷</a>` : '—'}</td>
                    </tr>`;
                });

                // Subtotal per user
                rows += `
                <tr style="background:#eff6ff;border-bottom:2px solid #bfdbfe;">
                    <td colspan="2" style="padding:6px 10px;font-size:11px;font-weight:700;color:#1d4ed8;text-align:right;">Tổng ${u.name}:</td>
                    <td style="padding:6px 10px;font-size:13px;font-weight:800;color:#1d4ed8;text-align:center;">${u.total}</td>
                    <td colspan="3"></td>
                </tr>`;
            });

            grandTotal += deptTotal;

            html += `
            <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <div style="background:#f8fafc;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;">
                    <span style="font-weight:700;color:#1e293b;font-size:14px;">🏢 ${deptName}</span>
                    <span style="background:#c4b5fd;color:#7c3aed;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700;">${deptTotal} buổi</span>
                </div>
                <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;min-width:550px;">
                    <thead>
                        <tr style="background:#7c3aed;">
                            <th style="padding:8px 10px;text-align:left;font-size:10px;color:#e9d5ff;font-weight:700;">NHÂN VIÊN</th>
                            <th style="padding:8px 10px;text-align:left;font-size:10px;color:#e9d5ff;font-weight:700;">NGÀY NGHỈ</th>
                            <th style="padding:8px 10px;text-align:center;font-size:10px;color:#e9d5ff;font-weight:700;">SỐ BUỔI</th>
                            <th style="padding:8px 10px;text-align:left;font-size:10px;color:#e9d5ff;font-weight:700;">LÝ DO</th>
                            <th style="padding:8px 10px;text-align:left;font-size:10px;color:#e9d5ff;font-weight:700;">BÀN GIAO</th>
                            <th style="padding:8px 10px;text-align:center;font-size:10px;color:#e9d5ff;font-weight:700;">ẢNH</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>
            </div>`;
        });

        // Grand total summary
        html += `
        <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
            <span style="color:white;font-weight:700;font-size:14px;">📊 TỔNG CỘNG NGHỈ PHÉP</span>
            <span style="color:white;font-weight:800;font-size:20px;">${grandTotal} buổi</span>
        </div>`;

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = `<div style="color:#dc2626;text-align:center;padding:16px;">${e.message}</div>`;
    }
}
