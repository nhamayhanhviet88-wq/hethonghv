// ========== CÔNG VIỆC PHẠT PHẢI XỬ LÝ ==========
let _ptFilterType = 'all'; // 'all', 'lock', 'chain'
let _ptFilterStatus = 'all'; // 'all', 'expired', 'rejected'
let _ptFilterDept = '';
let _ptAllTasks = [];

async function renderCongViecPhatPage(container) {
    const isGD = currentUser.role === 'giam_doc';

    container.innerHTML = `
        <div style="max-width:900px;margin:0 auto;padding:0 16px;">
            <!-- Header -->
            <div style="margin-bottom:20px;">
                <h2 style="font-size:22px;font-weight:800;color:#1e293b;margin:0 0 4px 0;">
                    ⚠️ Công Việc Phạt Phải Xử Lý
                </h2>
                <p style="font-size:13px;color:#64748b;margin:0;">
                    Tổng hợp CV bị phạt chưa xử lý — ưu tiên CV cũ nhất để tránh phạt chồng
                </p>
            </div>

            <!-- Stats Cards -->
            <div id="ptStatsCards" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
                <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fecaca;border-radius:12px;padding:16px;text-align:center;">
                    <div id="ptStatExpired" style="font-size:28px;font-weight:800;color:#dc2626;">—</div>
                    <div style="font-size:11px;font-weight:600;color:#991b1b;margin-top:2px;">🔴 Chưa nộp</div>
                </div>
                <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:12px;padding:16px;text-align:center;">
                    <div id="ptStatRejected" style="font-size:28px;font-weight:800;color:#d97706;">—</div>
                    <div style="font-size:11px;font-weight:600;color:#92400e;margin-top:2px;">🟠 Nộp lại</div>
                </div>
                <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;">
                    <div id="ptStatTotal" style="font-size:28px;font-weight:800;color:#16a34a;">—</div>
                    <div style="font-size:11px;font-weight:600;color:#166534;margin-top:2px;">💰 Tổng phạt</div>
                </div>
            </div>

            <!-- Filters -->
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
                <select id="ptFilterType" onchange="_ptApplyFilters()" style="padding:7px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
                    <option value="all">📋 Tất cả loại</option>
                    <option value="lock">🔒 CV Khóa</option>
                    <option value="chain">🔗 CV Chuỗi</option>
                </select>
                <select id="ptFilterStatus" onchange="_ptApplyFilters()" style="padding:7px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
                    <option value="all">🔵 Tất cả trạng thái</option>
                    <option value="expired">🔴 Chưa nộp (Expired)</option>
                    <option value="rejected">🟠 Bị từ chối (Nộp lại)</option>
                </select>
                ${isGD ? `
                <select id="ptFilterDept" onchange="_ptApplyFilters()" style="padding:7px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
                    <option value="">🏢 Tất cả phòng ban</option>
                </select>` : ''}
                <div style="flex:1;"></div>
                <span id="ptResultCount" style="font-size:12px;color:#64748b;font-weight:600;"></span>
            </div>

            <!-- Task List -->
            <div id="ptTaskList" style="display:flex;flex-direction:column;gap:10px;">
                <div style="text-align:center;padding:40px;color:#94a3b8;">
                    <div style="font-size:24px;margin-bottom:8px;">⏳</div>
                    Đang tải...
                </div>
            </div>
        </div>
    `;

    // Load data
    await _ptLoadData();
}

async function _ptLoadData() {
    try {
        const isGD = currentUser.role === 'giam_doc';
        let url = '/api/penalty-tasks';
        const params = [];
        if (isGD && _ptFilterDept) params.push(`department_id=${_ptFilterDept}`);
        if (params.length) url += '?' + params.join('&');

        const res = await apiCall(url);
        _ptAllTasks = res.tasks || [];

        // Load departments for GĐ filter
        if (isGD) {
            const deptSel = document.getElementById('ptFilterDept');
            if (deptSel && deptSel.options.length <= 1) {
                try {
                    const depts = await apiCall('/api/teams');
                    const deptList = (depts.departments || depts || []).filter(d => !d.name?.toUpperCase().includes('AFFILIATE'));
                    deptList.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.id;
                        opt.textContent = d.name;
                        deptSel.appendChild(opt);
                    });
                } catch(e) {}
            }
        }

        _ptRender();

        // Restore scroll position if coming back via browser Back
        const savedScroll = sessionStorage.getItem('_ptScrollPos');
        if (savedScroll) {
            setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
            sessionStorage.removeItem('_ptScrollPos');
        }
    } catch(e) {
        const list = document.getElementById('ptTaskList');
        if (list) list.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">❌ Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

function _ptApplyFilters() {
    _ptFilterType = document.getElementById('ptFilterType')?.value || 'all';
    _ptFilterStatus = document.getElementById('ptFilterStatus')?.value || 'all';
    _ptFilterDept = document.getElementById('ptFilterDept')?.value || '';
    _ptRender();
}

function _ptRender() {
    let tasks = [..._ptAllTasks];

    // Apply filters
    if (_ptFilterType !== 'all') {
        tasks = tasks.filter(t => t.task_type === _ptFilterType);
    }
    if (_ptFilterStatus !== 'all') {
        tasks = tasks.filter(t => t.status === _ptFilterStatus);
    }
    if (_ptFilterDept) {
        tasks = tasks.filter(t => String(t.dept_id) === String(_ptFilterDept));
    }

    // Stats
    const expiredCount = tasks.filter(t => t.status === 'expired').length;
    const rejectedCount = tasks.filter(t => t.status === 'rejected').length;
    const totalPenalty = tasks.reduce((sum, t) => sum + (Number(t.penalty_amount) || 0), 0);

    const elExpired = document.getElementById('ptStatExpired');
    const elRejected = document.getElementById('ptStatRejected');
    const elTotal = document.getElementById('ptStatTotal');
    if (elExpired) elExpired.textContent = expiredCount;
    if (elRejected) elRejected.textContent = rejectedCount;
    if (elTotal) elTotal.textContent = _ptFormatMoney(totalPenalty);

    const elCount = document.getElementById('ptResultCount');
    if (elCount) elCount.textContent = `${tasks.length} công việc`;

    // Render list
    const list = document.getElementById('ptTaskList');
    if (!list) return;

    if (tasks.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#22c55e;">
                <div style="font-size:48px;margin-bottom:12px;">🎉</div>
                <div style="font-size:16px;font-weight:700;">Không có CV phạt nào!</div>
                <div style="font-size:13px;color:#64748b;margin-top:4px;">Tất cả công việc đã được xử lý</div>
            </div>`;
        return;
    }

    const isGD = currentUser.role === 'giam_doc';
    const today = new Date();

    list.innerHTML = tasks.map(t => {
        const isExpired = t.status === 'expired';
        const borderColor = isExpired ? '#fecaca' : '#fde68a';
        const bgColor = isExpired ? '#fef2f2' : '#fffbeb';
        const statusIcon = isExpired ? '🔴' : '🟠';
        const statusText = isExpired ? 'Chưa nộp' : 'Bị từ chối';
        const typeIcon = t.task_type === 'lock' ? '🔒' : '🔗';
        const typeText = t.task_type === 'lock' ? 'CV Khóa' : 'CV Chuỗi';

        // Calculate days overdue
        const taskDate = new Date(t.task_date + 'T00:00:00');
        const diffDays = Math.floor((today - taskDate) / (1000 * 60 * 60 * 24));
        const urgencyColor = diffDays >= 7 ? '#dc2626' : diffDays >= 3 ? '#d97706' : '#3b82f6';
        const urgencyBg = diffDays >= 7 ? '#fef2f2' : diffDays >= 3 ? '#fffbeb' : '#eff6ff';

        const chainInfo = t.chain_name ? `<span style="font-size:11px;color:#6366f1;font-weight:600;">📦 ${t.chain_name}</span>` : '';
        const userInfo = isGD ? `<span style="font-size:11px;color:#374151;">👤 ${t.full_name} (${t.username})</span>` : '';
        const deptInfo = isGD && t.dept_name ? `<span style="font-size:11px;color:#6b7280;">🏢 ${t.dept_name}</span>` : '';
        const rejectInfo = t.status === 'rejected' && t.reject_reason ? `<div style="font-size:11px;color:#dc2626;margin-top:4px;padding:4px 8px;background:#fef2f2;border-radius:4px;">💬 ${t.reject_reason}</div>` : '';

        // Build calendar link
        const weekMonday = _ptGetMonday(taskDate);
        const weekStr = `${weekMonday.getFullYear()}-${String(weekMonday.getMonth()+1).padStart(2,'0')}-${String(weekMonday.getDate()).padStart(2,'0')}`;

        return `
            <div style="border:1px solid ${borderColor};border-radius:12px;background:${bgColor};padding:14px 16px;transition:all .2s;cursor:default;" onmouseenter="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                            <span style="font-size:13px;">${statusIcon}</span>
                            <span style="font-size:14px;font-weight:700;color:#1e293b;">${t.task_name}</span>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px;">
                            <span style="font-size:11px;padding:2px 8px;background:${t.task_type === 'lock' ? '#dbeafe' : '#e0e7ff'};color:${t.task_type === 'lock' ? '#1d4ed8' : '#4f46e5'};border-radius:4px;font-weight:600;">${typeIcon} ${typeText}</span>
                            <span style="font-size:11px;padding:2px 8px;background:${isExpired ? '#fee2e2' : '#fef3c7'};color:${isExpired ? '#991b1b' : '#92400e'};border-radius:4px;font-weight:600;">${statusText}</span>
                            <span style="font-size:11px;padding:2px 8px;background:${urgencyBg};color:${urgencyColor};border-radius:4px;font-weight:700;">⏰ ${diffDays} ngày trước</span>
                            ${chainInfo}
                        </div>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                            ${userInfo} ${deptInfo}
                        </div>
                        ${rejectInfo}
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:13px;font-weight:700;color:#374151;">📅 ${_ptFormatDate(t.task_date)}</div>
                        <div style="font-size:12px;font-weight:800;color:#dc2626;margin-top:2px;">💰 ${_ptFormatMoney(t.penalty_amount)}</div>
                        <button onclick="_ptGoToCalendar('${weekStr}','${t.user_id}')" style="margin-top:8px;padding:6px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;transition:all .15s;" onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform=''">
                            📅 Xem lịch
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Navigate to the calendar page for that specific week
function _ptGoToCalendar(weekStr, userId) {
    // Save scroll position before leaving
    sessionStorage.setItem('_ptScrollPos', String(window.scrollY));
    // App uses href navigation (full page reload) → use sessionStorage
    sessionStorage.setItem('_ptTargetWeek', weekStr);
    sessionStorage.setItem('_ptTargetUser', userId);
    window.location.href = '/lichkhoabieu';
}

// Helpers
function _ptFormatDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function _ptFormatMoney(amount) {
    if (!amount) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function _ptGetMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}
