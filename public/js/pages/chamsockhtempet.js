// PUBLIC/JS/PAGES/CHAMSOCKHTEMPET.JS
// CRM pipeline dashboard for CHĂM SÓC KHÁCH TEM/PET (Dùng chung Sale & Kinh Doanh)

var _tempetActiveCat = null; 
var _tempetAllCustomers = []; 
var _tempetAllStats = {}; 
var _tempetPendingCtvIds = []; 
var _tempetAffPendingIds = []; 
var _tempetAffApprovedIds = []; 
var _tempetAffLockedIds = []; 
var _tempetAffApprovedMap = {}; 
var _tempetCurrentPage = 1;
var _tempetPageSize = 100;
var _tempetDatePreset = 'all';
var _tempetDateFrom = '';
var _tempetDateTo = '';
var _tempetSelectedYear = new Date().getFullYear();
var _tempetSidebarUsers = [];
var _tempetSidebarDepts = [];
var _tempetSidebarSelectedUserId = null;
var _tempetIsManager = false;

var _tempetConsultTypes = {
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

async function _tempetSyncConsultTypes() {
    try {
        const data = await apiCall('/api/consult-types?crm_menu=sale');
        if (data.types && Array.isArray(data.types)) {
            for (const t of data.types) {
                if (!t.key || !t.is_active) continue;
                _tempetConsultTypes[t.key] = {
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

async function renderChamsockhtempetPage(container) {
    window._saleReloadCurrentPage = () => _tempetLoadData();
    window._saleRenderCurrentTable = () => _tempetRenderFilteredTable();
    _tempetIsManager = ['giam_doc', 'quan_ly', 'quan_ly_cap_cao', 'truong_phong'].includes(currentUser.role);

    if (_tempetIsManager) {
        const [staffRes, deptsRes] = await Promise.all([
            apiCall('/api/managed-staff'),
            apiCall('/api/departments')
        ]);
        _tempetSidebarUsers = (staffRes.users || []).filter(u => ['nhan_vien', 'truong_phong', 'quan_ly', 'quan_ly_cap_cao', 'giam_doc', 'thu_viec', 'part_time'].includes(u.role));
        _tempetSidebarDepts = Array.isArray(deptsRes) ? deptsRes : (deptsRes?.departments || []);
        _tempetSidebarSelectedUserId = null;
    }

    const sidebarHTML = _tempetIsManager ? `
        <div id="tempetSidebar" style="width:260px;min-width:260px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-right:1.5px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:14px;border-bottom:1.5px solid #e2e8f0;">
                <h4 style="margin:0;color:#122546;font-size:14px;font-weight:800;">🏷️ Khách TEM/PET</h4>
            </div>
            <div id="tempetSidebarList" style="flex:1;overflow:auto;padding:8px;"></div>
        </div>` : '';

    container.innerHTML = `
        <div style="display:flex;height:calc(100vh - 120px);gap:0;">
        ${sidebarHTML}
        <div id="tempetMainContent" style="flex:1;overflow:auto;padding:16px 20px;">
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
            <h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">🏷️ Chăm Sóc Khách TEM/PET</h3>
            ${(typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc') ? `
            <div style="display:flex;gap:10px;">
                <a href="/quytacnuttuvancrmtempet" onclick="event.preventDefault();navigate('quytacnuttuvancrmtempet')"
                    style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;
                    border:2px solid #f97316;color:#f97316;font-size:13px;font-weight:800;cursor:pointer;
                    background:rgba(249,115,22,.08);text-decoration:none;transition:all .2s;"
                    onmouseover="this.style.background='rgba(249,115,22,.18)';this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.background='rgba(249,115,22,.08)';this.style.transform=''">
                    ⚙️ Quy Tắc Nút Tư Vấn
                </a>
            </div>
            ` : ''}
        </div>
        <div class="crm-stat-cards" id="tempetStatCards">
            <div class="crm-stat-card" data-cat="phai_xu_ly" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;" onclick="_tempetFilterByCat('phai_xu_ly')">
                <div class="stat-icon">🔥</div>
                <div class="stat-count" id="tempetStatPhaiXuLy">0</div>
                <div class="stat-label">Phải xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="da_xu_ly" style="background:linear-gradient(135deg,#10b981,#059669);color:white;" onclick="_tempetFilterByCat('da_xu_ly')">
                <div class="stat-icon">✅</div>
                <div class="stat-count" id="tempetStatDaXuLy">0</div>
                <div class="stat-label">Đã xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="xu_ly_tre" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;" onclick="_tempetFilterByCat('xu_ly_tre')">
                <div class="stat-icon">⚠️</div>
                <div class="stat-count" id="tempetStatXuLyTre">0</div>
                <div class="stat-label">Khách xử lý trễ</div>
            </div>
            <div class="crm-stat-card" data-cat="cho_xu_ly" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="_tempetFilterByCat('cho_xu_ly')">
                <div class="stat-icon">⏳</div>
                <div class="stat-count" id="tempetStatChoXuLy">0</div>
                <div class="stat-label">Chờ xử lý</div>
            </div>
            <div class="crm-stat-card" data-cat="huy_khach" style="background:linear-gradient(135deg,#6b7280,#4b5563);color:white;" onclick="_tempetFilterByCat('huy_khach')">
                <div class="stat-icon">🚫</div>
                <div class="stat-count" id="tempetStatHuyKhach">0</div>
                <div class="stat-label">Hủy khách</div>
            </div>
            <div class="crm-stat-card" data-cat="gui_hang_hoan_thanh" style="background:linear-gradient(135deg,#0d9488,#0f766e);color:white;" onclick="_tempetFilterByCat('gui_hang_hoan_thanh')">
                <div class="stat-icon">📦✅</div>
                <div class="stat-count" id="tempetStatGuiHangHT">0</div>
                <div class="stat-label">Đã Chốt Đơn</div>
            </div>
        </div>
        <div id="tempetDateChipsArea"></div>

        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <select id="tempetFilterConsultType" class="form-control" style="width:auto;min-width:200px;" onchange="_tempetRenderFilteredTable()">
                <option value="">Tất cả trạng thái</option>
            </select>
            <select id="tempetFilterCustomerType" class="form-control" style="width:auto;min-width:160px;font-weight:600;" onchange="_tempetRenderFilteredTable()">
                <option value="">Tất cả loại khách</option>
                <option value="moi" style="color:#15803d;font-weight:700;">🟢 Khách Mới</option>
                <option value="cu" style="color:#b45309;font-weight:700;">🟧 Khách Cũ</option>
            </select>
            <input type="text" id="tempetSearch" class="form-control" placeholder="🔍 Tìm tên hoặc SĐT..." style="width:auto;min-width:200px;">
        </div>

        <div class="card">
            <div class="card-body" style="overflow-x:auto; padding:8px;">
                <table class="table" id="tempetTable">
                    <thead><tr>
                        <th style="min-width:30px;text-align:center;padding:4px 2px" title="Pin khách">📌</th>
                        <th style="min-width:45px;text-align:center">STT</th>
                        <th style="min-width:120px">Phụ Trách / Đơn</th>
                        <th style="min-width:120px;text-align:right">Mua Hàng</th>
                        <th style="min-width:120px">Nút Tư Vấn</th>
                        <th style="min-width:160px">Nội Dung TV</th>
                        <th style="min-width:70px;text-align:center">Lần Chăm</th>
                        <th style="min-width:100px">Hẹn</th>
                        <th style="min-width:180px">Khách Hàng</th>
                        <th style="min-width:180px">Liên Hệ</th>
                        <th style="min-width:200px">Nguồn & Giới Thiệu</th>
                    </tr></thead>
                    <tbody id="tempetTbody"><tr><td colspan="11" style="text-align:center;padding:40px;">⏳ Đang tải...</td></tr></tbody>
                </table>
                <div id="tempetPagination" class="crm-pagination"></div>
            </div>
        </div>
        </div></div>
    `;

    const dcArea = document.getElementById('tempetDateChipsArea');
    if (dcArea) dcArea.innerHTML = _tempetBuildDateFilterHTML();

    if (_tempetIsManager) _tempetRenderSidebar();

    document.getElementById('tempetFilterConsultType').addEventListener('change', () => _tempetRenderFilteredTable());
    let st;
    document.getElementById('tempetSearch').addEventListener('input', () => { 
        clearTimeout(st); 
        st = setTimeout(_tempetLoadData, 400); 
    });

    await _tempetLoadData();

    if (!sessionStorage.getItem('_tkkhNavDone')) {
        _tempetActiveCat = null;
        _tempetFilterByCat('phai_xu_ly');
    } else {
        sessionStorage.removeItem('_tkkhNavDone');
    }
}

function _tempetFilterByCat(cat) {
    if (_tempetActiveCat === cat) { _tempetActiveCat = null; } else { _tempetActiveCat = cat; }
    _tempetCurrentPage = 1;
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    const cardsContainer = document.getElementById('tempetStatCards');
    if (_tempetActiveCat) {
        const el = document.querySelector('.crm-stat-card[data-cat="' + _tempetActiveCat + '"]');
        if (el) el.classList.add('active');
        if (cardsContainer) cardsContainer.classList.add('has-active');
    } else {
        if (cardsContainer) cardsContainer.classList.remove('has-active');
    }
    _tempetUpdateConsultTypeDropdown();
    _tempetRenderFilteredTable();
}

function _tempetIsBirthdayToday(bdayStr) {
    if (!bdayStr) return false;
    const parts = bdayStr.split('/');
    if (parts.length < 2) return false;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const now = new Date();
    return now.getDate() === day && (now.getMonth() + 1) === month;
}

function _tempetGetCategory(c, stats) {
    if (c.cancel_approved === 1) return 'huy_khach';
    if (c.cancel_requested === 1 && c.cancel_approved === 0) {
        if (c.order_status === 'cho_duyet_huy_don') return 'da_xu_ly';
        return 'huy_khach';
    }
    if (c.last_consult_type === 'huy' && c.cancel_approved !== -2) {
        return 'huy_khach';
    }

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    let consultedToday = c.consulted_today || false;
    if (!consultedToday && stats) {
        const s = stats[c.id] || {};
        if (s.lastLog && s.lastLog.created_at && s.lastLog.log_type !== 'chuyen_doi_crm' && s.lastLog.log_type !== 'tao_tk_affiliate' && s.lastLog.log_type !== 'gui_lai_so' && s.lastLog.log_type !== 'pancake_update') {
            const content = s.lastLog.content || '';
            const isAutoPancakeLog = content.includes('Pancake') || content.includes('Đồng bộ') || content.includes('Cập nhật');
            if (!isAutoPancakeLog) {
                const logDate = new Date(s.lastLog.created_at);
                const logStr = logDate.getFullYear() + '-' + String(logDate.getMonth()+1).padStart(2,'0') + '-' + String(logDate.getDate()).padStart(2,'0');
                consultedToday = (logStr === todayStr);
            }
        }
    }

    let appointIsToday = false;
    let appointIsFuture = false;
    if (c.appointment_date) {
        const apptDate = new Date(c.appointment_date);
        const apptStr = apptDate.getFullYear() + '-' + String(apptDate.getMonth()+1).padStart(2,'0') + '-' + String(apptDate.getDate()).padStart(2,'0');
        appointIsToday = (apptStr === todayStr);
        appointIsFuture = (apptStr > todayStr);
    }

    const isBirthdayToday = _tempetIsBirthdayToday(c.birthday);

    let createdToday = false;
    if (c.created_at) {
        const cDate = new Date(c.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        createdToday = (cStr === todayStr);
    }

    // 1. Processed Today -> Đã xử lý hôm nay
    if (consultedToday) return 'da_xu_ly';

    // 2. New lead today -> Mới chuyển
    if (createdToday) return 'moi_chuyen';

    // 3. Anniversary/Appointment Today -> Phải xử lý hôm nay
    if (appointIsToday || isBirthdayToday) return 'phai_xu_ly';

    // 4. Overdue Appointment -> Xử lý trễ
    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';

    // 5. Successful Order -> Đã chốt đơn (only shows after consultedToday expires)
    if (['chot_don', 'hoan_thanh', 'sau_ban_hang', 'dang_san_xuat'].includes(c.order_status) || ['chot_don', 'hoan_thanh', 'sau_ban_hang', 'dang_san_xuat'].includes(c.last_consult_type)) {
        if (!c.appointment_date || appointIsFuture) {
            return 'gui_hang_hoan_thanh';
        }
    }

    // 6. Future Appointment -> Chờ xử lý
    if (appointIsFuture) return 'cho_xu_ly';

    return 'cho_xu_ly';
}

function _tempetUpdateConsultTypeDropdown(filteredCusts) {
    const sel = document.getElementById('tempetFilterConsultType');
    if (!sel) return;
    const prevVal = sel.value;

    let custs = filteredCusts || _tempetAllCustomers;
    if (_tempetActiveCat && !filteredCusts) {
        custs = _tempetAllCustomers.filter(c => {
            const cat = _tempetGetCategory(c, _tempetAllStats);
            return cat === _tempetActiveCat || (_tempetActiveCat === 'phai_xu_ly' && cat === 'moi_chuyen');
        });
    }

    const typeCounts = {};
    let noLogCount = 0;
    custs.forEach(c => {
        const s = _tempetAllStats[c.id] || {};
        const lt = c.last_consult_type || (s.lastLog && s.lastLog.log_type);
        if (lt) {
            typeCounts[lt] = (typeCounts[lt] || 0) + 1;
        } else {
            noLogCount++;
        }
    });

    let html = '<option value="">Tất cả trạng thái (' + custs.length + ')</option>';
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([key, count]) => {
        const t = _tempetConsultTypes[key];
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

function _tempetGetDateRange() {
    const today = new Date();
    let from = '', to = '';
    if (_tempetDatePreset === 'today') {
        const str = today.toISOString().split('T')[0];
        from = str; to = str;
    } else if (_tempetDatePreset === 'yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const str = yest.toISOString().split('T')[0];
        from = str; to = str;
    } else if (_tempetDatePreset === 'this_month') {
        const y = today.getFullYear(), m = today.getMonth();
        from = `${y}-${String(m+1).padStart(2,'0')}-01`;
        to = new Date(y, m + 1, 0).toISOString().split('T')[0];
    } else if (_tempetDatePreset === 'last_month') {
        const y = today.getFullYear(), m = today.getMonth() - 1;
        const d = new Date(y, m, 1);
        from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (_tempetDatePreset === 'custom') {
        from = _tempetDateFrom;
        to = _tempetDateTo;
    }
    return { from, to };
}

function _tempetBuildDateFilterHTML() {
    const presets = [
        { id: 'all', label: 'Tất cả' },
        { id: 'today', label: 'Hôm nay' },
        { id: 'yesterday', label: 'Hôm qua' },
        { id: 'this_month', label: 'Tháng này' },
        { id: 'last_month', label: 'Tháng trước' },
        { id: 'custom', label: 'Tùy chọn' }
    ];

    let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;background:#f8fafc;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;">
        <span style="font-size:12px;font-weight:700;color:#64748b;margin-right:4px;">📅 Lọc theo ngày:</span>`;

    presets.forEach(p => {
        const active = _tempetDatePreset === p.id;
        const bg = active ? '#122546' : '#fff';
        const color = active ? '#fff' : '#475569';
        const border = active ? '#122546' : '#cbd5e1';
        html += `<button onclick="_tempetSwitchDatePreset('${p.id}')" 
            style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
            background:${bg};color:${color};border:1px solid ${border};transition:all .15s;">
            ${p.label}
        </button>`;
    });

    if (_tempetDatePreset === 'all') {
        const curYr = new Date().getFullYear();
        const years = [curYr, curYr - 1, curYr - 2];
        html += `<select id="tempetYearSelect" onchange="_tempetChangeYear(this.value)" 
            style="padding:4px 8px;border-radius:8px;font-size:12px;border:1px solid #cbd5e1;background:white;margin-left:8px;font-weight:600;">`;
        years.forEach(y => {
            html += `<option value="${y}" ${y === _tempetSelectedYear ? 'selected' : ''}>Năm ${y}</option>`;
        });
        html += `</select>`;
    }

    if (_tempetDatePreset === 'custom') {
        html += `
            <input type="date" id="tempetDateFrom" value="${_tempetDateFrom}" onchange="_tempetApplyCustomDate()" style="padding:3px 6px;border-radius:6px;font-size:12px;border:1px solid #cbd5e1;">
            <span style="font-size:12px;color:#64748b;">→</span>
            <input type="date" id="tempetDateTo" value="${_tempetDateTo}" onchange="_tempetApplyCustomDate()" style="padding:3px 6px;border-radius:6px;font-size:12px;border:1px solid #cbd5e1;">
        `;
    }

    html += `<span id="tempetDateFilterCount" style="margin-left:auto;font-size:12px;font-weight:700;color:#2563eb;"></span>`;
    html += `</div>`;
    return html;
}

function _tempetSwitchDatePreset(preset) {
    _tempetDatePreset = preset;
    _tempetCurrentPage = 1;
    if (preset !== 'custom') {
        _tempetDateFrom = '';
        _tempetDateTo = '';
    }
    const dcArea = document.getElementById('tempetDateChipsArea');
    if (dcArea) dcArea.innerHTML = _tempetBuildDateFilterHTML();
    _tempetRenderFilteredTable();
}

function _tempetChangeYear(yr) {
    _tempetSelectedYear = parseInt(yr);
    _tempetRenderFilteredTable();
}

function _tempetApplyCustomDate() {
    _tempetDateFrom = document.getElementById('tempetDateFrom')?.value || '';
    _tempetDateTo = document.getElementById('tempetDateTo')?.value || '';
    _tempetRenderFilteredTable();
}

async function _tempetRenderFilteredTable() {
    const customers = _tempetAllCustomers;
    const stats = _tempetAllStats;
    const tbody = document.getElementById('tempetTbody');
    if (!tbody) return;

    let filtered = customers;
    if (_tempetActiveCat) {
        filtered = customers.filter(c => {
            const cat = _tempetGetCategory(c, stats);
            return cat === _tempetActiveCat || (_tempetActiveCat === 'phai_xu_ly' && cat === 'moi_chuyen');
        });
    }

    const dr = _tempetGetDateRange();
    if (dr.from && dr.to) {
        filtered = filtered.filter(c => {
            let dateField;
            if (_tempetActiveCat === 'cho_xu_ly' || _tempetActiveCat === 'xu_ly_tre') dateField = c.appointment_date;
            else if (_tempetActiveCat === 'huy_khach') dateField = c.cancel_approved_at || c.created_at;
            else dateField = c.created_at;
            if (!dateField) return true;
            const dStr = new Date(dateField).toISOString().split('T')[0];
            return dStr >= dr.from && dStr <= dr.to;
        });
    } else if (_tempetDatePreset === 'all' && _tempetSelectedYear) {
        filtered = filtered.filter(c => {
            let dateField;
            if (_tempetActiveCat === 'cho_xu_ly' || _tempetActiveCat === 'xu_ly_tre') dateField = c.appointment_date;
            else if (_tempetActiveCat === 'huy_khach') dateField = c.cancel_approved_at || c.created_at;
            else dateField = c.created_at;
            if (!dateField) return true;
            return new Date(dateField).getFullYear() === _tempetSelectedYear;
        });
    }

    const dcArea = document.getElementById('tempetDateChipsArea');
    if (dcArea) dcArea.innerHTML = _tempetBuildDateFilterHTML();

    _tempetUpdateConsultTypeDropdown(filtered);

    const consultTypeVal = document.getElementById('tempetFilterConsultType')?.value;
    if (consultTypeVal) {
        if (consultTypeVal === '__none__') {
            filtered = filtered.filter(c => !c.last_consult_type);
        } else {
            filtered = filtered.filter(c => c.last_consult_type === consultTypeVal);
        }
    }

    // Apply customer type filter
    const custTypeVal = document.getElementById('tempetFilterCustomerType')?.value;
    if (custTypeVal) {
        if (custTypeVal === 'cu') {
            filtered = filtered.filter(c => c.customer_type === 'cu');
        } else if (custTypeVal === 'moi') {
            filtered = filtered.filter(c => c.customer_type !== 'cu');
        }
    }

    filtered = [...filtered].sort((a, b) => {
        const pinA = a.is_pinned ? 1 : 0;
        const pinB = b.is_pinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        if (pinA && pinB) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);

        if (_tempetActiveCat === 'huy_khach') {
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

    const countEl = document.getElementById('tempetDateFilterCount');
    if (countEl) {
        countEl.textContent = 'Kết quả: ' + filtered.length;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="icon">📭</div><h3>Không có khách hàng</h3></div></td></tr>`;
        document.getElementById('tempetPagination').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filtered.length / _tempetPageSize);
    if (_tempetCurrentPage > totalPages) _tempetCurrentPage = totalPages;
    const startIdx = (_tempetCurrentPage - 1) * _tempetPageSize;
    const paged = filtered.slice(startIdx, startIdx + _tempetPageSize);

    const pagedIds = paged.map(c => c.id).join(',');
    if (pagedIds) {
        try {
            const statsData = await apiCall(`/api/customers/consult-stats?crm_type=tem_pet&customer_ids=${pagedIds}`);
            Object.assign(_tempetAllStats, statsData.stats || {});
        } catch (e) {
            console.error('Error fetching page stats:', e);
        }
    }

    if (_tempetActiveCat === 'phai_xu_ly') {
        const moiChuyenRows = paged.filter(c => _tempetGetCategory(c, _tempetAllStats) === 'moi_chuyen');
        const phaiXuLyRows = paged.filter(c => _tempetGetCategory(c, _tempetAllStats) === 'phai_xu_ly');
        
        const daTungDatHangRows = [];
        const chuaDatHangRows = [];
        phaiXuLyRows.forEach(c => {
            const s = _tempetAllStats[c.id] || {};
            const hasOrdered = ['chot_don', 'hoan_thanh', 'sau_ban_hang'].includes(c.order_status) || (s.chotDonCount > 0);
            if (hasOrdered) {
                daTungDatHangRows.push(c);
            } else {
                chuaDatHangRows.push(c);
            }
        });

        let html = '';
        let stt = startIdx + 1;
        if (moiChuyenRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="11"><span class="section-icon">🔥</span> Mới chuyển hôm nay <span class="section-count">${moiChuyenRows.length}</span></td></tr>`;
            moiChuyenRows.forEach(c => { html += _tempetRenderCustomerRow(c, _tempetAllStats, stt++); });
        }
        if (chuaDatHangRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="11"><span class="section-icon">🔥</span> Phải xử lý hôm nay <span class="section-count">${chuaDatHangRows.length}</span></td></tr>`;
            chuaDatHangRows.forEach(c => { html += _tempetRenderCustomerRow(c, _tempetAllStats, stt++); });
        }
        if (daTungDatHangRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="11"><span class="section-icon">⭐</span> Khách Đã Mua Hàng Cần Chăm Hôm Nay <span class="section-count">${daTungDatHangRows.length}</span></td></tr>`;
            daTungDatHangRows.forEach(c => { html += _tempetRenderCustomerRow(c, _tempetAllStats, stt++); });
        }
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = paged.map((c, idx) => _tempetRenderCustomerRow(c, _tempetAllStats, startIdx + idx + 1)).join('');
    }

    const pgEl = document.getElementById('tempetPagination');
    if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
    let pgHtml = '<button ' + (_tempetCurrentPage <= 1 ? 'disabled' : '') + ' onclick="_tempetGoToPage(' + (_tempetCurrentPage - 1) + ')">◀</button>';
    for (let p = 1; p <= totalPages; p++) {
        pgHtml += '<button class="' + (p === _tempetCurrentPage ? 'active' : '') + '" onclick="_tempetGoToPage(' + p + ')">' + p + '</button>';
    }
    pgHtml += '<button ' + (_tempetCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="_tempetGoToPage(' + (_tempetCurrentPage + 1) + ')">▶</button>';
    pgHtml += '<span class="pg-info">' + (startIdx+1) + '–' + Math.min(startIdx + _tempetPageSize, filtered.length) + ' / ' + filtered.length + '</span>';
    pgEl.innerHTML = pgHtml;
}

function _tempetGoToPage(page) {
    _tempetCurrentPage = page;
    _tempetRenderFilteredTable();
    document.getElementById('tempetTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _tempetShowTelegramOnlyMessage() {
    alert("🔒 Khách hàng mới chuyển về bắt buộc phải báo qua Telegram trước!\n\nVui lòng mở Telegram reply tin nhắn nhận số theo cú pháp: ; [Nội dung tư vấn]");
}

async function _tempetOpenConsultModal(customerId) {
    window._currentCrmMenu = 'tem_pet';
    window._currentIsTemPetMenu = true;
    if (typeof _loadScript === 'function') {
        await _loadScript('/js/pages/chamsockhsale.js?v=20260726_v355');
    }
    if (typeof _saleOpenConsultModal === 'function') {
        _saleOpenConsultModal(customerId);
    } else {
        alert("Không thể mở bảng tư vấn. Vui lòng thử lại.");
    }
}

async function _tempetOpenOrderCodesPopup(customerId) {
    window._currentCrmMenu = 'tem_pet';
    window._currentIsTemPetMenu = true;
    if (typeof _loadScript === 'function') {
        await _loadScript('/js/pages/chamsockhsale.js?v=20260726_v355');
    }
    if (typeof _saleOpenOrderCodesPopup === 'function') {
        _saleOpenOrderCodesPopup(customerId);
    } else {
        alert("Không thể mở danh sách mã đơn. Vui lòng thử lại.");
    }
}

async function _tempetQuickRecare(customerId) {
    if (!customerId) return;
    const btn = document.querySelector(`.btn-star-${customerId}`);
    if (btn) btn.disabled = true;
    try {
        const res = await apiCall(`/api/customers/${customerId}/quick-recare`, 'POST');
        if (res.success) {
            showToast(res.message || 'Chăm sóc nhanh thành công!', 'success');
            _tempetLoadData();
        } else {
            showToast(res.error || 'Có lỗi xảy ra', 'error');
            if (btn) btn.disabled = false;
        }
    } catch (e) {
        showToast(e.message || 'Lỗi kết nối server', 'error');
        if (btn) btn.disabled = false;
    }
}

function _tempetRenderCustomerRow(c, stats, stt) {
    const s = stats[c.id] || { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0 };
    const OVERRIDE_STATUSES = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy', 'chot_don', 'hoan_thanh', 'sau_ban_hang', 'dang_san_xuat'];
    let lastType = s.lastLog ? _tempetConsultTypes[s.lastLog.log_type] : null;
    if (OVERRIDE_STATUSES.includes(c.order_status) && _tempetConsultTypes[c.order_status]) {
        lastType = _tempetConsultTypes[c.order_status];
    }
    let lastContent = s.lastLog?.content || '';
    if (lastContent && lastType) {
        lastContent = lastContent.replace(/^(?:✅|🏥|📦|💵|📝|📢|🚨|🚫|❌|🔧|🎨|👔|📄|🤝|💬|📞|✔️)?\s*(?:Tư vấn Sếp|Cấp cứu hoàn thành|Chốt đơn|Đặt cọc|Sau bán hàng|Hoàn Thành Cấp Cứu|Cấp Cứu Sếp)[:\s]+/i, '').trim();
    }
    const shortContent = lastContent.length > 30 ? lastContent.substring(0, 30) + '...' : lastContent;

    let appointDisplay = '';
    if (c.appointment_date && _tempetGetCategory(c, stats) !== 'huy_khach') {
        const d = new Date(c.appointment_date);
        const days = ['CN','T2','T3','T4','T5','T6','T7'];
        appointDisplay = `<span style="color:#e65100;font-weight:600">${days[d.getDay()]} - ${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}</span>`;
    }

    const _pinClass = c.is_pinned ? ' crm-row-pinned' : '';
    const canEditCrm = canDo('chamsockhtempet', 'edit') || canDo('chamsockhsale', 'edit');
    const canPinCrm = canEditCrm || ['nhan_vien', 'truong_phong', 'thu_viec', 'part_time'].includes(currentUser?.role);

    const isClosedOrder = ['chot_don', 'hoan_thanh', 'sau_ban_hang', 'dang_san_xuat'].includes(c.order_status) || ['chot_don', 'hoan_thanh', 'sau_ban_hang', 'dang_san_xuat'].includes(c.last_consult_type);
    const isMoiChuyen = !isClosedOrder && (_tempetGetCategory(c, stats) === 'moi_chuyen' || (s.consultCount || 0) === 0) && !['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser?.role);

    let originalCode = '';
    if (c.daily_order_number && c.effective_date) {
        const ed = new Date(c.effective_date);
        const d = ed.getDate(), m = ed.getMonth() + 1;
        const y = 'Y' + String(ed.getFullYear()).slice(-2);
        originalCode = `${c.daily_order_number}-${d}-${m}-${y}`;
    }

    const hasPhone = c.phone && !c.phone.startsWith('pancake_') && c.phone !== 'Chưa có SĐT' && c.phone !== 'N/A';
    const phoneDisplay = hasPhone ? `<span style="color:#0284c7;font-weight:600;"><a href="tel:${c.phone}" style="color:#0284c7;text-decoration:none;">📞 ${c.phone}</a></span>` : '<span style="color:#94a3b8">Chưa có SĐT</span>';

    return `<tr class="${_pinClass}" data-customer-id="${c.id}">
        <td style="text-align:center;padding:4px 2px;">
            ${!c.readonly && canPinCrm ? `<span class="crm-pin-btn ${c.is_pinned ? 'active' : ''}" onclick="event.stopPropagation();_tempetTogglePin(${c.id})" title="${c.is_pinned ? 'Bỏ pin' : 'Pin khách'}">${c.is_pinned ? '📌' : '<span style="opacity:0.3">📌</span>'}</span>` : ''}
        </td>
        <td style="text-align:center;font-weight:700;color:#64748b;font-size:12px;">${stt || ''}</td>
        <td style="font-size:12px;vertical-align:middle;">
            <div style="font-weight:700;color:#1e293b;">${c.assigned_to_name || 'Chưa phân công'}</div>
            ${(() => {
                const candidates = [c.gc_order_code, s.latestOrderCode, c.order_code].filter(Boolean);
                const code = candidates.find(cd => cd.startsWith('GCTEM') || cd.startsWith('GCPET')) || '';
                if (code) {
                    return `<div style="font-size:11px;font-weight:700;color:#e65100;margin-top:2px;cursor:pointer;" onclick="event.stopPropagation();_tempetOpenOrderCodesPopup(${c.id})">${code}</div>`;
                }
                return '';
            })()}
        </td>
        <td style="text-align:right;font-size:12px;vertical-align:middle;">
            <div style="font-weight:800;color:${s.revenue > 0 ? '#16a34a' : '#475569'};font-size:13px;">${s.revenue > 0 ? Number(s.revenue).toLocaleString('vi-VN') + 'đ' : '0đ'}</div>
            ${(() => {
                const orderCount = s.chotDonCount || (['chot_don', 'hoan_thanh', 'sau_ban_hang', 'dang_san_xuat'].includes(c.order_status) ? 1 : 0);
                if (!orderCount || orderCount === 0) {
                    return `<div style="font-size:10.5px;color:#94a3b8;margin-top:2px;">(0 lần đặt)</div>`;
                }
                let bg = 'rgba(217, 119, 6, 0.12)';
                let color = '#d97706';
                let border = 'rgba(217, 119, 6, 0.25)';
                if (orderCount >= 5) {
                    bg = 'rgba(219, 39, 119, 0.12)';
                    color = '#db2777';
                    border = 'rgba(219, 39, 119, 0.25)';
                } else if (orderCount >= 2) {
                    bg = 'rgba(37, 99, 235, 0.12)';
                    color = '#2563eb';
                    border = 'rgba(37, 99, 235, 0.25)';
                }
                return `<div style="margin-top:4px;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;background:${bg};color:${color};border:1px solid ${border};white-space:nowrap;">${orderCount} lần đặt</span></div>`;
            })()}
        </td>
        <td style="font-size:12px;">
            ${isMoiChuyen ? `
                <button class="btn btn-sm consult-btn" onclick="_tempetShowTelegramOnlyMessage()" 
                    style="font-size:11px;padding:4px 8px;background:linear-gradient(135deg, #cbd5e1, #94a3b8);color:white;cursor:pointer;">
                    🔒 Báo Telegram
                </button>
            ` : (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <button class="btn btn-sm" disabled style="font-size:11px;padding:4px 8px;background:var(--gray-700);color:var(--gray-400);cursor:not-allowed;">
                    ⏳ ${c.order_status === 'cho_duyet_huy_don' ? 'Chờ Duyệt Hủy Đơn' : 'Chờ Duyệt Hủy'}
                </button>
            ` : (c.cancel_approved === 1 || c.order_status === 'duyet_huy') ? `
                <div style="display:flex;gap:4px;align-items:center;justify-content:center;">
                    <button class="btn btn-sm consult-btn" onclick="_tempetOpenConsultModal(${c.id})" 
                        style="font-size:11px;padding:4px 8px;background:#dc2626;color:white;flex-grow:1;border:none;border-radius:6px;cursor:pointer;">
                        ❌ Hủy Khách
                    </button>
                    <button class="btn btn-sm btn-star-${c.id}" onclick="event.stopPropagation();_tempetQuickRecare(${c.id})" 
                        style="font-size:12px;padding:4px 8px;background:#fef08a;color:#ca8a04;border:1px solid #fde047;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;" 
                        title="Chăm sóc nhanh" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                        ⭐
                    </button>
                </div>
            ` : `
                <div style="display:flex;gap:4px;align-items:center;justify-content:center;">
                    <button class="btn btn-sm consult-btn" onclick="_tempetOpenConsultModal(${c.id})"
                        style="font-size:11px;padding:4px 8px;border-radius:6px;background:${lastType ? lastType.color : '#6b7280'};color:${lastType?.textColor || 'white'};cursor:pointer;border:none;flex-grow:1;">
                        ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Chưa TV'}
                    </button>
                    <button class="btn btn-sm btn-star-${c.id}" onclick="event.stopPropagation();_tempetQuickRecare(${c.id})" 
                        style="font-size:12px;padding:4px 8px;background:#fef08a;color:#ca8a04;border:1px solid #fde047;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;" 
                        title="Chăm sóc nhanh" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                        ⭐
                    </button>
                </div>
            `}
        </td>
        <td style="font-size:12px;color:#475569;" title="${lastContent}">
            ${shortContent || '<span style="color:#94a3b8">—</span>'}
        </td>
        <td style="text-align:center;font-size:12px;">
            <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-weight:700;">${s.consultCount || 0}</span>
        </td>
        <td style="font-size:12px;">${appointDisplay || '<span style="color:#94a3b8">—</span>'}</td>
        <td style="font-size:12px;vertical-align:middle;">
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
                const nameStr = (c.customer_name || '—').replace(/'/g, "\\'");
                const codeStr = typeof getCustomerCode === 'function' ? getCustomerCode(c) : (originalCode || '');
                return `
                <div style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700;">
                    <span onclick="if(typeof _saleOpenCustomerDetail==='function')_saleOpenCustomerDetail(${c.id})" style="cursor:pointer;color:${_cc.text};background:${_cc.bg};border:1px solid ${_cc.border};padding:3px 10px;border-radius:20px;display:inline-block;">
                        ${c.customer_name || '—'}
                    </span>
                    <span onclick="event.stopPropagation();_crmCopyText('${nameStr}',this,'Tên')" style="cursor:pointer;font-size:11px;color:#94a3b8;margin-left:4px;transition:color 0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#94a3b8'" title="Copy tên">📋</span>
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">
                    Mã: <strong style="color:#e65100">${codeStr}</strong>
                </div>
                <div style="margin-top:2px;margin-bottom:2px;">
                    ${(c.customer_type === 'cu' || (s && (s.chotDonCount > 0 || s.revenue > 0)))
                        ? `<span style="padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;background:#fef3c7;color:#b45309;border:1px solid #fde68a;display:inline-flex;align-items:center;gap:2px;">🟧 Khách Cũ</span>`
                        : `<span style="padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;display:inline-flex;align-items:center;gap:2px;">🟢 Khách Mới</span>`}
                </div>
                `;
            })()}
        </td>
        <td style="font-size:12px;">${phoneDisplay}</td>
        <td style="font-size:12px;color:#475569;">
            ${c.source_name || '—'}
        </td>
    </tr>`;
}

async function _tempetLoadData() {
    await _tempetSyncConsultTypes();

    let url = '/api/customers?crm_type=tem_pet';
    const search = document.getElementById('tempetSearch')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (_tempetSidebarSelectedUserId) url += `&employee_id=${_tempetSidebarSelectedUserId}`;

    const data = await apiCall(url);
    _tempetAllCustomers = data.customers || [];

    let stats = {};
    const ids = _tempetAllCustomers.map(c => c.id).join(',');
    if (ids) {
        try {
            const statsData = await apiCall(`/api/customers/consult-stats?crm_type=tem_pet&customer_ids=${ids}`);
            stats = statsData.stats || {};
        } catch (e) { stats = {}; }
    }
    _tempetAllStats = stats;

    let phaiXuLy = 0, daXuLy = 0, xuLyTre = 0, choXuLy = 0, huyKhach = 0, guiHangHT = 0;
    _tempetAllCustomers.forEach(c => {
        const cat = _tempetGetCategory(c, stats);
        if (cat === 'phai_xu_ly' || cat === 'moi_chuyen') phaiXuLy++;
        else if (cat === 'da_xu_ly') daXuLy++;
        else if (cat === 'xu_ly_tre') xuLyTre++;
        else if (cat === 'cho_xu_ly') choXuLy++;
        else if (cat === 'huy_khach') huyKhach++;
        else if (cat === 'gui_hang_hoan_thanh') guiHangHT++;
    });

    document.getElementById('tempetStatPhaiXuLy').textContent = phaiXuLy;
    document.getElementById('tempetStatDaXuLy').textContent = daXuLy;
    document.getElementById('tempetStatXuLyTre').textContent = xuLyTre;
    document.getElementById('tempetStatChoXuLy').textContent = choXuLy;
    document.getElementById('tempetStatHuyKhach').textContent = huyKhach;
    document.getElementById('tempetStatGuiHangHT').textContent = guiHangHT;

    _tempetRenderFilteredTable();
}

function _tempetTogglePin(customerId) {
    apiCall(`/api/customers/${customerId}/pin`, 'PATCH').then(() => {
        _tempetLoadData();
    }).catch(err => {
        alert(err.message || 'Lỗi khi pin khách');
    });
}

function _tempetRenderSidebar() {
    const listEl = document.getElementById('tempetSidebarList');
    if (!listEl) return;

    const topBtnActive = _tempetSidebarSelectedUserId === null;
    let html = `
        <div onclick="_tempetSelectSidebarUser(null)" 
            style="padding:10px 14px;border-radius:10px;cursor:pointer;margin-bottom:8px;font-size:13px;font-weight:800;
            background:${topBtnActive ? '#122546' : 'white'};
            color:${topBtnActive ? 'white' : '#1e293b'};
            border:${topBtnActive ? 'none' : '1.5px solid #cbd5e1'};
            display:flex;align-items:center;gap:8px;box-shadow:${topBtnActive ? '0 4px 12px rgba(18,37,70,0.25)' : 'none'};">
            <span>👥</span> <span>Tất cả nhân viên</span>
        </div>
    `;

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
        const roleOrder = { giam_doc: 0, quan_ly_cap_cao: 1, quan_ly: 2, truong_phong: 3, nhan_vien: 4, part_time: 5, thu_viec: 6 };
        return [...users].sort((a, b) => {
            const orderA = roleOrder[a.role] !== undefined ? roleOrder[a.role] : 99;
            const orderB = roleOrder[b.role] !== undefined ? roleOrder[b.role] : 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.full_name || a.username).localeCompare(b.full_name || b.username);
        });
    }
    function roleBadge(role) {
        const roleColors = { giam_doc: '#ef4444', quan_ly_cap_cao: '#f59e0b', quan_ly: '#eab308', truong_phong: '#8b5cf6', nhan_vien: '#10b981', part_time: '#6b7280' };
        const roleLabels = { giam_doc: '⭐ GĐ', quan_ly_cap_cao: '⭐ QLCC', quan_ly: '⭐ QL', truong_phong: '👑 TP', nhan_vien: 'NV', part_time: 'PT' };
        const color = roleColors[role] || '#6b7280';
        const label = roleLabels[role] || role;
        return ` <span style="background:${color};color:white;font-size:8.5px;padding:1px 5px;border-radius:4px;font-weight:800;vertical-align:middle;margin-left:4px;">${label}</span>`;
    }

    const deptMap = {};
    _tempetSidebarDepts.forEach(d => { deptMap[d.id] = d.name; });

    function renderSidebarUser(u, indent) {
        const active = u.id === _tempetSidebarSelectedUserId;
        const c = avatarColor(u.full_name || u.username);
        const dName = deptMap[u.department_id] || '';
        const badge = roleBadge(u.role);
        return `<div onclick="_tempetSelectSidebarUser(${u.id})" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:10px;margin-bottom:4px;margin-left:${indent}px;transition:all 0.15s;${active ? 'background:linear-gradient(135deg,#122546,#1e3a5f);color:white;box-shadow:0 4px 12px rgba(18,37,70,0.3);' : 'background:white;border:1px solid #e5e7eb;color:#374151;'}">
            <span style="background:${active ? 'rgba(255,255,255,0.2)' : c};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;flex-shrink:0;">${initials(u.full_name || u.username)}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}${badge}</div>
                <div style="font-size:9px;opacity:0.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dName}</div>
            </div>
        </div>`;
    }

    function getAllDeptTreeIds(rootId) {
        const set = new Set([rootId]);
        let added = true;
        while (added) {
            added = false;
            _tempetSidebarDepts.forEach(d => {
                if (d.parent_id && set.has(d.parent_id) && !set.has(d.id)) {
                    set.add(d.id);
                    added = true;
                }
            });
        }
        return set;
    }

    const saleRoot = _tempetSidebarDepts.find(d => d.id === 4) || 
                     _tempetSidebarDepts.find(d => d.name && d.name.toUpperCase() === 'PHÒNG SALE') ||
                     _tempetSidebarDepts.find(d => d.name && d.name.toUpperCase().includes('SALE'));

    const kdRoot = _tempetSidebarDepts.find(d => d.id === 1) || 
                   _tempetSidebarDepts.find(d => d.name && d.name.toUpperCase() === 'PHÒNG KINH DOANH') ||
                   _tempetSidebarDepts.find(d => d.name && d.name.toUpperCase().includes('KINH DOANH'));

    const excludeRoles = ['hoa_hong', 'ctv', 'tkaffiliate', 'nuoi_duong', 'sinh_vien'];
    const validUsers = _tempetSidebarUsers.filter(u => !excludeRoles.includes(u.role));

    // 1. PHÒNG SALE
    if (saleRoot) {
        const saleDeptIds = getAllDeptTreeIds(saleRoot.id);
        const saleUsers = validUsers.filter(u => saleDeptIds.has(u.department_id));

        if (saleUsers.length > 0) {
            html += `
                <div style="padding:8px 12px;background:linear-gradient(135deg,#122546,#1e3a5f);border-radius:10px;margin-top:8px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:13px;font-weight:800;color:#ffffff;">📁 PHÒNG SALE</span>
                </div>
            `;

            const directUsers = sortMembers(saleUsers.filter(u => u.department_id === saleRoot.id));
            directUsers.forEach(u => { html += renderSidebarUser(u, 4); });

            const childTeams = _tempetSidebarDepts
                .filter(d => d.parent_id === saleRoot.id || (saleDeptIds.has(d.id) && d.id !== saleRoot.id))
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name));

            childTeams.forEach(team => {
                const teamUsers = sortMembers(saleUsers.filter(u => u.department_id === team.id));
                if (teamUsers.length === 0) return;
                html += `<div style="padding:4px 8px;margin:4px 0 2px;"><span style="font-size:10px;font-weight:800;color:#64748b;letter-spacing:0.3px;">└ ${team.name}</span></div>`;
                teamUsers.forEach(u => { html += renderSidebarUser(u, 12); });
            });
        }
    }

    // 2. PHÒNG KINH DOANH
    if (kdRoot) {
        const kdDeptIds = getAllDeptTreeIds(kdRoot.id);
        const kdUsers = validUsers.filter(u => kdDeptIds.has(u.department_id));

        if (kdUsers.length > 0) {
            html += `
                <div style="padding:8px 12px;background:linear-gradient(135deg,#122546,#1e3a5f);border-radius:10px;margin-top:12px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:13px;font-weight:800;color:#ffffff;">📁 PHÒNG KINH DOANH</span>
                </div>
            `;

            const directUsers = sortMembers(kdUsers.filter(u => u.department_id === kdRoot.id));
            directUsers.forEach(u => { html += renderSidebarUser(u, 4); });

            const childTeams = _tempetSidebarDepts
                .filter(d => d.parent_id === kdRoot.id || (kdDeptIds.has(d.id) && d.id !== kdRoot.id))
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name));

            childTeams.forEach(team => {
                const teamUsers = sortMembers(kdUsers.filter(u => u.department_id === team.id));
                if (teamUsers.length === 0) return;
                html += `<div style="padding:4px 8px;margin:4px 0 2px;"><span style="font-size:10px;font-weight:800;color:#64748b;letter-spacing:0.3px;">└ ${team.name}</span></div>`;
                teamUsers.forEach(u => { html += renderSidebarUser(u, 12); });
            });
        }
    }

    listEl.innerHTML = html;
}

function _tempetSelectSidebarUser(userId) {
    _tempetSidebarSelectedUserId = userId;
    _tempetCurrentPage = 1;
    _tempetRenderSidebar();
    _tempetLoadData();
}
