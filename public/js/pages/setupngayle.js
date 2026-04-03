// ========== SETUP NGÀY LỄ ==========

async function renderSetupNgayLePage(container) {
    const isAllowed = ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role);
    if (!isAllowed) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:#dc2626;font-size:16px;font-weight:700;">⛔ Bạn không có quyền truy cập trang này</div>';
        return;
    }

    container.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h2 style="margin:0;font-size:22px;color:#122546;font-weight:800;">📅 Setup Ngày Lễ</h2>
            <span style="font-size:12px;color:#6b7280;">Ngày lễ áp dụng cho: Bàn Giao CV Điểm + Deadline Khóa TK</span>
        </div>

        <!-- ADD FORM -->
        <div style="background:white;border:2px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="font-weight:700;color:#1e293b;font-size:14px;margin-bottom:12px;">➕ Thêm ngày lễ mới</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
                <div style="flex:0 0 auto;">
                    <label style="font-size:11px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Từ ngày</label>
                    <input type="date" id="holidayFromDate" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                </div>
                <div style="flex:0 0 auto;">
                    <label style="font-size:11px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Đến ngày <span style="color:#9ca3af;">(bỏ trống = 1 ngày)</span></label>
                    <input type="date" id="holidayToDate" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                </div>
                <div style="flex:1;min-width:180px;">
                    <label style="font-size:11px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Tên ngày lễ</label>
                    <input type="text" id="holidayNameInput" placeholder="VD: Giỗ Tổ Hùng Vương" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
                <button onclick="_hlAddHoliday()" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(124,58,237,0.3);white-space:nowrap;">➕ Thêm</button>
            </div>
        </div>

        <!-- YEAR FILTER -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <label style="font-size:13px;color:#374151;font-weight:600;">Năm:</label>
            <select id="holidayYearFilter" onchange="_hlLoadHolidays()" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;">
            </select>
            <span id="holidayCount" style="font-size:12px;color:#6b7280;"></span>
        </div>

        <!-- HOLIDAYS TABLE -->
        <div id="holidayTableContainer" style="background:white;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="text-align:center;color:#9ca3af;font-size:13px;padding:40px;">⏳ Đang tải...</div>
        </div>
    </div>`;

    // Populate year filter
    const yearSelect = document.getElementById('holidayYearFilter');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    _hlLoadHolidays();
}

async function _hlLoadHolidays() {
    const container = document.getElementById('holidayTableContainer');
    const countEl = document.getElementById('holidayCount');
    if (!container) return;

    try {
        const data = await apiCall('/api/penalty/holidays');
        const allHolidays = data.holidays || [];

        // Filter by year
        const year = document.getElementById('holidayYearFilter')?.value || new Date().getFullYear();
        const holidays = allHolidays.filter(h => h.holiday_date.startsWith(year));

        if (countEl) countEl.textContent = `${holidays.length} ngày lễ`;

        if (holidays.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;">
                <div style="font-size:36px;margin-bottom:8px;">📅</div>
                <div style="color:#9ca3af;font-size:13px;">Chưa có ngày lễ nào trong năm ${year}</div>
            </div>`;
            return;
        }

        // Group by month
        const byMonth = {};
        holidays.forEach(h => {
            const m = h.holiday_date.substring(0, 7); // YYYY-MM
            if (!byMonth[m]) byMonth[m] = [];
            byMonth[m].push(h);
        });

        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        let html = '';
        Object.keys(byMonth).sort().forEach(month => {
            const [y, m] = month.split('-');
            const monthLabel = `Tháng ${parseInt(m)}/${y}`;

            html += `<div style="border-bottom:2px solid #f1f5f9;">
                <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);padding:10px 16px;font-weight:700;color:#475569;font-size:13px;">${monthLabel}</div>`;

            byMonth[month].forEach(h => {
                const d = new Date(h.holiday_date + 'T00:00:00');
                const dayName = dayNames[d.getDay()];
                const dateFormatted = h.holiday_date.split('-').reverse().join('/');
                const isPast = d < new Date(new Date().toDateString());

                html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f8fafc;${isPast ? 'opacity:0.5;' : ''}">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="background:#7c3aed;color:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;min-width:24px;text-align:center;">${dayName}</span>
                        <span style="font-weight:700;color:#1e293b;font-size:14px;">${dateFormatted}</span>
                        <span style="color:#6b7280;font-size:13px;">${h.holiday_name}</span>
                    </div>
                    <button onclick="_hlDeleteHoliday(${h.id})" style="padding:4px 12px;font-size:11px;border:1px solid #fca5a5;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-weight:600;" ${isPast ? 'disabled style="padding:4px 12px;font-size:11px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb;color:#d1d5db;cursor:not-allowed;font-weight:600;"' : ''}>🗑️ Xóa</button>
                </div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<div style="color:#dc2626;text-align:center;padding:20px;">Lỗi tải dữ liệu</div>';
    }
}

async function _hlAddHoliday() {
    const fromDate = document.getElementById('holidayFromDate')?.value;
    const toDate = document.getElementById('holidayToDate')?.value || fromDate;
    const name = document.getElementById('holidayNameInput')?.value?.trim();

    if (!fromDate || !name) { alert('Nhập ngày và tên ngày lễ'); return; }

    // Generate date range
    const dates = [];
    let current = new Date(fromDate + 'T00:00:00');
    const end = new Date((toDate || fromDate) + 'T00:00:00');

    while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
    }

    let added = 0, errors = 0;
    for (const d of dates) {
        try {
            const res = await apiCall('/api/penalty/holidays', 'POST', { holiday_date: d, holiday_name: name });
            if (res.success) added++;
            else errors++;
        } catch(e) { errors++; }
    }

    document.getElementById('holidayFromDate').value = '';
    document.getElementById('holidayToDate').value = '';
    document.getElementById('holidayNameInput').value = '';

    showToast(`✅ Đã thêm ${added} ngày lễ${errors > 0 ? ` (${errors} trùng)` : ''}`);
    _hlLoadHolidays();
}

async function _hlDeleteHoliday(id) {
    if (!confirm('Xóa ngày lễ này?')) return;
    try {
        await apiCall(`/api/penalty/holidays/${id}`, 'DELETE');
        _hlLoadHolidays();
    } catch(e) { alert('Lỗi'); }
}
