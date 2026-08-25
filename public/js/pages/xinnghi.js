// ========== XIN NGHỈ NHÂN VIÊN ==========

let _leaveMonth = '';

async function renderXinNghiPage(container) {
    const canViewStats = currentUser.role === 'giam_doc' || canDo('xin_nghi_nv_stats', 'view');
    const now = vnNow();
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
                    ${canDo('xin_nghi_nv', 'create') ? `<div style="padding:20px;" id="leaveFormBody">` : `<div style="padding:20px;text-align:center;"><span style="padding:8px 16px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:600;border:1px solid #e2e8f0;">🔒 Bạn không có quyền gửi đơn xin nghỉ</span></div><div style="display:none;" id="leaveFormBody">`}
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
            </div>

            <!-- RIGHT: STATS & LỊCH SỬ NGHỈ CỦA TÔI -->
            <div style="flex:2;min-width:460px;display:flex;flex-direction:column;gap:16px;">
                ${canViewStats ? `
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
                ` : ''}

                <!-- LỊCH SỬ NGHỈ CỦA TÔI -->
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

// Helper: Format date with day of week in Vietnamese (e.g. Thứ 4 - 26/08/26)
function _leaveFormatDateWithDay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const daysMap = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = daysMap[dayOfWeek] || '';
    const y2 = String(y).slice(-2);
    const dStr = String(d).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return `${dayName} - ${dStr}/${mStr}/${y2}`;
}

// Helper: Open image directly in modal on page
function _leaveOpenImageModal(imgUrl) {
    if (!imgUrl) return;
    let modal = document.getElementById('leaveImagePreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'leaveImagePreviewModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
        modal.onclick = function(e) {
            if (e.target === modal || e.target.id === 'leaveImgCloseBtn') {
                modal.style.display = 'none';
            }
        };
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="position:relative;max-width:92vw;max-height:92vh;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);display:flex;flex-direction:column;">
            <div style="padding:14px 20px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#ffffff;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;">
                <span style="font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px;">📷 Ảnh Xin Phép Quản Lý</span>
                <button id="leaveImgCloseBtn" style="background:rgba(255,255,255,0.15);border:none;color:#ffffff;font-size:16px;font-weight:800;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="padding:16px;overflow:auto;max-height:calc(92vh - 60px);display:flex;justify-content:center;align-items:center;background:#0f172a;">
                <img src="${imgUrl}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.5);" />
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

// ===== HISTORY (MY LEAVES) =====
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
            const dateRange = item.date_from === item.date_to 
                ? _leaveFormatDateWithDay(item.date_from)
                : `${_leaveFormatDateWithDay(item.date_from)} → ${_leaveFormatDateWithDay(item.date_to)}`;

            const isCancelled = item.status === 'cancelled';
            const todayStr = vnISOStr().split('T')[0];
            const maxLeaveDate = item.date_to || item.date_from;
            const canCancel = !isCancelled && maxLeaveDate >= todayStr;

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
            <div style="padding:14px 16px;border:1.5px solid ${isCancelled ? '#fca5a5' : '#cbd5e1'};border-left:5px solid ${isCancelled ? '#ef4444' : '#2563eb'};border-radius:12px;margin-bottom:10px;${isCancelled ? 'background:#fff5f5;' : 'background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.03);'}">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <div style="font-weight:800;color:#0f172a;font-size:14px;display:flex;align-items:center;gap:6px;${isCancelled ? 'text-decoration:line-through;color:#64748b;' : ''}">
                            📅 ${dateRange}${sessionInfo}
                        </div>
                        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center;">
                            <span style="background:${isCancelled ? '#fee2e2' : '#dbeafe'};color:${isCancelled ? '#dc2626' : '#1d4ed8'};padding:3px 10px;border-radius:6px;font-size:11.5px;font-weight:800;border:1px solid ${isCancelled ? '#fca5a5' : '#93c5fd'};">
                                ${isCancelled ? '❌ Đã hủy' : parseFloat(item.total_days) + ' buổi'}
                            </span>
                            ${item.handover_name ? `<span style="font-size:11.5px;color:#475569;background:#f1f5f9;padding:3px 8px;border-radius:6px;font-weight:600;border:1px solid #e2e8f0;">🤝 Bàn giao: ${item.handover_name}</span>` : ''}
                        </div>
                        <div style="font-size:12px;color:${isCancelled ? '#64748b' : '#334155'};margin-top:6px;line-height:1.4;">
                            💬 <b>Lý do xin nghỉ:</b> ${item.reason || '—'}
                        </div>
                        ${isCancelled && item.cancel_reason ? `
                        <div style="font-size:12px;color:#dc2626;margin-top:4px;font-weight:700;background:#fee2e2;padding:4px 8px;border-radius:6px;display:inline-block;border:1px solid #fca5a5;">
                            ❌ <b>Lý do hủy:</b> ${item.cancel_reason}
                        </div>
                        ` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                        ${item.proof_image ? `
                            <button type="button" onclick="_leaveOpenImageModal('${item.proof_image.replace(/'/g, "\\'")}')" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:8px;color:#1d4ed8;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.1);font-family:inherit;">
                                <img src="${item.proof_image}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;border:1px solid #bfdbfe;" />
                                <span>📷 Xem ảnh</span>
                            </button>
                        ` : ''}
                        ${canCancel ? `<button type="button" onclick="_leaveCancelRequest(${item.id})" style="padding:6px 14px;font-size:12px;border:1.5px solid #fca5a5;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;font-weight:800;transition:all 0.15s;font-family:inherit;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">❌ Hủy</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');

        html += `<div style="text-align:right;padding:10px 0;border-top:2px solid #e2e8f0;margin-top:8px;">
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
    const reason = prompt('Vui lòng nhập lý do tại sao bạn lại hủy đơn xin nghỉ này:');
    if (reason === null) return; // User clicked cancel
    const cancelReason = (reason || '').trim();
    if (!cancelReason) {
        alert('Vui lòng nhập lý do tại sao bạn muốn hủy đơn xin nghỉ!');
        return;
    }

    try {
        const res = await apiCall(`/api/leave/cancel/${id}`, 'POST', { cancel_reason: cancelReason });
        if (res.error) { alert(res.error); return; }
        showToast('✅ Đã hủy đơn xin nghỉ');
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
            if (!byDept[deptName][userKey]) byDept[deptName][userKey] = { name: s.user_name, username: s.username, items: [], total: 0, cancelledCount: 0 };
            byDept[deptName][userKey].items.push(s);
            if (s.status === 'active') {
                byDept[deptName][userKey].total += parseFloat(s.total_days);
            } else if (s.status === 'cancelled') {
                byDept[deptName][userKey].cancelledCount += 1;
            }
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
                    const dateRange = item.date_from === item.date_to 
                        ? _leaveFormatDateWithDay(item.date_from)
                        : `${_leaveFormatDateWithDay(item.date_from)} → ${_leaveFormatDateWithDay(item.date_to)}`;
                    const isCancelled = item.status === 'cancelled';

                    let reasonContent = item.reason || '—';
                    if (isCancelled && item.cancel_reason) {
                        reasonContent += `<br><span style="color:#dc2626;font-size:10.5px;font-weight:700;">❌ Lý do hủy: ${item.cancel_reason}</span>`;
                    }

                    rows += `
                    <tr style="border-bottom:1px solid #f1f5f9;${isCancelled ? 'background:#fff5f5;opacity:0.85;' : (i % 2 ? 'background:#fafbfc;' : '')}">
                        ${i === 0 ? `<td rowspan="${u.items.length}" style="padding:8px 10px;font-size:12px;font-weight:700;color:#1e293b;vertical-align:top;border-right:1px solid #e5e7eb;">${u.name}</td>` : ''}
                        <td style="padding:8px 10px;font-size:12px;color:#374151;${isCancelled ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${dateRange}</td>
                        <td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:center;">
                            ${isCancelled ? `<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-size:10.5px;font-weight:800;border:1px solid #fca5a5;display:inline-block;">❌ Đã hủy (${parseFloat(item.total_days)} buổi)</span>` : `<span style="color:#2563eb;">${parseFloat(item.total_days)}</span>`}
                        </td>
                        <td style="padding:8px 10px;font-size:11px;color:${isCancelled ? '#94a3b8' : '#64748b'};max-width:200px;" title="${(item.reason||'').replace(/"/g,'&quot;')}">${reasonContent}</td>
                        <td style="padding:8px 10px;font-size:11px;color:#6b7280;">${item.handover_name || '—'}</td>
                        <td style="padding:8px 10px;text-align:center;">
                            ${item.proof_image ? `
                                <button type="button" onclick="_leaveOpenImageModal('${item.proof_image.replace(/'/g, "\\'")}')" style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:3px 8px;color:#1d4ed8;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-family:inherit;">
                                    <img src="${item.proof_image}" style="width:20px;height:20px;object-fit:cover;border-radius:3px;" />
                                    <span>📷 Xem</span>
                                </button>
                            ` : '—'}
                        </td>
                    </tr>`;
                });

                // Subtotal per user
                const cancelledBadge = u.cancelledCount > 0 ? `<span style="color:#dc2626;font-size:11px;font-weight:700;margin-left:6px;">(Đã hủy: ${u.cancelledCount} đơn)</span>` : '';
                rows += `
                <tr style="background:#eff6ff;border-bottom:2px solid #bfdbfe;">
                    <td colspan="2" style="padding:6px 10px;font-size:11px;font-weight:700;color:#1d4ed8;text-align:right;">Tổng ${u.name}${cancelledBadge}:</td>
                    <td style="padding:6px 10px;font-size:13px;font-weight:800;color:#1d4ed8;text-align:center;">${u.total} buổi</td>
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
