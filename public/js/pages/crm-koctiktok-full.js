// ========== CRM KOL/KOC Tiktok C?U — 14-column layout with consultation system ==========

// Format deposit input with thousand separators (500000 ? 500.000)
function _kocFormatDepositInput(el) {
    const cursor = el.selectionStart;
    const oldLen = el.value.length;
    const raw = el.value.replace(/\D/g, '');
    el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const newLen = el.value.length;
    const newCursor = cursor + (newLen - oldLen);
    el.setSelectionRange(newCursor, newCursor);
}

const KOC_VN_PROVINCES = [
    'An Giang','Bà R?a - Vung Tàu','B?c Giang','B?c K?n','B?c Liêu','B?c Ninh','B?n Tre','Bình Ð?nh','Bình Duong',
    'Bình Phu?c','Bình Thu?n','Cà Mau','C?n Tho','Cao B?ng','Ðà N?ng','Ð?k L?k','Ð?k Nông','Ði?n Biên','Ð?ng Nai',
    'Ð?ng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà N?i','Hà Tinh','H?i Duong','H?i Phòng','H?u Giang','Hòa Bình',
    'Hung Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Ð?ng','L?ng Son','Lào Cai','Long An','Nam Ð?nh',
    'Ngh? An','Ninh Bình','Ninh Thu?n','Phú Th?','Phú Yên','Qu?ng Bình','Qu?ng Nam','Qu?ng Ngãi','Qu?ng Ninh','Qu?ng Tr?',
    'Sóc Trang','Son La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Th?a Thiên Hu?','Ti?n Giang','TP. H? Chí Minh',
    'Trà Vinh','Tuyên Quang','Vinh Long','Vinh Phúc','Yên Bái'
];
// Birthday countdown helper: returns { html, class } based on days until birthday
function _kocGetBirthdayDisplay(birthdayStr) {
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
        return { html: `<span class="bday-today">?? ${dateStr} <b>HÔM NAY!</b></span>`, tdClass: 'bday-cell-today' };
    } else if (daysUntil === 1) {
        return { html: `<span class="bday-urgent">???? ${dateStr} <b>NGÀY MAI</b></span>`, tdClass: 'bday-cell-1' };
    } else if (daysUntil === 2) {
        return { html: `<span class="bday-urgent">???? ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-2' };
    } else if (daysUntil === 3) {
        return { html: `<span class="bday-warn">?? ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-3' };
    } else if (daysUntil <= 5) {
        return { html: `<span class="bday-near">?? ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-5' };
    } else if (daysUntil <= 7) {
        return { html: `<span class="bday-soon">?? ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-7' };
    }
    return { html: dateStr, tdClass: '' };
}

// Check if today is the customer's birthday (day+month match, ignore year)
function _kocIsBirthdayToday(birthdayStr) {
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

let KOC_CONSULT_TYPES = {
    lam_quen_tuong_tac: { label: 'Làm Quen Tuong Tác', icon: '??', color: '#14b8a6' },
    goi_dien: { label: 'G?i Ði?n', icon: '??', color: '#3b82f6' },
    nhan_tin: { label: 'Nh?n Tin', icon: '??', color: '#8b5cf6' },
    tuong_tac_ket_noi: { label: 'Tuong Tác K?t N?i L?i', icon: '??', color: '#6366f1' },
    gap_truc_tiep: { label: 'G?p Tr?c Ti?p', icon: '??', color: '#10b981' },
    gui_bao_gia: { label: 'G?i Báo Giá', icon: '??', color: '#f59e0b' },
    gui_mau: { label: 'G?i M?u V?i/Áo', icon: '??', color: '#ec4899' },
    thiet_ke: { label: 'Thi?t K?', icon: '??', color: '#6366f1' },
    bao_sua: { label: 'S?a Thi?t K?', icon: '??', color: '#ef4444' },
    gui_stk_coc: { label: 'G?i STK C?c', icon: '??', color: '#f59e0b' },
    giuc_coc: { label: 'Gi?c C?c', icon: '?', color: '#ea580c' },
    dat_coc: { label: 'Ð?t C?c', icon: '??', color: '#f97316' },
    chot_don: { label: 'Ch?t Ðon', icon: '?', color: '#22c55e' },
    dang_san_xuat: { label: 'Ðang S?n Xu?t', icon: '??', color: '#8b5cf6' },
    hoan_thanh: { label: 'Hoàn Thành Ðon', icon: '??', color: '#0d9488', textColor: 'white' },
    sau_ban_hang: { label: 'Cham Sóc Sau Bán', icon: '??', color: '#0ea5e9' },
    cap_cuu_sep: { label: 'C?p C?u S?p', icon: '??', color: '#ef4444' },
    huy_coc: { label: 'H?y C?c', icon: '??', color: '#dc2626' },
    hoan_thanh_cap_cuu: { label: 'Hoàn Thành C?p C?u', icon: '??', color: '#122546', textColor: '#fad24c' },
    huy: { label: 'H?y Khách', icon: '?', color: '#dc2626' },
    giam_gia: { label: 'Gi?m Giá', icon: '??', color: '#e11d48' },
    tu_van_lai: { label: 'Tu V?n L?i', icon: '??', color: '#0891b2' },
    gui_ct_kh_cu: { label: 'G?i Chuong Trình KH Cu', icon: '???', color: '#7c3aed' },
};

// Merge dynamic types from consult_type_configs API into KOC_CONSULT_TYPES
async function _kocSyncConsultTypes() {
    try {
        const data = await apiCall('/api/consult-types?crm_menu=koc_tiktok');
        if (data.types && Array.isArray(data.types)) {
            for (const t of data.types) {
                if (!t.key || !t.is_active) continue;
                // Add or update (API types override defaults)
                KOC_CONSULT_TYPES[t.key] = {
                    label: t.label || t.key,
                    icon: t.icon || '??',
                    color: t.color || '#6b7280',
                    textColor: t.text_color || 'white',
                    maxAppointmentDays: t.max_appointment_days || 0
                };
            }
        }
    } catch(e) { /* silent — fallback to hardcoded */ }
}

async function renderCRMKocPage(container) {
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
            <a href="/quytacnuttuvancrmkoctiktok" onclick="event.preventDefault();navigate('quytacnuttuvancrmkoctiktok')"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;
                border:2px solid #f97316;color:#f97316;font-size:13px;font-weight:800;cursor:pointer;
                background:rgba(249,115,22,.08);text-decoration:none;transition:all .2s;"
                onmouseover="this.style.background='rgba(249,115,22,.18)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.background='rgba(249,115,22,.08)';this.style.transform=''">
                ?? Quy T?c Nút Tu V?n
            </a>
        </div>
        <div class="crm-stat-cards" id="crmStatCards">
            <div class="crm-stat-card" data-cat="phai_xu_ly" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;" onclick="_kocFilterByCat('phai_xu_ly')">
                <div class="stat-icon">??</div>
                <div class="stat-count" id="crmStatPhaiXuLy">0</div>
                <div class="stat-label">Ph?i x? lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="da_xu_ly" style="background:linear-gradient(135deg,#10b981,#059669);color:white;" onclick="_kocFilterByCat('da_xu_ly')">
                <div class="stat-icon">?</div>
                <div class="stat-count" id="crmStatDaXuLy">0</div>
                <div class="stat-label">Ðã x? lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="xu_ly_tre" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;" onclick="_kocFilterByCat('xu_ly_tre')">
                <div class="stat-icon">??</div>
                <div class="stat-count" id="crmStatXuLyTre">0</div>
                <div class="stat-label">Khách x? lý tr?</div>
            </div>
            <div class="crm-stat-card" data-cat="cho_xu_ly" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="_kocFilterByCat('cho_xu_ly')">
                <div class="stat-icon">?</div>
                <div class="stat-count" id="crmStatChoXuLy">0</div>
                <div class="stat-label">Ch? x? lý</div>
            </div>
            <div class="crm-stat-card" data-cat="huy_khach" style="background:linear-gradient(135deg,#6b7280,#4b5563);color:white;" onclick="_kocFilterByCat('huy_khach')">
                <div class="stat-icon">??</div>
                <div class="stat-count" id="crmStatHuyKhach">0</div>
                <div class="stat-label">H?y khách</div>
            </div>
        </div>
        <div class="crm-date-filter" id="crmDateFilter">
            <span class="df-label" id="crmDateFilterLabel">?? L?c theo:</span>
            <label>Ngày</label>
            <select id="crmDateDay" onchange="_kocUpdateDateFilterCounts();_kocRenderFilteredTable()">
                <option value="">T?t C?</option>
                ${(() => { let o = ''; for (let d = 1; d <= 31; d++) o += '<option value="' + d + '">Ngày ' + d + '</option>'; return o; })()}
            </select>
            <label>Tháng</label>
            <select id="crmDateMonth" onchange="_kocUpdateDateFilterCounts();_kocRenderFilteredTable()">
                <option value="" selected>T?t C?</option>
                ${(() => { let o = ''; for (let m = 1; m <= 12; m++) o += '<option value="' + m + '">Tháng ' + m + '</option>'; return o; })()}
            </select>
            <label>Nam</label>
            <select id="crmDateYear" onchange="_kocUpdateDateFilterCounts();_kocRenderFilteredTable()">
                ${(() => { const now = new Date(); let o = ''; for (let y = 2024; y <= now.getFullYear()+1; y++) o += '<option value="' + y + '"' + (y === now.getFullYear() ? ' selected' : '') + '>' + y + '</option>'; return o; })()}
            </select>
            <span id="crmDateFilterCount" style="color:#94a3b8;font-size:12px;margin-left:auto;"></span>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <select id="crmFilterConsultType" class="form-control" style="width:auto;min-width:200px;" onchange="_kocRenderFilteredTable()">
                <option value="">T?t c? tr?ng thái</option>
            </select>
            <input type="text" id="crmSearch" class="form-control" placeholder="?? Tìm tên ho?c SÐT..." style="width:auto;min-width:200px;">
            ${['giam_doc','quan_ly','truong_phong'].includes(currentUser.role) ? '<select id="crmTopStaffFilter" class="form-control" style="width:auto;min-width:180px;"><option value="">?? T?t c? NV</option>' + topStaffOptions + '</select>' : ''}
        </div>
        <div class="card">
            <div class="card-body" style="overflow-x:auto; padding:8px;">
                <table class="table crm-ctv-table" id="crmCtvTable">
                    <thead><tr>
                        <th style="min-width:30px;text-align:center;padding:4px 2px" title="Pin khách">??</th>
                        <th style="min-width:45px;text-align:center">STT</th>
                        <th style="min-width:100px">NV Ph? Trách</th>
                        <th style="min-width:80px">Mã Ðon</th>
                        <th style="min-width:120px">Nút Tu V?n</th>
                        <th style="min-width:160px">N?i Dung TV</th>
                        <th style="min-width:70px;text-align:center">L?n Cham</th>
                        <th style="min-width:140px">Ngày H?n</th>
                        <th style="min-width:80px">Mã KH</th>
                        <th style="min-width:150px">Tên KH</th>
                        <th style="min-width:110px">SÐT</th>
                        <th style="min-width:110px">Link FB</th>
                        <th style="min-width:130px">Ð?a Ch?</th>
                        <th style="min-width:100px">Ngu?n</th>
                        <th style="min-width:120px">Ngu?i GT</th>
                        <th style="min-width:110px">CRM Ngu?i GT</th>
                        <th style="min-width:100px">Ch?c Danh</th>
                        <th style="min-width:70px;text-align:center">L?n Ð?t</th>
                        <th style="min-width:110px;text-align:right">Doanh S?</th>
                    </tr></thead>
                    <tbody id="crmCtvTbody"><tr><td colspan="18" style="text-align:center;padding:40px;">? Ðang t?i...</td></tr></tbody>
                </table>
                <div id="crmPagination" class="crm-pagination"></div>
            </div>
        </div>
    `;

    document.getElementById('crmFilterConsultType').addEventListener('change', () => _kocRenderFilteredTable());
    const topStaffEl = document.getElementById('crmTopStaffFilter');
    if (topStaffEl) topStaffEl.addEventListener('change', () => loadCrmKocData());
    let st;
    document.getElementById('crmSearch').addEventListener('input', () => { clearTimeout(st); st = setTimeout(loadCrmKocData, 400); });

    await loadCrmKocData();

    // Auto-select 'Ph?i x? lý hôm nay' on page load
    _kocActiveCat = null;
    _kocFilterByCat('phai_xu_ly');
}

var _kocActiveCat = null; // null = all, or 'phai_xu_ly'|'moi_chuyen'|'da_xu_ly'|'cho_xu_ly'|'huy_khach'
var _kocAllCustomers = []; // full list for re-filtering
var _kocAllStats = {}; // consult stats
var _kocCurrentPage = 1;
var _kocPageSize = 50;

function _kocFilterByCat(cat) {
    if (_kocActiveCat === cat) { _kocActiveCat = null; } else { _kocActiveCat = cat; }
    _kocCurrentPage = 1; // reset page on category change
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    const cardsContainer = document.getElementById('crmStatCards');
    if (_kocActiveCat) {
        const el = document.querySelector('.crm-stat-card[data-cat="' + _kocActiveCat + '"]');
        if (el) el.classList.add('active');
        if (cardsContainer) cardsContainer.classList.add('has-active');
    } else {
        if (cardsContainer) cardsContainer.classList.remove('has-active');
    }
    // Show/hide date filter for cho_xu_ly and huy_khach
    const dateFilter = document.getElementById('crmDateFilter');
    const dateLabel = document.getElementById('crmDateFilterLabel');
    // Reset date filter to defaults (T?t C?) when switching cards
    const ms = document.getElementById('crmDateMonth');
    const ys = document.getElementById('crmDateYear');
    const ds = document.getElementById('crmDateDay');
    if (ms) { ms.value = ''; }
    if (ys) { ys.value = new Date().getFullYear(); }
    if (ds) { ds.value = ''; }
    if (dateFilter) {
        if (_kocActiveCat === 'cho_xu_ly') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '?? L?c theo ngày h?n:';
            _kocUpdateDateFilterCounts();
        } else if (_kocActiveCat === 'huy_khach') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '?? L?c theo ngày h?y:';
            _kocUpdateDateFilterCounts();
        } else if (_kocActiveCat === 'xu_ly_tre') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '?? L?c theo ngày h?n tr?:';
            _kocUpdateDateFilterCounts();
        } else {
            dateFilter.classList.remove('visible');
        }
    }
    _kocUpdateConsultTypeDropdown();
    _kocRenderFilteredTable();
}

function _kocUpdateDateFilterCounts() {
    const cat = _kocActiveCat;
    if (cat !== 'cho_xu_ly' && cat !== 'huy_khach' && cat !== 'xu_ly_tre') return;
    const catCustomers = _kocAllCustomers.filter(c => _kocGetCategory(c, _kocAllStats) === cat);

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

    // Calculate total for 'T?t C?' options
    const totalCat = catCustomers.length;
    let totalInYear = 0;

    for (const opt of monthSel.options) {
        if (!opt.value) { opt.textContent = 'T?t C?' + (totalCat > 0 ? ' (' + totalCat + ')' : ''); continue; }
        const m = parseInt(opt.value);
        const cnt = monthYearCounts[m + '_' + selYear] || 0;
        opt.textContent = 'Tháng ' + m + (cnt > 0 ? ' (' + cnt + ')' : '');
        totalInYear += cnt;
    }
    for (const opt of yearSel.options) {
        if (!opt.value) { opt.textContent = 'T?t C?'; continue; }
        const y = parseInt(opt.value);
        const cnt = yearCounts[y] || 0;
        opt.textContent = y + (cnt > 0 ? ' (' + cnt + ')' : '');
    }
}


function _kocGetCategory(c, stats) {
    // Priority 0.5: Ch? Duy?t H?y (NV dã ?n h?y, ch? s?p)
    if (c.cancel_requested === 1 && c.cancel_approved === 0) return 'da_xu_ly';

    // Priority 1: H?y khách (s?p dã duy?t)
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

    // Priority 2: Ðã x? lý hôm nay
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
    const isBirthdayToday = _kocIsBirthdayToday(c.birthday);

    // Check created today
    let createdToday = false;
    if (c.created_at) {
        const cDate = new Date(c.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        createdToday = (cStr === todayStr);
    }

    // Priority 3: M?i chuy?n hôm nay (tru?c Ph?i x? lý)
    if (createdToday) return 'moi_chuyen';

    // Priority 4: Ph?i x? lý hôm nay (appointment today OR birthday today)
    if (appointIsToday || isBirthdayToday) return 'phai_xu_ly';

    // Priority 5: Khách x? lý tr? (appointment was in the past, not consulted today)
    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';

    // Priority 6: Ch? x? lý (future appointment or remaining)
    if (appointIsFuture) return 'cho_xu_ly';

    // Default: ch? x? lý
    return 'cho_xu_ly';
}

function _kocUpdateConsultTypeDropdown(filteredList) {
    const sel = document.getElementById('crmFilterConsultType');
    if (!sel) return;
    const prevVal = sel.value;

    // Use provided filtered list or default to category-filtered
    let custs = filteredList;
    if (!custs) {
        custs = _kocAllCustomers;
        if (_kocActiveCat) {
            custs = _kocAllCustomers.filter(c => _kocGetCategory(c, _kocAllStats) === _kocActiveCat);
        }
    }

    // Count consult types from last log
    const typeCounts = {};
    let noLogCount = 0;
    custs.forEach(c => {
        const s = _kocAllStats[c.id] || {};
        if (s.lastLog && s.lastLog.log_type) {
            const lt = s.lastLog.log_type;
            typeCounts[lt] = (typeCounts[lt] || 0) + 1;
        } else {
            noLogCount++;
        }
    });

    // Build options
    let html = '<option value="">T?t c? tr?ng thái (' + custs.length + ')</option>';
    // Sort by count desc
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([key, count]) => {
        const t = KOC_CONSULT_TYPES[key];
        if (t) {
            html += '<option value="' + key + '">' + t.icon + ' ' + t.label + ' (' + count + ')</option>';
        }
    });
    if (noLogCount > 0) {
        html += '<option value="__none__">?? Chua tu v?n (' + noLogCount + ')</option>';
    }
    sel.innerHTML = html;

    // Restore previous selection if still exists
    if (prevVal) {
        const exists = [...sel.options].some(o => o.value === prevVal);
        if (exists) sel.value = prevVal;
    }
}
function _kocRenderFilteredTable() {
    const customers = _kocAllCustomers;
    const stats = _kocAllStats;
    const tbody = document.getElementById('crmCtvTbody');
    
    let filtered = customers;
    if (_kocActiveCat) {
        if (_kocActiveCat === 'phai_xu_ly') {
            // Include both phai_xu_ly and moi_chuyen
            filtered = customers.filter(c => {
                const cat = _kocGetCategory(c, stats);
                return cat === 'phai_xu_ly' || cat === 'moi_chuyen';
            });
        } else {
            filtered = customers.filter(c => _kocGetCategory(c, stats) === _kocActiveCat);
        }
    }

    // Apply date filter for cho_xu_ly and huy_khach (BEFORE consult type filter)
    const isDateCat = (_kocActiveCat === 'cho_xu_ly' || _kocActiveCat === 'huy_khach' || _kocActiveCat === 'xu_ly_tre');
    if (isDateCat) {
        const selDay = document.getElementById('crmDateDay')?.value;
        const selMonth = document.getElementById('crmDateMonth')?.value;
        const selYear = document.getElementById('crmDateYear')?.value;
        const hasMonth = selMonth && parseInt(selMonth);
        const hasYear = selYear && parseInt(selYear);
        const hasDay = selDay && parseInt(selDay);
        if (hasMonth || hasDay) {
            filtered = filtered.filter(c => {
                let dateField;
                if (_kocActiveCat === 'cho_xu_ly' || _kocActiveCat === 'xu_ly_tre') {
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
    _kocUpdateConsultTypeDropdown(filtered);

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



    // Sort: pinned first, then by appointment_date ASC
    filtered = [...filtered].sort((a, b) => {
        // Pinned customers always first
        const pinA = a.is_pinned ? 1 : 0;
        const pinB = b.is_pinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        // Both pinned: most recent pin first
        if (pinA && pinB) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
        if (_kocActiveCat === 'huy_khach') {
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
        countEl.textContent = 'K?t qu?: ' + filtered.length;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="19"><div class="empty-state"><div class="icon">??</div><h3>Không có khách hàng</h3></div></td></tr>`;
        document.getElementById('crmPagination').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / _kocPageSize);
    if (_kocCurrentPage > totalPages) _kocCurrentPage = totalPages;
    const startIdx = (_kocCurrentPage - 1) * _kocPageSize;
    const paged = filtered.slice(startIdx, startIdx + _kocPageSize);

    // Split table into two sections for phai_xu_ly
    if (_kocActiveCat === 'phai_xu_ly') {
        const moiChuyenRows = paged.filter(c => _kocGetCategory(c, stats) === 'moi_chuyen');
        const phaiXuLyRows = paged.filter(c => _kocGetCategory(c, stats) === 'phai_xu_ly');
        let html = '';
        let stt = startIdx + 1;
        if (moiChuyenRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="19"><span class="section-icon">??</span>M?i chuy?n hôm nay<span class="section-count">${moiChuyenRows.length}</span></td></tr>`;
            html += moiChuyenRows.map(c => _kocRenderCustomerRow(c, stats, stt++)).join('');
        }
        if (phaiXuLyRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="19"><span class="section-icon">??</span>Ph?i x? lý hôm nay<span class="section-count">${phaiXuLyRows.length}</span></td></tr>`;
            html += phaiXuLyRows.map(c => _kocRenderCustomerRow(c, stats, stt++)).join('');
        }
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = paged.map((c, idx) => _kocRenderCustomerRow(c, stats, startIdx + idx + 1)).join('');
    }

    // Render pagination
    const pgEl = document.getElementById('crmPagination');
    if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
    let pgHtml = '<button ' + (_kocCurrentPage <= 1 ? 'disabled' : '') + ' onclick="_kocGoToPage(' + (_kocCurrentPage - 1) + ')">?</button>';
    for (let p = 1; p <= totalPages; p++) {
        pgHtml += '<button class="' + (p === _kocCurrentPage ? 'active' : '') + '" onclick="_kocGoToPage(' + p + ')">' + p + '</button>';
    }
    pgHtml += '<button ' + (_kocCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="_kocGoToPage(' + (_kocCurrentPage + 1) + ')">?</button>';
    pgHtml += '<span class="pg-info">' + (startIdx+1) + '–' + Math.min(startIdx + _kocPageSize, filtered.length) + ' / ' + filtered.length + '</span>';
    pgEl.innerHTML = pgHtml;
}

function _kocGoToPage(page) {
    _kocCurrentPage = page;
    _kocRenderFilteredTable();
    // Scroll to table top
    document.getElementById('crmCtvTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// _crmDateShowAll removed - filtering now uses dropdown values directly

function _kocRenderCustomerRow(c, stats, stt) {
    const s = stats[c.id] || { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0 };
    const OVERRIDE_STATUSES = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    let lastType = s.lastLog ? KOC_CONSULT_TYPES[s.lastLog.log_type] : null;
    // Override: special cancel statuses always show their own label
    if (OVERRIDE_STATUSES.includes(c.order_status) && KOC_CONSULT_TYPES[c.order_status]) {
        lastType = KOC_CONSULT_TYPES[c.order_status];
    }
    let lastContent = s.lastLog?.content || '';
    if (lastContent && lastType) {
        lastContent = lastContent.replace(/^(?:?|??|??|??|??|??|??|??|?|??|??|??|??|??|??|??|??)?\s*(?:Tu v?n S?p|C?p c?u hoàn thành|Ch?t don|Ð?t c?c|Sau bán hàng|Hoàn Thành C?p C?u|C?p C?u S?p)[:\s]+/i, '').trim();
    }
    const shortContent = lastContent.length > 30 ? lastContent.substring(0, 30) + '...' : lastContent;

    let appointDisplay = '';
    if (c.appointment_date) {
        const d = new Date(c.appointment_date);
        const days = ['CN','T2','T3','T4','T5','T6','T7'];
        const dayName = days[d.getDay()];
        appointDisplay = `<span style="color:#e65100;font-weight:600">${dayName} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</span>`;
    }

    const _pinClass = c.is_pinned ? ' crm-row-pinned' : '';
    return `<tr class="${_pinClass}">
        <td style="text-align:center;padding:4px 2px;">
            ${!c.readonly ? `<span class="crm-pin-btn ${c.is_pinned ? 'active' : ''}" onclick="event.stopPropagation();_kocTogglePin(${c.id})" title="${c.is_pinned ? 'B? pin' : 'Pin khách'}">${c.is_pinned ? '??' : '<span style="opacity:0.3">??</span>'}</span>` : ''}
        </td>
        <td style="text-align:center;font-weight:700;color:#64748b;font-size:12px;">${stt || ''}</td>
        <td style="font-size:12px;font-weight:600;">${c.assigned_to_name || '<span style="color:var(--gray-500)">—</span>'}</td>
        <td style="font-size:11px;font-weight:700;color:#e65100;cursor:pointer;" onclick="_kocOpenOrderCodesPopup(${c.id})">${s.latestOrderCode || '—'}</td>
        <td>
            ${c.readonly ? (
                (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-700);color:var(--gray-400);opacity:0.6;cursor:not-allowed;">
                    ? Ch? Duy?t H?y
                </span>
            ` : (c.cancel_approved === -2) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:#dc2626;color:white;opacity:0.6;cursor:not-allowed;">
                    ? H?y Khách (nh?c l?i)
                </span>
            ` : (c.cancel_approved === -1) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '?? Tu V?n L?i'}
                </span>
            ` : `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '?? Tu V?n'}
                </span>
            `) : (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <button class="btn btn-sm" disabled style="font-size:11px;padding:4px 8px;background:var(--gray-700);color:var(--gray-400);cursor:not-allowed;">
                    ? Ch? Duy?t H?y
                </button>
            ` : (c.cancel_approved === -2) ? `
                <button class="btn btn-sm consult-btn" onclick="_kocOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:#dc2626;color:white;animation:emBlink 2s infinite;">
                    ? H?y Khách
                </button>
            ` : (c.cancel_approved === -1) ? `
                <button class="btn btn-sm consult-btn" onclick="_kocOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};animation:emBlink 2s infinite;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '?? Tu V?n L?i'}
                </button>
            ` : `
                <button class="btn btn-sm consult-btn" onclick="_kocOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '?? Tu V?n'}
                </button>
            `}
        </td>
        <td style="font-size:12px;color:#e65100;font-weight:600;cursor:pointer;" onclick="_kocOpenCustomerDetail(${c.id}).then(()=>setTimeout(()=>_kocSwitchCDTab('history'),100))" title="${lastContent}">
            ${shortContent || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.consultCount}</td>
        <td style="font-size:12px;">
            ${appointDisplay || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td><strong style="color:#e65100">${getCustomerCode(c)}</strong></td>
        <td>
            ${!c.readonly ? '<button class="btn btn-sm" onclick="event.stopPropagation();_kocOpenCustomerInfo(' + c.id + ')" style="font-size:9px;padding:1px 5px;margin-right:4px;background:var(--gray-700);color:var(--gold);" title="C?p nh?t thông tin">??</button>' : ''}
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
                const _bdayIcon = _kocIsBirthdayToday(c.birthday) ? '???? ' : '';
                return `<span onclick="_kocOpenCustomerDetail(${c.id})" style="cursor:pointer;display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${_cc.bg};color:${_cc.text};border:1px solid ${_cc.border};transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.boxShadow='0 2px 8px ${_cc.border}'" onmouseout="this.style.boxShadow='none'">${_bdayIcon}${c.customer_name}</span>`;
            })()}
        </td>
        <td>${c.readonly ? '<span style="color:var(--gray-400)">' + c.phone + '</span>' : '<a href="tel:' + c.phone + '" style="color:var(--info)">' + c.phone + '</a>'}</td>
        <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.facebook_link ? '<a href="' + c.facebook_link + '" target="_blank" style="color:#1877F2;font-weight:600;" title="' + c.facebook_link + '">?? FB</a>' : '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.address || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.source_name || '—'}</td>
        <td style="font-size:12px;${currentUser.role === 'giam_doc' ? 'cursor:pointer;' : ''}" onclick="${currentUser.role === 'giam_doc' && !c.referrer_id ? '_kocOpenReferrerSearch(' + c.id + ')' : ''}">
            ${c.referrer_id ? `<span style="cursor:pointer;text-decoration:underline;color:var(--info);font-weight:600;" onclick="event.stopPropagation();_kocOpenAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>` : (currentUser.role === 'giam_doc' ? '<span style="color:var(--gray-500)" title="Click d? tìm">?? Tìm</span>' : '<span style="color:var(--gray-500)">—</span>')}
        </td>
        <td style="font-size:11px">${(c.referrer_user_crm_type || c.referrer_crm_type) ? (CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type) : '—'}</td>
        <td style="font-size:12px;font-weight:600;color:#122546;">${c.job || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.chotDonCount}</td>
        <td style="text-align:right;font-weight:700;color:var(--success);font-size:14px;">${s.revenue > 0 ? formatCurrency(s.revenue) : '0'}</td>
    </tr>`;
}

async function loadCrmKocData() {
    // Sync dynamic consult types from API (adds any new types created in settings)
    await _kocSyncConsultTypes();

    let url = '/api/customers?crm_type=koc_tiktok';
    const search = document.getElementById('crmSearch')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const topStaff = document.getElementById('crmTopStaffFilter')?.value;
    if (topStaff) url += `&employee_id=${topStaff}`;

    const data = await apiCall(url);
    const tbody = document.getElementById('crmCtvTbody');

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
    _kocAllCustomers = customers;
    _kocAllStats = stats;

    // Count categories
    const counts = { phai_xu_ly: 0, moi_chuyen: 0, da_xu_ly: 0, xu_ly_tre: 0, cho_xu_ly: 0, huy_khach: 0 };
    customers.forEach(c => { const cat = _kocGetCategory(c, stats); counts[cat]++; });

    // Update stat cards - show TOTAL counts (not monthly filtered)
    const el = (id) => document.getElementById(id);
    if (el('crmStatPhaiXuLy')) el('crmStatPhaiXuLy').textContent = counts.phai_xu_ly + counts.moi_chuyen;
    if (el('crmStatDaXuLy')) el('crmStatDaXuLy').textContent = counts.da_xu_ly;
    if (el('crmStatXuLyTre')) el('crmStatXuLyTre').textContent = counts.xu_ly_tre;
    if (el('crmStatChoXuLy')) el('crmStatChoXuLy').textContent = counts.cho_xu_ly;
    if (el('crmStatHuyKhach')) el('crmStatHuyKhach').textContent = counts.huy_khach;

    // Re-highlight active card
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    if (_kocActiveCat) {
        const activeEl = document.querySelector('.crm-stat-card[data-cat="' + _kocActiveCat + '"]');
        if (activeEl) activeEl.classList.add('active');
    }

    // Update consult type dropdown
    _kocUpdateConsultTypeDropdown();

    // Render table
    // Auto-select 'Ph?i x? lý hôm nay' on first load
    if (!_kocActiveCat) {
        _kocFilterByCat('phai_xu_ly');
    } else {
        _kocRenderFilteredTable();
    }
}

function applyCrmKocFilter() { loadCrmKocData(); }

// ========== PIN KHÁCH HÀNG ==========
async function _kocTogglePin(customerId) {
    try {
        const res = await apiCall(`/api/customers/${customerId}/pin`, 'PATCH');
        if (res.success) {
            // Update local data
            const c = _kocAllCustomers.find(x => x.id === customerId);
            if (c) {
                c.is_pinned = res.is_pinned;
                c.pinned_at = res.is_pinned ? new Date().toISOString() : null;
                if (res.next_appointment) c.appointment_date = res.next_appointment;
            }
            _kocRenderFilteredTable();
            showToast(res.message, res.is_pinned ? 'success' : 'info');
        } else {
            showToast(res.error || 'L?i!', 'error');
        }
    } catch(e) {
        showToast('L?i pin khách hàng!', 'error');
    }
}

// CSS for pinned rows
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .crm-row-pinned {
            background: linear-gradient(90deg, rgba(245,158,11,0.10), transparent) !important;
            border-left: 3px solid #f59e0b !important;
        }
        .crm-row-pinned:hover {
            background: linear-gradient(90deg, rgba(245,158,11,0.18), transparent) !important;
        }
        .crm-pin-btn {
            cursor: pointer;
            font-size: 15px;
            transition: all 0.2s;
            display: inline-block;
        }
        .crm-pin-btn:hover {
            transform: scale(1.3);
        }
        .crm-pin-btn.active {
            filter: drop-shadow(0 0 4px #f59e0b);
            animation: pinPulse 2s infinite;
        }
        @keyframes pinPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
    `;
    document.head.appendChild(style);
})();
function resetCrmKocFilter() {
    _kocActiveCat = null;
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    document.getElementById('crmFilterConsultType').value = '';
    document.getElementById('crmSearch').value = '';
    const topStaff = document.getElementById('crmTopStaffFilter');
    if (topStaff) topStaff.value = '';
    loadCrmKocData();
}

// ========== CONSULTATION MODAL ==========
async function _kocOpenConsultModal(customerId) {
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
        const ROLE_LABELS_H = { giam_doc: 'Giám Ð?c', quan_ly: 'Qu?n Lý', truong_phong: 'Tru?ng Phòng' };
        handlerOptions = (hData.handlers || [])
            .map(u => '<option value="' + u.id + '"' + (pendingEmergency && pendingEmergency.handler_id === u.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS_H[u.role] || u.role) + ')</option>')
            .join('');
        customerInfo = custData.customer || {};
        existingItems = custData.items || [];
        window._currentConsultCustomerPinned = !!customerInfo.is_pinned;
        consultLogs = logData.logs || [];
    } catch(e) {}
    const grandTotal = existingItems.reduce((s, i) => s + (i.total || 0), 0);

    // Load flow rules from API for dynamic allowed types
    let flowRules = {};
    let maxDaysPerStatus = {};
    try {
        const frData = await apiCall('/api/consult-flow-rules?crm_menu=koc_tiktok');
        flowRules = frData.rules || {};
        maxDaysPerStatus = frData.maxDaysPerStatus || {};
    } catch(e) {}

    // Determine allowed types based on order_status and consultation history
    const orderStatus = customerInfo.order_status || 'dang_tu_van';
    const allTypes = Object.entries(KOC_CONSULT_TYPES);

    // Helper: get allowed types from flow rules for a given status
    function _getFlowRuleTypes(status) {
        const rules = flowRules[status];
        if (!rules || rules.length === 0) return null;
        return rules
            .map(r => [r.to_type_key, KOC_CONSULT_TYPES[r.to_type_key]])
            .filter(([k, v]) => v); // only include types that exist
    }

    // Check if customer already has a sau_ban_hang consultation
    const hasSauBanHang = consultLogs.some(l => l.log_type === 'sau_ban_hang');

    let allowedTypes;
    // ? Use last consultation log type (represents actual workflow state)
    const lastLogEntry = consultLogs.length > 0 ? consultLogs[0] : null;
    // Override: special cancel statuses always take priority over last log
    const OVERRIDE_STATUSES_MODAL = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    const effectiveStatus = OVERRIDE_STATUSES_MODAL.includes(orderStatus) ? orderStatus : (lastLogEntry ? lastLogEntry.log_type : orderStatus);
    const frTypes = _getFlowRuleTypes(effectiveStatus);

    // ? PRIORITY 1: Dynamic flow rules from last log type (always wins if configured)
    if (frTypes) {
        allowedTypes = frTypes;
    } else if (hasSauBanHang && orderStatus === 'sau_ban_hang') {
        allowedTypes = _getFlowRuleTypes('sau_ban_hang') || allTypes.filter(([k]) => ['tuong_tac_ket_noi'].includes(k));
    } else if (orderStatus === 'tuong_tac_ket_noi') {
        allowedTypes = _getFlowRuleTypes('tuong_tac_ket_noi') || allTypes.filter(([k]) => ['gui_ct_kh_cu'].includes(k));
    } else if (orderStatus === 'gui_ct_kh_cu') {
        allowedTypes = _getFlowRuleTypes('gui_ct_kh_cu') || allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else if (orderStatus === 'lam_quen_tuong_tac') {
        allowedTypes = _getFlowRuleTypes('lam_quen_tuong_tac') || allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke'].includes(k));
    } else if (orderStatus === 'hoan_thanh') {
        allowedTypes = _getFlowRuleTypes('hoan_thanh') || allTypes.filter(([k]) => ['sau_ban_hang'].includes(k));
    } else if (orderStatus === 'chot_don') {
        allowedTypes = _getFlowRuleTypes('chot_don') || allTypes.filter(([k]) => ['dang_san_xuat','hoan_thanh','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'dat_coc') {
        allowedTypes = _getFlowRuleTypes('dat_coc') || allTypes.filter(([k]) => ['chot_don','cap_cuu_sep','huy_coc'].includes(k));
    } else if (orderStatus === 'gui_stk_coc') {
        const fr = _getFlowRuleTypes('gui_stk_coc');
        if (fr) { allowedTypes = fr; }
        else { const order = ['giuc_coc','dat_coc','nhan_tin','cap_cuu_sep']; allowedTypes = order.map(k => [k, KOC_CONSULT_TYPES[k]]).filter(([,v]) => v); }
    } else if (orderStatus === 'huy_coc') {
        allowedTypes = _getFlowRuleTypes('huy_coc') || allTypes.filter(([k]) => ['tuong_tac_ket_noi','nhan_tin','goi_dien','gap_truc_tiep','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'duyet_huy') {
        allowedTypes = _getFlowRuleTypes('duyet_huy') || allTypes.filter(([k]) => ['nhan_tin'].includes(k));
    } else if (orderStatus === 'tu_van_lai') {
        allowedTypes = _getFlowRuleTypes('tu_van_lai') || allTypes.filter(([k]) => ['giam_gia','thiet_ke'].includes(k));
    } else if (orderStatus === 'giam_gia') {
        allowedTypes = _getFlowRuleTypes('giam_gia') || allTypes.filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else {
        // Fallback: consultation phase types only
        const normalTypes = ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc','cap_cuu_sep','huy'];
        allowedTypes = allTypes.filter(([k]) => normalTypes.includes(k));
    }

    // Pre-select next logical type
    const lastLog = consultLogs.length > 0 ? consultLogs[0] : null;

    // Override: after Hoàn Thành C?p C?u ? show full consultation types with Gi?m Giá
    if (lastLog && lastLog.log_type === 'hoan_thanh_cap_cuu') {
        allowedTypes = allTypes.filter(([k]) => ['giam_gia','lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    }

    // Override: if customer has a PENDING emergency ? lock to cap_cuu_sep only
    if (pendingEmergency) {
        allowedTypes = allTypes.filter(([k]) => k === 'cap_cuu_sep');
    }

    // Override: if customer cancel was auto-reverted (24h no response) ? lock to H?y Khách only
    if (customerInfo.cancel_approved === -2) {
        allowedTypes = allTypes.filter(([k]) => k === 'huy');
    }

    // ? Use admin-configured flow rule defaults (? M?c d?nh from Quy T?c Liên K?t)
    const effectiveRules = flowRules[effectiveStatus] || [];
    const defaultRule = effectiveRules.find(r => r.is_default);
    let defaultType = defaultRule ? defaultRule.to_type_key : (allowedTypes.length > 0 ? allowedTypes[0][0] : 'goi_dien');

    // ? Store section key + max days for max_appointment_days enforcement in _kocOnConsultTypeChange
    window._currentConsultSectionKey = effectiveStatus;
    window._currentConsultMaxDays = maxDaysPerStatus[effectiveStatus] || 0;

    // Force overrides (system logic, takes priority over flow rules)
    if (pendingEmergency) defaultType = 'cap_cuu_sep';
    if (customerInfo.cancel_approved === -2) defaultType = 'huy';

    const typeOptions = allowedTypes.map(([k, v]) =>
        `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${v.icon} ${v.label}</option>`
    ).join('');

    // Collapsible consultation history (grouped by month)
    const historyHTML = consultLogs.length > 0 ? `
        <div style="margin-bottom:12px;">
            <button type="button" onclick="_kocToggleConsultHistory()" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--gray-500);cursor:pointer;display:flex;align-items:center;gap:4px;width:100%;">
                ?? Xem l?ch s? (${consultLogs.length}) <span id="historyArrow" style="margin-left:auto;">?</span>
            </button>
            <div id="consultHistoryPanel" style="display:none;max-height:300px;overflow-y:auto;padding:10px;background:var(--gray-50);border-radius:0 0 8px 8px;border:1px solid var(--gray-200);border-top:none;">
                ${_kocBuildGroupedHistoryHTML(consultLogs, { compact: true })}
            </div>
        </div>
    ` : '';

    const bodyHTML = `
        ${historyHTML}
        <div class="form-group">
            <label>Lo?i Tu V?n <span style="color:var(--danger)">*</span></label>
            <select id="consultType" class="form-control" onchange="_kocOnConsultTypeChange()">
                ${typeOptions}
            </select>
        </div>
        <div class="form-group" id="consultDepositGroup" style="display:none;">
            <label>S? Ti?n Ð?t C?c <span style="color:var(--danger)">*</span></label>
            <input type="text" id="consultDepositAmount" class="form-control" placeholder="Nh?p s? ti?n d?t c?c..." 
                style="font-size:14px;font-weight:600;color:#e65100;"
                oninput="_kocFormatDepositInput(this)">
        </div>
        <div class="form-group" id="consultContentGroup">
            <label>N?i Dung Tu V?n <span style="color:var(--danger)">*</span></label>
            <textarea id="consultContent" class="form-control" rows="3" placeholder="Nh?p n?i dung tu v?n..."></textarea>
        </div>
        <div class="form-group" id="consultImageGroup">
            <label>Hình ?nh <span id="consultImageReq" style="color:var(--danger)">*</span> (Ctrl+V d? dán)</label>
            <div id="consultImageArea" class="image-paste-area" tabindex="0">
                <div id="consultImagePlaceholder">?? Click vào dây r?i Ctrl+V d? dán hình ?nh</div>
                <img id="consultImagePreview" style="display:none;max-width:100%;max-height:200px;border-radius:8px;">
                <input type="file" id="consultImageFile" accept="image/*" style="display:none">
                <button id="consultImageRemove" class="btn btn-sm" style="display:none;position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:2px 8px;" onclick="_kocRemoveConsultImage()">?</button>
            </div>
        </div>
        <div class="form-group" id="consultNextTypeGroup" style="display:none">
            <label>Tu V?n Ti?p Theo <span style="color:var(--danger)">*</span></label>
            <select id="consultNextType" class="form-control" onchange="_kocUpdateApptLabel()">
                ${Object.entries(KOC_CONSULT_TYPES).filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','dat_coc','chot_don','cap_cuu_sep','huy'].includes(k)).map(([k, v]) =>
                    `<option value="${k}" ${k === (lastLog?.next_consult_type || 'goi_dien') ? 'selected' : ''}>${v.icon} ${v.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group" id="consultAppointmentGroup">
            <label>Ngày H?n Làm Vi?c <span style="color:var(--danger)">*</span></label>
            <input type="date" id="consultAppointment" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
        </div>
        <div class="form-group" id="consultCancelGroup" style="display:none">
            <label>Lý Do H?y <span style="color:var(--danger)">*</span></label>
            <textarea id="consultCancelReason" class="form-control" rows="3" placeholder="Nh?p lý do h?y khách hàng..."></textarea>
            <div style="margin-top:8px;padding:10px;background:rgba(220,38,38,0.15);border-radius:6px;border:1px solid rgba(220,38,38,0.3);font-size:12px;color:#fca5a5;">
                ?? H?y khách hàng s? c?n Qu?n Lý/Giám Ð?c duy?t.
            </div>
        </div>
        <div class="form-group" id="consultHandlerGroup" style="display:none">
            <label>Ch?n Ngu?i X? Lý <span style="color:var(--danger)">*</span></label>
            <select id="consultHandler" class="form-control" ${pendingEmergency ? 'disabled style="opacity:0.7;cursor:not-allowed;background:var(--gray-100);"' : ''}>
                ${pendingEmergency ? '' : '<option value="">-- Ch?n S?p --</option>'}
                ${handlerOptions}
            </select>
            <div style="margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#fca5a5;">
                ?? Khách hàng s? hi?n ? trang C?p C?u S?p c?a ngu?i du?c ch?n.
            </div>
        </div>
        ${pendingEmergency ? `
        <div style="margin:12px 0;padding:12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;">
            <div style="font-size:13px;font-weight:700;color:#fca5a5;margin-bottom:4px;">?? Khách dang có c?p c?u s?p chua gi?i quy?t</div>
            <div style="font-size:11px;color:#94a3b8;">?n "GHI NH?N" s? nh?c l?i cho s?p x? lý. Ngày h?n t? d?ng d?t sang ngày mai.</div>
        </div>` : ''}
        <div id="consultOrderGroup" style="display:none">
            <div class="form-group" id="consultOrderCodeGroup" style="display:none;">
                <label>Mã Ðon <span style="color:var(--gray-500);font-size:11px;">(T? d?ng)</span></label>
                <input type="text" id="consultOrderCode" class="form-control" readonly style="background:var(--gray-100);font-weight:700;color:var(--navy);font-size:16px;cursor:not-allowed;border:2px solid var(--gold);">
            </div>
            <div class="form-group">
                <label>SÐT Khách Hàng</label>
                <input type="text" id="consultPhone" class="form-control" value="${customerInfo.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="10 ch? s?">
            </div>
            <div class="form-group">
                <label>Ðon Hàng <span style="color:var(--danger)">*</span></label>
                <table class="table" style="font-size:13px;" id="consultOrderTable">
                    <thead><tr><th>Mô t?</th><th style="width:80px">SL</th><th style="width:120px">Ðon giá</th><th style="width:120px">Thành ti?n</th><th style="width:50px"></th></tr></thead>
                    <tbody>
                        ${existingItems.length > 0 ? existingItems.map(it => `<tr>
                            <td><input class="form-control oi-desc" value="${it.description||''}" style="font-size:13px;padding:6px 8px;"></td>
                            <td><input type="number" class="form-control oi-qty" value="${it.quantity||0}" min="0" style="font-size:13px;padding:6px 8px;width:70px;"></td>
                            <td><input type="text" class="form-control oi-price" value="${formatCurrency(it.unit_price||0)}" style="font-size:13px;padding:6px 8px;" oninput="_kocFormatDepositInput(this);_kocCalcConsultOrderTotal()"></td>
                            <td class="oi-total" style="text-align:right;font-weight:600">${formatCurrency(it.total)}</td>
                            <td><button class="btn btn-sm" onclick="this.closest('tr').remove();_kocCalcConsultOrderTotal();" style="color:var(--danger)">?</button></td>
                        </tr>`).join('') : ''}
                    </tbody>
                </table>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <button class="btn btn-sm" onclick="_kocAddConsultOrderRow()" style="font-size:12px;">? Thêm dòng</button>
                    <div style="text-align:right;">
                        <div style="font-size:16px;font-weight:700;">T?ng: <span id="consultOrderTotal" style="color:#d4a843;font-size:18px;">${formatCurrency(grandTotal)}</span> VNÐ</div>
                        <div id="consultDepositInfo" style="display:none;margin-top:4px;font-size:13px;">
                            <span style="color:#6b7280;">Ðã c?c:</span> <span id="consultDepositDisplay" style="color:#10b981;font-weight:600;">0</span> VNÐ
                            <br><span style="color:#6b7280;">Còn l?i:</span> <span id="consultRemainingDisplay" style="color:#e65100;font-weight:700;font-size:15px;">0</span> VNÐ
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Ð?a Ch? C? Th? <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="consultAddress" class="form-control" value="${customerInfo.address || ''}" placeholder="Nh?p d?a ch? c? th?">
                </div>
                <div class="form-group">
                    <label>Thành Ph? <span style="color:var(--danger)">*</span></label>
                    <select id="consultCity" class="form-control">
                        <option value="">-- Ch?n t?nh/thành --</option>
                        ${KOC_VN_PROVINCES.map(p => `<option value="${p}" ${customerInfo.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group" style="display:none">
                <label>Tu V?n Ti?p Theo <span style="color:var(--danger)">*</span></label>
                <select id="consultChotDonNextType" class="form-control" onchange="_kocUpdateChotDonApptLabel()">
                    <option value="dang_san_xuat">?? Ðang S?n Xu?t</option>
                    <option value="hoan_thanh">?? Hoàn Thành Ðon</option>
                </select>
            </div>
            <div class="form-group">
                <label id="consultChotDonApptLabel">Ngày H?n Làm Vi?c Khách <span style="color:var(--danger)">*</span></label>
                <input type="date" id="consultSBHDate" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">H?y</button>
        <button class="btn btn-primary" id="consultSubmitBtn" onclick="_kocSubmitConsultLog(${customerId})" style="width:auto;">?? GHI NH?N</button>
    `;

    openModal('?? Ghi Nh?n Tu V?n', bodyHTML, footerHTML);

    // Setup image paste + trigger initial type change
    setTimeout(() => {
        const area = document.getElementById('consultImageArea');
        if (area) {
            area.addEventListener('paste', _kocHandleConsultImagePaste);
            area.addEventListener('click', () => area.focus());
        }
        document.querySelectorAll('#consultOrderTable .oi-qty, #consultOrderTable .oi-price').forEach(el => el.addEventListener('input', _kocCalcConsultOrderTotal));
        _kocOnConsultTypeChange(); // trigger to show/hide correct fields
    }, 100);
}

window._consultImageBlob = null;

function _kocHandleConsultImagePaste(e) {
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

function _kocRemoveConsultImage() {
    window._consultImageBlob = null;
    document.getElementById('consultImagePreview').style.display = 'none';
    document.getElementById('consultImagePlaceholder').style.display = 'block';
    document.getElementById('consultImageRemove').style.display = 'none';
}

function _kocOnConsultTypeChange() {
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


    // Reset labels back to default FIRST (before applying max_appointment_days)
    const contentLabel = contentGroup?.querySelector('label');
    if (contentLabel) contentLabel.innerHTML = 'N?i Dung Tu V?n <span style="color:var(--danger)">*</span>';
    const contentArea = document.getElementById('consultContent');
    if (contentArea) contentArea.placeholder = 'Nh?p n?i dung tu v?n...';
    const apptLabel = appointmentGroup?.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = 'Ngày H?n Ti?p Theo <span style="color:var(--danger)">*</span>';

    // ? Apply max_appointment_days from SECTION config (customer's current status, not selected button)
    const apptInput = document.getElementById('consultAppointment');
    if (apptInput) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        apptInput.min = todayStr;
        // Use SECTION's maxAppointmentDays (from flow rules API, inherits group leader)
        const maxDays = window._currentConsultMaxDays || 0;
        if (maxDays > 0) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + maxDays);
            apptInput.max = maxDate.getFullYear() + '-' + String(maxDate.getMonth()+1).padStart(2,'0') + '-' + String(maxDate.getDate()).padStart(2,'0');
            // Update label to show max days
            const apptLabelEl = appointmentGroup?.querySelector('label');
            if (apptLabelEl) apptLabelEl.innerHTML = `Ngày H?n Ti?p Theo <span style="color:var(--danger)">*</span> <span style="font-size:10px;color:#f59e0b;font-weight:600;">(t?i da ${maxDays} ngày)</span>`;
        } else {
            apptInput.removeAttribute('max');
        }
    }

    // Pinned customers: override label + disable datepicker (AFTER all resets)
    if (window._currentConsultCustomerPinned) {
        const _apptInput2 = document.getElementById('consultAppointment');
        if (_apptInput2) { _apptInput2.disabled = true; _apptInput2.style.opacity = '0.5'; }
        const _apptLbl2 = appointmentGroup?.querySelector('label');
        if (_apptLbl2) _apptLbl2.innerHTML = '?? Ngày H?n Ti?p Theo <span style="color:#f59e0b;font-size:11px;">(Pin khách — t? d?ng ngày làm vi?c ti?p theo)</span>';
    }

    const nextTypeGroup = document.getElementById('consultNextTypeGroup');
    if (nextTypeGroup) nextTypeGroup.style.display = 'none';

    // Image required: hide * for goi_dien, dat_coc, cap_cuu_sep, sau_ban_hang
    const imageOptionalTypes = ['goi_dien', 'dat_coc', 'cap_cuu_sep', 'sau_ban_hang'];
    if (imageReq) imageReq.style.display = imageOptionalTypes.includes(type) ? 'none' : 'inline';

    // H?Y flow
    if (type === 'huy') {
        if (cancelGroup) cancelGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Ð?t C?c flow — show Mã Ðon + deposit amount + content + image + appointment
    if (type === 'dat_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Show deposit amount field
        const depositGroup = document.getElementById('consultDepositGroup');
        if (depositGroup) depositGroup.style.display = 'block';
        // Show only the Mã Ðon field from orderGroup
        const ocGroup = document.getElementById('consultOrderCodeGroup');
        if (ocGroup) ocGroup.style.display = 'block';
        _kocFetchOrderCode();
    }

    // Ch?t Ðon flow
    if (type === 'chot_don') {
        if (orderGroup) orderGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
        // Fetch order code (reuses existing from d?t c?c if any)
        _kocFetchOrderCode();
        // Fetch deposit amount from dat_coc log
        window._currentDepositAmount = 0;
        const customerId = window._currentConsultCustomerId;
        if (customerId) {
            apiCall(`/api/customers/${customerId}/consult`).then(data => {
                const datCocLog = (data.logs || []).find(l => l.log_type === 'dat_coc' && l.deposit_amount > 0);
                if (datCocLog) {
                    window._currentDepositAmount = datCocLog.deposit_amount;
                    _kocCalcConsultOrderTotal();
                }
            });
        }
    }

    // C?p C?u S?p flow
    if (type === 'cap_cuu_sep') {
        if (handlerGroup) handlerGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Sau Bán Hàng flow - just content + appointment
    if (type === 'sau_ban_hang') {
        if (imageGroup) imageGroup.style.display = 'none';
    }

    // Hoàn Thành Ðon flow - content + appointment
    if (type === 'hoan_thanh') {
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
    }

    // H?y C?c flow - content (lý do) + appointment date
    if (type === 'huy_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Relabel
        const contentLabel = contentGroup?.querySelector('label');
        if (contentLabel) contentLabel.innerHTML = 'Lý Do H?y C?c <span style="color:var(--danger)">*</span>';
        const contentArea = document.getElementById('consultContent');
        if (contentArea) contentArea.placeholder = 'Nh?p lý do h?y c?c...';
        const apptLabel = appointmentGroup?.querySelector('label');
        if (apptLabel) apptLabel.innerHTML = 'Ngày H?n Làm Vi?c <span style="color:var(--danger)">*</span>';
    }
}

function _kocUpdateApptLabel() {
    const sel = document.getElementById('consultNextType');
    const apptGroup = document.getElementById('consultAppointmentGroup');
    if (!sel || !apptGroup) return;
    const val = sel.value;
    const typeInfo = KOC_CONSULT_TYPES[val];
    const label = typeInfo ? typeInfo.label : 'Ti?p Theo';
    const apptLabel = apptGroup.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = `Ngày H?n ${label} <span style="color:var(--danger)">*</span>`;
}

function _kocUpdateChotDonApptLabel() {
    const sel = document.getElementById('consultChotDonNextType');
    const lbl = document.getElementById('consultChotDonApptLabel');
    if (!sel || !lbl) return;
    const labels = { dang_san_xuat: 'Ðang S?n Xu?t', hoan_thanh: 'Hoàn Thành Ðon' };
    lbl.innerHTML = `Ngày H?n ${labels[sel.value] || 'Hoàn Thành Ðon'} <span style="color:var(--danger)">*</span>`;
}

// ========== SHARED GROUPED HISTORY BUILDER ==========
function _kocBuildGroupedHistoryHTML(logs, options = {}) {
    const { compact = false } = options;
    if (logs.length === 0) return compact ? '' : '<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:8px;">??</div><div style="color:#94a3b8;font-size:14px;">Chua có l?ch s? tu v?n</div></div>';

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
            const t = KOC_CONSULT_TYPES[log.log_type] || { icon: '??', label: log.log_type, color: '#6b7280' };
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
                    extra += `<div style="font-size:10px;color:var(--gray-500);margin-top:2px;padding-left:18px;">?? ${sc}</div>`;
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
            <div style="${headerStyle}" onclick="var p=document.getElementById('${groupId}');p.style.display=p.style.display==='none'?'block':'none';this.querySelector('.hg-arrow').textContent=p.style.display==='none'?'?':'?';">
                <span>?? ${MONTH_NAMES[Number(m)]} ${y} <span style="background:rgba(250,210,76,0.2);color:#fad24c;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;">${items.length}</span></span>
                <span class="hg-arrow" style="font-size:12px;">${isCurrentMonth ? '?' : '?'}</span>
            </div>
            <div id="${groupId}" style="display:${isCurrentMonth ? 'block' : 'none'};">
                ${logsHTML}
            </div>
        </div>`;
    }).join('');
}

// ========== SHARED ORDER CARD BUILDER ==========
function _kocBuildOrderCardHTML(codes, customer) {
    if (codes.length === 0) return '<p style="color:#6b7280;text-align:center;padding:20px;">Chua có mã don nào</p>';

    let allOrdersTotal = 0;

    const cardsHTML = codes.map(oc => {
        const d = new Date(oc.created_at);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        const orderItems = oc.items || [];
        const orderDeposit = oc.deposit || 0;
        const orderTotal = orderItems.reduce((s, i) => s + (i.total || 0), 0);
        if (oc.status !== 'cancelled') allOrdersTotal += orderTotal;
        const statusBadge = oc.status === 'completed' 
            ? '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">? Hoàn thành</span>'
            : oc.status === 'cancelled'
            ? '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">? Ðã h?y</span>'
            : '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">?? Ðang x? lý</span>';
        
        const actionBtns = '';

        return `
            <div style="padding:12px;border:1px solid ${oc.status === 'completed' ? '#10b981' : oc.status === 'cancelled' ? '#ef4444' : '#e5e7eb'};border-radius:10px;margin-bottom:8px;background:${oc.status === 'completed' ? '#f0fdf4' : oc.status === 'cancelled' ? '#fef2f2' : '#fafafa'};">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:8px;">
                    <div style="min-width:90px;">
                        <div style="font-size:10px;color:#6b7280;">Mã Ðon</div>
                        <div style="font-weight:700;color:#e65100;font-size:15px;">${oc.order_code}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">NV T?o</div>
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
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">THÀNH TI?N</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">C?C</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">CÒN L?I</th>
                        </tr></thead>
                        <tbody>
                            ${orderItems.map(it => {
                                const itemDeposit = orderItems.length === 1 ? orderDeposit : Math.round(orderDeposit * (it.total || 0) / orderTotal);
                                const itemRemain = Math.max(0, (it.total || 0) - itemDeposit);
                                return `<tr style="border-top:1px solid #e5e7eb;">
                                    <td style="padding:5px 8px;color:#122546;">${it.description || '—'}</td>
                                    <td style="padding:5px 8px;text-align:center;color:#122546;font-weight:600;">${it.quantity}</td>
                                    <td style="padding:5px 8px;text-align:right;color:#122546;">${formatCurrency(it.unit_price || 0)}d</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:600;color:#e65100;">${formatCurrency(it.total)}d</td>
                                    <td style="padding:5px 8px;text-align:right;color:#10b981;font-weight:600;">${orderDeposit > 0 ? formatCurrency(itemDeposit) + 'd' : '—'}</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:700;color:#e65100;">${orderDeposit > 0 ? formatCurrency(itemRemain) + 'd' : formatCurrency(it.total) + 'd'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    <div style="text-align:right;font-size:13px;font-weight:600;margin-top:4px;color:#122546;">T?ng don: <span style="color:#e65100;">${formatCurrency(orderTotal)}</span> VNÐ${orderDeposit > 0 ? ` | C?c: <span style="color:#10b981;">${formatCurrency(orderDeposit)}</span> VNÐ` : ''}</div>
                ` : '<p style="color:#9ca3af;font-size:12px;text-align:center;">Chua có s?n ph?m</p>'}
                ${actionBtns}
            </div>
        `;
    }).join('');

    return cardsHTML + (allOrdersTotal > 0 ? `<div style="text-align:right;font-size:16px;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #e5e7eb;">T?ng doanh s?: <span style="color:#e65100;">${formatCurrency(allOrdersTotal)}</span> VNÐ</div>` : '');
}

// ========== ORDER CODES POPUP ==========
async function _kocOpenOrderCodesPopup(customerId) {
    // Open full customer detail popup with "Ðon Hàng" tab pre-selected
    await _kocOpenCustomerDetail(customerId);
    setTimeout(() => _kocSwitchCDTab('orders'), 100);
}

// Per-order completion
async function _kocCompleteOrder(orderId, customerId) {
    if (!confirm('Xác nh?n hoàn thành don này? Hoa h?ng s? du?c tính cho affiliate.')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/complete`, 'POST');
        if (res.success) {
            showToast('? ' + res.message);
            closeModal();
            _kocOpenOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('L?i: ' + (e.message || ''), 'error'); }
}

// Per-order cancellation
async function _kocCancelOrder(orderId, customerId) {
    if (!confirm('Xác nh?n h?y don này?')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/cancel`, 'POST');
        if (res.success) {
            showToast('?? ' + res.message);
            closeModal();
            _kocOpenOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('L?i: ' + (e.message || ''), 'error'); }
}

// Toggle collapsible history panel
function _kocToggleConsultHistory() {
    const panel = document.getElementById('consultHistoryPanel');
    const arrow = document.getElementById('historyArrow');
    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.textContent = isHidden ? '?' : '?';
    }
}

// Fetch order code for current customer (always generates new)
function _kocFetchOrderCode() {
    const ocGroup = document.getElementById('consultOrderCodeGroup');
    const ocInput = document.getElementById('consultOrderCode');
    if (!ocGroup || !ocInput) return;
    ocInput.value = 'Ðang t?i...';
    ocGroup.style.display = 'block';
    const customerId = window._currentConsultCustomerId;
    apiCall(`/api/order-codes/next${customerId ? '?customer_id=' + customerId : ''}`).then(res => {
        if (res.order_code) {
            ocInput.value = res.order_code;
            // New order = clear items table
            const tbody = document.querySelector('#consultOrderTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                _kocAddConsultOrderRow();
            }
            // Reset totals
            const totalEl = document.getElementById('consultOrderTotal');
            if (totalEl) totalEl.textContent = '0';
            const depInfo = document.getElementById('consultDepositInfo');
            if (depInfo) depInfo.style.display = 'none';
        } else {
            ocInput.value = 'Chua cài mã don';
        }
    }).catch(() => { ocInput.value = 'L?i t?i mã'; });
}

// Order table helpers for Ch?t Ðon
function _kocAddConsultOrderRow() {
    const tbody = document.querySelector('#consultOrderTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control oi-desc" value="" style="font-size:13px;padding:6px 8px;"></td>
        <td><input type="number" class="form-control oi-qty" value="0" min="0" style="font-size:13px;padding:6px 8px;width:70px;" oninput="_kocCalcConsultOrderTotal()"></td>
        <td><input type="text" class="form-control oi-price" value="0" style="font-size:13px;padding:6px 8px;" oninput="_kocFormatDepositInput(this);_kocCalcConsultOrderTotal()"></td>
        <td class="oi-total" style="text-align:right;font-weight:600">0</td>
        <td><button class="btn btn-sm" onclick="this.closest('tr').remove();_kocCalcConsultOrderTotal();" style="color:var(--danger)">?</button></td>
    </tr>`);
}

function _kocCalcConsultOrderTotal() {
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
function _kocDisableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '? Ðang x? lý...'; }
}
function _kocEnableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = false; btn.textContent = '?? GHI NH?N'; }
}

async function _kocSubmitConsultLog(customerId) {
    // Debounce: disable button immediately
    _kocDisableSubmitBtn();
    const log_type = document.getElementById('consultType').value;
    const content = document.getElementById('consultContent')?.value;
    const appointment_date = document.getElementById('consultAppointment')?.value;

    // ========== H?Y flow ==========
    if (log_type === 'huy') {
        const reason = document.getElementById('consultCancelReason')?.value;
        if (!reason) { showToast('Vui lòng nh?p lý do h?y!', 'error'); _kocEnableSubmitBtn(); return; }
        try {
            const data = await apiCall(`/api/customers/${customerId}/cancel`, 'POST', { reason });
            if (data.success) { showToast('? ' + data.message); closeModal(); loadCrmKocData(); }
            else { showToast(data.error || 'L?i!', 'error'); _kocEnableSubmitBtn(); }
        } catch (err) { showToast('L?i k?t n?i!', 'error'); _kocEnableSubmitBtn(); }
        return;
    }

    // ========== C?p C?u S?p flow ==========
    if (log_type === 'cap_cuu_sep') {
        const handler_id = document.getElementById('consultHandler')?.value;
        if (!content) { showToast('Vui lòng nh?p n?i dung tình hu?ng!', 'error'); _kocEnableSubmitBtn(); return; }
        if (!handler_id) { showToast('Vui lòng ch?n S?p x? lý!', 'error'); _kocEnableSubmitBtn(); return; }
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
                showToast('?? ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmKocData();
            } else { showToast(data.error || 'L?i!', 'error'); _kocEnableSubmitBtn(); }
        } catch (err) { showToast('L?i k?t n?i!', 'error'); _kocEnableSubmitBtn(); }
        return;
    }

    // ========== Ð?t C?c flow ==========
    if (log_type === 'dat_coc') {
        const depositAmount = Number((document.getElementById('consultDepositAmount')?.value || '').replace(/\./g, '')) || 0;
        if (depositAmount <= 0) {
            showToast('Vui lòng nh?p s? ti?n d?t c?c!', 'error'); _kocEnableSubmitBtn(); return;
        }
        const contentText = content || `Ð?t c?c: ${formatCurrency(depositAmount)} VNÐ`;

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
                showToast('? Ð?t c?c thành công!'); closeModal(); window._consultImageBlob = null; loadCrmKocData();
            } else { showToast(data.error || 'L?i!', 'error'); _kocEnableSubmitBtn(); }
        } catch (err) { showToast('L?i k?t n?i!', 'error'); _kocEnableSubmitBtn(); }
        return;
    }

    // ========== Ch?t Ðon flow ==========
    if (log_type === 'chot_don') {
        const address = document.getElementById('consultAddress')?.value;
        const city = document.getElementById('consultCity')?.value;
        const phone = document.getElementById('consultPhone')?.value;
        const sbhDate = document.getElementById('consultSBHDate')?.value;
        if (!address) { showToast('Vui lòng nh?p d?a ch?!', 'error'); _kocEnableSubmitBtn(); return; }
        if (!city) { showToast('Vui lòng ch?n thành ph?!', 'error'); _kocEnableSubmitBtn(); return; }
        if (!sbhDate) { showToast('Vui lòng ch?n ngày h?n sau bán hàng!', 'error'); _kocEnableSubmitBtn(); return; }

        // Phone validate
        if (phone && !/^\d{10}$/.test(phone)) {
            showToast('SÐT ph?i dúng 10 ch? s?', 'error'); _kocEnableSubmitBtn(); return;
        }

        // Collect order items
        const rows = document.querySelectorAll('#consultOrderTable tbody tr');
        if (rows.length === 0) { showToast('Vui lòng thêm ít nh?t 1 s?n ph?m!', 'error'); _kocEnableSubmitBtn(); return; }
        const items = [];
        for (const row of rows) {
            const desc = row.querySelector('.oi-desc')?.value;
            const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
            const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
            if (desc && qty > 0 && price > 0) items.push({ description: desc, quantity: qty, unit_price: price });
        }
        if (items.length === 0) { showToast('Vui lòng nh?p s?n ph?m h?p l?!', 'error'); _kocEnableSubmitBtn(); return; }

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
            formData.append('content', `Ch?t don: ${items.length} SP — ${address}, ${city}`);
            formData.append('address', address);
            formData.append('appointment_date', sbhDate);
            const chotDonNextType = document.getElementById('consultChotDonNextType')?.value;
            if (chotDonNextType) formData.append('next_consult_type', chotDonNextType);
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('? Ch?t don thành công! Chuy?n sang Sau Bán Hàng.'); closeModal(); window._consultImageBlob = null; loadCrmKocData();
            } else { showToast(data.error || 'L?i!', 'error'); _kocEnableSubmitBtn(); }
        } catch (err) { showToast('L?i k?t n?i!', 'error'); _kocEnableSubmitBtn(); }
        return;
    }

    // ========== Normal consultation flow ==========
    if (!content) { showToast('Vui lòng nh?p n?i dung tu v?n!', 'error'); _kocEnableSubmitBtn(); return; }
    const imageRequiredTypes = ['nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua'];
    if (imageRequiredTypes.includes(log_type) && !window._consultImageBlob) {
        showToast('Vui lòng dán hình ?nh (Ctrl+V)!', 'error'); _kocEnableSubmitBtn(); return;
    }
    if (!appointment_date) { showToast('Vui lòng ch?n ngày h?n!', 'error'); _kocEnableSubmitBtn(); return; }

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
            showToast('? ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmKocData();
        } else { showToast(data.error || 'L?i!', 'error'); _kocEnableSubmitBtn(); }
    } catch (err) { showToast('L?i k?t n?i!', 'error'); _kocEnableSubmitBtn(); }
}

// ========== CONSULTATION HISTORY ==========
async function _kocOpenConsultHistory(customerId) {
    const [custData, logData, codesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    
    const c = custData.customer;
    if (!c) { showToast('Không tìm th?y', 'error'); return; }
    const logs = logData.logs || [];
    const items = custData.items || [];
    const codes = codesData.codes || [];
    const totalDeposit = codesData.total_deposit || 0;

    let bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-sm tab-btn active" onclick="_kocSwitchConsultTab('info', this)" style="font-size:12px;">?? Thông Tin</button>
            <button class="btn btn-sm tab-btn" onclick="_kocSwitchConsultTab('history', this)" style="font-size:12px;">?? L?ch S? (${logs.length})</button>
            <button class="btn btn-sm tab-btn" onclick="_kocSwitchConsultTab('order', this)" style="font-size:12px;">?? Ðon Hàng</button>
        </div>

        <div id="tabInfo">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                <div><strong>Mã:</strong> <span style="color:var(--gold)">${getCustomerCode(c)}</span></div>
                <div><strong>Tr?ng thái:</strong> ${getStatusBadge(c.order_status)}</div>
                <div><strong>Khách hàng:</strong> ${c.customer_name}</div>
                <div><strong>SÐT:</strong> <a href="tel:${c.phone}">${c.phone}</a></div>
                <div><strong>Ngu?n:</strong> ${c.source_name || '—'}</div>
                <div><strong>Ngày bàn giao:</strong> ${formatDate(c.handover_date)}</div>
                <div><strong>Ð?a ch?:</strong> ${c.address || '—'}</div>
                <div><strong>Ngày sinh:</strong> ${c.birthday ? formatDate(c.birthday) : '—'}</div>
                <div><strong>Ngày h?n:</strong> ${c.appointment_date || '—'}</div>
                <div><strong>Ngu?i nh?n:</strong> ${c.assigned_to_name || '—'}</div>
                ${(c.referrer_name || c.referrer_customer_name) ? `<div><strong>Ngu?i GT:</strong> <span style="cursor:pointer;text-decoration:underline;color:var(--info);" onclick="_kocOpenAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span></div>` : ''}
                ${(c.referrer_user_crm_type || c.referrer_crm_type) ? `<div><strong>CRM ngu?i GT:</strong> ${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</div>` : ''}
                ${c.notes ? `<div style="grid-column:1/-1"><strong>Ghi chú:</strong> ${c.notes}</div>` : ''}
            </div>
        </div>

        <div id="tabHistory" style="display:none;">
            ${logs.length === 0 ? '<div class="empty-state"><div class="icon">??</div><h3>Chua có l?ch s?</h3></div>' :
            `<div style="max-height:350px;overflow-y:auto;">
                ${_kocBuildGroupedHistoryHTML(logs)}
            </div>`}
        </div>

        <div id="tabOrder" style="display:none;">
            ${_kocBuildOrderCardHTML(codes, items, c, totalDeposit)}
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Ðóng</button>
        <button class="btn btn-primary" onclick="_kocOpenConsultModal(${c.id})" style="width:auto;">?? Tu V?n</button>
        <button class="btn btn-primary" onclick="_kocSaveOrderItems(${c.id})" style="width:auto;">?? Luu Ðon</button>
        <button class="btn" onclick="_kocRequestCancel(${c.id})" style="width:auto;background:var(--danger);color:white;">? H?y KH</button>
    `;

    openModal(`?? ${c.customer_name} — ${getCustomerCode(c)}`, bodyHTML, footerHTML);

    setTimeout(() => {
        document.querySelectorAll('.oi-qty, .oi-price').forEach(el => el.addEventListener('input', calcOrderTotal));
    }, 100);
}

function _kocSwitchConsultTab(tab, btn) {
    document.getElementById('tabInfo').style.display = tab === 'info' ? 'block' : 'none';
    document.getElementById('tabHistory').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('tabOrder').style.display = tab === 'order' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ========== UPDATE APPOINTMENT ==========
async function _kocUpdateAppointment(customerId, date) {
    const data = await apiCall(`/api/customers/${customerId}/appointment`, 'PUT', { appointment_date: date });
    if (data.success) showToast('?? Ðã c?p nh?t ngày h?n!');
}

// ========== REFERRER SEARCH ==========
let _kocAllReferrerCustomers = [];
async function _kocOpenReferrerSearch(customerId) {
    const bodyHTML = `
        <div class="form-group">
            <label>Tìm Ngu?i Gi?i Thi?u (tên ho?c SÐT)</label>
            <input type="text" id="referrerSearchInput" class="form-control" placeholder="Nh?p tên ho?c SÐT d? l?c..." oninput="_kocFilterReferrerList(${customerId})">
        </div>
        <div id="referrerSearchResults" style="max-height:350px;overflow-y:auto;">
            <p style="color:var(--gray-400);text-align:center;padding:20px;">Ðang t?i...</p>
        </div>
    `;
    openModal('?? Tìm Ngu?i Gi?i Thi?u', bodyHTML, `<button class="btn btn-secondary" onclick="closeModal()">Ðóng</button>`);

    // Load all referrer-eligible customers (CTV, Hoa H?ng, Sinh Viên, Nuôi Du?ng)
    try {
        const data = await apiCall('/api/customers/referrer-search?q=&all=1');
        _kocAllReferrerCustomers = data.customers || [];
        _kocRenderReferrerList(customerId, _kocAllReferrerCustomers);
    } catch(e) {
        document.getElementById('referrerSearchResults').innerHTML = '<p style="color:var(--danger);text-align:center;">L?i t?i d? li?u</p>';
    }
    setTimeout(() => document.getElementById('referrerSearchInput')?.focus(), 200);
}

function _kocFilterReferrerList(customerId) {
    const q = (document.getElementById('referrerSearchInput')?.value || '').toLowerCase().trim();
    const filtered = q ? _kocAllReferrerCustomers.filter(c =>
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
    ) : _kocAllReferrerCustomers;
    _kocRenderReferrerList(customerId, filtered);
}

function _kocRenderReferrerList(customerId, customers) {
    const results = document.getElementById('referrerSearchResults');
    if (!results) return;
    if (customers.length === 0) {
        results.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:20px;">Không tìm th?y</p>';
        return;
    }
    const CRM_TYPE_COLORS = { 'ctv': '#10b981', 'hoa_hong': '#f59e0b', 'sinh_vien': '#3b82f6', 'nuoi_duong': '#8b5cf6' };
    results.innerHTML = customers.map(c => {
        const typeLabel = CRM_LABELS[c.crm_type] || c.crm_type;
        const typeColor = CRM_TYPE_COLORS[c.crm_type] || '#6b7280';
        return `
            <div onclick="_kocSelectReferrer(${customerId}, ${c.id})" 
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

async function _kocSelectReferrer(customerId, referrerCustomerId) {
    const data = await apiCall(`/api/customers/${customerId}/referrer`, 'PUT', { referrer_customer_id: referrerCustomerId });
    if (data.success) {
        showToast('? Ðã ch?n ngu?i gi?i thi?u: ' + data.referrer_name);
        closeModal();
        loadCrmKocData();
    } else {
        showToast(data.error || 'L?i!', 'error');
    }
}

// ========== C?P NH?T THÔNG TIN KHÁCH HÀNG ==========
// ========== DANH SÁCH T?NH/THÀNH PH? ==========
const KOC_PROVINCES = [
    'An Giang','Bà R?a - Vung Tàu','B?c Giang','B?c K?n','B?c Liêu','B?c Ninh','B?n Tre',
    'Bình Ð?nh','Bình Duong','Bình Phu?c','Bình Thu?n','Cà Mau','C?n Tho','Cao B?ng',
    'Ðà N?ng','Ð?k L?k','Ð?k Nông','Ði?n Biên','Ð?ng Nai','Ð?ng Tháp','Gia Lai',
    'Hà Giang','Hà Nam','Hà N?i','Hà Tinh','H?i Duong','H?i Phòng','H?u Giang',
    'Hòa Bình','Hung Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Ð?ng',
    'L?ng Son','Lào Cai','Long An','Nam Ð?nh','Ngh? An','Ninh Bình','Ninh Thu?n',
    'Phú Th?','Phú Yên','Qu?ng Bình','Qu?ng Nam','Qu?ng Ngãi','Qu?ng Ninh','Qu?ng Tr?',
    'Sóc Trang','Son La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa',
    'Th?a Thiên Hu?','Ti?n Giang','TP. H? Chí Minh','Trà Vinh','Tuyên Quang',
    'Vinh Long','Vinh Phúc','Yên Bái'
];

async function _kocOpenCustomerInfo(customerId) {
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

    const provinceOptions = KOC_PROVINCES.map(p => 
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
            <label>S? Ði?n Tho?i</label>
            <input type="text" id="ciPhone" class="form-control" value="${c.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
                <label>Ð?a Ch?</label>
                <input type="text" id="ciAddress" class="form-control" value="${c.address || ''}">
            </div>
            <div class="form-group">
                <label>T?nh / Thành Ph?</label>
                <select id="ciProvince" class="form-control">
                    <option value="">-- Ch?n --</option>
                    ${provinceOptions}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Công Vi?c</label>
            <input type="text" id="ciJob" class="form-control" value="${c.job || ''}" placeholder="VD: Giám d?c công ty ABC">
        </div>
        <div class="form-group">
            <label>Ngày Sinh Nh?t</label>
            <div style="display:flex;gap:8px;">
                <select id="ciBdDay" class="form-control" style="width:80px;">${dayOpts}</select>
                <select id="ciBdMonth" class="form-control" style="width:120px;">${monthOpts}</select>
            </div>
        </div>
        <div class="form-group">
            <label>Ngày L? C?a KH</label>
            <div id="ciHolidays">
                ${holidays.length > 0 ? holidays.map((h, i) => `
                    <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
                        <input type="text" class="form-control ci-hname" value="${h.name || ''}" placeholder="Tên ngày l?" style="flex:1;font-size:13px;">
                        ${holidayDateSelects(h.date)}
                        <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">?</button>
                    </div>
                `).join('') : ''}
            </div>
            <button class="btn btn-sm" onclick="_kocAddHolidayRow()" style="font-size:12px;margin-top:6px;">? Thêm ngày l?</button>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">H?y</button>
        <button class="btn btn-primary" onclick="_kocSaveCustomerInfo(${customerId})" style="width:auto;">?? LUU</button>
    `;

    openModal('?? C?p Nh?t Thông Tin KH', bodyHTML, footerHTML);
}

function _kocAddHolidayRow() {
    let dOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}">${d}</option>`;
    let mOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}">T${m}</option>`;
    const container = document.getElementById('ciHolidays');
    container.insertAdjacentHTML('beforeend', `
        <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
            <input type="text" class="form-control ci-hname" value="" placeholder="Tên ngày l?" style="flex:1;font-size:13px;">
            <select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
            <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>
            <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">?</button>
        </div>
    `);
}

async function _kocSaveCustomerInfo(customerId) {
    const customer_name = document.getElementById('ciName').value;
    const phone = document.getElementById('ciPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('S? di?n tho?i ph?i dúng 10 ch? s?', 'error');
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

    if (!customer_name) { showToast('Tên KH không du?c tr?ng!', 'error'); return; }

    try {
        const data = await apiCall(`/api/customers/${customerId}/info`, 'PUT', {
            customer_name, phone, address, province, job, birthday, customer_holidays
        });
        if (data.success) {
            showToast('? ' + data.message);
            closeModal();
            loadCrmKocData();
        } else {
            showToast(data.error || 'L?i!', 'error');
        }
    } catch (err) {
        showToast('L?i k?t n?i!', 'error');
    }
}

// ========== CHI TI?T KHÁCH HÀNG ==========
async function _kocOpenCustomerDetail(customerId) {
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
    const lastConsultTypePopup = lastLogPopup ? KOC_CONSULT_TYPES[lastLogPopup.log_type] : null;
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
                                ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:var(--gray-700);color:var(--gray-400);">? Ch? Duy?t H?y</span>`
                                : (c.cancel_approved === -1)
                                    ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:#f59e0b;color:white;">?? Tu V?n L?i</span>`
                                    : lastConsultTypePopup
                                        ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:${lastConsultTypePopup.color || 'var(--gray-600)'};color:${lastConsultTypePopup.textColor || 'white'};">${lastConsultTypePopup.icon} ${lastConsultTypePopup.label}</span>`
                                        : `<span style="font-size:12px;">${statusBadge}</span>`
                            }
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:22px;font-weight:800;color:#fad24c;">${logs.length}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">L?N CHAM</div>
                    </div>
                </div>
            </div>

            <!-- INFO GRID -->
            <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? SÐT</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;"><a href="tel:${c.phone}" style="color:#3b82f6;text-decoration:none;">${c.phone}</a></div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? Ð?a ch?</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.address || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? T?nh/TP</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.province || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? Sinh nh?t</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.birthday || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? Ngu?n</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.source_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? Công vi?c</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.job || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? NV ph? trách</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.assigned_to_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">?? K?t n?i t?</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${createdDate ? formatDateTime(c.created_at) : '—'}</div>
                    </div>
                </div>
            </div>
            ${(c.referrer_name || c.referrer_customer_name) ? `
                <div style="margin-top:10px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:8px;border:1px solid #bfdbfe;font-size:13px;">
                    <strong style="color:#1e40af;">?? Ngu?i GT:</strong> 
                    <span style="cursor:pointer;text-decoration:underline;color:#3b82f6;font-weight:600;" onclick="_kocOpenAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>
                    ${(c.referrer_user_crm_type || c.referrer_crm_type) ? ` · <span style="color:#64748b;">${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</span>` : ''}
                </div>
            ` : ''}
        </div>
        ${holidays.length > 0 ? '<div style="margin-top:8px;font-size:12px;"><strong>Ngày l?:</strong> ' + holidays.map(h => h.name + ' (' + h.date + ')').join(', ') + '</div>' : ''}
    `;

    // Tab: L?ch S? (grouped by month)
    const historyTab = `
        <div style="max-height:350px;overflow-y:auto;">
            ${_kocBuildGroupedHistoryHTML(logs)}
        </div>
    `;

    // Tab: Ðon Hàng (using shared helper)
    const orderTab = _kocBuildOrderCardHTML(orderCodes, orders, c, cdTotalDeposit);

    const bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <span class="cdtab-btn" onclick="_kocSwitchCDTab('info')" id="cdtab-info-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:var(--gold);color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">?? Thông Tin</span>
            <span class="cdtab-btn" onclick="_kocSwitchCDTab('history')" id="cdtab-history-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">?? L?ch S? (${logs.length})</span>
            <span class="cdtab-btn" onclick="_kocSwitchCDTab('orders')" id="cdtab-orders-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">?? Ðon Hàng</span>
        </div>
        <div id="cdtab-info">${infoTab}</div>
        <div id="cdtab-history" style="display:none;">${historyTab}</div>
        <div id="cdtab-orders" style="display:none;">${orderTab}</div>
    `;

    // Determine last consultation type for button label
    const lastLog = logs.length > 0 ? logs[0] : null;
    const lastConsultType = lastLog ? KOC_CONSULT_TYPES[lastLog.log_type] : null;
    const consultBtnLabel = lastConsultType ? `${lastConsultType.icon} ${lastConsultType.label}` : '?? TU V?N';
    const consultBtnColor = lastConsultType ? lastConsultType.color : '';

    const consultBtnTextColor = lastConsultType?.textColor || 'white';

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Ðóng</button>
        ${!c.cancel_requested && !c.cancel_approved ? `
            <button class="btn btn-primary" onclick="closeModal();_kocOpenConsultModal(${customerId});" style="width:auto;${consultBtnColor ? 'background:' + consultBtnColor + ';color:' + consultBtnTextColor + ';' : ''}">${consultBtnLabel}</button>
        ` : ''}
    `;

    openModal(``, bodyHTML, footerHTML);
}

function _kocSwitchCDTab(tab) {
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
const KOC_CRM_LABELS_AFF = { nhu_cau: 'Cham Sóc KH Nhu C?u', ctv: 'Cham Sóc CTV', tu_tim_kiem: 'CRM T? Tìm Ki?m', goi_hop_tac: 'CRM G?i Ði?n H?p Tác', goi_ban_hang: 'CRM G?i Ði?n Bán Hàng', koc_tiktok: 'CRM KOL/KOC Tiktok' };
const KOC_ROLE_LABELS_AFF = { giam_doc:'Giám Ð?c', quan_ly_cap_cao:'Qu?n Lý C?p Cao', quan_ly:'Qu?n Lý', truong_phong:'Tru?ng Phòng', nhan_vien:'Nhân Viên', part_time:'Part Time', hoa_hong:'Hoa H?ng', ctv:'CTV', nuoi_duong:'Nuôi Du?ng', sinh_vien:'Sinh Viên', tkaffiliate:'TK Affiliate' };

async function _kocOpenAffiliateDetail(userId) {
    if (!userId) return;
    try {
        const [userData, countData] = await Promise.all([
            apiCall(`/api/users/${userId}`),
            apiCall(`/api/customers?referrer_id_count=${userId}`)
        ]);
        const u = userData.user;
        if (!u) { showToast('Không tìm th?y tài kho?n', 'error'); return; }

        const totalReferrals = countData.totalReferrals || 0;
        const createdAt = u.created_at ? new Date(u.created_at) : null;
        const daysCooperation = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : 0;
        const isGD = currentUser.role === 'giam_doc';
        const isLocked = u.status === 'locked';
        const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

        const statusColor = isLocked ? '#ef4444' : '#22c55e';
        const statusText = isLocked ? '?? Ðã d?ng h?p tác' : '? Ðang h?p tác';
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
                        <div style="font-size:11px;color:#3b82f6;font-weight:600;margin-top:4px;">Ngu?i gi?i thi?u</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fefce8,#fef3c7);border-radius:12px;padding:14px;text-align:center;border:1px solid #fde68a;">
                        <div style="font-size:28px;font-weight:800;color:#92400e;line-height:1;">${daysCooperation}</div>
                        <div style="font-size:11px;color:#d97706;font-weight:600;margin-top:4px;">Ngày h?p tác</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:14px;text-align:center;border:1px solid #bbf7d0;">
                        <div style="font-size:14px;font-weight:800;color:#166534;line-height:1.2;">${createdAt ? createdAt.toLocaleDateString('vi-VN') : '—'}</div>
                        <div style="font-size:11px;color:#16a34a;font-weight:600;margin-top:4px;">Ngày b?t d?u</div>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="padding:6px 24px 20px;">
                    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">?? S? di?n tho?i</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.phone || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">?? Lo?i CRM</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${KOC_CRM_LABELS_AFF[u.source_crm_type] || u.source_crm_type || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">????? NV Qu?n lý</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.manager_name || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">??? Vai trò</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${KOC_ROLE_LABELS_AFF[u.role] || u.role}</div>
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
                footerHTML += `<button class="btn" onclick="_kocToggleAffiliateStatus(${u.id}, 'active')" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(34,197,94,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">?? Ti?p t?c h?p tác</button>`;
            } else {
                footerHTML += `<button class="btn" onclick="_kocToggleAffiliateStatus(${u.id}, 'locked')" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(239,68,68,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">?? D?ng h?p tác</button>`;
            }
            footerHTML += `<button class="btn" onclick="_kocOpenEditAffiliateFromCrm(${u.id})" style="background:linear-gradient(135deg,#fad24c,#f59e0b);color:#0f172a;padding:10px 22px;border-radius:10px;font-weight:600;border:none;box-shadow:0 2px 8px rgba(250,210,76,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">?? S?a tài kho?n</button>`;
        }

        openModal(``, bodyHTML, footerHTML);
    } catch (err) {
        console.error('Affiliate detail error:', err);
        showToast('L?i t?i thông tin affiliate', 'error');
    }
}

async function _kocToggleAffiliateStatus(userId, newStatus) {
    try {
        const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: newStatus });
        if (data.success) {
            showToast(`? ${data.message}`);
            closeModal();
            // Re-open to refresh data
            _kocOpenAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('L?i c?p nh?t tr?ng thái', 'error');
    }
}

async function _kocOpenEditAffiliateFromCrm(userId) {
    try {
        const userData = await apiCall(`/api/users/${userId}`);
        const u = userData.user;
        if (!u) { showToast('Không tìm th?y tài kho?n', 'error'); return; }

        const bodyHTML = `
            <form id="editAffCrmForm" style="max-width:500px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div class="form-group">
                        <label>H? tên</label>
                        <input type="text" id="eafFullName" class="form-control" value="${u.full_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>SÐT</label>
                        <input type="text" id="eafPhone" class="form-control" value="${u.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Ð?a ch?</label>
                        <input type="text" id="eafAddress" class="form-control" value="${u.address || ''}">
                    </div>
                    <div class="form-group">
                        <label>T?nh/TP</label>
                        <input type="text" id="eafProvince" class="form-control" value="${u.province || ''}">
                    </div>
                    <div class="form-group">
                        <label>Ngân hàng</label>
                        <input type="text" id="eafBankName" class="form-control" value="${u.bank_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>S? TK</label>
                        <input type="text" id="eafBankAccount" class="form-control" value="${u.bank_account || ''}">
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label>Ch? TK</label>
                        <input type="text" id="eafBankHolder" class="form-control" value="${u.bank_holder || ''}">
                    </div>
                </div>
            </form>
        `;

        const footerHTML = `<button class="btn" onclick="_kocSubmitEditAffFromCrm(${u.id})" style="background:var(--gold);color:#122546;padding:8px 24px;border-radius:8px;font-weight:600;">?? Luu thay d?i</button>`;

        openModal(`?? S?a TK Affiliate: ${u.full_name}`, bodyHTML, footerHTML);
    } catch (err) {
        showToast('L?i t?i thông tin', 'error');
    }
}

async function _kocSubmitEditAffFromCrm(userId) {
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
        showToast('SÐT ph?i dúng 10 ch? s?', 'error');
        return;
    }

    try {
        const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
        if (data.success) {
            showToast('? C?p nh?t thành công!');
            closeModal();
            _kocOpenAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('L?i c?p nh?t', 'error');
    }
}
