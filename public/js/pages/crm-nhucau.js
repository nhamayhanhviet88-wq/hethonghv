// ========== CRM NHU CẦU — 14-column layout with consultation system ==========

// Format deposit input with thousand separators (500000 → 500.000)
function formatDepositInput(el) {
    const cursor = el.selectionStart;
    const oldLen = el.value.length;
    const raw = el.value.replace(/\D/g, '');
    el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const newLen = el.value.length;
    const newCursor = cursor + (newLen - oldLen);
    el.setSelectionRange(newCursor, newCursor);
}

const VN_PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương',
    'Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai',
    'Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình',
    'Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định',
    'Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh',
    'Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];
// Birthday countdown helper: returns { html, class } based on days until birthday
function getBirthdayDisplay(birthdayStr) {
    if (!birthdayStr) return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };
    const today = new Date();
    // Parse birthday as "day/month" format (e.g. "23/10")
    let day, month;
    if (birthdayStr.includes('/')) {
        const parts = birthdayStr.split('/');
        day = parseInt(parts[0]); month = parseInt(parts[1]);
    } else if (birthdayStr.includes('-')) {
        const parts = birthdayStr.split('-');
        // Could be YYYY-MM-DD or DD-MM
        if (parts.length === 3) { month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); }
    } else {
        return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };
    }
    if (isNaN(day) || isNaN(month)) return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };

    let nextBday = new Date(today.getFullYear(), month - 1, day);
    if (nextBday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        nextBday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diffMs = nextBday - new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const dateStr = `${day}/${month}`;

    if (daysUntil === 0) {
        return { html: `<span class="bday-today">🎉 ${dateStr} <b>HÔM NAY!</b></span>`, tdClass: 'bday-cell-today' };
    } else if (daysUntil === 1) {
        return { html: `<span class="bday-urgent">🎂🔥 ${dateStr} <b>NGÀY MAI</b></span>`, tdClass: 'bday-cell-1' };
    } else if (daysUntil === 2) {
        return { html: `<span class="bday-urgent">🎂🔥 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-2' };
    } else if (daysUntil === 3) {
        return { html: `<span class="bday-warn">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-3' };
    } else if (daysUntil <= 5) {
        return { html: `<span class="bday-near">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-5' };
    } else if (daysUntil <= 7) {
        return { html: `<span class="bday-soon">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-7' };
    }
    return { html: dateStr, tdClass: '' };
}

// Check if today is the customer's birthday (day+month match, ignore year)
function _crmIsBirthdayToday(birthdayStr) {
    if (!birthdayStr) return false;
    const today = new Date();
    let day, month;
    if (birthdayStr.includes('/')) {
        const parts = birthdayStr.split('/');
        day = parseInt(parts[0]); month = parseInt(parts[1]);
    } else if (birthdayStr.includes('-')) {
        const parts = birthdayStr.split('-');
        if (parts.length === 3) { month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); }
    } else {
        return false;
    }
    if (isNaN(day) || isNaN(month)) return false;
    return today.getDate() === day && (today.getMonth() + 1) === month;
}

const CONSULT_TYPES = {
    lam_quen_tuong_tac: { label: 'Làm Quen Tương Tác', icon: '👋', color: '#14b8a6' },
    goi_dien: { label: 'Gọi Điện', icon: '📞', color: '#3b82f6' },
    nhan_tin: { label: 'Nhắn Tin', icon: '💬', color: '#8b5cf6' },
    tuong_tac_ket_noi: { label: 'Tương Tác Kết Nối Lại', icon: '🔗', color: '#6366f1' },
    gap_truc_tiep: { label: 'Gặp Trực Tiếp', icon: '🤝', color: '#10b981' },
    gui_bao_gia: { label: 'Gửi Báo Giá', icon: '📄', color: '#f59e0b' },
    gui_mau: { label: 'Gửi Mẫu Vải/Áo', icon: '👔', color: '#ec4899' },
    thiet_ke: { label: 'Thiết Kế', icon: '🎨', color: '#6366f1' },
    bao_sua: { label: 'Sửa Thiết Kế', icon: '🔧', color: '#ef4444' },
    gui_stk_coc: { label: 'Gửi STK Cọc', icon: '🏦', color: '#f59e0b' },
    giuc_coc: { label: 'Giục Cọc', icon: '⏰', color: '#ea580c' },
    dat_coc: { label: 'Đặt Cọc', icon: '💵', color: '#f97316' },
    chot_don: { label: 'Chốt Đơn', icon: '✅', color: '#22c55e' },
    dang_san_xuat: { label: 'Đang Sản Xuất', icon: '🏭', color: '#8b5cf6' },
    hoan_thanh: { label: 'Hoàn Thành Đơn', icon: '🏆', color: '#0d9488', textColor: 'white' },
    sau_ban_hang: { label: 'Chăm Sóc Sau Bán', icon: '📦', color: '#0ea5e9' },
    cap_cuu_sep: { label: 'Cấp Cứu Sếp', icon: '🚨', color: '#ef4444' },
    huy_coc: { label: 'Hủy Cọc', icon: '🚫', color: '#dc2626' },
    hoan_thanh_cap_cuu: { label: 'Hoàn Thành Cấp Cứu', icon: '🏥', color: '#122546', textColor: '#fad24c' },
    huy: { label: 'Hủy Khách', icon: '❌', color: '#dc2626' },
    giam_gia: { label: 'Giảm Giá', icon: '🎁', color: '#e11d48' },
    tu_van_lai: { label: 'Tư Vấn Lại', icon: '🔄', color: '#0891b2' },
    gui_ct_kh_cu: { label: 'Gửi Chương Trình KH Cũ', icon: '🎟️', color: '#7c3aed' },
};

async function renderCRMNhuCauPage(container) {
    let topStaffOptions = '';
    if (['giam_doc', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        const staff = await apiCall('/api/managed-staff');
        const staffUsers = (staff.users || []).filter(u => ['nhan_vien', 'truong_phong', 'quan_ly'].includes(u.role));
        topStaffOptions = staffUsers
            .map(u => '<option value="' + u.id + '"' + ((['quan_ly','truong_phong'].includes(currentUser.role)) && u.id === currentUser.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS[u.role] || u.role) + ')' + '</option>').join('');
    }

    container.innerHTML = `
        <style>
            .crm-stat-cards { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
            .crm-stat-card { flex:1; min-width:130px; padding:14px 16px; border-radius:12px; cursor:pointer; transition:all .25s; border:2px solid transparent; position:relative; overflow:hidden; }
            .crm-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
            .crm-stat-card.active { border:3px solid #fff; box-shadow:0 0 0 3px var(--navy), 0 8px 30px rgba(18,37,70,.4); transform:translateY(-4px) scale(1.03); z-index:2; }
            .crm-stat-cards.has-active .crm-stat-card:not(.active) { opacity:.55; transform:scale(.97); }
            .crm-stat-card .stat-icon { font-size:24px; margin-bottom:6px; }
            .crm-stat-card .stat-count { font-size:28px; font-weight:900; line-height:1; }
            .crm-stat-card .stat-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; opacity:.8; }
            .crm-stat-card::after { content:''; position:absolute; right:-10px; bottom:-10px; width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,.15); }
            .crm-date-filter { display:none; padding:10px 16px; background:linear-gradient(135deg,#1e293b,#334155); border-radius:10px; margin-bottom:12px; align-items:center; gap:12px; flex-wrap:wrap; animation:crmSlideIn .25s ease; }
            .crm-date-filter.visible { display:flex; }
            .crm-date-filter label { color:#94a3b8; font-size:12px; font-weight:600; margin:0; }
            .crm-date-filter select { background:#0f172a; color:white; border:1px solid #475569; border-radius:6px; padding:5px 10px; font-size:13px; font-weight:600; cursor:pointer; }
            .crm-date-filter select:focus { border-color:#3b82f6; outline:none; }
            .crm-date-filter .df-label { color:#f59e0b; font-size:13px; font-weight:700; }
            @keyframes crmSlideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
            .crm-section-header td { background:linear-gradient(135deg,#1e293b,#334155); color:white; font-weight:700; font-size:13px; padding:10px 16px !important; border:none; letter-spacing:.5px; }
            .crm-section-header td .section-icon { margin-right:8px; }
            .crm-section-header td .section-count { float:right; background:rgba(255,255,255,.15); padding:2px 10px; border-radius:12px; font-size:11px; }
            .crm-pagination { display:flex; align-items:center; justify-content:center; gap:6px; padding:12px 0; flex-wrap:wrap; }
            .crm-pagination button { min-width:36px; height:36px; border:1px solid #334155; background:#1e293b; color:#94a3b8; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
            .crm-pagination button:hover { background:#334155; color:white; }
            .crm-pagination button.active { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border-color:#3b82f6; box-shadow:0 2px 8px rgba(59,130,246,.4); }
            .crm-pagination button:disabled { opacity:.4; cursor:not-allowed; }
            .crm-pagination .pg-info { color:#94a3b8; font-size:12px; font-weight:600; margin:0 8px; }
        </style>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div></div>
            <a href="/quytacnuttuvancrmnhucau" onclick="event.preventDefault();navigate('quytacnuttuvancrmnhucau')"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;
                border:2px solid #f97316;color:#f97316;font-size:13px;font-weight:800;cursor:pointer;
                background:rgba(249,115,22,.08);text-decoration:none;transition:all .2s;"
                onmouseover="this.style.background='rgba(249,115,22,.18)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.background='rgba(249,115,22,.08)';this.style.transform=''">
                ⚙️ Quy Tắc Nút Tư Vấn
            </a>
        </div>
        <div class="crm-stat-cards" id="crmStatCards">
            <div class="crm-stat-card" data-cat="phai_xu_ly" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;" onclick="_crmFilterByCat('phai_xu_ly')">
                <div class="stat-icon">🔥</div>
                <div class="stat-count" id="crmStatPhaiXuLy">0</div>
                <div class="stat-label">Phải xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="da_xu_ly" style="background:linear-gradient(135deg,#10b981,#059669);color:white;" onclick="_crmFilterByCat('da_xu_ly')">
                <div class="stat-icon">✅</div>
                <div class="stat-count" id="crmStatDaXuLy">0</div>
                <div class="stat-label">Đã xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="xu_ly_tre" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;" onclick="_crmFilterByCat('xu_ly_tre')">
                <div class="stat-icon">⚠️</div>
                <div class="stat-count" id="crmStatXuLyTre">0</div>
                <div class="stat-label">Khách xử lý trễ</div>
            </div>
            <div class="crm-stat-card" data-cat="cho_xu_ly" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="_crmFilterByCat('cho_xu_ly')">
                <div class="stat-icon">⏳</div>
                <div class="stat-count" id="crmStatChoXuLy">0</div>
                <div class="stat-label">Chờ xử lý</div>
            </div>
            <div class="crm-stat-card" data-cat="huy_khach" style="background:linear-gradient(135deg,#6b7280,#4b5563);color:white;" onclick="_crmFilterByCat('huy_khach')">
                <div class="stat-icon">🚫</div>
                <div class="stat-count" id="crmStatHuyKhach">0</div>
                <div class="stat-label">Hủy khách</div>
            </div>
        </div>
        <div class="crm-date-filter" id="crmDateFilter">
            <span class="df-label" id="crmDateFilterLabel">📅 Lọc theo:</span>
            <label>Ngày</label>
            <select id="crmDateDay" onchange="_crmUpdateDateFilterCounts();_crmRenderFilteredTable()">
                <option value="">Tất Cả</option>
                ${(() => { let o = ''; for (let d = 1; d <= 31; d++) o += '<option value="' + d + '">Ngày ' + d + '</option>'; return o; })()}
            </select>
            <label>Tháng</label>
            <select id="crmDateMonth" onchange="_crmUpdateDateFilterCounts();_crmRenderFilteredTable()">
                <option value="" selected>Tất Cả</option>
                ${(() => { let o = ''; for (let m = 1; m <= 12; m++) o += '<option value="' + m + '">Tháng ' + m + '</option>'; return o; })()}
            </select>
            <label>Năm</label>
            <select id="crmDateYear" onchange="_crmUpdateDateFilterCounts();_crmRenderFilteredTable()">
                ${(() => { const now = new Date(); let o = ''; for (let y = 2024; y <= now.getFullYear()+1; y++) o += '<option value="' + y + '"' + (y === now.getFullYear() ? ' selected' : '') + '>' + y + '</option>'; return o; })()}
            </select>
            <span id="crmDateFilterCount" style="color:#94a3b8;font-size:12px;margin-left:auto;"></span>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <select id="crmFilterConsultType" class="form-control" style="width:auto;min-width:200px;" onchange="_crmRenderFilteredTable()">
                <option value="">Tất cả trạng thái</option>
            </select>
            <input type="text" id="crmSearch" class="form-control" placeholder="🔍 Tìm tên hoặc SĐT..." style="width:auto;min-width:200px;">
            ${['giam_doc','quan_ly','truong_phong'].includes(currentUser.role) ? '<select id="crmTopStaffFilter" class="form-control" style="width:auto;min-width:180px;"><option value="">👤 Tất cả NV</option>' + topStaffOptions + '</select>' : ''}
        </div>
        <div class="card">
            <div class="card-body" style="overflow-x:auto; padding:8px;">
                <table class="table crm-nhucau-table" id="crmNhuCauTable">
                    <thead><tr>
                        <th style="min-width:45px;text-align:center">STT</th>
                        <th style="min-width:100px">NV Phụ Trách</th>
                        <th style="min-width:80px">Mã Đơn</th>
                        <th style="min-width:120px">Nút Tư Vấn</th>
                        <th style="min-width:160px">Nội Dung TV</th>
                        <th style="min-width:70px;text-align:center">Lần Chăm</th>
                        <th style="min-width:140px">Ngày Hẹn</th>
                        <th style="min-width:80px">Mã KH</th>
                        <th style="min-width:150px">Tên KH</th>
                        <th style="min-width:110px">SĐT</th>
                        <th style="min-width:110px">Link FB</th>
                        <th style="min-width:130px">Địa Chỉ</th>
                        <th style="min-width:100px">Nguồn</th>
                        <th style="min-width:120px">Người GT</th>
                        <th style="min-width:110px">CRM Người GT</th>
                        <th style="min-width:100px">Chức Danh</th>
                        <th style="min-width:70px;text-align:center">Lần Đặt</th>
                        <th style="min-width:110px;text-align:right">Doanh Số</th>
                    </tr></thead>
                    <tbody id="crmNhuCauTbody"><tr><td colspan="18" style="text-align:center;padding:40px;">⏳ Đang tải...</td></tr></tbody>
                </table>
                <div id="crmPagination" class="crm-pagination"></div>
            </div>
        </div>
    `;

    document.getElementById('crmFilterConsultType').addEventListener('change', () => _crmRenderFilteredTable());
    const topStaffEl = document.getElementById('crmTopStaffFilter');
    if (topStaffEl) topStaffEl.addEventListener('change', () => loadCrmNhuCauData());
    let st;
    document.getElementById('crmSearch').addEventListener('input', () => { clearTimeout(st); st = setTimeout(loadCrmNhuCauData, 400); });

    await loadCrmNhuCauData();

    // Auto-select 'Phải xử lý hôm nay' on page load
    _crmActiveCat = null;
    _crmFilterByCat('phai_xu_ly');
}

var _crmActiveCat = null; // null = all, or 'phai_xu_ly'|'moi_chuyen'|'da_xu_ly'|'cho_xu_ly'|'huy_khach'
var _crmAllCustomers = []; // full list for re-filtering
var _crmAllStats = {}; // consult stats
var _crmCurrentPage = 1;
var _crmPageSize = 50;

function _crmFilterByCat(cat) {
    if (_crmActiveCat === cat) { _crmActiveCat = null; } else { _crmActiveCat = cat; }
    _crmCurrentPage = 1; // reset page on category change
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    const cardsContainer = document.getElementById('crmStatCards');
    if (_crmActiveCat) {
        const el = document.querySelector('.crm-stat-card[data-cat="' + _crmActiveCat + '"]');
        if (el) el.classList.add('active');
        if (cardsContainer) cardsContainer.classList.add('has-active');
    } else {
        if (cardsContainer) cardsContainer.classList.remove('has-active');
    }
    // Show/hide date filter for cho_xu_ly and huy_khach
    const dateFilter = document.getElementById('crmDateFilter');
    const dateLabel = document.getElementById('crmDateFilterLabel');
    // Reset date filter to defaults (Tất Cả) when switching cards
    const ms = document.getElementById('crmDateMonth');
    const ys = document.getElementById('crmDateYear');
    const ds = document.getElementById('crmDateDay');
    if (ms) { ms.value = ''; }
    if (ys) { ys.value = new Date().getFullYear(); }
    if (ds) { ds.value = ''; }
    if (dateFilter) {
        if (_crmActiveCat === 'cho_xu_ly') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hẹn:';
            _crmUpdateDateFilterCounts();
        } else if (_crmActiveCat === 'huy_khach') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hủy:';
            _crmUpdateDateFilterCounts();
        } else if (_crmActiveCat === 'xu_ly_tre') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hẹn trễ:';
            _crmUpdateDateFilterCounts();
        } else {
            dateFilter.classList.remove('visible');
        }
    }
    _crmUpdateConsultTypeDropdown();
    _crmRenderFilteredTable();
}

function _crmUpdateDateFilterCounts() {
    const cat = _crmActiveCat;
    if (cat !== 'cho_xu_ly' && cat !== 'huy_khach' && cat !== 'xu_ly_tre') return;
    const catCustomers = _crmAllCustomers.filter(c => _crmGetCategory(c, _crmAllStats) === cat);

    function getDateField(c) {
        if (cat === 'cho_xu_ly' || cat === 'xu_ly_tre') return c.appointment_date;
        return c.cancel_approved_at || c.created_at;
    }

    const monthYearCounts = {};
    const yearCounts = {};
    catCustomers.forEach(c => {
        const df = getDateField(c);
        if (!df) return;
        const d = new Date(df);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthYearCounts[m + '_' + y] = (monthYearCounts[m + '_' + y] || 0) + 1;
        yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const monthSel = document.getElementById('crmDateMonth');
    const yearSel = document.getElementById('crmDateYear');
    if (!monthSel || !yearSel) return;
    const selYear = yearSel.value ? parseInt(yearSel.value) : new Date().getFullYear();

    // Calculate total for 'Tất Cả' options
    const totalCat = catCustomers.length;
    let totalInYear = 0;

    for (const opt of monthSel.options) {
        if (!opt.value) { opt.textContent = 'Tất Cả' + (totalCat > 0 ? ' (' + totalCat + ')' : ''); continue; }
        const m = parseInt(opt.value);
        const cnt = monthYearCounts[m + '_' + selYear] || 0;
        opt.textContent = 'Tháng ' + m + (cnt > 0 ? ' (' + cnt + ')' : '');
        totalInYear += cnt;
    }
    for (const opt of yearSel.options) {
        if (!opt.value) { opt.textContent = 'Tất Cả'; continue; }
        const y = parseInt(opt.value);
        const cnt = yearCounts[y] || 0;
        opt.textContent = y + (cnt > 0 ? ' (' + cnt + ')' : '');
    }
}


function _crmGetCategory(c, stats) {
    // Priority 1: Hủy khách
    if (c.cancel_approved === 1) return 'huy_khach';

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const s = stats[c.id] || {};

    // Check if consulted today
    let consultedToday = false;
    if (s.lastLog && s.lastLog.created_at) {
        const logDate = new Date(s.lastLog.created_at);
        const logStr = logDate.getFullYear() + '-' + String(logDate.getMonth()+1).padStart(2,'0') + '-' + String(logDate.getDate()).padStart(2,'0');
        consultedToday = (logStr === todayStr);
    }

    // Priority 2: Đã xử lý hôm nay
    if (consultedToday) return 'da_xu_ly';

    // Check appointment date
    let appointIsToday = false;
    let appointIsFuture = false;
    if (c.appointment_date) {
        const apptDate = new Date(c.appointment_date);
        const apptStr = apptDate.getFullYear() + '-' + String(apptDate.getMonth()+1).padStart(2,'0') + '-' + String(apptDate.getDate()).padStart(2,'0');
        appointIsToday = (apptStr === todayStr);
        appointIsFuture = (apptStr > todayStr);
    }

    // Check if today is customer's birthday
    const isBirthdayToday = _crmIsBirthdayToday(c.birthday);

    // Check created today
    let createdToday = false;
    if (c.created_at) {
        const cDate = new Date(c.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        createdToday = (cStr === todayStr);
    }

    // Priority 3: Mới chuyển hôm nay (trước Phải xử lý)
    if (createdToday) return 'moi_chuyen';

    // Priority 4: Phải xử lý hôm nay (appointment today OR birthday today)
    if (appointIsToday || isBirthdayToday) return 'phai_xu_ly';

    // Priority 5: Khách xử lý trễ (appointment was in the past, not consulted today)
    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';

    // Priority 6: Chờ xử lý (future appointment or remaining)
    if (appointIsFuture) return 'cho_xu_ly';

    // Default: chờ xử lý
    return 'cho_xu_ly';
}

function _crmUpdateConsultTypeDropdown(filteredList) {
    const sel = document.getElementById('crmFilterConsultType');
    if (!sel) return;
    const prevVal = sel.value;

    // Use provided filtered list or default to category-filtered
    let custs = filteredList;
    if (!custs) {
        custs = _crmAllCustomers;
        if (_crmActiveCat) {
            custs = _crmAllCustomers.filter(c => _crmGetCategory(c, _crmAllStats) === _crmActiveCat);
        }
    }

    // Count consult types from last log
    const typeCounts = {};
    let noLogCount = 0;
    custs.forEach(c => {
        const s = _crmAllStats[c.id] || {};
        if (s.lastLog && s.lastLog.log_type) {
            const lt = s.lastLog.log_type;
            typeCounts[lt] = (typeCounts[lt] || 0) + 1;
        } else {
            noLogCount++;
        }
    });

    // Build options
    let html = '<option value="">Tất cả trạng thái (' + custs.length + ')</option>';
    // Sort by count desc
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([key, count]) => {
        const t = CONSULT_TYPES[key];
        if (t) {
            html += '<option value="' + key + '">' + t.icon + ' ' + t.label + ' (' + count + ')</option>';
        }
    });
    if (noLogCount > 0) {
        html += '<option value="__none__">📋 Chưa tư vấn (' + noLogCount + ')</option>';
    }
    sel.innerHTML = html;

    // Restore previous selection if still exists
    if (prevVal) {
        const exists = [...sel.options].some(o => o.value === prevVal);
        if (exists) sel.value = prevVal;
    }
}
function _crmRenderFilteredTable() {
    const customers = _crmAllCustomers;
    const stats = _crmAllStats;
    const tbody = document.getElementById('crmNhuCauTbody');
    
    let filtered = customers;
    if (_crmActiveCat) {
        if (_crmActiveCat === 'phai_xu_ly') {
            // Include both phai_xu_ly and moi_chuyen
            filtered = customers.filter(c => {
                const cat = _crmGetCategory(c, stats);
                return cat === 'phai_xu_ly' || cat === 'moi_chuyen';
            });
        } else {
            filtered = customers.filter(c => _crmGetCategory(c, stats) === _crmActiveCat);
        }
    }

    // Apply date filter for cho_xu_ly and huy_khach (BEFORE consult type filter)
    const isDateCat = (_crmActiveCat === 'cho_xu_ly' || _crmActiveCat === 'huy_khach' || _crmActiveCat === 'xu_ly_tre');
    if (isDateCat) {
        const selDay = document.getElementById('crmDateDay')?.value;
        const selMonth = document.getElementById('crmDateMonth')?.value;
        const selYear = document.getElementById('crmDateYear')?.value;
        const hasMonth = selMonth && parseInt(selMonth);
        const hasYear = selYear && parseInt(selYear);
        const hasDay = selDay && parseInt(selDay);
        if (hasYear || hasMonth || hasDay) {
            filtered = filtered.filter(c => {
                let dateField;
                if (_crmActiveCat === 'cho_xu_ly' || _crmActiveCat === 'xu_ly_tre') {
                    dateField = c.appointment_date;
                } else {
                    dateField = c.cancel_approved_at || c.created_at;
                }
                if (!dateField) return false;
                const d = new Date(dateField);
                if (hasYear && d.getFullYear() !== parseInt(selYear)) return false;
                if (hasMonth && d.getMonth() + 1 !== parseInt(selMonth)) return false;
                if (hasDay && d.getDate() !== parseInt(selDay)) return false;
                return true;
            });
        }
    }

    // Update consult type dropdown AFTER date filter
    _crmUpdateConsultTypeDropdown(filtered);

    // Card counts always show TOTAL (not date-filtered)

    // Apply consult type filter
    const consultTypeVal = document.getElementById('crmFilterConsultType')?.value;
    if (consultTypeVal) {
        if (consultTypeVal === '__none__') {
            filtered = filtered.filter(c => {
                const s = stats[c.id] || {};
                return !s.lastLog || !s.lastLog.log_type;
            });
        } else {
            filtered = filtered.filter(c => {
                const s = stats[c.id] || {};
                return s.lastLog && s.lastLog.log_type === consultTypeVal;
            });
        }
    }



    // Sort by appointment_date ASC (nearest appointment first)
    filtered = [...filtered].sort((a, b) => {
        if (_crmActiveCat === 'huy_khach') {
            // Hủy khách: sort by cancel date desc
            const dateA = a.cancel_approved_at || a.created_at;
            const dateB = b.cancel_approved_at || b.created_at;
            return new Date(dateB || 0) - new Date(dateA || 0);
        }
        // All other categories: nearest appointment_date first
        const dateA = a.appointment_date;
        const dateB = b.appointment_date;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA) - new Date(dateB);
    });

    // Update count display
    const countEl = document.getElementById('crmDateFilterCount');
    if (countEl && isDateCat) {
        countEl.textContent = 'Kết quả: ' + filtered.length;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="18"><div class="empty-state"><div class="icon">📭</div><h3>Không có khách hàng</h3></div></td></tr>`;
        document.getElementById('crmPagination').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / _crmPageSize);
    if (_crmCurrentPage > totalPages) _crmCurrentPage = totalPages;
    const startIdx = (_crmCurrentPage - 1) * _crmPageSize;
    const paged = filtered.slice(startIdx, startIdx + _crmPageSize);

    // Split table into two sections for phai_xu_ly
    if (_crmActiveCat === 'phai_xu_ly') {
        const moiChuyenRows = paged.filter(c => _crmGetCategory(c, stats) === 'moi_chuyen');
        const phaiXuLyRows = paged.filter(c => _crmGetCategory(c, stats) === 'phai_xu_ly');
        let html = '';
        let stt = startIdx + 1;
        if (moiChuyenRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="18"><span class="section-icon">📥</span>Mới chuyển hôm nay<span class="section-count">${moiChuyenRows.length}</span></td></tr>`;
            html += moiChuyenRows.map(c => _crmRenderCustomerRow(c, stats, stt++)).join('');
        }
        if (phaiXuLyRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="18"><span class="section-icon">🔥</span>Phải xử lý hôm nay<span class="section-count">${phaiXuLyRows.length}</span></td></tr>`;
            html += phaiXuLyRows.map(c => _crmRenderCustomerRow(c, stats, stt++)).join('');
        }
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = paged.map((c, idx) => _crmRenderCustomerRow(c, stats, startIdx + idx + 1)).join('');
    }

    // Render pagination
    const pgEl = document.getElementById('crmPagination');
    if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
    let pgHtml = '<button ' + (_crmCurrentPage <= 1 ? 'disabled' : '') + ' onclick="_crmGoToPage(' + (_crmCurrentPage - 1) + ')">◀</button>';
    for (let p = 1; p <= totalPages; p++) {
        pgHtml += '<button class="' + (p === _crmCurrentPage ? 'active' : '') + '" onclick="_crmGoToPage(' + p + ')">' + p + '</button>';
    }
    pgHtml += '<button ' + (_crmCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="_crmGoToPage(' + (_crmCurrentPage + 1) + ')">▶</button>';
    pgHtml += '<span class="pg-info">' + (startIdx+1) + '–' + Math.min(startIdx + _crmPageSize, filtered.length) + ' / ' + filtered.length + '</span>';
    pgEl.innerHTML = pgHtml;
}

function _crmGoToPage(page) {
    _crmCurrentPage = page;
    _crmRenderFilteredTable();
    // Scroll to table top
    document.getElementById('crmNhuCauTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// _crmDateShowAll removed - filtering now uses dropdown values directly

function _crmRenderCustomerRow(c, stats, stt) {
    const s = stats[c.id] || { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0 };
    const lastType = s.lastLog ? CONSULT_TYPES[s.lastLog.log_type] : null;
    let lastContent = s.lastLog?.content || '';
    if (lastContent && lastType) {
        lastContent = lastContent.replace(/^(?:✅|🏥|📦|💵|📝|📢|🚨|🚫|❌|🔧|🎨|👔|📄|🤝|💬|📞|✔️)?\s*(?:Tư vấn Sếp|Cấp cứu hoàn thành|Chốt đơn|Đặt cọc|Sau bán hàng|Hoàn Thành Cấp Cứu|Cấp Cứu Sếp)[:\s]+/i, '').trim();
    }
    const shortContent = lastContent.length > 30 ? lastContent.substring(0, 30) + '...' : lastContent;

    let appointDisplay = '';
    if (c.appointment_date) {
        const d = new Date(c.appointment_date);
        const days = ['CN','T2','T3','T4','T5','T6','T7'];
        const dayName = days[d.getDay()];
        appointDisplay = `<span style="color:#e65100;font-weight:600">${dayName} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</span>`;
    }

    return `<tr>
        <td style="text-align:center;font-weight:700;color:#64748b;font-size:12px;">${stt || ''}</td>
        <td style="font-size:12px;font-weight:600;">${c.assigned_to_name || '<span style="color:var(--gray-500)">—</span>'}</td>
        <td style="font-size:11px;font-weight:700;color:#e65100;cursor:pointer;" onclick="openOrderCodesPopup(${c.id})">${s.latestOrderCode || '—'}</td>
        <td>
            ${c.readonly ? (
                (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-700);color:var(--gray-400);opacity:0.6;cursor:not-allowed;">
                    ⏳ Chờ Duyệt Hủy
                </span>
            ` : (c.cancel_approved === -2) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:#dc2626;color:white;opacity:0.6;cursor:not-allowed;">
                    ❌ Hủy Khách (nhắc lại)
                </span>
            ` : (c.cancel_approved === -1) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </span>
            ` : `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </span>
            `) : (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <button class="btn btn-sm" disabled style="font-size:11px;padding:4px 8px;background:var(--gray-700);color:var(--gray-400);cursor:not-allowed;">
                    ⏳ Chờ Duyệt Hủy
                </button>
            ` : (c.cancel_approved === -2) ? `
                <button class="btn btn-sm consult-btn" onclick="openConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:#dc2626;color:white;animation:emBlink 2s infinite;">
                    ❌ Hủy Khách
                </button>
            ` : (c.cancel_approved === -1) ? `
                <button class="btn btn-sm consult-btn" onclick="openConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};animation:emBlink 2s infinite;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </button>
            ` : `
                <button class="btn btn-sm consult-btn" onclick="openConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </button>
            `}
        </td>
        <td style="font-size:12px;color:#e65100;font-weight:600;cursor:pointer;" onclick="openCustomerDetail(${c.id}).then(()=>setTimeout(()=>switchCDTab('history'),100))" title="${lastContent}">
            ${shortContent || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.consultCount}</td>
        <td style="font-size:12px;">
            ${appointDisplay || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td><strong style="color:#e65100">${getCustomerCode(c)}</strong></td>
        <td>
            ${!c.readonly ? '<button class="btn btn-sm" onclick="event.stopPropagation();openCustomerInfo(' + c.id + ')" style="font-size:9px;padding:1px 5px;margin-right:4px;background:var(--gray-700);color:var(--gold);" title="Cập nhật thông tin">✏️</button>' : ''}
            ${(() => {
                const _colors = [
                    {bg:'rgba(239,68,68,0.12)',text:'#dc2626',border:'rgba(239,68,68,0.25)'},
                    {bg:'rgba(249,115,22,0.12)',text:'#ea580c',border:'rgba(249,115,22,0.25)'},
                    {bg:'rgba(234,179,8,0.12)',text:'#ca8a04',border:'rgba(234,179,8,0.25)'},
                    {bg:'rgba(34,197,94,0.12)',text:'#16a34a',border:'rgba(34,197,94,0.25)'},
                    {bg:'rgba(20,184,166,0.12)',text:'#0d9488',border:'rgba(20,184,166,0.25)'},
                    {bg:'rgba(6,182,212,0.12)',text:'#0891b2',border:'rgba(6,182,212,0.25)'},
                    {bg:'rgba(59,130,246,0.12)',text:'#2563eb',border:'rgba(59,130,246,0.25)'},
                    {bg:'rgba(139,92,246,0.12)',text:'#7c3aed',border:'rgba(139,92,246,0.25)'},
                    {bg:'rgba(236,72,153,0.12)',text:'#db2777',border:'rgba(236,72,153,0.25)'},
                    {bg:'rgba(244,63,94,0.12)',text:'#e11d48',border:'rgba(244,63,94,0.25)'},
                ];
                const _ci = (c.id || 0) % _colors.length;
                const _cc = _colors[_ci];
                const _bdayIcon = _crmIsBirthdayToday(c.birthday) ? '🎂🎉 ' : '';
                return `<span onclick="openCustomerDetail(${c.id})" style="cursor:pointer;display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${_cc.bg};color:${_cc.text};border:1px solid ${_cc.border};transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.boxShadow='0 2px 8px ${_cc.border}'" onmouseout="this.style.boxShadow='none'">${_bdayIcon}${c.customer_name}</span>`;
            })()}
        </td>
        <td>${c.readonly ? '<span style="color:var(--gray-400)">' + c.phone + '</span>' : '<a href="tel:' + c.phone + '" style="color:var(--info)">' + c.phone + '</a>'}</td>
        <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.facebook_link ? '<a href="' + c.facebook_link + '" target="_blank" style="color:#1877F2;font-weight:600;" title="' + c.facebook_link + '">🔗 FB</a>' : '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.address || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.source_name || '—'}</td>
        <td style="font-size:12px;${currentUser.role === 'giam_doc' ? 'cursor:pointer;' : ''}" onclick="${currentUser.role === 'giam_doc' && !c.referrer_id ? 'openReferrerSearch(' + c.id + ')' : ''}">
            ${c.referrer_id ? `<span style="cursor:pointer;text-decoration:underline;color:var(--info);font-weight:600;" onclick="event.stopPropagation();openAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>` : (currentUser.role === 'giam_doc' ? '<span style="color:var(--gray-500)" title="Click để tìm">🔍 Tìm</span>' : '<span style="color:var(--gray-500)">—</span>')}
        </td>
        <td style="font-size:11px">${(c.referrer_user_crm_type || c.referrer_crm_type) ? (CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type) : '—'}</td>
        <td style="font-size:12px;font-weight:600;color:#122546;">${c.job || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.chotDonCount}</td>
        <td style="text-align:right;font-weight:700;color:var(--success);font-size:14px;">${s.revenue > 0 ? formatCurrency(s.revenue) : '0'}</td>
    </tr>`;
}

async function loadCrmNhuCauData() {
    let url = '/api/customers?crm_type=nhu_cau';
    const search = document.getElementById('crmSearch')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const topStaff = document.getElementById('crmTopStaffFilter')?.value;
    if (topStaff) url += `&employee_id=${topStaff}`;

    const data = await apiCall(url);
    const tbody = document.getElementById('crmNhuCauTbody');

    // Include ALL customers (including cancelled) for categorization
    const customers = data.customers || [];

    // Affiliate: readonly + mask phone for child referrals
    if (currentUser.role === 'tkaffiliate') {
        customers.forEach(c => {
            c.readonly = true;
            if (c.referrer_id && c.referrer_id !== currentUser.id && c.phone && c.phone.length >= 4) {
                c.phone = c.phone.substring(0, 2) + 'xx xxx xx' + c.phone.substring(c.phone.length - 1);
            }
        });
    }

    // Fetch consultation stats in batch
    const ids = customers.map(c => c.id).join(',');
    let stats = {};
    if (ids) {
        const statsData = await apiCall(`/api/customers/consult-stats?customer_ids=${ids}`);
        stats = statsData.stats || {};
    }

    // Store for re-filtering
    _crmAllCustomers = customers;
    _crmAllStats = stats;

    // Count categories
    const counts = { phai_xu_ly: 0, moi_chuyen: 0, da_xu_ly: 0, xu_ly_tre: 0, cho_xu_ly: 0, huy_khach: 0 };
    customers.forEach(c => { const cat = _crmGetCategory(c, stats); counts[cat]++; });

    // Update stat cards - show TOTAL counts (not monthly filtered)
    const el = (id) => document.getElementById(id);
    if (el('crmStatPhaiXuLy')) el('crmStatPhaiXuLy').textContent = counts.phai_xu_ly + counts.moi_chuyen;
    if (el('crmStatDaXuLy')) el('crmStatDaXuLy').textContent = counts.da_xu_ly;
    if (el('crmStatXuLyTre')) el('crmStatXuLyTre').textContent = counts.xu_ly_tre;
    if (el('crmStatChoXuLy')) el('crmStatChoXuLy').textContent = counts.cho_xu_ly;
    if (el('crmStatHuyKhach')) el('crmStatHuyKhach').textContent = counts.huy_khach;

    // Re-highlight active card
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    if (_crmActiveCat) {
        const activeEl = document.querySelector('.crm-stat-card[data-cat="' + _crmActiveCat + '"]');
        if (activeEl) activeEl.classList.add('active');
    }

    // Update consult type dropdown
    _crmUpdateConsultTypeDropdown();

    // Render table
    // Auto-select 'Phải xử lý hôm nay' on first load
    if (!_crmActiveCat) {
        _crmFilterByCat('phai_xu_ly');
    } else {
        _crmRenderFilteredTable();
    }
}

function applyCrmNhuCauFilter() { loadCrmNhuCauData(); }
function resetCrmNhuCauFilter() {
    _crmActiveCat = null;
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    document.getElementById('crmFilterConsultType').value = '';
    document.getElementById('crmSearch').value = '';
    const topStaff = document.getElementById('crmTopStaffFilter');
    if (topStaff) topStaff.value = '';
    loadCrmNhuCauData();
}

// ========== CONSULTATION MODAL ==========
async function openConsultModal(customerId) {
    window._currentConsultCustomerId = customerId;
    // Check if customer has a pending emergency
    let pendingEmergency = null;
    let handlerOptions = '';
    let customerInfo = {};
    let existingItems = [];
    let consultLogs = [];
    try {
        // Load all data in parallel
        const [pendingData, hData, custData, logData] = await Promise.all([
            apiCall(`/api/emergencies/pending/${customerId}`).catch(() => ({})),
            apiCall('/api/emergencies/handlers').catch(() => ({})),
            apiCall(`/api/customers/${customerId}`).catch(() => ({})),
            apiCall(`/api/customers/${customerId}/consult-logs`).catch(() => ({}))
        ]);
        if (pendingData.hasPending) pendingEmergency = pendingData.emergency;
        const ROLE_LABELS_H = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng' };
        handlerOptions = (hData.handlers || [])
            .map(u => '<option value="' + u.id + '"' + (pendingEmergency && pendingEmergency.handler_id === u.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS_H[u.role] || u.role) + ')</option>')
            .join('');
        customerInfo = custData.customer || {};
        existingItems = custData.items || [];
        consultLogs = logData.logs || [];
    } catch(e) {}
    const grandTotal = existingItems.reduce((s, i) => s + (i.total || 0), 0);

    // Determine allowed types based on order_status and consultation history
    const orderStatus = customerInfo.order_status || 'dang_tu_van';
    const allTypes = Object.entries(CONSULT_TYPES);

    // Check if customer already has a sau_ban_hang consultation
    const hasSauBanHang = consultLogs.some(l => l.log_type === 'sau_ban_hang');

    let allowedTypes;
    if (hasSauBanHang && orderStatus === 'sau_ban_hang') {
        // After Chăm Sóc Sau Bán → only Tương Tác Kết Nối Lại
        allowedTypes = allTypes.filter(([k]) => ['tuong_tac_ket_noi'].includes(k));
    } else if (orderStatus === 'tuong_tac_ket_noi') {
        // After Tương Tác Kết Nối Lại → only Gửi Chương Trình KH Cũ
        allowedTypes = allTypes.filter(([k]) => ['gui_ct_kh_cu'].includes(k));
    } else if (orderStatus === 'gui_ct_kh_cu') {
        // After Gửi Chương Trình KH Cũ
        allowedTypes = allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else if (orderStatus === 'lam_quen_tuong_tac') {
        // After Làm Quen Tương Tác
        allowedTypes = allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke'].includes(k));
    } else if (orderStatus === 'hoan_thanh') {
        // After Hoàn Thành Đơn → only Chăm Sóc Sau Bán
        allowedTypes = allTypes.filter(([k]) => ['sau_ban_hang'].includes(k));
    } else if (orderStatus === 'chot_don') {
        // After Chốt Đơn → Đang Sản Xuất + Hoàn Thành Đơn + CCS
        allowedTypes = allTypes.filter(([k]) => ['dang_san_xuat','hoan_thanh','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'dat_coc') {
        // After Đặt Cọc → Chốt Đơn + CCS + Hủy Cọc
        allowedTypes = allTypes.filter(([k]) => ['chot_don','cap_cuu_sep','huy_coc'].includes(k));
    } else if (orderStatus === 'gui_stk_coc') {
        // After Gửi STK Cọc → Giục Cọc + Đặt Cọc + Nhắn Tin + CCS
        const order = ['giuc_coc','dat_coc','nhan_tin','cap_cuu_sep'];
        allowedTypes = order.map(k => [k, CONSULT_TYPES[k]]).filter(([,v]) => v);
    } else if (orderStatus === 'huy_coc') {
        // After Hủy Cọc → TTKN Lại + Nhắn Tin + Gọi Điện + Gặp Trực Tiếp + CCS
        allowedTypes = allTypes.filter(([k]) => ['tuong_tac_ket_noi','nhan_tin','goi_dien','gap_truc_tiep','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'duyet_huy') {
        // TH1: Duyệt hủy xong → chỉ Nhắn Tin
        allowedTypes = allTypes.filter(([k]) => ['nhan_tin'].includes(k));
    } else if (orderStatus === 'tu_van_lai') {
        // TH2: Không duyệt hủy → Giảm Giá + Thiết Kế
        allowedTypes = allTypes.filter(([k]) => ['giam_gia','thiet_ke'].includes(k));
    } else if (orderStatus === 'giam_gia') {
        // After Giảm Giá
        allowedTypes = allTypes.filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else {
        // Normal: consultation phase types only
        const normalTypes = ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc','cap_cuu_sep','huy'];
        allowedTypes = allTypes.filter(([k]) => normalTypes.includes(k));
    }

    // Pre-select next logical type
    const lastLog = consultLogs.length > 0 ? consultLogs[0] : null;

    // Override: after Hoàn Thành Cấp Cứu → show full consultation types with Giảm Giá
    if (lastLog && lastLog.log_type === 'hoan_thanh_cap_cuu') {
        allowedTypes = allTypes.filter(([k]) => ['giam_gia','lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    }

    // Override: if customer has a PENDING emergency → lock to cap_cuu_sep only
    if (pendingEmergency) {
        allowedTypes = allTypes.filter(([k]) => k === 'cap_cuu_sep');
    }

    // Override: if customer cancel was auto-reverted (24h no response) → lock to Hủy Khách only
    if (customerInfo.cancel_approved === -2) {
        allowedTypes = allTypes.filter(([k]) => k === 'huy');
    }

    let defaultType = lastLog ? lastLog.log_type : (allowedTypes.length > 0 ? allowedTypes[0][0] : 'goi_dien');

    // Force defaultType when pending emergency
    if (pendingEmergency) defaultType = 'cap_cuu_sep';
    // Force defaultType when cancel auto-reverted
    if (customerInfo.cancel_approved === -2) defaultType = 'huy';

    // After Đặt Cọc → default to Chốt Đơn
    if (defaultType === 'dat_coc') defaultType = 'chot_don';
    // After Chốt Đơn → default to Hoàn Thành Đơn
    else if (defaultType === 'chot_don') defaultType = 'hoan_thanh';
    // After Hoàn Thành Đơn → default to Sau Bán Hàng
    else if (defaultType === 'hoan_thanh') defaultType = 'sau_ban_hang';
    // After Hủy Cọc → default to Nhắn Tin
    else if (defaultType === 'huy_coc') defaultType = 'nhan_tin';
    // After Gửi STK Cọc → default to Giục Cọc
    else if (defaultType === 'gui_stk_coc') defaultType = 'giuc_coc';

    const typeOptions = allowedTypes.map(([k, v]) =>
        `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${v.icon} ${v.label}</option>`
    ).join('');

    // Collapsible consultation history (grouped by month)
    const historyHTML = consultLogs.length > 0 ? `
        <div style="margin-bottom:12px;">
            <button type="button" onclick="toggleConsultHistory()" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--gray-500);cursor:pointer;display:flex;align-items:center;gap:4px;width:100%;">
                📜 Xem lịch sử (${consultLogs.length}) <span id="historyArrow" style="margin-left:auto;">▼</span>
            </button>
            <div id="consultHistoryPanel" style="display:none;max-height:300px;overflow-y:auto;padding:10px;background:var(--gray-50);border-radius:0 0 8px 8px;border:1px solid var(--gray-200);border-top:none;">
                ${buildGroupedHistoryHTML(consultLogs, { compact: true })}
            </div>
        </div>
    ` : '';

    const bodyHTML = `
        ${historyHTML}
        <div class="form-group">
            <label>Loại Tư Vấn <span style="color:var(--danger)">*</span></label>
            <select id="consultType" class="form-control" onchange="onConsultTypeChange()">
                ${typeOptions}
            </select>
        </div>
        <div class="form-group" id="consultDepositGroup" style="display:none;">
            <label>Số Tiền Đặt Cọc <span style="color:var(--danger)">*</span></label>
            <input type="text" id="consultDepositAmount" class="form-control" placeholder="Nhập số tiền đặt cọc..." 
                style="font-size:14px;font-weight:600;color:#e65100;"
                oninput="formatDepositInput(this)">
        </div>
        <div class="form-group" id="consultContentGroup">
            <label>Nội Dung Tư Vấn <span style="color:var(--danger)">*</span></label>
            <textarea id="consultContent" class="form-control" rows="3" placeholder="Nhập nội dung tư vấn..."></textarea>
        </div>
        <div class="form-group" id="consultImageGroup">
            <label>Hình Ảnh <span id="consultImageReq" style="color:var(--danger)">*</span> (Ctrl+V để dán)</label>
            <div id="consultImageArea" class="image-paste-area" tabindex="0">
                <div id="consultImagePlaceholder">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                <img id="consultImagePreview" style="display:none;max-width:100%;max-height:200px;border-radius:8px;">
                <input type="file" id="consultImageFile" accept="image/*" style="display:none">
                <button id="consultImageRemove" class="btn btn-sm" style="display:none;position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:2px 8px;" onclick="removeConsultImage()">✕</button>
            </div>
        </div>
        <div class="form-group" id="consultNextTypeGroup" style="display:none">
            <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
            <select id="consultNextType" class="form-control" onchange="updateApptLabel()">
                ${Object.entries(CONSULT_TYPES).filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','dat_coc','chot_don','cap_cuu_sep','huy'].includes(k)).map(([k, v]) =>
                    `<option value="${k}" ${k === (lastLog?.next_consult_type || 'goi_dien') ? 'selected' : ''}>${v.icon} ${v.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group" id="consultAppointmentGroup">
            <label>Ngày Hẹn Làm Việc <span style="color:var(--danger)">*</span></label>
            <input type="date" id="consultAppointment" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
        </div>
        <div class="form-group" id="consultCancelGroup" style="display:none">
            <label>Lý Do Hủy <span style="color:var(--danger)">*</span></label>
            <textarea id="consultCancelReason" class="form-control" rows="3" placeholder="Nhập lý do hủy khách hàng..."></textarea>
            <div style="margin-top:8px;padding:10px;background:rgba(220,38,38,0.15);border-radius:6px;border:1px solid rgba(220,38,38,0.3);font-size:12px;color:#fca5a5;">
                ⚠️ Hủy khách hàng sẽ cần Quản Lý/Giám Đốc duyệt.
            </div>
        </div>
        <div class="form-group" id="consultHandlerGroup" style="display:none">
            <label>Chọn Người Xử Lý <span style="color:var(--danger)">*</span></label>
            <select id="consultHandler" class="form-control" ${pendingEmergency ? 'disabled style="opacity:0.7;cursor:not-allowed;background:var(--gray-100);"' : ''}>
                ${pendingEmergency ? '' : '<option value="">-- Chọn Sếp --</option>'}
                ${handlerOptions}
            </select>
            <div style="margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#fca5a5;">
                🚨 Khách hàng sẽ hiện ở trang Cấp Cứu Sếp của người được chọn.
            </div>
        </div>
        ${pendingEmergency ? `
        <div style="margin:12px 0;padding:12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;">
            <div style="font-size:13px;font-weight:700;color:#fca5a5;margin-bottom:4px;">🚨 Khách đang có cấp cứu sếp chưa giải quyết</div>
            <div style="font-size:11px;color:#94a3b8;">Ấn "GHI NHẬN" sẽ nhắc lại cho sếp xử lý. Ngày hẹn tự động đặt sang ngày mai.</div>
        </div>` : ''}
        <div id="consultOrderGroup" style="display:none">
            <div class="form-group" id="consultOrderCodeGroup" style="display:none;">
                <label>Mã Đơn <span style="color:var(--gray-500);font-size:11px;">(Tự động)</span></label>
                <input type="text" id="consultOrderCode" class="form-control" readonly style="background:var(--gray-100);font-weight:700;color:var(--navy);font-size:16px;cursor:not-allowed;border:2px solid var(--gold);">
            </div>
            <div class="form-group">
                <label>SĐT Khách Hàng</label>
                <input type="text" id="consultPhone" class="form-control" value="${customerInfo.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="10 chữ số">
            </div>
            <div class="form-group">
                <label>Đơn Hàng <span style="color:var(--danger)">*</span></label>
                <table class="table" style="font-size:13px;" id="consultOrderTable">
                    <thead><tr><th>Mô tả</th><th style="width:80px">SL</th><th style="width:120px">Đơn giá</th><th style="width:120px">Thành tiền</th><th style="width:50px"></th></tr></thead>
                    <tbody>
                        ${existingItems.length > 0 ? existingItems.map(it => `<tr>
                            <td><input class="form-control oi-desc" value="${it.description||''}" style="font-size:13px;padding:6px 8px;"></td>
                            <td><input type="number" class="form-control oi-qty" value="${it.quantity||0}" min="0" style="font-size:13px;padding:6px 8px;width:70px;"></td>
                            <td><input type="text" class="form-control oi-price" value="${formatCurrency(it.unit_price||0)}" style="font-size:13px;padding:6px 8px;" oninput="formatDepositInput(this);calcConsultOrderTotal()"></td>
                            <td class="oi-total" style="text-align:right;font-weight:600">${formatCurrency(it.total)}</td>
                            <td><button class="btn btn-sm" onclick="this.closest('tr').remove();calcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
                        </tr>`).join('') : ''}
                    </tbody>
                </table>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <button class="btn btn-sm" onclick="addConsultOrderRow()" style="font-size:12px;">➕ Thêm dòng</button>
                    <div style="text-align:right;">
                        <div style="font-size:16px;font-weight:700;">Tổng: <span id="consultOrderTotal" style="color:#d4a843;font-size:18px;">${formatCurrency(grandTotal)}</span> VNĐ</div>
                        <div id="consultDepositInfo" style="display:none;margin-top:4px;font-size:13px;">
                            <span style="color:#6b7280;">Đã cọc:</span> <span id="consultDepositDisplay" style="color:#10b981;font-weight:600;">0</span> VNĐ
                            <br><span style="color:#6b7280;">Còn lại:</span> <span id="consultRemainingDisplay" style="color:#e65100;font-weight:700;font-size:15px;">0</span> VNĐ
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Địa Chỉ Cụ Thể <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="consultAddress" class="form-control" value="${customerInfo.address || ''}" placeholder="Nhập địa chỉ cụ thể">
                </div>
                <div class="form-group">
                    <label>Thành Phố <span style="color:var(--danger)">*</span></label>
                    <select id="consultCity" class="form-control">
                        <option value="">-- Chọn tỉnh/thành --</option>
                        ${VN_PROVINCES.map(p => `<option value="${p}" ${customerInfo.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group" style="display:none">
                <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
                <select id="consultChotDonNextType" class="form-control" onchange="updateChotDonApptLabel()">
                    <option value="dang_san_xuat">🏭 Đang Sản Xuất</option>
                    <option value="hoan_thanh">🏆 Hoàn Thành Đơn</option>
                </select>
            </div>
            <div class="form-group">
                <label id="consultChotDonApptLabel">Ngày Hẹn Làm Việc Khách <span style="color:var(--danger)">*</span></label>
                <input type="date" id="consultSBHDate" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="consultSubmitBtn" onclick="submitConsultLog(${customerId})" style="width:auto;">📝 GHI NHẬN</button>
    `;

    openModal('📋 Ghi Nhận Tư Vấn', bodyHTML, footerHTML);

    // Setup image paste + trigger initial type change
    setTimeout(() => {
        const area = document.getElementById('consultImageArea');
        if (area) {
            area.addEventListener('paste', handleConsultImagePaste);
            area.addEventListener('click', () => area.focus());
        }
        document.querySelectorAll('#consultOrderTable .oi-qty, #consultOrderTable .oi-price').forEach(el => el.addEventListener('input', calcConsultOrderTotal));
        onConsultTypeChange(); // trigger to show/hide correct fields
    }, 100);
}

window._consultImageBlob = null;

function handleConsultImagePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            window._consultImageBlob = blob;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('consultImagePreview').src = ev.target.result;
                document.getElementById('consultImagePreview').style.display = 'block';
                document.getElementById('consultImagePlaceholder').style.display = 'none';
                document.getElementById('consultImageRemove').style.display = 'block';
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
}

function removeConsultImage() {
    window._consultImageBlob = null;
    document.getElementById('consultImagePreview').style.display = 'none';
    document.getElementById('consultImagePlaceholder').style.display = 'block';
    document.getElementById('consultImageRemove').style.display = 'none';
}

function onConsultTypeChange() {
    const type = document.getElementById('consultType').value;
    const cancelGroup = document.getElementById('consultCancelGroup');
    const contentGroup = document.getElementById('consultContentGroup');
    const imageGroup = document.getElementById('consultImageGroup');
    const appointmentGroup = document.getElementById('consultAppointmentGroup');
    const orderGroup = document.getElementById('consultOrderGroup');
    const handlerGroup = document.getElementById('consultHandlerGroup');
    const imageReq = document.getElementById('consultImageReq');

    // Reset all
    if (cancelGroup) cancelGroup.style.display = 'none';
    if (handlerGroup) handlerGroup.style.display = 'none';
    if (orderGroup) orderGroup.style.display = 'none';
    const depositGroup = document.getElementById('consultDepositGroup');
    if (depositGroup) depositGroup.style.display = 'none';
    if (contentGroup) contentGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    if (appointmentGroup) appointmentGroup.style.display = 'block';
    const nextTypeGroup = document.getElementById('consultNextTypeGroup');
    if (nextTypeGroup) nextTypeGroup.style.display = 'none';

    // Reset labels back to default
    const contentLabel = contentGroup?.querySelector('label');
    if (contentLabel) contentLabel.innerHTML = 'Nội Dung Tư Vấn <span style="color:var(--danger)">*</span>';
    const contentArea = document.getElementById('consultContent');
    if (contentArea) contentArea.placeholder = 'Nhập nội dung tư vấn...';
    const apptLabel = appointmentGroup?.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = 'Ngày Hẹn Tiếp Theo <span style="color:var(--danger)">*</span>';

    // Image required: hide * for goi_dien, dat_coc, cap_cuu_sep, sau_ban_hang
    const imageOptionalTypes = ['goi_dien', 'dat_coc', 'cap_cuu_sep', 'sau_ban_hang'];
    if (imageReq) imageReq.style.display = imageOptionalTypes.includes(type) ? 'none' : 'inline';

    // HỦY flow
    if (type === 'huy') {
        if (cancelGroup) cancelGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Đặt Cọc flow — show Mã Đơn + deposit amount + content + image + appointment
    if (type === 'dat_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Show deposit amount field
        const depositGroup = document.getElementById('consultDepositGroup');
        if (depositGroup) depositGroup.style.display = 'block';
        // Show only the Mã Đơn field from orderGroup
        const ocGroup = document.getElementById('consultOrderCodeGroup');
        if (ocGroup) ocGroup.style.display = 'block';
        fetchOrderCode();
    }

    // Chốt Đơn flow
    if (type === 'chot_don') {
        if (orderGroup) orderGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
        // Fetch order code (reuses existing from đặt cọc if any)
        fetchOrderCode();
        // Fetch deposit amount from dat_coc log
        window._currentDepositAmount = 0;
        const customerId = window._currentConsultCustomerId;
        if (customerId) {
            apiCall(`/api/customers/${customerId}/consult`).then(data => {
                const datCocLog = (data.logs || []).find(l => l.log_type === 'dat_coc' && l.deposit_amount > 0);
                if (datCocLog) {
                    window._currentDepositAmount = datCocLog.deposit_amount;
                    calcConsultOrderTotal();
                }
            });
        }
    }

    // Cấp Cứu Sếp flow
    if (type === 'cap_cuu_sep') {
        if (handlerGroup) handlerGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Sau Bán Hàng flow - just content + appointment
    if (type === 'sau_ban_hang') {
        if (imageGroup) imageGroup.style.display = 'none';
    }

    // Hoàn Thành Đơn flow - content + appointment
    if (type === 'hoan_thanh') {
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
    }

    // Hủy Cọc flow - content (lý do) + appointment date
    if (type === 'huy_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Relabel
        const contentLabel = contentGroup?.querySelector('label');
        if (contentLabel) contentLabel.innerHTML = 'Lý Do Hủy Cọc <span style="color:var(--danger)">*</span>';
        const contentArea = document.getElementById('consultContent');
        if (contentArea) contentArea.placeholder = 'Nhập lý do hủy cọc...';
        const apptLabel = appointmentGroup?.querySelector('label');
        if (apptLabel) apptLabel.innerHTML = 'Ngày Hẹn Làm Việc <span style="color:var(--danger)">*</span>';
    }
}

function updateApptLabel() {
    const sel = document.getElementById('consultNextType');
    const apptGroup = document.getElementById('consultAppointmentGroup');
    if (!sel || !apptGroup) return;
    const val = sel.value;
    const typeInfo = CONSULT_TYPES[val];
    const label = typeInfo ? typeInfo.label : 'Tiếp Theo';
    const apptLabel = apptGroup.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = `Ngày Hẹn ${label} <span style="color:var(--danger)">*</span>`;
}

function updateChotDonApptLabel() {
    const sel = document.getElementById('consultChotDonNextType');
    const lbl = document.getElementById('consultChotDonApptLabel');
    if (!sel || !lbl) return;
    const labels = { dang_san_xuat: 'Đang Sản Xuất', hoan_thanh: 'Hoàn Thành Đơn' };
    lbl.innerHTML = `Ngày Hẹn ${labels[sel.value] || 'Hoàn Thành Đơn'} <span style="color:var(--danger)">*</span>`;
}

// ========== SHARED GROUPED HISTORY BUILDER ==========
function buildGroupedHistoryHTML(logs, options = {}) {
    const { compact = false } = options;
    if (logs.length === 0) return compact ? '' : '<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:8px;">📭</div><div style="color:#94a3b8;font-size:14px;">Chưa có lịch sử tư vấn</div></div>';

    const now = new Date();
    const currentKey = `${now.getMonth()+1}/${now.getFullYear()}`;

    // Group by month/year
    const groups = {};
    logs.forEach(log => {
        const d = new Date(log.created_at);
        const key = `${d.getMonth()+1}/${d.getFullYear()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
    });

    const MONTH_NAMES = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    return Object.entries(groups).map(([key, items]) => {
        const [m, y] = key.split('/');
        const isCurrentMonth = key === currentKey;
        const groupId = 'hg_' + key.replace('/', '_') + '_' + Math.random().toString(36).slice(2,6);

        const logsHTML = items.map((log, idx) => {
            const t = CONSULT_TYPES[log.log_type] || { icon: '📋', label: log.log_type, color: '#6b7280' };
            const d = new Date(log.created_at);
            const days = ['CN','T2','T3','T4','T5','T6','T7'];
            const dayName = days[d.getDay()];
            const dateStr = compact
                ? `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
                : `${dayName} ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
            const userName = log.logged_by_name || 'N/A';

            if (compact) {
                let extra = '';
                if (log.content) {
                    const sc = log.content.length > 80 ? log.content.substring(0,80)+'...' : log.content;
                    extra += `<div style="font-size:10px;color:var(--gray-500);margin-top:2px;padding-left:18px;">📝 ${sc}</div>`;
                }
                if (log.image_path) {
                    extra += `<div style="margin-top:3px;padding-left:18px;"><img src="${log.image_path}" style="max-width:80px;max-height:50px;border-radius:4px;border:1px solid var(--gray-200);cursor:pointer;" onclick="window.open('${log.image_path}','_blank')"></div>`;
                }
                return `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--gray-100);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <span style="color:${t.color};font-weight:600;">${t.icon} ${t.label}</span>
                        <span style="color:var(--gray-400);font-size:10px;text-align:right;">${dateStr}<br><span style="color:#8b5cf6;font-weight:500;">${userName}</span></span>
                    </div>
                    ${extra}
                </div>`;
            } else {
                const isLast = idx === items.length - 1;
                return `<div style="display:flex;gap:12px;position:relative;padding-bottom:${isLast ? '4' : '16'}px;">
                    <!-- Timeline line -->
                    ${!isLast ? `<div style="position:absolute;left:15px;top:32px;bottom:0;width:2px;background:linear-gradient(to bottom,${t.color}22,#e2e8f0);"></div>` : ''}
                    <!-- Timeline dot -->
                    <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:${t.color};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px ${t.color}44;z-index:1;">
                        ${t.icon}
                    </div>
                    <!-- Card -->
                    <div style="flex:1;min-width:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${log.content || log.image_path ? '8' : '0'}px;">
                            <span style="font-size:12px;font-weight:700;color:${t.color};background:${t.color}12;padding:2px 10px;border-radius:6px;">${t.label}</span>
                            <div style="text-align:right;flex-shrink:0;">
                                <div style="font-size:11px;color:#94a3b8;">${dateStr}</div>
                                <div style="font-size:11px;color:#8b5cf6;font-weight:600;">${userName}</div>
                            </div>
                        </div>
                        ${log.content ? `<div style="font-size:13px;color:#1e293b;line-height:1.5;padding:8px 12px;background:white;border-radius:8px;border:1px solid #f1f5f9;">${log.content}</div>` : ''}
                        ${log.image_path ? `<div style="margin-top:8px;"><img src="${log.image_path}" style="max-width:200px;max-height:140px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;transition:transform 0.15s;" onclick="window.open('${log.image_path}','_blank')" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"></div>` : ''}
                    </div>
                </div>`;
            }
        }).join('');

        const headerStyle = compact
            ? 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#122546;color:#fad24c;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:4px;'
            : 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border-radius:10px;font-size:13px;font-weight:700;margin-bottom:12px;';

        return `<div style="margin-bottom:${compact ? '6' : '8'}px;">
            <div style="${headerStyle}" onclick="var p=document.getElementById('${groupId}');p.style.display=p.style.display==='none'?'block':'none';this.querySelector('.hg-arrow').textContent=p.style.display==='none'?'▶':'▼';">
                <span>📅 ${MONTH_NAMES[Number(m)]} ${y} <span style="background:rgba(250,210,76,0.2);color:#fad24c;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;">${items.length}</span></span>
                <span class="hg-arrow" style="font-size:12px;">${isCurrentMonth ? '▼' : '▶'}</span>
            </div>
            <div id="${groupId}" style="display:${isCurrentMonth ? 'block' : 'none'};">
                ${logsHTML}
            </div>
        </div>`;
    }).join('');
}

// ========== SHARED ORDER CARD BUILDER ==========
function buildOrderCardHTML(codes, customer) {
    if (codes.length === 0) return '<p style="color:#6b7280;text-align:center;padding:20px;">Chưa có mã đơn nào</p>';

    let allOrdersTotal = 0;

    const cardsHTML = codes.map(oc => {
        const d = new Date(oc.created_at);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        const orderItems = oc.items || [];
        const orderDeposit = oc.deposit || 0;
        const orderTotal = orderItems.reduce((s, i) => s + (i.total || 0), 0);
        if (oc.status !== 'cancelled') allOrdersTotal += orderTotal;
        const statusBadge = oc.status === 'completed' 
            ? '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">✅ Hoàn thành</span>'
            : oc.status === 'cancelled'
            ? '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">❌ Đã hủy</span>'
            : '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">🔄 Đang xử lý</span>';
        
        const actionBtns = '';

        return `
            <div style="padding:12px;border:1px solid ${oc.status === 'completed' ? '#10b981' : oc.status === 'cancelled' ? '#ef4444' : '#e5e7eb'};border-radius:10px;margin-bottom:8px;background:${oc.status === 'completed' ? '#f0fdf4' : oc.status === 'cancelled' ? '#fef2f2' : '#fafafa'};">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:8px;">
                    <div style="min-width:90px;">
                        <div style="font-size:10px;color:#6b7280;">Mã Đơn</div>
                        <div style="font-weight:700;color:#e65100;font-size:15px;">${oc.order_code}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">NV Tạo</div>
                        <div style="font-weight:600;color:#122546;font-size:12px;">${oc.user_name || '—'}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">Ngày</div>
                        <div style="font-weight:600;color:#122546;font-size:12px;">${dateStr}</div>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                ${orderItems.length > 0 ? `
                    <table style="width:100%;font-size:12px;border-collapse:collapse;border-radius:6px;overflow:hidden;">
                        <thead><tr style="background:#122546;">
                            <th style="text-align:left;padding:6px 8px;color:#fad24c;font-weight:700;">TÊN SP</th>
                            <th style="text-align:center;padding:6px 8px;color:#fad24c;font-weight:700;width:45px;">SL</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">GIÁ</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">THÀNH TIỀN</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">CỌC</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">CÒN LẠI</th>
                        </tr></thead>
                        <tbody>
                            ${orderItems.map(it => {
                                const itemDeposit = orderItems.length === 1 ? orderDeposit : Math.round(orderDeposit * (it.total || 0) / orderTotal);
                                const itemRemain = Math.max(0, (it.total || 0) - itemDeposit);
                                return `<tr style="border-top:1px solid #e5e7eb;">
                                    <td style="padding:5px 8px;color:#122546;">${it.description || '—'}</td>
                                    <td style="padding:5px 8px;text-align:center;color:#122546;font-weight:600;">${it.quantity}</td>
                                    <td style="padding:5px 8px;text-align:right;color:#122546;">${formatCurrency(it.unit_price || 0)}đ</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:600;color:#e65100;">${formatCurrency(it.total)}đ</td>
                                    <td style="padding:5px 8px;text-align:right;color:#10b981;font-weight:600;">${orderDeposit > 0 ? formatCurrency(itemDeposit) + 'đ' : '—'}</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:700;color:#e65100;">${orderDeposit > 0 ? formatCurrency(itemRemain) + 'đ' : formatCurrency(it.total) + 'đ'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    <div style="text-align:right;font-size:13px;font-weight:600;margin-top:4px;color:#122546;">Tổng đơn: <span style="color:#e65100;">${formatCurrency(orderTotal)}</span> VNĐ${orderDeposit > 0 ? ` | Cọc: <span style="color:#10b981;">${formatCurrency(orderDeposit)}</span> VNĐ` : ''}</div>
                ` : '<p style="color:#9ca3af;font-size:12px;text-align:center;">Chưa có sản phẩm</p>'}
                ${actionBtns}
            </div>
        `;
    }).join('');

    return cardsHTML + (allOrdersTotal > 0 ? `<div style="text-align:right;font-size:16px;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #e5e7eb;">Tổng doanh số: <span style="color:#e65100;">${formatCurrency(allOrdersTotal)}</span> VNĐ</div>` : '');
}

// ========== ORDER CODES POPUP ==========
async function openOrderCodesPopup(customerId) {
    // Open full customer detail popup with "Đơn Hàng" tab pre-selected
    await openCustomerDetail(customerId);
    setTimeout(() => switchCDTab('orders'), 100);
}

// Per-order completion
async function completeOrder(orderId, customerId) {
    if (!confirm('Xác nhận hoàn thành đơn này? Hoa hồng sẽ được tính cho affiliate.')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/complete`, 'POST');
        if (res.success) {
            showToast('✅ ' + res.message);
            closeModal();
            openOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Per-order cancellation
async function cancelOrder(orderId, customerId) {
    if (!confirm('Xác nhận hủy đơn này?')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/cancel`, 'POST');
        if (res.success) {
            showToast('🚫 ' + res.message);
            closeModal();
            openOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Toggle collapsible history panel
function toggleConsultHistory() {
    const panel = document.getElementById('consultHistoryPanel');
    const arrow = document.getElementById('historyArrow');
    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
    }
}

// Fetch order code for current customer (always generates new)
function fetchOrderCode() {
    const ocGroup = document.getElementById('consultOrderCodeGroup');
    const ocInput = document.getElementById('consultOrderCode');
    if (!ocGroup || !ocInput) return;
    ocInput.value = 'Đang tải...';
    ocGroup.style.display = 'block';
    const customerId = window._currentConsultCustomerId;
    apiCall(`/api/order-codes/next${customerId ? '?customer_id=' + customerId : ''}`).then(res => {
        if (res.order_code) {
            ocInput.value = res.order_code;
            // New order = clear items table
            const tbody = document.querySelector('#consultOrderTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                addConsultOrderRow();
            }
            // Reset totals
            const totalEl = document.getElementById('consultOrderTotal');
            if (totalEl) totalEl.textContent = '0';
            const depInfo = document.getElementById('consultDepositInfo');
            if (depInfo) depInfo.style.display = 'none';
        } else {
            ocInput.value = 'Chưa cài mã đơn';
        }
    }).catch(() => { ocInput.value = 'Lỗi tải mã'; });
}

// Order table helpers for Chốt Đơn
function addConsultOrderRow() {
    const tbody = document.querySelector('#consultOrderTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control oi-desc" value="" style="font-size:13px;padding:6px 8px;"></td>
        <td><input type="number" class="form-control oi-qty" value="0" min="0" style="font-size:13px;padding:6px 8px;width:70px;" oninput="calcConsultOrderTotal()"></td>
        <td><input type="text" class="form-control oi-price" value="0" style="font-size:13px;padding:6px 8px;" oninput="formatDepositInput(this);calcConsultOrderTotal()"></td>
        <td class="oi-total" style="text-align:right;font-weight:600">0</td>
        <td><button class="btn btn-sm" onclick="this.closest('tr').remove();calcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function calcConsultOrderTotal() {
    let grand = 0;
    document.querySelectorAll('#consultOrderTable tbody tr').forEach(row => {
        const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
        const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
        const total = qty * price;
        row.querySelector('.oi-total').textContent = formatCurrency(total);
        grand += total;
    });
    const el = document.getElementById('consultOrderTotal');
    if (el) el.textContent = formatCurrency(grand);
    // Update deposit subtraction
    const deposit = window._currentDepositAmount || 0;
    const depositInfo = document.getElementById('consultDepositInfo');
    if (deposit > 0 && depositInfo) {
        depositInfo.style.display = 'block';
        document.getElementById('consultDepositDisplay').textContent = formatCurrency(deposit);
        document.getElementById('consultRemainingDisplay').textContent = formatCurrency(Math.max(0, grand - deposit));
    }
}

// Disable submit button to prevent double-click
function disableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
}
function enableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = false; btn.textContent = '📝 GHI NHẬN'; }
}

async function submitConsultLog(customerId) {
    // Debounce: disable button immediately
    disableSubmitBtn();
    const log_type = document.getElementById('consultType').value;
    const content = document.getElementById('consultContent')?.value;
    const appointment_date = document.getElementById('consultAppointment')?.value;

    // ========== HỦY flow ==========
    if (log_type === 'huy') {
        const reason = document.getElementById('consultCancelReason')?.value;
        if (!reason) { showToast('Vui lòng nhập lý do hủy!', 'error'); enableSubmitBtn(); return; }
        try {
            const data = await apiCall(`/api/customers/${customerId}/cancel`, 'POST', { reason });
            if (data.success) { showToast('✅ ' + data.message); closeModal(); loadCrmNhuCauData(); }
            else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Cấp Cứu Sếp flow ==========
    if (log_type === 'cap_cuu_sep') {
        const handler_id = document.getElementById('consultHandler')?.value;
        if (!content) { showToast('Vui lòng nhập nội dung tình huống!', 'error'); enableSubmitBtn(); return; }
        if (!handler_id) { showToast('Vui lòng chọn Sếp xử lý!', 'error'); enableSubmitBtn(); return; }
        try {
            // Upload image first via consultation
            const formData = new FormData();
            formData.append('log_type', 'cap_cuu_sep');
            formData.append('content', content);
            if (window._consultImageBlob) {
                formData.append('image', window._consultImageBlob, 'screenshot.png');
            }
            await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });

            // Create emergency
            const data = await apiCall('/api/emergencies', 'POST', {
                customer_id: customerId, reason: content, handler_id: Number(handler_id)
            });
            if (data.success) {
                showToast('🚨 ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
            } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Đặt Cọc flow ==========
    if (log_type === 'dat_coc') {
        const depositAmount = Number((document.getElementById('consultDepositAmount')?.value || '').replace(/\./g, '')) || 0;
        if (depositAmount <= 0) {
            showToast('Vui lòng nhập số tiền đặt cọc!', 'error'); enableSubmitBtn(); return;
        }
        const contentText = content || `Đặt cọc: ${formatCurrency(depositAmount)} VNĐ`;

        try {

            // Submit consultation log
            const formData = new FormData();
            formData.append('log_type', 'dat_coc');
            formData.append('content', contentText);
            formData.append('deposit_amount', depositAmount);
            if (appointment_date) formData.append('appointment_date', appointment_date);
            if (window._consultImageBlob) {
                formData.append('image', window._consultImageBlob, 'screenshot.png');
            }
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Đặt cọc thành công!'); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
            } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Chốt Đơn flow ==========
    if (log_type === 'chot_don') {
        const address = document.getElementById('consultAddress')?.value;
        const city = document.getElementById('consultCity')?.value;
        const phone = document.getElementById('consultPhone')?.value;
        const sbhDate = document.getElementById('consultSBHDate')?.value;
        if (!address) { showToast('Vui lòng nhập địa chỉ!', 'error'); enableSubmitBtn(); return; }
        if (!city) { showToast('Vui lòng chọn thành phố!', 'error'); enableSubmitBtn(); return; }
        if (!sbhDate) { showToast('Vui lòng chọn ngày hẹn sau bán hàng!', 'error'); enableSubmitBtn(); return; }

        // Phone validate
        if (phone && !/^\d{10}$/.test(phone)) {
            showToast('SĐT phải đúng 10 chữ số', 'error'); enableSubmitBtn(); return;
        }

        // Collect order items
        const rows = document.querySelectorAll('#consultOrderTable tbody tr');
        if (rows.length === 0) { showToast('Vui lòng thêm ít nhất 1 sản phẩm!', 'error'); enableSubmitBtn(); return; }
        const items = [];
        for (const row of rows) {
            const desc = row.querySelector('.oi-desc')?.value;
            const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
            const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
            if (desc && qty > 0 && price > 0) items.push({ description: desc, quantity: qty, unit_price: price });
        }
        if (items.length === 0) { showToast('Vui lòng nhập sản phẩm hợp lệ!', 'error'); enableSubmitBtn(); return; }

        try {
            // Generate order code FIRST so items link to new order
            const orderCodeEl = document.getElementById('consultOrderCode');
            if (orderCodeEl && orderCodeEl.value) {
                await apiCall('/api/order-codes', 'POST', { customer_id: customerId });
            }

            // Save order items (now linked to the newly created order)
            await apiCall(`/api/customers/${customerId}/items`, 'PUT', { items });

            // Sync phone + address + province
            const syncBody = { address, province: city };
            if (phone) syncBody.phone = phone;
            await apiCall(`/api/customers/${customerId}/info`, 'PUT', syncBody);

            // Submit consultation log with chot_don type
            const formData = new FormData();
            formData.append('log_type', 'chot_don');
            formData.append('content', `Chốt đơn: ${items.length} SP — ${address}, ${city}`);
            formData.append('address', address);
            formData.append('appointment_date', sbhDate);
            const chotDonNextType = document.getElementById('consultChotDonNextType')?.value;
            if (chotDonNextType) formData.append('next_consult_type', chotDonNextType);
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Chốt đơn thành công! Chuyển sang Sau Bán Hàng.'); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
            } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Normal consultation flow ==========
    if (!content) { showToast('Vui lòng nhập nội dung tư vấn!', 'error'); enableSubmitBtn(); return; }
    const imageRequiredTypes = ['nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua'];
    if (imageRequiredTypes.includes(log_type) && !window._consultImageBlob) {
        showToast('Vui lòng dán hình ảnh (Ctrl+V)!', 'error'); enableSubmitBtn(); return;
    }
    if (!appointment_date) { showToast('Vui lòng chọn ngày hẹn!', 'error'); enableSubmitBtn(); return; }

    const formData = new FormData();
    formData.append('log_type', log_type);
    formData.append('content', content);
    formData.append('appointment_date', appointment_date);
    const nextType = document.getElementById('consultNextType')?.value;
    if (nextType) formData.append('next_consult_type', nextType);
    if (window._consultImageBlob) {
        formData.append('image', window._consultImageBlob, 'screenshot.png');
    }

    try {
        const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast('✅ ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
        } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
    } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
}

// ========== CONSULTATION HISTORY ==========
async function openConsultHistory(customerId) {
    const [custData, logData, codesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    
    const c = custData.customer;
    if (!c) { showToast('Không tìm thấy', 'error'); return; }
    const logs = logData.logs || [];
    const items = custData.items || [];
    const codes = codesData.codes || [];
    const totalDeposit = codesData.total_deposit || 0;

    let bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-sm tab-btn active" onclick="switchConsultTab('info', this)" style="font-size:12px;">📋 Thông Tin</button>
            <button class="btn btn-sm tab-btn" onclick="switchConsultTab('history', this)" style="font-size:12px;">📜 Lịch Sử (${logs.length})</button>
            <button class="btn btn-sm tab-btn" onclick="switchConsultTab('order', this)" style="font-size:12px;">📦 Đơn Hàng</button>
        </div>

        <div id="tabInfo">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                <div><strong>Mã:</strong> <span style="color:var(--gold)">${getCustomerCode(c)}</span></div>
                <div><strong>Trạng thái:</strong> ${getStatusBadge(c.order_status)}</div>
                <div><strong>Khách hàng:</strong> ${c.customer_name}</div>
                <div><strong>SĐT:</strong> <a href="tel:${c.phone}">${c.phone}</a></div>
                <div><strong>Nguồn:</strong> ${c.source_name || '—'}</div>
                <div><strong>Ngày bàn giao:</strong> ${formatDate(c.handover_date)}</div>
                <div><strong>Địa chỉ:</strong> ${c.address || '—'}</div>
                <div><strong>Ngày sinh:</strong> ${c.birthday ? formatDate(c.birthday) : '—'}</div>
                <div><strong>Ngày hẹn:</strong> ${c.appointment_date || '—'}</div>
                <div><strong>Người nhận:</strong> ${c.assigned_to_name || '—'}</div>
                ${(c.referrer_name || c.referrer_customer_name) ? `<div><strong>Người GT:</strong> <span style="cursor:pointer;text-decoration:underline;color:var(--info);" onclick="openAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span></div>` : ''}
                ${(c.referrer_user_crm_type || c.referrer_crm_type) ? `<div><strong>CRM người GT:</strong> ${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</div>` : ''}
                ${c.notes ? `<div style="grid-column:1/-1"><strong>Ghi chú:</strong> ${c.notes}</div>` : ''}
            </div>
        </div>

        <div id="tabHistory" style="display:none;">
            ${logs.length === 0 ? '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có lịch sử</h3></div>' :
            `<div style="max-height:350px;overflow-y:auto;">
                ${buildGroupedHistoryHTML(logs)}
            </div>`}
        </div>

        <div id="tabOrder" style="display:none;">
            ${buildOrderCardHTML(codes, items, c, totalDeposit)}
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-primary" onclick="openConsultModal(${c.id})" style="width:auto;">📝 Tư Vấn</button>
        <button class="btn btn-primary" onclick="saveOrderItems(${c.id})" style="width:auto;">💾 Lưu Đơn</button>
        <button class="btn" onclick="requestCancel(${c.id})" style="width:auto;background:var(--danger);color:white;">❌ Hủy KH</button>
    `;

    openModal(`📋 ${c.customer_name} — ${getCustomerCode(c)}`, bodyHTML, footerHTML);

    setTimeout(() => {
        document.querySelectorAll('.oi-qty, .oi-price').forEach(el => el.addEventListener('input', calcOrderTotal));
    }, 100);
}

function switchConsultTab(tab, btn) {
    document.getElementById('tabInfo').style.display = tab === 'info' ? 'block' : 'none';
    document.getElementById('tabHistory').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('tabOrder').style.display = tab === 'order' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ========== UPDATE APPOINTMENT ==========
async function updateAppointment(customerId, date) {
    const data = await apiCall(`/api/customers/${customerId}/appointment`, 'PUT', { appointment_date: date });
    if (data.success) showToast('📅 Đã cập nhật ngày hẹn!');
}

// ========== REFERRER SEARCH ==========
let _allReferrerCustomers = [];
async function openReferrerSearch(customerId) {
    const bodyHTML = `
        <div class="form-group">
            <label>Tìm Người Giới Thiệu (tên hoặc SĐT)</label>
            <input type="text" id="referrerSearchInput" class="form-control" placeholder="Nhập tên hoặc SĐT để lọc..." oninput="filterReferrerList(${customerId})">
        </div>
        <div id="referrerSearchResults" style="max-height:350px;overflow-y:auto;">
            <p style="color:var(--gray-400);text-align:center;padding:20px;">Đang tải...</p>
        </div>
    `;
    openModal('🔍 Tìm Người Giới Thiệu', bodyHTML, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);

    // Load all referrer-eligible customers (CTV, Hoa Hồng, Sinh Viên, Nuôi Dưỡng)
    try {
        const data = await apiCall('/api/customers/referrer-search?q=&all=1');
        _allReferrerCustomers = data.customers || [];
        renderReferrerList(customerId, _allReferrerCustomers);
    } catch(e) {
        document.getElementById('referrerSearchResults').innerHTML = '<p style="color:var(--danger);text-align:center;">Lỗi tải dữ liệu</p>';
    }
    setTimeout(() => document.getElementById('referrerSearchInput')?.focus(), 200);
}

function filterReferrerList(customerId) {
    const q = (document.getElementById('referrerSearchInput')?.value || '').toLowerCase().trim();
    const filtered = q ? _allReferrerCustomers.filter(c =>
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
    ) : _allReferrerCustomers;
    renderReferrerList(customerId, filtered);
}

function renderReferrerList(customerId, customers) {
    const results = document.getElementById('referrerSearchResults');
    if (!results) return;
    if (customers.length === 0) {
        results.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:20px;">Không tìm thấy</p>';
        return;
    }
    const CRM_TYPE_COLORS = { 'ctv': '#10b981', 'hoa_hong': '#f59e0b', 'sinh_vien': '#3b82f6', 'nuoi_duong': '#8b5cf6' };
    results.innerHTML = customers.map(c => {
        const typeLabel = CRM_LABELS[c.crm_type] || c.crm_type;
        const typeColor = CRM_TYPE_COLORS[c.crm_type] || '#6b7280';
        return `
            <div onclick="selectReferrer(${customerId}, ${c.id})" 
                style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;"
                onmouseover="this.style.borderColor='#fad24c';this.style.background='#fefce8'" onmouseout="this.style.borderColor='#e5e7eb';this.style.background='white'">
                <div>
                    <div style="font-weight:600;color:#122546;">${c.customer_name}</div>
                    <div style="font-size:12px;color:#6b7280;">${c.phone || '—'}</div>
                </div>
                <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${typeColor}20;color:${typeColor};font-weight:600;">${typeLabel}</span>
            </div>
        `;
    }).join('');
}

async function selectReferrer(customerId, referrerCustomerId) {
    const data = await apiCall(`/api/customers/${customerId}/referrer`, 'PUT', { referrer_customer_id: referrerCustomerId });
    if (data.success) {
        showToast('✅ Đã chọn người giới thiệu: ' + data.referrer_name);
        closeModal();
        loadCrmNhuCauData();
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

// ========== CẬP NHẬT THÔNG TIN KHÁCH HÀNG ==========
// ========== DANH SÁCH TỈNH/THÀNH PHỐ ==========
const PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre',
    'Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng',
    'Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai',
    'Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang',
    'Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng',
    'Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận',
    'Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa',
    'Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang',
    'Vĩnh Long','Vĩnh Phúc','Yên Bái'
];

async function openCustomerInfo(customerId) {
    const data = await apiCall(`/api/customers/${customerId}`);
    const c = data.customer || {};
    let holidays = [];
    try { holidays = JSON.parse(c.customer_holidays || '[]'); } catch(e) {}

    // Convert birthday from various formats to day and month
    let bdDay = '', bdMonth = '';
    if (c.birthday) {
        if (c.birthday.includes('-')) {
            const parts = c.birthday.split('-');
            bdMonth = parseInt(parts[1]) || '';
            bdDay = parseInt(parts[2]) || '';
        } else if (c.birthday.includes('/')) {
            const parts = c.birthday.split('/');
            bdDay = parseInt(parts[0]) || '';
            bdMonth = parseInt(parts[1]) || '';
        }
    }

    // Generate day and month options
    let dayOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dayOpts += `<option value="${d}" ${d == bdDay ? 'selected' : ''}>${d}</option>`;
    let monthOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) monthOpts += `<option value="${m}" ${m == bdMonth ? 'selected' : ''}>Tháng ${m}</option>`;

    const provinceOptions = PROVINCES.map(p => 
        `<option value="${p}" ${c.province === p ? 'selected' : ''}>${p}</option>`
    ).join('');

    // Helper: generate holiday day/month selects
    function holidayDateSelects(dateStr) {
        let hDay = '', hMonth = '';
        if (dateStr) {
            if (dateStr.includes('/')) { const p = dateStr.split('/'); hDay = parseInt(p[0])||''; hMonth = parseInt(p[1])||''; }
            else if (dateStr.includes('-')) { const p = dateStr.split('-'); hMonth = parseInt(p[1])||''; hDay = parseInt(p[2])||''; }
        }
        let dOpts = '<option value="">Ngày</option>';
        for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}" ${d == hDay ? 'selected' : ''}>${d}</option>`;
        let mOpts = '<option value="">Tháng</option>';
        for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}" ${m == hMonth ? 'selected' : ''}>T${m}</option>`;
        return `<select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
                <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>`;
    }

    const bodyHTML = `
        <div class="form-group">
            <label>Tên Khách Hàng</label>
            <input type="text" id="ciName" class="form-control" value="${c.customer_name || ''}">
        </div>
        <div class="form-group">
            <label>Số Điện Thoại</label>
            <input type="text" id="ciPhone" class="form-control" value="${c.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
                <label>Địa Chỉ</label>
                <input type="text" id="ciAddress" class="form-control" value="${c.address || ''}">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành Phố</label>
                <select id="ciProvince" class="form-control">
                    <option value="">-- Chọn --</option>
                    ${provinceOptions}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Công Việc</label>
            <input type="text" id="ciJob" class="form-control" value="${c.job || ''}" placeholder="VD: Giám đốc công ty ABC">
        </div>
        <div class="form-group">
            <label>Ngày Sinh Nhật</label>
            <div style="display:flex;gap:8px;">
                <select id="ciBdDay" class="form-control" style="width:80px;">${dayOpts}</select>
                <select id="ciBdMonth" class="form-control" style="width:120px;">${monthOpts}</select>
            </div>
        </div>
        <div class="form-group">
            <label>Ngày Lễ Của KH</label>
            <div id="ciHolidays">
                ${holidays.length > 0 ? holidays.map((h, i) => `
                    <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
                        <input type="text" class="form-control ci-hname" value="${h.name || ''}" placeholder="Tên ngày lễ" style="flex:1;font-size:13px;">
                        ${holidayDateSelects(h.date)}
                        <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">✕</button>
                    </div>
                `).join('') : ''}
            </div>
            <button class="btn btn-sm" onclick="addHolidayRow()" style="font-size:12px;margin-top:6px;">➕ Thêm ngày lễ</button>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="saveCustomerInfo(${customerId})" style="width:auto;">💾 LƯU</button>
    `;

    openModal('✏️ Cập Nhật Thông Tin KH', bodyHTML, footerHTML);
}

function addHolidayRow() {
    let dOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}">${d}</option>`;
    let mOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}">T${m}</option>`;
    const container = document.getElementById('ciHolidays');
    container.insertAdjacentHTML('beforeend', `
        <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
            <input type="text" class="form-control ci-hname" value="" placeholder="Tên ngày lễ" style="flex:1;font-size:13px;">
            <select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
            <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>
            <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">✕</button>
        </div>
    `);
}

async function saveCustomerInfo(customerId) {
    const customer_name = document.getElementById('ciName').value;
    const phone = document.getElementById('ciPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }
    const address = document.getElementById('ciAddress').value;
    const province = document.getElementById('ciProvince').value;
    const job = document.getElementById('ciJob').value;

    // Read birthday from day/month selects
    const bdDay = document.getElementById('ciBdDay')?.value;
    const bdMonth = document.getElementById('ciBdMonth')?.value;
    const birthday = (bdDay && bdMonth) ? `${bdDay}/${bdMonth}` : '';

    // Collect holidays from day/month selects
    const holidayRows = document.querySelectorAll('#ciHolidays .ci-holiday-row');
    const customer_holidays = [];
    holidayRows.forEach(row => {
        const name = row.querySelector('.ci-hname')?.value;
        const hDay = row.querySelector('.ci-hday')?.value;
        const hMonth = row.querySelector('.ci-hmonth')?.value;
        const date = (hDay && hMonth) ? `${hDay}/${hMonth}` : '';
        if (name || date) customer_holidays.push({ name: name || '', date });
    });

    if (!customer_name) { showToast('Tên KH không được trống!', 'error'); return; }

    try {
        const data = await apiCall(`/api/customers/${customerId}/info`, 'PUT', {
            customer_name, phone, address, province, job, birthday, customer_holidays
        });
        if (data.success) {
            showToast('✅ ' + data.message);
            closeModal();
            loadCrmNhuCauData();
        } else {
            showToast(data.error || 'Lỗi!', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối!', 'error');
    }
}

// ========== CHI TIẾT KHÁCH HÀNG ==========
async function openCustomerDetail(customerId) {
    // Load all customer data in parallel
    const [data, logsData, orderData, orderCodesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult-logs`),
        apiCall(`/api/customers/${customerId}/orders`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    const c = data.customer || {};
    const items = data.items || [];
    let holidays = [];
    try { holidays = JSON.parse(c.customer_holidays || '[]'); } catch(e) {}

    const createdDate = c.created_at ? new Date(c.created_at) : null;
    const connectDays = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / 86400000) : 0;

    const logs = logsData.logs || [];

    const orders = orderData.items || [];
    const grandTotal = orders.reduce((s, i) => s + (i.total || 0), 0);

    const orderCodes = orderCodesData.codes || [];
    const cdTotalDeposit = orderCodesData.total_deposit || 0;

    const lastLogPopup = logs.length > 0 ? logs[0] : null;
    const lastConsultTypePopup = lastLogPopup ? CONSULT_TYPES[lastLogPopup.log_type] : null;
    const statusBadge = getStatusBadge ? getStatusBadge(c.order_status) : c.order_status;
    const initials = (c.customer_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

    const infoTab = `
        <div style="margin:-12px -12px 0;font-family:'Segoe UI',system-ui,sans-serif;">
            <!-- CUSTOMER HEADER -->
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:22px 22px 18px;border-radius:10px;position:relative;overflow:hidden;margin-bottom:14px;">
                <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(250,210,76,0.06);border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
                    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f172a;box-shadow:0 3px 12px rgba(250,210,76,0.35);flex-shrink:0;">
                        ${initials}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:3px;">${c.customer_name}</div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:13px;color:#fad24c;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;background:rgba(250,210,76,0.12);padding:2px 8px;border-radius:6px;">${getCustomerCode(c)}</span>
                            ${(c.cancel_requested === 1 && c.cancel_approved === 0)
                                ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:var(--gray-700);color:var(--gray-400);">⏳ Chờ Duyệt Hủy</span>`
                                : (c.cancel_approved === -1)
                                    ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:#f59e0b;color:white;">🔄 Tư Vấn Lại</span>`
                                    : lastConsultTypePopup
                                        ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:${lastConsultTypePopup.color || 'var(--gray-600)'};color:${lastConsultTypePopup.textColor || 'white'};">${lastConsultTypePopup.icon} ${lastConsultTypePopup.label}</span>`
                                        : `<span style="font-size:12px;">${statusBadge}</span>`
                            }
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:22px;font-weight:800;color:#fad24c;">${logs.length}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">LẦN CHĂM</div>
                    </div>
                </div>
            </div>

            <!-- INFO GRID -->
            <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📞 SĐT</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;"><a href="tel:${c.phone}" style="color:#3b82f6;text-decoration:none;">${c.phone}</a></div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏠 Địa chỉ</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.address || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📍 Tỉnh/TP</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.province || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🎂 Sinh nhật</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.birthday || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📡 Nguồn</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.source_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">💼 Công việc</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.job || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">👤 NV phụ trách</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.assigned_to_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📅 Kết nối từ</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${createdDate ? formatDateTime(c.created_at) : '—'}</div>
                    </div>
                </div>
            </div>
            ${(c.referrer_name || c.referrer_customer_name) ? `
                <div style="margin-top:10px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:8px;border:1px solid #bfdbfe;font-size:13px;">
                    <strong style="color:#1e40af;">🤝 Người GT:</strong> 
                    <span style="cursor:pointer;text-decoration:underline;color:#3b82f6;font-weight:600;" onclick="openAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>
                    ${(c.referrer_user_crm_type || c.referrer_crm_type) ? ` · <span style="color:#64748b;">${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</span>` : ''}
                </div>
            ` : ''}
        </div>
        ${holidays.length > 0 ? '<div style="margin-top:8px;font-size:12px;"><strong>Ngày lễ:</strong> ' + holidays.map(h => h.name + ' (' + h.date + ')').join(', ') + '</div>' : ''}
    `;

    // Tab: Lịch Sử (grouped by month)
    const historyTab = `
        <div style="max-height:350px;overflow-y:auto;">
            ${buildGroupedHistoryHTML(logs)}
        </div>
    `;

    // Tab: Đơn Hàng (using shared helper)
    const orderTab = buildOrderCardHTML(orderCodes, orders, c, cdTotalDeposit);

    const bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <span class="cdtab-btn" onclick="switchCDTab('info')" id="cdtab-info-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:var(--gold);color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📋 Thông Tin</span>
            <span class="cdtab-btn" onclick="switchCDTab('history')" id="cdtab-history-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📝 Lịch Sử (${logs.length})</span>
            <span class="cdtab-btn" onclick="switchCDTab('orders')" id="cdtab-orders-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">🛒 Đơn Hàng</span>
        </div>
        <div id="cdtab-info">${infoTab}</div>
        <div id="cdtab-history" style="display:none;">${historyTab}</div>
        <div id="cdtab-orders" style="display:none;">${orderTab}</div>
    `;

    // Determine last consultation type for button label
    const lastLog = logs.length > 0 ? logs[0] : null;
    const lastConsultType = lastLog ? CONSULT_TYPES[lastLog.log_type] : null;
    const consultBtnLabel = lastConsultType ? `${lastConsultType.icon} ${lastConsultType.label}` : '📝 TƯ VẤN';
    const consultBtnColor = lastConsultType ? lastConsultType.color : '';

    const consultBtnTextColor = lastConsultType?.textColor || 'white';

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        ${!c.cancel_requested && !c.cancel_approved ? `
            <button class="btn btn-primary" onclick="closeModal();openConsultModal(${customerId});" style="width:auto;${consultBtnColor ? 'background:' + consultBtnColor + ';color:' + consultBtnTextColor + ';' : ''}">${consultBtnLabel}</button>
        ` : ''}
    `;

    openModal(``, bodyHTML, footerHTML);
}

function switchCDTab(tab) {
    const activeStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#fad24c;color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    const inactiveStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    ['info','history','orders'].forEach(t => {
        const el = document.getElementById('cdtab-' + t);
        const btn = document.getElementById('cdtab-' + t + '-btn');
        if (el) el.style.display = t === tab ? 'block' : 'none';
        if (btn) btn.style.cssText = t === tab ? activeStyle : inactiveStyle;
    });
}

// ========== AFFILIATE DETAIL POPUP ==========
const CRM_LABELS_AFF = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', tu_tim_kiem: 'CRM Tự Tìm Kiếm', goi_hop_tac: 'CRM Gọi Điện Hợp Tác', goi_ban_hang: 'CRM Gọi Điện Bán Hàng', koc_tiktok: 'CRM KOL/KOC Tiktok' };
const ROLE_LABELS_AFF = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', part_time:'Part Time', hoa_hong:'Hoa Hồng', ctv:'CTV', nuoi_duong:'Nuôi Dưỡng', sinh_vien:'Sinh Viên', tkaffiliate:'TK Affiliate' };

async function openAffiliateDetail(userId) {
    if (!userId) return;
    try {
        const [userData, countData] = await Promise.all([
            apiCall(`/api/users/${userId}`),
            apiCall(`/api/customers?referrer_id_count=${userId}`)
        ]);
        const u = userData.user;
        if (!u) { showToast('Không tìm thấy tài khoản', 'error'); return; }

        const totalReferrals = countData.totalReferrals || 0;
        const createdAt = u.created_at ? new Date(u.created_at) : null;
        const daysCooperation = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : 0;
        const isGD = currentUser.role === 'giam_doc';
        const isLocked = u.status === 'locked';
        const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

        const statusColor = isLocked ? '#ef4444' : '#22c55e';
        const statusText = isLocked ? '🔒 Đã dừng hợp tác' : '✅ Đang hợp tác';
        const statusBg = isLocked ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)';

        const bodyHTML = `
            <div style="margin:-20px -24px -10px;font-family:'Segoe UI',system-ui,sans-serif;">
                <!-- HEADER -->
                <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:28px 28px 22px;border-radius:12px 12px 0 0;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(250,210,76,0.08);border-radius:50%;"></div>
                    <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;background:rgba(59,130,246,0.08);border-radius:50%;"></div>
                    <div style="display:flex;align-items:center;gap:18px;position:relative;z-index:1;">
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0f172a;box-shadow:0 4px 14px rgba(250,210,76,0.4);flex-shrink:0;">
                            ${initials}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;text-shadow:0 1px 3px rgba(0,0,0,0.3);">${u.full_name}</div>
                            <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;">@${u.username}</div>
                            <div style="display:inline-flex;align-items:center;gap:6px;background:${statusBg};border:1px solid ${statusColor};color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">
                                <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block;${isLocked ? '' : 'animation:pulse-dot 2s infinite;'}"></span>
                                ${statusText}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STAT CARDS -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:18px 24px 14px;">
                    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:14px;text-align:center;border:1px solid #bfdbfe;">
                        <div style="font-size:28px;font-weight:800;color:#1e40af;line-height:1;">${totalReferrals}</div>
                        <div style="font-size:11px;color:#3b82f6;font-weight:600;margin-top:4px;">Người giới thiệu</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fefce8,#fef3c7);border-radius:12px;padding:14px;text-align:center;border:1px solid #fde68a;">
                        <div style="font-size:28px;font-weight:800;color:#92400e;line-height:1;">${daysCooperation}</div>
                        <div style="font-size:11px;color:#d97706;font-weight:600;margin-top:4px;">Ngày hợp tác</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:14px;text-align:center;border:1px solid #bbf7d0;">
                        <div style="font-size:14px;font-weight:800;color:#166534;line-height:1.2;">${createdAt ? createdAt.toLocaleDateString('vi-VN') : '—'}</div>
                        <div style="font-size:11px;color:#16a34a;font-weight:600;margin-top:4px;">Ngày bắt đầu</div>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="padding:6px 24px 20px;">
                    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📞 Số điện thoại</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.phone || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📋 Loại CRM</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${CRM_LABELS_AFF[u.source_crm_type] || u.source_crm_type || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">👨‍💼 NV Quản lý</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.manager_name || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🏷️ Vai trò</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${ROLE_LABELS_AFF[u.role] || u.role}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
            </style>
        `;

        let footerHTML = '';
        if (isGD) {
            if (isLocked) {
                footerHTML += `<button class="btn" onclick="toggleAffiliateStatus(${u.id}, 'active')" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(34,197,94,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">▶️ Tiếp tục hợp tác</button>`;
            } else {
                footerHTML += `<button class="btn" onclick="toggleAffiliateStatus(${u.id}, 'locked')" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(239,68,68,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">⏸️ Dừng hợp tác</button>`;
            }
            footerHTML += `<button class="btn" onclick="openEditAffiliateFromCrm(${u.id})" style="background:linear-gradient(135deg,#fad24c,#f59e0b);color:#0f172a;padding:10px 22px;border-radius:10px;font-weight:600;border:none;box-shadow:0 2px 8px rgba(250,210,76,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">✏️ Sửa tài khoản</button>`;
        }

        openModal(``, bodyHTML, footerHTML);
    } catch (err) {
        console.error('Affiliate detail error:', err);
        showToast('Lỗi tải thông tin affiliate', 'error');
    }
}

async function toggleAffiliateStatus(userId, newStatus) {
    try {
        const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: newStatus });
        if (data.success) {
            showToast(`✅ ${data.message}`);
            closeModal();
            // Re-open to refresh data
            openAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật trạng thái', 'error');
    }
}

async function openEditAffiliateFromCrm(userId) {
    try {
        const userData = await apiCall(`/api/users/${userId}`);
        const u = userData.user;
        if (!u) { showToast('Không tìm thấy tài khoản', 'error'); return; }

        const bodyHTML = `
            <form id="editAffCrmForm" style="max-width:500px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div class="form-group">
                        <label>Họ tên</label>
                        <input type="text" id="eafFullName" class="form-control" value="${u.full_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>SĐT</label>
                        <input type="text" id="eafPhone" class="form-control" value="${u.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Địa chỉ</label>
                        <input type="text" id="eafAddress" class="form-control" value="${u.address || ''}">
                    </div>
                    <div class="form-group">
                        <label>Tỉnh/TP</label>
                        <input type="text" id="eafProvince" class="form-control" value="${u.province || ''}">
                    </div>
                    <div class="form-group">
                        <label>Ngân hàng</label>
                        <input type="text" id="eafBankName" class="form-control" value="${u.bank_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Số TK</label>
                        <input type="text" id="eafBankAccount" class="form-control" value="${u.bank_account || ''}">
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label>Chủ TK</label>
                        <input type="text" id="eafBankHolder" class="form-control" value="${u.bank_holder || ''}">
                    </div>
                </div>
            </form>
        `;

        const footerHTML = `<button class="btn" onclick="submitEditAffFromCrm(${u.id})" style="background:var(--gold);color:#122546;padding:8px 24px;border-radius:8px;font-weight:600;">💾 Lưu thay đổi</button>`;

        openModal(`✏️ Sửa TK Affiliate: ${u.full_name}`, bodyHTML, footerHTML);
    } catch (err) {
        showToast('Lỗi tải thông tin', 'error');
    }
}

async function submitEditAffFromCrm(userId) {
    const body = {
        full_name: document.getElementById('eafFullName').value,
        phone: document.getElementById('eafPhone').value,
        address: document.getElementById('eafAddress').value,
        province: document.getElementById('eafProvince').value,
        bank_name: document.getElementById('eafBankName').value,
        bank_account: document.getElementById('eafBankAccount').value,
        bank_holder: document.getElementById('eafBankHolder').value,
        sync_source: true
    };

    if (body.phone && !/^\d{10}$/.test(body.phone)) {
        showToast('SĐT phải đúng 10 chữ số', 'error');
        return;
    }

    try {
        const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
        if (data.success) {
            showToast('✅ Cập nhật thành công!');
            closeModal();
            openAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật', 'error');
    }
}
