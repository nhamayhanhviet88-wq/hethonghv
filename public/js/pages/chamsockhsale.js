// PUBLIC/JS/PAGES/CHAMSOCKHSALE.JS
// CRM pipeline dashboard for BỘ PHẬN SALE

var _saleActiveCat = null; 
var _saleAllCustomers = []; 
var _saleAllStats = {}; 
var _salePendingCtvIds = []; 
var _saleAffPendingIds = []; 
var _saleAffApprovedIds = []; 
var _saleAffLockedIds = []; 
var _saleAffApprovedMap = {}; 
var _saleCurrentPage = 1;
var _salePageSize = 50;
var _saleDatePreset = 'all';
var _saleDateFrom = '';
var _saleDateTo = '';
var _saleSelectedYear = new Date().getFullYear();
var _saleSidebarUsers = [];
var _saleSidebarDepts = [];
var _saleSidebarSelectedUserId = null;
var _saleIsManager = false;

var _saleConsultTypes = {
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
    khong_xu_ly: { label: 'Không Xử Lý', icon: '⚠️', color: '#ef4444', textColor: 'white' },
    tao_tk_affiliate: { label: 'Đã Tạo TK Affiliate', icon: '🔑', color: '#8b5cf6', textColor: 'white' },
    huy_don_tra_coc: { label: 'Hủy Đơn Trả Cọc', icon: '🚫', color: '#7c3aed', textColor: 'white' },
    da_huy_don_tra_coc: { label: 'Đã Hủy Đơn Trả Cọc', icon: '🚫', color: '#991b1b', textColor: 'white' },
    cho_duyet_huy_don: { label: 'Chờ Duyệt Hủy Đơn', icon: '⏳', color: '#9333ea', textColor: 'white' },
    gui_lai_so: { label: 'Gửi Lại Số', icon: '🔄', color: '#d97706', textColor: 'white' },
};

async function _saleSyncConsultTypes() {
    try {
        const data = await apiCall('/api/consult-types?crm_menu=sale');
        if (data.types && Array.isArray(data.types)) {
            for (const t of data.types) {
                if (!t.key || !t.is_active) continue;
                _saleConsultTypes[t.key] = {
                    label: t.label || t.key,
                    icon: t.icon || '📋',
                    color: t.color || '#6b7280',
                    textColor: t.text_color || 'white',
                    maxAppointmentDays: t.max_appointment_days || 0
                };
            }
        }
    } catch(e) {}
}

async function renderChamsockhsalePage(container) {
    window._saleReloadCurrentPage = () => _saleLoadData();
    window._saleRenderCurrentTable = () => _saleRenderFilteredTable();
    _saleIsManager = ['giam_doc', 'quan_ly', 'quan_ly_cap_cao', 'truong_phong'].includes(currentUser.role);

    if (_saleIsManager) {
        const [staffRes, deptsRes] = await Promise.all([
            apiCall('/api/managed-staff'),
            apiCall('/api/departments')
        ]);
        _saleSidebarUsers = (staffRes.users || []).filter(u => ['nhan_vien', 'truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(u.role));
        _saleSidebarDepts = deptsRes.departments || deptsRes || [];
        if (['quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role)) {
            _saleSidebarSelectedUserId = currentUser.id;
        } else {
            _saleSidebarSelectedUserId = null;
        }
    }

    const sidebarHTML = _saleIsManager ? `
        <div id="saleSidebar" style="width:260px;min-width:260px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-right:1.5px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:14px;border-bottom:1.5px solid #e2e8f0;">
                <h4 style="margin:0;color:#122546;font-size:14px;font-weight:800;">💼 Bộ Phận Sale</h4>
            </div>
            <div id="saleSidebarList" style="flex:1;overflow:auto;padding:8px;"></div>
        </div>` : '';

    container.innerHTML = `
        <div style="display:flex;height:calc(100vh - 120px);gap:0;">
        ${sidebarHTML}
        <div id="saleMainContent" style="flex:1;overflow:auto;padding:16px 20px;">
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
            <a href="/quytacnuttuvancrmsale" onclick="event.preventDefault();navigate('quytacnuttuvancrmsale')"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;
                border:2px solid #f97316;color:#f97316;font-size:13px;font-weight:800;cursor:pointer;
                background:rgba(249,115,22,.08);text-decoration:none;transition:all .2s;"
                onmouseover="this.style.background='rgba(249,115,22,.18)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.background='rgba(249,115,22,.08)';this.style.transform=''">
                ⚙️ Quy Tắc Nút Tư Vấn
            </a>
        </div>
        <div class="crm-stat-cards" id="saleStatCards">
            <div class="crm-stat-card" data-cat="phai_xu_ly" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;" onclick="_saleFilterByCat('phai_xu_ly')">
                <div class="stat-icon">🔥</div>
                <div class="stat-count" id="saleStatPhaiXuLy">0</div>
                <div class="stat-label">Phải xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="da_xu_ly" style="background:linear-gradient(135deg,#10b981,#059669);color:white;" onclick="_saleFilterByCat('da_xu_ly')">
                <div class="stat-icon">✅</div>
                <div class="stat-count" id="saleStatDaXuLy">0</div>
                <div class="stat-label">Đã xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="xu_ly_tre" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;" onclick="_saleFilterByCat('xu_ly_tre')">
                <div class="stat-icon">⚠️</div>
                <div class="stat-count" id="saleStatXuLyTre">0</div>
                <div class="stat-label">Khách xử lý trễ</div>
            </div>
            <div class="crm-stat-card" data-cat="cho_xu_ly" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="_saleFilterByCat('cho_xu_ly')">
                <div class="stat-icon">⏳</div>
                <div class="stat-count" id="saleStatChoXuLy">0</div>
                <div class="stat-label">Chờ xử lý</div>
            </div>
            <div class="crm-stat-card" data-cat="huy_khach" style="background:linear-gradient(135deg,#6b7280,#4b5563);color:white;" onclick="_saleFilterByCat('huy_khach')">
                <div class="stat-icon">🚫</div>
                <div class="stat-count" id="saleStatHuyKhach">0</div>
                <div class="stat-label">Hủy khách</div>
            </div>
            <div class="crm-stat-card" data-cat="gui_hang_hoan_thanh" style="background:linear-gradient(135deg,#0d9488,#0f766e);color:white;" onclick="_saleFilterByCat('gui_hang_hoan_thanh')">
                <div class="stat-icon">📦✅</div>
                <div class="stat-count" id="saleStatGuiHangHT">0</div>
                <div class="stat-label">Gửi Hàng & Hoàn Thành</div>
            </div>
        </div>
        <div id="saleDateChipsArea"></div>

        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <select id="saleFilterConsultType" class="form-control" style="width:auto;min-width:200px;" onchange="_saleRenderFilteredTable()">
                <option value="">Tất cả trạng thái</option>
            </select>
            <input type="text" id="saleSearch" class="form-control" placeholder="🔍 Tìm tên hoặc SĐT..." style="width:auto;min-width:200px;">
        </div>

        <div class="card">
            <div class="card-body" style="overflow-x:auto; padding:8px;">
                <table class="table" id="saleTable">
                    <thead><tr>
                        <th style="min-width:30px;text-align:center;padding:4px 2px" title="Pin khách">📌</th>
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
                        <th style="min-width:110px">Link KH</th>
                        <th style="min-width:130px">Địa Chỉ</th>
                        <th style="min-width:100px">Nguồn</th>
                        <th style="min-width:70px;text-align:center">Lần Đặt</th>
                        <th style="min-width:110px;text-align:right">Doanh Số</th>
                        <th style="min-width:40px;text-align:center" title="Đề Xuất CTV">🔄</th>
                    </tr></thead>
                    <tbody id="saleTbody"><tr><td colspan="17" style="text-align:center;padding:40px;">⏳ Đang tải...</td></tr></tbody>
                </table>
                <div id="salePagination" class="crm-pagination"></div>
            </div>
        </div>
        </div></div>
    `;

    const dcArea = document.getElementById('saleDateChipsArea');
    if (dcArea) dcArea.innerHTML = _saleBuildDateFilterHTML();

    if (_saleIsManager) _saleRenderSidebar();

    document.getElementById('saleFilterConsultType').addEventListener('change', () => _saleRenderFilteredTable());
    let st;
    document.getElementById('saleSearch').addEventListener('input', () => { 
        clearTimeout(st); 
        st = setTimeout(_saleLoadData, 400); 
    });

    await _saleLoadData();

    if (!sessionStorage.getItem('_tkkhNavDone')) {
        _saleActiveCat = null;
        _saleFilterByCat('phai_xu_ly');
    } else {
        sessionStorage.removeItem('_tkkhNavDone');
    }
}

function _saleFilterByCat(cat) {
    if (_saleActiveCat === cat) { _saleActiveCat = null; } else { _saleActiveCat = cat; }
    _saleCurrentPage = 1;
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    const cardsContainer = document.getElementById('saleStatCards');
    if (_saleActiveCat) {
        const el = document.querySelector('.crm-stat-card[data-cat="' + _saleActiveCat + '"]');
        if (el) el.classList.add('active');
        if (cardsContainer) cardsContainer.classList.add('has-active');
    } else {
        if (cardsContainer) cardsContainer.classList.remove('has-active');
    }
    _saleUpdateConsultTypeDropdown();
    _saleRenderFilteredTable();
}

function _saleIsBirthdayToday(bdayStr) {
    if (!bdayStr) return false;
    const parts = bdayStr.split('/');
    if (parts.length < 2) return false;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const now = new Date();
    return now.getDate() === day && (now.getMonth() + 1) === month;
}

function _saleGetCategory(c, stats) {
    if (c.cancel_requested === 1 && c.cancel_approved === 0) return 'da_xu_ly';
    if (c.order_status === 'cho_duyet_huy_don') return 'da_xu_ly';
    if (c.cancel_approved === 1) return 'huy_khach';

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const s = stats[c.id] || {};

    let consultedToday = false;
    if (s.lastLog && s.lastLog.created_at && s.lastLog.log_type !== 'chuyen_doi_crm' && s.lastLog.log_type !== 'tao_tk_affiliate' && s.lastLog.log_type !== 'gui_lai_so') {
        const content = s.lastLog.content || '';
        const isAutoPancakeLog = (s.lastLog.logged_by === null || !s.lastLog.logged_by) && (content.includes('Pancake') || content.includes('Đồng bộ'));
        if (!isAutoPancakeLog) {
            const logDate = new Date(s.lastLog.created_at);
            const logStr = logDate.getFullYear() + '-' + String(logDate.getMonth()+1).padStart(2,'0') + '-' + String(logDate.getDate()).padStart(2,'0');
            consultedToday = (logStr === todayStr);
        }
    }

    if (consultedToday) return 'da_xu_ly';

    let appointIsToday = false;
    let appointIsFuture = false;
    if (c.appointment_date) {
        const apptDate = new Date(c.appointment_date);
        const apptStr = apptDate.getFullYear() + '-' + String(apptDate.getMonth()+1).padStart(2,'0') + '-' + String(apptDate.getDate()).padStart(2,'0');
        appointIsToday = (apptStr === todayStr);
        appointIsFuture = (apptStr > todayStr);
    }

    const isBirthdayToday = _saleIsBirthdayToday(c.birthday);

    let createdToday = false;
    if (c.created_at) {
        const cDate = new Date(c.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        createdToday = (cStr === todayStr);
    }

    if (createdToday) return 'phai_xu_ly';
    if (appointIsToday || isBirthdayToday) return 'phai_xu_ly';
    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';
    if (appointIsFuture) return 'cho_xu_ly';

    return 'cho_xu_ly';
}

function _saleUpdateConsultTypeDropdown(filteredList) {
    const sel = document.getElementById('saleFilterConsultType');
    if (!sel) return;
    const prevVal = sel.value;

    let custs = filteredList || _saleAllCustomers;
    if (!filteredList && _saleActiveCat) {
        custs = _saleAllCustomers.filter(c => _saleGetCategory(c, _saleAllStats) === _saleActiveCat);
    }

    const typeCounts = {};
    let noLogCount = 0;
    custs.forEach(c => {
        const s = _saleAllStats[c.id] || {};
        if (s.lastLog && s.lastLog.log_type) {
            const lt = s.lastLog.log_type;
            typeCounts[lt] = (typeCounts[lt] || 0) + 1;
        } else {
            noLogCount++;
        }
    });

    let html = '<option value="">Tất cả trạng thái (' + custs.length + ')</option>';
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([key, count]) => {
        const t = _saleConsultTypes[key];
        if (t) {
            html += '<option value="' + key + '">' + t.icon + ' ' + t.label + ' (' + count + ')</option>';
        }
    });
    if (noLogCount > 0) {
        html += '<option value="__none__">📋 Chưa tư vấn (' + noLogCount + ')</option>';
    }
    sel.innerHTML = html;

    if (prevVal) {
        const exists = [...sel.options].some(o => o.value === prevVal);
        if (exists) sel.value = prevVal;
    }
}

function _saleGetDateRange() {
    const today = new Date();
    let from = '', to = '';
    if (_saleDatePreset === 'today') {
        const str = today.toISOString().split('T')[0];
        from = str; to = str;
    } else if (_saleDatePreset === 'yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const str = yest.toISOString().split('T')[0];
        from = str; to = str;
    } else if (_saleDatePreset === 'this_month') {
        const y = today.getFullYear(), m = today.getMonth();
        from = `${y}-${String(m+1).padStart(2,'0')}-01`;
        to = new Date(y, m + 1, 0).toISOString().split('T')[0];
    } else if (_saleDatePreset === 'last_month') {
        const y = today.getFullYear(), m = today.getMonth() - 1;
        const d = new Date(y, m, 1);
        from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (_saleDatePreset === 'custom') {
        from = _saleDateFrom;
        to = _saleDateTo;
    }
    return { from, to };
}

function _saleBuildDateFilterHTML() {
    const presets = [
        { id: 'all', label: 'Tất cả' },
        { id: 'today', label: 'Hôm nay' },
        { id: 'yesterday', label: 'Hôm qua' },
        { id: 'this_month', label: 'Tháng này' },
        { id: 'last_month', label: 'Tháng trước' },
        { id: 'custom', label: 'Tự chọn' }
    ];

    let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;font-family:'Segoe UI',system-ui,sans-serif;">
        <span style="font-weight:700;color:#64748b;font-size:13px;" id="saleDateFilterLabel">📅 Lọc theo ngày:</span>
        <div style="display:flex;gap:4px;background:#f1f5f9;padding:3px;border-radius:8px;border:1.5px solid #e2e8f0;">`;

    presets.forEach(p => {
        const active = _saleDatePreset === p.id;
        html += `<button onclick="_saleSwitchDatePreset('${p.id}')" style="border:none;background:${active ? '#fff' : 'transparent'};color:${active ? '#1e293b' : '#64748b'};font-size:12px;font-weight:${active ? '700' : '500'};padding:5px 12px;border-radius:6px;cursor:pointer;box-shadow:${active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};transition:all 0.15s;">${p.label}</button>`;
    });

    html += `</div>`;

    if (_saleDatePreset === 'all') {
        html += `<select id="saleDateYear" class="form-control" style="width:auto;padding:4px 8px;font-size:12px;height:30px;border-radius:6px;" onchange="_saleChangeYear(this.value)">
            <option value="2026" ${_saleSelectedYear === 2026 ? 'selected' : ''}>Năm 2026</option>
            <option value="2025" ${_saleSelectedYear === 2025 ? 'selected' : ''}>Năm 2025</option>
            <option value="2024" ${_saleSelectedYear === 2024 ? 'selected' : ''}>Năm 2024</option>
        </select>`;
    } else if (_saleDatePreset === 'custom') {
        html += `<div style="display:flex;align-items:center;gap:6px;">
            <input type="date" id="saleDateFrom" class="form-control" style="width:auto;height:30px;padding:4px 8px;font-size:12px;border-radius:6px;" value="${_saleDateFrom}" onchange="_saleApplyCustomDate()">
            <span style="color:#94a3b8;font-size:12px;">đến</span>
            <input type="date" id="saleDateTo" class="form-control" style="width:auto;height:30px;padding:4px 8px;font-size:12px;border-radius:6px;" value="${_saleDateTo}" onchange="_saleApplyCustomDate()">
        </div>`;
    }

    html += `<span id="saleDateFilterCount" style="font-size:12px;font-weight:700;color:#3b82f6;margin-left:auto;"></span></div>`;
    return html;
}

function _saleSwitchDatePreset(preset) {
    _saleDatePreset = preset;
    _saleCurrentPage = 1;
    if (preset !== 'custom') {
        _saleDateFrom = '';
        _saleDateTo = '';
    }
    const dcArea = document.getElementById('saleDateChipsArea');
    if (dcArea) dcArea.innerHTML = _saleBuildDateFilterHTML();
    _saleRenderFilteredTable();
}

function _saleChangeYear(yr) {
    _saleSelectedYear = parseInt(yr);
    _saleRenderFilteredTable();
}

function _saleApplyCustomDate() {
    _saleDateFrom = document.getElementById('saleDateFrom')?.value || '';
    _saleDateTo = document.getElementById('saleDateTo')?.value || '';
    _saleRenderFilteredTable();
}

function _saleRenderFilteredTable() {
    const customers = _saleAllCustomers;
    const stats = _saleAllStats;
    const tbody = document.getElementById('saleTbody');
    if (!tbody) return;

    let filtered = customers;
    if (_saleActiveCat) {
        filtered = customers.filter(c => _saleGetCategory(c, stats) === _saleActiveCat);
    }

    const dr = _saleGetDateRange();
    if (dr.from && dr.to) {
        filtered = filtered.filter(c => {
            let dateField;
            if (_saleActiveCat === 'cho_xu_ly' || _saleActiveCat === 'xu_ly_tre') dateField = c.appointment_date;
            else if (_saleActiveCat === 'huy_khach') dateField = c.cancel_approved_at || c.created_at;
            else dateField = c.created_at;
            if (!dateField) return true;
            const dStr = new Date(dateField).toISOString().split('T')[0];
            return dStr >= dr.from && dStr <= dr.to;
        });
    } else if (_saleDatePreset === 'all' && _saleSelectedYear) {
        filtered = filtered.filter(c => {
            let dateField;
            if (_saleActiveCat === 'cho_xu_ly' || _saleActiveCat === 'xu_ly_tre') dateField = c.appointment_date;
            else if (_saleActiveCat === 'huy_khach') dateField = c.cancel_approved_at || c.created_at;
            else dateField = c.created_at;
            if (!dateField) return true;
            return new Date(dateField).getFullYear() === _saleSelectedYear;
        });
    }

    const dcArea = document.getElementById('saleDateChipsArea');
    if (dcArea) dcArea.innerHTML = _saleBuildDateFilterHTML();

    _saleUpdateConsultTypeDropdown(filtered);

    const consultTypeVal = document.getElementById('saleFilterConsultType')?.value;
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

    filtered = [...filtered].sort((a, b) => {
        const pinA = a.is_pinned ? 1 : 0;
        const pinB = b.is_pinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        if (pinA && pinB) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);

        if (_saleActiveCat === 'huy_khach') {
            const dateA = a.cancel_approved_at || a.created_at;
            const dateB = b.cancel_approved_at || b.created_at;
            return new Date(dateB || 0) - new Date(dateA || 0);
        }

        const dateA = a.appointment_date;
        const dateB = b.appointment_date;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA) - new Date(dateB);
    });

    const countEl = document.getElementById('saleDateFilterCount');
    if (countEl) {
        countEl.textContent = 'Kết quả: ' + filtered.length;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="17"><div class="empty-state"><div class="icon">📭</div><h3>Không có khách hàng</h3></div></td></tr>`;
        document.getElementById('salePagination').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filtered.length / _salePageSize);
    if (_saleCurrentPage > totalPages) _saleCurrentPage = totalPages;
    const startIdx = (_saleCurrentPage - 1) * _salePageSize;
    const paged = filtered.slice(startIdx, startIdx + _salePageSize);

    tbody.innerHTML = paged.map((c, idx) => _saleRenderCustomerRow(c, stats, startIdx + idx + 1)).join('');

    const pgEl = document.getElementById('salePagination');
    if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
    let pgHtml = '<button ' + (_saleCurrentPage <= 1 ? 'disabled' : '') + ' onclick="_saleGoToPage(' + (_saleCurrentPage - 1) + ')">◀</button>';
    for (let p = 1; p <= totalPages; p++) {
        pgHtml += '<button class="' + (p === _saleCurrentPage ? 'active' : '') + '" onclick="_saleGoToPage(' + p + ')">' + p + '</button>';
    }
    pgHtml += '<button ' + (_saleCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="_saleGoToPage(' + (_saleCurrentPage + 1) + ')">▶</button>';
    pgHtml += '<span class="pg-info">' + (startIdx+1) + '–' + Math.min(startIdx + _salePageSize, filtered.length) + ' / ' + filtered.length + '</span>';
    pgEl.innerHTML = pgHtml;
}

function _saleGoToPage(page) {
    _saleCurrentPage = page;
    _saleRenderFilteredTable();
    document.getElementById('saleTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _saleRenderCustomerRow(c, stats, stt) {
    const s = stats[c.id] || { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0 };
    const OVERRIDE_STATUSES = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    let lastType = s.lastLog ? _saleConsultTypes[s.lastLog.log_type] : null;
    if (OVERRIDE_STATUSES.includes(c.order_status) && _saleConsultTypes[c.order_status]) {
        lastType = _saleConsultTypes[c.order_status];
    }
    let lastContent = s.lastLog?.content || '';
    if (lastContent && lastType) {
        lastContent = lastContent.replace(/^(?:✅|🏥|📦|💵|📝|📢|🚨|🚫|❌|🔧|🎨|👔|📄|🤝|💬|📞|✔️)?\s*(?:Tư vấn Sếp|Cấp cứu hoàn thành|Chốt đơn|Đặt cọc|Sau bán hàng|Hoàn Thành Cấp Cứu|Cấp Cứu Sếp)[:\s]+/i, '').trim();
    }
    const shortContent = lastContent.length > 30 ? lastContent.substring(0, 30) + '...' : lastContent;

    let appointDisplay = '';
    if (c.appointment_date) {
        const d = new Date(c.appointment_date);
        const days = ['CN','T2','T3','T4','T5','T6','T7'];
        appointDisplay = `<span style="color:#e65100;font-weight:600">${days[d.getDay()]} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</span>`;
    }

    const _pinClass = c.is_pinned ? ' crm-row-pinned' : '';
    const canEditCrm = canDo('sale', 'edit');

    return `<tr class="${_pinClass}" data-customer-id="${c.id}">
        <td style="text-align:center;padding:4px 2px;">
            ${!c.readonly && canEditCrm ? `<span class="crm-pin-btn ${c.is_pinned ? 'active' : ''}" onclick="event.stopPropagation();_saleTogglePin(${c.id})" title="${c.is_pinned ? 'Bỏ pin' : 'Pin khách'}">${c.is_pinned ? '📌' : '<span style="opacity:0.3">📌</span>'}</span>` : ''}
        </td>
        <td style="text-align:center;font-weight:700;color:#64748b;font-size:12px;">${stt || ''}</td>
        <td style="font-size:12px;font-weight:600;">${c.assigned_to_name || '<span style="color:var(--gray-500)">—</span>'}</td>
        <td style="font-size:11px;font-weight:700;color:#e65100;cursor:pointer;" onclick="openOrderCodesPopup(${c.id})">${s.latestOrderCode || '—'}</td>
        <td>
            ${c.readonly || !canEditCrm ? (
                (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-700);color:var(--gray-400);opacity:0.6;cursor:not-allowed;">
                    ⏳ ${c.order_status === 'cho_duyet_huy_don' ? 'Chờ Duyệt Hủy Đơn' : 'Chờ Duyệt Hủy'}
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
                    ⏳ ${c.order_status === 'cho_duyet_huy_don' ? 'Chờ Duyệt Hủy Đơn' : 'Chờ Duyệt Hủy'}
                </button>
            ` : (c.cancel_approved === -2) ? `
                <button class="btn btn-sm consult-btn" onclick="_saleOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:#dc2626;color:white;animation:emBlink 2s infinite;">
                    ❌ Hủy Khách
                </button>
            ` : (c.cancel_approved === -1) ? `
                <button class="btn btn-sm consult-btn" onclick="_saleOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};animation:emBlink 2s infinite;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </button>
            ` : `
                <button class="btn btn-sm consult-btn" onclick="_saleOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </button>
            `}
        </td>
        <td style="font-size:12px;color:#e65100;font-weight:600;cursor:pointer;" onclick="_saleOpenCustomerDetail(${c.id}).then(()=>setTimeout(()=>_saleSwitchCDTab('history'),100))" title="${lastContent}">
            ${shortContent || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.consultCount || 0}</td>
        <td style="font-size:12px;">
            ${appointDisplay || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td><strong style="color:#e65100">${getCustomerCode(c)}</strong><br>${getCustomerUidBadge(c)}</td>
        <td>
            ${!c.readonly && canEditCrm ? '<button class="btn btn-sm" onclick="event.stopPropagation();_saleOpenCustomerInfo(' + c.id + ')" style="font-size:9px;padding:1px 5px;margin-right:4px;background:var(--gray-700);color:var(--gold);" title="Cập nhật thông tin">✏️</button>' : ''}
            ${(() => {
                const _colors = [
                    {bg:'rgba(239,68,68,0.12)',text:'#dc2626',border:'rgba(239,68,68,0.25)'},
                    {bg:'rgba(249,115,22,0.12)',text:'#ea580c',border:'rgba(249,115,22,0.25)'},
                    {bg:'rgba(234,179,8,0.12)',text:'#ca8a04',border:'rgba(234,179,8,0.25)'},
                    {bg:'rgba(34,197,94,0.12)',text:'#16a34a',border:'rgba(34,197,94,0.25)'},
                    {bg:'rgba(20,184,166,0.12)',text:'#0d9488',border:'rgba(20,184,166,0.25)'},
                ];
                const _ci = (c.id || 0) % _colors.length;
                const _cc = _colors[_ci];
                const _bdayIcon = _saleIsBirthdayToday(c.birthday) ? '🎂🎉 ' : '';
                return `<span onclick="_saleOpenCustomerDetail(${c.id})" style="cursor:pointer;display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${_cc.bg};color:${_cc.text};border:1px solid ${_cc.border};transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.boxShadow='0 2px 8px ${_cc.border}'" onmouseout="this.style.boxShadow='none'">${_bdayIcon}${c.customer_name}</span><span onclick="event.stopPropagation();_crmCopyText('${c.customer_name.replace(/'/g, "\\'")}',this,'Tên')" style="cursor:pointer;font-size:11px;color:#94a3b8;margin-left:4px;transition:color 0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#94a3b8'" title="Copy tên">📋</span>`;
            })()}
        </td>
        <td>${(() => {
            const hasRealPhone = c.phone && !c.phone.startsWith('pancake_');
            if (!hasRealPhone) return '';
            const copyBtn = !c.readonly ? `<span onclick="event.stopPropagation();_crmCopyText('${c.phone}',this,'SĐT')" style="cursor:pointer;font-size:11px;color:#94a3b8;margin-left:4px;transition:color 0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#94a3b8'" title="Copy SĐT">📋</span>` : '';
            const phoneEl = c.readonly ? `<span style="color:var(--gray-400)">${c.phone}</span>` : `<a href="tel:${c.phone}" style="color:var(--info)">${c.phone}</a>`;
            return phoneEl + copyBtn;
        })()}</td>
        <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.facebook_link ? '<a href="' + c.facebook_link + '" target="_blank" style="color:#1877F2;font-weight:600;" title="' + c.facebook_link + '">🔗 FB</a>' : '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.address || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.source_name || '—'}</td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.chotDonCount}</td>
        <td style="text-align:right;font-weight:700;color:var(--success);font-size:14px;">${s.revenue > 0 ? formatCurrency(s.revenue) : '0'}</td>
        <td style="text-align:center;padding:4px 2px;">
            ${!c.readonly && canEditCrm && c.cancel_approved !== 1 ? (() => {
                if (_salePendingCtvIds.includes(c.id)) {
                    return `<span title="Đang chờ duyệt chuyển CRM" style="font-size:10px;padding:3px 8px;border-radius:6px;background:#fef3c7;color:#92400e;font-weight:700;white-space:nowrap;cursor:default;">⏳ Chờ CTV</span>`;
                }
                if (c.referrer_id && !s.latestOrderCode) {
                    return `<span title="🔒 Khách có nguồn giới thiệu từ Đối Tác — cần có đơn hàng mới được chuyển CRM" style="cursor:not-allowed;font-size:16px;opacity:0.35;">🔒</span>`;
                }
                return `<span onclick="event.stopPropagation();_saleOpenCrmTransferPopup(${c.id})" title="Đề Xuất Chuyển CRM" style="cursor:pointer;font-size:16px;opacity:0.5;transition:opacity .2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">🔄</span>`;
            })() : ''}
        </td>
    </tr>`;
}

async function _saleLoadData() {
    await _saleSyncConsultTypes();

    let url = '/api/customers?crm_type=sale';
    const search = document.getElementById('saleSearch')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (_saleSidebarSelectedUserId) url += `&employee_id=${_saleSidebarSelectedUserId}`;

    const data = await apiCall(url);
    const customers = data.customers || [];

    const ids = customers.map(c => c.id).join(',');
    let stats = {};
    if (ids) {
        const statsData = await apiCall(`/api/customers/consult-stats?customer_ids=${ids}`);
        stats = statsData.stats || {};
    }

    try {
        const pendingData = await apiCall('/api/crm-conversion/pending-customers');
        _salePendingCtvIds = (pendingData.customers || []).map(c => c.id);
    } catch(e) { _salePendingCtvIds = []; }

    try {
        const affStatus = await apiCall('/api/affiliate-account/batch-status');
        _saleAffPendingIds = affStatus.pendingCustomerIds || [];
        _saleAffApprovedIds = affStatus.approvedCustomerIds || [];
        _saleAffLockedIds = affStatus.lockedCustomerIds || [];
        _saleAffApprovedMap = affStatus.approvedMap || {};
    } catch(e) { 
        _saleAffPendingIds = []; 
        _saleAffApprovedIds = []; 
        _saleAffLockedIds = []; 
        _saleAffApprovedMap = {}; 
    }

    _saleAllCustomers = customers;
    _saleAllStats = stats;

    const counts = { phai_xu_ly: 0, da_xu_ly: 0, xu_ly_tre: 0, cho_xu_ly: 0, huy_khach: 0, gui_hang_hoan_thanh: 0 };
    customers.forEach(c => { 
        const cat = _saleGetCategory(c, stats); 
        if (counts[cat] !== undefined) counts[cat]++; 
    });

    const el = (id) => document.getElementById(id);
    if (el('saleStatPhaiXuLy')) el('saleStatPhaiXuLy').textContent = counts.phai_xu_ly;
    if (el('saleStatDaXuLy')) el('saleStatDaXuLy').textContent = counts.da_xu_ly;
    if (el('saleStatXuLyTre')) el('saleStatXuLyTre').textContent = counts.xu_ly_tre;
    if (el('saleStatChoXuLy')) el('saleStatChoXuLy').textContent = counts.cho_xu_ly;
    if (el('saleStatHuyKhach')) el('saleStatHuyKhach').textContent = counts.huy_khach;
    if (el('saleStatGuiHangHT')) el('saleStatGuiHangHT').textContent = counts.gui_hang_hoan_thanh;

    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    if (_saleActiveCat) {
        const activeEl = document.querySelector('.crm-stat-card[data-cat="' + _saleActiveCat + '"]');
        if (activeEl) activeEl.classList.add('active');
    }

    _saleUpdateConsultTypeDropdown();

    const targetId = sessionStorage.getItem('_tkkhTargetCustomer');
    if (targetId) {
        sessionStorage.removeItem('_tkkhTargetCustomer');
        const tid = parseInt(targetId);
        const targetCustomer = _saleAllCustomers.find(c => c.id === tid);
        if (targetCustomer) {
            const targetCat = _saleGetCategory(targetCustomer, _saleAllStats);
            _saleActiveCat = targetCat;
            
            document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
            const activeCard = document.querySelector('.crm-stat-card[data-cat="' + targetCat + '"]');
            if (activeCard) activeCard.classList.add('active');
            
            const cardsContainer = document.getElementById('saleStatCards');
            if (cardsContainer) cardsContainer.classList.add('has-active');
            
            _saleDatePreset = 'all';
            _saleSelectedYear = new Date().getFullYear();
            
            const ctFilter = document.getElementById('saleFilterConsultType');
            if (ctFilter) ctFilter.value = '';
            
            let filtered = _saleAllCustomers.filter(c => _saleGetCategory(c, _saleAllStats) === targetCat);
            filtered = [...filtered].sort((a, b) => {
                const pinA = a.is_pinned ? 1 : 0, pinB = b.is_pinned ? 1 : 0;
                if (pinA !== pinB) return pinB - pinA;
                if (pinA && pinB) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
                if (targetCat === 'huy_khach') return new Date((b.cancel_approved_at || b.created_at) || 0) - new Date((a.cancel_approved_at || a.created_at) || 0);
                const dA = a.appointment_date, dB = b.appointment_date;
                if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1;
                return new Date(dA) - new Date(dB);
            });
            
            const idxInFiltered = filtered.findIndex(c => c.id === tid);
            if (idxInFiltered >= 0) {
                _saleCurrentPage = Math.floor(idxInFiltered / _salePageSize) + 1;
            }
            _saleRenderFilteredTable();
            
            sessionStorage.setItem('_tkkhNavDone', '1');
            
            const _tryScroll = (attempts) => {
                const row = document.querySelector('tr[data-customer-id="' + tid + '"]');
                if (row) {
                    if (typeof _tkkhScrollToRow === 'function') _tkkhScrollToRow(tid);
                } else if (attempts > 0) {
                    setTimeout(() => _tryScroll(attempts - 1), 300);
                }
            };
            setTimeout(() => _tryScroll(3), 300);
        } else {
            showToast('🔍 Khách hàng không tìm thấy trong danh sách CRM này', 'info');
        }
    } else if (!_saleActiveCat) {
        _saleFilterByCat('phai_xu_ly');
    } else {
        _saleRenderFilteredTable();
    }
}

async function _saleTogglePin(customerId) {
    try {
        const res = await apiCall(`/api/customers/${customerId}/pin`, 'PATCH');
        if (res.success) {
            const c = _saleAllCustomers.find(x => x.id === customerId);
            if (c) {
                c.is_pinned = res.is_pinned;
                c.pinned_at = res.is_pinned ? new Date().toISOString() : null;
                if (res.next_appointment) c.appointment_date = res.next_appointment;
            }
            _saleRenderFilteredTable();
            showToast(res.message, res.is_pinned ? 'success' : 'info');
        } else {
            showToast(res.error || 'Lỗi!', 'error');
        }
    } catch(e) {
        showToast('Lỗi pin khách hàng!', 'error');
    }
}

function _saleRenderSidebar() {
    const list = document.getElementById('saleSidebarList');
    if (!list) return;

    const isAllActive = _saleSidebarSelectedUserId === null;
    const _isTP = currentUser.role === 'truong_phong';

    let topBtn = `<div onclick="_saleSelectSidebarUser(null)" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:10px;margin-bottom:10px;transition:all 0.15s;${isAllActive ? 'background:linear-gradient(135deg,#fad24c,#f59e0b);color:#122546;box-shadow:0 4px 12px rgba(250,210,76,0.3);font-weight:700;' : 'background:white;border:1.5px solid #e2e8f0;color:#374151;'}">
        <span style="font-size:20px;">👥</span>
        <div style="flex:1;">
            <div style="font-size:12px;font-weight:800;">Tổng Bộ Phận Sale</div>
            <div style="font-size:9px;opacity:0.7;">Xem tổng hợp tất cả NV</div>
        </div>
    </div>`;

    // Find "PHÒNG SALE" department (id = 4 or name contains "SALE")
    const saleDept = _saleSidebarDepts.find(d => d.id === 4) || 
                     _saleSidebarDepts.find(d => d.name && d.name.toUpperCase() === 'PHÒNG SALE') || 
                     _saleSidebarDepts.find(d => d.name && d.name.toUpperCase().includes('SALE') && !d.name.toUpperCase().includes('XƯỞNG') && d.parent_id !== 4);
    if (!saleDept) {
        list.innerHTML = topBtn + '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">Không tìm thấy Phòng Sale</div>';
        return;
    }

    // Collect all dept IDs under PHÒNG SALE (itself + child teams)
    const saleDeptIds = new Set([saleDept.id]);
    _saleSidebarDepts.forEach(d => {
        if (d.parent_id === saleDept.id) saleDeptIds.add(d.id);
    });

    // Filter users: only staff in Sale dept tree
    const excludeRoles = ['hoa_hong', 'ctv', 'tkaffiliate', 'nuoi_duong', 'sinh_vien'];
    let saleUsers = _saleSidebarUsers.filter(u => saleDeptIds.has(u.department_id) && !excludeRoles.includes(u.role));

    // Trưởng Phòng: only see their own team/members
    if (_isTP && currentUser.department_id) {
        saleUsers = saleUsers.filter(u => u.department_id === currentUser.department_id);
    }

    if (saleUsers.length === 0) {
        list.innerHTML = topBtn + '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">Không có NV trong Phòng Sale</div>';
        return;
    }

    // Helper functions for rendering
    function avatarColor(n) {
        let h = 0;
        for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
        return ['#3b82f6', '#059669', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#ec4899', '#6366f1'][Math.abs(h) % 8];
    }
    function initials(n) {
        if (!n) return '?';
        const p = n.trim().split(/\s+/);
        return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : n.substring(0, 2).toUpperCase();
    }
    function sortMembers(users) {
        const roleOrder = { giam_doc: 0, quan_ly_cap_cao: 1, quan_ly: 2, truong_phong: 3, nhan_vien: 4, part_time: 5 };
        return [...users].sort((a, b) => {
            const orderA = roleOrder[a.role] !== undefined ? roleOrder[a.role] : 99;
            const orderB = roleOrder[b.role] !== undefined ? roleOrder[b.role] : 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.full_name.localeCompare(b.full_name);
        });
    }
    function roleBadge(role) {
        const roleColors = { giam_doc: '#ef4444', quan_ly_cap_cao: '#f59e0b', quan_ly: '#3b82f6', truong_phong: '#8b5cf6', nhan_vien: '#10b981', part_time: '#6b7280' };
        const roleLabels = { giam_doc: 'GĐ', quan_ly_cap_cao: 'QLCC', quan_ly: 'QL', truong_phong: 'TP', nhan_vien: 'NV', part_time: 'PT' };
        const color = roleColors[role] || '#6b7280';
        const label = roleLabels[role] || role;
        return ` <span style="background:${color};color:white;font-size:8px;padding:1px 4px;border-radius:4px;font-weight:700;vertical-align:middle;margin-left:4px;text-transform:uppercase;">${label}</span>`;
    }

    function renderSidebarUser(u, indent) {
        const active = u.id === _saleSidebarSelectedUserId;
        const c = avatarColor(u.full_name || u.username);
        const deptMap = {};
        _saleSidebarDepts.forEach(d => { deptMap[d.id] = d.name; });
        const dName = deptMap[u.department_id] || '';
        const badge = roleBadge(u.role);
        return `<div onclick="_saleSelectSidebarUser(${u.id})" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:10px;margin-bottom:3px;margin-left:${indent}px;transition:all 0.15s;${active ? 'background:linear-gradient(135deg,#122546,#1e3a5f);color:white;box-shadow:0 4px 12px rgba(18,37,70,0.3);' : 'background:white;border:1px solid #e5e7eb;color:#374151;'}">
            <span style="background:${active ? 'rgba(255,255,255,0.2)' : c};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;flex-shrink:0;">${initials(u.full_name || u.username)}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}${badge}</div>
                <div style="font-size:9px;opacity:0.6;">${dName}</div>
            </div>
        </div>`;
    }

    // Separate direct members and child teams
    const directUsers = sortMembers(saleUsers.filter(u => u.department_id === saleDept.id));
    let childTeams = _saleSidebarDepts.filter(d => d.parent_id === saleDept.id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name));

    // Trưởng Phòng: only show their own team
    if (_isTP && currentUser.department_id) {
        childTeams = childTeams.filter(t => t.id === currentUser.department_id);
    }

    let html = '';

    // Render PHÒNG SALE parent header and direct members
    if (directUsers.length > 0 && !_isTP) {
        html += `<div style="padding:6px 8px;background:linear-gradient(135deg,#1e3a5f,#122546);border-radius:10px;margin-bottom:4px;"><span style="font-size:11px;font-weight:800;color:#93c5fd;">📁 ${saleDept.name}</span></div>`;
        directUsers.forEach(u => { html += renderSidebarUser(u, 8); });
    } else if (!_isTP) {
        // Even if no direct users, render the parent header "PHÒNG SALE"
        html += `<div style="padding:6px 8px;background:linear-gradient(135deg,#1e3a5f,#122546);border-radius:10px;margin-bottom:4px;"><span style="font-size:11px;font-weight:800;color:#93c5fd;">📁 ${saleDept.name}</span></div>`;
    }

    // Render child teams (e.g. Sale Bứt Phá) and their members
    childTeams.forEach(team => {
        const teamUsers = sortMembers(saleUsers.filter(u => u.department_id === team.id));
        if (teamUsers.length === 0) return;
        html += `<div style="padding:3px 8px 3px 8px;margin:6px 0 2px;"><span style="font-size:10px;font-weight:700;color:#64748b;">└ ${team.name}</span></div>`;
        teamUsers.forEach(u => { html += renderSidebarUser(u, 16); });
    });

    list.innerHTML = topBtn + html;
}

function _saleSelectSidebarUser(userId) {
    _saleSidebarSelectedUserId = userId;
    _saleCurrentPage = 1;
    _saleRenderSidebar();
    _saleLoadData();
}

async function _saleOpenConsultModal(customerId) {
    window._currentConsultCustomerId = customerId;
    let pendingEmergency = null;
    let handlerOptions = '';
    let customerInfo = {};
    let existingItems = [];
    let consultLogs = [];
    try {
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
        window._currentConsultCustomerPinned = !!customerInfo.is_pinned;
        consultLogs = logData.logs || [];
    } catch(e) {}
    const grandTotal = existingItems.reduce((s, i) => s + (i.total || 0), 0);

    let flowRules = {};
    let maxDaysPerStatus = {};
    try {
        const frData = await apiCall('/api/consult-flow-rules?crm_menu=sale');
        flowRules = frData.rules || {};
        maxDaysPerStatus = frData.maxDaysPerStatus || {};
    } catch(e) {}

    const orderStatus = customerInfo.order_status || 'dang_tu_van';
    const allTypes = Object.entries(_saleConsultTypes);

    function _getFlowRuleTypes(status) {
        const rules = flowRules[status];
        if (!rules || rules.length === 0) return null;
        return rules
            .map(r => [r.to_type_key, _saleConsultTypes[r.to_type_key]])
            .filter(([k, v]) => v);
    }

    const hasSauBanHang = consultLogs.some(l => l.log_type === 'sau_ban_hang');

    let allowedTypes;
    const lastLogEntry = consultLogs.length > 0 ? consultLogs[0] : null;
    const OVERRIDE_STATUSES_MODAL = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy', 'cho_duyet_huy_don', 'da_huy_don_tra_coc'];
    const effectiveStatus = OVERRIDE_STATUSES_MODAL.includes(orderStatus) ? orderStatus : (lastLogEntry ? lastLogEntry.log_type : orderStatus);
    const frTypes = _getFlowRuleTypes(effectiveStatus);

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
        allowedTypes = _getFlowRuleTypes('chot_don') || allTypes.filter(([k]) => ['dang_san_xuat','hoan_thanh','cap_cuu_sep','huy_don_tra_coc'].includes(k));
    } else if (orderStatus === 'dat_coc') {
        allowedTypes = _getFlowRuleTypes('dat_coc') || allTypes.filter(([k]) => ['chot_don','cap_cuu_sep','huy_coc'].includes(k));
    } else if (orderStatus === 'gui_stk_coc') {
        const fr = _getFlowRuleTypes('gui_stk_coc');
        if (fr) { allowedTypes = fr; }
        else { const order = ['giuc_coc','dat_coc','nhan_tin','cap_cuu_sep']; allowedTypes = order.map(k => [k, _saleConsultTypes[k]]).filter(([,v]) => v); }
    } else if (orderStatus === 'huy_coc') {
        allowedTypes = _getFlowRuleTypes('huy_coc') || allTypes.filter(([k]) => ['tuong_tac_ket_noi','nhan_tin','goi_dien','gap_truc_tiep','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'duyet_huy') {
        allowedTypes = _getFlowRuleTypes('duyet_huy') || allTypes.filter(([k]) => ['nhan_tin'].includes(k));
    } else if (orderStatus === 'tu_van_lai') {
        allowedTypes = _getFlowRuleTypes('tu_van_lai') || allTypes.filter(([k]) => ['giam_gia','thiet_ke'].includes(k));
    } else if (orderStatus === 'giam_gia') {
        allowedTypes = _getFlowRuleTypes('giam_gia') || allTypes.filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else {
        const normalTypes = ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc','cap_cuu_sep','huy'];
        allowedTypes = allTypes.filter(([k]) => normalTypes.includes(k));
    }

    const lastLog = consultLogs.length > 0 ? consultLogs[0] : null;

    if (lastLog && lastLog.log_type === 'hoan_thanh_cap_cuu') {
        allowedTypes = allTypes.filter(([k]) => ['giam_gia','lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    }

    if (pendingEmergency) {
        allowedTypes = allTypes.filter(([k]) => k === 'cap_cuu_sep');
    }

    if (customerInfo.cancel_approved === -2) {
        allowedTypes = allTypes.filter(([k]) => k === 'huy');
    }

    const effectiveRules = flowRules[effectiveStatus] || [];
    const defaultRule = effectiveRules.find(r => r.is_default);
    let defaultType = defaultRule ? defaultRule.to_type_key : (allowedTypes.length > 0 ? allowedTypes[0][0] : 'goi_dien');

    window._currentConsultSectionKey = effectiveStatus;
    window._currentConsultMaxDays = maxDaysPerStatus[effectiveStatus] || 0;

    if (pendingEmergency) defaultType = 'cap_cuu_sep';
    if (customerInfo.cancel_approved === -2) defaultType = 'huy';

    const typeOptions = allowedTypes.map(([k, v]) =>
        `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${v.icon} ${v.label}</option>`
    ).join('');

    const historyHTML = consultLogs.length > 0 ? `
        <div style="margin-bottom:12px;">
            <button type="button" onclick="_saleToggleConsultHistory()" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--gray-500);cursor:pointer;display:flex;align-items:center;gap:4px;width:100%;">
                📜 Xem lịch sử (${consultLogs.length}) <span id="historyArrowSale" style="margin-left:auto;">▼</span>
            </button>
            <div id="consultHistoryPanelSale" style="display:none;max-height:300px;overflow-y:auto;padding:10px;background:var(--gray-50);border-radius:0 0 8px 8px;border:1px solid var(--gray-200);border-top:none;">
                ${_saleBuildGroupedHistoryHTML(consultLogs, { compact: true })}
            </div>
        </div>
    ` : '';

    const bodyHTML = `
        ${historyHTML}
        <div class="form-group">
            <label>Loại Tư Vấn <span style="color:var(--danger)">*</span></label>
            <select id="consultTypeSale" class="form-control" onchange="_saleOnConsultTypeChange()">
                ${typeOptions}
            </select>
        </div>
        <div class="form-group" id="consultDepositGroupSale" style="display:none;">
            <label>Chọn Mã Tiền Đặt Cọc <span style="color:var(--danger)">*</span> <span style="font-size:10px;color:#b8860b;font-weight:600">(từ Sổ Ghi Nhận Tiền)</span></label>
            <input type="text" id="consultDepositSearchSale" class="form-control" placeholder="🔍 Gõ mã tiền, số tiền, nội dung CK..." 
                autocomplete="off" oninput="_saleFilterDepositList()" onfocus="_saleFilterDepositList()"
                style="font-size:13px;border:2px solid #daa520;">
            <div id="consultDepositDropdownSale" style="display:none;position:relative;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:8px;max-height:220px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,0.12);margin-top:2px"></div>
            <input type="hidden" id="consultPaymentRecordIdSale">
            <div id="consultDepositSelectedSale" style="display:none;background:#f0fdf4;border:1px solid #059669;border-radius:8px;padding:10px 14px;margin-top:6px;position:relative;">
                <span style="font-weight:800;color:#059669">✅ Đã chọn: </span><span id="consultDepositLabelSale" style="font-weight:700;color:#1e293b"></span>
                <div style="margin-top:4px;font-size:13px;font-weight:800;color:#e65100" id="consultDepositAmountDisplaySale"></div>
                <button type="button" onclick="_saleClearSelectedDeposit()" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#ef4444;font-size:16px;font-weight:800;cursor:pointer;padding:2px 6px;" title="Xóa chọn">✕</button>
            </div>
            <input type="hidden" id="consultDepositAmountSale" value="0">
        </div>
        <div class="form-group" id="consultSampleOrderCodeGroupSale" style="display:none;">
            <label>Mã Đơn Áo Mẫu <span style="color:var(--gray-500);font-size:11px;">(Tự động)</span></label>
            <input type="text" id="consultSampleOrderCodeSale" class="form-control" readonly style="background:var(--gray-100);font-weight:700;color:var(--navy);font-size:16px;cursor:not-allowed;border:2px solid var(--gold);">
        </div>
        <div class="form-group" id="consultContentGroupSale">
            <label>Nội Dung Tư Vấn</label>
            <textarea id="consultContentSale" class="form-control" rows="3" placeholder="Nhập nội dung tư vấn..."></textarea>
        </div>
        <div class="form-group" id="consultImageGroupSale">
            <label>Hình Ảnh (Ctrl+V để dán)</label>
            <div id="consultImageAreaSale" class="image-paste-area" tabindex="0" style="border:2px dashed #cbd5e1;padding:20px;text-align:center;border-radius:8px;cursor:pointer;position:relative;outline:none;">
                <div id="consultImagePlaceholderSale">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                <img id="consultImagePreviewSale" style="display:none;max-width:100%;max-height:200px;border-radius:8px;margin:0 auto;">
                <input type="file" id="consultImageFileSale" accept="image/*" style="display:none">
                <button id="consultImageRemoveSale" class="btn btn-sm" type="button" style="display:none;position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:2px 8px;" onclick="_saleRemoveConsultImage()">✕</button>
            </div>
        </div>
        <div class="form-group" id="consultNextTypeGroupSale" style="display:none">
            <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
            <select id="consultNextTypeSale" class="form-control" onchange="_saleUpdateApptLabel()">
                ${Object.entries(_saleConsultTypes).filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','dat_coc','chot_don','cap_cuu_sep','huy'].includes(k)).map(([k, v]) =>
                    `<option value="${k}" ${k === (lastLog?.next_consult_type || 'goi_dien') ? 'selected' : ''}>${v.icon} ${v.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group" id="consultAppointmentGroupSale">
            <label>Ngày Hẹn Tiếp Theo</label>
            <input type="hidden" id="consultAppointmentSale">
            <div id="consultCalendarContainerSale"></div>
        </div>
        <div class="form-group" id="consultCancelGroupSale" style="display:none">
            <label>Lý Do Hủy <span style="color:var(--danger)">*</span></label>
            <textarea id="consultCancelReasonSale" class="form-control" rows="3" placeholder="Nhập lý do hủy khách hàng..."></textarea>
            <div style="margin-top:8px;padding:10px;background:rgba(220,38,38,0.15);border-radius:6px;border:1px solid rgba(220,38,38,0.3);font-size:12px;color:#fca5a5;">
                ⚠️ Hủy khách hàng sẽ cần Quản Lý/Giám Đốc duyệt.
            </div>
        </div>
        <div class="form-group" id="consultHandlerGroupSale" style="display:none">
            <label>Chọn Người Xử Lý <span style="color:var(--danger)">*</span></label>
            <select id="consultHandlerSale" class="form-control" ${pendingEmergency ? 'disabled style="opacity:0.7;cursor:not-allowed;background:var(--gray-100);"' : ''}>
                ${pendingEmergency ? '' : '<option value="">-- Chọn Sếp --</option>'}
                ${handlerOptions}
            </select>
            <div style="margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#fca5a5;">
                🚨 Khách hàng sẽ hiện ở trang Cấp Cứu Sếp của người được chọn.
            </div>
        </div>
        <div id="consultOrderGroupSale" style="display:none">
            <div class="form-group" id="consultOrderCodeGroupSale" style="display:none;">
                <label>Mã Đơn <span style="color:var(--gray-500);font-size:11px;">(Tự động)</span></label>
                <input type="text" id="consultOrderCodeSale" class="form-control" readonly style="background:var(--gray-100);font-weight:700;color:var(--navy);font-size:16px;cursor:not-allowed;border:2px solid var(--gold);">
            </div>
            <div class="form-group">
                <label>SĐT Khách Hàng</label>
                <input type="text" id="consultPhoneSale" class="form-control" value="${(customerInfo.phone && !customerInfo.phone.startsWith('pancake_')) ? customerInfo.phone : ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="10 chữ số">
            </div>
            <div class="form-group">
                <label>Đơn Hàng <span style="color:var(--danger)">*</span></label>
                <table class="table" style="font-size:13px;" id="consultOrderTableSale">
                    <thead><tr><th>Mô tả</th><th style="width:80px">SL</th><th style="width:120px">Đơn giá</th><th style="width:120px">Thành tiền</th><th style="width:50px"></th></tr></thead>
                    <tbody>
                        ${existingItems.length > 0 ? existingItems.map(it => `<tr>
                            <td><input class="form-control oi-desc" value="${it.description||''}" style="font-size:13px;padding:6px 8px;"></td>
                            <td><input type="number" class="form-control oi-qty" value="${it.quantity||0}" min="0" style="font-size:13px;padding:6px 8px;width:70px;" oninput="_saleCalcConsultOrderTotal()"></td>
                            <td><input type="text" class="form-control oi-price" value="${formatCurrency(it.unit_price||0)}" style="font-size:13px;padding:6px 8px;" oninput="_saleFormatDepositInput(this);_saleCalcConsultOrderTotal()"></td>
                            <td class="oi-total" style="text-align:right;font-weight:600">${formatCurrency(it.total)}</td>
                            <td><button class="btn btn-sm" type="button" onclick="this.closest('tr').remove();_saleCalcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
                        </tr>`).join('') : ''}
                    </tbody>
                </table>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <button class="btn btn-sm" type="button" onclick="_saleAddConsultOrderRow()" style="font-size:12px;">➕ Thêm dòng</button>
                    <div style="text-align:right;">
                        <div style="font-size:16px;font-weight:700;">Tổng: <span id="consultOrderTotalSale" style="color:#d4a843;font-size:18px;">${formatCurrency(grandTotal)}</span> VNĐ</div>
                        <div id="consultDepositInfoSale" style="display:none;margin-top:4px;font-size:13px;">
                            <span style="color:#6b7280;">Đã cọc:</span> <span id="consultDepositDisplaySale" style="color:#10b981;font-weight:600;">0</span> VNĐ
                            <br><span style="color:#6b7280;">Còn lại:</span> <span id="consultRemainingDisplaySale" style="color:#e65100;font-weight:700;font-size:15px;">0</span> VNĐ
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Địa Chỉ Cụ Thể <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="consultAddressSale" class="form-control" value="${customerInfo.address || ''}" placeholder="Nhập địa chỉ cụ thể">
                </div>
                <div class="form-group">
                    <label>Thành Phố <span style="color:var(--danger)">*</span></label>
                    <select id="consultCitySale" class="form-control">
                        <option value="">-- Chọn tỉnh/thành --</option>
                        ${(typeof VN_PROVINCES !== 'undefined' ? VN_PROVINCES : []).map(p => `<option value="${p}" ${customerInfo.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group" style="display:none">
                <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
                <select id="consultChotDonNextTypeSale" class="form-control" onchange="_saleUpdateChotDonApptLabel()">
                    <option value="dang_san_xuat">🏭 Đang Sản Xuất</option>
                    <option value="hoan_thanh">🏆 Hoàn Thành Đơn</option>
                </select>
            </div>
            <div class="form-group">
                <label id="consultChotDonApptLabelSale">Ngày Hẹn Làm Việc Khách <span style="color:var(--danger)">*</span></label>
                <input type="hidden" id="consultSBHDateSale">
                <div id="consultSBHCalendarContainerSale"></div>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="consultSubmitBtnSale" onclick="_saleSubmitConsultLog(${customerId})" style="width:auto;">📝 GHI NHẬN</button>
    `;

    openModal('📋 Ghi Nhận Tư Vấn (Sale)', bodyHTML, footerHTML);

    setTimeout(() => {
        const area = document.getElementById('consultImageAreaSale');
        if (area) {
            area.addEventListener('paste', _saleHandleConsultImagePaste);
            area.addEventListener('click', () => area.focus());
        }
        document.querySelectorAll('#consultOrderTableSale .oi-qty, #consultOrderTableSale .oi-price').forEach(el => el.addEventListener('input', _saleCalcConsultOrderTotal));
        const _today = new Date();
        const _tomorrow = new Date(_today); _tomorrow.setDate(_tomorrow.getDate() + 1);
        const _tomorrowStr = _tomorrow.getFullYear() + '-' + String(_tomorrow.getMonth()+1).padStart(2,'0') + '-' + String(_tomorrow.getDate()).padStart(2,'0');
        if (typeof initHolidayCalendar === 'function') {
            initHolidayCalendar({
                containerId: 'consultCalendarContainerSale',
                hiddenInputId: 'consultAppointmentSale',
                minDate: _tomorrowStr
            });
            initHolidayCalendar({
                containerId: 'consultSBHCalendarContainerSale',
                hiddenInputId: 'consultSBHDateSale',
                minDate: _tomorrowStr
            });
        }
        _saleOnConsultTypeChange();
    }, 100);
}

function _saleToggleConsultHistory() {
    const panel = document.getElementById('consultHistoryPanelSale');
    const arrow = document.getElementById('historyArrowSale');
    if (!panel) return;
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        if (arrow) arrow.textContent = '▲';
    } else {
        panel.style.display = 'none';
        if (arrow) arrow.textContent = '▼';
    }
}

function _saleFormatDepositInput(el) {
    let val = el.value.replace(/[^0-9]/g, '');
    if (val) {
        el.value = Number(val).toLocaleString('vi-VN');
    } else {
        el.value = '';
    }
}

function _saleCalcConsultOrderTotal() {
    const table = document.getElementById('consultOrderTableSale');
    if (!table) return;
    let sum = 0;
    table.querySelectorAll('tbody tr').forEach(tr => {
        const qty = parseInt(tr.querySelector('.oi-qty')?.value || '0');
        const priceStr = tr.querySelector('.oi-price')?.value || '0';
        const price = parseInt(priceStr.replace(/[^0-9]/g, ''));
        const total = qty * price;
        sum += total;
        const totalTd = tr.querySelector('.oi-total');
        if (totalTd) totalTd.textContent = formatCurrency(total);
    });
    const orderTotalEl = document.getElementById('consultOrderTotalSale');
    if (orderTotalEl) orderTotalEl.textContent = formatCurrency(sum);

    const deposit = parseInt(document.getElementById('consultDepositAmountSale')?.value || '0');
    const remaining = Math.max(0, sum - deposit);
    const disp = document.getElementById('consultDepositDisplaySale');
    if (disp) disp.textContent = formatCurrency(deposit);
    const remDisp = document.getElementById('consultRemainingDisplaySale');
    if (remDisp) remDisp.textContent = formatCurrency(remaining);
}

function _saleAddConsultOrderRow() {
    const tbody = document.querySelector('#consultOrderTableSale tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input class="form-control oi-desc" style="font-size:13px;padding:6px 8px;"></td>
        <td><input type="number" class="form-control oi-qty" value="1" min="0" style="font-size:13px;padding:6px 8px;width:70px;" oninput="_saleCalcConsultOrderTotal()"></td>
        <td><input type="text" class="form-control oi-price" value="0" style="font-size:13px;padding:6px 8px;" oninput="_saleFormatDepositInput(this);_saleCalcConsultOrderTotal()"></td>
        <td class="oi-total" style="text-align:right;font-weight:600">0</td>
        <td><button class="btn btn-sm" type="button" onclick="this.closest('tr').remove();_saleCalcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
    `;
    tbody.appendChild(tr);
}

window._saleImageBlob = null;

function _saleHandleConsultImagePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            window._saleImageBlob = blob;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.getElementById('consultImagePreviewSale');
                if (img) {
                    img.src = ev.target.result;
                    img.style.display = 'block';
                }
                const placeholder = document.getElementById('consultImagePlaceholderSale');
                if (placeholder) placeholder.style.display = 'none';
                const removeBtn = document.getElementById('consultImageRemoveSale');
                if (removeBtn) removeBtn.style.display = 'block';
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
}

function _saleRemoveConsultImage() {
    window._saleImageBlob = null;
    const img = document.getElementById('consultImagePreviewSale');
    if (img) img.style.display = 'none';
    const placeholder = document.getElementById('consultImagePlaceholderSale');
    if (placeholder) placeholder.style.display = 'block';
    const removeBtn = document.getElementById('consultImageRemoveSale');
    if (removeBtn) removeBtn.style.display = 'none';
}

function _saleOnConsultTypeChange() {
    const type = document.getElementById('consultTypeSale')?.value;
    if (!type) return;
    const cancelGroup = document.getElementById('consultCancelGroupSale');
    const contentGroup = document.getElementById('consultContentGroupSale');
    const imageGroup = document.getElementById('consultImageGroupSale');
    const appointmentGroup = document.getElementById('consultAppointmentGroupSale');
    const orderGroup = document.getElementById('consultOrderGroupSale');
    const handlerGroup = document.getElementById('consultHandlerGroupSale');
    const depositGroup = document.getElementById('consultDepositGroupSale');

    if (cancelGroup) cancelGroup.style.display = 'none';
    if (handlerGroup) handlerGroup.style.display = 'none';
    if (orderGroup) orderGroup.style.display = 'none';
    if (depositGroup) depositGroup.style.display = 'none';
    if (contentGroup) contentGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    if (appointmentGroup) appointmentGroup.style.display = 'block';

    const maxDays = window._currentConsultMaxDays || 0;
    const today = new Date();
    const _tmr = new Date(today); _tmr.setDate(_tmr.getDate() + 1);
    const tomorrowStr = _tmr.getFullYear() + '-' + String(_tmr.getMonth()+1).padStart(2,'0') + '-' + String(_tmr.getDate()).padStart(2,'0');

    if (maxDays > 0) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + maxDays);
        const maxDateStr = maxDate.getFullYear() + '-' + String(maxDate.getMonth()+1).padStart(2,'0') + '-' + String(maxDate.getDate()).padStart(2,'0');
        if (typeof updateHolidayCalendarMinMax === 'function') {
            updateHolidayCalendarMinMax('consultCalendarContainerSale', tomorrowStr, maxDateStr);
        }
        const apptLabelEl = appointmentGroup?.querySelector('label');
        if (apptLabelEl) apptLabelEl.innerHTML = `Ngày Hẹn Tiếp Theo <span style="font-size:10px;color:#f59e0b;font-weight:600;">(tối đa ${maxDays} ngày)</span>`;
    } else {
        if (typeof updateHolidayCalendarMinMax === 'function') {
            updateHolidayCalendarMinMax('consultCalendarContainerSale', tomorrowStr, null);
        }
    }

    if (type === 'huy') {
        if (cancelGroup) cancelGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
    } else if (type === 'cap_cuu_sep') {
        if (handlerGroup) handlerGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
    } else if (type === 'chot_don') {
        if (orderGroup) orderGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        _saleCalcConsultOrderTotal();
        const codeInput = document.getElementById('consultOrderCodeSale');
        if (codeInput && !codeInput.value) {
            codeInput.value = 'Đang tạo...';
            apiCall('/api/orders/next-code').then(res => {
                if (res.order_code) codeInput.value = res.order_code;
            });
        }
    } else if (type === 'gui_mau') {
        const socGroup = document.getElementById('consultSampleOrderCodeGroupSale');
        if (socGroup) socGroup.style.display = 'block';
        const socInput = document.getElementById('consultSampleOrderCodeSale');
        if (socInput && !socInput.value) {
            socInput.value = 'Đang tạo...';
            apiCall('/api/don-gui-ao-mau/next-code').then(res => {
                if (res.sample_order_code) socInput.value = res.sample_order_code;
            });
        }
    } else if (type === 'dat_coc') {
        if (depositGroup) depositGroup.style.display = 'block';
    }
}

async function _saleSubmitConsultLog(customerId) {
    const type = document.getElementById('consultTypeSale')?.value;
    const content = document.getElementById('consultContentSale')?.value?.trim();
    let appt = document.getElementById('consultAppointmentSale')?.value;

    if (!type) { showToast('Vui lòng chọn loại tư vấn', 'error'); return; }

    const payload = new FormData();
    payload.append('log_type', type);
    payload.append('content', content || '');
    if (appt) payload.append('appointment_date', appt);

    if (window._saleImageBlob) {
        payload.append('image', window._saleImageBlob, 'paste_image.png');
    }

    if (type === 'huy') {
        const reason = document.getElementById('consultCancelReasonSale')?.value?.trim();
        if (!reason) { showToast('Vui lòng nhập lý do hủy', 'error'); return; }
        payload.append('cancel_reason', reason);
    } else if (type === 'cap_cuu_sep') {
        const handler = document.getElementById('consultHandlerSale')?.value;
        if (!handler) { showToast('Vui lòng chọn người xử lý', 'error'); return; }
        payload.append('handler_id', handler);
    } else if (type === 'chot_don') {
        const phone = document.getElementById('consultPhoneSale')?.value?.trim();
        const address = document.getElementById('consultAddressSale')?.value?.trim();
        const city = document.getElementById('consultCitySale')?.value;
        const apptSBH = document.getElementById('consultSBHDateSale')?.value;

        if (!address) { showToast('Vui lòng nhập địa chỉ cụ thể', 'error'); return; }
        if (!city) { showToast('Vui lòng chọn tỉnh/thành', 'error'); return; }
        if (!apptSBH) { showToast('Vui lòng chọn ngày hẹn làm việc', 'error'); return; }

        payload.append('phone', phone);
        payload.append('address', address);
        payload.append('province', city);
        payload.append('appointment_date', apptSBH);

        const items = [];
        const rows = document.querySelectorAll('#consultOrderTableSale tbody tr');
        rows.forEach(tr => {
            const desc = tr.querySelector('.oi-desc')?.value?.trim();
            const qty = parseInt(tr.querySelector('.oi-qty')?.value || '0');
            const price = parseInt(tr.querySelector('.oi-price')?.value?.replace(/[^0-9]/g, '') || '0');
            if (desc) {
                items.push({ description: desc, quantity: qty, unit_price: price });
            }
        });
        if (items.length === 0) { showToast('Vui lòng nhập ít nhất một mặt hàng', 'error'); return; }
        payload.append('items', JSON.stringify(items));
    } else if (type === 'dat_coc') {
        const recordId = document.getElementById('consultPaymentRecordIdSale')?.value;
        if (!recordId) { showToast('Vui lòng chọn mã tiền đặt cọc', 'error'); return; }
        payload.append('payment_record_id', recordId);
    }

    const submitBtn = document.getElementById('consultSubmitBtnSale');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Đang lưu...'; }

    try {
        const res = await apiCall(`/api/customers/${customerId}/consult`, 'POST', payload);
        if (res.success) {
            showToast('Ghi nhận tư vấn thành công!');
            closeModal();
            _saleLoadData();
        } else {
            showToast(res.error || 'Lỗi ghi nhận!', 'error');
        }
    } catch(e) {
        showToast('Lỗi ghi nhận tư vấn!', 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📝 GHI NHẬN'; }
    }
}

async function _saleOpenCustomerDetail(customerId) {
    if (!customerId) return;
    const [data, logsData, orderData, orderCodesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult-logs`),
        apiCall(`/api/customers/${customerId}/orders`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    const c = data.customer || {};
    const logs = logsData.logs || [];
    const orders = orderData.items || [];
    const initials = (c.customer_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

    const infoTab = `
        <div style="margin:-12px -12px 0;font-family:'Segoe UI',system-ui,sans-serif;">
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:22px 22px 18px;border-radius:10px;position:relative;overflow:hidden;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
                    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f172a;box-shadow:0 3px 12px rgba(250,210,76,0.35);flex-shrink:0;">
                        ${initials}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:3px;">${c.customer_name}</div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:13px;color:#fad24c;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;background:rgba(250,210,76,0.12);padding:2px 8px;border-radius:6px;">${getCustomerCode(c)}</span>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:22px;font-weight:800;color:#fad24c;">
                            ${(() => {
                                const realLogs = logs.filter(l => {
                                    const content = l.content || '';
                                    return !['chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so', 'khong_xu_ly'].includes(l.log_type) &&
                                           !content.includes('Pancake') &&
                                           !content.includes('Đồng bộ');
                                });
                                return realLogs.length;
                            })()}
                        </div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">LẦN CHĂM</div>
                    </div>
                </div>
            </div>
            <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏷️ Mã KH</div>
                        <div style="font-size:13px;font-weight:800;color:#6d28d9;">${getCustomerCode(c)}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🔑 UID</div>
                        <div style="font-size:11px;font-weight:600;color:#6366f1;font-family:'Courier New',monospace;word-break:break-all;">${c.customer_uid || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📞 SĐT</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${(() => {
                            const hasRealPhone = c.phone && !c.phone.startsWith('pancake_');
                            if (!hasRealPhone) return '—';
                            return c.readonly ? '<span style="color:#94a3b8">' + c.phone + '</span>' : '<a href="tel:' + c.phone + '" style="color:#3b82f6;text-decoration:none;">' + c.phone + '</a>';
                        })()}</div>
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
                    <div style="padding:12px 14px;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">💼 Công việc</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.job || '—'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const historyTab = `
        <div style="max-height:350px;overflow-y:auto;">
            ${_saleBuildGroupedHistoryHTML(logs)}
        </div>
    `;

    const orderTab = `
        <div style="max-height:350px;overflow-y:auto;">
            <table class="table" style="font-size:12px;">
                <thead><tr><th>Mã đơn</th><th>Ngày tạo</th><th>Tổng tiền</th><th>Thành viên</th></tr></thead>
                <tbody>
                    ${orders.map(o => `<tr>
                        <td><strong>${o.order_code || '—'}</strong></td>
                        <td>${formatDate(o.created_at)}</td>
                        <td>${formatCurrency(o.total)} VNĐ</td>
                        <td>${o.created_by_name || '—'}</td>
                    </tr>`).join('')}
                    ${orders.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Chưa có đơn hàng</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;

    const bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <span class="cdtab-btn-sale" onclick="_saleSwitchCDTab('info')" id="cdtab-sale-info-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#fad24c;color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📋 Thông Tin</span>
            <span class="cdtab-btn-sale" onclick="_saleSwitchCDTab('history')" id="cdtab-sale-history-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📝 Lịch Sử (${logs.length})</span>
            <span class="cdtab-btn-sale" onclick="_saleSwitchCDTab('orders')" id="cdtab-sale-orders-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">🛒 Đơn Hàng</span>
        </div>
        <div id="cdtab-sale-info">${infoTab}</div>
        <div id="cdtab-sale-history" style="display:none;">${historyTab}</div>
        <div id="cdtab-sale-orders" style="display:none;">${orderTab}</div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        ${!c.cancel_requested && !c.cancel_approved ? `
            <button class="btn btn-primary" onclick="closeModal();_saleOpenConsultModal(${customerId});" style="width:auto;">📝 TƯ VẤN</button>
        ` : ''}
    `;

    openModal(`Chi Tiết Khách Hàng (Sale)`, bodyHTML, footerHTML);
}

function _saleSwitchCDTab(tab) {
    const activeStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#fad24c;color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    const inactiveStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    ['info','history','orders'].forEach(t => {
        const el = document.getElementById('cdtab-sale-' + t);
        const btn = document.getElementById('cdtab-sale-' + t + '-btn');
        if (el) el.style.display = t === tab ? 'block' : 'none';
        if (btn) btn.style.cssText = t === tab ? activeStyle : inactiveStyle;
    });
}

function _saleBuildGroupedHistoryHTML(logs, opts = {}) {
    if (logs.length === 0) return '<div style="text-align:center;color:#94a3b8;padding:12px;">Chưa có lịch sử tư vấn</div>';
    
    return logs.map(l => {
        const type = _saleConsultTypes[l.log_type] || { label: l.log_type, icon: '📝', color: '#64748b' };
        return `
            <div style="border-left:2px solid ${type.color};padding-left:12px;margin-bottom:12px;position:relative;">
                <div style="font-size:11px;color:#94a3b8;font-weight:600;">${formatDateTime(l.created_at)} · ${l.created_by_name || '—'}</div>
                <div style="font-weight:700;font-size:12px;color:#1e293b;margin:2px 0;">${type.icon} ${type.label}</div>
                <div style="font-size:12px;color:#475569;white-space:pre-wrap;">${l.content}</div>
                ${l.image_url ? `<img src="${l.image_url}" style="max-width:100%;max-height:120px;border-radius:6px;margin-top:6px;display:block;cursor:pointer;" onclick="window.open('${l.image_url}')">` : ''}
            </div>
        `;
    }).join('');
}

async function _saleOpenCustomerInfo(customerId) {
    if (!customerId) return;
    try {
        const res = await apiCall(`/api/customers/${customerId}`);
        const c = res.customer || {};

        const bodyHTML = `
            <div class="form-group">
                <label>Tên Khách Hàng <span style="color:var(--danger)">*</span></label>
                <input type="text" id="editCustNameSale" class="form-control" value="${c.customer_name || ''}">
            </div>
            <div class="form-group">
                <label>SĐT</label>
                <input type="text" id="editCustPhoneSale" class="form-control" value="${(c.phone && !c.phone.startsWith('pancake_')) ? c.phone : ''}">
            </div>
            <div class="form-group">
                <label>Link Facebook</label>
                <input type="text" id="editCustFBLinkSale" class="form-control" value="${c.facebook_link || ''}">
            </div>
            <div class="form-group">
                <label>Địa Chỉ</label>
                <input type="text" id="editCustAddressSale" class="form-control" value="${c.address || ''}">
            </div>
            <div class="form-group">
                <label>Lĩnh Vực / Công Việc</label>
                <input type="text" id="editCustJobSale" class="form-control" value="${c.job || ''}">
            </div>
        `;

        const footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" onclick="_saleSubmitCustomerInfo(${customerId})" style="width:auto;">Lưu Thay Đổi</button>
        `;

        openModal('✏️ Cập Nhật Thông Tin', bodyHTML, footerHTML);
    } catch(e) {
        showToast('Lỗi tải thông tin khách hàng!', 'error');
    }
}

async function _saleSubmitCustomerInfo(customerId) {
    const name = document.getElementById('editCustNameSale')?.value?.trim();
    const phone = document.getElementById('editCustPhoneSale')?.value?.trim();
    const fb = document.getElementById('editCustFBLinkSale')?.value?.trim();
    const address = document.getElementById('editCustAddressSale')?.value?.trim();
    const job = document.getElementById('editCustJobSale')?.value?.trim();

    if (!name) { showToast('Tên khách hàng không được để trống', 'error'); return; }

    try {
        const res = await apiCall(`/api/customers/${customerId}/info`, 'PUT', {
            customer_name: name,
            phone: phone || null,
            facebook_link: fb || null,
            address: address || null,
            job: job || null
        });
        if (res.success) {
            showToast('Cập nhật thông tin thành công!');
            closeModal();
            _saleLoadData();
        } else {
            showToast(res.error || 'Cập nhật thất bại!', 'error');
        }
    } catch(e) {
        showToast('Lỗi cập nhật thông tin!', 'error');
    }
}

async function _saleOpenCrmTransferPopup(customerId) {
    const bodyHTML = `
        <div class="form-group">
            <label>Chọn Loại CRM Muốn Chuyển Đến <span style="color:var(--danger)">*</span></label>
            <select id="transferCrmTypeSale" class="form-control">
                <option value="nhu_cau">📋 Chăm Sóc KH Nhu Cầu</option>
                <option value="ctv">🤝 Chăm Sóc CTV</option>
            </select>
        </div>
        <div class="form-group">
            <label>Nội Dung / Lý Do Đề Xuất <span style="color:var(--danger)">*</span></label>
            <textarea id="transferCrmReasonSale" class="form-control" rows="3" placeholder="Nhập lý do đề xuất chuyển crm..."></textarea>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="_saleSubmitCrmTransfer(${customerId})" style="width:auto;">🚀 GỬI ĐỀ XUẤT</button>
    `;

    openModal('🔄 Đề Xuất Chuyển CRM', bodyHTML, footerHTML);
}

async function _saleSubmitCrmTransfer(customerId) {
    const toType = document.getElementById('transferCrmTypeSale')?.value;
    const reason = document.getElementById('transferCrmReasonSale')?.value?.trim();

    if (!toType) { showToast('Vui lòng chọn loại CRM đích', 'error'); return; }
    if (!reason) { showToast('Vui lòng nhập lý do đề xuất', 'error'); return; }

    try {
        const res = await apiCall('/api/crm-conversion/request', 'POST', {
            customer_id: customerId,
            target_crm_type: toType,
            reason: reason
        });
        if (res.success) {
            showToast('Gửi đề xuất chuyển CRM thành công! Đang chờ duyệt.');
            closeModal();
            _saleLoadData();
        } else {
            showToast(res.error || 'Gửi đề xuất thất bại!', 'error');
        }
    } catch(e) {
        showToast('Lỗi gửi đề xuất!', 'error');
    }
}

async function _saleOpenAffiliateDetail(userId) {
    if (typeof _ctvOpenAffiliateDetail === 'function') {
        _ctvOpenAffiliateDetail(userId);
    } else {
        showToast('Xem chi tiết đối tác...', 'info');
    }
}

// Deposit helpers
var _salePaymentRecords = [];
async function _saleFilterDepositList() {
    const q = document.getElementById('consultDepositSearchSale')?.value?.trim() || '';
    const dropdown = document.getElementById('consultDepositDropdownSale');
    if (!dropdown) return;
    dropdown.style.display = 'block';

    if (_salePaymentRecords.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px;color:#94a3b8;font-size:12px;">⏳ Đang tải danh sách tiền...</div>';
        try {
            const data = await apiCall('/api/so-ghi-nhan-tien/available-deposits');
            _salePaymentRecords = data.records || [];
        } catch(e) {
            dropdown.innerHTML = '<div style="padding:10px;color:#ef4444;font-size:12px;">❌ Lỗi tải danh sách tiền</div>';
            return;
        }
    }

    let filtered = _salePaymentRecords;
    if (q) {
        const ql = q.toLowerCase();
        filtered = _salePaymentRecords.filter(r => 
            (r.code && r.code.toLowerCase().includes(ql)) ||
            (r.amount && String(r.amount).includes(ql)) ||
            (r.content && r.content.toLowerCase().includes(ql))
        );
    }

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px;color:#94a3b8;font-size:12px;text-align:center;">📭 Không tìm thấy mã tiền phù hợp</div>';
        return;
    }

    dropdown.innerHTML = filtered.map(r => `
        <div onclick="_saleSelectDeposit(${r.id}, '${r.code}', ${r.amount})" 
            style="padding:10px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 0.15s;"
            onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <div style="font-weight:700;color:#1e293b;font-size:12px;display:flex;justify-content:space-between;">
                <span>🏦 ${r.code}</span>
                <span style="color:#10b981;">+${formatCurrency(r.amount)}đ</span>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.content || 'Không có nội dung'}</div>
        </div>
    `).join('');
}

function _saleSelectDeposit(id, code, amount) {
    document.getElementById('consultPaymentRecordIdSale').value = id;
    document.getElementById('consultDepositAmountSale').value = amount;
    
    const label = document.getElementById('consultDepositLabelSale');
    if (label) label.textContent = code;
    
    const amountDisp = document.getElementById('consultDepositAmountDisplaySale');
    if (amountDisp) amountDisp.textContent = `Số tiền cọc: ${formatCurrency(amount)} VNĐ`;

    const searchInput = document.getElementById('consultDepositSearchSale');
    if (searchInput) searchInput.style.display = 'none';

    const selectedDiv = document.getElementById('consultDepositSelectedSale');
    if (selectedDiv) selectedDiv.style.display = 'block';

    const dropdown = document.getElementById('consultDepositDropdownSale');
    if (dropdown) dropdown.style.display = 'none';

    _saleCalcConsultOrderTotal();
}

function _saleClearSelectedDeposit() {
    document.getElementById('consultPaymentRecordIdSale').value = '';
    document.getElementById('consultDepositAmountSale').value = '0';

    const searchInput = document.getElementById('consultDepositSearchSale');
    if (searchInput) {
        searchInput.value = '';
        searchInput.style.display = 'block';
        searchInput.focus();
    }

    const selectedDiv = document.getElementById('consultDepositSelectedSale');
    if (selectedDiv) selectedDiv.style.display = 'none';

    _saleCalcConsultOrderTotal();
}
